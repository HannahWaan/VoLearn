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
    'add-word': 'Thêm từ vựng',
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
   const pageTitle = pageTitles[sectionName] || '';
    
    // Tìm #page-title (nếu có)
    const pageTitleEl = document.getElementById('page-title');
   if (pageTitleEl) {
       pageTitleEl.textContent = pageTitle;
   }

   // Reset toàn bộ section-title cũ
   document.querySelectorAll('.section-title').forEach(t => {
       t.textContent = '';
   });
   
    // Tìm .section-title trong section active
    const sectionTitle = targetSection.querySelector('.section-title');
   if (sectionTitle) {
       sectionTitle.textContent = pageTitle;
   }
    
    // Cập nhật browser tab title
    document.title = pageTitle ? `${pageTitle} - VoLearn` : 'VoLearn';

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

