/**
 * VoLearn AI Practice Lab - Web Search Service
 * Version: 1.0.0
 * 
 * Tìm kiếm bài tập IELTS từ các nguồn uy tín
 */

import { WEB_SOURCES, SKILLS } from '../config/constants.js';

class WebSearchService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }
    
    /**
     * Search for IELTS exercises from web sources
     */
    async searchExercises(options = {}) {
        const {
            skill = 'reading',
            ieltsTarget = 6.0,
            topic = '',
            sources = ['ielts-official', 'cambridge', 'british-council'],
            limit = 5
        } = options;
        
        // Check cache
        const cacheKey = this.getCacheKey(options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('📦 Using cached search results');
            return cached;
        }
        
        // Build search queries for each source
        const searchPromises = sources.map(sourceId => 
            this.searchSource(sourceId, skill, ieltsTarget, topic)
        );
        
        try {
            const results = await Promise.allSettled(searchPromises);
            
            // Combine and filter results
            const allResults = results
                .filter(r => r.status === 'fulfilled' && r.value)
                .flatMap(r => r.value)
                .slice(0, limit);
            
            // Cache results
            this.setCache(cacheKey, allResults);
            
            return allResults;
        } catch (error) {
            console.error('Web search error:', error);
            return [];
        }
    }
    
    /**
     * Search a specific source
     */
    async searchSource(sourceId, skill, band, topic) {
        const source = WEB_SOURCES[sourceId];
        if (!source) return [];
        
        // Build search query
        const query = this.buildSearchQuery(source, skill, band, topic);
        
        try {
            // Use a search API or scraping service
            // For now, return mock data structure
            // In production, this would call your Worker API
            const results = await this.executeSearch(query, sourceId);
            
            return results.map(result => ({
                ...result,
                sourceId,
                sourceName: source.name,
                sourceUrl: source.url
            }));
        } catch (error) {
            console.error(`Error searching ${sourceId}:`, error);
            return [];
        }
    }
    
    /**
     * Build search query
     */
    buildSearchQuery(source, skill, band, topic) {
        const skillName = SKILLS[skill]?.name || skill;
        const bandRange = this.getBandRange(band);
        
        let query = `site:${source.url} IELTS ${skillName}`;
        
        if (bandRange) {
            query += ` band ${bandRange}`;
        }
        
        if (topic) {
            query += ` ${topic}`;
        }
        
        // Add specific keywords based on skill
        if (skill === 'reading') {
            query += ' passage practice test';
        } else if (skill === 'writing') {
            query += ' task sample answer';
        } else if (skill === 'speaking') {
            query += ' part cue card questions';
        }
        
        return query;
    }
    
    /**
     * Get band range string
     */
    getBandRange(band) {
        if (band <= 5.0) return '4-5';
        if (band <= 6.0) return '5-6';
        if (band <= 7.0) return '6-7';
        if (band <= 8.0) return '7-8';
        return '8-9';
    }
    
    /**
     * Execute search (calls Worker API)
     */
    async executeSearch(query, sourceId) {
        // In production, this calls your Cloudflare Worker
        // which handles the actual web search/scraping
        
        const workerUrl = localStorage.getItem('volearn_ai_worker_url');
        
        if (!workerUrl) {
            console.warn('Worker URL not configured, using mock data');
            return this.getMockResults(sourceId);
        }
        
        try {
            const response = await fetch(`${workerUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, sourceId })
            });
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Search API error:', error);
            return this.getMockResults(sourceId);
        }
    }
    
    /**
     * Get mock results for development/fallback
     */
    getMockResults(sourceId) {
        const mockData = {
            'ielts-official': [
                {
                    id: 'ielts-official-1',
                    title: 'IELTS Reading Practice Test - Academic',
                    url: 'https://ielts.org/practice-test/reading',
                    type: 'reading',
                    band: '6-7',
                    description: 'Official IELTS reading practice with answers',
                    hasAnswers: true
                }
            ],
            'cambridge': [
                {
                    id: 'cambridge-1',
                    title: 'Cambridge IELTS Reading - Test 1',
                    url: 'https://cambridgeenglish.org/ielts/reading',
                    type: 'reading',
                    band: '5-7',
                    description: 'Cambridge official practice materials',
                    hasAnswers: true
                }
            ],
            'british-council': [
                {
                    id: 'bc-1',
                    title: 'British Council - Reading Skills',
                    url: 'https://learnenglish.britishcouncil.org/skills/reading',
                    type: 'reading',
                    band: '5-6',
                    description: 'Free reading practice from British Council',
                    hasAnswers: true
                }
            ],
            'ielts-liz': [
                {
                    id: 'liz-1',
                    title: 'IELTS Liz - Reading Tips & Practice',
                    url: 'https://ieltsliz.com/ielts-reading/',
                    type: 'reading',
                    band: '6-8',
                    description: 'Expert tips and practice tests',
                    hasAnswers: true
                }
            ],
            'ielts-simon': [
                {
                    id: 'simon-1',
                    title: 'IELTS Simon - Band 9 Reading',
                    url: 'https://ielts-simon.com/reading/',
                    type: 'reading',
                    band: '7-9',
                    description: 'High-band reading strategies',
                    hasAnswers: true
                }
            ]
        };
        
        return mockData[sourceId] || [];
    }
    
    /**
     * Fetch exercise content from URL
     */
    async fetchExerciseContent(url, sourceId) {
        const workerUrl = localStorage.getItem('volearn_ai_worker_url');
        
        if (!workerUrl) {
            console.warn('Worker URL not configured');
            return null;
        }
        
        try {
            const response = await fetch(`${workerUrl}/fetch-exercise`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, sourceId })
            });
            
            if (!response.ok) {
                throw new Error(`Fetch failed: ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseExerciseContent(data, sourceId);
        } catch (error) {
            console.error('Fetch exercise error:', error);
            return null;
        }
    }
    
    /**
     * Parse exercise content from different sources
     */
    parseExerciseContent(data, sourceId) {
        // Source-specific parsing logic
        const parsers = {
            'ielts-official': this.parseIELTSOfficial,
            'cambridge': this.parseCambridge,
            'british-council': this.parseBritishCouncil,
            'ielts-liz': this.parseIELTSLiz,
            'ielts-simon': this.parseIELTSSimon
        };
        
        const parser = parsers[sourceId];
        if (parser) {
            return parser.call(this, data);
        }
        
        // Default parsing
        return {
            title: data.title || 'IELTS Practice',
            content: data.content || '',
            questions: data.questions || [],
            answers: data.answers || [],
            source: sourceId
        };
    }
    
    /**
     * Parse IELTS Official content
     */
    parseIELTSOfficial(data) {
        return {
            title: data.title,
            passage: data.passage || data.content,
            questions: this.extractQuestions(data),
            answers: data.answers,
            source: 'ielts-official',
            band: data.band || '6-7'
        };
    }
    
    /**
     * Parse Cambridge content
     */
    parseCambridge(data) {
        return {
            title: data.title,
            passage: data.passage || data.content,
            questions: this.extractQuestions(data),
            answers: data.answers,
            source: 'cambridge',
            band: data.band || '5-7'
        };
    }
    
    /**
     * Parse British Council content
     */
    parseBritishCouncil(data) {
        return {
            title: data.title,
            passage: data.passage || data.content,
            questions: this.extractQuestions(data),
            answers: data.answers,
            source: 'british-council',
            band: data.band || '5-6'
        };
    }
    
    /**
     * Parse IELTS Liz content
     */
    parseIELTSLiz(data) {
        return {
            title: data.title,
            passage: data.passage || data.content,
            questions: this.extractQuestions(data),
            answers: data.answers,
            tips: data.tips || [],
            source: 'ielts-liz',
            band: data.band || '6-8'
        };
    }
    
    /**
     * Parse IELTS Simon content
     */
    parseIELTSSimon(data) {
        return {
            title: data.title,
            passage: data.passage || data.content,
            questions: this.extractQuestions(data),
            answers: data.answers,
            modelAnswer: data.modelAnswer,
            source: 'ielts-simon',
            band: data.band || '7-9'
        };
    }
    
    /**
     * Extract questions from parsed data
     */
    extractQuestions(data) {
        if (data.questions && Array.isArray(data.questions)) {
            return data.questions;
        }
        
        // Try to extract from content
        const questions = [];
        const content = data.content || '';
        
        // Simple regex patterns for common question formats
        const patterns = [
            /(\d+)\.\s*(.+?\?)/g,  // Numbered questions
            /Questions?\s*(\d+)-(\d+)/gi,  // Question ranges
            /TRUE\s*\/\s*FALSE\s*\/\s*NOT GIVEN/gi  // T/F/NG
        ];
        
        // This is simplified - real implementation would be more sophisticated
        return questions;
    }
    
    /**
     * Adapt web exercise to VoLearn format
     */
    adaptToVoLearnFormat(webExercise, vocabulary = []) {
        const { title, passage, questions, answers, source, band } = webExercise;
        
        // Create VoLearn exercise format
        return {
            exercise_id: `web_${source}_${Date.now()}`,
            title: title,
            description: `Bài tập từ ${WEB_SOURCES[source]?.name || source}`,
            source: source,
            original_band: band,
            estimated_time: this.estimateTime(questions?.length || 10),
            sections: [
                {
                    section_id: 'section_1',
                    skill: 'reading',
                    bloom_level: 'understand',
                    instructions: 'Đọc đoạn văn và trả lời các câu hỏi.',
                    content: passage,
                    questions: this.formatQuestions(questions, answers)
                }
            ],
            vocabulary_focus: vocabulary.map(v => ({
                word: typeof v === 'string' ? v : v.word,
                definition: typeof v === 'object' ? v.meanings?.[0]?.defVi : '',
                appears_in: []
            }))
        };
    }
    
    /**
     * Format questions to VoLearn format
     */
    formatQuestions(questions, answers) {
        if (!questions || !Array.isArray(questions)) return [];
        
        return questions.map((q, index) => {
            const answer = answers?.[index];
            
            return {
                question_id: `q${index + 1}`,
                type: this.detectQuestionType(q),
                question: typeof q === 'string' ? q : q.text,
                options: q.options || null,
                correct_answer: answer,
                points: 1,
                target_words: [],
                explanation: ''
            };
        });
    }
    
    /**
     * Detect question type
     */
    detectQuestionType(question) {
        const text = typeof question === 'string' ? question : question.text || '';
        const textLower = text.toLowerCase();
        
        if (textLower.includes('true') && textLower.includes('false')) {
            return 'true_false';
        }
        if (question.options && question.options.length > 0) {
            return 'multiple_choice';
        }
        if (textLower.includes('___') || textLower.includes('fill')) {
            return 'fill_blank';
        }
        if (textLower.includes('match')) {
            return 'matching';
        }
        
        return 'short_answer';
    }
    
    /**
     * Estimate time based on question count
     */
    estimateTime(questionCount) {
        // Roughly 1.5 minutes per question
        return Math.ceil(questionCount * 1.5);
    }
    
    /**
     * Cache helpers
     */
    getCacheKey(options) {
        return JSON.stringify(options);
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get available sources
     */
    getAvailableSources() {
        return Object.entries(WEB_SOURCES).map(([id, source]) => ({
            id,
            ...source
        }));
    }
}

// Export singleton
export const webSearchService = new WebSearchService();
export default WebSearchService;
