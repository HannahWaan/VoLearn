/* ===== QUIZ MODE ===== */
/* VoLearn v2.1.0 - Chế độ trắc nghiệm */

import { 
    initPractice, 
    getCurrentWord, 
    submitAnswer, 
    finishPractice, 
    getPracticeState,
    getWordsByScope,
    resetPractice
} from './practiceEngine.js';
import { speak } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { navigate } from '../core/router.js';
import { appData } from '../core/state.js';

/* ===== STATE ===== */
let options = [];
let selectedOption = null;
let answered = false;

/* ===== START QUIZ ===== */
export function startQuiz(scope, settings = {}) {
    const words = getWordsByScope(scope);
    
    if (!words.length) {
        showToast('Không có từ để luyện tập!', 'warning');
        return;
    }

    if (words.length < 4) {
        showToast('Cần ít nhất 4 từ để chơi Quiz!', 'warning');
        return;
    }

    const defaultSettings = {
        shuffle: true,
        optionCount: 4,
        timeLimit: 0,       // 0 = no limit
        showHint: false,
        questionType: 'word-to-meaning',  // 'word-to-meaning' | 'meaning-to-word'
        speakQuestion: false
    };

    const mergedSettings = { ...defaultSettings, ...settings };
    
    if (!initPractice('quiz', words, mergedSettings)) {
        return;
    }

    renderQuizUI();
    showCurrentQuestion();
}

/* ===== RENDER UI ===== */
function renderQuizUI() {
    const container = document.getElementById('practice-content');
    if (!container) return;

    container.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-header">
                <button class="btn-icon btn-back" onclick="window.handlePracticeBack()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="quiz-progress">
                    <span id="quiz-progress-text">1 / 10</span>
                    <div class="progress-bar">
                        <div id="quiz-progress-bar" class="progress-fill"></div>
                    </div>
                </div>
                <div class="quiz-score">
                    <span id="quiz-score">0</span>
                    <i class="fas fa-star text-warning"></i>
                </div>
            </div>
            
            <div class="quiz-main">
                <div class="quiz-question" id="quiz-question">
                    <!-- Question will be rendered here -->
                </div>
                
                <div class="quiz-options" id="quiz-options">
                    <!-- Options will be rendered here -->
                </div>
            </div>
            
            <div class="quiz-footer">
                <div class="quiz-feedback" id="quiz-feedback"></div>
                <button class="btn-primary btn-next" id="btn-next-quiz" onclick="window.nextQuizQuestion()" style="display: none;">
                    Tiếp theo <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
}

/* ===== SHOW CURRENT QUESTION ===== */
function showCurrentQuestion() {
    const word = getCurrentWord();
    
    if (!word) {
        showQuizResults();
        return;
    }

    answered = false;
    selectedOption = null;
    
    const state = getPracticeState();
    const questionType = state.settings?.questionType || 'word-to-meaning';
    
    // Generate options
    options = generateOptions(word, questionType);
    
    // Render question
    const questionContainer = document.getElementById('quiz-question');
    if (questionContainer) {
        if (questionType === 'word-to-meaning') {
            questionContainer.innerHTML = `
                <div class="question-word">
                    <span>${escapeHtml(word.word)}</span>
                    <button class="btn-icon btn-speak" onclick="window.speakQuizWord()">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                ${word.phonetic ? `<div class="question-phonetic">${escapeHtml(word.phonetic)}</div>` : ''}
                <p class="question-prompt">Chọn nghĩa đúng:</p>
            `;
        } else {
            questionContainer.innerHTML = `
                <div class="question-meaning">${escapeHtml(word.meaning)}</div>
                <p class="question-prompt">Chọn từ đúng:</p>
            `;
        }
    }
    
    // Render options
    const optionsContainer = document.getElementById('quiz-options');
    if (optionsContainer) {
        optionsContainer.innerHTML = options.map((opt, index) => `
            <button class="quiz-option" data-index="${index}" onclick="window.selectQuizOption(${index})">
                <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                <span class="option-text">${escapeHtml(opt.text)}</span>
            </button>
        `).join('');
    }
    
    // Hide feedback and next button
    const feedback = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('btn-next-quiz');
    if (feedback) feedback.innerHTML = '';
    if (nextBtn) nextBtn.style.display = 'none';
    
    updateQuizProgress();
    
    // Speak if enabled
    if (state.settings?.speakQuestion && questionType === 'word-to-meaning') {
        speak(word.word);
    }
}

/* ===== GENERATE OPTIONS ===== */
function generateOptions(correctWord, questionType) {
    const allWords = getWordsByScope({ type: 'all' });
    const optionCount = getPracticeState().settings?.optionCount || 4;
    
    // Get the correct answer text
    const correctText = questionType === 'word-to-meaning' 
        ? correctWord.meaning 
        : correctWord.word;
    
    // Get wrong options
    const wrongOptions = allWords
        .filter(w => w.id !== correctWord.id)
        .map(w => questionType === 'word-to-meaning' ? w.meaning : w.word)
        .filter(text => text && text !== correctText);
    
    // Shuffle and pick
    const shuffledWrong = shuffleArray(wrongOptions).slice(0, optionCount - 1);
    
    // Combine and shuffle
    const allOptions = [
        { text: correctText, isCorrect: true },
        ...shuffledWrong.map(text => ({ text, isCorrect: false }))
    ];
    
    return shuffleArray(allOptions);
}

/* ===== SELECT OPTION ===== */
export function selectQuizOption(index) {
    if (answered) return;
    
    answered = true;
    selectedOption = index;
    
    const selected = options[index];
    const isCorrect = selected.isCorrect;
    
    // Submit answer
    submitAnswer(selected.text, isCorrect);
    
    // Update UI
    const optionBtns = document.querySelectorAll('.quiz-option');
    optionBtns.forEach((btn, i) => {
        btn.disabled = true;
        if (options[i].isCorrect) {
            btn.classList.add('correct');
        } else if (i === index && !isCorrect) {
            btn.classList.add('wrong');
        }
    });
    
    // Show feedback
    const feedback = document.getElementById('quiz-feedback');
    if (feedback) {
        feedback.innerHTML = isCorrect 
            ? '<span class="feedback-correct"><i class="fas fa-check-circle"></i> Chính xác!</span>'
            : '<span class="feedback-wrong"><i class="fas fa-times-circle"></i> Sai rồi!</span>';
    }
    
    // Show next button
    const nextBtn = document.getElementById('btn-next-quiz');
    if (nextBtn) nextBtn.style.display = 'block';
    
    // Update score
    updateQuizProgress();
}

/* ===== NEXT QUESTION ===== */
export function nextQuizQuestion() {
    showCurrentQuestion();
}

/* ===== UPDATE PROGRESS ===== */
function updateQuizProgress() {
    const state = getPracticeState();
    
    const progressText = document.getElementById('quiz-progress-text');
    const progressBar = document.getElementById('quiz-progress-bar');
    const scoreEl = document.getElementById('quiz-score');
    
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

/* ===== SPEAK ===== */
export function speakQuizWord() {
    const word = getCurrentWord();
    if (word) {
        speak(word.word);
    }
}

/* ===== SHOW RESULTS ===== */
function showQuizResults() {
    const result = finishPractice();
    
    const container = document.getElementById('practice-content');
    if (!container) return;

    const emoji = result.accuracy >= 80 ? '🎉' : result.accuracy >= 50 ? '👍' : '💪';

    container.innerHTML = `
        <div class="practice-results quiz-results">
            <div class="results-header">
                <span class="result-emoji">${emoji}</span>
                <h2>Kết quả Quiz</h2>
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
                
                <div class="stats-detail">
                    <div class="stat-row">
                        <span class="label"><i class="fas fa-check text-success"></i> Đúng</span>
                        <span class="value">${result.score}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label"><i class="fas fa-times text-danger"></i> Sai</span>
                        <span class="value">${result.wrong}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label"><i class="fas fa-clock"></i> Thời gian</span>
                        <span class="value">${formatDuration(result.duration)}</span>
                    </div>
                </div>
            </div>
            
            <div class="results-actions">
                <button class="btn-primary" onclick="window.restartQuiz()">
                    <i class="fas fa-redo"></i> Làm lại
                </button>
                <button class="btn-secondary" onclick="window.handlePracticeBack()">
                    <i class="fas fa-home"></i> Quay lại
                </button>
            </div>
        </div>
    `;
}

/* ===== NAVIGATION ===== */
export function exitQuiz() {
    resetPractice();
    navigate('practice');
}

export function restartQuiz() {
    const scope = window.practiceScope;
    const settings = window.quizSettings;
    startQuiz(scope, settings);
}

/* ===== UTILITIES ===== */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

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
window.startQuiz = startQuiz;
window.selectQuizOption = selectQuizOption;
window.nextQuizQuestion = nextQuizQuestion;
window.speakQuizWord = speakQuizWord;
window.exitQuiz = exitQuiz;
window.restartQuiz = restartQuiz;
