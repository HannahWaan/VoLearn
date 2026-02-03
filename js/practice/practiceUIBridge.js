import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';

// Hiện practice area (dùng layout có sẵn trong templates/sections/practice.html)
export function showPracticeArea() {
  const practiceArea = document.getElementById('practice-area');
  const practiceModes = document.getElementById('practice-modes');
  if (practiceModes) practiceModes.style.display = 'none';
  if (practiceArea) practiceArea.style.display = 'block';
  updatePracticeProgress();
}

export function updatePracticeProgress() {
  const bar = document.getElementById('practice-progress-bar');
  const text = document.getElementById('practice-progress-text');

  // QuizSettings module tự quản practiceWords/practiceIndex,
  // nên progress chuẩn nhất sẽ được set từ nơi render.
  // Ở đây chỉ đảm bảo element không bị “kẹt”.
  if (bar && !bar.style.width) bar.style.width = '0%';
  if (text && !text.textContent) text.textContent = '0/0';
}

export function updateReviewHistory(wordId) {
  if (!wordId) return;

  const today = new Date().toISOString().split('T')[0];
  if (!appData.history) appData.history = [];

  let historyEntry = appData.history.find(h => h.date === today);
  if (!historyEntry) {
    historyEntry = { date: today, added: 0, reviewed: 0, addedWords: [], reviewedWords: [] };
    appData.history.push(historyEntry);
  }

  if (!historyEntry.reviewedWords) historyEntry.reviewedWords = [];
  if (!historyEntry.reviewedWords.includes(wordId)) historyEntry.reviewedWords.push(wordId);
  historyEntry.reviewed = historyEntry.reviewedWords.length;

  saveData(appData);
}

export function endPractice() {
  const practiceContent = document.getElementById('practice-content');
  if (!practiceContent) return;

  practiceContent.innerHTML = `
    <div class="practice-complete">
      <i class="fas fa-trophy"></i>
      <h2>Hoàn thành!</h2>
      <p>Bạn đã hoàn thành bài luyện tập.</p>
      <button class="btn-primary" onclick="window.hidePracticeArea && window.hidePracticeArea()">Quay lại</button>
    </div>
  `;
}
