/* ========================================
   VoLearn - Confirm Modal Module
   Thay thế confirm() của trình duyệt
   ======================================== */

let confirmCallback = null;
let confirmResolve = null;

/**
 * Hiển thị confirm modal
 * @param {Object} options - Tùy chọn
 * @param {string} options.title - Tiêu đề
 * @param {string} options.message - Nội dung chính
 * @param {string} options.submessage - Nội dung phụ (optional)
 * @param {string} options.type - Loại: 'danger' | 'warning' | 'info' | 'primary'
 * @param {string} options.confirmText - Text nút xác nhận
 * @param {string} options.cancelText - Text nút hủy
 * @param {string} options.icon - Icon class (optional)
 * @param {Function} options.onConfirm - Callback khi xác nhận
 * @returns {Promise<boolean>}
 */
export function showConfirm(options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Xác nhận',
            message = 'Bạn có chắc chắn?',
            submessage = '',
            type = 'warning',
            confirmText = 'Xác nhận',
            cancelText = 'Hủy',
            icon = null,
            onConfirm = null
        } = options;

        confirmCallback = onConfirm;
        confirmResolve = resolve;

        const modal = document.getElementById('confirm-modal');
        const modalContent = modal?.querySelector('.modal-content');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const submessageEl = document.getElementById('confirm-modal-submessage');
        const okBtn = document.getElementById('confirm-modal-ok');
        const cancelBtn = document.getElementById('confirm-modal-cancel');

        if (!modal) {
            console.error('Confirm modal not found!');
            resolve(false);
            return;
        }

        // Set type class
        modalContent.className = 'modal-content modal-confirm ' + type;

        // Set icon
        const iconClass = icon || getIconForType(type);
        titleEl.innerHTML = `<i class="${iconClass}"></i> ${title}`;

        // Set messages
        messageEl.textContent = message;
        if (submessage) {
            submessageEl.textContent = submessage;
            submessageEl.style.display = 'block';
        } else {
            submessageEl.style.display = 'none';
        }

        // Set button texts
        okBtn.innerHTML = `<i class="fas fa-check"></i> ${confirmText}`;
        cancelBtn.innerHTML = `<i class="fas fa-times"></i> ${cancelText}`;

        // Show modal
        modal.classList.add('show');

        // Focus on cancel button for safety
        setTimeout(() => cancelBtn.focus(), 100);
    });
}

/**
 * Lấy icon theo type
 */
function getIconForType(type) {
    switch (type) {
        case 'danger':
            return 'fas fa-exclamation-circle';
        case 'warning':
            return 'fas fa-exclamation-triangle';
        case 'info':
            return 'fas fa-info-circle';
        case 'primary':
            return 'fas fa-question-circle';
        default:
            return 'fas fa-exclamation-triangle';
    }
}

/**
 * Đóng confirm modal
 */
export function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
    confirmCallback = null;
}

/**
 * Thực thi action khi xác nhận
 */
export function executeConfirmAction() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.remove('show');
    }

    if (confirmCallback) {
        confirmCallback();
    }
    
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
    confirmCallback = null;
}

/**
 * Shortcut functions
 */

// Xác nhận xóa (danger)
export function confirmDelete(itemName, onConfirm) {
    return showConfirm({
        title: 'Xác nhận xóa',
        message: `Bạn có chắc muốn xóa "${itemName}"?`,
        submessage: 'Hành động này không thể hoàn tác.',
        type: 'danger',
        confirmText: 'Xóa',
        icon: 'fas fa-trash',
        onConfirm
    });
}

// Xác nhận nguy hiểm (danger)
export function confirmDanger(message, submessage, onConfirm) {
    return showConfirm({
        title: 'Cảnh báo',
        message,
        submessage,
        type: 'danger',
        confirmText: 'Tôi hiểu',
        onConfirm
    });
}

// Xác nhận thông tin (info)
export function confirmInfo(title, message, onConfirm) {
    return showConfirm({
        title,
        message,
        type: 'info',
        confirmText: 'Đồng ý',
        onConfirm
    });
}

// Xác nhận ghi đè
export function confirmOverwrite(message, onConfirm) {
    return showConfirm({
        title: 'Ghi đè dữ liệu',
        message,
        submessage: 'Dữ liệu hiện tại sẽ bị thay thế.',
        type: 'warning',
        confirmText: 'Ghi đè',
        icon: 'fas fa-file-import',
        onConfirm
    });
}

/**
 * Khởi tạo module
 */
export function initConfirmModal() {
    // Đăng ký global functions
    window.showConfirm = showConfirm;
    window.closeConfirmModal = closeConfirmModal;
    window.executeConfirmAction = executeConfirmAction;
    window.confirmDelete = confirmDelete;
    window.confirmDanger = confirmDanger;
    window.confirmInfo = confirmInfo;
    window.confirmOverwrite = confirmOverwrite;

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('confirm-modal');
        if (!modal?.classList.contains('show')) return;

        if (e.key === 'Escape') {
            closeConfirmModal();
        } else if (e.key === 'Enter') {
            // Don't auto-confirm on Enter for safety
        }
    });

    console.log('✅ ConfirmModal initialized');
}
