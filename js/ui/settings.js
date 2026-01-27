/**
 * VoLearn - Settings Module
 * Version: 2.1.0
 * Quản lý cài đặt: Giao diện, Giọng đọc, Dữ liệu, Google Drive
 */

import { appData, setAppData, DEFAULT_DATA } from '../core/state.js';
import { saveData, clearData, loadData } from '../core/storage.js';
import { toast } from './toast.js';

// ===== GOOGLE DRIVE CONFIG =====
const GDRIVE_CLIENT_ID = '1053065016561-s84rn7tjsrc16a31s0b7mhs6kg140rvm.apps.googleusercontent.com';
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'volearn-backup.json';

// ===== VOICE STATE =====
let availableVoices = {
    us: [],
    uk: [],
    vi: []
};

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

// ===== VOICE MANAGEMENT =====
function loadVoices() {
    const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length === 0) {
            setTimeout(loadVoiceList, 100);
            return;
        }
        
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Phân loại giọng theo ngôn ngữ
        availableVoices.us = voices.filter(v => 
            v.lang === 'en-US' || v.lang === 'en_US' || v.lang.toLowerCase() === 'en-us'
        );
        
        availableVoices.uk = voices.filter(v => 
            v.lang === 'en-GB' || v.lang === 'en_GB' || v.lang.toLowerCase() === 'en-gb'
        );
        
        availableVoices.vi = voices.filter(v => 
            v.lang.startsWith('vi') || v.lang === 'vi-VN' || v.lang === 'vi_VN'
        );
        
        console.log('US voices:', availableVoices.us.length);
        console.log('UK voices:', availableVoices.uk.length);
        console.log('VI voices:', availableVoices.vi.length);
        
        // Populate selects
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
    
    // Phân loại nam/nữ
    const femaleKeywords = ['female', 'woman', 'girl', 'zira', 'hazel', 'susan', 'linda', 'samantha', 'karen', 'moira', 'tessa', 'fiona', 'victoria', 'alice', 'ellen', 'monica', 'paulina', 'helena', 'catherine', 'anna', 'linh', 'mai', 'huong', 'female'];
    const maleKeywords = ['male', 'man', 'boy', 'david', 'mark', 'james', 'daniel', 'george', 'richard', 'alex', 'tom', 'fred', 'lee', 'oliver', 'ryan', 'nam', 'hung', 'minh', 'male'];
    
    const femaleVoices = [];
    const maleVoices = [];
    const otherVoices = [];
    
    voices.forEach(voice => {
        const nameLower = voice.name.toLowerCase();
        if (femaleKeywords.some(k => nameLower.includes(k))) {
            femaleVoices.push(voice);
        } else if (maleKeywords.some(k => nameLower.includes(k))) {
            maleVoices.push(voice);
        } else {
            otherVoices.push(voice);
        }
    });
    
    // Thêm giọng nữ
    if (femaleVoices.length > 0) {
        femaleVoices.forEach((voice, idx) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `♀ Nữ ${idx + 1} - ${voice.name}`;
            select.appendChild(option);
        });
    }
    
    // Thêm giọng nam
    if (maleVoices.length > 0) {
        maleVoices.forEach((voice, idx) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `♂ Nam ${idx + 1} - ${voice.name}`;
            select.appendChild(option);
        });
    }
    
    // Thêm giọng khác
    if (otherVoices.length > 0) {
        otherVoices.forEach((voice, idx) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name}`;
            select.appendChild(option);
        });
    }
    
    // Load saved value
    const savedValue = localStorage.getItem(`volearn-voice-${selectId}`);
    if (savedValue && [...select.options].some(o => o.value === savedValue)) {
        select.value = savedValue;
    }
}

function testVoice(type) {
    const selectId = `voice-${type}-select`;
    const select = document.getElementById(selectId);
    if (!select || !select.value) {
        toast.warning('Chưa chọn giọng đọc!');
        return;
    }
    
    const voiceName = select.value;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    
    if (!voice) {
        toast.error('Không tìm thấy giọng đọc!');
        return;
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Test text
    let testText = 'Hello, this is a voice test.';
    if (type === 'vi') {
        testText = 'Xin chào, đây là bài kiểm tra giọng đọc.';
    } else if (type === 'uk') {
        testText = 'Hello, this is a British English voice test.';
    }
    
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.voice = voice;
    
    // Get speed
    const speedSlider = document.getElementById('speed-slider');
    utterance.rate = speedSlider ? parseFloat(speedSlider.value) : 1;
    
    speechSynthesis.speak(utterance);
    toast.success(`Đang phát giọng: ${voice.name}`);
}

// ===== SETTINGS MANAGEMENT =====
function loadCurrentSettings() {
    // Theme
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const isDark = document.body.classList.contains('dark-theme') || 
                       localStorage.getItem('volearn-theme') === 'dark';
        themeToggle.checked = isDark;
        if (isDark) document.body.classList.add('dark-theme');
    }
    
    // Font
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        const savedFont = localStorage.getItem('volearn-font') || 'Be Vietnam Pro';
        fontSelect.value = savedFont;
        applyFont(savedFont);
    }
    
    // Speed
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) {
        const savedSpeed = localStorage.getItem('volearn-speed') || '1';
        speedSlider.value = savedSpeed;
        if (speedValue) speedValue.textContent = savedSpeed + 'x';
    }
}

function applyFont(fontFamily) {
    document.body.style.fontFamily = `"${fontFamily}", sans-serif`;
    localStorage.setItem('volearn-font', fontFamily);
}

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('volearn-theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('volearn-theme', 'light');
    }
}

function updateStats() {
    const totalWords = document.getElementById('stats-total-words');
    const totalSets = document.getElementById('stats-total-sets');
    const storageUsed = document.getElementById('stats-storage');
    
    if (totalWords) {
        totalWords.textContent = (appData.vocabulary || []).length;
    }
    
    if (totalSets) {
        totalSets.textContent = (appData.sets || []).length;
    }
    
    if (storageUsed) {
        const dataStr = JSON.stringify(appData);
        const bytes = new Blob([dataStr]).size;
        const kb = (bytes / 1024).toFixed(1);
        storageUsed.textContent = kb + ' KB';
    }
}

// ===== EVENT BINDINGS =====
function bindSettingsEvents() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked);
            toast.success(e.target.checked ? 'Đã bật chế độ tối' : 'Đã bật chế độ sáng');
        });
    }
    
    // Font select
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            applyFont(e.target.value);
            toast.success(`Đã đổi font: ${e.target.value}`);
        });
    }
    
    // Voice selects - save on change
    ['voice-us-select', 'voice-uk-select', 'voice-vi-select'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', (e) => {
                localStorage.setItem(`volearn-${id}`, e.target.value);
            });
        }
    });
    
    // Speed slider
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (speedValue) speedValue.textContent = val + 'x';
            localStorage.setItem('volearn-speed', val);
        });
    }
    
    // Voice test buttons
    const btnTestUS = document.getElementById('btn-test-us');
    const btnTestUK = document.getElementById('btn-test-uk');
    const btnTestVI = document.getElementById('btn-test-vi');
    
    if (btnTestUS) btnTestUS.addEventListener('click', () => testVoice('us'));
    if (btnTestUK) btnTestUK.addEventListener('click', () => testVoice('uk'));
    if (btnTestVI) btnTestVI.addEventListener('click', () => testVoice('vi'));
    
    // Export buttons
    const btnExportJSON = document.getElementById('btn-export-json');
    const btnExportCSV = document.getElementById('btn-export-csv');
    
    if (btnExportJSON) btnExportJSON.addEventListener('click', exportJSON);
    if (btnExportCSV) btnExportCSV.addEventListener('click', exportCSV);
    
    // Import button
    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');
    
    if (btnImport && importFile) {
        btnImport.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleImport);
    }
    
    // Clear data
    const btnClearData = document.getElementById('btn-clear-data');
    if (btnClearData) {
        btnClearData.addEventListener('click', confirmClearData);
    }
    
    // Google Drive buttons
    const btnGdriveLogin = document.getElementById('btn-gdrive-login');
    const btnGdriveLogout = document.getElementById('btn-gdrive-logout');
    const btnGdriveBackup = document.getElementById('btn-gdrive-backup');
    const btnGdriveRestore = document.getElementById('btn-gdrive-restore');
    
    if (btnGdriveLogin) btnGdriveLogin.addEventListener('click', loginGoogleDrive);
    if (btnGdriveLogout) btnGdriveLogout.addEventListener('click', logoutGoogleDrive);
    if (btnGdriveBackup) btnGdriveBackup.addEventListener('click', backupToGoogleDrive);
    if (btnGdriveRestore) btnGdriveRestore.addEventListener('click', restoreFromGoogleDrive);
}

// ===== EXPORT FUNCTIONS =====
function exportJSON() {
    try {
        const exportData = {
            version: '2.1.0',
            exportedAt: new Date().toISOString(),
            vocabulary: appData.vocabulary || [],
            sets: appData.sets || [],
            history: appData.history || {}
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        downloadFile(jsonStr, `volearn-backup-${getDateString()}.json`, 'application/json');
        toast.success('Đã xuất dữ liệu JSON!');
        
    } catch (error) {
        console.error('Export JSON error:', error);
        toast.error('Lỗi khi xuất JSON!');
    }
}

function exportCSV() {
    try {
        const words = appData.vocabulary || [];
        
        if (words.length === 0) {
            toast.warning('Không có dữ liệu để xuất!');
            return;
        }
        
        // Headers - Dòng 1
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
        
        // Tạo các dòng dữ liệu - mỗi từ là 1 dòng ngang
        const rows = [];
        rows.push(headers.join(','));
        
        words.forEach(wordData => {
            // Lấy tên bookshelf
            let bookshelfName = 'Tất cả';
            if (wordData.setId) {
                const set = (appData.sets || []).find(s => s.id === wordData.setId);
                if (set) bookshelfName = set.name;
            }
            
            // Lấy meanings
            const meanings = wordData.meanings || [];
            const firstMeaning = meanings[0] || {};
            
            // Dòng dữ liệu chính
            const row = [
                escapeCSV(wordData.word || ''),
                escapeCSV(wordData.formation || wordData.wordFormation || ''),
                escapeCSV(bookshelfName),
                escapeCSV(firstMeaning.phoneticUS || wordData.phonetics?.us || ''),
                escapeCSV(firstMeaning.phoneticUK || wordData.phonetics?.uk || ''),
                escapeCSV(firstMeaning.pos || ''),
                escapeCSV(firstMeaning.definitionEn || firstMeaning.defEn || ''),
                escapeCSV(firstMeaning.definitionVi || firstMeaning.defVi || ''),
                escapeCSV(firstMeaning.example || ''),
                escapeCSV(Array.isArray(firstMeaning.synonyms) ? firstMeaning.synonyms.join(', ') : (firstMeaning.synonyms || '')),
                escapeCSV(Array.isArray(firstMeaning.antonyms) ? firstMeaning.antonyms.join(', ') : (firstMeaning.antonyms || '')),
                wordData.mastered ? 'yes' : 'no',
                wordData.bookmarked ? 'yes' : 'no'
            ];
            
            rows.push(row.join(','));
            
            // Nếu có nhiều meanings, xuất thêm các dòng phụ
            if (meanings.length > 1) {
                for (let i = 1; i < meanings.length; i++) {
                    const m = meanings[i];
                    const extraRow = [
                        '',
                        '',
                        '',
                        escapeCSV(m.phoneticUS || ''),
                        escapeCSV(m.phoneticUK || ''),
                        escapeCSV(m.pos || ''),
                        escapeCSV(m.definitionEn || m.defEn || ''),
                        escapeCSV(m.definitionVi || m.defVi || ''),
                        escapeCSV(m.example || ''),
                        escapeCSV(Array.isArray(m.synonyms) ? m.synonyms.join(', ') : (m.synonyms || '')),
                        escapeCSV(Array.isArray(m.antonyms) ? m.antonyms.join(', ') : (m.antonyms || '')),
                        '',
                        ''
                    ];
                    rows.push(extraRow.join(','));
                }
            }
        });
        
        // Ghép tất cả dòng thành CSV
        const csvContent = '\ufeff' + rows.join('\n');
        
        downloadFile(csvContent, `volearn-vocabulary-${getDateString()}.csv`, 'text/csv;charset=utf-8');
        toast.success(`Đã xuất ${words.length} từ vựng ra CSV!`);
        
    } catch (error) {
        console.error('Export CSV error:', error);
        toast.error('Lỗi khi xuất CSV!');
    }
}

// ===== IMPORT FUNCTIONS =====
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const content = event.target.result;
        
        if (file.name.endsWith('.json')) {
            importJSON(content);
        } else if (file.name.endsWith('.csv')) {
            importCSV(content);
        } else {
            toast.error('Chỉ hỗ trợ file .json hoặc .csv!');
        }
        
        // Reset input
        e.target.value = '';
    };
    
    reader.onerror = () => {
        toast.error('Lỗi đọc file!');
    };
    
    reader.readAsText(file);
}

function importJSON(content) {
    try {
        const data = JSON.parse(content);
        
        // Validate
        if (!data.vocabulary && !data.sets) {
            toast.error('File JSON không hợp lệ!');
            return;
        }
        
        const wordCount = (data.vocabulary || []).length;
        const setCount = (data.sets || []).length;
        
        if (confirm(`Tìm thấy ${wordCount} từ vựng và ${setCount} bộ từ.\nGhi đè toàn bộ dữ liệu hiện tại?`)) {
            setAppData({
                ...DEFAULT_DATA,
                vocabulary: data.vocabulary || [],
                sets: data.sets || [],
                history: data.history || {}
            });
            
            saveData();
            toast.success('Đã nhập dữ liệu thành công!');
            
            setTimeout(() => location.reload(), 1000);
        }
        
    } catch (error) {
        console.error('Import JSON error:', error);
        toast.error('File JSON không hợp lệ!');
    }
}

function importCSV(content) {
    try {
        // Tách các dòng
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            toast.error('File CSV không có dữ liệu!');
            return;
        }
        
        // Parse header
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        
        // Tìm index của các cột
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
        
        // Kiểm tra cột Word
        if (colIndex.word === -1) {
            toast.error('File CSV phải có cột "Word"!');
            return;
        }
        
        // Parse dữ liệu
        const importedWords = [];
        let currentWord = null;
        
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const wordValue = values[colIndex.word]?.trim();
            
            if (wordValue) {
                // Lưu từ trước
                if (currentWord) {
                    importedWords.push(currentWord);
                }
                
                // Tìm/tạo bookshelf
                const bookshelfName = values[colIndex.bookshelf]?.trim() || 'Tất cả';
                let setId = null;
                
                if (bookshelfName && bookshelfName !== 'Tất cả') {
                    let existingSet = (appData.sets || []).find(s =>
                        s.name.toLowerCase() === bookshelfName.toLowerCase()
                    );
                    
                    if (!existingSet) {
                        existingSet = {
                            id: 'set_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            name: bookshelfName,
                            color: '#667eea',
                            createdAt: new Date().toISOString()
                        };
                        appData.sets = appData.sets || [];
                        appData.sets.push(existingSet);
                    }
                    setId = existingSet.id;
                }
                
                // Tạo từ mới
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
                
                // Thêm meaning đầu tiên
                const meaning = buildMeaningFromRow(values, colIndex);
                if (meaning.definitionEn || meaning.definitionVi || meaning.pos) {
                    currentWord.meanings.push(meaning);
                }
                
            } else if (currentWord) {
                // Meaning phụ
                const meaning = buildMeaningFromRow(values, colIndex);
                if (meaning.definitionEn || meaning.definitionVi || meaning.pos) {
                    currentWord.meanings.push(meaning);
                }
            }
        }
        
        // Từ cuối cùng
        if (currentWord) {
            importedWords.push(currentWord);
        }
        
        if (importedWords.length === 0) {
            toast.error('Không tìm thấy từ vựng hợp lệ!');
            return;
        }
        
        if (confirm(`Tìm thấy ${importedWords.length} từ vựng.\nThêm vào dữ liệu hiện tại?`)) {
            appData.vocabulary = appData.vocabulary || [];
            appData.vocabulary.push(...importedWords);
            
            saveData();
            toast.success(`Đã nhập ${importedWords.length} từ vựng!`);
            
            setTimeout(() => location.reload(), 1000);
        }
        
    } catch (error) {
        console.error('Import CSV error:', error);
        toast.error('Lỗi khi nhập CSV: ' + error.message);
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
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
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
    if (confirm('⚠️ Bạn có chắc muốn XÓA TẤT CẢ dữ liệu?\n\nHành động này không thể hoàn tác!')) {
        if (confirm('Xác nhận lần cuối: XÓA TOÀN BỘ từ vựng và bộ từ?')) {
            clearData();
            toast.success('Đã xóa toàn bộ dữ liệu!');
            setTimeout(() => location.reload(), 1000);
        }
    }
}

// ===== GOOGLE DRIVE =====
function checkOAuthCallback() {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (accessToken) {
            const expiresAt = Date.now() + (parseInt(expiresIn) * 1000);
            localStorage.setItem('volearn-gdrive-token', accessToken);
            localStorage.setItem('volearn-gdrive-expires', expiresAt.toString());
            
            // Clear hash
            history.replaceState(null, '', window.location.pathname);
            
            toast.success('Đăng nhập Google Drive thành công!');
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
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncSection = document.getElementById('gdrive-sync-section');
    const lastSyncEl = document.getElementById('gdrive-last-sync');
    
    if (statusEl) {
        statusEl.textContent = 'Đã kết nối';
        statusEl.className = 'gdrive-status connected';
    }
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (syncSection) syncSection.style.display = 'flex';
    
    if (lastSyncEl) {
        const lastSync = localStorage.getItem('volearn-gdrive-lastsync');
        if (lastSync) {
            lastSyncEl.textContent = 'Lần cuối: ' + new Date(lastSync).toLocaleString('vi-VN');
        }
    }
}

function showGoogleDriveDisconnected() {
    const statusEl = document.getElementById('gdrive-status');
    const loginBtn = document.getElementById('btn-gdrive-login');
    const logoutBtn = document.getElementById('btn-gdrive-logout');
    const syncSection = document.getElementById('gdrive-sync-section');
    
    if (statusEl) {
        statusEl.textContent = 'Chưa kết nối';
        statusEl.className = 'gdrive-status disconnected';
    }
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (syncSection) syncSection.style.display = 'none';
}

function loginGoogleDrive() {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GDRIVE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(GDRIVE_SCOPE)}`;
    
    window.location.href = authUrl;
}

function logoutGoogleDrive() {
    localStorage.removeItem('volearn-gdrive-token');
    localStorage.removeItem('volearn-gdrive-expires');
    localStorage.removeItem('volearn-gdrive-lastsync');
    
    showGoogleDriveDisconnected();
    toast.success('Đã đăng xuất Google Drive!');
}

async function backupToGoogleDrive() {
    const token = localStorage.getItem('volearn-gdrive-token');
    if (!token) {
        toast.error('Vui lòng đăng nhập Google Drive trước!');
        return;
    }
    
    const btn = document.getElementById('btn-gdrive-backup');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang sao lưu...';
    }
    
    try {
        const backupData = {
            version: '2.1.0',
            backupAt: new Date().toISOString(),
            vocabulary: appData.vocabulary || [],
            sets: appData.sets || [],
            history: appData.history || {}
        };
        
        // Check if backup file exists
        const existingFile = await findBackupFile(token);
        
        const metadata = {
            name: BACKUP_FILENAME,
            mimeType: 'application/json'
        };
        
        if (!existingFile) {
            metadata.parents = ['appDataFolder'];
        }
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(backupData)], { type: 'application/json' }));
        
        const url = existingFile
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        
        const response = await fetch(url, {
            method: existingFile ? 'PATCH' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });
        
        if (!response.ok) {
            throw new Error('Backup failed: ' + response.status);
        }
        
        localStorage.setItem('volearn-gdrive-lastsync', new Date().toISOString());
        toast.success('Đã sao lưu lên Google Drive!');
        
        const lastSyncEl = document.getElementById('gdrive-last-sync');
        if (lastSyncEl) {
            lastSyncEl.textContent = 'Lần cuối: ' + new Date().toLocaleString('vi-VN');
        }
        
    } catch (error) {
        console.error('Backup error:', error);
        
        if (error.message.includes('401')) {
            logoutGoogleDrive();
            toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
        } else {
            toast.error('Lỗi sao lưu: ' + error.message);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sao lưu';
        }
    }
}

async function restoreFromGoogleDrive() {
    const token = localStorage.getItem('volearn-gdrive-token');
    if (!token) {
        toast.error('Vui lòng đăng nhập Google Drive trước!');
        return;
    }
    
    const btn = document.getElementById('btn-gdrive-restore');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang khôi phục...';
    }
    
    try {
        const file = await findBackupFile(token);
        
        if (!file) {
            toast.warning('Không tìm thấy file backup trên Google Drive!');
            return;
        }
        
        // Download file content
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Download failed: ' + response.status);
        }
        
        const data = await response.json();
        
        const wordCount = (data.vocabulary || []).length;
        const setCount = (data.sets || []).length;
        
        if (confirm(`Tìm thấy backup với ${wordCount} từ và ${setCount} bộ từ.\nKhôi phục sẽ ghi đè dữ liệu hiện tại. Tiếp tục?`)) {
            setAppData({
                ...DEFAULT_DATA,
                vocabulary: data.vocabulary || [],
                sets: data.sets || [],
                history: data.history || {}
            });
            
            saveData();
            toast.success('Đã khôi phục từ Google Drive!');
            
            setTimeout(() => location.reload(), 1000);
        }
        
    } catch (error) {
        console.error('Restore error:', error);
        
        if (error.message.includes('401')) {
            logoutGoogleDrive();
            toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
        } else {
            toast.error('Lỗi khôi phục: ' + error.message);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Khôi phục';
        }
    }
}

async function findBackupFile(token) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0] : null;
        
    } catch (error) {
        console.error('Find backup error:', error);
        return null;
    }
}

// ===== UTILITIES =====
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
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
    return now.toISOString().split('T')[0];
}

// ===== APPLY SETTINGS ON LOAD =====
export function applySettings() {
    // Apply saved theme
    const savedTheme = localStorage.getItem('volearn-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Apply saved font
    const savedFont = localStorage.getItem('volearn-font');
    if (savedFont) {
        document.body.style.fontFamily = `"${savedFont}", sans-serif`;
    }
}

// ===== EXPORTS =====
window.exportData = exportJSON;
