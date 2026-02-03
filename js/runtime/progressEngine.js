export function updateProgress(session, word, isCorrect){
    session.history.push({
        wordId: word.id,
        correct: isCorrect,
        time: Date.now()
    });

    if(isCorrect){
        session.score++;
    } else {
        session.wrong++;
    }
}
