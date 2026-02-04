/**
 * VoLearn AI Practice Lab - AI Service
 * Version: 1.1.0
 * 
 * Service chính để gọi AI APIs
 */

import { AI_MODELS, STORAGE_KEYS } from '../config/constants.js';
import { promptBuilder } from './PromptBuilder.js';
import { webSearchService } from './WebSearchService.js';

class AIService {
    constructor() {
        this.currentModel = 'claude';
        this.apiKeys = {};
        this.workerUrl = null;
        this.isInitialized = false;
    }
    
    /**
     * Initialize service
     */
    init() {
        this.loadApiKeys();
        this.loadWorkerUrl();
        this.isInitialized = true;
        console.log('✅ AIService initialized, model:', this.currentModel);
        return this;
    }
    
    /**
     * Load API keys from secure storage
     */
    loadApiKeys() {
        try {
            const encrypted = localStorage.getItem(STORAGE_KEYS.apiKeys);
            if (encrypted) {
                // In production, use proper encryption
                this.apiKeys = JSON.parse(atob(encrypted));
            }
        } catch (e) {
            console.error('Error loading API keys:', e);
        }
    }
    
    /**
     * Save API keys to secure storage
     */
    saveApiKeys(keys) {
        try {
            this.apiKeys = { ...this.apiKeys, ...keys };
            // In production, use proper encryption
            const encrypted = btoa(JSON.stringify(this.apiKeys));
            localStorage.setItem(STORAGE_KEYS.apiKeys, encrypted);
        } catch (e) {
            console.error('Error saving API keys:', e);
        }
    }
    
    /**
     * Load worker URL
     */
    loadWorkerUrl() {
        this.workerUrl = localStorage.getItem('volearn_ai_worker_url') || null;
    }
    
    /**
     * Set worker URL
     */
    setWorkerUrl(url) {
        this.workerUrl = url;
        localStorage.setItem('volearn_ai_worker_url', url);
    }
    
    /**
     * Set current model
     */
    setModel(model) {
        if (AI_MODELS[model]) {
            this.currentModel = model;
        }
    }
    
    /**
     * Check if API is configured
     */
    isConfigured() {
        return !!(this.apiKeys[this.currentModel] || this.workerUrl);
    }
    
    /**
     * Generate exercise
     */
    async generateExercise(settings, vocabulary) {
        const { exerciseSource = 'ai-generate' } = settings;
        
        // If web search, fetch from web first
        if (exerciseSource === 'web-search') {
            return this.generateFromWebSearch(settings, vocabulary);
        }
        
        // If mixed, combine both
        if (exerciseSource === 'mixed') {
            return this.generateMixed(settings, vocabulary);
        }
        
        // Default: AI generate
        return this.generateWithAI(settings, vocabulary);
    }
    
    /**
     * Generate exercise with AI
     */
    async generateWithAI(settings, vocabulary) {
        const prompt = promptBuilder.buildExercisePrompt(settings, vocabulary);
        
        try {
            const response = await this.callAI(prompt.system, prompt.user);
            const parsed = promptBuilder.parseAIResponse(response);
            
            if (parsed.success) {
                return { success: true, exercise: parsed.data };
            }
            
            return { success: false, error: parsed.error, raw: parsed.raw };
        } catch (error) {
            console.error('AI generation error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate from web search
     */
    async generateFromWebSearch(settings, vocabulary) {
        const { skills = ['reading'], webSources = ['ielts-official', 'cambridge'] } = settings;
        
        try {
            // Search for exercises
            const searchResults = await webSearchService.searchExercises({
                skill: skills[0],
                ieltsTarget: settings.ieltsTarget,
                sources: webSources,
                limit: 3
            });
            
            if (searchResults.length === 0) {
                // Fallback to AI
                console.log('No web results, falling back to AI');
                return this.generateWithAI(settings, vocabulary);
            }
            
            // Fetch content from first result
            const content = await webSearchService.fetchExerciseContent(
                searchResults[0].url,
                searchResults[0].sourceId
            );
            
            if (content) {
                const exercise = webSearchService.adaptToVoLearnFormat(content, vocabulary);
                return { success: true, exercise, source: 'web' };
            }
            
            // Fallback to AI
            return this.generateWithAI(settings, vocabulary);
        } catch (error) {
            console.error('Web search error:', error);
            return this.generateWithAI(settings, vocabulary);
        }
    }
    
    /**
     * Generate mixed (AI + Web)
     */
    async generateMixed(settings, vocabulary) {
        // For mixed mode, use AI but inform it about web sources
        const enhancedSettings = {
            ...settings,
            exerciseSource: 'ai-generate',
            useWebInspiration: true
        };
        
        return this.generateWithAI(enhancedSettings, vocabulary);
    }
    
    /**
     * Grade exercise
     */
    async gradeExercise(exercise, studentAnswers) {
        const prompt = promptBuilder.buildGradingPrompt(exercise, studentAnswers);
        
        try {
            const response = await this.callAI(prompt.system, prompt.user);
            const parsed = promptBuilder.parseAIResponse(response);
            
            if (parsed.success) {
                return { success: true, results: parsed.data };
            }
            
            // Fallback to local grading
            return this.gradeLocally(exercise, studentAnswers);
        } catch (error) {
            console.error('AI grading error:', error);
            return this.gradeLocally(exercise, studentAnswers);
        }
    }
    
    /**
     * Local grading fallback
     */
    gradeLocally(exercise, studentAnswers) {
        const questions = exercise.sections?.flatMap(s => s.questions) || [];
        let totalScore = 0;
        let maxScore = 0;
        
        const questionResults = questions.map(q => {
            const studentAnswer = studentAnswers[q.question_id];
            const correctAnswer = q.correct_answer;
            const acceptedAnswers = q.accepted_answers || [correctAnswer];
            const points = q.points || 1;
            
            maxScore += points;
            
            // Check answer
            let isCorrect = false;
            let score = 0;
            
            if (studentAnswer) {
                const normalizedStudent = this.normalizeAnswer(studentAnswer);
                isCorrect = acceptedAnswers.some(ans => 
                    this.normalizeAnswer(ans) === normalizedStudent
                );
                
                if (isCorrect) {
                    score = points;
                    totalScore += points;
                }
            }
            
            return {
                question_id: q.question_id,
                student_answer: studentAnswer,
                correct_answer: correctAnswer,
                is_correct: isCorrect,
                score: score,
                max_score: points,
                feedback: isCorrect ? 'Đúng!' : `Đáp án đúng: ${correctAnswer}`
            };
        });
        
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        
        return {
            success: true,
            results: {
                total_score: totalScore,
                max_score: maxScore,
                percentage: Math.round(percentage * 10) / 10,
                ielts_band_estimate: this.estimateIELTSBand(percentage),
                questions: questionResults,
                skill_analysis: this.analyzeBySkill(exercise, questionResults),
                bloom_analysis: this.analyzeByBloom(exercise, questionResults),
                vocabulary_analysis: this.analyzeVocabulary(exercise, questionResults),
                overall_feedback: this.generateLocalFeedback(percentage),
                improvement_suggestions: this.generateSuggestions(percentage),
                strengths: [],
                weaknesses: []
            }
        };
    }
    
    /**
     * Normalize answer for comparison
     */
    normalizeAnswer(answer) {
        if (!answer) return '';
        return String(answer).toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    }
    
    /**
     * Estimate IELTS band from percentage
     */
    estimateIELTSBand(percentage) {
        if (percentage >= 90) return 8.5;
        if (percentage >= 80) return 8.0;
        if (percentage >= 70) return 7.0;
        if (percentage >= 60) return 6.5;
        if (percentage >= 50) return 6.0;
        if (percentage >= 40) return 5.5;
        if (percentage >= 30) return 5.0;
        return 4.5;
    }
    
    /**
     * Analyze by skill
     */
    analyzeBySkill(exercise, questionResults) {
        const analysis = {};
        
        exercise.sections?.forEach(section => {
            const skill = section.skill;
            if (!analysis[skill]) {
                analysis[skill] = { score: 0, max: 0, feedback: '' };
            }
            
            section.questions?.forEach(q => {
                const result = questionResults.find(r => r.question_id === q.question_id);
                if (result) {
                    analysis[skill].score += result.score;
                    analysis[skill].max += result.max_score;
                }
            });
        });
        
        // Add feedback
        Object.keys(analysis).forEach(skill => {
            const data = analysis[skill];
            const pct = data.max > 0 ? (data.score / data.max) * 100 : 0;
            
            if (pct >= 80) {
                data.feedback = 'Xuất sắc!';
            } else if (pct >= 60) {
                data.feedback = 'Khá tốt, cần cải thiện thêm.';
            } else {
                data.feedback = 'Cần luyện tập thêm kỹ năng này.';
            }
        });
        
        return analysis;
    }
    
    /**
     * Analyze by Bloom level
     */
    analyzeByBloom(exercise, questionResults) {
        const analysis = {};
        
        exercise.sections?.forEach(section => {
            const bloom = section.bloom_level;
            if (!analysis[bloom]) {
                analysis[bloom] = { correct: 0, total: 0 };
            }
            
            section.questions?.forEach(q => {
                const result = questionResults.find(r => r.question_id === q.question_id);
                if (result) {
                    analysis[bloom].total++;
                    if (result.is_correct) {
                        analysis[bloom].correct++;
                    }
                }
            });
        });
        
        return analysis;
    }
    
    /**
     * Analyze vocabulary performance
     */
    analyzeVocabulary(exercise, questionResults) {
        const vocabMap = new Map();
        
        // Collect vocab from questions
        exercise.sections?.forEach(section => {
            section.questions?.forEach(q => {
                const result = questionResults.find(r => r.question_id === q.question_id);
                
                q.target_words?.forEach(word => {
                    if (!vocabMap.has(word)) {
                        vocabMap.set(word, { word, correct: 0, total: 0 });
                    }
                    
                    const data = vocabMap.get(word);
                    data.total++;
                    if (result?.is_correct) {
                        data.correct++;
                    }
                });
            });
        });
        
        // Determine mastery
        return Array.from(vocabMap.values()).map(v => ({
            word: v.word,
            questions_correct: v.correct,
            questions_total: v.total,
            mastery: v.correct === v.total ? 'mastered' 
                   : v.correct > 0 ? 'learning' 
                   : 'needs_review'
        }));
    }
    
    /**
     * Generate local feedback
     */
    generateLocalFeedback(percentage) {
        if (percentage >= 90) return 'Xuất sắc! Bạn đã nắm vững kiến thức.';
        if (percentage >= 75) return 'Rất tốt! Tiếp tục phát huy nhé.';
        if (percentage >= 60) return 'Khá tốt! Cần ôn tập thêm một số điểm.';
        if (percentage >= 40) return 'Cần cố gắng hơn. Hãy ôn lại các từ vựng.';
        return 'Đừng nản! Hãy học lại và thử lại nhé.';
    }
    
    /**
     * Generate suggestions
     */
    generateSuggestions(percentage) {
        const suggestions = [];
        
        if (percentage < 60) {
            suggestions.push('Ôn lại định nghĩa các từ vựng');
            suggestions.push('Luyện tập với flashcard hàng ngày');
        }
        
        if (percentage < 80) {
            suggestions.push('Đọc thêm bài báo tiếng Anh');
            suggestions.push('Viết câu sử dụng từ mới');
        }
        
        suggestions.push('Tiếp tục luyện tập mỗi ngày');
        
        return suggestions.slice(0, 3);
    }
    
    /**
     * Generate daily challenge
     */
    async generateDailyChallenge(vocabulary, streak) {
        const prompt = promptBuilder.buildDailyChallengePrompt(vocabulary, streak);
        
        try {
            const response = await this.callAI(prompt.system, prompt.user);
            const parsed = promptBuilder.parseAIResponse(response);
            
            if (parsed.success) {
                return { success: true, challenge: parsed.data };
            }
            
            return { success: false, error: parsed.error };
        } catch (error) {
            console.error('Daily challenge generation error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get AI feedback
     */
    async getAIFeedback(results) {
        const prompt = promptBuilder.buildFeedbackPrompt(results);
        
        try {
            const response = await this.callAI(prompt.system, prompt.user);
            const parsed = promptBuilder.parseAIResponse(response);
            
            if (parsed.success) {
                return parsed.data;
            }
            
            return null;
        } catch (error) {
            console.error('AI feedback error:', error);
            return null;
        }
    }
    
    /**
     * Call AI API
     */
    async callAI(systemPrompt, userPrompt) {
        // If worker URL is configured, use it
        if (this.workerUrl) {
            return this.callWorker(systemPrompt, userPrompt);
        }
        
        // Otherwise, call directly (not recommended for production)
        const model = this.currentModel;
        const apiKey = this.apiKeys[model];
        
        if (!apiKey) {
            throw new Error(`API key not configured for ${model}`);
        }
        
        switch (model) {
            case 'claude':
                return this.callClaude(systemPrompt, userPrompt, apiKey);
            case 'gpt':
                return this.callOpenAI(systemPrompt, userPrompt, apiKey);
            case 'gemini':
                return this.callGemini(systemPrompt, userPrompt, apiKey);
            default:
                throw new Error(`Unknown model: ${model}`);
        }
    }
    
    /**
     * Call via Worker (recommended)
     */
    async callWorker(systemPrompt, userPrompt) {
        const response = await fetch(`${this.workerUrl}/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.currentModel,
                system: systemPrompt,
                user: userPrompt
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Worker API error');
        }
        
        const data = await response.json();
        return data.content;
    }
    
    /**
     * Call Claude API directly
     */
    async callClaude(systemPrompt, userPrompt, apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API error');
        }
        
        const data = await response.json();
        return data.content[0].text;
    }
    
    /**
     * Call OpenAI API directly
     */
    async callOpenAI(systemPrompt, userPrompt, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                max_tokens: 4096,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    /**
     * Call Gemini API directly
     */
    async callGemini(systemPrompt, userPrompt, apiKey) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: `${systemPrompt}\n\n${userPrompt}` }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.7
                    }
                })
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API error');
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}

// Export singleton
export const aiService = new AIService();
export default AIService;
