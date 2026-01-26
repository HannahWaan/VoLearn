/* ===== SRS ENGINE ===== */
/* VoLearn v2.1.0 - Spaced Repetition System */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';

/* ===== SRS CONSTANTS ===== */
const SRS_INTERVALS = [1, 3, 7, 14, 30, 90, 180, 365];

const EASE_FACTORS = {
    again: 0,
    hard: -1,
    good: 1,
    easy: 2
};

/* ===== STATE ===== */
let srsState = {
    queue: [],
    currentIndex: 0,
    reviewed: 0,
    correct: 0,
    wrong: 0,
    isFlipped: false
};

/* ===== GET DUE WORDS ===== */
export function getDueWords() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    
    const dueWords = [];
    
    appData.vocabulary?.forEach(word => {
        if (!word.nextReview || word.nextReview <= todayStr) {
            dueWords.push({ ...word, source: 'vocabulary' });
        }
    });
    
    appData.sets?.forEach(set => {
        set.words?.forEach(word => {
            if (!word.nextReview || word.nextReview <= todayStr) {
                dueWords.push({ ...word, source: 'set', setId: set.id });
            }
        });
    });
    
    return dueWords;
}

/* ===== GET SRS STATS ===== */
export function getSRSStats() {
    const dueWords = getDueWords();
    return {
        due: dueWords.length,
        total: getTotalWords()
    };
}

function getTotalWords() {
    let count = appData.vocabulary?.length || 0;
    appData.sets?.forEach(set => {
        count += set.words?.length || 0;
    });
    return count;
}

/* ===== UPDATE SRS COUNT ===== */
export function updateSRSCount() {
    const stats = getSRSStats();
    const countEl = document.getElementById('srs-due-count');
    if (countEl) {
        countEl.textContent = stats.due;
    }
}

/* ===== START SRS REVIEW ===== */
export function startSRSReview() {
    const dueWords = getDueWords();
    
    if (dueWords.length === 0) {
        if (window.showToast) {
            window.showToast('Không có từ nào cần ôn tập hôm nay! 🎉', 'success');
        }
        return;
    }
    
    srsState = {
        queue: dueWords,
        currentIndex: 0,
        reviewed: 0,
        correct: 0,
        wrong: 0,
        isFlipped: false
    };
    
    renderSRSCard();
}

/* ===== RENDER SRS CARD ===== */
export function renderSRSCard() {
    const container = document.getElementById('practice-area');
    if (!container) return;
    
    if (srsState.currentIndex >= srsState.queue.length) {
        showSRSResults();
        return;
    }
    
    const word = srsState.queue[srsState.currentIndex];
    srsState.isFlipped = false;
    
    container.innerHTML = `
        <div class="srs-container">
            <div class="srs-header">
                <button class="btn-icon btn-back" onclick="window.navigate('practice')">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="srs-progress">
                    <span>${srsState.currentIndex} / ${srsState.queue.length}</span>
                </div>
            </div>
            
            <div class="srs-main">
                <div class="srs-card" id="srs-card" onclick="window.flipCard()">
                    <div class="srs-card-front" id="srs-front">
                        <div class="card-word">${escapeHtml(word.word)}</div>
                        ${word.phonetic ? `<div class="card-phonetic">${escapeHtml(word.phonetic)}</div>` : ''}
                    </div>
                    <div class="srs-card-back" id="srs-back" style="display: none;">
                        <div class="card-meaning">${escapeHtml(word.meaning)}</div>
                    </div>
                </div>
                <p class="srs-tip">Nhấn vào thẻ để lật</p>
            </div>
            
            <div class="srs-controls" id="srs-controls" style="display: none;">
                <button class="srs-btn btn-again" onclick="window.answerSRS('again')">
                    <span>Quên</span>
                </button>
                <button class="srs-btn btn-hard" onclick="window.answerSRS('hard')">
                    <span>Khó</span>
                </button>
                <button class="srs-btn btn-good" onclick="window.answerSRS('good')">
                    <span>Tốt</span>
                </button>
                <button class="srs-btn btn-easy" onclick="window.answerSRS('easy')">
                    <span>Dễ</span>
                </button>
            </div>
        </div>
    `;
}

/* ===== FLIP CARD ===== */
export function flipCard() {
    if (srsState.isFlipped) return;
    
    srsState.isFlipped = true;
    
    const front = document.getElementById('srs-front');
    const back = document.getElementById('srs-back');
    const controls = document.getElementById('srs-controls');
    
    if (front) front.style.display = 'none';
    if (back) back.style.display = 'block';
    if (controls) controls.style.display = 'flex';
}

/* ===== ANSWER SRS ===== */
export function answerSRS(quality) {
    const word = srsState.queue[srsState.currentIndex];
    if (!word) return;
    
    const currentLevel = word.srsLevel || 0;
    let newLevel = currentLevel + EASE_FACTORS[quality];
    newLevel = Math.max(0, Math.min(SRS_INTERVALS.length - 1, newLevel));
    
    const interval = SRS_INTERVALS[newLevel];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    const nextReviewStr = nextReview.toISOString().split('T')[0];
    
    // Update word
    if (word.source === 'vocabulary') {
        const vocabWord = appData.vocabulary?.find(w => w.id === word.id);
        if (vocabWord) {
            vocabWord.srsLevel = newLevel;
            vocabWord.nextReview = nextReviewStr;
            vocabWord.lastReviewed = new Date().toISOString();
        }
    } else if (word.source === 'set' && word.setId) {
        const set = appData.sets?.find(s => s.id === word.setId);
        const setWord = set?.words?.find(w => w.id === word.id);
        if (setWord) {
            setWord.srsLevel = newLevel;
            setWord.nextReview = nextReviewStr;
            setWord.lastReviewed = new Date().toISOString();
        }
    }
    
    saveData(appData);
    
    // Update stats
    srsState.reviewed++;
    if (quality === 'again') {
        srsState.wrong++;
    } else {
        srsState.correct++;
    }
    
    // Next card
    srsState.currentIndex++;
    renderSRSCard();
}

/* ===== SHOW RESULTS ===== */
function showSRSResults() {
    const container = document.getElementById('practice-area');
    if (!container) return;
    
    const accuracy = srsState.reviewed > 0 
        ? Math.round((srsState.correct / srsState.reviewed) * 100)
        : 0;

    container.innerHTML = `
        <div class="practice-results">
            <div class="results-header">
                <span class="result-emoji">🧠</span>
                <h2>Hoàn thành ôn tập!</h2>
            </div>
            <div class="results-stats">
                <div class="stat-row">
                    <span>Đã ôn:</span>
                    <span>${srsState.reviewed}</span>
                </div>
                <div class="stat-row">
                    <span>Nhớ:</span>
                    <span>${srsState.correct}</span>
                </div>
                <div class="stat-row">
                    <span>Quên:</span>
                    <span>${srsState.wrong}</span>
                </div>
                <div class="stat-row">
                    <span>Tỷ lệ:</span>
                    <span>${accuracy}%</span>
                </div>
            </div>
            <div class="results-actions">
                <button class="btn-primary" onclick="window.navigate('practice')">
                    <i class="fas fa-home"></i> Quay lại
                </button>
            </div>
        </div>
    `;
}

/* ===== UTILITIES ===== */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ===== EXPORTS ===== */
window.startSRSReview = startSRSReview;
window.flipCard = flipCard;
window.answerSRS = answerSRS;
window.updateSRSCount = updateSRSCount;
