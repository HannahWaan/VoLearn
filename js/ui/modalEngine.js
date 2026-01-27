/* ========================================
   VoLearn - Modal Engine
   Quản lý tất cả modals
   ======================================== */

/**
 * Mở một modal
 * @param {string} modalId - ID của modal (không có #)
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scroll
        
        // Focus vào input đầu tiên nếu có
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * Đóng một modal
 * @param {string} modalId - ID của modal (không có #)
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scroll
    }
}

/**
 * Đóng tất cả modals
 */
export function closeAllModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
    });

    document.body.style.overflow = '';

    document.getElementById('sidebar-overlay')?.classList.remove('show');

    document.body.classList.remove('modal-open');
}

/**
 * Khởi tạo hệ thống modal
 */
export function initModals() {
    // Click vào nút close
    document.addEventListener('click', (e) => {
        // Close button
        if (e.target.closest('.modal-close')) {
            const btn = e.target.closest('.modal-close');
            const modalId = btn.dataset.modal;
            
            if (modalId) {
                closeModal(modalId);
            } else {
                // Tìm modal cha
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = '';
                }
            }
        }
        
        // Cancel button
        if (e.target.closest('.modal-cancel')) {
            const btn = e.target.closest('.modal-cancel');
            const modalId = btn.dataset.modal;
            
            if (modalId) {
                closeModal(modalId);
            } else {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = '';
                }
            }
        }
        
        // Click vào overlay (ngoài modal-content)
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
            document.body.style.overflow = '';
        }
    });

    // Nhấn ESC để đóng modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                openModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    });

    // Khởi tạo settings tabs trong modals
    initSettingsTabs();
    
    console.log('✅ Modal system initialized');
}

/**
 * Khởi tạo tabs trong settings modals
 */
function initSettingsTabs() {
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('.settings-tab');
      if (!tab) return;
      if (tab.hasAttribute('data-quiz-tab')) return;
      if (tab.hasAttribute('onclick')) return;

        const tabId = tab.dataset.tab;
        if (!tabId) return;

        const tabsContainer = tab.closest('.settings-tabs');
        if (!tabsContainer) return;

        const modalBody = tabsContainer.closest('.modal-body');
        if (!modalBody) return;

        tabsContainer.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.remove('active');
        });

        tab.classList.add('active');

        modalBody.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = modalBody.querySelector(`#${tabId}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    });
}

// Expose to window for HTML onclick
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
