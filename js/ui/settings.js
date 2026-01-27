/**
 * VoLearn - Settings Module
 * Version: 2.1.0
 */

import { appData, setAppData, DEFAULT_DATA } from '../core/state.js';
import { saveData, clearData, loadData } from '../core/storage.js';
import { showToast, showSuccess, showError, showWarning, showInfo } from './toast.js';

// ===== GOOGLE DRIVE CONFIG =====
const GDRIVE_CLIENT_ID = '1053065016561-s84rn7tjsrc16a31s0b7mhs6kg140rvm.apps.googleusercontent.com';
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'volearn-backup.json';

// ===== VOICE STATE =====
let availableVoices = { us: [], uk: [], vi: [] };

// ===== INITIALIZATION =====
export function initSettings() {
    checkOAuthCallback();
    loadVoices();
    bindSettingsEvents();
    loadCurrentSettings();
    updateStats();
    checkGoogleDriveStatus();
    console.log('✅ Settings initialized');
}

// ===== APPLY SETTINGS ON LOAD =====
export function applySettings() {
    const savedTheme = localStorage.getItem('volearn-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme', 'dark-mode');
    }
    
    const savedFont = localStorage.getItem('volearn-font');
    if (savedFont) {
        document.body.style.fontFamily = `"${savedFont}", sans-serif`;
    }
}

// ===== VOICE MANAGEMENT =====
function loadVoices() {
    const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) {
            setTimeout(loadVoiceList, 100);
            return;
        }
        
        availableVoices.us = voices.filter(v => 
            v.lang === 'en-US' || v.lang === 'en_US' || v.lang.toLowerCase() === 'en-us'
        );
        availableVoices.uk = voices.filter(v => 
            v.lang === 'en-GB' || v.lang === 'en_GB' || v.lang.toLowerCase() === 'en-gb'
        );
        availableVoices.vi = voices.filter(v => 
            v.lang.startsWith('vi') || v.lang === 'vi-VN' || v.lang === 'vi_VN'
        );
        
        populateVoiceSelect('voice-us-select', availableVoices.us, 'US English');
        populateVoiceSelect('voice-uk-select', availableVoices.uk, 'UK English');
        populateVoiceSelect('voice-vi-select', availableVoices.vi, 'Vietnamese');
    };
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoiceList;
    }
    loadVoiceList();
}

function populateVoiceSelect(selectId, voices, label) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    
    if (voices.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = `Không có giọng ${label}`;
        select.appendChild(option);
        select.disabled = true;
        return;
    }
    
    select.disabled = false;
    
    const femaleKeywords = ['female', 'woman', 'girl', 'zira', 'hazel', 'susan', 'linda', 'samantha', 'karen', 'moira', 'tessa', 'fiona', 'victoria', 'alice', 'ellen', 'monica', 'paulina', 'helena', 'catherine', 'anna', 'linh', 'mai', 'huong'];
    const maleKeywords = ['male', 'man', 'boy', 'david', 'mark', 'james', 'daniel', 'george', 'richard', 'alex', 'tom', 'fred', 'lee', 'oliver', 'ryan', 'nam', 'hung', 'minh'];
    
    let femaleVoice = null;
    let maleVoice = null;
    
    for (const voice of voices) {
        const nameLower = voice.name.toLowerCase();
        if (!femaleVoice && femaleKeywords.some(k => nameLower.includes(k))) {
            femaleVoice = voice;
        }
        if (!maleVoice && maleKeywords.some(k => nameLower.includes(k))) {
            maleVoice = voice;
        }
        if (femaleVoice && maleVoice) break;
    }
    
    if (!femaleVoice && !maleVoice) {
        if (voices.length >= 1) femaleVoice = voices[0];
        if (voices.length >= 2) maleVoice = voices[1];
    } else if (!femaleVoice) {
        femaleVoice = voices.find(v => v !== maleVoice) || null;
    } else if (!maleVoice) {
        maleVoice = voices.find(v => v !== femaleVoice) || null;
    }
    
    if (femaleVoice) {
        const option = document.createElement('option');
        option.value = femaleVoice.name;
        option.textContent = `♀ Nữ - ${femaleVoice.name}`;
        select.appendChild(option);
    }
    
    if (maleVoice) {
        const option = document.createElement('option');
        option.value = maleVoice.name;
        option.textContent = `♂ Nam - ${maleVoice.name}`;
        select.appendChild(option);
    }
    
    const savedValue = localStorage.getItem(`volearn-voice-${selectId}`);
    if (savedValue && [...select.options].some(o => o.value === savedValue)) {
        select.value = savedValue;
    }
}

function testVoice(type) {
    const select = document.getElementById(`voice-${type}-select`);
    if (!select || !select.value) {
        showWarning('Chưa chọn giọng đọc!');
        return;
    }
    
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === select.value);
    if (!voice) {
        showError('Không tìm thấy giọng đọc!');
        return;
    }
    
    speechSynthesis.cancel();
    
    let testText = 'Hello, this is a voice test.';
    if (type === 'vi') testText = 'Xin chào, đây là bài kiểm tra giọng đọc.';
    else if (type === 'uk') testText = 'Hello, this is a British English voice test.';
    
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.voice = voice;
    utterance.rate = parseFloat(document.getElementById('speed-slider')?.value || 1);
    
    speechSynthesis.speak(utterance);
    showSuccess(`Đang phát giọng: ${voice.name}`);
}

// ===== SETTINGS MANAGEMENT =====
function loadCurrentSettings() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('volearn-theme');
        const isDark = savedTheme === 'dark' || 
                       document.body.classList.contains('dark-theme') || 
                       document.body.classList.contains('dark-mode');
        themeToggle.checked = isDark;
        if (isDark) document.body.classList.add('dark-theme', 'dark-mode');
    }
    
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        const savedFont = localStorage.getItem('volearn-font') || 'Be Vietnam Pro';
        fontSelect.value = savedFont;
        document.body.style.fontFamily = `"${savedFont}", sans-serif`;
    }
    
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) {
        const savedSpeed = localStorage.getItem('volearn-speed') || '1';
        speedSlider.value = savedSpeed;
        if (speedValue) speedValue.textContent = savedSpeed + 'x';
    }
}

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme', 'dark-mode');
        localStorage.setItem('volearn-theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme', 'dark-mode');
        localStorage.setItem('volearn-theme', 'light');
    }
}

function updateStats() {
    const totalWords = document.getElementById('stats-total-words');
    const totalSets = document.getElementById('stats-total-sets');
    const storageUsed = document.getElementById('stats-storage');
    
    if (totalWords) totalWords.textContent = (appData.vocabulary || []).length;
    if (totalSets) totalSets.textContent = (appData.sets || []).length;
    if (storageUsed) {
        const bytes = new Blob([JSON.stringify(appData)]).size;
        storageUsed.textContent = (bytes / 1024).toFixed(1) + ' KB';
    }
}

// ===== EVENT BINDINGS =====
function bindSettingsEvents() {
    document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
        applyTheme(e.target.checked);
        showSuccess(e.target.checked ? 'Đã bật chế độ tối' : 'Đã bật chế độ sáng');
    });
    
    document.getElementById('font-select')?.addEventListener('change', (e) => {
        document.body.style.fontFamily = `"${e.target.value}", sans-serif`;
        localStorage.setItem('volearn-font', e.target.value);
        showSuccess(`Đã đổi font: ${e.target.value}`);
    });
    
    ['voice-us-select', 'voice-uk-select', 'voice-vi-select'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            localStorage.setItem(`volearn-${id}`, e.target.value);
        });
    });
    
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    speedSlider?.addEventListener('input', (e) => {
        if (speedValue) speedValue.textContent = e.target.value + 'x';
        localStorage.setItem('volearn-speed', e.target.value);
    });
    
    document.getElementById('btn-test-us')?.addEventListener('click', () => testVoice('us'));
    document.getElementById('btn-test-uk')?.addEventListener('click', () => testVoice('uk'));
    document.getElementById('btn-test-vi')?.addEventListener('click', () => testVoice('vi'));
    
    document.getElementById('btn-export-json')?.addEventListener('click', exportJSON);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
    
    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');
    if (btnImport && importFile) {
        btnImport.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleImport);
    }
    
    document.getElementById('btn-clear-data')?.addEventListener('click', confirmClearData);
    document.getElementById('btn-gdrive-login')?.addEventListener('click', loginGoogleDrive);
    document.getElementById('btn-gdrive-logout')?.addEventListener('click', logoutGoogleDrive);
    document.getElementById('btn-gdrive-backup')?.addEventListener('click', backupToGoogleDrive);
    document.getElementById('btn-gdrive-restore')?.addEventListener('click', restoreFromGoogleDrive);
    document.getElementById('btn-data-help')?.addEventListener('click', showDataHelpPopup);
}

// ===== EXPORT FUNCTIONS =====
function exportJSON() {
    try {
        const data = {
            version: '2.1.0',
            exportedAt: new Date().toISOString(),
            vocabulary: appData.vocabulary || [],
            sets: appData.sets || [],
            history: appData.history || {}
        };
        downloadFile(JSON.stringify(data, null, 2), `volearn-backup-${getDateString()}.json`, 'application/json');
        showSuccess('Đã xuất dữ liệu JSON!');
    } catch (error) {
        console.error('Export JSON error:', error);
        showError('Lỗi khi xuất JSON!');
    }
}

function exportCSV() {
    try {
        const words = appData.vocabulary || [];
        
        if (words.length === 0) {
            showWarning('Không có dữ liệu để xuất!');
            return;
        }
        
        // Headers - Dòng 1 (đúng như Excel mẫu)
        const headers = [
            'Word',
            'Word Formation',
            'Bookshelf',
            'Phonetic US',
            'Phonetic UK',
            'POS',
            'Definition (EN)',
            'Definition (VI)',
            'Example',
            'Synonym',
            'Antonym',
            'Mastered',
            'Bookmarked'
        ];
        
        const rows = [];
        rows.push(headers.join(','));
        
        words.forEach(wordData => {
            // Lấy tên bookshelf
            let bookshelfName = 'Tất cả';
            if (wordData.setId) {
                const set = (appData.sets || []).find(s => s.id === wordData.setId);
                if (set) bookshelfName = set.name;
            }
            
            // Lấy meaning đầu tiên
            const meanings = wordData.meanings || [];
            const m = meanings[0] || {};
            
            // Xử lý synonyms và antonyms
            let synonyms = '';
            let antonyms = '';
            
            if (m.synonyms) {
                synonyms = Array.isArray(m.synonyms) ? m.synonyms.join(', ') : m.synonyms;
            }
            if (m.antonyms) {
                antonyms = Array.isArray(m.antonyms) ? m.antonyms.join(', ') : m.antonyms;
            }
            
            // Tạo dòng dữ liệu - MỖI TỪ 1 DÒNG NGANG
            const row = [
                escapeCSV(wordData.word || ''),
                escapeCSV(wordData.formation || wordData.wordFormation || ''),
                escapeCSV(bookshelfName),
                escapeCSV(m.phoneticUS || m.phonetic || wordData.phonetic || ''),
                escapeCSV(m.phoneticUK || m.phonetic || wordData.phonetic || ''),
                escapeCSV(m.pos || ''),
                escapeCSV(m.definitionEn || m.defEn || ''),
                escapeCSV(m.definitionVi || m.defVi || ''),
                escapeCSV(m.example || ''),
                escapeCSV(synonyms),
                escapeCSV(antonyms),
                wordData.mastered ? 'yes' : 'no',
                wordData.bookmarked ? 'yes' : 'no'
            ];
            
            rows.push(row.join(','));
        });
        
        // Tạo CSV với BOM để Excel đọc đúng tiếng Việt
        const csvContent = '\ufeff' + rows.join('\r\n');
        
        downloadFile(csvContent, `volearn-vocabulary-${getDateString()}.csv`, 'text/csv;charset=utf-8');
        showSuccess(`Đã xuất ${words.length} từ vựng ra CSV!`);
        
    } catch (error) {
        console.error('Export CSV error:', error);
        showError('Lỗi khi xuất CSV!');
    }
}

// ===== IMPORT FUNCTIONS =====
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        if (file.name.endsWith('.json')) importJSON(event.target.result);
        else if (file.name.endsWith('.csv')) importCSV(event.target.result);
        else showError('Chỉ hỗ trợ file .json hoặc .csv!');
        e.target.value = '';
    };
    reader.onerror = () => showError('Lỗi đọc file!');
    reader.readAsText(file);
}

function importJSON(content) {
    try {
        const data = JSON.parse(content);
        if (!data.vocabulary && !data.sets) {
            showError('File JSON không hợp lệ!');
            return;
        }
        
        const wordCount = (data.vocabulary || []).length;
        const setCount = (data.sets || []).length;
        
        window.showConfirm({
            title: 'Nhập dữ liệu JSON',
            message: `Tìm thấy ${wordCount} từ và ${setCount} bộ từ.`,
            submessage: 'Dữ liệu hiện tại sẽ bị GHI ĐÈ.',
            type: 'warning',
            confirmText: 'Ghi đè',
            icon: 'fas fa-file-import',
            onConfirm: () => {
                setAppData({ 
                    ...DEFAULT_DATA, 
                    vocabulary: data.vocabulary || [], 
                    sets: data.sets || [], 
                    history: data.history || {} 
                });
                saveData();
                showSuccess('Đã nhập dữ liệu!');
                setTimeout(() => location.reload(), 1000);
            }
        });
    } catch (error) {
        console.error('Import JSON error:', error);
        showError('File JSON không hợp lệ!');
    }
}

function importCSV(content) {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            showError('File CSV không có dữ liệu!');
            return;
        }
        
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const colIndex = {
            word: headers.findIndex(h => h === 'word'),
            formation: headers.findIndex(h => h.includes('formation')),
            bookshelf: headers.findIndex(h => h === 'bookshelf'),
            phoneticUS: headers.findIndex(h => h.includes('phonetic') && h.includes('us')),
            phoneticUK: headers.findIndex(h => h.includes('phonetic') && h.includes('uk')),
            pos: headers.findIndex(h => h === 'pos'),
            defEn: headers.findIndex(h => h.includes('definition') && h.includes('en')),
            defVi: headers.findIndex(h => h.includes('definition') && h.includes('vi')),
            example: headers.findIndex(h => h === 'example'),
            synonyms: headers.findIndex(h => h === 'synonym' || h === 'synonyms'),
            antonyms: headers.findIndex(h => h === 'antonym' || h === 'antonyms'),
            mastered: headers.findIndex(h => h === 'mastered'),
            bookmarked: headers.findIndex(h => h === 'bookmarked')
        };
        
        if (colIndex.word === -1) {
            showError('File CSV phải có cột "Word"!');
            return;
        }
        
        const importedWords = [];
        let currentWord = null;
        
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const wordValue = values[colIndex.word]?.trim();
            
            if (wordValue) {
                if (currentWord) importedWords.push(currentWord);
                
                const bookshelfName = values[colIndex.bookshelf]?.trim() || 'Tất cả';
                let setId = null;
                
                if (bookshelfName && bookshelfName !== 'Tất cả') {
                    let existingSet = (appData.sets || []).find(s => s.name.toLowerCase() === bookshelfName.toLowerCase());
                    if (!existingSet) {
                        existingSet = { id: 'set_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), name: bookshelfName, color: '#667eea', createdAt: new Date().toISOString() };
                        appData.sets = appData.sets || [];
                        appData.sets.push(existingSet);
                    }
                    setId = existingSet.id;
                }
                
                currentWord = {
                    id: 'word_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + i,
                    word: wordValue,
                    formation: values[colIndex.formation]?.trim() || '',
                    setId: setId,
                    meanings: [],
                    mastered: values[colIndex.mastered]?.toLowerCase() === 'yes',
                    bookmarked: values[colIndex.bookmarked]?.toLowerCase() === 'yes',
                    createdAt: new Date().toISOString()
                };
                
                const meaning = buildMeaningFromRow(values, colIndex);
                if (meaning.definitionEn || meaning.definitionVi || meaning.pos) {
                    currentWord.meanings.push(meaning);
                }
            } else if (currentWord) {
                const meaning = buildMeaningFromRow(values, colIndex);
                if (meaning.definitionEn || meaning.definitionVi || meaning.pos) {
                    currentWord.meanings.push(meaning);
                }
            }
        }
        
        if (currentWord) importedWords.push(currentWord);
        
        if (importedWords.length === 0) {
            showError('Không tìm thấy từ vựng hợp lệ!');
            return;
        }
        
        window.showConfirm({
            title: 'Nhập dữ liệu CSV',
            message: `Tìm thấy ${importedWords.length} từ vựng.`,
            submessage: 'Các từ sẽ được THÊM vào dữ liệu hiện tại.',
            type: 'info',
            confirmText: 'Thêm vào',
            icon: 'fas fa-file-csv',
            onConfirm: () => {
                appData.vocabulary = appData.vocabulary || [];
                appData.vocabulary.push(...importedWords);
                saveData();
                showSuccess(`Đã nhập ${importedWords.length} từ vựng!`);
                setTimeout(() => location.reload(), 1000);
            }
        });
    } catch (error) {
        console.error('Import CSV error:', error);
        showError('Lỗi khi nhập CSV!');
    }
}

function buildMeaningFromRow(values, colIndex) {
    const getValue = (idx) => idx >= 0 ? (values[idx]?.trim() || '') : '';
    return {
        phoneticUS: getValue(colIndex.phoneticUS),
        phoneticUK: getValue(colIndex.phoneticUK),
        pos: getValue(colIndex.pos),
        definitionEn: getValue(colIndex.defEn),
        definitionVi: getValue(colIndex.defVi),
        example: getValue(colIndex.example),
        synonyms: getValue(colIndex.synonyms).split(',').map(s => s.trim()).filter(Boolean),
        antonyms: getValue(colIndex.antonyms).split(',').map(s => s.trim()).filter(Boolean)
    };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// ===== DATA MANAGEMENT =====
function confirmClearData() {
    window.showConfirm({
        title: 'Xóa toàn bộ dữ liệu',
        message: 'Bạn có chắc muốn XÓA TẤT CẢ dữ liệu?',
        submessage: '⚠️ Hành động này KHÔNG THỂ hoàn tác!',
        type: 'danger',
        confirmText: 'Xóa tất cả',
        icon: 'fas fa-trash-alt',
        onConfirm: () => {
            clearData();
            showSuccess('Đã xóa toàn bộ dữ liệu!');
            setTimeout(() => location.reload(), 1000);
        }
    });
}

// ===== GOOGLE DRIVE =====
const GDRIVE_FOLDER_NAME = 'VoLearnSync';

function checkOAuthCallback() {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (accessToken) {
            localStorage.setItem('volearn-gdrive-token', accessToken);
            localStorage.setItem('volearn-gdrive-expires', (Date.now() + parseInt(expiresIn) * 1000).toString());
            history.replaceState(null, '', window.location.pathname);
            showSuccess('Đăng nhập Google Drive thành công!');
            showGoogleDriveConnected();
        }
    }
}

function checkGoogleDriveStatus() {
    const token = localStorage.getItem('volearn-gdrive-token');
    const expires = localStorage.getItem('volearn-gdrive-expires');
    
    if (token && expires && Date.now() < parseInt(expires)) {
        showGoogleDriveConnected();
    } else {
        showGoogleDriveDisconnected();
    }
}

function showGoogleDriveConnected() {
    const statusEl = document.getElementById('gdrive-status');
    if (statusEl) { statusEl.textContent = 'Đã kết nối'; statusEl.className = 'gdrive-status connected'; }
    
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncSection = document.getElementById('gdrive-sync-section');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (syncSection) syncSection.style.display = 'flex';
    
    const lastSyncEl = document.getElementById('gdrive-last-sync');
    const lastSync = localStorage.getItem('volearn-gdrive-lastsync');
    if (lastSyncEl && lastSync) lastSyncEl.textContent = 'Lần cuối: ' + new Date(lastSync).toLocaleString('vi-VN');
}

function showGoogleDriveDisconnected() {
    const statusEl = document.getElementById('gdrive-status');
    if (statusEl) { statusEl.textContent = 'Chưa kết nối'; statusEl.className = 'gdrive-status disconnected'; }
    
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncSection = document.getElementById('gdrive-sync-section');
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (syncSection) syncSection.style.display = 'none';
}

function loginGoogleDrive() {
    const redirectUri = window.location.origin + window.location.pathname;
    // Thêm scope để tạo folder và file trên Drive
    const scope = 'https://www.googleapis.com/auth/drive.file';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GDRIVE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
}

function logoutGoogleDrive() {
    localStorage.removeItem('volearn-gdrive-token');
    localStorage.removeItem('volearn-gdrive-expires');
    localStorage.removeItem('volearn-gdrive-lastsync');
    localStorage.removeItem('volearn-gdrive-folderid');
    showGoogleDriveDisconnected();
    showSuccess('Đã đăng xuất Google Drive!');
}

// Tìm hoặc tạo folder VoLearnSync
async function getOrCreateFolder(token) {
    try {
        // Tìm folder đã tồn tại
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GDRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!searchResponse.ok) throw new Error('Search folder failed');
        
        const searchData = await searchResponse.json();
        
        if (searchData.files && searchData.files.length > 0) {
            console.log('📁 Found existing folder:', searchData.files[0].id);
            return searchData.files[0].id;
        }
        
        // Tạo folder mới
        const createResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: GDRIVE_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            }
        );
        
        if (!createResponse.ok) throw new Error('Create folder failed');
        
        const createData = await createResponse.json();
        console.log('📁 Created new folder:', createData.id);
        return createData.id;
        
    } catch (error) {
        console.error('Folder error:', error);
        throw error;
    }
}

// Tạo tên file với ngày tháng
function getBackupFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `volearn-backup-${day}-${month}-${year}.json`;
}

async function backupToGoogleDrive() {
    const token = localStorage.getItem('volearn-gdrive-token');
    if (!token) { showError('Vui lòng đăng nhập Google Drive!'); return; }
    
    const btn = document.getElementById('btn-gdrive-backup');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang sao lưu...'; }
    
    try {
        // Lấy hoặc tạo folder
        const folderId = await getOrCreateFolder(token);
        
        // Tạo dữ liệu backup
        const backupData = {
            version: '2.1.0',
            backupAt: new Date().toISOString(),
            vocabulary: appData.vocabulary || [],
            sets: appData.sets || [],
            history: appData.history || {}
        };
        
        const fileName = getBackupFileName();
        
        // Tìm file cùng tên trong folder (để cập nhật thay vì tạo mới)
        const existingFile = await findBackupFileInFolder(token, folderId, fileName);
        
        // Tạo metadata
        const metadata = {
            name: fileName,
            mimeType: 'application/json'
        };
        
        if (!existingFile) {
            metadata.parents = [folderId];
        }
        
        // Upload file
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' }));
        
        const url = existingFile
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        
        const response = await fetch(url, {
            method: existingFile ? 'PATCH' : 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form
        });
        
        if (!response.ok) throw new Error('Backup failed: ' + response.status);
        
        localStorage.setItem('volearn-gdrive-lastsync', new Date().toISOString());
        localStorage.setItem('volearn-gdrive-folderid', folderId);
        
        showSuccess(`Đã sao lưu: ${fileName}`);
        
        const lastSyncEl = document.getElementById('gdrive-last-sync');
        if (lastSyncEl) lastSyncEl.textContent = 'Lần cuối: ' + new Date().toLocaleString('vi-VN');
        
    } catch (error) {
        console.error('Backup error:', error);
        if (error.message.includes('401')) {
            logoutGoogleDrive();
            showError('Phiên hết hạn. Đăng nhập lại!');
        } else {
            showError('Lỗi sao lưu: ' + error.message);
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sao lưu'; }
    }
}

async function restoreFromGoogleDrive() {
    const token = localStorage.getItem('volearn-gdrive-token');
    if (!token) { showError('Vui lòng đăng nhập Google Drive!'); return; }
    
    const btn = document.getElementById('btn-gdrive-restore');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...'; }
    
    try {
        // Lấy folder
        const folderId = await getOrCreateFolder(token);
        
        // Tìm tất cả file backup trong folder
        const files = await listBackupFiles(token, folderId);
        
        if (!files || files.length === 0) {
            showWarning('Không tìm thấy file backup trong folder VoLearnSync!');
            return;
        }
        
        // Hiển thị popup chọn file
        showRestoreFileSelector(token, files);
        
    } catch (error) {
        console.error('Restore error:', error);
        if (error.message.includes('401')) {
            logoutGoogleDrive();
            showError('Phiên hết hạn. Đăng nhập lại!');
        } else {
            showError('Lỗi: ' + error.message);
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Khôi phục'; }
    }
}

// Tìm file backup trong folder
async function findBackupFileInFolder(token, folderId, fileName) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name='${fileName}' and trashed=false&fields=files(id,name)`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.files?.[0] || null;
    } catch {
        return null;
    }
}

// Liệt kê tất cả file backup trong folder
async function listBackupFiles(token, folderId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains 'volearn-backup' and trashed=false&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data.files || [];
    } catch {
        return [];
    }
}

// Hiển thị popup chọn file khôi phục
function showRestoreFileSelector(token, files) {
    let overlay = document.getElementById('restore-file-selector');
    
    if (overlay) overlay.remove();
    
    overlay = document.createElement('div');
    overlay.id = 'restore-file-selector';
    overlay.className = 'help-popup-overlay show';
    
    const fileListHtml = files.map((file, index) => {
        const date = new Date(file.createdTime).toLocaleString('vi-VN');
        const size = file.size ? (parseInt(file.size) / 1024).toFixed(1) + ' KB' : '';
        return `
            <div class="restore-file-item" onclick="selectRestoreFile('${file.id}', '${token}')">
                <i class="fas fa-file-alt"></i>
                <div class="restore-file-info">
                    <span class="restore-file-name">${file.name}</span>
                    <span class="restore-file-date">${date} ${size ? '• ' + size : ''}</span>
                </div>
            </div>
        `;
    }).join('');
    
    overlay.innerHTML = `
        <div class="help-popup" style="max-width: 500px;">
            <div class="help-popup-header">
                <h4><i class="fas fa-cloud-download-alt"></i> Chọn file khôi phục</h4>
                <button class="help-popup-close" onclick="closeRestoreSelector()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="help-popup-content">
                <p style="margin-bottom: 12px; color: var(--text-muted);">
                    Tìm thấy <strong>${files.length}</strong> file backup trong folder VoLearnSync:
                </p>
                <div class="restore-file-list">
                    ${fileListHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeRestoreSelector();
    });
}

function closeRestoreSelector() {
    const overlay = document.getElementById('restore-file-selector');
    if (overlay) overlay.remove();
}

async function selectRestoreFile(fileId, token) {
    closeRestoreSelector();
    
    const btn = document.getElementById('btn-gdrive-restore');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang khôi phục...'; }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) throw new Error('Download failed: ' + response.status);
        
        const data = await response.json();
        
        const wordCount = (data.vocabulary || []).length;
        const setCount = (data.sets || []).length;
        
        window.showConfirm({
            title: 'Khôi phục từ Google Drive',
            message: `File chứa ${wordCount} từ và ${setCount} bộ từ.`,
            submessage: 'Dữ liệu hiện tại sẽ bị GHI ĐÈ.',
            type: 'warning',
            confirmText: 'Khôi phục',
            icon: 'fas fa-cloud-download-alt',
            onConfirm: () => {
                setAppData({
                    ...DEFAULT_DATA,
                    vocabulary: data.vocabulary || [],
                    sets: data.sets || [],
                    history: data.history || {}
                });
                saveData();
                showSuccess('Đã khôi phục thành công!');
                setTimeout(() => location.reload(), 1000);
            }
        });
        
    } catch (error) {
        console.error('Restore error:', error);
        showError('Lỗi khôi phục: ' + error.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Khôi phục'; }
    }
}

// ===== HELP POPUP =====
function showDataHelpPopup() {
    let overlay = document.getElementById('data-help-popup');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'data-help-popup';
        overlay.className = 'help-popup-overlay';
        overlay.innerHTML = `
            <div class="help-popup">
                <div class="help-popup-header">
                    <h4><i class="fas fa-info-circle"></i> Hướng dẫn sử dụng</h4>
                    <button class="help-popup-close" onclick="closeDataHelpPopup()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="help-popup-content">
                    <p><strong>📊 Chuyển file CSV thành bảng trong Excel:</strong></p>
                    <p>
                        <code>Data</code> → <code>Text to Columns</code> → <code>Delimited</code> 
                        → Chọn <code>Comma</code> (Text qualifier: <code>"</code>) → <code>General</code>
                    </p>
                    
                    <div class="help-note">
                        <p><strong>📁 File JSON:</strong> Sẽ <u>ghi đè</u> lên toàn bộ dữ liệu hiện có.</p>
                        <p><strong>📄 File CSV:</strong> Chỉ <u>thêm mới</u> từ vựng (không kiểm tra trùng).</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDataHelpPopup();
        });
    }
    
    overlay.classList.add('show');
}

function closeDataHelpPopup() {
    const overlay = document.getElementById('data-help-popup');
    if (overlay) overlay.classList.remove('show');
}

window.closeDataHelpPopup = closeDataHelpPopup;

// ===== UTILITIES =====
function escapeCSV(value) {
    if (value == null) return '';
    const str = String(value);
    return (str.includes(',') || str.includes('\n') || str.includes('"')) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function getDateString() {
    return new Date().toISOString().split('T')[0];
}

// ===== EXPORTS =====
window.exportData = exportJSON;
window.closeRestoreSelector = closeRestoreSelector;
window.selectRestoreFile = selectRestoreFile;



