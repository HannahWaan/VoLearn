/* ========================================
   VoLearn - News (Guardian Reader)
   - In-app list + in-app reader
   - New-tab fullscreen reader via hash route:
     #/reader/guardian/<guardianId>
   ======================================== */

import { onNavigate, navigate } from '../core/router.js';
import { showToast } from './toast.js';

const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';

// World trước, science tiếp
const DEFAULT_SECTION = 'world';

let state = {
  section: DEFAULT_SECTION,
  items: [],
  selectedId: null,
  loading: false,
  bound: false
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  const el = $('news-status');
  if (el) el.textContent = text;
}

function setActiveTab(section) {
  document.querySelectorAll('#news-section .news-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.guardianSection === section);
  });
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

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { hour12: false });
  } catch {
    return iso;
  }
}

function sanitizeHtml(html) {
  if (!window.DOMPurify) {
    const div = document.createElement('div');
    div.textContent = html || '';
    return div.innerHTML;
  }
  return window.DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? ` - ${text.slice(0, 160)}` : ''}`);
  }
  return res.json();
}

function openInNewReaderTab(guardianId) {
  if (!guardianId) return;
  const base = `${location.origin}${location.pathname}`;
  const hash = `#/reader/guardian/${encodeURIComponent(guardianId)}`;
  window.open(`${base}${hash}`, '_blank', 'noopener,noreferrer');
}

function isReaderHash() {
  return /^#\/reader\/guardian\//.test(location.hash || '');
}

function parseReaderGuardianId() {
  const m = (location.hash || '').match(/^#\/reader\/guardian\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function setReaderMode(on) {
  // Toggle toolbar
  const toolbar = $('news-reader-toolbar');
  if (toolbar) toolbar.style.display = on ? 'flex' : 'none';

  // Hide list area + tabs in reader mode
  const list = $('news-list');
  if (list) list.style.display = on ? 'none' : 'flex';

  // Hide tabs + controls
  document.querySelectorAll('#news-section .news-tabs, #news-section .news-tabs-more')
    .forEach(el => (el.style.display = on ? 'none' : ''));

  const moreTabs = $('news-more-tabs');
  if (moreTabs) moreTabs.style.display = on ? 'none' : (moreTabs.style.display || 'none');

  const moreToggle = $('news-more-toggle');
  if (moreToggle) moreToggle.style.display = on ? 'none' : '';

  const refresh = $('news-refresh');
  if (refresh) refresh.style.display = on ? 'none' : '';

  // Hide "open source" button in reader mode (you said no jumping to original)
  const openWrap = $('news-open-source-wrap');
  if (openWrap) openWrap.style.display = 'none';

  // In reader mode, make reader column full width by switching grid to block
  // We do it minimally by locating the first grid container inside card-body:
  const section = $('news-section');
  const grid = section?.querySelector('div[style*="grid-template-columns"]');
  if (grid) {
    if (on) {
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
  const openWrap = $('news-open-source-wrap');

  if (title) title.textContent = 'Chưa chọn bài';
  if (meta) meta.textContent = '';
  if (reader) reader.innerHTML = '';
  if (openWrap) openWrap.style.display = 'none';
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

  // Prefer HTML body; fallback summary; fallback plain text -> paragraphs
  const contentHtml = item?.contentHtml;
  const summaryHtml = item?.summaryHtml;

  let html = '';
  if (contentHtml) {
    html = contentHtml;
  } else if (summaryHtml) {
    html = summaryHtml;
  } else if (item?.text) {
    html = `<p>${escapeHtml(item.text).replaceAll('\n\n', '</p><p>').replaceAll('\n', '<br>')}</p>`;
  }

  if (readerEl) readerEl.innerHTML = sanitizeHtml(html);
}

async function openItem(guardianId, { readerMode = false } = {}) {
  if (!guardianId) return;

  state.selectedId = guardianId;
  setStatus('Đang tải bài...');

  try {
    const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
    const item = await fetchJSON(url);
    renderReader(item);
    setStatus('Sẵn sàng.');

    if (readerMode) setReaderMode(true);
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
              Đọc (tab mới)
            </button>
            <button class="btn-secondary" type="button" data-action="preview" style="padding:6px 10px;">
              Xem nhanh
            </button>
          </div>
        </div>
      </div>
    `;

    const btnRead = card.querySelector('[data-action="read"]');
    const btnPreview = card.querySelector('[data-action="preview"]');

    btnRead?.addEventListener('click', (e) => {
      e.preventDefault();
      openInNewReaderTab(item.guardianId);
    });

    btnPreview?.addEventListener('click', (e) => {
      e.preventDefault();
      setReaderMode(false);
      openItem(item.guardianId, { readerMode: false });
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
      renderList([]);
      return;
    }

    setStatus(`Đã tải ${items.length} bài • ${data?.provider?.name || 'The Guardian'}`);
    renderList(items);

    // Auto preview first item (only when not in reader hash mode)
    if (!isReaderHash()) {
      await openItem(items[0]?.guardianId, { readerMode: false });
    }
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
    setReaderMode(false);
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

      setReaderMode(false);
      loadFeed(section);
    });
  });

  // Reader back button
  $('news-reader-back')?.addEventListener('click', () => {
    // go back to list view (same tab)
    location.hash = '#/news';
    setReaderMode(false);
    loadFeed(DEFAULT_SECTION);
  });

  toggleMoreTabs(false);
}

function handleHashRoute() {
  // Only care when we are on news section (but in new tab it's fine to force navigate)
  const guardianId = parseReaderGuardianId();
  if (guardianId) {
    // Ensure section is visible
    navigate('news');
    bindNewsUIOnce();
    // Fullscreen reader mode
    setReaderMode(true);
    openItem(guardianId, { readerMode: true });
    return;
  }

  // If hash is #/news or anything else: ensure normal mode
  if ((location.hash || '').startsWith('#/news')) {
    setReaderMode(false);
  }
}

export function initNews() {
  onNavigate('news', () => {
    bindNewsUIOnce();

    // If opened via new-tab reader hash, handle it
    if (isReaderHash()) {
      handleHashRoute();
      return;
    }

    // Normal section load: default World
    setReaderMode(false);
    loadFeed(DEFAULT_SECTION);
  });

  // Global hashchange listener
  window.addEventListener('hashchange', () => {
    // Only act if reader hash OR currently in news section
    const isNewsActive = document.getElementById('news-section')?.classList.contains('active');
    if (isReaderHash() || isNewsActive) {
      handleHashRoute();
    }
  });
}
