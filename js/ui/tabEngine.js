export function switchTab(prefix, tab, btn){
    document.querySelectorAll(`[id^="${prefix}-tab-"]`)
        .forEach(t => t.classList.remove('active'));
    document.getElementById(`${prefix}-tab-${tab}`)?.classList.add('active');

    btn.parentElement.querySelectorAll('.settings-tab')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}
