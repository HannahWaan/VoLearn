/* ========================================
   VoLearn - Flashcard Settings Module
   100% code từ phiên bản cũ
   ======================================== */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeAllModals } from '../ui/modalEngine.js';

/* ===== CONSTANTS ===== */
const POS_MAPPING = {
    'noun': 'Danh từ',
    'verb': 'Động từ',
    'adjective': 'Tính từ',
    'adverb': 'Trạng từ',
    'preposition': 'Giới từ',
    'conjunction': 'Liên từ',
    'interjection': 'Thán từ',
    'pronoun': 'Đại từ',
    'article': 'Mạo từ',
    'auxiliary verb': 'Trợ động từ',
    'phrasal verb': 'Cụm động từ'
};

/* ===== STATE ===== */
let flashcardSettings = {
    cardLimit: 0,
    selectedSetIds: ['all'],
    selectedDateRange: 'all',
    includeUnmarked: true,
    includeMastered: true,
    includeLearning: true,
    sortBy: 'random',
    frontFields: ['word', 'phonetic'],
    backFields: ['pos', 'defVi', 'example']
};

let practiceWords = [];
let practiceIndex = 0;
let isFlipped = false;
let practiceWordsReviewed = 0;
let showingSummary = false;

/* ===== HELPER ===== */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ===== OPEN/CLOSE SETTINGS ===== */
export function openFlashcardSettings() {
    updateFlashcardSettingsCounts();
    openModal('flashcard-settings-modal');
}

export function closeFlashcardSettings() {
    closeAllModals();
}

/* ===== TAB SWITCHING ===== */
export function switchFlashcardTab(tabName, btn) {
    document.querySelectorAll('#flashcard-settings-modal .settings-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('#flashcard-settings-modal .settings-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`fc-tab-${tabName}`)?.classList.add('active');
}

/* ===== UPDATE COUNTS ===== */
export function updateFlashcardSettingsCounts() {
    const vocabulary = appData.vocabulary || [];
    
    const unmarked = vocabulary.filter(w => !w.mastered && !w.bookmarked).length;
    const mastered = vocabulary.filter(w => w.mastered).length;
    const learning = vocabulary.filter(w => !w.mastered).length;
    const bookmarked = vocabulary.filter(w => w.bookmarked).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('count-unmarked', unmarked);
    set('count-mastered', mastered);
    set('count-learning', learning);
    set('count-bookmarked', bookmarked);
}

/* ===== CARD LIMIT ===== */
export function adjustCardLimit(delta) {
    const slider = document.getElementById('card-limit-slider');
    if (!slider) return;
    let newValue = Math.max(0, Math.min(100, parseInt(slider.value) + delta));
    slider.value = newValue;
    updateCardLimit(newValue);
}

export function updateCardLimit(value) {
    flashcardSettings.cardLimit = parseInt(value);
    const display = document.getElementById('card-limit-value');
    if (display) display.textContent = flashcardSettings.cardLimit === 0 ? 'Không giới hạn' : flashcardSettings.cardLimit + ' thẻ';
}

/* ===== SCOPE SELECTOR ===== */
export function openScopeSelector(type) {
    const modal = document.getElementById('scope-selector-modal');
    const title = document.getElementById('scope-selector-title');
    const content = document.getElementById('scope-selector-content');
    if (!modal || !title || !content) return;

    if (type === 'set') {
        title.textContent = 'Chọn Bộ Từ Vựng';
        const isAllSelected = flashcardSettings.selectedSetIds.includes('all');
        const vocabulary = appData.vocabulary || [];
        const sets = appData.sets || [];

        let html = '<div class="scope-list scope-multiple">';
        html += `
            <label class="scope-list-item-checkbox ${isAllSelected ? 'selected' : ''}">
                <input type="checkbox" ${isAllSelected ? 'checked' : ''} onchange="window.toggleFlashcardSetScope('all', this.checked)">
                <span class="scope-checkmark"></span>
                <i class="fas fa-layer-group"></i>
                <span class="scope-item-name">Tất Cả Từ Vựng</span>
                <span class="count">${vocabulary.length}</span>
            </label>
        `;
        sets.forEach(set => {
            const count = vocabulary.filter(w => w.setId === set.id).length;
            const isSelected = flashcardSettings.selectedSetIds.includes(set.id);
            html += `
                <label class="scope-list-item-checkbox ${isSelected ? 'selected' : ''}" ${isAllSelected ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                    <input type="checkbox" ${isSelected ? 'checked' : ''} ${isAllSelected ? 'disabled' : ''} onchange="window.toggleFlashcardSetScope('${set.id}', this.checked)">
                    <span class="scope-checkmark"></span>
                    <i class="fas fa-folder" style="color: ${set.color || '#e91e8c'}"></i>
                    <span class="scope-item-name">${escapeHtml(set.name)}</span>
                    <span class="count">${count}</span>
                </label>
            `;
        });
        html += '</div>';
        html += `<div class="scope-footer">
            <button class="btn-secondary" onclick="window.closeScopeSelector()">Đóng</button>
            <button class="btn-primary" onclick="window.confirmFlashcardSetScope()"><i class="fas fa-check"></i> Xác nhận</button>
        </div>`;
        content.innerHTML = html;

    } else if (type === 'date') {
        title.textContent = 'Chọn Phạm Vi Ngày';
        content.innerHTML = `
            <div class="scope-list">
                <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'all' ? 'selected' : ''}" onclick="window.selectScope('date', 'all', 'Tất Cả Ngày')">
                    <i class="fas fa-calendar"></i><span>Tất Cả Ngày</span>
                </div>
                <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'today' ? 'selected' : ''}" onclick="window.selectScope('date', 'today', 'Hôm nay')">
                    <i class="fas fa-calendar-day"></i><span>Hôm nay</span>
                </div>
                <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'week' ? 'selected' : ''}" onclick="window.selectScope('date', 'week', '7 ngày qua')">
                    <i class="fas fa-calendar-week"></i><span>7 ngày qua</span>
                </div>
                <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'month' ? 'selected' : ''}" onclick="window.selectScope('date', 'month', '30 ngày qua')">
                    <i class="fas fa-calendar-alt"></i><span>30 ngày qua</span>
                </div>
            </div>
        `;
    }
    modal.classList.add('show');
}

export function toggleFlashcardSetScope(setId, checked) {
    if (setId === 'all') {
        if (checked) {
            flashcardSettings.selectedSetIds = ['all'];
            document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
                const input = item.querySelector('input');
                if (input && !input.getAttribute('onchange')?.includes("'all'")) {
                    item.style.opacity = '0.5';
                    item.style.pointerEvents = 'none';
                    input.checked = false;
                    input.disabled = true;
                }
            });
        } else {
            flashcardSettings.selectedSetIds = [];
            document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
                const input = item.querySelector('input');
                if (input) input.disabled = false;
            });
        }
    } else {
        flashcardSettings.selectedSetIds = flashcardSettings.selectedSetIds.filter(id => id !== 'all');
        if (checked) {
            if (!flashcardSettings.selectedSetIds.includes(setId)) flashcardSettings.selectedSetIds.push(setId);
        } else {
            flashcardSettings.selectedSetIds = flashcardSettings.selectedSetIds.filter(id => id !== setId);
        }
    }
    document.querySelectorAll('#scope-selector-content .scope-list-item-checkbox').forEach(item => {
        const input = item.querySelector('input');
        item.classList.toggle('selected', input?.checked);
    });
}

export function confirmFlashcardSetScope() {
    updateFlashcardSetDisplay();
    closeScopeSelector();
}

export function updateFlashcardSetDisplay() {
    const display = document.getElementById('selected-set-name');
    if (!display) return;
    if (flashcardSettings.selectedSetIds.includes('all') || flashcardSettings.selectedSetIds.length === 0) {
        display.textContent = 'Tất Cả Từ Vựng';
    } else if (flashcardSettings.selectedSetIds.length === 1) {
        const set = (appData.sets || []).find(s => s.id === flashcardSettings.selectedSetIds[0]);
        display.textContent = set?.name || 'Bộ từ vựng';
    } else {
        display.textContent = `${flashcardSettings.selectedSetIds.length} bộ từ vựng`;
    }
}

export function selectScope(type, value, label) {
    if (type === 'date') {
        flashcardSettings.selectedDateRange = value;
        const el = document.getElementById('selected-date-range');
        if (el) el.textContent = label;
    }
    closeScopeSelector();
}

export function refreshScope() {
    flashcardSettings.selectedSetIds = ['all'];
    flashcardSettings.selectedDateRange = 'all';
    const setEl = document.getElementById('selected-set-name');
    const dateEl = document.getElementById('selected-date-range');
    if (setEl) setEl.textContent = 'Tất Cả Từ Vựng';
    if (dateEl) dateEl.textContent = 'Tất Cả Ngày';
    showToast('Đã đặt lại phạm vi', 'success');
}

export function closeScopeSelector() {
    document.getElementById('scope-selector-modal')?.classList.remove('show');
}

/* ===== GET SETTINGS FROM FORM ===== */
export function getFlashcardSettingsFromForm() {
    flashcardSettings.includeUnmarked = document.getElementById('fc-include-unmarked')?.checked ?? true;
    flashcardSettings.includeMastered = document.getElementById('fc-include-mastered')?.checked ?? true;
    flashcardSettings.includeLearning = document.getElementById('fc-include-learning')?.checked ?? true;
    
    const sortRadio = document.querySelector('input[name="fc-sort"]:checked');
    flashcardSettings.sortBy = sortRadio?.value || 'random';
    
    flashcardSettings.frontFields = [];
    document.querySelectorAll('#front-fields .field-item input:checked').forEach(input => {
        const fieldItem = input.closest('.field-item');
        if (fieldItem) flashcardSettings.frontFields.push(fieldItem.dataset.field);
    });
    
    flashcardSettings.backFields = [];
    document.querySelectorAll('#back-fields .field-item input:checked').forEach(input => {
        const fieldItem = input.closest('.field-item');
        if (fieldItem) flashcardSettings.backFields.push(fieldItem.dataset.field);
    });
    
    return flashcardSettings;
}

/* ===== FILTER WORDS ===== */
export function getFilteredWordsForFlashcard() {
    let words = [...(appData.vocabulary || [])];
    
    if (!flashcardSettings.selectedSetIds.includes('all') && flashcardSettings.selectedSetIds.length > 0) {
        words = words.filter(w => flashcardSettings.selectedSetIds.includes(w.setId));
    }
    
    if (flashcardSettings.selectedDateRange !== 'all') {
        const now = new Date();
        let startDate;
        if (flashcardSettings.selectedDateRange === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (flashcardSettings.selectedDateRange === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (flashcardSettings.selectedDateRange === 'month') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (startDate) words = words.filter(w => new Date(w.createdAt) >= startDate);
    }
    
    words = words.filter(w => {
        if (w.mastered && !flashcardSettings.includeMastered) return false;
        if (!w.mastered && !flashcardSettings.includeLearning) return false;
        return true;
    });
    
    switch (flashcardSettings.sortBy) {
        case 'newest': words.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        case 'oldest': words.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
        case 'az': words.sort((a, b) => a.word.localeCompare(b.word)); break;
        case 'za': words.sort((a, b) => b.word.localeCompare(a.word)); break;
        default: words.sort(() => Math.random() - 0.5); break;
    }
    
    if (flashcardSettings.cardLimit > 0) words = words.slice(0, flashcardSettings.cardLimit);
    return words;
}

/* ===== START FLASHCARD ===== */
export function startFlashcardWithSettings() {
    getFlashcardSettingsFromForm();
    const words = getFilteredWordsForFlashcard();
    
    if (words.length === 0) {
        showToast('Không có từ vựng nào phù hợp với bộ lọc!', 'error');
        return;
    }
    
    practiceWords = words;
    practiceIndex = 0;
    practiceWordsReviewed = 0;
    showingSummary = false;
    isFlipped = false;
    
    closeAllModals();
    showPracticeArea();
    renderFlashcardWithSettings();
    showToast(`Bắt đầu với ${words.length} từ vựng`, 'success');
}

/* ===== PRACTICE AREA ===== */
function showPracticeArea() {
    const practiceArea = document.getElementById('practice-area');
    const practiceModes = document.getElementById('practice-modes');
    if (practiceModes) practiceModes.style.display = 'none';
    if (practiceArea) practiceArea.style.display = 'block';
    updatePracticeProgress();
}

export function hidePracticeArea() {
    const practiceArea = document.getElementById('practice-area');
    const practiceModes = document.getElementById('practice-modes');
    if (practiceModes) practiceModes.style.display = 'flex';
    if (practiceArea) practiceArea.style.display = 'none';
    showingSummary = false;
    practiceWordsReviewed = 0;
}

function updatePracticeProgress() {
    const progress = practiceWords.length > 0 ? ((practiceIndex + 1) / practiceWords.length) * 100 : 0;
    const progressBar = document.getElementById('practice-progress-bar');
    const progressText = document.getElementById('practice-progress-text');
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${practiceIndex + 1}/${practiceWords.length}`;
}

/* ===== RENDER FLASHCARD ===== */
export function renderFlashcardWithSettings() {
    const word = practiceWords[practiceIndex];
    if (!word) { endPractice(); return; }
    
    const meaning = word.meanings?.[0] || {};
    
    function getFieldContent(field) {
        const posVi = POS_MAPPING[meaning.pos] || meaning.pos || '';
        switch (field) {
            case 'word': return `<div class="flashcard-word">${escapeHtml(word.word)}</div>`;
            case 'phonetic': const ph = meaning.phoneticUS || meaning.phoneticUK || word.phonetic || ''; return ph ? `<div class="flashcard-phonetic">${escapeHtml(ph)}</div>` : '';
            case 'pos': return posVi ? `<div class="flashcard-pos">${escapeHtml(posVi)}</div>` : '';
            case 'defEn': return meaning.defEn ? `<div class="flashcard-meaning" style="font-size: 1.1rem; font-style: italic;">${escapeHtml(meaning.defEn)}</div>` : '';
            case 'defVi': return meaning.defVi ? `<div class="flashcard-meaning">${escapeHtml(meaning.defVi)}</div>` : '';
            case 'example': return meaning.example ? `<div class="flashcard-example">"${escapeHtml(meaning.example)}"</div>` : '';
            case 'synonyms': return meaning.synonyms ? `<div class="flashcard-example"><strong>Đồng nghĩa:</strong> ${escapeHtml(meaning.synonyms)}</div>` : '';
            case 'antonyms': return meaning.antonyms ? `<div class="flashcard-example"><strong>Trái nghĩa:</strong> ${escapeHtml(meaning.antonyms)}</div>` : '';
            default: return '';
        }
    }
    
    let frontContent = flashcardSettings.frontFields.map(f => getFieldContent(f)).filter(c => c).join('');
    let backContent = flashcardSettings.backFields.map(f => getFieldContent(f)).filter(c => c).join('');
    if (!frontContent) frontContent = `<div class="flashcard-word">${escapeHtml(word.word)}</div>`;
    if (!backContent) backContent = `<div class="flashcard-meaning">${escapeHtml(meaning.defVi || meaning.defEn || 'Không có nghĩa')}</div>`;
    
    const practiceContent = document.getElementById('practice-content');
    if (!practiceContent) return;
    
    practiceContent.innerHTML = `
        <div class="srs-container">
            <div class="flashcard ${isFlipped ? 'flipped' : ''}" onclick="window.flipCard()">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <button class="btn-speak-card" onclick="event.stopPropagation(); window.speak && window.speak('${escapeHtml(word.word)}')" title="Nghe phát âm">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        ${frontContent}
                        <p class="flip-hint">Nhấn để xem nghĩa</p>
                    </div>
                    <div class="flashcard-back">
                        <button class="btn-speak-card" onclick="event.stopPropagation(); window.speak && window.speak('${escapeHtml(meaning.defEn || word.word)}')" title="Nghe">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        ${backContent}
                    </div>
                </div>
            </div>
            <div class="srs-buttons">
                <button class="btn-srs btn-again" onclick="window.flashcardAnswerWithSettings('forgot')"><i class="fas fa-times"></i><span>Quên</span></button>
                <button class="btn-srs btn-hard" onclick="window.flashcardAnswerWithSettings('hard')"><i class="fas fa-frown"></i><span>Khó</span></button>
                <button class="btn-srs btn-good" onclick="window.flashcardAnswerWithSettings('good')"><i class="fas fa-smile"></i><span>Nhớ</span></button>
                <button class="btn-srs btn-easy" onclick="window.flashcardAnswerWithSettings('easy')"><i class="fas fa-grin-stars"></i><span>Dễ</span></button>
            </div>
        </div>
    `;
    updatePracticeProgress();
}

/* ===== FLIP CARD ===== */
export function flipCard() {
    isFlipped = !isFlipped;
    document.querySelector('.flashcard')?.classList.toggle('flipped', isFlipped);
}

/* ===== ANSWER ===== */
export function flashcardAnswerWithSettings(answer) {
    const word = practiceWords[practiceIndex];
    updateReviewHistory(word?.id);
    practiceWordsReviewed++;
    saveData(appData);
    isFlipped = false;
    practiceIndex++;
    if (practiceIndex >= practiceWords.length) { endPractice(); return; }
    renderFlashcardWithSettings();
}

function updateReviewHistory(wordId) {
    if (!wordId) return;
    const today = new Date().toISOString().split('T')[0];
    if (!appData.history) appData.history = [];
    let entry = appData.history.find(h => h.date === today);
    if (!entry) { entry = { date: today, added: 0, reviewed: 0, addedWords: [], reviewedWords: [] }; appData.history.push(entry); }
    if (!entry.reviewedWords) entry.reviewedWords = [];
    if (!entry.reviewedWords.includes(wordId)) entry.reviewedWords.push(wordId);
    entry.reviewed = entry.reviewedWords.length;
}

function endPractice() {
    const practiceContent = document.getElementById('practice-content');
    if (practiceContent) {
        practiceContent.innerHTML = `
            <div class="practice-complete">
                <i class="fas fa-trophy"></i>
                <h2>Hoàn thành!</h2>
                <p>Bạn đã luyện tập ${practiceWords.length} từ</p>
                <button class="btn-primary" onclick="window.hidePracticeArea()">Quay lại</button>
            </div>
        `;
    }
    const today = new Date().toISOString().split('T')[0];
    if (appData.lastStudyDate !== today) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        appData.streak = appData.lastStudyDate === yesterday.toISOString().split('T')[0] ? (appData.streak || 0) + 1 : 1;
        appData.lastStudyDate = today;
        saveData(appData);
    }
    if (window.updateStats) window.updateStats();
    if (window.updateSRSCount) window.updateSRSCount();
}

/* ===== HANDLE BACK ===== */
export function handlePracticeBack() {
    if (showingSummary) { hidePracticeArea(); return; }
    if (practiceWordsReviewed === 0) { hidePracticeArea(); return; }
    showingSummary = true;
    showPracticeSummary();
}

function showPracticeSummary() {
    const total = practiceWords.length, reviewed = practiceWordsReviewed, remaining = total - reviewed;
    const practiceContent = document.getElementById('practice-content');
    if (practiceContent) {
        practiceContent.innerHTML = `
            <div class="practice-summary">
                <i class="fas fa-pause-circle summary-icon"></i>
                <h2>Tạm dừng luyện tập</h2>
                <div class="summary-stats">
                    <div class="summary-stat"><span class="summary-stat-value">${reviewed}</span><span class="summary-stat-label">Từ đã học</span></div>
                    <div class="summary-stat"><span class="summary-stat-value">${remaining}</span><span class="summary-stat-label">Từ còn lại</span></div>
                    <div class="summary-stat"><span class="summary-stat-value">${total}</span><span class="summary-stat-label">Tổng số từ</span></div>
                </div>
                <div class="summary-actions">
                    <button class="btn-secondary" onclick="window.hidePracticeArea()"><i class="fas fa-arrow-left"></i> Quay lại</button>
                    <button class="btn-primary" onclick="window.continuePractice()"><i class="fas fa-play"></i> Tiếp tục học</button>
                </div>
            </div>
        `;
    }
}

export function continuePractice() {
    showingSummary = false;
    renderFlashcardWithSettings();
}

/* ===== INIT ===== */
export function initFlashcardSettings() {
    window.openFlashcardSettings = openFlashcardSettings;
    window.closeFlashcardSettings = closeFlashcardSettings;
    window.switchFlashcardTab = switchFlashcardTab;
    window.adjustCardLimit = adjustCardLimit;
    window.updateCardLimit = updateCardLimit;
    window.openScopeSelector = openScopeSelector;
    window.toggleFlashcardSetScope = toggleFlashcardSetScope;
    window.confirmFlashcardSetScope = confirmFlashcardSetScope;
    window.selectScope = selectScope;
    window.refreshScope = refreshScope;
    window.closeScopeSelector = closeScopeSelector;
    window.startFlashcardWithSettings = startFlashcardWithSettings;
    window.flipCard = flipCard;
    window.flashcardAnswerWithSettings = flashcardAnswerWithSettings;
    window.hidePracticeArea = hidePracticeArea;
    window.handlePracticeBack = handlePracticeBack;
    window.continuePractice = continuePractice;
    console.log('✅ FlashcardSettings initialized');
}
