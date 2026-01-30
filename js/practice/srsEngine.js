/* ===== SRS ENGINE ===== */
/* VoLearn v2.1.0 - Spaced Repetition System */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';
import { speak } from '../utils/speech.js';
import { escapeHtml } from '../utils/helpers.js';
import { showPracticeArea, updateSRSCount } from './practiceEngine.js';

/* ===== CONSTANTS ===== */
const SRS_INTERVALS = [1, 3, 7, 14, 30, 60, 120]; // days

/* ===== STATE ===== */
let srsState = {
    words: [],
    currentIndex: 0,
    isFlipped: false,
    wordsReviewed: 0
};

/* ===== START SRS REVIEW ===== */
export function startSRSReview() {
    const now = new Date();
    const dueWords = (appData.vocabulary || []).filter(w => {
        if (!w.nextReview) return true;
        return new Date(w.nextReview) <= now;
    });
    
    if (dueWords.length === 0) {
        showToast('Không có từ nào cần ôn tập!', 'error');
        return;
    }
    
    // Shuffle
    srsState.words = dueWords.sort(() => Math.random() - 0.5);
    srsState.currentIndex = 0;
    srsState.isFlipped = false;
    srsState.wordsReviewed = 0;
    
    showPracticeArea();
    renderSRSCard();
    updateProgress();
    
    showToast(`Bắt đầu ôn tập ${dueWords.length} từ`);
}

/* ===== RENDER SRS CARD ===== */
export function renderSRSCard() {
    const word = srsState.words[srsState.currentIndex];
    if (!word) {
        endSRSReview();
        return;
    }
    
    const meaning = word.meanings?.[0] || {};
    const phonetic = meaning.phoneticUS || meaning.phoneticUK || word.phonetic || '';
    const defVi = meaning.defVi || '';
    const defEn = meaning.defEn || '';
    const example = meaning.example || '';
    const pos = meaning.pos || '';
    
    const container = document.getElementById('practice-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="srs-container">
            <div class="flashcard ${srsState.isFlipped ? 'flipped' : ''}" onclick="window.srsFlipCard()">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <button class="btn-speak-card" onclick="event.stopPropagation(); window.speak('${escapeHtml(word.word)}')" title="Nghe phát âm">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <div class="flashcard-word">${escapeHtml(word.word)}</div>
                        ${phonetic ? `<div class="flashcard-phonetic">${escapeHtml(phonetic)}</div>` : ''}
                        <p class="flip-hint">Nhấn để xem nghĩa</p>
                    </div>
                    <div class="flashcard-back">
                        <button class="btn-speak-card" onclick="event.stopPropagation(); window.speak('${escapeHtml(defEn || word.word)}')" title="Nghe định nghĩa">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        ${pos ? `<div class="flashcard-pos">${escapeHtml(pos)}</div>` : ''}
                        <div class="flashcard-meaning">${escapeHtml(defVi || defEn)}</div>
                        ${example ? `<div class="flashcard-example">"${escapeHtml(example)}"</div>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="srs-buttons">
                <button class="btn-srs btn-again" onclick="window.answerSRS(0)">
                    <i class="fas fa-times"></i>
                    <span>Quên</span>
                    <small>1 ngày</small>
                </button>
                <button class="btn-srs btn-hard" onclick="window.answerSRS(1)">
                    <i class="fas fa-frown"></i>
                    <span>Khó</span>
                    <small>3 ngày</small>
                </button>
                <button class="btn-srs btn-good" onclick="window.answerSRS(2)">
                    <i class="fas fa-smile"></i>
                    <span>Nhớ</span>
                    <small>7 ngày</small>
                </button>
                <button class="btn-srs btn-easy" onclick="window.answerSRS(3)">
                    <i class="fas fa-grin-stars"></i>
                    <span>Dễ</span>
                    <small>14 ngày</small>
                </button>
            </div>
        </div>
    `;
}

/* ===== FLIP CARD ===== */
export function flipCard() {
    srsState.isFlipped = !srsState.isFlipped;
    const card = document.querySelector('.flashcard');
    if (card) {
        card.classList.toggle('flipped', srsState.isFlipped);
    }
}

/* ===== ANSWER SRS ===== */
export function answerSRS(quality) {
    const word = srsState.words[srsState.currentIndex];
    if (!word) return;
    
    // Update SRS level based on quality
    // 0 = Forgot, 1 = Hard, 2 = Good, 3 = Easy
    if (quality === 0) {
        word.srsLevel = 0;
    } else if (quality === 1) {
        word.srsLevel = Math.max(0, (word.srsLevel || 0) - 1);
    } else if (quality === 2) {
        word.srsLevel = Math.min(6, (word.srsLevel || 0) + 1);
    } else {
        word.srsLevel = Math.min(6, (word.srsLevel || 0) + 2);
    }
    
    // Calculate next review date
    const interval = SRS_INTERVALS[word.srsLevel] || 1;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    word.nextReview = nextDate.toISOString();
    
    // Mark as mastered if level >= 6
    word.mastered = word.srsLevel >= 6;
    
    // Update review count
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewed = new Date().toISOString();
    
    // Update history
    updateReviewHistory(word.id);
    
    // Save
    saveData(appData);
    
    // Move to next
    srsState.wordsReviewed++;
    srsState.currentIndex++;
    srsState.isFlipped = false;
    
    if (srsState.currentIndex >= srsState.words.length) {
        endSRSReview();
    } else {
        renderSRSCard();
        updateProgress();
    }
}

/* ===== UPDATE PROGRESS ===== */
function updateProgress() {
    const progress = ((srsState.currentIndex + 1) / srsState.words.length) * 100;
    
    const progressBar = document.getElementById('practice-progress-bar');
    const progressText = document.getElementById('practice-progress-text');
    
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${srsState.currentIndex + 1}/${srsState.words.length}`;
}

/* ===== UPDATE HISTORY ===== */
function updateReviewHistory(wordId) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!appData.history) appData.history = [];
    
    let entry = appData.history.find(h => h.date === today && h.type === 'review');
    
    if (!entry) {
        entry = { 
            date: today, 
            type: 'review',
            reviewed: 0, 
            reviewedWords: [] 
        };
        appData.history.push(entry);
    }
    
    if (!entry.reviewedWords) entry.reviewedWords = [];
    
    if (!entry.reviewedWords.includes(wordId)) {
        entry.reviewedWords.push(wordId);
    }
    
    entry.reviewed = entry.reviewedWords.length;
}

/* ===== END SRS REVIEW ===== */
function endSRSReview() {
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="practice-results">
      <div class="results-header">
        <i class="fas fa-check-circle"></i>
        <h2>Hoàn thành SRS!</h2>
      </div>

      <div class="results-stats">
        <div class="stat-circle">
          <svg viewBox="0 0 36 36">
            <path class="stat-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="stat-fill" stroke-dasharray="100, 100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
          <span class="stat-value">100%</span>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="value">${srsState.wordsReviewed}</span>
            <span class="label">Đã ôn</span>
          </div>
          <div class="stat-item">
            <span class="value">${srsState.words.length}</span>
            <span class="label">Tổng</span>
          </div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn-primary" type="button" data-practice-action="srs-done">
          <i class="fas fa-check"></i> Xong
        </button>
        <button class="btn-secondary" type="button" data-practice-action="practice-exit">
          <i class="fas fa-arrow-left"></i> Quay lại luyện tập
        </button>
      </div>
    </div>
  `;

  // Update streak
  updateStreak();

  // Update counts
  updateSRSCount();

  // Save
  saveData(appData);
}

/* ===== UPDATE STREAK ===== */
function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (appData.lastStudyDate === today) {
        return; // Already studied today
    }
    
    if (appData.lastStudyDate === yesterday) {
        appData.streak = (appData.streak || 0) + 1;
    } else {
        appData.streak = 1;
    }
    
    appData.lastStudyDate = today;
}

/* ===== GLOBALS ===== */
window.startSRSReview = startSRSReview;
window.answerSRS = answerSRS;
window.srsFlipCard = flipCard;

export { srsState };
