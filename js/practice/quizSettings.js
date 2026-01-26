import { PracticeSettings } from './settingsEngine.js';

export function switchQuizTab(tab, btn){
    import('../ui/tabEngine.js').then(m=>{
        m.switchTab('quiz', tab, btn);
    });
}

export function startQuizWithSettings(){
    console.log("Quiz settings:", PracticeSettings.quiz);
    import('./quiz.js').then(m=>{
        m.startQuizWithSettings(PracticeSettings.quiz);
    });
}
