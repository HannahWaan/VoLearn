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

/* ===== CREATE POPUP ===== */
function createPopup() {
    if (popupEl) return popupEl;
    
    popupEl = document.createElement('div');
    popupEl.id = 'word-lookup-popup';
    popupEl.className = 'word-lookup-popup';
    popupEl.innerHTML = `
        <div class="wlp-header">
            <span class="wlp-word"></span>
            <button class="wlp-speak" title="Phát âm"><i class="fas fa-volume-up"></i></button>
            <button class="wlp-close" title="Đóng"><i class="fas fa-times"></i></button>
        </div>
        <div class="wlp-phonetic"></div>
        <div class="wlp-content">
            <div class="wlp-loading">Đang tra từ...</div>
        </div>
        <div class="wlp-actions">
            <button class="wlp-add-btn" disabled>
                <i class="fas fa-plus"></i> Thêm vào từ điển
            </button>
        </div>
    `;
    
    document.body.appendChild(popupEl);
    
    // Events
    popupEl.querySelector('.wlp-close').onclick = hidePopup;
    popupEl.querySelector('.wlp-speak').onclick = () => speakWord(currentWord);
    popupEl.querySelector('.wlp-add-btn').onclick = handleAddWord;
    
    // Prevent events from bubbling
    popupEl.onclick = (e) => e.stopPropagation();
    popupEl.onmouseup = (e) => e.stopPropagation();
    popupEl.ondblclick = (e) => e.stopPropagation();
    popupEl.oncontextmenu = (e) => e.stopPropagation();
    
    console.log('✅ Popup element created and appended to body');
    return popupEl;
}

/* ===== CREATE CONTEXT MENU ===== */
function createContextMenu() {
    if (contextMenuEl) return contextMenuEl;
    
    contextMenuEl = document.createElement('div');
    contextMenuEl.id = 'word-lookup-context-menu';
    contextMenuEl.className = 'wlp-context-menu';
    contextMenuEl.innerHTML = `
        <button class="wlp-context-btn" id="wlp-ctx-translate">
            <i class="fas fa-language"></i> Tra từ điển
        </button>
        <button class="wlp-context-btn" id="wlp-ctx-speak">
            <i class="fas fa-volume-up"></i> Phát âm
        </button>
    `;
    
    document.body.appendChild(contextMenuEl);
    
    // Events
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
        if (lastSelectedText) {
            speakWord(lastSelectedText);
        }
    };
    
    contextMenuEl.onclick = (e) => e.stopPropagation();
    
    console.log('✅ Context menu created');
    return contextMenuEl;
}

/* ===== SHOW/HIDE CONTEXT MENU ===== */
function showContextMenu(x, y, text) {
    const menu = createContextMenu();
    lastSelectedText = text;
    
    menu.style.display = 'block';
    
    // Position
    const menuRect = menu.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    let left = x;
    let top = y;
    
    if (left + 180 > viewportW) left = viewportW - 190;
    if (top + 100 > viewportH) top = viewportH - 110;
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    
    console.log('Context menu shown at:', left, top, 'for text:', text);
}

function hideContextMenu() {
    if (contextMenuEl) {
        contextMenuEl.style.display = 'none';
    }
}

/* ===== SHOW/HIDE POPUP ===== */
function showPopup(x, y, word) {
    console.log('=== showPopup() called ===');
    console.log('Position:', x, y);
    console.log('Word:', word);
    
    if (!word || word.length < 2) {
        console.log('Word too short, aborting');
        return;
    }
    
    const popup = createPopup();
    currentWord = word.toLowerCase().trim();
    
    // Reset content
    popup.querySelector('.wlp-word').textContent = currentWord;
    popup.querySelector('.wlp-phonetic').textContent = '';
    popup.querySelector('.wlp-content').innerHTML = '<div class="wlp-loading"><i class="fas fa-spinner fa-spin"></i> Đang tra từ...</div>';
    popup.querySelector('.wlp-add-btn').disabled = true;
    
    // Show and position
    popup.style.display = 'block';
    popup.style.left = '0px';
    popup.style.top = '0px';
    
    // Calculate position after display
    setTimeout(() => {
        const rect = popup.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        
        let left = x + 5;
        let top = y + 5;
        
        // Adjust if overflowing
        if (left + rect.width > viewportW - 20) {
            left = x - rect.width - 5;
        }
        if (top + rect.height > viewportH - 20) {
            top = y - rect.height - 5;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;
        
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        
        console.log('Popup positioned at:', left, top);
        console.log('Popup display style:', popup.style.display);
        console.log('Popup in DOM:', document.body.contains(popup));
    }, 10);
    
    // Fetch definition
    fetchDefinition(currentWord);
}

function hidePopup() {
    if (popupEl) {
        popupEl.style.display = 'none';
    }
    currentWord = '';
    cachedData = null;
}

/* ===== FETCH DEFINITION ===== */
async function fetchDefinition(word) {
    console.log('Fetching definition for:', word);
    
    const contentEl = popupEl.querySelector('.wlp-content');
    const phoneticEl = popupEl.querySelector('.wlp-phonetic');
    const addBtn = popupEl.querySelector('.wlp-add-btn');
    
    try {
        // Take first word if phrase
        const lookupWord = word.split(/\s+/)[0].toLowerCase();
        
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookupWord)}`;
        console.log('API URL:', url);
        
        const resp = await fetch(url);
        console.log('API response status:', resp.status);
        
        if (!resp.ok) {
            contentEl.innerHTML = '<div class="wlp-not-found"><i class="fas fa-search"></i> Không tìm thấy từ này</div>';
            cachedData = null;
            return;
        }
        
        const data = await resp.json();
        console.log('API data:', data);
        
        if (!data || !data[0]) {
            contentEl.innerHTML = '<div class="wlp-not-found"><i class="fas fa-search"></i> Không tìm thấy từ này</div>';
            cachedData = null;
            return;
        }
        
        const entry = data[0];
        cachedData = entry;
        
        // Update word
        popupEl.querySelector('.wlp-word').textContent = entry.word || lookupWord;
        currentWord = entry.word || lookupWord;
        
        // Phonetic
        let phonetic = entry.phonetic || '';
        if (!phonetic && entry.phonetics?.length) {
            for (const p of entry.phonetics) {
                if (p.text) {
                    phonetic = p.text;
                    break;
                }
            }
        }
        phoneticEl.textContent = phonetic;
        
        // Meanings
        let html = '';
        const meanings = entry.meanings || [];
        
        for (const meaning of meanings.slice(0, 3)) {
            const pos = meaning.partOfSpeech || '';
            const defs = meaning.definitions || [];
            
            html += `<div class="wlp-pos">${escapeHtml(pos)}</div>`;
            
            for (const def of defs.slice(0, 2)) {
                html += `<div class="wlp-def">${escapeHtml(def.definition)}</div>`;
                if (def.example) {
                    html += `<div class="wlp-example">"${escapeHtml(def.example)}"</div>`;
                }
            }
        }
        
        contentEl.innerHTML = html || '<div class="wlp-not-found">Không có định nghĩa</div>';
        addBtn.disabled = false;
        
        console.log('Definition loaded successfully');
        
    } catch (err) {
        console.error('Word Lookup error:', err);
        contentEl.innerHTML = '<div class="wlp-not-found"><i class="fas fa-exclamation-circle"></i> Lỗi khi tra từ</div>';
        cachedData = null;
    }
}

/* ===== SPEAK WORD ===== */
function speakWord(word) {
    if (!word) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
    console.log('Speaking:', word);
}

/* ===== ADD TO VOCABULARY ===== */
function handleAddWord() {
    if (!currentWord || !cachedData) return;
    
    const existing = appData.vocabulary?.find(w => 
        w.word?.toLowerCase() === currentWord.toLowerCase()
    );
    
    if (existing) {
        showToast('Từ này đã có trong từ điển!', 'warning');
        return;
    }
    
    const entry = cachedData;
    const meanings = [];
    
    for (const meaning of (entry.meanings || [])) {
        const pos = meaning.partOfSpeech || '';
        const defs = meaning.definitions || [];
        
        for (const def of defs.slice(0, 2)) {
            meanings.push({
                phoneticUS: entry.phonetic || entry.phonetics?.[0]?.text || '',
                phoneticUK: entry.phonetics?.find(p => p.audio?.includes('uk'))?.text || '',
                pos: pos,
                defEn: def.definition || '',
                defVi: '',
                example: def.example || '',
                synonyms: meaning.synonyms?.slice(0, 5)?.join(', ') || '',
                antonyms: meaning.antonyms?.slice(0, 5)?.join(', ') || ''
            });
        }
    }
    
    if (meanings.length === 0) {
        meanings.push({
            phoneticUS: entry.phonetic || '',
            phoneticUK: '',
            pos: '',
            defEn: '',
            defVi: '',
            example: '',
            synonyms: '',
            antonyms: ''
        });
    }
    
    const wordObj = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        word: currentWord,
        setId: null,
        meanings: meanings,
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
    document.dispatchEvent(new CustomEvent('volearn:wordSaved', { detail: wordObj }));
}

/* ===== HELPERS ===== */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';
    
    let text = selection.toString().trim();
    if (!text) return '';
    
    // Basic validation
    if (!/^[a-zA-Z\s'-]+$/.test(text)) return '';
    if (text.length < 2 || text.length > 50) return '';
    
    return text;
}

function isInNewsSection(element) {
    if (!element) return false;
    const newsSection = document.getElementById('news-section');
    return newsSection && newsSection.contains(element);
}

/* ===== INIT ===== */
export function initWordLookup() {
    if (isInitialized) {
        console.log('Word Lookup already initialized');
        return;
    }
    isInitialized = true;
    
    console.log('🚀 Initializing Word Lookup...');
    
    // Pre-create elements
    createPopup();
    createContextMenu();
    
    // ===== DOUBLE-CLICK =====
    document.addEventListener('dblclick', (e) => {
        if (popupEl?.contains(e.target)) return;
        if (contextMenuEl?.contains(e.target)) return;
        if (!isInNewsSection(e.target)) return;
        
        const text = getSelectedText();
        console.log('Double-click detected, selected text:', text);
        
        if (text) {
            e.preventDefault();
            hideContextMenu();
            showPopup(e.clientX, e.clientY, text);
        }
    }, true);
    
    // ===== RIGHT-CLICK (Context Menu) =====
    document.addEventListener('contextmenu', (e) => {
        if (popupEl?.contains(e.target)) return;
        if (contextMenuEl?.contains(e.target)) return;
        if (!isInNewsSection(e.target)) return;
        
        const text = getSelectedText();
        console.log('Right-click detected, selected text:', text);
        
        if (text) {
            e.preventDefault();
            hidePopup();
            showContextMenu(e.clientX, e.clientY, text);
        }
    }, true);
    
    // ===== CLICK OUTSIDE TO CLOSE =====
    document.addEventListener('click', (e) => {
        // Close context menu
        if (contextMenuEl && contextMenuEl.style.display !== 'none') {
            if (!contextMenuEl.contains(e.target)) {
                hideContextMenu();
            }
        }
        
        // Close popup
        if (popupEl && popupEl.style.display !== 'none') {
            if (!popupEl.contains(e.target)) {
                hidePopup();
            }
        }
    }, true);
    
    // ===== ESC TO CLOSE =====
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hidePopup();
            hideContextMenu();
        }
    });
    
    console.log('✅ Word Lookup initialized (double-click + right-click)');
}

// Global access
window.initWordLookup = initWordLookup;
window.hideWordLookup = hidePopup;
window.showWordLookupPopup = showPopup; // For testing
