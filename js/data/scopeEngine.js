export function applyScope(words, scope){
    let result = [...words];

    if(scope.sets?.length){
        result = result.filter(w => scope.sets.includes(w.set));
    }

    if(scope.dates?.length){
        result = result.filter(w=>{
            const d = new Date(w.createdAt).toISOString().split('T')[0];
            return scope.dates.includes(d);
        });
    }

    return result;
}
