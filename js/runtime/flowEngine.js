export function next(session){
    session.index++;
    if(session.index >= session.total){
        return null; // end session
    }
    return session.words[session.index];
}

export function current(session){
    return session.words[session.index];
}
