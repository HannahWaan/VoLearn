/* ===== WORD LOOKUP - VoLearn v2.2.0 ===== */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';

let popupEl = null;
let contextMenuEl = null;
let currentWord = '';
let cachedData = null;
let isInitialized = false;
let lastSelectedText = '';
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

/* ===== THEME COLORS ===== */
function getColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return isLight ? {
        bg: '#ffffff',
        bgSec: '#f8fafc',
        border: '#e2e8f0',
        text: '#1e293b',
        textMuted: '#64748b',
        textDef: '#334155',
        btnBg: '#e2e8f0',
        btnColor: '#64748b',
        shadow: '0 8px 32px rgba(0,0,0,0.12)',
        exampleBorder: '#e2e8f0'
    } : {
        bg: '#1a1a2e',
        bgSec: 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.15)',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.6)',
        textDef: 'rgba(255,255,255,0.9)',
        btnBg: 'rgba(255,255,255,0.1)',
        btnColor: 'rgba(255,255,255,0.7)',
        shadow: '0 8px 32px rgba(0,0,0,0.4)',
        exampleBorder: 'rgba(255,255,255,0.15)'
    };
}

/* ===== CREATE POPUP ===== */
function createPopup() {
    if (popupEl) return popupEl;
    
    const c = getColors();
    
    popupEl = document.createElement('div');
    popupEl.id = 'word-lookup-popup';
    popupEl.style.cssText = `
        display:none; position:fixed; z-index:99999;
        background:${c.bg}; border:1px solid ${c.border}; border-radius:12px;
        box-shadow:${c.shadow}; min-width:320px; max-width:420px; max-height:480px;
        overflow:hidden; font-size:14px; color:${c.text};
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    `;
    
    popupEl.innerHTML = `
        <div class="wlp-header" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:${c.bgSec};border-bottom:1px solid ${c.border};cursor:move;user-select:none;">
            <i class="fas fa-grip-vertical" style="color:${c.textMuted};font-size:12px;opacity:0.5;"></i>
            <span class="wlp-word" style="flex:1;font-size:20px;font-weight:700;color:${c.text};"></span>
            <button class="wlp-speak" title="Phát âm" style="width:32px;height:32px;border:none;border-radius:8px;background:${c.btnBg};color:${c.btnColor};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.15s;"><i class="fas fa-volume-up"></i></button>
            <button class="wlp-close" title="Đóng" style="width:32px;height:32px;border:none;border-radius:8px;background:${c.btnBg};color:${c.btnColor};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.15s;"><i class="fas fa-times"></i></button>
        </div>
        <div class="wlp-phonetic" style="padding:8px 16px 0;font-size:15px;color:${c.textMuted};font-family:monospace;"></div>
        <div class="wlp-content" style="padding:12px 16px;max-height:280px;overflow-y:auto;"></div>
        <div class="wlp-footer" style="padding:12px 16px;border-top:1px solid ${c.border};background:${c.bgSec};">
            <button class="wlp-add-btn" disabled style="width:100%;padding:11px 16px;border:none;border-radius:8px;background:#6366f1;color:white;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;opacity:0.5;transition:all 0.15s;">
                <i class="fas fa-plus"></i> Thêm vào từ điển
            </button>
        </div>
    `;
    
    document.body.appendChild(popupEl);
    
    // Drag
    const header = popupEl.querySelector('.wlp-header');
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        dragOffsetX = e.clientX - popupEl.offsetLeft;
        dragOffsetY = e.clientY - popupEl.offsetTop;
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    // Button events
    popupEl.querySelector('.wlp-close').onclick = (e) => { e.stopPropagation(); hidePopup(); };
    popupEl.querySelector('.wlp-speak').onclick = (e) => { e.stopPropagation(); speakWord(currentWord); };
    popupEl.querySelector('.wlp-add-btn').onclick = (e) => { e.stopPropagation(); handleAddWord(); };
    
    // Hover
    const speakBtn = popupEl.querySelector('.wlp-speak');
    speakBtn.onmouseenter = () => { speakBtn.style.background = '#6366f1'; speakBtn.style.color = 'white'; };
    speakBtn.onmouseleave = () => { const c = getColors(); speakBtn.style.background = c.btnBg; speakBtn.style.color = c.btnColor; };
    
    const closeBtn = popupEl.querySelector('.wlp-close');
    closeBtn.onmouseenter = () => { closeBtn.style.background = '#ef4444'; closeBtn.style.color = 'white'; };
    closeBtn.onmouseleave = () => { const c = getColors(); closeBtn.style.background = c.btnBg; closeBtn.style.color = c.btnColor; };
    
    const addBtn = popupEl.querySelector('.wlp-add-btn');
    addBtn.onmouseenter = () => { if (!addBtn.disabled) addBtn.style.background = '#4f46e5'; };
    addBtn.onmouseleave = () => { addBtn.style.background = '#6366f1'; };
    
    popupEl.onclick = (e) => e.stopPropagation();
    popupEl.ondblclick = (e) => e.stopPropagation();
    popupEl.oncontextmenu = (e) => e.stopPropagation();
    
    return popupEl;
}

/* ===== CREATE CONTEXT MENU ===== */
function createContextMenu() {
    if (contextMenuEl) return contextMenuEl;
    
    const c = getColors();
    
    contextMenuEl = document.createElement('div');
    contextMenuEl.id = 'word-lookup-context-menu';
    contextMenuEl.style.cssText = `
        display:none; position:fixed; z-index:99998;
        background:${c.bg}; border:1px solid ${c.border}; border-radius:8px;
        box-shadow:${c.shadow}; padding:6px; min-width:160px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    `;
    
    const btnStyle = `display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;border-radius:6px;background:transparent;color:${c.text};font-size:14px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s;`;
    
    contextMenuEl.innerHTML = `
        <button id="wlp-ctx-translate" style="${btnStyle}"><i class="fas fa-language" style="width:18px;text-align:center;"></i> Tra từ điển</button>
        <button id="wlp-ctx-speak" style="${btnStyle}"><i class="fas fa-volume-up" style="width:18px;text-align:center;"></i> Phát âm</button>
    `;
    
    document.body.appendChild(contextMenuEl);
    
    const btns = contextMenuEl.querySelectorAll('button');
    btns.forEach(btn => {
        btn.onmouseenter = () => { btn.style.background = 'rgba(99,102,241,0.15)'; btn.style.color = '#6366f1'; };
        btn.onmouseleave = () => { const c = getColors(); btn.style.background = 'transparent'; btn.style.color = c.text; };
    });
    
    document.getElementById('wlp-ctx-translate').onclick = (e) => {
        e.stopPropagation(); hideContextMenu();
        if (lastSelectedText) showPopup(contextMenuEl.offsetLeft, contextMenuEl.offsetTop, lastSelectedText);
    };
    
    document.getElementById('wlp-ctx-speak').onclick = (e) => {
        e.stopPropagation(); hideContextMenu();
        if (lastSelectedText) speakWord(lastSelectedText);
    };
    
    contextMenuEl.onclick = (e) => e.stopPropagation();
    
    return contextMenuEl;
}

function showContextMenu(x, y, text) {
    const menu = createContextMenu();
    const c = getColors();
    
    // Update colors
    menu.style.background = c.bg;
    menu.style.borderColor = c.border;
    menu.querySelectorAll('button').forEach(btn => btn.style.color = c.text);
    
    lastSelectedText = text;
    menu.style.display = 'block';
    
    let left = x, top = y;
    if (left + 180 > window.innerWidth) left = window.innerWidth - 190;
    if (top + 100 > window.innerHeight) top = window.innerHeight - 110;
    
    menu.style.left = Math.max(10, left) + 'px';
    menu.style.top = Math.max(10, top) + 'px';
}

function hideContextMenu() { if (contextMenuEl) contextMenuEl.style.display = 'none'; }

/* ===== SHOW/HIDE POPUP ===== */
function showPopup(x, y, word) {
    if (!word || word.length < 2) return;
    
    const popup = createPopup();
    const c = getColors();
    
    // Update colors for current theme
    popup.style.background = c.bg;
    popup.style.borderColor = c.border;
    popup.style.boxShadow = c.shadow;
    popup.style.color = c.text;
    
    const header = popup.querySelector('.wlp-header');
    header.style.background = c.bgSec;
    header.style.borderBottomColor = c.border;
    header.querySelector('.fa-grip-vertical').style.color = c.textMuted;
    
    popup.querySelector('.wlp-word').style.color = c.text;
    popup.querySelector('.wlp-phonetic').style.color = c.textMuted;
    popup.querySelector('.wlp-footer').style.background = c.bgSec;
    popup.querySelector('.wlp-footer').style.borderTopColor = c.border;
    
    ['.wlp-speak', '.wlp-close'].forEach(sel => {
        const btn = popup.querySelector(sel);
        btn.style.background = c.btnBg;
        btn.style.color = c.btnColor;
    });
    
    currentWord = word.toLowerCase().trim();
    popup.querySelector('.wlp-word').textContent = currentWord;
    popup.querySelector('.wlp-phonetic').textContent = '';
    popup.querySelector('.wlp-content').innerHTML = `<div style="text-align:center;color:${c.textMuted};padding:24px;"><i class="fas fa-spinner fa-spin"></i> Đang tra từ...</div>`;
    
    const addBtn = popup.querySelector('.wlp-add-btn');
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.style.cursor = 'not-allowed';
    
    popup.style.display = 'block';
    popup.style.left = '-9999px';
    popup.style.top = '-9999px';
    
    setTimeout(() => {
        const rect = popup.getBoundingClientRect();
        let left = x + 10, top = y + 10;
        if (left + rect.width > window.innerWidth - 20) left = x - rect.width - 10;
        if (top + rect.height > window.innerHeight - 20) top = y - rect.height - 10;
        popup.style.left = Math.max(10, left) + 'px';
        popup.style.top = Math.max(10, top) + 'px';
    }, 0);
    
    fetchDefinition(currentWord);
}

function hidePopup() { if (popupEl) popupEl.style.display = 'none'; currentWord = ''; cachedData = null; }

/* ===== FETCH DEFINITION ===== */
async function fetchDefinition(word) {
    const c = getColors();
    const contentEl = popupEl.querySelector('.wlp-content');
    const phoneticEl = popupEl.querySelector('.wlp-phonetic');
    const addBtn = popupEl.querySelector('.wlp-add-btn');
    
    try {
        const lookupWord = word.split(/\s+/)[0].toLowerCase();
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookupWord)}`);
        
        if (!resp.ok) {
            contentEl.innerHTML = `<div style="text-align:center;color:${c.textMuted};padding:24px;"><i class="fas fa-search"></i> Không tìm thấy từ này</div>`;
            return;
        }
        
        const data = await resp.json();
        if (!data?.[0]) {
            contentEl.innerHTML = `<div style="text-align:center;color:${c.textMuted};padding:24px;">Không tìm thấy</div>`;
            return;
        }
        
        const entry = data[0];
        cachedData = entry;
        
        popupEl.querySelector('.wlp-word').textContent = entry.word || lookupWord;
        currentWord = entry.word || lookupWord;
        
        phoneticEl.textContent = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
        
        let html = '';
        for (const m of (entry.meanings || []).slice(0, 3)) {
            html += `<div style="display:inline-block;background:#6366f1;color:white;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;margin:10px 0 6px;">${escapeHtml(m.partOfSpeech)}</div>`;
            for (const d of (m.definitions || []).slice(0, 2)) {
                html += `<div style="color:${c.textDef};line-height:1.55;margin-bottom:5px;">${escapeHtml(d.definition)}</div>`;
                if (d.example) html += `<div style="color:${c.textMuted};font-style:italic;font-size:13px;margin-bottom:8px;padding-left:10px;border-left:3px solid ${c.exampleBorder};">"${escapeHtml(d.example)}"</div>`;
            }
        }
        
        contentEl.innerHTML = html || `<div style="text-align:center;padding:20px;color:${c.textMuted};">Không có định nghĩa</div>`;
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
        
    } catch (err) {
        console.error('Lookup error:', err);
        contentEl.innerHTML = `<div style="text-align:center;color:${c.textMuted};padding:24px;"><i class="fas fa-exclamation-circle"></i> Lỗi khi tra từ</div>`;
    }
}

function speakWord(word) {
    if (!word) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.speak(u);
}

function handleAddWord() {
    if (!currentWord || !cachedData) return;
    if (appData.vocabulary?.find(w => w.word?.toLowerCase() === currentWord.toLowerCase())) {
        showToast('Từ này đã có trong từ điển!', 'warning'); return;
    }
    
    const entry = cachedData;
    const meanings = [];
    for (const m of (entry.meanings || [])) {
        for (const d of (m.definitions || []).slice(0, 2)) {
            meanings.push({
                phoneticUS: entry.phonetic || entry.phonetics?.[0]?.text || '',
                phoneticUK: entry.phonetics?.find(p => p.audio?.includes('uk'))?.text || '',
                pos: m.partOfSpeech || '', defEn: d.definition || '', defVi: '',
                example: d.example || '',
                synonyms: m.synonyms?.slice(0, 5)?.join(', ') || '',
                antonyms: m.antonyms?.slice(0, 5)?.join(', ') || ''
            });
        }
    }
    if (!meanings.length) meanings.push({ phoneticUS:'', phoneticUK:'', pos:'', defEn:'', defVi:'', example:'', synonyms:'', antonyms:'' });
    
    const wordObj = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        word: currentWord, setId: null, meanings, source: 'news',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        mastered: false, bookmarked: false, srsLevel: 0,
        nextReview: new Date().toISOString(), reviewCount: 0, correctCount: 0, streak: 0
    };
    
    if (!appData.vocabulary) appData.vocabulary = [];
    appData.vocabulary.push(wordObj);
    saveData(appData);
    
    showToast(`Đã thêm "${currentWord}" vào từ điển!`, 'success');
    hidePopup();
    window.dispatchEvent(new CustomEvent('volearn:wordSaved', { detail: wordObj }));
}

function escapeHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function getSelectedText() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return '';
    const t = sel.toString().trim();
    return (t && /^[a-zA-Z\s'-]+$/.test(t) && t.length >= 2 && t.length <= 50) ? t : '';
}
function isInNewsSection(el) { const news = document.getElementById('news-section'); return news?.contains(el); }

function setupDragListeners() {
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !popupEl) return;
        let newX = e.clientX - dragOffsetX, newY = e.clientY - dragOffsetY;
        const rect = popupEl.getBoundingClientRect();
        popupEl.style.left = Math.max(0, Math.min(newX, window.innerWidth - rect.width)) + 'px';
        popupEl.style.top = Math.max(0, Math.min(newY, window.innerHeight - rect.height)) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (popupEl) popupEl.querySelector('.wlp-header').style.cursor = 'move';
        }
    });
}

export function initWordLookup() {
    if (isInitialized) return;
    isInitialized = true;
    
    createPopup();
    createContextMenu();
    setupDragListeners();
    
    document.addEventListener('dblclick', (e) => {
        if (popupEl?.contains(e.target) || contextMenuEl?.contains(e.target)) return;
        if (!isInNewsSection(e.target)) return;
        const text = getSelectedText();
        if (text) { e.preventDefault(); hideContextMenu(); showPopup(e.clientX, e.clientY, text); }
    }, true);
    
    document.addEventListener('contextmenu', (e) => {
        if (popupEl?.contains(e.target) || contextMenuEl?.contains(e.target)) return;
        if (!isInNewsSection(e.target)) return;
        const text = getSelectedText();
        if (text) { e.preventDefault(); hidePopup(); showContextMenu(e.clientX, e.clientY, text); }
    }, true);
    
    document.addEventListener('click', (e) => {
        if (contextMenuEl?.style.display !== 'none' && !contextMenuEl?.contains(e.target)) hideContextMenu();
        if (popupEl?.style.display !== 'none' && !popupEl?.contains(e.target)) hidePopup();
    }, true);
    
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hidePopup(); hideContextMenu(); } });
    
    console.log('✅ Word Lookup ready!');
}

window.initWordLookup = initWordLookup;
window.showWordLookupPopup = showPopup;
