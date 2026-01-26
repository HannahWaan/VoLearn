/* ===== DICTATION MODE ===== */
/* VoLearn v2.1.0 - Chế độ nghe chép */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let dictationState = {
    words: [],
    currentIndex: 0,
    score: 0,
    wrong: 0,
    answers: [],
    settings: {}
};

/* ===== START DICTATION ===== */
export function startDictation(words, settings = {}) {
    if (!words || words.length === 0) {
        window.showToast?.('Không có từ để luyện tập!', 'warning');
        return;
    }

    dictationState = {
        words: settings.shuffle ? shuffleArray([...words]) : [...words],
        currentIndex: 0,
        score: 0,
        wrong: 0,
        answers: [],
        settings: {
            autoSpeak: true,
            speakSpeed: 0.8,
            showHints: true,
            ...settings
        }
    };

    renderDictationUI();
    showCurrentWord();
}

/* ===== RENDER UI ===== */
function renderDictationUI() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    container.innerHTML = `
        <div class="dictation-container">
            <div class="dictation-header">
                <button class="btn-icon" onclick="window.exitDictation()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="progress-info">
                    <span id="dictation-progress">0 / ${dictationState.words.length}</span>
                </div>
                <div class="score-info">
                    <span id="dictation-score">0</span> điểm
                </div>
            </div>
            
            <div class="dictation-main">
                <div class="speaker-area">
                    <button class="btn-speak-large" id="btn-speak" onclick="window.speakDictationWord()">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <p>Nhấn để nghe từ</p>
                </div>
                
                <div class="hint-area" id="hint-area"></div>
                
                <div class="input-area">
                    <input type="text" 
                           id="dictation-input" 
                           placeholder="Nhập từ bạn nghe được..."
                           autocomplete="off"
                           autocapitalize="off">
                </div>
                
                <div class="feedback-area" id="feedback-area"></div>
            </div>
            
            <div class="dictation-footer">
                <button class="btn-secondary" onclick="window.skipDictationWord()">Bỏ qua</button>
                <button class="btn-primary" id="btn-check" onclick="window.checkDictationAnswer()">Kiểm tra</button>
                <button class="btn-primary" id="btn-next" onclick="window.nextDictationWord()" style="display:none;">Tiếp theo</button>
            </div>
        </div>
    `;

    // Bind enter key
    document.getElementById('dictation-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const btnNext = document.getElementById('btn-next');
            if (btnNext?.style.display !== 'none') {
                nextDictationWord();
            } else {
                checkDictationAnswer();
            }
        }
    });
}

/* ===== SHOW CURRENT WORD ===== */
function showCurrentWord() {
    if (dictationState.currentIndex >= dictationState.words.length) {
        showDictationResults();
        return;
    }

    const input = document.getElementById('dictation-input');
    const feedback = document.getElementById('feedback-area');
    const hint = document.getElementById('hint-area');
    const btnCheck = document.getElementById('btn-check');
    const btnNext = document.getElementById('btn-next');

    if (input) {
        input.value = '';
        input.disabled = false;
        input.focus();
    }
    if (feedback) feedback.innerHTML = '';
    if (hint) hint.innerHTML = '';
    if (btnCheck) btnCheck.style.display = 'block';
    if (btnNext) btnNext.style.display = 'none';

    updateProgress();

    // Auto speak
    if (dictationState.settings.autoSpeak) {
        setTimeout(() => speakDictationWord(), 300);
    }
}

/* ===== SPEAK WORD ===== */
export function speakDictationWord() {
    const word = dictationState.words[dictationState.currentIndex];
    if (!word) return;

    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.rate = dictationState.settings.speakSpeed || 0.8;
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);

    // Visual feedback
    const btn = document.getElementById('btn-speak');
    if (btn) {
        btn.classList.add('speaking');
        setTimeout(() => btn.classList.remove('speaking'), 500);
    }
}

/* ===== CHECK ANSWER ===== */
export function checkDictationAnswer() {
    const input = document.getElementById('dictation-input');
    const userAnswer = input?.value?.trim().toLowerCase() || '';
    const word = dictationState.words[dictationState.currentIndex];
    
    if (!userAnswer) {
        window.showToast?.('Vui lòng nhập câu trả lời!', 'warning');
        return;
    }

    const correctAnswer = word.word.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    // Save answer
    dictationState.answers.push({
        word: word.word,
        userAnswer,
        isCorrect
    });

    if (isCorrect) {
        dictationState.score++;
    } else {
        dictationState.wrong++;
    }

    // Show feedback
    showFeedback(isCorrect, word.word);

    // Update UI
    if (input) input.disabled = true;
    document.getElementById('btn-check').style.display = 'none';
    document.getElementById('btn-next').style.display = 'block';

    updateProgress();
}

/* ===== SHOW FEEDBACK ===== */
function showFeedback(isCorrect, correctWord) {
    const feedback = document.getElementById('feedback-area');
    if (!feedback) return;

    if (isCorrect) {
        feedback.innerHTML = `
            <div class="feedback correct">
                <i class="fas fa-check-circle"></i>
                <span>Chính xác!</span>
            </div>
        `;
    } else {
        feedback.innerHTML = `
            <div class="feedback wrong">
                <i class="fas fa-times-circle"></i>
                <span>Sai rồi!</span>
            </div>
            <div class="correct-answer">
                Đáp án: <strong>${correctWord}</strong>
            </div>
        `;
    }
}

/* ===== NEXT WORD ===== */
export function nextDictationWord() {
    dictationState.currentIndex++;
    showCurrentWord();
}

/* ===== SKIP WORD ===== */
export function skipDictationWord() {
    const word = dictationState.words[dictationState.currentIndex];
    
    dictationState.answers.push({
        word: word.word,
        userAnswer: null,
        isCorrect: false,
        skipped: true
    });
    
    dictationState.wrong++;
    
    showFeedback(false, word.word);
    
    document.getElementById('dictation-input').disabled = true;
    document.getElementById('btn-check').style.display = 'none';
    document.getElementById('btn-next').style.display = 'block';
    
    updateProgress();
}

/* ===== UPDATE PROGRESS ===== */
function updateProgress() {
    const progressEl = document.getElementById('dictation-progress');
    const scoreEl = document.getElementById('dictation-score');
    
    if (progressEl) {
        progressEl.textContent = `${dictationState.currentIndex + 1} / ${dictationState.words.length}`;
    }
    if (scoreEl) {
        scoreEl.textContent = dictationState.score;
    }
}

/* ===== SHOW RESULTS ===== */
function showDictationResults() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    const total = dictationState.words.length;
    const accuracy = total > 0 ? Math.round((dictationState.score / total) * 100) : 0;

    container.innerHTML = `
        <div class="practice-results">
            <div class="results-header">
                <span class="emoji">🎧</span>
                <h2>Kết quả Nghe chép</h2>
            </div>
            
            <div class="results-stats">
                <div class="stat-circle">
                    <span class="value">${accuracy}%</span>
                </div>
                <div class="stats-detail">
                    <div class="stat-row">
                        <span>Đúng:</span>
                        <span class="correct">${dictationState.score}</span>
                    </div>
                    <div class="stat-row">
                        <span>Sai:</span>
                        <span class="wrong">${dictationState.wrong}</span>
                    </div>
                    <div class="stat-row">
                        <span>Tổng:</span>
                        <span>${total}</span>
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

/* ===== EXIT ===== */
export function exitDictation() {
    dictationState = {
        words: [],
        currentIndex: 0,
        score: 0,
        wrong: 0,
        answers: [],
        settings: {}
    };
    navigate('practice');
}

/* ===== RESTART ===== */
export function restartDictation() {
    const words = [...dictationState.words];
    const settings = { ...dictationState.settings };
    startDictation(words, settings);
}

/* ===== UTILITIES ===== */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/* ===== EXPORTS ===== */
window.startDictation = startDictation;
window.speakDictationWord = speakDictationWord;
window.checkDictationAnswer = checkDictationAnswer;
window.nextDictationWord = nextDictationWord;
window.skipDictationWord = skipDictationWord;
window.exitDictation = exitDictation;
window.restartDictation = restartDictation;
