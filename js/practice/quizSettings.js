/* ========================================
   VoLearn - Quiz Settings (Module hóa từ code cũ)
   ======================================== */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeAllModals } from '../ui/modalEngine.js';
import { speak } from '../utils/speech.js';
import { POS_MAPPING } from '../core/constants.js'; // nếu file này chưa có, xem ghi chú bên dưới
import { updatePracticeProgress, showPracticeArea, endPractice, updateReviewHistory } from './practiceUIBridge.js'; 
// nếu chưa có practiceUIBridge.js, xem phần C bên dưới

// ===== QUIZ SETTINGS SYSTEM =====
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
  answerFields: [],
  timeLimit: 0,
  autoSkip: false,
  autoNext: true
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

// ===== PRACTICE STATE (local) =====
let practiceWords = [];
let practiceIndex = 0;

let quizTimerInterval = null;
let quizTimeRemaining = 0;

// ===== PUBLIC API =====
export function openQuizSettings() {
  updateQuizSettingsCounts();
  renderQuizFieldSelectors();
  openModal('quiz-settings-modal');
}

export function closeQuizSettings() {
  closeAllModals();
}

export function switchQuizTab(tabName, btn) {
  document.querySelectorAll('#quiz-settings-modal .settings-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('#quiz-settings-modal .settings-tab-content').forEach(c => c.classList.remove('active'));
  const el = document.getElementById(`quiz-tab-${tabName}`);
  if (el) el.classList.add('active');
}

export function adjustQuizLimit(delta) {
  const slider = document.getElementById('quiz-limit-slider');
  if (!slider) return;

  const max = parseInt(slider.max || '100', 10);
  let newValue = parseInt(slider.value || '0', 10) + delta;
  newValue = Math.max(0, Math.min(max, newValue));
  slider.value = String(newValue);
  updateQuizLimit(newValue);
}

export function updateQuizLimit(value) {
  const intValue = parseInt(value, 10);
  quizSettings.limit = intValue;

  const el = document.getElementById('quiz-limit-value');
  if (el) el.textContent = intValue === 0 ? 'Không giới hạn' : intValue + ' câu';
}

export function adjustQuizTimer(delta) {
  const slider = document.getElementById('quiz-timer-slider');
  if (!slider) return;

  const max = parseInt(slider.max || '60', 10);
  let newValue = parseInt(slider.value || '0', 10) + delta;
  newValue = Math.max(0, Math.min(max, newValue));
  slider.value = String(newValue);
  updateQuizTimer(newValue);
}

export function updateQuizTimer(value) {
  const intValue = parseInt(value, 10);
  quizSettings.timeLimit = intValue;

  const el = document.getElementById('quiz-timer-value');
  if (el) el.textContent = intValue === 0 ? 'Không giới hạn' : intValue + ' giây';
}

export function openQuizScopeSelector(type) {
  const modal = document.getElementById('quiz-scope-selector-modal');
  const title = document.getElementById('quiz-scope-selector-title');
  const content = document.getElementById('quiz-scope-selector-content');

  if (!modal || !title || !content) return;

  if (type === 'set') {
    title.textContent = 'Chọn Bộ Từ Vựng';

    const isAllSelected = quizSettings.selectedSetIds.includes('all');

    let html = '<div class="scope-list scope-multiple">';

    html += `
      <label class="scope-list-item-checkbox ${isAllSelected ? 'selected' : ''}">
        <input type="checkbox" ${isAllSelected ? 'checked' : ''} data-quiz-scope-toggle="all">
        <span class="scope-checkmark"></span>
        <i class="fas fa-layer-group"></i>
        <span class="scope-item-name">Tất Cả Từ Vựng</span>
        <span class="count">${(appData.vocabulary || []).length}</span>
      </label>
    `;

    (appData.sets || []).forEach(set => {
      const count = (appData.vocabulary || []).filter(w => w.setId === set.id).length;
      const isSelected = quizSettings.selectedSetIds.includes(set.id);

      html += `
        <label class="scope-list-item-checkbox ${isSelected ? 'selected' : ''}" ${isAllSelected ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
          <input type="checkbox" ${isSelected ? 'checked' : ''} ${isAllSelected ? 'disabled' : ''} data-quiz-scope-toggle="${set.id}">
          <span class="scope-checkmark"></span>
          <i class="fas fa-folder" style="color:${set.color || '#e91e8c'}"></i>
          <span class="scope-item-name">${escapeHtml(set.name || '')}</span>
          <span class="count">${count}</span>
        </label>
      `;
    });

    html += '</div>';
    html += `
      <div class="scope-footer">
        <button class="btn-secondary" data-quiz-scope-close>Đóng</button>
        <button class="btn-primary" data-quiz-scope-confirm>
          <i class="fas fa-check"></i> Xác nhận
        </button>
      </div>
    `;
    content.innerHTML = html;
  } else if (type === 'date') {
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

  modal.classList.add('show');
}

export function closeQuizScopeSelector() {
  document.getElementById('quiz-scope-selector-modal')?.classList.remove('show');
}

export function refreshQuizScope() {
  quizSettings.selectedSetIds = ['all'];
  quizSettings.selectedDateRange = 'all';
  const a = document.getElementById('quiz-selected-set-name');
  const b = document.getElementById('quiz-selected-date-range');
  if (a) a.textContent = 'Tất Cả Từ Vựng';
  if (b) b.textContent = 'Tất Cả Ngày';
  showToast('Đã đặt lại phạm vi', 'success');
}

export function toggleQuizQuestionField(fieldId, checked) {
  if (checked) {
    if (!quizSettings.questionFields.includes(fieldId)) quizSettings.questionFields.push(fieldId);
  } else {
    quizSettings.questionFields = quizSettings.questionFields.filter(id => id !== fieldId);
  }
}

export function toggleQuizAnswerField(fieldId, checked) {
  if (checked) {
    if (!quizSettings.answerFields.includes(fieldId)) quizSettings.answerFields.push(fieldId);
  } else {
    quizSettings.answerFields = quizSettings.answerFields.filter(id => id !== fieldId);
  }
}

export function startQuizWithSettings() {
  getQuizSettingsFromForm();

  if (quizSettings.questionFields.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 mục làm câu hỏi!', 'error');
    return;
  }
  if (quizSettings.answerFields.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 mục làm đáp án!', 'error');
    return;
  }

  const words = getFilteredWordsForQuiz();
  if (words.length < 4) {
    showToast('Cần ít nhất 4 từ vựng để chơi trắc nghiệm!', 'error');
    return;
  }

  practiceWords = words;
  practiceIndex = 0;

  closeQuizSettings();
  showPracticeArea();            // bridge sang UI practice hiện tại
  renderQuizWithSettings();

  showToast(`Bắt đầu với ${words.length} câu hỏi`, 'success');
}

// ===== INTERNAL =====
function updateQuizSettingsCounts() {
  const vocab = appData.vocabulary || [];
  const unmarked = vocab.filter(w => !w.mastered && !w.bookmarked).length;
  const mastered = vocab.filter(w => w.mastered).length;
  const learning = vocab.filter(w => !w.mastered).length;
  const bookmarked = vocab.filter(w => w.bookmarked).length;

  setText('quiz-count-unmarked', unmarked);
  setText('quiz-count-mastered', mastered);
  setText('quiz-count-learning', learning);
  setText('quiz-count-bookmarked', bookmarked);

  // set max slider theo tổng từ hiện có (nếu muốn)
  const slider = document.getElementById('quiz-limit-slider');
  if (slider) slider.max = String(vocab.length || 100);
}

function renderQuizFieldSelectors() {
  const questionContainer = document.getElementById('quiz-question-fields');
  const answerContainer = document.getElementById('quiz-answer-fields');
  if (!questionContainer || !answerContainer) return;

  questionContainer.innerHTML = QUIZ_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox" ${quizSettings.questionFields.includes(f.id) ? 'checked' : ''} data-quiz-qfield="${f.id}">
      <span class="field-name">${f.label}</span>
    </label>
  `).join('');

  answerContainer.innerHTML = QUIZ_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox" ${quizSettings.answerFields.includes(f.id) ? 'checked' : ''} data-quiz-afield="${f.id}">
      <span class="field-name">${f.label}</span>
    </label>
  `).join('');
}

function getQuizSettingsFromForm() {
  quizSettings.includeUnmarked = document.getElementById('quiz-include-unmarked')?.checked ?? true;
  quizSettings.includeMastered = document.getElementById('quiz-include-mastered')?.checked ?? true;
  quizSettings.includeLearning = document.getElementById('quiz-include-learning')?.checked ?? true;
  quizSettings.includeBookmarked = document.getElementById('quiz-include-bookmarked')?.checked ?? true;

  const sortRadio = document.querySelector('input[name="quiz-sort"]:checked');
  quizSettings.sortBy = sortRadio?.value || 'random';

  quizSettings.autoSkip = document.getElementById('quiz-auto-skip')?.checked ?? false;
  quizSettings.autoNext = document.getElementById('quiz-auto-next')?.checked ?? true;

  return quizSettings;
}

function getFilteredWordsForQuiz() {
  let words = [...(appData.vocabulary || [])];

  if (!quizSettings.selectedSetIds.includes('all') && quizSettings.selectedSetIds.length > 0) {
    words = words.filter(w => quizSettings.selectedSetIds.includes(w.setId));
  }

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
      words = words.filter(w => new Date(w.createdAt) >= startDate);
    }
  }

  words = words.filter(w => {
    if (w.mastered && !quizSettings.includeMastered) return false;
    if (!w.mastered && !quizSettings.includeLearning) return false;
    return true;
  });

  switch (quizSettings.sortBy) {
    case 'newest': words.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest': words.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'az': words.sort((a, b) => a.word.localeCompare(b.word)); break;
    case 'za': words.sort((a, b) => b.word.localeCompare(a.word)); break;
    default: words.sort(() => Math.random() - 0.5); break;
  }

  if (quizSettings.limit > 0) {
    words = words.slice(0, quizSettings.limit);
  }

  return words;
}

function getWordFieldValue(word, fieldId) {
  const m = (word.meanings && word.meanings[0]) ? word.meanings[0] : {};
  const field = QUIZ_FIELDS.find(f => f.id === fieldId);
  if (!field) return '';

  const values = {
    word: word.word,
    phonetic: m.phoneticUS || m.phoneticUK || word.phonetic || '',
    pos: POS_MAPPING?.[m.pos] || m.pos || '',
    defEn: m.defEn || '',
    defVi: m.defVi || '',
    example: m.example || '',
    synonyms: m.synonyms || '',
    antonyms: m.antonyms || ''
  };

  return values[field.key] || '';
}

function renderQuizWithSettings() {
  clearQuizTimer();

  const word = practiceWords[practiceIndex];
  if (!word) {
    endPractice();
    return;
  }

  const questionFieldId = quizSettings.questionFields[Math.floor(Math.random() * quizSettings.questionFields.length)];
  const questionText = getWordFieldValue(word, questionFieldId);
  const questionField = QUIZ_FIELDS.find(f => f.id === questionFieldId);

  const availableAnswerFields = quizSettings.answerFields.filter(id => id !== questionFieldId);
  const answerFieldId = (availableAnswerFields.length ? availableAnswerFields : quizSettings.answerFields)[Math.floor(Math.random() * (availableAnswerFields.length || quizSettings.answerFields.length))];
  const answerField = QUIZ_FIELDS.find(f => f.id === answerFieldId);

  const correctAnswer = getWordFieldValue(word, answerFieldId);

  const wrongWords = practiceWords
    .filter(w => w.id !== word.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

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
      <div class="quiz-question-label">${escapeHtml(questionField?.label || 'Câu hỏi')}</div>
      <div class="quiz-word">${escapeHtml(questionText) || '(Không có dữ liệu)'}</div>

      <button class="btn-speak" data-quiz-speak-word="${escapeHtml(word.word)}" title="Nghe phát âm">
        <i class="fas fa-volume-up"></i>
      </button>

      <div class="quiz-answer-label">Chọn ${(answerField?.label || 'đáp án').toLowerCase()} đúng:</div>

      <div class="quiz-options">
        ${allAnswers.map(a => `
          <button class="quiz-option" data-quiz-answer="${a.correct ? '1' : '0'}" data-quiz-correct="${escapeHtml(correctAnswer)}">
            ${escapeHtml(a.text)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  updatePracticeProgress();

  if (quizSettings.timeLimit > 0) startQuizTimer();
}

function startQuizTimer() {
  clearQuizTimer();
  quizTimeRemaining = quizSettings.timeLimit;

  quizTimerInterval = setInterval(() => {
    quizTimeRemaining--;
    const display = document.getElementById('quiz-time-display');
    if (display) display.textContent = String(quizTimeRemaining);

    if (quizTimeRemaining <= 0) {
      clearQuizTimer();

      if (quizSettings.autoSkip) {
        showToast('Hết giờ!', 'error');
        setTimeout(() => nextQuizQuestion(), 500);
      } else {
        document.querySelectorAll('.quiz-option').forEach(opt => opt.disabled = true);
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

function checkQuizAnswerWithSettings(btn) {
  clearQuizTimer();

  const correct = btn.getAttribute('data-quiz-answer') === '1';
  const correctAnswer = btn.getAttribute('data-quiz-correct') || '';

  const word = practiceWords[practiceIndex];

  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.disabled = true;
    if (opt.getAttribute('data-quiz-answer') === '1') opt.classList.add('correct');
  });

  if (correct) {
    btn.classList.add('correct');
    showToast('Chính xác!', 'success');
  } else {
    btn.classList.add('wrong');
    showToast('Sai rồi!', 'error');
  }

  updateReviewHistory(word.id);
  saveData(appData);

  if (quizSettings.autoNext) {
    setTimeout(() => nextQuizQuestion(), 1200);
  }
}

function nextQuizQuestion() {
  practiceIndex++;
  if (practiceIndex >= practiceWords.length) {
    endPractice();
    return;
  }
  renderQuizWithSettings();
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

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== EVENT BINDING (module hoá) =====
export function initQuizSettings() {
  // Open settings button (practice card) vẫn gọi window.openQuizSettings hiện tại,
  // nhưng module hoá thì bind bằng event ở nơi gọi.
  // Tạm thời: expose để không sửa nhiều file khác một lúc.
  // Nếu muốn bỏ window hoàn toàn, mình sẽ hướng dẫn bước tiếp theo.
  window.openQuizSettings = openQuizSettings;
  window.closeQuizSettings = closeQuizSettings;
  window.switchQuizTab = switchQuizTab;
  window.adjustQuizLimit = adjustQuizLimit;
  window.updateQuizLimit = updateQuizLimit;
  window.adjustQuizTimer = adjustQuizTimer;
  window.updateQuizTimer = updateQuizTimer;
  window.openQuizScopeSelector = openQuizScopeSelector;
  window.closeQuizScopeSelector = closeQuizScopeSelector;
  window.refreshQuizScope = refreshQuizScope;
  window.toggleQuizQuestionField = toggleQuizQuestionField;
  window.toggleQuizAnswerField = toggleQuizAnswerField;
  window.startQuizWithSettings = startQuizWithSettings;

  // Bind event cho phần quiz practice (đáp án + nút speak) theo delegation
  document.addEventListener('click', (e) => {
    const speakBtn = e.target.closest('[data-quiz-speak-word]');
    if (speakBtn) {
      const w = speakBtn.getAttribute('data-quiz-speak-word');
      if (w) speak(w);
      return;
    }

    const opt = e.target.closest('.quiz-option');
    if (opt && opt.hasAttribute('data-quiz-answer')) {
      checkQuizAnswerWithSettings(opt);
      return;
    }

    // Scope selector events
    const scopeModal = document.getElementById('quiz-scope-selector-modal');
    if (scopeModal && scopeModal.classList.contains('show')) {
      const toggle = e.target.closest('[data-quiz-scope-toggle]');
      if (toggle) {
        const id = toggle.getAttribute('data-quiz-scope-toggle');
        const checked = toggle.checked;
        toggleQuizSetScopeInternal(id, checked);
        return;
      }

      if (e.target.closest('[data-quiz-scope-close]')) {
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
        const label = datePick.getAttribute('data-quiz-date-label') || 'Tất Cả Ngày';
        const el = document.getElementById('quiz-selected-date-range');
        if (el) el.textContent = label;
        closeQuizScopeSelector();
      }
    }

    // Field selectors (question/answer)
    const qcb = e.target.closest('input[data-quiz-qfield]');
    if (qcb) {
      toggleQuizQuestionField(parseInt(qcb.getAttribute('data-quiz-qfield'), 10), qcb.checked);
      return;
    }
    const acb = e.target.closest('input[data-quiz-afield]');
    if (acb) {
      toggleQuizAnswerField(parseInt(acb.getAttribute('data-quiz-afield'), 10), acb.checked);
      return;
    }
  });

  console.log('✅ QuizSettings module initialized');
}

function toggleQuizSetScopeInternal(setId, checked) {
  if (!setId) return;

  if (setId === 'all') {
    if (checked) {
      quizSettings.selectedSetIds = ['all'];
      document.querySelectorAll('#quiz-scope-selector-content .scope-list-item-checkbox').forEach(item => {
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
      document.querySelectorAll('#quiz-scope-selector-content .scope-list-item-checkbox').forEach(item => {
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

  document.querySelectorAll('#quiz-scope-selector-content .scope-list-item-checkbox').forEach(item => {
    const input = item.querySelector('input');
    item.classList.toggle('selected', !!input?.checked);
  });
}
