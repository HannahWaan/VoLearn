/* ===== SETTINGS MODULE ===== */
/* VoLearn v2.1.0 - Quản lý cài đặt */

import { appData, setAppData, DEFAULT_DATA } from '../core/state.js';
import { saveData, clearData } from '../core/storage.js';
import { showToast } from './toast.js';

/* ===== AVAILABLE VOICES ===== */
let voicesLoaded = false;
let availableVoices = {
    us: [],
    uk: [],
    vi: []
};

/* ===== INIT ===== */
export function initSettings() {
    loadVoices();
    bindSettingsEvents();
    loadCurrentSettings();
    updateStats();
    console.log('✅ Settings initialized');
}

/* ===== LOAD VOICES ===== */
function loadVoices() {
    const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return;
        
        voicesLoaded = true;
        
        // Filter voices by language
        availableVoices.us = voices.filter(v => 
            v.lang.includes('en-US') || v.lang.includes('en_US')
        );
        availableVoices.uk = voices.filter(v => 
            v.lang.includes('en-GB') || v.lang.includes('en_GB')
        );
        availableVoices.vi = voices.filter(v => 
            v.lang.includes('vi') || v.lang.includes('vi-VN')
        );
        
        // Populate selects
        populateVoiceSelect('voice-us-select', availableVoices.us, appData.settings?.voiceUS);
        populateVoiceSelect('voice-uk-select', availableVoices.uk, appData.settings?.voiceUK);
        populateVoiceSelect('voice-vi-select', availableVoices.vi, appData.settings?.voiceVI);
    };
    
    // Load immediately if available
    loadVoiceList();
    
    // Also listen for voices changed
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoiceList;
    }
    
    // Retry after delay
    setTimeout(loadVoiceList, 500);
}

function populateVoiceSelect(selectId, voices, currentValue) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    if (voices.length === 0) {
        select.innerHTML = '<option value="">Không có giọng đọc</option>';
        return;
    }
    
    // Sort: female first (usually have "female" or "woman" in name)
    const sorted = [...voices].sort((a, b) => {
        const aFemale = /female|woman|zira|samantha|karen|moira|fiona/i.test(a.name);
        const bFemale = /female|woman|zira|samantha|karen|moira|fiona/i.test(b.name);
        if (aFemale && !bFemale) return -1;
        if (!aFemale && bFemale) return 1;
        return a.name.localeCompare(b.name);
    });
    
    select.innerHTML = sorted.map(v => {
        const gender = /female|woman|zira|samantha|karen|moira|fiona/i.test(v.name) ? '♀' : '♂';
        const label = `${gender} ${v.name}`;
        const selected = v.name === currentValue ? 'selected' : '';
        return `<option value="${v.name}" ${selected}>${label}</option>`;
    }).join('');
}

/* ===== LOAD CURRENT SETTINGS ===== */
function loadCurrentSettings() {
    const settings = appData.settings || {};
    
    // Theme
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = settings.theme === 'dark' || settings.darkMode === true;
    }
    
    // Font
    const fontSelect = document.getElementById('font-select');
    if (fontSelect && settings.font) {
        fontSelect.value = settings.font;
    }
    
    // Speed
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) {
        const speed = settings.speed || 1;
        speedSlider.value = speed;
        if (speedValue) speedValue.textContent = `${speed.toFixed(1)}x`;
    }
}

/* ===== UPDATE STATS ===== */
function updateStats() {
    const totalWords = document.getElementById('stats-total-words');
    const totalSets = document.getElementById('stats-total-sets');
    const storageUsed = document.getElementById('stats-storage');
    
    if (totalWords) {
        totalWords.textContent = appData.vocabulary?.length || 0;
    }
    
    if (totalSets) {
        totalSets.textContent = appData.sets?.length || 0;
    }
    
    if (storageUsed) {
        const dataStr = JSON.stringify(appData);
        const bytes = new Blob([dataStr]).size;
        const kb = (bytes / 1024).toFixed(1);
        storageUsed.textContent = `${kb} KB`;
    }
}

/* ===== BIND EVENTS ===== */
function bindSettingsEvents() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        updateSetting('theme', isDark ? 'dark' : 'light');
        updateSetting('darkMode', isDark);
        applyTheme(isDark);
    });
    
    // Font select
    document.getElementById('font-select')?.addEventListener('change', (e) => {
        const font = e.target.value;
        updateSetting('font', font);
        applyFont(font);
    });
    
    // Voice selects
    document.getElementById('voice-us-select')?.addEventListener('change', (e) => {
        updateSetting('voiceUS', e.target.value);
    });
    
    document.getElementById('voice-uk-select')?.addEventListener('change', (e) => {
        updateSetting('voiceUK', e.target.value);
    });
    
    document.getElementById('voice-vi-select')?.addEventListener('change', (e) => {
        updateSetting('voiceVI', e.target.value);
    });
    
    // Speed slider
    document.getElementById('speed-slider')?.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        const speedValue = document.getElementById('speed-value');
        if (speedValue) speedValue.textContent = `${speed.toFixed(1)}x`;
        updateSetting('speed', speed);
    });
    
    // Test voice buttons
    document.getElementById('btn-test-us')?.addEventListener('click', () => testVoice('us'));
    document.getElementById('btn-test-uk')?.addEventListener('click', () => testVoice('uk'));
    document.getElementById('btn-test-vi')?.addEventListener('click', () => testVoice('vi'));
    
    // Data management
    document.getElementById('btn-export-json')?.addEventListener('click', exportJSON);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
    document.getElementById('btn-import')?.addEventListener('click', () => {
        document.getElementById('import-file')?.click();
    });
    document.getElementById('import-file')?.addEventListener('change', handleImport);
    document.getElementById('btn-clear-data')?.addEventListener('click', confirmClearData);
    
    // Google Drive
    document.getElementById('btn-gdrive-login')?.addEventListener('click', loginGoogleDrive);
    document.getElementById('btn-gdrive-logout')?.addEventListener('click', logoutGoogleDrive);
    document.getElementById('btn-gdrive-backup')?.addEventListener('click', backupToDrive);
    document.getElementById('btn-gdrive-restore')?.addEventListener('click', restoreFromDrive);
    
    // Check Google Drive status
    checkGoogleDriveStatus();
}

/* ===== UPDATE SETTING ===== */
function updateSetting(key, value) {
    if (!appData.settings) appData.settings = {};
    appData.settings[key] = value;
    saveData(appData);
}

/* ===== APPLY THEME ===== */
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);
}

/* ===== APPLY FONT ===== */
function applyFont(font) {
    document.documentElement.style.setProperty('--font-family', `'${font}', sans-serif`);
    document.body.style.fontFamily = `'${font}', sans-serif`;
    showToast(`Đã đổi font: ${font}`);
}

/* ===== TEST VOICE ===== */
function testVoice(type) {
    speechSynthesis.cancel();
    
    let voiceName, text, lang;
    const speed = parseFloat(document.getElementById('speed-slider')?.value) || 1;
    
    switch (type) {
        case 'us':
            voiceName = document.getElementById('voice-us-select')?.value;
            text = 'Hello! This is American English voice.';
            lang = 'en-US';
            break;
        case 'uk':
            voiceName = document.getElementById('voice-uk-select')?.value;
            text = 'Hello! This is British English voice.';
            lang = 'en-GB';
            break;
        case 'vi':
            voiceName = document.getElementById('voice-vi-select')?.value;
            text = 'Xin chào! Đây là giọng đọc tiếng Việt.';
            lang = 'vi-VN';
            break;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.lang = lang;
    
    // Find voice by name
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
        utterance.voice = voice;
    }
    
    speechSynthesis.speak(utterance);
    showToast(`Đang test giọng ${type.toUpperCase()}...`);
}

/* ===== EXPORT JSON ===== */
function exportJSON() {
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        downloadFile(blob, `volearn-backup-${getDateString()}.json`);
        showToast('Đã xuất file JSON!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Lỗi khi xuất dữ liệu', 'error');
    }
}

/* ===== EXPORT CSV ===== */
function exportCSV() {
    try {
        const vocabulary = appData.vocabulary || [];
        if (vocabulary.length === 0) {
            showToast('Không có từ vựng để xuất', 'error');
            return;
        }
        
        // CSV header
        let csv = 'Word,Definition (VI),Definition (EN),Example,POS,Phonetic US,Phonetic UK,Mastered,Bookmarked\n';
        
        // CSV rows
        vocabulary.forEach(word => {
            const meaning = word.meanings?.[0] || {};
            const row = [
                escapeCSV(word.word || ''),
                escapeCSV(meaning.defVi || ''),
                escapeCSV(meaning.defEn || ''),
                escapeCSV(meaning.example || ''),
                escapeCSV(meaning.pos || ''),
                escapeCSV(meaning.phoneticUS || word.phoneticUS || ''),
                escapeCSV(meaning.phoneticUK || word.phoneticUK || ''),
                word.mastered ? 'Yes' : 'No',
                word.bookmarked ? 'Yes' : 'No'
            ];
            csv += row.join(',') + '\n';
        });
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        downloadFile(blob, `volearn-vocabulary-${getDateString()}.csv`);
        showToast('Đã xuất file CSV!', 'success');
    } catch (error) {
        console.error('Export CSV error:', error);
        showToast('Lỗi khi xuất CSV', 'error');
    }
}

function escapeCSV(str) {
    if (!str) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/* ===== HANDLE IMPORT ===== */
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (!confirm('Nhập dữ liệu sẽ GHI ĐÈ dữ liệu hiện tại. Bạn có chắc chắn?')) {
                return;
            }
            
            // Merge with defaults
            const merged = {
                ...DEFAULT_DATA,
                ...data,
                settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) }
            };
            
            setAppData(merged);
            saveData(merged);
            showToast('Đã nhập dữ liệu thành công!', 'success');
            
            setTimeout(() => location.reload(), 500);
        } catch (error) {
            console.error('Import error:', error);
            showToast('File không hợp lệ', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

/* ===== CLEAR DATA ===== */
function confirmClearData() {
    if (!confirm('Bạn có chắc chắn muốn XÓA TẤT CẢ dữ liệu?\n\nHành động này KHÔNG THỂ hoàn tác!')) {
        return;
    }
    
    if (!confirm('XÁC NHẬN LẦN CUỐI: Xóa tất cả dữ liệu?')) {
        return;
    }
    
    clearData();
    setAppData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
    showToast('Đã xóa tất cả dữ liệu', 'success');
    setTimeout(() => location.reload(), 500);
}

/* ===== GOOGLE DRIVE ===== */
const GDRIVE_CLIENT_ID = '1053065016561-s84rn7tjsrc16a31s0b7mhs6kg140rvm.apps.googleusercontent.com';
const GDRIVE_API_KEY = ''; 
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'volearn-backup.json';

let gdriveToken = null;

function checkGoogleDriveStatus() {
    const statusEl = document.getElementById('gdrive-status');
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncActions = document.querySelector('.gdrive-sync-actions');
    
    // Check if token exists in localStorage
    gdriveToken = localStorage.getItem('volearn-gdrive-token');
    
    if (gdriveToken) {
        // Verify token is still valid
        verifyGoogleToken().then(valid => {
            if (valid) {
                showGoogleDriveConnected();
            } else {
                showGoogleDriveDisconnected();
            }
        });
    } else {
        showGoogleDriveDisconnected();
    }
}

function showGoogleDriveConnected() {
    const statusEl = document.getElementById('gdrive-status');
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncSection = document.getElementById('gdrive-sync-section');
    const lastSyncEl = document.getElementById('gdrive-last-sync');
    
    if (statusEl) {
        statusEl.className = 'gdrive-status connected';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã kết nối</span>';
    }
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (syncSection) syncSection.style.display = 'flex';
    
    const lastSync = localStorage.getItem('volearn-gdrive-lastsync');
    if (lastSyncEl && lastSync) {
        lastSyncEl.textContent = `Lần cuối: ${new Date(lastSync).toLocaleString('vi-VN')}`;
    }
}

function showGoogleDriveDisconnected() {
    const statusEl = document.getElementById('gdrive-status');
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncSection = document.getElementById('gdrive-sync-section');
    
    if (statusEl) {
        statusEl.className = 'gdrive-status disconnected';
        statusEl.innerHTML = '<i class="fas fa-times-circle"></i><span>Chưa kết nối</span>';
    }
    if (loginBtn) loginBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (syncSection) syncSection.style.display = 'none';
}

async function verifyGoogleToken() {
    if (!gdriveToken) return false;
    
    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${gdriveToken}`);
        return response.ok;
    } catch {
        return false;
    }
}

function loginGoogleDrive() {
    if (!GDRIVE_CLIENT_ID) {
        showToast('Chưa cấu hình Google Drive API', 'error');
        console.warn('Cần điền GDRIVE_CLIENT_ID và GDRIVE_API_KEY');
        return;
    }
    
    // OAuth2 URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GDRIVE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(GDRIVE_SCOPE)}`;
    
    // Open in popup
    const popup = window.open(authUrl, 'Google Login', 'width=500,height=600');
    
    // Listen for token from popup
    const checkPopup = setInterval(() => {
        try {
            if (popup.closed) {
                clearInterval(checkPopup);
                return;
            }
            
            const hash = popup.location.hash;
            if (hash && hash.includes('access_token')) {
                clearInterval(checkPopup);
                popup.close();
                
                // Extract token
                const params = new URLSearchParams(hash.substring(1));
                gdriveToken = params.get('access_token');
                
                if (gdriveToken) {
                    localStorage.setItem('volearn-gdrive-token', gdriveToken);
                    showGoogleDriveConnected();
                    showToast('Đã kết nối Google Drive!', 'success');
                }
            }
        } catch (e) {
            // Cross-origin error - ignore
        }
    }, 500);
}

function logoutGoogleDrive() {
    if (confirm('Đăng xuất khỏi Google Drive?')) {
        localStorage.removeItem('volearn-gdrive-token');
        gdriveToken = null;
        showGoogleDriveDisconnected();
        showToast('Đã đăng xuất Google Drive');
    }
}

async function backupToDrive() {
    if (!gdriveToken) {
        showToast('Vui lòng đăng nhập Google Drive trước', 'error');
        return;
    }
    
    showToast('Đang sao lưu...', 'info');
    
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        // Check if backup file exists
        const existingFile = await findBackupFile();
        
        let response;
        if (existingFile) {
            // Update existing file
            response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${gdriveToken}`,
                    'Content-Type': 'application/json'
                },
                body: blob
            });
        } else {
            // Create new file in appDataFolder
            const metadata = {
                name: BACKUP_FILENAME,
                parents: ['appDataFolder']
            };
            
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', blob);
            
            response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gdriveToken}`
                },
                body: formData
            });
        }
        
        if (response.ok) {
            localStorage.setItem('volearn-gdrive-lastsync', new Date().toISOString());
            showGoogleDriveConnected();
            showToast('Sao lưu thành công!', 'success');
        } else {
            throw new Error('Backup failed');
        }
    } catch (error) {
        console.error('Backup error:', error);
        showToast('Lỗi khi sao lưu', 'error');
    }
}

async function restoreFromDrive() {
    if (!gdriveToken) {
        showToast('Vui lòng đăng nhập Google Drive trước', 'error');
        return;
    }
    
    if (!confirm('Khôi phục dữ liệu từ Google Drive sẽ GHI ĐÈ dữ liệu hiện tại. Tiếp tục?')) {
        return;
    }
    
    showToast('Đang khôi phục...', 'info');
    
    try {
        const existingFile = await findBackupFile();
        
        if (!existingFile) {
            showToast('Không tìm thấy bản sao lưu trên Drive', 'error');
            return;
        }
        
        // Download file content
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${gdriveToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const data = await response.json();
        
        // Merge with defaults
        const merged = {
            ...DEFAULT_DATA,
            ...data,
            settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) }
        };
        
        setAppData(merged);
        saveData(merged);
        
        localStorage.setItem('volearn-gdrive-lastsync', new Date().toISOString());
        showToast('Khôi phục thành công!', 'success');
        
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        console.error('Restore error:', error);
        showToast('Lỗi khi khôi phục', 'error');
    }
}

async function findBackupFile() {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'`,
            {
                headers: {
                    'Authorization': `Bearer ${gdriveToken}`
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.files?.[0] || null;
    } catch {
        return null;
    }
}

/* ===== UTILITIES ===== */
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/* ===== APPLY SETTINGS ON LOAD ===== */
export function applySettings() {
    const settings = appData.settings || {};
    
    // Apply theme
    const isDark = settings.theme === 'dark' || settings.darkMode === true;
    applyTheme(isDark);
    
    // Apply font
    if (settings.font) {
        applyFont(settings.font);
    }
}

/* ===== EXPORTS ===== */
export { applyTheme, applyFont };
window.exportData = exportJSON;
