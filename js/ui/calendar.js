/* ===== CALENDAR MODULE ===== */
/* VoLearn v2.1.0 - Lịch học tập */

import { appData } from '../core/state.js';
import { showToast } from './toast.js';
import { openModal, closeAllModals } from './modalEngine.js';
import { escapeHtml } from '../utils/helpers.js';

/* ===== STATE ===== */
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

/* ===== INIT ===== */
export function initCalendar() {
    bindCalendarEvents();
    renderCalendar();
    renderTodayStats();
    console.log('✅ Calendar initialized');
}

/* ===== RENDER CALENDAR ===== */
export function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month');
    
    if (!container) return;

    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 
        'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
        'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    
    if (monthLabel) {
        monthLabel.textContent = `${monthNames[currentMonth]}, ${currentYear}`;
    }

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDay = firstDay.getDay(); // 0 = Sunday
    
    // Adjust for Sunday = 0 -> make it 7 for easier calculation (week starts Monday)
    if (startingDay === 0) startingDay = 7;

    let html = '';

    // Day headers (Mon-Sun)
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    html += dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    // Empty cells before first day (Monday = 1)
    for (let i = 1; i < startingDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days
    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateStr(currentYear, currentMonth, day);
        const stats = getDayStats(dateStr);
        const isToday = dateStr === todayStr;
        const isSelected = selectedDate === dateStr;
        const hasActivity = stats.added > 0 || stats.reviewed > 0;

        let classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (hasActivity) classes.push('has-activity');

        html += `
            <div class="${classes.join(' ')}" data-date="${dateStr}" onclick="window.showDayWords('${dateStr}')">
                <span class="day-number">${day}</span>
            </div>
        `;
    }

    container.innerHTML = html;
}

/* ===== RENDER TODAY STATS ===== */
function renderTodayStats() {
    const today = formatDateStr(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate()
    );
    
    const stats = getDayStats(today);
    
    const dailyAdded = document.getElementById('daily-added');
    const dailyReviewed = document.getElementById('daily-reviewed');
    
    if (dailyAdded) dailyAdded.textContent = stats.added;
    if (dailyReviewed) dailyReviewed.textContent = stats.reviewed;
}

/* ===== BIND EVENTS ===== */
function bindCalendarEvents() {
    // Previous month
    const prevBtn = document.getElementById('prev-month');
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
    const nextBtn = document.getElementById('next-month');
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
}

/* ===== SHOW DAY WORDS ===== */
export function showDayWords(dateStr) {
    selectedDate = dateStr;
    renderCalendar(); // Update selected state
    
    const stats = getDayStats(dateStr);
    const addedWords = getWordsAddedOnDate(dateStr);
    const reviewedWords = getWordsReviewedOnDate(dateStr);
    
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('vi-VN', options);
    
    // Create or get modal
    let modal = document.getElementById('day-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'day-detail-modal';
        modal.className = 'modal';
        document.getElementById('modals-container')?.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${formattedDate}</h3>
                <button class="modal-close" onclick="window.closeDayDetailModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="day-stats">
                    <div class="day-stat">
                        <span class="stat-value">${stats.added}</span>
                        <span class="stat-label">Từ đã thêm</span>
                    </div>
                    <div class="day-stat">
                        <span class="stat-value">${stats.reviewed}</span>
                        <span class="stat-label">Từ đã ôn</span>
                    </div>
                </div>
                
                <div class="day-tabs">
                    <button class="day-tab active" onclick="window.switchDayTab('added', this)" data-tab="added">
                        <i class="fas fa-plus-circle"></i> Đã thêm (${addedWords.length})
                    </button>
                    <button class="day-tab" onclick="window.switchDayTab('reviewed', this)" data-tab="reviewed">
                        <i class="fas fa-sync-alt"></i> Đã ôn (${reviewedWords.length})
                    </button>
                </div>
                
                <div id="day-tab-added" class="day-tab-content active">
                    ${addedWords.length > 0 ? 
                        addedWords.map(w => `
                            <div class="day-word-item" onclick="window.openWordFromCalendar('${w.id}')">
                                <div class="day-word-main">
                                    <span class="word">${escapeHtml(w.word)}</span>
                                    <span class="phonetic">${escapeHtml(w.phonetic || '')}</span>
                                </div>
                                <span class="meaning">${escapeHtml(w.meanings?.[0]?.defVi || w.meanings?.[0]?.defEn || '')}</span>
                            </div>
                        `).join('') 
                        : '<p class="empty-message">Không có từ nào được thêm vào ngày này</p>'
                    }
                </div>
                
                <div id="day-tab-reviewed" class="day-tab-content">
                    ${reviewedWords.length > 0 ? 
                        reviewedWords.map(w => `
                            <div class="day-word-item" onclick="window.openWordFromCalendar('${w.id}')">
                                <div class="day-word-main">
                                    <span class="word">${escapeHtml(w.word)}</span>
                                    <span class="phonetic">${escapeHtml(w.phonetic || '')}</span>
                                </div>
                                <span class="meaning">${escapeHtml(w.meanings?.[0]?.defVi || w.meanings?.[0]?.defEn || '')}</span>
                            </div>
                        `).join('') 
                        : '<p class="empty-message">Không có từ nào được ôn tập vào ngày này</p>'
                    }
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

/* ===== SWITCH DAY TAB ===== */
export function switchDayTab(tabName, btn) {
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.day-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`day-tab-${tabName}`)?.classList.add('active');
}

/* ===== CLOSE MODAL ===== */
export function closeDayDetailModal() {
    const modal = document.getElementById('day-detail-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/* ===== OPEN WORD FROM CALENDAR ===== */
export function openWordFromCalendar(wordId) {
    closeDayDetailModal();
    
    // Navigate to set view and select word
    if (window.openSetDetail) {
        window.openSetDetail('all');
        setTimeout(() => {
            if (window.selectWordInSet) {
                window.selectWordInSet(wordId);
            }
        }, 200);
    }
}

/* ===== DATA HELPERS ===== */
function getDayStats(dateStr) {
    let added = 0;
    let reviewed = 0;
    
    // Count words added on this date
    appData.vocabulary?.forEach(word => {
        if (word.createdAt?.startsWith(dateStr)) {
            added++;
        }
    });
    
    // Count from history
    const historyEntry = appData.history?.find(h => h.date === dateStr);
    if (historyEntry) {
        if (historyEntry.addedWords) {
            added = Math.max(added, historyEntry.addedWords.length);
        }
        if (historyEntry.reviewedWords) {
            reviewed = historyEntry.reviewedWords.length;
        }
        // Fallback to numbers if arrays not available
        if (historyEntry.added && !historyEntry.addedWords) {
            added = Math.max(added, historyEntry.added);
        }
        if (historyEntry.reviewed && !historyEntry.reviewedWords) {
            reviewed = Math.max(reviewed, historyEntry.reviewed);
        }
    }
    
    return { added, reviewed };
}

function getWordsAddedOnDate(dateStr) {
    const words = [];
    
    // From vocabulary by createdAt
    appData.vocabulary?.forEach(word => {
        if (word.createdAt?.startsWith(dateStr)) {
            words.push(word);
        }
    });
    
    // Also check history for word IDs
    const historyEntry = appData.history?.find(h => h.date === dateStr);
    if (historyEntry?.addedWords) {
        historyEntry.addedWords.forEach(wordId => {
            const word = appData.vocabulary?.find(w => w.id === wordId);
            if (word && !words.find(w => w.id === word.id)) {
                words.push(word);
            }
        });
    }
    
    return words;
}

function getWordsReviewedOnDate(dateStr) {
    const words = [];
    
    const historyEntry = appData.history?.find(h => h.date === dateStr);
    if (historyEntry?.reviewedWords) {
        historyEntry.reviewedWords.forEach(wordId => {
            const word = appData.vocabulary?.find(w => w.id === wordId);
            if (word) {
                words.push(word);
            }
        });
    }
    
    return words;
}

/* ===== UTILITIES ===== */
function formatDateStr(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

/* ===== GLOBAL EXPORTS ===== */
window.renderCalendar = renderCalendar;
window.showDayWords = showDayWords;
window.switchDayTab = switchDayTab;
window.closeDayDetailModal = closeDayDetailModal;
window.openWordFromCalendar = openWordFromCalendar;
