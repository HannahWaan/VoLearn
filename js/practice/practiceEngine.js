/* ===== PRACTICE ENGINE ===== */
/* VoLearn v2.1.0 - Core engine cho luyện tập */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';

/* ===== STATE ===== */
let practiceState = {
  mode: null,
  words: [],
  currentIndex: 0,
  score: 0,
  wrong: 0,
  skipped: 0,
  startTime: null,
  answers: [],
  settings: {}
};

/* ===== INIT PRACTICE ===== */
export function initPractice(mode, words, settings = {}) {
  if (!words || words.length === 0) {
    showToast('Không có từ để luyện tập!', 'warning');
    return false;
  }

  const shuffledWords = settings.shuffle !== false ? shuffleArray([...words]) : [...words];
  const limitedWords = settings.limit ? shuffledWords.slice(0, settings.limit) : shuffledWords;

  practiceState = {
    mode,
    words: limitedWords,
    currentIndex: 0,
    score: 0,
    wrong: 0,
    skipped: 0,
    startTime: Date.now(),
    answers: [],
    settings
  };

  console.log(`Practice started: ${mode}, ${limitedWords.length} words`);
  return true;
}

/* ===== GET WORDS BY SCOPE ===== */
export function getWordsByScope(scope) {
  if (!scope) return getAllWords();

  switch (scope.type) {
    case 'set': return getWordsFromSet(scope.setId);
    case 'all': return getAllWords();
    case 'recent': return getRecentWords(scope.days || 7);
    case 'mastered': return getMasteredWords(scope.mastered);
    case 'weak': return getWeakWords();
    case 'custom': return scope.words || [];
    default: return getAllWords();
  }
}

function getAllWords() {
  const words = [];
  if (Array.isArray(appData.vocabulary)) words.push(...appData.vocabulary);
  if (Array.isArray(appData.sets)) {
    appData.sets.forEach(set => {
      if (Array.isArray(set?.words)) words.push(...set.words);
    });
  }

  const seen = new Set();
  const out = [];
  for (const w of words) {
    const id = w?.id;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(w);
  }
  return out;
}

function getWordsFromSet(setId) {
  const set = appData.sets?.find(s => s.id === setId);
  return set?.words || [];
}

function getRecentWords(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return getAllWords().filter(w => {
    if (!w.addedAt) return false;
    return new Date(w.addedAt) >= cutoff;
  });
}

function getMasteredWords(mastered) {
  return getAllWords().filter(w => w.mastered === mastered);
}

function getWeakWords() {
  return getAllWords().filter(w => {
    if (!w.reviewCount) return true;
    if (!w.correctCount) return true;
    const accuracy = w.correctCount / w.reviewCount;
    return accuracy < 0.7;
  });
}

function toDayKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().split('T')[0];
}

function getWeakWordIdsFromHistory(days = 14, maxIds = 200) {
  const ids = new Set();
  const hist = Array.isArray(appData.history) ? appData.history : [];
  if (hist.length === 0) return ids;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(1, Number(days || 14)));

  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    const dateKey = toDayKey(h?.timestamp || h?.date);
    if (!dateKey) continue;

    const d = new Date(dateKey);
    if (d < cutoff) break;

    const answers = Array.isArray(h?.answers) ? h.answers : null;
    if (!answers) continue;

    for (const a of answers) {
      if (!a) continue;
      if (a.skipped) continue;
      if (a.isCorrect === false && a.wordId) ids.add(a.wordId);
      if (ids.size >= maxIds) return ids;
    }
  }
  return ids;
}

function getWeakWordsHybrid(limit = 30) {
  const all = getAllWords();

  const byId = new Map();
  for (const w of all) {
    if (w?.id) byId.set(w.id, w);
  }

  const historyWrongIds = getWeakWordIdsFromHistory(14, 300);

  const weakByStats = [];
  for (const w of all) {
    const review = Number(w.reviewCount || 0);
    const correct = Number(w.correctCount || 0);
    const acc = review > 0 ? (correct / review) : 0;

    const isWeak =
      review === 0 ||
      correct === 0 ||
      acc < 0.7 ||
      Number(w.streak || 0) === 0;

    if (isWeak) weakByStats.push(w);
  }

  const scored = [];
  for (const w of weakByStats) {
    const review = Number(w.reviewCount || 0);
    const correct = Number(w.correctCount || 0);
    const acc = review > 0 ? (correct / review) : 0;

    const historyBoost = historyWrongIds.has(w.id) ? 1000 : 0;
    const neverReviewedBoost = review === 0 ? 200 : 0;
    const lowAccBoost = Math.round((1 - acc) * 100);
    const streakPenalty = Number(w.streak || 0) > 0 ? 10 : 0;

    let recencyBoost = 0;
    if (w.lastReviewed) {
      const t = new Date(w.lastReviewed).getTime();
      if (!Number.isNaN(t)) {
        const hours = (Date.now() - t) / 3600000;
        recencyBoost = Math.max(0, 48 - Math.min(48, hours)); // ưu tiên sai gần đây nhẹ
      }
    }

    const score = historyBoost + neverReviewedBoost + lowAccBoost + recencyBoost - streakPenalty;

    scored.push({ w, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const out = [];
  const seen = new Set();
  for (const item of scored) {
    const w = item.w;
    if (!w?.id) continue;
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    out.push(w);
    if (out.length >= Math.max(4, Number(limit || 30))) break;
  }

  return out;
}

function getWeakReviewSettings() {
  const s = appData?.settings?.weakReviewSettings || {};
  return {
    days: Number(s.days || 14),
    limit: Number(s.limit || 30),
    runMode: String(s.runMode || 'typing'),
    typingScoring: String(s.typingScoring || 'lenient'),
    showAnswer: s.showAnswer !== false,
    autoCorrect: s.autoCorrect !== false,
    autoNext: s.autoNext !== false
  };
}

async function startWeakWordsDrill(customSettings) {
  const cfg = { ...getWeakReviewSettings(), ...(customSettings || {}) };

  const days = [7, 14, 30].includes(cfg.days) ? cfg.days : 14;
  const limit = Number.isFinite(cfg.limit) ? Math.max(4, Math.min(100, cfg.limit)) : 30;
  const runMode = (cfg.runMode === 'quiz') ? 'quiz' : 'typing';

  // compute words & wrong recent count
  const recentWrongIds = getWeakWordIdsFromHistory(days, 9999);
  const words = getWeakWordsHybrid(limit);

  const recentWrongCount = recentWrongIds.size;

  if (!words.length || words.length < 4) {
    showToast('Chưa đủ từ yếu để ôn. Hãy luyện tập thêm!', 'warning');
    return;
  }

  showToast(`Ôn từ yếu: ${words.length} từ (${recentWrongCount} từ sai gần đây)`, 'success');

  const scope = { type: 'custom', words };

  if (runMode === 'quiz') {
    // OPTION (để sau bạn tinh chỉnh thêm UI preset quiz): dùng quiz defaults
    const quizMod = await import('./quiz.js');
    const quizSettings = {
      shuffle: true,
      optionCount: 4,
      timeLimit: 0,
      autoNext: true,
      autoNextSeconds: 5,
      autoSkip: false,
      questionFieldIds: [1, 5],
      answerFieldIds: [1],
      showPhonetic: false,
      speakQuestion: false
    };
    window.practiceScope = scope;
    window.quizSettings = quizSettings;
    quizMod?.startQuiz?.(scope, quizSettings);
    return;
  }

  // typing preset (B1)
  const preset = {
    shuffle: true,
    limit: 0,

    answerFieldIds: [1],
    hintFieldIds: [5, 3, 6],

    scoring: cfg.typingScoring || 'lenient',
    showAnswer: !!cfg.showAnswer,
    strictMode: false,

    autoNext: !!cfg.autoNext,
    autoCorrect: !!cfg.autoCorrect,

    showFirstLetter: true,
    showLength: true,

    timeLimit: 0
  };

  window.practiceScope = scope;
  window.typingSettings = preset;

  const mod = await import('./typing.js');
  mod?.startTyping?.(scope, preset);
}

/* ===== PRACTICE FLOW ===== */
export function getCurrentWord() {
  if (practiceState.currentIndex >= practiceState.words.length) return null;
  return practiceState.words[practiceState.currentIndex];
}

export function submitAnswer(answer, isCorrect) {
  const word = getCurrentWord();
  if (!word) return null;

  practiceState.answers.push({
    wordId: word.id,
    word: word.word,
    answer,
    isCorrect,
    timestamp: Date.now()
  });

  if (isCorrect) {
    practiceState.score++;
    updateWordStats(word.id, true);
  } else {
    practiceState.wrong++;
    updateWordStats(word.id, false);
  }

  practiceState.currentIndex++;

  return {
    isCorrect,
    correctAnswer: getCorrectAnswer(word),
    nextWord: getCurrentWord(),
    isComplete: practiceState.currentIndex >= practiceState.words.length
  };
}

export function skipWord() {
  const word = getCurrentWord();
  if (!word) return null;

  practiceState.answers.push({
    wordId: word.id,
    word: word.word,
    answer: null,
    isCorrect: false,
    skipped: true,
    timestamp: Date.now()
  });

  practiceState.skipped++;
  practiceState.currentIndex++;

  return {
    skipped: true,
    correctAnswer: getCorrectAnswer(word),
    nextWord: getCurrentWord(),
    isComplete: practiceState.currentIndex >= practiceState.words.length
  };
}

export function getCorrectAnswer(word) {
  const mode = practiceState.mode;

  switch (mode) {
    case 'flashcard': return word.meaning;
    case 'quiz': return word.meaning;
    case 'dictation': return word.word;
    case 'typing': return word.word;
    default: return word.meaning;
  }
}

/* ===== UPDATE WORD STATS ===== */
function updateWordStats(wordId, correct) {
  let word = appData.vocabulary?.find(w => w.id === wordId);

  if (!word) {
    for (const set of (appData.sets || [])) {
      word = set.words?.find(w => w.id === wordId);
      if (word) break;
    }
  }
  if (!word) return;

  word.reviewCount = (word.reviewCount || 0) + 1;
  word.lastReviewed = new Date().toISOString();

  if (correct) {
    word.correctCount = (word.correctCount || 0) + 1;
    word.streak = (word.streak || 0) + 1;
  } else {
    word.streak = 0;
  }

  if (word.streak >= 3 && !word.mastered) {
    word.mastered = true;
  }
}

/* ===== FINISH PRACTICE ===== */
export function finishPractice() {
  const endTime = Date.now();
  const duration = Math.round((endTime - practiceState.startTime) / 1000);

  const result = {
    mode: practiceState.mode,
    total: practiceState.words.length,
    score: practiceState.score,
    wrong: practiceState.wrong,
    skipped: practiceState.skipped,
    accuracy: practiceState.words.length > 0
      ? Math.round((practiceState.score / practiceState.words.length) * 100)
      : 0,
    duration,
    answers: practiceState.answers,
    timestamp: new Date().toISOString()
  };

  savePracticeHistory(result);
  updateStreak();
  saveData(appData);

  return result;
}

function savePracticeHistory(result) {
  if (!appData.history) appData.history = [];

  const answers = Array.isArray(result.answers) ? result.answers : [];
  const wrongWordIds = [];
  const skippedWordIds = [];

  for (const a of answers) {
    if (!a || !a.wordId) continue;
    if (a.skipped) skippedWordIds.push(a.wordId);
    else if (a.isCorrect === false) wrongWordIds.push(a.wordId);
  }

  // Lưu tối đa để tránh nặng localStorage
  const trimIds = (arr, max = 80) => arr.slice(0, max);
  const trimAnswers = (arr, max = 120) => arr.slice(0, max);

  appData.history.push({
    type: 'practice',
    mode: result.mode,

    // giữ tương thích cũ
    date: new Date().toISOString().split('T')[0],

    // thêm timestamp để lọc theo ngày chính xác hơn
    timestamp: result.timestamp || new Date().toISOString(),

    wordsCount: result.total,
    correct: result.score,
    wrong: result.wrong,
    skipped: result.skipped || 0,
    accuracy: result.accuracy,
    duration: result.duration,

    // NEW: phục vụ Mistake Review (Hybrid)
    wrongWordIds: trimIds(wrongWordIds, 120),
    skippedWordIds: trimIds(skippedWordIds, 120),

    // NEW: lưu answers rút gọn (đủ để lấy wordId/isCorrect/skipped)
    answers: trimAnswers(
      answers.map(a => ({
        wordId: a.wordId,
        isCorrect: a.isCorrect,
        skipped: !!a.skipped,
        timestamp: a.timestamp
      })),
      160
    )
  });

  if (appData.history.length > 100) {
    appData.history = appData.history.slice(-100);
  }
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (appData.lastPracticeDate === today) return;

  if (appData.lastPracticeDate === yesterday) {
    appData.streak = (appData.streak || 0) + 1;
  } else {
    appData.streak = 1;
  }

  appData.lastPracticeDate = today;
}

/* ===== GETTERS ===== */
export function getPracticeState() {
  return {
    mode: practiceState.mode,
    settings: practiceState.settings,
    currentIndex: practiceState.currentIndex,
    total: practiceState.words.length,
    score: practiceState.score,
    wrong: practiceState.wrong,
    skipped: practiceState.skipped,
    progress: practiceState.words.length > 0
      ? Math.round((practiceState.currentIndex / practiceState.words.length) * 100)
      : 0,
    answers: practiceState.answers
  };
}

export function getWrongAnswers() {
  return practiceState.answers.filter(a => !a.isCorrect && !a.skipped);
}

export function resetPractice() {
  practiceState = {
    mode: null,
    words: [],
    currentIndex: 0,
    score: 0,
    wrong: 0,
    skipped: 0,
    startTime: null,
    answers: [],
    settings: {}
  };
}

/* ===== PRACTICE SHELL (COMMON PROGRESS/BACK) ===== */
function updateCommonPracticeHeader() {
  const state = getPracticeState();
  const text = document.getElementById('practice-progress-text');
  const bar = document.getElementById('practice-progress-bar');

  if (text) text.textContent = `${Math.min(state.currentIndex + 1, state.total)} / ${state.total}`;
  if (bar) bar.style.width = `${state.progress}%`;
}

/* ===== SRS COUNT ===== */
export function initPracticeEngine() {
  updateSRSCount();
  window.addEventListener('volearn:dataChanged', updateSRSCount);
  window.addEventListener('volearn:dataSaved', updateSRSCount);
  document.addEventListener('click', (e) => {
    const btnWeak = e.target.closest('#btn-start-srs');
    if (btnWeak) {
      window.openWeakReviewSettings?.();
    }
  });
  // Centralize click handling for summary/results actions (no inline onclick)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-practice-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-practice-action');

    // Common
    if (action === 'practice-exit') { hidePracticeArea(); return; }
    if (action === 'practice-resume') { continuePractice(); return; }

    // Flashcard
    if (action === 'flashcard-restart') { import('./flashcard.js').then(m => m.restartFlashcard?.()); return; }
    if (action === 'flashcard-review-wrong') { import('./flashcard.js').then(m => m.reviewWrongFlashcards?.()); return; }

    // SRS
    if (action === 'srs-done') { hidePracticeArea(); return; }

    // Quiz
    if (action === 'quiz-restart') { import('./quiz.js').then(m => m.restartQuiz?.()); return; }
    if (action === 'quiz-review-wrong') { import('./quiz.js').then(m => m.reviewWrongQuiz?.()); return; }

    // Typing
    if (action === 'typing-restart') { import('./typing.js').then(m => m.restartTyping?.()); return; }

    // Dictation
    if (action === 'dictation-restart') {
      import('./dictation.js').then(m => m.restartDictation?.());
      return;
    }
  });
}

export function updateSRSCount() {
  const weakWords = getWeakWordsHybrid(9999);

  const countEl = document.getElementById('srs-count');
  if (countEl) countEl.textContent = weakWords.length;

  const btnStart = document.getElementById('btn-start-srs');
  if (btnStart) btnStart.disabled = weakWords.length < 4;
}

/* ===== BACK HANDLER ===== */
export function handlePracticeBack() {
  const reviewed = practiceState.answers?.length || 0;
  if (reviewed === 0) {
    hidePracticeArea();
    return;
  }
  showPracticeSummary();
}

/* ===== PAUSE SUMMARY (NO INLINE ONCLICK) ===== */
export function showPracticeSummary() {
  const total = practiceState.words.length;
  const reviewed = practiceState.currentIndex;
  const remaining = total - reviewed;

  const container = document.getElementById('practice-content');
  if (!container) return;

  updateCommonPracticeHeader();

  container.innerHTML = `
    <div class="practice-summary" data-render="practice-summary">
      <i class="fas fa-pause-circle summary-icon"></i>
      <h2>Tạm dừng luyện tập</h2>

      <div class="summary-stats">
        <div class="summary-stat">
          <span class="summary-stat-value">${reviewed}</span>
          <span class="summary-stat-label">Đã làm</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-value">${remaining}</span>
          <span class="summary-stat-label">Còn lại</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-value">${total}</span>
          <span class="summary-stat-label">Tổng</span>
        </div>
      </div>

      <div class="summary-actions">
        <button class="btn-secondary" type="button" data-practice-action="practice-exit">
          <i class="fas fa-home"></i> Quay lại luyện tập
        </button>
        <button class="btn-primary" type="button" data-practice-action="practice-resume">
          <i class="fas fa-play"></i> Tiếp tục
        </button>
      </div>
    </div>
  `;
}

/* ===== SHOW/HIDE PRACTICE AREA ===== */
export function hidePracticeArea() {
  const practiceArea = document.getElementById('practice-area');
  const practiceModes = document.getElementById('practice-modes');
  const practiceSection = document.getElementById('practice-section');
  const practiceContent = document.getElementById('practice-content');

  if (practiceArea) practiceArea.style.display = 'none';

  if (practiceModes) {
    practiceModes.style.display = '';
    practiceModes.style.visibility = 'visible';
    practiceModes.style.opacity = '1';
  }

  if (practiceContent) practiceContent.innerHTML = '';
  if (practiceSection) practiceSection.classList.remove('in-session');

  resetPractice();
  updateSRSCount();

  import('../core/router.js').then(router => router.navigate('practice'));
  console.log('✅ Practice area hidden, back to practice modes');
}

export function showPracticeArea() {
  const practiceArea = document.getElementById('practice-area');
  const practiceModes = document.getElementById('practice-modes');

  if (practiceArea) practiceArea.style.display = 'block';
  if (practiceModes) practiceModes.style.display = 'none';

  document.getElementById('practice-section')?.classList.add('in-session');
  updateCommonPracticeHeader();
}

/* ===== CONTINUE PRACTICE ===== */
export function continuePractice() {
  updateCommonPracticeHeader();

  const mode = practiceState.mode;
  switch (mode) {
    case 'flashcard':
      import('./flashcard.js').then(m => m.renderFlashcard?.());
      break;

    case 'quiz':
      import('./quiz.js').then(m => m.renderQuiz?.());
      break;

    case 'dictation':
      import('./dictation.js').then(m => m.renderDictation?.());
      break;

    case 'typing':
      import('./typing.js').then(m => m.renderTyping?.());
      break;

    default:
      break;
  }
}

/* ===== UTILITIES ===== */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/* ===== ANSWER CHECKER (legacy; typing now self-checks) ===== */
function normalizeText(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ');
}

export function checkAnswer(input, word) {
  const mode = practiceState?.mode;
  const settings = practiceState?.settings || {};

  const a = normalizeText(input);

  if (mode === 'typing' || mode === 'dictation') {
    const b = normalizeText(word?.word);
    const caseSensitive = !!settings.caseSensitive;
    return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
  }

  const b = normalizeText(word?.meaning);
  return a.toLowerCase() === b.toLowerCase();
}

/* ===== EXPORTS ===== */
export { practiceState };

// Globals
window.handlePracticeBack = handlePracticeBack;
window.hidePracticeArea = hidePracticeArea;
window.showPracticeArea = showPracticeArea;
window.continuePractice = continuePractice;
window.updateSRSCount = updateSRSCount;
window.startWeakReviewWithSettings = (s) => startWeakWordsDrill(s);
