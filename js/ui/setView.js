/* ===== SET VIEW MODULE ===== */
/* VoLearn v2.1.0 - Split view chi tiết bộ từ */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';
import { navigate } from '../core/router.js';
import { speak } from '../utils/speech.js';
import { escapeHtml } from '../utils/helpers.js';

/* ===== STATE - Giống code cũ ===== */
let currentSetViewId = null;
let currentSetWords = [];
let selectedWordId = null;

/* ===== INIT ===== */
export function initSetView() {
    // Lấy setId từ window (được set bởi bookshelf)
    currentSetViewId = window.currentSetViewId || null;
    
    if (!currentSetViewId) {
        console.log('No set ID, returning to bookshelf');
        navigate('bookshelf');
        return;
    }
    
    console.log('✅ InitSetView for:', currentSetViewId);
    
    selectedWordId = null;
    loadSetWords();
    renderSetView();
    bindSetViewEvents();
}

/* ===== LOAD SET WORDS ===== */
function loadSetWords() {
    if (currentSetViewId === 'all') {
        currentSetWords = appData.vocabulary || [];
    } else {
        currentSetWords = (appData.vocabulary || []).filter(w => w.setId === currentSetViewId);
    }
}

/* ===== GET SET INFO ===== */
function getSetInfo() {
    if (currentSetViewId === 'all') {
        return { id: 'all', name: 'Tất cả từ vựng', color: 'var(--gradient-primary)' };
    }
    return appData.sets?.find(s => s.id === currentSetViewId) || null;
}

/* ===== RENDER SET VIEW - Giống code cũ ===== */
export function renderSetView() {
    const set = getSetInfo();
    if (!set) {
        navigate('bookshelf');
        return;
    }
    
    renderSetViewHeader(set);
    renderSetViewWords();
    
    if (currentSetWords.length > 0 && !selectedWordId) {
        selectWord(currentSetWords[0].id);
    } else if (selectedWordId) {
        renderWordDetail();
    } else {
        renderEmptyDetail();
    }
}

/* ===== RENDER HEADER ===== */
function renderSetViewHeader(set) {
    const header = document.querySelector('.set-view-header');
    if (!header) return;
    
    const wordCount = currentSetWords.length;
    const masteredCount = currentSetWords.filter(w => w.mastered).length;
    
    header.innerHTML = `
        <button class="btn-back-set" onclick="window.backToBookshelf()">
            <i class="fas fa-arrow-left"></i> Quay lại
        </button>
        <h2 class="set-view-title">
            <i class="fas fa-folder" style="color: ${set.color || 'var(--primary-color)'}"></i>
            ${escapeHtml(set.name)}
        </h2>
        <span class="set-view-count">${wordCount} từ • ${masteredCount} đã thuộc</span>
    `;
}

/* ===== RENDER WORDS LIST ===== */
function renderSetViewWords() {
    const container = document.querySelector('.set-view-words');
    if (!container) return;
    
    if (currentSetWords.length === 0) {
        container.innerHTML = `
            <div class="set-view-empty">
                <i class="fas fa-inbox"></i>
                <h3>Chưa có từ nào</h3>
                <p>Thêm từ vựng để bắt đầu học</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    currentSetWords.forEach(word => {
        const isActive = word.id === selectedWordId;
        const meaning = word.meanings?.[0]?.defVi || word.meanings?.[0]?.defEn || '';
        
        html += `
            <div class="set-word-card ${isActive ? 'active' : ''} ${word.mastered ? 'mastered' : ''}" 
                 data-word-id="${word.id}" onclick="window.selectWordInView('${word.id}')">
                <div class="set-word-main">
                    <div class="set-word-text">${escapeHtml(word.word || '')}</div>
                    <div class="set-word-brief">${escapeHtml(truncate(meaning, 40))}</div>
                </div>
                <div class="set-word-status">
                    ${word.mastered ? '<span class="status-icon mastered"><i class="fas fa-check"></i></span>' : ''}
                    ${word.bookmarked ? '<span class="status-icon bookmarked"><i class="fas fa-star"></i></span>' : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/* ===== SELECT WORD ===== */
function selectWord(wordId) {
    selectedWordId = wordId;
    
    document.querySelectorAll('.set-word-card').forEach(card => {
        card.classList.toggle('active', card.dataset.wordId === wordId);
    });
    
    renderWordDetail();
}

/* ===== RENDER WORD DETAIL - Giống code cũ ===== */
function renderWordDetail() {
    const container = document.querySelector('.word-detail-panel');
    if (!container) return;
    
    const word = currentSetWords.find(w => w.id === selectedWordId);
    if (!word) {
        renderEmptyDetail();
        return;
    }
    
    const firstMeaning = word.meanings?.[0] || {};
    
    // Build phonetics HTML
    let phoneticsHtml = '';
    if (firstMeaning.phoneticUS || firstMeaning.phoneticUK || word.phonetic) {
        const us = firstMeaning.phoneticUS || word.phonetic || '';
        const uk = firstMeaning.phoneticUK || word.phonetic || '';
        
        phoneticsHtml = `
            <div class="word-detail-phonetics">
                ${us ? `
                    <span class="phonetic-badge">
                        <span class="flag">🇺🇸</span>
                        <span class="ipa">${escapeHtml(us)}</span>
                        <button class="btn-speak-small" onclick="window.speakWithAccent('${escapeHtml(word.word)}', 'en-US')">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </span>
                ` : ''}
                ${uk && uk !== us ? `
                    <span class="phonetic-badge">
                        <span class="flag">🇬🇧</span>
                        <span class="ipa">${escapeHtml(uk)}</span>
                        <button class="btn-speak-small" onclick="window.speakWithAccent('${escapeHtml(word.word)}', 'en-GB')">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </span>
                ` : ''}
            </div>
        `;
    }
    
    // Build meanings HTML
    let meaningsHtml = '';
    (word.meanings || []).forEach((m, i) => {
        meaningsHtml += `
            <div class="detail-meaning-block">
                <div class="detail-meaning-header">
                    ${m.pos ? `<span class="detail-pos-badge">${escapeHtml(m.pos)}</span>` : ''}
                </div>
                ${m.defVi ? `<div class="detail-def-vi">${escapeHtml(m.defVi)}</div>` : ''}
                ${m.defEn ? `<div class="detail-def-en">${escapeHtml(m.defEn)}</div>` : ''}
                ${m.example ? `
                    <div class="detail-example-box">
                        <p>"${escapeHtml(m.example)}"</p>
                    </div>
                ` : ''}
                ${(m.synonyms || m.antonyms) ? `
                    <div class="detail-extra-info">
                        ${m.synonyms ? `<div class="detail-extra-item"><strong>Đồng nghĩa:</strong> ${escapeHtml(m.synonyms)}</div>` : ''}
                        ${m.antonyms ? `<div class="detail-extra-item"><strong>Trái nghĩa:</strong> ${escapeHtml(m.antonyms)}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = `
        <div class="word-detail-content">
            <div class="word-detail-top">
                <div class="word-detail-title">
                    <h2>${escapeHtml(word.word || '')}</h2>
                    ${phoneticsHtml}
                </div>
                <div class="word-detail-actions">
                    <button class="btn-action mastered-btn ${word.mastered ? 'active' : ''}" 
                            onclick="window.toggleMasteredInView('${word.id}')" title="Đã thuộc">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="btn-action bookmark-btn ${word.bookmarked ? 'active' : ''}" 
                            onclick="window.toggleBookmarkInView('${word.id}')" title="Đánh dấu">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn-action edit-btn" onclick="window.editWordInView('${word.id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete-btn" onclick="window.deleteWordInView('${word.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            ${word.wordFormation ? `
                <div class="detail-word-formation">
                    <strong>Word forms:</strong> ${escapeHtml(word.wordFormation)}
                </div>
            ` : ''}
            
            ${meaningsHtml || '<p>Chưa có nghĩa</p>'}
            
            <div class="detail-srs-box">
                <div class="srs-stat">
                    <div class="srs-stat-value">${word.srsLevel || 0}</div>
                    <div class="srs-stat-label">SRS Level</div>
                </div>
                <div class="srs-stat">
                    <div class="srs-stat-value">${word.reviewCount || 0}</div>
                    <div class="srs-stat-label">Đã ôn</div>
                </div>
            </div>
        </div>
    `;
}

/* ===== RENDER EMPTY DETAIL ===== */
function renderEmptyDetail() {
    const container = document.querySelector('.word-detail-panel');
    if (!container) return;
    
    container.innerHTML = `
        <div class="word-detail-placeholder">
            <i class="fas fa-hand-pointer"></i>
            <h3>Chọn một từ</h3>
            <p>Chọn từ bên trái để xem chi tiết</p>
        </div>
    `;
}

/* ===== BIND EVENTS ===== */
function bindSetViewEvents() {
    // Search
    const searchInput = document.querySelector('.set-view-search input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.set-word-card').forEach(card => {
                const wordId = card.dataset.wordId;
                const word = currentSetWords.find(w => w.id === wordId);
                if (word) {
                    const match = word.word?.toLowerCase().includes(query) ||
                                  word.meanings?.[0]?.defVi?.toLowerCase().includes(query);
                    card.style.display = match ? '' : 'none';
                }
            });
        });
    }
}

/* ===== BACK TO BOOKSHELF ===== */
function backToBookshelf() {
    currentSetViewId = null;
    window.currentSetViewId = null;
    selectedWordId = null;
    navigate('bookshelf');
}

/* ===== TOGGLE MASTERED ===== */
function toggleMasteredInView(wordId) {
    const word = appData.vocabulary?.find(w => w.id === wordId);
    if (word) {
        word.mastered = !word.mastered;
        saveData(appData);
        loadSetWords();
        renderSetView();
        showToast(word.mastered ? 'Đã đánh dấu thuộc' : 'Đã bỏ đánh dấu');
    }
}

/* ===== TOGGLE BOOKMARK ===== */
function toggleBookmarkInView(wordId) {
    const word = appData.vocabulary?.find(w => w.id === wordId);
    if (word) {
        word.bookmarked = !word.bookmarked;
        saveData(appData);
        loadSetWords();
        renderSetView();
    }
}

/* ===== EDIT WORD ===== */
function editWordInView(wordId) {
    window.editingWordId = wordId;
    navigate('add-word');
}

/* ===== DELETE WORD ===== */
function deleteWordInView(wordId) {
    const word = appData.vocabulary?.find(w => w.id === wordId);
    if (!word) return;
    
    if (confirm(`Bạn có chắc muốn xóa từ "${word.word}"?`)) {
        appData.vocabulary = appData.vocabulary.filter(w => w.id !== wordId);
        saveData(appData);
        
        if (selectedWordId === wordId) {
            selectedWordId = null;
        }
        
        loadSetWords();
        renderSetView();
        showToast('Đã xóa từ');
    }
}

/* ===== UTILITIES ===== */
function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

/* ===== GLOBAL EXPORTS ===== */
window.initSetView = initSetView;
window.backToBookshelf = backToBookshelf;
window.selectWordInView = selectWord;
window.toggleMasteredInView = toggleMasteredInView;
window.toggleBookmarkInView = toggleBookmarkInView;
window.editWordInView = editWordInView;
window.deleteWordInView = deleteWordInView;
window.renderSetView = renderSetView;

export { initSetView, renderSetView, toggleMasteredInView, toggleBookmarkInView };
