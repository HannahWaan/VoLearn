export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "") {
      return json({ ok: true, service: "volearn-guardian-reader", version: "2.2" }, request);
    }

    // Debug
    if (url.pathname === "/debug/guardian") {
      const key = env.GUARDIAN_API_KEY || "";
      return json({ hasKey: !!key, keyLen: key.length, keyLast4: key.slice(-4) }, request);
    }

    // Guardian feed
    if (url.pathname === "/guardian/feed") {
      return handleGuardianFeed(url, env, ctx, request);
    }

    // Guardian item
    if (url.pathname === "/guardian/item") {
      return handleGuardianItem(url, env, ctx, request);
    }

    return json({ error: "Not found" }, request, 404);
  }
};

function corsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, request, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) }
  });
}

function clampInt(val, min, max, def) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "VoLearnReader/2.2" }
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ========== Guardian Feed ==========
async function handleGuardianFeed(url, env, ctx, request) {
  const key = env.GUARDIAN_API_KEY;
  if (!key) return json({ error: "Missing API key" }, request, 500);

  const section = url.searchParams.get("section") || "world";
  const page = clampInt(url.searchParams.get("page"), 1, 100, 1);
  const pageSize = clampInt(url.searchParams.get("pageSize"), 1, 50, 10);

  const apiUrl = `https://content.guardianapis.com/search?` +
    `section=${encodeURIComponent(section)}&page=${page}&page-size=${pageSize}` +
    `&order-by=newest&show-fields=trailText,thumbnail,byline,wordcount&api-key=${key}`;

  try {
    const res = await fetchWithTimeout(apiUrl);
    if (!res.ok) return json({ error: "Guardian API error", status: res.status }, request, 502);

    const data = await res.json();
    const results = data?.response?.results || [];

    const items = results.map(r => ({
      guardianId: r.id || "",
      title: r.webTitle || "",
      url: r.webUrl || "",
      publishedAt: r.webPublicationDate || "",
      summary: r.fields?.trailText || "",
      image: r.fields?.thumbnail || "",
      author: r.fields?.byline || "The Guardian",
      wordCount: parseInt(r.fields?.wordcount, 10) || 0,
      source: { name: "The Guardian", url: "https://www.theguardian.com" }
    }));

    return json({ provider: "guardian", section, page, pageSize, total: data?.response?.total || 0, items }, request);
  } catch (e) {
    return json({ error: "Fetch failed", message: e.message }, request, 502);
  }
}

// ========== Guardian Item ==========
async function handleGuardianItem(url, env, ctx, request) {
  const key = env.GUARDIAN_API_KEY;
  if (!key) return json({ error: "Missing API key" }, request, 500);

  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id parameter" }, request, 400);

  const apiUrl = `https://content.guardianapis.com/${encodeURIComponent(id)}?` +
    `show-fields=trailText,body,bodyText,thumbnail,byline,wordcount` +
    `&show-elements=image&api-key=${key}`;

  try {
    const res = await fetchWithTimeout(apiUrl);
    if (!res.ok) return json({ error: "Guardian API error", status: res.status }, request, 502);

    const data = await res.json();
    const content = data?.response?.content;
    if (!content) return json({ error: "Content not found" }, request, 404);

    // Extract images
    const elements = content.elements || [];
    const images = [];
    
    for (const el of elements) {
      if (el.type === "image" && el.assets?.length > 0) {
        const sorted = el.assets.sort((a, b) => (b.typeData?.width || 0) - (a.typeData?.width || 0));
        const best = sorted[0];
        images.push({
          url: best.file || "",
          width: best.typeData?.width || 0,
          height: best.typeData?.height || 0,
          caption: best.typeData?.caption || el.imageTypeData?.caption || "",
          credit: best.typeData?.credit || el.imageTypeData?.credit || "",
          altText: best.typeData?.altText || el.imageTypeData?.altText || ""
        });
      }
    }

    // Clean HTML safely
    let bodyHtml = content.fields?.body || "";
    bodyHtml = cleanContentHtml(bodyHtml);

    const item = {
      guardianId: content.id || "",
      title: content.webTitle || "",
      url: content.webUrl || "",
      publishedAt: content.webPublicationDate || "",
      summaryHtml: content.fields?.trailText || "",
      contentHtml: bodyHtml,
      text: content.fields?.bodyText || "",
      wordCount: parseInt(content.fields?.wordcount, 10) || 0,
      author: content.fields?.byline || "The Guardian",
      image: content.fields?.thumbnail || (images[0]?.url || ""),
      imageCaption: images[0]?.caption || "",
      imageCredit: images[0]?.credit || "",
      images: images,
      source: { name: "The Guardian", url: "https://www.theguardian.com" }
    };

    return json(item, request);
  } catch (e) {
    return json({ error: "Fetch failed", message: e.message }, request, 502);
  }
}

// ========== Clean HTML (Safe version) ==========
function cleanContentHtml(html) {
  if (!html) return "";
  
  let h = html;
  
  // Remove sign-up links (simple string matching, not regex catastrophe)
  const signupPatterns = [
    'Sign up:',
    'Sign up for',
    'Newsletter',
    'Breaking News email',
    'AU Breaking News'
  ];
  
  // Remove <a> tags containing signup text
  for (const pattern of signupPatterns) {
    const lowerH = h.toLowerCase();
    const lowerP = pattern.toLowerCase();
    let idx = lowerH.indexOf(lowerP);
    
    while (idx !== -1) {
      // Find surrounding <p> or <a> tag and remove
      const before = h.lastIndexOf('<p', idx);
      const after = h.indexOf('</p>', idx);
      
      if (before !== -1 && after !== -1 && (idx - before) < 200) {
        h = h.slice(0, before) + h.slice(after + 4);
      } else {
        // Try removing just the link
        const aBefore = h.lastIndexOf('<a', idx);
        const aAfter = h.indexOf('</a>', idx);
        if (aBefore !== -1 && aAfter !== -1 && (idx - aBefore) < 300) {
          h = h.slice(0, aBefore) + h.slice(aAfter + 4);
        } else {
          break;
        }
      }
      
      const newLowerH = h.toLowerCase();
      idx = newLowerH.indexOf(lowerP);
    }
  }
  
  // Remove Interactive embeds
  h = h.replace(/<p>\s*\[Interactive\][^<]*<\/p>/gi, '');
  h = h.replace(/\[Interactive\]/gi, '');
  
  // Remove empty paragraphs
  h = h.replace(/<p>\s*<\/p>/gi, '');
  
  return h.trim();
}
