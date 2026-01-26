/* ========================================
   VoLearn - Text-to-Speech Module
   ======================================== */

import { appData } from '../core/state.js';

let speechSynthesis = null;
let voices = [];
let isInitialized = false;

/**
 * Khởi tạo Speech module
 */
export function initSpeech() {
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        return;
    }
    
    speechSynthesis = window.speechSynthesis;
    
    // Load voices
    loadVoices();
    
    // Voices có thể load async
    speechSynthesis.onvoiceschanged = loadVoices;
    
    // Bind speak buttons
    bindSpeakButtons();
    
    isInitialized = true;
    console.log('✅ Speech system initialized');
}

/**
 * Load available voices
 */
function loadVoices() {
    voices = speechSynthesis.getVoices();
    console.log(`  📢 Loaded ${voices.length} voices`);
}

/**
 * Get voice by language
 */
function getVoice(lang = 'en-US') {
    // Ưu tiên voices theo thứ tự
    const preferredVoices = [
        'Google US English',
        'Google UK English Female',
        'Google UK English Male',
        'Microsoft David',
        'Microsoft Zira',
        'Samantha',
        'Alex'
    ];
    
    // Tìm preferred voice
    for (const name of preferredVoices) {
        const voice = voices.find(v => 
            v.name.includes(name) && v.lang.startsWith(lang.split('-')[0])
        );
        if (voice) return voice;
    }
    
    // Fallback: tìm voice theo lang
    return voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
}

/**
 * Phát âm text
 * @param {string} text - Text cần đọc
 * @param {string} lang - Ngôn ngữ (en-US, en-GB)
 * @param {number} rate - Tốc độ (0.5 - 2)
 */
export function speak(text, lang = null, rate = null) {
    if (!speechSynthesis || !text) return;
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Settings từ appData hoặc params
    const voiceLang = lang || appData.settings?.voice || 'en-US';
    const speechRate = rate || appData.settings?.speed || 1;
    
    utterance.voice = getVoice(voiceLang);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Events
    utterance.onstart = () => {
        document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
    };
    
    utterance.onend = () => {
        document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
    };
    
    utterance.onerror = (e) => {
        console.error('Speech error:', e);
    };
    
    speechSynthesis.speak(utterance);
}

/**
 * Dừng phát âm
 */
export function stopSpeaking() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
}

/**
 * Bind click events cho các nút speak
 */
function bindSpeakButtons() {
    document.addEventListener('click', (e) => {
        // Speak phonetic button
        const phoneticBtn = e.target.closest('.btn-speak-phonetic');
        if (phoneticBtn) {
            e.preventDefault();
            const accent = phoneticBtn.dataset.accent || 'en-US';
            const input = phoneticBtn.closest('.phonetic-input-wrapper')?.querySelector('input');
            const wordInput = document.getElementById('word-input');
            
            const text = wordInput?.value || input?.value || '';
            if (text) {
                phoneticBtn.classList.add('speaking');
                speak(text, accent);
            }
            return;
        }
        
        // Speak text button (textarea)
        const textBtn = e.target.closest('.btn-speak-text');
        if (textBtn) {
            e.preventDefault();
            const lang = textBtn.dataset.lang || 'en';
            const textarea = textBtn.closest('.textarea-with-speaker')?.querySelector('textarea');
            
            const text = textarea?.value || '';
            if (text) {
                textBtn.classList.add('speaking');
                speak(text, lang === 'en' ? 'en-US' : 'vi-VN');
            }
            return;
        }
        
        // Speak word button
        const speakWordBtn = e.target.closest('#btn-speak-word');
        if (speakWordBtn) {
            e.preventDefault();
            const wordInput = document.getElementById('word-input');
            const text = wordInput?.value || '';
            if (text) {
                speak(text);
            }
            return;
        }
        
        // Small speak button (in badges)
        const smallBtn = e.target.closest('.btn-speak-small');
        if (smallBtn) {
            e.preventDefault();
            const text = smallBtn.dataset.word || '';
            const accent = smallBtn.dataset.accent || 'en-US';
            if (text) {
                speak(text, accent);
            }
            return;
        }
    });
}

/**
 * Test voice
 */
export function testVoice() {
    speak('Hello! This is a test of the text to speech system.', appData.settings?.voice);
}

// Expose to window
window.speak = speak;
window.stopSpeaking = stopSpeaking;
window.testVoice = testVoice;
