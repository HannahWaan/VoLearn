/* ===== SET VIEW MODULE ===== */
/* VoLearn v2.1.0 - Split view chi tiết bộ từ */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { pushUndoState } from '../core/undo.js';
import { showToast } from './toast.js';
import { navigate } from '../core/router.js';
import { speak } from '../utils/speech.js';

/* ===== STATE ===== */
let currentSetId = null;
let selectedWordId = null;
let viewMode = 'list'; // 'list' | 'grid'
let sortBy = 'added';
let searchQuery = '';

/* ===== INIT ===== */
export function initSetView() {
    currentSetId = window.currentSetId;
    if (!currentSetId) {
        navigate('bookshelf');
        return;
    }
    
    renderSetView();
    bindSetViewEvents();
}

/* ===== GET CURRENT SET ===== */
function getCurrentSet() {
    return appData.sets.find(s => s.id === currentSetId);
}

/* ===== RENDER SET VIEW ===== */
export function renderSetView() {
    const set = getCurrentSet();
    if (!set) {
        navigate('bookshelf');
        return;
    }

    renderSetHeader(set);
    renderWordsList(set);
    
    // Select first word by default
    if (set.words?.length > 0 && !selectedWordId) {
        selectWord(set.words[0].id);
    } else if (selectedWordId) {
        renderWordDetail();
    } else {
        renderEmptyDetail();
    }
}

/* ===== RENDER SET HEADER ===== */
function renderSetHeader(set) {
    const header = document.getElementById('set-view-header');
    if (!header) return;

    const wordCount = set.words?.length || 0;
    const masteredCount = set.words?.filter(w => w.mastered).length || 0;

    header.innerHTML = `
        <div class="set-header-left">
            <button class="btn-back" onclick="window.navigate('bookshelf')">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div class="set-header-info">
                <div class="set-icon" style="background: ${set.color || 'var(--primary)'}">
                    <i class="${set.icon || 'fas fa-folder'}"></i>
                </div>
                <div>
                    <h1>${escapeHtml(set.name)}</h1>
                    <p>${wordCount} từ • ${masteredCount} đã thuộc</p>
                </div>
            </div>
        </div>
        
        <div class="set-header-actions">
            <button class="btn-secondary" onclick="window.addWordToSet()">
                <i class="fas fa-plus"></i> Thêm từ
            </button>
            <button class="btn-primary" onclick="window.practiceCurrentSet()">
                <i class="fas fa-play"></i> Luyện tập
            </button>
            <div class="view-toggle">
                <button class="btn-icon ${viewMode === 'list' ? 'active' : ''}" 
                        onclick="window.setViewMode('list')" title="Danh sách">
                    <i class="fas fa-list"></i>
                </button>
                <button class="btn-icon ${viewMode === 'grid' ? 'active' : ''}" 
                        onclick="window.setViewMode('grid')" title="Lưới">
                    <i class="fas fa-th"></i>
                </button>
            </div>
        </div>
    `;
}

/* ===== RENDER WORDS LIST ===== */
function renderWordsList(set) {
    const container = document.getElementById('words-list-container');
    if (!container) return;

    const words = getFilteredWords(set);

    if (words.length === 0) {
        container.innerHTML = `
            <div class="search-bar">
                <i class="fas fa-search"></i>
                <input type="text" id="word-search" placeholder="Tìm từ..." value="${searchQuery}">
            </div>
            <div class="empty-list">
                <i class="fas fa-inbox"></i>
                <p>Chưa có từ nào</p>
                <button class="btn-primary" onclick="window.addWordToSet()">
                    <i class="fas fa-plus"></i> Thêm từ đầu tiên
                </button>
            </div>
        `;
        bindSearchEvent();
        return;
    }

    container.innerHTML = `
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="word-search" placeholder="Tìm từ..." value="${searchQuery}">
            <select id="word-sort" class="sort-select">
                <option value="added" ${sortBy === 'added' ? 'selected' : ''}>Mới thêm</option>
                <option value="alpha" ${sortBy === 'alpha' ? 'selected' : ''}>A-Z</option>
                <option value="alpha-desc" ${sortBy === 'alpha-desc' ? 'selected' : ''}>Z-A</option>
                <option value="mastered" ${sortBy === 'mastered' ? 'selected' : ''}>Đã thuộc</option>
            </select>
        </div>
        
        <div class="words-list ${viewMode}">
            ${words.map(word => renderWordItem(word)).join('')}
        </div>
    `;

    bindSearchEvent();
    bindSortEvent();
    bindWordItemEvents();
}

/* ===== RENDER WORD ITEM ===== */
function renderWordItem(word) {
    const isSelected = word.id === selectedWordId;
    const masteredClass = word.mastered ? 'mastered' : '';
    const selectedClass = isSelected ? 'selected' : '';

    return `
        <div class="word-item ${masteredClass} ${selectedClass}" data-word-id="${word.id}">
            <div class="word-item-main">
                <span class="word-text">${escapeHtml(word.word)}</span>
                ${word.phonetic ? `<span class="word-phonetic">${escapeHtml(word.phonetic)}</span>` : ''}
            </div>
            <div class="word-item-sub">
                <span class="word-meaning">${escapeHtml(truncate(word.meaning, 50))}</span>
            </div>
            <div class="word-item-actions">
                <button class="btn-icon btn-speak" data-word="${escapeHtml(word.word)}" title="Phát âm">
                    <i class="fas fa-volume-up"></i>
                </button>
                ${word.mastered ? 
                    '<i class="fas fa-check-circle text-success" title="Đã thuộc"></i>' : 
                    '<i class="far fa-circle text-muted" title="Chưa thuộc"></i>'
                }
            </div>
        </div>
    `;
}

/* ===== RENDER WORD DETAIL ===== */
function renderWordDetail() {
    const container = document.getElementById('word-detail-container');
    if (!container) return;

    const set = getCurrentSet();
    const word = set?.words?.find(w => w.id === selectedWordId);

    if (!word) {
        renderEmptyDetail();
        return;
    }

    container.innerHTML = `
        <div class="word-detail-card">
            <div class="word-detail-header">
                <div class="word-main">
                    <h2>${escapeHtml(word.word)}</h2>
                    <button class="btn-icon btn-speak-large" onclick="window.speakWord('${escapeHtml(word.word)}')">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                ${word.phonetic ? `<p class="word-phonetic-large">${escapeHtml(word.phonetic)}</p>` : ''}
                ${word.partOfSpeech ? `<span class="word-pos">${escapeHtml(word.partOfSpeech)}</span>` : ''}
            </div>
            
            <div class="word-detail-body">
                <div class="detail-section">
                    <h3><i class="fas fa-book"></i> Nghĩa</h3>
                    <p>${escapeHtml(word.meaning)}</p>
                </div>
                
                ${word.example ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-quote-left"></i> Ví dụ</h3>
                        <p class="example-text">"${escapeHtml(word.example)}"</p>
                    </div>
                ` : ''}
                
                ${word.synonyms?.length ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-equals"></i> Từ đồng nghĩa</h3>
                        <div class="tags">
                            ${word.synonyms.map(s => `<span class="tag tag-synonym">${escapeHtml(s)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${word.antonyms?.length ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-not-equal"></i> Từ trái nghĩa</h3>
                        <div class="tags">
                            ${word.antonyms.map(a => `<span class="tag tag-antonym">${escapeHtml(a)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${word.note ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-sticky-note"></i> Ghi chú</h3>
                        <p>${escapeHtml(word.note)}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="word-detail-footer">
                <div class="word-status">
                    <label class="checkbox-label">
                        <input type="checkbox" id="word-mastered" ${word.mastered ? 'checked' : ''}>
                        <span>Đã thuộc</span>
                    </label>
                </div>
                <div class="word-actions">
                    <button class="btn-secondary" onclick="window.editCurrentWord()">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn-danger" onclick="window.deleteCurrentWord()">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
        </div>
    `;

    // Bind mastered checkbox
    const masteredCheckbox = document.getElementById('word-mastered');
    if (masteredCheckbox) {
        masteredCheckbox.addEventListener('change', (e) => {
            toggleWordMastered(selectedWordId, e.target.checked);
        });
    }
}

function renderEmptyDetail() {
    const container = document.getElementById('word-detail-container');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-detail">
            <i class="fas fa-hand-pointer"></i>
            <p>Chọn một từ để xem chi tiết</p>
        </div>
    `;
}

/* ===== BIND EVENTS ===== */
function bindSetViewEvents() {
    // Will be called on init
}

function bindSearchEvent() {
    const searchInput = document.getElementById('word-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            const set = getCurrentSet();
            if (set) renderWordsList(set);
        });
    }
}

function bindSortEvent() {
    const sortSelect = document.getElementById('word-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            const set = getCurrentSet();
            if (set) renderWordsList(set);
        });
    }
}

function bindWordItemEvents() {
    // Click to select
    document.querySelectorAll('.word-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-speak')) return;
            const wordId = item.dataset.wordId;
            selectWord(wordId);
        });
    });

    // Speak button
    document.querySelectorAll('.btn-speak').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const word = btn.dataset.word;
            speak(word);
        });
    });
}

/* ===== ACTIONS ===== */
export function selectWord(wordId) {
    selectedWordId = wordId;
    
    // Update selection in list
    document.querySelectorAll('.word-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.wordId === wordId);
    });
    
    renderWordDetail();
}

export function toggleWordMastered(wordId, mastered) {
    const set = getCurrentSet();
    if (!set) return;

    const word = set.words?.find(w => w.id === wordId);
    if (!word) return;

    pushUndoState();
    word.mastered = mastered;
    saveData(appData);

    // Update UI
    const wordItem = document.querySelector(`.word-item[data-word-id="${wordId}"]`);
    if (wordItem) {
        wordItem.classList.toggle('mastered', mastered);
    }

    showToast(mastered ? 'Đã đánh dấu thuộc' : 'Đã bỏ đánh dấu', 'success');
}

export function addWordToSet() {
    window.targetSetId = currentSetId;
    navigate('add-word');
}

export function practiceCurrentSet() {
    const set = getCurrentSet();
    if (!set || !set.words?.length) {
        showToast('Bộ từ trống!', 'warning');
        return;
    }
    
    window.practiceScope = { type: 'set', setId: currentSetId };
    navigate('practice');
}

export function editCurrentWord() {
    if (!selectedWordId) return;
    
    window.editWordId = selectedWordId;
    window.targetSetId = currentSetId;
    navigate('add-word');
}

export function deleteCurrentWord() {
    if (!selectedWordId) return;

    const set = getCurrentSet();
    if (!set) return;

    const word = set.words?.find(w => w.id === selectedWordId);
    if (!word) return;

    if (!confirm(`Bạn có chắc muốn xóa từ "${word.word}"?`)) return;

    pushUndoState();

    const index = set.words.findIndex(w => w.id === selectedWordId);
    if (index !== -1) {
        set.words.splice(index, 1);
        saveData(appData);
        
        selectedWordId = null;
        renderSetView();
        showToast('Đã xóa từ', 'success');
    }
}

export function setViewMode(mode) {
    viewMode = mode;
    const set = getCurrentSet();
    if (set) renderWordsList(set);
    renderSetHeader(set);
}

/* ===== FILTER & SORT ===== */
function getFilteredWords(set) {
    if (!set?.words) return [];
    
    let words = [...set.words];

    // Search
    if (searchQuery) {
        words = words.filter(w => 
            w.word.toLowerCase().includes(searchQuery) ||
            w.meaning?.toLowerCase().includes(searchQuery)
        );
    }

    // Sort
    switch (sortBy) {
        case 'alpha':
            words.sort((a, b) => a.word.localeCompare(b.word));
            break;
        case 'alpha-desc':
            words.sort((a, b) => b.word.localeCompare(a.word));
            break;
        case 'mastered':
            words.sort((a, b) => (b.mastered ? 1 : 0) - (a.mastered ? 1 : 0));
            break;
        case 'added':
        default:
            // Keep original order (newest first assumed)
            break;
    }

    return words;
}

/* ===== UTILITIES ===== */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/* ===== EXPORTS ===== */
window.addWordToSet = addWordToSet;
window.practiceCurrentSet = practiceCurrentSet;
window.editCurrentWord = editCurrentWord;
window.deleteCurrentWord = deleteCurrentWord;
window.setViewMode = setViewMode;
window.selectWord = selectWord;
window.speakWord = speak;
