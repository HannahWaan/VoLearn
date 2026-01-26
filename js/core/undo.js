/* ========================================
   VoLearn - Undo System
   ======================================== */

import { saveData } from './storage.js';
import { appData } from './state.js';  // THÊM IMPORT NÀY

const MAX_UNDO_STACK = 20;
let undoStack = [];
let redoStack = [];

/**
 * Khởi tạo Undo System
 */
export function initUndoSystem() {
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
 */
export function pushUndo(action) {
    undoStack.push({
        ...action,
        timestamp: Date.now()
    });
    
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
    }
    
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
        saveData(appData);  // SỬA: truyền appData
        
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
        saveData(appData);  // SỬA: truyền appData
        
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

export function clearUndoHistory() {
    undoStack = [];
    redoStack = [];
}

export function canUndo() {
    return undoStack.length > 0;
}

export function canRedo() {
    return redoStack.length > 0;
}
