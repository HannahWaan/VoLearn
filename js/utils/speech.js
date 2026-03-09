/* ===== SPEECH MODULE ===== */
/* VoLearn v2.2.2 - Text to Speech - Mobile + Desktop compatible */

let voices = [];
let voicesLoaded = false;
let voicesReadyCallbacks = [];
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
);

export function initSpeech() {
    console.log(`🔊 Đang tải giọng đọc... (mobile: ${isMobile})`);
    
    const loadVoiceList = () => {
        const newVoices = speechSynthesis.getVoices();
        if (newVoices.length > 0) {
            voices = newVoices;
            voicesLoaded = true;
            console.log(`✅ Đã tải ${voices.length} giọng đọc`);
            
            // Debug: log tất cả voices trên mobile
            if (isMobile) {
                console.log('📱 Mobile voices:', voices.map(v => 
                    `${v.name} [${v.lang}] ${v.localService ? 'local' : 'remote'}`
                ));
            }
            
            autoSaveDefaultVoices();
            
            voicesReadyCallbacks.forEach(cb => {
                try { cb(voices); } catch(e) {}
            });
            voicesReadyCallbacks = [];
        }
    };
    
    loadVoiceList();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoiceList;
    }
    
    setTimeout(loadVoiceList, 300);
    setTimeout(loadVoiceList, 1000);
    setTimeout(loadVoiceList, 3000);
}

export function onVoicesReady(callback) {
    if (voicesLoaded && voices.length > 0) {
        callback(voices);
    } else {
        voicesReadyCallbacks.push(callback);
    }
}

/* ===== AUTO SAVE DEFAULT VOICES ===== */
function autoSaveDefaultVoices() {
    const keys = [
        { key: 'volearn-voice-voice-us-select', lang: 'en-US' },
        { key: 'volearn-voice-voice-uk-select', lang: 'en-GB' },
        { key: 'volearn-voice-voice-vi-select', lang: 'vi'    }
    ];
    
    keys.forEach(({ key, lang }) => {
        if (!localStorage.getItem(key)) {
            const voice = findBestVoice(lang);
            if (voice) {
                localStorage.setItem(key, voice.name);
            }
        }
    });
}

/* ===== FIND BEST VOICE ===== */
function findBestVoice(lang) {
    if (!voices || voices.length === 0) return null;
    
    const langNorm = (lang || 'en-US').replace('_', '-').toLowerCase();
    
    // Exact match
    let voice = voices.find(v => v.lang.replace('_', '-').toLowerCase() === langNorm);
    if (voice) return voice;
    
    // Partial match cho en-GB
    if (langNorm === 'en-gb') {
        voice = voices.find(v => {
            const vLang = v.lang.replace('_', '-').toLowerCase();
            const vName = v.name.toLowerCase();
            return vLang.includes('gb') || vName.includes('british') || 
                   vName.includes('daniel') || vName.includes('kate');
        });
        if (voice) return voice;
    }
    
    // Partial match cho en-US
    if (langNorm === 'en-us') {
        voice = voices.find(v => {
            const vLang = v.lang.replace('_', '-').toLowerCase();
            const vName = v.name.toLowerCase();
            return vLang.includes('us') || vName.includes('american') || 
                   vName.includes('samantha') || vName.includes('david') ||
                   vName.includes('zira') || vName.includes('mark') ||
                   vName.includes('google us');
        });
        if (voice) return voice;
    }
    
    // Prefix match (en, vi, ...)
    const prefix = langNorm.split('-')[0];
    voice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(prefix));
    if (voice) return voice;
    
    return null;
}

/* ===== GET VOICE ===== */
function getVoice(lang) {
    if (!lang || typeof lang !== 'string') {
        lang = 'en-US';
    }
    
    lang = lang.replace('_', '-');
    const langLower = lang.toLowerCase();
    
    // Bước 1: Ưu tiên giọng user đã chọn trong Settings
    const settingsKey = langLower.startsWith('vi') ? 'volearn-voice-voice-vi-select'
                      : langLower.includes('gb')   ? 'volearn-voice-voice-uk-select'
                      :                               'volearn-voice-voice-us-select';
    
    const savedVoiceName = localStorage.getItem(settingsKey);
    if (savedVoiceName) {
        const savedVoice = voices.find(v => v.name === savedVoiceName);
        if (savedVoice) return savedVoice;
    }
    
    // Bước 2: Tìm giọng tốt nhất theo lang
    const bestVoice = findBestVoice(lang);
    if (bestVoice) return bestVoice;
    
    // Bước 3: Fallback — giọng tiếng Anh bất kỳ (không dùng voices[0])
    const anyEnglish = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith('en'));
    if (anyEnglish) return anyEnglish;
    
    return voices[0] || null;
}

/* ===== Chuẩn hóa lang code sang BCP 47 ===== */
function normalizeLangCode(lang) {
    if (!lang) return 'en-US';
    // Đổi en_US → en-US, vi_VN → vi-VN
    lang = lang.replace('_', '-');
    
    // Đảm bảo format chuẩn: 2 chữ thường - 2 chữ hoa (en-US, vi-VN)
    const parts = lang.split('-');
    if (parts.length === 2) {
        return parts[0].toLowerCase() + '-' + parts[1].toUpperCase();
    }
    return lang;
}

/* ===== SPEAK — Core function ===== */
export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Xác định lang và rate từ options
    let targetLang = null;
    let rate = null;
    
    if (typeof options === 'string') {
        // speak("hello", "en-US")
        targetLang = options;
    } else if (typeof options === 'object' && options !== null) {
        // speak("hello", { lang: "en-US", rate: 0.9 })
        targetLang = options.lang || null;
        rate = options.rate || null;
        if (options.pitch) utterance.pitch = options.pitch;
        if (options.volume) utterance.volume = options.volume;
    }
    
    // Mặc định là en-US nếu không chỉ định
    if (!targetLang) {
        targetLang = 'en-US';
    }
    
    // ===== CRITICAL FIX CHO MOBILE =====
    // Trên Android Chrome: utterance.voice bị IGNORE
    // Phải set utterance.lang = BCP 47 code → Android mới đổi ngôn ngữ
    //
    // Trên Desktop: utterance.voice hoạt động tốt
    // Set cả 2 để đảm bảo hoạt động trên mọi platform
    
    const voice = getVoice(targetLang);
    
    if (voice) {
        utterance.voice = voice;                              // Desktop dùng cái này
        utterance.lang = normalizeLangCode(voice.lang);       // Mobile dùng cái này
    } else {
        // Không tìm được voice → vẫn set lang để mobile đọc đúng ngôn ngữ
        utterance.lang = normalizeLangCode(targetLang);
    }
    
    // Set rate: options.rate > localStorage > mặc định 1
    if (rate) {
        utterance.rate = rate;
    } else {
        const savedSpeed = localStorage.getItem('volearn-speed');
        utterance.rate = savedSpeed ? parseFloat(savedSpeed) : 1;
    }
    
    // Speak
    setTimeout(() => {
        speechSynthesis.speak(utterance);
    }, 50);
}

export function speakWord(word, accentCode) {
    if (!word) return;
    const lang = (typeof accentCode === 'string' && accentCode) ? accentCode : 'en-US';
    console.log(`🔊 Speaking "${word}" with accent: ${lang}`);
    speak(word, { lang });
}

export function speakWithAccent(text, accentCode) {
    if (!text) return;
    const lang = (typeof accentCode === 'string' && accentCode) ? accentCode : 'en-US';
    speak(text, { lang });
}

export function stopSpeaking() {
    speechSynthesis.cancel();
}

export function getAvailableVoices() {
    return [...voices];
}

export function isVoicesLoaded() {
    return voicesLoaded;
}

/* ===== GLOBAL EXPORTS ===== */
window.initSpeech = initSpeech;
window.speak = speak;
window.speakWord = speakWord;
window.speakWithAccent = speakWithAccent;
window.stopSpeaking = stopSpeaking;
window.getAvailableVoices = getAvailableVoices;
