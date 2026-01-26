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
        }
    };
    
    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
}

/* ===== GET VOICE ===== */
function getVoice(lang) {
    if (!lang || typeof lang !== 'string') {
        // Default to English if lang is invalid
        lang = 'en-US';
    }
    
    const langPrefix = lang.split('-')[0];
    
    // Try exact match first
    let voice = voices.find(v => v.lang === lang);
    
    // Then try prefix match
    if (!voice) {
        voice = voices.find(v => v.lang.startsWith(langPrefix));
    }
    
    return voice;
}

/* ===== SPEAK ===== */
export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Handle options
    if (typeof options === 'string') {
        // Old format: speak(text, voiceURI)
        const voice = voices.find(v => v.voiceURI === options);
        if (voice) utterance.voice = voice;
    } else if (typeof options === 'object') {
        // New format: speak(text, { lang, rate, pitch, volume })
        if (options.lang) {
            const voice = getVoice(options.lang);
            if (voice) utterance.voice = voice;
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
    
    const lang = accentCode || 'en-US';
    speak(word, { lang });
}

/* ===== SPEAK WITH ACCENT ===== */
export function speakWithAccent(text, accentCode) {
    if (!text) return;
    
    // Ensure accentCode is a valid string
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
