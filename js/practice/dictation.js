/* ===== DICTATION MODE (Settings-driven, schema-aware, common header) ===== */

import {
  initPractice,
  getCurrentWord,
  submitAnswer,
  finishPractice,
  getPracticeState,
  getWordsByScope,
  resetPractice,
  skipWord,
  showPracticeArea
} from './practiceEngine.js';

import { speak, stopSpeaking } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { appData } from '../core/state.js';

/* ===== SETTINGS / STATE ===== */
const DEFAULT_SETTINGS = {
  shuffle: true,
  speed: 1,

  // field ids (1..8)
  listenFieldIds: [1],
  hintFieldIds: [5],

  scoring: 'exact',        // exact | half | partial | lenient
  showAnswer: false,
  strictMode: false,

  autoNext: true,
  autoCorrect: false,

  maxReplay: 0             // 0=unlimited
};

let settings = { ...DEFAULT_SETTINGS };

// per-question
let playCount = 0;
let hintIndex = 0;
let answered = false;

let currentListenFieldId = 1;
let lastCorrectText = '';

let autoNextTimer = null;
let uiBound = false;

/* ===== FIELD LABELS ===== */
const FIELD_LABEL = {
  1: 'Từ vựng',
  2: 'Phát âm',
  3: 'Loại từ',
  4: 'Định nghĩa (EN)',
  5: 'Nghĩa (VI)',
  6: 'Ví dụ',
  7: 'Từ đồng nghĩa',
  8: 'Từ trái nghĩa'
};

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

/* ===== SCHEMA HELPERS ===== */
function primaryMeaning(word) {
  return (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};
}

function norm(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ').trim();
  return String(v).trim();
}

function getFieldText(word, fieldId) {
  const m = primaryMeaning(word);

  switch (Number(fieldId)) {
    case 1: return norm(word?.word);
    case 2: return norm(m.phoneticUS || m.phoneticUK || word?.phonetic);
    case 3: return norm(POS_MAPPING[m.pos] || m.pos || word?.partOfSpeech);
    case 4: return norm(m.defEn);
    case 5: return norm(m.defVi);
    case 6: return norm(m.example);
    case 7: return norm(m.synonyms);
    case 8: return norm(m.antonyms);
    default: return '';
  }
}

function normalizeFieldIds(arr, fallback) {
  const out = Array.isArray(arr)
    ? arr.map(Number).filter(n => Number.isFinite(n) && n >= 1 && n <= 8)
    : [];
  return out.length ? out : [...fallback];
}

function pickListenFieldId() {
  const pool = normalizeFieldIds(settings.listenFieldIds, [1]);
  return pool[Math.floor(Math.random() * pool.length)];
}

function getSpeakLangForListenField(fieldId) {
  // If listening to Vietnamese meaning, speak Vietnamese
  if (Number(fieldId) === 5) return 'vi-VN';
  const voice = appData?.settings?.voice;
  if (typeof voice === 'string' && voice.trim()) return voice.trim();
  return 'en-US';
}

/* ===== SCORING ===== */
function normalizeText(s, strictMode) {
  let t = String(s ?? '').trim().replace(/\s+/g, ' ');
  if (!strictMode) t = t.toLowerCase();
  return t;
}

function levenshtein(a, b) {
  const s = String(a ?? '');
  const t = String(b ?? '');
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = t[i - 1] === s[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

function similarityRatio(a, b) {
  const s1 = String(a ?? '');
  const s2 = String(b ?? '');
  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length >= s2.length ? s2 : s1;
  if (!longer.length) return 1;
  const dist = levenshtein(longer, shorter);
  return (longer.length - dist) / longer.length;
}

function evaluateAnswer(userInput, correctText) {
  const mode = settings.scoring || 'exact';
  const strict = !!settings.strictMode;

  const u = normalizeText(userInput, strict);
  const c = normalizeText(correctText, strict);
  if (!u) return { isCorrect: false, ratio: 0 };

  if (mode === 'exact') return { isCorrect: u === c, ratio: u === c ? 1 : similarityRatio(u, c) };
  const ratio = similarityRatio(u, c);
  if (mode === 'half') return { isCorrect: ratio >= 0.5, ratio };
  if (mode === 'partial') return { isCorrect: ratio > 0, ratio };
  if (mode === 'lenient') return { isCorrect: levenshtein(u, c) <= 2, ratio };
  return { isCorrect: u === c, ratio };
}

function autoCorrectSuggestion(userInput, correctText) {
  if (!settings.autoCorrect) return null;
  const strict = !!settings.strictMode;

  const u = normalizeText(userInput, strict);
  const c = normalizeText(correctText, strict);
  if (!u || !c) return null;

  const r = similarityRatio(u, c);
  if (r >= 0.6 && r < 1) return String(correctText || '').trim();
  return null;
}

/* ===== START ===== */
export function startDictation(scope, incomingSettings = {}) {
  showPracticeArea?.();

  const words = getWordsByScope(scope);
  if (!words.length) {
    showToast('Không có từ để luyện tập!', 'warning');
    return;
  }

  settings = {
    ...DEFAULT_SETTINGS,
    speed: appData?.settings?.speed || 1,
    ...incomingSettings
  };

  settings.listenFieldIds = normalizeFieldIds(settings.listenFieldIds, [1]);
  settings.hintFieldIds = normalizeFieldIds(settings.hintFieldIds, [5]);

  window.practiceScope = scope;
  window.dictationSettings = settings;

  if (!initPractice('dictation', words, settings)) return;

  renderDictationUI();
  bindDictationUIEvents();
  showCurrentDictation();
  showToast(`Bắt đầu nghe - viết ${getPracticeState().total} từ`, 'success');
}

/* ===== UI (NO header riêng) ===== */
function renderDictationUI() {
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="dictation-card" data-render="dictation-ui">
      <div class="dictation-main">
        <div class="dictation-prompt">
          <p>Nghe và gõ lại nội dung</p>
        </div>

        <div class="dictation-player">
          <button class="btn-play" id="btn-play-audio" type="button" data-action="dictation-play">
            <i class="fas fa-volume-up"></i>
          </button>
          <span class="play-count" id="play-count"></span>
        </div>

        <div class="dictation-hint" id="dictation-hint" style="display:none;"></div>

        <div class="dictation-input">
          <input
            type="text"
            id="dictation-answer"
            placeholder="Nhập nội dung bạn nghe được..."
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          >
        </div>

        <div class="dictation-feedback" id="dictation-feedback"></div>
      </div>

      <div class="dictation-controls">
        <button class="btn-secondary" type="button" data-action="dictation-hint">
          <i class="fas fa-lightbulb"></i> Gợi ý
        </button>

        <button class="btn-primary" type="button" data-action="dictation-check">
          <i class="fas fa-check"></i> Kiểm tra
        </button>

        <button class="btn-secondary" id="btn-skip" type="button" data-action="dictation-skip">
          Bỏ qua <i class="fas fa-forward"></i>
        </button>
      </div>
    </div>
  `;
}

function bindDictationUIEvents() {
  if (uiBound) return;
  uiBound = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-render="dictation-ui"] [data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    if (action === 'dictation-play') playDictationAudio();
    if (action === 'dictation-hint') showDictationHint();
    if (action === 'dictation-check') checkDictationAnswer();
    if (action === 'dictation-skip') skipDictationAction();
  });

  document.addEventListener('keydown', (e) => {
    const input = document.getElementById('dictation-answer');
    if (!input) return;
    if (document.activeElement !== input) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      checkDictationAnswer();
    }
  });
}

/* ===== PER QUESTION ===== */
function showCurrentDictation() {
  clearAutoNextTimer();

  const word = getCurrentWord();
  if (!word) {
    showDictationResults();
    return;
  }

  answered = false;
  playCount = 0;
  hintIndex = 0;

  currentListenFieldId = pickListenFieldId();
  lastCorrectText = getFieldText(word, currentListenFieldId);

  // fallback if selected field empty
  if (!lastCorrectText) {
    for (const fid of settings.listenFieldIds) {
      const t = getFieldText(word, fid);
      if (t) {
        currentListenFieldId = fid;
        lastCorrectText = t;
        break;
      }
    }
  }
  if (!lastCorrectText) {
    currentListenFieldId = 1;
    lastCorrectText = norm(word?.word);
  }

  const input = document.getElementById('dictation-answer');
  const feedback = document.getElementById('dictation-feedback');
  const hint = document.getElementById('dictation-hint');
  const skipBtn = document.getElementById('btn-skip');

  if (input) {
    input.value = '';
    input.disabled = false;
    input.classList.remove('correct', 'wrong');
    input.focus();
  }
  if (feedback) feedback.innerHTML = '';
  if (hint) { hint.style.display = 'none'; hint.innerHTML = ''; }
  if (skipBtn) skipBtn.innerHTML = `Bỏ qua <i class="fas fa-forward"></i>`;

  updatePlayCount();
  updateCommonHeaderProgress();

  setTimeout(() => playDictationAudio(), 250);
}

/* ===== AUDIO ===== */
export function playDictationAudio() {
  const word = getCurrentWord();
  if (!word) return;

  const limit = Number(settings.maxReplay || 0);
  const unlimited = !limit || limit <= 0;

  if (!unlimited && playCount >= limit) {
    showToast('Đã hết lượt nghe!', 'warning');
    return;
  }

  playCount++;
  updatePlayCount();

  const rate = Number(settings.speed || appData?.settings?.speed || 1);
  const text = String(lastCorrectText || '').trim();
  if (!text) {
    showToast('Không có nội dung để đọc', 'warning');
    return;
  }

  const lang = getSpeakLangForListenField(currentListenFieldId);
  speak(text, { lang, rate });
}

function updatePlayCount() {
  const playCountEl = document.getElementById('play-count');
  const playBtn = document.getElementById('btn-play-audio');

  const limit = Number(settings.maxReplay || 0);
  const unlimited = !limit || limit <= 0;

  if (unlimited) {
    if (playCountEl) playCountEl.textContent = 'Không giới hạn lượt nghe';
    if (playBtn) playBtn.disabled = false;
    return;
  }

  const remaining = Math.max(0, limit - playCount);
  if (playCountEl) playCountEl.textContent = remaining > 0 ? `Còn ${remaining} lượt nghe` : 'Hết lượt nghe';
  if (playBtn) playBtn.disabled = remaining <= 0;
}

/* ===== HINT ===== */
export function showDictationHint() {
  const word = getCurrentWord();
  if (!word) return;

  const hintEl = document.getElementById('dictation-hint');
  if (!hintEl) return;

  const hintIds = normalizeFieldIds(settings.hintFieldIds, [5]);
  const fieldId = hintIds[hintIndex % hintIds.length];
  hintIndex++;

  const label = FIELD_LABEL[fieldId] || 'Gợi ý';
  const text = getFieldText(word, fieldId);

  hintEl.innerHTML = `<i class="fas fa-lightbulb"></i> <strong>${escapeHtml(label)}:</strong> ${escapeHtml(text || '(trống)')}`;
  hintEl.style.display = 'block';
}

/* ===== CHECK ===== */
export function checkDictationAnswer() {
  const word = getCurrentWord();
  if (!word) return;

  const input = document.getElementById('dictation-answer');
  const feedback = document.getElementById('dictation-feedback');
  const skipBtn = document.getElementById('btn-skip');

  if (!input || !feedback) return;
  if (answered) return;

  const userAnswer = input.value.trim();
  if (!userAnswer) {
    showToast('Vui lòng nhập câu trả lời!', 'warning');
    input.focus();
    return;
  }

  const { isCorrect, ratio } = evaluateAnswer(userAnswer, lastCorrectText);
  submitAnswer(userAnswer, isCorrect);

  answered = true;
  input.disabled = true;

  if (isCorrect) {
    feedback.innerHTML = `<div class="feedback-correct"><i class="fas fa-check-circle"></i><span>Chính xác!</span></div>`;
    input.classList.add('correct');
  } else {
    const suggestion = autoCorrectSuggestion(userAnswer, lastCorrectText);

    const answerBlock = settings.showAnswer
      ? `<div class="feedback-answer"><small>Đáp án: <strong>${escapeHtml(lastCorrectText)}</strong></small></div>`
      : '';

    const suggestBlock = suggestion
      ? `<div class="feedback-suggest"><small>Gợi ý sửa: <strong>${escapeHtml(suggestion)}</strong></small></div>`
      : '';

    feedback.innerHTML = `
      <div class="feedback-wrong"><i class="fas fa-times-circle"></i><span>Sai rồi!</span></div>
      ${answerBlock}
      ${suggestBlock}
      <div class="feedback-meta"><small>Độ giống: ${Math.round(ratio * 100)}%</small></div>
    `;
    input.classList.add('wrong');
  }

  if (skipBtn) skipBtn.innerHTML = `Tiếp theo <i class="fas fa-arrow-right"></i>`;

  updateCommonHeaderProgress();
  if (settings.autoNext) startAutoNext(5);
}

/* ===== SKIP ===== */
function skipDictationAction() {
  if (answered) {
    showCurrentDictation();
    return;
  }

  skipWord();
  answered = true;

  const input = document.getElementById('dictation-answer');
  const feedback = document.getElementById('dictation-feedback');
  const skipBtn = document.getElementById('btn-skip');

  if (input) {
    input.disabled = true;
    input.classList.add('wrong');
  }

  const answerLine = settings.showAnswer
    ? `<div class="feedback-answer"><small>Đáp án: <strong>${escapeHtml(lastCorrectText)}</strong></small></div>`
    : '';

  if (feedback) {
    feedback.innerHTML = `<div class="feedback-skipped"><i class="fas fa-forward"></i><span>Đã bỏ qua.</span></div>${answerLine}`;
  }

  if (skipBtn) {
    skipBtn.innerHTML = `Tiếp theo <i class="fas fa-arrow-right"></i>`;
  }

  updateCommonHeaderProgress();

  if (settings.autoNext) {
    startAutoNext(5);
  }
}

/* ===== AUTO NEXT ===== */
function startAutoNext(seconds) {
  clearAutoNextTimer();

  const s = Math.max(1, Number(seconds || 2));
  let remaining = s;

  const skipBtn = document.getElementById('btn-skip');
  if (skipBtn) skipBtn.innerHTML = `Tiếp theo (${remaining}s) <i class="fas fa-arrow-right"></i>`;

  autoNextTimer = setInterval(() => {
    remaining--;
    if (skipBtn) skipBtn.innerHTML = `Tiếp theo (${Math.max(0, remaining)}s) <i class="fas fa-arrow-right"></i>`;
    if (remaining <= 0) {
      clearAutoNextTimer();
      showCurrentDictation();
    }
  }, 1000);
}

function clearAutoNextTimer() {
  if (autoNextTimer) {
    clearInterval(autoNextTimer);
    autoNextTimer = null;
  }
}

/* ===== COMMON HEADER PROGRESS ===== */
function updateCommonHeaderProgress() {
  const state = getPracticeState();
  const bar = document.getElementById('practice-progress-bar');
  const text = document.getElementById('practice-progress-text');
  if (bar?.style) bar.style.width = `${state.progress}%`;
  if (text) text.textContent = `${state.currentIndex}/${state.total}`;
}

/* ===== RESULTS ===== */
function showDictationResults() {
  stopSpeaking();
  clearAutoNextTimer();

  const result = finishPractice();
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="practice-results dictation-results">
      <div class="results-header">
        <i class="fas fa-headphones"></i>
        <h2>Kết quả nghe - viết</h2>
      </div>

      <div class="results-stats">
        <div class="stats-grid">
          <div class="stat-item"><span class="value">${result.total}</span><span class="label">Tổng số</span></div>
          <div class="stat-item correct"><span class="value">${result.score}</span><span class="label">Đúng</span></div>
          <div class="stat-item wrong"><span class="value">${result.wrong}</span><span class="label">Sai</span></div>
          <div class="stat-item"><span class="value">${result.skipped ?? 0}</span><span class="label">Bỏ qua</span></div>
          <div class="stat-item"><span class="value">${result.accuracy}%</span><span class="label">Chính xác</span></div>
          <div class="stat-item"><span class="value">${formatDuration(result.duration)}</span><span class="label">Thời gian</span></div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn-primary" type="button" data-practice-action="dictation-restart">
          <i class="fas fa-redo"></i> Làm lại
        </button>
        <button class="btn-secondary" type="button" data-practice-action="practice-exit">
          <i class="fas fa-home"></i> Quay lại luyện tập
        </button>
      </div>
    </div>
  `;

  const bar = document.getElementById('practice-progress-bar');
  const text = document.getElementById('practice-progress-text');
  if (bar?.style) bar.style.width = '100%';
  if (text) text.textContent = `${result.total}/${result.total}`;
}

/* ===== NAV ===== */
export function restartDictation() {
  startDictation(window.practiceScope, window.dictationSettings);
}

export function exitDictation() {
  stopSpeaking();
  clearAutoNextTimer();
  resetPractice();
  window.hidePracticeArea?.();
}

/* ===== UTILS ===== */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return mins > 0 ? `${mins}p ${secs}s` : `${secs}s`;
}

export function renderDictation() {
  renderDictationUI();
  bindDictationUIEvents();
  showCurrentDictation();
}
window.renderDictation = renderDictation;

/* ===== GLOBALS ===== */
window.startDictation = startDictation;
window.playDictationAudio = playDictationAudio;
window.showDictationHint = showDictationHint;
window.checkDictationAnswer = checkDictationAnswer;

window.restartDictation = restartDictation;
window.exitDictation = exitDictation;

export { startDictation as run };
