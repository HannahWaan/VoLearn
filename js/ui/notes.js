/* ===== NOTES MODULE ===== */
/* VoLearn v2.5.0 - Ghi chú - Table giống Word */

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
let highlightColor = '#fff176';

/* Table state */
let ctxTargetCell = null;   // cell (td/th) that was right-clicked
let resizingCol = null;     // { table, colIndex, startX, startWidths[] }
let resizingRow = null;     // { table, rowIndex, startY, startHeight }

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

    /* ---------- CLICK ---------- */
    document.addEventListener('click', (e) => {
        // Hide context menu on any click outside it
        hideTableContextMenu();

        // --- Header / Editor buttons ---
        if (e.target.closest('#btn-create-note')) return createNewNote();
        if (e.target.closest('#btn-editor-back')) return closeEditor();
        if (e.target.closest('#btn-note-delete')) return deleteCurrentNote();
        if (e.target.closest('#btn-note-pin')) return togglePinCurrentNote();
        if (e.target.closest('#btn-note-image')) return document.getElementById('note-image-input')?.click();

        // --- Undo / Redo ---
        if (e.target.closest('#btn-undo')) { document.execCommand('undo'); scheduleAutoSave(); return; }
        if (e.target.closest('#btn-redo')) { document.execCommand('redo'); scheduleAutoSave(); return; }

        // --- Highlight ---
        if (e.target.closest('#btn-highlight')) {
            document.execCommand('hiliteColor', false, highlightColor);
            document.getElementById('note-content-editor')?.focus();
            scheduleAutoSave();
            return;
        }

        // --- View toggle ---
        if (e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn');
            if (btn.dataset.view) switchView(btn.dataset.view);
            return;
        }

        // --- Note card actions ---
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

        // --- Image → lightbox ---
        if (e.target.closest('.note-img-wrapper img')) {
            const img = e.target.closest('.note-img-wrapper img');
            if (img) openLightbox(img.src, img.closest('.note-img-wrapper'));
            return;
        }

        // --- Toolbar: standard execCommand ---
        const specialIds = ['#btn-todo-list', '#btn-insert-table', '#btn-remove-highlight', '#btn-highlight', '#btn-undo', '#btn-redo'];
        const isSpecial = specialIds.some(sel => e.target.closest(sel));
        if (e.target.closest('.toolbar-btn') && !isSpecial) {
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
        if (e.target.closest('#btn-todo-list')) { insertTodoItem(); return; }

        // --- Toolbar: Insert table ---
        if (e.target.closest('#btn-insert-table')) { openTableCreator(); return; }

        // --- Table creator modal ---
        if (e.target.closest('#btn-close-table-modal') || e.target.closest('#btn-cancel-table')) { closeTableCreator(); return; }
        if (e.target.closest('#btn-confirm-table')) { confirmInsertTable(); return; }

        // --- Todo checkbox ---
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

        // --- Context menu item ---
        if (e.target.closest('.ctx-item')) {
            const action = e.target.closest('.ctx-item').dataset.action;
            if (action) handleTableContextAction(action);
            return;
        }

        // --- Lightbox ---
        if (e.target.closest('#lightbox-zoom-in')) { lightboxZoomIn(); return; }
        if (e.target.closest('#lightbox-zoom-out')) { lightboxZoomOut(); return; }
        if (e.target.closest('#lightbox-reset')) { lightboxResetZoom(); return; }
        if (e.target.closest('#lightbox-delete')) { lightboxDeleteImage(); return; }
        if (e.target.closest('#lightbox-close') || e.target.closest('.lightbox-backdrop')) { closeLightbox(); return; }
    });

    /* ---------- CONTEXT MENU (right click) on table cells ---------- */
    document.addEventListener('contextmenu', (e) => {
        const cell = e.target.closest('.note-table-wrapper td, .note-table-wrapper th');
        if (!cell) return;
        // Only inside note editor
        if (!cell.closest('#note-content-editor')) return;

        e.preventDefault();
        ctxTargetCell = cell;
        showTableContextMenu(e.clientX, e.clientY);
    });

    /* ---------- INPUT ---------- */
    document.addEventListener('input', (e) => {
        if (e.target.id === 'notes-search-input') {
            searchQuery = e.target.value.trim().toLowerCase();
            renderNotesList();
        }
        if (e.target.id === 'table-rows-input' || e.target.id === 'table-cols-input') {
            updateTablePreview();
        }
        if (e.target.id === 'note-color-picker') {
            applyEditorColor(e.target.value);
            scheduleAutoSave();
        }
        if (e.target.id === 'highlight-color-picker') {
            highlightColor = e.target.value;
            updateHighlightBtnIndicator();
        }
        // Auto-save on content change
        if (e.target.id === 'note-title-input' || e.target.id === 'note-content-editor' || e.target.closest('#note-content-editor')) {
            scheduleAutoSave();
        }
    });

    /* ---------- IMAGE INPUT ---------- */
    document.addEventListener('change', (e) => {
        if (e.target.id === 'note-image-input') {
            handleImageUpload(e.target.files);
            e.target.value = '';
        }
    });

    /* ---------- PASTE ---------- */
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

    /* ---------- KEYDOWN ---------- */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const ctxMenu = document.getElementById('table-context-menu');
            if (ctxMenu && ctxMenu.style.display !== 'none') { hideTableContextMenu(); return; }
            const lb = document.getElementById('note-lightbox');
            if (lb && lb.style.display !== 'none') { closeLightbox(); return; }
            const tm = document.getElementById('table-creator-modal');
            if (tm && tm.style.display !== 'none') { closeTableCreator(); return; }
        }

        // Tab inside table cell → move to next cell
        if (e.key === 'Tab') {
            const cell = e.target.closest?.('.note-table-wrapper td, .note-table-wrapper th');
            if (cell && cell.closest('#note-content-editor')) {
                e.preventDefault();
                const row = cell.parentElement;
                const table = cell.closest('table');
                if (!table) return;

                if (e.shiftKey) {
                    // Previous cell
                    if (cell.previousElementSibling) {
                        cell.previousElementSibling.focus();
                    } else if (row.previousElementSibling) {
                        const prevRow = row.previousElementSibling;
                        const lastCell = prevRow.cells[prevRow.cells.length - 1];
                        if (lastCell) lastCell.focus();
                    }
                } else {
                    // Next cell
                    if (cell.nextElementSibling) {
                        cell.nextElementSibling.focus();
                    } else if (row.nextElementSibling) {
                        const nextRow = row.nextElementSibling;
                        const firstCell = nextRow.cells[0];
                        if (firstCell) firstCell.focus();
                    } else {
                        // Last cell of last row → add new row
                        const cols = table.rows[0]?.cells.length || 1;
                        const newRow = table.insertRow();
                        for (let c = 0; c < cols; c++) {
                            const td = newRow.insertCell();
                            td.contentEditable = 'true';
                        }
                        newRow.cells[0]?.focus();
                        scheduleAutoSave();
                    }
                }
            }
        }
    });

    /* ---------- MOUSEDOWN: column & row resize ---------- */
    document.addEventListener('mousedown', (e) => {
        // Only in note editor tables
        const cell = e.target.closest?.('#note-content-editor .note-table-wrapper td, #note-content-editor .note-table-wrapper th');
        if (!cell) return;

        const rect = cell.getBoundingClientRect();
        const table = cell.closest('table');
        if (!table) return;

        const nearRight = e.clientX >= rect.right - 5;
        const nearBottom = e.clientY >= rect.bottom - 5;

        // Column resize: near right border of any cell
        if (nearRight) {
            e.preventDefault();
            initColumnResize(e, cell, table);
            return;
        }

        // Row resize: near bottom border of any cell
        if (nearBottom) {
            e.preventDefault();
            initRowResize(e, cell, table);
            return;
        }
    });
}

/* ========================================
   TABLE COLUMN / ROW RESIZE
   ======================================== */

function initColumnResize(e, cell, table) {
    // Ensure table-layout fixed and all cols have explicit widths
    table.style.tableLayout = 'fixed';
    const headerCells = table.rows[0]?.cells;
    if (!headerCells) return;

    const widths = [];
    for (let i = 0; i < headerCells.length; i++) {
        widths.push(headerCells[i].offsetWidth);
    }
    // Set explicit widths
    for (let i = 0; i < headerCells.length; i++) {
        headerCells[i].style.width = widths[i] + 'px';
    }

    const colIndex = cell.cellIndex;
    const startX = e.clientX;
    const startWidth = widths[colIndex];

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
        const diff = ev.clientX - startX;
        const newW = Math.max(30, startWidth + diff);
        headerCells[colIndex].style.width = newW + 'px';
    };

    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        scheduleAutoSave();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

function initRowResize(e, cell, table) {
    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const startY = e.clientY;
    const startHeight = row.offsetHeight;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
        const diff = ev.clientY - startY;
        const newH = Math.max(24, startHeight + diff);
        row.style.height = newH + 'px';
    };

    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        scheduleAutoSave();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

/* ========================================
   TABLE CONTEXT MENU (Word-like right click)
   ======================================== */

function showTableContextMenu(x, y) {
    const menu = document.getElementById('table-context-menu');
    if (!menu) return;

    menu.style.display = 'block';

    // Position: ensure menu stays within viewport
    const menuW = 220;
    const menuH = menu.offsetHeight || 300;
    const maxX = window.innerWidth - menuW - 10;
    const maxY = window.innerHeight - menuH - 10;

    menu.style.left = Math.min(x, maxX) + 'px';
    menu.style.top = Math.min(y, maxY) + 'px';
}

function hideTableContextMenu() {
    const menu = document.getElementById('table-context-menu');
    if (menu) menu.style.display = 'none';
}

function handleTableContextAction(action) {
    hideTableContextMenu();
    if (!ctxTargetCell) return;

    const table = ctxTargetCell.closest('table');
    const wrapper = ctxTargetCell.closest('.note-table-wrapper');
    if (!table) return;

    const rowIndex = ctxTargetCell.parentElement.rowIndex;
    const colIndex = ctxTargetCell.cellIndex;
    const totalRows = table.rows.length;
    const totalCols = table.rows[0]?.cells.length || 0;

    switch (action) {
        case 'insert-row-above':
            insertRowAt(table, rowIndex, totalCols);
            break;
        case 'insert-row-below':
            insertRowAt(table, rowIndex + 1, totalCols);
            break;
        case 'insert-col-left':
            insertColAt(table, colIndex);
            break;
        case 'insert-col-right':
            insertColAt(table, colIndex + 1);
            break;
        case 'delete-row':
            if (totalRows <= 1) {
                // Only one row → delete entire table
                if (wrapper) wrapper.remove();
            } else {
                table.deleteRow(rowIndex);
            }
            break;
        case 'delete-col':
            if (totalCols <= 1) {
                if (wrapper) wrapper.remove();
            } else {
                for (let r = 0; r < table.rows.length; r++) {
                    if (colIndex < table.rows[r].cells.length) {
                        table.rows[r].deleteCell(colIndex);
                    }
                }
                // Update header widths
                recalcColWidths(table);
            }
            break;
        case 'clear-cell':
            ctxTargetCell.innerHTML = '';
            break;
        case 'delete-table':
            if (wrapper) wrapper.remove();
            break;
    }

    ctxTargetCell = null;
    scheduleAutoSave();
}

function insertRowAt(table, atIndex, totalCols) {
    const newRow = table.insertRow(atIndex);
    for (let c = 0; c < totalCols; c++) {
        const cell = newRow.insertCell();
        cell.contentEditable = 'true';
    }
}

function insertColAt(table, atIndex) {
    for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r];
        const isHeader = (r === 0);
        const cell = document.createElement(isHeader ? 'th' : 'td');
        cell.contentEditable = 'true';
        if (isHeader) cell.textContent = 'Mới';

        if (atIndex >= row.cells.length) {
            row.appendChild(cell);
        } else {
            row.insertBefore(cell, row.cells[atIndex]);
        }
    }
    recalcColWidths(table);
}

function recalcColWidths(table) {
    // After adding/removing columns, reset to auto widths then re-fix
    const headerCells = table.rows[0]?.cells;
    if (!headerCells) return;
    // Temporarily auto
    table.style.tableLayout = 'auto';
    for (let i = 0; i < headerCells.length; i++) {
        headerCells[i].style.width = '';
    }
    // Force reflow, then fix
    void table.offsetWidth;
    table.style.tableLayout = 'fixed';
    for (let i = 0; i < headerCells.length; i++) {
        headerCells[i].style.width = headerCells[i].offsetWidth + 'px';
    }
}

/* ===== HIGHLIGHT INDICATOR ===== */
function updateHighlightBtnIndicator() {
    const btn = document.getElementById('btn-highlight');
    if (btn) btn.style.borderBottom = `3px solid ${highlightColor}`;
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
    updateHighlightBtnIndicator();
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
   TABLE - CREATE
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

    const defaultColWidth = Math.max(60, Math.floor(700 / cols));

    let html = '<div class="note-table-wrapper">';
    html += '<table style="table-layout:fixed;">';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            if (r === 0) {
                html += `<th contenteditable="true" style="width:${defaultColWidth}px;">Tiêu đề</th>`;
            } else {
                html += '<td contenteditable="true"></td>';
            }
        }
        html += '</tr>';
    }
    html += '</table></div><p><br></p>';

    editor.focus();
    document.execCommand('insertHTML', false, html);
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
   LIGHTBOX
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
