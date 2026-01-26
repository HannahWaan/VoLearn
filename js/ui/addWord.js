/* ===== ADD WORD MODULE ===== */
/* VoLearn v2.1.0 - Thêm từ vựng với MW API */

import { appData, addWord as addWordToState, addToHistory } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from './toast.js';
import { speak } from '../utils/speech.js';
import { escapeHtml, generateId } from '../utils/helpers.js';
import { renderShelves, populateSetSelect } from './bookshelf.js';

/* ===== CONSTANTS ===== */
const MW_LEARNER_KEY = '21fc7831-faa6-4831-93a3-cddbe57d78bf';
const MW_THESAURUS_KEY = '74724826-02fe-4e5d-a402-1139eece1765';

const POS_MAPPING = {
    'noun': 'Danh từ',
    'verb': 'Động từ',
    'adjective': 'Tính từ',
    'adverb': 'Trạng từ',
    'preposition': 'Giới từ',
    'conjunction': 'Liên từ',
    'interjection': 'Thán từ',
    'pronoun': 'Đại từ',
    'article': 'Mạo từ',
    'auxiliary verb': 'Trợ động từ',
    'phrasal verb': 'Cụm động từ'
};

// Derivational suffixes for word formation
const DERIVATIONAL_SUFFIXES = {
    noun: ['-tion', '-sion', '-ment', '-ness', '-ity', '-er', '-or', '-ist', '-ance', '-ence', '-dom', '-ship', '-hood', '-age', '-al', '-ure'],
    verb: ['-ize', '-ise', '-ify', '-ate', '-en'],
    adjective: ['-able', '-ible', '-al', '-ial', '-ful', '-less', '-ous', '-ious', '-ive', '-ative', '-ed', '-ing', '-ic', '-ical', '-ant', '-ent'],
    adverb: ['-ly']
};

/* ===== STATE ===== */
let editingWordId = null;
let currentFilledWord = '';
let lastSelectedSetId = '';
let draggedBlock = null;
let debounceTimer = null;

/* ===== INIT ===== */
export function initAddWord() {
    setupEventListeners();
    populateSetSelect();
    initDragAndDrop();
    console.log('✅ AddWord initialized');
}

function setupEventListeners() {
    // Word input with debounce
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
        wordInput.addEventListener('input', function() {
            const word = this.value.trim();
            clearTimeout(debounceTimer);
            
            if (word.length < 2) {
                hideSuggestions();
                return;
            }
            
            showSearchingState(word);
            debounceTimer = setTimeout(() => fetchWordData(word), 500);
        });
        
        wordInput.addEventListener('focus', function() {
            const suggestions = document.getElementById('word-suggestions');
            if (suggestions?.dataset.wordData) {
                try {
                    const data = JSON.parse(suggestions.dataset.wordData);
                    if (data.word === this.value.trim() && data.meanings?.length > 0) {
                        suggestions.style.display = 'block';
                    }
                } catch (e) {}
            }
        });
    }
    
    // Click outside to hide suggestions
    document.addEventListener('click', e => {
        const wordInput = document.getElementById('word-input');
        const suggestions = document.getElementById('word-suggestions');
        if (suggestions && wordInput && 
            !wordInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
    
    // Speak word button
    document.getElementById('btn-speak-word')?.addEventListener('click', () => {
        const word = document.getElementById('word-input')?.value.trim();
        if (word) speak(word);
    });
    
    // Clear form
    document.getElementById('btn-clear-form')?.addEventListener('click', clearWordForm);
    
    // Add meaning
    document.getElementById('btn-add-meaning')?.addEventListener('click', addMeaningBlock);
    
    // Save word
    document.getElementById('btn-save-word')?.addEventListener('click', saveWord);
}

/* ===== MERRIAM-WEBSTER API ===== */
async function fetchLearnerAPI(word) {
    try {
        const url = `https://www.dictionaryapi.com/api/v3/references/learners/json/${encodeURIComponent(word)}?key=${MW_LEARNER_KEY}`;
        const response = await fetch(url);
        return response.ok ? await response.json() : null;
    } catch (error) {
        console.error('Learner API error:', error);
        return null;
    }
}

async function fetchThesaurusAPI(word) {
    try {
        const url = `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${MW_THESAURUS_KEY}`;
        const response = await fetch(url);
        return response.ok ? await response.json() : null;
    } catch (error) {
        console.error('Thesaurus API error:', error);
        return null;
    }
}

async function translateToVietnamese(text) {
    if (!text || text.length > 500) return '';
    
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
        
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();
        
        if (data && data[0]) {
            let translated = '';
            for (const item of data[0]) {
                if (item[0]) translated += item[0];
            }
            return translated.trim();
        }
        return '';
    } catch (error) {
        console.log('Translation error:', error);
        return '';
    }
}

async function processLearnerData(data, word) {
    const result = { word, phonetic: '', phoneticUS: '', phoneticUK: '', meanings: [], wordForms: '' };
    
    if (!data || !Array.isArray(data) || data.length === 0 || typeof data[0] === 'string') {
        return result;
    }
    
    const wordFormsMap = new Map();
    const meaningsList = [];
    
    for (const entry of data) {
        if (!entry.meta || !entry.shortdef) continue;
        
        // Collect word forms from stems
        entry.meta.stems?.forEach(stem => {
            const clean = stem.toLowerCase().replace(/[^a-z-]/g, '');
            if (clean && clean !== word.toLowerCase()) {
                if (!wordFormsMap.has(clean)) {
                    wordFormsMap.set(clean, new Set());
                }
            }
        });
        
        let phoneticUS = '';
        let phoneticUK = '';
        
        if (entry.hwi?.prs && entry.hwi.prs.length > 0) {
            for (const pr of entry.hwi.prs) {
                const ipa = pr.mw || pr.ipa || '';
                
                if (pr.l && pr.l.includes('British')) {
                    phoneticUK = ipa;
                } else {
                    if (!phoneticUS) {
                        phoneticUS = ipa;
                    } else if (!phoneticUK) {
                        phoneticUK = ipa;
                    }
                }
            }
        }
        
        // Set default if missing
        if (!phoneticUK) phoneticUK = phoneticUS;
        if (!phoneticUS) phoneticUS = phoneticUK;
        
        // Store global phonetics
        if (!result.phoneticUS && phoneticUS) result.phoneticUS = phoneticUS;
        if (!result.phoneticUK && phoneticUK) result.phoneticUK = phoneticUK;
        if (!result.phonetic && phoneticUS) result.phonetic = phoneticUS;
        
        const posEn = entry.fl || 'noun';
        const pos = POS_MAPPING[posEn] || posEn;
        
        // Add headword to word forms
        const headword = entry.hwi?.hw?.replace(/\*/g, '') || word;
        if (!wordFormsMap.has(headword.toLowerCase())) {
            wordFormsMap.set(headword.toLowerCase(), new Set([posEn]));
        } else {
            wordFormsMap.get(headword.toLowerCase()).add(posEn);
        }
        
        for (let i = 0; i < Math.min(entry.shortdef.length, 3); i++) {
            const defEn = entry.shortdef[i];
            let example = '';
            
            if (entry.def?.[0]?.sseq) {
                outer: for (const seq of entry.def[0].sseq) {
                    for (const item of seq) {
                        if (item[1]?.dt) {
                            for (const dt of item[1].dt) {
                                if (dt[0] === 'vis' && dt[1]?.[0]?.t) {
                                    example = dt[1][0].t.replace(/\{[^}]+\}/g, '').trim();
                                    break outer;
                                }
                            }
                        }
                    }
                }
            }
            
            meaningsList.push({
                pos, posEn, phoneticUS, phoneticUK,
                defEn, defVi: '', example,
                synonyms: '', antonyms: ''
            });
        }
    }
    
    // Translate all definitions
    const translations = await Promise.all(
        meaningsList.map(m => translateToVietnamese(m.defEn))
    );
    
    meaningsList.forEach((m, i) => {
        m.defVi = translations[i] || '';
    });
    
    result.meanings = meaningsList;
    result.wordForms = generateWordFormation(word, wordFormsMap, data);
    
    return result;
}

/* ===== WORD FORMATION WITH DERIVATIONAL MORPHOLOGY ===== */
function generateWordFormation(baseWord, wordFormsMap, apiData) {
    const abbr = { 
        'noun': 'n', 
        'verb': 'v', 
        'adjective': 'adj', 
        'adverb': 'adv',
        'preposition': 'prep',
        'conjunction': 'conj'
    };
    
    const forms = new Map();
    
    // Add base word
    const baseWordLower = baseWord.toLowerCase();
    
    // Get all related forms from API data
    wordFormsMap.forEach((posSet, formWord) => {
        if (posSet.size > 0) {
            const posArray = Array.from(posSet).map(p => abbr[p] || p).filter(p => p);
            if (posArray.length > 0) {
                forms.set(formWord, posArray.join(', '));
            }
        }
    });
    
    // Try to infer POS for forms without it using derivational rules
    forms.forEach((pos, formWord) => {
        if (!pos) {
            const inferredPos = inferPOSFromSuffix(formWord);
            if (inferredPos) {
                forms.set(formWord, abbr[inferredPos] || inferredPos);
            }
        }
    });
    
    // Also check for common derivational patterns from the base word
    const derivedForms = findDerivedForms(baseWord, apiData);
    derivedForms.forEach((pos, formWord) => {
        if (!forms.has(formWord)) {
            forms.set(formWord, pos);
        }
    });
    
    if (forms.size === 0) return '';
    
    // Sort: base word first, then alphabetically
    const sortedForms = Array.from(forms.entries()).sort((a, b) => {
        if (a[0] === baseWordLower) return -1;
        if (b[0] === baseWordLower) return 1;
        return a[0].localeCompare(b[0]);
    });
    
    return sortedForms.map(([word, pos]) => `${word} (${pos})`).join(', ');
}

function inferPOSFromSuffix(word) {
    const wordLower = word.toLowerCase();
    
    // Check noun suffixes
    for (const suffix of DERIVATIONAL_SUFFIXES.noun) {
        if (wordLower.endsWith(suffix.replace('-', ''))) {
            return 'noun';
        }
    }
    
    // Check adjective suffixes
    for (const suffix of DERIVATIONAL_SUFFIXES.adjective) {
        if (wordLower.endsWith(suffix.replace('-', ''))) {
            return 'adjective';
        }
    }
    
    // Check adverb suffixes
    for (const suffix of DERIVATIONAL_SUFFIXES.adverb) {
        if (wordLower.endsWith(suffix.replace('-', ''))) {
            return 'adverb';
        }
    }
    
    // Check verb suffixes
    for (const suffix of DERIVATIONAL_SUFFIXES.verb) {
        if (wordLower.endsWith(suffix.replace('-', ''))) {
            return 'verb';
        }
    }
    
    return null;
}

function findDerivedForms(baseWord, apiData) {
    const forms = new Map();
    const abbr = { 'noun': 'n', 'verb': 'v', 'adjective': 'adj', 'adverb': 'adv' };
    
    if (!apiData || !Array.isArray(apiData)) return forms;
    
    // Look through all entries for related forms
    apiData.forEach(entry => {
        if (!entry.meta) return;
        
        // Check stems
        entry.meta.stems?.forEach(stem => {
            const stemLower = stem.toLowerCase();
            if (stemLower !== baseWord.toLowerCase()) {
                const pos = entry.fl;
                if (pos && abbr[pos]) {
                    forms.set(stemLower, abbr[pos]);
                }
            }
        });
        
        // Check for derivative forms in definitions
        if (entry.uros) {
            entry.uros.forEach(uro => {
                if (uro.ure) {
                    const form = uro.ure.replace(/\*/g, '').toLowerCase();
                    const pos = uro.fl;
                    if (pos && abbr[pos]) {
                        forms.set(form, abbr[pos]);
                    }
                }
            });
        }
    });
    
    return forms;
}

async function addThesaurusData(result, thesaurusData) {
    if (!thesaurusData || !Array.isArray(thesaurusData) || typeof thesaurusData[0] === 'string') {
        return result;
    }
    
    for (const entry of thesaurusData) {
        if (!entry.meta) continue;
        
        const synonyms = entry.meta.syns?.[0]?.slice(0, 5).join(', ') || '';
        const antonyms = entry.meta.ants?.[0]?.slice(0, 5).join(', ') || '';
        const posEn = entry.fl || '';
        
        for (const meaning of result.meanings) {
            if (meaning.posEn?.toLowerCase() === posEn.toLowerCase()) {
                if (!meaning.synonyms && synonyms) meaning.synonyms = synonyms;
                if (!meaning.antonyms && antonyms) meaning.antonyms = antonyms;
            }
        }
        
        if (result.meanings.length > 0) {
            if (!result.meanings[0].synonyms && synonyms) result.meanings[0].synonyms = synonyms;
            if (!result.meanings[0].antonyms && antonyms) result.meanings[0].antonyms = antonyms;
        }
    }
    
    return result;
}

/* ===== FETCH WORD DATA ===== */
export async function fetchWordData(word) {
    if (!word || word.length < 2) {
        hideSuggestions();
        return;
    }
    
    const container = document.getElementById('word-suggestions');
    if (!container) return;
    
    try {
        const [learnerData, thesaurusData] = await Promise.all([
            fetchLearnerAPI(word),
            fetchThesaurusAPI(word)
        ]);
        
        let result = await processLearnerData(learnerData, word);
        result = await addThesaurusData(result, thesaurusData);
        
        if (result.meanings.length === 0) {
            if (learnerData && Array.isArray(learnerData) && typeof learnerData[0] === 'string') {
                container.innerHTML = `
                    <div class="suggestion-not-found">
                        <div class="not-found-message">
                            <i class="fas fa-search"></i>
                            <span>Không tìm thấy "${escapeHtml(word)}"</span>
                        </div>
                        <div class="suggestion-alternatives">
                            <span class="alternatives-label">Có phải bạn muốn tìm:</span>
                            <div class="alternatives-list">
                                ${learnerData.slice(0, 5).map(s => `
                                    <button class="alternative-word" onclick="window.searchAlternativeWord('${escapeHtml(s)}')">${escapeHtml(s)}</button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="suggestion-empty">
                        <i class="fas fa-times-circle"></i>
                        <span>Không tìm thấy từ "${escapeHtml(word)}"</span>
                    </div>
                `;
            }
            container.style.display = 'block';
            return;
        }
        
        displayWordSuggestions(result);
        currentFilledWord = word;
        
    } catch (error) {
        console.error('Fetch word data error:', error);
        container.innerHTML = `
            <div class="suggestion-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Lỗi khi tìm kiếm. Vui lòng thử lại.</span>
            </div>
        `;
        container.style.display = 'block';
    }
}

function showSearchingState(word) {
    const container = document.getElementById('word-suggestions');
    if (container) {
        container.innerHTML = `
            <div class="suggestion-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Đang tìm "${escapeHtml(word)}"...</span>
            </div>
        `;
        container.style.display = 'block';
    }
}

function hideSuggestions() {
    const container = document.getElementById('word-suggestions');
    if (container) {
        container.style.display = 'none';
    }
}

function displayWordSuggestions(data) {
    const container = document.getElementById('word-suggestions');
    if (!container) return;
    
    let html = '';
    
    data.meanings.forEach((meaning, index) => {
        let phoneticDisplay = '';
        if (meaning.phoneticUS || meaning.phoneticUK) {
            if (meaning.phoneticUS === meaning.phoneticUK || !meaning.phoneticUK) {
                phoneticDisplay = `<span class="suggestion-phonetic-inline">/${meaning.phoneticUS}/</span>`;
            } else {
                phoneticDisplay = `
                    <span class="suggestion-phonetic-inline">
                        <span class="phonetic-us" title="US">🇺🇸 /${meaning.phoneticUS}/</span>
                        <span class="phonetic-uk" title="UK">🇬🇧 /${meaning.phoneticUK}/</span>
                    </span>
                `;
            }
        }
        
        const viDisplay = meaning.defVi && meaning.defVi.trim() ? 
            escapeHtml(meaning.defVi) : 
            '<em style="color: var(--text-muted);">(đang dịch...)</em>';
        
        html += `
            <div class="suggestion-item" onclick="window.selectMeaning(${index})">
                <div class="suggestion-pos">${meaning.pos} ${phoneticDisplay}</div>
                <div class="suggestion-vi">${viDisplay}</div>
                <div class="suggestion-en">${escapeHtml(meaning.defEn)}</div>
                ${meaning.example ? `<div class="suggestion-example">"${escapeHtml(meaning.example)}"</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="suggestion-empty">Không tìm thấy nghĩa nào</div>';
    container.style.display = 'block';
    container.dataset.wordData = JSON.stringify(data);
}

/* ===== SELECT MEANING ===== */
export function selectMeaning(index) {
    const container = document.getElementById('word-suggestions');
    if (!container?.dataset.wordData) return;
    
    const data = JSON.parse(container.dataset.wordData);
    const meaning = data.meanings[index];
    if (!meaning) return;
    
    const wordInput = document.getElementById('word-input');
    const newWord = wordInput?.value.trim() || '';
    
    if (hasFormContent() && currentFilledWord && 
        newWord.toLowerCase() !== currentFilledWord.toLowerCase()) {
        
        const confirmReplace = confirm(
            `Nội dung của từ "${currentFilledWord}" chưa được lưu.\n\nBạn có muốn thay thế bằng từ "${newWord}" không?`
        );
        
        if (confirmReplace) {
            clearAllMeaningBlocks();
            currentFilledWord = newWord;
        } else {
            if (wordInput) wordInput.value = currentFilledWord;
            container.style.display = 'none';
            return;
        }
    }
    
    if (!currentFilledWord) currentFilledWord = newWord;
    
    // Find empty block or create new one
    let targetBlock = null;
    const blocks = document.querySelectorAll('.meaning-block');
    
    for (const block of blocks) {
        const defVi = block.querySelector('.def-vi')?.value.trim();
        const defEn = block.querySelector('.def-en')?.value.trim();
        
        if (!defVi && !defEn) {
            targetBlock = block;
            break;
        }
    }
    
    if (!targetBlock) {
        addMeaningBlockSilent(); // Use silent version - no toast
        const allBlocks = document.querySelectorAll('.meaning-block');
        targetBlock = allBlocks[allBlocks.length - 1];
    }
    
    if (!targetBlock) return;
    
    // Fill the block with phonetics
    fillMeaningBlock(targetBlock, meaning);
    
    // AUTO FILL: Also fill phonetics for first block if empty
    const firstBlock = document.querySelector('.meaning-block');
    if (firstBlock && firstBlock !== targetBlock) {
        const firstUS = firstBlock.querySelector('.phonetic-us');
        const firstUK = firstBlock.querySelector('.phonetic-uk');
        
        if (firstUS && !firstUS.value && (data.phoneticUS || meaning.phoneticUS)) {
            firstUS.value = '/' + (data.phoneticUS || meaning.phoneticUS) + '/';
        }
        if (firstUK && !firstUK.value && (data.phoneticUK || meaning.phoneticUK)) {
            firstUK.value = '/' + (data.phoneticUK || meaning.phoneticUK) + '/';
        }
    }
    
    // Fill word formation
    const wordFormGlobal = document.getElementById('word-formation-global');
    if (wordFormGlobal && !wordFormGlobal.value.trim() && data.wordForms) {
        wordFormGlobal.value = data.wordForms;
    }
    
    container.style.display = 'none';
    showToast('Đã thêm nghĩa');
    targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function fillMeaningBlock(block, meaning) {
    // Fill phonetics
    const phoneticUS = block.querySelector('.phonetic-us');
    if (phoneticUS && meaning.phoneticUS) {
        phoneticUS.value = '/' + meaning.phoneticUS + '/';
    }
    
    const phoneticUK = block.querySelector('.phonetic-uk');
    if (phoneticUK && meaning.phoneticUK) {
        phoneticUK.value = '/' + meaning.phoneticUK + '/';
    } else if (phoneticUK && meaning.phoneticUS) {
        phoneticUK.value = '/' + meaning.phoneticUS + '/';
    }
    
    // Fill POS
    const posSelect = block.querySelector('.pos-select');
    if (posSelect && meaning.posEn) {
        for (let i = 0; i < posSelect.options.length; i++) {
            if (posSelect.options[i].value.toLowerCase() === meaning.posEn.toLowerCase()) {
                posSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    // Fill other fields
    const defEn = block.querySelector('.def-en');
    const defVi = block.querySelector('.def-vi');
    const example = block.querySelector('.example-input');
    const synonyms = block.querySelector('.synonyms-input');
    const antonyms = block.querySelector('.antonyms-input');
    
    if (defEn) defEn.value = meaning.defEn || '';
    if (defVi) defVi.value = meaning.defVi || '';
    if (example) example.value = meaning.example || '';
    if (synonyms) synonyms.value = meaning.synonyms || '';
    if (antonyms) antonyms.value = meaning.antonyms || '';
}

/* ===== MEANING BLOCKS ===== */
export function addMeaningBlock() {
    const container = document.getElementById('meanings-container');
    if (!container) return;
    
    const index = container.querySelectorAll('.meaning-block').length;
    const block = document.createElement('div');
    block.className = 'meaning-block';
    block.setAttribute('data-index', index);
    block.setAttribute('draggable', 'true');
    
    block.innerHTML = getMeaningBlockHTML(index + 1);
    container.appendChild(block);
    
    initDragAndDropForBlock(block);
    showToast(`Đã thêm Nghĩa ${index + 1}`);
}

// Silent version - no toast (for internal use)
function addMeaningBlockSilent() {
    const container = document.getElementById('meanings-container');
    if (!container) return;
    
    const index = container.querySelectorAll('.meaning-block').length;
    const block = document.createElement('div');
    block.className = 'meaning-block';
    block.setAttribute('data-index', index);
    block.setAttribute('draggable', 'true');
    
    block.innerHTML = getMeaningBlockHTML(index + 1);
    container.appendChild(block);
    
    initDragAndDropForBlock(block);
}

function getMeaningBlockHTML(number) {
    return `
        <div class="meaning-header">
            <span class="meaning-title">Nghĩa ${number}</span>
            <div class="meaning-actions">
                <span class="drag-handle" title="Kéo để sắp xếp">
                    <i class="fas fa-grip-vertical"></i>
                </span>
                <button type="button" class="btn-clear-meaning" onclick="window.clearMeaningBlock(this)" title="Xóa nội dung">
                    <i class="fas fa-eraser"></i>
                </button>
                <button type="button" class="btn-remove-meaning" onclick="window.removeMeaningBlock(this)" title="Xóa nghĩa này">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="phonetic-row">
            <div class="phonetic-group">
                <label>🇺🇸 US</label>
                <div class="phonetic-input-wrapper">
                    <input type="text" class="phonetic-us" placeholder="/ˈprɛzənt/">
                    <button type="button" class="btn-speak-phonetic" onclick="window.speakPhonetic(this, 'en-US')" title="Nghe US">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
            <div class="phonetic-group">
                <label>🇬🇧 UK</label>
                <div class="phonetic-input-wrapper">
                    <input type="text" class="phonetic-uk" placeholder="/ˈprɛzənt/">
                    <button type="button" class="btn-speak-phonetic" onclick="window.speakPhonetic(this, 'en-GB')" title="Nghe UK">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label>Loại từ</label>
            <select class="pos-select">
                <option value="">-- Chọn --</option>
                <option value="noun">Danh từ</option>
                <option value="verb">Động từ</option>
                <option value="adjective">Tính từ</option>
                <option value="adverb">Trạng từ</option>
                <option value="pronoun">Đại từ</option>
                <option value="preposition">Giới từ</option>
                <option value="conjunction">Liên từ</option>
                <option value="interjection">Thán từ</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Định nghĩa (English)</label>
            <div class="textarea-with-speaker">
                <textarea class="def-en" rows="2" placeholder="Definition in English"></textarea>
                <button type="button" class="btn-speak-text" onclick="window.speakTextarea(this, 'en')" title="Nghe định nghĩa">
                    <i class="fas fa-volume-up"></i>
                </button>
            </div>
        </div>
        
        <div class="form-group">
            <label>Nghĩa (Tiếng Việt)</label>
            <textarea class="def-vi" rows="2" placeholder="Nghĩa tiếng Việt"></textarea>
        </div>
        
        <div class="form-group">
            <label>Ví dụ</label>
            <div class="textarea-with-speaker">
                <textarea class="example-input" rows="2" placeholder="Example sentence"></textarea>
                <button type="button" class="btn-speak-text" onclick="window.speakTextarea(this, 'en')" title="Nghe ví dụ">
                    <i class="fas fa-volume-up"></i>
                </button>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Từ đồng nghĩa</label>
                <input type="text" class="synonyms-input" placeholder="synonym1, synonym2">
            </div>
            <div class="form-group">
                <label>Từ trái nghĩa</label>
                <input type="text" class="antonyms-input" placeholder="antonym1, antonym2">
            </div>
        </div>
    `;
}

export function clearMeaningBlock(btn) {
    const block = btn.closest('.meaning-block');
    if (!block) return;
    
    // Clear without confirmation for single block
    ['.phonetic-us', '.phonetic-uk', '.pos-select', '.def-en', '.def-vi', 
     '.example-input', '.synonyms-input', '.antonyms-input'
    ].forEach(selector => {
        const field = block.querySelector(selector);
        if (field) {
            field.tagName === 'SELECT' ? field.selectedIndex = 0 : field.value = '';
        }
    });
    
    // No toast for cleaner UX
}

export function removeMeaningBlock(btn) {
    const block = btn.closest('.meaning-block');
    const container = document.getElementById('meanings-container');
    const allBlocks = container.querySelectorAll('.meaning-block');
    
    if (allBlocks.length <= 1) {
        // If only 1 block, just clear it
        clearMeaningBlock(btn);
        return;
    }
    
    block.remove();
    updateMeaningNumbers();
    // No toast for cleaner UX
}

function updateMeaningNumbers() {
    document.querySelectorAll('.meaning-block').forEach((block, index) => {
        block.setAttribute('data-index', index);
        const title = block.querySelector('.meaning-title');
        if (title) title.textContent = `Nghĩa ${index + 1}`;
    });
}

/* ===== DRAG & DROP ===== */
function initDragAndDrop() {
    document.querySelectorAll('.meaning-block').forEach(initDragAndDropForBlock);
}

function initDragAndDropForBlock(block) {
    const dragHandle = block.querySelector('.drag-handle');
    
    if (dragHandle) {
        dragHandle.addEventListener('mousedown', () => {
            block.setAttribute('draggable', 'true');
        });
        
        dragHandle.addEventListener('mouseup', () => {
            block.setAttribute('draggable', 'false');
        });
    }
    
    block.setAttribute('draggable', 'false');
    
    block.addEventListener('dragstart', function(e) {
        if (!e.target.closest('.drag-handle') && e.target !== dragHandle) {
            const isDraggable = this.getAttribute('draggable') === 'true';
            if (!isDraggable) {
                e.preventDefault();
                return;
            }
        }
        
        draggedBlock = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    
    block.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        this.setAttribute('draggable', 'false');
        document.querySelectorAll('.meaning-block').forEach(b => b.classList.remove('drag-over'));
        draggedBlock = null;
        updateMeaningNumbers();
    });
    
    block.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (this !== draggedBlock && draggedBlock) {
            this.classList.add('drag-over');
        }
    });
    
    block.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
    });
    
    block.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (draggedBlock && this !== draggedBlock) {
            const container = document.getElementById('meanings-container');
            const blocks = [...container.querySelectorAll('.meaning-block')];
            const fromIndex = blocks.indexOf(draggedBlock);
            const toIndex = blocks.indexOf(this);
            
            if (fromIndex < toIndex) {
                this.parentNode.insertBefore(draggedBlock, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedBlock, this);
            }
            
            updateMeaningNumbers();
        }
    });
}

/* ===== FORM HELPERS ===== */
function hasFormContent() {
    const blocks = document.querySelectorAll('.meaning-block');
    for (const block of blocks) {
        const defVi = block.querySelector('.def-vi');
        if (defVi?.value.trim()) return true;
    }
    return false;
}

function clearAllMeaningBlocks() {
    const container = document.getElementById('meanings-container');
    if (!container) return;
    
    const blocks = container.querySelectorAll('.meaning-block');
    blocks.forEach((block, index) => {
        if (index > 0) block.remove();
    });
    
    const firstBlock = container.querySelector('.meaning-block');
    if (firstBlock) {
        const title = firstBlock.querySelector('.meaning-title');
        if (title) title.textContent = 'Nghĩa 1';
        
        ['.phonetic-us', '.phonetic-uk', '.pos-select', '.def-en', '.def-vi', 
        '.example-input', '.synonyms-input', '.antonyms-input'
        ].forEach(selector => {
            const field = firstBlock.querySelector(selector);
            if (field) {
                field.tagName === 'SELECT' ? field.selectedIndex = 0 : field.value = '';
            }
        });
    }
    
    const wordFormGlobal = document.getElementById('word-formation-global');
    if (wordFormGlobal) wordFormGlobal.value = '';
}

export function clearWordForm() {
    const wordInput = document.getElementById('word-input');
    const hasWord = wordInput?.value.trim();
    const hasContent = hasFormContent();
    
    if (hasWord || hasContent) {
        if (!confirm('Bạn có chắc muốn xóa tất cả nội dung?')) return;
    }
    
    currentFilledWord = '';
    editingWordId = null;
    lastSelectedSetId = '';
    
    if (wordInput) wordInput.value = '';
    
    const setSelect = document.getElementById('set-select');
    if (setSelect) setSelect.selectedIndex = 0;
    
    hideSuggestions();
    clearAllMeaningBlocks();
    
    const saveBtn = document.getElementById('btn-save-word');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu từ vựng';
    
    document.getElementById('btn-cancel-edit')?.remove();
    
    showToast('Đã xóa tất cả nội dung');
}

/* ===== SAVE WORD ===== */
export function saveWord() {
    const word = document.getElementById('word-input').value.trim();
    const setId = document.getElementById('set-select').value;
    const wordFormation = document.getElementById('word-formation-global')?.value.trim() || '';
    
    if (!word) {
        showToast('Vui lòng nhập từ vựng', 'error');
        return;
    }
    
    // Remember selected set for next word
    if (setId) {
        lastSelectedSetId = setId;
    }
    
    const meanings = [];
    document.querySelectorAll('.meaning-block').forEach(block => {
        const meaning = {
            phoneticUS: block.querySelector('.phonetic-us')?.value.trim() || '',
            phoneticUK: block.querySelector('.phonetic-uk')?.value.trim() || '',
            pos: block.querySelector('.pos-select')?.value || '',
            defEn: block.querySelector('.def-en')?.value.trim() || '',
            defVi: block.querySelector('.def-vi')?.value.trim() || '',
            example: block.querySelector('.example-input')?.value.trim() || '',
            synonyms: block.querySelector('.synonyms-input')?.value.trim() || '',
            antonyms: block.querySelector('.antonyms-input')?.value.trim() || ''
        };
        
        if (meaning.defEn || meaning.defVi) meanings.push(meaning);
    });
    
    if (meanings.length === 0) {
        showToast('Vui lòng nhập ít nhất một nghĩa', 'error');
        return;
    }
    
    const phonetic = meanings[0]?.phoneticUS || meanings[0]?.phoneticUK || '';
    
    // Check for existing word to update
    const existingIndex = appData.vocabulary.findIndex(w => w.word.toLowerCase() === word.toLowerCase());
    
    if (existingIndex !== -1) {
        // Update existing
        appData.vocabulary[existingIndex] = {
            ...appData.vocabulary[existingIndex],
            word,
            phonetic,
            wordFormation,
            meanings,
            setId: setId || null,
            updatedAt: new Date().toISOString()
        };
        saveData(appData);
        clearWordFormSilent();
        showToast(`Đã cập nhật từ "${word}"`);
    } else {
        // Create new word
        const newWord = {
            id: generateId(),
            word, 
            phonetic, 
            wordFormation, 
            meanings,
            setId: setId || null,
            createdAt: new Date().toISOString(),
            mastered: false,
            bookmarked: false,
            srsLevel: 0,
            nextReview: new Date().toISOString()
        };
        
        appData.vocabulary.push(newWord);
        
        // Update history
        addToHistory('add', newWord.id);
        
        saveData(appData);
        clearWordFormSilent();
        showToast(`Đã lưu từ "${word}"`);
    }
    
    // Dispatch event for other modules to update
    window.dispatchEvent(new CustomEvent('volearn:wordSaved'));
}

function clearWordFormSilent() {
    currentFilledWord = '';
    editingWordId = null;
    
    const wordInput = document.getElementById('word-input');
    if (wordInput) wordInput.value = '';
    
    // Keep the selected set for next word
    const setSelect = document.getElementById('set-select');
    if (setSelect && lastSelectedSetId) {
        setSelect.value = lastSelectedSetId;
    }
    
    hideSuggestions();
    clearAllMeaningBlocks();
    
    const saveBtn = document.getElementById('btn-save-word');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu từ vựng';
    
    document.getElementById('btn-cancel-edit')?.remove();
}

/* ===== SEARCH ALTERNATIVE ===== */
export function searchAlternativeWord(word) {
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
        wordInput.value = word;
        fetchWordData(word);
    }
}

/* ===== LOAD WORD FOR EDITING ===== */
export function loadWordForEdit(wordId) {
    const word = appData.vocabulary.find(w => w.id === wordId);
    if (!word) {
        showToast('Không tìm thấy từ vựng', 'error');
        return;
    }
    
    editingWordId = wordId;
    currentFilledWord = word.word;
    
    // Fill word input
    const wordInput = document.getElementById('word-input');
    if (wordInput) wordInput.value = word.word;
    
    // Fill word formation
    const wordFormGlobal = document.getElementById('word-formation-global');
    if (wordFormGlobal) wordFormGlobal.value = word.wordFormation || word.formation || '';
    
    // Fill set select
    const setSelect = document.getElementById('set-select');
    if (setSelect) setSelect.value = word.setId || '';
    
    // Clear existing meaning blocks
    clearAllMeaningBlocks();
    
    // Fill meanings
    const meanings = word.meanings || [];
    const container = document.getElementById('meanings-container');
    
    meanings.forEach((meaning, index) => {
        let block;
        
        if (index === 0) {
            block = container.querySelector('.meaning-block');
        } else {
            addMeaningBlockSilent();  
            const blocks = container.querySelectorAll('.meaning-block');
            block = blocks[blocks.length - 1];
        }
        
        if (!block) return;
        
        // Fill phonetics
        const phoneticUS = block.querySelector('.phonetic-us');
        const phoneticUK = block.querySelector('.phonetic-uk');
        if (phoneticUS) phoneticUS.value = meaning.phoneticUS || meaning.phonetic || word.phonetic || '';
        if (phoneticUK) phoneticUK.value = meaning.phoneticUK || meaning.phonetic || word.phonetic || '';
        
        // Fill POS
        const posSelect = block.querySelector('.pos-select');
        if (posSelect && meaning.pos) {
            for (let i = 0; i < posSelect.options.length; i++) {
                if (posSelect.options[i].value.toLowerCase() === meaning.pos.toLowerCase()) {
                    posSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        // Fill other fields
        const defEn = block.querySelector('.def-en');
        const defVi = block.querySelector('.def-vi');
        const example = block.querySelector('.example-input');
        const synonyms = block.querySelector('.synonyms-input');
        const antonyms = block.querySelector('.antonyms-input');
        
        if (defEn) defEn.value = meaning.defEn || meaning.definition || '';
        if (defVi) defVi.value = meaning.defVi || '';
        if (example) example.value = meaning.example || '';
        if (synonyms) synonyms.value = meaning.synonyms || '';
        if (antonyms) antonyms.value = meaning.antonyms || '';
    });
    
    // Update save button text
    const saveBtn = document.getElementById('btn-save-word');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Cập nhật từ vựng';
    }
    
    // Scroll to form
    const addSection = document.getElementById('add-section');
    if (addSection) {
        addSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    showToast(`Đang chỉnh sửa "${word.word}"`);
}

/* ===== GLOBAL EXPORTS ===== */
window.selectMeaning = selectMeaning;
window.addMeaningBlock = addMeaningBlock;
window.clearMeaningBlock = clearMeaningBlock;
window.removeMeaningBlock = removeMeaningBlock;
window.clearWordForm = clearWordForm;
window.searchAlternativeWord = searchAlternativeWord;
window.saveWord = saveWord;
window.loadWordForEdit = loadWordForEdit;

export {
    editingWordId,
    currentFilledWord,
    lastSelectedSetId,
    POS_MAPPING
};
