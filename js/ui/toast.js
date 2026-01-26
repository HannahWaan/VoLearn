/* ========================================
   VoLearn - Toast Notifications
   ======================================== */

let toastContainer = null;

/**
 * Khởi tạo toast system
 */
export function initToast() {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container not found');
    }
    console.log('✅ Toast system initialized');
}

/**
 * Hiển thị toast notification
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Thời gian hiển thị (ms), mặc định 3000
 */
export function showToast(message, type = 'info', duration = 3000) {
    if (!toastContainer) {
        toastContainer = document.getElementById('toast-container');
    }
    
    if (!toastContainer) {
        console.warn('Toast container not found, using alert');
        alert(message);
        return;
    }

    // Icon theo type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="toast-icon ${icons[type] || icons.info}"></i>
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Thêm vào container
    toastContainer.appendChild(toast);

    // Click để đóng
    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });

    // Tự động đóng sau duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

/**
 * Xóa toast với animation
 * @param {HTMLElement} toast 
 */
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('hiding');
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Các hàm shortcut
 */
export function showSuccess(message, duration) {
    showToast(message, 'success', duration);
}

export function showError(message, duration) {
    showToast(message, 'error', duration);
}

export function showWarning(message, duration) {
    showToast(message, 'warning', duration);
}

export function showInfo(message, duration) {
    showToast(message, 'info', duration);
}

// Expose to window
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
