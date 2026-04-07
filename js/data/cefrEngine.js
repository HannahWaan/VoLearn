/* ===== CEFR ENGINE ===== */
/* VoLearn - Tra cứu CEFR level cho từ vựng */

import { CEFR_DB } from './cefrData.js';

/* ===== CONSTANTS ===== */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_COLORS = {
    'A1': '#4CAF50',
    'A2': '#8BC34A',
    'B1': '#FFC107',
    'B2': '#FF9800',
    'C1': '#F44336',
    'C2': '#9C27B0',
    'unknown': '#9E9E9E'
};

export const CEFR_LABELS = {
    'A1': 'Beginner',
    'A2': 'Elementary',
    'B1': 'Intermediate',
    'B2': 'Upper-Intermediate',
    'C1': 'Advanced',
    'C2': 'Proficiency',
    'unknown': 'Chưa xác định'
};

/* POS mapping: VoLearn POS value → Oxford POS */
const POS_MAP = {
    'noun': 'noun',
    'verb': 'verb',
    'adjective': 'adjective',
    'adverb': 'adverb',
    'pronoun': 'pronoun',
    'preposition': 'preposition',
    'conjunction': 'conjunction',
    'interjection': 'interjection',
    'phrasal verb': 'phrasal verb',
    'auxiliary verb': 'auxiliary verb',
    'indefinite article': 'indefinite article',
    'definite article': 'definite article',
    'determiner': 'determiner',
    'modal verb': 'modal verb',
    'number': 'number',
    'ordinal number': 'ordinal number',
    'predeterminer': 'predeterminer',
    'prefix': 'prefix',
    'suffix': 'suffix',
    'exclamation': 'exclamation',
    'abbreviation': 'abbreviation'
};

/* ===== CORE LOOKUP ===== */

/**
 * Tra CEFR level cho 1 từ
 * @param {string} word
 * @param {string} [pos] - loại từ (noun, verb, adjective...)
 * @returns {{ level: string, color: string, label: string }}
 */
/* ===== HEURISTIC CEFR ESTIMATOR ===== */
/* Dùng cho từ KHÔNG có trong Oxford 5000 database.
 * Oxford 5000 cover hầu hết từ phổ biến A1→C1.
 * Từ ngoài list = hiếm → tối thiểu B2.
 * Logic: 1) Check known lists → 2) Heuristic scoring → 3) Default B2
 */

// Khai báo ngoài function để không tạo lại mỗi lần gọi
const COMMON_SHORT = new Set([
    // Từ cơ bản ≤4 ký tự có thể không có trong Oxford 5000 (inflected forms, etc.)
    'i', 'me', 'my', 'you', 'he', 'she', 'it', 'we', 'us', 'him', 'her',
    'his', 'its', 'our', 'a', 'an', 'the', 'am', 'is', 'are', 'was', 'be',
    'do', 'go', 'no', 'so', 'or', 'if', 'as', 'at', 'by', 'in', 'of',
    'on', 'to', 'up', 'and', 'but', 'not', 'for', 'all', 'can', 'had',
    'has', 'did', 'get', 'got', 'run', 'ran', 'say', 'see', 'saw', 'now',
    'out', 'how', 'who', 'new', 'old', 'big', 'own', 'too', 'any', 'day',
    'way', 'use', 'set', 'put', 'end', 'ask', 'try', 'let', 'may', 'off',
    'yes', 'yet', 'add', 'age', 'ago', 'air', 'arm', 'art', 'bad', 'bag',
    'bar', 'bed', 'bit', 'box', 'boy', 'bus', 'buy', 'car', 'cat', 'cup',
    'cut', 'dad', 'dog', 'dry', 'ear', 'eat', 'ate', 'egg', 'eye', 'far',
    'fat', 'few', 'fit', 'fix', 'fly', 'fun', 'gas', 'god', 'gun', 'guy',
    'hat', 'hey', 'hi', 'hit', 'hot', 'ice', 'ill', 'job', 'key', 'kid',
    'lay', 'leg', 'lie', 'lip', 'lot', 'low', 'map', 'mix', 'mom', 'mum',
    'mud', 'net', 'nor', 'nut', 'odd', 'oil', 'ok', 'one', 'own', 'pan',
    'pay', 'pet', 'pie', 'pin', 'pop', 'pot', 'raw', 'red', 'rid', 'row',
    'sad', 'sat', 'sea', 'sir', 'sit', 'six', 'sky', 'son', 'sun', 'tea',
    'ten', 'tie', 'tip', 'toe', 'top', 'toy', 'two', 'van', 'war', 'wet',
    'win', 'won', 'via', 'per', 'pro', 'etc', 'bye', 'ok',
    'also', 'back', 'been', 'best', 'body', 'book', 'born', 'both',
    'call', 'came', 'card', 'care', 'case', 'city', 'cold', 'come',
    'cook', 'cool', 'copy', 'cost', 'dark', 'data', 'date', 'dead',
    'deal', 'dear', 'deep', 'does', 'done', 'door', 'down', 'draw',
    'drew', 'drop', 'drug', 'each', 'east', 'edge', 'else', 'even',
    'ever', 'face', 'fact', 'fair', 'fall', 'farm', 'fast', 'fear',
    'feel', 'feet', 'fell', 'felt', 'file', 'fill', 'film', 'find',
    'fine', 'fire', 'fish', 'five', 'flat', 'food', 'foot', 'form',
    'four', 'free', 'from', 'full', 'fund', 'game', 'gave', 'gift',
    'girl', 'give', 'glad', 'goes', 'gold', 'gone', 'good', 'grew',
    'grow', 'hair', 'half', 'hall', 'hand', 'hang', 'hard', 'hate',
    'have', 'head', 'hear', 'heat', 'help', 'here', 'hide', 'high',
    'hill', 'hold', 'hole', 'home', 'hope', 'hour', 'huge', 'hung',
    'hurt', 'idea', 'into', 'iron', 'join', 'jump', 'just', 'keen',
    'keep', 'kept', 'kick', 'kill', 'kind', 'king', 'knew', 'know',
    'lack', 'lady', 'laid', 'lake', 'land', 'last', 'late', 'lead',
    'left', 'less', 'life', 'lift', 'like', 'line', 'link', 'list',
    'live', 'long', 'look', 'lord', 'lose', 'lost', 'lots', 'love',
    'luck', 'made', 'main', 'make', 'male', 'many', 'mark', 'mass',
    'meal', 'mean', 'meet', 'mind', 'mine', 'miss', 'mood', 'moon',
    'more', 'most', 'move', 'much', 'must', 'name', 'near', 'neck',
    'need', 'next', 'nice', 'nine', 'none', 'nose', 'note', 'okay',
    'once', 'only', 'onto', 'open', 'over', 'pack', 'page', 'paid',
    'pain', 'pair', 'pale', 'park', 'part', 'pass', 'past', 'path',
    'pick', 'plan', 'play', 'plus', 'poem', 'pool', 'poor', 'post',
    'pull', 'pure', 'push', 'race', 'rain', 'read', 'real', 'rest',
    'rich', 'ride', 'ring', 'rise', 'risk', 'road', 'rock', 'role',
    'roll', 'roof', 'room', 'rose', 'rule', 'runs', 'rush', 'safe',
    'said', 'sale', 'salt', 'same', 'sand', 'save', 'seat', 'seem',
    'seen', 'self', 'sell', 'send', 'sent', 'sept', 'ship', 'shop',
    'shot', 'show', 'shut', 'sick', 'side', 'sign', 'sing', 'site',
    'size', 'skin', 'slip', 'slow', 'snow', 'soft', 'soil', 'sold',
    'some', 'song', 'soon', 'sort', 'soul', 'spot', 'star', 'stay',
    'step', 'stop', 'such', 'suit', 'sure', 'swim', 'take', 'tale',
    'talk', 'tall', 'tank', 'task', 'team', 'tell', 'tend', 'term',
    'test', 'text', 'than', 'that', 'them', 'then', 'they', 'thin',
    'this', 'thus', 'till', 'tiny', 'told', 'tone', 'took', 'tool',
    'tour', 'town', 'tree', 'trip', 'TRUE', 'true', 'turn', 'type',
    'unit', 'upon', 'used', 'user', 'vast', 'very', 'view', 'vote',
    'wage', 'wait', 'wake', 'walk', 'wall', 'want', 'warm', 'warn',
    'wash', 'wave', 'weak', 'wear', 'week', 'well', 'went', 'were',
    'west', 'what', 'when', 'whom', 'wide', 'wife', 'wild', 'will',
    'wind', 'wine', 'wing', 'wire', 'wise', 'wish', 'with', 'wood',
    'word', 'wore', 'work', 'worn', 'wrap', 'yard', 'yeah', 'year',
    'your', 'zero', 'zone'
]);

const RARE_C2 = new Set([
    'prodigal', 'plethora', 'aplomb', 'myriad', 'ephemeral', 'esoteric', 'erudite',
    'arcane', 'abstruse', 'recondite', 'quixotic', 'feckless', 'fatuous',
    'ennui', 'hubris', 'pathos', 'ethos', 'praxis',
    'zeitgeist', 'schadenfreude', 'leitmotif', 'gestalt',
    'cacophony', 'euphony', 'dichotomy', 'epitome', 'hyperbole', 'litotes',
    'synecdoche', 'metonymy', 'oxymoron', 'juxtapose', 'superfluous',
    'ubiquitous', 'perfunctory', 'sycophant', 'charlatan', 'demagogue',
    'pariah', 'panacea', 'anathema',
    'catharsis', 'nemesis', 'epiphany', 'serendipity',
    'vicissitude', 'verisimilitude', 'pusillanimous', 'magnanimous',
    'equanimity', 'perspicacity', 'loquacious', 'garrulous', 'laconic',
    'pithy', 'cogent', 'trenchant', 'piquant', 'acrid',
    'caustic', 'mordant', 'sardonic', 'acerbic', 'vitriolic',
    'bellicose', 'truculent', 'pugnacious', 'litigious',
    'inimical', 'deleterious', 'pernicious', 'insidious', 'nefarious',
    'heinous', 'egregious', 'brazen', 'audacious', 'intrepid',
    'dauntless', 'redoubtable', 'indomitable',
    'impregnable', 'impervious', 'impetuous', 'capricious', 'mercurial',
    'vacillate', 'oscillate', 'undulate', 'peregrinate',
    'sojourn', 'peripatetic',
    'recalcitrant', 'intransigent', 'obdurate', 'pertinacious',
    'assiduous', 'sedulous', 'fastidious', 'punctilious',
    'sanguine', 'phlegmatic', 'choleric', 'melancholic', 'lugubrious',
    'doleful', 'plaintive', 'wistful', 'rueful',
    'contrite', 'penitent', 'compunction',
    'ignominy', 'obloquy', 'opprobrium', 'calumny',
    'abrogate', 'abnegate', 'abscond', 'abstemious',
    'acquiesce', 'amalgamate', 'ameliorate', 'conflagration', 'conundrum',
    'corpulent', 'corroborate', 'debilitate', 'delineate', 'desiccate',
    'ebullient', 'effervescent', 'efficacious',
    'elucidate', 'emaciated', 'enervate', 'exacerbate', 'exonerate',
    'extenuate', 'hapless', 'impecunious',
    'incorrigible', 'ineffable', 'inexorable', 'inscrutable', 'inveterate',
    'irascible', 'languish', 'lurid', 'maelstrom',
    'obfuscate', 'obviate', 'onerous', 'palliate', 'penchant', 'penurious',
    'perfidious', 'perspicacious', 'placate', 'platitude',
    'propensity', 'propitiate', 'quagmire', 'querulous',
    'redolent', 'refractory', 'replete', 'repudiate', 'sagacious',
    'salubrious', 'sanctimonious', 'soporific', 'spurious', 'strident',
    'supercilious', 'taciturn', 'tantamount', 'temerity', 'tenuous',
    'torpid', 'turgid', 'unctuous', 'usurp', 'venal',
    'venerate', 'veracity', 'vestige', 'vociferous',
    'bucolic', 'pulchritude', 'limpid', 'pellucid',
    'dulcet', 'mellifluous', 'resplendent'
]);

const RARE_C1 = new Set([
    'albeit', 'alleviate', 'amicable', 'anomaly',
    'benevolent', 'candid', 'coherent',
    'concurrent', 'conducive', 'consecutive', 'consolidate',
    'contingency', 'culminate', 'curtail', 'deem',
    'depict', 'deteriorate', 'discrepancy',
    'discretion', 'disparity', 'disposition', 'disproportionate', 'disseminate',
    'divert', 'doctrine', 'elicit', 'encompass', 'endeavour', 'endeavor',
    'envision', 'erratic', 'excerpt', 'exemption',
    'feasible', 'fiscal', 'forthcoming',
    'futile', 'hamper', 'hinder',
    'imperative', 'implicit',
    'incidence', 'indicative',
    'induce', 'inflict', 'inherent',
    'inhibit', 'integral', 'interim', 'invoke',
    'jeopardize', 'jurisdiction', 'levy',
    'lucrative', 'mandate', 'marginal', 'mediate', 'municipal', 'negligible',
    'niche', 'notwithstanding', 'oblige',
    'orthodox', 'parameter', 'partisan', 'peculiar', 'pertain', 'pertinent',
    'plausible', 'postulate', 'pragmatic',
    'precede', 'precedent', 'predominantly', 'preliminary', 'prevalent',
    'procure', 'prohibit', 'prone', 'prospective',
    'provisional', 'prudent', 'rationale', 'realm', 'reconcile',
    'reluctance', 'repeal',
    'restrain', 'retort', 'rigorous',
    'sceptical', 'scrutiny', 'simulate', 'solely', 'sovereign',
    'spectrum', 'stance', 'statute', 'stimulus',
    'stipulate', 'subordinate', 'subsidy', 'suppress',
    'tangible', 'tenure', 'threshold', 'trait',
    'trajectory', 'underlying', 'undermine',
    'unprecedented', 'utterance', 'viable', 'vigorous',
    'warrant', 'whereby', 'wield',
    'convivial', 'gregarious', 'tenacious', 'meticulous',
    'scrupulous', 'conscientious', 'resilient'
]);

function estimateCEFR(word) {
    const w = word.toLowerCase().trim();
    const len = w.length;
    
    // 1) Check known word lists (ưu tiên cao nhất)
    if (RARE_C2.has(w)) return 'C2';
    if (RARE_C1.has(w)) return 'C1';
    if (COMMON_SHORT.has(w)) return len <= 3 ? 'A1' : 'A2';
    
    // 2) Từ rất ngắn không trong list nào → B1 (có thể viết tắt, slang)
    if (len <= 3) return 'B1';
    if (len <= 4) return 'B1';
    
    // 3) Heuristic: từ KHÔNG trong Oxford 5000 → tối thiểu B2
    //    Chỉ cần phân biệt B2 vs C1 vs C2
    let score = 0;
    
    // Độ dài
    if (len >= 13) score += 2;
    else if (len >= 10) score += 1.5;
    else if (len >= 8) score += 1;
    else if (len >= 6) score += 0.5;
    
    // Âm tiết
    const vowelGroups = w.match(/[aeiouy]+/gi);
    const syllables = vowelGroups ? vowelGroups.length : 1;
    if (syllables >= 5) score += 2;
    else if (syllables >= 4) score += 1.5;
    else if (syllables >= 3) score += 0.5;
    
    // Gốc Latin/Greek
    if (/(?:psych|pneum|gno[sm]|mne|philo|^eu[^r]|^dys|^syn[^c]|^para[^d]|^meta[^l]|^epi[^s]|^peri|onym|morph|crypt|theo[^r]|anth|^bene|^male?(?:vol|dict|fic)|^omni|^ambi|^ante|^circum|^infra|^proto|^quasi)/.test(w)) {
        score += 1.5;
    }
    
    // Suffix phức tạp
    if (/(?:esque|aceous|itious|ulent|iform|oid$|ennial$)/.test(w)) score += 2;
    else if (/(?:tude$|uous$|eous$|iferous$|istic$)/.test(w)) score += 1;
    
    // Phân loại (mặc định B2 cho từ ngoài Oxford 5000)
    if (score >= 4) return 'C2';
    if (score >= 2) return 'C1';
    return 'B2';
}


export function getCEFRLevel(word, pos = null) {
    const result = { level: 'unknown', color: CEFR_COLORS.unknown, label: CEFR_LABELS.unknown };
    if (!word) return result;

    const key = word.toLowerCase().trim();
    const entry = CEFR_DB[key];
    
    let level = null;

    if (entry) {
        // Nếu có POS, tra theo POS trước
        if (pos) {
            const mapped = POS_MAP[pos.toLowerCase()] || pos.toLowerCase();
            level = entry[mapped] || null;
        }

        // Fallback: lấy level thấp nhất (dễ nhất) trong tất cả POS
        if (!level) {
            const allLevels = Object.values(entry).filter(l => l && l.trim());
            if (allLevels.length > 0) {
                level = allLevels.reduce((min, l) => {
                    return CEFR_LEVELS.indexOf(l) < CEFR_LEVELS.indexOf(min) ? l : min;
                });
            }
        }
    } else {
        // Không có trong Oxford 5000 → dùng heuristic estimation
        level = estimateCEFR(key);
    }

    if (level && CEFR_LEVELS.includes(level)) {
        result.level = level;
        result.color = CEFR_COLORS[level];
        result.label = CEFR_LABELS[level];
        if (!entry) result.estimated = true; // Đánh dấu là ước tính
    }

    return result;
}

/**
 * Tra CEFR cho từ kèm tất cả POS
 * @param {string} word
 * @returns {Object|null} { "noun": "B2", "verb": "C1" } hoặc null
 */
export function getCEFRAllPOS(word) {
    if (!word) return null;
    return CEFR_DB[word.toLowerCase().trim()] || null;
}

/* ===== VOCABULARY ANALYSIS ===== */

/**
 * Phân tích CEFR cho toàn bộ vocabulary
 * @param {Array} vocabulary - appData.vocabulary
 * @returns {{ distribution: Object, percentage: Object }}
 */
export function analyzeVocabularyCEFR(vocabulary) {
    const distribution = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, unknown: 0 };

    (vocabulary || []).forEach(wordObj => {
        const level = wordObj.cefrLevel || getCEFRLevel(wordObj.word, wordObj.meanings?.[0]?.pos).level;
        distribution[level] = (distribution[level] || 0) + 1;
    });

    const total = vocabulary?.length || 0;
    const percentage = {};
    for (const [key, val] of Object.entries(distribution)) {
        percentage[key] = total > 0 ? Math.round((val / total) * 100) : 0;
    }

    return { distribution, percentage };
}

/* ===== WORD FORMATION WITH CEFR ===== */

/**
 * Tạo word formation string có kèm CEFR level
 * Ví dụ: "advance (v, B2), advancement (n, C1), advanced (adj, B2)"
 * @param {string} baseWord
 * @param {Map} wordFormsMap - Map<string, Set<string>> từ addWord.js
 * @returns {string}
 */
export function generateFormationWithCEFR(baseWord, wordFormsMap) {
    if (!wordFormsMap || wordFormsMap.size === 0) return '';

    const abbr = {
        'noun': 'n', 'verb': 'v', 'adjective': 'adj', 'adverb': 'adv',
        'preposition': 'prep', 'conjunction': 'conj'
    };

    const parts = [];
    const baseWordLower = baseWord.toLowerCase();

    // Sort: base word first, then alphabetical
    const sorted = Array.from(wordFormsMap.entries()).sort((a, b) => {
        if (a[0] === baseWordLower) return -1;
        if (b[0] === baseWordLower) return 1;
        return a[0].localeCompare(b[0]);
    });

    for (const [formWord, posSet] of sorted) {
        const posArray = Array.from(posSet).map(p => abbr[p] || p).filter(Boolean);
        if (posArray.length === 0) continue;

        const cefr = getCEFRLevel(formWord);
        const levelStr = cefr.level !== 'unknown' ? `, ${cefr.level}` : '';

        parts.push(`${formWord} (${posArray.join(', ')}${levelStr})`);
    }

    return parts.join(', ');
}

/* ===== FILTER ===== */

/**
 * Lọc từ vựng theo CEFR levels
 * @param {Array} words
 * @param {Array} allowedLevels - ['A1','A2','B1',...]
 * @param {boolean} includeUnknown
 * @returns {Array}
 */
export function filterByCEFR(words, allowedLevels, includeUnknown = true) {
    return (words || []).filter(w => {
        const level = w.cefrLevel || getCEFRLevel(w.word, w.meanings?.[0]?.pos).level;
        if (level === 'unknown') return includeUnknown;
        return allowedLevels.includes(level);
    });
}

/* ===== COUNT BY LEVEL ===== */

/**
 * Đếm số từ theo từng CEFR level
 * @param {Array} words
 * @returns {Object} { A1: 5, A2: 10, ... unknown: 3 }
 */
export function countByCEFR(words) {
    const counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, unknown: 0 };
    (words || []).forEach(w => {
        const level = w.cefrLevel || getCEFRLevel(w.word, w.meanings?.[0]?.pos).level;
        counts[level] = (counts[level] || 0) + 1;
    });
    return counts;
}

/* ===== HTML HELPERS ===== */

/**
 * Tạo badge HTML
 */
export function cefrBadgeHTML(level) {
    if (!level || level === 'unknown') {
        return '<span class="cefr-badge cefr-unknown" title="Chưa xác định">N/A</span>';
    }
    const label = CEFR_LABELS[level] || '';
    return `<span class="cefr-badge cefr-${level.toLowerCase()}" title="${label}">${level}</span>`;
}

/**
 * Tạo badge nhỏ (inline)
 */
export function cefrBadgeSmallHTML(level) {
    if (!level || level === 'unknown') return '';
    return `<span class="cefr-badge-sm cefr-${level.toLowerCase()}">${level}</span>`;
}
