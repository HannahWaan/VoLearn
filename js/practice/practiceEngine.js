/* ===== MISSING FEATURES ===== */

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
    
    resetPractice();
}

// Show practice area
export function showPracticeArea() {
    const practiceArea = document.getElementById('practice-area');
    const practiceModes = document.getElementById('practice-modes');
    
    if (practiceArea) practiceArea.style.display = 'block';
    if (practiceModes) practiceModes.style.display = 'none';
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
