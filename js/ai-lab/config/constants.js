/* ===== AI LAB CONSTANTS ===== */

// Bloom Taxonomy Levels
export const BLOOM_LEVELS = {
    1: { name: 'Nhớ', nameEn: 'Remember', icon: '💭', desc: 'Nhận diện, ghi nhớ' },
    2: { name: 'Hiểu', nameEn: 'Understand', icon: '💡', desc: 'Giải thích, diễn đạt' },
    3: { name: 'Vận dụng', nameEn: 'Apply', icon: '🔧', desc: 'Áp dụng vào thực tế' },
    4: { name: 'Phân tích', nameEn: 'Analyze', icon: '🔍', desc: 'So sánh, phân biệt' },
    5: { name: 'Đánh giá', nameEn: 'Evaluate', icon: '⚖️', desc: 'Nhận xét, đánh giá' },
    6: { name: 'Sáng tạo', nameEn: 'Create', icon: '🎨', desc: 'Tạo mới, sáng tác' }
};

// Skills
export const SKILLS = {
    main: {
        reading: { name: 'Reading', icon: '📖' },
        writing: { name: 'Writing', icon: '✍️' },
        listening: { name: 'Listening', icon: '🎧' },
        speaking: { name: 'Speaking', icon: '🗣️' }
    },
    sub: {
        vocabulary: { name: 'Vocabulary', icon: '🔤' },
        grammar: { name: 'Grammar', icon: '📝' },
        pronunciation: { name: 'Pronunciation', icon: '🔊' }
    }
};

// IELTS Bands
export const IELTS_BANDS = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

// Question Types
export const QUESTION_TYPES = {
    multiple_choice: { name: 'Trắc nghiệm', isObjective: true },
    fill_blank: { name: 'Điền từ', isObjective: true },
    matching: { name: 'Nối cột', isObjective: true },
    true_false: { name: 'Đúng/Sai', isObjective: true },
    short_answer: { name: 'Trả lời ngắn', isObjective: false },
    essay: { name: 'Viết đoạn văn', isObjective: false },
    sentence_completion: { name: 'Hoàn thành câu', isObjective: false }
};

// Bloom Presets
export const BLOOM_PRESETS = {
    basic: {
        name: 'Cơ bản',
        icon: '📘',
        levels: { 1: 4, 2: 4, 3: 2, 4: 0, 5: 0, 6: 0 }
    },
    balanced: {
        name: 'Cân bằng',
        icon: '📗',
        levels: { 1: 2, 2: 2, 3: 3, 4: 2, 5: 2, 6: 1 }
    },
    advanced: {
        name: 'Nâng cao',
        icon: '📕',
        levels: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 2 }
    },
    ielts: {
        name: 'IELTS',
        icon: '🎯',
        levels: { 1: 0, 2: 3, 3: 4, 4: 3, 5: 2, 6: 0 }
    }
};

// Random Mix Types
export const RANDOM_MIX = {
    easy: { name: 'Mix Dễ', levels: [1, 2, 3] },
    medium: { name: 'Mix Trung bình', levels: [1, 2, 3, 4, 5, 6] },
    hard: { name: 'Mix Khó', levels: [4, 5, 6] }
};

// Web Search Sources
export const WEB_SOURCES = {
    'ielts-official': {
        name: 'IELTS Official',
        url: 'https://www.ielts.org',
        priority: 1
    },
    'cambridge': {
        name: 'Cambridge English',
        url: 'https://www.cambridgeenglish.org',
        priority: 1
    },
    'british-council': {
        name: 'British Council',
        url: 'https://learnenglish.britishcouncil.org',
        priority: 1
    },
    'ielts-liz': {
        name: 'IELTS Liz',
        url: 'https://ieltsliz.com',
        priority: 2
    },
    'ielts-simon': {
        name: 'IELTS Simon',
        url: 'https://ielts-simon.com',
        priority: 2
    }
};

// Topics
export const TOPICS = [
    { id: 'environment', name: 'Environment', icon: '🌍' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'health', name: 'Health', icon: '🏥' },
    { id: 'society', name: 'Society', icon: '👥' },
    { id: 'economy', name: 'Economy', icon: '💰' },
    { id: 'culture', name: 'Culture', icon: '🎭' },
    { id: 'science', name: 'Science', icon: '🔬' }
];

// AI Models
export const AI_MODELS = {
    claude: {
        name: 'Claude Sonnet',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
    },
    gpt: {
        name: 'GPT-4o',
        provider: 'openai',
        model: 'gpt-4o'
    },
    gemini: {
        name: 'Gemini Pro',
        provider: 'google',
        model: 'gemini-pro'
    }
};

// Highlight Colors
export const HIGHLIGHT_COLORS = {
    yellow: '#fef08a',
    green: '#bbf7d0',
    blue: '#bfdbfe',
    purple: '#ddd6fe',
    red: '#fecaca'
};

// Storage Keys
export const STORAGE_KEYS = {
    HISTORY: 'volearn_ailab_history',
    STREAK: 'volearn_ailab_streak',
    SETTINGS: 'volearn_ailab_settings',
    PRESETS: 'volearn_ailab_presets',
    DAILY: 'volearn_ailab_daily'
};

// Daily Challenge Config
export const DAILY_CONFIG = {
    questionCount: 5,
    skills: ['reading', 'vocabulary'],
    bloomLevels: [1, 2, 3], // Easy-medium mix
    timeLimit: 0 // No time limit
};
