/* ========================================
   VoLearn - Quiz Settings
   ======================================== */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, closeAllModals } from '../ui/modalEngine.js';
import { speak } from '../utils/speech.js';
import { showPracticeArea } from './practiceEngine.js';
import { startQuiz } from './quiz.js';

const POS_MAPPING = {
  noun: 'Danh từ',
  verb: 'Động từ',
  adjective: 'Tính từ',
  adverb: 'Trạng từ',
  preposition: 'Giới từ',
  conjunction: 'Liên từ',
  interjection: 'Thán từ',
  pronoun: 'Đại từ',
  article: 'Mạo từ',
  'auxiliary verb': 'Trợ động từ',
  'phrasal verb': 'Cụm động từ'
};

// ===== QUIZ SETTINGS STATE =====
let quizSettings = {
  limit: 0,
  selectedSetIds: ['all'],
  selectedDateRange: 'all',

  includeUnmarked: true,
  includeMastered: true,
  includeLearning: true,
  includeBookmarked: true,

  sortBy: 'random',

  questionFields: [1, 5],
  answerFields: [5],

  timeLimit: 0,
  autoSkip: false,
  autoNext: true,
  showPhonetic: false,
   
  optionCount: 4
};

const QUIZ_FIELDS = [
  { id: 1, key: 'word', label: 'Từ vựng' },
  { id: 2, key: 'phonetic', label: 'Phát âm' },
  { id: 3, key: 'pos', label: 'Loại từ' },
  { id: 4, key: 'defEn', label: 'Định nghĩa (EN)' },
  { id: 5, key: 'defVi', label: 'Nghĩa (VI)' },
  { id: 6, key: 'example', label: 'Ví dụ' },
  { id: 7, key: 'synonyms', label: 'Từ đồng nghĩa' },
  { id: 8, key: 'antonyms', label: 'Từ trái nghĩa' }
];

// practice session (legacy renderer still present; new engine uses startQuiz)
let practiceWords = [];
let practiceIndex = 0;

let quizTimerInterval = null;
let quizTimeRemaining = 0;

// ===== helpers =====
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function uniqWordsById(words) {
  const seen = new Set();
  const out = [];
  for (const w of words || []) {
    if (!w) continue;
    const key = w.id ?? (w.word ?? JSON.stringify(w));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function getAllVocabWords() {
  return uniqWordsById(Array.isArray(appData?.vocabulary) ? appData.vocabulary : []);
}

function isMastered(w) {
  // theo data hiện tại của bạn: boolean mastered
  return !!w?.mastered;
}

function isBookmarked(w) {
  // theo data hiện tại của bạn: boolean bookmarked
  return !!w?.bookmarked;
}

function isLearning(w) {
  // learning = chưa thuộc
  return !isMastered(w);
}

function isUnmarked(w) {
  // unmarked = không mastered và không bookmarked
  return !isMastered(w) && !isBookmarked(w);
}

// ===== modal controls =====
function closeQuizSettings() {
  closeAllModals();
}

function updateQuizSettingsCounts() {
  const vocab = getAllVocabWords();

  const unmarked = vocab.filter(isUnmarked).length;
  const mastered = vocab.filter(isMastered).length;
  const learning = vocab.filter(isLearning).length;
  const bookmarked = vocab.filter(isBookmarked).length;

  setText('quiz-count-unmarked', unmarked);
  setText('quiz-count-mastered', mastered);
  setText('quiz-count-learning', learning);
  setText('quiz-count-bookmarked', bookmarked);

  // slider max = tổng từ
  const slider = document.getElementById('quiz-limit-slider');
  if (slider) {
    slider.max = String(vocab.length);

    // clamp current slider value if needed
    const current = parseInt(slider.value || '0', 10);
    if (Number.isFinite(current) && current > vocab.length) {
      slider.value = String(vocab.length);
      updateQuizLimit(vocab.length);
    }
  }
}

function renderQuizFieldSelectors() {
  const questionContainer = document.getElementById('quiz-question-fields');
  const answerContainer = document.getElementById('quiz-answer-fields');
  if (!questionContainer || !answerContainer) return;

  questionContainer.innerHTML = QUIZ_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox" ${quizSettings.questionFields.includes(f.id) ? 'checked' : ''} data-quiz-qfield="${f.id}">
      <span class="field-name">${escapeHtml(f.label)}</span>
    </label>
  `).join('');

  answerContainer.innerHTML = QUIZ_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox" ${quizSettings.answerFields.includes(f.id) ? 'checked' : ''} data-quiz-afield="${f.id}">
      <span class="field-name">${escapeHtml(f.label)}</span>
    </label>
  `).join('');
}

function updateQuizLimit(value) {
  const intValue = parseInt(value, 10);
  quizSettings.limit = Number.isFinite(intValue) ? intValue : 0;
  setText('quiz-limit-value', quizSettings.limit === 0 ? 'Không giới hạn' : `${quizSettings.limit} câu`);
}

function adjustQuizLimit(delta) {
  const slider = document.getElementById('quiz-limit-slider');
  if (!slider) return;
  const max = parseInt(slider.max || '0', 10) || 0;

  let newValue = parseInt(slider.value || '0', 10) + delta;
  newValue = Math.max(0, Math.min(max, newValue));

  slider.value = String(newValue);
  updateQuizLimit(newValue);
}

function updateQuizTimer(value) {
  const intValue = parseInt(value, 10);
  quizSettings.timeLimit = Number.isFinite(intValue) ? intValue : 0;
  setText('quiz-timer-value', quizSettings.timeLimit === 0 ? 'Không giới hạn' : `${quizSettings.timeLimit} giây`);
}

function adjustQuizTimer(delta) {
  const slider = document.getElementById('quiz-timer-slider');
  if (!slider) return;
  const max = parseInt(slider.max || '60', 10);

  let newValue = parseInt(slider.value || '0', 10) + delta;
  newValue = Math.max(0, Math.min(max, newValue));

  slider.value = String(newValue);
  updateQuizTimer(newValue);
}

function openQuizSettings() {
  updateQuizSettingsCounts();
  renderQuizFieldSelectors();
  openModal('quiz-settings-modal');
}

function switchQuizTab(tabName, btn) {
  document.querySelectorAll('#quiz-settings-modal .settings-tab').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');

  document.querySelectorAll('#quiz-settings-modal .settings-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`quiz-tab-${tabName}`)?.classList.add('active');
}

// ===== scope selector (USE SHARED scope-selector-modal) =====
function openQuizScopeSelector(type) {
  const title = document.getElementById('scope-selector-title');
  const content = document.getElementById('scope-selector-content');
  if (!title || !content) return;

  if (type === 'set') {
    title.textContent = 'Chọn Bộ Từ Vựng';

    const vocab = getAllVocabWords();
    const sets = Array.isArray(appData?.sets) ? appData.sets : [];
    const isAllSelected = quizSettings.selectedSetIds.includes('all');

    let html = '<div class="scope-list scope-multiple">';

    html += `
      <label class="scope-list-item-checkbox ${isAllSelected ? 'selected' : ''}">
        <input type="checkbox" ${isAllSelected ? 'checked' : ''} data-quiz-scope-toggle="all">
        <span class="scope-checkmark"></span>
        <i class="fas fa-layer-group"></i>
        <span class="scope-item-name">Tất Cả Từ Vựng</span>
        <span class="count">${vocab.length}</span>
      </label>
    `;

    sets.forEach(set => {
      const count = vocab.filter(w => w.setId === set.id).length;
      const isSelected = quizSettings.selectedSetIds.includes(set.id);

      html += `
        <label class="scope-list-item-checkbox ${isSelected ? 'selected' : ''}" ${isAllSelected ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
          <input type="checkbox"
            ${isSelected ? 'checked' : ''}
            ${isAllSelected ? 'disabled' : ''}
            data-quiz-scope-toggle="${escapeHtml(set.id)}">
          <span class="scope-checkmark"></span>
          <i class="fas fa-folder" style="color: ${escapeHtml(set.color || '#e91e8c')}"></i>
          <span class="scope-item-name">${escapeHtml(set.name || '')}</span>
          <span class="count">${count}</span>
        </label>
      `;
    });

    html += '</div>';

    html += `
      <div class="scope-footer">
        <button class="btn-secondary" type="button" data-quiz-scope-close>Đóng</button>
        <button class="btn-primary" type="button" data-quiz-scope-confirm>
          <i class="fas fa-check"></i> Xác nhận
        </button>
      </div>
    `;

    content.innerHTML = html;
  }

  if (type === 'date') {
    title.textContent = 'Chọn Phạm Vi Ngày';
    content.innerHTML = `
      <div class="scope-list">
        <div class="scope-list-item ${quizSettings.selectedDateRange === 'all' ? 'selected' : ''}"
             data-quiz-date="all" data-quiz-date-label="Tất Cả Ngày">
          <i class="fas fa-calendar"></i><span>Tất Cả Ngày</span>
        </div>
        <div class="scope-list-item ${quizSettings.selectedDateRange === 'today' ? 'selected' : ''}"
             data-quiz-date="today" data-quiz-date-label="Hôm nay">
          <i class="fas fa-calendar-day"></i><span>Hôm nay</span>
        </div>
        <div class="scope-list-item ${quizSettings.selectedDateRange === 'week' ? 'selected' : ''}"
             data-quiz-date="week" data-quiz-date-label="7 ngày qua">
          <i class="fas fa-calendar-week"></i><span>7 ngày qua</span>
        </div>
        <div class="scope-list-item ${quizSettings.selectedDateRange === 'month' ? 'selected' : ''}"
             data-quiz-date="month" data-quiz-date-label="30 ngày qua">
          <i class="fas fa-calendar-alt"></i><span>30 ngày qua</span>
        </div>
      </div>
    `;
  }

  openModal('scope-selector-modal');
}

function closeQuizScopeSelector() {
  closeModal('scope-selector-modal');
}

function refreshQuizScope() {
  quizSettings.selectedSetIds = ['all'];
  quizSettings.selectedDateRange = 'all';
  setText('quiz-selected-set-name', 'Tất Cả Từ Vựng');
  setText('quiz-selected-date-range', 'Tất Cả Ngày');
  showToast('Đã đặt lại phạm vi', 'success');
}

function toggleQuizSetScopeInternal(setId, checked) {
  if (setId === 'all') {
    if (checked) {
      quizSettings.selectedSetIds = ['all'];

      document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        const input = item.querySelector('input');
        const isAll = input?.getAttribute('data-quiz-scope-toggle') === 'all';

        if (input && !isAll) {
          item.style.opacity = '0.5';
          item.style.pointerEvents = 'none';
          input.checked = false;
          input.disabled = true;
        }
      });
    } else {
      quizSettings.selectedSetIds = [];

      document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        item.style.opacity = '1';
        item.style.pointerEvents = 'auto';
        const input = item.querySelector('input');
        if (input) input.disabled = false;
      });
    }
  } else {
    quizSettings.selectedSetIds = quizSettings.selectedSetIds.filter(id => id !== 'all');

    if (checked) {
      if (!quizSettings.selectedSetIds.includes(setId)) quizSettings.selectedSetIds.push(setId);
    } else {
      quizSettings.selectedSetIds = quizSettings.selectedSetIds.filter(id => id !== setId);
    }
  }

  document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
    const input = item.querySelector('input');
    item.classList.toggle('selected', !!input?.checked);
  });
}

function updateQuizSetDisplay() {
  const display = document.getElementById('quiz-selected-set-name');
  if (!display) return;

  if (quizSettings.selectedSetIds.includes('all') || quizSettings.selectedSetIds.length === 0) {
    display.textContent = 'Tất Cả Từ Vựng';
  } else if (quizSettings.selectedSetIds.length === 1) {
    const set = (appData.sets || []).find(s => s.id === quizSettings.selectedSetIds[0]);
    display.textContent = set?.name || 'Bộ từ vựng';
  } else {
    display.textContent = `${quizSettings.selectedSetIds.length} bộ từ vựng`;
  }
}

// ===== read settings from UI =====
function getQuizSettingsFromForm() {
  quizSettings.includeUnmarked = document.getElementById('quiz-include-unmarked')?.checked ?? true;
  quizSettings.includeMastered = document.getElementById('quiz-include-mastered')?.checked ?? true;
  quizSettings.includeLearning = document.getElementById('quiz-include-learning')?.checked ?? true;
  quizSettings.includeBookmarked = document.getElementById('quiz-include-bookmarked')?.checked ?? true;

  const sortRadio = document.querySelector('input[name="quiz-sort"]:checked');
  quizSettings.sortBy = sortRadio?.value || 'random';
  quizSettings.showPhonetic = document.getElementById('quiz-show-phonetic')?.checked ?? false;
   
  quizSettings.autoSkip = document.getElementById('quiz-auto-skip')?.checked ?? false;
  quizSettings.autoNext = document.getElementById('quiz-auto-next')?.checked ?? true;

  const opt = document.querySelector('input[name="quiz-option-count"]:checked');
  quizSettings.optionCount = parseInt(opt?.value || '4', 10);

  return quizSettings;
}

// ===== vocab filtering =====
function getFilteredWordsForQuiz() {
  let words = getAllVocabWords();

  // set scope
  if (!quizSettings.selectedSetIds.includes('all') && quizSettings.selectedSetIds.length > 0) {
    words = words.filter(w => quizSettings.selectedSetIds.includes(w.setId));
  }

  // date scope
  if (quizSettings.selectedDateRange !== 'all') {
    const now = new Date();
    let startDate;

    if (quizSettings.selectedDateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (quizSettings.selectedDateRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else if (quizSettings.selectedDateRange === 'month') {
      startDate = new Date(now.getTime() - 30 * 86400000);
    }

    if (startDate) {
      words = words.filter(w => {
        if (!w?.createdAt) return true; // nếu thiếu createdAt thì không loại
        return new Date(w.createdAt) >= startDate;
      });
    }
  }

  // marks (unmarked/mastered/learning/bookmarked)
  words = words.filter(w => {
     const mastered = isMastered(w); 
     const bookmarked = isBookmarked(w); 
     const unmarked = !mastered && !bookmarked;
     const learning = !mastered;
   
     const allowed =
       (unmarked && quizSettings.includeUnmarked) ||
       (mastered && quizSettings.includeMastered) ||
       (learning && quizSettings.includeLearning) ||
       (bookmarked && quizSettings.includeBookmarked);
   
     return allowed;
   });

  // sort
  switch (quizSettings.sortBy) {
    case 'newest':
      words.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    case 'oldest':
      words.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      break;
    case 'az':
      words.sort((a, b) => (a.word || '').localeCompare(b.word || ''));
      break;
    case 'za':
      words.sort((a, b) => (b.word || '').localeCompare(a.word || ''));
      break;
    default:
      words.sort(() => Math.random() - 0.5);
      break;
  }

  // limit
  if (quizSettings.limit > 0) {
    words = words.slice(0, quizSettings.limit);
  }

  return words;
}

// ===== field value =====
function getWordFieldValue(word, fieldId) {
  const m = (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};
  const field = QUIZ_FIELDS.find(f => f.id === fieldId);
  if (!field) return '';

  const values = {
    word: word?.word || '',
    phonetic: m.phoneticUS || m.phoneticUK || word?.phonetic || '',
    pos: POS_MAPPING[m.pos] || m.pos || '',
    defEn: m.defEn || '',
    defVi: m.defVi || '',
    example: m.example || '',
    synonyms: m.synonyms || '',
    antonyms: m.antonyms || ''
  };

  return values[field.key] || '';
}

// ===== start quiz (NEW engine) =====
function startQuizWithSettings() {
  getQuizSettingsFromForm();

  if (!Array.isArray(quizSettings.questionFields) || quizSettings.questionFields.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 mục làm câu hỏi!', 'error');
    return;
  }
  if (!Array.isArray(quizSettings.answerFields) || quizSettings.answerFields.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 mục làm đáp án!', 'error');
    return;
  }

  const words = getFilteredWordsForQuiz();
  const need = Math.max(4, quizSettings.optionCount || 4);
  if (words.length < need) {
    showToast(`Cần ít nhất ${need} từ vựng để chơi trắc nghiệm!`, 'error');
    return;
  }

  closeQuizSettings();

  // đảm bảo UI practice area hiện trước
  try { showPracticeArea(); } catch (_) {}

  const scope = { type: 'custom', words };

  const settings = {
     shuffle: true,
     optionCount: quizSettings.optionCount || 4,
   
     timeLimit: quizSettings.timeLimit || 0,
   
     autoNext: !!quizSettings.autoNext,
     autoNextSeconds: 5, 
     autoSkip: !!quizSettings.autoSkip,
   
     questionFieldIds: [...(quizSettings.questionFields || [])],
     answerFieldIds: [...(quizSettings.answerFields || [])],
     showPhonetic: !!quizSettings.showPhonetic,
     speakQuestion: false
   };

  startQuiz(scope, settings);
}

/* ===== Legacy render functions (kept for compatibility; not used if quiz.js renders) ===== */
function renderQuizWithSettings() {
  const word = practiceWords[practiceIndex];
  if (!word) return;

  const questionFieldId = quizSettings.questionFields[Math.floor(Math.random() * quizSettings.questionFields.length)];
  const questionText = getWordFieldValue(word, questionFieldId);
  const questionField = QUIZ_FIELDS.find(f => f.id === questionFieldId);

  const availableAnswerFields = quizSettings.answerFields.filter(id => id !== questionFieldId);
  const answerPool = availableAnswerFields.length ? availableAnswerFields : quizSettings.answerFields;
  const answerFieldId = answerPool[Math.floor(Math.random() * answerPool.length)];
  const answerField = QUIZ_FIELDS.find(f => f.id === answerFieldId);

  const correctAnswer = getWordFieldValue(word, answerFieldId);

  const optionCount = Math.max(4, quizSettings.optionCount || 4);
  const wrongNeed = Math.max(0, optionCount - 1);

  const wrongWords = practiceWords
    .filter(w => w?.id !== word?.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, wrongNeed);

  const allAnswers = [
    { text: correctAnswer, correct: true },
    ...wrongWords.map(w => ({ text: getWordFieldValue(w, answerFieldId), correct: false }))
  ].filter(a => a.text).sort(() => Math.random() - 0.5);

  const timerHtml = quizSettings.timeLimit > 0 ? `
    <div class="quiz-timer">
      <i class="fas fa-clock"></i>
      <span id="quiz-time-display">${quizSettings.timeLimit}</span>s
    </div>
  ` : '';

  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="quiz-card">
      ${timerHtml}
      <div class="quiz-question-label">${escapeHtml(questionField?.label || '')}</div>
      <div class="quiz-word">${escapeHtml(questionText) || '(Không có dữ liệu)'}</div>

      <button class="btn-speak" type="button" data-action="quiz-speak" data-word="${escapeHtml(word.word)}" title="Nghe phát âm">
        <i class="fas fa-volume-up"></i>
      </button>

      <div class="quiz-answer-label">Chọn ${(answerField?.label || '').toLowerCase()} đúng:</div>

      <div class="quiz-options">
        ${allAnswers.map(a => `
          <button class="quiz-option" type="button"
            data-action="quiz-answer"
            data-correct="${a.correct ? 'true' : 'false'}"
            data-right="${escapeHtml(correctAnswer)}">
            ${escapeHtml(a.text)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // update progress bar in practice header
  const total = practiceWords.length;
  const current = practiceIndex + 1;
  const progress = total > 0 ? (current / total) * 100 : 0;

  const bar = document.getElementById('practice-progress-bar');
  if (bar?.style) bar.style.width = `${progress}%`;
  setText('practice-progress-text', `${current}/${total}`);

  if (quizSettings.timeLimit > 0) startQuizTimer();
}

function startQuizTimer() {
  clearQuizTimer();
  quizTimeRemaining = quizSettings.timeLimit;

  quizTimerInterval = setInterval(() => {
    quizTimeRemaining--;
    setText('quiz-time-display', quizTimeRemaining);

    if (quizTimeRemaining <= 0) {
      clearQuizTimer();
      if (quizSettings.autoSkip) {
        showToast('Hết giờ!', 'error');
        setTimeout(() => nextQuizQuestion(), 500);
      } else {
        document.querySelectorAll('.quiz-option').forEach(opt => (opt.disabled = true));
        showToast('Hết giờ!', 'error');
      }
    }
  }, 1000);
}

function clearQuizTimer() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = null;
  }
}

function checkQuizAnswerWithSettings(btn, correct) {
  clearQuizTimer();

  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.disabled = true;
    if (opt.dataset.correct === 'true') opt.classList.add('correct');
  });

  if (correct) {
    btn.classList.add('correct');
    showToast('Chính xác!', 'success');
  } else {
    btn.classList.add('wrong');
    showToast('Sai rồi!', 'error');
  }

  const w = practiceWords[practiceIndex];
  if (w?.id) {
    const today = new Date().toISOString().split('T')[0];
    if (!appData.history) appData.history = [];
    let entry = appData.history.find(h => h.date === today);
    if (!entry) {
      entry = { date: today, added: 0, reviewed: 0, addedWords: [], reviewedWords: [] };
      appData.history.push(entry);
    }
    if (!entry.reviewedWords) entry.reviewedWords = [];
    if (!entry.reviewedWords.includes(w.id)) entry.reviewedWords.push(w.id);
    entry.reviewed = entry.reviewedWords.length;
    saveData(appData);
  }

  if (quizSettings.autoNext) setTimeout(() => nextQuizQuestion(), 1200);
}

function nextQuizQuestion() {
  practiceIndex++;
  if (practiceIndex >= practiceWords.length) {
    const c = document.getElementById('practice-content');
    if (c) {
      c.innerHTML = `
        <div class="practice-complete">
          <i class="fas fa-trophy"></i>
          <h2>Hoàn thành!</h2>
          <p>Bạn đã hoàn thành ${practiceWords.length} câu.</p>
          <button class="btn-primary" type="button" onclick="window.hidePracticeArea && window.hidePracticeArea()">Quay lại</button>
        </div>
      `;
    }
    return;
  }
  renderQuizWithSettings();
}

// ===== init + event delegation =====
export function initQuizSettings() {
  document.addEventListener('click', (e) => {
    // close
    if (e.target.closest('[data-action="quiz-close"]')) {
      closeQuizSettings();
      return;
    }

    // tabs (module way)
    const tabBtn = e.target.closest('[data-quiz-tab]');
    if (tabBtn && tabBtn.closest('#quiz-settings-modal')) {
      switchQuizTab(tabBtn.getAttribute('data-quiz-tab'), tabBtn);
      return;
    }

    // limit +/- / start
    if (e.target.closest('[data-action="quiz-limit-minus"]')) { adjustQuizLimit(-5); return; }
    if (e.target.closest('[data-action="quiz-limit-plus"]')) { adjustQuizLimit(5); return; }
    if (e.target.closest('[data-action="quiz-start"]')) { startQuizWithSettings(); return; }

    // scope open/refresh
    const scopeOpen = e.target.closest('[data-action="quiz-scope-open"]');
    if (scopeOpen) {
      openQuizScopeSelector(scopeOpen.getAttribute('data-scope-type'));
      return;
    }
    if (e.target.closest('[data-action="quiz-scope-refresh"]')) { refreshQuizScope(); return; }

    // timer +/- in other tab
    if (e.target.closest('[data-action="quiz-timer-minus"]')) { adjustQuizTimer(-5); return; }
    if (e.target.closest('[data-action="quiz-timer-plus"]')) { adjustQuizTimer(5); return; }

    // quiz practice actions (legacy renderer)
    const speakBtn = e.target.closest('[data-action="quiz-speak"]');
    if (speakBtn) {
      const w = speakBtn.getAttribute('data-word');
      if (w) speak(w);
      return;
    }

    const ansBtn = e.target.closest('[data-action="quiz-answer"]');
    if (ansBtn) {
      const correct = ansBtn.getAttribute('data-correct') === 'true';
      checkQuizAnswerWithSettings(ansBtn, correct);
      return;
    }

    // scope modal controls
    if (e.target.closest('[data-quiz-scope-close]') || e.target.closest('[data-action="quiz-scope-close"]')) {
      closeQuizScopeSelector();
      return;
    }
    if (e.target.closest('[data-quiz-scope-confirm]')) {
      updateQuizSetDisplay();
      closeQuizScopeSelector();
      return;
    }

    const datePick = e.target.closest('[data-quiz-date]');
    if (datePick) {
      quizSettings.selectedDateRange = datePick.getAttribute('data-quiz-date') || 'all';
      setText('quiz-selected-date-range', datePick.getAttribute('data-quiz-date-label') || 'Tất Cả Ngày');
      closeQuizScopeSelector();
      return;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target?.id === 'quiz-limit-slider') updateQuizLimit(e.target.value);
    if (e.target?.id === 'quiz-timer-slider') updateQuizTimer(e.target.value);
  });

  document.addEventListener('change', (e) => {
    // question/answer fields
    const qf = e.target.closest('input[data-quiz-qfield]');
    if (qf) {
      const id = parseInt(qf.getAttribute('data-quiz-qfield'), 10);
      if (!Number.isNaN(id)) {
        if (qf.checked) {
          if (!quizSettings.questionFields.includes(id)) quizSettings.questionFields.push(id);
        } else {
          quizSettings.questionFields = quizSettings.questionFields.filter(x => x !== id);
        }
      }
      return;
    }

    const af = e.target.closest('input[data-quiz-afield]');
    if (af) {
      const id = parseInt(af.getAttribute('data-quiz-afield'), 10);
      if (!Number.isNaN(id)) {
        if (af.checked) {
          if (!quizSettings.answerFields.includes(id)) quizSettings.answerFields.push(id);
        } else {
          quizSettings.answerFields = quizSettings.answerFields.filter(x => x !== id);
        }
      }
      return;
    }

    // scope set toggles
    const scopeToggle = e.target.closest('input[data-quiz-scope-toggle]');
    if (scopeToggle) {
      toggleQuizSetScopeInternal(scopeToggle.getAttribute('data-quiz-scope-toggle'), scopeToggle.checked);
      return;
    }
  });

  // Entry point for existing onclick in practice section
  window.openQuizSettings = openQuizSettings;

  // For inline onclick compatibility (if still present in HTML)
  window.closeQuizSettings = closeQuizSettings;
  window.switchQuizTab = switchQuizTab;
  window.adjustQuizLimit = adjustQuizLimit;
  window.updateQuizLimit = updateQuizLimit;
  window.openQuizScopeSelector = openQuizScopeSelector;
  window.closeQuizScopeSelector = closeQuizScopeSelector;
  window.refreshQuizScope = refreshQuizScope;
  window.adjustQuizTimer = adjustQuizTimer;
  window.updateQuizTimer = updateQuizTimer;
  window.startQuizWithSettings = startQuizWithSettings;

  console.log('✅ QuizSettings module initialized');
}
