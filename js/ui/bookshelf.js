/* ===== BOOKSHELF MODULE ===== */
/* VoLearn v2.1.0 - Quản lý tủ sách */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';
import { openModal, closeAllModals } from './modalEngine.js';
import { escapeHtml, generateId } from '../utils/helpers.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let searchQuery = '';
let editingSetId = null;

/* ===== INIT ===== */
export function initBookshelf() {
    bindBookshelfEvents();
    renderShelves();
    populateSetSelect();
    console.log('✅ Bookshelf initialized');
}

/* ===== RENDER SHELVES ===== */
export function renderShelves() {
    const container = document.getElementById('sets-container');
    if (!container) return;

    const allWordsCount = appData.vocabulary?.length || 0;
    
    // Always show "All Words" card first - giống code cũ
    let html = `
        <div class="set-card all-words" onclick="window.openSetView('all')">
            <div class="set-card-main">
                <div class="set-color-icon" style="background: var(--gradient-primary)">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="set-info">
                    <span class="set-name">Tất cả từ vựng</span>
                    <span class="set-count">${allWordsCount} từ</span>
                </div>
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

    // Render each set - với actions wrapper
    sets.forEach(set => {
        const count = appData.vocabulary?.filter(w => w.setId === set.id).length || 0;
        const bgColor = set.color || 'var(--primary-color)';
        
        html += `
            <div class="set-card" onclick="window.openSetView('${set.id}')">
                <div class="set-card-main">
                    <div class="set-color-icon" style="background: ${bgColor}">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="set-info">
                        <span class="set-name">${escapeHtml(set.name)}</span>
                        <span class="set-count">${count} từ</span>
                    </div>
                </div>
                <div class="set-card-actions">
                    <button class="btn-edit-set" onclick="event.stopPropagation(); window.openEditSetModal('${set.id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-set" onclick="event.stopPropagation(); window.confirmDeleteSet('${set.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ===== POPULATE SET SELECT ===== */
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
    const searchInput = document.getElementById('bookshelf-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderShelves();
        });
    }

    const createBtn = document.getElementById('btn-create-set');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateSetModal);
    }
    
    const saveSetBtn = document.getElementById('btn-save-set');
    if (saveSetBtn) {
        saveSetBtn.addEventListener('click', saveSet);
    }
}

/* ===== OPEN SET VIEW - Giống code cũ ===== */
export function openSetView(setId) {
    window.currentSetViewId = setId;
    navigate('set-view');
}

/* ===== CREATE SET MODAL ===== */
export function openCreateSetModal() {
    editingSetId = null;
    
    const nameInput = document.getElementById('set-name-input');
    const colorInput = document.getElementById('set-color-input');
    const modalTitle = document.querySelector('#create-set-modal .modal-header h3');
    const saveBtn = document.getElementById('btn-save-set');
    
    if (nameInput) nameInput.value = '';
    if (colorInput) colorInput.value = '#667eea';
    if (modalTitle) modalTitle.textContent = 'Tạo bộ từ mới';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Tạo bộ từ';
    
    openModal('create-set-modal');
    setTimeout(() => nameInput?.focus(), 100);
}

/* ===== EDIT SET MODAL ===== */
export function openEditSetModal(setId) {
    const set = appData.sets?.find(s => s.id === setId);
    if (!set) return;
    
    editingSetId = setId;
    
    const nameInput = document.getElementById('set-name-input');
    const colorInput = document.getElementById('set-color-input');
    const modalTitle = document.querySelector('#create-set-modal .modal-header h3');
    const saveBtn = document.getElementById('btn-save-set');
    
    if (nameInput) nameInput.value = set.name;
    if (colorInput) colorInput.value = set.color || '#667eea';
    if (modalTitle) modalTitle.textContent = 'Sửa bộ từ';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
    
    openModal('create-set-modal');
    setTimeout(() => nameInput?.focus(), 100);
}

/* ===== SAVE SET ===== */
export function saveSet() {
    const nameInput = document.getElementById('set-name-input');
    const colorInput = document.getElementById('set-color-input');
    
    const name = nameInput?.value?.trim();
    const color = colorInput?.value || '#667eea';
    
    if (!name) {
        showToast('Vui lòng nhập tên bộ từ', 'error');
        return;
    }
    
    const exists = appData.sets?.some(s => 
        s.name.toLowerCase() === name.toLowerCase() && s.id !== editingSetId
    );
    if (exists) {
        showToast('Tên bộ từ đã tồn tại', 'error');
        return;
    }
    
    if (editingSetId) {
        const set = appData.sets?.find(s => s.id === editingSetId);
        if (set) {
            set.name = name;
            set.color = color;
            set.updatedAt = new Date().toISOString();
            showToast(`Đã cập nhật bộ từ "${name}"`);
        }
    } else {
        const newSet = {
            id: generateId(),
            name,
            color,
            createdAt: new Date().toISOString()
        };
        
        if (!appData.sets) appData.sets = [];
        appData.sets.push(newSet);
        showToast(`Đã tạo bộ từ "${name}"`);
    }
    
    saveData(appData);
    closeAllModals();
    renderShelves();
    populateSetSelect();
    editingSetId = null;
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
    appData.vocabulary?.forEach(word => {
        if (word.setId === setId) {
            word.setId = null;
        }
    });
    
    appData.sets = appData.sets?.filter(s => s.id !== setId) || [];
    
    saveData(appData);
    renderShelves();
    populateSetSelect();
    showToast('Đã xóa bộ từ');
}

/* ===== GLOBAL EXPORTS ===== */
window.openSetView = openSetView;
window.openCreateSetModal = openCreateSetModal;
window.openEditSetModal = openEditSetModal;
window.saveNewSet = saveSet;
window.saveSet = saveSet;
window.confirmDeleteSet = confirmDeleteSet;
window.deleteSet = deleteSet;
window.renderShelves = renderShelves;
window.populateSetSelect = populateSetSelect;

export { searchQuery };

