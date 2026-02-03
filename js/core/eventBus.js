/* ===== EVENT BUS ===== */
/* VoLearn v2.1.0 - Pub/Sub Event System */

/**
 * Simple Event Bus for module communication
 */
class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe once to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback(...args);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Clear all listeners for an event
     * @param {string} event - Event name (optional, clears all if not provided)
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }
}

// Create singleton instance
const eventBus = new EventBus();

/* ===== EVENT NAMES ===== */
export const EVENTS = {
    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_SAVED: 'data:saved',
    DATA_CLEARED: 'data:cleared',
    DATA_IMPORTED: 'data:imported',
    
    // Word events
    WORD_ADDED: 'word:added',
    WORD_UPDATED: 'word:updated',
    WORD_DELETED: 'word:deleted',
    
    // Set events
    SET_CREATED: 'set:created',
    SET_UPDATED: 'set:updated',
    SET_DELETED: 'set:deleted',
    
    // Practice events
    PRACTICE_STARTED: 'practice:started',
    PRACTICE_COMPLETED: 'practice:completed',
    PRACTICE_ANSWER: 'practice:answer',
    
    // Navigation events
    NAVIGATE: 'navigate',
    SECTION_CHANGED: 'section:changed',
    
    // UI events
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    TOAST_SHOWN: 'toast:shown',
    SIDEBAR_TOGGLED: 'sidebar:toggled',
    THEME_CHANGED: 'theme:changed',
    
    // Undo events
    UNDO_PUSHED: 'undo:pushed',
    UNDO_PERFORMED: 'undo:performed',
    REDO_PERFORMED: 'redo:performed'
};

/* ===== EXPORTS ===== */
export { eventBus };
export const on = eventBus.on.bind(eventBus);
export const once = eventBus.once.bind(eventBus);
export const off = eventBus.off.bind(eventBus);
export const emit = eventBus.emit.bind(eventBus);
export const clear = eventBus.clear.bind(eventBus);

// Initialize
console.log('✅ EventBus initialized');
