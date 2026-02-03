const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';

const DEFAULT_SECTION = 'world';
const DEFAULT_PAGE_SIZE = 12;

// Reader-only settings (scoped to News reader)
const READER_FONT_KEY = 'volearn_news_reader_font_px';
const READER_THEME_KEY = 'volearn_news_reader_theme'; 
const READER_FONT_MIN = 14;
const READER_FONT_MAX = 28;
const READER_FONT_STEP = 1;

const state = {
  bound: false,
  section: DEFAULT_SECTION,
  pageSize: DEFAULT_PAGE_SIZE,
  items: [],
  selectedId: null,
  mode: 'split', 
  loadingFeed: false,
  loadingItem: false,
};

function $(id) {
  return document.getElementById(id);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setStatus(text) {
  const el = $('news-status');
  if (el) el.textContent = text || '';
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return '';
  }
}

function escapeHtml(str) {
  const s = String(str ?? '');
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizeHtml(html) {
  const raw = String(html ?? '');
  if (!raw) return '';
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    return window.DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }
  return `<pre style="white-space:pre-wrap">${escapeHtml(raw)}</pre>`;
}

function textToHtmlParagraphs(text) {
  const safe = escapeHtml((text || '').trim());
  if (!safe) return '';
  const blocks = safe
    .split(/\n{2,}/g)
    .map(p => p.replace(/\n/g, '<br>'))
    .filter(Boolean);

  return `<div class="news-text">${blocks.map(b => `<p>${b}</p>`).join('')}</div>`;
}

function getReaderFontPx() {
  const raw = localStorage.getItem(READER_FONT_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? clamp(n, READER_FONT_MIN, READER_FONT_MAX) : 18;
}

function setReaderFontPx(px) {
  const v = clamp(px, READER_FONT_MIN, READER_FONT_MAX);
  localStorage.setItem(READER_FONT_KEY, String(v));
  const section = $('news-section');
  if (section) section.style.setProperty('--news-reader-font-px', v);
  updateReaderControlsUI();
}

function getReaderTheme() {
  const t = (localStorage.getItem(READER_THEME_KEY) || 'light').toLowerCase();
  return t === 'dark' ? 'dark' : 'light';
}

function setReaderTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  localStorage.setItem(READER_THEME_KEY, t);
  const section = $('news-section');
  if (section) section.classList.toggle('news-reader-dark', t === 'dark');
  updateReaderControlsUI();
}

function updateReaderControlsUI() {
  const decBtn = $('news-font-dec');
  const incBtn = $('news-font-inc');
  const themeBtn = $('news-reader-theme-toggle');

  const px = getReaderFontPx();
  if (decBtn) decBtn.disabled = px <= READER_FONT_MIN;
  if (incBtn) incBtn.disabled = px >= READER_FONT_MAX;

  const theme = getReaderTheme();
  if (themeBtn) themeBtn.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

function setMode(mode) {
  state.mode = mode === 'reader' ? 'reader' : 'split';

  const toolbar = $('news-reader-toolbar');
  if (toolbar) toolbar.style.display = state.mode === 'reader' ? 'flex' : 'none';

  // Hide tabs + list when reader mode
  const tabsPrimary = document.querySelector('#news-section .news-tabs');
  if (tabsPrimary) tabsPrimary.style.display = state.mode === 'reader' ? 'none' : 'flex';

  const moreTabs = $('news-more-tabs');
  if (moreTabs) moreTabs.style.display = state.mode === 'reader' ? 'none' : (moreTabs.classList.contains('open') ? 'flex' : 'none');

  const list = $('news-list');
  if (list) list.style.display = state.mode === 'reader' ? 'none' : 'flex';

  // Hide "Mở bài gốc" (you said you don’t want jump to original)
  const openWrap = $('news-open-source-wrap');
  if (openWrap) openWrap.style.display = 'none';
}

function toggleMoreTabs(forceOpen) {
  const more = $('news-more-tabs');
  const btn = $('news-more-toggle');
  if (!more || !btn) return;

  const currentlyOpen = more.classList.contains('open');
  const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !currentlyOpen;

  more.classList.toggle('open', nextOpen);
  more.style.display = nextOpen ? 'flex' : 'none';
  btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
  btn.textContent = nextOpen ? 'Less…' : 'More…';
}

function setActiveTab(sectionId) {
  const tabs = document.querySelectorAll('#news-section .news-tab');
  tabs.forEach(t => {
    const s = t.getAttribute('data-guardian-section') || '';
    t.classList.toggle('active', s === sectionId);
  });
}

async function fetchJson(url) {
  const r = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status}: ${txt.slice(0, 250)}`);
  }
  return r.json();
}

function excerptFromText(text, max = 180) {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function stripHtmlToText(html) {
  const s = String(html || '');
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderList(items) {
  const list = $('news-list');
  if (!list) return;

  if (!items || items.length === 0) {
    list.innerHTML = `<div class="empty-state">Không có bài nào.</div>`;
    return;
  }

  list.innerHTML = items
    .map(item => {
      const title = escapeHtml(item.title || '');
      const meta = [
        escapeHtml(item.source?.name || 'The Guardian'),
        item.sectionName ? escapeHtml(item.sectionName) : null,
        item.publishedAt ? escapeHtml(formatDate(item.publishedAt)) : null,
        item.wordCount ? `${escapeHtml(String(item.wordCount))} words` : null,
      ]
        .filter(Boolean)
        .join(' • ');

      // Keep list short: show plain text excerpt (not full HTML)
      const summaryText = item.summaryHtml
        ? stripHtmlToText(item.summaryHtml)
        : (item.text ? excerptFromText(item.text, 180) : '');

      const selected = state.selectedId === item.guardianId ? 'selected' : '';

      return `
        <article class="news-item ${selected}" data-guardian-id="${escapeHtml(item.guardianId)}">
          <div class="news-item-main">
            <h3 class="news-item-title">${title}</h3>
            <div class="news-item-meta">${meta}</div>
            ${summaryText ? `<div class="news-item-summary">${escapeHtml(summaryText)}</div>` : ''}
          </div>

          <div class="news-item-actions">
            <button class="btn btn-secondary news-quick-btn" type="button"
              data-action="quick" data-guardian-id="${escapeHtml(item.guardianId)}">Xem nhanh</button>
            <button class="btn btn-primary news-read-btn" type="button"
              data-action="read" data-guardian-id="${escapeHtml(item.guardianId)}">Đọc</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function buildCoverHtml(imageUrl, title) {
  const url = (imageUrl || '').trim();
  if (!url) return '';
  const alt = escapeHtml(title || 'Cover image');
  // Use <figure> for nicer spacing (your CSS can style it)
  return `
    <figure class="news-cover" style="margin:0 0 14px;">
      <img src="${escapeHtml(url)}" alt="${alt}" style="width:100%; height:auto; border-radius:12px; display:block;">
    </figure>
  `;
}

function renderReaderFromItemData(data) {
  const titleEl = $('news-title');
  const metaEl = $('news-meta');
  const readerEl = $('news-reader');

  const title = data?.title || '';
  if (titleEl) titleEl.textContent = title;

  if (metaEl) {
    const bits = [
      data?.source?.name || 'The Guardian',
      data?.author ? `by ${data.author}` : null,
      data?.publishedAt ? formatDate(data.publishedAt) : null,
      data?.wordCount ? `${data.wordCount} words` : null,
    ]
      .filter(Boolean)
      .join(' • ');
    metaEl.textContent = bits;
  }

  if (!readerEl) return;

  // Cover image (always OK even if only bodyText exists)
  const cover = buildCoverHtml(data?.image, title);

  // Priority for body:
  // 1) contentHtml (Guardian fields.body) -> sanitize
  // 2) text (bodyText) -> paragraphs
  // 3) summaryHtml (trailText) -> sanitize (short)
  let bodyHtml = '';
  if (data?.contentHtml && String(data.contentHtml).trim().length > 0) {
    bodyHtml = sanitizeHtml(data.contentHtml);
  } else if (data?.text && String(data.text).trim().length > 0) {
    bodyHtml = textToHtmlParagraphs(data.text);
  } else if (data?.summaryHtml && String(data.summaryHtml).trim().length > 0) {
    bodyHtml = sanitizeHtml(data.summaryHtml);
  } else {
    bodyHtml = `<div class="empty-state">Không có nội dung.</div>`;
  }

  readerEl.innerHTML = `${cover}${bodyHtml}`;
}

async function openItem(guardianId, mode) {
  if (!guardianId) return;

  state.selectedId = guardianId;

  // Highlight selected
  const list = $('news-list');
  if (list) {
    list.querySelectorAll('.news-item').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-guardian-id') === guardianId);
    });
  }

  if (mode) setMode(mode);

  state.loadingItem = true;
  setStatus('Đang tải bài…');

  try {
    const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
    const data = await fetchJson(url);
    renderReaderFromItemData(data);
    setStatus('');
  } catch (e) {
    console.error('[news] openItem error:', e);
    setStatus('Lỗi tải bài. Vui lòng thử lại.');
  } finally {
    state.loadingItem = false;
  }
}

async function loadFeed(sectionId) {
  state.section = (sectionId || DEFAULT_SECTION).trim() || DEFAULT_SECTION;
  state.loadingFeed = true;

  setActiveTab(state.section);
  setStatus('Đang tải danh sách…');

  try {
    const url = `${NEWS_API_BASE}/guardian/feed?section=${encodeURIComponent(state.section)}&pageSize=${encodeURIComponent(state.pageSize)}`;
    const data = await fetchJson(url);

    const items = Array.isArray(data?.items) ? data.items : [];
    state.items = items;

    renderList(items);

    // Auto open first item in split mode
    if (items.length > 0) {
      await openItem(items[0].guardianId, 'split');
    } else {
      renderReaderFromItemData({ title: 'Chưa có bài', text: '', summaryHtml: '' });
    }

    setStatus('');
  } catch (e) {
    console.error('[news] loadFeed error:', e);
    setStatus('Lỗi tải danh sách. Vui lòng thử lại.');
    const list = $('news-list');
    if (list) list.innerHTML = `<div class="empty-state">Không tải được dữ liệu.</div>`;
  } finally {
    state.loadingFeed = false;
  }
}

function bindNewsUIOnce() {
  if (state.bound) return;
  state.bound = true;

  // Reader controls
  const decBtn = $('news-font-dec');
  const incBtn = $('news-font-inc');
  const themeBtn = $('news-reader-theme-toggle');

  if (decBtn) decBtn.addEventListener('click', () => setReaderFontPx(getReaderFontPx() - READER_FONT_STEP));
  if (incBtn) incBtn.addEventListener('click', () => setReaderFontPx(getReaderFontPx() + READER_FONT_STEP));
  if (themeBtn) themeBtn.addEventListener('click', () => setReaderTheme(getReaderTheme() === 'dark' ? 'light' : 'dark'));

  // Apply saved settings
  setReaderFontPx(getReaderFontPx());
  setReaderTheme(getReaderTheme());

  // Back button (reader -> split)
  const backBtn = $('news-reader-back');
  if (backBtn) backBtn.addEventListener('click', () => setMode('split'));

  // Refresh
  const refreshBtn = $('news-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadFeed(state.section));

  // More toggle
  const moreBtn = $('news-more-toggle');
  if (moreBtn) moreBtn.addEventListener('click', () => toggleMoreTabs());

  // Click delegation: tabs + list actions
  const sectionEl = $('news-section');
  if (sectionEl) {
    sectionEl.addEventListener('click', (ev) => {
      // Tabs
      const tab = ev.target?.closest?.('.news-tab');
      if (tab) {
        const s = tab.getAttribute('data-guardian-section');
        if (s) {
          toggleMoreTabs(false);
          loadFeed(s);
        }
        return;
      }

      // Buttons: quick/read
      const btn = ev.target?.closest?.('button[data-action]');
      if (btn) {
        const action = btn.getAttribute('data-action');
        const gid = btn.getAttribute('data-guardian-id');
        if (!gid) return;

        if (action === 'quick') openItem(gid, 'split');
        if (action === 'read') openItem(gid, 'reader');
        return;
      }

      // Clicking item card quick-opens
      const itemEl = ev.target?.closest?.('.news-item');
      if (itemEl) {
        const gid = itemEl.getAttribute('data-guardian-id');
        if (gid) openItem(gid, 'split');
      }
    });
  }
}

function ensureNewsSectionExists() {
  return !!$('news-section');
}

export function initNews() {
  if (!ensureNewsSectionExists()) return;

  bindNewsUIOnce();

  // Use router hook if available
  if (window.onNavigate && typeof window.onNavigate === 'function') {
    window.onNavigate('news', () => {
      setMode('split');
      updateReaderControlsUI();
      if (!state.items || state.items.length === 0) loadFeed(DEFAULT_SECTION);
    });
  } else {
    // Fallback: load immediately
    setMode('split');
    updateReaderControlsUI();
    if (!state.items || state.items.length === 0) loadFeed(DEFAULT_SECTION);
  }
}
