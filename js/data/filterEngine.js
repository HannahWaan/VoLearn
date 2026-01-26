export function applyFilters(words, include){
    return words.filter(w=>{
        if(include.mastered === false && w.flags.mastered) return false;
        if(include.bookmarked === false && w.flags.bookmarked) return false;
        if(include.learning === false && w.level === 'learning') return false;
        return true;
    });
}
