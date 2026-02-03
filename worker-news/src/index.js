export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/") {
      return json({ ok: true, service: "volearn-guardian-reader" }, request);
    }

    if (url.pathname === "/debug/guardian") {
      const k = (env.GUARDIAN_API_KEY || "").trim();
      return json({ hasKey: !!k, keyLen: k.length, keyLast4: k ? k.slice(-4) : null }, request);
    }

    if (url.pathname === "/debug/env") {
      return json({ hasGuardianKey: !!env.GUARDIAN_API_KEY }, request);
    }

    // GET /guardian/feed
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
      upstream.searchParams.set("show-fields", "trailText,thumbnail,byline,wordcount");
      upstream.searchParams.set("api-key", env.GUARDIAN_API_KEY);

      const res = await fetchCached(upstream.toString(), request, ctx, 180);
      if (!res.ok) return upstreamError("guardian_feed", res, request);

      const data = await res.json();
      const results = data?.response?.results || [];
      const items = results.map((r) => normalizeGuardianResult(r, section));

      return json({
        provider: { id: "guardian", name: "The Guardian" },
        section,
        page,
        pageSize,
        total: data?.response?.total ?? null,
        items,
      }, request);
    }

    // GET /guardian/item
    if (url.pathname === "/guardian/item") {
      assertKey(env);

      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return json({ error: "Missing id" }, request, 400);

      const upstream = new URL(`https://content.guardianapis.com/${id}`);
      upstream.searchParams.set("show-fields", "trailText,body,thumbnail,byline,wordcount,main");
      upstream.searchParams.set("show-elements", "image");
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
      "user-agent": "Mozilla/5.0 (compatible; VoLearnReader/1.0)",
      accept: "application/json",
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
  try { bodyText = await res.text(); } catch {}
  return json({ error: "Upstream error", tag, status: res.status, body: bodyText.slice(0, 500) }, request, 502);
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
  const elements = c?.elements || [];
  
  // Extract images with captions
  const images = elements
    .filter(el => el?.type === "image")
    .map(el => {
      const assets = el?.assets || [];
      // Get largest image
      const mainAsset = assets.reduce((best, a) => {
        const w = parseInt(a?.typeData?.width, 10) || 0;
        const bestW = parseInt(best?.typeData?.width, 10) || 0;
        return w > bestW ? a : best;
      }, assets[0] || {});
      
      return {
        url: mainAsset?.file || "",
        width: mainAsset?.typeData?.width || null,
        height: mainAsset?.typeData?.height || null,
        caption: el?.imageTypeData?.caption || "",
        credit: el?.imageTypeData?.credit || "",
        alt: el?.imageTypeData?.alt || "",
      };
    })
    .filter(img => img.url);

  // Main image (first or from fields.main)
  const mainImage = images[0] || null;

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
    
    // HTML content - giữ nguyên formatting
    contentHtml: fields?.body || "",
    
    wordCount: fields?.wordcount ?? null,
    author: fields?.byline || "",
    
    // Main image with caption
    image: mainImage?.url || fields?.thumbnail || "",
    imageCaption: mainImage?.caption || "",
    imageCredit: mainImage?.credit || "",
    
    // All images in article
    images: images,
    
    source: { id: "guardian", name: "The Guardian" },
  };
}
