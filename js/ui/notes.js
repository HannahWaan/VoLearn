/* ===== NOTES MODULE ===== */
/* VoLearn v2.2.0 - Ghi chú */

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

/* ===== COLORS ===== */
const NOTE_COLORS = [
    { value: '#ffffff', label: 'Trắng' },
    { value: '#fff9c4', label: 'Vàng' },
    { value: '#f0f4c3', label: 'Xanh lá nhạt' },
    { value: '#b2dfdb', label: 'Xanh ngọc' },
    { value: '#b3e5fc', label: 'Xanh dương' },
    { value: '#e1bee7', label: 'Tím' },
    { value: '#f8bbd0', label: 'Hồng' },
    { value: '#d7ccc8', label: 'Nâu nhạt' },
    { value: '#cfd8dc', label: 'Xám' }
];

/* ===== DARK MODE COLORS ===== */
const NOTE_COLORS_DARK = {
    '#ffffff': '#2d1f3d',
    '#fff9c4': '#3d3520',
    '#f0f4c3': '#2d3520',
    '#b2dfdb': '#1d3530',
    '#b3e5fc': '#1d2d3d',
    '#e1bee7': '#352040',
    '#f8bbd0': '#3d1f2d',
    '#d7ccc8': '#352d28',
    '#cfd8dc': '#2d3035'
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
    // Create note
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-create-note')) {
            createNewNote();
        }
        if (e.target.closest('#btn-editor-back')) {
            closeEditor();
        }
        if (e.target.closest('#btn-note-delete')) {
            deleteCurrentNote();
        }
        if (e.target.closest('#btn-note-pin')) {
            togglePinCurrentNote();
        }
        if (e.target.closest('#btn-note-image')) {
            document.getElementById('note-image-input')?.click();
        }
        // View toggle
        if (e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn');
            const view = btn.dataset.view;
            if (view) switchView(view);
        }
        // Note card click
        if (e.target.closest('.note-card') && !e.target.closest('.note-card-action')) {
            const card = e.target.closest('.note-card');
            const noteId = card.dataset.noteId;
            if (noteId) openNote(noteId);
        }
        // Note card pin
        if (e.target.closest('.note-card-pin')) {
            e.stopPropagation();
            const card = e.target.closest('.note-card');
            if (card) togglePin(card.dataset.noteId);
        }
        // Note card delete
        if (e.target.closest('.note-card-delete')) {
            e.stopPropagation();
            const card = e.target.closest('.note-card');
            if (card) deleteNote(card.dataset.noteId);
        }
        // Remove image in editor
        if (e.target.closest('.note-img-remove')) {
            const wrapper = e.target.closest('.note-img-wrapper');
            if (wrapper) {
                wrapper.remove();
                scheduleAutoSave();
            }
        }
        // Toolbar buttons
        if (e.target.closest('.toolbar-btn')) {
            const btn = e.target.closest('.toolbar-btn');
            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;
            if (cmd) {
                document.execCommand(cmd, false, value);
                document.getElementById('note-content-editor')?.focus();
            }
        }
    });

    // Search
    document.addEventListener('input', (e) => {
        if (e.target.id === 'notes-search-input') {
            searchQuery = e.target.value.trim().toLowerCase();
            renderNotesList();
        }
    });

    // Image input
    document.addEventListener('change', (e) => {
        if (e.target.id === 'note-image-input') {
            handleImageUpload(e.target.files);
            e.target.value = '';
        }
    });

    // Color picker
    document.addEventListener('input', (e) => {
        if (e.target.id === 'note-color-picker') {
            scheduleAutoSave();
        }
    });

    // Content change → auto-save
    document.addEventListener('input', (e) => {
        if (e.target.id === 'note-title-input' || e.target.id === 'note-content-editor') {
            scheduleAutoSave();
        }
    });

    // Paste images
    document.addEventListener('paste', (e) => {
        if (e.target.id === 'note-content-editor' || e.target.closest('#note-content-editor')) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    handleImageUpload([file]);
                    return;
                }
            }
        }
    });
}

/* ===== CREATE NOTE ===== */
function createNewNote() {
    const note = {
        id: generateId(),
        title: '',
        content: '',
        images: [],
        color: '#ffffff',
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (!appData.notes) appData.notes = [];
    appData.notes.unshift(note);
    saveData(appData);

    openNote(note.id);
}

/* ===== OPEN NOTE ===== */
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

    // Fill data
    if (titleInput) titleInput.value = note.title || '';
    if (contentEditor) contentEditor.innerHTML = note.content || '';
    if (colorPicker) colorPicker.value = note.color || '#ffffff';

    // Pin state
    if (pinBtn) {
        pinBtn.classList.toggle('active', note.pinned);
    }

    // Images
    if (imagesContainer) {
        renderNoteImages(note.images || [], imagesContainer);
    }

    // Apply color
    applyEditorColor(note.color || '#ffffff');

    // Show editor
    editor.style.display = 'flex';
    updateSaveStatus('saved');

    // Focus
    if (!note.title && titleInput) {
        titleInput.focus();
    } else if (contentEditor) {
        contentEditor.focus();
    }
}

/* ===== CLOSE EDITOR ===== */
function closeEditor() {
    // Save before closing
    saveCurrentNote();

    const editor = document.getElementById('note-editor');
    if (editor) editor.style.display = 'none';

    currentNoteId = null;
    renderNotesList();
}

/* ===== SAVE CURRENT NOTE ===== */
function saveCurrentNote() {
    if (!currentNoteId) return;

    const note = appData.notes?.find(n => n.id === currentNoteId);
    if (!note) return;

    const titleInput = document.getElementById('note-title-input');
    const contentEditor = document.getElementById('note-content-editor');
    const colorPicker = document.getElementById('note-color-picker');
    const imagesContainer = document.getElementById('note-images');

    note.title = titleInput?.value?.trim() || '';
    note.content = contentEditor?.innerHTML || '';
    note.color = colorPicker?.value || '#ffffff';
    note.updatedAt = new Date().toISOString();

    // Collect images from DOM
    if (imagesContainer) {
        const imgs = imagesContainer.querySelectorAll('.note-img-wrapper img');
        note.images = Array.from(imgs).map(img => img.src);
    }

    saveData(appData);
    updateSaveStatus('saved');
}

/* ===== AUTO-SAVE ===== */
function scheduleAutoSave() {
    updateSaveStatus('saving');
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveCurrentNote();
    }, 800);
}

/* ===== UPDATE SAVE STATUS ===== */
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
function deleteCurrentNote() {
    if (!currentNoteId) return;
    deleteNote(currentNoteId);
}

function deleteNote(noteId) {
    const note = appData.notes?.find(n => n.id === noteId);
    if (!note) return;

    const title = note.title || 'Ghi chú không tiêu đề';

    window.showConfirm({
        title: 'Xóa ghi chú',
        message: `Xóa "${escapeHtml(title)}"?`,
        submessage: 'Hành động này không thể hoàn tác.',
        type: 'danger',
        confirmText: 'Xóa',
        icon: 'fas fa-trash',
        onConfirm: () => {
            appData.notes = appData.notes.filter(n => n.id !== noteId);
            saveData(appData);
            showSuccess('Đã xóa ghi chú!');

            if (currentNoteId === noteId) {
                const editor = document.getElementById('note-editor');
                if (editor) editor.style.display = 'none';
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
    showToast(note.pinned ? 'Đã ghim ghi chú' : 'Đã bỏ ghim', 'success');
}

function togglePinCurrentNote() {
    if (!currentNoteId) return;

    const note = appData.notes?.find(n => n.id === currentNoteId);
    if (!note) return;

    note.pinned = !note.pinned;
    saveData(appData);

    const pinBtn = document.getElementById('btn-note-pin');
    if (pinBtn) pinBtn.classList.toggle('active', note.pinned);

    showToast(note.pinned ? 'Đã ghim ghi chú' : 'Đã bỏ ghim', 'success');
}

/* ===== IMAGE HANDLING ===== */
function handleImageUpload(files) {
    if (!files || files.length === 0) return;

    const imagesContainer = document.getElementById('note-images');
    if (!imagesContainer) return;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        // Limit size 5MB
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ảnh quá lớn (tối đa 5MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Compress if needed
            compressImage(e.target.result, 800, 0.8).then(compressed => {
                addImageToEditor(compressed, imagesContainer);
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
            if (img.width <= maxWidth) {
                resolve(dataUrl);
                return;
            }

            const canvas = document.createElement('canvas');
            const ratio = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
        <button class="note-img-remove" title="Xóa ảnh">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(wrapper);
}

function renderNoteImages(images, container) {
    container.innerHTML = '';
    (images || []).forEach(src => {
        addImageToEditor(src, container);
    });
}

/* ===== APPLY EDITOR COLOR ===== */
function applyEditorColor(color) {
    const editorBody = document.querySelector('.note-editor-body');
    if (!editorBody) return;

    const isDark = document.body.classList.contains('dark-mode');
    const bgColor = isDark ? (NOTE_COLORS_DARK[color] || color) : color;

    editorBody.style.background = bgColor;
}

/* ===== SWITCH VIEW ===== */
function switchView(view) {
    currentView = view;

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    const container = document.getElementById('notes-container');
    if (container) {
        container.className = view === 'list' ? 'notes-list' : 'notes-grid';
    }

    localStorage.setItem('volearn-notes-view', view);
}

/* ===== RENDER NOTES LIST ===== */
function renderNotesList() {
    const container = document.getElementById('notes-container');
    const emptyEl = document.getElementById('notes-empty');
    const countEl = document.getElementById('notes-count');
    if (!container) return;

    let notes = appData.notes || [];

    // Search filter
    if (searchQuery) {
        notes = notes.filter(n =>
            (n.title || '').toLowerCase().includes(searchQuery) ||
            stripHtml(n.content || '').toLowerCase().includes(searchQuery)
        );
    }

    // Sort: pinned first, then by updatedAt
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

    // Restore saved view
    const savedView = localStorage.getItem('volearn-notes-view') || 'grid';
    if (savedView !== currentView) switchView(savedView);

    container.innerHTML = notes.map(note => {
        const title = note.title || 'Không tiêu đề';
        const preview = stripHtml(note.content || '').substring(0, 120);
        const date = formatRelativeDate(note.updatedAt);
        const isDark = document.body.classList.contains('dark-mode');
        const bgColor = isDark ? (NOTE_COLORS_DARK[note.color] || note.color || '#2d1f3d') : (note.color || '#ffffff');
        const hasImages = note.images && note.images.length > 0;
        const firstImage = hasImages ? note.images[0] : null;

        return `
            <div class="note-card ${note.pinned ? 'pinned' : ''}" 
                 data-note-id="${note.id}"
                 style="background: ${bgColor};">
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
                        <button class="note-card-action note-card-pin" title="${note.pinned ? 'Bỏ ghim' : 'Ghim'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="note-card-action note-card-delete" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ===== HELPERS ===== */
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString('vi-VN');
}

/* ===== GLOBAL EXPORTS ===== */
window.initNotes = initNotes;
