/* ===== SETTINGS MODULE ===== */
/* VoLearn v2.1.0 - Quản lý cài đặt */

import { appData, setAppData, DEFAULT_DATA } from '../core/state.js';
import { saveData, clearData, loadData } from '../core/storage.js';
import { showToast } from './toast.js';

/* ===== INIT ===== */
export function initSettings() {
    renderSettings();
    bindSettingsEvents();
}

/* ===== RENDER SETTINGS ===== */
export function renderSettings() {
    loadCurrentSettings();
}

function loadCurrentSettings() {
    const settings = appData.settings || {};

    // Voice speed
    const speedSlider = document.getElementById('voice-speed');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) {
        speedSlider.value = settings.speed || 1;
        if (speedValue) speedValue.textContent = `${settings.speed || 1}x`;
    }

    // Voice selection
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
        populateVoices(voiceSelect, settings.voice);
    }

    // Theme
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = settings.darkMode || false;
    }

    // Auto-play
    const autoPlayToggle = document.getElementById('autoplay-toggle');
    if (autoPlayToggle) {
        autoPlayToggle.checked = settings.autoPlay !== false;
    }

    // Show phonetic
    const phoneticToggle = document.getElementById('phonetic-toggle');
    if (phoneticToggle) {
        phoneticToggle.checked = settings.showPhonetic !== false;
    }

    // Sidebar collapsed
    const sidebarToggle = document.getElementById('sidebar-collapsed-toggle');
    if (sidebarToggle) {
        sidebarToggle.checked = settings.sidebarCollapsed || false;
    }

    // Update stats display
    updateStatsDisplay();
}

function populateVoices(select, currentVoice) {
    const voices = speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    select.innerHTML = englishVoices.map(v => `
        <option value="${v.name}" ${v.name === currentVoice ? 'selected' : ''}>
            ${v.name} (${v.lang})
        </option>
    `).join('');

    // If no voices loaded yet, retry
    if (englishVoices.length === 0) {
        speechSynthesis.onvoiceschanged = () => populateVoices(select, currentVoice);
    }
}

function updateStatsDisplay() {
    const totalWords = document.getElementById('stats-total-words');
    const totalSets = document.getElementById('stats-total-sets');
    const currentStreak = document.getElementById('stats-streak');
    const storageUsed = document.getElementById('stats-storage');

    if (totalWords) {
        let count = appData.vocabulary?.length || 0;
        appData.sets?.forEach(s => count += s.words?.length || 0);
        totalWords.textContent = count;
    }

    if (totalSets) {
        totalSets.textContent = appData.sets?.length || 0;
    }

    if (currentStreak) {
        currentStreak.textContent = `${appData.streak || 0} ngày`;
    }

    if (storageUsed) {
        const dataStr = JSON.stringify(appData);
        const bytes = new Blob([dataStr]).size;
        const kb = (bytes / 1024).toFixed(2);
        storageUsed.textContent = `${kb} KB`;
    }
}

/* ===== BIND EVENTS ===== */
function bindSettingsEvents() {
    // Voice speed
    const speedSlider = document.getElementById('voice-speed');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            const speedValue = document.getElementById('speed-value');
            if (speedValue) speedValue.textContent = `${speed}x`;
            
            updateSetting('speed', speed);
        });
    }

    // Voice selection
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            updateSetting('voice', e.target.value);
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            updateSetting('darkMode', isDark);
            applyTheme(isDark);
        });
    }

    // Auto-play toggle
    const autoPlayToggle = document.getElementById('autoplay-toggle');
    if (autoPlayToggle) {
        autoPlayToggle.addEventListener('change', (e) => {
            updateSetting('autoPlay', e.target.checked);
        });
    }

    // Phonetic toggle
    const phoneticToggle = document.getElementById('phonetic-toggle');
    if (phoneticToggle) {
        phoneticToggle.addEventListener('change', (e) => {
            updateSetting('showPhonetic', e.target.checked);
        });
    }

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-collapsed-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('change', (e) => {
            updateSetting('sidebarCollapsed', e.target.checked);
        });
    }

    // Export data button
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Import data button
    const importBtn = document.getElementById('btn-import-data');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            document.getElementById('import-file-input')?.click();
        });
    }

    // Import file input
    const importInput = document.getElementById('import-file-input');
    if (importInput) {
        importInput.addEventListener('change', handleImportFile);
    }

    // Clear data button
    const clearBtn = document.getElementById('btn-clear-data');
    if (clearBtn) {
        clearBtn.addEventListener('click', confirmClearData);
    }

    // Reset settings button
    const resetBtn = document.getElementById('btn-reset-settings');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
}

/* ===== UPDATE SETTING ===== */
function updateSetting(key, value) {
    if (!appData.settings) appData.settings = {};
    appData.settings[key] = value;
    saveData(appData);
    showToast('Đã lưu cài đặt', 'success');
}

/* ===== THEME ===== */
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('volearn-theme', isDark ? 'dark' : 'light');
}

export function loadTheme() {
    const savedTheme = localStorage.getItem('volearn-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    applyTheme(isDark);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = isDark;
}

/* ===== EXPORT DATA ===== */
export function exportData() {
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `volearn-backup-${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Đã xuất dữ liệu thành công!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Lỗi khi xuất dữ liệu', 'error');
    }
}

/* ===== IMPORT DATA ===== */
function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            
            // Validate data structure
            if (!validateImportData(importedData)) {
                showToast('File không hợp lệ', 'error');
                return;
            }

            // Confirm import
            if (confirm('Nhập dữ liệu sẽ ghi đè dữ liệu hiện tại. Bạn có chắc chắn?')) {
                importData(importedData);
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('Lỗi khi đọc file', 'error');
        }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
}

function validateImportData(data) {
    // Basic validation
    return data && typeof data === 'object';
}

function importData(data) {
    // Merge with defaults
    const mergedData = {
        ...DEFAULT_DATA,
        ...data,
        settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) }
    };

    setAppData(mergedData);
    saveData(mergedData);
    
    showToast('Đã nhập dữ liệu thành công!', 'success');
    
    // Refresh UI
    setTimeout(() => location.reload(), 500);
}

/* ===== CLEAR DATA ===== */
function confirmClearData() {
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
        if (confirm('Xác nhận lần cuối: Xóa tất cả dữ liệu?')) {
            clearAllData();
        }
    }
}

function clearAllData() {
    clearData();
    setAppData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
    
    showToast('Đã xóa tất cả dữ liệu', 'success');
    
    setTimeout(() => location.reload(), 500);
}

/* ===== RESET SETTINGS ===== */
function resetSettings() {
    if (confirm('Đặt lại tất cả cài đặt về mặc định?')) {
        appData.settings = { ...DEFAULT_DATA.settings };
        saveData(appData);
        loadCurrentSettings();
        applyTheme(false);
        
        showToast('Đã đặt lại cài đặt', 'success');
    }
}

/* ===== UTILITIES ===== */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/* ===== EXPORTS ===== */
window.exportData = exportData;
