/* ========================================
   VoLearn - System Boot
   Khởi tạo các hệ thống cơ bản
   ======================================== */

import { loadData } from './storage.js';
import { initUndoSystem } from './undo.js';

// UI modules
import { initHome } from '../ui/home.js';
import { initAddWord } from '../ui/addWord.js';
import { initBookshelf } from '../ui/bookshelf.js';
import { initSetView } from '../ui/setView.js';
import { initCalendar } from '../ui/calendar.js';
import { initSettings } from '../ui/settings.js';

// Utils
import { initSpeech } from '../utils/speech.js';

/**
 * Boot tất cả các hệ thống
 */
export function bootApp() {
    console.log('⚙️ Booting VoLearn systems...');

    // 1. Init Undo System
    safeInit(initUndoSystem, 'Undo System');

    // 2. Init Speech (Text-to-Speech)
    safeInit(initSpeech, 'Speech System');

    // 3. Init UI Modules
    safeInit(initHome, 'Home UI');
    safeInit(initAddWord, 'Add Word UI');
    safeInit(initBookshelf, 'Bookshelf UI');
    safeInit(initSetView, 'Set View UI');
    safeInit(initCalendar, 'Calendar UI');
    safeInit(initSettings, 'Settings UI');

    // 4. Update UI với data đã load
    updateAllUI();

    console.log('✅ All systems booted');
}

/**
 * Safe initialization wrapper
 */
function safeInit(fn, name) {
    try {
        if (typeof fn === 'function') {
            fn();
            console.log(`  ✅ ${name}`);
        } else {
            console.warn(`  ⚠️ ${name} not found`);
        }
    } catch (error) {
        console.error(`  ❌ ${name} error:`, error);
    }
}

/**
 * Update tất cả UI
 */
export function updateAllUI() {
    // Dispatch event để các module tự update
    window.dispatchEvent(new CustomEvent('volearn:dataChanged'));
}
