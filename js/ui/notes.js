/* ============================================
   VoLearn – Notes Module v2.6.0
   Split-view, full toolbar, tables, images
   ============================================ */

(function () {
  'use strict';

  /* ---------- state ---------- */
  let currentNoteId = null;
  let currentView = localStorage.getItem('notesView') || 'grid';
  let searchQuery = '';
  let autoSaveTimer = null;
  let highlightColor = '#ffff00';
  let fontColor = '#ff0000';

  // Format painter
  let formatPainterActive = false;
  let formatPainterStyles = null;

  // Table resize
  let resizingCol = null;
  let resizingRow = null;
  let resizeStart = 0;
  let resizeInitial = 0;

  // Table context
  let contextCell = null;

  // Split view
  let splitActive = false;
  let splitDragging = false;
  let splitStart = 0;
  let splitInitialLeft = 0;
  let splitNotes = { left: null, right: null };

  // Lightbox
  let lightboxZoom = 1;
  let currentLightboxIndex = -1;

  const DARK_COLORS = {
    '#1a1a2e': true, '#16213e': true, '#0f3460': true,
    '#1b1b2f': true, '#162447': true, '#1f4068': true,
    '#1a1a2e': true, '#2d132c': true, '#3a0ca3': true
  };

  /* ---------- init ---------- */
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
      // ensure cells are editable
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

      // Create note
      if (t.closest('#create-note-btn')) { createNewNote(); return; }

      // View toggle
      if (t.closest('.view-btn') && !t.closest('#split-view-btn')) {
        const btn = t.closest('.view-btn');
        const v = btn.dataset.view;
        if (v) { switchView(v); deactivateSplitView(); }
        return;
      }

      // Split view toggle
      if (t.closest('#split-view-btn')) { toggleSplitView(); return; }

      // Split pane close
      if (t.closest('.split-pane-close')) {
        deactivateSplitView();
        return;
      }

      // Editor back
      if (t.closest('#editor-back-btn')) { closeEditor(); return; }

      // Editor pin
      if (t.closest('#editor-pin-btn')) { togglePin(); return; }

      // Editor delete
      if (t.closest('#editor-delete-btn')) {
        if (currentNoteId && confirm('Xóa ghi chú này?')) deleteNote(currentNoteId);
        return;
      }

      // Editor image
      if (t.closest('#editor-image-btn')) {
        document.getElementById('note-image-input').click();
        return;
      }

      // Undo / Redo
      if (t.closest('#toolbar-undo')) { document.execCommand('undo'); scheduleAutoSave(); return; }
      if (t.closest('#toolbar-redo')) { document.execCommand('redo'); scheduleAutoSave(); return; }

      // Format painter
      if (t.closest('#toolbar-format-painter')) { activateFormatPainter(); return; }

      // Font color btn
      if (t.closest('#toolbar-font-color')) {
        const p = document.getElementById('font-color-picker');
        p.click();
        return;
      }

      // Highlight btn
      if (t.closest('#toolbar-highlight')) {
        document.execCommand('hiliteColor', false, highlightColor);
        scheduleAutoSave();
        return;
      }

      // Todo toggle
      if (t.closest('#toolbar-todo')) { toggleTodoList(); return; }

      // Table btn
      if (t.closest('#toolbar-table')) { openTableCreator(); return; }

      // Table modal cancel
      if (t.closest('#table-cancel-btn')) { closeTableCreator(); return; }
      // Table modal confirm
      if (t.closest('#table-confirm-btn')) { confirmInsertTable(); return; }

      // Heading buttons
      const headBtn = t.closest('.toolbar-heading');
      if (headBtn) {
        const tag = headBtn.dataset.heading;
        document.execCommand('formatBlock', false, tag);
        scheduleAutoSave();
        return;
      }

      // Generic toolbar commands
      const cmdBtn = t.closest('.toolbar-btn[data-cmd]');
      if (cmdBtn) {
        const cmd = cmdBtn.dataset.cmd;
        const val = cmdBtn.dataset.value || null;
        document.execCommand(cmd, false, val);
        scheduleAutoSave();
        return;
      }

      // Note card open
      const card = t.closest('.note-card');
      if (card && !t.closest('.note-card-actions')) {
        openNote(card.dataset.id);
        return;
      }

      // Note card pin
      if (t.closest('.card-pin-btn')) {
        const id = t.closest('.note-card').dataset.id;
        togglePinById(id);
        return;
      }

      // Note card delete
      if (t.closest('.card-delete-btn')) {
        const id = t.closest('.note-card').dataset.id;
        if (confirm('Xóa ghi chú này?')) deleteNote(id);
        return;
      }

      // Remove image in editor
      if (t.closest('.remove-img')) {
        const idx = parseInt(t.closest('.note-img-wrapper').dataset.index);
        removeNoteImage(idx);
        return;
      }

      // Image click → lightbox
      if (t.closest('.note-img-wrapper img')) {
        const idx = parseInt(t.closest('.note-img-wrapper').dataset.index);
        openLightbox(idx);
        return;
      }

      // Lightbox controls
      if (t.closest('#lightbox-zoom-in')) { lightboxZoom = Math.min(lightboxZoom + 0.3, 5); applyLightboxZoom(); return; }
      if (t.closest('#lightbox-zoom-out')) { lightboxZoom = Math.max(lightboxZoom - 0.3, 0.3); applyLightboxZoom(); return; }
      if (t.closest('#lightbox-reset')) { lightboxZoom = 1; applyLightboxZoom(); return; }
      if (t.closest('#lightbox-delete')) { deleteLightboxImage(); return; }
      if (t.closest('#lightbox-close')) { closeLightbox(); return; }

      // Table context menu action
      const ctxBtn = t.closest('.table-context-menu button');
      if (ctxBtn) { handleTableContextAction(ctxBtn.dataset.action); return; }

      // Clicking outside hides context menu
      hideTableContextMenu();

      // Format painter apply
      if (formatPainterActive) {
        applyFormatPainter();
        return;
      }

      // Click on lightbox bg → close
      if (t.closest('.note-lightbox') && !t.closest('.lightbox-controls') && !t.closest('.lightbox-image')) {
        closeLightbox();
      }
    });

    /* --- context menu on table cells --- */
    document.addEventListener('contextmenu', function (e) {
      const cell = e.target.closest('#note-content-editor td, #note-content-editor th');
      if (cell) {
        e.preventDefault();
        contextCell = cell;
        showTableContextMenu(e.clientX, e.clientY);
      }
    });

    /* --- input / content changes --- */
    document.addEventListener('input', function (e) {
      if (e.target.closest('#note-content-editor') || e.target.closest('#note-title-input')) {
        scheduleAutoSave();
      }
      if (e.target.id === 'notes-search-input') {
        searchQuery = e.target.value.toLowerCase().trim();
        renderNotesList();
      }
      // Table creator preview
      if (e.target.id === 'table-rows-input' || e.target.id === 'table-cols-input') {
        updateTablePreview();
      }
    });

    /* --- color pickers --- */
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
    });

    /* --- paste: strip formatting for plain text --- */
    document.addEventListener('paste', function (e) {
      if (e.target.closest('#note-content-editor')) {
        // allow default rich paste
      }
    });

    /* --- keyboard --- */
    document.addEventListener('keydown', function (e) {
      // Escape
      if (e.key === 'Escape') {
        if (document.getElementById('note-lightbox').style.display !== 'none') { closeLightbox(); return; }
        if (formatPainterActive) { cancelFormatPainter(); return; }
        if (document.getElementById('table-creator-modal').style.display !== 'none') { closeTableCreator(); return; }
        hideTableContextMenu();
        if (document.getElementById('note-editor').style.display !== 'none') { closeEditor(); return; }
        if (splitActive) { deactivateSplitView(); return; }
      }
      // Tab in table cell
      if (e.key === 'Tab' && e.target.closest('#note-content-editor td, #note-content-editor th')) {
        e.preventDefault();
        navigateTableCell(e.target.closest('td,th'), e.shiftKey);
      }
    });

    /* --- mouse events for table col/row resize --- */
    document.addEventListener('mousedown', function (e) {
      // Column resize
      const cell = e.target.closest('#note-content-editor th, #note-content-editor td');
      if (cell) {
        const rect = cell.getBoundingClientRect();
        // right edge → col resize
        if (Math.abs(e.clientX - rect.right) < 6) {
          e.preventDefault();
          initColumnResize(cell, e.clientX);
          return;
        }
        // bottom edge → row resize
        if (Math.abs(e.clientY - rect.bottom) < 6) {
          e.preventDefault();
          initRowResize(cell, e.clientY);
          return;
        }
      }
      // Split divider drag
      const divider = e.target.closest('#split-divider');
      if (divider && splitActive) {
        e.preventDefault();
        splitDragging = true;
        divider.classList.add('dragging');
        const isMobile = window.innerWidth <= 768;
        splitStart = isMobile ? e.clientY : e.clientX;
        const leftPane = document.getElementById('split-pane-left');
        splitInitialLeft = isMobile ? leftPane.offsetHeight : leftPane.offsetWidth;
      }
    });

    document.addEventListener('mousemove', function (e) {
      // Col resize
      if (resizingCol) {
        const diff = e.clientX - resizeStart;
        const newW = Math.max(40, resizeInitial + diff);
        resizingCol.style.width = newW + 'px';
        return;
      }
      // Row resize
      if (resizingRow) {
        const diff = e.clientY - resizeStart;
        const newH = Math.max(20, resizeInitial + diff);
        resizingRow.style.height = newH + 'px';
        return;
      }
      // Split divider
      if (splitDragging) {
        const isMobile = window.innerWidth <= 768;
        const container = document.getElementById('split-view-container');
        const leftPane = document.getElementById('split-pane-left');
        const rightPane = document.getElementById('split-pane-right');
        const dividerSize = 6;
        if (isMobile) {
          const diff = e.clientY - splitStart;
          const total = container.offsetHeight - dividerSize;
          let newLeft = clamp(splitInitialLeft + diff, 100, total - 100);
          leftPane.style.flex = 'none';
          rightPane.style.flex = 'none';
          leftPane.style.height = newLeft + 'px';
          rightPane.style.height = (total - newLeft) + 'px';
        } else {
          const diff = e.clientX - splitStart;
          const total = container.offsetWidth - dividerSize;
          let newLeft = clamp(splitInitialLeft + diff, 150, total - 150);
          leftPane.style.flex = 'none';
          rightPane.style.flex = 'none';
          leftPane.style.width = newLeft + 'px';
          rightPane.style.width = (total - newLeft) + 'px';
        }
        return;
      }
      // Cursor hint for cell edges
      const cell = e.target.closest('#note-content-editor th, #note-content-editor td');
      if (cell) {
        const rect = cell.getBoundingClientRect();
        if (Math.abs(e.clientX - rect.right) < 6) { cell.style.cursor = 'col-resize'; }
        else if (Math.abs(e.clientY - rect.bottom) < 6) { cell.style.cursor = 'row-resize'; }
        else { cell.style.cursor = ''; }
      }
    });

    document.addEventListener('mouseup', function () {
      if (resizingCol) { resizingCol = null; scheduleAutoSave(); }
      if (resizingRow) { resizingRow = null; scheduleAutoSave(); }
      if (splitDragging) {
        splitDragging = false;
        document.getElementById('split-divider').classList.remove('dragging');
      }
    });

    /* --- Split view selects --- */
    document.addEventListener('change', function (e) {
      if (e.target.id === 'split-select-left') {
        loadSplitNote('left', e.target.value);
      }
      if (e.target.id === 'split-select-right') {
        loadSplitNote('right', e.target.value);
      }
    });

    /* --- Todo checkbox change --- */
    document.addEventListener('change', function (e) {
      if (e.target.closest('.todo-item input[type="checkbox"]')) {
        const item = e.target.closest('.todo-item');
        if (e.target.checked) item.classList.add('checked');
        else item.classList.remove('checked');
        scheduleAutoSave();
      }
    });
  }

  /* ==========================================
     SPLIT VIEW
     ========================================== */
  function toggleSplitView() {
    if (splitActive) {
      deactivateSplitView();
    } else {
      activateSplitView();
    }
  }

  function activateSplitView() {
    splitActive = true;
    document.getElementById('split-view-btn').classList.add('active');

    // Hide normal view
    document.getElementById('notes-container').style.display = 'none';
    document.getElementById('notes-empty').style.display = 'none';

    // Deactivate other view btns
    document.querySelectorAll('.view-btn:not(#split-view-btn)').forEach(b => b.classList.remove('active'));

    // Show split container
    const sc = document.getElementById('split-view-container');
    sc.style.display = '';

    // Reset pane sizes
    const leftPane = document.getElementById('split-pane-left');
    const rightPane = document.getElementById('split-pane-right');
    leftPane.style.flex = '1';
    leftPane.style.width = '';
    leftPane.style.height = '';
    rightPane.style.flex = '1';
    rightPane.style.width = '';
    rightPane.style.height = '';

    // Populate selects
    populateSplitSelects();
  }

  function deactivateSplitView() {
    splitActive = false;
    document.getElementById('split-view-btn').classList.remove('active');
    document.getElementById('split-view-container').style.display = 'none';
    splitNotes = { left: null, right: null };

    // Restore normal view
    document.getElementById('notes-container').style.display = '';
    renderNotesList();

    // Re-activate correct view btn
    document.querySelectorAll('.view-btn[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === currentView);
    });
  }

  function populateSplitSelects() {
    const notes = appData.notes || [];
    ['split-select-left', 'split-select-right'].forEach(id => {
      const sel = document.getElementById(id);
      sel.innerHTML = '<option value="">-- Chọn ghi chú --</option>';
      notes.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.title || 'Không tiêu đề';
        sel.appendChild(opt);
      });
    });
  }

  function loadSplitNote(pane, noteId) {
    const bodyEl = document.getElementById('split-body-' + pane);
    splitNotes[pane] = noteId || null;

    if (!noteId) {
      bodyEl.innerHTML = '<div class="split-pane-placeholder"><i class="fas fa-hand-pointer"></i><p>Chọn một ghi chú</p></div>';
      return;
    }

    const note = appData.notes.find(n => n.id === noteId);
    if (!note) {
      bodyEl.innerHTML = '<div class="split-pane-placeholder"><p>Không tìm thấy ghi chú</p></div>';
      return;
    }

    let html = '';
    if (note.title) html += '<h2 style="margin-top:0">' + escapeHtml(note.title) + '</h2>';
    html += '<div>' + (cleanTableHtml(note.content) || '<em>Trống</em>') + '</div>';

    if (note.images && note.images.length) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
      note.images.forEach(src => {
        html += '<img src="' + src + '" style="max-width:120px;border-radius:8px;cursor:pointer" onclick="window.open(this.src)">';
      });
      html += '</div>';
    }

    bodyEl.innerHTML = html;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
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
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecoration,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize
    };
    formatPainterActive = true;
    document.getElementById('toolbar-format-painter').classList.add('active');
    document.getElementById('note-content-editor').style.cursor = 'crosshair';
  }

  function applyFormatPainter() {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !formatPainterStyles) {
      cancelFormatPainter();
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    Object.assign(span.style, {
      fontWeight: formatPainterStyles.fontWeight,
      fontStyle: formatPainterStyles.fontStyle,
      textDecoration: formatPainterStyles.textDecoration,
      color: formatPainterStyles.color,
      backgroundColor: formatPainterStyles.backgroundColor,
      fontSize: formatPainterStyles.fontSize
    });
    try {
      range.surroundContents(span);
    } catch (ex) { /* complex selection */ }
    cancelFormatPainter();
    scheduleAutoSave();
  }

  function cancelFormatPainter() {
    formatPainterActive = false;
    formatPainterStyles = null;
    document.getElementById('toolbar-format-painter').classList.remove('active');
    const editor = document.getElementById('note-content-editor');
    if (editor) editor.style.cursor = '';
  }

  /* ==========================================
     TODO LIST
     ========================================== */
  function toggleTodoList() {
    const editor = document.getElementById('note-content-editor');
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const node = sel.anchorNode;
    const todoItem = (node.nodeType === 3 ? node.parentElement : node).closest('.todo-item');

    if (todoItem) {
      // Remove todo → convert to plain paragraph
      const text = todoItem.querySelector('.todo-text')?.textContent || '';
      const p = document.createElement('p');
      p.textContent = text;
      todoItem.replaceWith(p);
      // Place cursor
      const r = document.createRange();
      r.selectNodeContents(p);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      // Insert new todo
      const div = document.createElement('div');
      div.className = 'todo-item';
      div.innerHTML = '<input type="checkbox"><span class="todo-text" contenteditable="true">Việc cần làm</span>';
      // Insert at cursor
      const range = sel.getRangeAt(0);
      range.collapse(false);
      // Add a line break first to go to new line
      const br = document.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.insertNode(div);
      // Focus the text
      const textSpan = div.querySelector('.todo-text');
      const r = document.createRange();
      r.selectNodeContents(textSpan);
      sel.removeAllRanges();
      sel.addRange(r);
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
    let html = '<table><thead><tr>';
    for (let c = 0; c < cols; c++) html += '<th>Cột ' + (c + 1) + '</th>';
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
    document.getElementById('table-creator-preview').innerHTML = html;
  }

  function confirmInsertTable() {
    const rows = clamp(parseInt(document.getElementById('table-rows-input').value) || 3, 1, 20);
    const cols = clamp(parseInt(document.getElementById('table-cols-input').value) || 3, 1, 10);
    insertTable(rows, cols);
    closeTableCreator();
  }

  function insertTable(rows, cols) {
    const editor = document.getElementById('note-content-editor');
    let html = '<div class="note-table-wrapper"><table style="width:100%;table-layout:fixed;border-collapse:collapse"><thead><tr>';
    for (let c = 0; c < cols; c++) html += '<th contenteditable="true" style="min-width:60px">Tiêu đề</th>';
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td contenteditable="true"></td>';
      html += '</tr>';
    }
    html += '</tbody></table></div><p><br></p>';

    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (temp.firstChild) frag.appendChild(temp.firstChild);
      range.insertNode(frag);
    } else {
      editor.insertAdjacentHTML('beforeend', html);
    }
    scheduleAutoSave();
  }

  function navigateTableCell(currentCell, reverse) {
    const table = currentCell.closest('table');
    if (!table) return;
    const cells = Array.from(table.querySelectorAll('td, th'));
    let idx = cells.indexOf(currentCell);
    idx = reverse ? idx - 1 : idx + 1;
    if (idx >= 0 && idx < cells.length) {
      cells[idx].focus();
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(cells[idx]);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  /* --- Column / Row resize --- */
  function initColumnResize(cell, startX) {
    resizingCol = cell;
    resizeStart = startX;
    resizeInitial = cell.offsetWidth;
  }

  function initRowResize(cell, startY) {
    const tr = cell.closest('tr');
    resizingRow = tr;
    resizeStart = startY;
    resizeInitial = tr.offsetHeight;
  }

  /* --- Table context menu --- */
  function showTableContextMenu(x, y) {
    const menu = document.getElementById('table-context-menu');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // Keep on screen
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
    const cellIndex = Array.from(tr.children).indexOf(contextCell);
    const tbody = table.querySelector('tbody') || table;
    const thead = table.querySelector('thead');

    switch (action) {
      case 'insertRowAbove': {
        const newTr = createEmptyRow(tr.children.length);
        tr.parentNode.insertBefore(newTr, tr);
        break;
      }
      case 'insertRowBelow': {
        const newTr = createEmptyRow(tr.children.length);
        tr.parentNode.insertBefore(newTr, tr.nextSibling);
        break;
      }
      case 'insertColLeft': {
        table.querySelectorAll('tr').forEach(row => {
          const ref = row.children[cellIndex];
          const isHeader = row.closest('thead');
          const cell = document.createElement(isHeader ? 'th' : 'td');
          cell.contentEditable = 'true';
          row.insertBefore(cell, ref);
        });
        break;
      }
      case 'insertColRight': {
        table.querySelectorAll('tr').forEach(row => {
          const ref = row.children[cellIndex];
          const isHeader = row.closest('thead');
          const cell = document.createElement(isHeader ? 'th' : 'td');
          cell.contentEditable = 'true';
          row.insertBefore(cell, ref ? ref.nextSibling : null);
        });
        break;
      }
      case 'deleteRow': {
        // Don't delete last row
        if (table.querySelectorAll('tr').length <= 1) { table.closest('.note-table-wrapper')?.remove() || table.remove(); break; }
        tr.remove();
        break;
      }
      case 'deleteCol': {
        const totalCols = table.querySelector('tr').children.length;
        if (totalCols <= 1) { table.closest('.note-table-wrapper')?.remove() || table.remove(); break; }
        table.querySelectorAll('tr').forEach(row => {
          if (row.children[cellIndex]) row.children[cellIndex].remove();
        });
        break;
      }
      case 'clearCell': {
        contextCell.innerHTML = '';
        break;
      }
      case 'deleteTable': {
        const wrapper = table.closest('.note-table-wrapper');
        if (wrapper) wrapper.remove(); else table.remove();
        break;
      }
    }
    contextCell = null;
    scheduleAutoSave();
  }

  function createEmptyRow(colCount) {
    const tr = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      tr.appendChild(td);
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
        if (dataUrl.length > 5 * 1024 * 1024) return; // skip too large
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
      const wrapper = document.createElement('div');
      wrapper.className = 'note-img-wrapper';
      wrapper.dataset.index = i;
      wrapper.innerHTML = '<img src="' + src + '" alt="Note image"><button class="remove-img"><i class="fas fa-times"></i></button>';
      container.appendChild(wrapper);
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
    currentLightboxIndex = index;
    lightboxZoom = 1;
    const lb = document.getElementById('note-lightbox');
    document.getElementById('lightbox-image').src = note.images[index];
    lb.style.display = '';
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
    if (splitActive) deactivateSplitView();

    const note = {
      id: 'note_' + Date.now(),
      title: '',
      content: '',
      color: '#1a1a2e',
      pinned: false,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    appData.notes.unshift(note);
    openNote(note.id);
  }

  function openNote(id) {
    const note = appData.notes.find(n => n.id === id);
    if (!note) return;

    if (splitActive) deactivateSplitView();

    currentNoteId = id;
    document.getElementById('note-title-input').value = note.title || '';
    document.getElementById('note-content-editor').innerHTML = cleanTableHtml(note.content) || '';
    document.getElementById('note-color-input').value = note.color || '#1a1a2e';
    applyEditorColor(note.color || '#1a1a2e');

    const pinBtn = document.getElementById('editor-pin-btn');
    pinBtn.classList.toggle('pinned', !!note.pinned);

    renderNoteImages(note.images);

    document.getElementById('note-editor').style.display = '';
  }

  function closeEditor() {
    saveCurrentNote();
    document.getElementById('note-editor').style.display = 'none';
    currentNoteId = null;
    renderNotesList();
    if (splitActive) populateSplitSelects();
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
    if (splitActive) populateSplitSelects();
  }

  function togglePin() {
    if (!currentNoteId) return;
    togglePinById(currentNoteId);
    const pinBtn = document.getElementById('editor-pin-btn');
    const note = appData.notes.find(n => n.id === currentNoteId);
    pinBtn.classList.toggle('pinned', note && note.pinned);
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
    if (isDark) {
      editor.style.color = '#e0e0e0';
      document.getElementById('note-title-input').style.color = '#ffffff';
    } else {
      editor.style.color = '#1a1a2e';
      document.getElementById('note-title-input').style.color = '#1a1a2e';
    }
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
    const container = document.getElementById('notes-container');
    container.classList.toggle('list-view', view === 'list');

    document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    // deactivate split btn visual
    document.getElementById('split-view-btn').classList.remove('active');
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

    // Sort: pinned first, then by updatedAt
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
      const imgThumb = (note.images && note.images.length)
        ? '<img class="note-card-image" src="' + note.images[0] + '" alt="">'
        : '';
      return `
        <div class="note-card${note.pinned ? ' pinned' : ''}" data-id="${note.id}" style="border-left:4px solid ${note.color || '#1a1a2e'}">
          ${imgThumb}
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

  /* ---------- export ---------- */
  window.initNotes = initNotes;
})();
