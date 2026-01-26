/* ===== SET VIEW MODULE ===== */
/* VoLearn v2.1.0 - Split view chi tiết bộ từ */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';
import { navigate } from '../core/router.js';
import { speak } from '../utils/speech.js';
import { escapeHtml } from '../utils/helpers.js';

/* ===== STATE ===== */
let currentSetId = null;
let selectedWordId = null;
let viewMode = 'list';
let sortBy = 'added';
let searchQuery = '';

/* ===== INIT ===== */
export function initSetView() {
    // Get setId from window (set by bookshelf or router)
    currentSetId = window.currentSetId || null;
    
    if (!currentSetId) {
        return; // Don't navigate if not on set-view
    }
    
    selectedWordId = null;
    searchQuery = '';
    
    renderSetView();
    bindSetViewEvents();
    
    console.log('✅ SetView initialized for:', currentSetId);
}

/* ===== OPEN SET DETAIL (called from bookshelf or app.js) ===== */
export function openSetDetail(setId) {
    currentSetId = setId;
    window.currentSetId = setId;
    selectedWordId = null;
    searchQuery = '';
    navigate('set-view');
}

/* ===== BACK TO BOOKSHELF ===== */
export function backToBookshelf() {
    currentSetId = null;
    window.currentSetId = null;
    selectedWordId = null;
    navigate('bookshelf');
}

/* ===== GET WORDS FOR CURRENT SET ===== */
function getWordsForSet() {
    if (!currentSetId || currentSetId === 'all') {
        return appData.vocabulary || [];
    }
    return (appData.vocabulary || []).filter(w => w.setId === currentSetId);
}

/* ===== GET SET INFO ===== */
function getSetInfo() {
    if (!currentSetId || currentSetId === 'all') {
        return {
            id: 'all',
            name: 'Tất cả từ vựng',
            color: 'linear-gradient(135deg, #e91e8c, #ff6b9d)',
            icon: 'fas fa-layer-group'
        };
    }
    return appData.sets?.find(s => s.id === currentSetId) || null;
}

/* ===== RENDER SET VIEW ===== */
export function renderSetView() {
    // Re-sync with window.currentSetId
    if (window.currentSetId && window.currentSetId !== currentSetId) {
        currentSetId = window.currentSetId;
    }
    
    const set = getSetInfo();
    if (!set) {
        backToBookshelf();
        return;
    }

    renderSetHeader(set);
    renderWordsList();
    
    // Select first word if available
    const words = getFilteredWords();
    if (words.length > 0 && !selectedWordId) {
        selectWord(words[0].id);
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

    const words = getWordsForSet();
    const wordCount = words.length;
    const masteredCount = words.filter(w => w.mastered).length;
    
    const bgStyle = set.color?.includes('gradient') 
        ? set.color 
        : (set.color || 'var(--primary)');

    header.innerHTML = `
        <div class="set-header-left">
            <button class="btn-back" onclick="window.backToBookshelf()">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div class="set-header-info">
                <div class="set-icon" style="background: ${bgStyle}">
                    <i class="${set.icon || 'fas fa-folder'}"></i>
                </div>
                <div>
                    <h1>${escapeHtml(set.name)}</h1>
                    <p>${wordCount} từ • ${masteredCount} đã thuộc</p>
                </div>
            </div>
        </div>
        
        <div class="set-header-actions">
            <button class="btn-secondary" onclick="window.addWordToCurrentSet()">
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

/* ===== GET FILTERED WORDS ===== */
function getFilteredWords() {
    let words = getWordsForSet();
    
    // Filter by search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        words = words.filter(w => 
            w.word?.toLowerCase().includes(query) ||
            w.meanings?.[0]?.defVi?.toLowerCase().includes(query) ||
            w.meanings?.[0]?.defEn?.toLowerCase().includes(query)
        );
    }
    
    // Sort
    switch (sortBy) {
        case 'alpha':
            words.sort((a, b) => (a.word || '').localeCompare(b.word || ''));
            break;
        case 'alpha-desc':
            words.sort((a, b) => (b.word || '').localeCompare(a.word || ''));
            break;
        case 'mastered':
            words.sort((a, b) => (b.mastered ? 1 : 0) - (a.mastered ? 1 : 0));
            break;
        case 'added':
        default:
            words.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
    }
    
    return words;
}

/* ===== RENDER WORDS LIST ===== */
function renderWordsList() {
    const container = document.getElementById('words-list-container');
    if (!container) return;

    const words = getFilteredWords();

    if (words.length === 0 && !searchQuery) {
        container.innerHTML = `
            <div class="search-bar">
                <i class="fas fa-search"></i>
                <input type="text" id="word-search" placeholder="Tìm từ..." value="${searchQuery}">
            </div>
            <div class="empty-list">
                <i class="fas fa-inbox"></i>
                <p>Chưa có từ nào</p>
                <button class="btn-primary" onclick="window.addWordToCurrentSet()">
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
            ${words.length > 0 ? words.map(word => renderWordItem(word)).join('') : 
                '<p class="empty-search">Không tìm thấy từ nào</p>'}
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
    
    // Get meaning text
    const meaning = word.meanings?.[0]?.defVi || word.meanings?.[0]?.defEn || '';

    return `
        <div class="word-item ${masteredClass} ${selectedClass}" data-word-id="${word.id}">
            <div class="word-item-main">
                <span class="word-text">${escapeHtml(word.word || '')}</span>
                ${word.phonetic ? `<span class="word-phonetic">${escapeHtml(word.phonetic)}</span>` : ''}
            </div>
            <div class="word-item-sub">
                <span class="word-meaning">${escapeHtml(truncate(meaning, 50))}</span>
            </div>
            <div class="word-item-actions">
                <button class="btn-icon btn-speak" data-word="${escapeHtml(word.word || '')}" title="Phát âm">
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

/* ===== SELECT WORD ===== */
function selectWord(wordId) {
    selectedWordId = wordId;
    
    // Update list selection
    document.querySelectorAll('.word-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.wordId === wordId);
    });
    
    renderWordDetail();
}

/* ===== RENDER WORD DETAIL ===== */
function renderWordDetail() {
    const container = document.getElementById('word-detail-container');
    if (!container) return;

    const words = getWordsForSet();
    const word = words.find(w => w.id === selectedWordId);

    if (!word) {
        renderEmptyDetail();
        return;
    }
    
    // Get first meaning
    const firstMeaning = word.meanings?.[0] || {};

    container.innerHTML = `
        <div class="word-detail-card">
            <div class="word-detail-header">
                <div class="word-main">
                    <h2>${escapeHtml(word.word || '')}</h2>
                    <button class="btn-icon btn-speak-large" onclick="window.speakWord('${escapeHtml(word.word || '')}')">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                ${word.phonetic ? `<p class="word-phonetic-large">${escapeHtml(word.phonetic)}</p>` : ''}
                ${firstMeaning.pos ? `<span class="word-pos">${escapeHtml(firstMeaning.pos)}</span>` : ''}
            </div>
            
            <div class="word-detail-body">
                ${word.meanings?.map((m, i) => `
                    <div class="detail-section meaning-section">
                        <h3><i class="fas fa-book"></i> Nghĩa ${word.meanings.length > 1 ? (i + 1) : ''}</h3>
                        ${m.pos ? `<span class="pos-tag">${escapeHtml(m.pos)}</span>` : ''}
                        ${m.defVi ? `<p class="def-vi">${escapeHtml(m.defVi)}</p>` : ''}
                        ${m.defEn ? `<p class="def-en">${escapeHtml(m.defEn)}</p>` : ''}
                        ${m.example ? `
                            <div class="example-box">
                                <i class="fas fa-quote-left"></i>
                                <p>"${escapeHtml(m.example)}"</p>
                            </div>
                        ` : ''}
                    </div>
                `).join('') || '<p>Chưa có nghĩa</p>'}
                
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

/* ===== RENDER EMPTY DETAIL ===== */
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
    // Events are bound inline or in render functions
}

function bindSearchEvent() {
    const searchInput = document.getElementById('word-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderWordsList();
        });
    }
}

function bindSortEvent() {
    const sortSelect = document.getElementById('word-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            renderWordsList();
        });
    }
}

function bindWordItemEvents() {
    // Click to select word
    document.querySelectorAll('.word-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't select if clicking speak button
            if (e.target.closest('.btn-speak')) return;
            selectWord(item.dataset.wordId);
        });
    });
    
    // Speak buttons
    document.querySelectorAll('.btn-speak').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const word = btn.dataset.word;
            if (word) speak(word);
        });
    });
}

/* ===== TOGGLE MASTERED ===== */
function toggleWordMastered(wordId, mastered) {
    const word = appData.vocabulary?.find(w => w.id === wordId);
    if (word) {
        word.mastered = mastered;
        saveData(appData);
        renderWordsList();
        renderSetHeader(getSetInfo());
        showToast(mastered ? 'Đã đánh dấu thuộc' : 'Đã bỏ đánh dấu thuộc');
    }
}

export function toggleMasteredInView(wordId) {
    const word = appData.vocabulary?.find(w => w.id === wordId);
    if (word) {
        word.mastered = !word.mastered;
        saveData(appData);
        renderSetView();
    }
}

export function toggleBookmarkInView(wordId) {
    const word = appData.vocabulary?.find(w => w.id === wordId);
    if (word) {
        word.bookmarked = !word.bookmarked;
        saveData(appData);
        renderSetView();
    }
}

/* ===== VIEW MODE ===== */
function setViewMode(mode) {
    viewMode = mode;
    renderSetView();
}

/* ===== ADD WORD TO SET ===== */
function addWordToCurrentSet() {
    window.preSelectedSetId = currentSetId === 'all' ? '' : currentSetId;
    navigate('add-word');
}

/* ===== PRACTICE CURRENT SET ===== */
function practiceCurrentSet() {
    window.practiceSetId = currentSetId;
    navigate('practice');
}

/* ===== EDIT CURRENT WORD ===== */
function editCurrentWord() {
    if (!selectedWordId) return;
    window.editingWordId = selectedWordId;
    navigate('add-word');
}

/* ===== DELETE CURRENT WORD ===== */
function deleteCurrentWord() {
    if (!selectedWordId) return;
    
    const word = appData.vocabulary?.find(w => w.id === selectedWordId);
    if (!word) return;
    
    if (confirm(`Bạn có chắc muốn xóa từ "${word.word}"?`)) {
        appData.vocabulary = appData.vocabulary.filter(w => w.id !== selectedWordId);
        saveData(appData);
        
        selectedWordId = null;
        renderSetView();
        showToast('Đã xóa từ');
    }
}

/* ===== SPEAK WORD ===== */
function speakWord(word) {
    speak(word);
}

/* ===== UTILITIES ===== */
function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

/* ===== GLOBAL EXPORTS ===== */
window.openSetDetail = openSetDetail;
window.backToBookshelf = backToBookshelf;
window.setViewMode = setViewMode;
window.addWordToCurrentSet = addWordToCurrentSet;
window.practiceCurrentSet = practiceCurrentSet;
window.editCurrentWord = editCurrentWord;
window.deleteCurrentWord = deleteCurrentWord;
window.speakWord = speakWord;
window.selectWordInSet = selectWord;
window.toggleMasteredInView = toggleMasteredInView;
window.toggleBookmarkInView = toggleBookmarkInView;
window.renderSetView = renderSetView;
window.initSetView = initSetView;
