/* ===== SETTINGS PANEL MODULE ===== */

import { BLOOM_PRESETS, STORAGE_KEYS } from '../config/constants.js';

export class SettingsPanel {
    constructor() {
        this.settings = this.getDefaultSettings();
    }
    
    getDefaultSettings() {
        return {
            vocab: {
                enabled: true,
                source: 'all', // all | set | unlearned | bookmarked | recent
                setId: null,
                recentDays: 7,
                amount: 10
            },
            skills: {
                main: ['reading', 'writing'],
                sub: ['vocabulary']
            },
            standard: 'ielts', // ielts | free
            ieltsLevel: 6.0,
            strictMode: false,
            exerciseSource: 'ai-generate', // ai-generate | web-search | mixed
            webSearch: {
                sites: ['ielts-official', 'cambridge', 'british-council'],
                topics: []
            },
            bloom: {
                preset: 'balanced',
                randomType: null, // easy | medium | hard
                levels: { 1: 2, 2: 2, 3: 3, 4: 2, 5: 2, 6: 1 },
                total: 12
            },
            questionTypeRatio: 60, // 60% multiple choice, 40% essay
            timeLimit: 0, // 0 = no limit, otherwise minutes
            aiModel: 'claude'
        };
    }
    
    getSettings() {
        const settings = { ...this.settings };
        
        // Vocab settings
        settings.vocab.enabled = document.getElementById('vocab-toggle')?.checked ?? true;
        settings.vocab.source = document.querySelector('input[name="vocab-source"]:checked')?.value || 'all';
        settings.vocab.setId = document.getElementById('vocab-set-select')?.value || null;
        settings.vocab.recentDays = parseInt(document.getElementById('vocab-recent-days')?.value) || 7;
        settings.vocab.amount = parseInt(document.getElementById('vocab-amount')?.value) || 10;
        
        // Skills
        settings.skills.main = Array.from(document.querySelectorAll('input[name="skill-main"]:checked'))
            .map(el => el.value);
        settings.skills.sub = Array.from(document.querySelectorAll('input[name="skill-sub"]:checked'))
            .map(el => el.value);
        
        // Standard
        settings.standard = document.querySelector('input[name="standard"]:checked')?.value || 'ielts';
        settings.ieltsLevel = parseFloat(document.getElementById('ielts-level')?.value) || 6.0;
        settings.strictMode = document.getElementById('strict-mode')?.checked ?? false;
        
        // Exercise source
        settings.exerciseSource = document.querySelector('input[name="exercise-source"]:checked')?.value || 'ai-generate';
        settings.webSearch.sites = Array.from(document.querySelectorAll('input[name="source-site"]:checked'))
            .map(el => el.value);
        settings.webSearch.topics = Array.from(document.querySelectorAll('.topic-tag.active'))
            .map(el => el.dataset.topic);
        
        const customTopic = document.getElementById('custom-topic')?.value?.trim();
        if (customTopic) {
            settings.webSearch.topics.push(customTopic);
        }
        
        // Bloom
        const activePreset = document.querySelector('.bloom-preset.active');
        settings.bloom.preset = activePreset?.dataset.preset || 'balanced';
        
        if (settings.bloom.preset === 'random') {
            settings.bloom.randomType = document.querySelector('input[name="random-type"]:checked')?.value || 'medium';
        } else {
            settings.bloom.levels = {};
            settings.bloom.total = 0;
            
            document.querySelectorAll('.bloom-level').forEach(level => {
                const levelNum = level.dataset.level;
                const toggle = level.querySelector('.bloom-toggle input');
                const count = level.querySelector('.bloom-count');
                
                if (toggle?.checked) {
                    const value = parseInt(count?.value) || 0;
                    settings.bloom.levels[levelNum] = value;
                    settings.bloom.total += value;
                } else {
                    settings.bloom.levels[levelNum] = 0;
                }
            });
        }
        
        // Question type ratio
        settings.questionTypeRatio = parseInt(document.getElementById('question-type-ratio')?.value) || 60;
        
        // Time limit
        const timeLimitRadio = document.querySelector('input[name="time-limit"]:checked');
        if (timeLimitRadio?.value === 'custom') {
            settings.timeLimit = parseInt(document.getElementById('custom-time')?.value) || 0;
        } else {
            settings.timeLimit = parseInt(timeLimitRadio?.value) || 0;
        }
        
        // AI Model
        settings.aiModel = document.getElementById('ai-model')?.value || 'claude';
        
        this.settings = settings;
        return settings;
    }
    
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.applySettings(parsed);
            }
        } catch (e) {
            console.warn('Failed to load saved settings:', e);
        }
    }
    
    saveSettings() {
        const settings = this.getSettings();
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
    
    applySettings(settings) {
        // Apply to UI elements
        // TODO: Implement
    }
}
