/* ========================================
   VoLearn - Undo System
   ======================================== */

import { saveData } from './storage.js';

const MAX_UNDO_STACK = 20;
let undoStack = [];
let redoStack = [];

/**
 * Khởi tạo Undo System
 */
export function initUndoSystem() {
    // Bind keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                performRedo();
            } else {
                performUndo();
            }
        }
    });
    
    console.log('✅ Undo system initialized');
}

/**
 * Push một action vào undo stack
 * @param {Object} action - { type, data, undo }
 */
export function pushUndo(action) {
    undoStack.push({
        ...action,
        timestamp: Date.now()
    });
    
    // Limit stack size
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
    }
    
    // Clear redo stack khi có action mới
    redoStack = [];
}

/**
 * Thực hiện Undo
 */
export function performUndo() {
    if (undoStack.length === 0) {
        console.log('Nothing to undo');
        return false;
    }
    
    const action = undoStack.pop();
    
    try {
        if (typeof action.undo === 'function') {
            action.undo();
        }
        
        redoStack.push(action);
        saveData();
        
        window.dispatchEvent(new CustomEvent('volearn:undo', { detail: action }));
        
        if (window.showToast) {
            window.showToast('Đã hoàn tác', 'info', 2000);
        }
        
        return true;
    } catch (error) {
        console.error('Undo error:', error);
        return false;
    }
}

/**
 * Thực hiện Redo
 */
export function performRedo() {
    if (redoStack.length === 0) {
        console.log('Nothing to redo');
        return false;
    }
    
    const action = redoStack.pop();
    
    try {
        if (typeof action.redo === 'function') {
            action.redo();
        }
        
        undoStack.push(action);
        saveData();
        
        window.dispatchEvent(new CustomEvent('volearn:redo', { detail: action }));
        
        if (window.showToast) {
            window.showToast('Đã làm lại', 'info', 2000);
        }
        
        return true;
    } catch (error) {
        console.error('Redo error:', error);
        return false;
    }
}

/**
 * Clear undo/redo stacks
 */
export function clearUndoHistory() {
    undoStack = [];
    redoStack = [];
}

/**
 * Check if can undo
 */
export function canUndo() {
    return undoStack.length > 0;
}

/**
 * Check if can redo
 */
export function canRedo() {
    return redoStack.length > 0;
}
