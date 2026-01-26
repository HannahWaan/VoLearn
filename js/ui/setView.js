/* ===== SET VIEW MODULE ===== */
/* VoLearn v2.1.0 - Xem bộ từ vựng */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast, showSuccess } from './toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let currentSetId = null;
let selectedWordId = null;
let viewMode = 'grid';
let eventsBound = false;

/* ===== INITIALIZATION ===== */
export function initSetView() {
    if (!eventsBound) {
        bindSetViewEvents();
        eventsBound = true;
    }
    
    currentSetId = window.currentSetViewId || null;
    
    if (currentSetId) {
        renderSetView();
    }
}

/* ===== BIND EVENTS ===== */
function bindSetViewEvents() {
    // Back button - dùng ID từ template
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-back-bookshelf')) {
            backToBookshelf();
        }
    });
    
    // Search trong set view
    document.addEventListener('input', (e) => {
        if (e.target.id === 'set-view-search-input') {
            filterWords(e.target.value);
        }
    });
    
    // Resizer cho split view
    initResizer();
}

/* ===== INIT RESIZER ===== */
function initResizer() {
    const resizer = document.getElementById('split-resizer');
    const leftPanel = document.getElementById('split-left');
    const rightPanel = document.getElementById('split-right');
    
    if (!resizer || !leftPanel || !rightPanel) return;
    
    let isResizing = false;
    
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const container = leftPanel.parentElement;
        const containerRect = container.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        if (newLeftWidth > 20 && newLeftWidth < 80) {
            leftPanel.style.width = `${newLeftWidth}%`;
            rightPanel.style.width = `${100 - newLeftWidth}%`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

/* ===== OPEN SET DETAIL ===== */
export function openSetDetail(setId) {
    window.currentSetViewId = setId;
    currentSetId = setId;
    navigate('set-view');
    
    setTimeout(() => {
        renderSetView();
    }, 50);
}

/* ===== BACK TO BOOKSHELF ===== */
export function backToBookshelf() {
    window.currentSetViewId = null;
    currentSetId = null;
    selectedWordId = null;
    navigate('bookshelf');
}

/* ===== FILTER WORDS ===== */
function filterWords(query) {
    const words = getWordsForSet(currentSetId);
    const filtered = words.filter(w => 
        w.word?.toLowerCase().includes(query.toLowerCase()) ||
        w.meanings?.[0]?.defVi?.toLowerCase().includes(query.toLowerCase())
    );
    renderWordList(filtered);
}

/* ===== GET WORDS FOR SET ===== */
function getWordsForSet(setId) {
    if (!setId || setId === 'all') {
        return appData.vocabulary || [];
    }
    return (appData.vocabulary || []).filter(word => word.setId === setId);
}

/* ===== GET SET INFO ===== */
function getSetInfo(setId) {
    if (!setId || setId === 'all') {
        return {
            id: 'all',
            name: 'Tất cả từ vựng',
            color: 'var(--primary-color)'
        };
    }
    const set = (appData.sets || []).find(s => s.id === setId);
    return set || { id: setId, name: 'Bộ từ vựng', color: 'var(--primary-color)' };
}

/* ===== RENDER SET VIEW ===== */
export function renderSetView() {
    const setInfo = getSetInfo(currentSetId);
    const words = getWordsForSet(currentSetId);
    
    // Update header - dùng ID từ template
    const setTitleEl = document.getElementById('set-view-title');
    const wordCountEl = document.getElementById('set-view-count');
    
    if (setTitleEl) {
        setTitleEl.innerHTML = `<i class="fas fa-book"></i> <span>${escapeHtml(setInfo.name)}</span>`;
    }
    if (wordCountEl) {
        wordCountEl.textContent = `${words.length} từ`;
    }
    
    // Render word list
    renderWordList(words);
    
    // Reset detail panel
    resetDetailPanel();
}

/* ===== RENDER WORD LIST ===== */
function renderWordList(words) {
    const wordListEl = document.getElementById('set-view-words');
    if (!wordListEl) return;
    
    if (words.length === 0) {
        wordListEl.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-book-open"></i>
                <p>Chưa có từ vựng nào trong bộ này</p>
                <button class="btn btn-primary" onclick="navigate('add-word')">
                    <i class="fas fa-plus"></i> Thêm từ mới
                </button>
            </div>
        `;
        return;
    }
    
    wordListEl.innerHTML = words.map(word => renderWordCard(word)).join('');
}

/* ===== RENDER WORD CARD ===== */
function renderWordCard(word) {
    const isSelected = selectedWordId === word.id;
    const isMastered = word.mastered || false;
    const isBookmarked = word.bookmarked || false;
    
    const firstMeaning = word.meanings?.[0] || {};
    const defVi = firstMeaning.defVi || firstMeaning.definition || '';
    
    return `
        <div class="word-item ${isSelected ? 'selected' : ''} ${isMastered ? 'mastered' : ''}" 
             data-word-id="${word.id}"
             onclick="window.selectWordInView('${word.id}')">
            <div class="word-item-main">
                <span class="word-text">${escapeHtml(word.word || '')}</span>
                <span class="word-phonetic">${escapeHtml(word.phonetic || '')}</span>
                <span class="word-meaning">${escapeHtml(defVi)}</span>
            </div>
            <div class="word-item-actions">
                <button class="btn-icon ${isBookmarked ? 'active' : ''}" 
                        onclick="event.stopPropagation(); window.toggleBookmarkInView('${word.id}')"
                        title="Đánh dấu">
                    <i class="fa${isBookmarked ? 's' : 'r'} fa-bookmark"></i>
                </button>
                <button class="btn-icon ${isMastered ? 'active' : ''}" 
                        onclick="event.stopPropagation(); window.toggleMasteredInView('${word.id}')"
                        title="Đã thuộc">
                    <i class="fa${isMastered ? 's' : 'r'} fa-check-circle"></i>
                </button>
            </div>
        </div>
    `;
}

/* ===== SELECT WORD ===== */
function selectWord(wordId) {
    selectedWordId = wordId;
    
    document.querySelectorAll('.word-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.wordId === wordId);
    });
    
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (word) {
        showWordDetail(word);
    }
}

/* ===== RESET DETAIL PANEL ===== */
function resetDetailPanel() {
    const detailPanel = document.getElementById('word-detail-panel');
    if (!detailPanel) return;
    
    detailPanel.innerHTML = `
        <div class="word-detail-placeholder">
            <i class="fas fa-hand-pointer"></i>
            <h3>Chọn một từ vựng</h3>
            <p>Nhấn vào từ vựng bên trái để xem chi tiết</p>
        </div>
    `;
}

/* ===== SHOW WORD DETAIL ===== */
function showWordDetail(word) {
    const detailPanel = document.getElementById('word-detail-panel');
    if (!detailPanel) return;
    
    const meanings = word.meanings || [];
    
    detailPanel.innerHTML = `
        <div class="word-detail-content">
            <div class="detail-header">
                <h2>${escapeHtml(word.word || '')}</h2>
                <span class="phonetic">${escapeHtml(word.phonetic || '')}</span>
                <button class="btn-speak" onclick="window.speakWord && window.speakWord('${escapeHtml(word.word)}', 'en-US')">
                    <i class="fas fa-volume-up"></i>
                </button>
            </div>
            
            <div class="detail-meanings">
                ${meanings.map((m, i) => `
                    <div class="meaning-item">
                        <span class="pos">${escapeHtml(m.pos || '')}</span>
                        <p class="def-en">${escapeHtml(m.defEn || m.definition || '')}</p>
                        <p class="def-vi">${escapeHtml(m.defVi || '')}</p>
                        ${m.example ? `<p class="example"><em>"${escapeHtml(m.example)}"</em></p>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="window.editWordInView('${word.id}')">
                    <i class="fas fa-edit"></i> Chỉnh sửa
                </button>
                <button class="btn btn-danger" onclick="window.deleteWordInView('${word.id}')">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
        </div>
    `;
}

/* ===== TOGGLE MASTERED ===== */
export function toggleMasteredInView(wordId) {
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (!word) return;
    
    word.mastered = !word.mastered;
    saveData(appData);
    
    showToast(word.mastered ? 'Đã đánh dấu thuộc!' : 'Đã bỏ đánh dấu thuộc', 'success');
    renderSetView();
}

/* ===== TOGGLE BOOKMARK ===== */
export function toggleBookmarkInView(wordId) {
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (!word) return;
    
    word.bookmarked = !word.bookmarked;
    saveData(appData);
    
    showToast(word.bookmarked ? 'Đã đánh dấu!' : 'Đã bỏ đánh dấu', 'success');
    renderSetView();
}

/* ===== EDIT WORD ===== */
function editWordInView(wordId) {
    window.editingWordId = wordId;
    navigate('add-word');
}

/* ===== DELETE WORD ===== */
function deleteWordInView(wordId) {
    if (!confirm('Bạn có chắc muốn xóa từ này?')) return;
    
    const index = (appData.vocabulary || []).findIndex(w => w.id === wordId);
    if (index > -1) {
        appData.vocabulary.splice(index, 1);
        saveData(appData);
        showSuccess('Đã xóa từ vựng!');
        renderSetView();
    }
}

/* ===== GLOBAL EXPORTS ===== */
window.initSetView = initSetView;
window.openSetDetail = openSetDetail;
window.backToBookshelf = backToBookshelf;
window.selectWordInView = selectWord;
window.toggleMasteredInView = toggleMasteredInView;
window.toggleBookmarkInView = toggleBookmarkInView;
window.editWordInView = editWordInView;
window.deleteWordInView = deleteWordInView;
window.renderSetView = renderSetView;
