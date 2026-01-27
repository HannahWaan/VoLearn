/* =============================================
   VoLearn - Router (Navigation)
   Handle page navigation
   ============================================= */

let currentSection = 'home';

const sectionIdMap = {
    'home': 'home-section',
    'add-word': 'add-section',
    'bookshelf': 'bookshelf-section',
    'set-view': 'set-view-section',
    'practice': 'practice-section',
    'calendar': 'calendar-section',
    'settings': 'settings-section'
};

const pageTitles = {
    'home': 'Trang chủ',
    'add-word': 'Thêm từ vựng mới',
    'bookshelf': 'Tủ sách',
    'set-view': 'Chi tiết bộ từ',
    'practice': 'Luyện tập',
    'calendar': 'Lịch học',
    'settings': 'Cài đặt'
};

const navigationCallbacks = {};

export function onNavigate(section, callback) {
    if (!navigationCallbacks[section]) {
        navigationCallbacks[section] = [];
    }
    navigationCallbacks[section].push(callback);
}

export function navigate(sectionName) {
    // Ẩn tất cả sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Lấy ID thực của section
    const sectionId = sectionIdMap[sectionName] || `${sectionName}-section`;
    const targetSection = document.getElementById(sectionId);
    
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`Section not found: ${sectionId}`);
        return;
    }

    // Cập nhật nav item active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // === CẬP NHẬT PAGE TITLE ===
    const pageTitle = pageTitles[sectionName] || sectionName;
    
    // Cập nhật browser tab
    document.title = `${pageTitle} - VoLearn`;
    
    // Tìm và cập nhật title trong section
    // Hỗ trợ cả 2 cấu trúc: .section-title và .card-header h2
    const sectionTitle = targetSection.querySelector('.section-header .section-title');
    const cardHeaderH2 = targetSection.querySelector('.card-header h2');
    
    if (sectionTitle) {
        const icon = sectionTitle.querySelector('i');
        if (icon) {
            sectionTitle.innerHTML = `${icon.outerHTML} ${pageTitle}`;
        } else {
            sectionTitle.textContent = pageTitle;
        }
    } else if (cardHeaderH2) {
        const icon = cardHeaderH2.querySelector('i');
        if (icon) {
            cardHeaderH2.innerHTML = `${icon.outerHTML} ${pageTitle}`;
        } else {
            cardHeaderH2.textContent = pageTitle;
        }
    }

    const previousSection = currentSection;
    currentSection = sectionName;

    // Gọi initSetView khi navigate đến set-view
    if (sectionName === 'set-view' && window.initSetView) {
        setTimeout(() => {
            window.initSetView();
        }, 50);
    }

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
        detail: { from: previousSection, to: sectionName } 
    }));

    window.scrollTo(0, 0);
    console.log(`📍 Navigate: ${previousSection} → ${sectionName}`);
}

export function getCurrentSection() {
    return currentSection;
}

export function goBack() {
    navigate('home');
}

export function initRouter() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                navigate(section);
                closeMobileSidebar();
            }
        });
    });

    console.log('✅ Router initialized');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth <= 768) {
        sidebar?.classList.remove('show');
        overlay?.classList.remove('show');
    }
}

window.navigate = navigate;
window.goBack = goBack;
