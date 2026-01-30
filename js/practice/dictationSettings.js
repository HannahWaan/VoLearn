/* ========================================
   VoLearn - Dictation Settings (Test-style)
   - No inline onclick
   - Uses shared scope-selector-modal
   - Starts dictation.js via startDictation(scope, runtimeSettings)
   ======================================== */

import { appData } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, closeAllModals } from '../ui/modalEngine.js';
import { showPracticeArea } from './practiceEngine.js';

/* ===== FIELD DEFINITIONS ===== */
const DICTATION_FIELDS = [
  { id: 1, key: 'word', label: 'Từ vựng' },
  { id: 2, key: 'phonetic', label: 'Phát âm' },
  { id: 3, key: 'pos', label: 'Loại từ' },
  { id: 4, key: 'defEn', label: 'Định nghĩa (EN)' },
  { id: 5, key: 'defVi', label: 'Nghĩa (VI)' },
  { id: 6, key: 'example', label: 'Ví dụ' },
  { id: 7, key: 'synonyms', label: 'Từ đồng nghĩa' },
  { id: 8, key: 'antonyms', label: 'Từ trái nghĩa' }
];

/* ===== SETTINGS STATE =====
   NOTE: listenFields/hintFields are the source of truth (UI checkboxes).
*/
let dictationSettings = {
  limit: 0,
  selectedSetIds: ['all'],
  selectedDateRange: 'all',

  includeUnmarked: true,
  includeMastered: true,
  includeLearning: true,
  includeBookmarked: true,

  sortBy: 'random',

  listenFields: [1],
  hintFields: [5],

  scoring: 'exact',     // exact | half | partial | lenient
  showAnswer: false,
  strictMode: false,
  autoNext: true,
  autoCorrect: false,

  maxReplay: 0          // 0 = unlimited
};

/* ===== helpers ===== */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
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
    const key = w.id ?? w._id ?? w.wordId ?? w.word ?? JSON.stringify(w);
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

function clampInt(n, min, max) {
  const v = parseInt(n, 10);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function ensureNonEmptyArrays() {
  if (!Array.isArray(dictationSettings.listenFields) || dictationSettings.listenFields.length === 0) {
    dictationSettings.listenFields = [1];
  }
  if (!Array.isArray(dictationSettings.hintFields) || dictationSettings.hintFields.length === 0) {
    dictationSettings.hintFields = [5];
  }
}

/* ===== counts + slider max ===== */
function updateDictationSettingsCounts() {
  const vocab = getAllWords();

  setText('dictation-count-unmarked', vocab.filter(isUnmarked).length);
  setText('dictation-count-mastered', vocab.filter(isMastered).length);
  setText('dictation-count-learning', vocab.filter(isLearning).length);
  setText('dictation-count-bookmarked', vocab.filter(isBookmarked).length);

  const slider = document.getElementById('dictation-limit-slider');
  if (slider) {
    slider.max = String(vocab.length);

    const current = parseInt(slider.value || '0', 10);
    if (Number.isFinite(current) && current > vocab.length) {
      slider.value = String(vocab.length);
      updateDictationLimit(vocab.length);
    }
  }
}

/* ===== field selector rendering ===== */
function renderDictationFieldSelectors() {
  ensureNonEmptyArrays();

  const listenContainer = document.getElementById('dictation-listen-fields');
  const hintContainer = document.getElementById('dictation-hint-fields');
  if (!listenContainer || !hintContainer) return;

  listenContainer.innerHTML = DICTATION_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox"
        ${dictationSettings.listenFields.includes(f.id) ? 'checked' : ''}
        data-dictation-listen="${f.id}">
      <span class="field-name">${escapeHtml(f.label)}</span>
    </label>
  `).join('');

  hintContainer.innerHTML = DICTATION_FIELDS.map((f, idx) => `
    <label class="field-item" data-field-id="${f.id}">
      <span class="field-order">${idx + 1}</span>
      <input type="checkbox"
        ${dictationSettings.hintFields.includes(f.id) ? 'checked' : ''}
        data-dictation-hint="${f.id}">
      <span class="field-name">${escapeHtml(f.label)}</span>
    </label>
  `).join('');
}

/* ===== limit controls ===== */
function updateDictationLimit(value) {
  const slider = document.getElementById('dictation-limit-slider');
  const max = slider ? parseInt(slider.max || '100', 10) : 100;

  dictationSettings.limit = clampInt(value, 0, Number.isFinite(max) ? max : 100);
  setText('dictation-limit-value', dictationSettings.limit === 0 ? 'Không giới hạn' : `${dictationSettings.limit} câu`);
}

function adjustDictationLimit(delta) {
  const slider = document.getElementById('dictation-limit-slider');
  if (!slider) return;

  const max = parseInt(slider.max || '0', 10) || 0;
  let newValue = parseInt(slider.value || '0', 10) + delta;
  newValue = Math.max(0, Math.min(max, newValue));

  slider.value = String(newValue);
  updateDictationLimit(newValue);
}

/* ===== replay controls ===== */
function updateDictationReplay(value) {
  dictationSettings.maxReplay = clampInt(value, 0, 10);
  setText('dictation-replay-value', dictationSettings.maxReplay === 0 ? 'Không giới hạn' : `${dictationSettings.maxReplay} lần`);
}

function adjustDictationReplay(delta) {
  const slider = document.getElementById('dictation-replay-slider');
  if (!slider) return;

  const max = parseInt(slider.max || '10', 10) || 10;
  let newValue = parseInt(slider.value || '0', 10) + delta;
  newValue = Math.max(0, Math.min(max, newValue));

  slider.value = String(newValue);
  updateDictationReplay(newValue);
}

/* ===== open/close/switch tab ===== */
export function openDictationSettings() {
  updateDictationSettingsCounts();
  renderDictationFieldSelectors();
  openModal('dictation-settings-modal');
}

export function closeDictationSettings() {
  closeAllModals();
}

export function switchDictationTab(tabName, btn) {
  document.querySelectorAll('#dictation-settings-modal .settings-tab').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');

  document.querySelectorAll('#dictation-settings-modal .settings-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`dictation-tab-${tabName}`)?.classList.add('active');
}

/* ===== scope selector (shared scope-selector-modal) ===== */
function openDictationScopeSelector(type) {
  const title = document.getElementById('scope-selector-title');
  const content = document.getElementById('scope-selector-content');
  if (!title || !content) return;

  const vocab = getAllWords();
  const sets = Array.isArray(appData?.sets) ? appData.sets : [];

  if (type === 'set') {
    title.textContent = 'Chọn Bộ Từ Vựng';

    const isAllSelected = dictationSettings.selectedSetIds.includes('all');

    let html = '<div class="scope-list scope-multiple">';

    html += `
      <label class="scope-list-item-checkbox ${isAllSelected ? 'selected' : ''}">
        <input type="checkbox" ${isAllSelected ? 'checked' : ''} data-dictation-scope-toggle="all">
        <span class="scope-checkmark"></span>
        <i class="fas fa-layer-group"></i>
        <span class="scope-item-name">Tất Cả Từ Vựng</span>
        <span class="count">${vocab.length}</span>
      </label>
    `;

    sets.forEach(set => {
      const count = vocab.filter(w => w.setId === set.id).length;
      const isSelected = dictationSettings.selectedSetIds.includes(set.id);

      html += `
        <label class="scope-list-item-checkbox ${isSelected ? 'selected' : ''}" ${isAllSelected ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
          <input type="checkbox"
            ${isSelected ? 'checked' : ''}
            ${isAllSelected ? 'disabled' : ''}
            data-dictation-scope-toggle="${escapeHtml(set.id)}">
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
        <button class="btn-secondary" type="button" data-dictation-scope-close>Đóng</button>
        <button class="btn-primary" type="button" data-dictation-scope-confirm>
          <i class="fas fa-check"></i> Xác nhận
        </button>
      </div>
    `;

    content.innerHTML = html;
    openModal('scope-selector-modal');
    return;
  }

  if (type === 'date') {
    title.textContent = 'Chọn Phạm Vi Ngày';
    content.innerHTML = `
      <div class="scope-list">
        <div class="scope-list-item ${dictationSettings.selectedDateRange === 'all' ? 'selected' : ''}"
             data-dictation-date="all" data-dictation-date-label="Tất Cả Ngày">
          <i class="fas fa-calendar"></i><span>Tất Cả Ngày</span>
        </div>
        <div class="scope-list-item ${dictationSettings.selectedDateRange === 'today' ? 'selected' : ''}"
             data-dictation-date="today" data-dictation-date-label="Hôm nay">
          <i class="fas fa-calendar-day"></i><span>Hôm nay</span>
        </div>
        <div class="scope-list-item ${dictationSettings.selectedDateRange === 'week' ? 'selected' : ''}"
             data-dictation-date="week" data-dictation-date-label="7 ngày qua">
          <i class="fas fa-calendar-week"></i><span>7 ngày qua</span>
        </div>
        <div class="scope-list-item ${dictationSettings.selectedDateRange === 'month' ? 'selected' : ''}"
             data-dictation-date="month" data-dictation-date-label="30 ngày qua">
          <i class="fas fa-calendar-alt"></i><span>30 ngày qua</span>
        </div>
      </div>
    `;
    openModal('scope-selector-modal');
  }
}

function closeDictationScopeSelector() {
  closeModal('scope-selector-modal');
}

function refreshDictationScope() {
  dictationSettings.selectedSetIds = ['all'];
  dictationSettings.selectedDateRange = 'all';
  setText('dictation-selected-set-name', 'Tất Cả Từ Vựng');
  setText('dictation-selected-date-range', 'Tất Cả Ngày');
  showToast('Đã đặt lại phạm vi', 'success');
}

function toggleDictationSetScopeInternal(setId, checked) {
  if (setId === 'all') {
    if (checked) {
      dictationSettings.selectedSetIds = ['all'];

      document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        const input = item.querySelector('input');
        const isAll = input?.getAttribute('data-dictation-scope-toggle') === 'all';

        if (input && !isAll) {
          item.style.opacity = '0.5';
          item.style.pointerEvents = 'none';
          input.checked = false;
          input.disabled = true;
        }
      });
    } else {
      dictationSettings.selectedSetIds = [];

      document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        item.style.opacity = '1';
        item.style.pointerEvents = 'auto';
        const input = item.querySelector('input');
        if (input) input.disabled = false;
      });
    }
  } else {
    dictationSettings.selectedSetIds = dictationSettings.selectedSetIds.filter(id => id !== 'all');

    if (checked) {
      if (!dictationSettings.selectedSetIds.includes(setId)) dictationSettings.selectedSetIds.push(setId);
    } else {
      dictationSettings.selectedSetIds = dictationSettings.selectedSetIds.filter(id => id !== setId);
    }
  }

  document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
    const input = item.querySelector('input');
    item.classList.toggle('selected', !!input?.checked);
  });
}

function updateDictationSetDisplay() {
  const display = document.getElementById('dictation-selected-set-name');
  if (!display) return;

  if (dictationSettings.selectedSetIds.includes('all') || dictationSettings.selectedSetIds.length === 0) {
    display.textContent = 'Tất Cả Từ Vựng';
  } else if (dictationSettings.selectedSetIds.length === 1) {
    const set = (appData.sets || []).find(s => s.id === dictationSettings.selectedSetIds[0]);
    display.textContent = set?.name || 'Bộ từ vựng';
  } else {
    display.textContent = `${dictationSettings.selectedSetIds.length} bộ từ vựng`;
  }
}

/* ===== read settings from form ===== */
function getDictationSettingsFromForm() {
  dictationSettings.includeUnmarked = document.getElementById('dictation-include-unmarked')?.checked ?? true;
  dictationSettings.includeMastered = document.getElementById('dictation-include-mastered')?.checked ?? true;
  dictationSettings.includeLearning = document.getElementById('dictation-include-learning')?.checked ?? true;
  dictationSettings.includeBookmarked = document.getElementById('dictation-include-bookmarked')?.checked ?? true;

  const sortRadio = document.querySelector('input[name="dictation-sort"]:checked');
  dictationSettings.sortBy = sortRadio?.value || 'random';

  const scoringRadio = document.querySelector('input[name="dictation-scoring"]:checked');
  dictationSettings.scoring = scoringRadio?.value || 'exact';

  dictationSettings.showAnswer = document.getElementById('dictation-show-answer')?.checked ?? false;
  dictationSettings.strictMode = document.getElementById('dictation-strict-mode')?.checked ?? false;
  dictationSettings.autoNext = document.getElementById('dictation-auto-next')?.checked ?? true;
  dictationSettings.autoCorrect = document.getElementById('dictation-auto-correct')?.checked ?? false;

  dictationSettings.limit = clampInt(document.getElementById('dictation-limit-slider')?.value ?? dictationSettings.limit, 0, 9999);
  dictationSettings.maxReplay = clampInt(document.getElementById('dictation-replay-slider')?.value ?? dictationSettings.maxReplay, 0, 10);

  ensureNonEmptyArrays();
  return dictationSettings;
}

/* ===== filtering words ===== */
function getFilteredWordsForDictation() {
  let words = getAllWords();

  // set scope
  if (!dictationSettings.selectedSetIds.includes('all') && dictationSettings.selectedSetIds.length > 0) {
    words = words.filter(w => dictationSettings.selectedSetIds.includes(w.setId));
  }

  // date scope
  if (dictationSettings.selectedDateRange !== 'all') {
    const now = new Date();
    let startDate;

    if (dictationSettings.selectedDateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dictationSettings.selectedDateRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else if (dictationSettings.selectedDateRange === 'month') {
      startDate = new Date(now.getTime() - 30 * 86400000);
    }

    if (startDate) {
      words = words.filter(w => {
        if (!w?.createdAt) return true;
        return new Date(w.createdAt) >= startDate;
      });
    }
  }

  // marks OR logic
  words = words.filter(w => {
    const mastered = isMastered(w);
    const bookmarked = isBookmarked(w);
    const unmarked = !mastered && !bookmarked;
    const learning = !mastered;

    return (
      (unmarked && dictationSettings.includeUnmarked) ||
      (mastered && dictationSettings.includeMastered) ||
      (learning && dictationSettings.includeLearning) ||
      (bookmarked && dictationSettings.includeBookmarked)
    );
  });

  // sort
  switch (dictationSettings.sortBy) {
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
  if (dictationSettings.limit > 0) {
    words = words.slice(0, dictationSettings.limit);
  }

  return words;
}

/* ===== START ===== */
export function startDictationWithSettings() {
  getDictationSettingsFromForm();

  // IMPORTANT: runtime keys dictation.js consumes
  const listenFieldIds = [...(dictationSettings.listenFields || [])].map(Number).filter(Boolean);
  const hintFieldIds = [...(dictationSettings.hintFields || [])].map(Number).filter(Boolean);

  if (!listenFieldIds.length) {
    showToast('Vui lòng chọn ít nhất 1 mục để nghe!', 'error');
    return;
  }

  const words = getFilteredWordsForDictation();
  if (!words.length) {
    showToast('Không có từ vựng nào phù hợp!', 'error');
    return;
  }

  closeAllModals();
  try { showPracticeArea(); } catch (_) {}

  const scope = { type: 'custom', words };

  const runtimeSettings = {
    shuffle: true,
    limit: dictationSettings.limit || 0,

    listenFieldIds,
    hintFieldIds,

    scoring: dictationSettings.scoring || 'exact',
    showAnswer: !!dictationSettings.showAnswer,
    strictMode: !!dictationSettings.strictMode,
    autoNext: !!dictationSettings.autoNext,
    autoCorrect: !!dictationSettings.autoCorrect,
    maxReplay: Number(dictationSettings.maxReplay || 0)
  };

  window.dictationSettings = runtimeSettings;
  window.practiceScope = scope;

  import('./dictation.js').then(m => {
     m.startDictation(scope, runtimeSettings);
   });
}

/* ===== init + event delegation ===== */
export function initDictationSettings() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="dictation-close"]')) { closeDictationSettings(); return; }

    const tabBtn = e.target.closest('[data-dictation-tab]');
    if (tabBtn && tabBtn.closest('#dictation-settings-modal')) {
      switchDictationTab(tabBtn.getAttribute('data-dictation-tab'), tabBtn);
      return;
    }

    if (e.target.closest('[data-action="dictation-limit-minus"]')) { adjustDictationLimit(-5); return; }
    if (e.target.closest('[data-action="dictation-limit-plus"]')) { adjustDictationLimit(5); return; }
    if (e.target.closest('[data-action="dictation-start"]')) { startDictationWithSettings(); return; }

    if (e.target.closest('[data-action="dictation-replay-minus"]')) { adjustDictationReplay(-1); return; }
    if (e.target.closest('[data-action="dictation-replay-plus"]')) { adjustDictationReplay(1); return; }

    const scopeOpen = e.target.closest('[data-action="dictation-scope-open"]');
    if (scopeOpen) { openDictationScopeSelector(scopeOpen.getAttribute('data-scope-type')); return; }

    if (e.target.closest('[data-action="dictation-scope-refresh"]')) { refreshDictationScope(); return; }

    if (e.target.closest('[data-dictation-scope-close]')) { closeDictationScopeSelector(); return; }
    if (e.target.closest('[data-dictation-scope-confirm]')) { updateDictationSetDisplay(); closeDictationScopeSelector(); return; }

    const datePick = e.target.closest('[data-dictation-date]');
    if (datePick) {
      dictationSettings.selectedDateRange = datePick.getAttribute('data-dictation-date') || 'all';
      setText('dictation-selected-date-range', datePick.getAttribute('data-dictation-date-label') || 'Tất Cả Ngày');
      closeDictationScopeSelector();
      return;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target?.id === 'dictation-limit-slider') updateDictationLimit(e.target.value);
    if (e.target?.id === 'dictation-replay-slider') updateDictationReplay(e.target.value);
  });

  document.addEventListener('change', (e) => {
    const lf = e.target.closest('input[data-dictation-listen]');
    if (lf) {
      const id = parseInt(lf.getAttribute('data-dictation-listen'), 10);
      if (!Number.isNaN(id)) {
        if (lf.checked) {
          if (!dictationSettings.listenFields.includes(id)) dictationSettings.listenFields.push(id);
        } else {
          dictationSettings.listenFields = dictationSettings.listenFields.filter(x => x !== id);
          // guard: don't allow empty (would make dictation unusable)
          if (dictationSettings.listenFields.length === 0) dictationSettings.listenFields = [1];
        }
      }
      return;
    }

    const hf = e.target.closest('input[data-dictation-hint]');
    if (hf) {
      const id = parseInt(hf.getAttribute('data-dictation-hint'), 10);
      if (!Number.isNaN(id)) {
        if (hf.checked) {
          if (!dictationSettings.hintFields.includes(id)) dictationSettings.hintFields.push(id);
        } else {
          dictationSettings.hintFields = dictationSettings.hintFields.filter(x => x !== id);
          // allow empty hints? keep at least one to avoid "trống"
          if (dictationSettings.hintFields.length === 0) dictationSettings.hintFields = [5];
        }
      }
      return;
    }

    const scopeToggle = e.target.closest('input[data-dictation-scope-toggle]');
    if (scopeToggle) {
      toggleDictationSetScopeInternal(scopeToggle.getAttribute('data-dictation-scope-toggle'), scopeToggle.checked);
      return;
    }
  });

  // expose
  window.openDictationSettings = openDictationSettings;
  window.closeDictationSettings = closeDictationSettings;
  window.switchDictationTab = switchDictationTab;
  window.startDictationWithSettings = startDictationWithSettings;

  console.log('✅ DictationSettings module initialized');
}
