/* ===== AI PRACTICE LAB - MAIN MODULE ===== */
/* VoLearn v1.0.0 */

import { SettingsPanel } from './settings/SettingsPanel.js';
import { ExerciseManager } from './exercise/ExerciseManager.js';
import { ResultsPanel } from './results/ResultsPanel.js';
import { HistoryManager } from './history/HistoryManager.js';
import { DailyChallenge } from './daily/DailyChallenge.js';
import { StreakManager } from './daily/StreakManager.js';
import { AIService } from './ai/AIService.js';

/* ===== STATE ===== */
const state = {
    currentPanel: 'settings', // settings | exercise | results | history | stats
    settings: null,
    exercise: null,
    results: null,
    isLoading: false
};

/* ===== MODULES ===== */
let settingsPanel = null;
let exerciseManager = null;
let resultsPanel = null;
let historyManager = null;
let dailyChallenge = null;
let streakManager = null;
let aiService = null;

/* ===== INIT ===== */
export function initAILab() {
    console.log('🧠 Initializing AI Practice Lab...');
    
    // Initialize modules
    settingsPanel = new SettingsPanel();
    exerciseManager = new ExerciseManager();
    resultsPanel = new ResultsPanel();
    historyManager = new HistoryManager();
    dailyChallenge = new DailyChallenge();
    streakManager = new StreakManager();
    aiService = new AIService();
    
    // Bind events
    bindEvents();
    
    // Load initial data
    loadInitialData();
    
    // Update UI
    updateStreakDisplay();
    
    console.log('✅ AI Practice Lab initialized');
}

/* ===== BIND EVENTS ===== */
function bindEvents() {
    // Header buttons
    document.getElementById('btn-ai-lab-history')?.addEventListener('click', showHistory);
    document.getElementById('btn-ai-lab-stats')?.addEventListener('click', showStats);
    
    // Daily challenge
    document.getElementById('btn-daily-start')?.addEventListener('click', startDailyChallenge);
    
    // Settings panel
    document.getElementById('btn-generate')?.addEventListener('click', generateExercise);
    document.getElementById('btn-save-preset')?.addEventListener('click', savePreset);
    
    // Exercise panel
    document.getElementById('btn-exit-exercise')?.addEventListener('click', exitExercise);
    document.getElementById('btn-prev-question')?.addEventListener('click', prevQuestion);
    document.getElementById('btn-next-question')?.addEventListener('click', nextQuestion);
    document.getElementById('btn-submit-exercise')?.addEventListener('click', submitExercise);
    
    // Results panel
    document.getElementById('btn-retry')?.addEventListener('click', retryExercise);
    document.getElementById('btn-view-answers')?.addEventListener('click', viewAnswers);
    document.getElementById('btn-new-exercise')?.addEventListener('click', newExercise);
    
    // History & Stats close buttons
    document.getElementById('btn-close-history')?.addEventListener('click', () => showPanel('settings'));
    document.getElementById('btn-close-stats')?.addEventListener('click', () => showPanel('settings'));
    
    // Source options toggle
    document.querySelectorAll('input[name="exercise-source"]').forEach(radio => {
        radio.addEventListener('change', toggleWebSearchOptions);
    });
    
    // Topic tags
    document.querySelectorAll('.topic-tag').forEach(tag => {
        tag.addEventListener('click', () => toggleTopicTag(tag));
    });
    
    // Vocab toggle
    document.getElementById('vocab-toggle')?.addEventListener('change', toggleVocabOptions);
    
    // Standard toggle (IELTS/Free)
    document.querySelectorAll('input[name="standard"]').forEach(radio => {
        radio.addEventListener('change', toggleStandardOptions);
    });
    
    // Bloom presets
    document.querySelectorAll('.bloom-preset').forEach(btn => {
        btn.addEventListener('click', () => applyBloomPreset(btn.dataset.preset));
    });
    
    // Time limit custom
    document.querySelectorAll('input[name="time-limit"]').forEach(radio => {
        radio.addEventListener('change', toggleCustomTime);
    });
    
    // Sliders
    document.getElementById('vocab-amount')?.addEventListener('input', updateVocabAmount);
    document.getElementById('ielts-level')?.addEventListener('input', updateIELTSLevel);
    document.getElementById('question-type-ratio')?.addEventListener('input', updateQuestionTypeRatio);
    
    // Bloom level changes
    document.querySelectorAll('.bloom-count').forEach(select => {
        select.addEventListener('change', updateBloomTotal);
    });
    document.querySelectorAll('.bloom-toggle input').forEach(toggle => {
        toggle.addEventListener('change', updateBloomTotal);
    });
}

/* ===== PANEL MANAGEMENT ===== */
function showPanel(panelName) {
    const panels = ['settings', 'exercise', 'results', 'history', 'stats'];
    
    panels.forEach(name => {
        const panel = document.getElementById(`ai-lab-${name}`);
        if (panel) {
            panel.style.display = name === panelName ? 'block' : 'none';
        }
    });
    
    // Special handling for exercise panel (flex)
    if (panelName === 'exercise') {
        document.getElementById('ai-lab-exercise').style.display = 'flex';
    }
    
    state.currentPanel = panelName;
}

function showHistory() {
    historyManager.render();
    showPanel('history');
}

function showStats() {
    // TODO: Render stats with charts
    showPanel('stats');
}

/* ===== LOADING ===== */
function showLoading(message = 'AI đang tạo bài tập...') {
    const loading = document.getElementById('ai-lab-loading');
    const loadingText = loading?.querySelector('.loading-text');
    
    if (loadingText) loadingText.textContent = message;
    if (loading) loading.style.display = 'flex';
    
    state.isLoading = true;
}

function hideLoading() {
    const loading = document.getElementById('ai-lab-loading');
    if (loading) loading.style.display = 'none';
    
    state.isLoading = false;
}

/* ===== SETTINGS HANDLERS ===== */
function toggleVocabOptions(e) {
    const options = document.getElementById('vocab-options');
    if (options) {
        options.style.display = e.target.checked ? 'block' : 'none';
    }
}

function toggleStandardOptions(e) {
    const ieltsGroup = document.getElementById('ielts-level-group');
    const strictMode = document.getElementById('strict-mode');
    
    if (e.target.value === 'ielts') {
        if (ieltsGroup) ieltsGroup.style.display = 'block';
        if (strictMode) strictMode.checked = true; // IELTS mode enables strict by default
    } else {
        if (ieltsGroup) ieltsGroup.style.display = 'none';
    }
}

function toggleWebSearchOptions(e) {
    const options = document.getElementById('web-search-options');
    if (options) {
        const showOptions = e.target.value === 'web-search' || e.target.value === 'mixed';
        options.style.display = showOptions ? 'block' : 'none';
    }
}

function toggleTopicTag(tag) {
    tag.classList.toggle('active');
}

function toggleCustomTime(e) {
    const customInput = document.getElementById('custom-time');
    if (customInput) {
        customInput.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
    }
}

function updateVocabAmount(e) {
    const value = document.getElementById('vocab-amount-value');
    if (value) value.textContent = `${e.target.value} từ`;
}

function updateIELTSLevel(e) {
    const value = document.getElementById('ielts-level-value');
    if (value) value.textContent = `Band ${e.target.value}`;
}

function updateQuestionTypeRatio(e) {
    const value = document.getElementById('qtype-value');
    const ratio = e.target.value;
    if (value) value.textContent = `${ratio}% : ${100 - ratio}%`;
}

function updateBloomTotal() {
    let total = 0;
    
    document.querySelectorAll('.bloom-level').forEach(level => {
        const toggle = level.querySelector('.bloom-toggle input');
        const count = level.querySelector('.bloom-count');
        
        if (toggle?.checked && count) {
            total += parseInt(count.value) || 0;
        }
    });
    
    const totalEl = document.getElementById('bloom-total');
    if (totalEl) totalEl.textContent = `${total} câu`;
}

function applyBloomPreset(preset) {
    // Update active state
    document.querySelectorAll('.bloom-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    
    // Show/hide random options
    const randomOptions = document.getElementById('bloom-random-options');
    const bloomLevels = document.getElementById('bloom-levels');
    
    if (preset === 'random') {
        if (randomOptions) randomOptions.style.display = 'block';
        if (bloomLevels) bloomLevels.style.display = 'none';
    } else {
        if (randomOptions) randomOptions.style.display = 'none';
        if (bloomLevels) bloomLevels.style.display = 'flex';
        
        // Apply preset values
        const presets = {
            basic: [4, 4, 2, 0, 0, 0],
            balanced: [2, 2, 3, 2, 2, 1],
            advanced: [1, 1, 2, 3, 3, 2],
            ielts: [0, 3, 4, 3, 2, 0]
        };
        
        const values = presets[preset] || presets.balanced;
        
        values.forEach((val, idx) => {
            const select = document.querySelector(`.bloom-count[data-level="${idx + 1}"]`);
            const toggle = document.querySelector(`.bloom-toggle input[data-level="${idx + 1}"]`);
            
            if (select) select.value = val;
            if (toggle) toggle.checked = val > 0;
        });
        
        updateBloomTotal();
    }
}

function savePreset() {
    const settings = settingsPanel.getSettings();
    // TODO: Save to localStorage
    console.log('Saving preset:', settings);
    showToast('Đã lưu preset!', 'success');
}

/* ===== EXERCISE HANDLERS ===== */
async function generateExercise() {
    if (state.isLoading) return;
    
    const settings = settingsPanel.getSettings();
    
    // Validate settings
    if (!validateSettings(settings)) return;
    
    showLoading('AI đang tạo bài tập...');
    
    try {
        const exercise = await aiService.generateExercise(settings);
        
        state.exercise = exercise;
        state.settings = settings;
        
        exerciseManager.loadExercise(exercise, settings);
        showPanel('exercise');
        
    } catch (error) {
        console.error('Generate exercise error:', error);
        showToast('Lỗi khi tạo bài tập. Vui lòng thử lại.', 'error');
    } finally {
        hideLoading();
    }
}

function validateSettings(settings) {
    // Check if at least one skill is selected
    if (settings.skills.main.length === 0 && settings.skills.sub.length === 0) {
        showToast('Vui lòng chọn ít nhất một kỹ năng!', 'warning');
        return false;
    }
    
    // Check bloom total
    if (settings.bloom.total === 0) {
        showToast('Vui lòng chọn số câu hỏi!', 'warning');
        return false;
    }
    
    return true;
}

function exitExercise() {
    if (exerciseManager.hasUnansweredQuestions()) {
        showConfirm({
            title: 'Thoát bài tập?',
            message: 'Bạn chưa hoàn thành bài tập. Bạn có chắc muốn thoát?',
            type: 'warning',
            confirmText: 'Thoát',
            onConfirm: () => showPanel('settings')
        });
    } else {
        showPanel('settings');
    }
}

function prevQuestion() {
    exerciseManager.goToPrevQuestion();
}

function nextQuestion() {
    exerciseManager.goToNextQuestion();
}

async function submitExercise() {
    if (exerciseManager.hasUnansweredQuestions()) {
        showConfirm({
            title: 'Nộp bài?',
            message: 'Bạn còn câu chưa trả lời. Bạn có chắc muốn nộp bài?',
            type: 'warning',
            confirmText: 'Nộp bài',
            onConfirm: doSubmitExercise
        });
    } else {
        doSubmitExercise();
    }
}

async function doSubmitExercise() {
    showLoading('Đang chấm bài...');
    
    try {
        const answers = exerciseManager.getAnswers();
        const results = await aiService.gradeExercise(state.exercise, answers, state.settings);
        
        state.results = results;
        
        // Save to history
        historyManager.saveExercise({
            date: new Date().toISOString(),
            settings: state.settings,
            exercise: state.exercise,
            answers: answers,
            results: results
        });
        
        // Update streak
        streakManager.recordActivity();
        updateStreakDisplay();
        
        // Show results
        resultsPanel.render(results);
        showPanel('results');
        
    } catch (error) {
        console.error('Submit exercise error:', error);
        showToast('Lỗi khi chấm bài. Vui lòng thử lại.', 'error');
    } finally {
        hideLoading();
    }
}

/* ===== RESULTS HANDLERS ===== */
function retryExercise() {
    exerciseManager.reset();
    showPanel('exercise');
}

function viewAnswers() {
    exerciseManager.showAnswers(state.results);
}

function newExercise() {
    state.exercise = null;
    state.results = null;
    showPanel('settings');
}

/* ===== DAILY CHALLENGE ===== */
async function startDailyChallenge() {
    showLoading('Đang tạo thử thách hôm nay...');
    
    try {
        const challenge = await dailyChallenge.generate();
        
        state.exercise = challenge.exercise;
        state.settings = challenge.settings;
        
        exerciseManager.loadExercise(challenge.exercise, challenge.settings);
        showPanel('exercise');
        
    } catch (error) {
        console.error('Daily challenge error:', error);
        showToast('Lỗi khi tạo thử thách. Vui lòng thử lại.', 'error');
    } finally {
        hideLoading();
    }
}

/* ===== STREAK ===== */
function updateStreakDisplay() {
    const streak = streakManager.getCurrentStreak();
    const countEl = document.getElementById('streak-count');
    if (countEl) countEl.textContent = streak;
}

/* ===== HELPERS ===== */
function loadInitialData() {
    // Load vocab counts
    updateVocabCounts();
    
    // Load saved settings
    settingsPanel.loadSavedSettings();
    
    // Update Bloom total
    updateBloomTotal();
}

function updateVocabCounts() {
    // Import appData from state
    const appData = window.appData || { vocabulary: [] };
    const vocab = appData.vocabulary || [];
    
    // All words
    const allCount = document.getElementById('vocab-count-all');
    if (allCount) allCount.textContent = `${vocab.length} từ`;
    
    // Unlearned (SRS 0-2)
    const unlearnedCount = document.getElementById('vocab-count-unlearned');
    if (unlearnedCount) {
        const count = vocab.filter(w => (w.srsLevel || 0) <= 2).length;
        unlearnedCount.textContent = `${count} từ`;
    }
    
    // Bookmarked
    const bookmarkedCount = document.getElementById('vocab-count-bookmarked');
    if (bookmarkedCount) {
        const count = vocab.filter(w => w.bookmarked).length;
        bookmarkedCount.textContent = `${count} từ`;
    }
    
    // Populate set select
    const setSelect = document.getElementById('vocab-set-select');
    if (setSelect) {
        const sets = window.appData?.sets || [];
        setSelect.innerHTML = '<option value="">Chọn bộ từ</option>';
        sets.forEach(set => {
            const count = vocab.filter(w => w.setId === set.id).length;
            setSelect.innerHTML += `<option value="${set.id}">${set.name} (${count} từ)</option>`;
        });
    }
}

/* ===== TOAST HELPER ===== */
function showToast(message, type = 'info') {
    // Use existing toast system if available
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

/* ===== CONFIRM HELPER ===== */
function showConfirm(options) {
    if (window.showConfirm) {
        window.showConfirm(options);
    } else {
        if (confirm(options.message)) {
            options.onConfirm?.();
        }
    }
}

/* ===== EXPORTS ===== */
export {
    showPanel,
    showLoading,
    hideLoading,
    updateStreakDisplay
};
