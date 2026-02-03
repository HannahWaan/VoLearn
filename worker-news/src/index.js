export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/" || url.pathname === "") {
      return json({ ok: true, service: "volearn-guardian-reader", version: "2.5" }, request);
    }

    if (url.pathname === "/debug/guardian") {
      const key = env.GUARDIAN_API_KEY || "";
      return json({ hasKey: !!key, keyLen: key.length, keyLast4: key.slice(-4) }, request);
    }

    if (url.pathname === "/guardian/feed") {
      return handleGuardianFeed(url, env, ctx, request);
    }

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
      headers: { "User-Agent": "VoLearnReader/2.5" }
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

  const apiUrl = `https://content.guardianapis.com/${id}?` +
    `show-fields=trailText,body,bodyText,thumbnail,byline,wordcount` +
    `&show-elements=image&api-key=${key}`;

  try {
    const res = await fetchWithTimeout(apiUrl);
    if (!res.ok) return json({ error: "Guardian API error", status: res.status }, request, 502);

    const data = await res.json();
    const content = data?.response?.content;
    if (!content) return json({ error: "Content not found" }, request, 404);

    // Extract images (only "main" relation, skip thumbnail duplicates)
    const elements = content.elements || [];
    const images = [];
    const seenIds = new Set();
    
    for (const el of elements) {
      if (el.type === "image" && el.relation === "main" && el.assets?.length > 0) {
        // Skip if we've seen this image ID
        if (seenIds.has(el.id)) continue;
        seenIds.add(el.id);
        
        const sorted = el.assets.sort((a, b) => 
          (parseInt(b.typeData?.width) || 0) - (parseInt(a.typeData?.width) || 0)
        );
        const best = sorted[0];
        
        images.push({
          url: best.file || "",
          width: parseInt(best.typeData?.width) || 0,
          height: parseInt(best.typeData?.height) || 0,
          caption: best.typeData?.caption || "",
          credit: best.typeData?.credit || "",
          altText: best.typeData?.altText || ""
        });
      }
    }

    // Clean HTML
    let bodyHtml = content.fields?.body || "";
    bodyHtml = cleanContentHtml(bodyHtml);

    const mainImage = images[0] || null;

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
      image: mainImage?.url || content.fields?.thumbnail || "",
      imageCaption: mainImage?.caption || "",
      imageCredit: mainImage?.credit || "",
      images: images,
      source: { name: "The Guardian", url: "https://www.theguardian.com" }
    };

    return json(item, request);
  } catch (e) {
    return json({ error: "Fetch failed", message: e.message }, request, 502);
  }
}

// ========== Clean Content HTML ==========
function cleanContentHtml(html) {
  if (!html) return "";
  
  let h = html;
  
  const removePatterns = [
    'Sign up:',
    'Sign up for',
    'Newsletter',
    'Breaking News email',
    'AU Breaking News',
    'Tribute post from',
    '[Interactive]',
    'Interactive',
    'Related:',
    'Skip past newsletter',
    'Updated at',
    'First published on',
    'Last modified on'
  ];
  
  for (const pattern of removePatterns) {
    const lowerPattern = pattern.toLowerCase();
    let safety = 0;
    
    while (h.toLowerCase().includes(lowerPattern) && safety < 20) {
      safety++;
      const idx = h.toLowerCase().indexOf(lowerPattern);
      let pStart = h.lastIndexOf('<p', idx);
      let pEnd = h.indexOf('</p>', idx);
      
      if (pStart !== -1 && pEnd !== -1 && (idx - pStart) < 500) {
        h = h.slice(0, pStart) + h.slice(pEnd + 4);
      } else {
        break;
      }
    }
  }
  
  // Remove timestamp patterns like "8.31am GMT", "9.27am GMT", "14:30 BST"
  h = h.replace(/<p>\s*\d{1,2}\.\d{2}\s*(am|pm)\s*(GMT|BST|EST|PST|UTC)?[^<]*<\/p>/gi, '');
  h = h.replace(/<p>\s*\d{1,2}:\d{2}\s*(am|pm)?\s*(GMT|BST|EST|PST|UTC)?[^<]*<\/p>/gi, '');
  h = h.replace(/<p>\s*Updated\s+at\s+\d{1,2}[.:]\d{2}\s*(am|pm)?\s*(GMT|BST|EST|PST|UTC)?[^<]*<\/p>/gi, '');
  
  // Remove standalone timestamp lines (not in <p> tags)
  h = h.replace(/\d{1,2}\.\d{2}\s*(am|pm)\s*(GMT|BST|EST|PST|UTC)\s*(<br>|<\/p>)/gi, '$3');
  h = h.replace(/\d{1,2}:\d{2}\s*(am|pm)?\s*(GMT|BST|EST|PST|UTC)\s*(<br>|<\/p>)/gi, '$3');
  
  // Clean markdown links
  h = h.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove standalone URLs
  h = h.replace(/<p>\s*https?:\/\/[^<]*<\/p>/gi, '');
  
  // Remove empty paragraphs
  h = h.replace(/<p>\s*<\/p>/gi, '');
  h = h.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
  
  return h.trim();
}
