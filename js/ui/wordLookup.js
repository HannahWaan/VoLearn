/* ===== WORD LOOKUP - Double-click & Right-click to translate ===== */
/* VoLearn v2.4.0 - Tra từ trong News Reader - Mobile Support */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';
import { speak } from '../utils/speech.js';
import { generateId } from '../utils/helpers.js';

/* ===== STATE ===== */
let popupEl = null;
let contextMenuEl = null;
let mobileLookupBtn = null;
let cachedEntry = null;
let lastSelectedText = '';
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

/* ===== MOBILE TOUCH STATE ===== */
let touchState = {
    lastTap: 0,
    lastTarget: null,
    tapTimeout: null,
    selectedText: ''
};

/* ===== MOBILE DETECTION ===== */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || ('ontouchstart' in window) 
        || (navigator.maxTouchPoints > 0);
}

/* ===== GET THEME COLORS ===== */
function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                   document.body.getAttribute('data-theme') === 'dark';
    
    return isDark ? {
        bg: '#1e1e2e',
        bgSecondary: '#2a2a3e',
        border: '#3a3a4e',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        shadow: 'rgba(0,0,0,0.5)',
        accent: '#c70000'
    } : {
        bg: '#ffffff',
        bgSecondary: '#f8fafc',
        border: '#e2e8f0',
        text: '#1e293b',
        textMuted: '#64748b',
        shadow: 'rgba(0,0,0,0.15)',
        accent: '#c70000'
    };
}

/* ===== CREATE POPUP ===== */
function createPopup() {
    if (popupEl) return popupEl;
    
    popupEl = document.createElement('div');
    popupEl.id = 'word-lookup-popup';
    popupEl.className = 'word-lookup-popup';
    
    const colors = getThemeColors();
    const mobile = isMobile();
    
    popupEl.style.cssText = `
        position: fixed !important;
        z-index: 99999 !important;
        background: ${colors.bg} !important;
        border: 1px solid ${colors.border} !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px ${colors.shadow} !important;
        min-width: ${mobile ? 'calc(100vw - 32px)' : '320px'} !important;
        max-width: ${mobile ? 'calc(100vw - 32px)' : 'min(420px, 90vw)'} !important;
        max-height: ${mobile ? '60vh' : '500px'} !important;
        overflow: hidden !important;
        display: none !important;
        flex-direction: column !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    
    popupEl.innerHTML = `
        <div class="wlp-header" style="
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            padding: 12px 16px;
            background: ${colors.bgSecondary};
            border-bottom: 1px solid ${colors.border};
            cursor: ${mobile ? 'default' : 'move'};
            user-select: none;
        ">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                <span class="wlp-word" style="
                    font-weight: 700;
                    font-size: 1.15rem;
                    color: ${colors.text};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                "></span>
                <span class="wlp-phonetic" style="
                    font-size: 0.9rem;
                    color: ${colors.textMuted};
                    white-space: nowrap;
                "></span>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                <button class="wlp-speak" title="Phát âm" style="
                    width: ${mobile ? '44px' : '32px'}; 
                    height: ${mobile ? '44px' : '32px'}; 
                    border-radius: 6px;
                    border: 1px solid ${colors.border};
                    background: ${colors.bg};
                    color: ${colors.textMuted};
                    cursor: pointer; display: flex;
                    align-items: center; justify-content: center;
                    font-size: ${mobile ? '18px' : '14px'};
                    -webkit-tap-highlight-color: transparent;
                "><i class="fas fa-volume-up"></i></button>
                <button class="wlp-close" title="Đóng" style="
                    width: ${mobile ? '44px' : '32px'}; 
                    height: ${mobile ? '44px' : '32px'}; 
                    border-radius: 6px;
                    border: 1px solid ${colors.border};
                    background: ${colors.bg};
                    color: ${colors.textMuted};
                    cursor: pointer; display: flex;
                    align-items: center; justify-content: center;
                    font-size: ${mobile ? '18px' : '14px'};
                    -webkit-tap-highlight-color: transparent;
                "><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="wlp-content" style="
            padding: 16px;
            overflow-y: auto;
            max-height: ${mobile ? 'calc(60vh - 140px)' : '350px'};
            color: ${colors.text};
            -webkit-overflow-scrolling: touch;
        ">
            <div class="wlp-loading" style="
                text-align: center;
                padding: 30px;
                color: ${colors.textMuted};
            ">
                <i class="fas fa-spinner fa-spin"></i> Đang tìm...
            </div>
        </div>
        <div class="wlp-footer" style="
            padding: 12px 16px;
            background: ${colors.bgSecondary};
            border-top: 1px solid ${colors.border};
            display: none;
        ">
            <button class="wlp-add-btn" style="
                width: 100%; 
                padding: ${mobile ? '14px 16px' : '10px 16px'};
                border-radius: 8px; border: none;
                background: ${colors.accent};
                color: white; font-weight: 600;
                cursor: pointer; 
                font-size: ${mobile ? '1rem' : '0.9rem'};
                display: flex; align-items: center;
                justify-content: center; gap: 8px;
                min-height: ${mobile ? '48px' : 'auto'};
                -webkit-tap-highlight-color: transparent;
            ">
                <i class="fas fa-plus"></i> Thêm vào từ điển
            </button>
        </div>
    `;
    
    document.body.appendChild(popupEl);
    
    // Event listeners
    popupEl.querySelector('.wlp-close').addEventListener('click', hidePopup);
    popupEl.querySelector('.wlp-close').addEventListener('touchend', (e) => {
        e.preventDefault();
        hidePopup();
    });
    
    popupEl.querySelector('.wlp-speak').addEventListener('click', () => {
        const word = popupEl.querySelector('.wlp-word')?.textContent;
        if (word) speak(word, 'en-US');
    });
    popupEl.querySelector('.wlp-speak').addEventListener('touchend', (e) => {
        e.preventDefault();
        const word = popupEl.querySelector('.wlp-word')?.textContent;
        if (word) speak(word, 'en-US');
    });
    
    popupEl.querySelector('.wlp-add-btn').addEventListener('click', addToVocabulary);
    popupEl.querySelector('.wlp-add-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        addToVocabulary();
    });
    
    // Drag functionality (desktop only)
    if (!mobile) {
        setupDrag(popupEl);
    }
    
    return popupEl;
}

/* ===== SETUP DRAG (Desktop only) ===== */
function setupDrag(el) {
    const header = el.querySelector('.wlp-header');
    if (!header) return;
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        
        isDragging = true;
        const rect = el.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        el.style.transition = 'none';
        header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !popupEl) return;
        
        const rect = popupEl.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        popupEl.style.left = newX + 'px';
        popupEl.style.top = newY + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging && popupEl) {
            isDragging = false;
            const header = popupEl.querySelector('.wlp-header');
            if (header) header.style.cursor = 'move';
        }
    });
}

/* ===== CREATE CONTEXT MENU (Desktop only) ===== */
function createContextMenu() {
    if (contextMenuEl) return contextMenuEl;
    
    contextMenuEl = document.createElement('div');
    contextMenuEl.id = 'word-lookup-context-menu';
    
    const colors = getThemeColors();
    contextMenuEl.style.cssText = `
        position: fixed !important;
        z-index: 999999 !important;
        background: ${colors.bg} !important;
        border: 1px solid ${colors.border} !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px ${colors.shadow} !important;
        padding: 6px !important;
        display: none !important;
        min-width: 160px !important;
    `;
    
    contextMenuEl.innerHTML = `
        <button class="ctx-translate" style="
            display: flex; align-items: center; gap: 10px;
            width: 100%; padding: 10px 14px;
            border: none; background: transparent;
            color: ${colors.text}; font-size: 0.9rem;
            cursor: pointer; border-radius: 6px;
            text-align: left;
        ">
            <i class="fas fa-language" style="width: 18px; color: ${colors.textMuted};"></i>
            Tra từ điển
        </button>
        <button class="ctx-speak" style="
            display: flex; align-items: center; gap: 10px;
            width: 100%; padding: 10px 14px;
            border: none; background: transparent;
            color: ${colors.text}; font-size: 0.9rem;
            cursor: pointer; border-radius: 6px;
            text-align: left;
        ">
            <i class="fas fa-volume-up" style="width: 18px; color: ${colors.textMuted};"></i>
            Phát âm
        </button>
    `;
    
    document.body.appendChild(contextMenuEl);
    
    // Hover effect
    contextMenuEl.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.background = colors.bgSecondary;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
        });
    });
    
    // Actions
    contextMenuEl.querySelector('.ctx-translate').addEventListener('click', () => {
        hideContextMenu();
        if (lastSelectedText) {
            showPopup(window.lastContextX || 200, window.lastContextY || 200, lastSelectedText);
        }
    });
    
    contextMenuEl.querySelector('.ctx-speak').addEventListener('click', () => {
        hideContextMenu();
        if (lastSelectedText) {
            speak(lastSelectedText, 'en-US');
        }
    });
    
    return contextMenuEl;
}

/* ===== CREATE MOBILE LOOKUP BUTTON ===== */
function createMobileLookupButton() {
    if (mobileLookupBtn) return mobileLookupBtn;
    
    const colors = getThemeColors();
    
    mobileLookupBtn = document.createElement('button');
    mobileLookupBtn.id = 'mobile-lookup-btn';
    mobileLookupBtn.className = 'mobile-lookup-btn';
    mobileLookupBtn.innerHTML = '<i class="fas fa-book-open"></i> Tra từ';
    mobileLookupBtn.style.cssText = `
        position: fixed;
        z-index: 100000;
        padding: 10px 18px;
        background: ${colors.accent};
        color: white;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 16px rgba(199, 0, 0, 0.4);
        cursor: pointer;
        display: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: mobileBtnFadeIn 0.2s ease;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('mobile-lookup-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-lookup-styles';
        style.textContent = `
            @keyframes mobileBtnFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(8px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            .mobile-lookup-btn:active {
                transform: scale(0.95);
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(mobileLookupBtn);
    return mobileLookupBtn;
}

/* ===== SHOW MOBILE LOOKUP BUTTON ===== */
function showMobileLookupButton(text) {
    const btn = createMobileLookupButton();
    const selection = window.getSelection();
    
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position above selection
    const btnHeight = 44;
    let top = rect.top - btnHeight - 12;
    let left = rect.left + (rect.width / 2) - 60;
    
    // Keep within viewport
    if (top < 10) {
        top = rect.bottom + 12;
    }
    if (left < 10) left = 10;
    if (left + 120 > window.innerWidth) {
        left = window.innerWidth - 130;
    }
    
    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    
    // Update theme colors
    const colors = getThemeColors();
    btn.style.background = colors.accent;
    
    // Remove old listener and add new one
    btn.onclick = null;
    btn.ontouchend = null;
    
    const handleLookup = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const centerX = left + 60;
        const centerY = top + btnHeight + 20;
        
        showPopup(centerX, centerY, text);
        hideMobileLookupButton();
        
        // Clear selection
        window.getSelection().removeAllRanges();
    };
    
    btn.onclick = handleLookup;
    btn.ontouchend = handleLookup;
}

/* ===== HIDE MOBILE LOOKUP BUTTON ===== */
function hideMobileLookupButton() {
    if (mobileLookupBtn) {
        mobileLookupBtn.style.display = 'none';
    }
}

/* ===== GET SELECTED TEXT ===== */
function getSelectedText() {
    const selection = window.getSelection();
    return selection?.toString().trim() || '';
}

/* ===== IS IN NEWS SECTION ===== */
function isInNewsSection(target) {
    const newsSection = document.getElementById('news-section');
    if (!newsSection) return false;
    
    // Check if target is within news section
    if (!newsSection.contains(target)) return false;
    
    // Valid content areas
    const validSelectors = [
        '#news-reader',
        '#news-content',
        '#news-trail-text',
        '#news-title',
        '.news-reader-content',
        '.news-card-title',
        '.news-card-summary',
        '.news-article',
        '.news-card'
    ];
    
    return validSelectors.some(selector => target.closest(selector));
}

/* ===== SHOW POPUP ===== */
function showPopup(x, y, text) {
    console.log('🔍 showPopup called:', { x, y, text });
    
    if (!text || text.length < 1) return;
    
    createPopup();
    if (!popupEl) return;
    
    // Update theme colors
    const colors = getThemeColors();
    const mobile = isMobile();
    
    popupEl.style.background = colors.bg;
    popupEl.style.borderColor = colors.border;
    popupEl.style.boxShadow = `0 8px 32px ${colors.shadow}`;
    
    const header = popupEl.querySelector('.wlp-header');
    if (header) {
        header.style.background = colors.bgSecondary;
        header.style.borderBottomColor = colors.border;
    }
    
    const footer = popupEl.querySelector('.wlp-footer');
    if (footer) {
        footer.style.background = colors.bgSecondary;
        footer.style.borderTopColor = colors.border;
    }
    
    // Position popup
    let posX, posY;
    
    if (mobile) {
        // Center horizontally on mobile
        posX = 16;
        posY = Math.max(60, Math.min(y - 100, window.innerHeight - 400));
        popupEl.style.left = '16px';
        popupEl.style.right = '16px';
        popupEl.style.width = 'calc(100vw - 32px)';
    } else {
        const popupWidth = 380;
        const popupHeight = 400;
        
        posX = x + 10;
        posY = y + 10;
        
        if (posX + popupWidth > window.innerWidth - 20) {
            posX = window.innerWidth - popupWidth - 20;
        }
        if (posY + popupHeight > window.innerHeight - 20) {
            posY = window.innerHeight - popupHeight - 20;
        }
        
        posX = Math.max(10, posX);
        posY = Math.max(10, posY);
        
        popupEl.style.left = posX + 'px';
        popupEl.style.width = '';
        popupEl.style.right = '';
    }
    
    popupEl.style.top = posY + 'px';
    popupEl.style.display = 'flex';
    
    // Update word display
    const wordEl = popupEl.querySelector('.wlp-word');
    if (wordEl) {
        wordEl.textContent = text;
        wordEl.style.color = colors.text;
    }
    
    const phoneticEl = popupEl.querySelector('.wlp-phonetic');
    if (phoneticEl) {
        phoneticEl.textContent = '';
        phoneticEl.style.color = colors.textMuted;
    }
    
    const contentEl = popupEl.querySelector('.wlp-content');
    if (contentEl) {
        contentEl.innerHTML = `
            <div class="wlp-loading" style="text-align: center; padding: 30px; color: ${colors.textMuted};">
                <i class="fas fa-spinner fa-spin"></i> Đang tìm...
            </div>
        `;
        contentEl.style.color = colors.text;
    }
    
    // Hide footer initially
    if (footer) footer.style.display = 'none';
    
    // Fetch definition
    fetchDefinition(text);
}

/* ===== HIDE POPUP ===== */
function hidePopup() {
    if (popupEl) {
        popupEl.style.display = 'none';
    }
    cachedEntry = null;
}

/* ===== SHOW CONTEXT MENU ===== */
function showContextMenu(x, y, text) {
    if (!text || isMobile()) return;
    
    createContextMenu();
    if (!contextMenuEl) return;
    
    lastSelectedText = text;
    window.lastContextX = x;
    window.lastContextY = y;
    
    // Update theme colors
    const colors = getThemeColors();
    contextMenuEl.style.background = colors.bg;
    contextMenuEl.style.borderColor = colors.border;
    contextMenuEl.style.boxShadow = `0 4px 20px ${colors.shadow}`;
    
    contextMenuEl.querySelectorAll('button').forEach(btn => {
        btn.style.color = colors.text;
    });
    
    // Position
    let posX = x;
    let posY = y;
    
    if (posX + 180 > window.innerWidth) {
        posX = window.innerWidth - 180;
    }
    if (posY + 100 > window.innerHeight) {
        posY = window.innerHeight - 100;
    }
    
    contextMenuEl.style.left = posX + 'px';
    contextMenuEl.style.top = posY + 'px';
    contextMenuEl.style.display = 'block';
}

/* ===== HIDE CONTEXT MENU ===== */
function hideContextMenu() {
    if (contextMenuEl) {
        contextMenuEl.style.display = 'none';
    }
}

/* ===== FETCH DEFINITION ===== */
async function fetchDefinition(word) {
    const lookupWord = word.toLowerCase().trim().split(/\s+/)[0];
    const colors = getThemeColors();
    
    try {
        const response = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookupWord)}`
        );
        
        if (!response.ok) {
            showNotFound(word);
            return;
        }
        
        const data = await response.json();
        const entry = data[0];
        
        if (!entry) {
            showNotFound(word);
            return;
        }
        
        cachedEntry = entry;
        
        // Update phonetic
        const phoneticEl = popupEl?.querySelector('.wlp-phonetic');
        if (phoneticEl && entry.phonetic) {
            phoneticEl.textContent = entry.phonetic;
        }
        
        // Build content
        let html = '';
        const meanings = entry.meanings?.slice(0, 3) || [];
        
        meanings.forEach(meaning => {
            const pos = meaning.partOfSpeech || '';
            html += `<div style="margin-bottom: 16px;">`;
            html += `<div style="
                font-weight: 600; 
                color: ${colors.accent}; 
                font-size: 0.85rem;
                text-transform: capitalize;
                margin-bottom: 8px;
            ">${pos}</div>`;
            
            const defs = meaning.definitions?.slice(0, 2) || [];
            defs.forEach((def, i) => {
                html += `<div style="margin-bottom: 10px; padding-left: 12px; border-left: 2px solid ${colors.border};">`;
                html += `<div style="color: ${colors.text}; line-height: 1.5;">${i + 1}. ${def.definition || ''}</div>`;
                if (def.example) {
                    html += `<div style="
                        color: ${colors.textMuted}; 
                        font-style: italic; 
                        font-size: 0.9rem;
                        margin-top: 4px;
                    ">"${def.example}"</div>`;
                }
                html += `</div>`;
            });
            
            html += `</div>`;
        });
        
        const contentEl = popupEl?.querySelector('.wlp-content');
        if (contentEl) {
            contentEl.innerHTML = html || `<div style="color: ${colors.textMuted};">Không có định nghĩa</div>`;
        }
        
        // Show footer
        const footer = popupEl?.querySelector('.wlp-footer');
        if (footer) {
            footer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Fetch definition error:', error);
        showNotFound(word);
    }
}

/* ===== SHOW NOT FOUND ===== */
function showNotFound(word) {
    const colors = getThemeColors();
    const contentEl = popupEl?.querySelector('.wlp-content');
    if (contentEl) {
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 30px; color: ${colors.textMuted};">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
                Không tìm thấy "<strong style="color: ${colors.text};">${word}</strong>"
            </div>
        `;
    }
    
    const footer = popupEl?.querySelector('.wlp-footer');
    if (footer) {
        footer.style.display = 'none';
    }
}

/* ===== ADD TO VOCABULARY ===== */
function addToVocabulary() {
    if (!cachedEntry) {
        showToast('Không có dữ liệu từ vựng', 'error');
        return;
    }
    
    const word = cachedEntry.word;
    
    // Check if already exists
    const exists = appData.vocabulary?.some(
        w => w.word.toLowerCase() === word.toLowerCase()
    );
    
    if (exists) {
        showToast(`"${word}" đã có trong từ điển`, 'info');
        hidePopup();
        return;
    }
    
    // Build meanings
    const meanings = [];
    
    (cachedEntry.meanings || []).forEach(meaning => {
        const pos = meaning.partOfSpeech || '';
        const phonetic = cachedEntry.phonetic || '';
        
        (meaning.definitions || []).slice(0, 2).forEach(def => {
            meanings.push({
                phoneticUS: phonetic,
                phoneticUK: phonetic,
                pos: pos,
                defEn: def.definition || '',
                defVi: '',
                example: def.example || '',
                synonyms: (meaning.synonyms || []).slice(0, 5).join(', '),
                antonyms: (meaning.antonyms || []).slice(0, 5).join(', ')
            });
        });
    });
    
    if (meanings.length === 0) {
        meanings.push({
            phoneticUS: cachedEntry.phonetic || '',
            phoneticUK: cachedEntry.phonetic || '',
            pos: '',
            defEn: '',
            defVi: '',
            example: '',
            synonyms: '',
            antonyms: ''
        });
    }
    
    // Create word object
    const now = new Date().toISOString();
    const newWord = {
        id: generateId(),
        word: word,
        setId: null,
        formation: '',
        meanings: meanings,
        createdAt: now,
        updatedAt: now,
        nextReview: now,
        srsLevel: 0,
        mastered: false,
        bookmarked: false,
        source: 'news-reader'
    };
    
    // Add to vocabulary
    if (!appData.vocabulary) appData.vocabulary = [];
    appData.vocabulary.push(newWord);
    saveData(appData);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('volearn:wordSaved', { 
        detail: { word: word, wordId: newWord.id, source: 'news-reader' } 
    }));
    document.dispatchEvent(new CustomEvent('volearn:wordSaved', { 
        detail: { word: word, wordId: newWord.id, source: 'news-reader' } 
    }));
    
    showToast(`Đã thêm "${word}" vào từ điển`, 'success');
    hidePopup();
}

/* ===== HANDLE TOUCH SELECTION (Mobile) ===== */
function handleTouchSelection(e) {
    // Clear any pending tap timeout
    if (touchState.tapTimeout) {
        clearTimeout(touchState.tapTimeout);
    }
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - touchState.lastTap;
    const target = e.target;
    
    // Double-tap detection (within 350ms)
    if (tapLength < 350 && tapLength > 0 && touchState.lastTarget === target) {
        // Double-tap detected!
        e.preventDefault();
        
        // Wait a bit for selection to complete
        setTimeout(() => {
            const selectedText = getSelectedText();
            if (selectedText && selectedText.length >= 1 && selectedText.length <= 50) {
                const touch = e.changedTouches ? e.changedTouches[0] : e;
                const x = touch.clientX || touch.pageX || window.innerWidth / 2;
                const y = touch.clientY || touch.pageY || 150;
                showPopup(x, y, selectedText);
            }
        }, 150);
        
        touchState.lastTap = 0;
        touchState.lastTarget = null;
    } else {
        // First tap - wait for potential second tap
        touchState.lastTap = currentTime;
        touchState.lastTarget = target;
        
        // Reset after 350ms if no second tap
        touchState.tapTimeout = setTimeout(() => {
            touchState.lastTap = 0;
            touchState.lastTarget = null;
        }, 350);
    }
}

/* ===== HANDLE SELECTION CHANGE (Mobile long-press) ===== */
function handleSelectionChange() {
    if (!isMobile()) return;
    
    const selectedText = getSelectedText();
    
    if (selectedText && selectedText !== touchState.selectedText && selectedText.length >= 1 && selectedText.length <= 50) {
        touchState.selectedText = selectedText;
        
        // Check if selection is in news section
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const element = container.nodeType === 3 ? container.parentElement : container;
            
            if (element && isInNewsSection(element)) {
                // Delay to allow selection to stabilize
                setTimeout(() => {
                    const currentText = getSelectedText();
                    if (currentText === selectedText) {
                        showMobileLookupButton(selectedText);
                    }
                }, 200);
            }
        }
    } else if (!selectedText) {
        touchState.selectedText = '';
        // Don't hide immediately - user might still be selecting
        setTimeout(() => {
            if (!getSelectedText()) {
                hideMobileLookupButton();
            }
        }, 300);
    }
}

/* ===== INIT WORD LOOKUP ===== */
export function initWordLookup() {
    console.log('✅ Word Lookup v2.4.0 initializing...', isMobile() ? '(Mobile)' : '(Desktop)');
    
    const mobile = isMobile();
    
    // Desktop: Double-click handler
    if (!mobile) {
        document.addEventListener('dblclick', (e) => {
            if (!isInNewsSection(e.target)) return;
            
            console.log('Double click in news section');
            
            setTimeout(() => {
                const text = getSelectedText();
                if (text && text.length >= 1 && text.length <= 50) {
                    console.log('Selected word:', text);
                    showPopup(e.clientX, e.clientY, text);
                }
            }, 10);
        });
        
        // Desktop: Right-click (context menu) handler
        document.addEventListener('contextmenu', (e) => {
            if (!isInNewsSection(e.target)) return;
            
            const text = getSelectedText();
            if (text && text.length >= 1 && text.length <= 100) {
                e.preventDefault();
                console.log('Right-click with selection:', text);
                showContextMenu(e.clientX, e.clientY, text);
            }
        });
    }
    
    // Mobile: Touch events
    if (mobile) {
        // Double-tap detection
        document.addEventListener('touchend', (e) => {
            if (!isInNewsSection(e.target)) return;
            handleTouchSelection(e);
        }, { passive: false });
        
        // Selection change (for long-press selection)
        document.addEventListener('selectionchange', handleSelectionChange);
        
        console.log('📱 Mobile touch events registered');
    }
    
    // Close popup/menu on outside click (desktop)
    document.addEventListener('click', (e) => {
        // Close context menu
        if (contextMenuEl && !contextMenuEl.contains(e.target)) {
            hideContextMenu();
        }
        
        // Close popup (but not if clicking inside it)
        if (popupEl && popupEl.style.display !== 'none') {
            if (!popupEl.contains(e.target)) {
                hidePopup();
            }
        }
        
        // Hide mobile button if clicking outside and not selecting
        if (mobile && mobileLookupBtn && !mobileLookupBtn.contains(e.target)) {
            setTimeout(() => {
                if (!getSelectedText()) {
                    hideMobileLookupButton();
                }
            }, 100);
        }
    });
    
    // Mobile: Touch outside to close
    if (mobile) {
        document.addEventListener('touchstart', (e) => {
            // Close popup if touching outside
            if (popupEl && popupEl.style.display !== 'none' && !popupEl.contains(e.target)) {
                // Small delay to allow button clicks to register
                setTimeout(() => {
                    if (popupEl && popupEl.style.display !== 'none' && !popupEl.contains(document.activeElement)) {
                        hidePopup();
                    }
                }, 100);
            }
        }, { passive: true });
    }
    
    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hidePopup();
            hideContextMenu();
            hideMobileLookupButton();
        }
    });
    
    console.log('✅ Word Lookup v2.4.0 initialized');
}

/* ===== GLOBAL EXPORT FOR TESTING ===== */
window.showWordLookupPopup = showPopup;

export { showPopup, hidePopup };
