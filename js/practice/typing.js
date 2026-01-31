/* ===== TYPING MODE ===== */
/* VoLearn - Typing (Settings-driven, keep style but use common practice header/back) */

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

/* ===== FIELD DEFINITIONS (match Dictation/Quiz) ===== */
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

/* ===== STATE ===== */
let startTime = null;
let currentAnswerFieldId = 1;
let currentCorrectAnswer = '';
let currentHintFieldIds = [];
let suggestionTimer = null;

/* ===== START ===== */
export function startTyping(scope, settings = {}) {
  const words = getWordsByScope(scope);
  if (!words.length) {
    showToast('Không có từ để luyện tập!', 'warning');
    return;
  }

  const defaults = {
    shuffle: true,
    limit: 0,

    answerFieldIds: [1],
    hintFieldIds: [5],

    scoring: 'exact', // exact|half|partial|lenient
    showAnswer: false,
    strictMode: false,
    autoNext: true,
    autoCorrect: false,
    showFirstLetter: true,
    showLength: true
  };

  const merged = { ...defaults, ...settings };
  merged.answerFieldIds = normalizeFieldIds(merged.answerFieldIds, [1]);
  merged.hintFieldIds = normalizeFieldIds(merged.hintFieldIds, [5]);

  if (!initPractice('typing', words, merged)) return;

  window.practiceScope = scope;
  window.typingSettings = merged;

  renderTypingUI();
  showCurrentTyping();
}

/* ===== UI ===== */
function renderTypingUI() {
  const container = document.getElementById('practice-content');
  if (!container) return;

  container.innerHTML = `
    <div class="typing-container" data-render="typing-ui">
      <div class="typing-header" style="justify-content:flex-end;">
        <div class="typing-stats">
          <span id="typing-score" class="stat-correct">0</span>
          <span>/</span>
          <span id="typing-wrong" class="stat-wrong">0</span>
        </div>
      </div>

      <div class="typing-main">
        <div class="typing-word-display">
          <div class="word-meaning" id="typing-meaning"></div>
          <div class="word-preview" id="word-preview"></div>
        </div>

        <div class="typing-input-area">
          <input type="text"
            id="typing-input"
            placeholder="Gõ câu trả lời ở đây..."
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false">
        </div>

        <div class="typing-feedback" id="typing-feedback"></div>
      </div>

      <div class="typing-controls">
        <button class="btn-icon btn-speak" type="button" data-action="typing-speak" title="Nghe phát âm">
          <i class="fas fa-volume-up"></i>
        </button>
        <button class="btn-secondary" type="button" data-action="typing-skip">
          Bỏ qua <i class="fas fa-forward"></i>
        </button>
      </div>
    </div>
  `;

  const input = document.getElementById('typing-input');
  if (input) {
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-render="typing-ui"] [data-action]');
    if (!btn) return;
    const act = btn.getAttribute('data-action');
    if (act === 'typing-speak') speakTypingWord();
    if (act === 'typing-skip') skipTyping();
  });
}

/* ===== FLOW ===== */
function showCurrentTyping() {
  clearSuggestionTimer();

  const word = getCurrentWord();
  if (!word) {
    showTypingResults();
    return;
  }

  startTime = Date.now();

  const { settings } = getPracticeState();
  const answerPool = normalizeFieldIds(settings?.answerFieldIds, [1]);
  const hintPool = normalizeFieldIds(settings?.hintFieldIds, [5]);

  currentAnswerFieldId = pickRandom(answerPool) ?? 1;
  currentCorrectAnswer = getFieldText(word, currentAnswerFieldId) || getFieldText(word, 1);

  currentHintFieldIds = hintPool.filter(id => Number(id) !== Number(currentAnswerFieldId));

  renderHints(word, settings);

  updatePreview('');
  resetInput();

  updateHeaderAndStats();
}

function resetInput() {
  const input = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');

  if (input) {
    input.value = '';
    input.disabled = false;
    input.classList.remove('correct', 'wrong');
    input.focus();
  }
  if (feedback) feedback.innerHTML = '';
}

function renderHints(word, settings) {
  const el = document.getElementById('typing-meaning');
  if (!el) return;

  const answerLabel = getFieldLabel(currentAnswerFieldId);

  const hintItems = currentHintFieldIds.map(id => {
    const label = getFieldLabel(id);
    const value = getFieldText(word, id);
    if (!value) return '';
    return `<div class="typing-hint-item"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`;
  }).filter(Boolean).join('');

  const letterHint = buildLetterHint(currentCorrectAnswer, settings);

  const suggestBlock = settings.autoCorrect
    ? `<div id="typing-suggestion" class="typing-suggestion" style="display:none;"></div>`
    : '';

  const showAnswerBlock = settings.showAnswer
    ? `
      <div class="typing-show-answer" style="margin-top:10px;">
        <button class="btn-secondary btn-small" type="button" data-action="typing-toggle-answer">
          <i class="fas fa-eye"></i> Xem đáp án
        </button>
        <div id="typing-answer-reveal" class="typing-answer-reveal" style="display:none; margin-top:10px;">
          <span class="answer-label">Đáp án:</span>
          <span class="answer-text"><strong>${escapeHtml(currentCorrectAnswer)}</strong></span>
        </div>
      </div>
    `
    : '';

  el.innerHTML = `
    <div class="typing-hints-wrap">
      <div class="typing-question-title">
        <i class="fas fa-keyboard"></i>
        Gõ: <strong>${escapeHtml(answerLabel)}</strong>
      </div>

      ${hintItems ? `<div class="typing-hints">${hintItems}</div>` : ''}

      ${letterHint ? `<div class="typing-letter-hint">${escapeHtml(letterHint)}</div>` : ''}

      ${suggestBlock}
      ${showAnswerBlock}
    </div>
  `;

  // bind toggle answer (no inline)
  if (settings.showAnswer) {
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="typing-toggle-answer"]');
      if (!btn) return;
      toggleTypingShowAnswer();
    }, { once: true });
  }
}

function onInput(e) {
  const typed = String(e.target.value ?? '');
  updatePreview(typed);

  const { settings } = getPracticeState();
  if (settings?.autoCorrect) scheduleSuggestion(typed, settings);
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('typing-input');
    if (!input) return;
    if (!String(input.value || '').trim()) return;
    completeTyping();
  }
}

function completeTyping() {
  const word = getCurrentWord();
  if (!word) return;

  clearSuggestionTimer();

  const state = getPracticeState();
  const settings = state.settings || {};

  const inputEl = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');
  const user = String(inputEl?.value ?? '').trim();

  if (!user) {
    showToast('Vui lòng nhập câu trả lời!', 'error');
    return;
  }

  const isCorrect = checkByScoring(user, currentCorrectAnswer, settings);
  submitAnswer(user, isCorrect);

  if (inputEl) {
    inputEl.disabled = true;
    inputEl.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  if (feedback) {
    feedback.innerHTML = isCorrect
      ? `<div class="feedback-correct"><i class="fas fa-check-circle"></i><span>Tuyệt vời! (${(((Date.now() - startTime) / 1000) || 0).toFixed(1)}s)</span></div>`
      : `<div class="feedback-wrong"><i class="fas fa-times-circle"></i><span>Đáp án đúng: <strong>${escapeHtml(currentCorrectAnswer)}</strong></span></div>`;
  }

  updateHeaderAndStats();

  if (settings.autoNext) {
    setTimeout(showCurrentTyping, isCorrect ? 1000 : 1500);
  } else {
    showToast('Nhấn Enter để sang câu tiếp theo hoặc bấm Bỏ qua', 'info');
  }
}

/* ===== ACTIONS ===== */
export function skipTyping() {
  submitAnswer('', false);
  showCurrentTyping();
}

export function speakTypingWord() {
  const word = getCurrentWord();
  if (word?.word) speak(word.word);
}

export function toggleTypingShowAnswer() {
  const el = document.getElementById('typing-answer-reveal');
  if (!el) return;
  el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
}

export function restartTyping() {
  startTyping(window.practiceScope, window.typingSettings);
}

/* ===== RESULTS ===== */
function showTypingResults() {
  const result = finishPractice();
  const container = document.getElementById('practice-content');
  if (!container) return;

  const wpm = result.duration > 0 ? Math.round((result.total * 5) / (result.duration / 60)) : 0;

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
          <div class="stat-item"><span class="value">${result.total}</span><span class="label">Tổng số</span></div>
          <div class="stat-item correct"><span class="value">${result.score}</span><span class="label">Đúng</span></div>
          <div class="stat-item wrong"><span class="value">${result.wrong}</span><span class="label">Sai</span></div>
          <div class="stat-item"><span class="value">${result.skipped || 0}</span><span class="label">Bỏ qua</span></div>
          <div class="stat-item"><span class="value">${wpm}</span><span class="label">WPM (ước tính)</span></div>
          <div class="stat-item"><span class="value">${formatDuration(result.duration)}</span><span class="label">Thời gian</span></div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn-primary" type="button" data-practice-action="typing-restart">
          <i class="fas fa-redo"></i> Làm lại
        </button>
        <button class="btn-secondary" type="button" data-practice-action="practice-exit">
          <i class="fas fa-home"></i> Quay lại
        </button>
      </div>
    </div>
  `;

  const bar = document.getElementById('practice-progress-bar');
  const text = document.getElementById('practice-progress-text');
  if (bar?.style) bar.style.width = '100%';
  if (text) text.textContent = `${result.total}/${result.total}`;
}

/* ===== HEADER/SATS ===== */
function updateHeaderAndStats() {
  const state = getPracticeState();

  const scoreEl = document.getElementById('typing-score');
  const wrongEl = document.getElementById('typing-wrong');
  if (scoreEl) scoreEl.textContent = String(state.score ?? 0);
  if (wrongEl) wrongEl.textContent = String(state.wrong ?? 0);

  const bar = document.getElementById('practice-progress-bar');
  const text = document.getElementById('practice-progress-text');
  if (bar?.style) bar.style.width = `${state.progress}%`;
  if (text) text.textContent = `${state.currentIndex}/${state.total}`;
}

/* ===== PREVIEW ===== */
function updatePreview(typed) {
  const previewEl = document.getElementById('word-preview');
  if (!previewEl) return;

  const { settings } = getPracticeState();
  const strict = !!settings?.strictMode;

  const target = String(currentCorrectAnswer ?? '');
  if (!target) { previewEl.innerHTML = ''; return; }

  const typedStr = String(typed ?? '');
  const a = strict ? typedStr : typedStr.toLowerCase();
  const b = strict ? target : target.toLowerCase();

  let html = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (i < a.length) {
      html += `<span class="char ${a[i] === b[i] ? 'correct' : 'wrong'}">${escapeHtml(ch)}</span>`;
    } else if (i === a.length) {
      html += `<span class="char current">${escapeHtml(ch)}</span>`;
    } else {
      html += `<span class="char pending">${escapeHtml(ch)}</span>`;
    }
  }
  previewEl.innerHTML = html;
}

/* ===== AUTO-CORRECT SUGGESTION ===== */
function scheduleSuggestion(typed, settings) {
  clearSuggestionTimer();
  suggestionTimer = setTimeout(() => showSuggestion(typed, settings), 80);
}
function clearSuggestionTimer() {
  if (suggestionTimer) { clearTimeout(suggestionTimer); suggestionTimer = null; }
}
function showSuggestion(rawTyped, settings) {
  const el = document.getElementById('typing-suggestion');
  if (!el) return;

  const typed = String(rawTyped ?? '').trim();
  if (!typed) { el.style.display = 'none'; return; }

  const strict = !!settings.strictMode;
  const target = String(currentCorrectAnswer ?? '').trim();
  if (!target) { el.style.display = 'none'; return; }

  const a = strict ? typed : typed.toLowerCase();
  const b = strict ? target : target.toLowerCase();

  if (a.length < 2) { el.style.display = 'none'; return; }

  if (b.startsWith(a)) {
    const remaining = target.slice(typed.length);
    el.innerHTML = `<span class="suggestion-text">${escapeHtml(typed)}<span class="suggestion-hint">${escapeHtml(remaining)}</span></span>`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* ===== SCORING ===== */
function checkByScoring(user, correct, settings) {
  const scoring = settings.scoring || 'exact';
  const strict = !!settings.strictMode;

  const u = strict ? String(user).trim() : String(user).trim().toLowerCase();
  const c = strict ? String(correct).trim() : String(correct).trim().toLowerCase();
  if (!c) return false;

  if (scoring === 'exact') return u === c;

  if (scoring === 'half') return similarityRatio(u, c) >= 0.5;

  if (scoring === 'partial') {
    if (!u) return false;
    if (c.includes(u)) return true;
    return hasAnyCorrectPositionChar(u, c);
  }

  if (scoring === 'lenient') return levenshtein(u, c) <= 2;

  return u === c;
}

function hasAnyCorrectPositionChar(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] === b[i]) return true;
  return false;
}

function levenshtein(a, b) {
  const s = String(a ?? '');
  const t = String(b ?? '');
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: n + 1 }, (_, i) => [i]);
  for (let j = 1; j <= m; j++) dp[0][j] = j;

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
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (!longer.length) return 1;
  const dist = levenshtein(longer, shorter);
  return (longer.length - dist) / longer.length;
}

/* ===== WORD SCHEMA ===== */
function primaryMeaning(word) {
  return (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};
}
function getFieldText(word, fieldId) {
  const m = primaryMeaning(word);
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
function getFieldLabel(id) {
  return (TYPING_FIELDS.find(f => f.id === Number(id))?.label) || 'Nội dung';
}
function normalizeFieldIds(arr, fallback) {
  const out = (Array.isArray(arr) ? arr : [])
    .map(Number)
    .filter(n => Number.isFinite(n) && n >= 1 && n <= 8);
  return out.length ? out : fallback;
}
function buildLetterHint(answer, settings) {
  const s = String(answer ?? '');
  if (!s) return '';
  const showFirst = !!settings.showFirstLetter;
  const showLen = !!settings.showLength;
  if (showFirst && showLen) return s.length <= 1 ? s : (s[0] + '_'.repeat(s.length - 1));
  if (showFirst) return s[0] + '...';
  if (showLen) return '_'.repeat(s.length);
  return '';
}
function pickRandom(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
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

/* ===== EXPORTS ===== */
export { startTyping as run };
window.startTyping = startTyping;
window.skipTyping = skipTyping;
window.speakTypingWord = speakTypingWord;
window.restartTyping = restartTyping;
window.toggleTypingShowAnswer = toggleTypingShowAnswer;
