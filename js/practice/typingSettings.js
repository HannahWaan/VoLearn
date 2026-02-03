/* ========================================
   VoLearn - Typing Settings (Test-style)
   No inline onclick. Uses scope-selector-modal (shared).
   ======================================== */

import { appData } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, closeAllModals } from '../ui/modalEngine.js';
import { showPracticeArea } from './practiceEngine.js';
import { startTyping } from './typing.js';

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

const TYPING_FIELDS = [
  { id: 1, key: 'word', label: 'Từ vựng' },
  { id: 2, key: 'phonetic', label: 'Phát âm' },
  { id: 3, key: 'pos', label: 'Loại từ' },
  { id: 4, key: 'defEn', label: 'Định nghĩa (EN)' },
  { id: 5, key: 'defVi', label: 'Nghĩa (VI)' },
  { id: 6, key: 'example', label: 'Ví dụ' },
  { id: 7, key: 'synonyms', label: 'Từ đồng nghĩa' },
  { id: 8, key: 'antonyms', label: 'Từ trái nghĩa' }
];

let typingSettings = {
  limit: 0,
  selectedSetIds: ['all'],
  selectedDateRange: 'all',

  includeUnmarked: true,
  includeMastered: true,
  includeLearning: true,
  includeBookmarked: true,

  sortBy: 'random',

  answerFields: [1],
  hintFields: [5],

  scoring: 'exact', // exact | half | partial | lenient

  showAnswer: false,
  strictMode: false,
  autoNext: true,
  autoCorrect: false,
  showFirstLetter: true,
  showLength: true
};

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

function clampInt(n, min, max) {
  const x = parseInt(n, 10);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function uniqWordsById(words) {
  const seen = new Set();
  const out = [];
  for (const w of words || []) {
    if (!w) continue;
    const key = w.id ?? w.word ?? JSON.stringify(w);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function getAllWords() {
  const words = [];
  if (Array.isArray(appData?.vocabulary)) words.push(...appData.vocabulary);
  if (Array.isArray(appData?.sets)) {
    for (const s of appData.sets) {
      if (Array.isArray(s?.words)) words.push(...s.words);
    }
  }
  return uniqWordsById(words);
}

function isMastered(w) { return !!w?.mastered; }
function isBookmarked(w) { return !!w?.bookmarked; }
function isLearning(w) { return !isMastered(w); }
function isUnmarked(w) { return !isMastered(w) && !isBookmarked(w); }

function updateTypingSettingsCounts() {
  const vocab = getAllWords();

  const unmarked = vocab.filter(isUnmarked).length;
  const mastered = vocab.filter(isMastered).length;
  const learning = vocab.filter(isLearning).length;
  const bookmarked = vocab.filter(isBookmarked).length;

  setText('typing-count-unmarked', unmarked);
  setText('typing-count-mastered', mastered);
  setText('typing-count-learning', learning);
  setText('typing-count-bookmarked', bookmarked);

  const slider = document.getElementById('typing-limit-slider');
  if (slider) {
    slider.max = String(vocab.length);
    const current = parseInt(slider.value || '0', 10);
    if (Number.isFinite(current) && current > vocab.length) {
      slider.value = String(vocab.length);
      updateTypingLimit(vocab.length);
    }
  }
}

function renderTypingFieldSelectors() {
  const answerContainer = document.getElementById('typing-answer-fields');
  const hintContainer = document.getElementById('typing-hint-fields');
  if (!answerContainer || !hintContainer) return;

  answerContainer.innerHTML = TYPING_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox" ${typingSettings.answerFields.includes(f.id) ? 'checked' : ''} data-typing-afield="${f.id}">
      <span class="field-name">${escapeHtml(f.label)}</span>
    </label>
  `).join('');

  hintContainer.innerHTML = TYPING_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox" ${typingSettings.hintFields.includes(f.id) ? 'checked' : ''} data-typing-hfield="${f.id}">
      <span class="field-name">${escapeHtml(f.label)}</span>
    </label>
  `).join('');
}

/* ===== limit controls ===== */
function updateTypingLimit(value) {
  const slider = document.getElementById('typing-limit-slider');
  const max = slider ? parseInt(slider.max || '0', 10) || 0 : 0;

  const v = clampInt(value, 0, max || 999999);
  typingSettings.limit = v;
  setText('typing-limit-value', v === 0 ? 'Không giới hạn' : `${v} câu`);
}

function adjustTypingLimit(delta) {
  const slider = document.getElementById('typing-limit-slider');
  if (!slider) return;

  const max = parseInt(slider.max || '0', 10) || 0;
  const current = parseInt(slider.value || '0', 10) || 0;

  const next = Math.max(0, Math.min(max, current + delta));
  slider.value = String(next);
  updateTypingLimit(next);
}

/* ===== modal open/close/tab ===== */
export function openTypingSettings() {
  updateTypingSettingsCounts();
  renderTypingFieldSelectors();
  openModal('typing-settings-modal');
}

export function closeTypingSettings() {
  closeAllModals();
}

export function switchTypingTab(tabName, btn) {
  document.querySelectorAll('#typing-settings-modal .settings-tab').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');

  document.querySelectorAll('#typing-settings-modal .settings-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`typing-tab-${tabName}`)?.classList.add('active');
}

/* ===== scope selector (shared scope-selector-modal) ===== */
function openTypingScopeSelector(type) {
  const title = document.getElementById('scope-selector-title');
  const content = document.getElementById('scope-selector-content');
  if (!title || !content) return;

  if (type === 'set') {
    title.textContent = 'Chọn Bộ Từ Vựng';

    const vocab = getAllWords();
    const sets = Array.isArray(appData?.sets) ? appData.sets : [];
    const isAllSelected = typingSettings.selectedSetIds.includes('all');

    let html = '<div class="scope-list scope-multiple">';

    html += `
      <label class="scope-list-item-checkbox ${isAllSelected ? 'selected' : ''}">
        <input type="checkbox" ${isAllSelected ? 'checked' : ''} data-typing-scope-toggle="all">
        <span class="scope-checkmark"></span>
        <i class="fas fa-layer-group"></i>
        <span class="scope-item-name">Tất Cả Từ Vựng</span>
        <span class="count">${vocab.length}</span>
      </label>
    `;

    sets.forEach(set => {
      const count = vocab.filter(w => w.setId === set.id).length;
      const isSelected = typingSettings.selectedSetIds.includes(set.id);

      html += `
        <label class="scope-list-item-checkbox ${isSelected ? 'selected' : ''}" ${isAllSelected ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
          <input type="checkbox"
            ${isSelected ? 'checked' : ''}
            ${isAllSelected ? 'disabled' : ''}
            data-typing-scope-toggle="${escapeHtml(set.id)}">
          <span class="scope-checkmark"></span>
          <i class="fas fa-folder" style="color:${escapeHtml(set.color || '#3b82f6')}"></i>
          <span class="scope-item-name">${escapeHtml(set.name || '')}</span>
          <span class="count">${count}</span>
        </label>
      `;
    });

    html += '</div>';
    html += `
      <div class="scope-footer">
        <button class="btn-secondary" type="button" data-typing-scope-close>Đóng</button>
        <button class="btn-primary" type="button" data-typing-scope-confirm>
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
        <div class="scope-list-item ${typingSettings.selectedDateRange === 'all' ? 'selected' : ''}"
             data-typing-date="all" data-typing-date-label="Tất Cả Ngày">
          <i class="fas fa-calendar"></i><span>Tất Cả Ngày</span>
        </div>
        <div class="scope-list-item ${typingSettings.selectedDateRange === 'today' ? 'selected' : ''}"
             data-typing-date="today" data-typing-date-label="Hôm nay">
          <i class="fas fa-calendar-day"></i><span>Hôm nay</span>
        </div>
        <div class="scope-list-item ${typingSettings.selectedDateRange === 'week' ? 'selected' : ''}"
             data-typing-date="week" data-typing-date-label="7 ngày qua">
          <i class="fas fa-calendar-week"></i><span>7 ngày qua</span>
        </div>
        <div class="scope-list-item ${typingSettings.selectedDateRange === 'month' ? 'selected' : ''}"
             data-typing-date="month" data-typing-date-label="30 ngày qua">
          <i class="fas fa-calendar-alt"></i><span>30 ngày qua</span>
        </div>
      </div>
    `;
  }

  openModal('scope-selector-modal');
}

function closeTypingScopeSelector() {
  closeModal('scope-selector-modal');
}

function refreshTypingScope() {
  typingSettings.selectedSetIds = ['all'];
  typingSettings.selectedDateRange = 'all';
  setText('typing-selected-set-name', 'Tất Cả Từ Vựng');
  setText('typing-selected-date-range', 'Tất Cả Ngày');
  showToast('Đã đặt lại phạm vi', 'success');
}

function toggleTypingSetScopeInternal(setId, checked) {
  if (setId === 'all') {
    if (checked) {
      typingSettings.selectedSetIds = ['all'];

      document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        const input = item.querySelector('input');
        const isAll = input?.getAttribute('data-typing-scope-toggle') === 'all';
        if (input && !isAll) {
          item.style.opacity = '0.5';
          item.style.pointerEvents = 'none';
          input.checked = false;
          input.disabled = true;
        }
      });
    } else {
      typingSettings.selectedSetIds = [];

      document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        item.style.opacity = '1';
        item.style.pointerEvents = 'auto';
        const input = item.querySelector('input');
        if (input) input.disabled = false;
      });
    }
  } else {
    typingSettings.selectedSetIds = typingSettings.selectedSetIds.filter(id => id !== 'all');

    if (checked) {
      if (!typingSettings.selectedSetIds.includes(setId)) typingSettings.selectedSetIds.push(setId);
    } else {
      typingSettings.selectedSetIds = typingSettings.selectedSetIds.filter(id => id !== setId);
    }
  }

  document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
    const input = item.querySelector('input');
    item.classList.toggle('selected', !!input?.checked);
  });
}

function updateTypingSetDisplay() {
  const display = document.getElementById('typing-selected-set-name');
  if (!display) return;

  if (typingSettings.selectedSetIds.includes('all') || typingSettings.selectedSetIds.length === 0) {
    display.textContent = 'Tất Cả Từ Vựng';
  } else if (typingSettings.selectedSetIds.length === 1) {
    const set = (appData.sets || []).find(s => s.id === typingSettings.selectedSetIds[0]);
    display.textContent = set?.name || 'Bộ từ vựng';
  } else {
    display.textContent = `${typingSettings.selectedSetIds.length} bộ từ vựng`;
  }
}

/* ===== read from form ===== */
function getTypingSettingsFromForm() {
  typingSettings.includeUnmarked = document.getElementById('typing-include-unmarked')?.checked ?? true;
  typingSettings.includeMastered = document.getElementById('typing-include-mastered')?.checked ?? true;
  typingSettings.includeLearning = document.getElementById('typing-include-learning')?.checked ?? true;
  typingSettings.includeBookmarked = document.getElementById('typing-include-bookmarked')?.checked ?? true;

  const sortRadio = document.querySelector('input[name="typing-sort"]:checked');
  typingSettings.sortBy = sortRadio?.value || 'random';

  const scoringRadio = document.querySelector('input[name="typing-scoring"]:checked');
  typingSettings.scoring = scoringRadio?.value || 'exact';

  typingSettings.showAnswer = document.getElementById('typing-show-answer')?.checked ?? false;
  typingSettings.strictMode = document.getElementById('typing-strict-mode')?.checked ?? false;
  typingSettings.autoNext = document.getElementById('typing-auto-next')?.checked ?? true;
  typingSettings.autoCorrect = document.getElementById('typing-auto-correct')?.checked ?? false;
  typingSettings.showFirstLetter = document.getElementById('typing-show-first-letter')?.checked ?? true;
  typingSettings.showLength = document.getElementById('typing-show-length')?.checked ?? true;

  return typingSettings;
}

/* ===== filter words ===== */
function getFilteredWordsForTyping() {
  let words = getAllWords();

  // set scope
  if (!typingSettings.selectedSetIds.includes('all') && typingSettings.selectedSetIds.length > 0) {
    words = words.filter(w => typingSettings.selectedSetIds.includes(w.setId));
  }

  // date scope
  if (typingSettings.selectedDateRange !== 'all') {
    const now = new Date();
    let startDate;

    if (typingSettings.selectedDateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (typingSettings.selectedDateRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else if (typingSettings.selectedDateRange === 'month') {
      startDate = new Date(now.getTime() - 30 * 86400000);
    }

    if (startDate) {
      words = words.filter(w => {
        if (!w?.createdAt) return true;
        return new Date(w.createdAt) >= startDate;
      });
    }
  }

  // include groups (OR logic)
  words = words.filter(w => {
    const mastered = isMastered(w);
    const bookmarked = isBookmarked(w);
    const unmarked = !mastered && !bookmarked;
    const learning = !mastered;

    return (
      (unmarked && typingSettings.includeUnmarked) ||
      (mastered && typingSettings.includeMastered) ||
      (learning && typingSettings.includeLearning) ||
      (bookmarked && typingSettings.includeBookmarked)
    );
  });

  // sort
  switch (typingSettings.sortBy) {
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
  if (typingSettings.limit > 0) words = words.slice(0, typingSettings.limit);

  return words;
}

/* ===== start ===== */
export function startTypingWithSettings() {
  getTypingSettingsFromForm();

  const answerIds = Array.isArray(typingSettings.answerFields) ? typingSettings.answerFields.map(Number).filter(Boolean) : [];
  const hintIds = Array.isArray(typingSettings.hintFields) ? typingSettings.hintFields.map(Number).filter(Boolean) : [];

  if (!answerIds.length) {
    showToast('Vui lòng chọn ít nhất 1 mục cần gõ!', 'error');
    return;
  }
  if (!hintIds.length) {
    showToast('Vui lòng chọn ít nhất 1 mục gợi ý!', 'error');
    return;
  }

  const words = getFilteredWordsForTyping();
  if (!words.length) {
    showToast('Không có từ vựng nào phù hợp!', 'error');
    return;
  }

  const scope = { type: 'custom', words };

  const runtimeSettings = {
    shuffle: true,
    limit: typingSettings.limit || 0,

    answerFieldIds: [...answerIds],
    hintFieldIds: [...hintIds],

    scoring: typingSettings.scoring || 'exact',
    showAnswer: !!typingSettings.showAnswer,
    strictMode: !!typingSettings.strictMode,
    autoNext: !!typingSettings.autoNext,
    autoCorrect: !!typingSettings.autoCorrect,
    showFirstLetter: !!typingSettings.showFirstLetter,
    showLength: !!typingSettings.showLength
  };

  // For restart compatibility
  window.practiceScope = scope;
  window.typingSettings = runtimeSettings;

  closeTypingSettings();

  try { showPracticeArea(); } catch (_) {}
  startTyping(scope, runtimeSettings);
}

/* ===== init wiring ===== */
export function initTypingSettings() {
  document.addEventListener('click', (e) => {
    // close
    if (e.target.closest('[data-action="typing-close"]')) {
      closeTypingSettings();
      return;
    }

    // tabs
    const tabBtn = e.target.closest('[data-typing-tab]');
    if (tabBtn && tabBtn.closest('#typing-settings-modal')) {
      switchTypingTab(tabBtn.getAttribute('data-typing-tab'), tabBtn);
      return;
    }

    // limit
    if (e.target.closest('[data-action="typing-limit-minus"]')) { adjustTypingLimit(-5); return; }
    if (e.target.closest('[data-action="typing-limit-plus"]')) { adjustTypingLimit(5); return; }

    // scope open/refresh
    const scopeOpen = e.target.closest('[data-action="typing-scope-open"]');
    if (scopeOpen) {
      openTypingScopeSelector(scopeOpen.getAttribute('data-scope-type'));
      return;
    }
    if (e.target.closest('[data-action="typing-scope-refresh"]')) { refreshTypingScope(); return; }

    // start
    if (e.target.closest('[data-action="typing-start"]')) { startTypingWithSettings(); return; }

    // scope modal close/confirm
    if (e.target.closest('[data-typing-scope-close]')) { closeTypingScopeSelector(); return; }
    if (e.target.closest('[data-typing-scope-confirm]')) {
      updateTypingSetDisplay();
      closeTypingScopeSelector();
      return;
    }

    // date picks
    const datePick = e.target.closest('[data-typing-date]');
    if (datePick) {
      typingSettings.selectedDateRange = datePick.getAttribute('data-typing-date') || 'all';
      setText('typing-selected-date-range', datePick.getAttribute('data-typing-date-label') || 'Tất Cả Ngày');
      closeTypingScopeSelector();
      return;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target?.id === 'typing-limit-slider') updateTypingLimit(e.target.value);
  });

  document.addEventListener('change', (e) => {
    const af = e.target.closest('input[data-typing-afield]');
    if (af) {
      const id = parseInt(af.getAttribute('data-typing-afield'), 10);
      if (!Number.isNaN(id)) {
        if (af.checked) {
          if (!typingSettings.answerFields.includes(id)) typingSettings.answerFields.push(id);
        } else {
          typingSettings.answerFields = typingSettings.answerFields.filter(x => x !== id);
        }
      }
      return;
    }

    const hf = e.target.closest('input[data-typing-hfield]');
    if (hf) {
      const id = parseInt(hf.getAttribute('data-typing-hfield'), 10);
      if (!Number.isNaN(id)) {
        if (hf.checked) {
          if (!typingSettings.hintFields.includes(id)) typingSettings.hintFields.push(id);
        } else {
          typingSettings.hintFields = typingSettings.hintFields.filter(x => x !== id);
        }
      }
      return;
    }

    const scopeToggle = e.target.closest('input[data-typing-scope-toggle]');
    if (scopeToggle) {
      toggleTypingSetScopeInternal(scopeToggle.getAttribute('data-typing-scope-toggle'), scopeToggle.checked);
      return;
    }
  });

  // expose API
  window.openTypingSettings = openTypingSettings;
  window.closeTypingSettings = closeTypingSettings;
  window.switchTypingTab = switchTypingTab;
  window.startTypingWithSettings = startTypingWithSettings;

  console.log('✅ TypingSettings module initialized');
}
