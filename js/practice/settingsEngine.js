export const PracticeSettings = {
    flashcard: {},
    quiz: {
        limit: 0,
        scope: { sets: [], dates: [] },
        include: {
            unmarked: true,
            mastered: true,
            learning: true,
            bookmarked: true
        },
        sort: 'random',
        questionFields: [],
        answerFields: [],
        timer: 0,
        autoSkip: false,
        autoNext: true
    },
    dictation: {
        limit: 0,
        scope: { sets: [], dates: [] },
        include: {},
        sort: 'random',
        listenFields: [],
        hintFields: [],
        scoring: 'exact',
        englishVoice: 'en-US',
        replayLimit: 0,
        showAnswer: false,
        strict: false,
        autoNext: true,
        autoCorrect: false
    },
    typing: {
        limit: 0,
        scope: { sets: [], dates: [] },
        include: {},
        sort: 'random',
        answerFields: [],
        hintFields: [],
        scoring: 'exact',
        showAnswer: false,
        strict: false,
        autoNext: true,
        autoCorrect: false,
        showFirstLetter: true,
        showLength: true
    }
};
