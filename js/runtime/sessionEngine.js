export function createSession(words, config){
    return {
        id: crypto.randomUUID(),
        type: config.type,
        index: 0,
        total: words.length,
        words,
        score: 0,
        wrong: 0,
        history: [],
        startTime: Date.now(),
        config
    };
}
