/* ===== SPEECH MODULE ===== */
/* VoLearn v2.1.0 - Text to Speech */

let voices = [];
let voicesLoaded = false;

export function initSpeech() {
    console.log('🔊 Đang tải giọng đọc...');
    
    const loadVoices = () => {
        voices = speechSynthesis.getVoices();
        voicesLoaded = voices.length > 0;
        if (voicesLoaded) {
            console.log(`✅ Đã tải ${voices.length} giọng đọc`);
        }
    };
    
    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    setTimeout(loadVoices, 500);
    setTimeout(loadVoices, 1000);
}

function getVoice(lang) {
    if (!lang || typeof lang !== 'string') {
        lang = 'en-US';
    }
    
    lang = lang.replace('_', '-');
    
    // === FIX: Ưu tiên giọng user đã chọn trong Settings ===
    const settingsKey = lang.startsWith('vi') ? 'volearn-voice-vi-select' 
                      : lang.includes('GB') ? 'volearn-voice-uk-select' 
                      : 'volearn-voice-us-select';
    const savedVoiceName = localStorage.getItem(settingsKey);
    if (savedVoiceName) {
        const savedVoice = voices.find(v => v.name === savedVoiceName);
        if (savedVoice) return savedVoice;
    }
    
    // Try exact match
    let voice = voices.find(v => v.lang.replace('_', '-') === lang);
    if (voice) return voice;
    
    if (lang === 'en-GB') {
        voice = voices.find(v => 
            v.lang.includes('GB') || 
            v.lang.includes('UK') ||
            v.name.toLowerCase().includes('british') ||
            v.name.toLowerCase().includes('uk') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('kate')
        );
        if (voice) return voice;
    }
    
    if (lang === 'en-US') {
        voice = voices.find(v => 
            v.lang.includes('US') || 
            v.name.toLowerCase().includes('us') ||
            v.name.toLowerCase().includes('american') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('david')
        );
        if (voice) return voice;
    }
    
    const langPrefix = lang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(langPrefix));
    if (voice) return voice;
    
    return voices[0];
}

export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // === FIX: Khi options là string, coi đó là lang code (en-US, en-GB, vi-VN) ===
    // Trước đây code tìm theo voiceURI, không bao giờ match được
    if (typeof options === 'string') {
        const voice = getVoice(options);
        if (voice) {
            utterance.voice = voice;
        }
    } else if (typeof options === 'object') {
        if (options.lang) {
            const voice = getVoice(options.lang);
            if (voice) {
                utterance.voice = voice;
            }
        }
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
    }
    
    // === FIX: Đọc tốc độ từ Settings ===
    if (typeof options !== 'object' || !options.rate) {
        const savedSpeed = localStorage.getItem('volearn-speed');
        if (savedSpeed) {
            utterance.rate = parseFloat(savedSpeed);
        }
    }
    
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    setTimeout(() => {
        speechSynthesis.speak(utterance);
    }, 50);
}

export function speakWord(word, accentCode) {
    if (!word) return;
    
    const lang = (typeof accentCode === 'string' && accentCode) ? accentCode : 'en-US';
    console.log(`🔊 Speaking "${word}" with accent: ${lang}`);
    speak(word, { lang, rate: parseFloat(localStorage.getItem('volearn-speed') || '0.9') });
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

/* ===== GLOBAL EXPORTS ===== */
window.initSpeech = initSpeech;
window.speak = speak;
window.speakWord = speakWord;
window.speakWithAccent = speakWithAccent;
window.stopSpeaking = stopSpeaking;
window.getAvailableVoices = getAvailableVoices;
