/**
 * VoLearn AI Practice Lab - Highlight Manager
 * Version: 1.0.0
 * 
 * Quản lý highlight từ vựng, notes, double-click dịch
 */

import { HIGHLIGHT_COLORS } from '../config/constants.js';

class HighlightManager {
    constructor() {
        this.highlights = new Map(); // word -> { color, note }
        this.isStrictMode = false;
        this.translatePopup = null;
        this.currentSelection = null;
        
        // Bind methods
        this.handleDoubleClick = this.handleDoubleClick.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleSelectionChange = this.handleSelectionChange.bind(this);
    }
    
    /**
     * Initialize
     */
    init(options = {}) {
        this.isStrictMode = options.strictMode || false;
        this.loadHighlights();
        this.createTranslatePopup();
        this.bindEvents();
        
        console.log('✅ HighlightManager initialized, strictMode:', this.isStrictMode);
        return this;
    }
    
    /**
     * Create translate popup element
     */
    createTranslatePopup() {
        // Remove existing
        const existing = document.getElementById('highlight-translate-popup');
        if (existing) existing.remove();
        
        this.translatePopup = document.createElement('div');
        this.translatePopup.id = 'highlight-translate-popup';
        this.translatePopup.className = 'translate-popup hidden';
        this.translatePopup.innerHTML = `
            <div class="translate-popup-content">
                <div class="translate-word"></div>
                <div class="translate-phonetic"></div>
                <div class="translate-meaning"></div>
                <div class="translate-actions">
                    <button class="translate-btn highlight-btn" title="Highlight">
                        <i class="fas fa-highlighter"></i>
                    </button>
                    <button class="translate-btn note-btn" title="Ghi chú">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="translate-btn speak-btn" title="Phát âm">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <button class="translate-btn close-btn" title="Đóng">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="highlight-colors hidden">
                    ${HIGHLIGHT_COLORS.map(c => `
                        <button class="color-btn" data-color="${c.id}" style="background: ${c.color}" title="${c.name}"></button>
                    `).join('')}
                    <button class="color-btn remove-highlight" data-color="none" title="Xóa highlight">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="note-input hidden">
                    <textarea placeholder="Nhập ghi chú..."></textarea>
                    <button class="save-note-btn">Lưu</button>
                </div>
            </div>
            <div class="translate-loading hidden">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
        `;
        
        document.body.appendChild(this.translatePopup);
        this.bindPopupEvents();
    }
    
    /**
     * Bind events
     */
    bindEvents() {
        // Double click to translate (if not strict mode)
        document.addEventListener('dblclick', this.handleDoubleClick);
        
        // Context menu for highlight options
        document.addEventListener('contextmenu', this.handleContextMenu);
        
        // Selection change
        document.addEventListener('selectionchange', this.handleSelectionChange);
        
        // Click outside to close popup
        document.addEventListener('click', (e) => {
            if (!this.translatePopup.contains(e.target) && !e.target.closest('.vocab-highlight')) {
                this.hidePopup();
            }
        });
        
        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hidePopup();
            }
        });
    }
    
    /**
     * Bind popup internal events
     */
    bindPopupEvents() {
        const popup = this.translatePopup;
        
        // Close button
        popup.querySelector('.close-btn').addEventListener('click', () => this.hidePopup());
        
        // Speak button
        popup.querySelector('.speak-btn').addEventListener('click', () => {
            if (this.currentSelection) {
                this.speak(this.currentSelection);
            }
        });
        
        // Highlight button - toggle color picker
        popup.querySelector('.highlight-btn').addEventListener('click', () => {
            popup.querySelector('.highlight-colors').classList.toggle('hidden');
            popup.querySelector('.note-input').classList.add('hidden');
        });
        
        // Note button - toggle note input
        popup.querySelector('.note-btn').addEventListener('click', () => {
            popup.querySelector('.note-input').classList.toggle('hidden');
            popup.querySelector('.highlight-colors').classList.add('hidden');
            
            // Load existing note
            if (this.currentSelection && this.highlights.has(this.currentSelection.toLowerCase())) {
                const data = this.highlights.get(this.currentSelection.toLowerCase());
                popup.querySelector('.note-input textarea').value = data.note || '';
            }
        });
        
        // Color buttons
        popup.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                if (color === 'none') {
                    this.removeHighlight(this.currentSelection);
                } else {
                    this.addHighlight(this.currentSelection, color);
                }
                popup.querySelector('.highlight-colors').classList.add('hidden');
            });
        });
        
        // Save note
        popup.querySelector('.save-note-btn').addEventListener('click', () => {
            const note = popup.querySelector('.note-input textarea').value;
            this.addNote(this.currentSelection, note);
            popup.querySelector('.note-input').classList.add('hidden');
        });
    }
    
    /**
     * Handle double click
     */
    handleDoubleClick(e) {
        // Skip if strict mode
        if (this.isStrictMode) return;
        
        // Only in exercise content area
        if (!e.target.closest('.exercise-content, .passage-content, .section-content')) return;
        
        const selection = window.getSelection();
        const word = selection.toString().trim();
        
        if (word && word.length > 1 && /^[a-zA-Z]+$/.test(word)) {
            e.preventDefault();
            this.showTranslatePopup(word, e.clientX, e.clientY);
        }
    }
    
    /**
     * Handle context menu
     */
    handleContextMenu(e) {
        // Only on highlighted words
        if (!e.target.classList.contains('vocab-highlight') && !e.target.classList.contains('user-highlight')) {
            return;
        }
        
        e.preventDefault();
        const word = e.target.textContent.trim();
        this.showTranslatePopup(word, e.clientX, e.clientY, true);
    }
    
    /**
     * Handle selection change
     */
    handleSelectionChange() {
        // Could be used for floating toolbar
    }
    
    /**
     * Show translate popup
     */
    async showTranslatePopup(word, x, y, skipTranslate = false) {
        this.currentSelection = word;
        
        const popup = this.translatePopup;
        popup.querySelector('.translate-word').textContent = word;
        popup.querySelector('.translate-phonetic').textContent = '';
        popup.querySelector('.translate-meaning').textContent = '';
        popup.querySelector('.highlight-colors').classList.add('hidden');
        popup.querySelector('.note-input').classList.add('hidden');
        
        // Position popup
        popup.style.left = `${Math.min(x, window.innerWidth - 320)}px`;
        popup.style.top = `${Math.min(y + 10, window.innerHeight - 200)}px`;
        popup.classList.remove('hidden');
        
        // Check if already highlighted
        if (this.highlights.has(word.toLowerCase())) {
            const data = this.highlights.get(word.toLowerCase());
            if (data.note) {
                popup.querySelector('.note-input textarea').value = data.note;
            }
        }
        
        if (!skipTranslate) {
            await this.fetchTranslation(word);
        }
    }
    
    /**
     * Hide popup
     */
    hidePopup() {
        this.translatePopup.classList.add('hidden');
        this.currentSelection = null;
    }
    
    /**
     * Fetch translation
     */
    async fetchTranslation(word) {
        const popup = this.translatePopup;
        const loading = popup.querySelector('.translate-loading');
        const meaningEl = popup.querySelector('.translate-meaning');
        const phoneticEl = popup.querySelector('.translate-phonetic');
        
        loading.classList.remove('hidden');
        meaningEl.textContent = '';
        
        try {
            // Try Free Dictionary API
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (response.ok) {
                const data = await response.json();
                const entry = data[0];
                
                // Phonetic
                const phonetic = entry.phonetics?.find(p => p.text)?.text || '';
                phoneticEl.textContent = phonetic;
                
                // Meanings
                const meanings = entry.meanings?.slice(0, 2).map(m => {
                    const pos = m.partOfSpeech;
                    const def = m.definitions?.[0]?.definition || '';
                    return `(${pos}) ${def}`;
                }).join('\n');
                
                meaningEl.textContent = meanings || 'Không tìm thấy nghĩa';
            } else {
                // Fallback to Google Translate
                await this.fetchGoogleTranslate(word);
            }
        } catch (error) {
            console.error('Translation error:', error);
            meaningEl.textContent = 'Không thể dịch từ này';
        } finally {
            loading.classList.add('hidden');
        }
    }
    
    /**
     * Fetch from Google Translate (fallback)
     */
    async fetchGoogleTranslate(word) {
        const meaningEl = this.translatePopup.querySelector('.translate-meaning');
        
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(word)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const translation = data[0]?.[0]?.[0] || '';
            meaningEl.textContent = translation || 'Không tìm thấy nghĩa';
        } catch (error) {
            meaningEl.textContent = 'Không thể dịch từ này';
        }
    }
    
    /**
     * Speak word
     */
    speak(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }
    
    /**
     * Add highlight to word
     */
    addHighlight(word, colorId) {
        if (!word) return;
        
        const color = HIGHLIGHT_COLORS.find(c => c.id === colorId);
        if (!color) return;
        
        const wordLower = word.toLowerCase();
        const existing = this.highlights.get(wordLower) || {};
        this.highlights.set(wordLower, { ...existing, color: colorId });
        
        // Apply to DOM
        this.applyHighlightToDOM(word, color.color);
        this.saveHighlights();
        
        console.log('✅ Highlighted:', word, colorId);
    }
    
    /**
     * Remove highlight
     */
    removeHighlight(word) {
        if (!word) return;
        
        const wordLower = word.toLowerCase();
        const data = this.highlights.get(wordLower);
        
        if (data) {
            // Keep note if exists, just remove color
            if (data.note) {
                this.highlights.set(wordLower, { note: data.note });
            } else {
                this.highlights.delete(wordLower);
            }
        }
        
        // Remove from DOM
        this.removeHighlightFromDOM(word);
        this.saveHighlights();
        
        console.log('✅ Highlight removed:', word);
    }
    
    /**
     * Add note to word
     */
    addNote(word, note) {
        if (!word) return;
        
        const wordLower = word.toLowerCase();
        const existing = this.highlights.get(wordLower) || {};
        
        if (note && note.trim()) {
            this.highlights.set(wordLower, { ...existing, note: note.trim() });
        } else if (existing.color) {
            // Keep color, remove note
            this.highlights.set(wordLower, { color: existing.color });
        } else {
            this.highlights.delete(wordLower);
        }
        
        this.saveHighlights();
        console.log('✅ Note saved for:', word);
    }
    
    /**
     * Apply highlight to DOM elements
     */
    applyHighlightToDOM(word, colorHex) {
        const regex = new RegExp(`\\b(${word})\\b`, 'gi');
        const contentAreas = document.querySelectorAll('.passage-content, .section-content, .exercise-content');
        
        contentAreas.forEach(area => {
            this.walkTextNodes(area, (textNode) => {
                if (regex.test(textNode.textContent)) {
                    const span = document.createElement('span');
                    span.innerHTML = textNode.textContent.replace(regex, 
                        `<span class="user-highlight" style="background: ${colorHex}" data-word="$1">$1</span>`
                    );
                    textNode.parentNode.replaceChild(span, textNode);
                }
            });
        });
    }
    
    /**
     * Remove highlight from DOM
     */
    removeHighlightFromDOM(word) {
        const highlights = document.querySelectorAll(`.user-highlight[data-word="${word}" i]`);
        highlights.forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });
    }
    
    /**
     * Walk text nodes
     */
    walkTextNodes(node, callback) {
        if (node.nodeType === Node.TEXT_NODE) {
            callback(node);
        } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('user-highlight')) {
            node.childNodes.forEach(child => this.walkTextNodes(child, callback));
        }
    }
    
    /**
     * Apply all saved highlights to current content
     */
    applyAllHighlights() {
        this.highlights.forEach((data, wordLower) => {
            if (data.color) {
                const color = HIGHLIGHT_COLORS.find(c => c.id === data.color);
                if (color) {
                    this.applyHighlightToDOM(wordLower, color.color);
                }
            }
        });
    }
    
    /**
     * Get highlights for a word
     */
    getHighlight(word) {
        return this.highlights.get(word.toLowerCase());
    }
    
    /**
     * Get all highlights
     */
    getAllHighlights() {
        return Object.fromEntries(this.highlights);
    }
    
    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        this.highlights.forEach((_, word) => {
            this.removeHighlightFromDOM(word);
        });
        this.highlights.clear();
        this.saveHighlights();
    }
    
    /**
     * Set strict mode
     */
    setStrictMode(enabled) {
        this.isStrictMode = enabled;
        console.log('Strict mode:', enabled ? 'ON' : 'OFF');
    }
    
    /**
     * Save highlights to localStorage
     */
    saveHighlights() {
        const data = Object.fromEntries(this.highlights);
        localStorage.setItem('volearn_ailab_highlights', JSON.stringify(data));
    }
    
    /**
     * Load highlights from localStorage
     */
    loadHighlights() {
        try {
            const saved = localStorage.getItem('volearn_ailab_highlights');
            if (saved) {
                const data = JSON.parse(saved);
                this.highlights = new Map(Object.entries(data));
            }
        } catch (e) {
            console.error('Error loading highlights:', e);
        }
    }
    
    /**
     * Destroy
     */
    destroy() {
        document.removeEventListener('dblclick', this.handleDoubleClick);
        document.removeEventListener('contextmenu', this.handleContextMenu);
        document.removeEventListener('selectionchange', this.handleSelectionChange);
        
        if (this.translatePopup) {
            this.translatePopup.remove();
        }
    }
}

// Export singleton
export const highlightManager = new HighlightManager();
export default HighlightManager;
