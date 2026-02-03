import { createRuntime } from './runtimeEngine.js';

const words = [
    {id:1, word:'apple'},
    {id:2, word:'banana'},
    {id:3, word:'cat'}
];

const rt = createRuntime(words);

console.log("START:", rt.getCurrent());
console.log("A1", rt.answer(true));
console.log("A2", rt.answer(false));
console.log("A3", rt.answer(true));
console.log("STATS:", rt.getStats());
console.log("FINISHED:", rt.getCurrent() === null);
