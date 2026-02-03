/* ===== CAMBRIDGE DICTIONARY WIDGET ===== */
/* VoLearn v2.1.0 */

export function initCambridgeWidget() {
    const btn = document.getElementById('cambridge-btn');
    const widget = document.getElementById('cambridge-widget');
    const closeBtn = document.getElementById('cambridge-close');
    const searchInput = widget?.querySelector('.cambridge-input');
    
    if (!btn || !widget) {
        console.warn('Cambridge widget elements not found');
        return;
    }
    
    // Toggle widget
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        widget.classList.toggle('show');
        
        if (widget.classList.contains('show') && searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    });
    
    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            widget.classList.remove('show');
        });
    }
    
    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!widget.contains(e.target) && !btn.contains(e.target)) {
            widget.classList.remove('show');
        }
    });
    
    console.log('✅ Cambridge Widget initialized');
}

// Global export
window.initCambridgeWidget = initCambridgeWidget;
