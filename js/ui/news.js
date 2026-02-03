/* ================================================
   VoLearn - News (Guardian Reader)
   v2.2.0 - With Word Lookup integration
   ================================================ */

import { onNavigate } from '../core/router.js';
import { showToast } from './toast.js';
import { initWordLookup } from './wordLookup.js';

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
    bound: false,
    wordLookupInitialized: false
};

const $ = (id) => document.getElementById(id);

/* ==================== Helpers ==================== */

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

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;

        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return iso;
    }
}

function formatDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
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
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || div.innerText || '';
}

function sanitizeHtml(html) {
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html || '', {
            USE_PROFILES: { html: true },
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'blockquote', 'q', 'cite',
                'ul', 'ol', 'li',
                'a', 'img', 'figure', 'figcaption',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'pre', 'code', 'span', 'div', 'sub', 'sup', 'hr'
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title', 'target', 'rel',
                'class', 'id', 'style', 'colspan', 'rowspan', 'loading'
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

/* ==================== UI State ==================== */

function setActiveTab(section) {
    document.querySelectorAll('#news-section .news-tab').forEach(btn => {
        const isActive = btn.dataset.guardianSection === section;
        btn.classList.toggle('active', isActive);
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
    const listView = $('news-list-view');
    const readerView = $('news-reader-view');
    
    if (listView) listView.style.display = 'flex';
    if (readerView) readerView.style.display = 'none';
    
    updateScrollTopButton();
}

function showReaderView() {
    const listView = $('news-list-view');
    const readerView = $('news-reader-view');
    
    if (listView) listView.style.display = 'none';
    if (readerView) readerView.style.display = 'block';
    
    readerView?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    updateScrollTopButton();
}

function updatePagination() {
    const prevBtn = $('news-prev');
    const nextBtn = $('news-next');
    const pageInfo = $('news-page-info');

    if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages;
    if (pageInfo) pageInfo.textContent = `Trang ${state.currentPage} / ${state.totalPages}`;
}

function updateScrollTopButton() {
    const btn = $('news-scroll-top');
    if (!btn) return;
    
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const shouldShow = scrollY > 300;
    btn.classList.toggle('visible', shouldShow);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==================== Render ==================== */

function renderList() {
    const list = $('news-list');
    if (!list) return;

    const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = state.items.slice(start, end);

    list.innerHTML = '';

    if (pageItems.length === 0) {
        list.innerHTML = '<p class="news-empty">Không có bài viết nào.</p>';
        return;
    }

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
            <div class="news-card-body">
                <h3 class="news-card-title">${escapeHtml(title)}</h3>
                ${summary ? `<p class="news-card-summary">${escapeHtml(summary)}</p>` : ''}
                <div class="news-card-meta">
                    <span class="news-card-author"><i class="fas fa-user"></i> ${escapeHtml(author)}</span>
                    <span class="news-card-date"><i class="fas fa-clock"></i> ${escapeHtml(date)}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openItem(item.guardianId, item.url));
        list.appendChild(card);
    });

    updatePagination();
}

function renderReader(item) {
    const titleEl = $('news-title');
    const metaEl = $('news-meta');
    const trailEl = $('news-trail-text');
    const coverEl = $('news-cover');
    const readerEl = $('news-reader');
    const sourceLinkEl = $('news-source-link');

    // Title
    if (titleEl) {
        titleEl.textContent = item?.title || '(Không có tiêu đề)';
    }

    // Meta
    if (metaEl) {
        const ago = timeAgo(item?.publishedAt);
        const author = item?.author || 'The Guardian';
        
        metaEl.innerHTML = `
            <span class="news-time-ago">${escapeHtml(ago)}</span>
            <span class="news-author">• ${escapeHtml(author)}</span>
        `;
    }

    // Trail Text (Summary)
    if (trailEl) {
        const trailText = stripHtml(item?.summaryHtml || item?.summary || '');
        if (trailText) {
            trailEl.textContent = trailText;
            trailEl.style.display = 'block';
        } else {
            trailEl.style.display = 'none';
        }
    }

    // Cover image
    if (coverEl) {
        if (item?.image) {
            const caption = item?.imageCaption || '';
            const credit = item?.imageCredit || '';
            let captionHtml = '';
            
            if (caption || credit) {
                const parts = [];
                if (caption) parts.push(escapeHtml(caption));
                if (credit) parts.push(`<span class="img-credit">Photograph: ${escapeHtml(credit)}</span>`);
                captionHtml = `<figcaption>${parts.join(' ')}</figcaption>`;
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

    // Content
    if (readerEl) {
        let html = '';
        
        if (item?.contentHtml) {
            html = item.contentHtml;
        } else if (item?.text) {
            html = item.text
                .trim()
                .split(/\n\n+/)
                .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
                .join('');
        } else if (item?.summaryHtml) {
            html = `<p>${item.summaryHtml}</p>`;
        }
        
        readerEl.innerHTML = sanitizeHtml(html);
    }

    // Source link
    if (sourceLinkEl && item?.url) {
        sourceLinkEl.href = item.url;
    }

    showReaderView();
}

/* ==================== Data ==================== */

async function openItem(guardianId, originalUrl) {
    if (!guardianId) return;
    
    setStatus('Đang tải bài viết...');

    try {
        const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
        const item = await fetchJSON(url);
        
        if (!item.url && originalUrl) {
            item.url = originalUrl;
        }
        
        renderReader(item);
        setStatus('');
    } catch (e) {
        console.error('News openItem error:', e);
        setStatus('Không tải được bài viết.');
        showToast?.('Lỗi tải bài viết', 'error');
    }
}

async function loadFeed(section) {
    if (state.loading) return;
    
    state.section = section;
    state.loading = true;
    state.currentPage = 1;
    
    setActiveTab(section);
    setStatus('Đang tải tin...');
    showListView();

    const list = $('news-list');
    if (list) list.innerHTML = '<div class="news-loading"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';

    try {
        const url = `${NEWS_API_BASE}/guardian/feed?section=${encodeURIComponent(section)}&pageSize=30`;
        const data = await fetchJSON(url);
        const items = Array.isArray(data?.items) ? data.items : [];

        state.items = items;
        state.totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
        state.loading = false;

        if (!items.length) {
            setStatus('Không có bài viết.');
            if (list) list.innerHTML = '<p class="news-empty">Không tìm thấy tin nào.</p>';
            return;
        }

        setStatus(`${items.length} bài viết`);
        renderList();
    } catch (e) {
        state.loading = false;
        console.error('News loadFeed error:', e);
        setStatus('Không tải được tin.');
        if (list) list.innerHTML = '<p class="news-empty">Lỗi khi tải tin. Vui lòng thử lại.</p>';
        showToast?.(`Lỗi tải tin (${section})`, 'error');
    }
}

/* ==================== Event Bindings ==================== */

function bindNewsUI() {
    if (state.bound) return;
    state.bound = true;

    const root = $('news-section');
    if (!root) return;

    // More tabs toggle
    $('news-more-toggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMoreTabs();
    });

    // Refresh
    $('news-refresh')?.addEventListener('click', () => {
        if (!state.loading) loadFeed(state.section);
    });

    // Tab clicks
    root.querySelectorAll('.news-tab[data-guardian-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.guardianSection;
            if (section && section !== state.section) {
                loadFeed(section);
            }
        });
    });

    // Back button
    $('news-reader-back')?.addEventListener('click', () => {
        showListView();
        setStatus(`${state.items.length} bài viết`);
    });

    // Scroll top button
    $('news-scroll-top')?.addEventListener('click', scrollToTop);
    
    // Show/hide scroll top button on scroll
    window.addEventListener('scroll', updateScrollTopButton, { passive: true });

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
    let fontSize = parseInt(localStorage.getItem(FONT_KEY) || '18', 10);
    if (!Number.isFinite(fontSize) || fontSize < 14 || fontSize > 28) {
        fontSize = 18;
    }

    const applyFont = () => {
        fontSize = Math.max(14, Math.min(28, fontSize));
        localStorage.setItem(FONT_KEY, String(fontSize));
        const reader = $('news-reader');
        if (reader) reader.style.fontSize = `${fontSize}px`;
    };

    $('news-font-dec')?.addEventListener('click', () => {
        fontSize -= 2;
        applyFont();
    });

    $('news-font-inc')?.addEventListener('click', () => {
        fontSize += 2;
        applyFont();
    });

    applyFont();
}

/* ==================== Init ==================== */

export function initNews() {
    onNavigate('news', () => {
        bindNewsUI();
        showListView();
        
        if (state.items.length === 0) {
            loadFeed(DEFAULT_SECTION);
        }
        
        // Initialize word lookup (double-click & select to translate)
        if (!state.wordLookupInitialized) {
            state.wordLookupInitialized = true;
            initWordLookup();
        }
    });
}
