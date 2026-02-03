export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "") {
      return json({ ok: true, service: "volearn-guardian-reader", version: "2.1" }, request);
    }

    // Debug endpoints
    if (url.pathname === "/debug/guardian") {
      const key = env.GUARDIAN_API_KEY || "";
      return json({
        hasKey: !!key,
        keyLen: key.length,
        keyLast4: key.slice(-4)
      }, request);
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

// ========== CORS ==========
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
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request)
    }
  });
}

// ========== Helpers ==========
function clampInt(val, min, max, def) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

async function fetchCached(url, ctx, ttl = 300) {
  const res = await fetch(url, {
    cf: { cacheTtl: ttl, cacheEverything: true },
    headers: { "User-Agent": "VoLearnReader/2.1" }
  });
  return res;
}

// ========== Guardian Feed ==========
async function handleGuardianFeed(url, env, ctx, request) {
  const key = env.GUARDIAN_API_KEY;
  if (!key) {
    return json({ error: "Missing API key" }, request, 500);
  }

  const section = url.searchParams.get("section") || "world";
  const page = clampInt(url.searchParams.get("page"), 1, 100, 1);
  const pageSize = clampInt(url.searchParams.get("pageSize"), 1, 50, 10);

  const apiUrl = `https://content.guardianapis.com/search?` +
    `section=${encodeURIComponent(section)}` +
    `&page=${page}` +
    `&page-size=${pageSize}` +
    `&order-by=newest` +
    `&show-fields=trailText,thumbnail,byline,wordcount` +
    `&api-key=${key}`;

  const res = await fetchCached(apiUrl, ctx, 180);
  if (!res.ok) {
    return json({ error: "Guardian API error", status: res.status }, request, 502);
  }

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

  return json({
    provider: "guardian",
    section,
    page,
    pageSize,
    total: data?.response?.total || 0,
    items
  }, request);
}

// ========== Guardian Item ==========
async function handleGuardianItem(url, env, ctx, request) {
  const key = env.GUARDIAN_API_KEY;
  if (!key) {
    return json({ error: "Missing API key" }, request, 500);
  }

  const id = url.searchParams.get("id");
  if (!id) {
    return json({ error: "Missing id parameter" }, request, 400);
  }

  const apiUrl = `https://content.guardianapis.com/${encodeURIComponent(id)}?` +
    `show-fields=trailText,body,bodyText,thumbnail,byline,wordcount` +
    `&show-elements=image` +
    `&api-key=${key}`;

  const res = await fetchCached(apiUrl, ctx, 600);
  if (!res.ok) {
    return json({ error: "Guardian API error", status: res.status }, request, 502);
  }

  const data = await res.json();
  const content = data?.response?.content;
  if (!content) {
    return json({ error: "Content not found" }, request, 404);
  }

  // Extract images from elements
  const elements = content.elements || [];
  const images = [];
  
  for (const el of elements) {
    if (el.type === "image" && el.assets && el.assets.length > 0) {
      // Get the largest asset
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

  // Get raw HTML body
  let bodyHtml = content.fields?.body || "";
  
  // Clean up unwanted sections
  bodyHtml = cleanContentHtml(bodyHtml, images);

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
}

// ========== Clean Content HTML ==========
function cleanContentHtml(html, images) {
  if (!html) return "";
  
  // Remove "Sign up" blocks
  html = html.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");
  html = html.replace(/<div[^>]*class="[^"]*sign-?up[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<p[^>]*>[\s\S]*?Sign up[\s\S]*?newsletter[\s\S]*?<\/p>/gi, "");
  
  // Remove "Related" links blocks
  html = html.replace(/<div[^>]*class="[^"]*related[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<aside[^>]*class="[^"]*related[^"]*"[^>]*>[\s\S]*?<\/aside>/gi, "");
  
  // Remove any remaining promotional/signup paragraphs
  html = html.replace(/<p[^>]*>[\s\S]*?(?:Sign up|Subscribe|Newsletter|Breaking news email)[\s\S]*?<\/p>/gi, "");
  
  // Remove Guardian internal promo blocks
  html = html.replace(/<figure[^>]*class="[^"]*interactive[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");
  
  // Insert images into content if they exist and aren't already in the HTML
  if (images && images.length > 0) {
    // Check if body already has figure/img tags
    const hasImages = /<figure|<img/i.test(html);
    
    if (!hasImages) {
      // Insert first image after first paragraph or at the beginning
      const firstImg = images[0];
      const imgHtml = buildImageHtml(firstImg);
      
      // Try to insert after first </p> or </ul>
      const insertPoint = html.search(/<\/p>|<\/ul>/i);
      if (insertPoint > -1) {
        const endTag = html.match(/<\/p>|<\/ul>/i)[0];
        html = html.slice(0, insertPoint + endTag.length) + imgHtml + html.slice(insertPoint + endTag.length);
      } else {
        html = imgHtml + html;
      }
      
      // Insert additional images throughout if there are more
      if (images.length > 1) {
        const paragraphs = html.split(/<\/p>/i);
        const interval = Math.floor(paragraphs.length / images.length);
        
        for (let i = 1; i < images.length && i < 5; i++) {
          const insertIdx = Math.min(interval * i, paragraphs.length - 1);
          if (insertIdx > 0 && insertIdx < paragraphs.length) {
            paragraphs[insertIdx] += buildImageHtml(images[i]);
          }
        }
        html = paragraphs.join("</p>");
      }
    }
  }
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gi, "");
  html = html.replace(/\n\s*\n/g, "\n");
  
  return html.trim();
}

function buildImageHtml(img) {
  if (!img || !img.url) return "";
  
  let figcaption = "";
  if (img.caption || img.credit) {
    const captionText = img.caption || "";
    const creditText = img.credit ? `<span class="news-img-credit">Photograph: ${img.credit}</span>` : "";
    figcaption = `<figcaption>${captionText}${captionText && creditText ? " " : ""}${creditText}</figcaption>`;
  }
  
  return `<figure class="news-body-figure">
    <img src="${img.url}" alt="${img.altText || ""}" loading="lazy">
    ${figcaption}
  </figure>`;
}
