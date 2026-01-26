/* ===== CALENDAR MODULE ===== */
/* VoLearn v2.1.0 - Lịch học tập */

import { appData } from '../core/state.js';
import { showToast } from './toast.js';

/* ===== STATE ===== */
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

/* ===== INIT ===== */
export function initCalendar() {
    renderCalendar();
    renderTodayStats();
    bindCalendarEvents();
}

/* ===== RENDER CALENDAR ===== */
export function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month');
    
    if (!container || !monthLabel) return;

    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 
        'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
        'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    
    monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday

    // Adjust for Monday start
    const adjustedStartDay = startingDay === 0 ? 6 : startingDay - 1;

    let html = '';

    // Day headers
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    html += dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < adjustedStartDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        const stats = getDayStats(dateStr);
        const isToday = isCurrentMonth && day === today.getDate();
        const isSelected = selectedDate === dateStr;
        const hasActivity = stats.wordsAdded > 0 || stats.wordsPracticed > 0;

        let classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (hasActivity) classes.push('has-activity');

        const activityLevel = getActivityLevel(stats);
        if (activityLevel > 0) classes.push(`level-${activityLevel}`);

        html += `
            <div class="${classes.join(' ')}" data-date="${dateStr}">
                <span class="day-number">${day}</span>
                ${hasActivity ? `
                    <div class="day-indicators">
                        ${stats.wordsAdded > 0 ? '<span class="indicator added"></span>' : ''}
                        ${stats.wordsPracticed > 0 ? '<span class="indicator practiced"></span>' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    container.innerHTML = html;
    bindDayClickEvents();
}

/* ===== RENDER TODAY STATS ===== */
function renderTodayStats() {
    const container = document.getElementById('today-stats');
    if (!container) return;

    const today = formatDate(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate()
    );
    
    const stats = getDayStats(today);

    container.innerHTML = `
        <div class="today-stats-card">
            <h3><i class="fas fa-calendar-day"></i> Hôm nay</h3>
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-value">${stats.wordsAdded}</span>
                    <span class="stat-label">Từ mới</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.wordsPracticed}</span>
                    <span class="stat-label">Đã luyện</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.correctAnswers}</span>
                    <span class="stat-label">Đúng</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.streak}</span>
                    <span class="stat-label">Streak</span>
                </div>
            </div>
        </div>
    `;
}

/* ===== RENDER DAY DETAIL ===== */
function renderDayDetail(dateStr) {
    const modal = document.getElementById('day-detail-modal');
    if (!modal) return;

    const stats = getDayStats(dateStr);
    const wordsAddedList = getWordsAddedOnDate(dateStr);
    const date = new Date(dateStr);
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('vi-VN', options);

    const content = modal.querySelector('.modal-content') || modal;
    content.innerHTML = `
        <div class="modal-header">
            <h2>${formattedDate}</h2>
            <button class="btn-close" onclick="window.closeDayDetailModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-body">
            <div class="day-stats-grid">
                <div class="day-stat">
                    <i class="fas fa-plus-circle text-success"></i>
                    <div>
                        <span class="value">${stats.wordsAdded}</span>
                        <span class="label">Từ đã thêm</span>
                    </div>
                </div>
                <div class="day-stat">
                    <i class="fas fa-graduation-cap text-primary"></i>
                    <div>
                        <span class="value">${stats.wordsPracticed}</span>
                        <span class="label">Từ đã luyện</span>
                    </div>
                </div>
                <div class="day-stat">
                    <i class="fas fa-check text-success"></i>
                    <div>
                        <span class="value">${stats.correctAnswers}</span>
                        <span class="label">Câu đúng</span>
                    </div>
                </div>
                <div class="day-stat">
                    <i class="fas fa-times text-danger"></i>
                    <div>
                        <span class="value">${stats.wrongAnswers}</span>
                        <span class="label">Câu sai</span>
                    </div>
                </div>
            </div>
            
            ${wordsAddedList.length > 0 ? `
                <div class="words-added-section">
                    <h3><i class="fas fa-list"></i> Từ đã thêm</h3>
                    <ul class="words-added-list">
                        ${wordsAddedList.map(w => `
                            <li>
                                <strong>${escapeHtml(w.word)}</strong>
                                <span>${escapeHtml(w.meaning || '')}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;

    modal.classList.add('show');
}

/* ===== BIND EVENTS ===== */
function bindCalendarEvents() {
    // Previous month
    const prevBtn = document.getElementById('btn-prev-month');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    // Next month
    const nextBtn = document.getElementById('btn-next-month');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    // Today button
    const todayBtn = document.getElementById('btn-today');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const today = new Date();
            currentMonth = today.getMonth();
            currentYear = today.getFullYear();
            renderCalendar();
        });
    }
}

function bindDayClickEvents() {
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
        day.addEventListener('click', () => {
            const dateStr = day.dataset.date;
            
            // Update selection
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            day.classList.add('selected');
            selectedDate = dateStr;

            // Show detail
            renderDayDetail(dateStr);
        });
    });
}

/* ===== DATA HELPERS ===== */
function getDayStats(dateStr) {
    const history = appData.history || [];
    const dayHistory = history.filter(h => h.date === dateStr);

    let wordsAdded = 0;
    let wordsPracticed = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;

    // Count words added on this date
    appData.sets?.forEach(set => {
        set.words?.forEach(word => {
            if (word.addedAt && word.addedAt.startsWith(dateStr)) {
                wordsAdded++;
            }
        });
    });

    // Also check vocabulary array
    appData.vocabulary?.forEach(word => {
        if (word.addedAt && word.addedAt.startsWith(dateStr)) {
            wordsAdded++;
        }
    });

    // Count from history
    dayHistory.forEach(h => {
        if (h.type === 'practice') {
            wordsPracticed += h.wordsCount || 0;
            correctAnswers += h.correct || 0;
            wrongAnswers += h.wrong || 0;
        }
    });

    return {
        wordsAdded,
        wordsPracticed,
        correctAnswers,
        wrongAnswers,
        streak: appData.streak || 0
    };
}

function getWordsAddedOnDate(dateStr) {
    const words = [];

    // From sets
    appData.sets?.forEach(set => {
        set.words?.forEach(word => {
            if (word.addedAt && word.addedAt.startsWith(dateStr)) {
                words.push(word);
            }
        });
    });

    // From vocabulary
    appData.vocabulary?.forEach(word => {
        if (word.addedAt && word.addedAt.startsWith(dateStr)) {
            words.push(word);
        }
    });

    return words;
}

function getActivityLevel(stats) {
    const total = stats.wordsAdded + stats.wordsPracticed;
    if (total === 0) return 0;
    if (total <= 5) return 1;
    if (total <= 15) return 2;
    if (total <= 30) return 3;
    return 4;
}

/* ===== UTILITIES ===== */
function formatDate(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ===== MODAL CONTROLS ===== */
export function closeDayDetailModal() {
    const modal = document.getElementById('day-detail-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/* ===== EXPORTS ===== */
window.renderCalendar = renderCalendar;
window.closeDayDetailModal = closeDayDetailModal;
