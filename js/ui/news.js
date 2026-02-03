/* ========================================
   VoLearn - News (Guardian Reader)
   - No new browser tab
   - Two modes inside the same section:
     1) Split/List mode
     2) Fullscreen Reader mode
   ======================================== */

import { onNavigate } from '../core/router.js';
import { showToast } from './toast.js';

const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';
const DEFAULT_SECTION = 'world';

let state = {
  section: DEFAULT_SECTION,
  items: [],
  loading: false,
  bound: false,
  mode: 'split' // 'split' | 'reader'
};

function $(id) { return document.getElementById(id); }

function setStatus(text) {
  const el = $('news-status');
  if (el) el.textContent = text;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', { hour12: false });
  } catch { return iso; }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizeHtml(html) {
  if (!window.DOMPurify) {
    const div = document.createElement('div');
    div.textContent = html || '';
    return div.innerHTML;
  }
  return window.DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } });
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? ` - ${text.slice(0, 160)}` : ''}`);
  }
  return res.json();
}

function toggleMoreTabs(force) {
  const more = $('news-more-tabs');
  const toggle = $('news-more-toggle');
  if (!more || !toggle) return;

  const shouldOpen = typeof force === 'boolean'
    ? force
    : more.style.display === 'none';

  more.style.display = shouldOpen ? 'flex' : 'none';
  toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  toggle.textContent = shouldOpen ? 'Less…' : 'More…';
}

function setActiveTab(section) {
  document.querySelectorAll('#news-section .news-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.guardianSection === section);
  });
}

function setMode(mode) {
  state.mode = mode;

  const toolbar = $('news-reader-toolbar');
  if (toolbar) toolbar.style.display = (mode === 'reader') ? 'flex' : 'none';

  // Hide list + tabs in reader mode
  const list = $('news-list');
  if (list) list.style.display = (mode === 'reader') ? 'none' : 'flex';

  // Hide tabs container(s)
  const tabRow = document.querySelector('#news-section .news-tabs');
  if (tabRow) tabRow.style.display = (mode === 'reader') ? 'none' : 'flex';

  const moreRow = $('news-more-tabs');
  if (moreRow) moreRow.style.display = (mode === 'reader') ? 'none' : (moreRow.style.display || 'none');

  const moreToggle = $('news-more-toggle');
  if (moreToggle) moreToggle.style.display = (mode === 'reader') ? 'none' : '';

  const refresh = $('news-refresh');
  if (refresh) refresh.style.display = (mode === 'reader') ? 'none' : '';

  // Hide open-source button always (you don't want to go to origin)
  const openWrap = $('news-open-source-wrap');
  if (openWrap) openWrap.style.display = 'none';

  // Make reader full width by switching the grid container to block
  const section = $('news-section');
  const grid = section?.querySelector('div[style*="grid-template-columns"]');
  if (grid) {
    if (mode === 'reader') {
      grid.dataset.prevDisplay = grid.style.display || '';
      grid.dataset.prevGrid = grid.style.gridTemplateColumns || '';
      grid.style.display = 'block';
      grid.style.gridTemplateColumns = '';
    } else {
      grid.style.display = grid.dataset.prevDisplay || 'grid';
      grid.style.gridTemplateColumns = grid.dataset.prevGrid || '1fr 1.2fr';
    }
  }
}

function renderReaderEmpty() {
  const title = $('news-title');
  const meta = $('news-meta');
  const reader = $('news-reader');

  if (title) title.textContent = 'Chưa chọn bài';
  if (meta) meta.textContent = '';
  if (reader) reader.innerHTML = '';
}

function renderReader(item) {
  const titleEl = $('news-title');
  const metaEl = $('news-meta');
  const readerEl = $('news-reader');

  const title = item?.title || '(Không có tiêu đề)';
  const meta = [
    item?.source?.name || 'The Guardian',
    item?.author ? `• ${item.author}` : '',
    item?.publishedAt ? `• ${formatDate(item.publishedAt)}` : ''
  ].join(' ');

  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = meta;

  // Prefer HTML body; fallback summary; fallback text
  if (item?.contentHtml) {
    html = item.contentHtml;
  } else if (item?.text) {
    // Full bodyText -> convert to HTML paragraphs
    html = `<p>${escapeHtml(item.text)
      .trim()
      .replaceAll('\r\n', '\n')
      .replaceAll('\n\n', '</p><p>')
      .replaceAll('\n', '<br>')}</p>`;
  } else if (item?.summaryHtml) {
    html = item.summaryHtml;
  }

async function openItem(guardianId) {
  if (!guardianId) return;
  setStatus('Đang tải bài...');

  try {
    const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
    const item = await fetchJSON(url);
    renderReader(item);
    setStatus('Sẵn sàng.');
  } catch (e) {
    console.error('News openItem error:', e);
    setStatus('Không tải được bài.');
    showToast?.('Tin Tức: lỗi tải bài', 'error');
  }
}

function renderList(items) {
  const list = $('news-list');
  if (!list) return;

  list.innerHTML = '';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '10px';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '12px';
    card.style.border = '1px solid var(--border-color)';
    card.style.background = 'var(--card-bg, #fff)';

    const title = item.title || '(Không có tiêu đề)';
    const meta = [
      item.source?.name || 'The Guardian',
      item.author ? `• ${item.author}` : '',
      item.publishedAt ? `• ${formatDate(item.publishedAt)}` : ''
    ].join(' ');

    card.innerHTML = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        ${item.image ? `<img src="${item.image}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex:0 0 auto;">` : ''}
        <div style="min-width:0; flex:1;">
          <div style="font-weight:700; line-height:1.25; margin-bottom:6px;">
            ${escapeHtml(title)}
          </div>
          <div style="opacity:.8; font-size:.9rem; margin-bottom:10px;">
            ${escapeHtml(meta)}
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-primary" type="button" data-action="read" style="padding:6px 10px;">
              Đọc
            </button>
            <button class="btn-secondary" type="button" data-action="preview" style="padding:6px 10px;">
              Xem nhanh
            </button>
          </div>
        </div>
      </div>
    `;

    card.querySelector('[data-action="preview"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      setMode('split');
      openItem(item.guardianId);
    });

    card.querySelector('[data-action="read"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      setMode('reader');
      openItem(item.guardianId);
    });

    list.appendChild(card);
  });
}

async function loadFeed(section) {
  state.section = section;
  state.loading = true;
  setActiveTab(section);
  setStatus('Đang tải tin...');
  renderList([]);
  renderReaderEmpty();

  try {
    const url = `${NEWS_API_BASE}/guardian/feed?section=${encodeURIComponent(section)}&pageSize=12`;
    const data = await fetchJSON(url);
    const items = Array.isArray(data?.items) ? data.items : [];
    state.items = items;
    state.loading = false;

    if (!items.length) {
      setStatus('Không có bài viết.');
      return;
    }

    setStatus(`Đã tải ${items.length} bài • ${data?.provider?.name || 'The Guardian'}`);
    renderList(items);

    // Auto preview first item
    setMode('split');
    openItem(items[0]?.guardianId);
  } catch (e) {
    state.loading = false;
    console.error('News loadFeed error:', e);
    setStatus('Không tải được tin.');
    showToast?.(`Tin Tức: lỗi tải feed (${section})`, 'error');
  }
}

function bindNewsUIOnce() {
  const root = $('news-section');
  if (!root || state.bound) return;
  state.bound = true;

  $('news-more-toggle')?.addEventListener('click', () => toggleMoreTabs());

  $('news-refresh')?.addEventListener('click', () => {
    setMode('split');
    loadFeed(state.section);
  });

  // Tabs click
  root.querySelectorAll('.news-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.guardianSection;
      if (!section) return;

      // If clicked in more-tabs, close it
      const isInMore = btn.closest('#news-more-tabs');
      if (isInMore) toggleMoreTabs(false);

      setMode('split');
      loadFeed(section);
    });
  });

  // Back button
  $('news-reader-back')?.addEventListener('click', () => {
    setMode('split');
  });

  toggleMoreTabs(false);
}

export function initNews() {
  onNavigate('news', () => {
    bindNewsUIOnce();
    setMode('split');
    loadFeed(DEFAULT_SECTION);
  });
}
