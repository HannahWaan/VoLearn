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
  const words = [...(appData.vocabulary || [])];
  appData.sets?.forEach(set => { if (set.words) words.push(...set.words); });
  return words;
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

  appData.history.push({
    type: 'practice',
    mode: result.mode,
    date: new Date().toISOString().split('T')[0],
    wordsCount: result.total,
    correct: result.score,
    wrong: result.wrong,
    accuracy: result.accuracy,
    duration: result.duration
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
      : 0
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

  // Centralize click handling for pause summary actions (no inline onclick)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-practice-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-practice-action');
    if (action === 'practice-exit') {
      hidePracticeArea();
      return;
    }
    if (action === 'practice-resume') {
      continuePractice();
      return;
    }
    if (action === 'flashcard-restart') {
      import('./flashcard.js').then(m => m.restartFlashcard && m.restartFlashcard());
      return;
    }
    if (action === 'flashcard-review-wrong') {
      import('./flashcard.js').then(m => m.reviewWrongFlashcards && m.reviewWrongFlashcards());
      return;
    }
    if (action === 'srs-done') {
      hidePracticeArea();
      return;
    }
     if (action === 'quiz-restart') {
       import('./quiz.js').then(m => m.restartQuiz && m.restartQuiz());
       return;
     }
     if (action === 'quiz-review-wrong') {
       import('./quiz.js').then(m => m.reviewWrongQuiz && m.reviewWrongQuiz());
       return;
     }
      if (action === 'typing-restart') {
        import('./typing.js').then(m => m.restartTyping && m.restartTyping());
        return;
      }
  });
}

export function updateSRSCount() {
  const now = new Date();
  const dueWords = (appData.vocabulary || []).filter(w => {
    if (!w.nextReview) return true;
    return new Date(w.nextReview) <= now;
  });

  const countEl = document.getElementById('srs-count');
  if (countEl) countEl.textContent = dueWords.length;

  const btnStart = document.getElementById('btn-start-srs');
  if (btnStart) {
    btnStart.disabled = dueWords.length === 0;
  }
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

  // Keep the common header accurate even while paused
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
        <!-- NOTE: No "back riêng" nữa, back chung ở header (handlePracticeBack/hidePracticeArea) -->
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

  import('../core/router.js').then(router => {
    router.navigate('practice');
  });

  console.log('✅ Practice area hidden, back to practice modes');
}

export function showPracticeArea() {
  const practiceArea = document.getElementById('practice-area');
  const practiceModes = document.getElementById('practice-modes');

  if (practiceArea) practiceArea.style.display = 'block';
  if (practiceModes) practiceModes.style.display = 'none';

  document.getElementById('practice-section')?.classList.add('in-session');

  // ensure common header starts fresh
  updateCommonPracticeHeader();
}

/* ===== CONTINUE PRACTICE ===== */
export function continuePractice() {
  updateCommonPracticeHeader();

  const mode = practiceState.mode;
  switch (mode) {
    case 'flashcard':
      import('./flashcard.js').then(m => m.renderFlashcard && m.renderFlashcard());
      break;
    case 'quiz':
      import('./quiz.js').then(m => m.renderQuiz && m.renderQuiz());
      break;
    case 'dictation':
      // dictation module uses internal render via start flow; safest is to just re-render current UI if present
      import('./dictation.js').then(m => m.startDictation && m.startDictation(window.practiceScope, window.dictationSettings));
      break;
    case 'typing':
      import('./typing.js').then(m => m.startTyping && m.startTyping(window.practiceScope, window.typingSettings));
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

/* ===== ANSWER CHECKER (needed by typing.js) ===== */
function normalizeText(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * checkAnswer(input, word)
 * - typing/dictation: so với word.word
 * - quiz/flashcard: so với word.meaning (fallback)
 * - tôn trọng settings.caseSensitive (typing)
 */
export function checkAnswer(input, word) {
  const mode = practiceState?.mode;
  const settings = practiceState?.settings || {};

  const a = normalizeText(input);

  // typing/dictation: nhập lại đúng "word" (case-insensitive mặc định)
  if (mode === 'typing' || mode === 'dictation') {
    const b = normalizeText(word?.word);
    const caseSensitive = !!settings.caseSensitive;
    return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
  }

  // quiz/flashcard: compare meaning (giữ behavior cũ kiểu đơn giản)
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
