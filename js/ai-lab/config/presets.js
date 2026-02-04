/**
 * VoLearn AI Practice Lab - Presets Configuration
 * Version: 1.1.0
 * 
 * Bỏ Listening & Pronunciation
 */

// Bloom Distribution Presets
export const BLOOM_PRESETS = {
    basic: {
        id: 'basic',
        name: 'Cơ bản',
        description: 'Tập trung ghi nhớ và hiểu',
        icon: 'seedling',
        distribution: {
            remember: 4,
            understand: 3,
            apply: 2,
            analyze: 1,
            evaluate: 0,
            create: 0
        },
        total: 10
    },
    
    balanced: {
        id: 'balanced',
        name: 'Cân bằng',
        description: 'Phân bổ đều các cấp độ',
        icon: 'balance-scale',
        distribution: {
            remember: 2,
            understand: 2,
            apply: 2,
            analyze: 2,
            evaluate: 1,
            create: 1
        },
        total: 10
    },
    
    advanced: {
        id: 'advanced',
        name: 'Nâng cao',
        description: 'Tập trung phân tích và sáng tạo',
        icon: 'rocket',
        distribution: {
            remember: 1,
            understand: 1,
            apply: 2,
            analyze: 3,
            evaluate: 2,
            create: 1
        },
        total: 10
    },
    
    ielts: {
        id: 'ielts',
        name: 'IELTS Focus',
        description: 'Phù hợp luyện thi IELTS',
        icon: 'graduation-cap',
        distribution: {
            remember: 2,
            understand: 3,
            apply: 3,
            analyze: 1,
            evaluate: 1,
            create: 0
        },
        total: 10
    },
    
    random: {
        id: 'random',
        name: 'Ngẫu nhiên',
        description: 'Mix ngẫu nhiên các độ khó',
        icon: 'random',
        distribution: null,
        total: 10
    }
};

// Skill Presets (BỎ Listening & Pronunciation)
export const SKILL_PRESETS = {
    reading_focus: {
        id: 'reading_focus',
        name: 'Reading Focus',
        skills: ['reading', 'vocabulary'],
        description: 'Tập trung kỹ năng đọc'
    },
    
    writing_focus: {
        id: 'writing_focus',
        name: 'Writing Focus',
        skills: ['writing', 'vocabulary', 'grammar'],
        description: 'Tập trung kỹ năng viết'
    },
    
    speaking_focus: {
        id: 'speaking_focus',
        name: 'Speaking Focus',
        skills: ['speaking', 'vocabulary'],
        description: 'Kỹ năng nói (dạng text)'
    },
    
    full_skills: {
        id: 'full_skills',
        name: 'Full Skills',
        skills: ['reading', 'writing', 'speaking'],
        description: 'Đầy đủ 3 kỹ năng chính'
    },
    
    vocabulary_intensive: {
        id: 'vocabulary_intensive',
        name: 'Vocabulary Intensive',
        skills: ['vocabulary', 'grammar'],
        description: 'Tập trung từ vựng & ngữ pháp'
    },
    
    academic: {
        id: 'academic',
        name: 'Academic',
        skills: ['reading', 'writing', 'vocabulary'],
        description: 'Học thuật: đọc, viết, từ vựng'
    }
};

// Time Presets
export const TIME_PRESETS = {
    quick: {
        id: 'quick',
        name: 'Nhanh',
        minutes: 10,
        icon: 'bolt'
    },
    standard: {
        id: 'standard',
        name: 'Tiêu chuẩn',
        minutes: 20,
        icon: 'clock'
    },
    extended: {
        id: 'extended',
        name: 'Mở rộng',
        minutes: 30,
        icon: 'hourglass-half'
    },
    unlimited: {
        id: 'unlimited',
        name: 'Không giới hạn',
        minutes: 0,
        icon: 'infinity'
    }
};

// IELTS Band Descriptions
export const IELTS_BAND_INFO = {
    4.0: { level: 'Limited', description: 'Năng lực hạn chế', vocabulary_range: '2000-3000 từ' },
    4.5: { level: 'Limited+', description: 'Năng lực hạn chế, có cải thiện', vocabulary_range: '3000-4000 từ' },
    5.0: { level: 'Modest', description: 'Năng lực khiêm tốn', vocabulary_range: '4000-5000 từ' },
    5.5: { level: 'Modest+', description: 'Năng lực khiêm tốn, đang phát triển', vocabulary_range: '5000-6000 từ' },
    6.0: { level: 'Competent', description: 'Năng lực tốt', vocabulary_range: '6000-7000 từ' },
    6.5: { level: 'Competent+', description: 'Năng lực tốt, ngôn ngữ phức tạp', vocabulary_range: '7000-8000 từ' },
    7.0: { level: 'Good', description: 'Năng lực giỏi', vocabulary_range: '8000-9000 từ' },
    7.5: { level: 'Good+', description: 'Năng lực giỏi, ít sai sót', vocabulary_range: '9000-10000 từ' },
    8.0: { level: 'Very Good', description: 'Năng lực rất giỏi', vocabulary_range: '10000-12000 từ' },
    8.5: { level: 'Very Good+', description: 'Gần như hoàn hảo', vocabulary_range: '12000-15000 từ' },
    9.0: { level: 'Expert', description: 'Chuyên gia', vocabulary_range: '15000+ từ' }
};

// Default Settings
export const DEFAULT_SETTINGS = {
    vocabSource: 'all',
    selectedSet: null,
    wordCount: 10,
    skills: ['reading', 'vocabulary'],
    ieltsTarget: 6.0,
    bloomPreset: 'balanced',
    bloomDistribution: {
        remember: 2,
        understand: 2,
        apply: 2,
        analyze: 2,
        evaluate: 1,
        create: 1
    },
    mcRatio: 60,
    timeLimit: 20,
    aiModel: 'claude',
    exerciseSource: 'ai-generate',
    webSources: ['ielts-official', 'cambridge'],
    strictMode: false,
    showHints: true,
    showTimer: true
};

// Generate random Bloom distribution
export function generateRandomBloom(total = 10) {
    const levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    const distribution = {};
    let remaining = total;
    
    levels.slice(0, 4).forEach(level => {
        distribution[level] = 1;
        remaining -= 1;
    });
    
    distribution.evaluate = 0;
    distribution.create = 0;
    
    while (remaining > 0) {
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        distribution[randomLevel]++;
        remaining--;
    }
    
    return distribution;
}

// Get preset by ID
export function getBloomPreset(presetId) {
    const preset = BLOOM_PRESETS[presetId];
    if (!preset) return BLOOM_PRESETS.balanced;
    
    if (presetId === 'random') {
        return { ...preset, distribution: generateRandomBloom(preset.total) };
    }
    
    return preset;
}

// Scale Bloom distribution
export function scaleBloomDistribution(distribution, targetTotal) {
    const currentTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (currentTotal === 0) return distribution;
    
    const scale = targetTotal / currentTotal;
    const scaled = {};
    let sum = 0;
    
    const levels = Object.keys(distribution);
    levels.forEach((level, index) => {
        if (index === levels.length - 1) {
            scaled[level] = targetTotal - sum;
        } else {
            scaled[level] = Math.round(distribution[level] * scale);
            sum += scaled[level];
        }
    });
    
    return scaled;
}

export default {
    BLOOM_PRESETS,
    SKILL_PRESETS,
    TIME_PRESETS,
    IELTS_BAND_INFO,
    DEFAULT_SETTINGS,
    generateRandomBloom,
    getBloomPreset,
    scaleBloomDistribution
};
