/* ===== BOOKSHELF MODULE ===== */
/* VoLearn v2.1.0 - Quản lý tủ sách */

import { appData, addSet, deleteSet as deleteSetFromState } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';
import { openModal, closeAllModals } from './modalEngine.js';
import { escapeHtml, generateId } from '../utils/helpers.js';

/* ===== STATE ===== */
let searchQuery = '';

/* ===== INIT ===== */
export function initBookshelf() {
    bindBookshelfEvents();
    renderShelves();
    console.log('✅ Bookshelf initialized');
}

/* ===== RENDER SHELVES ===== */
export function renderShelves() {
    const container = document.getElementById('sets-container');
    if (!container) return;

    const allWordsCount = appData.vocabulary?.length || 0;
    
    // Always show "All Words" card first
    let html = `
        <div class="set-card all-words" onclick="window.openSetDetail('all')">
            <div class="set-icon" style="background: linear-gradient(135deg, #e91e8c, #ff6b9d)">
                <i class="fas fa-layer-group"></i>
            </div>
            <div class="set-info">
                <h3>Tất cả từ vựng</h3>
                <span class="set-count">${allWordsCount} từ</span>
            </div>
        </div>
    `;

    // Get and filter sets
    let sets = appData.sets || [];
    
    if (searchQuery) {
        sets = sets.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Render each set
    sets.forEach(set => {
        const count = appData.vocabulary?.filter(w => w.setId === set.id).length || 0;
        html += `
            <div class="set-card" onclick="window.openSetDetail('${set.id}')">
                <div class="set-icon" style="background: ${set.color || '#667eea'}">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="set-info">
                    <h3>${escapeHtml(set.name)}</h3>
                    <span class="set-count">${count} từ</span>
                </div>
                <button class="btn-delete-set" onclick="event.stopPropagation(); window.confirmDeleteSet('${set.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ===== POPULATE SET SELECT (for Add Word page) ===== */
export function populateSetSelect() {
    const setSelect = document.getElementById('set-select');
    if (!setSelect) return;
    
    setSelect.innerHTML = '<option value="">-- Không chọn bộ (Tất cả) --</option>';
    
    (appData.sets || []).forEach(set => {
        setSelect.innerHTML += `<option value="${set.id}">${escapeHtml(set.name)}</option>`;
    });
}

/* ===== BIND EVENTS ===== */
function bindBookshelfEvents() {
    // Search
    const searchInput = document.getElementById('bookshelf-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderShelves();
        });
    }

    // Create new set button
    const createBtn = document.getElementById('btn-create-set');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateSetModal);
    }
    
    // Save set button (in modal)
    const saveSetBtn = document.getElementById('btn-save-set');
    if (saveSetBtn) {
        saveSetBtn.addEventListener('click', saveNewSet);
    }
}

/* ===== CREATE SET MODAL ===== */
export function openCreateSetModal() {
    // Reset form
    const nameInput = document.getElementById('set-name-input');
    const colorInput = document.getElementById('set-color-input');
    
    if (nameInput) nameInput.value = '';
    if (colorInput) colorInput.value = '#667eea';
    
    openModal('create-set-modal');
}

export function saveNewSet() {
    const nameInput = document.getElementById('set-name-input');
    const colorInput = document.getElementById('set-color-input');
    
    const name = nameInput?.value?.trim();
    const color = colorInput?.value || '#667eea';
    
    if (!name) {
        showToast('Vui lòng nhập tên bộ từ', 'error');
        return;
    }
    
    // Check duplicate name
    const exists = appData.sets?.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast('Tên bộ từ đã tồn tại', 'error');
        return;
    }
    
    // Create new set
    const newSet = {
        id: generateId(),
        name,
        color,
        createdAt: new Date().toISOString()
    };
    
    if (!appData.sets) appData.sets = [];
    appData.sets.push(newSet);
    
    saveData(appData);
    closeAllModals();
    renderShelves();
    populateSetSelect(); // Update dropdown in Add Word page
    
    showToast(`Đã tạo bộ từ "${name}"`);
}

/* ===== DELETE SET ===== */
export function confirmDeleteSet(setId) {
    const set = appData.sets?.find(s => s.id === setId);
    if (!set) return;
    
    if (confirm(`Bạn có chắc muốn xóa bộ từ "${set.name}"?\n\nCác từ trong bộ sẽ được chuyển về "Tất cả từ vựng".`)) {
        deleteSet(setId);
    }
}

export function deleteSet(setId) {
    // Move words from this set to no set
    appData.vocabulary?.forEach(word => {
        if (word.setId === setId) {
            word.setId = null;
        }
    });
    
    // Remove set
    appData.sets = appData.sets?.filter(s => s.id !== setId) || [];
    
    saveData(appData);
    renderShelves();
    populateSetSelect();
    
    showToast('Đã xóa bộ từ');
}

/* ===== OPEN SET DETAIL ===== */
export function openSetDetail(setId) {
    // This will be handled by setView module
    window.dispatchEvent(new CustomEvent('volearn:openSet', { 
        detail: { setId } 
    }));
    
    // Or direct call if available
    if (window.openSetDetailView) {
        window.openSetDetailView(setId);
    }
}

/* ===== GLOBAL EXPORTS ===== */
window.openCreateSetModal = openCreateSetModal;
window.saveNewSet = saveNewSet;
window.confirmDeleteSet = confirmDeleteSet;
window.deleteSet = deleteSet;
window.openSetDetail = openSetDetail;
window.renderShelves = renderShelves;
window.populateSetSelect = populateSetSelect;

export { searchQuery };
