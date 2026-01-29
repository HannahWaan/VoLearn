/* ===== QUIZ MODE ===== */
/* VoLearn v2.1.0 - Chế độ trắc nghiệm */

import {
  initPractice,
  getCurrentWord,
  submitAnswer,
  finishPractice,
  getPracticeState,
  getWordsByScope,
  resetPractice,
  showPracticeArea,
  hidePracticeArea
} from './practiceEngine.js';
import { speak } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let options = [];
let selectedOption = null;
let answered = false;
let quizSettings = {};

// track current question/answer mapping (debug + future use)
let currentQA = { qFieldId: null, aFieldId: null, correctText: '' };
let autoNextTimer = null;
let countdownInterval = null;

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
    timeLimit: 0,
    showHint: false,
    speakQuestion: false,

    // Field-based settings (from quizSettings.js)
    questionFieldIds: [1, 5],
    answerFieldIds: [5]
  };

  const mergedSettings = { ...defaultSettings, ...settings };
  quizSettings = mergedSettings;
  
  if (!initPractice('quiz', words, mergedSettings)) return;
  
  showPracticeArea();
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

  // NOTE: practiceEngine.getPracticeState() hiện không trả settings,
  // nhưng initPractice() giữ settings nội bộ và quiz.js vẫn dùng state.settings trong repo cũ.
  // Để an toàn: đọc settings từ practiceEngine qua "hack" không có, nên fallback default.
  const qIds = Array.isArray(state.settings?.questionFieldIds) ? state.settings.questionFieldIds : [1, 5];
  const aIds = Array.isArray(state.settings?.answerFieldIds) ? state.settings.answerFieldIds : [5];
  const optionCount = state.settings?.optionCount || 4;
  const speakQuestion = !!state.settings?.speakQuestion;

  const qFieldId = pickRandom(qIds) ?? qIds[0];

  // fallback answer field nếu field đang chọn bị trống
  const aFieldId = pickAnswerFieldWithFallback(word, qFieldId, aIds);
  const questionText = getFieldText(word, qFieldId);
  const correctText = aFieldId ? getFieldText(word, aFieldId) : '';

  currentQA = { qFieldId, aFieldId, correctText };

  options = aFieldId ? generateOptionsByField(word, aFieldId, optionCount) : [];

  if (!options || options.length < 2) {
    showToast('Không đủ dữ liệu để tạo đáp án. Hãy kiểm tra dữ liệu ở Answer Fields.', 'warning');
    showQuizResults();
    return;
  }

  const container = document.getElementById('practice-content');
  if (!container) return;

  const questionLabel = (getFieldLabel(qFieldId) || 'CÂU HỎI').toUpperCase();
  const answerLabel = `Chọn ${getFieldLabel(aFieldId)?.toLowerCase() || 'đáp án'} đúng:`;
  const questionMain = escapeHtml(questionText || '(Không có dữ liệu)');
  const phonetic = getPhoneticText(word);

  container.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-question-label">${questionLabel}</div>

      <div class="quiz-word">${questionMain}</div>

      <div class="quiz-sub">
        ${phonetic ? `<div class="question-phonetic">${escapeHtml(phonetic)}</div>` : ''}

        <button class="btn-speak" type="button" onclick="window.speakQuizWord()" title="Nghe phát âm">
          <i class="fas fa-volume-up"></i>
        </button>
      </div>

      <div class="quiz-answer-label">${escapeHtml(answerLabel)}</div>

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

  if (speakQuestion) speak(word.word);
}

/* ===== GENERATE OPTIONS ===== */
function generateOptionsByField(correctWord, answerFieldId, optionCount = 4) {
  const allWords = getWordsByScope({ type: 'all' });

  const correctText = getFieldText(correctWord, answerFieldId);
  if (!correctText) return [];

  const wrongPool = allWords
    .filter(w => w && w.id !== correctWord.id)
    .map(w => getFieldText(w, answerFieldId))
    .filter(t => t && t !== correctText);

  const wrongUnique = Array.from(new Set(wrongPool));

  const needWrong = Math.max(0, optionCount - 1);
  const pickedWrong = shuffleArray(wrongUnique).slice(0, needWrong);

  const allOptions = [
    { text: correctText, isCorrect: true },
    ...pickedWrong.map(text => ({ text, isCorrect: false }))
  ];

  // nếu thiếu dữ liệu quá (không đủ >= 2 options) thì fail để fallback/report
  if (allOptions.length < 2) return [];

  return shuffleArray(allOptions);
}

/* ===== SELECT OPTION ===== */
export function selectQuizOption(index) {
  if (answered) return;

  answered = true;
  selectedOption = index;

  const selected = options[index];
  const isCorrect = !!selected?.isCorrect;

  submitAnswer(selected?.text ?? '', isCorrect);

  const optionBtns = document.querySelectorAll('.quiz-option');
  optionBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (options[i]?.isCorrect) {
      btn.classList.add('correct');
    } else if (i === index && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  const feedback = document.getElementById('quiz-feedback');
  if (feedback) {
    feedback.innerHTML = isCorrect
      ? '<span class="feedback-correct"><i class="fas fa-check-circle"></i> Chính xác!</span>'
      : '<span class="feedback-wrong"><i class="fas fa-times-circle"></i> Sai rồi!</span>';
  }

  const nextBtn = document.getElementById('btn-next-quiz');
  if (nextBtn) nextBtn.style.display = 'block';

  updatePracticeHeaderProgress();

  // Kiểm tra setting autoNext
  const autoNext = !!quizSettings.autoNext;
  const autoNextSeconds = Number(quizSettings.autoNextSeconds || 5);
  
  if (autoNext) {
    startAutoNextCountdown(autoNextSeconds);
  }
}

/* ===== AUTO NEXT COUNTDOWN ===== */
function startAutoNextCountdown(seconds) {
  // Clear any existing timers
  clearAutoNextTimer();
  
  let remaining = seconds;
  
  // Hiển thị countdown trên nút
  const nextBtn = document.getElementById('btn-next-quiz');
  if (nextBtn) {
    nextBtn.innerHTML = `Tiếp theo (${remaining}s) <i class="fas fa-arrow-right"></i>`;
  }
  
  // Countdown interval
  countdownInterval = setInterval(() => {
    remaining--;
    if (nextBtn) {
      nextBtn.innerHTML = `Tiếp theo (${remaining}s) <i class="fas fa-arrow-right"></i>`;
    }
    
    if (remaining <= 0) {
      clearAutoNextTimer();
      nextQuizQuestion();
    }
  }, 1000);
  
  // Backup timer
  autoNextTimer = setTimeout(() => {
    clearAutoNextTimer();
    nextQuizQuestion();
  }, seconds * 1000 + 100);
}

function clearAutoNextTimer() {
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/* ===== NEXT QUESTION ===== */
export function nextQuizQuestion() {
  clearAutoNextTimer();
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
  if (word) speak(word.word);
}

/* ===== SHOW RESULTS ===== */
function showQuizResults() {
    const result = finishPractice();
    const state = getPracticeState();
    
    // Lấy danh sách từ sai
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
                ${hasWrongWords ? `
                <button class="btn-secondary" onclick="window.reviewWrongQuiz()">
                    <i class="fas fa-redo"></i> Ôn lại từ sai (${wrongWords.length})
                </button>
                ` : ''}
                <button class="btn-primary" onclick="window.restartQuiz()">
                    <i class="fas fa-play"></i> Làm lại
                </button>
                <button class="btn-secondary" onclick="window.exitQuiz()">
                    <i class="fas fa-arrow-left"></i> Quay lại luyện tập
                </button>
            </div>
        </div>
    `;

    const bar = document.getElementById('practice-progress-bar');
    const text = document.getElementById('practice-progress-text');
    if (bar?.style) bar.style.width = `100%`;
    if (text) text.textContent = `${result.total}/${result.total}`;
}

/* ===== NAVIGATION ===== */
export function exitQuiz() {
  clearAutoNextTimer();
  resetPractice();
  hidePracticeArea();
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

function getPhoneticText(word) {
  const m = getPrimaryMeaningObj(word);
  return m.phoneticUS || m.phoneticUK || word?.phonetic || '';
}

/* ===== FIELD MAPPING (match quizSettings field IDs) ===== */
function getFieldLabel(fieldId) {
  const map = {
    1: 'Từ vựng',
    2: 'Phát âm',
    3: 'Loại từ',
    4: 'Định nghĩa (EN)',
    5: 'Nghĩa (VI)',
    6: 'Ví dụ',
    7: 'Từ đồng nghĩa',
    8: 'Từ trái nghĩa'
  };
  return map[fieldId] || 'Nội dung';
}

function getFieldText(word, fieldId) {
  const m = getPrimaryMeaningObj(word);
  const normalize = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.filter(Boolean).join(', ').trim();
    return String(v).trim();
  };

  switch (fieldId) {
    case 1: return normalize(word?.word);
    case 2: return normalize(m.phoneticUS || m.phoneticUK || word?.phonetic);
    case 3: return normalize(m.pos);
    case 4: return normalize(m.defEn);
    case 5: return normalize(m.defVi);
    case 6: return normalize(m.example);
    case 7: return normalize(m.synonyms);
    case 8: return normalize(m.antonyms);
    default: return '';
  }
}

/* ===== FALLBACK ANSWER FIELD ===== */
function firstNonEmptyFieldId(word, fieldIds) {
  if (!word || !Array.isArray(fieldIds)) return null;
  for (const id of fieldIds) {
    const t = getFieldText(word, id);
    if (t && String(t).trim()) return id;
  }
  return null;
}

function pickAnswerFieldWithFallback(word, qFieldId, answerFieldIds) {
  const preferred = (Array.isArray(answerFieldIds) ? answerFieldIds : []).filter(id => id !== qFieldId);

  let aId = firstNonEmptyFieldId(word, preferred);
  if (aId) return aId;

  aId = firstNonEmptyFieldId(word, answerFieldIds);
  if (aId) return aId;

  return firstNonEmptyFieldId(word, [5, 4, 1]); // defVi -> defEn -> word
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

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function renderQuiz() {
  showCurrentQuestion();
}

export function reviewWrongQuiz() {
    const state = getPracticeState();
    const wrongAnswers = state.answers?.filter(a => !a.isCorrect) || [];
    
    if (wrongAnswers.length === 0) {
        showToast('Không có từ sai!', 'success');
        return;
    }

    // Lấy lại các từ sai từ words gốc
    const allWords = getWordsByScope({ type: 'all' });
    const wrongWordIds = wrongAnswers.map(a => a.wordId).filter(Boolean);
    const wrongWords = allWords.filter(w => wrongWordIds.includes(w.id));

    if (wrongWords.length > 0) {
        startQuiz({ type: 'custom', words: wrongWords }, window.quizSettings);
    } else {
        showToast('Không tìm thấy từ sai!', 'warning');
    }
}

/* ===== EXPORTS ===== */
window.startQuiz = startQuiz;
window.selectQuizOption = selectQuizOption;
window.nextQuizQuestion = nextQuizQuestion;
window.speakQuizWord = speakQuizWord;
window.exitQuiz = exitQuiz;
window.restartQuiz = restartQuiz;
window.reviewWrongQuiz = reviewWrongQuiz;
