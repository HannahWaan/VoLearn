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
// Heuristic CEFR estimation for words not in Oxford 5000
const ADVANCED_SUFFIXES_C2 = ['esque', 'ennial', 'aceous', 'itious', 'ulent', 'iform', 'oid'];
const ADVANCED_SUFFIXES_C1 = ['tion', 'sion', 'ment', 'ness', 'ity', 'ence', 'ance', 'ous', 'ive', 'ial', 'ical', 'uous', 'eous', 'ible', 'able', 'ism', 'ist', 'ize', 'ise', 'fy', 'tude', 'ular'];
const ADVANCED_SUFFIXES_B2 = ['ly', 'ful', 'less', 'al', 'en', 'ward', 'wise'];
const ADVANCED_PREFIXES_C2 = ['circum', 'extra', 'infra', 'macro', 'micro', 'mono', 'poly', 'proto', 'quasi', 'retro', 'hyper', 'hypo'];
const ADVANCED_PREFIXES_C1 = ['anti', 'counter', 'inter', 'mis', 'non', 'over', 'pre', 'pseudo', 'semi', 'sub', 'super', 'trans', 'ultra', 'under'];

function estimateCEFR(word) {
    const w = word.toLowerCase().trim();
    const len = w.length;
    
    // Very short common words → likely A1-A2
    if (len <= 3) return 'A1';
    if (len <= 4) return 'A2';
    
    let score = 0; // Higher = more advanced
    
    // Length factor (longer words tend to be more advanced)
    if (len >= 12) score += 3;
    else if (len >= 9) score += 2;
    else if (len >= 7) score += 1;
    
    // Check C2 suffixes
    for (const suf of ADVANCED_SUFFIXES_C2) {
        if (w.endsWith(suf)) { score += 4; break; }
    }
    // Check C1 suffixes
    for (const suf of ADVANCED_SUFFIXES_C1) {
        if (w.endsWith(suf)) { score += 3; break; }
    }
    // Check B2 suffixes
    for (const suf of ADVANCED_SUFFIXES_B2) {
        if (w.endsWith(suf)) { score += 1; break; }
    }
    
    // Check C2 prefixes
    for (const pre of ADVANCED_PREFIXES_C2) {
        if (w.startsWith(pre)) { score += 4; break; }
    }
    // Check C1 prefixes
    for (const pre of ADVANCED_PREFIXES_C1) {
        if (w.startsWith(pre)) { score += 2; break; }
    }
    
    // Latin/Greek roots indicator (multiple syllables, complex patterns)
    const vowelGroups = w.match(/[aeiouy]+/gi);
    const syllables = vowelGroups ? vowelGroups.length : 1;
    if (syllables >= 5) score += 3;
    else if (syllables >= 4) score += 2;
    else if (syllables >= 3) score += 1;
    
    // Double consonants, uncommon letter combos
    if (/ph|th[^e]|ght|sch|chr|psych|pneum/i.test(w)) score += 1;
    
    // Map score to CEFR
    if (score >= 7) return 'C2';
    if (score >= 5) return 'C1';
    if (score >= 3) return 'B2';
    if (score >= 2) return 'B1';
    if (score >= 1) return 'A2';
    return 'B1'; // Default for unknown words
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
