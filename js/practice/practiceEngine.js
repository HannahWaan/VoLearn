/* ===== PRACTICE ENGINE ===== */
/* VoLearn v2.1.0 - Core engine cho luyện tập */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { pushUndoState } from '../core/undo.js';
import { showToast } from '../ui/toast.js';

/* ===== STATE ===== */
let practiceState = {
    mode: null,           // 'flashcard' | 'quiz' | 'dictation' | 'typing'
    words: [],            // Words to practice
    currentIndex: 0,
    score: 0,
    wrong: 0,
    skipped: 0,
    startTime: null,
    answers: [],          // Track all answers
    settings: {}          // Mode-specific settings
};

/* ===== INIT PRACTICE ===== */
export function initPractice(mode, words, settings = {}) {
    if (!words || words.length === 0) {
        showToast('Không có từ để luyện tập!', 'warning');
        return false;
    }

    // Shuffle if enabled
    const shuffledWords = settings.shuffle !== false ? shuffleArray([...words]) : [...words];

    // Limit words if specified
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
    if (!scope) {
        // Default: all words
        return getAllWords();
    }

    switch (scope.type) {
        case 'set':
            return getWordsFromSet(scope.setId);
        case 'all':
            return getAllWords();
        case 'recent':
            return getRecentWords(scope.days || 7);
        case 'mastered':
            return getMasteredWords(scope.mastered);
        case 'weak':
            return getWeakWords();
        case 'custom':
            return scope.words || [];
        default:
            return getAllWords();
    }
}

function getAllWords() {
    const words = [...(appData.vocabulary || [])];
    
    appData.sets?.forEach(set => {
        if (set.words) {
            words.push(...set.words);
        }
    });

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
    if (practiceState.currentIndex >= practiceState.words.length) {
        return null;
    }
    return practiceState.words[practiceState.currentIndex];
}

export function submitAnswer(answer, isCorrect) {
    const word = getCurrentWord();
    if (!word) return null;

    // Record answer
    practiceState.answers.push({
        wordId: word.id,
        word: word.word,
        answer,
        isCorrect,
        timestamp: Date.now()
    });

    // Update stats
    if (isCorrect) {
        practiceState.score++;
        updateWordStats(word.id, true);
    } else {
        practiceState.wrong++;
        updateWordStats(word.id, false);
    }

    // Move to next
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
        case 'flashcard':
            return word.meaning;
        case 'quiz':
            return word.meaning;
        case 'dictation':
            return word.word;
        case 'typing':
            return word.word;
        default:
            return word.meaning;
    }
}

/* ===== CHECK ANSWER ===== */
export function checkAnswer(input, word) {
    const mode = practiceState.mode;
    const settings = practiceState.settings;

    let expected;
    switch (mode) {
        case 'dictation':
        case 'typing':
            expected = word.word;
            break;
        case 'quiz':
        default:
            expected = word.meaning;
    }

    // Normalize
    const normalizedInput = normalizeText(input, settings);
    const normalizedExpected = normalizeText(expected, settings);

    if (settings.strictMode) {
        return normalizedInput === normalizedExpected;
    }

    // Fuzzy matching for typos
    if (settings.allowTypos) {
        return fuzzyMatch(normalizedInput, normalizedExpected, 0.8);
    }

    return normalizedInput === normalizedExpected;
}

function normalizeText(text, settings = {}) {
    if (!text) return '';
    
    let normalized = text.trim().toLowerCase();
    
    if (!settings.caseSensitive) {
        normalized = normalized.toLowerCase();
    }
    
    if (settings.ignoreAccents) {
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    
    if (settings.ignorePunctuation) {
        normalized = normalized.replace(/[.,!?;:'"()-]/g, '');
    }
    
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized;
}

function fuzzyMatch(input, expected, threshold) {
    const distance = levenshteinDistance(input, expected);
    const maxLength = Math.max(input.length, expected.length);
    const similarity = 1 - (distance / maxLength);
    return similarity >= threshold;
}

function levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}

/* ===== UPDATE WORD STATS ===== */
function updateWordStats(wordId, correct) {
    // Find word in vocabulary
    let word = appData.vocabulary?.find(w => w.id === wordId);
    
    // Find in sets if not found
    if (!word) {
        for (const set of (appData.sets || [])) {
            word = set.words?.find(w => w.id === wordId);
            if (word) break;
        }
    }

    if (!word) return;

    // Update stats
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewed = new Date().toISOString();
    
    if (correct) {
        word.correctCount = (word.correctCount || 0) + 1;
        word.streak = (word.streak || 0) + 1;
    } else {
        word.streak = 0;
    }

    // Auto-mark mastered if streak >= 3
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

    // Save to history
    savePracticeHistory(result);

    // Update streak
    updateStreak();

    // Save data
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

    // Keep only last 100 entries
    if (appData.history.length > 100) {
        appData.history = appData.history.slice(-100);
    }
}

function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (appData.lastPracticeDate === today) {
        // Already practiced today
        return;
    }

    if (appData.lastPracticeDate === yesterday) {
        // Continuing streak
        appData.streak = (appData.streak || 0) + 1;
    } else {
        // Streak broken or new start
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

/* ===== UTILITIES ===== */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/* ===== EXPORTS ===== */
export {
    practiceState
};

// Khởi tạo practice engine
export function initPracticeEngine() {
    updateSRSCount();
    
    // Listen for data changes
    window.addEventListener('volearn:dataChanged', updateSRSCount);
    window.addEventListener('volearn:dataSaved', updateSRSCount);
}

// Update SRS count
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

// Handle back button in practice
export function handlePracticeBack() {
    const practiceWordsReviewed = practiceState.answers?.length || 0;
    
    if (practiceWordsReviewed === 0) {
        hidePracticeArea();
        return;
    }
    
    showPracticeSummary();
}

// Show practice summary
export function showPracticeSummary() {
    const total = practiceState.words.length;
    const reviewed = practiceState.currentIndex;
    const remaining = total - reviewed;
    
    const container = document.getElementById('practice-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="practice-summary">
            <i class="fas fa-pause-circle summary-icon"></i>
            <h2>Tạm dừng luyện tập</h2>
            
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="summary-stat-value">${reviewed}</span>
                    <span class="summary-stat-label">Từ đã học</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${remaining}</span>
                    <span class="summary-stat-label">Từ còn lại</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${total}</span>
                    <span class="summary-stat-label">Tổng số từ</span>
                </div>
            </div>
            
            <div class="summary-actions">
                <button class="btn-secondary" onclick="window.hidePracticeArea()">
                    <i class="fas fa-arrow-left"></i> Quay lại
                </button>
                <button class="btn-primary" onclick="window.continuePractice()">
                    <i class="fas fa-play"></i> Tiếp tục học
                </button>
            </div>
        </div>
    `;
}

// Hide practice area
export function hidePracticeArea() {
    const practiceArea = document.getElementById('practice-area');
    const practiceModes = document.getElementById('practice-modes');
    
    if (practiceArea) practiceArea.style.display = 'none';
    if (practiceModes) practiceModes.style.display = 'flex';
    
    const practiceContent = document.getElementById('practice-content');
    if (practiceContent) practiceContent.innerHTML = '';
    
    resetPractice();
}

// Show practice area
export function showPracticeArea() {
    const practiceArea = document.getElementById('practice-area');
    const practiceModes = document.getElementById('practice-modes');
    
    if (practiceArea) practiceArea.style.display = 'block';
    if (practiceModes) practiceModes.style.display = 'none';
      document.getElementById('practice-section')?.classList.add('in-session');
}

// Continue practice
export function continuePractice() {
    // Re-render current card based on mode
    const mode = practiceState.mode;
    
    switch(mode) {
        case 'flashcard':
            import('./flashcard.js').then(m => m.renderFlashcard && m.renderFlashcard());
            break;
        case 'quiz':
            import('./quiz.js').then(m => m.renderQuiz && m.renderQuiz());
            break;
        case 'dictation':
            import('./dictation.js').then(m => m.renderDictation && m.renderDictation());
            break;
        case 'typing':
            import('./typing.js').then(m => m.renderTyping && m.renderTyping());
            break;
    }
}

// Globals
window.handlePracticeBack = handlePracticeBack;
window.hidePracticeArea = hidePracticeArea;
window.showPracticeArea = showPracticeArea;
window.continuePractice = continuePractice;
window.updateSRSCount = updateSRSCount;
