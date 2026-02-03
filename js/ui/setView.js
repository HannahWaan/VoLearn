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
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-back-bookshelf')) {
            backToBookshelf();
        }
    });
    
    document.addEventListener('input', (e) => {
        if (e.target.id === 'set-view-search-input') {
            filterWords(e.target.value);
        }
    });
    
    initResizer();
}

/* ===== INIT RESIZER ===== */
function initResizer() {
    let isResizing = false;
    
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('#split-resizer')) {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const container = document.querySelector('.split-view-container');
        const leftPanel = document.getElementById('split-left');
        if (!container || !leftPanel) return;
        
        const containerRect = container.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        if (newLeftWidth > 20 && newLeftWidth < 60) {
            leftPanel.style.width = `${newLeftWidth}%`;
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
    setTimeout(() => renderSetView(), 50);
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
        return { id: 'all', name: 'Tất cả từ vựng', color: 'var(--primary-color)' };
    }
    const set = (appData.sets || []).find(s => s.id === setId);
    return set || { id: setId, name: 'Bộ từ vựng', color: 'var(--primary-color)' };
}

/* ===== RENDER SET VIEW ===== */
export function renderSetView() {
    const setInfo = getSetInfo(currentSetId);
    const words = getWordsForSet(currentSetId);
    
    const setTitleEl = document.getElementById('set-view-title');
    const wordCountEl = document.getElementById('set-view-count');
    
    if (setTitleEl) {
        setTitleEl.innerHTML = `<i class="fas fa-book"></i> <span>${escapeHtml(setInfo.name)}</span>`;
    }
    if (wordCountEl) {
        wordCountEl.textContent = `${words.length} từ`;
    }
    
    renderWordList(words);
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
                <button class="btn-add-word" onclick="navigate('add-word')">
                    <i class="fas fa-plus"></i>
                    <span>Thêm từ mới</span>
                </button>
            </div>
        `;
        return;
    }
    
    wordListEl.innerHTML = words.map(word => {
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
                <div class="word-item-status">
                    ${isBookmarked ? '<i class="fas fa-bookmark text-warning"></i>' : ''}
                    ${isMastered ? '<i class="fas fa-check-circle text-success"></i>' : ''}
                </div>
            </div>
        `;
    }).join('');
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
    const isMastered = word.mastered || false;
    const isBookmarked = word.bookmarked || false;
    
    // Get phonetics
    const phoneticUS = word.phoneticUS || word.phonetic || '';
    const phoneticUK = word.phoneticUK || word.phonetic || '';
    
    detailPanel.innerHTML = `
        <div class="word-detail-content">
            <!-- Header: Từ vựng + nút Edit/Delete bên phải -->
            <div class="detail-top-header">
                <div class="detail-word-info">
                    <h2 class="detail-word">${escapeHtml(word.word || '')}</h2>
                </div>
                <div class="detail-top-actions">
                    <button class="btn-icon-sm ${isBookmarked ? 'active' : ''}" 
                            onclick="window.toggleBookmarkInView('${word.id}')" title="Đánh dấu">
                        <i class="fa${isBookmarked ? 's' : 'r'} fa-bookmark"></i>
                    </button>
                    <button class="btn-icon-sm ${isMastered ? 'active mastered' : ''}" 
                            onclick="window.toggleMasteredInView('${word.id}')" title="Đã thuộc">
                        <i class="fa${isMastered ? 's' : 'r'} fa-check-circle"></i>
                    </button>
                    <button class="btn-icon-sm edit" onclick="window.editWordInView('${word.id}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-sm delete" onclick="window.deleteWordInView('${word.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <!-- Phonetics với 2 nút loa US/UK -->
            <div class="detail-phonetics">
                <div class="phonetic-item">
                    <span class="phonetic-label">US</span>
                    <span class="phonetic-text">${escapeHtml(phoneticUS)}</span>
                    <button class="btn-speak-sm" onclick="window.speakWord && window.speakWord('${escapeHtml(word.word)}', 'en-US')" title="Phát âm US">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="phonetic-item">
                    <span class="phonetic-label">UK</span>
                    <span class="phonetic-text">${escapeHtml(phoneticUK)}</span>
                    <button class="btn-speak-sm" onclick="window.speakWord && window.speakWord('${escapeHtml(word.word)}', 'en-GB')" title="Phát âm UK">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
            
            <!-- Word Formation nếu có -->
            ${word.formation ? `
                <div class="detail-formation">
                    <span class="formation-label">Word Formation:</span>
                    <span class="formation-text">${escapeHtml(word.formation)}</span>
                </div>
            ` : ''}
            
            <!-- Meanings -->
            <div class="detail-meanings-list">
                ${meanings.map((m, i) => `
                    <div class="detail-meaning-block">
                        <div class="meaning-header-row">
                            <span class="meaning-number">Nghĩa ${i + 1}</span>
                            ${m.pos ? `<span class="meaning-pos">${escapeHtml(m.pos)}</span>` : ''}
                        </div>
                        
                        ${m.defVi ? `
                            <div class="meaning-row">
                                <span class="meaning-label">Tiếng Việt:</span>
                                <p class="meaning-text-vi">${escapeHtml(m.defVi)}</p>
                            </div>
                        ` : ''}
                        
                        ${m.defEn || m.definition ? `
                            <div class="meaning-row">
                                <span class="meaning-label">English:</span>
                                <p class="meaning-text-en">${escapeHtml(m.defEn || m.definition || '')}</p>
                            </div>
                        ` : ''}
                        
                        ${m.example ? `
                            <div class="meaning-row example-row">
                                <span class="meaning-label">Ví dụ:</span>
                                <p class="meaning-example">"${escapeHtml(m.example)}"</p>
                            </div>
                        ` : ''}
                        
                        ${m.exampleVi ? `
                            <div class="meaning-row">
                                <span class="meaning-label">Dịch:</span>
                                <p class="meaning-example-vi">${escapeHtml(m.exampleVi)}</p>
                            </div>
                        ` : ''}
                        
                        ${m.synonyms ? `
                            <div class="meaning-row">
                                <span class="meaning-label">Đồng nghĩa:</span>
                                <p class="meaning-synonyms">${escapeHtml(m.synonyms)}</p>
                            </div>
                        ` : ''}
                        
                        ${m.antonyms ? `
                            <div class="meaning-row">
                                <span class="meaning-label">Trái nghĩa:</span>
                                <p class="meaning-antonyms">${escapeHtml(m.antonyms)}</p>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <!-- Notes nếu có -->
            ${word.notes ? `
                <div class="detail-notes">
                    <span class="notes-label">Ghi chú:</span>
                    <p class="notes-text">${escapeHtml(word.notes)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

/* ===== TOGGLE MASTERED - Không re-render toàn bộ ===== */
export function toggleMasteredInView(wordId) {
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (!word) return;
    
    word.mastered = !word.mastered;
    saveData(appData);
    
    showToast(word.mastered ? 'Đã đánh dấu thuộc!' : 'Đã bỏ đánh dấu thuộc', 'success');
    
    // Chỉ update UI, không reset detail panel
    updateWordItemUI(wordId);
    showWordDetail(word);
}

/* ===== TOGGLE BOOKMARK - Không re-render toàn bộ ===== */
export function toggleBookmarkInView(wordId) {
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (!word) return;
    
    word.bookmarked = !word.bookmarked;
    saveData(appData);
    
    showToast(word.bookmarked ? 'Đã đánh dấu!' : 'Đã bỏ đánh dấu', 'success');
    
    // Chỉ update UI, không reset detail panel
    updateWordItemUI(wordId);
    showWordDetail(word);
}

/* ===== UPDATE WORD ITEM UI ===== */
function updateWordItemUI(wordId) {
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (!word) return;
    
    const item = document.querySelector(`.word-item[data-word-id="${wordId}"]`);
    if (!item) return;
    
    item.classList.toggle('mastered', word.mastered);
    
    const statusEl = item.querySelector('.word-item-status');
    if (statusEl) {
        statusEl.innerHTML = `
            ${word.bookmarked ? '<i class="fas fa-bookmark text-warning"></i>' : ''}
            ${word.mastered ? '<i class="fas fa-check-circle text-success"></i>' : ''}
        `;
    }
}

/* ===== EDIT WORD ===== */
function editWordInView(wordId) {
    // Lưu ID từ cần edit
    window.editingWordId = wordId;
    
    // Navigate đến trang add-word (section ID là 'add-section')
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const addSection = document.getElementById('add-section');
    if (addSection) {
        addSection.classList.add('active');
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === 'add-word') {
            item.classList.add('active');
        }
    });
    
    // Load từ vựng vào form để edit
    setTimeout(() => {
        if (window.loadWordForEdit) {
            window.loadWordForEdit(wordId);
        }
    }, 100);
}

/* ===== DELETE WORD ===== */
function deleteWordInView(wordId) {
    const word = (appData.vocabulary || []).find(w => w.id === wordId);
    if (!word) return;
    
    window.showConfirm({
        title: 'Xóa từ vựng',
        message: `Bạn có chắc muốn xóa từ "${word.word}"?`,
        submessage: 'Hành động này không thể hoàn tác.',
        type: 'danger',
        confirmText: 'Xóa',
        icon: 'fas fa-trash',
        onConfirm: () => {
            const index = (appData.vocabulary || []).findIndex(w => w.id === wordId);
            if (index > -1) {
                appData.vocabulary.splice(index, 1);
                saveData(appData);
                showSuccess('Đã xóa từ vựng!');
                selectedWordId = null;
                renderSetView();
            }
        }
    });
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




