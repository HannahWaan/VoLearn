/**
 * VoLearn AI Practice Lab - Daily Challenge
 * Version: 1.0.0
 * 
 * Quản lý Daily Challenge đơn giản
 */

import { STORAGE_KEYS, DAILY_CONFIG } from '../config/constants.js';

class DailyChallenge {
    constructor() {
        this.todayChallenge = null;
        this.isCompleted = false;
        this.streak = 0;
        this.lastCompletedDate = null;
    }
    
    /**
     * Initialize
     */
    init() {
        this.loadState();
        this.checkNewDay();
        console.log('✅ DailyChallenge initialized, streak:', this.streak);
        return this;
    }
    
    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.daily);
            if (saved) {
                const data = JSON.parse(saved);
                this.todayChallenge = data.todayChallenge;
                this.isCompleted = data.isCompleted || false;
                this.lastCompletedDate = data.lastCompletedDate;
            }
            
            const streakData = localStorage.getItem(STORAGE_KEYS.streak);
            if (streakData) {
                const streak = JSON.parse(streakData);
                this.streak = streak.count || 0;
            }
        } catch (e) {
            console.error('Error loading daily state:', e);
        }
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(STORAGE_KEYS.daily, JSON.stringify({
                todayChallenge: this.todayChallenge,
                isCompleted: this.isCompleted,
                lastCompletedDate: this.lastCompletedDate
            }));
            
            localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify({
                count: this.streak,
                lastDate: this.lastCompletedDate
            }));
        } catch (e) {
            console.error('Error saving daily state:', e);
        }
    }
    
    /**
     * Check if it's a new day
     */
    checkNewDay() {
        const today = this.getTodayString();
        
        if (this.todayChallenge?.date !== today) {
            // New day - reset completion but keep streak logic
            this.isCompleted = false;
            this.todayChallenge = null;
            
            // Check if streak should reset
            if (this.lastCompletedDate) {
                const lastDate = new Date(this.lastCompletedDate);
                const now = new Date();
                const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 1) {
                    // Missed a day - reset streak
                    this.streak = 0;
                }
            }
            
            this.saveState();
        }
    }
    
    /**
     * Get today's date string
     */
    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }
    
    /**
     * Get or generate today's challenge
     */
    async getTodayChallenge(vocabulary = []) {
        const today = this.getTodayString();
        
        // Return existing if already generated
        if (this.todayChallenge?.date === today) {
            return this.todayChallenge;
        }
        
        // Generate new challenge
        this.todayChallenge = await this.generateChallenge(vocabulary);
        this.saveState();
        
        return this.todayChallenge;
    }
    
    /**
     * Generate a simple daily challenge
     */
    async generateChallenge(vocabulary = []) {
        const today = this.getTodayString();
        const wordCount = Math.min(DAILY_CONFIG.defaultWordCount, vocabulary.length);
        
        // Select random words
        const shuffled = [...vocabulary].sort(() => 0.5 - Math.random());
        const selectedWords = shuffled.slice(0, wordCount);
        
        // Generate simple questions
        const questions = this.generateSimpleQuestions(selectedWords);
        
        return {
            challenge_id: `daily_${today}`,
            date: today,
            title: `Thử thách ngày ${new Date().toLocaleDateString('vi-VN')}`,
            description: 'Hoàn thành thử thách hàng ngày để duy trì streak!',
            words: selectedWords,
            questions: questions,
            totalQuestions: questions.length,
            estimatedTime: 5, // minutes
            streak: this.streak,
            motivation: this.getMotivationMessage()
        };
    }
    
    /**
     * Generate simple questions for daily challenge
     */
    generateSimpleQuestions(words) {
        const questions = [];
        
        words.forEach((wordData, index) => {
            const word = typeof wordData === 'string' ? wordData : wordData.word;
            const meaning = typeof wordData === 'object' ? wordData.meanings?.[0]?.defVi : null;
            
            // Alternate between question types
            const questionType = index % 3;
            
            if (questionType === 0 && meaning) {
                // Definition matching
                questions.push({
                    question_id: `daily_q${index + 1}`,
                    type: 'multiple_choice',
                    bloom_level: 'remember',
                    question: `"${word}" có nghĩa là gì?`,
                    options: this.generateMCOptions(meaning, words),
                    correct_answer: meaning,
                    points: 1,
                    target_words: [word]
                });
            } else if (questionType === 1) {
                // Fill in the blank
                questions.push({
                    question_id: `daily_q${index + 1}`,
                    type: 'fill_blank',
                    bloom_level: 'apply',
                    question: `Điền từ phù hợp: The _____ is very important. (${word.charAt(0)}...)`,
                    correct_answer: word,
                    accepted_answers: [word, word.toLowerCase()],
                    points: 1,
                    target_words: [word],
                    hints: [`Bắt đầu bằng "${word.charAt(0)}"`]
                });
            } else {
                // True/False
                const isTrue = Math.random() > 0.5;
                questions.push({
                    question_id: `daily_q${index + 1}`,
                    type: 'true_false',
                    bloom_level: 'understand',
                    question: `"${word}" là một từ tiếng Anh phổ biến. (True/False)`,
                    correct_answer: 'True',
                    points: 1,
                    target_words: [word]
                });
            }
        });
        
        return questions.slice(0, DAILY_CONFIG.maxQuestions);
    }
    
    /**
     * Generate MC options
     */
    generateMCOptions(correctAnswer, allWords) {
        const options = [correctAnswer];
        
        // Add random wrong options
        const wrongOptions = allWords
            .filter(w => {
                const meaning = typeof w === 'object' ? w.meanings?.[0]?.defVi : null;
                return meaning && meaning !== correctAnswer;
            })
            .map(w => typeof w === 'object' ? w.meanings?.[0]?.defVi : 'Không xác định')
            .slice(0, 3);
        
        options.push(...wrongOptions);
        
        // Fill with generic options if needed
        while (options.length < 4) {
            options.push(`Đáp án ${options.length + 1}`);
        }
        
        // Shuffle
        return options.sort(() => 0.5 - Math.random());
    }
    
    /**
     * Get motivation message based on streak
     */
    getMotivationMessage() {
        if (this.streak === 0) {
            return '🌟 Bắt đầu streak mới nào!';
        } else if (this.streak < 7) {
            return `🔥 Streak ${this.streak} ngày! Tiếp tục phát huy!`;
        } else if (this.streak < 30) {
            return `🏆 Tuyệt vời! ${this.streak} ngày liên tiếp!`;
        } else {
            return `👑 Siêu sao! ${this.streak} ngày streak!`;
        }
    }
    
    /**
     * Complete daily challenge
     */
    completeChallenge(results) {
        if (this.isCompleted) return false;
        
        const today = this.getTodayString();
        
        this.isCompleted = true;
        this.lastCompletedDate = today;
        
        // Update streak
        this.streak++;
        
        this.saveState();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('ailab:dailyCompleted', {
            detail: {
                date: today,
                streak: this.streak,
                results: results
            }
        }));
        
        console.log('✅ Daily challenge completed! Streak:', this.streak);
        return true;
    }
    
    /**
     * Check if today is completed
     */
    isTodayCompleted() {
        return this.isCompleted;
    }
    
    /**
     * Get current streak
     */
    getStreak() {
        return this.streak;
    }
    
    /**
     * Render daily card
     */
    renderDailyCard(containerId = 'daily-challenge-card') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const today = this.getTodayString();
        const hasChallenge = this.todayChallenge?.date === today;
        
        container.innerHTML = `
            <div class="daily-card ${this.isCompleted ? 'completed' : ''}">
                <div class="daily-header">
                    <div class="daily-icon">
                        <i class="fas fa-${this.isCompleted ? 'check-circle' : 'calendar-day'}"></i>
                    </div>
                    <div class="daily-title">
                        <h3>Thử thách hôm nay</h3>
                        <span class="daily-date">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                </div>
                
                <div class="daily-streak">
                    <span class="streak-icon">🔥</span>
                    <span class="streak-count">${this.streak}</span>
                    <span class="streak-label">ngày streak</span>
                </div>
                
                <div class="daily-status">
                    ${this.isCompleted 
                        ? '<span class="status-completed"><i class="fas fa-check"></i> Đã hoàn thành!</span>'
                        : '<span class="status-pending"><i class="fas fa-clock"></i> Chưa làm</span>'
                    }
                </div>
                
                <button class="daily-btn ${this.isCompleted ? 'disabled' : ''}" 
                        ${this.isCompleted ? 'disabled' : ''} 
                        id="start-daily-btn">
                    ${this.isCompleted ? 'Hoàn thành ✓' : 'Bắt đầu thử thách'}
                </button>
                
                <div class="daily-motivation">
                    ${this.getMotivationMessage()}
                </div>
            </div>
        `;
        
        // Bind start button
        const startBtn = container.querySelector('#start-daily-btn');
        if (startBtn && !this.isCompleted) {
            startBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('ailab:startDailyChallenge'));
            });
        }
    }
    
    /**
     * Reset streak (for testing)
     */
    resetStreak() {
        this.streak = 0;
        this.isCompleted = false;
        this.lastCompletedDate = null;
        this.todayChallenge = null;
        this.saveState();
    }
}

// Export singleton
export const dailyChallenge = new DailyChallenge();
export default DailyChallenge;
