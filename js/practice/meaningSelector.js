/* ===== MEANING SELECTOR ===== */
/* VoLearn v2.2.0 - Random nghĩa theo settings */

/**
 * Lấy giá trị field từ 1 meaning object cụ thể
 * @param {Object} meaning - meaning object (từ word.meanings[i])
 * @param {Object} word - word object gốc (để fallback phonetic)
 * @param {number} fieldId - field ID (1-8)
 * @returns {string}
 */
export function getFieldFromMeaning(meaning, word, fieldId) {
  const m = meaning || {};
  const w = word || {};
  
  const norm = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.filter(Boolean).join(', ').trim();
    return String(v).trim();
  };
  
  switch (Number(fieldId)) {
    case 1: return norm(w.word);
    case 2: return norm(m.phoneticUS || m.phoneticUK || w.phonetic);
    case 3: return norm(m.pos || w.partOfSpeech);
    case 4: return norm(m.defEn);
    case 5: return norm(m.defVi);
    case 6: return norm(m.example);
    case 7: return norm(m.synonyms);
    case 8: return norm(m.antonyms);
    default: return '';
  }
}

/**
 * Lấy TẤT CẢ giá trị của 1 field từ TẤT CẢ meanings
 * @param {Object} word - word object
 * @param {number} fieldId - field ID
 * @returns {string[]} - mảng các giá trị không trùng
 */
export function getAllValuesForField(word, fieldId) {
  const meanings = word?.meanings || [];
  if (meanings.length === 0) {
    // Fallback: word có thể có field trực tiếp
    const val = getFieldFromMeaning({}, word, fieldId);
    return val ? [val] : [];
  }
  
  const values = [];
  const seen = new Set();
  
  for (const m of meanings) {
    const val = getFieldFromMeaning(m, word, fieldId);
    if (val && !seen.has(val.toLowerCase())) {
      seen.add(val.toLowerCase());
      values.push(val);
    }
  }
  
  return values;
}

/**
 * Random chọn 1 meaning và trả về giá trị field từ meaning đó
 * Dùng cho Quiz, Typing, Dictation
 * 
 * @param {Object} word - word object
 * @param {number} fieldId - field ID cần lấy
 * @returns {{ value: string, meaningIndex: number }}
 */
export function getRandomFieldValue(word, fieldId) {
  const meanings = word?.meanings || [];
  
  if (meanings.length === 0) {
    // Fallback: lấy từ word trực tiếp
    const val = getFieldFromMeaning({}, word, fieldId);
    return { value: val, meaningIndex: -1 };
  }
  
  // Lọc meanings có giá trị cho field này
  const validMeanings = [];
  for (let i = 0; i < meanings.length; i++) {
    const val = getFieldFromMeaning(meanings[i], word, fieldId);
    if (val) {
      validMeanings.push({ index: i, meaning: meanings[i], value: val });
    }
  }
  
  if (validMeanings.length === 0) {
    // Không có meaning nào có field này
    return { value: '', meaningIndex: -1 };
  }
  
  // Random chọn 1
  const picked = validMeanings[Math.floor(Math.random() * validMeanings.length)];
  return { value: picked.value, meaningIndex: picked.index };
}

/**
 * Random chọn 1 meaning và trả về nhiều fields từ CÙNG meaning đó
 * Dùng khi cần đảm bảo hint và answer khớp nhau
 * 
 * @param {Object} word - word object
 * @param {number[]} fieldIds - các field IDs cần lấy
 * @returns {{ values: Object<number, string>, meaningIndex: number }}
 */
export function getRandomMeaningFields(word, fieldIds) {
  const meanings = word?.meanings || [];
  const ids = Array.isArray(fieldIds) ? fieldIds : [];
  
  if (meanings.length === 0) {
    // Fallback
    const values = {};
    for (const fid of ids) {
      values[fid] = getFieldFromMeaning({}, word, fid);
    }
    return { values, meaningIndex: -1 };
  }
  
  // Lọc meanings có ÍT NHẤT 1 field không rỗng
  const validMeanings = [];
  for (let i = 0; i < meanings.length; i++) {
    let hasAnyValue = false;
    for (const fid of ids) {
      if (getFieldFromMeaning(meanings[i], word, fid)) {
        hasAnyValue = true;
        break;
      }
    }
    if (hasAnyValue) {
      validMeanings.push({ index: i, meaning: meanings[i] });
    }
  }
  
  if (validMeanings.length === 0) {
    const values = {};
    for (const fid of ids) {
      values[fid] = '';
    }
    return { values, meaningIndex: -1 };
  }
  
  // Random chọn 1 meaning
  const picked = validMeanings[Math.floor(Math.random() * validMeanings.length)];
  
  // Lấy tất cả fields từ meaning đã chọn
  const values = {};
  for (const fid of ids) {
    values[fid] = getFieldFromMeaning(picked.meaning, word, fid);
  }
  
  return { values, meaningIndex: picked.index };
}

/**
 * Lấy TẤT CẢ giá trị của nhiều fields từ TẤT CẢ meanings
 * Dùng cho Flashcard hiển thị tất cả
 * 
 * @param {Object} word - word object
 * @param {number[]} fieldIds - các field IDs
 * @returns {Object<number, string[]>} - map fieldId -> array of values
 */
export function getAllMeaningsFields(word, fieldIds) {
  const meanings = word?.meanings || [];
  const ids = Array.isArray(fieldIds) ? fieldIds : [];
  
  const result = {};
  for (const fid of ids) {
    result[fid] = getAllValuesForField(word, fid);
  }
  
  return result;
}

/**
 * Format hiển thị nhiều giá trị (cho Flashcard)
 * @param {string[]} values - mảng giá trị
 * @param {string} separator - separator (default: ' • ')
 * @returns {string}
 */
export function formatMultipleValues(values, separator = ' • ') {
  if (!Array.isArray(values)) return '';
  return values.filter(Boolean).join(separator);
}

/* ===== EXPORTS ===== */
window.meaningSelector = {
  getFieldFromMeaning,
  getAllValuesForField,
  getRandomFieldValue,
  getRandomMeaningFields,
  getAllMeaningsFields,
  formatMultipleValues
};
