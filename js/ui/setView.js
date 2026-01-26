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
let eventsbound = false;

/* ===== INITIALIZATION ===== */
export function initSetView() {
    // Bind events chỉ 1 lần khi app khởi động
    if (!eventsbound) {
        bindSetViewEvents();
        eventsbound = true;
    }
    
    // Lấy setId từ window (được set bởi openSetDetail)
    currentSetId = window.currentSetViewId || null;
    
    // Chỉ render nếu có setId
    if (currentSetId) {
        renderSetView();
    }
    // Không navigate về bookshelf ở đây - để router xử lý
}

/* ===== BIND EVENTS ===== */
function bindSetViewEvents() {
    // View mode toggle
    document.addEventListener('click', (e) => {
        if (e.target.closest('#view-grid-btn')) {
            setViewMode('grid');
        }
        if (e.target.closest('#view-list-btn')) {
            setViewMode('list');
        }
        if (e.target.closest('.btn-back-to-bookshelf')) {
            backToBookshelf();
        }
    });
    
    // Scale slider
    document.addEventListener('input', (e) => {
        if (e.target.id === 'word-scale-slider') {
            const scale = e.target.value;
            document.documentElement.style.setProperty('--word-card-scale', scale);
        }
    });
}

/* ===== OPEN SET DETAIL ===== */
export function openSetDetail(setId) {
    window.currentSetViewId = setId;
    currentSetId = setId;
    navigate('set-view');
    
    // Render sau khi navigate
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

/* ===== SET VIEW MODE ===== */
function setViewMode(mode) {
    viewMode = mode;
    
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');
    const wordList = document.querySelector('.word-list-grid');
    
    if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
    if (listBtn) listBtn.classList.toggle('active', mode === 'list');
    if (wordList) {
        wordList.classList.toggle('grid-view', mode === 'grid');
        wordList.classList.toggle('list-view', mode === 'list');
    }
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
    
    // Update header
    const setNameEl = document.getElementById('current-set-name');
    const wordCountEl = document.getElementById('set-word-count');
    const setColorEl = document.querySelector('.set-color-indicator');
    
    if (setNameEl) setNameEl.textContent = setInfo.name;
    if (wordCountEl) wordCountEl.textContent = `${words.length} từ`;
    if (setColorEl) setColorEl.style.backgroundColor = setInfo.color;
    
    // Render word list
    const wordListEl = document.querySelector('.word-list-grid');
    if (!wordListEl) return;
    
    if (words.length === 0) {
        wordListEl.innerHTML = `
            <div class="empty-set-message">
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
    
    // Get first meaning
    const firstMeaning = word.meanings?.[0] || {};
    const defVi = firstMeaning.defVi || firstMeaning.definition || '';
    
    return `
        <div class="word-card ${isSelected ? 'selected' : ''} ${isMastered ? 'mastered' : ''}" 
             data-word-id="${word.id}"
             onclick="window.selectWordInView && window.selectWordInView('${word.id}')">
            <div class="word-card-header">
                <span class="word-text">${escapeHtml(word.word || '')}</span>
                <div class="word-actions">
                    <button class="btn-icon ${isBookmarked ? 'active' : ''}" 
                            onclick="event.stopPropagation(); window.toggleBookmarkInView && window.toggleBookmarkInView('${word.id}')"
                            title="Đánh dấu">
                        <i class="fa${isBookmarked ? 's' : 'r'} fa-bookmark"></i>
                    </button>
                    <button class="btn-icon ${isMastered ? 'active' : ''}" 
                            onclick="event.stopPropagation(); window.toggleMasteredInView && window.toggleMasteredInView('${word.id}')"
                            title="Đã thuộc">
                        <i class="fa${isMastered ? 's' : 'r'} fa-check-circle"></i>
                    </button>
                </div>
            </div>
            <div class="word-card-phonetic">${escapeHtml(word.phonetic || '')}</div>
            <div class="word-card-meaning">${escapeHtml(defVi)}</div>
            <div class="word-card-footer">
                <button class="btn-icon btn-speak" 
                        onclick="event.stopPropagation(); window.speakWord && window.speakWord('${escapeHtml(word.word)}', 'en-US')"
                        title="Phát âm">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="btn-icon btn-edit" 
                        onclick="event.stopPropagation(); window.editWordInView && window.editWordInView('${word.id}')"
                        title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" 
                        onclick="event.stopPropagation(); window.deleteWordInView && window.deleteWordInView('${word.id}')"
                        title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/* ===== SELECT WORD ===== */
function selectWord(wordId) {
    selectedWordId = wordId;
    
    // Update UI
    document.querySelectorAll('.word-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.wordId === wordId);
    });
    
    // Show word detail
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (word) {
        showWordDetail(word);
    }
}

/* ===== SHOW WORD DETAIL ===== */
function showWordDetail(word) {
    const detailPanel = document.querySelector('.word-detail-panel');
    if (!detailPanel) return;
    
    const meanings = word.meanings || [];
    
    detailPanel.innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(word.word || '')}</h3>
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
            <button class="btn btn-edit" onclick="window.editWordInView && window.editWordInView('${word.id}')">
                <i class="fas fa-edit"></i> Chỉnh sửa
            </button>
            <button class="btn btn-delete" onclick="window.deleteWordInView && window.deleteWordInView('${word.id}')">
                <i class="fas fa-trash"></i> Xóa
            </button>
        </div>
    `;
    
    detailPanel.classList.add('active');
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


