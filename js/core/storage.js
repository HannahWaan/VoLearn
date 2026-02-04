/* ===== STORAGE MODULE ===== */
/* VoLearn v2.2.0 - Local Storage & Export/Import */

import { appData, settings } from './state.js';

/* ===== CONSTANTS ===== */
const STORAGE_KEY = 'volearn_data';

const DEFAULT_DATA = {
    vocabulary: [],
    sets: [],
    history: []
};

/* ===== SANITIZE DATA ===== */
function sanitizeLoadedData(data) {
    if (!data) return { ...DEFAULT_DATA };
    
    const sanitized = {
        vocabulary: Array.isArray(data.vocabulary) ? data.vocabulary : [],
        sets: Array.isArray(data.sets) ? data.sets : [],
        history: Array.isArray(data.history) ? data.history : []
    };
    
    // Normalize practice-history durations
    sanitized.history = sanitized.history.map(entry => {
        if (entry && typeof entry.duration === 'number') {
            // Detect Unix seconds (1,000,000,000 to 2,000,000,000)
            if (entry.duration >= 1000000000 && entry.duration < 2000000000) {
                entry.duration = 0;
            }
            // Detect epoch ms (> 1 trillion)
            else if (entry.duration > 1000000000000) {
                entry.duration = 0;
            }
            // Detect ms that should be seconds (> 10 million ms = ~2.7 hours)
            else if (entry.duration > 10000000) {
                entry.duration = Math.floor(entry.duration / 1000);
            }
            // Negative durations
            else if (entry.duration < 0) {
                entry.duration = 0;
            }
        }
        return entry;
    });
    
    return sanitized;
}

/* ===== LOAD DATA ===== */
export function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            Object.assign(appData, DEFAULT_DATA);
            return appData;
        }
        
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeLoadedData(parsed);
        
        // Check if sanitization made changes
        const wasChanged = JSON.stringify(parsed) !== JSON.stringify(sanitized);
        
        Object.assign(appData, sanitized);
        
        // Auto-save if data was sanitized
        if (wasChanged) {
            saveData(appData);
        }
        
        return appData;
    } catch (error) {
        console.error('Error loading data:', error);
        Object.assign(appData, DEFAULT_DATA);
        return appData;
    }
}

/* ===== SAVE DATA ===== */
export function saveData(data) {
    try {
        const toSave = {
            vocabulary: data.vocabulary || [],
            sets: data.sets || [],
            history: data.history || []
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        
        // Dispatch events for other modules to listen
        window.dispatchEvent(new CustomEvent('volearn:dataSaved', { 
            detail: { 
                vocabularyCount: toSave.vocabulary.length,
                setsCount: toSave.sets.length 
            } 
        }));
        
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

/* ===== CLEAR ALL DATA ===== */
export function clearAllData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(appData, DEFAULT_DATA);
        
        window.dispatchEvent(new CustomEvent('volearn:dataCleared'));
        
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
}

/* ===== CLEAR DATA (Alias) ===== */
export function clearData() {
    return clearAllData();
}

/* ===== EXPORT TO JSON ===== */
export function exportToJSON() {
    const data = {
        vocabulary: appData.vocabulary || [],
        sets: appData.sets || [],
        history: appData.history || [],
        exportedAt: new Date().toISOString(),
        version: '2.2.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `volearn_backup_${today}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return filename;
}

/* ===== EXPORT TO CSV ===== */
export function exportToCSV() {
    const headers = [
        'Word', 'Phonetic US', 'Phonetic UK', 'POS', 
        'Definition EN', 'Definition VI', 'Example', 
        'Synonyms', 'Antonyms', 'Set', 'Mastered', 'Bookmarked'
    ];
    
    const escapeCSV = (str) => {
        if (!str) return '';
        const s = String(str);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };
    
    const getSetName = (setId) => {
        if (!setId) return '';
        const set = appData.sets?.find(s => s.id === setId);
        return set?.name || '';
    };
    
    const rows = [headers.join(',')];
    
    (appData.vocabulary || []).forEach(word => {
        const meanings = word.meanings || [];
        
        if (meanings.length === 0) {
            rows.push([
                escapeCSV(word.word),
                '', '', '', '', '', '', '', '',
                escapeCSV(getSetName(word.setId)),
                word.mastered ? 'Yes' : 'No',
                word.bookmarked ? 'Yes' : 'No'
            ].join(','));
        } else {
            meanings.forEach((m, idx) => {
                rows.push([
                    idx === 0 ? escapeCSV(word.word) : '',
                    escapeCSV(m.phoneticUS),
                    escapeCSV(m.phoneticUK),
                    escapeCSV(m.pos),
                    escapeCSV(m.defEn),
                    escapeCSV(m.defVi),
                    escapeCSV(m.example),
                    escapeCSV(m.synonyms),
                    escapeCSV(m.antonyms),
                    idx === 0 ? escapeCSV(getSetName(word.setId)) : '',
                    idx === 0 ? (word.mastered ? 'Yes' : 'No') : '',
                    idx === 0 ? (word.bookmarked ? 'Yes' : 'No') : ''
                ].join(','));
            });
        }
    });
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `volearn_vocabulary_${today}.csv`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return filename;
}

/* ===== IMPORT FROM JSON ===== */
export function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.vocabulary || !Array.isArray(data.vocabulary)) {
                    reject(new Error('Invalid file format: missing vocabulary array'));
                    return;
                }
                
                const merged = {
                    vocabulary: data.vocabulary,
                    sets: data.sets || [],
                    history: data.history || []
                };
                
                const sanitized = sanitizeLoadedData(merged);
                Object.assign(appData, sanitized);
                saveData(appData);
                
                window.dispatchEvent(new CustomEvent('volearn:dataImported', {
                    detail: {
                        vocabularyCount: sanitized.vocabulary.length,
                        setsCount: sanitized.sets.length
                    }
                }));
                
                resolve({
                    vocabularyCount: sanitized.vocabulary.length,
                    setsCount: sanitized.sets.length
                });
            } catch (error) {
                reject(new Error('Failed to parse JSON file'));
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
