/* ===== NOTES MODULE ===== */
/* VoLearn v2.6.0 - Full toolbar: align, font color, todo fix, format painter */

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
let fontColor = '#e91e8c';
let ctxTargetCell = null;

/* Format painter state */
let formatPainterStyles = null; // null = inactive

/* ===== COLORS ===== */
const NOTE_COLORS_DARK = {
    '#ffffff': '#2d1f3d', '#fff9c4': '#3d3520', '#f0f4c3': '#2d3520',
    '#b2dfdb': '#1d3530', '#b3e5fc': '#1d2d3d', '#e1bee7': '#352040',
    '#f8bbd0': '#3d1f2d', '#d7ccc8': '#352d28', '#cfd8dc': '#2d3035'
};

/* ===== INIT ===== */
export function initNotes() {
    if (!appData.notes) appData.notes = [];
    migrateOldTables();
    if (!eventsBound) {
        bindNotesEvents();
        eventsBound = true;
    }
    renderNotesList();
    console.log('✅ Notes initialized');
}

/* ===== MIGRATE ===== */
function migrateOldTables() {
    if (!appData.notes || !appData.notes.length) return;
    let changed = false;
    appData.notes.forEach(note => {
        if (!note.content) return;
        if (!note.content.includes('table-actions') &&
            !note.content.includes('table-scroll-container') &&
            !note.content.includes('table-resize-handle')) return;
        note.content = cleanTableHtml(note.content);
        changed = true;
    });
    if (changed) { saveData(appData); console.log('✅ Migrated old table HTML'); }
}

function cleanTableHtml(html) {
    if (!html) return html;
    if (!html.includes('table-actions') &&
        !html.includes('table-scroll-container') &&
        !html.includes('table-resize-handle')) return html;
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('.note-table-wrapper').forEach(wrapper => {
        const table = wrapper.querySelector('table');
        if (!table) { wrapper.remove(); return; }
        wrapper.querySelectorAll('.table-actions, .table-resize-handle').forEach(el => el.remove());
        const sc = wrapper.querySelector('.table-scroll-container');
        if (sc) { const tbl = sc.querySelector('table'); if (tbl) sc.replaceWith(tbl); }
        wrapper.removeAttribute('contenteditable');
        wrapper.querySelectorAll('th, td').forEach(cell => cell.setAttribute('contenteditable', 'true'));
        const tbl = wrapper.querySelector('table');
        if (tbl) { tbl.style.tableLayout = 'fixed'; tbl.style.width = '100%'; }
    });
    return temp.innerHTML;
}

/* ===== BIND EVENTS ===== */
function bindNotesEvents() {

    /* --- CLICK --- */
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#table-context-menu')) hideTableContextMenu();

        // --- Apply format painter on click in editor ---
        if (formatPainterStyles && e.target.closest('#note-content-editor')) {
            applyFormatPainter();
            return;
        }

        if (e.target.closest('#btn-create-note')) return createNewNote();
        if (e.target.closest('#btn-editor-back')) return closeEditor();
        if (e.target.closest('#btn-note-delete')) return deleteCurrentNote();
        if (e.target.closest('#btn-note-pin')) return togglePinCurrentNote();
        if (e.target.closest('#btn-note-image')) return document.getElementById('note-image-input')?.click();

        if (e.target.closest('#btn-undo')) { document.execCommand('undo'); scheduleAutoSave(); return; }
        if (e.target.closest('#btn-redo')) { document.execCommand('redo'); scheduleAutoSave(); return; }

        // Format Painter
        if (e.target.closest('#btn-format-painter')) { activateFormatPainter(); return; }

        // Font color
        if (e.target.closest('#btn-font-color')) {
            document.execCommand('foreColor', false, fontColor);
            document.getElementById('note-content-editor')?.focus();
            scheduleAutoSave();
            return;
        }

        // Highlight
        if (e.target.closest('#btn-highlight')) {
            document.execCommand('hiliteColor', false, highlightColor);
            document.getElementById('note-content-editor')?.focus();
            scheduleAutoSave();
            return;
        }

        // Remove highlight
        if (e.target.closest('#btn-remove-highlight')) {
            document.execCommand('hiliteColor', false, 'transparent');
            document.getElementById('note-content-editor')?.focus();
            scheduleAutoSave();
            return;
        }

        // To-do list (toggle)
        if (e.target.closest('#btn-todo-list')) { toggleTodoList(); return; }

        // Insert table
        if (e.target.closest('#btn-insert-table')) { openTableCreator(); return; }

        // View toggle
        if (e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn');
            if (btn.dataset.view) switchView(btn.dataset.view);
            return;
        }

        // Note card
        if (e.target.closest('.note-card-pin')) { e.stopPropagation(); const c = e.target.closest('.note-card'); if (c) togglePin(c.dataset.noteId); return; }
        if (e.target.closest('.note-card-delete')) { e.stopPropagation(); const c = e.target.closest('.note-card'); if (c) deleteNote(c.dataset.noteId); return; }
        if (e.target.closest('.note-card') && !e.target.closest('.note-card-action')) { const c = e.target.closest('.note-card'); if (c?.dataset.noteId) openNote(c.dataset.noteId); return; }

        // Image
        if (e.target.closest('.note-img-remove')) { e.stopPropagation(); const w = e.target.closest('.note-img-wrapper'); if (w) { w.remove(); scheduleAutoSave(); } return; }
        if (e.target.closest('.note-img-wrapper img')) { const img = e.target.closest('.note-img-wrapper img'); if (img) openLightbox(img.src, img.closest('.note-img-wrapper')); return; }

        // Toolbar: standard execCommand buttons
        // These are buttons with data-cmd that are NOT special
        const specialIds = ['#btn-todo-list', '#btn-insert-table', '#btn-remove-highlight',
            '#btn-highlight', '#btn-undo', '#btn-redo', '#btn-font-color', '#btn-format-painter'];
        const isSpecial = specialIds.some(sel => e.target.closest(sel));
        if (e.target.closest('.toolbar-btn[data-cmd]') && !isSpecial) {
            const btn = e.target.closest('.toolbar-btn[data-cmd]');
            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;
            if (cmd) {
                document.execCommand(cmd, false, value);
                document.getElementById('note-content-editor')?.focus();
                scheduleAutoSave();
            }
            return;
        }

        // Table modal
        if (e.target.closest('#btn-close-table-modal') || e.target.closest('#btn-cancel-table')) { closeTableCreator(); return; }
        if (e.target.closest('#btn-confirm-table')) { confirmInsertTable(); return; }

        // Todo checkbox
        if (e.target.closest('.todo-checkbox')) {
            const cb = e.target.closest('.todo-checkbox');
            const item = cb.closest('.todo-item');
            if (item) {
                item.classList.toggle('checked');
                cb.innerHTML = item.classList.contains('checked') ? '<i class="fas fa-check-square"></i>' : '<i class="far fa-square"></i>';
                scheduleAutoSave();
            }
            return;
        }

        // Context menu
        if (e.target.closest('.ctx-item')) { const a = e.target.closest('.ctx-item').dataset.action; if (a) handleTableContextAction(a); return; }

        // Lightbox
        if (e.target.closest('#lightbox-zoom-in')) { lightboxZoomIn(); return; }
        if (e.target.closest('#lightbox-zoom-out')) { lightboxZoomOut(); return; }
        if (e.target.closest('#lightbox-reset')) { lightboxResetZoom(); return; }
        if (e.target.closest('#lightbox-delete')) { lightboxDeleteImage(); return; }
        if (e.target.closest('#lightbox-close') || e.target.closest('.lightbox-backdrop')) { closeLightbox(); return; }
    });

    /* --- CONTEXT MENU --- */
    document.addEventListener('contextmenu', (e) => {
        const cell = e.target.closest('#note-content-editor .note-table-wrapper td, #note-content-editor .note-table-wrapper th');
        if (!cell) return;
        e.preventDefault();
        ctxTargetCell = cell;
        showTableContextMenu(e.clientX, e.clientY);
    });

    /* --- INPUT --- */
    document.addEventListener('input', (e) => {
        if (e.target.id === 'notes-search-input') { searchQuery = e.target.value.trim().toLowerCase(); renderNotesList(); }
        if (e.target.id === 'table-rows-input' || e.target.id === 'table-cols-input') updateTablePreview();
        if (e.target.id === 'note-color-picker') { applyEditorColor(e.target.value); scheduleAutoSave(); }
        if (e.target.id === 'highlight-color-picker') { highlightColor = e.target.value; updateHighlightBtnIndicator(); }
        if (e.target.id === 'font-color-picker') { fontColor = e.target.value; updateFontColorIndicator(); }
        if (e.target.id === 'note-title-input' || e.target.id === 'note-content-editor' || e.target.closest('#note-content-editor')) scheduleAutoSave();
    });

    /* --- CHANGE --- */
    document.addEventListener('change', (e) => {
        if (e.target.id === 'note-image-input') { handleImageUpload(e.target.files); e.target.value = ''; }
    });

    /* --- PASTE --- */
    document.addEventListener('paste', (e) => {
        if (e.target.id === 'note-content-editor' || e.target.closest('#note-content-editor')) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) { e.preventDefault(); handleImageUpload([item.getAsFile()]); return; }
            }
        }
    });

    /* --- KEYDOWN --- */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (formatPainterStyles) { cancelFormatPainter(); return; }
            const ctx = document.getElementById('table-context-menu');
            if (ctx && ctx.style.display !== 'none') { hideTableContextMenu(); return; }
            const lb = document.getElementById('note-lightbox');
            if (lb && lb.style.display !== 'none') { closeLightbox(); return; }
            const tm = document.getElementById('table-creator-modal');
            if (tm && tm.style.display !== 'none') { closeTableCreator(); return; }
        }

        // Tab in table
        if (e.key === 'Tab') {
            const cell = document.activeElement?.closest?.('#note-content-editor .note-table-wrapper td, #note-content-editor .note-table-wrapper th');
            if (cell) {
                e.preventDefault();
                const row = cell.parentElement;
                const table = cell.closest('table');
                if (!table) return;
                if (e.shiftKey) {
                    if (cell.previousElementSibling) cell.previousElementSibling.focus();
                    else if (row.previousElementSibling) row.previousElementSibling.cells[row.previousElementSibling.cells.length - 1]?.focus();
                } else {
                    if (cell.nextElementSibling) cell.nextElementSibling.focus();
                    else if (row.nextElementSibling) row.nextElementSibling.cells[0]?.focus();
                    else {
                        const cols = table.rows[0]?.cells.length || 1;
                        const nr = table.insertRow();
                        for (let c = 0; c < cols; c++) { const td = nr.insertCell(); td.contentEditable = 'true'; }
                        nr.cells[0]?.focus();
                        scheduleAutoSave();
                    }
                }
            }
        }
    });

    /* --- MOUSEDOWN: column & row resize --- */
    document.addEventListener('mousedown', (e) => {
        const cell = e.target.closest?.('#note-content-editor .note-table-wrapper td, #note-content-editor .note-table-wrapper th');
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        const table = cell.closest('table');
        if (!table) return;
        if (e.clientX >= rect.right - 5) { e.preventDefault(); initColumnResize(e, cell, table); return; }
        if (e.clientY >= rect.bottom - 5) { e.preventDefault(); initRowResize(e, cell, table); return; }
    });

    /* --- MOUSEMOVE: resize cursors --- */
    document.addEventListener('mousemove', (e) => {
        const cell = e.target.closest?.('#note-content-editor .note-table-wrapper td, #note-content-editor .note-table-wrapper th');
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        if (e.clientX >= rect.right - 5) cell.style.cursor = 'col-resize';
        else if (e.clientY >= rect.bottom - 5) cell.style.cursor = 'row-resize';
        else cell.style.cursor = 'text';
    });
}

/* ========================================
   FORMAT PAINTER
   ======================================== */

function activateFormatPainter() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        showToast('Chọn text cần sao chép định dạng trước', 'warning');
        return;
    }

    // Capture styles from selection
    const node = sel.anchorNode?.parentElement;
    if (!node) return;
    const cs = window.getComputedStyle(node);

    formatPainterStyles = {
        fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle,
        textDecoration: cs.textDecoration,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize
    };

    const btn = document.getElementById('btn-format-painter');
    if (btn) btn.classList.add('active');
    document.getElementById('note-content-editor')?.classList.add('format-painter-cursor');
}

function applyFormatPainter() {
    if (!formatPainterStyles) return;
    const s = formatPainterStyles;

    // Bold
    const isBold = parseInt(s.fontWeight) >= 700 || s.fontWeight === 'bold';
    if (isBold) document.execCommand('bold', false);

    // Italic
    if (s.fontStyle === 'italic') document.execCommand('italic', false);

    // Underline
    if (s.textDecoration.includes('underline')) document.execCommand('underline', false);

    // Strikethrough
    if (s.textDecoration.includes('line-through')) document.execCommand('strikeThrough', false);

    // Color
    if (s.color && s.color !== 'rgb(0, 0, 0)') document.execCommand('foreColor', false, s.color);

    // Background
    if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') {
        document.execCommand('hiliteColor', false, s.backgroundColor);
    }

    cancelFormatPainter();
    scheduleAutoSave();
}

function cancelFormatPainter() {
    formatPainterStyles = null;
    const btn = document.getElementById('btn-format-painter');
    if (btn) btn.classList.remove('active');
    document.getElementById('note-content-editor')?.classList.remove('format-painter-cursor');
}

/* ========================================
   COLOR INDICATORS
   ======================================== */

function updateHighlightBtnIndicator() {
    const btn = document.getElementById('btn-highlight');
    if (btn) btn.style.borderBottom = `3px solid ${highlightColor}`;
}

function updateFontColorIndicator() {
    const btn = document.getElementById('btn-font-color');
    if (btn) btn.style.borderBottom = `3px solid ${fontColor}`;
}

/* ========================================
   TO-DO LIST (toggle on/off)
   ======================================== */

function toggleTodoList() {
    const editor = document.getElementById('note-content-editor');
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Check if cursor is inside a todo-item
    const anchorNode = sel.anchorNode;
    const existingTodo = anchorNode?.closest?.('.todo-item') ||
                         anchorNode?.parentElement?.closest?.('.todo-item');

    if (existingTodo) {
        // Remove: convert todo back to plain paragraph
        const text = existingTodo.querySelector('.todo-text')?.textContent || '';
        const p = document.createElement('p');
        p.textContent = text || '\u00A0';
        existingTodo.replaceWith(p);

        // Place cursor in the new p
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        // Insert new todo on a new line
        const todoHtml = '<div class="todo-item"><span class="todo-checkbox" contenteditable="false"><i class="far fa-square"></i></span><span class="todo-text" contenteditable="true">&nbsp;</span></div>';

        // Ensure we're on a new block
        document.execCommand('insertParagraph', false);
        document.execCommand('insertHTML', false, todoHtml);

        // Focus the todo text
        requestAnimationFrame(() => {
            const allTodos = editor.querySelectorAll('.todo-item .todo-text');
            const last = allTodos[allTodos.length - 1];
            if (last) {
                const r = document.createRange();
                r.selectNodeContents(last);
                r.collapse(false);
                sel.removeAllRanges();
                sel.addRange(r);
            }
        });
    }
    scheduleAutoSave();
}

/* ========================================
   TABLE RESIZE
   ======================================== */

function initColumnResize(e, cell, table) {
    table.style.tableLayout = 'fixed';
    const hc = table.rows[0]?.cells;
    if (!hc) return;
    const widths = [];
    for (let i = 0; i < hc.length; i++) widths.push(hc[i].offsetWidth);
    for (let i = 0; i < hc.length; i++) hc[i].style.width = widths[i] + 'px';
    const ci = cell.cellIndex;
    const startX = e.clientX;
    const startW = widths[ci];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => { hc[ci].style.width = Math.max(30, startW + (ev.clientX - startX)) + 'px'; };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; scheduleAutoSave(); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

function initRowResize(e, cell, table) {
    const row = cell.parentElement;
    const startY = e.clientY;
    const startH = row.offsetHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => { row.style.height = Math.max(24, startH + (ev.clientY - startY)) + 'px'; };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; scheduleAutoSave(); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

/* ========================================
   TABLE CONTEXT MENU
   ======================================== */

function showTableContextMenu(x, y) {
    const menu = document.getElementById('table-context-menu');
    if (!menu) return;
    menu.style.display = 'block';
    requestAnimationFrame(() => {
        const mW = menu.offsetWidth || 220, mH = menu.offsetHeight || 300;
        menu.style.left = Math.max(0, Math.min(x, window.innerWidth - mW - 8)) + 'px';
        menu.style.top = Math.max(0, Math.min(y, window.innerHeight - mH - 8)) + 'px';
    });
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
    const ri = ctxTargetCell.parentElement.rowIndex;
    const ci = ctxTargetCell.cellIndex;
    const tR = table.rows.length;
    const tC = table.rows[0]?.cells.length || 0;
    switch (action) {
        case 'insert-row-above': insertRowAt(table, ri, tC); break;
        case 'insert-row-below': insertRowAt(table, ri + 1, tC); break;
        case 'insert-col-left': insertColAt(table, ci); break;
        case 'insert-col-right': insertColAt(table, ci + 1); break;
        case 'delete-row': if (tR <= 1) { wrapper?.remove(); } else table.deleteRow(ri); break;
        case 'delete-col':
            if (tC <= 1) { wrapper?.remove(); }
            else { for (let r = 0; r < table.rows.length; r++) { if (ci < table.rows[r].cells.length) table.rows[r].deleteCell(ci); } recalcColWidths(table); }
            break;
        case 'clear-cell': ctxTargetCell.innerHTML = ''; break;
        case 'delete-table': wrapper?.remove(); break;
    }
    ctxTargetCell = null;
    scheduleAutoSave();
}

function insertRowAt(table, at, cols) {
    const nr = table.insertRow(at);
    for (let c = 0; c < cols; c++) { const cell = nr.insertCell(); cell.contentEditable = 'true'; }
}

function insertColAt(table, at) {
    for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r];
        const isH = (r === 0 && row.cells[0]?.tagName === 'TH');
        const cell = document.createElement(isH ? 'th' : 'td');
        cell.contentEditable = 'true';
        if (at >= row.cells.length) row.appendChild(cell);
        else row.insertBefore(cell, row.cells[at]);
    }
    recalcColWidths(table);
}

function recalcColWidths(table) {
    const hc = table.rows[0]?.cells;
    if (!hc) return;
    table.style.tableLayout = 'auto';
    for (let i = 0; i < hc.length; i++) hc[i].style.width = '';
    void table.offsetWidth;
    table.style.tableLayout = 'fixed';
    for (let i = 0; i < hc.length; i++) hc[i].style.width = hc[i].offsetWidth + 'px';
}

/* ========================================
   NOTES CRUD
   ======================================== */

function createNewNote() {
    const note = { id: generateId(), title: '', content: '', images: [], color: '#ffffff', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
    if (contentEditor) contentEditor.innerHTML = cleanTableHtml(note.content || '');
    if (colorPicker) colorPicker.value = note.color || '#ffffff';
    if (pinBtn) pinBtn.classList.toggle('active', note.pinned);
    if (imagesContainer) renderNoteImages(note.images || [], imagesContainer);
    applyEditorColor(note.color || '#ffffff');
    updateHighlightBtnIndicator();
    updateFontColorIndicator();
    editor.style.display = 'flex';
    updateSaveStatus('saved');
    if (!note.title && titleInput) titleInput.focus();
    else if (contentEditor) contentEditor.focus();
}

function closeEditor() {
    saveCurrentNote();
    cancelFormatPainter();
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
    const ic = document.getElementById('note-images');
    if (ic) note.images = Array.from(ic.querySelectorAll('.note-img-wrapper img')).map(img => img.src);
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
    if (status === 'saving') { el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...'; el.className = 'note-save-status saving'; }
    else { el.innerHTML = '<i class="fas fa-check"></i> Đã lưu'; el.className = 'note-save-status saved'; }
}

function deleteCurrentNote() { if (currentNoteId) deleteNote(currentNoteId); }

function deleteNote(noteId) {
    const note = appData.notes?.find(n => n.id === noteId);
    if (!note) return;
    window.showConfirm({ title: 'Xóa ghi chú', message: `Xóa "${escapeHtml(note.title || 'Không tiêu đề')}"?`, submessage: 'Hành động này không thể hoàn tác.', type: 'danger', confirmText: 'Xóa', icon: 'fas fa-trash',
        onConfirm: () => {
            appData.notes = appData.notes.filter(n => n.id !== noteId);
            saveData(appData);
            showSuccess('Đã xóa ghi chú!');
            if (currentNoteId === noteId) { document.getElementById('note-editor').style.display = 'none'; currentNoteId = null; }
            renderNotesList();
        }
    });
}

function togglePin(noteId) {
    const note = appData.notes?.find(n => n.id === noteId);
    if (!note) return;
    note.pinned = !note.pinned; saveData(appData); renderNotesList();
    showToast(note.pinned ? 'Đã ghim' : 'Đã bỏ ghim', 'success');
}

function togglePinCurrentNote() {
    if (!currentNoteId) return;
    const note = appData.notes?.find(n => n.id === currentNoteId);
    if (!note) return;
    note.pinned = !note.pinned; saveData(appData);
    document.getElementById('btn-note-pin')?.classList.toggle('active', note.pinned);
    showToast(note.pinned ? 'Đã ghim' : 'Đã bỏ ghim', 'success');
}

/* ========================================
   TABLE CREATE
   ======================================== */

function openTableCreator() {
    const modal = document.getElementById('table-creator-modal');
    if (!modal) return;
    document.getElementById('table-rows-input').value = 3;
    document.getElementById('table-cols-input').value = 3;
    modal.style.display = 'flex';
    updateTablePreview();
}

function closeTableCreator() { const m = document.getElementById('table-creator-modal'); if (m) m.style.display = 'none'; }

function updateTablePreview() {
    const rows = clamp(parseInt(document.getElementById('table-rows-input')?.value) || 3, 1, 20);
    const cols = clamp(parseInt(document.getElementById('table-cols-input')?.value) || 3, 1, 10);
    const preview = document.getElementById('table-preview');
    if (!preview) return;
    let html = '<table>';
    for (let r = 0; r < Math.min(rows, 5); r++) { html += '<tr>'; for (let c = 0; c < Math.min(cols, 6); c++) html += r === 0 ? `<th>Cột ${c+1}</th>` : '<td></td>'; html += '</tr>'; }
    if (rows > 5) html += `<tr><td colspan="${Math.min(cols,6)}" style="text-align:center;color:var(--text-muted);">...</td></tr>`;
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
    const cw = Math.max(60, Math.floor(700 / cols));
    let html = '<div class="note-table-wrapper"><table style="table-layout:fixed;width:100%;">';
    for (let r = 0; r < rows; r++) { html += '<tr>'; for (let c = 0; c < cols; c++) html += r === 0 ? `<th contenteditable="true" style="width:${cw}px;"></th>` : '<td contenteditable="true"></td>'; html += '</tr>'; }
    html += '</table></div><p><br></p>';
    editor.focus();
    document.execCommand('insertHTML', false, html);
    scheduleAutoSave();
}

/* ========================================
   IMAGES
   ======================================== */

function handleImageUpload(files) {
    if (!files || !files.length) return;
    const container = document.getElementById('note-images');
    if (!container) return;
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Ảnh quá lớn (tối đa 5MB)', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (e) => { compressImage(e.target.result, 800, 0.8).then(c => { addImageToEditor(c, container); scheduleAutoSave(); }); };
        reader.readAsDataURL(file);
    });
}

function compressImage(dataUrl, maxWidth, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { if (img.width <= maxWidth) { resolve(dataUrl); return; } const c = document.createElement('canvas'); const r = maxWidth / img.width; c.width = maxWidth; c.height = img.height * r; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL('image/jpeg', quality)); };
        img.src = dataUrl;
    });
}

function addImageToEditor(src, container) {
    const w = document.createElement('div');
    w.className = 'note-img-wrapper';
    w.innerHTML = `<img src="${src}" alt="Note image"><button class="note-img-remove" title="Xóa ảnh"><i class="fas fa-times"></i></button>`;
    container.appendChild(w);
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
    const lb = document.getElementById('note-lightbox'), img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    lightboxCurrentSrc = src; lightboxWrapperRef = wrapperEl || null; lightboxZoom = 1;
    img.src = src; img.style.transform = 'scale(1)'; lb.style.display = 'flex'; document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('note-lightbox');
    if (lb) lb.style.display = 'none';
    document.body.style.overflow = ''; lightboxCurrentSrc = null; lightboxWrapperRef = null;
}

function lightboxZoomIn() { lightboxZoom = Math.min(lightboxZoom + 0.25, 4); applyLightboxZoom(); }
function lightboxZoomOut() { lightboxZoom = Math.max(lightboxZoom - 0.25, 0.25); applyLightboxZoom(); }
function lightboxResetZoom() { lightboxZoom = 1; applyLightboxZoom(); }
function applyLightboxZoom() { const img = document.getElementById('lightbox-img'); if (img) img.style.transform = `scale(${lightboxZoom})`; }

function lightboxDeleteImage() {
    if (!lightboxWrapperRef) { closeLightbox(); return; }
    window.showConfirm({ title: 'Xóa ảnh', message: 'Xóa ảnh này khỏi ghi chú?', type: 'danger', confirmText: 'Xóa', icon: 'fas fa-trash',
        onConfirm: () => { lightboxWrapperRef.remove(); closeLightbox(); scheduleAutoSave(); showSuccess('Đã xóa ảnh!'); }
    });
}

/* ========================================
   HELPERS
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

function renderNotesList() {
    const container = document.getElementById('notes-container');
    const emptyEl = document.getElementById('notes-empty');
    const countEl = document.getElementById('notes-count');
    if (!container) return;
    let notes = appData.notes || [];
    if (searchQuery) notes = notes.filter(n => (n.title || '').toLowerCase().includes(searchQuery) || stripHtml(n.content || '').toLowerCase().includes(searchQuery));
    notes.sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return new Date(b.updatedAt) - new Date(a.updatedAt); });
    if (countEl) countEl.textContent = `${notes.length} ghi chú`;
    if (notes.length === 0) { container.innerHTML = ''; if (emptyEl) emptyEl.style.display = 'flex'; return; }
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
        return `<div class="note-card ${note.pinned ? 'pinned' : ''}" data-note-id="${note.id}" style="background:${bgColor};">
            ${note.pinned ? '<div class="note-pin-badge"><i class="fas fa-thumbtack"></i></div>' : ''}
            ${firstImage ? `<div class="note-card-image"><img src="${firstImage}" alt=""></div>` : ''}
            <div class="note-card-body"><h4 class="note-card-title">${escapeHtml(title)}</h4>${preview ? `<p class="note-card-preview">${escapeHtml(preview)}</p>` : ''}</div>
            <div class="note-card-footer"><span class="note-card-date">${date}</span><div class="note-card-actions-row">${hasImages ? `<span class="note-card-img-count"><i class="fas fa-image"></i> ${note.images.length}</span>` : ''}
            <button class="note-card-action note-card-pin" title="${note.pinned ? 'Bỏ ghim' : 'Ghim'}"><i class="fas fa-thumbtack"></i></button>
            <button class="note-card-action note-card-delete" title="Xóa"><i class="fas fa-trash"></i></button></div></div></div>`;
    }).join('');
}

function stripHtml(html) { const t = document.createElement('div'); t.innerHTML = html; return t.textContent || ''; }
function formatRelativeDate(d) { if (!d) return ''; const diff = Date.now() - new Date(d); const m = Math.floor(diff / 60000); if (m < 1) return 'Vừa xong'; if (m < 60) return m + ' phút trước'; const h = Math.floor(m / 60); if (h < 24) return h + ' giờ trước'; const days = Math.floor(h / 24); if (days < 7) return days + ' ngày trước'; return new Date(d).toLocaleDateString('vi-VN'); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

window.initNotes = initNotes;
