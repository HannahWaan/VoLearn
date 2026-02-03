/* ===== WORD LOOKUP - Double-click to translate ===== */
/* VoLearn v2.1.0 - Tra từ trong News Reader */

import { appData, addWord } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';

const MW_LEARNER_KEY = 'e2a81210-97b7-430a-86f6-6a53cd1d3d25';

let popupEl = null;
let currentWord = '';

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
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (popupEl && !popupEl.contains(e.target) && popupEl.style.display !== 'none') {
      hidePopup();
    }
  });
  
  return popupEl;
}

/* ===== SHOW/HIDE POPUP ===== */
function showPopup(x, y, word) {
  const popup = createPopup();
  currentWord = word.toLowerCase().trim();
  
  popup.querySelector('.wlp-word').textContent = currentWord;
  popup.querySelector('.wlp-phonetic').textContent = '';
  popup.querySelector('.wlp-content').innerHTML = '<div class="wlp-loading">Đang tra từ...</div>';
  popup.querySelector('.wlp-add-btn').disabled = true;
  
  // Position
  popup.style.display = 'block';
  
  const rect = popup.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  
  let left = x + 10;
  let top = y + 10;
  
  if (left + rect.width > viewportW - 20) {
    left = viewportW - rect.width - 20;
  }
  if (top + rect.height > viewportH - 20) {
    top = y - rect.height - 10;
  }
  if (left < 10) left = 10;
  if (top < 10) top = 10;
  
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  
  // Fetch definition
  fetchDefinition(currentWord);
}

function hidePopup() {
  if (popupEl) {
    popupEl.style.display = 'none';
  }
}

/* ===== FETCH DEFINITION ===== */
let cachedData = null;

async function fetchDefinition(word) {
  const contentEl = popupEl.querySelector('.wlp-content');
  const phoneticEl = popupEl.querySelector('.wlp-phonetic');
  const addBtn = popupEl.querySelector('.wlp-add-btn');
  
  try {
    const url = `https://www.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const resp = await fetch(url);
    
    if (!resp.ok) {
      contentEl.innerHTML = '<div class="wlp-not-found">Không tìm thấy từ này</div>';
      cachedData = null;
      return;
    }
    
    const data = await resp.json();
    if (!data || !data[0]) {
      contentEl.innerHTML = '<div class="wlp-not-found">Không tìm thấy từ này</div>';
      cachedData = null;
      return;
    }
    
    const entry = data[0];
    cachedData = entry;
    
    // Phonetic
    const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
    phoneticEl.textContent = phonetic;
    
    // Meanings
    let html = '';
    const meanings = entry.meanings || [];
    
    for (const meaning of meanings.slice(0, 3)) {
      const pos = meaning.partOfSpeech || '';
      const defs = meaning.definitions || [];
      
      html += `<div class="wlp-pos">${pos}</div>`;
      
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
    console.error('Lookup error:', err);
    contentEl.innerHTML = '<div class="wlp-not-found">Lỗi khi tra từ</div>';
    cachedData = null;
  }
}

/* ===== SPEAK WORD ===== */
function speakWord(word) {
  if (!word) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

/* ===== ADD TO VOCABULARY ===== */
async function handleAddWord() {
  if (!currentWord || !cachedData) return;
  
  // Check if word exists
  const existing = appData.vocabulary?.find(w => 
    w.word?.toLowerCase() === currentWord.toLowerCase()
  );
  
  if (existing) {
    showToast('Từ này đã có trong từ điển!', 'warning');
    return;
  }
  
  // Build word object
  const entry = cachedData;
  const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
  
  // Get first meaning
  const meanings = entry.meanings || [];
  let meaningText = '';
  let pos = '';
  let example = '';
  
  if (meanings[0]) {
    pos = meanings[0].partOfSpeech || '';
    const defs = meanings[0].definitions || [];
    if (defs[0]) {
      meaningText = defs[0].definition || '';
      example = defs[0].example || '';
    }
  }
  
  const wordObj = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    word: currentWord,
    phonetic: phonetic,
    pos: pos,
    meaning: meaningText,
    example: example,
    source: 'news',
    createdAt: new Date().toISOString(),
    mastered: false,
    bookmarked: false,
    srsLevel: 0,
    nextReview: null
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
function getSelectedWord() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const text = selection.toString().trim();
  if (!text) return null;
  
  // Only single word (allow hyphen)
  if (!/^[a-zA-Z'-]+$/.test(text)) return null;
  if (text.length < 2 || text.length > 30) return null;
  
  return text;
}

/* ===== INIT ===== */
export function initWordLookup() {
  // Double-click in news reader content
  document.addEventListener('dblclick', (e) => {
    // Only in news section
    const newsSection = e.target.closest('#news-section');
    if (!newsSection) return;
    
    // Only in reader content or trail text
    const inContent = e.target.closest('.news-reader-content') || 
                      e.target.closest('.news-trail-text');
    if (!inContent) return;
    
    const word = getSelectedWord();
    if (!word) return;
    
    e.preventDefault();
    showPopup(e.clientX, e.clientY, word);
  });
  
  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopup();
  });
  
  console.log('✅ Word Lookup initialized');
}

// Global
window.initWordLookup = initWordLookup;
