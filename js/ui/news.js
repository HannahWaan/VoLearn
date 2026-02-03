/* ========================================
   VoLearn - News (Guardian Reader)
   ======================================== */

import { onNavigate } from '../core/router.js';
import { showToast } from './toast.js';

const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';

// World trước, science sau (đúng yêu cầu)
const DEFAULT_SECTION = 'world';

let state = {
  section: DEFAULT_SECTION,
  items: [],
  selectedId: null,
  loading: false
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
  // DOMPurify đã được add trong index.html ở step trước
  if (!window.DOMPurify) {
    // Fallback an toàn: hiển thị như text
    const div = document.createElement('div');
    div.textContent = html || '';
    return div.innerHTML;
  }
  return window.DOMPurify.sanitize(html || '', {
    USE_PROFILES: { html: true }
  });
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text ? `- ${text.slice(0, 120)}` : ''}`.trim());
  }
  return res.json();
}

async function loadFeed(section) {
  state.section = section;
  state.loading = true;
  setActiveTab(section);
  setStatus('Đang tải tin...');

  // Clear list + reader (UX)
  renderList([]);
  renderReaderEmpty();

  try {
    const url = `${NEWS_API_BASE}/guardian/feed?section=${encodeURIComponent(section)}&pageSize=12`;
    const data = await fetchJSON(url);
    const items = Array.isArray(data?.items) ? data.items : [];
    state.items = items;
    state.loading = false;

    if (!items.length) {
      setStatus('Không có bài viết (hoặc API trả rỗng).');
      renderList([]);
      return;
    }

    setStatus(`Đã tải ${items.length} bài • ${data?.provider?.name || 'The Guardian'}`);
    renderList(items);

    // Auto-open bài đầu tiên cho trải nghiệm “đọc trong app”
    await openItem(items[0]?.guardianId);
  } catch (e) {
    state.loading = false;
    console.error('News loadFeed error:', e);
    setStatus('Không tải được tin. Vui lòng thử lại.');
    showToast?.(`Tin Tức: lỗi tải feed (${section})`, 'error');
  }
}

function renderList(items) {
  const list = $('news-list');
  if (!list) return;

  list.innerHTML = '';

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.style.textAlign = 'left';
    btn.style.cursor = 'pointer';
    btn.style.padding = '12px';
    btn.style.border = '1px solid var(--border-color)';
    btn.style.background = 'var(--card-bg, #fff)';

    const title = item.title || '(Không có tiêu đề)';
    const meta = [
      item.source?.name || 'The Guardian',
      item.author ? `• ${item.author}` : '',
      item.publishedAt ? `• ${formatDate(item.publishedAt)}` : ''
    ].join(' ');

    btn.innerHTML = `
      <div style="display:flex; gap:10px;">
        ${item.image ? `<img src="${item.image}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex:0 0 auto;">` : ''}
        <div style="min-width:0;">
          <div style="font-weight:700; line-height:1.25; margin-bottom:6px;">
            ${escapeHtml(title)}
          </div>
          <div style="opacity:.8; font-size:.9rem;">
            ${escapeHtml(meta)}
          </div>
        </div>
      </div>
    `;

    btn.addEventListener('click', () => openItem(item.guardianId));
    list.appendChild(btn);
  });
}

function renderReaderEmpty() {
  const title = $('news-title');
  const meta = $('news-meta');
  const reader = $('news-reader');
  const openWrap = $('news-open-source-wrap');
  const openLink = $('news-open-source');

  if (title) title.textContent = 'Chưa chọn bài';
  if (meta) meta.textContent = '';
  if (reader) reader.innerHTML = '';
  if (openWrap) openWrap.style.display = 'none';
  if (openLink) openLink.href = '#';
}

async function openItem(guardianId) {
  if (!guardianId) return;

  state.selectedId = guardianId;
  setStatus('Đang tải bài...');

  try {
    const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
    const item = await fetchJSON(url);

    renderReader(item);
    setStatus('Sẵn sàng.');
  } catch (e) {
    console.error('News openItem error:', e);
    setStatus('Không tải được bài. Có thể Worker/Guardian đang lỗi.');
    showToast?.('Tin Tức: lỗi tải bài', 'error');
  }
}

function renderReader(item) {
  const titleEl = $('news-title');
  const metaEl = $('news-meta');
  const readerEl = $('news-reader');
  const openWrap = $('news-open-source-wrap');
  const openLink = $('news-open-source');

  const title = item?.title || '(Không có tiêu đề)';
  const meta = [
    item?.source?.name || 'The Guardian',
    item?.author ? `• ${item.author}` : '',
    item?.publishedAt ? `• ${formatDate(item.publishedAt)}` : ''
  ].join(' ');

  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = meta;

  const html = item?.contentHtml || item?.summaryHtml || '';
  if (readerEl) {
    readerEl.innerHTML = sanitizeHtml(html);
  }

  if (openLink) {
    openLink.href = item?.url || '#';
  }
  if (openWrap) {
    openWrap.style.display = item?.url ? 'block' : 'none';
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function bindNewsUIOnce() {
  const root = $('news-section');
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';

  const moreToggle = $('news-more-toggle');
  moreToggle?.addEventListener('click', () => toggleMoreTabs());

  $('news-refresh')?.addEventListener('click', () => loadFeed(state.section));

  // Tabs click (primary + more)
  root.querySelectorAll('.news-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.guardianSection;
      if (!section) return;

      // Nếu click 1 tab trong "More", tự đóng lại cho gọn
      const isInMore = btn.closest('#news-more-tabs');
      if (isInMore) toggleMoreTabs(false);

      loadFeed(section);
    });
  });

  // Default: more tabs hidden
  toggleMoreTabs(false);
}

export function initNews() {
  // Khi navigate tới news mới bind + load (không load lúc app start)
  onNavigate('news', () => {
    bindNewsUIOnce();
    // Load mặc định World
    loadFeed(DEFAULT_SECTION);
  });
}
