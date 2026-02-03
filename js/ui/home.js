/* ========================================
   VoLearn - Home Dashboard UI (Chart.js)
   ======================================== */

import { appData, getStats } from '../core/state.js';

let charts = {
  scoreGauge: null,
  accuracyDonut: null,
  performanceRadar: null,
  studyTimeLine: null,
  vocabPie: null,
  statusDonut: null
};

let homeState = {
  timeRange: 'day' // day | week | month
};

function $(id) {
  return document.getElementById(id);
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function toDayKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().split('T')[0];
}

/**
 * Duration parser that tolerates:
 * - seconds (number)
 * - milliseconds (number)
 * - accidental Unix timestamp seconds (number) -> treated as NOT a duration (0)
 * - "HH:MM:SS" or "MM:SS" (string)
 */
function parseDurationToSeconds(dur) {
  if (dur == null) return 0;

  // Number case
  if (typeof dur === 'number' && Number.isFinite(dur)) {
    const n = dur;

    // If looks like Unix timestamp seconds (e.g. 1,769,709,737 around 2026)
    // treat as invalid duration.
    if (n >= 1_000_000_000 && n <= 2_000_000_000) return 0;

    // If looks like epoch ms timestamp (very large)
    if (n > 1_000_000_000_000) return 0;

    // If too large to be a realistic duration in seconds, assume milliseconds.
    // 10,000,000 seconds ~ 115 days
    if (n > 10_000_000) return Math.round(n / 1000);

    // Else assume seconds
    return Math.max(0, Math.round(n));
  }

  // String case
  if (typeof dur === 'string') {
    const s = dur.trim();
    if (!s) return 0;

    const parts = s.split(':').map(p => p.trim());
    if (parts.length === 2 || parts.length === 3) {
      const nums = parts.map(x => Number(x));
      if (nums.some(n => !Number.isFinite(n))) return 0;

      if (parts.length === 2) {
        const [mm, ss] = nums;
        return Math.max(0, mm * 60 + ss);
      }

      const [hh, mm, ss] = nums;
      return Math.max(0, hh * 3600 + mm * 60 + ss);
    }

    const asNum = Number(s);
    if (Number.isFinite(asNum)) return parseDurationToSeconds(asNum);

    return 0;
  }

  return 0;
}

function formatMinutes(min) {
  const m = Math.round(Number(min || 0));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function uniqWordsById(words) {
  const seen = new Set();
  const out = [];
  for (const w of (words || [])) {
    const id = w?.id;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(w);
  }
  return out;
}

function getAllWords() {
  const all = [];
  if (Array.isArray(appData.vocabulary)) all.push(...appData.vocabulary);
  if (Array.isArray(appData.sets)) {
    appData.sets.forEach(s => {
      if (Array.isArray(s?.words)) all.push(...s.words);
    });
  }
  return uniqWordsById(all);
}

/**
 * Practice sessions:
 * - New schema: { type:'practice', duration, wordsCount, accuracy, timestamp/date }
 * - Fallback old schema: { date, reviewed:[...] } -> pseudo sessions (duration=0)
 */
function getPracticeHistory() {
  const hist = Array.isArray(appData.history) ? appData.history : [];

  const practice = hist.filter(h => h?.type === 'practice');
  if (practice.length) return practice;

  const fallback = [];
  for (const h of hist) {
    if (!h || !h.date) continue;
    if (!Array.isArray(h.reviewed) || h.reviewed.length === 0) continue;

    fallback.push({
      type: 'practice',
      mode: 'legacy',
      date: h.date,
      timestamp: h.date,
      wordsCount: h.reviewed.length,
      total: h.reviewed.length,
      duration: 0,
      accuracy: 0
    });
  }
  return fallback;
}

function sum(arr) {
  return (arr || []).reduce((a, b) => a + (Number(b) || 0), 0);
}

function avg(arr) {
  if (!arr || !arr.length) return 0;
  return sum(arr) / arr.length;
}

/* ===== Chart.js loader (CDN) ===== */
async function ensureChartJs() {
  if (window.Chart) return true;

  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(s);
  });

  return !!window.Chart;
}

function destroyCharts() {
  for (const k of Object.keys(charts)) {
    try {
      charts[k]?.destroy?.();
    } catch (e) {}
    charts[k] = null;
  }
}

/* ===== Word helpers ===== */
function isAutoWord(w) {
  if (!w) return false;
  if (w.auto === true) return true;
  if (w.isAuto === true) return true;
  if (typeof w.source === 'string' && w.source.toLowerCase() === 'auto') return true;
  if (typeof w.addedBy === 'string' && w.addedBy.toLowerCase() === 'system') return true;
  return false;
}

/* ===== Data models ===== */
function computeOverview(words, practiceSessions) {
  const stats = getStats?.() || { total: 0, mastered: 0, streak: 0 };

  const total = Number(stats.total || words.length || 0);
  const mastered = Number(stats.mastered || 0);
  const masteryRate = total > 0 ? (mastered / total) * 100 : 0;

  const recent = [...practiceSessions].slice(-20);
  const accs = recent.map(s => Number(s.accuracy || 0));
  const avgAcc = avg(accs);
  const avgScore10 = avgAcc / 10;

  const totalSecondsAll = sum(practiceSessions.map(s => parseDurationToSeconds(s.duration)));
  const totalMinutesAll = totalSecondsAll / 60;
  const timePerMaster = mastered > 0 ? (totalMinutesAll / mastered) : 0;

  return { total, mastered, masteryRate, avgAcc, avgScore10, timePerMaster, totalSecondsAll };
}

function computeDailyAverages(practiceSessions, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);

  const byDay = new Map();
  for (const s of practiceSessions) {
    const ts = s.timestamp || s.date;
    const dk = toDayKey(ts);
    if (!dk) continue;
    const d = new Date(dk);
    if (d < cutoff) continue;

    const cur = byDay.get(dk) || { seconds: 0, sessions: 0, words: 0 };
    cur.seconds += parseDurationToSeconds(s.duration);
    cur.sessions += 1;
    cur.words += Number(s.wordsCount || s.total || s.totalWords || 0);
    byDay.set(dk, cur);
  }

  const keys = Array.from(byDay.keys());
  const totalSeconds = sum(keys.map(k => byDay.get(k).seconds));
  const totalSessions = sum(keys.map(k => byDay.get(k).sessions));
  const totalWords = sum(keys.map(k => byDay.get(k).words));

  return {
    wordsPerDay: totalWords / days,
    minutesPerDay: (totalSeconds / 60) / days,
    sessionsPerDay: totalSessions / days
  };
}

function computeTimeSeries(practiceSessions, range) {
  const now = new Date();
  const dayCount = range === 'day' ? 14 : range === 'week' ? 10 : 12;

  const getKey = (date) => {
    const d = new Date(date);
    if (range === 'day') return toDayKey(d);
    if (range === 'week') {
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
      return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const byKey = new Map();
  for (const s of practiceSessions) {
    const ts = s.timestamp || s.date;
    const k = getKey(ts);
    if (!k) continue;
    byKey.set(k, (byKey.get(k) || 0) + (parseDurationToSeconds(s.duration) / 60));
  }

  const labels = [];
  const minutes = [];

  if (range === 'day') {
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = getKey(d);
      labels.push(k.slice(5));
      minutes.push(byKey.get(k) || 0);
    }
  } else if (range === 'week') {
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const k = getKey(d);
      labels.push(k);
      minutes.push(byKey.get(k) || 0);
    }
  } else {
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = getKey(d);
      labels.push(k);
      minutes.push(byKey.get(k) || 0);
    }
  }

  return { labels, minutes };
}

function computeVocabDistribution(words) {
  // Việt hoá (Title Case)
  const buckets = {
    'Chưa Nhớ': 0,
    'Nhớ Yếu': 0,
    'Gợi Nhớ Chủ Động': 0,
    'Nhớ Vững': 0,
    'Ghi Nhớ Dài Hạn': 0
  };

  for (const w of words) {
    const review = Number(w.reviewCount || 0);
    const correct = Number(w.correctCount || 0);
    const acc = review > 0 ? (correct / review) : 0;
    const streak = Number(w.streak || 0);
    const mastered = !!w.mastered;

    if (review === 0) {
      buckets['Chưa Nhớ']++;
      continue;
    }
    if (acc < 0.4) {
      buckets['Nhớ Yếu']++;
      continue;
    }
    if (mastered || streak >= 3) {
      if (review >= 8 || acc >= 0.9) buckets['Ghi Nhớ Dài Hạn']++;
      else buckets['Nhớ Vững']++;
      continue;
    }
    if (acc >= 0.7) buckets['Gợi Nhớ Chủ Động']++;
    else buckets['Nhớ Yếu']++;
  }

  return buckets;
}

function computeWordStatusExclusive(words) {
  const out = {
    'Đang Học': 0,
    'Học Sau': 0,
    'Tự Động': 0,
    'Đã Học Xong': 0
  };

  for (const w of words) {
    const mastered = !!w?.mastered;
    const reviewCount = Number(w?.reviewCount || 0);
    const bookmarked = !!w?.bookmarked;
    const autoWord = isAutoWord(w);

    if (mastered) { out['Đã Học Xong']++; continue; }
    if (reviewCount > 0) { out['Đang Học']++; continue; }
    if (bookmarked) { out['Học Sau']++; continue; }
    if (autoWord) { out['Tự Động']++; continue; }
  }

  return out;
}

/* ===== Render DOM numbers ===== */
function renderNumbers(words, practiceSessions) {
  const stats = getStats?.() || { total: 0, mastered: 0, streak: 0 };

  const totalWords = Number(stats.total || words.length || 0);
  const mastered = Number(stats.mastered || 0);

  const overview = computeOverview(words, practiceSessions);

  setText('home-total-words', totalWords);
  setText('home-count-mastered', mastered);

  setText('home-mastery-rate', overview.masteryRate.toFixed(1));
  setText('home-avg-score', overview.avgScore10.toFixed(1));
  setText('home-time-per-master', overview.timePerMaster.toFixed(1));

  const needReview = words.filter(w => {
    const review = Number(w.reviewCount || 0);
    const correct = Number(w.correctCount || 0);
    const acc = review > 0 ? (correct / review) : 0;
    return review === 0 || acc < 0.7 || Number(w.streak || 0) === 0;
  }).length;
  setText('home-count-review', needReview);

  const status = computeWordStatusExclusive(words);
  setText('home-count-learning', status['Đang Học']);
  setText('home-count-later', status['Học Sau']);
  setText('home-count-auto', status['Tự Động']);
  setText('home-count-done', status['Đã Học Xong']);

  const totalSeconds = overview.totalSecondsAll;
  const sessionsCount = practiceSessions.length;
  const avgSessionMin = sessionsCount > 0 ? (totalSeconds / 60) / sessionsCount : 0;

  setText('home-total-time', formatMinutes(totalSeconds / 60));
  setText('home-sessions', sessionsCount);
  setText('home-avg-session', formatMinutes(avgSessionMin));

  const a7 = computeDailyAverages(practiceSessions, 7);
  const a30 = computeDailyAverages(practiceSessions, 30);

  setText('home-7d-words', a7.wordsPerDay.toFixed(1));
  setText('home-7d-minutes', a7.minutesPerDay.toFixed(0));
  setText('home-7d-sessions', a7.sessionsPerDay.toFixed(1));

  setText('home-30d-words', a30.wordsPerDay.toFixed(1));
  setText('home-30d-minutes', a30.minutesPerDay.toFixed(0));
  setText('home-30d-sessions', a30.sessionsPerDay.toFixed(1));

  setText('home-last-updated', `Cập Nhật: ${new Date().toLocaleString()}`);

  const recent = [...practiceSessions].slice(-20);
  const accs = recent.map(s => Number(s.accuracy || 0));
  const avgAcc = avg(accs);
  const score10 = avgAcc / 10;

  setText('home-accuracy', Math.round(avgAcc));
  setText('home-score-10', score10.toFixed(1));

  // Score label (VN)
  let label = 'Chưa Nhớ';
  if (avgAcc >= 85) label = 'Ghi Nhớ Dài Hạn';
  else if (avgAcc >= 75) label = 'Nhớ Vững';
  else if (avgAcc >= 60) label = 'Gợi Nhớ Chủ Động';
  else if (avgAcc >= 40) label = 'Nhớ Yếu';
  setText('home-score-label', label);

  const volumePct = clamp((sessionsCount / 20) * 100, 0, 100);
  const consistencyPct = clamp((Number(stats.streak || 0) / 30) * 100, 0, 100);
  const timeEffPct = clamp((avgSessionMin / 30) * 100, 0, 100);

  setText('home-metric-score', `${clamp(score10 * 10, 0, 100).toFixed(0)}%`);
  setText('home-metric-accuracy', `${clamp(avgAcc, 0, 100).toFixed(0)}%`);
  setText('home-metric-volume', `${volumePct.toFixed(0)}%`);
  setText('home-metric-consistency', `${consistencyPct.toFixed(0)}%`);
  setText('home-metric-time', `${timeEffPct.toFixed(0)}%`);
}

/* ===== Legends ===== */
function renderLegend(containerId, items) {
  const el = $(containerId);
  if (!el) return;

  el.innerHTML = items.map(it => {
    const pct = it.total > 0 ? ((it.value / it.total) * 100) : 0;
    const pctText = `${pct.toFixed(1)}%`;
    return `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-dot" style="background:${it.color}"></span>
          <span class="legend-name">${it.label}</span>
        </div>
        <div class="legend-value">${it.value} (${pctText})</div>
      </div>
    `;
  }).join('');
}

/* ===== Charts ===== */
function buildCharts(words, practiceSessions) {
  const Chart = window.Chart;
  if (!Chart) return;

  Chart.defaults.font.family = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
  Chart.defaults.color = '#6b7280';

  const recent = [...practiceSessions].slice(-20);
  const avgAcc = avg(recent.map(s => Number(s.accuracy || 0)));
  const score10 = avgAcc / 10;

  // 1) Score gauge
  const scoreCtx = $('chart-score-gauge')?.getContext?.('2d');
  if (scoreCtx) {
    const v = clamp(score10, 0, 10);
    charts.scoreGauge = new Chart(scoreCtx, {
      type: 'doughnut',
      data: {
        labels: ['Điểm', 'Còn Lại'],
        datasets: [{
          data: [v, 10 - v],
          backgroundColor: ['#f59e0b', 'rgba(0,0,0,0.08)'],
          borderWidth: 0,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: true,
        cutout: '78%',
        rotation: -180,
        circumference: 180,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  // 2) Accuracy donut
  const accCtx = $('chart-accuracy-donut')?.getContext?.('2d');
  if (accCtx) {
    const v = clamp(avgAcc, 0, 100);
    charts.accuracyDonut = new Chart(accCtx, {
      type: 'doughnut',
      data: {
        labels: ['Đúng', 'Sai'],
        datasets: [{
          data: [v, 100 - v],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        cutout: '72%',
        plugins: { legend: { display: false } }
      }
    });
  }

  // 3) Radar
  const stats = getStats?.() || { streak: 0 };
  const sessionsCount = practiceSessions.length;

  const volumePct = clamp((sessionsCount / 20) * 100, 0, 100);
  const consistencyPct = clamp((Number(stats.streak || 0) / 30) * 100, 0, 100);
  const timeSeriesForRadar = computeTimeSeries(practiceSessions, 'day');
  const avgMin = avg(timeSeriesForRadar.minutes);
  const timeEffPct = clamp((avgMin / 30) * 100, 0, 100);

  const radarCtx = $('chart-performance-radar')?.getContext?.('2d');
  if (radarCtx) {
    charts.performanceRadar = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Điểm Số', 'Độ Chính Xác', 'Khối Lượng', 'Độ Đều Đặn', 'Hiệu Suất'],
        datasets: [{
          label: 'Hiệu Suất',
          data: [
            clamp(score10 * 10, 0, 100),
            clamp(avgAcc, 0, 100),
            volumePct,
            consistencyPct,
            timeEffPct
          ],
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.18)',
          borderColor: 'rgba(99, 102, 241, 0.9)',
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: 100,
            grid: { color: 'rgba(0,0,0,0.08)' },
            angleLines: { color: 'rgba(0,0,0,0.08)' },
            pointLabels: { color: '#6b7280', font: { weight: 700 } },
            ticks: { display: false }
          }
        }
      }
    });
  }

  // 4) Study time line
  const lineCtx = $('chart-study-time-line')?.getContext?.('2d');
  if (lineCtx) {
    const ts = computeTimeSeries(practiceSessions, homeState.timeRange);
    charts.studyTimeLine = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: ts.labels,
        datasets: [{
          label: 'Phút Học',
          data: ts.minutes.map(v => Math.round(v)),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(0,0,0,0.06)' }, beginAtZero: true }
        }
      }
    });
  }

  // 5) Vocab distribution
  const dist = computeVocabDistribution(words);
  const distLabels = Object.keys(dist);
  const distValues = distLabels.map(k => dist[k]);
  const distColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];

  const pieCtx = $('chart-vocab-pie')?.getContext?.('2d');
  if (pieCtx) {
    charts.vocabPie = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: distLabels,
        datasets: [{
          data: distValues,
          backgroundColor: distColors,
          borderWidth: 0
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  renderLegend(
    'home-dist-legend',
    distLabels.map((label, idx) => ({
      label,
      value: distValues[idx],
      color: distColors[idx],
      total: sum(distValues)
    }))
  );

  // 6) Status donut
  const status = computeWordStatusExclusive(words);
  const stLabels = Object.keys(status);
  const stValues = stLabels.map(k => status[k]);
  const stColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

  const stCtx = $('chart-status-donut')?.getContext?.('2d');
  if (stCtx) {
    charts.statusDonut = new Chart(stCtx, {
      type: 'doughnut',
      data: {
        labels: stLabels,
        datasets: [{
          data: stValues,
          backgroundColor: stColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: { legend: { display: false } }
      }
    });
  }

  renderLegend(
    'home-status-legend',
    stLabels.map((label, idx) => ({
      label,
      value: stValues[idx],
      color: stColors[idx],
      total: sum(stValues)
    }))
  );
}

/* ===== Events ===== */
function bindHomeEvents() {
  const range = $('home-time-range');
  if (range && !range.dataset.bound) {
    range.dataset.bound = '1';
    range.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      const r = btn.dataset.range;
      if (!r) return;

      range.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      homeState.timeRange = r;
      renderHome();
    });
  }

  const refresh = $('home-refresh');
  if (refresh && !refresh.dataset.bound) {
    refresh.dataset.bound = '1';
    refresh.addEventListener('click', () => renderHome());
  }
}

/* ===== Main render ===== */
export async function renderHome() {
  const section = $('home-section');
  if (!section) return;

  bindHomeEvents();

  const words = getAllWords();
  const practiceSessions = getPracticeHistory();

  renderNumbers(words, practiceSessions);

  try {
    await ensureChartJs();
  } catch (e) {
    console.warn(e);
    return;
  }

  destroyCharts();
  buildCharts(words, practiceSessions);
}

/* ===== Init ===== */
export function initHome() {
  window.addEventListener('volearn:dataChanged', renderHome);
  window.addEventListener('volearn:dataSaved', renderHome);
  window.addEventListener('volearn:navigate', (e) => {
    if (e.detail.to === 'home') renderHome();
  });

  renderHome();
}

/* ===== Globals ===== */
window.renderHome = renderHome;
window.initHome = initHome;
