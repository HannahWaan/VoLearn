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

function getCorrectAnswer(word) {
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

/* ===== FINISH PRA
