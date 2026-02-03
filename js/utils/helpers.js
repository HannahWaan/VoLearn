/* ========================================
   VoLearn - Helper Utilities
   ======================================== */

/**
 * Generate unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format date to Vietnamese
 */
export function formatDate(date, format = 'short') {
    const d = new Date(date);
    
    if (format === 'short') {
        return d.toLocaleDateString('vi-VN');
    }
    
    if (format === 'long') {
        return d.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    if (format === 'relative') {
        return getRelativeTime(d);
    }
    
    return d.toISOString().split('T')[0];
}

/**
 * Get relative time (e.g., "2 ngày trước")
 */
export function getRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'Vừa xong';
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle function
 */
export function throttle(fn, limit = 100) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Shuffle array
 */
export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Escape HTML
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Get POS label
 */
export function getPosLabel(pos) {
    const labels = {
        'noun': 'Danh từ',
        'verb': 'Động từ',
        'adjective': 'Tính từ',
        'adverb': 'Trạng từ',
        'pronoun': 'Đại từ',
        'preposition': 'Giới từ',
        'conjunction': 'Liên từ',
        'interjection': 'Thán từ'
    };
    return labels[pos] || pos || '';
}

/**
 * Parse comma-separated string to array
 */
export function parseList(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Check if string is empty
 */
export function isEmpty(str) {
    return !str || str.trim() === '';
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Get element by ID safely
 */
export function $(id) {
    return document.getElementById(id);
}

/**
 * Query selector shorthand
 */
export function $$(selector) {
    return document.querySelector(selector);
}

/**
 * Query selector all shorthand
 */
export function $$$(selector) {
    return document.querySelectorAll(selector);
}

// Expose common helpers to window
window.generateId = generateId;
window.formatDate = formatDate;
window.debounce = debounce;
window.escapeHtml = escapeHtml;
