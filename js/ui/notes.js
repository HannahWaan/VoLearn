/* ============================================
   VoLearn – Notes Module v2.5.2
   Full toolbar, tables, images – ES Module
   ============================================ */

/* ---------- state ---------- */
let currentNoteId = null;
let currentView = localStorage.getItem('notesView') || 'grid';
let searchQuery = '';
let autoSaveTimer = null;
let highlightColor = '#ffff00';
let fontColor = '#ff0000';

let formatPainterActive = false;
let formatPainterStyles = null;

let resizingCol = null;
let resizingRow = null;
let resizeStart = 0;
let resizeInitial = 0;

let contextCell = null;

let lightboxZoom = 1;
let currentLightboxIndex = -1;

const DARK_COLORS = {
  '#1a1a2e': true, '#16213e': true, '#0f3460': true,
  '#1b1b2f': true, '#162447': true, '#1f4068': true,
  '#2d132c': true, '#3a0ca3': true
};

/* ==========================================
   INIT
   ========================================== */
function initNotes() {
  if (!window.appData) window.appData = {};
  if (!window.appData.notes) window.appData.notes = [];
  migrateOldTables();
  bindNotesEvents();
  switchView(currentView);
  renderNotesList();
}

/* ---------- migrate old table HTML ---------- */
function migrateOldTables() {
  let changed = false;
  window.appData.notes.forEach(note => {
    if (!note.content) return;
    let html = note.content;
    const before = html;
    html = html.replace(/<div class="table-actions">[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<div class="table-resize-handle">[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<div class="table-scroll-container">([\s\S]*?)<\/div>/gi, '$1');
    html = html.replace(/contenteditable="false"/gi, '');
    html = html.replace(/<(td|th)(?![^>]*contenteditable)/gi, '<$1 contenteditable="true"');
    if (html !== before) { note.content = html; changed = true; }
  });
  if (changed && typeof saveData === 'function') saveData();
}

function cleanTableHtml(html) {
  if (!html) return html;
  html = html.replace(/<div class="table-actions">[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<div class="table-resize-handle">[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<div class="table-scroll-container">([\s\S]*?)<\/div>/gi, '$1');
  html = html.replace(/contenteditable="false"/gi, '');
  html = html.replace(/<(td|th)(?![^>]*contenteditable)/gi, '<$1 contenteditable="true"');
  return html;
}

/* ==========================================
   EVENT BINDING
   ========================================== */
function bindNotesEvents() {

  /* --- clicks --- */
  document.addEventListener('click', function (e) {
    const t = e.target;

    if (t.closest('#create-note-btn')) { createNewNote(); return; }

    if (t.closest('.view-btn')) {
      const btn = t.closest('.view-btn');
      const v = btn.dataset.view;
      if (v) switchView(v);
      return;
    }

    if (t.closest('#editor-back-btn')) { closeEditor(); return; }
    if (t.closest('#editor-pin-btn')) { togglePin(); return; }
    if (t.closest('#editor-delete-btn')) {
      if (currentNoteId && confirm('Xóa ghi chú này?')) deleteNote(currentNoteId);
      return;
    }
    if (t.closest('#editor-image-btn')) {
      document.getElementById('note-image-input').click();
      return;
    }

    // Undo / Redo
    if (t.closest('#toolbar-undo')) { document.execCommand('undo'); scheduleAutoSave(); return; }
    if (t.closest('#toolbar-redo')) { document.execCommand('redo'); scheduleAutoSave(); return; }

    // Format painter
    if (t.closest('#toolbar-format-painter')) { activateFormatPainter(); return; }

    // Font color
    if (t.closest('#toolbar-font-color')) {
      document.getElementById('font-color-picker').click();
      return;
    }

    // Highlight
    if (t.closest('#toolbar-highlight')) {
      document.execCommand('hiliteColor', false, highlightColor);
      scheduleAutoSave();
      return;
    }

    // Todo
    if (t.closest('#toolbar-todo')) { toggleTodoList(); return; }

    // Table
    if (t.closest('#toolbar-table')) { openTableCreator(); return; }
    if (t.closest('#table-cancel-btn')) { closeTableCreator(); return; }
    if (t.closest('#table-confirm-btn')) { confirmInsertTable(); return; }

    // Heading buttons
    const headBtn = t.closest('.toolbar-heading');
    if (headBtn) {
      document.execCommand('formatBlock', false, headBtn.dataset.heading);
      scheduleAutoSave();
      return;
    }

    // Generic toolbar commands
    const cmdBtn = t.closest('.toolbar-btn[data-cmd]');
    if (cmdBtn) {
      document.execCommand(cmdBtn.dataset.cmd, false, cmdBtn.dataset.value || null);
      scheduleAutoSave();
      return;
    }

    // Note card
    const card = t.closest('.note-card');
    if (card && !t.closest('.note-card-actions')) { openNote(card.dataset.id); return; }
    if (t.closest('.card-pin-btn')) { togglePinById(t.closest('.note-card').dataset.id); return; }
    if (t.closest('.card-delete-btn')) {
      const id = t.closest('.note-card').dataset.id;
      if (confirm('Xóa ghi chú này?')) deleteNote(id);
      return;
    }

    // Images
    if (t.closest('.remove-img')) {
      removeNoteImage(parseInt(t.closest('.note-img-wrapper').dataset.index));
      return;
    }
    if (t.closest('.note-img-wrapper img')) {
      openLightbox(parseInt(t.closest('.note-img-wrapper').dataset.index));
      return;
    }

    // Lightbox
    if (t.closest('#lightbox-zoom-in')) { lightboxZoom = Math.min(lightboxZoom + 0.3, 5); applyLightboxZoom(); return; }
    if (t.closest('#lightbox-zoom-out')) { lightboxZoom = Math.max(lightboxZoom - 0.3, 0.3); applyLightboxZoom(); return; }
    if (t.closest('#lightbox-reset')) { lightboxZoom = 1; applyLightboxZoom(); return; }
    if (t.closest('#lightbox-delete')) { deleteLightboxImage(); return; }
    if (t.closest('#lightbox-close')) { closeLightbox(); return; }

    // Table context menu action
    const ctxBtn = t.closest('.table-context-menu button');
    if (ctxBtn) { handleTableContextAction(ctxBtn.dataset.action); return; }

    // Hide context menu
    hideTableContextMenu();

    // Format painter apply
    if (formatPainterActive) { applyFormatPainter(); return; }

    // Lightbox bg close
    if (t.closest('.note-lightbox') && !t.closest('.lightbox-controls') && !t.closest('.lightbox-image')) {
      closeLightbox();
    }
  });

  /* --- context menu --- */
  document.addEventListener('contextmenu', function (e) {
    const cell = e.target.closest('#note-content-editor td, #note-content-editor th');
    if (cell) {
      e.preventDefault();
      contextCell = cell;
      showTableContextMenu(e.clientX, e.clientY);
    }
  });

  /* --- input --- */
  document.addEventListener('input', function (e) {
    if (e.target.closest('#note-content-editor') || e.target.closest('#note-title-input')) {
      scheduleAutoSave();
    }
    if (e.target.id === 'notes-search-input') {
      searchQuery = e.target.value.toLowerCase().trim();
      renderNotesList();
    }
    if (e.target.id === 'table-rows-input' || e.target.id === 'table-cols-input') {
      updateTablePreview();
    }
  });

  /* --- change --- */
  document.addEventListener('change', function (e) {
    if (e.target.id === 'font-color-picker') {
      fontColor = e.target.value;
      document.getElementById('font-color-indicator').style.background = fontColor;
      document.execCommand('foreColor', false, fontColor);
      scheduleAutoSave();
    }
    if (e.target.id === 'highlight-color-picker') {
      highlightColor = e.target.value;
      document.getElementById('highlight-color-indicator').style.background = highlightColor;
    }
    if (e.target.id === 'note-color-input') {
      const c = e.target.value;
      applyEditorColor(c);
      if (currentNoteId) {
        const note = appData.notes.find(n => n.id === currentNoteId);
        if (note) { note.color = c; scheduleAutoSave(); }
      }
    }
    if (e.target.id === 'note-image-input') {
      handleImageUpload(e.target.files);
      e.target.value = '';
    }
    if (e.target.closest('.todo-item input[type="checkbox"]')) {
      const item = e.target.closest('.todo-item');
      if (e.target.checked) item.classList.add('checked');
      else item.classList.remove('checked');
      scheduleAutoSave();
    }
  });

  /* --- keyboard --- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.getElementById('note-lightbox').style.display !== 'none') { closeLightbox(); return; }
      if (formatPainterActive) { cancelFormatPainter(); return; }
      if (document.getElementById('table-creator-modal').style.display !== 'none') { closeTableCreator(); return; }
      hideTableContextMenu();
      if (document.getElementById('note-editor').style.display !== 'none') { closeEditor(); return; }
    }
    if (e.key === 'Tab' && e.target.closest('#note-content-editor td, #note-content-editor th')) {
      e.preventDefault();
      navigateTableCell(e.target.closest('td,th'), e.shiftKey);
    }
  });

  /* --- mouse: table resize --- */
  document.addEventListener('mousedown', function (e) {
    const cell = e.target.closest('#note-content-editor th, #note-content-editor td');
    if (cell) {
      const rect = cell.getBoundingClientRect();
      if (Math.abs(e.clientX - rect.right) < 6) {
        e.preventDefault(); initColumnResize(cell, e.clientX); return;
      }
      if (Math.abs(e.clientY - rect.bottom) < 6) {
        e.preventDefault(); initRowResize(cell, e.clientY); return;
      }
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (resizingCol) {
      resizingCol.style.width = Math.max(40, resizeInitial + e.clientX - resizeStart) + 'px';
      return;
    }
    if (resizingRow) {
      resizingRow.style.height = Math.max(20, resizeInitial + e.clientY - resizeStart) + 'px';
      return;
    }
    const cell = e.target.closest('#note-content-editor th, #note-content-editor td');
    if (cell) {
      const rect = cell.getBoundingClientRect();
      if (Math.abs(e.clientX - rect.right) < 6) cell.style.cursor = 'col-resize';
      else if (Math.abs(e.clientY - rect.bottom) < 6) cell.style.cursor = 'row-resize';
      else cell.style.cursor = '';
    }
  });

  document.addEventListener('mouseup', function () {
    if (resizingCol) { resizingCol = null; scheduleAutoSave(); }
    if (resizingRow) { resizingRow = null; scheduleAutoSave(); }
  });
}

/* ==========================================
   FORMAT PAINTER
   ========================================== */
function activateFormatPainter() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return;
  const node = sel.anchorNode.parentElement;
  const cs = window.getComputedStyle(node);
  formatPainterStyles = {
    fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
    textDecoration: cs.textDecoration, color: cs.color,
    backgroundColor: cs.backgroundColor, fontSize: cs.fontSize
  };
  formatPainterActive = true;
  document.getElementById('toolbar-format-painter').classList.add('active');
  document.getElementById('note-content-editor').style.cursor = 'crosshair';
}

function applyFormatPainter() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed || !formatPainterStyles) { cancelFormatPainter(); return; }
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  Object.assign(span.style, formatPainterStyles);
  try { range.surroundContents(span); } catch (ex) {}
  cancelFormatPainter();
  scheduleAutoSave();
}

function cancelFormatPainter() {
  formatPainterActive = false;
  formatPainterStyles = null;
  document.getElementById('toolbar-format-painter').classList.remove('active');
  const ed = document.getElementById('note-content-editor');
  if (ed) ed.style.cursor = '';
}

/* ==========================================
   TODO LIST
   ========================================== */
function toggleTodoList() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.anchorNode;
  const todoItem = (node.nodeType === 3 ? node.parentElement : node).closest('.todo-item');

  if (todoItem) {
    const text = todoItem.querySelector('.todo-text')?.textContent || '';
    const p = document.createElement('p');
    p.textContent = text;
    todoItem.replaceWith(p);
    const r = document.createRange();
    r.selectNodeContents(p); r.collapse(false);
    sel.removeAllRanges(); sel.addRange(r);
  } else {
    const div = document.createElement('div');
    div.className = 'todo-item';
    div.innerHTML = '<input type="checkbox"><span class="todo-text" contenteditable="true">Việc cần làm</span>';
    const range = sel.getRangeAt(0);
    range.collapse(false);
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.insertNode(div);
    const textSpan = div.querySelector('.todo-text');
    const r = document.createRange();
    r.selectNodeContents(textSpan);
    sel.removeAllRanges(); sel.addRange(r);
  }
  scheduleAutoSave();
}

/* ==========================================
   TABLE
   ========================================== */
function openTableCreator() {
  document.getElementById('table-creator-modal').style.display = '';
  updateTablePreview();
}
function closeTableCreator() {
  document.getElementById('table-creator-modal').style.display = 'none';
}

function updateTablePreview() {
  const rows = clamp(parseInt(document.getElementById('table-rows-input').value) || 3, 1, 20);
  const cols = clamp(parseInt(document.getElementById('table-cols-input').value) || 3, 1, 10);
  let h = '<table><thead><tr>';
  for (let c = 0; c < cols; c++) h += '<th>Cột ' + (c + 1) + '</th>';
  h += '</tr></thead><tbody>';
  for (let r = 0; r < rows - 1; r++) {
    h += '<tr>';
    for (let c = 0; c < cols; c++) h += '<td></td>';
    h += '</tr>';
  }
  h += '</tbody></table>';
  document.getElementById('table-creator-preview').innerHTML = h;
}

function confirmInsertTable() {
  const rows = clamp(parseInt(document.getElementById('table-rows-input').value) || 3, 1, 20);
  const cols = clamp(parseInt(document.getElementById('table-cols-input').value) || 3, 1, 10);
  insertTable(rows, cols);
  closeTableCreator();
}

function insertTable(rows, cols) {
  const editor = document.getElementById('note-content-editor');
  let h = '<div class="note-table-wrapper"><table style="width:100%;table-layout:fixed;border-collapse:collapse"><thead><tr>';
  for (let c = 0; c < cols; c++) h += '<th contenteditable="true" style="min-width:60px">Tiêu đề</th>';
  h += '</tr></thead><tbody>';
  for (let r = 0; r < rows - 1; r++) {
    h += '<tr>';
    for (let c = 0; c < cols; c++) h += '<td contenteditable="true"></td>';
    h += '</tr>';
  }
  h += '</tbody></table></div><p><br></p>';

  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0); range.collapse(false);
    const tmp = document.createElement('div'); tmp.innerHTML = h;
    const frag = document.createDocumentFragment();
    while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    range.insertNode(frag);
  } else {
    editor.insertAdjacentHTML('beforeend', h);
  }
  scheduleAutoSave();
}

function navigateTableCell(cell, reverse) {
  const table = cell.closest('table');
  if (!table) return;
  const cells = Array.from(table.querySelectorAll('td, th'));
  let idx = cells.indexOf(cell) + (reverse ? -1 : 1);
  if (idx >= 0 && idx < cells.length) {
    cells[idx].focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(cells[idx]); r.collapse(false);
    sel.removeAllRanges(); sel.addRange(r);
  }
}

function initColumnResize(cell, startX) {
  resizingCol = cell; resizeStart = startX; resizeInitial = cell.offsetWidth;
}
function initRowResize(cell, startY) {
  resizingRow = cell.closest('tr'); resizeStart = startY; resizeInitial = resizingRow.offsetHeight;
}

function showTableContextMenu(x, y) {
  const menu = document.getElementById('table-context-menu');
  menu.style.display = 'block'; menu.style.left = x + 'px'; menu.style.top = y + 'px';
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
  });
}
function hideTableContextMenu() {
  document.getElementById('table-context-menu').style.display = 'none';
}

function handleTableContextAction(action) {
  hideTableContextMenu();
  if (!contextCell) return;
  const table = contextCell.closest('table');
  const tr = contextCell.closest('tr');
  if (!table || !tr) return;
  const ci = Array.from(tr.children).indexOf(contextCell);

  switch (action) {
    case 'insertRowAbove': tr.parentNode.insertBefore(createEmptyRow(tr.children.length), tr); break;
    case 'insertRowBelow': tr.parentNode.insertBefore(createEmptyRow(tr.children.length), tr.nextSibling); break;
    case 'insertColLeft':
      table.querySelectorAll('tr').forEach(row => {
        const c = document.createElement(row.closest('thead') ? 'th' : 'td');
        c.contentEditable = 'true'; row.insertBefore(c, row.children[ci]);
      }); break;
    case 'insertColRight':
      table.querySelectorAll('tr').forEach(row => {
        const ref = row.children[ci];
        const c = document.createElement(row.closest('thead') ? 'th' : 'td');
        c.contentEditable = 'true'; row.insertBefore(c, ref ? ref.nextSibling : null);
      }); break;
    case 'deleteRow':
      if (table.querySelectorAll('tr').length <= 1) { (table.closest('.note-table-wrapper') || table).remove(); }
      else tr.remove();
      break;
    case 'deleteCol': {
      const total = table.querySelector('tr').children.length;
      if (total <= 1) { (table.closest('.note-table-wrapper') || table).remove(); }
      else table.querySelectorAll('tr').forEach(row => { if (row.children[ci]) row.children[ci].remove(); });
      break;
    }
    case 'clearCell': contextCell.innerHTML = ''; break;
    case 'deleteTable': (table.closest('.note-table-wrapper') || table).remove(); break;
  }
  contextCell = null;
  scheduleAutoSave();
}

function createEmptyRow(colCount) {
  const tr = document.createElement('tr');
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.contentEditable = 'true'; tr.appendChild(td);
  }
  return tr;
}

/* ==========================================
   IMAGE HANDLING
   ========================================== */
function handleImageUpload(files) {
  if (!files || !currentNoteId) return;
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  if (!note.images) note.images = [];
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    compressImage(file, 800, 0.8, function (dataUrl) {
      if (dataUrl.length > 5 * 1024 * 1024) return;
      note.images.push(dataUrl);
      renderNoteImages(note.images);
      scheduleAutoSave();
    });
  });
}

function compressImage(file, maxDim, quality, cb) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderNoteImages(images) {
  const container = document.getElementById('note-images');
  if (!container) return;
  container.innerHTML = '';
  (images || []).forEach((src, i) => {
    const w = document.createElement('div');
    w.className = 'note-img-wrapper'; w.dataset.index = i;
    w.innerHTML = '<img src="' + src + '" alt=""><button class="remove-img"><i class="fas fa-times"></i></button>';
    container.appendChild(w);
  });
}

function removeNoteImage(index) {
  if (!currentNoteId) return;
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note || !note.images) return;
  note.images.splice(index, 1);
  renderNoteImages(note.images);
  scheduleAutoSave();
}

/* ==========================================
   LIGHTBOX
   ========================================== */
function openLightbox(index) {
  if (!currentNoteId) return;
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note || !note.images || !note.images[index]) return;
  currentLightboxIndex = index; lightboxZoom = 1;
  document.getElementById('lightbox-image').src = note.images[index];
  document.getElementById('note-lightbox').style.display = '';
  applyLightboxZoom();
}
function closeLightbox() {
  document.getElementById('note-lightbox').style.display = 'none';
  currentLightboxIndex = -1;
}
function applyLightboxZoom() {
  document.getElementById('lightbox-image').style.transform = 'scale(' + lightboxZoom + ')';
}
function deleteLightboxImage() {
  if (currentLightboxIndex < 0 || !currentNoteId) return;
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note || !note.images) return;
  note.images.splice(currentLightboxIndex, 1);
  renderNoteImages(note.images);
  closeLightbox();
  scheduleAutoSave();
}

/* ==========================================
   NOTE CRUD
   ========================================== */
function createNewNote() {
  const note = {
    id: 'note_' + Date.now(), title: '', content: '',
    color: '#1a1a2e', pinned: false, images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  appData.notes.unshift(note);
  openNote(note.id);
}

function openNote(id) {
  const note = appData.notes.find(n => n.id === id);
  if (!note) return;
  currentNoteId = id;
  document.getElementById('note-title-input').value = note.title || '';
  document.getElementById('note-content-editor').innerHTML = cleanTableHtml(note.content) || '';
  document.getElementById('note-color-input').value = note.color || '#1a1a2e';
  applyEditorColor(note.color || '#1a1a2e');
  document.getElementById('editor-pin-btn').classList.toggle('pinned', !!note.pinned);
  renderNoteImages(note.images);
  document.getElementById('note-editor').style.display = '';
}

function closeEditor() {
  saveCurrentNote();
  document.getElementById('note-editor').style.display = 'none';
  currentNoteId = null;
  renderNotesList();
}

function saveCurrentNote() {
  if (!currentNoteId) return;
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.title = document.getElementById('note-title-input').value.trim();
  note.content = document.getElementById('note-content-editor').innerHTML;
  note.updatedAt = new Date().toISOString();
  if (typeof saveData === 'function') saveData();
  showSaveStatus();
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveCurrentNote, 800);
}

function showSaveStatus() {
  const el = document.getElementById('save-status');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

function deleteNote(id) {
  appData.notes = appData.notes.filter(n => n.id !== id);
  if (typeof saveData === 'function') saveData();
  if (currentNoteId === id) {
    document.getElementById('note-editor').style.display = 'none';
    currentNoteId = null;
  }
  renderNotesList();
}

function togglePin() {
  if (!currentNoteId) return;
  togglePinById(currentNoteId);
  const note = appData.notes.find(n => n.id === currentNoteId);
  document.getElementById('editor-pin-btn').classList.toggle('pinned', note && note.pinned);
}

function togglePinById(id) {
  const note = appData.notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  if (typeof saveData === 'function') saveData();
  renderNotesList();
}

/* ==========================================
   EDITOR HELPERS
   ========================================== */
function applyEditorColor(color) {
  const editor = document.getElementById('note-editor');
  if (!editor) return;
  const isDark = DARK_COLORS[color] || isColorDark(color);
  editor.style.background = color;
  document.getElementById('note-title-input').style.color = isDark ? '#ffffff' : '#1a1a2e';
  editor.style.color = isDark ? '#e0e0e0' : '#1a1a2e';
}

function isColorDark(hex) {
  if (!hex || hex.charAt(0) !== '#') return true;
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

/* ==========================================
   VIEW / RENDER
   ========================================== */
function switchView(view) {
  currentView = view;
  localStorage.setItem('notesView', view);
  document.getElementById('notes-container').classList.toggle('list-view', view === 'list');
  document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function renderNotesList() {
  const grid = document.getElementById('notes-grid');
  const emptyEl = document.getElementById('notes-empty');
  const countEl = document.getElementById('notes-count');
  if (!grid) return;

  let notes = appData.notes || [];
  if (searchQuery) {
    notes = notes.filter(n =>
      (n.title || '').toLowerCase().includes(searchQuery) ||
      stripHtml(n.content || '').toLowerCase().includes(searchQuery)
    );
  }
  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  countEl.textContent = notes.length;

  if (!notes.length) {
    grid.innerHTML = '';
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';

  grid.innerHTML = notes.map(note => {
    const preview = stripHtml(note.content || '').substring(0, 120);
    const date = formatRelativeDate(note.updatedAt);
    const img = (note.images && note.images.length)
      ? '<img class="note-card-image" src="' + note.images[0] + '" alt="">' : '';
    return `
      <div class="note-card${note.pinned ? ' pinned' : ''}" data-id="${note.id}" style="border-left:4px solid ${note.color || '#1a1a2e'}">
        ${img}
        <div class="note-card-body">
          <div class="note-card-title">${escapeHtml(note.title || 'Không tiêu đề')}</div>
          <div class="note-card-preview">${escapeHtml(preview) || 'Trống'}</div>
        </div>
        <div class="note-card-footer">
          <span class="note-card-date">${date}</span>
          <div class="note-card-actions">
            <button class="card-pin-btn" title="Ghim"><i class="fas fa-thumbtack"></i></button>
            <button class="card-delete-btn delete" title="Xóa"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ==========================================
   UTILITIES
   ========================================== */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function formatRelativeDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return mins + ' phút trước';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + ' giờ trước';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + ' ngày trước';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/* ==========================================
   ES MODULE EXPORT
   ========================================== */
export { initNotes };
