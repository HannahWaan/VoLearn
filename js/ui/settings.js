/* ===== SETTINGS MODULE ===== */
/* VoLearn v2.1.0 - Quản lý cài đặt */

import { appData, setAppData, DEFAULT_DATA } from '../core/state.js';
import { saveData, clearData } from '../core/storage.js';
import { showToast } from './toast.js';

/* ===== VOICE STATE ===== */
let availableVoices = {
    us: [],
    uk: [],
    vi: []
};

/* ===== INIT ===== */
export function initSettings() {
    checkOAuthCallback();
    loadVoices();
    bindSettingsEvents();
    loadCurrentSettings();
    updateStats();
    console.log('✅ Settings initialized');
}

/* ===== LOAD OFFLINE VOICES ONLY ===== */
function loadVoices() {
    const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return;
        
        console.log('All voices:', voices.map(v => `${v.name} (${v.lang}) - local: ${v.localService}`));
        
        // Lọc theo ngôn ngữ - KHÔNG filter offline
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
        
        // Populate selects với giọng nam/nữ
        populateVoiceSelect('voice-us-select', availableVoices.us, appData.settings?.voiceUS, 'US');
        populateVoiceSelect('voice-uk-select', availableVoices.uk, appData.settings?.voiceUK, 'UK');
        populateVoiceSelect('voice-vi-select', availableVoices.vi, appData.settings?.voiceVI, 'VN');
    };
    
    // Load ngay
    loadVoiceList();
    
    // Listen for voices changed (Chrome cần)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoiceList;
    }
    
    // Retry
    setTimeout(loadVoiceList, 100);
    setTimeout(loadVoiceList, 500);
    setTimeout(loadVoiceList, 1000);
}

function classifyVoices(voices) {
    // Keywords để nhận diện giọng nữ
    const femaleKeywords = /female|woman|zira|samantha|karen|moira|fiona|susan|hazel|linda|lisa|victoria|anna|maria|huong|mai|linh|an|female/i;
    // Keywords để nhận diện giọng nam
    const maleKeywords = /male|man|david|mark|james|daniel|george|richard|nam|minh|hung|tuan|male/i;
    
    let female = null;
    let male = null;
    
    for (const voice of voices) {
        if (!female && femaleKeywords.test(voice.name)) {
            female = voice;
        } else if (!male && maleKeywords.test(voice.name)) {
            male = voice;
        }
        
        // Nếu không match keyword, dựa vào thứ tự (thường nữ trước)
        if (!female && !male) {
            female = voice;
        } else if (female && !male && voice !== female) {
            male = voice;
        }
        
        if (female && male) break;
    }
    
    // Nếu chỉ có 1 giọng
    if (!male && female) male = female;
    if (!female && male) female = male;
    
    return { male, female };
}

function populateVoiceSelect(selectId, voices, currentValue, label) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    
    if (!voices || voices.length === 0) {
        select.innerHTML = `<option value="">Không có giọng ${label}</option>`;
        return;
    }
    
    // Phân loại nam/nữ
    const femaleKeywords = /female|woman|zira|samantha|karen|moira|fiona|susan|hazel|linda|lisa|victoria|anna|maria|huong|mai|linh|thi|nga|female|feminina|femenina/i;
    const maleKeywords = /male|man|david|mark|james|daniel|george|richard|nam|minh|hung|tuan|son|masculine|masculina/i;
    
    let femaleVoice = null;
    let maleVoice = null;
    
    // Tìm giọng nữ và nam
    for (const voice of voices) {
        const isFemale = femaleKeywords.test(voice.name);
        const isMale = maleKeywords.test(voice.name);
        
        if (isFemale && !femaleVoice) {
            femaleVoice = voice;
        } else if (isMale && !maleVoice) {
            maleVoice = voice;
        }
    }
    
    // Nếu không tìm được qua keyword, lấy theo thứ tự
    if (!femaleVoice && !maleVoice && voices.length > 0) {
        femaleVoice = voices[0];
        if (voices.length > 1) {
            maleVoice = voices[1];
        }
    } else if (!femaleVoice && maleVoice) {
        // Có nam nhưng không có nữ - tìm giọng khác làm nữ
        for (const voice of voices) {
            if (voice !== maleVoice) {
                femaleVoice = voice;
                break;
            }
        }
    } else if (femaleVoice && !maleVoice) {
        // Có nữ nhưng không có nam - tìm giọng khác làm nam
        for (const voice of voices) {
            if (voice !== femaleVoice) {
                maleVoice = voice;
                break;
            }
        }
    }
    
    // Thêm options
    if (femaleVoice) {
        const shortName = femaleVoice.name.split(' ').slice(0, 2).join(' ');
        const selected = currentValue === femaleVoice.name ? 'selected' : '';
        select.innerHTML += `<option value="${femaleVoice.name}" ${selected}>♀ Nữ - ${shortName}</option>`;
    }
    
    if (maleVoice && maleVoice !== femaleVoice) {
        const shortName = maleVoice.name.split(' ').slice(0, 2).join(' ');
        const selected = currentValue === maleVoice.name ? 'selected' : '';
        select.innerHTML += `<option value="${maleVoice.name}" ${selected}>♂ Nam - ${shortName}</option>`;
    }
    
    // Nếu vẫn không có gì, hiển thị tất cả voices
    if (select.innerHTML === '') {
        voices.forEach(voice => {
            const shortName = voice.name.split(' ').slice(0, 2).join(' ');
            const selected = currentValue === voice.name ? 'selected' : '';
            select.innerHTML += `<option value="${voice.name}" ${selected}>${shortName}</option>`;
        });
    }
    
    // Log để debug
    console.log(`${label} voices:`, { female: femaleVoice?.name, male: maleVoice?.name });
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
    
    let voiceName, text, lang, fallbackLang;
    const speed = parseFloat(document.getElementById('speed-slider')?.value) || 1;
    
    switch (type) {
        case 'us':
            voiceName = document.getElementById('voice-us-select')?.value;
            text = 'Hello! This is American English voice.';
            lang = 'en-US';
            fallbackLang = 'en';
            break;
        case 'uk':
            voiceName = document.getElementById('voice-uk-select')?.value;
            text = 'Hello! This is British English voice.';
            lang = 'en-GB';
            fallbackLang = 'en';
            break;
        case 'vi':
            voiceName = document.getElementById('voice-vi-select')?.value;
            text = 'Xin chào! Đây là giọng đọc tiếng Việt.';
            lang = 'vi-VN';
            fallbackLang = 'vi';
            break;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    
    // Tìm voice theo tên
    const voices = speechSynthesis.getVoices();
    let voice = voices.find(v => v.name === voiceName);
    
    // Fallback: tìm theo ngôn ngữ
    if (!voice) {
        voice = voices.find(v => v.lang === lang) || 
                voices.find(v => v.lang.startsWith(fallbackLang));
    }
    
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
        console.log('Using voice:', voice.name, voice.lang);
    } else {
        utterance.lang = lang;
        console.log('No specific voice found, using lang:', lang);
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

/* ===== EXPORT CSV - THEO CẤU TRÚC MỚI ===== */
function exportCSV() {
    try {
        const vocabulary = appData.vocabulary || [];
        if (vocabulary.length === 0) {
            showToast('Không có từ vựng để xuất', 'error');
            return;
        }
        
        // Headers - dòng đầu tiên
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
        
        // Tạo các dòng dữ liệu
        const rows = [headers];
        
        vocabulary.forEach(word => {
            const meaning = word.meanings?.[0] || {};
            const setName = appData.sets?.find(s => s.id === word.setId)?.name || 'Tất cả';
            
            const row = [
                word.word || '',
                word.formation || '',
                setName,
                meaning.phoneticUS || word.phoneticUS || '',
                meaning.phoneticUK || word.phoneticUK || '',
                meaning.pos || '',
                meaning.defEn || '',
                meaning.defVi || '',
                meaning.example || '',
                meaning.synonyms || '',
                meaning.antonyms || '',
                word.mastered ? 'yes' : 'no',
                word.bookmarked ? 'yes' : 'no'
            ];
            
            rows.push(row);
        });
        
        // Chuyển thành CSV string
        const csv = rows.map(row => 
            row.map(cell => escapeCSV(cell)).join(',')
        ).join('\n');
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        downloadFile(blob, `volearn-vocabulary-${getDateString()}.csv`);
        showToast('Đã xuất file CSV!', 'success');
    } catch (error) {
        console.error('Export CSV error:', error);
        showToast('Lỗi khi xuất CSV', 'error');
    }
}

function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/* ===== HANDLE IMPORT - JSON hoặc CSV ===== */
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            if (fileName.endsWith('.json')) {
                importJSON(event.target.result);
            } else if (fileName.endsWith('.csv')) {
                importCSV(event.target.result);
            } else {
                showToast('Chỉ hỗ trợ file JSON hoặc CSV', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('Lỗi khi đọc file: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    e.target.value = '';
}

function importJSON(content) {
    const data = JSON.parse(content);
    
    if (!confirm('Nhập dữ liệu JSON sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại.\n\nBạn có chắc chắn?')) {
        return;
    }
    
    const merged = {
        ...DEFAULT_DATA,
        ...data,
        settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) }
    };
    
    setAppData(merged);
    saveData(merged);
    showToast('Đã nhập dữ liệu JSON thành công!', 'success');
    
    setTimeout(() => location.reload(), 500);
}

function importCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        showToast('File CSV không có dữ liệu', 'error');
        return;
    }
    
    // Parse header (dòng đầu tiên)
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Tìm index của từng cột
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
        synonym: headers.findIndex(h => h.includes('synonym')),
        antonym: headers.findIndex(h => h.includes('antonym')),
        mastered: headers.findIndex(h => h === 'mastered'),
        bookmarked: headers.findIndex(h => h === 'bookmarked')
    };
    
    // Kiểm tra cột Word bắt buộc
    if (colIndex.word === -1) {
        showToast('File CSV thiếu cột "Word"', 'error');
        return;
    }
    
    const wordCount = lines.length - 1; // Trừ header
    
    if (!confirm(`Tìm thấy ${wordCount} từ vựng.\n\nNhập CSV sẽ THÊM vào dữ liệu hiện tại.\nBạn có muốn tiếp tục?`)) {
        return;
    }
    
    // Parse từng dòng dữ liệu (bắt đầu từ dòng 2)
    const newWords = [];
    
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        
        const getValue = (index) => {
            if (index === -1 || index >= row.length) return '';
            return row[index]?.trim() || '';
        };
        
        const word = getValue(colIndex.word);
        if (!word) continue;
        
        // Tìm hoặc tạo set
        const bookshelfName = getValue(colIndex.bookshelf);
        let setId = null;
        if (bookshelfName && bookshelfName !== 'Tất cả' && bookshelfName.toLowerCase() !== 'tất cả') {
            let set = appData.sets?.find(s => s.name === bookshelfName);
            if (!set) {
                set = {
                    id: generateId(),
                    name: bookshelfName,
                    color: '#667eea',
                    createdAt: new Date().toISOString()
                };
                if (!appData.sets) appData.sets = [];
                appData.sets.push(set);
            }
            setId = set.id;
        }
        
        const newWord = {
            id: generateId(),
            word: word,
            formation: getValue(colIndex.formation),
            setId: setId,
            phoneticUS: getValue(colIndex.phoneticUS),
            phoneticUK: getValue(colIndex.phoneticUK),
            meanings: [{
                phoneticUS: getValue(colIndex.phoneticUS),
                phoneticUK: getValue(colIndex.phoneticUK),
                pos: getValue(colIndex.pos),
                defEn: getValue(colIndex.defEn),
                defVi: getValue(colIndex.defVi),
                example: getValue(colIndex.example),
                synonyms: getValue(colIndex.synonym),
                antonyms: getValue(colIndex.antonym)
            }],
            mastered: getValue(colIndex.mastered).toLowerCase() === 'yes',
            bookmarked: getValue(colIndex.bookmarked).toLowerCase() === 'yes',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        newWords.push(newWord);
    }
    
    if (newWords.length === 0) {
        showToast('Không có từ vựng hợp lệ để nhập', 'error');
        return;
    }
    
    // Thêm vào vocabulary
    if (!appData.vocabulary) appData.vocabulary = [];
    appData.vocabulary.push(...newWords);
    
    saveData(appData);
    showToast(`Đã nhập ${newWords.length} từ vựng!`, 'success');
    
    setTimeout(() => location.reload(), 500);
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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
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
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'volearn-backup.json';

let gdriveToken = null;

function checkOAuthCallback() {
    const hash = window.location.hash;
    
    if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        
        if (token) {
            localStorage.setItem('volearn-gdrive-token', token);
            gdriveToken = token;
            history.replaceState(null, '', window.location.pathname);
            
            setTimeout(() => {
                showGoogleDriveConnected();
                showToast('Đã kết nối Google Drive!', 'success');
            }, 500);
        }
    }
}

function checkGoogleDriveStatus() {
    gdriveToken = localStorage.getItem('volearn-gdrive-token');
    
    if (gdriveToken) {
        verifyGoogleToken().then(valid => {
            if (valid) {
                showGoogleDriveConnected();
            } else {
                localStorage.removeItem('volearn-gdrive-token');
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
    const redirectUri = window.location.origin + window.location.pathname;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GDRIVE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(GDRIVE_SCOPE)}` +
        `&include_granted_scopes=true` +
        `&prompt=consent`;
    
    window.location.href = authUrl;
}

function logoutGoogleDrive() {
    if (confirm('Đăng xuất khỏi Google Drive?')) {
        localStorage.removeItem('volearn-gdrive-token');
        localStorage.removeItem('volearn-gdrive-lastsync');
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
    
    const btn = document.getElementById('btn-gdrive-backup');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Đang sao lưu...</span>';
    }
    
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        const existingFile = await findBackupFile();
        
        let response;
        if (existingFile) {
            response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${gdriveToken}`,
                    'Content-Type': 'application/json'
                },
                body: blob
            });
        } else {
            const metadata = {
                name: BACKUP_FILENAME,
                parents: ['appDataFolder']
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);
            
            response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${gdriveToken}` },
                body: form
            });
        }
        
        if (response.ok) {
            localStorage.setItem('volearn-gdrive-lastsync', new Date().toISOString());
            showGoogleDriveConnected();
            showToast('Sao lưu thành công!', 'success');
        } else {
            if (response.status === 401) {
                localStorage.removeItem('volearn-gdrive-token');
                showGoogleDriveDisconnected();
                showToast('Phiên đăng nhập hết hạn', 'error');
            } else {
                throw new Error('Backup failed');
            }
        }
    } catch (error) {
        console.error('Backup error:', error);
        showToast('Lỗi khi sao lưu', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Sao lưu</span>';
        }
    }
}

async function restoreFromDrive() {
    if (!gdriveToken) {
        showToast('Vui lòng đăng nhập Google Drive trước', 'error');
        return;
    }
    
    if (!confirm('Khôi phục từ Google Drive sẽ GHI ĐÈ dữ liệu hiện tại.\n\nBạn có chắc chắn?')) {
        return;
    }
    
    const btn = document.getElementById('btn-gdrive-restore');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Đang khôi phục...</span>';
    }
    
    try {
        const existingFile = await findBackupFile();
        
        if (!existingFile) {
            showToast('Không tìm thấy bản sao lưu trên Drive', 'error');
            return;
        }
        
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
            headers: { 'Authorization': `Bearer ${gdriveToken}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('volearn-gdrive-token');
                showGoogleDriveDisconnected();
                showToast('Phiên đăng nhập hết hạn', 'error');
                return;
            }
            throw new Error('Download failed');
        }
        
        const data = await response.json();
        
        const merged = {
            ...DEFAULT_DATA,
            ...data,
            settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) }
        };
        
        setAppData(merged);
        saveData(merged);
        
        localStorage.setItem('volearn-gdrive-lastsync', new Date().toISOString());
        showToast('Khôi phục thành công!', 'success');
        
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('Restore error:', error);
        showToast('Lỗi khi khôi phục', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i><span>Khôi phục</span>';
        }
    }
}

async function findBackupFile() {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'`,
            { headers: { 'Authorization': `Bearer ${gdriveToken}` } }
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
    
    const isDark = settings.theme === 'dark' || settings.darkMode === true;
    applyTheme(isDark);
    
    if (settings.font) {
        applyFont(settings.font);
    }
}

/* ===== EXPORTS ===== */
export { applyTheme, applyFont };
window.exportData = exportJSON;


