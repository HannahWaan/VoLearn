const NEWS_API_BASE = 'https://volearn.asstrayca.workers.dev';
const DEFAULT_SECTION = 'world';
const DEFAULT_PAGE_SIZE = 12;

const READER_FONT_KEY = 'volearn_news_reader_font_px';
const READER_FONT_MIN = 14;
const READER_FONT_MAX = 28;
const READER_FONT_STEP = 1;

const state = {
  bound: false,
  section: DEFAULT_SECTION,
  pageSize: DEFAULT_PAGE_SIZE,
  items: [],
  selectedId: null,
  mode: 'split', // 'split' | 'reader'
};

function $(id) { return document.getElementById(id); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function setStatus(text) {
  const el = $('news-status');
  if (el) el.textContent = text || '';
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch { return ''; }
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

function stripHtmlToText(html) {
  const s = String(html || '');
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(text, max = 180) {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function getReaderFontPx() {
  const raw = localStorage.getItem(READER_FONT_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? clamp(n, READER_FONT_MIN, READER_FONT_MAX) : 18;
}

function applyReaderFontPx(px) {
  const v = clamp(px, READER_FONT_MIN, READER_FONT_MAX);
  localStorage.setItem(READER_FONT_KEY, String(v));
  const section = $('news-section');
  if (section) section.style.setProperty('--news-reader-font-px', v);

  const decBtn = $('news-font-dec');
  const incBtn = $('news-font-inc');
  if (decBtn) decBtn.disabled = v <= READER_FONT_MIN;
  if (incBtn) incBtn.disabled = v >= READER_FONT_MAX;
}

function setMode(mode) {
  state.mode = mode === 'reader' ? 'reader' : 'split';

  const section = $('news-section');
  if (section) section.classList.toggle('news-reader-mode', state.mode === 'reader');

  const toolbar = $('news-reader-toolbar');
  if (toolbar) toolbar.style.display = state.mode === 'reader' ? 'flex' : 'none';

  // In reader mode we do NOT show "open source"
  const openWrap = $('news-open-source-wrap');
  if (openWrap) openWrap.style.display = 'none';
}

function setActiveTab(sectionId) {
  const tabs = document.querySelectorAll('#news-section .news-tab');
  tabs.forEach(t => {
    const s = t.getAttribute('data-guardian-section') || '';
    t.classList.toggle('active', s === sectionId);
  });
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

async function fetchJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status}: ${txt.slice(0, 250)}`);
  }
  return r.json();
}

function renderList(items) {
  const list = $('news-list');
  if (!list) return;

  if (!items || items.length === 0) {
    list.innerHTML = `<div class="empty-state">Không có bài nào.</div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const title = escapeHtml(item.title || '');
    const meta = [
      escapeHtml(item.source?.name || 'The Guardian'),
      item.sectionName ? escapeHtml(item.sectionName) : null,
      item.publishedAt ? escapeHtml(formatDate(item.publishedAt)) : null,
      item.wordCount ? `${escapeHtml(String(item.wordCount))} words` : null,
    ].filter(Boolean).join(' • ');

    const summaryText = item.summaryHtml
      ? stripHtmlToText(item.summaryHtml)
      : (item.text ? excerpt(item.text, 180) : '');

    const selected = state.selectedId === item.guardianId ? 'selected' : '';

    return `
      <article class="news-item ${selected}" data-guardian-id="${escapeHtml(item.guardianId)}">
        <div class="news-item-main">
          <h3 class="news-item-title">${title}</h3>
          <div class="news-item-meta">${meta}</div>
          ${summaryText ? `<div class="news-item-summary">${escapeHtml(summaryText)}</div>` : ''}
        </div>
        <div class="news-item-actions">
          <button class="btn-secondary" type="button" data-action="quick" data-guardian-id="${escapeHtml(item.guardianId)}">Xem nhanh</button>
          <button class="btn-primary" type="button" data-action="read" data-guardian-id="${escapeHtml(item.guardianId)}">Đọc</button>
        </div>
      </article>
    `;
  }).join('');
}

function coverHtml(imageUrl, title) {
  const url = (imageUrl || '').trim();
  if (!url) return '';
  const alt = escapeHtml(title || 'Cover');
  return `<figure class="news-cover"><img src="${escapeHtml(url)}" alt="${alt}"></figure>`;
}

function renderReader(data) {
  const titleEl = $('news-title');
  const metaEl = $('news-meta');
  const readerEl = $('news-reader');

  const title = data?.title || '';
  if (titleEl) titleEl.textContent = title;

  if (metaEl) {
    metaEl.textContent = [
      data?.source?.name || 'The Guardian',
      data?.author ? `by ${data.author}` : null,
      data?.publishedAt ? formatDate(data.publishedAt) : null,
      data?.wordCount ? `${data.wordCount} words` : null,
    ].filter(Boolean).join(' • ');
  }

  if (!readerEl) return;

  const cover = coverHtml(data?.image, title);

  // IMPORTANT FIX:
  // Prefer full content:
  // 1) contentHtml (full HTML) if non-empty
  // 2) text (bodyText) if non-empty  <-- this is what fixes "Xem nhanh chỉ có header"
  // 3) summaryHtml (trailText) last
  let body = '';
  if (data?.contentHtml && String(data.contentHtml).trim().length > 0) {
    body = sanitizeHtml(data.contentHtml);
  } else if (data?.text && String(data.text).trim().length > 0) {
    body = textToHtmlParagraphs(data.text);
  } else if (data?.summaryHtml && String(data.summaryHtml).trim().length > 0) {
    body = sanitizeHtml(data.summaryHtml);
  } else {
    body = `<div class="empty-state">Không có nội dung.</div>`;
  }

  readerEl.innerHTML = `${cover}${body}`;
}

async function openItem(guardianId, mode) {
  if (!guardianId) return;

  state.selectedId = guardianId;

  // highlight
  const list = $('news-list');
  if (list) {
    list.querySelectorAll('.news-item').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-guardian-id') === guardianId);
    });
  }

  if (mode) setMode(mode);

  setStatus('Đang tải bài…');
  try {
    const url = `${NEWS_API_BASE}/guardian/item?id=${encodeURIComponent(guardianId)}`;
    const data = await fetchJson(url);
    renderReader(data);
    setStatus('');
  } catch (e) {
    console.error('[news] openItem error:', e);
    setStatus('Lỗi tải bài. Vui lòng thử lại.');
  }
}

async function loadFeed(sectionId) {
  state.section = (sectionId || DEFAULT_SECTION).trim() || DEFAULT_SECTION;
  setActiveTab(state.section);
  setStatus('Đang tải danh sách…');

  try {
    const url = `${NEWS_API_BASE}/guardian/feed?section=${encodeURIComponent(state.section)}&pageSize=${encodeURIComponent(state.pageSize)}`;
    const data = await fetchJson(url);

    const items = Array.isArray(data?.items) ? data.items : [];
    state.items = items;

    renderList(items);

    if (items.length > 0) {
      await openItem(items[0].guardianId, 'split');
    } else {
      renderReader({ title: 'Chưa có bài', text: '', summaryHtml: '' });
    }

    setStatus('');
  } catch (e) {
    console.error('[news] loadFeed error:', e);
    setStatus('Lỗi tải danh sách. Vui lòng thử lại.');
    const list = $('news-list');
    if (list) list.innerHTML = `<div class="empty-state">Không tải được dữ liệu.</div>`;
  }
}

function bindOnce() {
  if (state.bound) return;
  state.bound = true;

  // font buttons
  const dec = $('news-font-dec');
  const inc = $('news-font-inc');
  if (dec) dec.addEventListener('click', () => applyReaderFontPx(getReaderFontPx() - READER_FONT_STEP));
  if (inc) inc.addEventListener('click', () => applyReaderFontPx(getReaderFontPx() + READER_FONT_STEP));
  applyReaderFontPx(getReaderFontPx());

  // back
  const back = $('news-reader-back');
  if (back) back.addEventListener('click', () => setMode('split'));

  // refresh
  const refresh = $('news-refresh');
  if (refresh) refresh.addEventListener('click', () => loadFeed(state.section));

  // more
  const more = $('news-more-toggle');
  if (more) more.addEventListener('click', () => toggleMoreTabs());

  // delegation
  const section = $('news-section');
  if (section) {
    section.addEventListener('click', (ev) => {
      const tab = ev.target?.closest?.('.news-tab');
      if (tab) {
        const s = tab.getAttribute('data-guardian-section');
        if (s) {
          toggleMoreTabs(false);
          loadFeed(s);
        }
        return;
      }

      const btn = ev.target?.closest?.('button[data-action]');
      if (btn) {
        const action = btn.getAttribute('data-action');
        const gid = btn.getAttribute('data-guardian-id');
        if (!gid) return;

        if (action === 'quick') openItem(gid, 'split');
        if (action === 'read') openItem(gid, 'reader');
        return;
      }

      const item = ev.target?.closest?.('.news-item');
      if (item) {
        const gid = item.getAttribute('data-guardian-id');
        if (gid) openItem(gid, 'split');
      }
    });
  }
}

export function initNews() {
  if (!$('news-section')) return;

  bindOnce();

  if (window.onNavigate && typeof window.onNavigate === 'function') {
    window.onNavigate('news', () => {
      setMode('split');
      if (!state.items || state.items.length === 0) loadFeed(DEFAULT_SECTION);
    });
  } else {
    setMode('split');
    if (!state.items || state.items.length === 0) loadFeed(DEFAULT_SECTION);
  }
}
