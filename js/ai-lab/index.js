/**
 * VoLearn AI Practice Lab - Main Entry Point
 * Version: 1.0.0
 * 
 * Khởi tạo và quản lý toàn bộ AI Practice Lab
 */

// Import modules
import { STORAGE_KEYS, SKILLS, BLOOM_LEVELS } from './config/constants.js';
import { DEFAULT_SETTINGS, getBloomPreset, scaleBloomDistribution } from './config/presets.js';
import { exerciseManager } from './exercise/ExerciseManager.js';
import { splitView } from './exercise/SplitView.js';
import { highlightManager } from './exercise/HighlightManager.js';
import { resultsPanel } from './results/ResultsPanel.js';
import { historyManager } from './history/HistoryManager.js';
import { dailyChallenge } from './daily/DailyChallenge.js';
import { aiService } from './ai/AIService.js';
import { promptBuilder } from './ai/PromptBuilder.js';
import { webSearchService } from './ai/WebSearchService.js';

class AILabApp {
    constructor() {
        this.isInitialized = false;
        this.currentView = 'settings'; // 'settings', 'exercise', 'results', 'history', 'stats'
        this.settings = { ...DEFAULT_SETTINGS };
        this.vocabulary = [];
        this.currentExercise = null;
    }
    
    /**
     * Initialize the app
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing AI Practice Lab...');
        
        // Load saved settings
        this.loadSettings();
        
        // Initialize all modules
        aiService.init();
        historyManager.init();
        dailyChallenge.init();
        resultsPanel.init('results-panel');
        
        // Bind events
        this.bindEvents();
        
        // Render initial UI
        this.renderSettingsPanel();
        this.renderDailyCard();
        
        // Load vocabulary from main app
        this.loadVocabulary();
        
        this.isInitialized = true;
        console.log('✅ AI Practice Lab initialized');
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.settings);
            if (saved) {
                this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }
    
    /**
     * Load vocabulary from main VoLearn app
     */
    loadVocabulary() {
        try {
            const voLearnData = localStorage.getItem('volearn_data');
            if (voLearnData) {
                const data = JSON.parse(voLearnData);
                this.vocabulary = data.vocabulary || [];
                console.log(`📚 Loaded ${this.vocabulary.length} vocabulary words`);
            }
        } catch (e) {
            console.error('Error loading vocabulary:', e);
            this.vocabulary = [];
        }
    }
    
    /**
     * Bind all events
     */
    bindEvents() {
        // Settings form events
        this.bindSettingsEvents();
        
        // Navigation events
        this.bindNavigationEvents();
        
        // Exercise events
        this.bindExerciseEvents();
        
        // Global events
        this.bindGlobalEvents();
    }
    
    /**
     * Bind settings panel events
     */
    bindSettingsEvents() {
        // Vocabulary source
        document.querySelectorAll('input[name="vocab-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.vocabSource = e.target.value;
                this.updateVocabSourceUI();
                this.saveSettings();
            });
        });
        
        // Set selector
        document.getElementById('vocab-set-select')?.addEventListener('change', (e) => {
            this.settings.selectedSet = e.target.value || null;
            this.saveSettings();
        });
        
        // Word count slider
        document.getElementById('word-count-slider')?.addEventListener('input', (e) => {
            this.settings.wordCount = parseInt(e.target.value);
            document.getElementById('word-count-value').textContent = this.settings.wordCount;
            this.saveSettings();
        });
        
        // Skills checkboxes
        document.querySelectorAll('.skill-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.settings.skills = Array.from(document.querySelectorAll('.skill-checkbox:checked'))
                    .map(cb => cb.value);
                this.saveSettings();
            });
        });
        
        // IELTS band selector
        document.getElementById('ielts-band-select')?.addEventListener('change', (e) => {
            this.settings.ieltsTarget = parseFloat(e.target.value);
            this.saveSettings();
        });
        
        // Bloom preset buttons
        document.querySelectorAll('.bloom-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetId = btn.dataset.preset;
                this.applyBloomPreset(presetId);
            });
        });
        
        // Bloom level inputs
        document.querySelectorAll('.bloom-level-input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateBloomDistribution();
            });
        });
        
        // MC/Essay ratio slider
        document.getElementById('mc-ratio-slider')?.addEventListener('input', (e) => {
            this.settings.mcRatio = parseInt(e.target.value);
            this.updateRatioDisplay();
            this.saveSettings();
        });
        
        // Time limit
        document.getElementById('time-limit-select')?.addEventListener('change', (e) => {
            this.settings.timeLimit = parseInt(e.target.value);
            this.saveSettings();
        });
        
        // AI Model
        document.getElementById('ai-model-select')?.addEventListener('change', (e) => {
            this.settings.aiModel = e.target.value;
            aiService.setModel(e.target.value);
            this.saveSettings();
        });
        
        // Exercise source
        document.querySelectorAll('input[name="exercise-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.exerciseSource = e.target.value;
                this.updateExerciseSourceUI();
                this.saveSettings();
            });
        });
        
        // Web sources checkboxes
        document.querySelectorAll('.web-source-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.settings.webSources = Array.from(document.querySelectorAll('.web-source-checkbox:checked'))
                    .map(cb => cb.value);
                this.saveSettings();
            });
        });
        
        // Strict mode toggle
        document.getElementById('strict-mode-toggle')?.addEventListener('change', (e) => {
            this.settings.strictMode = e.target.checked;
            this.saveSettings();
        });
        
        // Generate button
        document.getElementById('generate-exercise-btn')?.addEventListener('click', () => {
            this.generateExercise();
        });
        
        // API Settings button
        document.getElementById('api-settings-btn')?.addEventListener('click', () => {
            this.showAPISettingsModal();
        });
    }
    
    /**
     * Bind navigation events
     */
    bindNavigationEvents() {
        // Tab navigation
        document.querySelectorAll('.ailab-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Back buttons
        document.querySelectorAll('.back-to-settings-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView('settings');
            });
        });
    }
    
    /**
     * Bind exercise events
     */
    bindExerciseEvents() {
        // Submit button
        document.getElementById('submit-exercise-btn')?.addEventListener('click', () => {
            this.submitExercise();
        });
        
        // Clear all button
        document.getElementById('clear-all-btn')?.addEventListener('click', () => {
            exerciseManager.clearAllAnswers();
        });
        
        // Show hints toggle
        document.getElementById('show-hints-toggle')?.addEventListener('change', (e) => {
            this.settings.showHints = e.target.checked;
            this.toggleHints(e.target.checked);
        });
        
        // Daily challenge start
        window.addEventListener('ailab:startDailyChallenge', () => {
            this.startDailyChallenge();
        });
        
        // Results callbacks
        resultsPanel.setCallbacks({
            onRetry: () => this.retryExercise(),
            onNewExercise: () => this.switchView('settings')
        });
    }
    
    /**
     * Bind global events
     */
    bindGlobalEvents() {
        // Vocabulary updated
        window.addEventListener('volearn:wordSaved', () => {
            this.loadVocabulary();
            this.updateVocabCount();
        });
        
        window.addEventListener('volearn:wordDeleted', () => {
            this.loadVocabulary();
            this.updateVocabCount();
        });
        
        // History updated
        window.addEventListener('ailab:historyUpdated', () => {
            if (this.currentView === 'history') {
                historyManager.renderHistoryList();
            }
        });
        
        // Daily completed
        window.addEventListener('ailab:dailyCompleted', (e) => {
            this.renderDailyCard();
            this.showToast(`🔥 Streak: ${e.detail.streak} ngày!`, 'success');
        });
    }
    
    /**
     * Render settings panel
     */
    renderSettingsPanel() {
        // Populate set selector
        this.populateSetSelector();
        
        // Update word count display
        const wordCountSlider = document.getElementById('word-count-slider');
        const wordCountValue = document.getElementById('word-count-value');
        if (wordCountSlider && wordCountValue) {
            wordCountSlider.value = this.settings.wordCount;
            wordCountValue.textContent = this.settings.wordCount;
        }
        
        // Update skills checkboxes
        document.querySelectorAll('.skill-checkbox').forEach(cb => {
            cb.checked = this.settings.skills.includes(cb.value);
        });
        
        // Update IELTS band
        const ieltsBandSelect = document.getElementById('ielts-band-select');
        if (ieltsBandSelect) {
            ieltsBandSelect.value = this.settings.ieltsTarget;
        }
        
        // Update Bloom distribution
        this.renderBloomDistribution();
        
        // Update ratio display
        this.updateRatioDisplay();
        
        // Update AI model
        const aiModelSelect = document.getElementById('ai-model-select');
        if (aiModelSelect) {
            aiModelSelect.value = this.settings.aiModel;
        }
        
        // Update vocab count
        this.updateVocabCount();
    }
    
    /**
     * Populate set selector
     */
    populateSetSelector() {
        const select = document.getElementById('vocab-set-select');
        if (!select) return;
        
        try {
            const voLearnData = localStorage.getItem('volearn_data');
            if (voLearnData) {
                const data = JSON.parse(voLearnData);
                const sets = data.sets || [];
                
                select.innerHTML = '<option value="">-- Tất cả từ vựng --</option>';
                sets.forEach(set => {
                    const wordCount = this.vocabulary.filter(v => v.setId === set.id).length;
                    select.innerHTML += `<option value="${set.id}">${set.name} (${wordCount} từ)</option>`;
                });
                
                if (this.settings.selectedSet) {
                    select.value = this.settings.selectedSet;
                }
            }
        } catch (e) {
            console.error('Error populating sets:', e);
        }
    }
    
    /**
     * Update vocab count display
     */
    updateVocabCount() {
        const countEl = document.getElementById('total-vocab-count');
        if (countEl) {
            countEl.textContent = this.vocabulary.length;
        }
    }
    
    /**
     * Update vocab source UI
     */
    updateVocabSourceUI() {
        const setSelectContainer = document.getElementById('set-select-container');
        if (setSelectContainer) {
            setSelectContainer.style.display = this.settings.vocabSource === 'set' ? 'block' : 'none';
        }
    }
    
    /**
     * Update exercise source UI
     */
    updateExerciseSourceUI() {
        const webOptionsContainer = document.getElementById('web-search-options');
        if (webOptionsContainer) {
            const showWeb = ['web-search', 'mixed'].includes(this.settings.exerciseSource);
            webOptionsContainer.style.display = showWeb ? 'block' : 'none';
        }
    }
    
    /**
     * Apply Bloom preset
     */
    applyBloomPreset(presetId) {
        const preset = getBloomPreset(presetId);
        
        // Scale to current word count
        this.settings.bloomDistribution = scaleBloomDistribution(
            preset.distribution,
            this.settings.wordCount
        );
        this.settings.bloomPreset = presetId;
        
        this.renderBloomDistribution();
        this.saveSettings();
        
        // Update active button
        document.querySelectorAll('.bloom-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetId);
        });
    }
    
    /**
     * Render Bloom distribution inputs
     */
    renderBloomDistribution() {
        Object.entries(BLOOM_LEVELS).forEach(([level, info]) => {
            const input = document.getElementById(`bloom-${level}`);
            if (input) {
                input.value = this.settings.bloomDistribution[level] || 0;
            }
        });
        
        this.updateBloomTotal();
    }
    
    /**
     * Update Bloom distribution from inputs
     */
    updateBloomDistribution() {
        Object.keys(BLOOM_LEVELS).forEach(level => {
            const input = document.getElementById(`bloom-${level}`);
            if (input) {
                this.settings.bloomDistribution[level] = parseInt(input.value) || 0;
            }
        });
        
        this.updateBloomTotal();
        this.saveSettings();
    }
    
    /**
     * Update Bloom total display
     */
    updateBloomTotal() {
        const total = Object.values(this.settings.bloomDistribution).reduce((a, b) => a + b, 0);
        const totalEl = document.getElementById('bloom-total');
        if (totalEl) {
            totalEl.textContent = total;
            totalEl.classList.toggle('warning', total !== this.settings.wordCount);
        }
    }
    
    /**
     * Update ratio display
     */
    updateRatioDisplay() {
        const mcValue = document.getElementById('mc-ratio-value');
        const essayValue = document.getElementById('essay-ratio-value');
        
        if (mcValue) mcValue.textContent = `${this.settings.mcRatio}%`;
        if (essayValue) essayValue.textContent = `${100 - this.settings.mcRatio}%`;
    }
    
    /**
     * Render daily card
     */
    renderDailyCard() {
        dailyChallenge.renderDailyCard('daily-challenge-card');
    }
    
    /**
     * Switch tab
     */
    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.ailab-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.ailab-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
        
        // Load tab content if needed
        if (tabId === 'history') {
            historyManager.renderHistoryList('history-list');
        } else if (tabId === 'stats') {
            this.renderStatistics();
        }
    }
    
    /**
     * Switch view
     */
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.ailab-view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}-view`);
        });
    }
    
    /**
     * Generate exercise
     */
    async generateExercise() {
        // Validate settings
        if (!this.validateSettings()) return;
        
        // Get vocabulary to use
        const vocabToUse = this.getVocabularyForExercise();
        
        if (vocabToUse.length === 0) {
            this.showToast('Không có từ vựng để tạo bài tập!', 'error');
            return;
        }
        
        // Show loading
        this.showLoading(true);
        
        try {
            // Check AI configuration
            if (!aiService.isConfigured()) {
                this.showAPISettingsModal();
                this.showLoading(false);
                return;
            }
            
            // Generate exercise
            const result = await aiService.generateExercise(this.settings, vocabToUse);
            
            if (result.success) {
                this.currentExercise = result.exercise;
                this.startExercise();
            } else {
                this.showToast(`Lỗi: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Generate exercise error:', error);
            this.showToast('Có lỗi xảy ra khi tạo bài tập', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Validate settings before generating
     */
    validateSettings() {
        if (this.settings.skills.length === 0) {
            this.showToast('Vui lòng chọn ít nhất một kỹ năng!', 'warning');
            return false;
        }
        
        const bloomTotal = Object.values(this.settings.bloomDistribution).reduce((a, b) => a + b, 0);
        if (bloomTotal === 0) {
            this.showToast('Vui lòng cấu hình số câu hỏi theo Bloom!', 'warning');
            return false;
        }
        
        return true;
    }
    
    /**
     * Get vocabulary for exercise based on settings
     */
    getVocabularyForExercise() {
        let vocab = [...this.vocabulary];
        
        // Filter by source
        switch (this.settings.vocabSource) {
            case 'set':
                if (this.settings.selectedSet) {
                    vocab = vocab.filter(v => v.setId === this.settings.selectedSet);
                }
                break;
            case 'srs':
                vocab = vocab.filter(v => (v.srsLevel || 0) <= 2);
                break;
            case 'bookmark':
                vocab = vocab.filter(v => v.bookmarked);
                break;
            case 'recent':
                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                vocab = vocab.filter(v => new Date(v.createdAt).getTime() > weekAgo);
                break;
        }
        
        // Shuffle and limit
        vocab = vocab.sort(() => 0.5 - Math.random());
        return vocab.slice(0, this.settings.wordCount);
    }
    
    /**
     * Start exercise
     */
    startExercise() {
        // Switch to exercise view
        this.switchView('exercise');
        
        // Initialize split view
        splitView.loadPreference();
        splitView.init('exercise-split-view');
        
        // Initialize highlight manager
        highlightManager.init({
            strictMode: this.settings.strictMode
        });
        
        // Load exercise into manager
        exerciseManager.loadExercise(this.currentExercise, {
            timeLimit: this.settings.timeLimit,
            showHints: this.settings.showHints
        });
        
        // Set callbacks
        exerciseManager.onTimeUp = () => this.handleTimeUp();
        exerciseManager.onSubmit = (submission) => this.handleSubmission(submission);
    }
    
    /**
     * Submit exercise
     */
    submitExercise() {
        const submission = exerciseManager.submitExercise();
        if (submission) {
            this.handleSubmission(submission);
        }
    }
    
    /**
     * Handle submission
     */
    async handleSubmission(submission) {
        this.showLoading(true);
        
        try {
            // Grade exercise
            const gradeResult = await aiService.gradeExercise(
                this.currentExercise,
                submission.answers
            );
            
            if (gradeResult.success) {
                const results = {
                    ...gradeResult.results,
                    time_taken: submission.timeTaken,
                    title: this.currentExercise.title
                };
                
                // Show results
                this.switchView('results');
                resultsPanel.showResults(results);
                
                // Save to history
                historyManager.addRecord(results);
            } else {
                this.showToast('Lỗi khi chấm điểm', 'error');
            }
        } catch (error) {
            console.error('Grading error:', error);
            this.showToast('Có lỗi xảy ra', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Handle time up
     */
    handleTimeUp() {
        this.showToast('⏰ Hết giờ! Bài tập sẽ được nộp tự động.', 'warning');
    }
    
    /**
     * Retry exercise
     */
    retryExercise() {
        if (this.currentExercise) {
            this.startExercise();
        }
    }
    
    /**
     * Start daily challenge
     */
    async startDailyChallenge() {
        this.showLoading(true);
        
        try {
            const challenge = await dailyChallenge.getTodayChallenge(this.vocabulary);
            
            if (challenge) {
                this.currentExercise = {
                    exercise_id: challenge.challenge_id,
                    title: challenge.title,
                    description: challenge.description,
                    sections: [{
                        section_id: 'daily_section',
                        skill: 'vocabulary',
                        bloom_level: 'remember',
                        instructions: 'Hoàn thành thử thách hàng ngày!',
                        questions: challenge.questions
                    }],
                    vocabulary_focus: challenge.words
                };
                
                // Override settings for daily
                const dailySettings = {
                    ...this.settings,
                    timeLimit: 5,
                    showHints: true,
                    strictMode: false
                };
                
                this.switchView('exercise');
                exerciseManager.loadExercise(this.currentExercise, dailySettings);
                
                // Mark as daily challenge
                exerciseManager.onSubmit = (submission) => {
                    this.handleDailySubmission(submission);
                };
            }
        } catch (error) {
            console.error('Daily challenge error:', error);
            this.showToast('Không thể tải thử thách', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Handle daily submission
     */
    async handleDailySubmission(submission) {
        await this.handleSubmission(submission);
        
        // Mark daily as completed
        dailyChallenge.completeChallenge(submission);
    }
    
    /**
     * Render statistics
     */
    renderStatistics() {
        const stats = historyManager.getStatistics();
        const container = document.getElementById('stats-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-book"></i></div>
                    <div class="stat-value">${stats.totalExercises}</div>
                    <div class="stat-label">Bài đã làm</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${Math.round(stats.totalTime / 60)}</div>
                    <div class="stat-label">Phút luyện tập</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                    <div class="stat-value">${stats.averageScore}%</div>
                    <div class="stat-label">Điểm trung bình</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-trophy"></i></div>
                    <div class="stat-value">${stats.bestScore}%</div>
                    <div class="stat-label">Điểm cao nhất</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-fire"></i></div>
                    <div class="stat-value">${stats.streak}</div>
                    <div class="stat-label">Ngày streak</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-certificate"></i></div>
                    <div class="stat-value">${stats.averageIELTS || '--'}</div>
                    <div class="stat-label">IELTS TB</div>
                </div>
            </div>
            
            <div class="stats-section">
                <h3>Phân tích theo kỹ năng</h3>
                <div class="skill-stats">
                    ${Object.entries(stats.skillBreakdown).map(([skill, data]) => `
                        <div class="skill-stat-item">
                            <span class="skill-name">${SKILLS[skill]?.name || skill}</span>
                            <span class="skill-count">${data.count} bài</span>
                            <span class="skill-avg">${Math.round(data.average)}%</span>
                        </div>
                    `).join('') || '<p>Chưa có dữ liệu</p>'}
                </div>
            </div>
        `;
    }
    
    /**
     * Show API settings modal
     */
    showAPISettingsModal() {
        const modal = document.getElementById('api-settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.loadAPISettingsToModal();
        }
    }
    
    /**
     * Load API settings to modal
     */
    loadAPISettingsToModal() {
        // Load current worker URL
        const workerUrlInput = document.getElementById('worker-url-input');
        if (workerUrlInput) {
            workerUrlInput.value = localStorage.getItem('volearn_ai_worker_url') || '';
        }
        
        // API keys are not shown for security
    }
    
    /**
     * Save API settings from modal
     */
    saveAPISettings() {
        const workerUrl = document.getElementById('worker-url-input')?.value?.trim();
        const claudeKey = document.getElementById('claude-api-key')?.value?.trim();
        const gptKey = document.getElementById('gpt-api-key')?.value?.trim();
        const geminiKey = document.getElementById('gemini-api-key')?.value?.trim();
        
        // Save worker URL
        if (workerUrl) {
            aiService.setWorkerUrl(workerUrl);
        }
        
        // Save API keys (if provided)
        const keys = {};
        if (claudeKey) keys.claude = claudeKey;
        if (gptKey) keys.gpt = gptKey;
        if (geminiKey) keys.gemini = geminiKey;
        
        if (Object.keys(keys).length > 0) {
            aiService.saveApiKeys(keys);
        }
        
        // Close modal
        this.hideAPISettingsModal();
        this.showToast('Đã lưu cài đặt API!', 'success');
    }
    
    /**
     * Hide API settings modal
     */
    hideAPISettingsModal() {
        const modal = document.getElementById('api-settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    /**
     * Toggle hints visibility
     */
    toggleHints(show) {
        document.querySelectorAll('.question-hints').forEach(hint => {
            hint.style.display = show ? '' : 'none';
        });
    }
    
    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('ailab-loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Use existing toast system or create simple one
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            // Simple fallback
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
}

// Create and export singleton
export const aiLabApp = new AILabApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init if we're on the AI Lab section
    if (document.getElementById('ai-lab-section')) {
        aiLabApp.init();
    }
});

// Also init when navigating to section
window.addEventListener('volearn:sectionChanged', (e) => {
    if (e.detail?.section === 'ai-lab') {
        aiLabApp.init();
    }
});

// Expose globally for debugging
window.aiLabApp = aiLabApp;

export default AILabApp;
