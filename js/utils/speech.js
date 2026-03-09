/* ===== SPEECH MODULE ===== */
/* VoLearn v2.2.1 - Text to Speech - Fixed voice selection */

let voices = [];
let voicesLoaded = false;
let voicesReadyCallbacks = [];

export function initSpeech() {
    console.log('🔊 Đang tải giọng đọc...');
    
    const loadVoiceList = () => {
        const newVoices = speechSynthesis.getVoices();
        // Chỉ cập nhật khi thực sự có voices (tránh ghi đè bằng mảng rỗng)
        if (newVoices.length > 0) {
            voices = newVoices;
            voicesLoaded = true;
            console.log(`✅ Đã tải ${voices.length} giọng đọc`);
            
            // Tự động lưu giọng mặc định nếu chưa có trong localStorage
            autoSaveDefaultVoices();
            
            // Fire callbacks cho ai đang đợi voices
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
    
    // Retry cho các trình duyệt load chậm
    setTimeout(loadVoiceList, 300);
    setTimeout(loadVoiceList, 1000);
    setTimeout(loadVoiceList, 3000);
}

/**
 * Đăng ký callback khi voices sẵn sàng.
 * Nếu đã load rồi thì gọi ngay.
 */
export function onVoicesReady(callback) {
    if (voicesLoaded && voices.length > 0) {
        callback(voices);
    } else {
        voicesReadyCallbacks.push(callback);
    }
}

/**
 * Tự động lưu giọng mặc định vào localStorage 
 * nếu user chưa từng chọn giọng trong Settings.
 */
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
                console.log(`🔊 Auto-saved default voice for ${lang}: ${voice.name}`);
            }
        }
    });
}

/**
 * Tìm giọng tốt nhất cho một ngôn ngữ.
 * Ưu tiên: giọng user chọn > exact match > partial match > fallback.
 */
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
                   vName.includes('zira') || vName.includes('mark');
        });
        if (voice) return voice;
    }
    
    // Prefix match (en, vi, ...)
    const prefix = langNorm.split('-')[0];
    voice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (voice) return voice;
    
    return null;  // Trả null, KHÔNG fallback voices[0] để tránh giọng sai ngôn ngữ
}

/**
 * Lấy voice cho một lang code.
 * Ưu tiên giọng user đã chọn trong Settings.
 */
function getVoice(lang) {
    if (!lang || typeof lang !== 'string') {
        lang = 'en-US';
    }
    
    lang = lang.replace('_', '-');
    const langLower = lang.toLowerCase();
    
    // ===== Bước 1: Ưu tiên giọng user đã chọn trong Settings =====
    const settingsKey = langLower.startsWith('vi') ? 'volearn-voice-voice-vi-select'
                      : langLower.includes('gb')   ? 'volearn-voice-voice-uk-select'
                      :                               'volearn-voice-voice-us-select';
    
    const savedVoiceName = localStorage.getItem(settingsKey);
    if (savedVoiceName) {
        const savedVoice = voices.find(v => v.name === savedVoiceName);
        if (savedVoice) return savedVoice;
    }
    
    // ===== Bước 2: Tìm giọng tốt nhất theo lang =====
    const bestVoice = findBestVoice(lang);
    if (bestVoice) return bestVoice;
    
    // ===== Bước 3: Fallback cuối cùng — giọng tiếng Anh bất kỳ (KHÔNG dùng voices[0]) =====
    const anyEnglish = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    if (anyEnglish) return anyEnglish;
    
    // Thực sự không còn gì
    return voices[0] || null;
}

export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Xác định lang và rate
    let lang = null;
    let rate = null;
    
    if (typeof options === 'string') {
        // speak("hello", "en-US")
        lang = options;
    } else if (typeof options === 'object' && options !== null) {
        // speak("hello", { lang: "en-US", rate: 0.9 })
        lang = options.lang || null;
        rate = options.rate || null;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
    }
    
    // Set voice
    if (lang) {
        const voice = getVoice(lang);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;  // Đảm bảo lang khớp với voice
        }
    } else {
        // Không có lang → mặc định en-US
        const voice = getVoice('en-US');
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }
    }
    
    // Set rate: ưu tiên options.rate > localStorage > mặc định 1
    if (rate) {
        utterance.rate = rate;
    } else {
        const savedSpeed = localStorage.getItem('volearn-speed');
        utterance.rate = savedSpeed ? parseFloat(savedSpeed) : 1;
    }
    
    // Speak với delay nhỏ để đảm bảo cancel đã xử lý xong
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
