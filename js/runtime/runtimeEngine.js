let runtime = null;

export function createRuntime(words){
    let index = 0;
    let stats = { score:0, wrong:0, done:0, total: words.length };

    runtime = {
        getCurrent(){
            return words[index] || null;
        },

        answer(isCorrect){
            if(isCorrect) stats.score++;
            else stats.wrong++;
            stats.done++;
            index++;
            return words[index] || null;
        },

        getStats(){
            return {...stats};
        },

        getIndex(){
            return index;
        },

        getTotal(){
            return words.length;
        }
    };

    return runtime;
}

export function nextWord(){
    if(!runtime) return null;
    return runtime.getCurrent();
}

export function testAnswer(input){
    if(!runtime) return false;
    const current = runtime.getCurrent();
    if(!current) return false;

    const correct = input.trim().toLowerCase() === current.word.trim().toLowerCase();
    return correct;
}

export function submitAnswer(input){
    const correct = testAnswer(input);
    const next = runtime.answer(correct);
    return { correct, next };
}

export function getRuntimeState(){
    if(!runtime) return null;
    const stats = runtime.getStats();
    return {
        done: stats.done,
        total: stats.total,
        score: stats.score,
        wrong: stats.wrong
    };
}

export function finishRuntime(){
    runtime = null;
}
