/* ================================================
   VoLearn - News (Guardian Reader)
   ================================================ */

import { onNavigate } from '../core/router.js';
import { showToast } from './toast.js';

const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';
const DEFAULT_SECTION = 'world';
const ITEMS_PER_PAGE = 5;
const FONT_KEY = 'volearn_news_reader_font_px';

const state = {
  section: DEFAULT_SECTION,
  items: [],
  currentPage: 1,
  totalPages: 1,
  loading: false,
  bound: false
};

const $ = (id) => document.getElementById(id);

function setStatus(text) {
  const el = $('news-status');
  if (el) el.textContent = text;
}

function timeAgo(iso) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false
    }) + ' GMT';
  } catch {
    return '';
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour12: false
    });
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

function sanitizeHtml(html) {
  if (window.DOMPurify) {
    return DOMPurify.sanitize(html || '', {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'p','br','strong','b','em','i','u','s','strike','del',
        'h1','h2','h3','h4','h5','h6',
        'blockquote','q','cite',
        'ul','ol','li',
        'a','img','figure','figcaption',
        'table','thead','tbody','tr','th','td',
        'pre','code','span','div','sub','sup','hr'
      ],
      ALLOWED_ATTR: [
        'href','src','alt','title','target','rel',
        'class','id','style','colspan','rowspan'
      ]
    });
  }
  return html || '';
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* --------- PATCH: paragraph heuristic for bodyText --------- */
function textToParagraphsHeuristic(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];

  let t = raw.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();

  if (/\n{2,}/.test(t)) {
    return t.split(/\n{2,}/g).map(p => p.trim()).filter(Boolean);
  }

  const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z“‘(])/g);
  const paras = [];
  let buf = [];

  for (const s of sentences) {
    const ss = s.trim();
    if (!ss) continue;
    buf.push(ss);
    if (buf.length >= 3) {
      paras.push(buf.join(' '));
      buf = [];
    }
  }
  if (buf.length) paras.push(buf.join(' '));

  if (paras.length <= 1 && t.length > 900) {
    const out = [];
    let i = 0;
    const step = 420;
    while (i < t.length) {
      out.push(t.slice(i, i + step).trim());
      i += step;
    }
    return out.filter(Boolean);
  }

  return paras;
}

function textToHtml(text) {
  const paras = textToParagraphsHeuristic(text);
  if (!paras.length) return '';
  return paras.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/* --------- Inject lead figure if contentHtml has no images --------- */
function injectLeadFigureIfMissing(html, item) {
  const content = String(html || '');
  const hasImg = /<img\b/i.test(content) || /<figure\b/i.test(content);
  if (hasImg) return content;

  const img = item?.images?.[0];
  const url = (img?.url || item?.image || '').trim();
  if (!url) return content;

  const caption = (img?.caption || item?.imageCaption || '').trim();
  const credit = (img?.credit || item?.imageCredit || '').trim();
  const cap = [caption, credit ? `Photograph: ${credit}` : ''].filter(Boolean).join(' ');

  const fig = `
    <figure class="news-figure">
      <img src="${escapeHtml(url)}" alt="${escapeHtml(img?.alt || '')}">
      ${cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''}
    </figure>
  `;
  return fig + content;
}

/* ==================== UI Helpers ==================== */

function setActiveTab(section) {
  document.querySelectorAll('#news-section .news-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.guardianSection === section);
  });
}

function toggleMoreTabs() {
  const more = $('news-more-tabs');
  const toggle = $('news-more-toggle');
  if (!more || !toggle) return;
  const isOpen = more.classList.contains('open');
  more.classList.toggle('open', !isOpen);
  toggle.classList.toggle('active', !isOpen);
}

function showListView() {
  $('news-list-view')?.style && ($('news-list-view').style.display = 'flex');
  $('news-reader-view')?.style && ($('news-reader-view').style.display = 'none');
}

function showReaderView() {
  $('news-list-view')?.style && ($('news-list-view').style.display = 'none');
  const rv = $('news-reader-view');
  if (rv?.style) rv.style.display = 'block';
  rv?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function updatePagination() {
  const prevBtn = $('news-prev');
  const nextBtn = $('news-next');
  const pageInfo = $('news-page-info');

  if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
  if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages;
  if (pageInfo) pageInfo.textContent = `Trang ${state.currentPage} / ${state.totalPages}`;
}

/* ==================== Render ==================== */

function renderList() {
  const list = $('news-list');
  if (!list) return;

  const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = state.items.slice(start, end);

  list.innerHTML = '';

  pageItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';

    const title = item.title || '(Không có tiêu đề)';
    const summary = stripHtml(item.summaryHtml || item.summary || '');
    const author = item.author || 'The Guardian';
    const date = formatDate(item.publishedAt);
    const thumb = item.image || '';

    card.innerHTML = `
      ${thumb ? `<img class="news-card-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy">` : ''}
      <div class="news-card-content">
        <h3 class="news-card-title">${escapeHtml(title)}</h3>
        ${summary ? `<p class="news-card-summary">${escapeHtml(summary)}</p>` : ''}
        <div class="news-card-meta">
          <span><i class="fas fa-user"></i> ${escapeHtml(author)}</span>
          <span><i class="fas fa-clock"></i> ${escapeHtml(date)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openItem(item.guardianId));
    list.appendChild(card);
  });

  updatePagination();
}

function renderReader(item) {
  const titleEl = $('news-title');
  const metaEl = $('news-meta');
  const coverEl = $('news-cover');
  const readerEl = $('news-reader');

  // Title
  if (titleEl) {
    titleEl.textContent = item?.title || '(Không có tiêu đề)';
  }

  // Meta
  if (metaEl) {
    const ago = timeAgo(item?.publishedAt);
    const time = formatTime(item?.publishedAt);
    const author = item?.author || 'The Guardian';
    
    metaEl.innerHTML = `
      <span class="news-time-ago">${escapeHtml(ago)}</span>
      <span class="news-time-full">${escapeHtml(time)}</span>
      <span>• ${escapeHtml(author)}</span>
    `;
  }

  // Cover image
  if (coverEl) {
    if (item?.image) {
      const caption = item?.imageCaption || '';
      const credit = item?.imageCredit || '';
      let captionHtml = '';
      
      if (caption || credit) {
        captionHtml = `<figcaption>${escapeHtml(caption)}${credit ? ' Photograph: ' + escapeHtml(credit) : ''}</figcaption>`;
      }
      
      coverEl.innerHTML = `
        <figure class="news-figure">
          <img src="${escapeHtml(item.image)}" alt="" loading="lazy">
          ${captionHtml}
        </figure>
      `;
    } else {
      coverEl.innerHTML = '';
    }
  }

  // Content - dùng contentHtml
  if (readerEl) {
    let html = '';
    
    if (item?.contentHtml) {
      html = item.contentHtml;
    } else if (item?.text) {
      html = item.text.trim().split(/\n\n+/)
        .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
        .join('');
    } else if (item?.summaryHtml) {
      html = `<p>${item.summaryHtml}</p>`;
    }
    
    readerEl.innerHTML = sanitizeHtml(html);
  }

  showReaderView();
}

/* ==================== Data ==================== */

async function openItem(guardianId) {
  if (!guardianId) return;
  setStatus('Đang tải bài viết...');

  try {
    const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
    const item = await fetchJSON(url);
    renderReader(item);
    setStatus('');
  } catch (e) {
    console.error('News openItem error:', e);
    setStatus('Không tải được bài.');
    showToast?.('Lỗi tải bài viết', 'error');
  }
}

async function loadFeed(section) {
  state.section = section;
  state.loading = true;
  state.currentPage = 1;
  setActiveTab(section);
  setStatus('Đang tải tin...');
  showListView();

  try {
    const url = `${NEWS_API_BASE}/guardian/feed?section=${encodeURIComponent(section)}&pageSize=30`;
    const data = await fetchJSON(url);
    const items = Array.isArray(data?.items) ? data.items : [];

    state.items = items;
    state.totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
    state.loading = false;

    if (!items.length) {
      setStatus('Không có bài viết.');
      const listEl = $('news-list');
      if (listEl) listEl.innerHTML = '<p style="text-align:center;opacity:0.6;padding:40px;">Không tìm thấy tin nào.</p>';
      return;
    }

    setStatus(`${items.length} bài viết • ${data?.provider?.name || 'The Guardian'}`);
    renderList();
  } catch (e) {
    state.loading = false;
    console.error('News loadFeed error:', e);
    setStatus('Không tải được tin.');
    showToast?.(`Lỗi tải tin (${section})`, 'error');
  }
}

/* ==================== Events ==================== */

function bindNewsUI() {
  if (state.bound) return;
  state.bound = true;

  const root = $('news-section');
  if (!root) return;

  $('news-more-toggle')?.addEventListener('click', () => toggleMoreTabs());
  $('news-refresh')?.addEventListener('click', () => loadFeed(state.section));

  root.querySelectorAll('.news-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.guardianSection;
      if (section) loadFeed(section);
    });
  });

  $('news-reader-back')?.addEventListener('click', () => {
    showListView();
    setStatus(`${state.items.length} bài viết • The Guardian`);
  });

  $('news-prev')?.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderList();
      $('news-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  $('news-next')?.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
      renderList();
      $('news-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Font controls (persist)
  let fontSize = parseInt(localStorage.getItem(FONT_KEY) || '18', 10);
  if (!Number.isFinite(fontSize)) fontSize = 18;

  const applyFont = () => {
    fontSize = Math.max(14, Math.min(28, fontSize));
    localStorage.setItem(FONT_KEY, String(fontSize));
    const reader = $('news-reader');
    if (reader) reader.style.fontSize = `${fontSize}px`;
  };

  $('news-font-inc')?.addEventListener('click', () => { fontSize += 2; applyFont(); });
  $('news-font-dec')?.addEventListener('click', () => { fontSize -= 2; applyFont(); });

  applyFont();
}

export function initNews() {
  onNavigate('news', () => {
    bindNewsUI();
    showListView();
    loadFeed(DEFAULT_SECTION);
  });
}
