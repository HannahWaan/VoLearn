/**
 * VoLearn AI Practice Lab - History Manager
 * Version: 1.0.0
 * 
 * Quản lý lịch sử làm bài
 */

import { STORAGE_KEYS, SKILLS, BLOOM_LEVELS } from '../config/constants.js';

class HistoryManager {
    constructor() {
        this.history = [];
        this.maxHistory = 100; // Keep last 100 records
    }
    
    /**
     * Initialize
     */
    init() {
        this.loadHistory();
        this.bindEvents();
        console.log('✅ HistoryManager initialized, records:', this.history.length);
        return this;
    }
    
    /**
     * Bind events
     */
    bindEvents() {
        window.addEventListener('ailab:saveResults', (e) => {
            this.addRecord(e.detail);
        });
    }
    
    /**
     * Load history from localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.history);
            if (saved) {
                this.history = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading history:', e);
            this.history = [];
        }
    }
    
    /**
     * Save history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(this.history));
        } catch (e) {
            console.error('Error saving history:', e);
        }
    }
    
    /**
     * Add a new record
     */
    addRecord(results) {
        const record = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('vi-VN'),
            exerciseId: results.exercise_id,
            title: results.title || 'Bài tập',
            score: results.total_score,
            maxScore: results.max_score,
            percentage: results.percentage,
            ieltsBand: results.ielts_band_estimate,
            timeTaken: results.time_taken,
            skills: this.extractSkills(results.skill_analysis),
            bloomLevels: this.extractBloomLevels(results.bloom_analysis),
            wordCount: results.vocabulary_analysis?.length || 0,
            correctCount: results.questions?.filter(q => q.is_correct).length || 0,
            totalQuestions: results.questions?.length || 0
        };
        
        // Add to beginning
        this.history.unshift(record);
        
        // Trim to max
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
        
        this.saveHistory();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('ailab:historyUpdated', {
            detail: { record, total: this.history.length }
        }));
        
        console.log('✅ History record added:', record.id);
        return record;
    }
    
    /**
     * Extract skills from analysis
     */
    extractSkills(skillAnalysis) {
        if (!skillAnalysis) return [];
        return Object.keys(skillAnalysis).filter(s => SKILLS[s]);
    }
    
    /**
     * Extract bloom levels from analysis
     */
    extractBloomLevels(bloomAnalysis) {
        if (!bloomAnalysis) return [];
        return Object.keys(bloomAnalysis).filter(b => BLOOM_LEVELS[b]);
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get all history
     */
    getHistory() {
        return this.history;
    }
    
    /**
     * Get record by ID
     */
    getRecord(id) {
        return this.history.find(r => r.id === id);
    }
    
    /**
     * Delete record
     */
    deleteRecord(id) {
        const index = this.history.findIndex(r => r.id === id);
        if (index !== -1) {
            this.history.splice(index, 1);
            this.saveHistory();
            return true;
        }
        return false;
    }
    
    /**
     * Clear all history
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
    }
    
    /**
     * Get history for date range
     */
    getHistoryByDateRange(startDate, endDate) {
        return this.history.filter(r => {
            const date = new Date(r.timestamp);
            return date >= startDate && date <= endDate;
        });
    }
    
    /**
     * Get today's history
     */
    getTodayHistory() {
        const today = new Date().toLocaleDateString('vi-VN');
        return this.history.filter(r => r.date === today);
    }
    
    /**
     * Get this week's history
     */
    getWeekHistory() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return this.getHistoryByDateRange(weekAgo, new Date());
    }
    
    /**
     * Get statistics
     */
    getStatistics() {
        if (this.history.length === 0) {
            return {
                totalExercises: 0,
                totalTime: 0,
                averageScore: 0,
                bestScore: 0,
                averageIELTS: 0,
                skillBreakdown: {},
                dailyActivity: {},
                streak: 0
            };
        }
        
        const totalExercises = this.history.length;
        const totalTime = this.history.reduce((sum, r) => sum + (r.timeTaken || 0), 0);
        const averageScore = this.history.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExercises;
        const bestScore = Math.max(...this.history.map(r => r.percentage || 0));
        
        // IELTS average (only records with band)
        const ieltsRecords = this.history.filter(r => r.ieltsBand);
        const averageIELTS = ieltsRecords.length > 0 
            ? ieltsRecords.reduce((sum, r) => sum + r.ieltsBand, 0) / ieltsRecords.length
            : 0;
        
        // Skill breakdown
        const skillBreakdown = {};
        this.history.forEach(r => {
            r.skills?.forEach(skill => {
                if (!skillBreakdown[skill]) {
                    skillBreakdown[skill] = { count: 0, totalScore: 0 };
                }
                skillBreakdown[skill].count++;
                skillBreakdown[skill].totalScore += r.percentage || 0;
            });
        });
        
        // Calculate averages
        Object.keys(skillBreakdown).forEach(skill => {
            skillBreakdown[skill].average = skillBreakdown[skill].totalScore / skillBreakdown[skill].count;
        });
        
        // Daily activity (last 30 days)
        const dailyActivity = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        this.history.forEach(r => {
            const date = new Date(r.timestamp);
            if (date >= thirtyDaysAgo) {
                const dateStr = date.toISOString().split('T')[0];
                if (!dailyActivity[dateStr]) {
                    dailyActivity[dateStr] = { count: 0, avgScore: 0, totalScore: 0 };
                }
                dailyActivity[dateStr].count++;
                dailyActivity[dateStr].totalScore += r.percentage || 0;
            }
        });
        
        // Calculate daily averages
        Object.keys(dailyActivity).forEach(date => {
            dailyActivity[date].avgScore = dailyActivity[date].totalScore / dailyActivity[date].count;
        });
        
        return {
            totalExercises,
            totalTime,
            averageScore: Math.round(averageScore * 10) / 10,
            bestScore: Math.round(bestScore * 10) / 10,
            averageIELTS: Math.round(averageIELTS * 10) / 10,
            skillBreakdown,
            dailyActivity,
            streak: this.calculateStreak()
        };
    }
    
    /**
     * Calculate current streak
     */
    calculateStreak() {
        if (this.history.length === 0) return 0;
        
        const dates = [...new Set(this.history.map(r => r.date))].sort().reverse();
        const today = new Date().toLocaleDateString('vi-VN');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('vi-VN');
        
        // Must have done exercise today or yesterday
        if (dates[0] !== today && dates[0] !== yesterday) {
            return 0;
        }
        
        let streak = 1;
        let currentDate = new Date(this.history.find(r => r.date === dates[0]).timestamp);
        
        for (let i = 1; i < dates.length; i++) {
            currentDate.setDate(currentDate.getDate() - 1);
            const expectedDate = currentDate.toLocaleDateString('vi-VN');
            
            if (dates[i] === expectedDate) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    /**
     * Render history list
     */
    renderHistoryList(containerId = 'history-list') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.history.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-history"></i>
                    <p>Chưa có lịch sử làm bài</p>
                </div>
            `;
            return;
        }
        
        const html = this.history.map(record => `
            <div class="history-item" data-id="${record.id}">
                <div class="history-date">
                    <span class="date">${record.date}</span>
                    <span class="time">${new Date(record.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="history-info">
                    <div class="history-title">${record.title}</div>
                    <div class="history-meta">
                        <span><i class="fas fa-check"></i> ${record.correctCount}/${record.totalQuestions}</span>
                        <span><i class="fas fa-clock"></i> ${this.formatTime(record.timeTaken)}</span>
                        ${record.skills?.length > 0 ? `<span><i class="fas fa-tags"></i> ${record.skills.join(', ')}</span>` : ''}
                    </div>
                </div>
                <div class="history-score ${this.getScoreClass(record.percentage)}">
                    ${Math.round(record.percentage)}%
                </div>
                <div class="history-actions">
                    <button class="history-btn view-btn" data-id="${record.id}" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="history-btn delete-btn" data-id="${record.id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        this.bindHistoryEvents(container);
    }
    
    /**
     * Bind history item events
     */
    bindHistoryEvents(container) {
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.viewRecord(id);
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (confirm('Xóa bản ghi này?')) {
                    this.deleteRecord(id);
                    this.renderHistoryList();
                }
            });
        });
    }
    
    /**
     * View record detail
     */
    viewRecord(id) {
        const record = this.getRecord(id);
        if (record) {
            window.dispatchEvent(new CustomEvent('ailab:viewHistoryRecord', {
                detail: record
            }));
        }
    }
    
    /**
     * Get score class for styling
     */
    getScoreClass(percentage) {
        if (percentage >= 90) return 'excellent';
        if (percentage >= 75) return 'good';
        if (percentage >= 60) return 'average';
        if (percentage >= 40) return 'needs-work';
        return 'poor';
    }
    
    /**
     * Format time
     */
    formatTime(seconds) {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Export history to JSON
     */
    exportHistory() {
        const data = {
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
            records: this.history
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `volearn-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import history from JSON
     */
    importHistory(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.records && Array.isArray(data.records)) {
                // Merge with existing
                const existingIds = new Set(this.history.map(r => r.id));
                const newRecords = data.records.filter(r => !existingIds.has(r.id));
                
                this.history = [...newRecords, ...this.history]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, this.maxHistory);
                
                this.saveHistory();
                return { success: true, imported: newRecords.length };
            }
            
            return { success: false, error: 'Invalid format' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

// Export singleton
export const historyManager = new HistoryManager();
export default HistoryManager;
