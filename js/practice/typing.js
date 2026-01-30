/* ===== TYPING MODE ===== */
/* VoLearn v2 - Chế độ gõ từ (upgraded to match Test-style Typing Settings, keep VoLearn UI) */

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

/* ===== FIELD DEFINITIONS (match Dictation/Quiz) ===== */
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
let typingTimer = null;
let startTime = null;

/* per-question snapshot */
let currentAnswerFieldId = 1;
let currentCorrectAnswer = '';
let currentHintFieldIds = [];
let suggestionTimer = null;

/* ===== START TYPING ===== */
export function startTyping(scope, settings = {}) {
  const words = getWordsByScope(scope);

  if (!words.length) {
    showToast('Không có từ để luyện tập!', 'warning');
    return;
  }

  // Default settings (now aligned with typingSettings.js)
  const defaultSettings = {
    shuffle: true,
    limit: 0,

    answerFieldIds: [1],
    hintFieldIds: [5],

    scoring: 'exact', // exact | half | partial | lenient
    showAnswer: false,
    strictMode: false,
    autoNext: true,
    autoCorrect: false,
    showFirstLetter: true,
    showLength: true
  };

  const mergedSettings = { ...defaultSettings, ...settings };

  // normalize ids
  mergedSettings.answerFieldIds = normalizeFieldIdArray(mergedSettings.answerFieldIds, [1]);
  mergedSettings.hintFieldIds = normalizeFieldIdArray(mergedSettings.hintFieldIds, [5]);

  if (!initPractice('typing', words, mergedSettings)) return;

  // keep for restart
  window.practiceScope = scope;
  window.typingSettings = mergedSettings;

  renderTypingUI();
  showCurrentTyping();
}

/* ===== RENDER UI (keep VoLearn UI) ===== */
function renderTypingUI() {
  const container = document.getElementById('practice-area');
  if (!container) return;

  container.innerHTML = `
    <div class="typing-container">
      <div class="typing-header">
        <button class="btn-icon btn-back" onclick="window.exitTyping()">
          <i class="fas fa-arrow-left"></i>
        </button>

        <div class="typing-progress">
          <span id="typing-progress-text">1 / 10</span>
          <div class="progress-bar">
            <div id="typing-progress-bar" class="progress-fill"></div>
          </div>
        </div>

        <div class="typing-stats">
          <span id="typing-score" class="stat-correct">0</span>
          <span>/</span>
          <span id="typing-wrong" class="stat-wrong">0</span>
        </div>
      </div>

      <div class="typing-main">
        <div class="typing-word-display">
          <!-- We will render hints here instead of old meaning/phonetic -->
          <div class="word-meaning" id="typing-meaning"></div>

          <div class="word-preview" id="word-preview"></div>
        </div>

        <div class="typing-timer" id="typing-timer" style="display:none;">
          <i class="fas fa-clock"></i>
          <span id="timer-value">0:00</span>
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
        <button class="btn-icon btn-speak" onclick="window.speakTypingWord()" title="Nghe phát âm">
          <i class="fas fa-volume-up"></i>
        </button>
        <button class="btn-secondary" onclick="window.skipTyping()">
          Bỏ qua <i class="fas fa-forward"></i>
        </button>
      </div>
    </div>
  `;

  const input = document.getElementById('typing-input');
  if (input) {
    input.addEventListener('input', handleTypingInput);
    input.addEventListener('keydown', handleTypingKeydown);
  }
}

/* ===== SHOW CURRENT ===== */
function showCurrentTyping() {
  clearSuggestionTimer();
  stopTypingTimer();

  const word = getCurrentWord();
  if (!word) {
    showTypingResults();
    return;
  }

  startTime = Date.now();

  const state = getPracticeState();
  const settings = state.settings || {};

  // pick answer field for this question
  currentAnswerFieldId = pickRandom(settings.answerFieldIds) ?? 1;

  // compute correct answer text
  currentCorrectAnswer = getFieldText(word, currentAnswerFieldId);

  // if empty (field missing), fallback to word
  if (!currentCorrectAnswer) {
    currentAnswerFieldId = 1;
    currentCorrectAnswer = getFieldText(word, 1);
  }

  // hint fields list (exclude the answer field to avoid leaking)
  currentHintFieldIds = Array.isArray(settings.hintFieldIds) ? settings.hintFieldIds : [5];
  currentHintFieldIds = currentHintFieldIds.filter(id => Number(id) !== Number(currentAnswerFieldId));

  // Render hint panel (in #typing-meaning)
  renderHintsPanel(word, settings);

  // Render preview placeholders (length/first letter helpers)
  updateWordPreview('');

  // reset input
  const input = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');

  if (input) {
    input.value = '';
    input.disabled = false;
    input.classList.remove('correct', 'wrong');
    input.focus();
  }
  if (feedback) feedback.innerHTML = '';

  updateTypingProgress();
}

/* ===== HINT RENDERING (replace old meaning/phonetic) ===== */
function renderHintsPanel(word, settings) {
  const meaningEl = document.getElementById('typing-meaning');
  if (!meaningEl) return;

  const answerLabel = getFieldLabel(currentAnswerFieldId);
  const hintItems = currentHintFieldIds
    .map((id) => {
      const label = getFieldLabel(id);
      const value = getFieldText(word, id);
      if (!value) return '';
      return `
        <div class="typing-hint-item">
          <strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  const letterHint = buildLetterHint(currentCorrectAnswer, settings);

  const showAnswerBlock = settings.showAnswer
    ? `
      <div class="typing-show-answer">
        <button class="btn-secondary btn-small" type="button" onclick="window.toggleTypingShowAnswer()">
          <i class="fas fa-eye"></i> Xem đáp án
        </button>
        <div id="typing-answer-reveal" class="typing-answer-reveal" style="display:none; margin-top:10px;">
          <span class="answer-label">Đáp án:</span>
          <span class="answer-text"><strong>${escapeHtml(currentCorrectAnswer)}</strong></span>
        </div>
      </div>
    `
    : '';

  const suggestionBlock = settings.autoCorrect
    ? `<div id="typing-suggestion" class="typing-suggestion" style="display:none;"></div>`
    : '';

  meaningEl.innerHTML = `
    <div class="typing-hints-wrap">
      <div class="typing-question-title">
        <i class="fas fa-keyboard"></i>
        Gõ: <strong>${escapeHtml(answerLabel)}</strong>
      </div>

      ${hintItems ? `<div class="typing-hints">${hintItems}</div>` : ''}

      ${letterHint ? `<div class="typing-letter-hint">${escapeHtml(letterHint)}</div>` : ''}

      ${suggestionBlock}

      ${showAnswerBlock}
    </div>
  `;
}

/* ===== PREVIEW (use correctAnswer instead of word.word) ===== */
function updateWordPreview(typed) {
  const state = getPracticeState();
  const settings = state.settings || {};
  const previewEl = document.getElementById('word-preview');
  if (!previewEl) return;

  // Preview target is the correctAnswer for the current field
  const target = String(currentCorrectAnswer ?? '');
  if (!target) {
    previewEl.innerHTML = '';
    return;
  }

  const typedStr = String(typed ?? '');

  // highlight per-character correctness (based on strictMode)
  const strict = !!settings.strictMode;
  const a = strict ? typedStr : typedStr.toLowerCase();
  const b = strict ? target : target.toLowerCase();

  let html = '';
  for (let i = 0; i < target.length; i++) {
    const char = target[i];
    const typedChar = a[i];
    const correctChar = b[i];

    if (i < a.length) {
      const ok = typedChar === correctChar;
      html += `<span class="char ${ok ? 'correct' : 'wrong'}">${escapeHtml(char)}</span>`;
    } else if (i === a.length) {
      html += `<span class="char current">${escapeHtml(char)}</span>`;
    } else {
      html += `<span class="char pending">${escapeHtml(char)}</span>`;
    }
  }

  previewEl.innerHTML = html;
}

/* ===== INPUT HANDLERS ===== */
function handleTypingInput(e) {
  const typed = e.target.value ?? '';
  updateWordPreview(typed);

  const state = getPracticeState();
  const settings = state.settings || {};

  if (settings.autoCorrect) {
    scheduleSuggestion(String(typed));
  }
}

function handleTypingKeydown(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('typing-input');
    if (!input) return;
    if (!String(input.value || '').trim()) return;

    // On Enter -> evaluate
    completeTyping();
  }
}

/* ===== SUGGESTION (autoCorrect) ===== */
function scheduleSuggestion(rawTyped) {
  clearSuggestionTimer();
  suggestionTimer = setTimeout(() => {
    showTypingSuggestion(rawTyped);
  }, 80);
}

function clearSuggestionTimer() {
  if (suggestionTimer) {
    clearTimeout(suggestionTimer);
    suggestionTimer = null;
  }
}

function showTypingSuggestion(rawTyped) {
  const state = getPracticeState();
  const settings = state.settings || {};
  if (!settings.autoCorrect) return;

  const el = document.getElementById('typing-suggestion');
  if (!el) return;

  const typed = String(rawTyped ?? '').trim();
  if (!typed) {
    el.style.display = 'none';
    return;
  }

  const strict = !!settings.strictMode;
  const target = String(currentCorrectAnswer ?? '').trim();
  if (!target) {
    el.style.display = 'none';
    return;
  }

  const a = strict ? typed : typed.toLowerCase();
  const b = strict ? target : target.toLowerCase();

  if (a.length < 2) {
    el.style.display = 'none';
    return;
  }

  // Suggest only if user typed is a prefix
  if (b.startsWith(a)) {
    const remaining = target.slice(typed.length);
    el.innerHTML = `<span class="suggestion-text">${escapeHtml(typed)}<span class="suggestion-hint">${escapeHtml(remaining)}</span></span>`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* ===== COMPLETE / SCORING ===== */
function completeTyping() {
  const word = getCurrentWord();
  if (!word) return;

  stopTypingTimer();
  clearSuggestionTimer();

  const state = getPracticeState();
  const settings = state.settings || {};

  const inputEl = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');
  const userRaw = String(inputEl?.value ?? '').trim();

  if (!userRaw) {
    showToast('Vui lòng nhập câu trả lời!', 'error');
    return;
  }

  const isCorrect = checkByScoring(userRaw, currentCorrectAnswer, settings);

  submitAnswer(userRaw, isCorrect);

  if (inputEl) {
    inputEl.disabled = true;
    inputEl.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  if (feedback) {
    if (isCorrect) {
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
      feedback.innerHTML = `
        <div class="feedback-correct">
          <i class="fas fa-check-circle"></i>
          <span>Tuyệt vời! (${timeTaken}s)</span>
        </div>
      `;
    } else {
      feedback.innerHTML = `
        <div class="feedback-wrong">
          <i class="fas fa-times-circle"></i>
          <span>Đáp án đúng: <strong>${escapeHtml(currentCorrectAnswer)}</strong></span>
        </div>
      `;
    }
  }

  updateTypingProgress();

  // next
  const delay = isCorrect ? 1000 : 1500;
  if (settings.autoNext) {
    setTimeout(() => showCurrentTyping(), delay);
  } else {
    // If autoNext off, guide user to press Enter again or click skip (keep UI simple)
    showToast('Nhấn Enter để sang câu tiếp theo hoặc bấm Bỏ qua', 'info');
  }
}

function checkByScoring(userAnswer, correctAnswer, settings) {
  const scoring = settings.scoring || 'exact';
  const strict = !!settings.strictMode;

  const u = String(userAnswer ?? '').trim();
  const c = String(correctAnswer ?? '').trim();

  const a = strict ? u : u.toLowerCase();
  const b = strict ? c : c.toLowerCase();

  if (!b) return false;

  switch (scoring) {
    case 'exact':
      return a === b;

    case 'half': {
      const sim = similarityRatio(a, b);
      return sim >= 0.5;
    }

    case 'partial': {
      // “Đúng một phần”: chỉ cần có ít nhất 1 ký tự trùng vị trí HOẶC substring dài >= 1
      // (tránh quá dễ: nếu user nhập 1 ký tự bất kỳ không tồn tại thì false)
      if (!a) return false;
      if (b.includes(a)) return true;
      return hasAnyCorrectPositionChar(a, b);
    }

    case 'lenient': {
      const dist = levenshtein(a, b);
      return dist <= 2;
    }

    default:
      return a === b;
  }
}

function hasAnyCorrectPositionChar(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) return true;
  }
  return false;
}

/* ===== TIMER (kept - not used by settings currently) ===== */
function stopTypingTimer() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
}

function updateTimerDisplay(seconds) {
  const timerValue = document.getElementById('timer-value');
  if (timerValue) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    timerValue.classList.toggle('warning', seconds <= 5);
  }
}

/* ===== SKIP ===== */
export function skipTyping() {
  stopTypingTimer();
  // treat as wrong answer, but without input
  submitAnswer('', false);
  showCurrentTyping();
}

/* ===== SPEAK ===== */
export function speakTypingWord() {
  const word = getCurrentWord();
  if (word?.word) speak(word.word);
}

/* ===== TOGGLE SHOW ANSWER ===== */
export function toggleTypingShowAnswer() {
  const el = document.getElementById('typing-answer-reveal');
  if (!el) return;
  el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
}

/* ===== UPDATE PROGRESS ===== */
function updateTypingProgress() {
  const state = getPracticeState();

  const progressText = document.getElementById('typing-progress-text');
  const progressBar = document.getElementById('typing-progress-bar');
  const scoreEl = document.getElementById('typing-score');
  const wrongEl = document.getElementById('typing-wrong');

  if (progressText) progressText.textContent = `${Math.min(state.currentIndex + 1, state.total)} / ${state.total}`;
  if (progressBar) progressBar.style.width = `${state.progress}%`;
  if (scoreEl) scoreEl.textContent = state.score;
  if (wrongEl) wrongEl.textContent = state.wrong;

  // also sync common header if present
  const bar2 = document.getElementById('practice-progress-bar');
  const text2 = document.getElementById('practice-progress-text');
  if (bar2?.style) bar2.style.width = `${state.progress}%`;
  if (text2) text2.textContent = `${state.currentIndex}/${state.total}`;
}

/* ===== SHOW RESULTS ===== */
function showTypingResults() {
  stopTypingTimer();
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

/* ===== NAVIGATION ===== */
export function exitTyping() {
  stopTypingTimer();
  resetPractice();
  navigate('practice');
}

export function restartTyping() {
  const scope = window.practiceScope;
  const settings = window.typingSettings;
  startTyping(scope, settings);
}

/* ===== HELPERS: word schema ===== */
function primaryMeaning(word) {
  return (word?.meanings && word.meanings[0]) ? word.meanings[0] : {};
}

function getFieldLabel(fieldId) {
  const f = TYPING_FIELDS.find(x => x.id === Number(fieldId));
  return f?.label || 'Nội dung';
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

function buildLetterHint(answer, settings) {
  const showFirst = !!settings.showFirstLetter;
  const showLen = !!settings.showLength;

  const s = String(answer ?? '');
  if (!s) return '';

  if (showFirst && showLen) {
    if (s.length <= 1) return s;
    return s.charAt(0) + '_'.repeat(s.length - 1);
  }
  if (showFirst) return s.charAt(0) + '...';
  if (showLen) return '_'.repeat(s.length);
  return '';
}

function normalizeFieldIdArray(arr, fallback) {
  const out = (Array.isArray(arr) ? arr : [])
    .map(Number)
    .filter(n => Number.isFinite(n) && n >= 1 && n <= 8);
  return out.length ? out : fallback;
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ===== TEXT / SCORE UTILS ===== */
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

function levenshtein(a, b) {
  const s = String(a ?? '');
  const t = String(b ?? '');
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: n + 1 }, (_, i) => [i]);
  for (let j = 1; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = t.charAt(i - 1) === s.charAt(j - 1) ? 0 : 1;
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
  const s = String(a ?? '');
  const t = String(b ?? '');
  const longer = s.length >= t.length ? s : t;
  const shorter = s.length >= t.length ? t : s;
  if (!longer.length) return 1;
  const dist = levenshtein(longer, shorter);
  return (longer.length - dist) / longer.length;
}

/* ===== EXPORTS ===== */
export { startTyping as run };

window.startTyping = startTyping;
window.skipTyping = skipTyping;
window.speakTypingWord = speakTypingWord;
window.exitTyping = exitTyping;
window.restartTyping = restartTyping;
window.toggleTypingShowAnswer = toggleTypingShowAnswer;
