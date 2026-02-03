export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/" || url.pathname === "") {
      return json({ ok: true, service: "volearn-guardian-reader", version: "2.4" }, request);
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
      headers: { "User-Agent": "VoLearnReader/2.4" }
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

    // Extract ALL images from elements
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

    // Clean and enhance HTML
    let bodyHtml = content.fields?.body || "";
    bodyHtml = cleanAndEnhanceHtml(bodyHtml, images);

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

// ========== Clean and Enhance HTML ==========
function cleanAndEnhanceHtml(html, images) {
  if (!html) return "";
  
  let h = html;
  
  // 1. Remove unwanted paragraphs containing these phrases
  const removePatterns = [
    'Sign up:',
    'Sign up for',
    'Newsletter',
    'Breaking News email',
    'AU Breaking News',
    'Tribute post from',
    'Interactive',
    'Related:',
    'Skip past newsletter promotion'
  ];
  
  for (const pattern of removePatterns) {
    const lowerPattern = pattern.toLowerCase();
    let safety = 0;
    
    while (h.toLowerCase().includes(lowerPattern) && safety < 10) {
      safety++;
      const idx = h.toLowerCase().indexOf(lowerPattern);
      
      // Find the paragraph containing this text
      let pStart = h.lastIndexOf('<p', idx);
      let pEnd = h.indexOf('</p>', idx);
      
      if (pStart !== -1 && pEnd !== -1 && (idx - pStart) < 500) {
        h = h.slice(0, pStart) + h.slice(pEnd + 4);
      } else {
        // Try to remove just that line
        let lineStart = h.lastIndexOf('>', idx) + 1;
        let lineEnd = h.indexOf('<', idx);
        if (lineEnd > lineStart) {
          h = h.slice(0, lineStart) + h.slice(lineEnd);
        } else {
          break;
        }
      }
    }
  }
  
  // 2. Remove markdown-style links [text](url) - convert to just text
  h = h.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 3. Remove standalone URLs in text
  h = h.replace(/<p>[^<]*https?:\/\/[^<]*<\/p>/gi, '');
  
  // 4. Remove empty paragraphs
  h = h.replace(/<p>\s*<\/p>/gi, '');
  h = h.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
  
  // 5. Clean up multiple line breaks
  h = h.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
  
  // 6. INSERT IMAGES into content
  if (images && images.length > 0) {
    // Check if content already has images
    const hasImages = /<img\s/i.test(h);
    
    if (!hasImages) {
      // Split content into paragraphs
      const parts = h.split(/<\/p>/i);
      
      if (parts.length > 2) {
        // Insert first image after 2nd paragraph
        const img1 = buildFigureHtml(images[0]);
        if (img1 && parts.length > 2) {
          parts[1] = parts[1] + '</p>' + img1;
          parts[1] = parts[1].replace('</p></p>', '</p>');
        }
        
        // Insert second image after 5th paragraph if exists
        if (images.length > 1 && parts.length > 5) {
          const img2 = buildFigureHtml(images[1]);
          parts[4] = parts[4] + '</p>' + img2;
          parts[4] = parts[4].replace('</p></p>', '</p>');
        }
        
        // Insert third image after 8th paragraph if exists
        if (images.length > 2 && parts.length > 8) {
          const img3 = buildFigureHtml(images[2]);
          parts[7] = parts[7] + '</p>' + img3;
          parts[7] = parts[7].replace('</p></p>', '</p>');
        }
        
        h = parts.join('</p>');
      } else if (parts.length > 0) {
        // Short content - insert at beginning
        h = buildFigureHtml(images[0]) + h;
      }
    }
  }
  
  // 7. Fix any broken HTML from our manipulation
  h = h.replace(/<\/p>\s*<\/p>/gi, '</p>');
  h = h.replace(/<p>\s*<p>/gi, '<p>');
  
  return h.trim();
}

function buildFigureHtml(img) {
  if (!img || !img.url) return '';
  
  const caption = img.caption || '';
  const credit = img.credit || '';
  
  let figcaption = '';
  if (caption || credit) {
    const parts = [];
    if (caption) parts.push(caption);
    if (credit) parts.push(`<span class="img-credit">Photograph: ${escapeHtml(credit)}</span>`);
    figcaption = `<figcaption>${parts.join(' ')}</figcaption>`;
  }
  
  return `
<figure class="content-figure">
  <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.altText || '')}" loading="lazy">
  ${figcaption}
</figure>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
