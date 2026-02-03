/* ========================================
   VoLearn - Global State
   Quản lý state toàn cục
   ======================================== */

/* ===== DEFAULT DATA STRUCTURE ===== */
export const DEFAULT_DATA = {
    vocabulary: [],
    sets: [],
    history: [],
    streak: 0,
    lastStudyDate: null,
    settings: {
        speed: 1,
        voice: 'en-US',
        theme: 'light',
        font: 'Be Vietnam Pro'
    }
};

/* ===== APP STATE ===== */
export let appData = JSON.parse(JSON.stringify(DEFAULT_DATA));

/* ===== PRACTICE STATE ===== */
export let practiceState = {
    words: [],
    index: 0,
    mode: null,
    settings: {},
    startTime: null,
    results: {
        correct: 0,
        incorrect: 0
    }
};

/* ===== CURRENT VIEW STATE ===== */
export let viewState = {
    currentSetId: null,
    currentWordId: null,
    searchQuery: ''
};

/* ===== INTERNAL ===== */
function syncWindowAppData() {
    try {
        window.appData = appData;
    } catch (e) {}
}

/* ===== SETTERS ===== */
export function setAppData(data) {
    appData = data;
    syncWindowAppData();
}

export function resetAppData() {
    appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    syncWindowAppData();
}

export function updateAppData(updates) {
    appData = { ...appData, ...updates };
    syncWindowAppData();
}

/* ===== VOCABULARY HELPERS ===== */
export function addWord(word) {
    if (!appData.vocabulary) appData.vocabulary = [];

    word.id = word.id || generateId();
    word.createdAt = word.createdAt || new Date().toISOString();
    word.mastered = word.mastered || false;
    word.bookmarked = word.bookmarked || false;
    word.srsLevel = word.srsLevel || 0;
    word.nextReview = word.nextReview || null;

    appData.vocabulary.push(word);

    addToHistory('add', word.id);

    syncWindowAppData();
    return word;
}

export function updateWord(wordId, updates) {
    const index = appData.vocabulary.findIndex(w => w.id === wordId);
    if (index !== -1) {
        appData.vocabulary[index] = {
            ...appData.vocabulary[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        syncWindowAppData();
        return appData.vocabulary[index];
    }
    return null;
}

export function deleteWord(wordId) {
    const index = appData.vocabulary.findIndex(w => w.id === wordId);
    if (index !== -1) {
        const deleted = appData.vocabulary.splice(index, 1)[0];
        syncWindowAppData();
        return deleted;
    }
    return null;
}

export function getWordById(wordId) {
    return appData.vocabulary.find(w => w.id === wordId);
}

export function getWordsBySetId(setId) {
    if (!setId || setId === 'all') return appData.vocabulary;
    return appData.vocabulary.filter(w => w.setId === setId);
}

/* ===== SET HELPERS ===== */
export function addSet(set) {
    if (!appData.sets) appData.sets = [];

    set.id = set.id || generateId();
    set.createdAt = set.createdAt || new Date().toISOString();

    appData.sets.push(set);
    syncWindowAppData();
    return set;
}

export function updateSet(setId, updates) {
    const index = appData.sets.findIndex(s => s.id === setId);
    if (index !== -1) {
        appData.sets[index] = { ...appData.sets[index], ...updates };
        syncWindowAppData();
        return appData.sets[index];
    }
    return null;
}

export function deleteSet(setId) {
    const index = appData.sets.findIndex(s => s.id === setId);
    if (index !== -1) {
        appData.vocabulary.forEach(word => {
            if (word.setId === setId) word.setId = null;
        });
        const deleted = appData.sets.splice(index, 1)[0];
        syncWindowAppData();
        return deleted;
    }
    return null;
}

export function getSetById(setId) {
    return appData.sets.find(s => s.id === setId);
}

/* ===== HISTORY HELPERS ===== */
export function addToHistory(action, wordId) {
    if (!appData.history) appData.history = [];

    const today = new Date().toISOString().split('T')[0];
    let todayEntry = appData.history.find(h => h.date === today);

    if (!todayEntry) {
        todayEntry = { date: today, added: [], reviewed: [] };
        appData.history.push(todayEntry);
    }

    if (!Array.isArray(todayEntry.added)) todayEntry.added = [];
    if (!Array.isArray(todayEntry.reviewed)) todayEntry.reviewed = [];

    if (action === 'add' && !todayEntry.added.includes(wordId)) {
        todayEntry.added.push(wordId);
    } else if (action === 'review' && !todayEntry.reviewed.includes(wordId)) {
        todayEntry.reviewed.push(wordId);
    }

    syncWindowAppData();
}

export function getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = appData.history?.find(h => h.date === today);

    return {
        added: todayEntry?.added?.length || 0,
        reviewed: todayEntry?.reviewed?.length || 0
    };
}

/* ===== STATS HELPERS ===== */
export function getStats() {
    const vocabulary = appData.vocabulary || [];

    return {
        total: vocabulary.length,
        mastered: vocabulary.filter(w => w.mastered).length,
        learning: vocabulary.filter(w => !w.mastered).length,
        bookmarked: vocabulary.filter(w => w.bookmarked).length,
        streak: appData.streak || 0
    };
}

/* ===== PRACTICE STATE ===== */
export function setPracticeState(state) {
    practiceState = { ...practiceState, ...state };
}

export function resetPracticeState() {
    practiceState = {
        words: [],
        index: 0,
        mode: null,
        settings: {},
        startTime: null,
        results: { correct: 0, incorrect: 0 }
    };
}

/* ===== VIEW STATE ===== */
export function setViewState(state) {
    viewState = { ...viewState, ...state };
}

/* ===== UTILITY ===== */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/* ===== EXPOSE (DEBUG) ===== */
syncWindowAppData();
try {
    window.getStats = getStats;
} catch (e) {}
