/* ===== TYPING MODE ===== */
/* VoLearn v2.1.0 - Chế độ luyện gõ */

import { appData } from '../core/state.js';
import { navigate } from '../core/router.js';

/* ===== STATE ===== */
let typingState = {
    words: [],
    currentIndex: 0,
    score: 0,
    wrong: 0,
    startTime: null,
    totalChars: 0,
    correctChars: 0,
    settings: {}
};

/* ===== START TYPING ===== */
export function startTyping(words, settings = {}) {
    if (!words || words.length === 0) {
        window.showToast?.('Không có từ để luyện tập!', 'warning');
        return;
    }

    typingState = {
        words: settings.shuffle ? shuffleArray([...words]) : [...words],
        currentIndex: 0,
        score: 0,
        wrong: 0,
        startTime: Date.now(),
        totalChars: 0,
        correctChars: 0,
        settings: {
            showMeaning: true,
            speakOnComplete: true,
            ...settings
        }
    };

    renderTypingUI();
    showCurrentTypingWord();
}

/* ===== RENDER UI ===== */
function renderTypingUI() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    container.innerHTML = `
        <div class="typing-container">
            <div class="typing-header">
                <button class="btn-icon" onclick="window.exitTyping()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="progress-info">
                    <span id="typing-progress">0 / ${typingState.words.length}</span>
                </div>
                <div class="wpm-info">
                    <span id="typing-wpm">0</span> WPM
                </div>
            </div>
            
            <div class="typing-main">
                <div class="meaning-display" id="meaning-display"></div>
                <div class="word-display" id="word-display"></div>
                
                <div class="input-area">
                    <input type="text" 
                           id="typing-input" 
                           placeholder="Gõ từ ở đây..."
                           autocomplete="off"
                           autocapitalize="off"
                           autofocus>
                </div>
                
                <div class="feedback-area" id="typing-feedback"></div>
            </div>
            
            <div class="typing-footer">
                <button class="btn-icon" onclick="window.speakTypingWord()">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="btn-secondary" onclick="window.skipTypingWord()">Bỏ qua</button>
            </div>
        </div>
    `;

    // Bind input event
    document.getElementById('typing-input')?.addEventListener('input', handleTypingInput);
}

/* ===== SHOW CURRENT WORD ===== */
function showCurrentTypingWord() {
    if (typingState.currentIndex >= typingState.words.length) {
        showTypingResults();
        return;
    }

    const word = typingState.words[typingState.currentIndex];
    
    // Show meaning
    const meaningDisplay = document.getElementById('meaning-display');
    if (meaningDisplay && typingState.settings.showMeaning) {
        meaningDisplay.innerHTML = `<p>${word.meaning || ''}</p>`;
    }
    
    // Show word display
    renderWordDisplay(word.word, '');
    
    // Reset input
    const input = document.getElementById('typing-input');
    if (input) {
        input.value = '';
        input.disabled = false;
        input.focus();
    }
    
    document.getElementById('typing-feedback').innerHTML = '';
    
    updateTypingProgress();
}

/* ===== RENDER WORD DISPLAY ===== */
function renderWordDisplay(word, typed) {
    const display = document.getElementById('word-display');
    if (!display) return;

    let html = '';
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const typedChar = typed[i] || '';
        
        let className = 'char';
        if (i < typed.length) {
            className += typedChar.toLowerCase() === char.toLowerCase() ? ' correct' : ' wrong';
        } else if (i === typed.length) {
            className += ' current';
        }
        
        html += `<span class="${className}">${char}</span>`;
    }
    
    display.innerHTML = html;
}

/* ===== HANDLE INPUT ===== */
function handleTypingInput(e) {
    const word = typingState.words[typingState.currentIndex];
    if (!word) return;

    const typed = e.target.value;
    
    // Update display
    renderWordDisplay(word.word, typed);
    
    // Check if complete
    if (typed.length >= word.word.length) {
        const isCorrect = typed.toLowerCase() === word.word.toLowerCase();
        completeTypingWord(isCorrect, typed);
    }
}

/* ===== COMPLETE WORD ===== */
function completeTypingWord(isCorrect, typed) {
    const word = typingState.words[typingState.currentIndex];
    
    typingState.totalChars += word.word.length;
    
    if (isCorrect) {
        typingState.score++;
        typingState.correctChars += word.word.length;
        
        // Speak if enabled
        if (typingState.settings.speakOnComplete) {
            speakTypingWord();
        }
    } else {
        typingState.wrong++;
    }
    
    // Show feedback
    const feedback = document.getElementById('typing-feedback');
    if (feedback) {
        feedback.innerHTML = isCorrect 
            ? '<div class="feedback correct"><i class="fas fa-check"></i> Đúng!</div>'
            : `<div class="feedback wrong"><i class="fas fa-times"></i> Sai! Đáp án: ${word.word}</div>`;
    }
    
    // Disable input
    document.getElementById('typing-input').disabled = true;
    
    // Next word after delay
    setTimeout(() => {
        typingState.currentIndex++;
        showCurrentTypingWord();
    }, isCorrect ? 800 : 1500);
    
    updateTypingProgress();
}

/* ===== SKIP WORD ===== */
export function skipTypingWord() {
    typingState.wrong++;
    typingState.currentIndex++;
    showCurrentTypingWord();
}

/* ===== SPEAK WORD ===== */
export function speakTypingWord() {
    const word = typingState.words[typingState.currentIndex];
    if (!word) return;

    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
}

/* ===== UPDATE PROGRESS ===== */
function updateTypingProgress() {
    const progressEl = document.getElementById('typing-progress');
    const wpmEl = document.getElementById('typing-wpm');
    
    if (progressEl) {
        progressEl.textContent = `${typingState.currentIndex + 1} / ${typingState.words.length}`;
    }
    
    // Calculate WPM
    if (wpmEl && typingState.correctChars > 0) {
        const minutes = (Date.now() - typingState.startTime) / 60000;
        const wpm = Math.round((typingState.correctChars / 5) / minutes);
        wpmEl.textContent = wpm || 0;
    }
}

/* ===== SHOW RESULTS ===== */
function showTypingResults() {
    const container = document.getElementById('practice-area');
    if (!container) return;

    const total = typingState.words.length;
    const accuracy = total > 0 ? Math.round((typingState.score / total) * 100) : 0;
    const minutes = (Date.now() - typingState.startTime) / 60000;
    const wpm = Math.round((typingState.correctChars / 5) / minutes) || 0;

    container.innerHTML = `
        <div class="practice-results">
            <div class="results-header">
                <span class="emoji">⌨️</span>
                <h2>Kết quả Luyện gõ</h2>
            </div>
            
            <div class="results-stats">
                <div class="stat-circle">
                    <span class="value">${accuracy}%</span>
                </div>
                <div class="stats-detail">
                    <div class="stat-row">
                        <span>Đúng:</span>
                        <span class="correct">${typingState.score}</span>
                    </div>
                    <div class="stat-row">
                        <span>Sai:</span>
                        <span class="wrong">${typingState.wrong}</span>
                    </div>
                    <div class="stat-row highlight">
                        <span>Tốc độ:</span>
                        <span>${wpm} WPM</span>
                    </div>
                </div>
            </div>
            
            <div class="results-actions">
                <button class="btn-primary" onclick="window.restartTyping()">
                    <i class="fas fa-redo"></i> Làm lại
                </button>
                <button class="btn-secondary" onclick="window.exitTyping()">
                    <i class="fas fa-home"></i> Quay lại
                </button>
            </div>
        </div>
    `;
}

/* ===== EXIT ===== */
export function exitTyping() {
    typingState = {
        words: [],
        currentIndex: 0,
        score: 0,
        wrong: 0,
        startTime: null,
        totalChars: 0,
        correctChars: 0,
        settings: {}
    };
    navigate('practice');
}

/* ===== RESTART ===== */
export function restartTyping() {
    const words = [...typingState.words];
    const settings = { ...typingState.settings };
    startTyping(words, settings);
}

/* ===== UTILITIES ===== */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/* ===== EXPORTS ===== */
window.startTyping = startTyping;
window.speakTypingWord = speakTypingWord;
window.skipTypingWord = skipTypingWord;
window.exitTyping = exitTyping;
window.restartTyping = restartTyping;
