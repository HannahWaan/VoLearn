/* ===== DICTATION MODE (Settings-driven) ===== */
/* VoLearn - Nghe - Viết (render into #practice-content) */

import {
  initPractice,
  getCurrentWord,
  submitAnswer,
  finishPractice,
  getPracticeState,
  getWordsByScope,
  resetPractice,
  skipWord,
  showPracticeArea,
  hidePracticeArea
} from './practiceEngine.js';

import { speak, stopSpeaking } from '../utils/speech.js';
import { showToast } from '../ui/toast.js';
import { appData } from '../core/state.js';

/* ===== SETTINGS / STATE ===== */
const DEFAULT_SETTINGS = {
  shuffle: true,
  speed: 1,

  // from dictationSettings
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

// per-question state
let playCount = 0;
let hintIndex = 0;
let answered = false;

let currentListenFieldId = 1;
let lastCorrectText = '';

let autoNextTimer = null;
let uiBound = false;

/* ===== FIELD RESOLUTION ===== */
const FIELD_MAP = new Map([
  [1, { key: 'word', label: 'Từ vựng' }],
  [2, { key: 'phonetic', label: 'Phát âm' }],
  [3, { key: 'pos', label: 'Loại từ' }],
  [4, { key: 'defEn', label: 'Định nghĩa (EN)' }],
  [5, { key: 'defVi', label: 'Nghĩa (VI)' }],
  [6, { key: 'example', label: 'Ví dụ' }],
  [7, { key: 'synonyms', label: 'Từ đồng nghĩa' }],
  [8, { key: 'antonyms', label: 'Từ trái nghĩa' }]
]);

function getFieldText(word, fieldId) {
  const f = FIELD_MAP.get(Number(fieldId));
  if (!f) return '';
  const v = word?.[f.key];
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return String(v ?? '').trim();
}

function pickListenFieldId() {
  const ids = Array.isArray(settings?.listenFieldIds) ? settings.listenFieldIds : [];
  const pool = ids.map(Number).filter(n => Number.isFinite(n) && n >= 1 && n <= 8);

  if (!pool.length) return 1;

  return pool[Math.floor(Math.random() * pool.length)];
}

function getSpeakLangForListenField(fieldId) {
  // Nghĩa (VI) -> Vietnamese
  if (Number(fieldId) === 5) return 'vi-VN';

  // Others -> English voice setting if available
  const voice = appData?.settings?.voice;
  if (typeof voice === 'string' && voice.trim()) return voice.trim();
  return 'en-US';
}

/* ===== SCORING ===== */
function normalizeText(s, { strictMode = false } = {}) {
  let t = String(s ?? '').trim().replace(/\s+/g, ' ');
  if (!strictMode) t = t.toLowerCase();
  return t;
}

function levenshteinDistance(a, b) {
  const s = a ?? '';
  const t = b ?? '';
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarityRatio(a, b) {
  const s = String(a ?? '');
  const t = String(b ?? '');
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s, t) / maxLen;
}

function evaluateAnswer(userInput, correctText) {
  const mode = settings.scoring || 'exact';
  const strict = !!settings.strictMode;

  const u = normalizeText(userInput, { strictMode: strict });
  const c = normalizeText(correctText, { strictMode: strict });

  if (!u) return { isCorrect: false, ratio: 0 };

  if (mode === 'exact') {
    return { isCorrect: u === c, ratio: u === c ? 1 : similarityRatio(u, c) };
  }

  const ratio = similarityRatio(u, c);
  if (mode === 'half') return { isCorrect: ratio >= 0.5, ratio };
  if (mode === 'partial') return { isCorrect: ratio > 0, ratio };
  if (mode === 'lenient') return { isCorrect: ratio >= 0.8, ratio };

  return { isCorrect: u === c, ratio };
}

function autoCorrectSuggestion(userInput, correctText) {
  if (!settings.autoCorrect) return null;
  const u = String(userInput ?? '').trim();
  const c = String(correctText ?? '').trim();
  if (!u || !c) return null;

  const r = similarityRatio(
    normalizeText(u, { strictMode: !!settings.strictMode }),
    normalizeText(c, { strictMode: !!settings.strictMode })
  );
  if (r >= 0.6 && r < 1) return c;
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

  // merge settings
  settings = {
    ...DEFAULT_SETTINGS,
    speed: appData?.settings?.speed || 1,
    ...incomingSettings
  };

  // normalize arrays (critical)
  if (!Array.isArray(settings.listenFieldIds) || settings.listenFieldIds.length === 0) settings.listenFieldIds = [1];
  if (!Array.isArray(settings.hintFieldIds) || settings.hintFieldIds.length === 0) settings.hintFieldIds = [5];

  if (!initPractice('dictation', words, settings)) return;

  renderDictationUI();
  bindDictationUIEvents();
  showCurrentDictation();
}

/* ===== UI ===== */
function renderDictationUI() {
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="dictation-card" data-render="dictation-ui">
      <div class="dictation-header">
        <button class="btn-icon btn-back" type="button" data-action="dictation-exit" aria-label="Back">
          <i class="fas fa-arrow-left"></i>
        </button>

        <div class="dictation-progress">
          <span id="dictation-progress-text">0 / 0</span>
          <div class="progress-bar">
            <div id="dictation-progress-bar" class="progress-fill"></div>
          </div>
        </div>

        <div class="dictation-score">
          <i class="fas fa-check-circle text-success"></i>
          <span id="dictation-score">0</span>
        </div>
      </div>

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
        <button class="btn-secondary" id="btn-hint" type="button" data-action="dictation-hint">
          <i class="fas fa-lightbulb"></i> Gợi ý
        </button>

        <button class="btn-primary" id="btn-check" type="button" data-action="dictation-check">
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

    switch (action) {
      case 'dictation-exit': exitDictation(); break;
      case 'dictation-play': playDictationAudio(); break;
      case 'dictation-hint': showDictationHint(); break;
      case 'dictation-check': checkDictationAnswer(); break;
      case 'dictation-skip': skipDictationAction(); break;
      default: break;
    }
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

  // Critical: choose listen field from settings and derive correct text from that field
currentListenFieldId = pickListenFieldId();
lastCorrectText = getFieldText(word, currentListenFieldId);

// fallback only if the chosen field is empty
if (!lastCorrectText) {
  // try another field from the pool before falling back to word
  const pool = (settings.listenFieldIds || []).map(Number).filter(Boolean);
  for (const fid of pool) {
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
  lastCorrectText = String(word?.word ?? '').trim();
}

  // If field empty, fallback to word
  if (!lastCorrectText) {
    currentListenFieldId = 1;
    lastCorrectText = String(word?.word ?? '').trim();
  }

  const input = document.getElementById('dictation-answer');
  const feedback = document.getElementById('dictation-feedback');
  const hint = document.getElementById('dictation-hint');
  const checkBtn = document.getElementById('btn-check');
  const skipBtn = document.getElementById('btn-skip');

  if (input) {
    input.value = '';
    input.disabled = false;
    input.classList.remove('correct', 'wrong');
    input.focus();
  }
  if (feedback) feedback.innerHTML = '';
  if (hint) { hint.style.display = 'none'; hint.innerHTML = ''; }
  if (checkBtn) checkBtn.style.display = 'inline-flex';
  if (skipBtn) skipBtn.innerHTML = `Bỏ qua <i class="fas fa-forward"></i>`;

  updatePlayCount();
  updateDictationProgress();

  setTimeout(() => playDictationAudio(), 350);
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
  console.log('[DICTATION TTS]', { currentListenFieldId, text, lang, listenFieldIds: settings.listenFieldIds, hintFieldIds: settings.hintFieldIds });
  speak(text, { lang, rate });
}

function updatePlayCount() {
  const playCountEl = document.getElementById('play-count');
  const playBtn = document.getElementById('btn-play-audio');

  const limit = Number(settings.maxReplay || 0);
  const unlimited = !limit || limit <= 0;

  if (unlimited) {
    if (playCountEl) playCountEl.textContent = 'Không giới hạn lượt nghe';
    if (playBtn) { playBtn.disabled = false; playBtn.classList.remove('disabled'); }
    return;
  }

  const remaining = Math.max(0, limit - playCount);
  if (playCountEl) playCountEl.textContent = remaining > 0 ? `Còn ${remaining} lượt nghe` : 'Hết lượt nghe';

  if (playBtn) {
    playBtn.disabled = remaining <= 0;
    playBtn.classList.toggle('disabled', remaining <= 0);
  }
}

/* ===== HINTS ===== */
export function showDictationHint() {
  const word = getCurrentWord();
  if (!word) return;

  const hintEl = document.getElementById('dictation-hint');
  if (!hintEl) return;

  const hintIds = Array.isArray(settings.hintFieldIds) ? settings.hintFieldIds.map(Number).filter(Boolean) : [];
  if (!hintIds.length) {
    showToast('Bạn chưa chọn mục gợi ý.', 'warning');
    return;
  }

  const fieldId = hintIds[hintIndex % hintIds.length];
  hintIndex++;

  const label = FIELD_MAP.get(fieldId)?.label || 'Gợi ý';
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
  const checkBtn = document.getElementById('btn-check');
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
    feedback.innerHTML = `
      <div class="feedback-correct">
        <i class="fas fa-check-circle"></i>
        <span>Chính xác!</span>
      </div>
    `;
    input.classList.add('correct');
  } else {
    const suggestion = autoCorrectSuggestion(userAnswer, lastCorrectText);

    const answerBlock = settings.showAnswer
      ? `
        <div class="feedback-answer">
          <small>Đáp án: <strong>${escapeHtml(lastCorrectText)}</strong></small>
          ${suggestion ? `<div class="feedback-suggest"><small>Gợi ý sửa: <strong>${escapeHtml(suggestion)}</strong></small></div>` : ''}
          <div class="feedback-meta"><small>Độ giống: ${Math.round(ratio * 100)}%</small></div>
        </div>
      `
      : `
        ${suggestion ? `<div class="feedback-suggest"><small>Gợi ý sửa: <strong>${escapeHtml(suggestion)}</strong></small></div>` : ''}
        <div class="feedback-meta"><small>Độ giống: ${Math.round(ratio * 100)}%</small></div>
      `;

    feedback.innerHTML = `
      <div class="feedback-wrong">
        <i class="fas fa-times-circle"></i>
        <span>Sai rồi!</span>
      </div>
      ${answerBlock}
    `;
    input.classList.add('wrong');
  }

  if (checkBtn) checkBtn.style.display = 'none';
  if (skipBtn) skipBtn.innerHTML = `Tiếp theo <i class="fas fa-arrow-right"></i>`;

  updateDictationProgress();

  if (settings.autoNext) startAutoNext(2); // nếu muốn 5s: đổi thành 5
}

/* ===== SKIP ===== */
function skipDictationAction() {
  const word = getCurrentWord();
  if (!word) return;

  if (answered) {
    showCurrentDictation();
    return;
  }

  skipWord();

  answered = true;

  const input = document.getElementById('dictation-answer');
  const feedback = document.getElementById('dictation-feedback');

  if (input) {
    input.disabled = true;
    input.classList.add('wrong');
  }

  const answerLine = settings.showAnswer
    ? `<div class="feedback-answer"><small>Đáp án: <strong>${escapeHtml(lastCorrectText)}</strong></small></div>`
    : '';

  if (feedback) {
    feedback.innerHTML = `
      <div class="feedback-skipped">
        <i class="fas fa-forward"></i>
        <span>Đã bỏ qua.</span>
      </div>
      ${answerLine}
    `;
  }

  updateDictationProgress();
  setTimeout(() => showCurrentDictation(), 900);
}

/* ===== PROGRESS ===== */
function updateDictationProgress() {
  const state = getPracticeState();

  const progressText = document.getElementById('dictation-progress-text');
  const progressBar = document.getElementById('dictation-progress-bar');
  const scoreEl = document.getElementById('dictation-score');

  if (progressText) {
    progressText.textContent = `${Math.min(state.currentIndex + 1, state.total)} / ${state.total}`;
  }
  if (progressBar) {
    progressBar.style.width = `${state.progress}%`;
  }
  if (scoreEl) {
    scoreEl.textContent = String(state.score ?? 0);
  }
}

/* ===== AUTO NEXT ===== */
function startAutoNext(seconds) {
  clearAutoNextTimer();
  const s = Math.max(1, Number(seconds || 2));

  const skipBtn = document.getElementById('btn-skip');
  let remaining = s;

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

/* ===== RESULTS ===== */
function showDictationResults() {
  stopSpeaking();
  clearAutoNextTimer();

  const result = finishPractice();
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="practice-results dictation-results" data-render="dictation-results">
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
        <button class="btn-primary" type="button" data-action="dictation-restart">
          <i class="fas fa-redo"></i> Làm lại
        </button>
        <button class="btn-secondary" type="button" data-action="dictation-exit-results">
          <i class="fas fa-home"></i> Quay lại luyện tập
        </button>
      </div>
    </div>
  `;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'dictation-restart') restartDictation();
    if (action === 'dictation-exit-results') exitDictation();
  }, { once: true });
}

/* ===== NAV ===== */
export function exitDictation() {
  stopSpeaking();
  clearAutoNextTimer();
  resetPractice();
  hidePracticeArea?.();
}

export function restartDictation() {
  const scope = window.practiceScope;
  startDictation(scope, settings);
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

/* ===== WINDOW EXPORTS ===== */
window.startDictation = startDictation;
window.playDictationAudio = playDictationAudio;
window.showDictationHint = showDictationHint;
window.checkDictationAnswer = checkDictationAnswer;
window.exitDictation = exitDictation;
window.restartDictation = restartDictation;

export { startDictation as run };
