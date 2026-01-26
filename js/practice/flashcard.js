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
    resetPractice
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

    autoPlayEnabled = mergedSettings.autoPlay;
    
    renderFlashcardUI();
    showCurrentCard();
}

/* ===== RENDER UI ===== */
function renderFlashcardUI() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    container.innerHTML = `
        <div class="flashcard-container">
            <div class="flashcard-header">
                <button class="btn-icon btn-back" onclick="window.exitFlashcard()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="flashcard-progress">
                    <span id="flashcard-progress-text">1 / 10</span>
                    <div class="progress-bar">
                        <div id="flashcard-progress-bar" class="progress-fill"></div>
                    </div>
                </div>
                <div class="flashcard-actions">
                    <button class="btn-icon" id="btn-autoplay" onclick="window.toggleAutoPlay()" 
                            title="Tự động lật">
                        <i class="fas fa-play-circle"></i>
                    </button>
                </div>
            </div>
            
            <div class="flashcard-main">
                <div class="flashcard" id="flashcard" onclick="window.flipCard()">
                    <div class="flashcard-inner">
                        <div class="flashcard-front" id="flashcard-front">
                            <!-- Word will be rendered here -->
                        </div>
                        <div class="flashcard-back" id="flashcard-back">
                            <!-- Meaning will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flashcard-controls">
                <button class="btn-flashcard btn-wrong" onclick="window.markWrong()">
                    <i class="fas fa-times"></i>
                    <span>Chưa thuộc</span>
                </button>
                <button class="btn-flashcard btn-flip" onclick="window.flipCard()">
                    <i class="fas fa-sync-alt"></i>
                    <span>Lật</span>
                </button>
                <button class="btn-flashcard btn-correct" onclick="window.markCorrect()">
                    <i class="fas fa-check"></i>
                    <span>Đã thuộc</span>
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

    // Render front (word)
    front.innerHTML = `
        <div class="card-word">${escapeHtml(word.word)}</div>
        ${word.phonetic ? `<div class="card-phonetic">${escapeHtml(word.phonetic)}</div>` : ''}
        ${word.partOfSpeech ? `<div class="card-pos">${escapeHtml(word.partOfSpeech)}</div>` : ''}
    `;

    // Render back (meaning)
    back.innerHTML = `
        <div class="card-meaning">${escapeHtml(word.meaning)}</div>
        ${word.example ? `
            <div class="card-example">
                <i class="fas fa-quote-left"></i>
                "${escapeHtml(word.example)}"
            </div>
        ` : ''}
        ${word.synonyms?.length ? `
            <div class="card-synonyms">
                <strong>Đồng nghĩa:</strong> ${word.synonyms.join(', ')}
            </div>
        ` : ''}
    `;

    updateProgress();
    
    // Speak if enabled
    const state = getPracticeState();
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
    
    const progressText = document.getElementById('flashcard-progress-text');
    const progressBar = document.getElementById('flashcard-progress-bar');
    
    if (progressText) {
        progressText.textContent = `${state.currentIndex + 1} / ${state.total}`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${state.progress}%`;
    }
}

/* ===== SHOW RESULTS ===== */
function showResults() {
    stopAutoPlay();
    
    const result = finishPractice();
    
    const container = document.getElementById('practice-area');
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
                <button class="btn-secondary" onclick="window.reviewWrongFlashcards()">
                    <i class="fas fa-redo"></i> Ôn lại từ sai
                </button>
                <button class="btn-primary" onclick="window.restartFlashcard()">
                    <i class="fas fa-play"></i> Làm lại
                </button>
                <button class="btn-secondary" onclick="window.exitFlashcard()">
                    <i class="fas fa-home"></i> Trang chủ
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
    const wrongAnswers = getPracticeState().answers?.filter(a => !a.isCorrect) || [];
    
    if (wrongAnswers.length === 0) {
        showToast('Không có từ sai!', 'success');
        return;
    }

    const wrongWords = wrongAnswers.map(a => {
        // Find the word object
        return getCurrentWord(); // This needs proper implementation
    }).filter(Boolean);

    if (wrongWords.length > 0) {
        startFlashcard({ type: 'custom', words: wrongWords }, window.flashcardSettings);
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
