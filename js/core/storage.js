/* ========================================
   VoLearn - Storage Module
   Quản lý localStorage
   ======================================== */

import { appData, setAppData, DEFAULT_DATA } from './state.js';

const STORAGE_KEY = 'volearn_data';

/**
 * Load dữ liệu từ localStorage
 */
export function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Merge với default để đảm bảo có đủ fields
            const merged = {
                ...DEFAULT_DATA,
                ...parsed,
                settings: {
                    ...DEFAULT_DATA.settings,
                    ...(parsed.settings || {})
                }
            };
            
            setAppData(merged);
            console.log(`  📊 Loaded: ${merged.vocabulary?.length || 0} words, ${merged.sets?.length || 0} sets`);
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
 * @param {Object} data - Dữ liệu cần lưu (optional, mặc định dùng appData)
 */
export function saveData(data) {
    try {
        const dataToSave = data || appData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        
        // Dispatch event
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

// Alias cho clearAllData (để tương thích với các file khác)
export const clearData = clearAllData;

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
    
    // CSV header
    let csv = 'Word,Phonetic US,Phonetic UK,POS,Definition EN,Definition VI,Example,Synonyms,Antonyms,Set,Mastered,Bookmarked\n';
    
    // CSV rows
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
                
                // Validate
                if (!imported.vocabulary || !Array.isArray(imported.vocabulary)) {
                    throw new Error('Invalid data format');
                }
                
                // Merge hoặc replace
                const merged = {
                    ...DEFAULT_DATA,
                    ...imported,
                    settings: {
                        ...DEFAULT_DATA.settings,
                        ...(imported.settings || {})
                    }
                };
                
                setAppData(merged);
                saveData(merged);
                
                window.dispatchEvent(new CustomEvent('volearn:dataImported'));
                
                resolve(merged);
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
