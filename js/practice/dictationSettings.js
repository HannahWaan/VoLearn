import { PracticeSettings } from './settingsEngine.js';

export function switchDictationTab(tab, btn){
    import('../ui/tabEngine.js').then(m=>{
        m.switchTab('dictation', tab, btn);
    });
}

export function startDictationWithSettings(){
    console.log("Dictation settings:", PracticeSettings.dictation);
    import('./dictation.js').then(m=>{
        m.startDictationWithSettings(PracticeSettings.dictation);
    });
}
