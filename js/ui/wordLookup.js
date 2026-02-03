/* ===== WORD LOOKUP - Double-click & Select to translate ===== */
/* VoLearn v2.1.0 - Tra từ trong News Reader */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';

let popupEl = null;
let currentWord = '';
let cachedData = null;
let isInitialized = false;

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
  popupEl.querySelector('.wlp-close').addEventListener('click', hidePopup);
  popupEl.querySelector('.wlp-speak').addEventListener('click', () => speakWord(currentWord));
  popupEl.querySelector('.wlp-add-btn').addEventListener('click', handleAddWord);
  
  // Prevent popup clicks from closing it
  popupEl.addEventListener('click', (e) => e.stopPropagation());
  
  return popupEl;
}

/* ===== SHOW/HIDE POPUP ===== */
function showPopup(x, y, word) {
  const popup = createPopup();
  currentWord = word.toLowerCase().trim();
  
  popup.querySelector('.wlp-word').textContent = currentWord;
  popup.querySelector('.wlp-phonetic').textContent = '';
  popup.querySelector('.wlp-content').innerHTML = '<div class="wlp-loading"><i class="fas fa-spinner fa-spin"></i> Đang tra từ...</div>';
  popup.querySelector('.wlp-add-btn').disabled = true;
  
  // Show popup first to get dimensions
  popup.style.display = 'block';
  popup.style.opacity = '0';
  
  // Calculate position
  requestAnimationFrame(() => {
    const rect = popup.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    let left = x + 10;
    let top = y + 10;
    
    // Adjust if overflowing right
    if (left + rect.width > viewportW - 20) {
      left = x - rect.width - 10;
    }
    // Adjust if overflowing bottom
    if (top + rect.height > viewportH - 20) {
      top = y - rect.height - 10;
    }
    // Keep within bounds
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.opacity = '1';
  });
  
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
  const contentEl = popupEl.querySelector('.wlp-content');
  const phoneticEl = popupEl.querySelector('.wlp-phonetic');
  const addBtn = popupEl.querySelector('.wlp-add-btn');
  
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const resp = await fetch(url);
    
    if (!resp.ok) {
      contentEl.innerHTML = '<div class="wlp-not-found"><i class="fas fa-search"></i> Không tìm thấy từ này</div>';
      cachedData = null;
      return;
    }
    
    const data = await resp.json();
    if (!data || !data[0]) {
      contentEl.innerHTML = '<div class="wlp-not-found"><i class="fas fa-search"></i> Không tìm thấy từ này</div>';
      cachedData = null;
      return;
    }
    
    const entry = data[0];
    cachedData = entry;
    
    // Phonetic - try multiple sources
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
    
  } catch (err) {
    console.error('Word Lookup error:', err);
    contentEl.innerHTML = '<div class="wlp-not-found"><i class="fas fa-exclamation-circle"></i> Lỗi khi tra từ</div>';
    cachedData = null;
  }
}

/* ===== SPEAK WORD ===== */
function speakWord(word) {
  if (!word) return;
  
  // Cancel any ongoing speech
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

/* ===== ADD TO VOCABULARY ===== */
function handleAddWord() {
  if (!currentWord || !cachedData) return;
  
  // Check if word exists
  const existing = appData.vocabulary?.find(w => 
    w.word?.toLowerCase() === currentWord.toLowerCase()
  );
  
  if (existing) {
    showToast('Từ này đã có trong từ điển!', 'warning');
    return;
  }
  
  // Build meanings array from API data
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
        defVi: '', // User can add later
        example: def.example || '',
        synonyms: meaning.synonyms?.slice(0, 5) || [],
        antonyms: meaning.antonyms?.slice(0, 5) || []
      });
    }
  }
  
  // Fallback if no meanings parsed
  if (meanings.length === 0) {
    meanings.push({
      phoneticUS: entry.phonetic || '',
      phoneticUK: '',
      pos: '',
      defEn: '',
      defVi: '',
      example: '',
      synonyms: [],
      antonyms: []
    });
  }
  
  const wordObj = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    word: currentWord,
    setId: null,
    meanings: meanings,
    source: 'news',
    createdAt: new Date().toISOString(),
    mastered: false,
    bookmarked: false,
    srsLevel: 0,
    nextReview: null,
    reviewCount: 0,
    correctCount: 0,
    streak: 0
  };
  
  // Add to vocabulary
  if (!appData.vocabulary) appData.vocabulary = [];
  appData.vocabulary.push(wordObj);
  
  saveData(appData);
  
  showToast(`Đã thêm "${currentWord}" vào từ điển!`, 'success');
  hidePopup();
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('volearn:wordSaved', { detail: wordObj }));
}

/* ===== ESCAPE HTML ===== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== GET SELECTED TEXT ===== */
function getSelectedWord(allowPhrase = false) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  let text = selection.toString().trim();
  if (!text) return null;
  
  // For phrases (select to translate)
  if (allowPhrase) {
    // Allow spaces for phrases, max 5 words
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 5) return null;
    if (text.length > 100) return null;
    // Basic validation - letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(text)) return null;
    return text;
  }
  
  // For single words (double-click)
  // Only allow single word with hyphens/apostrophes
  if (!/^[a-zA-Z'-]+$/.test(text)) return null;
  if (text.length < 2 || text.length > 30) return null;
  
  return text;
}

/* ===== CHECK IF IN NEWS CONTENT ===== */
function isInNewsContent(element) {
  if (!element) return false;
  
  const newsSection = element.closest('#news-section');
  if (!newsSection) return false;
  
  // Check if in reader content areas
  const validAreas = [
    '.news-reader-content',
    '.news-trail-text',
    '#news-reader',
    '#news-trail-text',
    '.news-card-title',
    '.news-card-summary'
  ];
  
  for (const selector of validAreas) {
    if (element.closest(selector)) return true;
  }
  
  return false;
}

/* ===== INIT ===== */
export function initWordLookup() {
  // Prevent double initialization
  if (isInitialized) return;
  isInitialized = true;
  
  // Double-click to translate (single word)
  document.addEventListener('dblclick', (e) => {
    if (!isInNewsContent(e.target)) return;
    
    const word = getSelectedWord(false);
    if (!word) return;
    
    e.preventDefault();
    e.stopPropagation();
    showPopup(e.clientX, e.clientY, word);
  });
  
  // Select text + wait to translate (phrase support)
  let selectionTimeout = null;
  
  document.addEventListener('mouseup', (e) => {
    // Ignore if clicking inside popup
    if (popupEl && popupEl.contains(e.target)) return;
    if (!isInNewsContent(e.target)) return;
    
    // Clear previous timeout
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }
    
    // Wait a bit for selection to stabilize
    selectionTimeout = setTimeout(() => {
      const text = getSelectedWord(true);
      if (!text) return;
      
      // Don't show if it's just a single word (handled by dblclick)
      // Show for phrases or if user explicitly selected
      const wordCount = text.split(/\s+/).length;
      if (wordCount === 1) return; // Let dblclick handle single words
      
      showPopup(e.clientX, e.clientY, text);
    }, 500); // 500ms delay for select-to-translate
  });
  
  // Click outside to close popup
  document.addEventListener('click', (e) => {
    if (!popupEl) return;
    if (popupEl.style.display === 'none') return;
    if (popupEl.contains(e.target)) return;
    
    hidePopup();
  });
  
  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopup();
  });
  
  console.log('✅ Word Lookup initialized (double-click & select)');
}

// Global access
window.initWordLookup = initWordLookup;
window.hideWordLookup = hidePopup;
