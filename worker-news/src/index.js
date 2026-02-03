export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // Health
    if (url.pathname === "/") {
      return json({ ok: true, service: "volearn-guardian-reader" }, request);
    }

    // Debug env key (safe-ish: only last4 + length)
    if (url.pathname === "/debug/guardian") {
      const k = (env.GUARDIAN_API_KEY || "").trim();
      return json(
        {
          hasKey: !!k,
          keyLen: k.length,
          keyLast4: k ? k.slice(-4) : null,
        },
        request
      );
    }

    // Debug (doesn't leak the key)
    if (url.pathname === "/debug/env") {
      return json({ hasGuardianKey: !!env.GUARDIAN_API_KEY }, request);
    }

    // DEBUG: call Guardian upstream
    if (url.pathname === "/debug/guardian-call") {
      const k = (env.GUARDIAN_API_KEY || "").trim();
      const upstream =
        "https://content.guardianapis.com/search?page-size=1&api-key=" +
        encodeURIComponent(k);

      const r = await fetch(upstream, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; VoLearnReader/1.0; +https://hannahwaan.github.io/VoLearn/)",
          accept: "application/json,text/plain,*/*",
        },
      });
      const t = await r.text().catch(() => "");
      return json(
        { upstreamStatus: r.status, sample: t.slice(0, 200) },
        request
      );
    }

    // GET /guardian/feed?section=world&page=1&pageSize=10
    if (url.pathname === "/guardian/feed") {
      assertKey(env);

      const section = (url.searchParams.get("section") || "world").trim();
      const page = clampInt(url.searchParams.get("page"), 1, 50, 1);
      const pageSize = clampInt(url.searchParams.get("pageSize"), 1, 50, 10);

      const upstream = new URL("https://content.guardianapis.com/search");
      upstream.searchParams.set("section", section);
      upstream.searchParams.set("page", String(page));
      upstream.searchParams.set("page-size", String(pageSize));
      upstream.searchParams.set("order-by", "newest");
      upstream.searchParams.set(
        "show-fields",
        // Keep feed light. Full HTML comes from /guardian/item.
        "trailText,thumbnail,byline,wordcount"
      );
      upstream.searchParams.set("api-key", env.GUARDIAN_API_KEY);

      const res = await fetchCached(upstream.toString(), request, ctx, 180);
      if (!res.ok) return upstreamError("guardian_feed", res, request);

      const data = await res.json();
      const results = data?.response?.results || [];

      const items = results.map((r) => normalizeGuardianResult(r, section));

      return json(
        {
          provider: { id: "guardian", name: "The Guardian" },
          section,
          page,
          pageSize,
          total: data?.response?.total ?? null,
          items,
        },
        request
      );
    }

    // GET /guardian/item?id=science/2026/feb/02/...
    if (url.pathname === "/guardian/item") {
      assertKey(env);

      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return json({ error: "Missing id" }, request, 400);

      const upstream = new URL(`https://content.guardianapis.com/${id}`);
      upstream.searchParams.set(
        "show-fields",
        // HTML body for in-app reader + keep bodyText as fallback
        "trailText,body,bodyText,thumbnail,byline,wordcount"
      );
      upstream.searchParams.set("api-key", env.GUARDIAN_API_KEY);

      const res = await fetchCached(upstream.toString(), request, ctx, 600);
      if (!res.ok) return upstreamError("guardian_item", res, request);

      const data = await res.json();
      const content = data?.response?.content;
      if (!content) return json({ error: "No content" }, request, 404);

      const item = normalizeGuardianContent(content);

      return json(item, request);
    }

    return json({ error: "Not found" }, request, 404);
  },
};

function assertKey(env) {
  if (!env?.GUARDIAN_API_KEY) {
    const e = new Error("Missing GUARDIAN_API_KEY");
    e.status = 500;
    throw e;
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(obj, request, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...corsHeaders(request),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

async function fetchCached(targetUrl, request, ctx, ttlSeconds = 300) {
  const cache = caches.default;
  const cacheKey = new Request(targetUrl, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const res = await fetch(targetUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; VoLearnReader/1.0; +https://hannahwaan.github.io/VoLearn/)",
      accept: "application/json,text/plain,*/*",
    },
  });

  if (!res.ok) return res;

  const toCache = new Response(res.body, res);
  toCache.headers.set("cache-control", `public, max-age=${ttlSeconds}`);
  ctx.waitUntil(cache.put(cacheKey, toCache.clone()));
  return toCache;
}

async function upstreamError(tag, res, request) {
  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {}
  return json(
    {
      error: "Upstream error",
      tag,
      status: res.status,
      body: bodyText.slice(0, 500),
    },
    request,
    502
  );
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeGuardianResult(r, section) {
  const fields = r?.fields || {};
  return {
    id: `guardian:${r?.id || ""}`,
    providerId: "guardian",

    guardianId: r?.id || "",
    sectionId: r?.sectionId || section || "",
    sectionName: r?.sectionName || "",

    title: r?.webTitle || "",
    url: r?.webUrl || "",
    publishedAt: r?.webPublicationDate || null,

    summaryHtml: fields?.trailText || "",
    author: fields?.byline || "",
    wordCount: fields?.wordcount ?? null,
    image: fields?.thumbnail || "",

    source: { id: "guardian", name: "The Guardian" },
  };
}

function normalizeGuardianContent(c) {
  const fields = c?.fields || {};
  return {
    id: `guardian:${c?.id || ""}`,
    providerId: "guardian",

    guardianId: c?.id || "",
    sectionId: c?.sectionId || "",
    sectionName: c?.sectionName || "",

    title: c?.webTitle || "",
    url: c?.webUrl || "",
    publishedAt: c?.webPublicationDate || null,

    summaryHtml: fields?.trailText || "",

    // HTML for in-app reader (sanitize in frontend!)
    contentHtml: fields?.body || "",

    // Plain text fallback
    text: fields?.bodyText || "",

    wordCount: fields?.wordcount ?? null,
    author: fields?.byline || "",
    image: fields?.thumbnail || "",

    source: { id: "guardian", name: "The Guardian" },
  };
}
