/* ===== FLASHCARD SETTINGS MODULE ===== */
/* VoLearn v2.1.0 - Modal cài đặt Flashcard */

import { appData } from '../core/state.js';
import { openModal, closeAllModals } from '../ui/modalEngine.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { startFlashcard } from './flashcard.js';

/* ===== SETTINGS STATE ===== */
export let flashcardSettings = {
    cardLimit: 0,
    selectedSetIds: ['all'],
    selectedDateRange: 'all',
    includeUnmarked: true,
    includeMastered: true,
    includeLearning: true,
    includeBookmarked: true,
    sortBy: 'random',
    frontFields: ['word', 'phonetic'],
    backFields: ['pos', 'defVi', 'example']
};

const FLASHCARD_FIELDS = [
    { id: 'word', label: 'Từ vựng' },
    { id: 'phonetic', label: 'Phát âm' },
    { id: 'pos', label: 'Loại từ' },
    { id: 'defEn', label: 'Định nghĩa (EN)' },
    { id: 'defVi', label: 'Nghĩa (VI)' },
    { id: 'example', label: 'Ví dụ' },
    { id: 'synonyms', label: 'Từ đồng nghĩa' },
    { id: 'antonyms', label: 'Từ trái nghĩa' }
];

/* ===== OPEN SETTINGS MODAL ===== */
export function openFlashcardSettings() {
    renderFlashcardSettingsModal();
    updateFlashcardCounts();
    openModal('flashcard-settings-modal');
}

/* ===== RENDER MODAL ===== */
function renderFlashcardSettingsModal() {
    let modal = document.getElementById('flashcard-settings-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'flashcard-settings-modal';
        modal.className = 'modal';
        document.getElementById('modals-container')?.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3><i class="fas fa-clone"></i> Flashcard</h3>
                <button class="modal-close" onclick="closeAllModals()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body flashcard-settings-body">
                <!-- Tabs -->
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="target" onclick="window.switchFlashcardTab('target', this)">
                        Mục tiêu
                    </button>
                    <button class="settings-tab" data-tab="view" onclick="window.switchFlashcardTab('view', this)">
                        Xem
                    </button>
                </div>

                <!-- Tab Content: Mục tiêu -->
                <div id="fc-tab-target" class="settings-tab-content active">
                    ${renderTargetTab()}
                </div>

                <!-- Tab Content: Xem -->
                <div id="fc-tab-view" class="settings-tab-content">
                    ${renderViewTab()}
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-start-practice" onclick="window.startFlashcardWithSettings()">
                    <i class="fas fa-play"></i> Bắt đầu học
                </button>
            </div>
        </div>
    `;
}

function renderTargetTab() {
    return `
        <div class="setting-section">
            <div class="setting-row">
                <span class="setting-label">Giới hạn số lượng thẻ</span>
                <div class="setting-value">
                    <button class="btn-circle" onclick="window.adjustFCCardLimit(-5)"><i class="fas fa-minus"></i></button>
                    <span id="fc-card-limit-value">Không giới hạn</span>
                    <button class="btn-circle" onclick="window.adjustFCCardLimit(5)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <input type="range" id="fc-card-limit-slider" min="0" max="100" value="0" 
                   oninput="window.updateFCCardLimit(this.value)" class="full-slider">
        </div>

        <div class="setting-section">
            <div class="section-header">
                <h4><i class="fas fa-crosshairs"></i> Phạm Vi Kiểm Tra</h4>
                <button class="btn-refresh" onclick="window.refreshFCScope()" title="Đặt lại"><i class="fas fa-sync-alt"></i></button>
            </div>
            <p class="section-desc">Bạn có thể chọn bộ từ vựng hoặc ngày cụ thể</p>
            
            <div class="scope-option" onclick="window.openFCScopeSelector('set')">
                <i class="fas fa-layer-group"></i>
                <span id="fc-selected-set-name">Tất Cả Từ Vựng</span>
                <i class="fas fa-chevron-right"></i>
            </div>
            <div class="scope-option" onclick="window.openFCScopeSelector('date')">
                <i class="fas fa-calendar-alt"></i>
                <span id="fc-selected-date-range">Tất Cả Ngày</span>
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>

        <div class="setting-section">
            <h4><i class="fas fa-bookmark"></i> Đánh dấu từ</h4>
            <label class="checkbox-item">
                <input type="checkbox" id="fc-include-unmarked" checked>
                <span class="checkmark"></span>
                <span class="checkbox-label">Chưa đánh dấu (<span id="fc-count-unmarked">0</span>)</span>
            </label>
            <label class="checkbox-item">
                <input type="checkbox" id="fc-include-mastered" checked>
                <span class="checkmark"></span>
                <span class="checkbox-label">Đã thuộc (<span id="fc-count-mastered">0</span>)</span>
            </label>
            <label class="checkbox-item">
                <input type="checkbox" id="fc-include-learning" checked>
                <span class="checkmark"></span>
                <span class="checkbox-label">Chưa thuộc (<span id="fc-count-learning">0</span>)</span>
            </label>
            <label class="checkbox-item">
                <input type="checkbox" id="fc-include-bookmarked" checked>
                <span class="checkmark"></span>
                <span class="checkbox-label">Đã đánh dấu sao (<span id="fc-count-bookmarked">0</span>)</span>
            </label>
        </div>

        <div class="setting-section">
            <h4><i class="fas fa-sort"></i> Sắp Xếp Theo</h4>
            <div class="radio-group">
                <label class="radio-item">
                    <input type="radio" name="fc-sort" value="newest">
                    <span class="radio-mark"></span>
                    <span>Mới nhất</span>
                </label>
                <label class="radio-item">
                    <input type="radio" name="fc-sort" value="oldest">
                    <span class="radio-mark"></span>
                    <span>Cũ nhất</span>
                </label>
                <label class="radio-item">
                    <input type="radio" name="fc-sort" value="az">
                    <span class="radio-mark"></span>
                    <span>A-Z</span>
                </label>
                <label class="radio-item">
                    <input type="radio" name="fc-sort" value="za">
                    <span class="radio-mark"></span>
                    <span>Z-A</span>
                </label>
                <label class="radio-item">
                    <input type="radio" name="fc-sort" value="random" checked>
                    <span class="radio-mark"></span>
                    <span>Ngẫu nhiên</span>
                </label>
            </div>
        </div>
    `;
}

function renderViewTab() {
    return `
        <div class="setting-section">
            <h4><i class="fas fa-eye"></i> Mặt Trước Thẻ (Câu hỏi)</h4>
            <p class="section-desc">Chọn các mục hiển thị ở mặt trước.</p>
            
            <div class="field-selector" id="fc-front-fields">
                ${FLASHCARD_FIELDS.map((f, idx) => `
                    <label class="field-item" data-field="${f.id}">
                        <span class="field-order">${idx + 1}</span>
                        <input type="checkbox" ${flashcardSettings.frontFields.includes(f.id) ? 'checked' : ''}>
                        <span class="field-name">${f.label}</span>
                    </label>
                `).join('')}
            </div>
        </div>

        <div class="setting-section">
            <h4><i class="fas fa-eye-slash"></i> Mặt Sau Thẻ (Đáp án)</h4>
            <p class="section-desc">Chọn các mục hiển thị ở mặt sau khi lật thẻ.</p>
            
            <div class="field-selector" id="fc-back-fields">
                ${FLASHCARD_FIELDS.map((f, idx) => `
                    <label class="field-item" data-field="${f.id}">
                        <span class="field-order">${idx + 1}</span>
                        <input type="checkbox" ${flashcardSettings.backFields.includes(f.id) ? 'checked' : ''}>
                        <span class="field-name">${f.label}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
}

/* ===== UPDATE COUNTS ===== */
function updateFlashcardCounts() {
    const vocab = appData.vocabulary || [];
    
    const unmarked = vocab.filter(w => !w.mastered && !w.bookmarked).length;
    const mastered = vocab.filter(w => w.mastered).length;
    const learning = vocab.filter(w => !w.mastered).length;
    const bookmarked = vocab.filter(w => w.bookmarked).length;
    
    const setCount = el => el && (el.textContent = unmarked);
    
    setCount(document.getElementById('fc-count-unmarked'), unmarked);
    setCount(document.getElementById('fc-count-mastered'), mastered);
    setCount(document.getElementById('fc-count-learning'), learning);
    setCount(document.getElementById('fc-count-bookmarked'), bookmarked);
}

/* ===== TAB SWITCHING ===== */
export function switchFlashcardTab(tabName, btn) {
    document.querySelectorAll('#flashcard-settings-modal .settings-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('#flashcard-settings-modal .settings-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`fc-tab-${tabName}`)?.classList.add('active');
}

/* ===== CARD LIMIT ===== */
export function adjustFCCardLimit(delta) {
    const slider = document.getElementById('fc-card-limit-slider');
    if (!slider) return;
    
    let newValue = parseInt(slider.value) + delta;
    newValue = Math.max(0, Math.min(100, newValue));
    slider.value = newValue;
    updateFCCardLimit(newValue);
}

export function updateFCCardLimit(value) {
    const intValue = parseInt(value);
    flashcardSettings.cardLimit = intValue;
    
    const display = document.getElementById('fc-card-limit-value');
    if (display) {
        display.textContent = intValue === 0 ? 'Không giới hạn' : intValue + ' thẻ';
    }
}

/* ===== SCOPE SELECTOR ===== */
export function openFCScopeSelector(type) {
    // Tạo modal selector nếu chưa có
    let modal = document.getElementById('fc-scope-selector-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fc-scope-selector-modal';
        modal.className = 'modal';
        document.getElementById('modals-container')?.appendChild(modal);
    }
    
    if (type === 'set') {
        renderSetScopeSelector(modal);
    } else if (type === 'date') {
        renderDateScopeSelector(modal);
    }
    
    modal.classList.add('show');
}

function renderSetScopeSelector(modal) {
    const isAllSelected = flashcardSettings.selectedSetIds.includes('all');
    const sets = appData.sets || [];
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Chọn Bộ Từ Vựng</h3>
                <button class="modal-close" onclick="window.closeFCScopeSelector()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="scope-list scope-multiple">
                    <label class="scope-list-item-checkbox ${isAllSelected ? 'selected' : ''}">
                        <input type="checkbox" ${isAllSelected ? 'checked' : ''} 
                               onchange="window.toggleFCSetScope('all', this.checked)">
                        <span class="scope-checkmark"></span>
                        <i class="fas fa-layer-group"></i>
                        <span class="scope-item-name">Tất Cả Từ Vựng</span>
                        <span class="count">${appData.vocabulary?.length || 0}</span>
                    </label>
                    
                    ${sets.map(set => {
                        const count = appData.vocabulary?.filter(w => w.setId === set.id).length || 0;
                        const isSelected = flashcardSettings.selectedSetIds.includes(set.id);
                        return `
                            <label class="scope-list-item-checkbox ${isSelected ? 'selected' : ''}" 
                                   ${isAllSelected ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                                <input type="checkbox" ${isSelected ? 'checked' : ''} ${isAllSelected ? 'disabled' : ''}
                                       onchange="window.toggleFCSetScope('${set.id}', this.checked)">
                                <span class="scope-checkmark"></span>
                                <i class="fas fa-folder" style="color: ${set.color || '#e91e8c'}"></i>
                                <span class="scope-item-name">${escapeHtml(set.name)}</span>
                                <span class="count">${count}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="window.closeFCScopeSelector()">Đóng</button>
                <button class="btn-primary" onclick="window.confirmFCSetScope()">
                    <i class="fas fa-check"></i> Xác nhận
                </button>
            </div>
        </div>
    `;
}

function renderDateScopeSelector(modal) {
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Chọn Phạm Vi Ngày</h3>
                <button class="modal-close" onclick="window.closeFCScopeSelector()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="scope-list">
                    <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'all' ? 'selected' : ''}" 
                         onclick="window.selectFCDateScope('all', 'Tất Cả Ngày')">
                        <i class="fas fa-calendar"></i><span>Tất Cả Ngày</span>
                    </div>
                    <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'today' ? 'selected' : ''}" 
                         onclick="window.selectFCDateScope('today', 'Hôm nay')">
                        <i class="fas fa-calendar-day"></i><span>Hôm nay</span>
                    </div>
                    <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'week' ? 'selected' : ''}" 
                         onclick="window.selectFCDateScope('week', '7 ngày qua')">
                        <i class="fas fa-calendar-week"></i><span>7 ngày qua</span>
                    </div>
                    <div class="scope-list-item ${flashcardSettings.selectedDateRange === 'month' ? 'selected' : ''}" 
                         onclick="window.selectFCDateScope('month', '30 ngày qua')">
                        <i class="fas fa-calendar-alt"></i><span>30 ngày qua</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function toggleFCSetScope(setId, checked) {
    if (setId === 'all') {
        if (checked) {
            flashcardSettings.selectedSetIds = ['all'];
        } else {
            flashcardSettings.selectedSetIds = [];
        }
    } else {
        flashcardSettings.selectedSetIds = flashcardSettings.selectedSetIds.filter(id => id !== 'all');
        
        if (checked) {
            if (!flashcardSettings.selectedSetIds.includes(setId)) {
                flashcardSettings.selectedSetIds.push(setId);
            }
        } else {
            flashcardSettings.selectedSetIds = flashcardSettings.selectedSetIds.filter(id => id !== setId);
        }
    }
    
    // Update UI
    document.querySelectorAll('#fc-scope-selector-modal .scope-list-item-checkbox').forEach(item => {
        const input = item.querySelector('input');
        item.classList.toggle('selected', input?.checked);
    });
}

export function confirmFCSetScope() {
    updateFCSetDisplay();
    closeFCScopeSelector();
}

function updateFCSetDisplay() {
    const display = document.getElementById('fc-selected-set-name');
    if (!display) return;
    
    if (flashcardSettings.selectedSetIds.includes('all') || flashcardSettings.selectedSetIds.length === 0) {
        display.textContent = 'Tất Cả Từ Vựng';
    } else if (flashcardSettings.selectedSetIds.length === 1) {
        const set = appData.sets?.find(s => s.id === flashcardSettings.selectedSetIds[0]);
        display.textContent = set?.name || 'Bộ từ vựng';
    } else {
        display.textContent = `${flashcardSettings.selectedSetIds.length} bộ từ vựng`;
    }
}

export function selectFCDateScope(value, label) {
    flashcardSettings.selectedDateRange = value;
    const display = document.getElementById('fc-selected-date-range');
    if (display) display.textContent = label;
    closeFCScopeSelector();
}

export function closeFCScopeSelector() {
    const modal = document.getElementById('fc-scope-selector-modal');
    if (modal) modal.classList.remove('show');
}

export function refreshFCScope() {
    flashcardSettings.selectedSetIds = ['all'];
    flashcardSettings.selectedDateRange = 'all';
    
    const setDisplay = document.getElementById('fc-selected-set-name');
    const dateDisplay = document.getElementById('fc-selected-date-range');
    if (setDisplay) setDisplay.textContent = 'Tất Cả Từ Vựng';
    if (dateDisplay) dateDisplay.textContent = 'Tất Cả Ngày';
    
    showToast('Đã đặt lại phạm vi');
}

/* ===== GET SETTINGS FROM FORM ===== */
function getSettingsFromForm() {
    flashcardSettings.includeUnmarked = document.getElementById('fc-include-unmarked')?.checked ?? true;
    flashcardSettings.includeMastered = document.getElementById('fc-include-mastered')?.checked ?? true;
    flashcardSettings.includeLearning = document.getElementById('fc-include-learning')?.checked ?? true;
    flashcardSettings.includeBookmarked = document.getElementById('fc-include-bookmarked')?.checked ?? true;
    
    const sortRadio = document.querySelector('input[name="fc-sort"]:checked');
    flashcardSettings.sortBy = sortRadio?.value || 'random';
    
    // Get front fields
    flashcardSettings.frontFields = [];
    document.querySelectorAll('#fc-front-fields .field-item input:checked').forEach(input => {
        const fieldItem = input.closest('.field-item');
        if (fieldItem?.dataset.field) {
            flashcardSettings.frontFields.push(fieldItem.dataset.field);
        }
    });
    
    // Get back fields
    flashcardSettings.backFields = [];
    document.querySelectorAll('#fc-back-fields .field-item input:checked').forEach(input => {
        const fieldItem = input.closest('.field-item');
        if (fieldItem?.dataset.field) {
            flashcardSettings.backFields.push(fieldItem.dataset.field);
        }
    });
    
    return flashcardSettings;
}

/* ===== FILTER WORDS ===== */
function getFilteredWords() {
    let words = [...(appData.vocabulary || [])];
    
    // Filter by sets
    if (!flashcardSettings.selectedSetIds.includes('all') && flashcardSettings.selectedSetIds.length > 0) {
        words = words.filter(w => flashcardSettings.selectedSetIds.includes(w.setId));
    }
    
    // Filter by date
    if (flashcardSettings.selectedDateRange !== 'all') {
        const now = new Date();
        let startDate;
        
        if (flashcardSettings.selectedDateRange === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (flashcardSettings.selectedDateRange === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (flashcardSettings.selectedDateRange === 'month') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        if (startDate) {
            words = words.filter(w => new Date(w.createdAt) >= startDate);
        }
    }
    
    // Filter by marks
    words = words.filter(w => {
        if (w.mastered && !flashcardSettings.includeMastered) return false;
        if (!w.mastered && !flashcardSettings.includeLearning) return false;
        if (w.bookmarked && !flashcardSettings.includeBookmarked) return false;
        return true;
    });
    
    // Sort
    switch (flashcardSettings.sortBy) {
        case 'newest': words.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        case 'oldest': words.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
        case 'az': words.sort((a, b) => a.word.localeCompare(b.word)); break;
        case 'za': words.sort((a, b) => b.word.localeCompare(a.word)); break;
        default: words.sort(() => Math.random() - 0.5); break;
    }
    
    // Limit
    if (flashcardSettings.cardLimit > 0) {
        words = words.slice(0, flashcardSettings.cardLimit);
    }
    
    return words;
}

/* ===== START WITH SETTINGS ===== */
export function startFlashcardWithSettings() {
    getSettingsFromForm();
    
    const words = getFilteredWords();
    
    if (words.length === 0) {
        showToast('Không có từ vựng nào phù hợp với bộ lọc!', 'error');
        return;
    }
    
    closeAllModals();
    
    // Store settings for rendering
    window.flashcardSettings = flashcardSettings;
    
    // Start flashcard with custom rendering based on field settings
    startFlashcardWithCustomFields(words, flashcardSettings);
    
    showToast(`Bắt đầu với ${words.length} từ vựng`);
}

/* ===== CUSTOM FLASHCARD RENDERING ===== */
function startFlashcardWithCustomFields(words, settings) {
    // Implementation sẽ override renderFlashcard với custom fields
    import('./flashcard.js').then(module => {
        // Override or extend flashcard with custom field rendering
        window.currentFlashcardSettings = settings;
        module.startFlashcard({ type: 'custom', words }, {
            frontFields: settings.frontFields,
            backFields: settings.backFields
        });
    });
}

/* ===== GLOBAL EXPORTS ===== */
window.openFlashcardSettings = openFlashcardSettings;
window.switchFlashcardTab = switchFlashcardTab;
window.adjustFCCardLimit = adjustFCCardLimit;
window.updateFCCardLimit = updateFCCardLimit;
window.openFCScopeSelector = openFCScopeSelector;
window.toggleFCSetScope = toggleFCSetScope;
window.confirmFCSetScope = confirmFCSetScope;
window.selectFCDateScope = selectFCDateScope;
window.closeFCScopeSelector = closeFCScopeSelector;
window.refreshFCScope = refreshFCScope;
window.startFlashcardWithSettings = startFlashcardWithSettings;
