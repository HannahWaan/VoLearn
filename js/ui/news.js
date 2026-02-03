/* ================================================
   VoLearn - News (Guardian Reader)
   - Không tự đóng more tabs khi chọn
   - Giữ nguyên HTML formatting từ Guardian
   ================================================ */

import { onNavigate } from '../core/router.js';
import { showToast } from './toast.js';

const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';
const DEFAULT_SECTION = 'world';
const ITEMS_PER_PAGE = 5;

const state = {
  section: DEFAULT_SECTION,
  items: [],
  currentPage: 1,
  totalPages: 1,
  loading: false,
  bound: false
};

// ==================== Utilities ====================

const $ = (id) => document.getElementById(id);

function setStatus(text) {
  const el = $('news-status');
  if (el) el.textContent = text;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// GIỮ NGUYÊN HTML formatting - chỉ sanitize XSS
function sanitizeHtml(html) {
  if (window.DOMPurify) {
    // Cho phép tất cả tags formatting
    return DOMPurify.sanitize(html || '', {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'q', 'cite',
        'ul', 'ol', 'li',
        'a', 'img', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'pre', 'code', 'span', 'div',
        'sub', 'sup', 'hr'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'target', 'rel',
        'class', 'id', 'style',
        'colspan', 'rowspan'
      ]
    });
  }
  // Fallback: escape tất cả
  const div = document.createElement('div');
  div.textContent = html || '';
  return div.innerHTML;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// ==================== UI Helpers ====================

function setActiveTab(section) {
  document.querySelectorAll('#news-section .news-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.guardianSection === section);
  });
}

// Toggle more tabs - CHỈ khi user nhấn nút ...
function toggleMoreTabs() {
  const more = $('news-more-tabs');
  const toggle = $('news-more-toggle');
  if (!more || !toggle) return;

  const isOpen = more.classList.contains('open');
  more.classList.toggle('open', !isOpen);
  toggle.classList.toggle('active', !isOpen);
}

function showListView() {
  const listView = $('news-list-view');
  const readerView = $('news-reader-view');
  if (listView) listView.style.display = 'flex';
  if (readerView) readerView.style.display = 'none';
}

function showReaderView() {
  const listView = $('news-list-view');
  const readerView = $('news-reader-view');
  if (listView) listView.style.display = 'none';
  if (readerView) readerView.style.display = 'block';
}

function updatePagination() {
  const prevBtn = $('news-prev');
  const nextBtn = $('news-next');
  const pageInfo = $('news-page-info');

  if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
  if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages;
  if (pageInfo) pageInfo.textContent = `Trang ${state.currentPage} / ${state.totalPages}`;
}

// ==================== Render Functions ====================

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
    card.dataset.guardianId = item.guardianId || '';

    const title = item.title || '(Không có tiêu đề)';
    const author = item.author || 'The Guardian';
    const date = formatDate(item.publishedAt);
    const thumb = item.image || '';

    card.innerHTML = `
      ${thumb ? `<img class="news-card-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy">` : ''}
      <div class="news-card-content">
        <h3 class="news-card-title">${escapeHtml(title)}</h3>
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

  // Meta info
  if (metaEl) {
    const author = item?.author || 'The Guardian';
    const date = formatDate(item?.publishedAt);
    metaEl.innerHTML = `
      <span><i class="fas fa-newspaper"></i> The Guardian</span>
      <span><i class="fas fa-user"></i> ${escapeHtml(author)}</span>
      <span><i class="fas fa-clock"></i> ${escapeHtml(date)}</span>
    `;
  }

  // Cover image với caption
  if (coverEl) {
    if (item?.image) {
      const caption = item?.imageCaption || '';
      coverEl.innerHTML = `
        <figure>
          <img src="${escapeHtml(item.image)}" alt="" loading="lazy">
          ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
        </figure>
      `;
    } else {
      coverEl.innerHTML = '';
    }
  }

  // Content - GIỮ NGUYÊN HTML formatting
  if (readerEl) {
    let html = '';
    
    if (item?.contentHtml) {
      // Đã có HTML sẵn -> giữ nguyên
      html = item.contentHtml;
    } else if (item?.text) {
      // Plain text -> convert sang HTML paragraphs
      // Nhưng vẫn giữ line breaks
      html = item.text
        .trim()
        .split(/\n\n+/)
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
    } else if (item?.summaryHtml) {
      html = item.summaryHtml;
    } else if (item?.summary) {
      html = `<p>${escapeHtml(item.summary)}</p>`;
    }
    
    // Sanitize nhưng giữ formatting
    readerEl.innerHTML = sanitizeHtml(html);
  }

  showReaderView();
}

// ==================== Data Loading ====================

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
      const list = $('news-list');
      if (list) list.innerHTML = '<p style="text-align:center;opacity:0.6;padding:20px;">Không tìm thấy tin nào.</p>';
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

// ==================== Event Bindings ====================

function bindNewsUI() {
  if (state.bound) return;
  state.bound = true;

  const root = $('news-section');
  if (!root) return;

  // More toggle - CHỈ toggle khi nhấn nút này
  $('news-more-toggle')?.addEventListener('click', () => {
    toggleMoreTabs();
  });

  // Refresh
  $('news-refresh')?.addEventListener('click', () => {
    loadFeed(state.section);
  });

  // Tab clicks - KHÔNG tự đóng more tabs
  root.querySelectorAll('.news-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.guardianSection;
      if (!section) return;
      loadFeed(section);
    });
  });

  // Back button
  $('news-reader-back')?.addEventListener('click', () => {
    showListView();
    setStatus(`${state.items.length} bài viết • The Guardian`);
  });

  // Pagination
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

  // Font size controls
  let fontSize = 18;
  
  $('news-font-inc')?.addEventListener('click', () => {
    fontSize = Math.min(fontSize + 2, 28);
    const reader = $('news-reader');
    if (reader) reader.style.fontSize = `${fontSize}px`;
  });

  $('news-font-dec')?.addEventListener('click', () => {
    fontSize = Math.max(fontSize - 2, 14);
    const reader = $('news-reader');
    if (reader) reader.style.fontSize = `${fontSize}px`;
  });
}

// ==================== Export ====================

export function initNews() {
  onNavigate('news', () => {
    bindNewsUI();
    showListView();
    loadFeed(DEFAULT_SECTION);
  });
}
