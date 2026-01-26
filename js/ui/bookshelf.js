/* ===== BOOKSHELF MODULE ===== */
/* VoLearn v2.1.0 - Quản lý tủ sách */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { pushUndoState } from '../core/undo.js';
import { showToast } from './toast.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';

/* ===== INIT ===== */
export function initBookshelf() {
    bindBookshelfEvents();
    renderShelves();
}

/* ===== RENDER SHELVES ===== */
export function renderShelves() {
    const container = document.getElementById('sets-container');
    if (!container) return;

    // Always show "All Words" card first
    const allWordsCount = appData.vocabulary?.length || 0;
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

    const sets = getFilteredSets();

    // Render other sets
    sets.forEach(set => {
        const count = appData.vocabulary?.filter(w => w.setId === set.id).length || 0;
        html += `
            <div class="set-card" onclick="window.viewSet('${set.id}')">
                <div class="set-icon" style="background: ${set.color || '#e91e8c'}">
                    <i class="${set.icon || 'fas fa-folder'}"></i>
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
    
    updateSetSelectDropdown();
}

/* ===== UPDATE SET SELECT DROPDOWN ===== */
function updateSetSelectDropdown() {
    const setSelect = document.getElementById('set-select');
    if (!setSelect) return;
    
    setSelect.innerHTML = '<option value="">-- Không chọn bộ (Tất cả) --</option>';
    appData.sets?.forEach(set => {
        setSelect.innerHTML += `<option value="${set.id}">${escapeHtml(set.name)}</option>`;
    });
}

/* ===== RENDER SET CARD ===== */
function renderSetCard(set) {
    const wordCount = set.words?.length || 0;
    const masteredCount = set.words?.filter(w => w.mastered).length || 0;
    const progress = wordCount > 0 ? Math.round((masteredCount / wordCount) * 100) : 0;

    return `
        <div class="set-card" data-set-id="${set.id}">
            <div class="set-card-header">
                <div class="set-icon" style="background: ${set.color || 'var(--primary)'}">
                    <i class="${set.icon || 'fas fa-folder'}"></i>
                </div>
                <div class="set-actions">
                    <button class="btn-icon btn-edit-set" data-id="${set.id}" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete-set" data-id="${set.id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="set-card-body">
                <h3 class="set-name">${escapeHtml(set.name)}</h3>
                <p class="set-description">${escapeHtml(set.description || '')}</p>
                
                <div class="set-stats">
                    <span><i class="fas fa-layer-group"></i> ${wordCount} từ</span>
                    <span><i class="fas fa-check-circle"></i> ${masteredCount} thuộc</span>
                </div>
                
                <div class="set-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${progress}%</span>
                </div>
            </div>
            
            <div class="set-card-footer">
                <button class="btn-secondary btn-view-set" data-id="${set.id}">
                    <i class="fas fa-eye"></i> Xem
                </button>
                <button class="btn-primary btn-practice-set" data-id="${set.id}">
                    <i class="fas fa-play"></i> Luyện tập
                </button>
            </div>
        </div>
    `;
}

/* ===== BIND EVENTS ===== */
function bindBookshelfEvents() {
    // Search
    const searchInput = document.getElementById('bookshelf-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderShelves();
        });
    }

    // Filter
    const filterBtns = document.querySelectorAll('[data-filter]');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderShelves();
        });
    });

    // Sort
    const sortSelect = document.getElementById('bookshelf-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderShelves();
        });
    }

    // Create new set button
    const createBtn = document.getElementById('btn-create-set');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateSetModal);
    }
}

function bindSetCardEvents() {
    // View set
    document.querySelectorAll('.btn-view-set').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const setId = btn.dataset.id;
            viewSet(setId);
        });
    });

    // Practice set
    document.querySelectorAll('.btn-practice-set').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const setId = btn.dataset.id;
            practiceSet(setId);
        });
    });

    // Edit set
    document.querySelectorAll('.btn-edit-set').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const setId = btn.dataset.id;
            editSet(setId);
        });
    });

    // Delete set
    document.querySelectorAll('.btn-delete-set').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const setId = btn.dataset.id;
            confirmDeleteSet(setId);
        });
    });

    // Click on card to view
    document.querySelectorAll('.set-card').forEach(card => {
        card.addEventListener('click', () => {
            const setId = card.dataset.setId;
            viewSet(setId);
        });
    });
}

/* ===== FILTER & SORT ===== */
function getFilteredSets() {
    let sets = [...(appData.sets || [])];

    // Filter by search
    if (searchQuery) {
        sets = sets.filter(s => 
            s.name.toLowerCase().includes(searchQuery) ||
            (s.description && s.description.toLowerCase().includes(searchQuery))
        );
    }

    // Filter by type
    if (currentFilter !== 'all') {
        if (currentFilter === 'mastered') {
            sets = sets.filter(s => {
                const wordCount = s.words?.length || 0;
                const masteredCount = s.words?.filter(w => w.mastered).length || 0;
                return wordCount > 0 && masteredCount === wordCount;
            });
        } else if (currentFilter === 'learning') {
            sets = sets.filter(s => {
                const wordCount = s.words?.length || 0;
                const masteredCount = s.words?.filter(w => w.mastered).length || 0;
                return wordCount > 0 && masteredCount < wordCount;
            });
        } else if (currentFilter === 'empty') {
            sets = sets.filter(s => !s.words || s.words.length === 0);
        }
    }

    // Sort
    switch (currentSort) {
        case 'newest':
            sets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            sets.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name-asc':
            sets.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sets.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'words':
            sets.sort((a, b) => (b.words?.length || 0) - (a.words?.length || 0));
            break;
        case 'progress':
            sets.sort((a, b) => {
                const progressA = getSetProgress(a);
                const progressB = getSetProgress(b);
                return progressB - progressA;
            });
            break;
    }

    return sets;
}

function getSetProgress(set) {
    const wordCount = set.words?.length || 0;
    if (wordCount === 0) return 0;
    const masteredCount = set.words?.filter(w => w.mastered).length || 0;
    return (masteredCount / wordCount) * 100;
}

/* ===== SET ACTIONS ===== */
export function viewSet(setId) {
    window.currentSetId = setId;
    navigate('set-view');
}

export function practiceSet(setId) {
    const set = appData.sets.find(s => s.id === setId);
    if (!set || !set.words || set.words.length === 0) {
        showToast('Bộ từ trống!', 'warning');
        return;
    }
    
    window.currentSetId = setId;
    window.practiceScope = { type: 'set', setId };
    navigate('practice');
}

export function editSet(setId) {
    const set = appData.sets.find(s => s.id === setId);
    if (!set) return;

    openCreateSetModal(set);
}

export function confirmDeleteSet(setId) {
    const set = appData.sets.find(s => s.id === setId);
    if (!set) return;

    if (confirm(`Bạn có chắc muốn xóa bộ từ "${set.name}"?`)) {
        deleteSet(setId);
    }
}

export function deleteSet(setId) {
    pushUndoState();

    const index = appData.sets.findIndex(s => s.id === setId);
    if (index === -1) return;

    appData.sets.splice(index, 1);
    saveData(appData);
    renderShelves();
    showToast('Đã xóa bộ từ', 'success');
}

/* ===== CREATE/EDIT SET MODAL ===== */
export function openCreateSetModal(existingSet = null) {
    const modal = document.getElementById('create-set-modal');
    if (!modal) return;

    const form = modal.querySelector('form') || modal;
    const nameInput = document.getElementById('set-name');
    const descInput = document.getElementById('set-description');
    const colorInput = document.getElementById('set-color');
    const iconSelect = document.getElementById('set-icon');
    const title = modal.querySelector('.modal-title');
    const submitBtn = modal.querySelector('[type="submit"], .btn-save-set');

    // Reset or fill form
    if (existingSet) {
        if (title) title.textContent = 'Chỉnh sửa bộ từ';
        if (submitBtn) submitBtn.textContent = 'Lưu thay đổi';
        if (nameInput) nameInput.value = existingSet.name || '';
        if (descInput) descInput.value = existingSet.description || '';
        if (colorInput) colorInput.value = existingSet.color || '#e91e8c';
        if (iconSelect) iconSelect.value = existingSet.icon || 'fas fa-folder';
        modal.dataset.editId = existingSet.id;
    } else {
        if (title) title.textContent = 'Tạo bộ từ mới';
        if (submitBtn) submitBtn.textContent = 'Tạo bộ từ';
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        if (colorInput) colorInput.value = '#e91e8c';
        if (iconSelect) iconSelect.value = 'fas fa-folder';
        delete modal.dataset.editId;
    }

    modal.classList.add('show');
}

export function closeCreateSetModal() {
    const modal = document.getElementById('create-set-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

export function saveSet() {
    const modal = document.getElementById('create-set-modal');
    const nameInput = document.getElementById('set-name');
    const descInput = document.getElementById('set-description');
    const colorInput = document.getElementById('set-color');
    const iconSelect = document.getElementById('set-icon');

    const name = nameInput?.value?.trim();
    if (!name) {
        showToast('Vui lòng nhập tên bộ từ', 'warning');
        return;
    }

    pushUndoState();

    const editId = modal?.dataset.editId;

    if (editId) {
        // Edit existing
        const set = appData.sets.find(s => s.id === editId);
        if (set) {
            set.name = name;
            set.description = descInput?.value?.trim() || '';
            set.color = colorInput?.value || '#e91e8c';
            set.icon = iconSelect?.value || 'fas fa-folder';
            set.updatedAt = new Date().toISOString();
        }
        showToast('Đã cập nhật bộ từ', 'success');
    } else {
        // Create new
        const newSet = {
            id: generateId(),
            name,
            description: descInput?.value?.trim() || '',
            color: colorInput?.value || '#e91e8c',
            icon: iconSelect?.value || 'fas fa-folder',
            words: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        appData.sets.push(newSet);
        showToast('Đã tạo bộ từ mới', 'success');
    }

    saveData(appData);
    closeCreateSetModal();
    renderShelves();
}

/* ===== UTILITIES ===== */
function generateId() {
    return 'set_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ===== EXPORTS ===== */
export {
    currentFilter,
    currentSort,
    searchQuery
};

// Expose to window for HTML onclick handlers
window.openCreateSetModal = openCreateSetModal;
window.closeCreateSetModal = closeCreateSetModal;
window.saveSet = saveSet;
window.viewSet = viewSet;
window.practiceSet = practiceSet;
window.deleteSet = deleteSet;
window.renderShelves = renderShelves;

