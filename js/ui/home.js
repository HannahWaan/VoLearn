/* ========================================
   VoLearn - Home UI Module
   ======================================== */

import { appData, getStats, getTodayStats } from '../core/state.js';
import { truncate, escapeHtml } from '../utils/helpers.js';

/**
 * Khởi tạo Home UI
 */
export function initHome() {
    // Listen for data changes
    window.addEventListener('volearn:dataChanged', renderHome);
    window.addEventListener('volearn:dataSaved', renderHome);
    window.addEventListener('volearn:navigate', (e) => {
        if (e.detail.to === 'home') {
            renderHome();
        }
    });
    
    // Initial render
    renderHome();
}

/**
 * Render Home section
 */
export function renderHome() {
    updateStats();
    renderRecentWords();
}

/**
 * Update statistics cards
 */
export function updateStats() {
    const stats = getStats();
    const todayStats = getTodayStats();
    
    // Total words
    const totalEl = document.getElementById('total-words');
    if (totalEl) totalEl.textContent = stats.total;
    
    // Mastered words
    const masteredEl = document.getElementById('mastered-words');
    if (masteredEl) masteredEl.textContent = stats.mastered;
    
    // Streak
    const streakEl = document.getElementById('current-streak');
    if (streakEl) streakEl.textContent = stats.streak;
    
    // Today stats (if elements exist)
    const dailyAddedEl = document.getElementById('daily-added');
    if (dailyAddedEl) dailyAddedEl.textContent = todayStats.added;
    
    const dailyReviewedEl = document.getElementById('daily-reviewed');
    if (dailyReviewedEl) dailyReviewedEl.textContent = todayStats.reviewed;
}

/**
 * Render recent words list
 */
export function renderRecentWords() {
    const container = document.getElementById('recent-words-list');
    if (!container) return;
    
    const vocabulary = appData.vocabulary || [];
    
    if (vocabulary.length === 0) {
        container.innerHTML = '<p class="empty-message">Chưa có từ vựng nào. Hãy thêm từ mới!</p>';
        return;
    }
    
    // Get 10 most recent words
    const recentWords = [...vocabulary]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    container.innerHTML = recentWords.map(word => {
        const meaning = word.meanings?.[0]?.defVi || word.meanings?.[0]?.defEn || '';
        
        return `
            <div class="recent-word-item" data-word-id="${word.id}">
                <span class="word">${escapeHtml(word.word)}</span>
                <span class="meaning">${escapeHtml(truncate(meaning, 40))}</span>
            </div>
        `;
    }).join('');
    
    // Bind click events
    container.querySelectorAll('.recent-word-item').forEach(item => {
        item.addEventListener('click', () => {
            const wordId = item.dataset.wordId;
            // Navigate to set view và show word detail
            window.dispatchEvent(new CustomEvent('volearn:showWord', { 
                detail: { wordId } 
            }));
        });
    });
}

// Expose for global use
window.renderHome = renderHome;
window.updateStats = updateStats;
window.renderRecentWords = renderRecentWords;
