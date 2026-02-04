/**
 * VoLearn AI Practice Lab - Exercise Manager
 * Version: 1.0.0
 * 
 * Quản lý bài tập: load, render, submit, clear
 */

import { BLOOM_LEVELS, SKILLS, QUESTION_TYPES } from '../config/constants.js';

class ExerciseManager {
    constructor() {
        this.currentExercise = null;
        this.userAnswers = {};
        this.startTime = null;
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.isSubmitted = false;
        this.hintsUsed = {};
        
        // Callbacks
        this.onTimeUp = null;
        this.onAnswerChange = null;
        this.onSubmit = null;
    }
    
    /**
     * Load bài tập mới
     */
    loadExercise(exercise, settings = {}) {
        this.currentExercise = exercise;
        this.userAnswers = {};
        this.hintsUsed = {};
        this.isSubmitted = false;
        this.startTime = Date.now();
        
        // Setup timer nếu có
        if (settings.timeLimit && settings.timeLimit > 0) {
            this.timeRemaining = settings.timeLimit * 60; // Convert to seconds
            this.startTimer();
        }
        
        // Render bài tập
        this.renderExercise();
        
        console.log('✅ Exercise loaded:', exercise.exercise_id);
        return this;
    }
    
    /**
     * Render toàn bộ bài tập
     */
    renderExercise() {
        const container = document.getElementById('exercise-content');
        if (!container || !this.currentExercise) return;
        
        const { title, description, sections, vocabulary_focus } = this.currentExercise;
        
        let html = `
            <div class="exercise-header">
                <h2 class="exercise-title">${title || 'Bài tập'}</h2>
                ${description ? `<p class="exercise-description">${description}</p>` : ''}
            </div>
        `;
        
        // Render từng section
        sections.forEach((section, sIndex) => {
            html += this.renderSection(section, sIndex);
        });
        
        // Vocabulary focus sidebar
        if (vocabulary_focus && vocabulary_focus.length > 0) {
            this.renderVocabularyFocus(vocabulary_focus);
        }
        
        container.innerHTML = html;
        
        // Bind events sau khi render
        this.bindQuestionEvents();
    }
    
    /**
     * Render một section
     */
    renderSection(section, sectionIndex) {
        const { section_id, skill, bloom_level, instructions, content, questions } = section;
        const skillInfo = SKILLS[skill] || {};
        const bloomInfo = BLOOM_LEVELS[bloom_level] || {};
        
        let html = `
            <div class="exercise-section" data-section="${section_id}">
                <div class="section-header">
                    <div class="section-badges">
                        <span class="skill-badge" style="background: ${skillInfo.color || '#666'}">
                            <i class="fas fa-${skillInfo.icon || 'book'}"></i>
                            ${skillInfo.name || skill}
                        </span>
                        <span class="bloom-badge" style="background: ${bloomInfo.color || '#666'}">
                            <i class="fas fa-${bloomInfo.icon || 'brain'}"></i>
                            ${bloomInfo.name || bloom_level}
                        </span>
                    </div>
                </div>
                
                ${instructions ? `
                    <div class="section-instructions">
                        <i class="fas fa-info-circle"></i>
                        ${instructions}
                    </div>
                ` : ''}
                
                ${content ? `
                    <div class="section-content passage-content">
                        ${this.formatContent(content)}
                    </div>
                ` : ''}
                
                <div class="section-questions">
                    ${questions.map((q, qIndex) => this.renderQuestion(q, sectionIndex, qIndex)).join('')}
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Format content với highlight từ vựng
     */
    formatContent(content) {
        if (!this.currentExercise?.vocabulary_focus) return content;
        
        let formatted = content;
        this.currentExercise.vocabulary_focus.forEach(vocab => {
            const regex = new RegExp(`\\b(${vocab.word})\\b`, 'gi');
            formatted = formatted.replace(regex, '<span class="vocab-highlight" data-word="$1">$1</span>');
        });
        
        return formatted;
    }
    
    /**
     * Render một câu hỏi
     */
    renderQuestion(question, sectionIndex, questionIndex) {
        const { question_id, type, question: questionText, options, points, hints } = question;
        const questionNumber = this.getQuestionNumber(sectionIndex, questionIndex);
        const typeInfo = QUESTION_TYPES[type] || {};
        
        let html = `
            <div class="question-item" data-question="${question_id}" data-type="${type}">
                <div class="question-header">
                    <span class="question-number">Câu ${questionNumber}</span>
                    <span class="question-points">${points || 1} điểm</span>
                    <span class="question-type-badge">
                        <i class="fas fa-${typeInfo.icon || 'question'}"></i>
                        ${typeInfo.name || type}
                    </span>
                </div>
                
                <div class="question-text">${questionText}</div>
                
                <div class="question-answer">
                    ${this.renderAnswerInput(question, question_id)}
                </div>
                
                ${hints && hints.length > 0 ? `
                    <div class="question-hints">
                        <button class="hint-btn" data-question="${question_id}">
                            <i class="fas fa-lightbulb"></i> Gợi ý
                        </button>
                        <div class="hint-content hidden" id="hint-${question_id}">
                            ${hints.map((h, i) => `<p>💡 ${h}</p>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        return html;
    }
    
    /**
     * Render input theo loại câu hỏi
     */
    renderAnswerInput(question, questionId) {
        const { type, options, blanks } = question;
        
        switch (type) {
            case 'multiple_choice':
                return this.renderMultipleChoice(options, questionId);
            
            case 'true_false':
                return this.renderTrueFalse(questionId);
            
            case 'fill_blank':
                return this.renderFillBlank(blanks || 1, questionId);
            
            case 'matching':
                return this.renderMatching(question, questionId);
            
            case 'short_answer':
                return this.renderShortAnswer(questionId);
            
            case 'essay':
                return this.renderEssay(question, questionId);
            
            case 'error_correction':
                return this.renderErrorCorrection(question, questionId);
            
            case 'word_formation':
                return this.renderWordFormation(question, questionId);
            
            case 'sentence_completion':
                return this.renderSentenceCompletion(question, questionId);
            
            default:
                return this.renderShortAnswer(questionId);
        }
    }
    
    /**
     * Render Multiple Choice
     */
    renderMultipleChoice(options, questionId) {
        if (!options || options.length === 0) return '';
        
        return `
            <div class="mc-options">
                ${options.map((opt, i) => `
                    <label class="mc-option">
                        <input type="radio" name="${questionId}" value="${opt}" 
                               onchange="exerciseManager.setAnswer('${questionId}', '${opt.replace(/'/g, "\\'")}')">
                        <span class="mc-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="mc-text">${opt}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render True/False/Not Given
     */
    renderTrueFalse(questionId) {
        const options = ['True', 'False', 'Not Given'];
        return `
            <div class="tf-options">
                ${options.map(opt => `
                    <label class="tf-option">
                        <input type="radio" name="${questionId}" value="${opt}"
                               onchange="exerciseManager.setAnswer('${questionId}', '${opt}')">
                        <span class="tf-text">${opt}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render Fill in the Blank
     */
    renderFillBlank(blankCount, questionId) {
        let inputs = '';
        for (let i = 0; i < blankCount; i++) {
            const blankId = blankCount > 1 ? `${questionId}_${i}` : questionId;
            inputs += `
                <div class="fill-blank-item">
                    ${blankCount > 1 ? `<span class="blank-number">(${i + 1})</span>` : ''}
                    <input type="text" class="fill-blank-input" 
                           data-question="${questionId}" data-blank="${i}"
                           placeholder="Nhập đáp án..."
                           oninput="exerciseManager.setBlankAnswer('${questionId}', ${i}, this.value)">
                </div>
            `;
        }
        return `<div class="fill-blank-container">${inputs}</div>`;
    }
    
    /**
     * Render Matching
     */
    renderMatching(question, questionId) {
        const { left_items, right_items } = question;
        if (!left_items || !right_items) return '';
        
        return `
            <div class="matching-container">
                <div class="matching-left">
                    ${left_items.map((item, i) => `
                        <div class="matching-item" data-index="${i}">
                            <span class="matching-number">${i + 1}.</span>
                            <span class="matching-text">${item}</span>
                            <select class="matching-select" 
                                    onchange="exerciseManager.setMatchingAnswer('${questionId}', ${i}, this.value)">
                                <option value="">-- Chọn --</option>
                                ${right_items.map((r, j) => `
                                    <option value="${String.fromCharCode(65 + j)}">${String.fromCharCode(65 + j)}</option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
                <div class="matching-right">
                    ${right_items.map((item, i) => `
                        <div class="matching-option">
                            <span class="matching-letter">${String.fromCharCode(65 + i)}.</span>
                            <span class="matching-text">${item}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render Short Answer
     */
    renderShortAnswer(questionId) {
        return `
            <div class="short-answer-container">
                <input type="text" class="short-answer-input"
                       data-question="${questionId}"
                       placeholder="Nhập câu trả lời ngắn..."
                       oninput="exerciseManager.setAnswer('${questionId}', this.value)">
            </div>
        `;
    }
    
    /**
     * Render Essay
     */
    renderEssay(question, questionId) {
        const { minWords, maxWords } = question;
        return `
            <div class="essay-container">
                <textarea class="essay-input" 
                          data-question="${questionId}"
                          placeholder="Viết câu trả lời của bạn..."
                          oninput="exerciseManager.setAnswer('${questionId}', this.value); exerciseManager.updateWordCount(this)"></textarea>
                <div class="essay-footer">
                    <span class="word-count">0 từ</span>
                    ${minWords || maxWords ? `
                        <span class="word-limit">
                            (${minWords ? `Tối thiểu: ${minWords}` : ''} 
                             ${minWords && maxWords ? ' - ' : ''}
                             ${maxWords ? `Tối đa: ${maxWords}` : ''} từ)
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render Error Correction
     */
    renderErrorCorrection(question, questionId) {
        const { sentence_with_error } = question;
        return `
            <div class="error-correction-container">
                <div class="original-sentence">
                    <strong>Câu gốc:</strong> ${sentence_with_error || ''}
                </div>
                <input type="text" class="correction-input"
                       data-question="${questionId}"
                       placeholder="Viết lại câu đã sửa..."
                       oninput="exerciseManager.setAnswer('${questionId}', this.value)">
            </div>
        `;
    }
    
    /**
     * Render Word Formation
     */
    renderWordFormation(question, questionId) {
        const { root_word, sentence_with_blank } = question;
        return `
            <div class="word-formation-container">
                <div class="root-word">
                    <strong>Từ gốc:</strong> <span class="highlight">${root_word || ''}</span>
                </div>
                <div class="sentence-blank">
                    ${sentence_with_blank || ''}
                </div>
                <input type="text" class="word-formation-input"
                       data-question="${questionId}"
                       placeholder="Điền dạng đúng của từ..."
                       oninput="exerciseManager.setAnswer('${questionId}', this.value)">
            </div>
        `;
    }
    
    /**
     * Render Sentence Completion
     */
    renderSentenceCompletion(question, questionId) {
        const { sentence_start } = question;
        return `
            <div class="sentence-completion-container">
                <div class="sentence-start">${sentence_start || ''}</div>
                <textarea class="sentence-completion-input"
                          data-question="${questionId}"
                          placeholder="Hoàn thành câu..."
                          oninput="exerciseManager.setAnswer('${questionId}', this.value)"></textarea>
            </div>
        `;
    }
    
    /**
     * Render Vocabulary Focus sidebar
     */
    renderVocabularyFocus(vocabList) {
        const container = document.getElementById('vocab-focus-list');
        if (!container) return;
        
        container.innerHTML = vocabList.map(vocab => `
            <div class="vocab-focus-item" data-word="${vocab.word}">
                <div class="vocab-word">${vocab.word}</div>
                <div class="vocab-def">${vocab.definition || ''}</div>
                ${vocab.example ? `<div class="vocab-example">"${vocab.example}"</div>` : ''}
            </div>
        `).join('');
    }
    
    /**
     * Get question number (overall)
     */
    getQuestionNumber(sectionIndex, questionIndex) {
        if (!this.currentExercise) return questionIndex + 1;
        
        let count = 0;
        for (let i = 0; i < sectionIndex; i++) {
            count += this.currentExercise.sections[i]?.questions?.length || 0;
        }
        return count + questionIndex + 1;
    }
    
    /**
     * Bind events cho questions
     */
    bindQuestionEvents() {
        // Hint buttons
        document.querySelectorAll('.hint-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = btn.dataset.question;
                this.showHint(questionId);
            });
        });
        
        // Vocabulary highlight click
        document.querySelectorAll('.vocab-highlight').forEach(el => {
            el.addEventListener('click', (e) => {
                const word = el.dataset.word;
                this.highlightVocabInSidebar(word);
            });
        });
    }
    
    /**
     * Set answer cho câu hỏi
     */
    setAnswer(questionId, value) {
        this.userAnswers[questionId] = value;
        this.markQuestionAnswered(questionId);
        
        if (this.onAnswerChange) {
            this.onAnswerChange(questionId, value);
        }
    }
    
    /**
     * Set answer cho fill blank (multiple blanks)
     */
    setBlankAnswer(questionId, blankIndex, value) {
        if (!this.userAnswers[questionId]) {
            this.userAnswers[questionId] = {};
        }
        this.userAnswers[questionId][blankIndex] = value;
        this.markQuestionAnswered(questionId);
        
        if (this.onAnswerChange) {
            this.onAnswerChange(questionId, this.userAnswers[questionId]);
        }
    }
    
    /**
     * Set answer cho matching
     */
    setMatchingAnswer(questionId, leftIndex, rightLetter) {
        if (!this.userAnswers[questionId]) {
            this.userAnswers[questionId] = {};
        }
        this.userAnswers[questionId][leftIndex] = rightLetter;
        this.markQuestionAnswered(questionId);
        
        if (this.onAnswerChange) {
            this.onAnswerChange(questionId, this.userAnswers[questionId]);
        }
    }
    
    /**
     * Mark question as answered (visual)
     */
    markQuestionAnswered(questionId) {
        const questionEl = document.querySelector(`[data-question="${questionId}"]`);
        if (questionEl) {
            questionEl.classList.add('answered');
        }
        this.updateProgress();
    }
    
    /**
     * Update word count for essay
     */
    updateWordCount(textarea) {
        const text = textarea.value.trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        const counter = textarea.closest('.essay-container')?.querySelector('.word-count');
        if (counter) {
            counter.textContent = `${wordCount} từ`;
        }
    }
    
    /**
     * Show hint
     */
    showHint(questionId) {
        const hintEl = document.getElementById(`hint-${questionId}`);
        if (hintEl) {
            hintEl.classList.toggle('hidden');
            this.hintsUsed[questionId] = true;
        }
    }
    
    /**
     * Highlight vocab in sidebar
     */
    highlightVocabInSidebar(word) {
        document.querySelectorAll('.vocab-focus-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.word?.toLowerCase() === word.toLowerCase()) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
    
    /**
     * Update progress bar
     */
    updateProgress() {
        const total = this.getTotalQuestions();
        const answered = Object.keys(this.userAnswers).length;
        const percentage = total > 0 ? (answered / total) * 100 : 0;
        
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${answered}/${total}`;
        }
    }
    
    /**
     * Get total questions
     */
    getTotalQuestions() {
        if (!this.currentExercise?.sections) return 0;
        return this.currentExercise.sections.reduce((sum, section) => {
            return sum + (section.questions?.length || 0);
        }, 0);
    }
    
    /**
     * Clear một câu hỏi
     */
    clearAnswer(questionId) {
        delete this.userAnswers[questionId];
        
        const questionEl = document.querySelector(`[data-question="${questionId}"]`);
        if (!questionEl) return;
        
        // Clear inputs
        questionEl.querySelectorAll('input[type="text"], textarea').forEach(input => {
            input.value = '';
        });
        questionEl.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });
        questionEl.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });
        
        questionEl.classList.remove('answered');
        this.updateProgress();
    }
    
    /**
     * Clear tất cả đáp án
     */
    clearAllAnswers() {
        if (!confirm('Bạn có chắc muốn xóa tất cả đáp án?')) return;
        
        this.userAnswers = {};
        
        // Clear all inputs
        document.querySelectorAll('.question-item').forEach(q => {
            q.querySelectorAll('input[type="text"], textarea').forEach(input => {
                input.value = '';
            });
            q.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.checked = false;
            });
            q.querySelectorAll('select').forEach(select => {
                select.selectedIndex = 0;
            });
            q.classList.remove('answered');
        });
        
        this.updateProgress();
        console.log('✅ All answers cleared');
    }
    
    /**
     * Start timer
     */
    startTimer() {
        this.stopTimer(); // Clear existing timer
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                if (this.onTimeUp) {
                    this.onTimeUp();
                } else {
                    this.submitExercise(true); // Auto submit
                }
            }
        }, 1000);
    }
    
    /**
     * Stop timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerEl = document.getElementById('exercise-timer');
        if (!timerEl) return;
        
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Warning colors
        if (this.timeRemaining <= 60) {
            timerEl.classList.add('danger');
        } else if (this.timeRemaining <= 180) {
            timerEl.classList.add('warning');
        }
    }
    
    /**
     * Submit bài tập
     */
    submitExercise(isAutoSubmit = false) {
        if (this.isSubmitted) return null;
        
        if (!isAutoSubmit) {
            const answered = Object.keys(this.userAnswers).length;
            const total = this.getTotalQuestions();
            
            if (answered < total) {
                if (!confirm(`Bạn mới trả lời ${answered}/${total} câu. Vẫn nộp bài?`)) {
                    return null;
                }
            }
        }
        
        this.stopTimer();
        this.isSubmitted = true;
        
        const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);
        
        const submission = {
            exercise_id: this.currentExercise?.exercise_id,
            answers: this.userAnswers,
            hintsUsed: this.hintsUsed,
            timeTaken: timeTaken,
            submittedAt: new Date().toISOString(),
            isAutoSubmit: isAutoSubmit
        };
        
        if (this.onSubmit) {
            this.onSubmit(submission);
        }
        
        console.log('✅ Exercise submitted:', submission);
        return submission;
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            exercise: this.currentExercise,
            answers: this.userAnswers,
            hintsUsed: this.hintsUsed,
            timeRemaining: this.timeRemaining,
            isSubmitted: this.isSubmitted,
            startTime: this.startTime
        };
    }
    
    /**
     * Restore state (resume)
     */
    restoreState(state) {
        if (!state) return;
        
        this.currentExercise = state.exercise;
        this.userAnswers = state.answers || {};
        this.hintsUsed = state.hintsUsed || {};
        this.timeRemaining = state.timeRemaining || 0;
        this.isSubmitted = state.isSubmitted || false;
        this.startTime = state.startTime || Date.now();
        
        this.renderExercise();
        this.restoreAnswersToUI();
        
        if (this.timeRemaining > 0 && !this.isSubmitted) {
            this.startTimer();
        }
    }
    
    /**
     * Restore answers to UI
     */
    restoreAnswersToUI() {
        Object.entries(this.userAnswers).forEach(([questionId, value]) => {
            const questionEl = document.querySelector(`[data-question="${questionId}"]`);
            if (!questionEl) return;
            
            const type = questionEl.dataset.type;
            
            if (type === 'multiple_choice' || type === 'true_false') {
                const radio = questionEl.querySelector(`input[value="${value}"]`);
                if (radio) radio.checked = true;
            } else if (type === 'fill_blank' && typeof value === 'object') {
                Object.entries(value).forEach(([blankIndex, blankValue]) => {
                    const input = questionEl.querySelector(`input[data-blank="${blankIndex}"]`);
                    if (input) input.value = blankValue;
                });
            } else if (type === 'matching' && typeof value === 'object') {
                Object.entries(value).forEach(([leftIndex, rightLetter]) => {
                    const select = questionEl.querySelectorAll('.matching-select')[leftIndex];
                    if (select) select.value = rightLetter;
                });
            } else {
                const input = questionEl.querySelector('input, textarea');
                if (input) input.value = value;
            }
            
            questionEl.classList.add('answered');
        });
        
        this.updateProgress();
    }
    
    /**
     * Destroy
     */
    destroy() {
        this.stopTimer();
        this.currentExercise = null;
        this.userAnswers = {};
        this.hintsUsed = {};
    }
}

// Export singleton
export const exerciseManager = new ExerciseManager();

// Expose globally for inline handlers
window.exerciseManager = exerciseManager;

export default ExerciseManager;
