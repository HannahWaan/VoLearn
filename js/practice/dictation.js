/* ===== DICTATION MODE ===== */
/* VoLearn - Chế độ nghe chép */

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
import { speak, stopSpeaking } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { navigate } from '../core/router.js';
import { appData } from '../core/state.js';

/* ===== STATE ===== */
let playCount = 0;
let maxPlays = 3;
let hintLevel = 0;

/* ===== START DICTATION ===== */
export function startDictation(scope, settings = {}) {
    const words = getWordsByScope(scope);
    
    if (!words.length) {
        showToast('Không có từ để luyện tập!', 'warning');
        return;
    }

    const defaultSettings = {
        shuffle: true,
        maxPlays: 3,
        speed: appData.settings?.speed || 1,
        showHint: true,
        allowSkip: true,
        caseSensitive: false
    };

    const mergedSettings = { ...defaultSettings, ...settings };
    maxPlays = mergedSettings.maxPlays;
    
    if (!initPractice('dictation', words, mergedSettings)) {
        return;
    }

    renderDictationUI();
    showCurrentDictation();
}

/* ===== RENDER UI ===== */
function renderDictationUI() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    container.innerHTML = `
        <div class="dictation-container">
            <div class="dictation-header">
                <button class="btn-icon btn-back" onclick="window.exitDictation()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="dictation-progress">
                    <span id="dictation-progress-text">1 / 10</span>
                    <div class="progress-bar">
                        <div id="dictation-progress-bar" class="progress-fill"></div>
                    </div>
                </div>
                <div class="dictation-score">
                    <i class="fas fa-check-circle text-success"></i>
                    <span id="dictation-score">0</span>
                </div>
            </div>
            
            <div class="dictation-main">
                <div class="dictation-prompt">
                    <p>Nghe và gõ lại từ vựng</p>
                </div>
                
                <div class="dictation-player">
                    <button class="btn-play" id="btn-play-audio" onclick="window.playDictationAudio()">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <span class="play-count" id="play-count">Còn ${maxPlays} lượt nghe</span>
                </div>
                
                <div class="dictation-hint" id="dictation-hint" style="display: none;">
                    <!-- Hint will appear here -->
                </div>
                
                <div class="dictation-input">
                    <input type="text" 
                           id="dictation-answer" 
                           placeholder="Nhập từ bạn nghe được..." 
                           autocomplete="off"
                           autocapitalize="off"
                           spellcheck="false">
                </div>
                
                <div class="dictation-feedback" id="dictation-feedback"></div>
            </div>
            
            <div class="dictation-controls">
                <button class="btn-secondary" id="btn-hint" onclick="window.showDictationHint()">
                    <i class="fas fa-lightbulb"></i> Gợi ý
                </button>
                <button class="btn-primary" id="btn-check" onclick="window.checkDictationAnswer()">
                    <i class="fas fa-check"></i> Kiểm tra
                </button>
                <button class="btn-secondary" id="btn-skip" onclick="window.skipDictation()">
                    Bỏ qua <i class="fas fa-forward"></i>
                </button>
            </div>
        </div>
    `;

    // Add enter key listener
    const input = document.getElementById('dictation-answer');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkDictationAnswer();
            }
        });
    }
}

/* ===== SHOW CURRENT DICTATION ===== */
function showCurrentDictation() {
    const word = getCurrentWord();
    
    if (!word) {
        showDictationResults();
        return;
    }

    // Reset state for new word
    playCount = 0;
    hintLevel = 0;
    
    // Reset UI
    const input = document.getElementById('dictation-answer');
    const feedback = document.getElementById('dictation-feedback');
    const hint = document.getElementById('dictation-hint');
    const checkBtn = document.getElementById('btn-check');
    const skipBtn = document.getElementById('btn-skip');
    
    if (input) {
        input.value = '';
        input.disabled = false;
        input.focus();
    }
    if (feedback) feedback.innerHTML = '';
    if (hint) hint.style.display = 'none';
    if (checkBtn) checkBtn.style.display = 'inline-flex';
    if (skipBtn) skipBtn.textContent = 'Bỏ qua';
    
    updatePlayCount();
    updateDictationProgress();
    
    // Auto play first time
    setTimeout(() => playDictationAudio(), 500);
}

/* ===== PLAY AUDIO ===== */
export function playDictationAudio() {
    const word = getCurrentWord();
    if (!word) return;
    
    if (playCount >= maxPlays) {
        showToast('Đã hết lượt nghe!', 'warning');
        return;
    }
    
    playCount++;
    updatePlayCount();
    
    const state = getPracticeState();
    const speed = state.settings?.speed || 1;
    
    speak(word.word, { rate: speed });
}

function updatePlayCount() {
    const remaining = maxPlays - playCount;
    const playCountEl = document.getElementById('play-count');
    const playBtn = document.getElementById('btn-play-audio');
    
    if (playCountEl) {
        playCountEl.textContent = remaining > 0 
            ? `Còn ${remaining} lượt nghe` 
            : 'Hết lượt nghe';
    }
    
    if (playBtn) {
        playBtn.disabled = remaining <= 0;
        playBtn.classList.toggle('disabled', remaining <= 0);
    }
}

/* ===== SHOW HINT ===== */
export function showDictationHint() {
    const word = getCurrentWord();
    if (!word) return;
    
    hintLevel++;
    
    const hintEl = document.getElementById('dictation-hint');
    if (!hintEl) return;
    
    let hintText = '';
    const wordText = word.word;
    
    switch (hintLevel) {
        case 1:
            // Show first letter and length
            hintText = `${wordText[0]}${'_'.repeat(wordText.length - 1)} (${wordText.length} chữ cái)`;
            break;
        case 2:
            // Show first and last letter
            hintText = `${wordText[0]}${'_'.repeat(wordText.length - 2)}${wordText[wordText.length - 1]}`;
            break;
        case 3:
            // Show meaning
            hintText = `Nghĩa: ${word.meaning}`;
            break;
        default:
            // Show half the word
            const half = Math.ceil(wordText.length / 2);
            hintText = wordText.substring(0, half) + '_'.repeat(wordText.length - half);
    }
    
    hintEl.innerHTML = `<i class="fas fa-lightbulb"></i> ${escapeHtml(hintText)}`;
    hintEl.style.display = 'block';
    
    showToast('Đã hiển thị gợi ý', 'info');
}

/* ===== CHECK ANSWER ===== */
export function checkDictationAnswer() {
    const word = getCurrentWord();
    if (!word) return;
    
    const input = document.getElementById('dictation-answer');
    const feedback = document.getElementById('dictation-feedback');
    const checkBtn = document.getElementById('btn-check');
    const skipBtn = document.getElementById('btn-skip');
    
    if (!input || !feedback) return;
    
    const userAnswer = input.value.trim();
    
    if (!userAnswer) {
        showToast('Vui lòng nhập câu trả lời!', 'warning');
        input.focus();
        return;
    }
    
    const state = getPracticeState();
    const isCorrect = checkAnswer(userAnswer, word);
    
    // Submit answer
    submitAnswer(userAnswer, isCorrect);
    
    // Show feedback
    input.disabled = true;
    
    if (isCorrect) {
        feedback.innerHTML = `
            <div class="feedback-correct">
                <i class="fas fa-check-circle"></i>
                <span>Chính xác!</span>
            </div>
        `;
        input.classList.add('correct');
    } else {
        feedback.innerHTML = `
            <div class="feedback-wrong">
                <i class="fas fa-times-circle"></i>
                <span>Sai rồi! Đáp án đúng: <strong>${escapeHtml(word.word)}</strong></span>
            </div>
        `;
        input.classList.add('wrong');
    }
    
    // Update buttons
    if (checkBtn) checkBtn.style.display = 'none';
    if (skipBtn) {
        skipBtn.innerHTML = 'Tiếp theo <i class="fas fa-arrow-right"></i>';
        skipBtn.onclick = () => {
            input.classList.remove('correct', 'wrong');
            showCurrentDictation();
        };
    }
    
    updateDictationProgress();
}

/* ===== SKIP ===== */
export function skipDictation() {
    const word = getCurrentWord();
    if (!word) return;
    
    const input = document.getElementById('dictation-answer');
    const feedback = document.getElementById('dictation-feedback');
    
    // Check if already answered
    if (input && input.disabled) {
        // Move to next word
        showCurrentDictation();
        return;
    }
    
    // Skip this word
    submitAnswer(null, false);
    
    if (feedback) {
        feedback.innerHTML = `
            <div class="feedback-skipped">
                <i class="fas fa-forward"></i>
                <span>Đã bỏ qua. Đáp án: <strong>${escapeHtml(word.word)}</strong></span>
            </div>
        `;
    }
    
    // Move to next after short delay
    setTimeout(() => showCurrentDictation(), 1500);
}

/* ===== UPDATE PROGRESS ===== */
function updateDictationProgress() {
    const state = getPracticeState();
    
    const progressText = document.getElementById('dictation-progress-text');
    const progressBar = document.getElementById('dictation-progress-bar');
    const scoreEl = document.getElementById('dictation-score');
    
    if (progressText) {
        progressText.textContent = `${state.currentIndex + 1} / ${state.total}`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${state.progress}%`;
    }
    
    if (scoreEl) {
        scoreEl.textContent = state.score;
    }
}

/* ===== SHOW RESULTS ===== */
function showDictationResults() {
    stopSpeaking();
    const result = finishPractice();
    
    const container = document.getElementById('practice-area');
    if (!container) return;

    container.innerHTML = `
        <div class="practice-results dictation-results">
            <div class="results-header">
                <i class="fas fa-headphones"></i>
                <h2>Kết quả nghe chép</h2>
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
                <button class="btn-primary" onclick="window.restartDictation()">
                    <i class="fas fa-redo"></i> Làm lại
                </button>
                <button class="btn-secondary" onclick="window.exitDictation()">
                    <i class="fas fa-home"></i> Quay lại
                </button>
            </div>
        </div>
    `;
}

/* ===== NAVIGATION ===== */
export function exitDictation() {
    stopSpeaking();
    resetPractice();
    navigate('practice');
}

export function restartDictation() {
    const scope = window.practiceScope;
    const settings = window.dictationSettings;
    startDictation(scope, settings);
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
export { startDictation as run };

window.startDictation = startDictation;
window.playDictationAudio = playDictationAudio;
window.showDictationHint = showDictationHint;
window.checkDictationAnswer = checkDictationAnswer;
window.skipDictation = skipDictation;
window.exitDictation = exitDictation;
window.restartDictation = restartDictation;
