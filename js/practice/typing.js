/* ===== TYPING MODE ===== */
/* VoLearn v2.1.0 - Chế độ gõ từ */

import { 
    initPractice, 
    getCurrentWord, 
    submitAnswer, 
    checkAnswer,
    finishPractice, 
    getPracticeState,
    getWordsByScope,
    resetPractice
} from './practiceEngine.js';
import { speak } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let typingTimer = null;
let startTime = null;
let charIndex = 0;

/* ===== START TYPING ===== */
export function startTyping(scope, settings = {}) {
    const words = getWordsByScope(scope);
    
    if (!words.length) {
        showToast('Không có từ để luyện tập!', 'warning');
        return;
    }

    const defaultSettings = {
        shuffle: true,
        showMeaning: true,
        showPhonetic: true,
        timeLimit: 0,  // seconds per word, 0 = no limit
        caseSensitive: false,
        highlightErrors: true
    };

    const mergedSettings = { ...defaultSettings, ...settings };
    
    if (!initPractice('typing', words, mergedSettings)) {
        return;
    }

    renderTypingUI();
    showCurrentTyping();
}

/* ===== RENDER UI ===== */
function renderTypingUI() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    container.innerHTML = `
        <div class="typing-container">
            <div class="typing-header">
                <button class="btn-icon btn-back" onclick="window.exitTyping()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="typing-progress">
                    <span id="typing-progress-text">1 / 10</span>
                    <div class="progress-bar">
                        <div id="typing-progress-bar" class="progress-fill"></div>
                    </div>
                </div>
                <div class="typing-stats">
                    <span id="typing-score" class="stat-correct">0</span>
                    <span>/</span>
                    <span id="typing-wrong" class="stat-wrong">0</span>
                </div>
            </div>
            
            <div class="typing-main">
                <div class="typing-word-display">
                    <div class="word-meaning" id="typing-meaning">
                        <!-- Meaning will appear here -->
                    </div>
                    <div class="word-preview" id="word-preview">
                        <!-- Word with highlighting will appear here -->
                    </div>
                </div>
                
                <div class="typing-timer" id="typing-timer" style="display: none;">
                    <i class="fas fa-clock"></i>
                    <span id="timer-value">0:00</span>
                </div>
                
                <div class="typing-input-area">
                    <input type="text" 
                           id="typing-input" 
                           placeholder="Gõ từ vựng ở đây..." 
                           autocomplete="off"
                           autocapitalize="off"
                           spellcheck="false">
                </div>
                
                <div class="typing-feedback" id="typing-feedback"></div>
            </div>
            
            <div class="typing-controls">
                <button class="btn-icon btn-speak" onclick="window.speakTypingWord()">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="btn-secondary" onclick="window.skipTyping()">
                    Bỏ qua <i class="fas fa-forward"></i>
                </button>
            </div>
        </div>
    `;

    // Add input listeners
    const input = document.getElementById('typing-input');
    if (input) {
        input.addEventListener('input', handleTypingInput);
        input.addEventListener('keydown', handleTypingKeydown);
    }
}

/* ===== SHOW CURRENT TYPING ===== */
function showCurrentTyping() {
    const word = getCurrentWord();
    
    if (!word) {
        showTypingResults();
        return;
    }

    charIndex = 0;
    startTime = Date.now();
    
    const state = getPracticeState();
    const settings = state.settings || {};
    
    // Show meaning
    const meaningEl = document.getElementById('typing-meaning');
    if (meaningEl && settings.showMeaning) {
        meaningEl.innerHTML = `
            <span class="meaning-text">${escapeHtml(word.meaning)}</span>
            ${word.phonetic && settings.showPhonetic ? 
                `<span class="phonetic-text">${escapeHtml(word.phonetic)}</span>` : ''}
        `;
    }
    
    // Show word preview with placeholders
    updateWordPreview('');
    
    // Reset input
    const input = document.getElementById('typing-input');
    const feedback = document.getElementById('typing-feedback');
    
    if (input) {
        input.value = '';
        input.disabled = false;
        input.classList.remove('correct', 'wrong');
        input.focus();
    }
    if (feedback) feedback.innerHTML = '';
    
    // Start timer if enabled
    if (settings.timeLimit > 0) {
        startTypingTimer(settings.timeLimit);
    }
    
    updateTypingProgress();
}

/* ===== WORD PREVIEW ===== */
function updateWordPreview(typed) {
    const word = getCurrentWord();
    if (!word) return;
    
    const previewEl = document.getElementById('word-preview');
    if (!previewEl) return;
    
    const state = getPracticeState();
    const settings = state.settings || {};
    const wordText = word.word;
    
    let html = '';
    for (let i = 0; i < wordText.length; i++) {
        const char = wordText[i];
        const typedChar = typed[i];
        
        if (i < typed.length) {
            const isCorrect = settings.caseSensitive 
                ? typedChar === char 
                : typedChar?.toLowerCase() === char.toLowerCase();
            
            if (isCorrect) {
                html += `<span class="char correct">${escapeHtml(char)}</span>`;
            } else {
                html += `<span class="char wrong">${escapeHtml(char)}</span>`;
            }
        } else if (i === typed.length) {
            html += `<span class="char current">${escapeHtml(char)}</span>`;
        } else {
            html += `<span class="char pending">${escapeHtml(char)}</span>`;
        }
    }
    
    previewEl.innerHTML = html;
}

/* ===== INPUT HANDLERS ===== */
function handleTypingInput(e) {
    const word = getCurrentWord();
    if (!word) return;
    
    const typed = e.target.value;
    updateWordPreview(typed);
    
    // Check if complete
    const state = getPracticeState();
    const settings = state.settings || {};
    
    const isMatch = settings.caseSensitive 
        ? typed === word.word 
        : typed.toLowerCase() === word.word.toLowerCase();
    
    if (isMatch) {
        completeTyping(true);
    }
}

function handleTypingKeydown(e) {
    if (e.key === 'Enter') {
        const input = document.getElementById('typing-input');
        const word = getCurrentWord();
        
        if (input && word && input.value.length > 0) {
            const isCorrect = checkAnswer(input.value, word);
            completeTyping(isCorrect);
        }
    }
}

/* ===== COMPLETE TYPING ===== */
function completeTyping(isCorrect) {
    const word = getCurrentWord();
    if (!word) return;
    
    stopTypingTimer();
    
    const input = document.getElementById('typing-input');
    const feedback = document.getElementById('typing-feedback');
    
    // Submit answer
    submitAnswer(input?.value || '', isCorrect);
    
    // Show feedback
    if (input) {
        input.disabled = true;
        input.classList.add(isCorrect ? 'correct' : 'wrong');
    }
    
    if (feedback) {
        if (isCorrect) {
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
            feedback.innerHTML = `
                <div class="feedback-correct">
                    <i class="fas fa-check-circle"></i>
                    <span>Tuyệt vời! (${timeTaken}s)</span>
                </div>
            `;
        } else {
            feedback.innerHTML = `
                <div class="feedback-wrong">
                    <i class="fas fa-times-circle"></i>
                    <span>Đáp án đúng: <strong>${escapeHtml(word.word)}</strong></span>
                </div>
            `;
        }
    }
    
    updateTypingProgress();
    
    // Auto move to next after delay
    setTimeout(() => showCurrentTyping(), isCorrect ? 1000 : 2000);
}

/* ===== TIMER ===== */
function startTypingTimer(seconds) {
    const timerEl = document.getElementById('typing-timer');
    const timerValue = document.getElementById('timer-value');
    
    if (timerEl) timerEl.style.display = 'flex';
    
    let remaining = seconds;
    updateTimerDisplay(remaining);
    
    typingTimer = setInterval(() => {
        remaining--;
        updateTimerDisplay(remaining);
        
        if (remaining <= 0) {
            stopTypingTimer();
            completeTyping(false);
        }
    }, 1000);
}

function stopTypingTimer() {
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }
}

function updateTimerDisplay(seconds) {
    const timerValue = document.getElementById('timer-value');
    if (timerValue) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        // Color warning when low
        timerValue.classList.toggle('warning', seconds <= 5);
    }
}

/* ===== SKIP ===== */
export function skipTyping() {
    stopTypingTimer();
    completeTyping(false);
}

/* ===== SPEAK ===== */
export function speakTypingWord() {
    const word = getCurrentWord();
    if (word) {
        speak(word.word);
    }
}

/* ===== UPDATE PROGRESS ===== */
function updateTypingProgress() {
    const state = getPracticeState();
    
    const progressText = document.getElementById('typing-progress-text');
    const progressBar = document.getElementById('typing-progress-bar');
    const scoreEl = document.getElementById('typing-score');
    const wrongEl = document.getElementById('typing-wrong');
    
    if (progressText) {
        progressText.textContent = `${state.currentIndex + 1} / ${state.total}`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${state.progress}%`;
    }
    
    if (scoreEl) {
        scoreEl.textContent = state.score;
    }
    
    if (wrongEl) {
        wrongEl.textContent = state.wrong;
    }
}

/* ===== SHOW RESULTS ===== */
function showTypingResults() {
    stopTypingTimer();
    const result = finishPractice();
    
    const container = document.getElementById('practice-area');
    if (!container) return;

    const wpm = result.duration > 0 
        ? Math.round((result.total * 5) / (result.duration / 60))  // Estimate WPM
        : 0;

    container.innerHTML = `
        <div class="practice-results typing-results">
            <div class="results-header">
                <i class="fas fa-keyboard"></i>
                <h2>Kết quả luyện gõ</h2>
            </div>
            
            <div class="results-stats">
                <div class="stat-circle ${result.accuracy >= 70 ? 'good' : result.accuracy >= 50 ? 'medium' : 'low'}">
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
                        <span class="label">Đúng</span>
                    </div>
                    <div class="stat-item wrong">
                        <span class="value">${result.wrong}</span>
                        <span class="label">Sai</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatDuration(result.duration)}</span>
                        <span class="label">Thời gian</span>
                    </div>
                </div>
            </div>
            
            <div class="results-actions">
                <button class="btn-primary" onclick="window.restartTyping()">
                    <i class="fas fa-redo"></i> Làm lại
                </button>
                <button class="btn-secondary" onclick="window.exitTyping()">
                    <i class="fas fa-home"></i> Quay lại
                </button>
            </div>
        </div>
    `;
}

/* ===== NAVIGATION ===== */
export function exitTyping() {
    stopTypingTimer();
    resetPractice();
    navigate('practice');
}

export function restartTyping() {
    const scope = window.practiceScope;
    const settings = window.typingSettings;
    startTyping(scope, settings);
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
export { startTyping as run };

window.startTyping = startTyping;
window.skipTyping = skipTyping;
window.speakTypingWord = speakTypingWord;
window.exitTyping = exitTyping;
window.restartTyping = restartTyping;
