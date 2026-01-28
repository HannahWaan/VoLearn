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

// track current question/answer mapping (debug + future use)
let currentQA = { qFieldId: null, aFieldId: null, correctText: '' };

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
  const qIds = Array.isArray(state.settings?.questionFieldIds) ? state.settings.questionFieldIds : [1, 5];
  const aIds = Array.isArray(state.settings?.answerFieldIds) ? state.settings.answerFieldIds : [5];

  // pick question field (can be empty; we keep it as user asked; if empty -> show "(Không có dữ liệu)")
  const qFieldId = pickRandom(qIds) ?? qIds[0];

  // pick answer field WITH fallback to avoid empty correct text
  const aFieldId = pickAnswerFieldWithFallback(word, qFieldId, aIds);

  const questionText = getFieldText(word, qFieldId);
  const correctText = aFieldId ? getFieldText(word, aFieldId) : '';

  currentQA = { qFieldId, aFieldId, correctText };

  // Generate options by answer field
  options = aFieldId ? generateOptionsByField(word, aFieldId) : [];

  if (!options || options.length < 2) {
    showToast('Không đủ dữ liệu để tạo đáp án. Hãy kiểm tra dữ liệu ở Answer Fields.', 'warning');
    showQuizResults();
    return;
  }

  // Render into VoLearn practice-content (use existing practice header/back/progress)
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

  // Speak if enabled
  if (state.settings?.speakQuestion) speak(word.word);
}

/* ===== GENERATE OPTIONS ===== */
function generateOptionsByField(correctWord, answerFieldId) {
  const allWords = getWordsByScope({ type: 'all' });
  const optionCount = getPracticeState().settings?.optionCount || 4;

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

  // If not enough options (e.g., too many empty fields), still allow with >= 2 options
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

  // Submit answer
  submitAnswer(selected?.text ?? '', isCorrect);

  // Update UI
  const optionBtns = document.querySelectorAll('.quiz-option');
  optionBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (options[i]?.isCorrect) {
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
  if (word) speak(word.word);
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
  // 1) ưu tiên answer field khác question field
  const preferred = (Array.isArray(answerFieldIds) ? answerFieldIds : []).filter(id => id !== qFieldId);
  let aId = firstNonEmptyFieldId(word, preferred);
  if (aId) return aId;

  // 2) thử cả list answerFieldIds
  aId = firstNonEmptyFieldId(word, answerFieldIds);
  if (aId) return aId;

  // 3) fallback chắc có dữ liệu nhất
  const hardFallback = [5, 4, 1]; // defVi -> defEn -> word
  return firstNonEmptyFieldId(word, hardFallback);
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

/* ===== EXPORTS ===== */
window.startQuiz = startQuiz;
window.selectQuizOption = selectQuizOption;
window.nextQuizQuestion = nextQuizQuestion;
window.speakQuizWord = speakQuizWord;
window.exitQuiz = exitQuiz;
window.restartQuiz = restartQuiz;
