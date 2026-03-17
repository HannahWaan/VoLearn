/* ===== NOTES MODULE ===== */
/* VoLearn v2.3.0 - Ghi chú nâng cao */

import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast, showSuccess } from './toast.js';
import { escapeHtml, generateId } from '../utils/helpers.js';

/* ===== STATE ===== */
let currentNoteId = null;
let currentView = 'grid';
let searchQuery = '';
let autoSaveTimer = null;
let eventsBound = false;
let lightboxCurrentSrc = null;
let lightboxZoom = 1;

/* ===== COLORS ===== */
const NOTE_COLORS_DARK = {
    '#ffffff': '#2d1f3d', '#fff9c4': '#3d3520', '#f0f4c3': '#2d3520',
    '#b2dfdb': '#1d3530', '#b3e5fc': '#1d2d3d', '#e1bee7': '#352040',
    '#f8bbd0': '#3d1f2d', '#d7ccc8': '#352d28', '#cfd8dc': '#2d3035'
};

/* ===== INIT ===== */
export function initNotes() {
    if (!appData.notes) appData.notes = [];
    if (!eventsBound) {
        bindNotesEvents();
        eventsBound = true;
    }
    renderNotesList();
    console.log('✅ Notes initialized');
}

/* ===== BIND EVENTS ===== */
function bindNotesEvents() {

    document.addEventListener('click', (e) => {
        // --- Header / Editor buttons ---
        if (e.target.closest('#btn-create-note')) return createNewNote();
        if (e.target.closest('#btn-editor-back')) return closeEditor();
        if (e.target.closest('#btn-note-delete')) return deleteCurrentNote();
        if (e.target.closest('#btn-note-pin')) return togglePinCurrentNote();
        if (e.target.closest('#btn-note-image')) return document.getElementById('note-image-input')?.click();

        // --- View toggle ---
        if (e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn');
            if (btn.dataset.view) switchView(btn.dataset.view);
            return;
        }

        // --- Note card ---
        if (e.target.closest('.note-card-pin')) {
            e.stopPropagation();
            const card = e.target.closest('.note-card');
            if (card) togglePin(card.dataset.noteId);
            return;
        }
        if (e.target.closest('.note-card-delete')) {
            e.stopPropagation();
            const card = e.target.closest('.note-card');
            if (card) deleteNote(card.dataset.noteId);
            return;
        }
        if (e.target.closest('.note-card') && !e.target.closest('.note-card-action')) {
            const card = e.target.closest('.note-card');
            if (card?.dataset.noteId) openNote(card.dataset.noteId);
            return;
        }

        // --- Image remove ---
        if (e.target.closest('.note-img-remove')) {
            e.stopPropagation();
            const wrapper = e.target.closest('.note-img-wrapper');
            if (wrapper) { wrapper.remove(); scheduleAutoSave(); }
            return;
        }

        // --- Image click → lightbox ---
        if (e.target.closest('.note-img-wrapper img')) {
            const img = e.target.closest('.note-img-wrapper img');
            if (img) openLightbox(img.src, img.closest('.note-img-wrapper'));
            return;
        }

        // --- Toolbar: standard execCommand ---
        if (e.target.closest('.toolbar-btn') && !e.target.closest('#btn-todo-list') && !e.target.closest('#btn-insert-table') && !e.target.closest('#btn-remove-highlight')) {
            const btn = e.target.closest('.toolbar-btn');
            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;
            if (cmd) {
                document.execCommand(cmd, false, value);
                document.getElementById('note-content-editor')?.focus();
                scheduleAutoSave();
            }
            return;
        }

        // --- Toolbar: Remove highlight ---
        if (e.target.closest('#btn-remove-highlight')) {
            document.execCommand('hiliteColor', false, 'transparent');
            document.getElementById('note-content-editor')?.focus();
            scheduleAutoSave();
            return;
        }

        // --- Toolbar: To-do list ---
        if (e.target.closest('#btn-todo-list')) {
            insertTodoItem();
            return;
        }

        // --- Toolbar: Insert table ---
        if (e.target.closest('#btn-insert-table')) {
            openTableCreator();
            return;
        }

        // --- Table creator modal ---
        if (e.target.closest('#btn-close-table-modal') || e.target.closest('#btn-cancel-table')) {
            closeTableCreator();
            return;
        }
        if (e.target.closest('#btn-confirm-table')) {
            confirmInsertTable();
            return;
        }

        // --- Todo checkbox click ---
        if (e.target.closest('.todo-checkbox')) {
            const cb = e.target.closest('.todo-checkbox');
            const item = cb.closest('.todo-item');
            if (item) {
                item.classList.toggle('checked');
                cb.innerHTML = item.classList.contains('checked')
                    ? '<i class="fas fa-check-square"></i>'
                    : '<i class="far fa-square"></i>';
                scheduleAutoSave();
            }
            return;
        }

        // --- Table context buttons ---
        if (e.target.closest('.table-add-row')) { tableAddRow(e.target.closest('.note-table-wrapper')); return; }
        if (e.target.closest('.table-add-col')) { tableAddCol(e.target.closest('.note-table-wrapper')); return; }
        if (e.target.closest('.table-del-row')) { tableDelRow(e.target.closest('.note-table-wrapper')); return; }
        if (e.target.closest('.table-del-col')) { tableDelCol(e.target.closest('.note-table-wrapper')); return; }
        if (e.target.closest('.table-delete')) { e.target.closest('.note-table-wrapper')?.remove(); scheduleAutoSave(); return; }

        // --- Lightbox ---
        if (e.target.closest('#lightbox-zoom-in')) { lightboxZoomIn(); return; }
        if (e.target.closest('#lightbox-zoom-out')) { lightboxZoomOut(); return; }
        if (e.target.closest('#lightbox-reset')) { lightboxResetZoom(); return; }
        if (e.target.closest('#lightbox-delete')) { lightboxDeleteImage(); return; }
        if (e.target.closest('#lightbox-close') || e.target.closest('.lightbox-backdrop')) { closeLightbox(); return; }
    });

    // Search
    document.addEventListener('input', (e) => {
        if (e.target.id === 'notes-search-input') {
            searchQuery = e.target.value.trim().toLowerCase();
            renderNotesList();
        }
        // Table creator preview
        if (e.target.id === 'table-rows-input' || e.target.id === 'table-cols-input') {
            updateTablePreview();
        }
        // Color picker
        if (e.target.id === 'note-color-picker') {
            applyEditorColor(e.target.value);
            scheduleAutoSave();
        }
    });

    // Content change → auto-save
    document.addEventListener('input', (e) => {
        if (e.target.id === 'note-title-input' || e.target.id === 'note-content-editor' || e.target.closest('#note-content-editor')) {
            scheduleAutoSave();
        }
    });

    // Image input
    document.addEventListener('change', (e) => {
        if (e.target.id === 'note-image-input') {
            handleImageUpload(e.target.files);
            e.target.value = '';
        }
    });

    // Paste images
    document.addEventListener('paste', (e) => {
        if (e.target.id === 'note-content-editor' || e.target.closest('#note-content-editor')) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    handleImageUpload([item.getAsFile()]);
                    return;
                }
            }
        }
    });

    // ESC to close lightbox
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const lb = document.getElementById('note-lightbox');
            if (lb && lb.style.display !== 'none') { closeLightbox(); return; }
            const tm = document.getElementById('table-creator-modal');
            if (tm && tm.style.display !== 'none') { closeTableCreator(); return; }
        }
    });
}

/* ========================================
   CRUD - Notes
   ======================================== */

function createNewNote() {
    const note = {
        id: generateId(), title: '', content: '', images: [],
        color: '#ffffff', pinned: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    if (!appData.notes) appData.notes = [];
    appData.notes.unshift(note);
    saveData(appData);
    openNote(note.id);
}

function openNote(noteId) {
    const note = appData.notes?.find(n => n.id === noteId);
    if (!note) return;
    currentNoteId = noteId;

    const editor = document.getElementById('note-editor');
    const titleInput = document.getElementById('note-title-input');
    const contentEditor = document.getElementById('note-content-editor');
    const colorPicker = document.getElementById('note-color-picker');
    const pinBtn = document.getElementById('btn-note-pin');
    const imagesContainer = document.getElementById('note-images');
    if (!editor) return;

    if (titleInput) titleInput.value = note.title || '';
    if (contentEditor) contentEditor.innerHTML = note.content || '';
    if (colorPicker) colorPicker.value = note.color || '#ffffff';
    if (pinBtn) pinBtn.classList.toggle('active', note.pinned);
    if (imagesContainer) renderNoteImages(note.images || [], imagesContainer);

    applyEditorColor(note.color || '#ffffff');
    editor.style.display = 'flex';
    updateSaveStatus('saved');

    if (!note.title && titleInput) titleInput.focus();
    else if (contentEditor) contentEditor.focus();
}

function closeEditor() {
    saveCurrentNote();
    const editor = document.getElementById('note-editor');
    if (editor) editor.style.display = 'none';
    currentNoteId = null;
    renderNotesList();
}

function saveCurrentNote() {
    if (!currentNoteId) return;
    const note = appData.notes?.find(n => n.id === currentNoteId);
    if (!note) return;

    note.title = document.getElementById('note-title-input')?.value?.trim() || '';
    note.content = document.getElementById('note-content-editor')?.innerHTML || '';
    note.color = document.getElementById('note-color-picker')?.value || '#ffffff';
    note.updatedAt = new Date().toISOString();

    const imagesContainer = document.getElementById('note-images');
    if (imagesContainer) {
        note.images = Array.from(imagesContainer.querySelectorAll('.note-img-wrapper img')).map(img => img.src);
    }

    saveData(appData);
    updateSaveStatus('saved');
}

function scheduleAutoSave() {
    updateSaveStatus('saving');
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveCurrentNote(), 800);
}

function updateSaveStatus(status) {
    const el = document.getElementById('note-save-status');
    if (!el) return;
    if (status === 'saving') {
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        el.className = 'note-save-status saving';
    } else {
        el.innerHTML = '<i class="fas fa-check"></i> Đã lưu';
        el.className = 'note-save-status saved';
    }
}

/* ===== DELETE ===== */
function deleteCurrentNote() { if (currentNoteId) deleteNote(currentNoteId); }

function deleteNote(noteId) {
    const note = appData.notes?.find(n => n.id === noteId);
    if (!note) return;
    window.showConfirm({
        title: 'Xóa ghi chú',
        message: `Xóa "${escapeHtml(note.title || 'Không tiêu đề')}"?`,
        submessage: 'Hành động này không thể hoàn tác.',
        type: 'danger', confirmText: 'Xóa', icon: 'fas fa-trash',
        onConfirm: () => {
            appData.notes = appData.notes.filter(n => n.id !== noteId);
            saveData(appData);
            showSuccess('Đã xóa ghi chú!');
            if (currentNoteId === noteId) {
                document.getElementById('note-editor').style.display = 'none';
                currentNoteId = null;
            }
            renderNotesList();
        }
    });
}

/* ===== PIN ===== */
function togglePin(noteId) {
    const note = appData.notes?.find(n => n.id === noteId);
    if (!note) return;
    note.pinned = !note.pinned;
    saveData(appData);
    renderNotesList();
    showToast(note.pinned ? 'Đã ghim' : 'Đã bỏ ghim', 'success');
}

function togglePinCurrentNote() {
    if (!currentNoteId) return;
    const note = appData.notes?.find(n => n.id === currentNoteId);
    if (!note) return;
    note.pinned = !note.pinned;
    saveData(appData);
    document.getElementById('btn-note-pin')?.classList.toggle('active', note.pinned);
    showToast(note.pinned ? 'Đã ghim' : 'Đã bỏ ghim', 'success');
}

/* ========================================
   TO-DO LIST
   ======================================== */

function insertTodoItem() {
    const editor = document.getElementById('note-content-editor');
    if (!editor) return;

    const todoHtml = `<div class="todo-item"><span class="todo-checkbox" contenteditable="false"><i class="far fa-square"></i></span><span class="todo-text" contenteditable="true">Việc cần làm</span></div>`;

    editor.focus();
    document.execCommand('insertHTML', false, todoHtml);
    scheduleAutoSave();
}

/* ========================================
   TABLE
   ======================================== */

function openTableCreator() {
    const modal = document.getElementById('table-creator-modal');
    if (!modal) return;
    document.getElementById('table-rows-input').value = 3;
    document.getElementById('table-cols-input').value = 3;
    modal.style.display = 'flex';
    updateTablePreview();
}

function closeTableCreator() {
    const modal = document.getElementById('table-creator-modal');
    if (modal) modal.style.display = 'none';
}

function updateTablePreview() {
    const rows = clamp(parseInt(document.getElementById('table-rows-input')?.value) || 3, 1, 20);
    const cols = clamp(parseInt(document.getElementById('table-cols-input')?.value) || 3, 1, 10);
    const preview = document.getElementById('table-preview');
    if (!preview) return;

    let html = '<table>';
    for (let r = 0; r < Math.min(rows, 5); r++) {
        html += '<tr>';
        for (let c = 0; c < Math.min(cols, 6); c++) {
            html += r === 0 ? `<th>Cột ${c + 1}</th>` : '<td></td>';
        }
        html += '</tr>';
    }
    if (rows > 5) html += '<tr><td colspan="' + Math.min(cols, 6) + '" style="text-align:center;color:var(--text-muted);">...</td></tr>';
    html += '</table>';
    preview.innerHTML = html;
}

function confirmInsertTable() {
    const rows = clamp(parseInt(document.getElementById('table-rows-input')?.value) || 3, 1, 20);
    const cols = clamp(parseInt(document.getElementById('table-cols-input')?.value) || 3, 1, 10);
    closeTableCreator();
    insertTable(rows, cols);
}

function insertTable(rows, cols) {
    const editor = document.getElementById('note-content-editor');
    if (!editor) return;

    let tableHtml = '<div class="note-table-wrapper" contenteditable="false">';
    tableHtml += '<div class="table-actions">';
    tableHtml += '<button class="table-act-btn table-add-row" title="Thêm dòng"><i class="fas fa-plus"></i> Dòng</button>';
    tableHtml += '<button class="table-act-btn table-add-col" title="Thêm cột"><i class="fas fa-plus"></i> Cột</button>';
    tableHtml += '<button class="table-act-btn table-del-row" title="Xóa dòng cuối"><i class="fas fa-minus"></i> Dòng</button>';
    tableHtml += '<button class="table-act-btn table-del-col" title="Xóa cột cuối"><i class="fas fa-minus"></i> Cột</button>';
    tableHtml += '<button class="table-act-btn danger table-delete" title="Xóa bảng"><i class="fas fa-trash"></i></button>';
    tableHtml += '</div>';
    tableHtml += '<table>';
    for (let r = 0; r < rows; r++) {
        tableHtml += '<tr>';
        for (let c = 0; c < cols; c++) {
            if (r === 0) {
                tableHtml += `<th contenteditable="true">Tiêu đề</th>`;
            } else {
                tableHtml += `<td contenteditable="true"></td>`;
            }
        }
        tableHtml += '</tr>';
    }
    tableHtml += '</table></div><p><br></p>';

    editor.focus();
    document.execCommand('insertHTML', false, tableHtml);
    scheduleAutoSave();
}

function tableAddRow(wrapper) {
    if (!wrapper) return;
    const table = wrapper.querySelector('table');
    if (!table) return;
    const cols = table.rows[0]?.cells.length || 1;
    const row = table.insertRow();
    for (let c = 0; c < cols; c++) {
        const cell = row.insertCell();
        cell.contentEditable = 'true';
    }
    scheduleAutoSave();
}

function tableAddCol(wrapper) {
    if (!wrapper) return;
    const table = wrapper.querySelector('table');
    if (!table) return;
    for (let r = 0; r < table.rows.length; r++) {
        const cell = r === 0 ? document.createElement('th') : document.createElement('td');
        cell.contentEditable = 'true';
        if (r === 0) cell.textContent = 'Mới';
        table.rows[r].appendChild(cell);
    }
    scheduleAutoSave();
}

function tableDelRow(wrapper) {
    if (!wrapper) return;
    const table = wrapper.querySelector('table');
    if (!table || table.rows.length <= 1) return;
    table.deleteRow(table.rows.length - 1);
    scheduleAutoSave();
}

function tableDelCol(wrapper) {
    if (!wrapper) return;
    const table = wrapper.querySelector('table');
    if (!table) return;
    const cols = table.rows[0]?.cells.length || 0;
    if (cols <= 1) return;
    for (let r = 0; r < table.rows.length; r++) {
        table.rows[r].deleteCell(table.rows[r].cells.length - 1);
    }
    scheduleAutoSave();
}

/* ========================================
   IMAGE HANDLING
   ======================================== */

function handleImageUpload(files) {
    if (!files || files.length === 0) return;
    const container = document.getElementById('note-images');
    if (!container) return;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Ảnh quá lớn (tối đa 5MB)', 'error'); return; }

        const reader = new FileReader();
        reader.onload = (e) => {
            compressImage(e.target.result, 800, 0.8).then(compressed => {
                addImageToEditor(compressed, container);
                scheduleAutoSave();
            });
        };
        reader.readAsDataURL(file);
    });
}

function compressImage(dataUrl, maxWidth, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.width <= maxWidth) { resolve(dataUrl); return; }
            const canvas = document.createElement('canvas');
            const ratio = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    });
}

function addImageToEditor(src, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'note-img-wrapper';
    wrapper.innerHTML = `
        <img src="${src}" alt="Note image">
        <button class="note-img-remove" title="Xóa ảnh"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(wrapper);
}

function renderNoteImages(images, container) {
    container.innerHTML = '';
    (images || []).forEach(src => addImageToEditor(src, container));
}

/* ========================================
   LIGHTBOX (zoom in/out + delete)
   ======================================== */

let lightboxWrapperRef = null;

function openLightbox(src, wrapperEl) {
    const lb = document.getElementById('note-lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lb || !img) return;

    lightboxCurrentSrc = src;
    lightboxWrapperRef = wrapperEl || null;
    lightboxZoom = 1;

    img.src = src;
    img.style.transform = 'scale(1)';
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('note-lightbox');
    if (lb) lb.style.display = 'none';
    document.body.style.overflow = '';
    lightboxCurrentSrc = null;
    lightboxWrapperRef = null;
}

function lightboxZoomIn() {
    lightboxZoom = Math.min(lightboxZoom + 0.25, 4);
    applyLightboxZoom();
}

function lightboxZoomOut() {
    lightboxZoom = Math.max(lightboxZoom - 0.25, 0.25);
    applyLightboxZoom();
}

function lightboxResetZoom() {
    lightboxZoom = 1;
    applyLightboxZoom();
}

function applyLightboxZoom() {
    const img = document.getElementById('lightbox-img');
    if (img) img.style.transform = `scale(${lightboxZoom})`;
}

function lightboxDeleteImage() {
    if (!lightboxWrapperRef) { closeLightbox(); return; }

    window.showConfirm({
        title: 'Xóa ảnh',
        message: 'Xóa ảnh này khỏi ghi chú?',
        type: 'danger', confirmText: 'Xóa', icon: 'fas fa-trash',
        onConfirm: () => {
            lightboxWrapperRef.remove();
            closeLightbox();
            scheduleAutoSave();
            showSuccess('Đã xóa ảnh!');
        }
    });
}

/* ========================================
   EDITOR HELPERS
   ======================================== */

function applyEditorColor(color) {
    const body = document.querySelector('.note-editor-body');
    if (!body) return;
    const isDark = document.body.classList.contains('dark-mode');
    body.style.background = isDark ? (NOTE_COLORS_DARK[color] || color) : color;
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    const container = document.getElementById('notes-container');
    if (container) container.className = view === 'list' ? 'notes-list' : 'notes-grid';
    localStorage.setItem('volearn-notes-view', view);
}

/* ========================================
   RENDER NOTES LIST
   ======================================== */

function renderNotesList() {
    const container = document.getElementById('notes-container');
    const emptyEl = document.getElementById('notes-empty');
    const countEl = document.getElementById('notes-count');
    if (!container) return;

    let notes = appData.notes || [];
    if (searchQuery) {
        notes = notes.filter(n =>
            (n.title || '').toLowerCase().includes(searchQuery) ||
            stripHtml(n.content || '').toLowerCase().includes(searchQuery)
        );
    }
    notes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (countEl) countEl.textContent = `${notes.length} ghi chú`;
    if (notes.length === 0) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const savedView = localStorage.getItem('volearn-notes-view') || 'grid';
    if (savedView !== currentView) switchView(savedView);

    container.innerHTML = notes.map(note => {
        const title = note.title || 'Không tiêu đề';
        const preview = stripHtml(note.content || '').substring(0, 120);
        const date = formatRelativeDate(note.updatedAt);
        const isDark = document.body.classList.contains('dark-mode');
        const bgColor = isDark ? (NOTE_COLORS_DARK[note.color] || '#2d1f3d') : (note.color || '#ffffff');
        const hasImages = note.images?.length > 0;
        const firstImage = hasImages ? note.images[0] : null;

        return `
            <div class="note-card ${note.pinned ? 'pinned' : ''}" data-note-id="${note.id}" style="background:${bgColor};">
                ${note.pinned ? '<div class="note-pin-badge"><i class="fas fa-thumbtack"></i></div>' : ''}
                ${firstImage ? `<div class="note-card-image"><img src="${firstImage}" alt=""></div>` : ''}
                <div class="note-card-body">
                    <h4 class="note-card-title">${escapeHtml(title)}</h4>
                    ${preview ? `<p class="note-card-preview">${escapeHtml(preview)}</p>` : ''}
                </div>
                <div class="note-card-footer">
                    <span class="note-card-date">${date}</span>
                    <div class="note-card-actions-row">
                        ${hasImages ? `<span class="note-card-img-count"><i class="fas fa-image"></i> ${note.images.length}</span>` : ''}
                        <button class="note-card-action note-card-pin" title="${note.pinned ? 'Bỏ ghim' : 'Ghim'}"><i class="fas fa-thumbtack"></i></button>
                        <button class="note-card-action note-card-delete" title="Xóa"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

/* ===== HELPERS ===== */
function stripHtml(html) { const t = document.createElement('div'); t.innerHTML = html; return t.textContent || ''; }
function formatRelativeDate(d) { if (!d) return ''; const diff = Date.now() - new Date(d); const m = Math.floor(diff/60000); if (m < 1) return 'Vừa xong'; if (m < 60) return m + ' phút trước'; const h = Math.floor(m/60); if (h < 24) return h + ' giờ trước'; const days = Math.floor(h/24); if (days < 7) return days + ' ngày trước'; return new Date(d).toLocaleDateString('vi-VN'); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* ===== GLOBAL EXPORTS ===== */
window.initNotes = initNotes;
