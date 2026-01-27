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

    showCurrentQuestion();
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
    if (!options || options.length < 2) {
         showToast('Không đủ dữ liệu để tạo đáp án. Hãy kiểm tra nghĩa (defVi/defEn).', 'warning');
         showQuizResults();
         return;
     }
    
    // Render into VoLearn practice-content (use existing practice header/back/progress)
    const container = document.getElementById('practice-content');
    if (!container) return;

    const phonetic = getPhoneticText(word);
    const prompt = questionType === 'word-to-meaning' ? 'Chọn nghĩa đúng:' : 'Chọn từ đúng:';
    const questionLabel = questionType === 'word-to-meaning' ? 'TỪ VỰNG' : 'NGHĨA';
    const questionMain = questionType === 'word-to-meaning'
       ? escapeHtml(word.word || '')
       : escapeHtml(getMeaningText(word));

    container.innerHTML = `
       <div class="quiz-card">
         <div class="quiz-question-label">${questionLabel}</div>
         <div class="quiz-word">${questionMain || '(Không có dữ liệu)'}</div>
         ${
           questionType === 'word-to-meaning'
             ? `
               <div class="quiz-sub">
                 ${phonetic ? `<div class="question-phonetic">${escapeHtml(phonetic)}</div>` : ''}
                 <button class="btn-speak" type="button" onclick="window.speakQuizWord()" title="Nghe phát âm">
                   <i class="fas fa-volume-up"></i>
                 </button>
               </div>
             `
             : ''
         }
         <div class="quiz-answer-label">${prompt}</div>
         
         <div class="quiz-options">
           ${options.map((opt, index) => `
             <button class="quiz-option" type="button" data-index="${index}" onclick="window.selectQuizOption(${index})">
               <span class="option-letter">${String.fromCharCode(65 + index)}</span>
               <span class="option-text">${escapeHtml(opt.text)}</span>
             </button>
           `).join('')}
         </div>
 
         <div class="quiz-feedback" id="quiz-feedback"></div>
         <div class="quiz-actions">
           <button class="btn-primary" id="btn-next-quiz" onclick="window.nextQuizQuestion()" style="display:none;">
             Tiếp theo <i class="fas fa-arrow-right"></i>
           </button>
         </div>
       </div>
     `;
    
    updatePracticeHeaderProgress();
    
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
        ? getMeaningText(correctWord)
        : correctWord.word;
    
    // Get wrong options
    const wrongOptions = allWords
        .filter(w => w.id !== correctWord.id)
        .map(w => questionType === 'word-to-meaning' ? getMeaningText(w) : w.word)
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
    
    // Update practice header progress
    updatePracticeHeaderProgress();
}

/* ===== NEXT QUESTION ===== */
export function nextQuizQuestion() {
    showCurrentQuestion();
}

/* ===== UPDATE PRACTICE HEADER PROGRESS (VoLearn) ===== */
 function updatePracticeHeaderProgress() {
     const state = getPracticeState();
     const bar = document.getElementById('practice-progress-bar');
     const text = document.getElementById('practice-progress-text');
     if (bar?.style) bar.style.width = `${state.progress}%`;
     if (text) text.textContent = `${state.currentIndex}/${state.total}`;
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
    
    // Update header to completed
     const bar = document.getElementById('practice-progress-bar');
     const text = document.getElementById('practice-progress-text');
     if (bar?.style) bar.style.width = `100%`;
     if (text) text.textContent = `${result.total}/${result.total}`;
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

/* ===== WORD DATA HELPERS (VoLearn schema) ===== */
 function getPrimaryMeaningObj(word) {
     return (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};
 }
 
 function getMeaningText(word) {
     const m = getPrimaryMeaningObj(word);
     // ưu tiên VI (UI tiếng Việt), fallback EN
     return m.defVi || m.defEn || word?.meaning || '';
 }
 
 function getPhoneticText(word) {
     const m = getPrimaryMeaningObj(word);
     return m.phoneticUS || m.phoneticUK || word?.phonetic || '';
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
