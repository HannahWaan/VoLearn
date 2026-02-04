/**
 * VoLearn AI Practice Lab - Results Panel
 * Version: 1.0.0
 * 
 * Hiển thị kết quả, phân tích theo Skill & Bloom, AI Feedback
 */

import { BLOOM_LEVELS, SKILLS, SCORE_THRESHOLDS } from '../config/constants.js';

class ResultsPanel {
    constructor() {
        this.currentResults = null;
        this.container = null;
    }
    
    /**
     * Initialize
     */
    init(containerId = 'results-panel') {
        this.container = document.getElementById(containerId);
        console.log('✅ ResultsPanel initialized');
        return this;
    }
    
    /**
     * Show results
     */
    showResults(results) {
        if (!this.container || !results) return;
        
        this.currentResults = results;
        
        const html = `
            <div class="results-wrapper">
                ${this.renderScoreSection(results)}
                ${this.renderSkillAnalysis(results.skill_analysis)}
                ${this.renderBloomAnalysis(results.bloom_analysis)}
                ${this.renderVocabularyAnalysis(results.vocabulary_analysis)}
                ${this.renderQuestionReview(results.questions)}
                ${this.renderAIFeedback(results)}
                ${this.renderActions()}
            </div>
        `;
        
        this.container.innerHTML = html;
        this.container.classList.remove('hidden');
        this.bindEvents();
        this.animateScore();
        
        // Scroll to results
        this.container.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Render main score section
     */
    renderScoreSection(results) {
        const { total_score, max_score, percentage, ielts_band_estimate, time_taken } = results;
        const grade = this.getGrade(percentage);
        const timeFormatted = this.formatTime(time_taken);
        
        return `
            <div class="results-score-section">
                <div class="score-circle-container">
                    <svg class="score-circle" viewBox="0 0 100 100">
                        <circle class="score-bg" cx="50" cy="50" r="45" />
                        <circle class="score-fill ${grade.class}" cx="50" cy="50" r="45" 
                                stroke-dasharray="283" stroke-dashoffset="283" 
                                data-percentage="${percentage}" />
                    </svg>
                    <div class="score-text">
                        <span class="score-percentage">${Math.round(percentage)}%</span>
                        <span class="score-fraction">${total_score}/${max_score}</span>
                    </div>
                </div>
                
                <div class="score-details">
                    <div class="score-grade ${grade.class}">
                        <i class="fas fa-${grade.icon}"></i>
                        <span>${grade.label}</span>
                    </div>
                    
                    ${ielts_band_estimate ? `
                        <div class="ielts-estimate">
                            <span class="ielts-label">IELTS Band ước tính</span>
                            <span class="ielts-band">${ielts_band_estimate.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="time-taken">
                        <i class="fas fa-clock"></i>
                        <span>Thời gian: ${timeFormatted}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render skill analysis
     */
    renderSkillAnalysis(skillAnalysis) {
        if (!skillAnalysis || Object.keys(skillAnalysis).length === 0) {
            return '';
        }
        
        const skillBars = Object.entries(skillAnalysis)
            .filter(([skill]) => SKILLS[skill]) // Only valid skills
            .map(([skill, data]) => {
                const skillInfo = SKILLS[skill];
                const percentage = data.max > 0 ? (data.score / data.max) * 100 : 0;
                
                return `
                    <div class="skill-bar-item">
                        <div class="skill-bar-header">
                            <span class="skill-name">
                                <i class="fas fa-${skillInfo.icon}" style="color: ${skillInfo.color}"></i>
                                ${skillInfo.name}
                            </span>
                            <span class="skill-score">${data.score}/${data.max}</span>
                        </div>
                        <div class="skill-bar-track">
                            <div class="skill-bar-fill" style="width: ${percentage}%; background: ${skillInfo.color}"></div>
                        </div>
                        ${data.feedback ? `<div class="skill-feedback">${data.feedback}</div>` : ''}
                    </div>
                `;
            }).join('');
        
        return `
            <div class="results-section skill-analysis">
                <h3 class="section-title">
                    <i class="fas fa-chart-bar"></i>
                    Phân tích theo Kỹ năng
                </h3>
                <div class="skill-bars">
                    ${skillBars}
                </div>
            </div>
        `;
    }
    
    /**
     * Render Bloom analysis
     */
    renderBloomAnalysis(bloomAnalysis) {
        if (!bloomAnalysis || Object.keys(bloomAnalysis).length === 0) {
            return '';
        }
        
        const bloomItems = Object.entries(BLOOM_LEVELS)
            .filter(([level]) => bloomAnalysis[level])
            .map(([level, info]) => {
                const data = bloomAnalysis[level];
                const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                
                return `
                    <div class="bloom-item">
                        <div class="bloom-header">
                            <span class="bloom-level" style="color: ${info.color}">
                                <i class="fas fa-${info.icon}"></i>
                                ${info.name}
                            </span>
                            <span class="bloom-score">${data.correct}/${data.total}</span>
                        </div>
                        <div class="bloom-bar">
                            <div class="bloom-fill" style="width: ${percentage}%; background: ${info.color}"></div>
                        </div>
                    </div>
                `;
            }).join('');
        
        return `
            <div class="results-section bloom-analysis">
                <h3 class="section-title">
                    <i class="fas fa-brain"></i>
                    Phân tích theo Bloom
                </h3>
                <div class="bloom-grid">
                    ${bloomItems}
                </div>
            </div>
        `;
    }
    
    /**
     * Render vocabulary analysis
     */
    renderVocabularyAnalysis(vocabAnalysis) {
        if (!vocabAnalysis || vocabAnalysis.length === 0) {
            return '';
        }
        
        const masteredWords = vocabAnalysis.filter(v => v.mastery === 'mastered');
        const learningWords = vocabAnalysis.filter(v => v.mastery === 'learning');
        const needsReviewWords = vocabAnalysis.filter(v => v.mastery === 'needs_review');
        
        return `
            <div class="results-section vocab-analysis">
                <h3 class="section-title">
                    <i class="fas fa-spell-check"></i>
                    Phân tích Từ vựng
                </h3>
                
                <div class="vocab-summary">
                    <div class="vocab-stat mastered">
                        <span class="stat-icon"><i class="fas fa-check-circle"></i></span>
                        <span class="stat-count">${masteredWords.length}</span>
                        <span class="stat-label">Đã thuộc</span>
                    </div>
                    <div class="vocab-stat learning">
                        <span class="stat-icon"><i class="fas fa-hourglass-half"></i></span>
                        <span class="stat-count">${learningWords.length}</span>
                        <span class="stat-label">Đang học</span>
                    </div>
                    <div class="vocab-stat needs-review">
                        <span class="stat-icon"><i class="fas fa-exclamation-circle"></i></span>
                        <span class="stat-count">${needsReviewWords.length}</span>
                        <span class="stat-label">Cần ôn</span>
                    </div>
                </div>
                
                ${needsReviewWords.length > 0 ? `
                    <div class="vocab-needs-review">
                        <h4><i class="fas fa-redo"></i> Từ cần ôn tập</h4>
                        <div class="vocab-tags">
                            ${needsReviewWords.map(v => `
                                <span class="vocab-tag needs-review" data-word="${v.word}">
                                    ${v.word}
                                    <small>${v.questions_correct}/${v.questions_total}</small>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render question review
     */
    renderQuestionReview(questions) {
        if (!questions || questions.length === 0) {
            return '';
        }
        
        const questionItems = questions.map((q, i) => {
            const isCorrect = q.is_correct;
            const isPartial = !isCorrect && q.partial_credit > 0;
            const statusClass = isCorrect ? 'correct' : (isPartial ? 'partial' : 'incorrect');
            const statusIcon = isCorrect ? 'check' : (isPartial ? 'minus' : 'times');
            
            return `
                <div class="question-review-item ${statusClass}" data-question="${q.question_id}">
                    <div class="review-header">
                        <span class="review-number">Câu ${i + 1}</span>
                        <span class="review-status">
                            <i class="fas fa-${statusIcon}-circle"></i>
                            ${q.score}/${q.max_score || 1} điểm
                        </span>
                    </div>
                    
                    <div class="review-answers">
                        <div class="your-answer">
                            <strong>Đáp án của bạn:</strong>
                            <span class="${statusClass}">${this.formatAnswer(q.student_answer) || '(Không trả lời)'}</span>
                        </div>
                        ${!isCorrect ? `
                            <div class="correct-answer">
                                <strong>Đáp án đúng:</strong>
                                <span>${this.formatAnswer(q.correct_answer)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${q.feedback ? `
                        <div class="review-feedback">
                            <i class="fas fa-comment-alt"></i>
                            ${q.feedback}
                        </div>
                    ` : ''}
                    
                    <button class="toggle-explanation-btn" data-question="${q.question_id}">
                        <i class="fas fa-lightbulb"></i> Xem giải thích
                    </button>
                    <div class="review-explanation hidden" id="explanation-${q.question_id}">
                        ${q.explanation || 'Không có giải thích.'}
                    </div>
                </div>
            `;
        }).join('');
        
        const correctCount = questions.filter(q => q.is_correct).length;
        
        return `
            <div class="results-section question-review">
                <h3 class="section-title">
                    <i class="fas fa-list-check"></i>
                    Chi tiết câu hỏi
                    <span class="review-summary">${correctCount}/${questions.length} đúng</span>
                </h3>
                
                <div class="review-filters">
                    <button class="filter-btn active" data-filter="all">Tất cả</button>
                    <button class="filter-btn" data-filter="correct">Đúng</button>
                    <button class="filter-btn" data-filter="incorrect">Sai</button>
                </div>
                
                <div class="question-review-list">
                    ${questionItems}
                </div>
            </div>
        `;
    }
    
    /**
     * Render AI feedback
     */
    renderAIFeedback(results) {
        const { overall_feedback, improvement_suggestions, strengths, weaknesses } = results;
        
        if (!overall_feedback && !improvement_suggestions?.length && !strengths?.length) {
            return '';
        }
        
        return `
            <div class="results-section ai-feedback">
                <h3 class="section-title">
                    <i class="fas fa-robot"></i>
                    Nhận xét từ AI
                </h3>
                
                ${overall_feedback ? `
                    <div class="feedback-overall">
                        <p>${overall_feedback}</p>
                    </div>
                ` : ''}
                
                <div class="feedback-columns">
                    ${strengths && strengths.length > 0 ? `
                        <div class="feedback-column strengths">
                            <h4><i class="fas fa-thumbs-up"></i> Điểm mạnh</h4>
                            <ul>
                                ${strengths.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${weaknesses && weaknesses.length > 0 ? `
                        <div class="feedback-column weaknesses">
                            <h4><i class="fas fa-exclamation-triangle"></i> Cần cải thiện</h4>
                            <ul>
                                ${weaknesses.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                ${improvement_suggestions && improvement_suggestions.length > 0 ? `
                    <div class="feedback-suggestions">
                        <h4><i class="fas fa-lightbulb"></i> Gợi ý cải thiện</h4>
                        <ul>
                            ${improvement_suggestions.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render action buttons
     */
    renderActions() {
        return `
            <div class="results-actions">
                <button class="action-btn primary" id="btn-retry">
                    <i class="fas fa-redo"></i>
                    Làm lại
                </button>
                <button class="action-btn secondary" id="btn-new-exercise">
                    <i class="fas fa-plus"></i>
                    Bài mới
                </button>
                <button class="action-btn secondary" id="btn-save-results">
                    <i class="fas fa-save"></i>
                    Lưu kết quả
                </button>
                <button class="action-btn secondary" id="btn-share-results">
                    <i class="fas fa-share-alt"></i>
                    Chia sẻ
                </button>
            </div>
        `;
    }
    
    /**
     * Bind events
     */
    bindEvents() {
        // Toggle explanation
        this.container.querySelectorAll('.toggle-explanation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const questionId = btn.dataset.question;
                const explanation = document.getElementById(`explanation-${questionId}`);
                if (explanation) {
                    explanation.classList.toggle('hidden');
                    btn.innerHTML = explanation.classList.contains('hidden') 
                        ? '<i class="fas fa-lightbulb"></i> Xem giải thích'
                        : '<i class="fas fa-lightbulb"></i> Ẩn giải thích';
                }
            });
        });
        
        // Filter buttons
        this.container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                this.filterQuestions(filter);
                
                // Update active state
                this.container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Vocab tags click
        this.container.querySelectorAll('.vocab-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const word = tag.dataset.word;
                // Could open word detail or add to review list
                console.log('Vocab clicked:', word);
            });
        });
        
        // Action buttons
        document.getElementById('btn-retry')?.addEventListener('click', () => {
            this.onRetry?.();
        });
        
        document.getElementById('btn-new-exercise')?.addEventListener('click', () => {
            this.onNewExercise?.();
        });
        
        document.getElementById('btn-save-results')?.addEventListener('click', () => {
            this.saveResults();
        });
        
        document.getElementById('btn-share-results')?.addEventListener('click', () => {
            this.shareResults();
        });
    }
    
    /**
     * Animate score circle
     */
    animateScore() {
        const scoreFill = this.container.querySelector('.score-fill');
        if (!scoreFill) return;
        
        const percentage = parseFloat(scoreFill.dataset.percentage) || 0;
        const offset = 283 - (283 * percentage / 100);
        
        // Trigger animation
        setTimeout(() => {
            scoreFill.style.strokeDashoffset = offset;
        }, 100);
    }
    
    /**
     * Filter questions by status
     */
    filterQuestions(filter) {
        const items = this.container.querySelectorAll('.question-review-item');
        
        items.forEach(item => {
            if (filter === 'all') {
                item.style.display = '';
            } else if (filter === 'correct') {
                item.style.display = item.classList.contains('correct') ? '' : 'none';
            } else if (filter === 'incorrect') {
                item.style.display = (item.classList.contains('incorrect') || item.classList.contains('partial')) ? '' : 'none';
            }
        });
    }
    
    /**
     * Get grade based on percentage
     */
    getGrade(percentage) {
        if (percentage >= SCORE_THRESHOLDS.excellent) {
            return { label: 'Xuất sắc!', class: 'excellent', icon: 'trophy' };
        } else if (percentage >= SCORE_THRESHOLDS.good) {
            return { label: 'Tốt lắm!', class: 'good', icon: 'star' };
        } else if (percentage >= SCORE_THRESHOLDS.average) {
            return { label: 'Khá', class: 'average', icon: 'thumbs-up' };
        } else if (percentage >= SCORE_THRESHOLDS.needsWork) {
            return { label: 'Cần cố gắng', class: 'needs-work', icon: 'hand-holding-heart' };
        } else {
            return { label: 'Chưa đạt', class: 'poor', icon: 'frown' };
        }
    }
    
    /**
     * Format time in seconds to mm:ss
     */
    formatTime(seconds) {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Format answer for display
     */
    formatAnswer(answer) {
        if (answer === null || answer === undefined) return null;
        
        if (typeof answer === 'object') {
            if (Array.isArray(answer)) {
                return answer.join(', ');
            }
            return Object.values(answer).join(', ');
        }
        
        return String(answer);
    }
    
    /**
     * Save results to history
     */
    saveResults() {
        if (!this.currentResults) return;
        
        // Dispatch event for history manager
        window.dispatchEvent(new CustomEvent('ailab:saveResults', {
            detail: this.currentResults
        }));
        
        // Show toast
        this.showToast('Đã lưu kết quả!', 'success');
    }
    
    /**
     * Share results
     */
    async shareResults() {
        if (!this.currentResults) return;
        
        const { percentage, ielts_band_estimate, time_taken } = this.currentResults;
        const text = `🎯 VoLearn AI Practice Lab\n📊 Điểm: ${Math.round(percentage)}%${ielts_band_estimate ? `\n🏆 IELTS Band: ${ielts_band_estimate.toFixed(1)}` : ''}\n⏱️ Thời gian: ${this.formatTime(time_taken)}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Kết quả luyện tập VoLearn',
                    text: text
                });
            } catch (e) {
                this.copyToClipboard(text);
            }
        } else {
            this.copyToClipboard(text);
        }
    }
    
    /**
     * Copy to clipboard
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Đã copy kết quả!', 'success');
        }).catch(() => {
            this.showToast('Không thể copy', 'error');
        });
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Use existing toast system or create simple one
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }
    
    /**
     * Hide results panel
     */
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }
    
    /**
     * Get current results
     */
    getResults() {
        return this.currentResults;
    }
    
    /**
     * Set callbacks
     */
    setCallbacks(callbacks = {}) {
        this.onRetry = callbacks.onRetry;
        this.onNewExercise = callbacks.onNewExercise;
    }
}

// Export singleton
export const resultsPanel = new ResultsPanel();
export default ResultsPanel;
