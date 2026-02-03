/* ===== VOLEARN APP - MAIN ENTRY ===== */
/* VoLearn v2.1.0 - Module Entry Point */

// ===== CORE IMPORTS =====
import { loadAllTemplates, hideLoadingScreen, showLoadingError } from './core/templateLoader.js';
import { loadData, saveData, exportToJSON, exportToCSV, importFromJSON, clearData } from './core/storage.js';
import { appData, setAppData, DEFAULT_DATA } from './core/state.js';
import { initRouter, navigate } from './core/router.js';
import { initUndoSystem, performUndo } from './core/undo.js';
import { emit, EVENTS } from './core/eventBus.js';

// ===== UI IMPORTS =====
import { initSidebar } from './ui/sidebar.js';
import { initModals, openModal, closeAllModals } from './ui/modalEngine.js';
import { initToast, showToast, showSuccess, showError } from './ui/toast.js';
import { initHome } from './ui/home.js';
import { initAddWord } from './ui/addWord.js';
import { initBookshelf, renderShelves } from './ui/bookshelf.js';
import { initSetView } from './ui/setView.js';
import { initCalendar, renderCalendar } from './ui/calendar.js';
import { initSettings, applySettings } from './ui/settings.js';
import { initCambridgeWidget } from './ui/cambridgeWidget.js';
import { initConfirmModal } from './ui/confirmModal.js';

// ===== PRACTICE IMPORTS =====
import { initPracticeEngine, updateSRSCount } from './practice/practiceEngine.js';
import { startSRSReview, answerSRS, flipCard as srsFlipCard } from './practice/srsEngine.js';
import { startFlashcard } from './practice/flashcard.js';
import { startQuiz } from './practice/quiz.js';
import { startDictation } from './practice/dictation.js';
import { startTyping } from './practice/typing.js';
import { initTypingSettings } from './practice/typingSettings.js';
import { initWeakReviewSettings } from './practice/weakReviewSettings.js';

// ===== SYNC IMPORTS =====
import { initDrive, loginGoogle } from './sync/gdriveAuth.js';
import { backupToDrive, restoreFromDrive, initDriveBackup } from './sync/gdriveBackup.js';

// ===== UTILS IMPORTS =====
import { initSpeech, speak, stopSpeaking } from './utils/speech.js';
import { escapeHtml, generateId, formatDate, debounce } from './utils/helpers.js';

// ===== PRACTICE SETTINGS IMPORT =====
import { initFlashcardSettings } from './practice/flashcardSettings.js';
import { initQuizSettings } from './practice/quizSettings.js';
import { initDictationSettings } from './practice/dictationSettings.js';

/* ===== CONSTANTS ===== */
const MW_LEARNER_KEY = '21fc7831-faa6-4831-93a3-cddbe57d78bf';
const MW_THESAURUS_KEY = '74724826-02fe-4e5d-a402-1139eece1765';

/* ===== APP STATE ===== */
let currentSection = 'home';
let isInitialized = false;

/* ===== MAIN INITIALIZATION ===== */
async function initApp() {
    console.log('🚀 VoLearn v2.1.0 Starting...');
    
    try {
        // Step 1: Load templates
        console.log('📄 Step 1: Loading templates...');
        const templatesLoaded = await loadAllTemplates();
        if (!templatesLoaded) {
            throw new Error('Failed to load templates');
        }
        
        // Step 2: Load data from localStorage
        console.log('💾 Step 2: Loading data...');
        loadData();
        
        // Step 3: Initialize core systems
        console.log('⚙️ Step 3: Initializing core systems...');
        initRouter();
        initUndoSystem();
        
        // Step 4: Initialize UI components
        console.log('🎨 Step 4: Initializing UI...');
        initSidebar();
        initModals();
        initConfirmModal();
        initToast();
        initSpeech();
        
        // Step 5: Initialize sections
        console.log('📑 Step 5: Initializing sections...');
        initHome();
        initAddWord();
        initBookshelf();
        initSetView();
        initCalendar();
        initSettings();
        
        // Step 6: Initialize practice
        console.log('🏋️ Step 6: Initializing practice...');
        initPracticeEngine();

        // Step 6.1: Initialize Flashcard Settings
        console.log('🃏 Step 6.1: Initializing Flashcard Settings...');
        initFlashcardSettings();
        initQuizSettings();
        initDictationSettings();
        initTypingSettings();
        initWeakReviewSettings();
        
        // Step 6.5: Initialize Cambridge Widget
        console.log('📚 Step 6.5: Initializing Cambridge Widget...');
        initCambridgeWidget();
        
        // Step 7: Initialize sync (optional)
        console.log('☁️ Step 7: Initializing sync...');
        try {
            await initDrive();
            initDriveBackup();
        } catch (e) {
            console.warn('Google Drive sync not available:', e.message);
        }
        
        // Step 8: Apply settings
        console.log('🎯 Step 8: Applying settings...');
        applySettings();
        
        // Step 9: Setup global functions
        console.log('🌐 Step 9: Setting up globals...');
        setupGlobalFunctions();
        
        // Step 10: Navigate to home & show app
        console.log('🏠 Step 10: Navigating to home...');
        navigate('home');
        
        // Hide loading screen
        hideLoadingScreen();
        isInitialized = true;
        
        console.log('✅ VoLearn ready!');
        emit(EVENTS.DATA_LOADED, appData);
        
    } catch (error) {
        console.error('❌ Init error:', error);
        showLoadingError(error.message);
    }
}

/* ===== GLOBAL FUNCTIONS SETUP ===== */
function setupGlobalFunctions() {
    // Navigation
    window.navigate = navigate;
    window.navigateTo = navigate;
    
    // Toast
    window.showToast = showToast;
    window.showSuccess = showSuccess;
    window.showError = showError;
    
    // Speech
    window.speak = speak;
    window.stopSpeaking = stopSpeaking;
    window.speakPhonetic = speakPhonetic;
    window.speakTextarea = speakTextarea;
    window.speakWithAccent = speakWithAccent;
    
    // Modals
    window.openModal = openModal;
    window.closeAllModals = closeAllModals;
    
    // Data
    window.saveData = () => saveData(appData);
    window.exportJSON = exportToJSON;
    window.exportCSV = exportToCSV;
    window.importData = importFromJSON;
    window.clearAllData = clearData;
    
    // Practice
    window.startSRSReview = startSRSReview;
    window.answerSRS = answerSRS;
    window.srsFlipCard = srsFlipCard;
    window.startFlashcard = startFlashcard;
    window.startQuiz = startQuiz;
    window.startDictation = startDictation;
    window.startTyping = startTyping;
    window.updateSRSCount = updateSRSCount;
    
    // Undo
    window.performUndo = performUndo;
    
    // Sync
    window.loginGoogle = loginGoogle;
    window.backupToDrive = backupToDrive;
    window.restoreFromDrive = restoreFromDrive;
    
    // Bookshelf & Sets
    window.renderShelves = renderShelves;
    window.openSetDetail = (setId) => {
        import('./ui/setView.js').then(m => m.openSetDetail(setId));
    };
    window.backToBookshelf = () => {
        import('./ui/setView.js').then(m => m.backToBookshelf());
    };
    
    // Calendar
    window.renderCalendar = renderCalendar;
    window.showDayWords = (date) => {
        import('./ui/calendar.js').then(m => m.showDayWords(date));
    };
    
    // Add Word
    window.selectMeaning = (index) => {
        import('./ui/addWord.js').then(m => m.selectMeaning(index));
    };
    window.addMeaningBlock = () => {
        import('./ui/addWord.js').then(m => m.addMeaningBlock());
    };
    window.removeMeaningBlock = (btn) => {
        import('./ui/addWord.js').then(m => m.removeMeaningBlock(btn));
    };
    window.clearMeaningBlock = (btn) => {
        import('./ui/addWord.js').then(m => m.clearMeaningBlock(btn));
    };
    window.clearWordForm = () => {
        import('./ui/addWord.js').then(m => m.clearWordForm());
    };
    window.searchAlternativeWord = (word) => {
        import('./ui/addWord.js').then(m => m.searchAlternativeWord(word));
    };
    
    // Word Detail
    window.editWord = (wordId) => {
        import('./ui/wordDetail.js').then(m => m.editWord(wordId));
    };
    window.deleteWord = (wordId) => {
        import('./ui/wordDetail.js').then(m => m.deleteWord(wordId));
    };
    window.toggleMasteredInView = (wordId) => {
        import('./ui/setView.js').then(m => m.toggleMasteredInView(wordId));
    };
    window.toggleBookmarkInView = (wordId) => {
        import('./ui/setView.js').then(m => m.toggleBookmarkInView(wordId));
    };
    
    // Helpers
    window.escapeHtml = escapeHtml;
    window.generateId = generateId;
    window.formatDate = formatDate;
    
    // API Keys (for addWord.js)
    window.MW_LEARNER_KEY = MW_LEARNER_KEY;
    window.MW_THESAURUS_KEY = MW_THESAURUS_KEY;
    
    // Practice Settings 
    window.openDictationSettings = () => {
        import('./practice/dictationSettings.js').then(m => m.openDictationSettings && m.openDictationSettings());
    };
    window.openTypingSettings = () => {
      import('./practice/typingSettings.js').then(m => m.openTypingSettings && m.openTypingSettings());
    };
    
    // Practice handlers
    window.handlePracticeBack = () => {
        import('./practice/practiceEngine.js').then(m => m.handlePracticeBack && m.handlePracticeBack());
    };
    window.hidePracticeArea = () => {
        import('./practice/practiceEngine.js').then(m => m.hidePracticeArea && m.hidePracticeArea());
    };
}

/* ===== SPEECH HELPERS ===== */
function speakPhonetic(btn, lang) {
    const block = btn.closest('.meaning-block');
    const wordInput = document.getElementById('word-input');
    const word = wordInput?.value.trim();
    
    if (!word) {
        showToast('Vui lòng nhập từ vựng trước', 'error');
        return;
    }
    
    speak(word, { lang, rate: appData.settings?.speed || 1 });
    btn.classList.add('speaking');
    setTimeout(() => btn.classList.remove('speaking'), 1000);
}

function speakTextarea(btn, lang) {
    const wrapper = btn.closest('.textarea-with-speaker');
    const textarea = wrapper?.querySelector('textarea');
    const text = textarea?.value.trim();
    
    if (text) {
        const speechLang = lang === 'en' ? (appData.settings?.voice || 'en-US') : 'vi-VN';
        speak(text, { lang: speechLang, rate: appData.settings?.speed || 1 });
    } else {
        showToast('Không có nội dung để đọc', 'error');
    }
}

function speakWithAccent(text, accent) {
    if (!text) return;
    speak(text, { lang: accent, rate: appData.settings?.speed || 1 });
}

/* ===== START APP ===== */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/* ===== EXPORTS ===== */
export {
    initApp,
    currentSection,
    isInitialized,
    MW_LEARNER_KEY,
    MW_THESAURUS_KEY
};
