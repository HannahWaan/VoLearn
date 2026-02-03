/* ===== TYPING MODE (Settings-driven, schema-aware, common header) ===== */

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

/* ===== SETTINGS ===== */
const DEFAULT_SETTINGS = {
  shuffle: true,
  limit: 0,

  // aligned with typingSettings / dictation field ids
  answerFieldIds: [1], // required: at least 1
  hintFieldIds: [5],   // required: at least 1

  scoring: 'exact',    // exact | half | partial | lenient
  showAnswer: false,
  strictMode: false,

  autoNext: true,
  autoCorrect: false,

  showFirstLetter: true,
  showLength: true,

  timeLimit: 0,        // seconds (0 = off)
  caseSensitive: false // legacy compat (map to strictMode)
};

let settings = { ...DEFAULT_SETTINGS };

/* ===== PER-QUESTION STATE ===== */
let uiBound = false;

let currentAnswerFieldId = 1;
let currentCorrectAnswer = '';
let currentHintFieldIds = [];

let answered = false;

let typingTimer = null;
let timeLeft = 0;

let autoNextTimer = null;
let currentMeaningIndex = 0;

/* ===== FIELDS (1..8 like Dictation/Quiz) ===== */
const TYPING_FIELDS = [
  { id: 1, label: 'Từ vựng' },
  { id: 2, label: 'Phát âm' },
  { id: 3, label: 'Loại từ' },
  { id: 4, label: 'Định nghĩa (EN)' },
  { id: 5, label: 'Nghĩa (VI)' },
  { id: 6, label: 'Ví dụ' },
  { id: 7, label: 'Từ đồng nghĩa' },
  { id: 8, label: 'Từ trái nghĩa' }
];
const FIELD_LABEL = Object.fromEntries(TYPING_FIELDS.map(f => [f.id, f.label]));

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

function primaryMeaning(word) {
  return (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};
}

function norm(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ').trim();
  return String(v).trim();
}

function getTypingFieldValue(word, fieldId) {
  const meanings = word?.meanings || [];
  const m = meanings[currentMeaningIndex] || meanings[0] || {};
  
  const norm = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.filter(Boolean).join(', ').trim();
    return String(v).trim();
  };
  
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

function pickRandomFrom(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return a[Math.floor(Math.random() * a.length)];
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

function evaluateTypingAnswer(userInput, correctText, scoring, strictMode) {
  const u = normalizeText(userInput, strictMode);
  const c = normalizeText(correctText, strictMode);
  if (!u) return { isCorrect: false, ratio: 0 };

  if (scoring === 'exact') return { isCorrect: u === c, ratio: u === c ? 1 : similarityRatio(u, c) };
  const ratio = similarityRatio(u, c);
  if (scoring === 'half') return { isCorrect: ratio >= 0.5, ratio };
  if (scoring === 'partial') return { isCorrect: ratio > 0, ratio };
  if (scoring === 'lenient') return { isCorrect: levenshtein(u, c) <= 2, ratio };
  return { isCorrect: u === c, ratio };
}

/* ===== START ===== */
export function startTyping(scope, incomingSettings = {}) {
  showPracticeArea?.();

  const words = getWordsByScope(scope);
  if (!words.length) {
    showToast('Không có từ để luyện tập!', 'warning');
    return;
  }

  settings = { ...DEFAULT_SETTINGS, ...incomingSettings };

  // compat: caseSensitive -> strictMode
  if (typeof settings.strictMode !== 'boolean' && typeof settings.caseSensitive === 'boolean') {
    settings.strictMode = settings.caseSensitive;
  }

  settings.answerFieldIds = normalizeFieldIds(settings.answerFieldIds, [1]);
  settings.hintFieldIds = normalizeFieldIds(settings.hintFieldIds, [5]);

  window.practiceScope = scope;
  window.typingSettings = settings;

  clearAutoNextTimer();

  if (!initPractice('typing', words, settings)) return;

  renderTypingUI();
  bindTypingUIEvents();
  showCurrentTyping();

  showToast(`Bắt đầu luyện gõ ${getPracticeState().total} từ`, 'success');
}

/* ===== UI ===== */
function renderTypingUI() {
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="typing-container" data-render="typing-ui">
      <div class="typing-main">
        <div class="typing-prompt">
          <div class="typing-title" id="typing-answer-label"></div>
          <div class="typing-meaning" id="typing-meaning"></div>
        </div>

        <div class="typing-reveal" id="typing-reveal" style="display:none;"></div>

        <div class="typing-timer" id="typing-timer" style="display:none;">
          <i class="fas fa-stopwatch"></i>
          <span id="typing-timer-text"></span>
        </div>

        <div class="typing-input">
          <input
            id="typing-input"
            type="text"
            placeholder="Nhập câu trả lời..."
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>

        <div class="typing-feedback" id="typing-feedback"></div>

        <div class="typing-actions">
          <button class="btn-secondary" type="button" data-action="typing-speak">
            <i class="fas fa-volume-up"></i> Nghe
          </button>

          <button class="btn-secondary" type="button" data-action="typing-skip">
            Bỏ qua <i class="fas fa-forward"></i>
          </button>

          <button class="btn-primary" type="button" data-action="typing-check">
            <i class="fas fa-check"></i> Kiểm tra
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindTypingUIEvents() {
  if (uiBound) return;
  uiBound = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-render="typing-ui"] [data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    if (action === 'typing-check') checkTypingAnswer();
    if (action === 'typing-skip') skipTyping();
    if (action === 'typing-speak') speakTypingWord();
  });

  document.addEventListener('keydown', (e) => {
    const input = document.getElementById('typing-input');
    if (!input) return;
    if (document.activeElement !== input) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      checkTypingAnswer();
    }
  });
}

/* ===== QUESTION RENDER ===== */
function showCurrentTyping() {
  stopTypingTimer();
  clearAutoNextTimer();

  const state = getPracticeState();
  const s = state?.settings || {};

  const word = getCurrentWord();
  if (!word) {
    showTypingResults();
    return;
  }

  answered = false;

  // === Random chọn 1 meaning cho câu hỏi này ===
  const meanings = word.meanings || [];
  if (meanings.length > 1) {
    currentMeaningIndex = Math.floor(Math.random() * meanings.length);
  } else {
    currentMeaningIndex = 0;
  }

  const answerFieldIds = normalizeFieldIds(s.answerFieldIds, [1]);
  const hintFieldIds = normalizeFieldIds(s.hintFieldIds, [5]);

  // Random 1 answer field each question
  currentAnswerFieldId = pickRandomFrom(answerFieldIds) ?? 1;
  currentCorrectAnswer = getTypingFieldValue(word, currentAnswerFieldId);

  // If chosen field empty, try other answer fields; finally fallback to word
  if (!currentCorrectAnswer) {
    for (const fid of answerFieldIds) {
      const t = getTypingFieldValue(word, fid);
      if (t) {
        currentAnswerFieldId = fid;
        currentCorrectAnswer = t;
        break;
      }
    }
  }
  if (!currentCorrectAnswer) {
    currentAnswerFieldId = 1;
    currentCorrectAnswer = norm(word?.word);
  }

  // Hint fields exclude current answer field
  currentHintFieldIds = hintFieldIds.filter(id => id !== currentAnswerFieldId);
  if (currentHintFieldIds.length === 0) {
    currentHintFieldIds = [1].filter(id => id !== currentAnswerFieldId);
  }

  // Label
  const labelEl = document.getElementById('typing-answer-label');
  if (labelEl) labelEl.textContent = `Gõ: ${FIELD_LABEL[currentAnswerFieldId] || 'Câu trả lời'}`;

  // Hints render at #typing-meaning
  const hintEl = document.getElementById('typing-meaning');
  if (hintEl) {
    const parts = [];

    const correctTrim = String(currentCorrectAnswer || '').trim();
    if (s.showFirstLetter) {
      const first = correctTrim.slice(0, 1);
      if (first) parts.push(`<div class="typing-hint-line"><strong>Chữ cái đầu:</strong> ${escapeHtml(first)}</div>`);
    }
    if (s.showLength) {
      const len = correctTrim.length;
      if (len) parts.push(`<div class="typing-hint-line"><strong>Độ dài:</strong> ${len}</div>`);
    }

    for (const hid of currentHintFieldIds) {
      const txt = getTypingFieldValue(word, hid);
      if (!txt) continue;
      parts.push(`<div class="typing-hint-line"><strong>${escapeHtml(FIELD_LABEL[hid] || 'Gợi ý')}:</strong> ${escapeHtml(txt)}</div>`);
    }

    hintEl.innerHTML = parts.length ? parts.join('') : `<div class="typing-hint-line">Không có gợi ý.</div>`;
  }

  // Reveal
  const revealEl = document.getElementById('typing-reveal');
  if (revealEl) {
    revealEl.style.display = 'none';
    revealEl.innerHTML = '';
  }

  // Input + feedback
  const input = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');
  if (input) {
    input.value = '';
    input.disabled = false;
    input.classList.remove('correct', 'wrong');
    input.focus();
  }
  if (feedback) feedback.innerHTML = '';

  // Timer
  const tl = Number(s.timeLimit || 0);
  if (tl > 0) startTypingTimer(tl);
  else renderTypingTimerOff();

  updateHeaderProgress();
}

/* ===== TIMER ===== */
function startTypingTimer(seconds) {
  stopTypingTimer();
  timeLeft = Math.max(1, Number(seconds || 1));

  const timerEl = document.getElementById('typing-timer');
  if (timerEl) timerEl.style.display = '';

  renderTypingTimerText();

  typingTimer = setInterval(() => {
    timeLeft--;
    renderTypingTimerText();
    if (timeLeft <= 0) {
      stopTypingTimer();
      onTypingTimeout();
    }
  }, 1000);
}

function renderTypingTimerText() {
  const text = document.getElementById('typing-timer-text');
  if (text) text.textContent = `${timeLeft}s`;
}

function renderTypingTimerOff() {
  const timerEl = document.getElementById('typing-timer');
  if (timerEl) timerEl.style.display = 'none';
}

function stopTypingTimer() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
}

function onTypingTimeout() {
  if (answered) return;

  skipWord();
  answered = true;

  const s = getPracticeState()?.settings || {};
  const feedback = document.getElementById('typing-feedback');
  const revealEl = document.getElementById('typing-reveal');
  const input = document.getElementById('typing-input');

  if (input) {
    input.disabled = true;
    input.classList.add('wrong');
  }

  if (feedback) {
    feedback.innerHTML = `<div class="feedback-skipped"><i class="fas fa-forward"></i><span>Hết giờ.</span></div>`;
  }

  if (s.showAnswer && revealEl) {
    revealEl.style.display = '';
    revealEl.innerHTML = `<small>Đáp án: <strong>${escapeHtml(currentCorrectAnswer)}</strong></small>`;
  }

  updateHeaderProgress();

  if (s.autoNext) startTypingAutoNext(5);
}

/* ===== ACTIONS ===== */
function checkTypingAnswer() {
  const state = getPracticeState();
  const s = state?.settings || {};

  const inputEl = document.getElementById('typing-input');
  const feedbackEl = document.getElementById('typing-feedback');
  const revealEl = document.getElementById('typing-reveal');

  if (!inputEl || !feedbackEl) return;
  if (answered) return;

  const userAnswer = inputEl.value.trim();
  if (!userAnswer) {
    showToast('Vui lòng nhập câu trả lời!', 'warning');
    inputEl.focus();
    return;
  }

  const strictMode = !!s.strictMode;
  const scoring = String(s.scoring || 'exact');

  const { isCorrect, ratio } = evaluateTypingAnswer(userAnswer, currentCorrectAnswer, scoring, strictMode);

  submitAnswer(userAnswer, isCorrect);
  answered = true;

  stopTypingTimer();
  inputEl.disabled = true;

  if (isCorrect) {
    feedbackEl.innerHTML = `<div class="feedback-correct"><i class="fas fa-check-circle"></i><span>Chính xác!</span></div>`;
    inputEl.classList.add('correct');
  } else {
    inputEl.classList.add('wrong');

    let suggestBlock = '';
    if (s.autoCorrect && ratio >= 0.6 && ratio < 1) {
      suggestBlock = `<div class="feedback-suggest"><small>Gợi ý sửa: <strong>${escapeHtml(currentCorrectAnswer)}</strong></small></div>`;
    }

    feedbackEl.innerHTML = `
      <div class="feedback-wrong"><i class="fas fa-times-circle"></i><span>Sai rồi!</span></div>
      ${suggestBlock}
      <div class="feedback-meta"><small>Độ giống: ${Math.round(ratio * 100)}%</small></div>
    `;

    if (s.showAnswer && revealEl) {
      revealEl.style.display = '';
      revealEl.innerHTML = `<small>Đáp án: <strong>${escapeHtml(currentCorrectAnswer)}</strong></small>`;
    }
  }

  updateHeaderProgress();

  if (s.autoNext) startTypingAutoNext(5);
}

export function skipTyping() {
  const state = getPracticeState();
  const s = state?.settings || {};

  stopTypingTimer();
  clearAutoNextTimer();

  if (answered) {
    showCurrentTyping();
    return;
  }

  skipWord();
  answered = true;

  const input = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');
  const revealEl = document.getElementById('typing-reveal');

  if (input) {
    input.disabled = true;
    input.classList.add('wrong');
  }

  if (feedback) {
    feedback.innerHTML = `<div class="feedback-skipped"><i class="fas fa-forward"></i><span>Đã bỏ qua.</span></div>`;
  }

  if (s.showAnswer && revealEl) {
    revealEl.style.display = '';
    revealEl.innerHTML = `<small>Đáp án: <strong>${escapeHtml(currentCorrectAnswer)}</strong></small>`;
  }

  updateHeaderProgress();

  if (s.autoNext) startTypingAutoNext(5);
}

export function speakTypingWord() {
  const word = getCurrentWord();
  if (!word) return;

  const text = norm(word?.word);
  if (!text) return;

  const rate = Number(appData?.settings?.speed || 1);
  speak(text, { lang: appData?.settings?.voice || 'en-US', rate });
}

/* ===== HEADER PROGRESS ===== */
function updateHeaderProgress() {
  const state = getPracticeState();
  const bar = document.getElementById('practice-progress-bar');
  const text = document.getElementById('practice-progress-text');

  if (bar?.style) bar.style.width = `${state.progress}%`;
  if (text) text.textContent = `${state.currentIndex}/${state.total}`;
}

/* ===== RESULTS ===== */
function showTypingResults() {
  clearAutoNextTimer();
  stopTypingTimer();
  stopSpeaking();

  const result = finishPractice();
  const container = document.getElementById('practice-content');
  if (!container) return;

  const wpm = result.duration > 0
    ? Math.round((result.total * 5) / (result.duration / 60))
    : 0;

  container.innerHTML = `
    <div class="practice-results typing-results">
      <div class="results-header">
        <i class="fas fa-keyboard"></i>
        <h2>Kết quả luyện gõ</h2>
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
            <span class="value">${result.skipped || 0}</span>
            <span class="label">Bỏ qua</span>
          </div>
          <div class="stat-item">
            <span class="value">${wpm}</span>
            <span class="label">WPM (ước tính)</span>
          </div>
          <div class="stat-item">
            <span class="value">${formatDuration(result.duration)}</span>
            <span class="label">Thời gian</span>
          </div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn-primary" type="button" data-practice-action="typing-restart">
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
export function restartTyping() {
  startTyping(window.practiceScope, window.typingSettings);
}

export function exitTyping() {
  clearAutoNextTimer();
  stopTypingTimer();
  stopSpeaking();
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

/* ===== RESUME SUPPORT ===== */
export function renderTyping() {
  renderTypingUI();
  bindTypingUIEvents();
  showCurrentTyping();
}
window.renderTyping = renderTyping;

/* ===== AUTO NEXT (5s pause) ===== */
function clearAutoNextTimer() {
  if (autoNextTimer) {
    clearInterval(autoNextTimer);
    autoNextTimer = null;
  }
  const el = document.getElementById('typing-autonext');
  if (el) el.remove();
}

function startTypingAutoNext(seconds) {
  clearAutoNextTimer();

  let remaining = Math.max(1, Number(seconds || 5));

  const feedbackEl = document.getElementById('typing-feedback');
  if (feedbackEl) {
    feedbackEl.insertAdjacentHTML(
      'beforeend',
      `<div class="feedback-meta" id="typing-autonext"><small>Tự động chuyển sau ${remaining}s</small></div>`
    );
  }

  autoNextTimer = setInterval(() => {
    remaining--;

    const meta = document.querySelector('#typing-autonext small');
    if (meta) meta.textContent = `Tự động chuyển sau ${Math.max(0, remaining)}s`;

    if (remaining <= 0) {
      clearAutoNextTimer();
      showCurrentTyping();
    }
  }, 1000);
}

/* ===== GLOBALS ===== */
window.startTyping = startTyping;
window.skipTyping = skipTyping;
window.speakTypingWord = speakTypingWord;
window.exitTyping = exitTyping;
window.restartTyping = restartTyping;

export { startTyping as run };
