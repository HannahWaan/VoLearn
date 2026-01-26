/* ========================================
   VoLearn - Event Bus
   Pub/Sub pattern for module communication
   ======================================== */

const events = {};

/**
 * Subscribe to an event
 * @param {string} eventName 
 * @param {Function} callback 
 * @returns {Function} unsubscribe function
 */
export function on(eventName, callback) {
    if (!events[eventName]) {
        events[eventName] = [];
    }
    events[eventName].push(callback);
    
    // Return unsubscribe function
    return () => off(eventName, callback);
}

/**
 * Unsubscribe from an event
 * @param {string} eventName 
 * @param {Function} callback 
 */
export function off(eventName, callback) {
    if (!events[eventName]) return;
    
    events[eventName] = events[eventName].filter(cb => cb !== callback);
}

/**
 * Emit an event
 * @param {string} eventName 
 * @param {*} data 
 */
export function emit(eventName, data) {
    if (!events[eventName]) return;
    
    events[eventName].forEach(callback => {
        try {
            callback(data);
        } catch (error) {
            console.error(`Error in event handler for ${eventName}:`, error);
        }
    });
}

/**
 * Subscribe to an event only once
 * @param {string} eventName 
 * @param {Function} callback 
 */
export function once(eventName, callback) {
    const wrapper = (data) => {
        callback(data);
        off(eventName, wrapper);
    };
    on(eventName, wrapper);
}

/**
 * Clear all events
 */
export function clear() {
    Object.keys(events).forEach(key => {
        delete events[key];
    });
}

/**
 * Get all registered events (for debugging)
 */
export function getEvents() {
    return { ...events };
}

// Expose to window for global access
window.eventBus = { on, off, emit, once, clear };
