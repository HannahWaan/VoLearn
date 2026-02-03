export function sortWords(words, mode){
    if(mode === 'random') return [...words].sort(()=>Math.random()-0.5);
    if(mode === 'newest') return [...words].sort((a,b)=>b.createdAt-a.createdAt);
    if(mode === 'oldest') return [...words].sort((a,b)=>a.createdAt-b.createdAt);
    return words;
}
