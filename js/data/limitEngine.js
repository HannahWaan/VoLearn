export function limitWords(words, limit){
    if(!limit || limit<=0) return words;
    return words.slice(0, limit);
}
