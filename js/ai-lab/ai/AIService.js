/* ===== AI SERVICE MODULE ===== */

import { WorkerClient } from './WorkerClient.js';
import { PromptBuilder } from './PromptBuilder.js';

export class AIService {
    constructor() {
        this.workerClient = new WorkerClient();
        this.promptBuilder = new PromptBuilder();
    }
    
    async generateExercise(settings) {
        const prompt = this.promptBuilder.buildGeneratePrompt(settings);
        const vocabulary = this.getVocabularyForExercise(settings);
        
        const response = await this.workerClient.generate({
            provider: settings.aiModel,
            prompt: prompt,
            vocabulary: vocabulary,
            settings: settings
        });
        
        return this.parseExerciseResponse(response);
    }
    
    async gradeExercise(exercise, answers, settings) {
        const prompt = this.promptBuilder.buildGradePrompt(exercise, answers);
        
        const response = await this.workerClient.grade({
            provider: settings.aiModel,
            prompt: prompt,
            exercise: exercise,
            answers: answers
        });
        
        return this.parseGradeResponse(response, exercise, answers);
    }
    
    async searchWebExercises(settings) {
        const response = await this.workerClient.searchWeb({
            provider: settings.aiModel,
            topics: settings.webSearch.topics,
            sites: settings.webSearch.sites,
            skills: settings.skills,
            level: settings.ieltsLevel
        });
        
        return response;
    }
    
    getVocabularyForExercise(settings) {
        if (!settings.vocab.enabled) return [];
        
        const appData = window.appData || { vocabulary: [] };
        let vocab = [...(appData.vocabulary || [])];
        
        switch (settings.vocab.source) {
            case 'set':
                vocab = vocab.filter(w => w.setId === settings.vocab.setId);
                break;
            case 'unlearned':
                vocab = vocab.filter(w => (w.srsLevel || 0) <= 2);
                break;
            case 'bookmarked':
                vocab = vocab.filter(w => w.bookmarked);
                break;
            case 'recent':
                const daysAgo = new Date();
                daysAgo.setDate(daysAgo.getDate() - settings.vocab.recentDays);
                vocab = vocab.filter(w => new Date(w.createdAt) >= daysAgo);
                break;
        }
        
        // Shuffle and limit
        vocab = this.shuffleArray(vocab).slice(0, settings.vocab.amount);
        
        return vocab.map(w => ({
            word: w.word,
            meanings: w.meanings || [],
            phonetic: w.meanings?.[0]?.phoneticUS || ''
        }));
    }
    
    parseExerciseResponse(response) {
        // Parse AI response into exercise format
        try {
            if (typeof response === 'string') {
                // Try to extract JSON from response
                const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[1]);
                }
                return JSON.parse(response);
            }
            return response;
        } catch (e) {
            console.error('Failed to parse exercise response:', e);
            throw new Error('Invalid exercise response format');
        }
    }
    
    parseGradeResponse(response, exercise, answers) {
        // Parse grading response
        try {
            const parsed = typeof response === 'string' ? JSON.parse(response) : response;
            
            // Calculate scores
            let correct = 0;
            let total = exercise.questions.length;
            
            const questionResults = exercise.questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = this.checkAnswer(q, userAnswer, parsed.answers?.[q.id]);
                if (isCorrect) correct++;
                
                return {
                    questionId: q.id,
                    userAnswer: userAnswer,
                    correctAnswer: q.correctAnswer || parsed.answers?.[q.id],
                    isCorrect: isCorrect,
                    feedback: parsed.feedback?.[q.id] || ''
                };
            });
            
            return {
                score: Math.round((correct / total) * 100),
                correct: correct,
                total: total,
                questionResults: questionResults,
                skillAnalysis: this.analyzeBySkill(exercise.questions, questionResults),
                bloomAnalysis: this.analyzeByBloom(exercise.questions, questionResults),
                aiFeedback: parsed.overallFeedback || '',
                wordsToReview: parsed.wordsToReview || []
            };
        } catch (e) {
            console.error('Failed to parse grade response:', e);
            throw new Error('Invalid grade response format');
        }
    }
    
    checkAnswer(question, userAnswer, correctAnswer) {
        if (!userAnswer) return false;
        
        const correct = correctAnswer || question.correctAnswer;
        
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
            return userAnswer.toLowerCase() === correct.toLowerCase();
        }
        
        if (question.type === 'fill_blank') {
            const acceptedAnswers = question.acceptedAnswers || [correct];
            return acceptedAnswers.some(ans => 
                userAnswer.toLowerCase().trim() === ans.toLowerCase().trim()
            );
        }
        
        // For essay/short answer, rely on AI grading
        return null; // Will be graded by AI
    }
    
    analyzeBySkill(questions, results) {
        const analysis = {};
        
        questions.forEach((q, idx) => {
            const skill = q.skill;
            if (!analysis[skill]) {
                analysis[skill] = { correct: 0, total: 0 };
            }
            analysis[skill].total++;
            if (results[idx].isCorrect) {
                analysis[skill].correct++;
            }
        });
        
        return Object.entries(analysis).map(([skill, data]) => ({
            skill: skill,
            correct: data.correct,
            total: data.total,
            percent: Math.round((data.correct / data.total) * 100)
        }));
    }
    
    analyzeByBloom(questions, results) {
        const analysis = {};
        
        questions.forEach((q, idx) => {
            const level = q.bloomLevel;
            if (!analysis[level]) {
                analysis[level] = { correct: 0, total: 0 };
            }
            analysis[level].total++;
            if (results[idx].isCorrect) {
                analysis[level].correct++;
            }
        });
        
        return Object.entries(analysis).map(([level, data]) => ({
            level: parseInt(level),
            correct: data.correct,
            total: data.total,
            percent: Math.round((data.correct / data.total) * 100)
        }));
    }
    
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
