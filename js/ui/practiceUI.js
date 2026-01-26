import { submitAnswer, getRuntimeState, nextWord, finishRuntime } from '../runtime/runtimeEngine.js';
import { showToast } from './toast.js';
import { pushUndo } from '../core/undo.js';

let undoTimer = null;
let lastAction = null;

export function renderPracticeScreen(wordObj){
    const root = document.getElementById('practice-root');
    root.innerHTML = `
        <div class="practice-card">
            <div class="practice-header">
                <button id="btn-home">🏠</button>
                <div id="practice-progress"></div>
            </div>

            <div class="practice-body">
                <div id="practice-question">${wordObj.word}</div>
                <input id="practice-input" placeholder="Type answer..." />
                <button id="btn-submit">Submit</button>
            </div>

            <div class="practice-footer">
                <div id="practice-stats"></div>
            </div>
        </div>
    `;

    bindEvents(wordObj);
    updateProgress();
}

function bindEvents(wordObj){
    document.getElementById('btn-submit').onclick = ()=>{
        const val = document.getElementById('practice-input').value.trim();
        const { correct, next } = submitAnswer(val);

        lastAction = { word: wordObj, input: val, correct };
        pushUndo(lastAction);

        showUndoToast();

        if(correct){
            showToast('✅ Correct');
        }else{
            showToast('❌ Wrong');
        }

        const w = next;
        if(w){
            renderPracticeScreen(w);
        }else{
            finishRuntime();
            showToast("🎉 Done!");
        }
    };

    document.getElementById('btn-home').onclick = ()=>{
        finishRuntime();
        location.reload();
    };
}

function showUndoToast(){
    const toast = document.getElementById('undo-toast');
    const bar = document.getElementById('undo-progress');
    toast.classList.add('show');

    let time = 7;
    bar.style.width = '100%';

    clearInterval(undoTimer);
    undoTimer = setInterval(()=>{
        time--;
        bar.style.width = (time/7*100)+'%';
        if(time<=0){
            toast.classList.remove('show');
            clearInterval(undoTimer);
        }
    },1000);

    document.getElementById('btn-undo').onclick = ()=>{
        undoLast();
    };
}

function undoLast(){
    const toast = document.getElementById('undo-toast');
    toast.classList.remove('show');
    clearInterval(undoTimer);

    // logic undo sẽ gắn sau
    showToast('↩ Undo');
}

function updateProgress(){
    const st = getRuntimeState();
    document.getElementById('practice-progress').innerText =
        `${st.done}/${st.total}`;

    document.getElementById('practice-stats').innerText =
        `Score: ${st.score} | Wrong: ${st.wrong}`;
}
