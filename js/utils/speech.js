/* ===== SPEECH MODULE ===== */
/* VoLearn v2.3.0 - Single source of truth for voices */

let voices = [];
let voicesLoaded = false;
let onVoicesReadyCallbacks = [];

/* ===== INIT ===== */
export function initSpeech() {
    console.log('🔊 Đang tải giọng đọc...');
    
    const loadVoiceList = () => {
        const v = speechSynthesis.getVoices();
        if (v.length === 0) return;
        
        voices = v;
        voicesLoaded = true;
        console.log(`✅ Đã tải ${voices.length} giọng đọc`);
        
        // Fire tất cả callbacks đang chờ (bao gồm cả Settings populate)
        const cbs = [...onVoicesReadyCallbacks];
        onVoicesReadyCallbacks = [];
        cbs.forEach(cb => { try { cb(voices); } catch(e) { console.error(e); } });
    };
    
    // Gọi ngay lần 1
    loadVoiceList();
    
    // Dùng onvoiceschanged — CHỈ set 1 lần duy nhất ở đây
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoiceList;
    }
    
    // Fallback polling cho mobile
    if (!voicesLoaded) {
        const poll = [100, 300, 600, 1000, 2000, 4000];
        poll.forEach(ms => setTimeout(() => { if (!voicesLoaded) loadVoiceList(); }, ms));
    }
}

/**
 * Đăng ký callback khi voices sẵn sàng.
 * Nếu đã load → gọi ngay. 
 * Cả speech.js và settings.js đều dùng hàm này.
 */
export function onVoicesReady(callback) {
    if (voicesLoaded && voices.length > 0) {
        try { callback(voices); } catch(e) { console.error(e); }
    } else {
        onVoicesReadyCallbacks.push(callback);
    }
}

/* ===== NORMALIZE LANG CODE ===== */
function normalizeLang(lang) {
    if (!lang) return 'en-US';
    lang = lang.replace('_', '-');
    const p = lang.split('-');
    if (p.length === 2) return p[0].toLowerCase() + '-' + p[1].toUpperCase();
    return lang;
}

/* ===== FIND BEST VOICE (không dùng localStorage) ===== */
function findBestVoice(lang) {
    if (!voices.length) return null;
    const lc = (lang || 'en-US').replace('_', '-').toLowerCase();

    // Exact
    let v = voices.find(x => x.lang.replace('_', '-').toLowerCase() === lc);
    if (v) return v;

    // en-GB partials
    if (lc === 'en-gb') {
        v = voices.find(x => {
            const xl = x.lang.replace('_', '-').toLowerCase();
            const xn = x.name.toLowerCase();
            return xl.includes('gb') || xn.includes('british') || xn.includes('daniel') || xn.includes('kate');
        });
        if (v) return v;
    }
    // en-US partials
    if (lc === 'en-us') {
        v = voices.find(x => {
            const xl = x.lang.replace('_', '-').toLowerCase();
            const xn = x.name.toLowerCase();
            return xl.includes('us') || xn.includes('american') || xn.includes('samantha') ||
                   xn.includes('david') || xn.includes('zira') || xn.includes('mark') || xn.includes('google us');
        });
        if (v) return v;
    }

    // Prefix
    const prefix = lc.split('-')[0];
    v = voices.find(x => x.lang.replace('_', '-').toLowerCase().startsWith(prefix));
    return v || null;
}

/* ===== GET VOICE (có tra localStorage) ===== */
function getVoice(lang) {
    if (!lang) lang = 'en-US';
    lang = lang.replace('_', '-');
    const lc = lang.toLowerCase();

    // Bước 1 — Giọng user đã chọn trong Settings
    const key = lc.startsWith('vi') ? 'volearn-voice-voice-vi-select'
              : lc.includes('gb')   ? 'volearn-voice-voice-uk-select'
              :                        'volearn-voice-voice-us-select';
    const saved = localStorage.getItem(key);
    if (saved) {
        const sv = voices.find(x => x.name === saved);
        if (sv) return sv;
    }

    // Bước 2 — Tìm tốt nhất
    const best = findBestVoice(lang);
    if (best) return best;

    // Bước 3 — Bất kỳ giọng tiếng Anh
    const anyEn = voices.find(x => x.lang.replace('_', '-').toLowerCase().startsWith('en'));
    if (anyEn) return anyEn;

    return voices[0] || null;
}

/* ===== SPEAK ===== */
export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    let targetLang = null;
    let rate = null;

    if (typeof options === 'string') {
        targetLang = options;
    } else if (options && typeof options === 'object') {
        targetLang = options.lang || null;
        rate = options.rate || null;
        if (options.pitch)  u.pitch  = options.pitch;
        if (options.volume) u.volume = options.volume;
    }

    if (!targetLang) targetLang = 'en-US';

    const voice = getVoice(targetLang);
    if (voice) {
        u.voice = voice;                         // Desktop
        u.lang  = normalizeLang(voice.lang);     // Mobile (Android bắt buộc phải set)
    } else {
        u.lang = normalizeLang(targetLang);      // Fallback cho mobile
    }

    // Rate: options > localStorage > 1
    u.rate = rate || parseFloat(localStorage.getItem('volearn-speed') || '1');

    setTimeout(() => speechSynthesis.speak(u), 50);
}

export function speakWord(word, accent) {
    if (!word) return;
    speak(word, { lang: accent || 'en-US' });
}
export function speakWithAccent(text, accent) {
    if (!text) return;
    speak(text, { lang: accent || 'en-US' });
}
export function stopSpeaking() { speechSynthesis.cancel(); }
export function getAvailableVoices() { return [...voices]; }
export function isVoicesLoaded() { return voicesLoaded; }

/* ===== GLOBAL ===== */
window.initSpeech = initSpeech;
window.speak = speak;
window.speakWord = speakWord;
window.speakWithAccent = speakWithAccent;
window.stopSpeaking = stopSpeaking;
window.getAvailableVoices = getAvailableVoices;
