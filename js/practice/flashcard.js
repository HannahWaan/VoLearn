/* ===== FLASHCARD MODE ===== */
/* VoLearn v2.1.0 - Chế độ luyện tập Flashcard */

import {
  initPractice,
  getCurrentWord,
  submitAnswer,
  skipWord,
  finishPractice,
  getPracticeState,
  getWordsByScope,
  resetPractice,
  showPracticeArea
} from './practiceEngine.js';
import { speak } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let isFlipped = false;
let autoPlayEnabled = false;
let autoPlayTimer = null;

/* ===== START FLASHCARD ===== */
export function startFlashcard(scope, settings = {}) {
    const words = getWordsByScope(scope);
    
    if (!words.length) {
        showToast('Không có từ để luyện tập!', 'warning');
        return;
    }

    const defaultSettings = {
        shuffle: true,
        autoPlay: false,
        autoPlayDelay: 3000,
        showPhonetic: true,
        showExample: true,
        speakOnShow: false,
        speakOnFlip: false
    };

    const mergedSettings = { ...defaultSettings, ...settings };
    
    if (!initPractice('flashcard', words, mergedSettings)) {
        return;
    }
    
    showPracticeArea();

    autoPlayEnabled = mergedSettings.autoPlay;
    
    renderFlashcardUI();
    showCurrentCard();
}

/* ===== RENDER UI ===== */
function renderFlashcardUI() {
    const container = document.getElementById('practice-content');
    if (!container) return;

    container.innerHTML = `
        <div class="flashcard-container" data-render="flashcard-ui">     
            <div class="flashcard-main">
                <div class="fc-card" id="flashcard" onclick="window.flipCard()">
                    <div class="fc-card-inner">
                        <div class="fc-card-front" id="flashcard-front">
                            <!-- Word will be rendered here -->
                        </div>
                        <div class="fc-card-back" id="flashcard-back">
                            <!-- Meaning will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flashcard-controls srs-buttons">
                <button class="btn-srs btn-again" onclick="window.flashcardGrade('forgot')">
                    <i class="fas fa-times"></i>
                    <span>Quên</span>
                </button>
                <button class="btn-srs btn-hard" onclick="window.flashcardGrade('hard')">
                    <i class="fas fa-frown"></i>
                    <span>Khó</span>
                </button>
                <button class="btn-srs btn-good" onclick="window.flashcardGrade('good')">
                    <i class="fas fa-smile"></i>
                    <span>Nhớ</span>
                </button>
                <button class="btn-srs btn-easy" onclick="window.flashcardGrade('easy')">
                    <i class="fas fa-grin-stars"></i>
                    <span>Dễ</span>
                </button>
            </div>
            
            <div class="flashcard-nav">
                <button class="btn-secondary" onclick="window.prevCard()" id="btn-prev-card">
                    <i class="fas fa-chevron-left"></i> Trước
                </button>
                <button class="btn-icon btn-speak" onclick="window.speakCurrentFlashcard()">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="btn-secondary" onclick="window.skipFlashcard()">
                    Bỏ qua <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    updateAutoPlayButton();
}

/* ===== SHOW CURRENT CARD ===== */
function getFieldValueForFlashcard(word, fieldId) {
  const m = (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};

  const asText = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.filter(Boolean).join(', ');
    return String(v).trim();
  };

  switch (fieldId) {
    case 'word': return asText(word?.word);
    case 'phonetic': return asText(m.phoneticUS || m.phoneticUK || word?.phonetic);
    case 'pos': return asText(m.pos || word?.partOfSpeech);

    case 'defVi': return asText(m.defVi);
    case 'defEn': return asText(m.defEn);
    case 'example': return asText(m.example);

    case 'synonyms': return asText(m.synonyms);
    case 'antonyms': return asText(m.antonyms);

    default: return '';
  }
}

function showCurrentCard() {
    const word = getCurrentWord();
    
    if (!word) {
        showResults();
        return;
    }

    isFlipped = false;
    
    const flashcard = document.getElementById('flashcard');
    const front = document.getElementById('flashcard-front');
    const back = document.getElementById('flashcard-back');

    if (!flashcard || !front || !back) return;

    // Reset flip state
    flashcard.classList.remove('flipped');

    // Đọc settings từ practiceEngine (được truyền từ flashcardSettings.js)
    const state = getPracticeState();
    const frontFields = Array.isArray(state.settings?.frontFields) ? state.settings.frontFields : ['word', 'phonetic'];
    const backFields  = Array.isArray(state.settings?.backFields)  ? state.settings.backFields  : ['defVi', 'example'];
    
    // Render theo fields đã tick
    const renderSide = (fields) => {
      return (fields || [])
        .map(f => {
          const val = getFieldValueForFlashcard(word, f);
          if (!val) return '';
          return `<div class="card-line card-${f}">${escapeHtml(val)}</div>`;
        })
        .filter(Boolean)
        .join('');
    };
    
    front.innerHTML = renderSide(frontFields) || `<div class="card-line card-word">${escapeHtml(word.word || '')}</div>`;
    back.innerHTML  = renderSide(backFields)  || `<div class="card-line card-defVi">${escapeHtml(getFieldValueForFlashcard(word, 'defVi') || getFieldValueForFlashcard(word, 'defEn') || '')}</div>`;
      
    updateProgress();
    
    // Speak if enabled
    if (state.settings?.speakOnShow) {
        speak(word.word);
    }

    // Auto play
    if (autoPlayEnabled) {
        startAutoPlay();
    }
}

/* ===== FLIP CARD ===== */
export function flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (!flashcard) return;

    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped', isFlipped);

    // Speak meaning if enabled
    if (isFlipped) {
        const word = getCurrentWord();
        const state = getPracticeState();
        if (state.settings?.speakOnFlip && word) {
            // Could speak meaning here if TTS supports Vietnamese
        }
    }

    stopAutoPlay();
}

/* ===== MARK CORRECT/WRONG ===== */
export function markCorrect() {
    stopAutoPlay();
    submitAnswer(null, true);
    showCurrentCard();
}

export function markWrong() {
    stopAutoPlay();
    submitAnswer(null, false);
    showCurrentCard();
}

export function skipFlashcard() {
    stopAutoPlay();
    skipWord();
    showCurrentCard();
}

export function prevCard() {
    // Go back to previous card (for review)
    const state = getPracticeState();
    if (state.currentIndex > 0) {
        // This would need modification to practiceEngine to support going back
        showToast('Chức năng quay lại đang phát triển', 'info');
    }
}

/* ===== AUTO PLAY ===== */
export function toggleAutoPlay() {
    autoPlayEnabled = !autoPlayEnabled;
    updateAutoPlayButton();
    
    if (autoPlayEnabled) {
        startAutoPlay();
        showToast('Đã bật tự động lật', 'info');
    } else {
        stopAutoPlay();
        showToast('Đã tắt tự động lật', 'info');
    }
}

function startAutoPlay() {
    stopAutoPlay();
    
    const state = getPracticeState();
    const delay = state.settings?.autoPlayDelay || 3000;
    
    autoPlayTimer = setTimeout(() => {
        if (!isFlipped) {
            flipCard();
            // After showing meaning, wait then go to next
            autoPlayTimer = setTimeout(() => {
                markCorrect();
            }, delay);
        }
    }, delay);
}

function stopAutoPlay() {
    if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function updateAutoPlayButton() {
    const btn = document.getElementById('btn-autoplay');
    if (btn) {
        btn.classList.toggle('active', autoPlayEnabled);
        btn.innerHTML = autoPlayEnabled 
            ? '<i class="fas fa-pause-circle"></i>'
            : '<i class="fas fa-play-circle"></i>';
    }
}

/* ===== SPEAK ===== */
export function speakCurrentFlashcard() {
    const word = getCurrentWord();
    if (word) {
        speak(word.word);
    }
}

/* ===== UPDATE PROGRESS ===== */
function updateProgress() {
    const state = getPracticeState();
    
    // Đồng bộ progress lên header practice của VoLearn (thanh trên cùng)
    const bar2 = document.getElementById('practice-progress-bar');
    const text2 = document.getElementById('practice-progress-text');
    if (bar2?.style) bar2.style.width = `${state.progress}%`;
    if (text2) text2.textContent = `${state.currentIndex}/${state.total}`;
}

/* ===== SHOW RESULTS ===== */
function showResults() {
    stopAutoPlay();
    
    const result = finishPractice();
    const state = getPracticeState();
  
    const bar = document.getElementById('practice-progress-bar');
    const text = document.getElementById('practice-progress-text');
    if (bar?.style) bar.style.width = '100%';
    if (text) text.textContent = `${result.total}/${result.total}`;
  
    // Lấy danh sách từ sai (Quên + Khó)
    const wrongWords = state.answers?.filter(a => !a.isCorrect) || [];
    const hasWrongWords = wrongWords.length > 0;
    
    const container = document.getElementById('practice-content');
    if (!container) return;

    container.innerHTML = `
        <div class="practice-results">
            <div class="results-header">
                <i class="fas fa-trophy"></i>
                <h2>Hoàn thành!</h2>
            </div>
            
            <div class="results-stats">
                <div class="stat-circle">
                    <svg viewBox="0 0 36 36">
                        <path class="stat-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        <path class="stat-fill" stroke-dasharray="${result.accuracy}, 100" 
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <span class="stat-value">${result.accuracy}%</span>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${result.total}</span>
                        <span class="label">Tổng số</span>
                    </div>
                    <div class="stat-item correct">
                        <span class="value">${result.score}</span>
                        <span class="label">Đã thuộc</span>
                    </div>
                    <div class="stat-item wrong">
                        <span class="value">${result.wrong}</span>
                        <span class="label">Chưa thuộc</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatDuration(result.duration)}</span>
                        <span class="label">Thời gian</span>
                    </div>
                </div>
            </div>
            
            <div class="results-actions">
              ${hasWrongWords ? `
                <button class="btn-secondary" type="button" data-practice-action="flashcard-review-wrong">
                  <i class="fas fa-redo"></i> Ôn lại từ sai (${wrongWords.length})
                </button>
              ` : ''}
              <button class="btn-primary" type="button" data-practice-action="flashcard-restart">
                <i class="fas fa-play"></i> Làm lại
              </button>
              <button class="btn-secondary" type="button" data-practice-action="practice-exit">
                <i class="fas fa-arrow-left"></i> Quay lại luyện tập
              </button>
            </div>
        </div>
    `;
}

/* ===== NAVIGATION ===== */
export function exitFlashcard() {
    stopAutoPlay();
    resetPractice();
    navigate('practice');
}

export function restartFlashcard() {
    const scope = window.practiceScope;
    const settings = window.flashcardSettings;
    startFlashcard(scope, settings);
}

export function reviewWrongFlashcards() {
  const state = getPracticeState();
  const wrongAnswers = state.answers?.filter(a => !a.isCorrect && !a.skipped) || [];

  if (wrongAnswers.length === 0) {
    showToast('Không có từ sai!', 'success');
    return;
  }

  const allWords = getWordsByScope({ type: 'all' });
  const wrongIds = new Set(wrongAnswers.map(a => a.wordId).filter(Boolean));
  const wrongWords = allWords.filter(w => wrongIds.has(w.id));

  if (wrongWords.length > 0) {
    startFlashcard({ type: 'custom', words: wrongWords }, window.flashcardSettings);
  } else {
    showToast('Không tìm thấy từ sai!', 'warning');
  }
}

/* ===== UTILITIES ===== */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}p ${secs}s` : `${secs}s`;
}

export function flashcardGrade(level) {
    stopAutoPlay();

    const isCorrect = (level === 'good' || level === 'easy');

    submitAnswer(level, isCorrect);
    showCurrentCard();
}

export function renderFlashcard() {
  renderFlashcardUI();
  showCurrentCard();
}

/* ===== EXPORTS ===== */
window.startFlashcard = startFlashcard;
window.flipCard = flipCard;
window.markCorrect = markCorrect;
window.markWrong = markWrong;
window.skipFlashcard = skipFlashcard;
window.prevCard = prevCard;
window.toggleAutoPlay = toggleAutoPlay;
window.speakCurrentFlashcard = speakCurrentFlashcard;
window.exitFlashcard = exitFlashcard;
window.restartFlashcard = restartFlashcard;
window.reviewWrongFlashcards = reviewWrongFlashcards;
window.flashcardGrade = flashcardGrade;
window.renderFlashcard = renderFlashcard;









