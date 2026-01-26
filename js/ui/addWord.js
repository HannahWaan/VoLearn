/* ========================================
   VoLearn - Add Word UI Module
   ======================================== */

import { appData, addWord, addSet, getSetById } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { pushUndo } from '../core/undo.js';
import { generateId, isEmpty, parseList, escapeHtml } from '../utils/helpers.js';

let meaningCount = 1;

/**
 * Khởi tạo Add Word UI
 */
export function initAddWord() {
    bindAddWordEvents();
    renderSetOptions();
    
    // Listen for set changes
    window.addEventListener('volearn:dataChanged', renderSetOptions);
}

/**
 * Bind events cho Add Word form
 */
function bindAddWordEvents() {
    // Save word button
    const saveBtn = document.getElementById('btn-save-word');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveWord);
    }
    
    // Add meaning button
    const addMeaningBtn = document.getElementById('btn-add-meaning');
    if (addMeaningBtn) {
        addMeaningBtn.addEventListener('click', addMeaningBlock);
    }
    
    // Clear form button
    const clearBtn = document.getElementById('btn-clear-form');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }
    
    // Word input - suggestions
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
        wordInput.addEventListener('input', debounce(handleWordInput, 300));
    }
    
    // Delegate events for dynamic elements
    document.addEventListener('click', (e) => {
        // Remove meaning block
        if (e.target.closest('.btn-remove-meaning')) {
            const block = e.target.closest('.meaning-block');
            if (block && document.querySelectorAll('.meaning-block').length > 1) {
                block.remove();
                reindexMeaningBlocks();
            }
        }
        
        // Clear meaning block
        if (e.target.closest('.btn-clear-meaning')) {
            const block = e.target.closest('.meaning-block');
            if (block) {
                clearMeaningBlock(block);
            }
        }
    });
}

/**
 * Handle save word
 */
function handleSaveWord() {
    const wordInput = document.getElementById('word-input');
    const word = wordInput?.value.trim();
    
    if (isEmpty(word)) {
        showToast('Vui lòng nhập từ vựng!', 'error');
        wordInput?.focus();
        return;
    }
    
    // Check duplicate
    const exists = appData.vocabulary.find(w => 
        w.word.toLowerCase() === word.toLowerCase()
    );
    
    if (exists) {
        if (!confirm(`Từ "${word}" đã tồn tại. Bạn có muốn thêm anyway?`)) {
            return;
        }
    }
    
    // Collect meanings
    const meanings = collectMeanings();
    
    if (meanings.length === 0) {
        showToast('Vui lòng nhập ít nhất một nghĩa!', 'error');
        return;
    }
    
    // Get set
    const setSelect = document.getElementById('set-select');
    const setId = setSelect?.value || null;
    
    // Get word formation
    const wordFormation = document.getElementById('word-formation-global')?.value.trim() || '';
    
    // Create word object
    const newWord = {
        id: generateId(),
        word: word,
        wordFormation: wordFormation,
        setId: setId,
        meanings: meanings,
        createdAt: new Date().toISOString(),
        mastered: false,
        bookmarked: false,
        srsLevel: 0,
        nextReview: null
    };
    
    // Add word
    addWord(newWord);
    
    // Push undo
    pushUndo({
        type: 'addWord',
        data: newWord,
        undo: () => {
            const idx = appData.vocabulary.findIndex(w => w.id === newWord.id);
            if (idx !== -1) appData.vocabulary.splice(idx, 1);
        },
        redo: () => {
            addWord(newWord);
        }
    });
    
    // Save
    saveData();
    
    // Clear form
    clearForm();
    
    // Notify
    showToast(`Đã thêm từ "${word}"`, 'success');
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('volearn:wordAdded', { detail: newWord }));
}

/**
 * Collect meanings from form
 */
function collectMeanings() {
    const meanings = [];
    
    document.querySelectorAll('.meaning-block').forEach(block => {
        const meaning = {
            phoneticUS: block.querySelector('.phonetic-us')?.value.trim() || '',
            phoneticUK: block.querySelector('.phonetic-uk')?.value.trim() || '',
            pos: block.querySelector('.pos-select')?.value || '',
            defEn: block.querySelector('.def-en')?.value.trim() || '',
            defVi: block.querySelector('.def-vi')?.value.trim() || '',
            example: block.querySelector('.example-input')?.value.trim() || '',
            synonyms: block.querySelector('.synonyms-input')?.value.trim() || '',
            antonyms: block.querySelector('.antonyms-input')?.value.trim() || ''
        };
        
        // Chỉ add nếu có ít nhất defVi hoặc defEn
        if (!isEmpty(meaning.defVi) || !isEmpty(meaning.defEn)) {
            meanings.push(meaning);
        }
    });
    
    return meanings;
}

/**
 * Add new meaning block
 */
function addMeaningBlock() {
    meaningCount++;
    
    const container = document.getElementById('meanings-container');
    if (!container) return;
    
    const template = document.querySelector('.meaning-block');
    if (!template) return;
    
    const newBlock = template.cloneNode(true);
    newBlock.dataset.index = meaningCount - 1;
    
    // Update title
    const title = newBlock.querySelector('.meaning-title');
    if (title) title.textContent = `Nghĩa ${meaningCount}`;
    
    // Clear values
    clearMeaningBlock(newBlock);
    
    container.appendChild(newBlock);
    
    // Scroll to new block
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Clear a meaning block
 */
function clearMeaningBlock(block) {
    block.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else {
            el.value = '';
        }
    });
}

/**
 * Reindex meaning blocks after removal
 */
function reindexMeaningBlocks() {
    document.querySelectorAll('.meaning-block').forEach((block, index) => {
        block.dataset.index = index;
        const title = block.querySelector('.meaning-title');
        if (title) title.textContent = `Nghĩa ${index + 1}`;
    });
    meaningCount = document.querySelectorAll('.meaning-block').length;
}

/**
 * Clear entire form
 */
function clearForm() {
    // Clear word input
    const wordInput = document.getElementById('word-input');
    if (wordInput) wordInput.value = '';
    
    // Clear word formation
    const wordFormation = document.getElementById('word-formation-global');
    if (wordFormation) wordFormation.value = '';
    
    // Reset set select
    const setSelect = document.getElementById('set-select');
    if (setSelect) setSelect.selectedIndex = 0;
    
    // Remove extra meaning blocks
    const blocks = document.querySelectorAll('.meaning-block');
    blocks.forEach((block, index) => {
        if (index === 0) {
            clearMeaningBlock(block);
        } else {
            block.remove();
        }
    });
    
    meaningCount = 1;
    
    // Hide suggestions
    const suggestions = document.getElementById('word-suggestions');
    if (suggestions) suggestions.style.display = 'none';
    
    // Focus word input
    wordInput?.focus();
}

/**
 * Render set options in dropdown
 */
function renderSetOptions() {
    const select = document.getElementById('set-select');
    if (!select) return;
    
    const sets = appData.sets || [];
    
    select.innerHTML = '<option value="">-- Chọn bộ từ --</option>' +
        sets.map(set => `<option value="${set.id}">${escapeHtml(set.name)}</option>`).join('');
}

/**
 * Handle word input for suggestions
 */
function handleWordInput(e) {
    const value = e.target.value.trim();
    const suggestionsEl = document.getElementById('word-suggestions');
    
    if (!suggestionsEl) return;
    
    if (value.length < 2) {
        suggestionsEl.style.display = 'none';
        return;
    }
    
    // TODO: Implement dictionary API lookup
    // For now, just hide suggestions
    suggestionsEl.style.display = 'none';
}

/**
 * Simple debounce
 */
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Expose functions
window.addMeaningBlock = addMeaningBlock;
window.clearForm = clearForm;
