export function normalizeWord(raw){
    return {
        id: raw.id || crypto.randomUUID(),
        word: raw.word?.trim(),
        meaning: raw.meaning?.trim(),
        phonetic: raw.phonetic || '',
        example: raw.example || '',
        translation: raw.translation || '',
        set: raw.set || 'default',
        tags: raw.tags || [],
        createdAt: raw.createdAt || Date.now(),
        level: raw.level || 'learning',
        stats: {
            seen: 0,
            correct: 0,
            wrong: 0,
            streak: 0,
            lastSeen: null
        },
        flags: {
            bookmarked: false,
            mastered: false,
            deleted: false
        }
    };
}
