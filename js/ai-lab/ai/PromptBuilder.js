/**
 * VoLearn AI Practice Lab - Prompt Builder
 * Version: 1.0.0
 * 
 * Xây dựng prompt cho AI generation
 */

import { 
    SYSTEM_PROMPTS, 
    BLOOM_PROMPTS, 
    SKILL_PROMPTS, 
    EXERCISE_GENERATION_PROMPT,
    GRADING_PROMPT,
    DAILY_CHALLENGE_PROMPT 
} from '../config/prompts.js';
import { BLOOM_LEVELS, SKILLS, TOPICS } from '../config/constants.js';

class PromptBuilder {
    constructor() {
        this.templates = {
            exercise: EXERCISE_GENERATION_PROMPT,
            grading: GRADING_PROMPT,
            daily: DAILY_CHALLENGE_PROMPT
        };
    }
    
    /**
     * Build exercise generation prompt
     */
    buildExercisePrompt(settings, vocabulary) {
        const {
            skills = ['reading', 'vocabulary'],
            ieltsTarget = 6.0,
            bloomDistribution = {},
            mcRatio = 60,
            wordCount = 10,
            topics = []
        } = settings;
        
        // Format vocabulary list
        const vocabList = this.formatVocabularyList(vocabulary);
        
        // Format bloom distribution
        const bloomDist = this.formatBloomDistribution(bloomDistribution);
        
        // Format skills with instructions
        const skillInstructions = this.getSkillInstructions(skills);
        
        // Select topics
        const selectedTopics = topics.length > 0 
            ? topics 
            : this.selectRandomTopics(2);
        
        // Build main prompt
        let prompt = this.templates.exercise
            .replace('{vocabulary_list}', vocabList)
            .replace('{word_count}', wordCount.toString())
            .replace('{skills}', skills.join(', '))
            .replace('{ielts_band}', ieltsTarget.toString())
            .replace('{bloom_distribution}', bloomDist)
            .replace('{mc_ratio}', mcRatio.toString())
            .replace('{essay_ratio}', (100 - mcRatio).toString())
            .replace('{topics}', selectedTopics.join(', '));
        
        // Add skill-specific instructions
        prompt += '\n\n## HƯỚNG DẪN CHI TIẾT THEO KỸ NĂNG\n';
        prompt += skillInstructions;
        
        // Add bloom-specific examples
        prompt += '\n\n## VÍ DỤ CÂU HỎI THEO BLOOM\n';
        prompt += this.getBloomExamples(bloomDistribution);
        
        return {
            system: SYSTEM_PROMPTS.exercise_generator,
            user: prompt
        };
    }
    
    /**
     * Build grading prompt
     */
    buildGradingPrompt(exercise, studentAnswers) {
        const prompt = this.templates.grading
            .replace('{original_exercise}', JSON.stringify(exercise, null, 2))
            .replace('{student_answers}', JSON.stringify(studentAnswers, null, 2));
        
        return {
            system: SYSTEM_PROMPTS.grader,
            user: prompt
        };
    }
    
    /**
     * Build daily challenge prompt
     */
    buildDailyChallengePrompt(vocabulary, streak) {
        const vocabList = this.formatVocabularyList(vocabulary.slice(0, 8));
        const today = new Date().toLocaleDateString('vi-VN');
        
        const prompt = this.templates.daily
            .replace('{vocabulary_list}', vocabList)
            .replace('{date}', today)
            .replace('{streak}', streak.toString());
        
        return {
            system: SYSTEM_PROMPTS.exercise_generator,
            user: prompt
        };
    }
    
    /**
     * Build feedback prompt
     */
    buildFeedbackPrompt(results) {
        const prompt = `
Phân tích kết quả làm bài và đưa ra feedback:

## KẾT QUẢ
- Điểm số: ${results.total_score}/${results.max_score} (${results.percentage}%)
- IELTS Band ước tính: ${results.ielts_band_estimate || 'N/A'}
- Thời gian: ${Math.floor(results.time_taken / 60)} phút ${results.time_taken % 60} giây

## PHÂN TÍCH CHI TIẾT
${JSON.stringify(results.skill_analysis, null, 2)}

## YÊU CẦU
Đưa ra:
1. Nhận xét tổng quan (2-3 câu)
2. 2-3 điểm mạnh
3. 2-3 điểm cần cải thiện
4. 2-3 gợi ý học tập cụ thể

Trả lời bằng JSON:
{
    "overall_feedback": "...",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "improvement_suggestions": ["...", "..."]
}
`;
        
        return {
            system: SYSTEM_PROMPTS.feedback,
            user: prompt
        };
    }
    
    /**
     * Format vocabulary list for prompt
     */
    formatVocabularyList(vocabulary) {
        if (!vocabulary || vocabulary.length === 0) {
            return '(Không có từ vựng)';
        }
        
        return vocabulary.map((item, index) => {
            if (typeof item === 'string') {
                return `${index + 1}. ${item}`;
            }
            
            const word = item.word || '';
            const meaning = item.meanings?.[0]?.defVi || item.meanings?.[0]?.defEn || '';
            const pos = item.meanings?.[0]?.pos || '';
            const example = item.meanings?.[0]?.example || '';
            
            let formatted = `${index + 1}. **${word}**`;
            if (pos) formatted += ` (${pos})`;
            if (meaning) formatted += `: ${meaning}`;
            if (example) formatted += ` | Ví dụ: "${example}"`;
            
            return formatted;
        }).join('\n');
    }
    
    /**
     * Format bloom distribution for prompt
     */
    formatBloomDistribution(distribution) {
        if (!distribution || Object.keys(distribution).length === 0) {
            return 'Phân bổ đều các cấp độ';
        }
        
        const lines = [];
        Object.entries(distribution).forEach(([level, count]) => {
            if (count > 0) {
                const info = BLOOM_LEVELS[level];
                if (info) {
                    lines.push(`- ${info.name} (${info.nameEn}): ${count} câu`);
                }
            }
        });
        
        return lines.join('\n');
    }
    
    /**
     * Get skill-specific instructions
     */
    getSkillInstructions(skills) {
        return skills.map(skill => {
            const prompt = SKILL_PROMPTS[skill];
            if (!prompt) return '';
            
            return `### ${prompt.name}\n${prompt.instructions}\n`;
        }).filter(Boolean).join('\n');
    }
    
    /**
     * Get bloom examples
     */
    getBloomExamples(distribution) {
        const examples = [];
        
        Object.entries(distribution).forEach(([level, count]) => {
            if (count > 0) {
                const bloomPrompt = BLOOM_PROMPTS[level];
                if (bloomPrompt) {
                    const exampleQuestions = bloomPrompt.question_types.slice(0, 2).join('\n  - ');
                    examples.push(`### ${bloomPrompt.name}\n${bloomPrompt.instructions}\nVí dụ:\n  - ${exampleQuestions}`);
                }
            }
        });
        
        return examples.join('\n\n');
    }
    
    /**
     * Select random topics
     */
    selectRandomTopics(count = 2) {
        const shuffled = [...TOPICS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(t => t.nameEn);
    }
    
    /**
     * Build reading passage prompt
     */
    buildReadingPassagePrompt(settings, vocabulary) {
        const { ieltsTarget = 6.0, topics = [] } = settings;
        const topic = topics[0] || this.selectRandomTopics(1)[0];
        const words = vocabulary.map(v => typeof v === 'string' ? v : v.word).join(', ');
        
        // Determine length based on band
        let length = 200;
        if (ieltsTarget >= 7.0) length = 300;
        if (ieltsTarget >= 8.0) length = 400;
        
        return SKILL_PROMPTS.reading.templates.passage
            .replace('{length}', length.toString())
            .replace('{topic}', topic)
            .replace('{band}', ieltsTarget.toString())
            .replace('{words}', words);
    }
    
    /**
     * Build writing task prompt
     */
    buildWritingTaskPrompt(settings, vocabulary, taskType = 'task2') {
        const { ieltsTarget = 6.0 } = settings;
        const words = vocabulary.map(v => typeof v === 'string' ? v : v.word).join(', ');
        
        if (taskType === 'task1') {
            const chartTypes = ['bar chart', 'line graph', 'pie chart', 'table', 'process diagram'];
            const chartType = chartTypes[Math.floor(Math.random() * chartTypes.length)];
            
            return SKILL_PROMPTS.writing.templates.task1
                .replace('{chart_type}', chartType)
                .replace('{words}', words)
                .replace('{band}', ieltsTarget.toString());
        } else {
            const essayTypes = ['opinion', 'discussion', 'problem-solution', 'advantages-disadvantages'];
            const essayType = essayTypes[Math.floor(Math.random() * essayTypes.length)];
            
            return SKILL_PROMPTS.writing.templates.task2
                .replace('{essay_type}', essayType)
                .replace('{words}', words)
                .replace('{band}', ieltsTarget.toString());
        }
    }
    
    /**
     * Build speaking cue card prompt
     */
    buildSpeakingPrompt(settings, vocabulary, part = 'part2') {
        const { ieltsTarget = 6.0, topics = [] } = settings;
        const topic = topics[0] || this.selectRandomTopics(1)[0];
        const words = vocabulary.map(v => typeof v === 'string' ? v : v.word).join(', ');
        
        if (part === 'part1') {
            return SKILL_PROMPTS.speaking.templates.part1
                .replace('{topic}', topic)
                .replace('{words}', words);
        } else if (part === 'part2') {
            return SKILL_PROMPTS.speaking.templates.cue_card
                .replace('{words}', words);
        } else {
            return SKILL_PROMPTS.speaking.templates.part3
                .replace('{topic}', topic)
                .replace('{words}', words);
        }
    }
    
    /**
     * Build vocabulary exercise prompt
     */
    buildVocabularyPrompt(settings, vocabulary, exerciseType = 'word_formation') {
        const words = vocabulary.map(v => typeof v === 'string' ? v : v.word).join(', ');
        
        const template = SKILL_PROMPTS.vocabulary.templates[exerciseType];
        if (!template) return '';
        
        return template.replace('{words}', words);
    }
    
    /**
     * Build grammar exercise prompt
     */
    buildGrammarPrompt(settings, vocabulary, exerciseType = 'error_correction') {
        const words = vocabulary.map(v => typeof v === 'string' ? v : v.word).join(', ');
        const grammarPoints = ['tenses', 'articles', 'prepositions', 'subject-verb agreement'];
        
        const template = SKILL_PROMPTS.grammar.templates[exerciseType];
        if (!template) return '';
        
        return template
            .replace('{words}', words)
            .replace('{grammar_points}', grammarPoints.slice(0, 2).join(', '))
            .replace('{grammar_focus}', grammarPoints[0]);
    }
    
    /**
     * Validate and clean AI response
     */
    parseAIResponse(response) {
        try {
            // Try to extract JSON from response
            let jsonStr = response;
            
            // Check if wrapped in markdown code block
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }
            
            // Parse JSON
            const parsed = JSON.parse(jsonStr);
            
            // Validate required fields
            if (parsed.sections || parsed.questions || parsed.exercise_id) {
                return { success: true, data: parsed };
            }
            
            return { success: false, error: 'Missing required fields', data: parsed };
        } catch (e) {
            return { success: false, error: e.message, raw: response };
        }
    }
    
    /**
     * Get model-specific adjustments
     */
    getModelAdjustments(model) {
        const adjustments = {
            claude: {
                maxTokens: 4096,
                temperature: 0.7,
                systemPrefix: ''
            },
            gpt: {
                maxTokens: 4096,
                temperature: 0.7,
                systemPrefix: 'You are a helpful assistant. '
            },
            gemini: {
                maxTokens: 4096,
                temperature: 0.7,
                systemPrefix: ''
            }
        };
        
        return adjustments[model] || adjustments.claude;
    }
}

// Export singleton
export const promptBuilder = new PromptBuilder();
export default PromptBuilder;
