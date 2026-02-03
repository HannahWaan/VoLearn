export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/") {
      return json({ ok: true, service: "volearn-guardian-reader", version: "2.0" }, request);
    }

    if (url.pathname === "/debug/guardian") {
      const k = (env.GUARDIAN_API_KEY || "").trim();
      return json({ hasKey: !!k, keyLen: k.length, keyLast4: k ? k.slice(-4) : null }, request);
    }

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

      const res = await fetchUpstream(upstream.toString());
      if (!res.ok) return upstreamError("guardian_feed", res, request);

      const data = await res.json();
      const results = data?.response?.results || [];
      const items = results.map((r) => normalizeGuardianResult(r, section));

      return json({
        provider: { id: "guardian", name: "The Guardian" },
        section, page, pageSize,
        total: data?.response?.total ?? null,
        items,
      }, request);
    }

    if (url.pathname === "/guardian/item") {
      assertKey(env);
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return json({ error: "Missing id" }, request, 400);

      const upstream = new URL(`https://content.guardianapis.com/${id}`);
      upstream.searchParams.set("show-fields", "trailText,body,bodyText,thumbnail,byline,wordcount");
      upstream.searchParams.set("show-elements", "image");
      upstream.searchParams.set("api-key", env.GUARDIAN_API_KEY);

      const res = await fetchUpstream(upstream.toString());
      if (!res.ok) return upstreamError("guardian_item", res, request);

      const data = await res.json();
      const content = data?.response?.content;
      if (!content) return json({ error: "No content" }, request, 404);

      return json(normalizeGuardianContent(content), request);
    }

    return json({ error: "Not found" }, request, 404);
  },
};

function assertKey(env) {
  if (!env?.GUARDIAN_API_KEY) throw new Error("Missing GUARDIAN_API_KEY");
}

function corsHeaders(request) {
  return {
    "access-control-allow-origin": request.headers.get("Origin") || "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(obj, request, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(request), "content-type": "application/json; charset=utf-8" },
  });
}

async function fetchUpstream(url) {
  return fetch(url, {
    headers: { "user-agent": "VoLearnReader/2.0", accept: "application/json" },
  });
}

async function upstreamError(tag, res, request) {
  const body = await res.text().catch(() => "");
  return json({ error: "Upstream error", tag, status: res.status, body: body.slice(0, 300) }, request, 502);
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizeGuardianResult(r, section) {
  const f = r?.fields || {};
  return {
    id: `guardian:${r?.id || ""}`,
    providerId: "guardian",
    guardianId: r?.id || "",
    sectionId: r?.sectionId || section,
    sectionName: r?.sectionName || "",
    title: r?.webTitle || "",
    url: r?.webUrl || "",
    publishedAt: r?.webPublicationDate || null,
    summaryHtml: f.trailText || "",
    author: f.byline || "",
    wordCount: f.wordcount ?? null,
    image: f.thumbnail || "",
    source: { id: "guardian", name: "The Guardian" },
  };
}

function normalizeGuardianContent(c) {
  const f = c?.fields || {};
  const elements = c?.elements || [];

  const images = elements
    .filter(el => el?.type === "image")
    .map(el => {
      const assets = el?.assets || [];
      const best = assets.reduce((b, a) => {
        const w = parseInt(a?.typeData?.width, 10) || 0;
        return w > (parseInt(b?.typeData?.width, 10) || 0) ? a : b;
      }, assets[0] || {});
      return {
        url: best?.file || "",
        caption: el?.imageTypeData?.caption || "",
        credit: el?.imageTypeData?.credit || "",
      };
    })
    .filter(img => img.url);

  const main = images[0] || null;

  return {
    id: `guardian:${c?.id || ""}`,
    providerId: "guardian",
    guardianId: c?.id || "",
    sectionId: c?.sectionId || "",
    sectionName: c?.sectionName || "",
    title: c?.webTitle || "",
    url: c?.webUrl || "",
    publishedAt: c?.webPublicationDate || null,
    summaryHtml: f.trailText || "",
    contentHtml: f.body || "",
    text: f.bodyText || "",
    wordCount: f.wordcount ?? null,
    author: f.byline || "",
    image: main?.url || f.thumbnail || "",
    imageCaption: main?.caption || "",
    imageCredit: main?.credit || "",
    images,
    source: { id: "guardian", name: "The Guardian" },
  };
}
