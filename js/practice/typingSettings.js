import { PracticeSettings } from './settingsEngine.js';

export function switchTypingTab(tab, btn){
    import('../ui/tabEngine.js').then(m=>{
        m.switchTab('typing', tab, btn);
    });
}

export function startTypingWithSettings(){
    console.log("Typing settings:", PracticeSettings.typing);
    import('./typing.js').then(m=>{
        m.startTypingWithSettings(PracticeSettings.typing);
    });
}
