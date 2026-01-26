/* ========================================
   VoLearn - Router (Navigation)
   Handle page navigation
   ======================================== */

// Lưu section hiện tại
let currentSection = 'home';

// Mapping section -> page title
const pageTitles = {
    'home': 'Trang chủ',
    'add': 'Thêm từ vựng',
    'bookshelf': 'Tủ sách',
    'set-view': 'Chi tiết bộ từ',
    'practice': 'Luyện tập',
    'calendar': 'Lịch học',
    'settings': 'Cài đặt'
};

// Callbacks khi navigate
const navigationCallbacks = {};

/**
 * Đăng ký callback khi navigate đến section
 * @param {string} section - Tên section
 * @param {function} callback - Hàm callback
 */
export function onNavigate(section, callback) {
    if (!navigationCallbacks[section]) {
        navigationCallbacks[section] = [];
    }
    navigationCallbacks[section].push(callback);
}

/**
 * Điều hướng đến một section
 * @param {string} sectionName - Tên section (home, add, bookshelf, ...)
 */
export function navigate(sectionName) {
    // Ẩn tất cả sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Hiện section được chọn
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`Section not found: ${sectionName}-section`);
        return;
    }

    // Cập nhật nav item active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Cập nhật page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && pageTitles[sectionName]) {
        pageTitle.textContent = pageTitles[sectionName];
    }

    // Lưu section hiện tại
    const previousSection = currentSection;
    currentSection = sectionName;

    // Gọi callbacks
    if (navigationCallbacks[sectionName]) {
        navigationCallbacks[sectionName].forEach(cb => {
            try {
                cb({ from: previousSection, to: sectionName });
            } catch (error) {
                console.error(`Navigation callback error:`, error);
            }
        });
    }

    // Emit custom event
    window.dispatchEvent(new CustomEvent('volearn:navigate', { 
        detail: { 
            from: previousSection,
            to: sectionName 
        } 
    }));

    // Scroll to top
    window.scrollTo(0, 0);

    console.log(`📍 Navigate: ${previousSection} → ${sectionName}`);
}

/**
 * Lấy section hiện tại
 */
export function getCurrentSection() {
    return currentSection;
}

/**
 * Quay lại section trước
 */
export function goBack() {
    // Simple back - có thể mở rộng với history stack
    navigate('home');
}

/**
 * Khởi tạo navigation
 */
export function initRouter() {
    // Gắn event click cho nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                navigate(section);
                
                // Đóng sidebar trên mobile
                closeMobileSidebar();
            }
        });
    });

    console.log('✅ Router initialized');
}

/**
 * Đóng sidebar trên mobile
 */
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth <= 768) {
        sidebar?.classList.remove('show');
        overlay?.classList.remove('show');
    }
}

// Expose to window
window.navigate = navigate;
window.goBack = goBack;
