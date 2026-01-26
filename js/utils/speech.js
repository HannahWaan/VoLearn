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
    
    // Normalize lang code
    lang = lang.replace('_', '-');
    
    // Try exact match
    let voice = voices.find(v => v.lang.replace('_', '-') === lang);
    if (voice) return voice;
    
    // Try variations
    if (lang === 'en-GB') {
        voice = voices.find(v => 
            v.lang.includes('GB') || 
            v.lang.includes('UK') ||
            v.name.toLowerCase().includes('british') ||
            v.name.toLowerCase().includes('uk') ||
            v.name.toLowerCase().includes('daniel') ||  // macOS UK voice
            v.name.toLowerCase().includes('kate')       // Windows UK voice
        );
        if (voice) return voice;
    }
    
    if (lang === 'en-US') {
        voice = voices.find(v => 
            v.lang.includes('US') || 
            v.name.toLowerCase().includes('us') ||
            v.name.toLowerCase().includes('american') ||
            v.name.toLowerCase().includes('samantha') ||  // macOS US voice
            v.name.toLowerCase().includes('david')        // Windows US voice
        );
        if (voice) return voice;
    }
    
    // Fallback to any English
    const langPrefix = lang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(langPrefix));
    if (voice) return voice;
    
    return voices[0];
}

export function speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    
    // Cancel any ongoing speech
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
            }
        }
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
    }
    
    // Ensure speech synthesis is ready
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Small delay to ensure cancel is processed
    setTimeout(() => {
        speechSynthesis.speak(utterance);
    }, 50);
}

export function speakWord(word, accentCode) {
    if (!word) return;
    
    const lang = (typeof accentCode === 'string' && accentCode) ? accentCode : 'en-US';
    console.log(`🔊 Speaking "${word}" with accent: ${lang}`);
    speak(word, { lang, rate: 0.9 });
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
