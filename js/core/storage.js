/* ========================================
   VoLearn - Storage Module
   Quản lý localStorage
   ======================================== */

import { appData, setAppData, DEFAULT_DATA } from './state.js';

const STORAGE_KEY = 'volearn_data';

function sanitizeLoadedData(data) {
    if (!data || typeof data !== 'object') return { data, changed: false };

    let changed = false;

    // Ensure arrays exist
    if (!Array.isArray(data.vocabulary)) {
        data.vocabulary = [];
        changed = true;
    }
    if (!Array.isArray(data.sets)) {
        data.sets = [];
        changed = true;
    }
    if (!Array.isArray(data.history)) {
        data.history = [];
        changed = true;
    }

    // Sanitize practice history durations
    // - duration can accidentally be Unix timestamp seconds (1e9..2e9) -> set to 0
    // - duration can be ms (very large) -> convert to seconds
    for (const h of data.history) {
        if (!h || typeof h !== 'object') continue;
        if (h.type !== 'practice') continue;

        const d = h.duration;

        if (typeof d === 'number' && Number.isFinite(d)) {
            // Unix timestamp seconds ~ years 2001..2033
            if (d >= 1_000_000_000 && d <= 2_000_000_000) {
                h.duration = 0;
                changed = true;
                continue;
            }

            // epoch ms timestamp -> not a duration
            if (d > 1_000_000_000_000) {
                h.duration = 0;
                changed = true;
                continue;
            }

            // likely milliseconds duration -> convert to seconds
            // 10,000,000 seconds ~ 115 days
            if (d > 10_000_000) {
                h.duration = Math.round(d / 1000);
                changed = true;
                continue;
            }

            if (d < 0) {
                h.duration = 0;
                changed = true;
                continue;
            }
        }
    }

    return { data, changed };
}

/**
 * Load dữ liệu từ localStorage
 */
export function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            const merged = {
                ...DEFAULT_DATA,
                ...parsed,
                settings: {
                    ...DEFAULT_DATA.settings,
                    ...(parsed.settings || {})
                }
            };

            // Sanitize data (migrate bad durations, ensure arrays, etc.)
            const sanitized = sanitizeLoadedData(merged);

            setAppData(sanitized.data);

            // If we fixed something, persist immediately so it stays clean
            if (sanitized.changed) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized.data));
                window.dispatchEvent(new CustomEvent('volearn:dataSaved'));
                console.log('  🧹 Sanitized saved data (history durations fixed)');
            }

            console.log(`  📊 Loaded: ${sanitized.data.vocabulary?.length || 0} words, ${sanitized.data.sets?.length || 0} sets`);
        } else {
            console.log('  📊 No saved data, using defaults');
        }

        return true;
    } catch (error) {
        console.error('  ❌ Error loading data:', error);
        return false;
    }
}

/**
 * Lưu dữ liệu vào localStorage
 */
export function saveData(data) {
    try {
        const dataToSave = data || appData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        window.dispatchEvent(new CustomEvent('volearn:dataSaved'));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

/**
 * Xóa tất cả dữ liệu
 */
export function clearAllData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        setAppData({ ...DEFAULT_DATA });
        window.dispatchEvent(new CustomEvent('volearn:dataCleared'));
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
}

/**
 * Xóa tất cả dữ liệu (alias cho clearAllData)
 */
export function clearData() {
    return clearAllData();
}

/**
 * Export dữ liệu ra JSON
 */
export function exportToJSON() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `volearn_backup_${formatDate(new Date())}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Export dữ liệu ra CSV
 */
export function exportToCSV() {
    const vocabulary = appData.vocabulary || [];

    if (vocabulary.length === 0) {
        alert('Không có từ vựng để xuất!');
        return;
    }

    let csv = 'Word,Phonetic US,Phonetic UK,POS,Definition EN,Definition VI,Example,Synonyms,Antonyms,Set,Mastered,Bookmarked\n';

    vocabulary.forEach(word => {
        const meanings = word.meanings || [];
        meanings.forEach(m => {
            const row = [
                escapeCSV(word.word),
                escapeCSV(m.phoneticUS || ''),
                escapeCSV(m.phoneticUK || ''),
                escapeCSV(m.pos || ''),
                escapeCSV(m.defEn || ''),
                escapeCSV(m.defVi || ''),
                escapeCSV(m.example || ''),
                escapeCSV(m.synonyms || ''),
                escapeCSV(m.antonyms || ''),
                escapeCSV(word.setId || ''),
                word.mastered ? 'Yes' : 'No',
                word.bookmarked ? 'Yes' : 'No'
            ];
            csv += row.join(',') + '\n';
        });
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `volearn_vocabulary_${formatDate(new Date())}.csv`;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Import dữ liệu từ JSON file
 */
export function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);

                if (!imported.vocabulary || !Array.isArray(imported.vocabulary)) {
                    throw new Error('Invalid data format');
                }

                const merged = {
                    ...DEFAULT_DATA,
                    ...imported,
                    settings: {
                        ...DEFAULT_DATA.settings,
                        ...(imported.settings || {})
                    }
                };

                const sanitized = sanitizeLoadedData(merged);

                setAppData(sanitized.data);
                saveData(sanitized.data);

                window.dispatchEvent(new CustomEvent('volearn:dataImported'));

                resolve(sanitized.data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// ===== HELPER FUNCTIONS =====

function escapeCSV(str) {
    if (!str) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}
