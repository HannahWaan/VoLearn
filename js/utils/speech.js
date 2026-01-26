/* ===== SPEECH MODULE ===== */
/* VoLearn v2.1.0 - Text to Speech */

/* ===== STATE ===== */
let voices = [];
let voicesLoaded = false;

/* ===== INITIALIZATION ===== */
export function initSpeech() {
    console.log('🔊 Đang tải giọng đọc...');
    
    const loadVoices = () => {
        voices = speechSynthesis.getVoices();
        voicesLoaded = voices.length > 0;
        if (voicesLoaded) {
            console.log(`✅ Đã tải ${voices.length} giọng đọc`);
            // Log available English voices for debugging
            const enVoices = voices.filter(v => v.lang.startsWith('en'));
            console.log('English voices:', enVoices.map(v => `${v.name} (${v.lang})`));
        }
    };
    
    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Fallback: try loading voices after delay
    setTimeout(loadVoices, 500);
}

/* ===== GET VOICE BY LANG ===== */
function getVoice(lang) {
    if (!lang || typeof lang !== 'string') {
        lang = 'en-US';
    }
    
    // Map common accent codes
    const langMap = {
        'en-US': ['en-US', 'en_US'],
        'en-GB': ['en-GB', 'en_GB', 'en-AU', 'en_AU'],
        'vi-VN': ['vi-VN', 'vi_VN', 'vi']
    };
    
    const langVariants = langMap[lang] || [lang];
    const langPrefix = lang.split('-')[0];
    
    // Try exact match first
    for (const variant of langVariants) {
        const voice = voices.find(v => v.lang === variant || v.lang.replace('_', '-') === variant);
        if (voice) return voice;
    }
    
    // Try prefix match for the specific accent
    if (lang === 'en-GB') {
        // For UK, try to find British or non-US English
        const ukVoice = voices.find(v => 
            v.lang === 'en-GB' || 
            v.lang === 'en_GB' ||
            (v.lang.startsWith('en') && v.name.toLowerCase().includes('british')) ||
            (v.lang.startsWith('en') && v.name.toLowerCase().includes('uk'))
        );
        if (ukVoice) return ukVoice;
    }
    
    if (lang === 'en-US') {
        // For US, try to find American English
        const usVoice = voices.find(v => 
            v.lang === 'en-US' || 
            v.lang === 'en_US' ||
            (v.lang.startsWith('en') && v.name.toLowerCase().includes('us')) ||
            (v.lang.startsWith('en') && v.name.toLowerCase().includes('american'))
        );
        if (usVoice) return usVoice;
    }
    
    // Fallback to any English voice
    const anyEnglish = voices.find(v => v.lang.startsWith('en'));
    if (anyEnglish) return anyEnglish;
    
    // Final fallback: first available voice
    return voices[0];
}

/* ===== SPEAK ===== */
export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (typeof options === 'string') {
        const voice = voices.find(v => v.voiceURI === options);
        if (voice) utterance.voice = voice;
    } else if (typeof options === 'object') {
        if (options.lang) {
            const voice = getVoice(options.lang);
            if (voice) {
                utterance.voice = voice;
                console.log(`Speaking "${text}" with voice: ${voice.name} (${voice.lang})`);
            }
        }
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
    }
    
    speechSynthesis.speak(utterance);
}

/* ===== SPEAK WORD ===== */
export function speakWord(word, accentCode) {
    if (!word) return;
    speechSynthesis.cancel();
    
    const lang = (typeof accentCode === 'string' && accentCode) ? accentCode : 'en-US';
    speak(word, { lang });
}

/* ===== SPEAK WITH ACCENT ===== */
export function speakWithAccent(text, accentCode) {
    if (!text) return;
    const lang = (typeof accentCode === 'string' && accentCode) ? accentCode : 'en-US';
    speak(text, { lang });
}

/* ===== STOP SPEAKING ===== */
export function stopSpeaking() {
    speechSynthesis.cancel();
}

/* ===== GET AVAILABLE VOICES ===== */
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
