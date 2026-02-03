/* ===== WORD LOOKUP - Double-click, Select & Right-click to translate ===== */
/* VoLearn v2.2.0 - Tra từ trong News Reader */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';

let popupEl = null;
let contextMenuEl = null;
let currentWord = '';
let cachedData = null;
let isInitialized = false;
let lastSelectedText = '';

// Drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

/* ===== CREATE POPUP ===== */
function createPopup() {
    if (popupEl) return popupEl;
    
    popupEl = document.createElement('div');
    popupEl.id = 'word-lookup-popup';
    
    popupEl.style.cssText = `
        display: none;
        position: fixed;
        z-index: 99999;
        background: #1a1a2e;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        min-width: 320px;
        max-width: 420px;
        max-height: 480px;
        overflow: hidden;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #ffffff;
    `;
    
    popupEl.innerHTML = `
        <div class="wlp-header" style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            cursor: move;
            user-select: none;
        ">
            <i class="fas fa-grip-vertical" style="color: rgba(255,255,255,0.3); font-size: 12px;"></i>
            <span class="wlp-word" style="
                flex: 1;
                font-size: 20px;
                font-weight: 700;
                color: #ffffff;
            "></span>
            <button class="wlp-speak" title="Phát âm" style="
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.15s;
            "><i class="fas fa-volume-up"></i></button>
            <button class="wlp-close" title="Đóng" style="
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.15s;
            "><i class="fas fa-times"></i></button>
        </div>
        <div class="wlp-phonetic" style="
            padding: 8px 16px 0;
            font-size: 15px;
            color: rgba(255, 255, 255, 0.6);
            font-family: monospace;
        "></div>
        <div class="wlp-content" style="
            padding: 12px 16px;
            max-height: 280px;
            overflow-y: auto;
        "></div>
        <div class="wlp-footer" style="
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
        ">
            <button class="wlp-add-btn" disabled style="
                width: 100%;
                padding: 11px 16px;
                border: none;
                border-radius: 8px;
                background: #6366f1;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                opacity: 0.5;
                transition: all 0.15s;
            ">
                <i class="fas fa-plus"></i> Thêm vào từ điển
            </button>
        </div>
    `;
    
    document.body.appendChild(popupEl);
    
    // ===== DRAG FUNCTIONALITY =====
    const header = popupEl.querySelector('.wlp-header');
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        
        isDragging = true;
        dragOffsetX = e.clientX - popupEl.offsetLeft;
        dragOffsetY = e.clientY - popupEl.offsetTop;
        
        header.style.cursor = 'grabbing';
        popupEl.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    // ===== BUTTON EVENTS =====
    popupEl.querySelector('.wlp-close').onclick = (e) => {
        e.stopPropagation();
        hidePopup();
    };
    popupEl.querySelector('.wlp-speak').onclick = (e) => {
        e.stopPropagation();
        speakWord(currentWord);
    };
    popupEl.querySelector('.wlp-add-btn').onclick = (e) => {
        e.stopPropagation();
        handleAddWord();
    };
    
    // Hover effects
    const speakBtn = popupEl.querySelector('.wlp-speak');
    speakBtn.onmouseenter = () => { speakBtn.style.background = '#6366f1'; speakBtn.style.color = 'white'; };
    speakBtn.onmouseleave = () => { speakBtn.style.background = 'rgba(255,255,255,0.1)'; speakBtn.style.color = 'rgba(255,255,255,0.7)'; };
    
    const closeBtn = popupEl.querySelector('.wlp-close');
    closeBtn.onmouseenter = () => { closeBtn.style.background = '#ef4444'; closeBtn.style.color = 'white'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255,255,255,0.1)'; closeBtn.style.color = 'rgba(255,255,255,0.7)'; };
    
    const addBtn = popupEl.querySelector('.wlp-add-btn');
    addBtn.onmouseenter = () => { if (!addBtn.disabled) { addBtn.style.background = '#4f46e5'; } };
    addBtn.onmouseleave = () => { addBtn.style.background = '#6366f1'; };
    
    // Stop propagation
    popupEl.onclick = (e) => e.stopPropagation();
    popupEl.ondblclick = (e) => e.stopPropagation();
    popupEl.oncontextmenu = (e) => e.stopPropagation();
    
    console.log('✅ Popup created with drag support');
    return popupEl;
}

/* ===== CREATE CONTEXT MENU ===== */
function createContextMenu() {
    if (contextMenuEl) return contextMenuEl;
    
    contextMenuEl = document.createElement('div');
    contextMenuEl.id = 'word-lookup-context-menu';
    
    contextMenuEl.style.cssText = `
        display: none;
        position: fixed;
        z-index: 99998;
        background: #1a1a2e;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        padding: 6px;
        min-width: 160px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const btnStyle = `
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
    `;
    
    contextMenuEl.innerHTML = `
        <button id="wlp-ctx-translate" style="${btnStyle}">
            <i class="fas fa-language" style="width: 18px; text-align: center;"></i> Tra từ điển
        </button>
        <button id="wlp-ctx-speak" style="${btnStyle}">
            <i class="fas fa-volume-up" style="width: 18px; text-align: center;"></i> Phát âm
        </button>
    `;
    
    document.body.appendChild(contextMenuEl);
    
    // Hover effects
    const btns = contextMenuEl.querySelectorAll('button');
    btns.forEach(btn => {
        btn.onmouseenter = () => { btn.style.background = 'rgba(99, 102, 241, 0.2)'; btn.style.color = '#818cf8'; };
        btn.onmouseleave = () => { btn.style.background = 'transparent'; btn.style.color = 'rgba(255, 255, 255, 0.9)'; };
    });
    
    document.getElementById('wlp-ctx-translate').onclick = (e) => {
        e.stopPropagation();
        hideContextMenu();
        if (lastSelectedText) {
            const rect = contextMenuEl.getBoundingClientRect();
            showPopup(rect.left, rect.top, lastSelectedText);
        }
    };
    
    document.getElementById('wlp-ctx-speak').onclick = (e) => {
        e.stopPropagation();
        hideContextMenu();
        if (lastSelectedText) speakWord(lastSelectedText);
    };
    
    contextMenuEl.onclick = (e) => e.stopPropagation();
    
    return contextMenuEl;
}

/* ===== SHOW/HIDE CONTEXT MENU ===== */
function showContextMenu(x, y, text) {
    const menu = createContextMenu();
    lastSelectedText = text;
    
    menu.style.display = 'block';
    
    let left = x, top = y;
    if (left + 180 > window.innerWidth) left = window.innerWidth - 190;
    if (top + 100 > window.innerHeight) top = window.innerHeight - 110;
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}

function hideContextMenu() {
    if (contextMenuEl) contextMenuEl.style.display = 'none';
}

/* ===== SHOW/HIDE POPUP ===== */
function showPopup(x, y, word) {
    if (!word || word.length < 2) return;
    
    const popup = createPopup();
    currentWord = word.toLowerCase().trim();
    
    popup.querySelector('.wlp-word').textContent = currentWord;
    popup.querySelector('.wlp-phonetic').textContent = '';
    popup.querySelector('.wlp-content').innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.6); padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Đang tra từ...</div>';
    
    const addBtn = popup.querySelector('.wlp-add-btn');
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.style.cursor = 'not-allowed';
    
    // Position
    let left = x + 10, top = y + 10;
    popup.style.display = 'block';
    popup.style.left = '-9999px';
    popup.style.top = '-9999px';
    
    setTimeout(() => {
        const rect = popup.getBoundingClientRect();
        if (left + rect.width > window.innerWidth - 20) left = x - rect.width - 10;
        if (top + rect.height > window.innerHeight - 20) top = y - rect.height - 10;
        if (left < 10) left = 10;
        if (top < 10) top = 10;
        
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }, 0);
    
    fetchDefinition(currentWord);
}

function hidePopup() {
    if (popupEl) popupEl.style.display = 'none';
    currentWord = '';
    cachedData = null;
}

/* ===== FETCH DEFINITION ===== */
async function fetchDefinition(word) {
    const contentEl = popupEl.querySelector('.wlp-content');
    const phoneticEl = popupEl.querySelector('.wlp-phonetic');
    const addBtn = popupEl.querySelector('.wlp-add-btn');
    
    try {
        const lookupWord = word.split(/\s+/)[0].toLowerCase();
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookupWord)}`);
        
        if (!resp.ok) {
            contentEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.6); padding: 24px;"><i class="fas fa-search"></i> Không tìm thấy từ này</div>';
            return;
        }
        
        const data = await resp.json();
        if (!data?.[0]) {
            contentEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.6); padding: 24px;">Không tìm thấy</div>';
            return;
        }
        
        const entry = data[0];
        cachedData = entry;
        
        popupEl.querySelector('.wlp-word').textContent = entry.word || lookupWord;
        currentWord = entry.word || lookupWord;
        
        let phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
        phoneticEl.textContent = phonetic;
        
        let html = '';
        for (const meaning of (entry.meanings || []).slice(0, 3)) {
            html += `<div style="display: inline-block; background: #6366f1; color: white; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 10px 0 6px;">${escapeHtml(meaning.partOfSpeech)}</div>`;
            
            for (const def of (meaning.definitions || []).slice(0, 2)) {
                html += `<div style="color: rgba(255,255,255,0.9); line-height: 1.55; margin-bottom: 5px;">${escapeHtml(def.definition)}</div>`;
                if (def.example) {
                    html += `<div style="color: rgba(255,255,255,0.5); font-style: italic; font-size: 13px; margin-bottom: 8px; padding-left: 10px; border-left: 3px solid rgba(255,255,255,0.15);">"${escapeHtml(def.example)}"</div>`;
                }
            }
        }
        
        contentEl.innerHTML = html || '<div style="text-align: center; padding: 20px;">Không có định nghĩa</div>';
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
        
    } catch (err) {
        console.error('Lookup error:', err);
        contentEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.6); padding: 24px;"><i class="fas fa-exclamation-circle"></i> Lỗi khi tra từ</div>';
    }
}

/* ===== SPEAK WORD ===== */
function speakWord(word) {
    if (!word) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;
    speechSynthesis.speak(u);
}

/* ===== ADD TO VOCABULARY ===== */
function handleAddWord() {
    if (!currentWord || !cachedData) return;
    
    if (appData.vocabulary?.find(w => w.word?.toLowerCase() === currentWord.toLowerCase())) {
        showToast('Từ này đã có trong từ điển!', 'warning');
        return;
    }
    
    const entry = cachedData;
    const meanings = [];
    
    for (const m of (entry.meanings || [])) {
        for (const d of (m.definitions || []).slice(0, 2)) {
            meanings.push({
                phoneticUS: entry.phonetic || entry.phonetics?.[0]?.text || '',
                phoneticUK: entry.phonetics?.find(p => p.audio?.includes('uk'))?.text || '',
                pos: m.partOfSpeech || '',
                defEn: d.definition || '',
                defVi: '',
                example: d.example || '',
                synonyms: m.synonyms?.slice(0, 5)?.join(', ') || '',
                antonyms: m.antonyms?.slice(0, 5)?.join(', ') || ''
            });
        }
    }
    
    if (!meanings.length) meanings.push({ phoneticUS: '', phoneticUK: '', pos: '', defEn: '', defVi: '', example: '', synonyms: '', antonyms: '' });
    
    const wordObj = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        word: currentWord,
        setId: null,
        meanings,
        source: 'news',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mastered: false,
        bookmarked: false,
        srsLevel: 0,
        nextReview: new Date().toISOString(),
        reviewCount: 0,
        correctCount: 0,
        streak: 0
    };
    
    if (!appData.vocabulary) appData.vocabulary = [];
    appData.vocabulary.push(wordObj);
    saveData(appData);
    
    showToast(`Đã thêm "${currentWord}" vào từ điển!`, 'success');
    hidePopup();
    
    window.dispatchEvent(new CustomEvent('volearn:wordSaved', { detail: wordObj }));
}

/* ===== HELPERS ===== */
function escapeHtml(s) {
    return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
}

function getSelectedText() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return '';
    const t = sel.toString().trim();
    return (t && /^[a-zA-Z\s'-]+$/.test(t) && t.length >= 2 && t.length <= 50) ? t : '';
}

function isInNewsSection(el) {
    const news = document.getElementById('news-section');
    return news?.contains(el);
}

/* ===== GLOBAL MOUSE MOVE/UP FOR DRAG ===== */
function setupDragListeners() {
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !popupEl) return;
        
        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;
        
        const rect = popupEl.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
        
        popupEl.style.left = newX + 'px';
        popupEl.style.top = newY + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (popupEl) {
                const header = popupEl.querySelector('.wlp-header');
                if (header) header.style.cursor = 'move';
                popupEl.style.userSelect = '';
            }
        }
    });
}

/* ===== INIT ===== */
export function initWordLookup() {
    if (isInitialized) return;
    isInitialized = true;
    
    console.log('🚀 Initializing Word Lookup...');
    
    createPopup();
    createContextMenu();
    setupDragListeners();
    
    // Double-click
    document.addEventListener('dblclick', (e) => {
        if (popupEl?.contains(e.target) || contextMenuEl?.contains(e.target)) return;
        if (!isInNewsSection(e.target)) return;
        const text = getSelectedText();
        if (text) {
            e.preventDefault();
            hideContextMenu();
            showPopup(e.clientX, e.clientY, text);
        }
    }, true);
    
    // Right-click
    document.addEventListener('contextmenu', (e) => {
        if (popupEl?.contains(e.target) || contextMenuEl?.contains(e.target)) return;
        if (!isInNewsSection(e.target)) return;
        const text = getSelectedText();
        if (text) {
            e.preventDefault();
            hidePopup();
            showContextMenu(e.clientX, e.clientY, text);
        }
    }, true);
    
    // Click outside
    document.addEventListener('click', (e) => {
        if (contextMenuEl?.style.display !== 'none' && !contextMenuEl?.contains(e.target)) hideContextMenu();
        if (popupEl?.style.display !== 'none' && !popupEl?.contains(e.target)) hidePopup();
    }, true);
    
    // ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { hidePopup(); hideContextMenu(); }
    });
    
    console.log('✅ Word Lookup ready (double-click + right-click + drag)');
}

window.initWordLookup = initWordLookup;
window.showWordLookupPopup = showPopup;
