import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { openModal, closeModal, closeAllModals } from '../ui/modalEngine.js';
import { showToast } from '../ui/toast.js';

const DEFAULT_WEAK_REVIEW_SETTINGS = {
  days: 14,         // 7 | 14 | 30
  limit: 30,        // 4..100
  runMode: 'typing',// typing | quiz

  // typing preset
  typingScoring: 'lenient',
  showAnswer: true,
  autoCorrect: true,
  autoNext: true
};

function getStore() {
  if (!appData.settings) appData.settings = {};
  if (!appData.settings.weakReviewSettings) {
    appData.settings.weakReviewSettings = { ...DEFAULT_WEAK_REVIEW_SETTINGS };
  }
  return appData.settings.weakReviewSettings;
}

function setStore(next) {
  if (!appData.settings) appData.settings = {};
  appData.settings.weakReviewSettings = { ...getStore(), ...next };
  saveData(appData);
  window.dispatchEvent(new CustomEvent('volearn:dataSaved'));
}

function qs(selector) {
  return document.querySelector(selector);
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function setRadioValue(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function renderWeakReviewSettingsToForm() {
  const s = getStore();

  setRadioValue('weak-review-days', String(s.days));
  setRadioValue('weak-review-run-mode', String(s.runMode));
  setRadioValue('weak-review-typing-scoring', String(s.typingScoring));

  const slider = qs('#weak-review-limit-slider');
  const valueEl = qs('#weak-review-limit-value');
  if (slider) slider.value = String(clamp(s.limit, 4, 100));
  if (valueEl) valueEl.textContent = String(clamp(s.limit, 4, 100));

  const showAnswer = qs('#weak-review-show-answer');
  const autoCorrect = qs('#weak-review-auto-correct');
  const autoNext = qs('#weak-review-auto-next');

  if (showAnswer) showAnswer.checked = !!s.showAnswer;
  if (autoCorrect) autoCorrect.checked = !!s.autoCorrect;
  if (autoNext) autoNext.checked = !!s.autoNext;
}

function getWeakReviewSettingsFromForm() {
  const days = clamp(getRadioValue('weak-review-days') || 14, 7, 30);
  const runMode = getRadioValue('weak-review-run-mode') || 'typing';
  const limit = clamp(qs('#weak-review-limit-slider')?.value || 30, 4, 100);

  const typingScoring = getRadioValue('weak-review-typing-scoring') || 'lenient';
  const showAnswer = !!qs('#weak-review-show-answer')?.checked;
  const autoCorrect = !!qs('#weak-review-auto-correct')?.checked;
  const autoNext = !!qs('#weak-review-auto-next')?.checked;

  return { days, runMode, limit, typingScoring, showAnswer, autoCorrect, autoNext };
}

function switchWeakReviewTab(tabKey) {
  const tabs = document.querySelectorAll('#weak-review-settings-modal [data-weak-review-tab]');
  const contents = document.querySelectorAll('#weak-review-settings-modal .settings-tab-content');

  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));

  const tabBtn = document.querySelector(`#weak-review-settings-modal [data-weak-review-tab="${tabKey}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  const content = document.getElementById(`weak-review-tab-${tabKey}`);
  if (content) content.classList.add('active');
}

function adjustLimit(delta) {
  const slider = qs('#weak-review-limit-slider');
  if (!slider) return;
  const next = clamp(Number(slider.value) + delta, 4, 100);
  slider.value = String(next);
  const valueEl = qs('#weak-review-limit-value');
  if (valueEl) valueEl.textContent = String(next);
}

function bindWeakReviewEvents() {
  document.addEventListener('click', (e) => {
    const modal = e.target.closest('#weak-review-settings-modal');
    if (!modal) return;

    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');

    if (action === 'weak-review-close') {
      closeModal('weak-review-settings-modal');
      return;
    }

    if (action === 'weak-review-limit-minus') {
      adjustLimit(-1);
      return;
    }
    if (action === 'weak-review-limit-plus') {
      adjustLimit(1);
      return;
    }

    if (action === 'weak-review-start') {
      const s = getWeakReviewSettingsFromForm();
      setStore(s);
      closeAllModals();

      if (window.startWeakReviewWithSettings) {
        window.startWeakReviewWithSettings(s);
      } else {
        showToast('Chưa sẵn sàng khởi chạy ôn từ yếu!', 'warning');
      }
      return;
    }
  });

  document.addEventListener('input', (e) => {
    const slider = e.target.closest('#weak-review-limit-slider');
    if (!slider) return;
    const valueEl = qs('#weak-review-limit-value');
    if (valueEl) valueEl.textContent = String(slider.value);
  });

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('#weak-review-settings-modal [data-weak-review-tab]');
    if (!tab) return;
    const key = tab.getAttribute('data-weak-review-tab');
    if (key) switchWeakReviewTab(key);
  });
}

export function openWeakReviewSettings() {
  renderWeakReviewSettingsToForm();
  openModal('weak-review-settings-modal');
}

export function initWeakReviewSettings() {
  getStore();
  bindWeakReviewEvents();
  window.openWeakReviewSettings = openWeakReviewSettings;
}
