export function bindRuntimeToUI(runtime, ui){
    return {
        start(){
            ui.render(runtime.getCurrent(), runtime.getStats());
        },

        submitAnswer(isCorrect){
            const nextWord = runtime.answer(isCorrect);

            if(nextWord){
                ui.render(nextWord, runtime.getStats());
            }else{
                ui.finish(runtime.getStats());
            }
        }
    };
}
