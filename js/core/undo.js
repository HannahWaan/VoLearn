/* ========================================
   VoLearn - Undo System
   ======================================== */

import { saveData } from './storage.js';
import { appData } from './state.js';

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
 * Push state vào undo stack (snapshot toàn bộ appData)
 */
export function pushUndoState() {
    // Clone deep appData
    const snapshot = JSON.parse(JSON.stringify(appData));
    
    undoStack.push({
        type: 'snapshot',
        data: snapshot,
        timestamp: Date.now()
    });
    
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
    }
    
    redoStack = [];
}

/**
 * Push một action cụ thể vào undo stack
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
        if (action.type === 'snapshot' && action.data) {
            // Restore snapshot
            Object.assign(appData, action.data);
            saveData(appData);
        } else if (typeof action.undo === 'function') {
            action.undo();
            saveData(appData);
        }
        
        redoStack.push(action);
        
        window.dispatchEvent(new CustomEvent('volearn:undo', { detail: action }));
        
        if (window.showToast) {
            window.showToast('Đã hoàn tác', 'info', 2000);
        }
        
        // Refresh UI
        if (window.renderShelves) window.renderShelves();
        if (window.renderHome) window.renderHome();
        
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
        saveData(appData);
        
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
