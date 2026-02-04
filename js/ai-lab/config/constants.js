/**
 * VoLearn AI Practice Lab - Constants
 * Version: 1.1.0
 * 
 * Bỏ Listening & Pronunciation
 */

// Bloom's Taxonomy Levels
export const BLOOM_LEVELS = {
    remember: {
        id: 'remember',
        name: 'Nhớ',
        nameEn: 'Remember',
        description: 'Ghi nhớ, nhắc lại thông tin',
        color: '#4ade80',
        icon: 'brain',
        order: 1
    },
    understand: {
        id: 'understand',
        name: 'Hiểu',
        nameEn: 'Understand',
        description: 'Diễn giải, giải thích, tóm tắt',
        color: '#60a5fa',
        icon: 'lightbulb',
        order: 2
    },
    apply: {
        id: 'apply',
        name: 'Vận dụng',
        nameEn: 'Apply',
        description: 'Áp dụng kiến thức vào tình huống mới',
        color: '#f59e0b',
        icon: 'tools',
        order: 3
    },
    analyze: {
        id: 'analyze',
        name: 'Phân tích',
        nameEn: 'Analyze',
        description: 'Chia nhỏ, tìm mối quan hệ, so sánh',
        color: '#a855f7',
        icon: 'search',
        order: 4
    },
    evaluate: {
        id: 'evaluate',
        name: 'Đánh giá',
        nameEn: 'Evaluate',
        description: 'Đưa ra nhận xét, phán đoán',
        color: '#ec4899',
        icon: 'check-double',
        order: 5
    },
    create: {
        id: 'create',
        name: 'Sáng tạo',
        nameEn: 'Create',
        description: 'Tạo ra cái mới, thiết kế, đề xuất',
        color: '#ef4444',
        icon: 'magic',
        order: 6
    }
};

// Skills (BỎ Listening & Pronunciation)
export const SKILLS = {
    reading: {
        id: 'reading',
        name: 'Reading',
        nameVi: 'Đọc hiểu',
        icon: 'book-open',
        color: '#3b82f6',
        description: 'Đọc hiểu đoạn văn, bài báo',
        isMain: true
    },
    writing: {
        id: 'writing',
        name: 'Writing',
        nameVi: 'Viết',
        icon: 'pen',
        color: '#10b981',
        description: 'Viết câu, đoạn văn, essay',
        isMain: true
    },
    speaking: {
        id: 'speaking',
        name: 'Speaking',
        nameVi: 'Nói',
        icon: 'comments',
        color: '#f59e0b',
        description: 'Luyện nói, thảo luận (dạng text)',
        isMain: true
    },
    vocabulary: {
        id: 'vocabulary',
        name: 'Vocabulary',
        nameVi: 'Từ vựng',
        icon: 'spell-check',
        color: '#8b5cf6',
        description: 'Từ vựng, word formation, collocations',
        isMain: false
    },
    grammar: {
        id: 'grammar',
        name: 'Grammar',
        nameVi: 'Ngữ pháp',
        icon: 'list-check',
        color: '#ec4899',
        description: 'Ngữ pháp, cấu trúc câu',
        isMain: false
    }
};

// Main skills (cho UI)
export const MAIN_SKILLS = ['reading', 'writing', 'speaking'];
export const SUB_SKILLS = ['vocabulary', 'grammar'];

// IELTS Bands
export const IELTS_BANDS = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

// Question Types
export const QUESTION_TYPES = {
    multiple_choice: {
        id: 'multiple_choice',
        name: 'Trắc nghiệm',
        nameEn: 'Multiple Choice',
        icon: 'list-ul',
        isObjective: true
    },
    fill_blank: {
        id: 'fill_blank',
        name: 'Điền từ',
        nameEn: 'Fill in the Blank',
        icon: 'i-cursor',
        isObjective: true
    },
    true_false: {
        id: 'true_false',
        name: 'Đúng/Sai',
        nameEn: 'True/False/Not Given',
        icon: 'check-circle',
        isObjective: true
    },
    matching: {
        id: 'matching',
        name: 'Nối cặp',
        nameEn: 'Matching',
        icon: 'arrows-alt-h',
        isObjective: true
    },
    short_answer: {
        id: 'short_answer',
        name: 'Trả lời ngắn',
        nameEn: 'Short Answer',
        icon: 'comment-dots',
        isObjective: false
    },
    essay: {
        id: 'essay',
        name: 'Tự luận',
        nameEn: 'Essay',
        icon: 'file-alt',
        isObjective: false
    },
    sentence_completion: {
        id: 'sentence_completion',
        name: 'Hoàn thành câu',
        nameEn: 'Sentence Completion',
        icon: 'text-width',
        isObjective: false
    },
    error_correction: {
        id: 'error_correction',
        name: 'Sửa lỗi',
        nameEn: 'Error Correction',
        icon: 'eraser',
        isObjective: true
    },
    word_formation: {
        id: 'word_formation',
        name: 'Word Formation',
        nameEn: 'Word Formation',
        icon: 'font',
        isObjective: true
    }
};

// Web Sources for IELTS materials
export const WEB_SOURCES = {
    'ielts-official': {
        id: 'ielts-official',
        name: 'IELTS Official',
        url: 'ielts.org',
        icon: 'certificate'
    },
    'cambridge': {
        id: 'cambridge',
        name: 'Cambridge',
        url: 'cambridgeenglish.org',
        icon: 'university'
    },
    'british-council': {
        id: 'british-council',
        name: 'British Council',
        url: 'britishcouncil.org',
        icon: 'globe-europe'
    },
    'ielts-liz': {
        id: 'ielts-liz',
        name: 'IELTS Liz',
        url: 'ieltsliz.com',
        icon: 'chalkboard-teacher'
    },
    'ielts-simon': {
        id: 'ielts-simon',
        name: 'IELTS Simon',
        url: 'ielts-simon.com',
        icon: 'user-graduate'
    }
};

// Topics for exercises
export const TOPICS = [
    { id: 'environment', name: 'Môi trường', nameEn: 'Environment' },
    { id: 'technology', name: 'Công nghệ', nameEn: 'Technology' },
    { id: 'education', name: 'Giáo dục', nameEn: 'Education' },
    { id: 'health', name: 'Sức khỏe', nameEn: 'Health' },
    { id: 'society', name: 'Xã hội', nameEn: 'Society' },
    { id: 'economy', name: 'Kinh tế', nameEn: 'Economy' },
    { id: 'culture', name: 'Văn hóa', nameEn: 'Culture' },
    { id: 'science', name: 'Khoa học', nameEn: 'Science' },
    { id: 'travel', name: 'Du lịch', nameEn: 'Travel' },
    { id: 'work', name: 'Công việc', nameEn: 'Work' },
    { id: 'media', name: 'Truyền thông', nameEn: 'Media' },
    { id: 'sports', name: 'Thể thao', nameEn: 'Sports' }
];

// AI Models
export const AI_MODELS = {
    claude: {
        id: 'claude',
        name: 'Claude (Anthropic)',
        icon: 'robot',
        description: 'Mạnh về phân tích và viết'
    },
    gpt: {
        id: 'gpt',
        name: 'GPT (OpenAI)',
        icon: 'brain',
        description: 'Đa năng, sáng tạo'
    },
    gemini: {
        id: 'gemini',
        name: 'Gemini (Google)',
        icon: 'google',
        description: 'Nhanh, hiệu quả'
    }
};

// Highlight colors for notes
export const HIGHLIGHT_COLORS = [
    { id: 'yellow', name: 'Vàng', color: '#fef08a' },
    { id: 'green', name: 'Xanh lá', color: '#bbf7d0' },
    { id: 'blue', name: 'Xanh dương', color: '#bfdbfe' },
    { id: 'pink', name: 'Hồng', color: '#fbcfe8' },
    { id: 'orange', name: 'Cam', color: '#fed7aa' }
];

// Storage Keys
export const STORAGE_KEYS = {
    settings: 'volearn_ailab_settings',
    history: 'volearn_ailab_history',
    daily: 'volearn_ailab_daily',
    streak: 'volearn_ailab_streak',
    stats: 'volearn_ailab_stats',
    apiKeys: 'volearn_ailab_apikeys' // Encrypted
};

// Daily Challenge Config
export const DAILY_CONFIG = {
    minQuestions: 5,
    maxQuestions: 7,
    defaultWordCount: 6,
    resetHour: 0, // Midnight
    streakBonusThreshold: 7 // Bonus after 7 days
};

// Score thresholds
export const SCORE_THRESHOLDS = {
    excellent: 90,
    good: 75,
    average: 60,
    needsWork: 40
};

// Animation durations (ms)
export const ANIMATION = {
    fast: 150,
    normal: 300,
    slow: 500
};

export default {
    BLOOM_LEVELS,
    SKILLS,
    MAIN_SKILLS,
    SUB_SKILLS,
    IELTS_BANDS,
    QUESTION_TYPES,
    WEB_SOURCES,
    TOPICS,
    AI_MODELS,
    HIGHLIGHT_COLORS,
    STORAGE_KEYS,
    DAILY_CONFIG,
    SCORE_THRESHOLDS,
    ANIMATION
};
