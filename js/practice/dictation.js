import { createRuntime, nextWord } from '../runtime/runtimeEngine.js';
import { renderPracticeScreen } from '../ui/practiceUI.js';

export function run(list, config){
    createRuntime(list);
    const w = nextWord();
    renderPracticeScreen(w);
}
