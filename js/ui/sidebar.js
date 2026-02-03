/* ========================================
   VoLearn - Sidebar Module
   ======================================== */

let sidebar = null;
let sidebarOverlay = null;

/**
 * Khởi tạo sidebar
 */
export function initSidebar() {
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const menuToggle = document.getElementById('menu-toggle');

    if (!sidebar) {
        console.warn('Sidebar not found');
        return;
    }

    // Toggle collapse sidebar (Desktop)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleCollapse);
    }

    // Mobile: Open sidebar
    if (menuToggle) {
        menuToggle.addEventListener('click', openMobileSidebar);
    }

    // Mobile: Close sidebar button
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeMobileSidebar);
    }

    // Click overlay to close
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    // Load saved state
    loadSidebarState();

    console.log('✅ Sidebar initialized');
}

/**
 * Toggle collapse/expand sidebar
 */
export function toggleCollapse() {
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
    
    // Save state
    saveSidebarState();
}

/**
 * Collapse sidebar
 */
export function collapseSidebar() {
    if (!sidebar) return;
    
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    saveSidebarState();
}

/**
 * Expand sidebar
 */
export function expandSidebar() {
    if (!sidebar) return;
    
    sidebar.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');
    saveSidebarState();
}

/**
 * Open sidebar on mobile
 */
export function openMobileSidebar() {
    sidebar?.classList.add('show');
    sidebarOverlay?.classList.add('show');
}

/**
 * Close sidebar on mobile
 */
export function closeMobileSidebar() {
    sidebar?.classList.remove('show');
    sidebarOverlay?.classList.remove('show');
}

/**
 * Save sidebar state to localStorage
 */
function saveSidebarState() {
    const isCollapsed = sidebar?.classList.contains('collapsed');
    localStorage.setItem('volearn_sidebar_collapsed', isCollapsed ? '1' : '0');
}

/**
 * Load sidebar state from localStorage
 */
function loadSidebarState() {
    const saved = localStorage.getItem('volearn_sidebar_collapsed');
    
    if (saved === '1' && window.innerWidth > 768) {
        sidebar?.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
    }
}

// Expose to window
window.toggleSidebarCollapse = toggleCollapse;
window.openMobileSidebar = openMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
