/* ===== WORD DETAIL MODULE ===== */
/* VoLearn v2.1.0 - Modal chi tiết từ vựng */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { pushUndoState } from '../core/undo.js';
import { showToast } from './toast.js';
import { speak } from '../utils/speech.js';

/* ===== STATE ===== */
let currentWord = null;
let currentSetId = null;

/* ===== OPEN MODAL ===== */
export function openWordDetail(wordId, setId = null) {
    currentSetId = setId;
    
    // Find word
    let word = null;
    
    if (setId) {
        const set = appData.sets?.find(s => s.id === setId);
        word = set?.words?.find(w => w.id === wordId);
    } else {
        // Search in vocabulary
        word = appData.vocabulary?.find(w => w.id === wordId);
        
        // Search in all sets if not found
        if (!word) {
            for (const set of (appData.sets || [])) {
                word = set.words?.find(w => w.id === wordId);
                if (word) {
                    currentSetId = set.id;
                    break;
                }
            }
        }
    }

    if (!word) {
        showToast('Không tìm thấy từ', 'error');
        return;
    }

    currentWord = word;
    renderWordDetailModal(word);
}

/* ===== RENDER MODAL ===== */
function renderWordDetailModal(word) {
    const modal = document.getElementById('word-detail-modal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content') || modal;
    
    content.innerHTML = `
        <div class="modal-header">
            <div class="word-header-main">
                <h2 class="word-title">${escapeHtml(word.word)}</h2>
                <button class="btn-speak-large" onclick="window.speakCurrentWord()">
                    <i class="fas fa-volume-up"></i>
                </button>
            </div>
            <button class="btn-close" onclick="window.closeWordDetail()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-body">
            <!-- Phonetic & Part of Speech -->
            <div class="word-meta">
                ${word.phonetic ? `
                    <span class="phonetic">${escapeHtml(word.phonetic)}</span>
                ` : ''}
                ${word.partOfSpeech ? `
                    <span class="part-of-speech">${escapeHtml(word.partOfSpeech)}</span>
                ` : ''}
            </div>
            
            <!-- Meaning -->
            <div class="detail-block">
                <h3><i class="fas fa-book-open"></i> Nghĩa</h3>
                <p class="meaning-text">${escapeHtml(word.meaning)}</p>
            </div>
            
            <!-- Example -->
            ${word.example ? `
                <div class="detail-block">
                    <h3><i class="fas fa-quote-left"></i> Ví dụ</h3>
                    <p class="example-text">"${escapeHtml(word.example)}"</p>
                    ${word.exampleTranslation ? `
                        <p class="example-translation">${escapeHtml(word.exampleTranslation)}</p>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Synonyms -->
            ${word.synonyms?.length ? `
                <div class="detail-block">
                    <h3><i class="fas fa-equals"></i> Từ đồng nghĩa</h3>
                    <div class="tags-list">
                        ${word.synonyms.map(s => `
                            <span class="tag tag-synonym" onclick="window.searchWord('${escapeHtml(s)}')">${escapeHtml(s)}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Antonyms -->
            ${word.antonyms?.length ? `
                <div class="detail-block">
                    <h3><i class="fas fa-not-equal"></i> Từ trái nghĩa</h3>
                    <div class="tags-list">
                        ${word.antonyms.map(a => `
                            <span class="tag tag-antonym" onclick="window.searchWord('${escapeHtml(a)}')">${escapeHtml(a)}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Word Family -->
            ${word.wordFamily?.length ? `
                <div class="detail-block">
                    <h3><i class="fas fa-sitemap"></i> Họ từ</h3>
                    <div class="tags-list">
                        ${word.wordFamily.map(w => `
                            <span class="tag tag-family">${escapeHtml(w)}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Collocations -->
            ${word.collocations?.length ? `
                <div class="detail-block">
                    <h3><i class="fas fa-link"></i> Cụm từ thường gặp</h3>
                    <ul class="collocation-list">
                        ${word.collocations.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <!-- Note -->
            ${word.note ? `
                <div class="detail-block">
                    <h3><i class="fas fa-sticky-note"></i> Ghi chú</h3>
                    <p class="note-text">${escapeHtml(word.note)}</p>
                </div>
            ` : ''}
            
            <!-- Images -->
            ${word.images?.length ? `
                <div class="detail-block">
                    <h3><i class="fas fa-images"></i> Hình ảnh</h3>
                    <div class="image-gallery">
                        ${word.images.map(img => `
                            <img src="${escapeHtml(img)}" alt="${escapeHtml(word.word)}" 
                                 onclick="window.openImageFullscreen('${escapeHtml(img)}')" />
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Meta info -->
            <div class="word-meta-info">
                ${word.addedAt ? `
                    <span><i class="fas fa-calendar-plus"></i> Thêm: ${formatDateTime(word.addedAt)}</span>
                ` : ''}
                ${word.lastReviewed ? `
                    <span><i class="fas fa-history"></i> Ôn: ${formatDateTime(word.lastReviewed)}</span>
                ` : ''}
                ${word.reviewCount ? `
                    <span><i class="fas fa-redo"></i> Số lần ôn: ${word.reviewCount}</span>
                ` : ''}
            </div>
        </div>
        
        <div class="modal-footer">
            <div class="footer-left">
                <label class="checkbox-label">
                    <input type="checkbox" id="modal-word-mastered" ${word.mastered ? 'checked' : ''}>
                    <span>Đã thuộc</span>
                </label>
            </div>
            <div class="footer-right">
                <button class="btn-secondary" onclick="window.editWord('${word.id}')">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn-danger" onclick="window.deleteWordFromModal('${word.id}')">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
        </div>
    `;

    // Bind mastered checkbox
    const masteredCheckbox = document.getElementById('modal-word-mastered');
    if (masteredCheckbox) {
        masteredCheckbox.addEventListener('change', (e) => {
            toggleMastered(word.id, e.target.checked);
        });
    }

    modal.classList.add('show');
}

/* ===== CLOSE MODAL ===== */
export function closeWordDetail() {
    const modal = document.getElementById('word-detail-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    currentWord = null;
    currentSetId = null;
}

/* ===== ACTIONS ===== */
export function speakCurrentWord() {
    if (currentWord) {
        speak(currentWord.word);
    }
}

export function toggleMastered(wordId, mastered) {
    pushUndoState();

    // Update in set
    if (currentSetId) {
        const set = appData.sets?.find(s => s.id === currentSetId);
        const word = set?.words?.find(w => w.id === wordId);
        if (word) word.mastered = mastered;
    }

    // Update in vocabulary
    const vocabWord = appData.vocabulary?.find(w => w.id === wordId);
    if (vocabWord) vocabWord.mastered = mastered;

    saveData(appData);
    showToast(mastered ? 'Đã đánh dấu thuộc' : 'Đã bỏ đánh dấu', 'success');
}

export function editWord(wordId) {
    closeWordDetail();
    window.editWordId = wordId;
    window.targetSetId = currentSetId;
    window.navigate?.('add-word');
}

export function deleteWordFromModal(wordId) {
    if (!currentWord) return;

    if (!confirm(`Bạn có chắc muốn xóa từ "${currentWord.word}"?`)) return;

    pushUndoState();

    // Remove from set
    if (currentSetId) {
        const set = appData.sets?.find(s => s.id === currentSetId);
        if (set?.words) {
            const index = set.words.findIndex(w => w.id === wordId);
            if (index !== -1) set.words.splice(index, 1);
        }
    }

    // Remove from vocabulary
    if (appData.vocabulary) {
        const index = appData.vocabulary.findIndex(w => w.id === wordId);
        if (index !== -1) appData.vocabulary.splice(index, 1);
    }

    saveData(appData);
    closeWordDetail();
    showToast('Đã xóa từ', 'success');

    // Refresh UI
    if (typeof window.renderShelves === 'function') window.renderShelves();
    if (typeof window.renderSetView === 'function') window.renderSetView();
}

export function searchWord(word) {
    closeWordDetail();
    // Trigger search or navigate to add-word with pre-filled
    window.searchTerm = word;
    window.navigate?.('add-word');
}

export function openImageFullscreen(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-fullscreen-overlay';
    overlay.innerHTML = `
        <img src="${src}" alt="Fullscreen image" />
        <button class="btn-close-fullscreen" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    document.body.appendChild(overlay);
}

/* ===== UTILITIES ===== */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/* ===== EXPORTS ===== */
window.openWordDetail = openWordDetail;
window.closeWordDetail = closeWordDetail;
window.speakCurrentWord = speakCurrentWord;
window.editWord = editWord;
window.deleteWordFromModal = deleteWordFromModal;
window.searchWord = searchWord;
window.openImageFullscreen = openImageFullscreen;
