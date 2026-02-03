/* =============================================
   VoLearn - Router (Navigation) <3
   ============================================= */

let currentSection = 'home';

const sectionIdMap = {
    'home': 'home-section',
    'add-word': 'add-section',
    'bookshelf': 'bookshelf-section',
    'set-view': 'set-view-section',
    'practice': 'practice-section',
    'calendar': 'calendar-section',
    'news': 'news-section',
    'settings': 'settings-section'
};

const pageTitles = {
    'home': 'Trang chủ',
    'add-word': 'Thêm từ vựng mới',
    'bookshelf': 'Tủ sách',
    'set-view': 'Chi tiết bộ từ',
    'practice': 'Luyện tập',
    'news': 'Tin Tức',
    'calendar': 'Lịch học',
    'news': 'Tin Tức',
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
    /* ===== ẨN TẤT CẢ SECTIONS ===== */
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    /* ===== LẤY SECTION ID ===== */
    const sectionId = sectionIdMap[sectionName] || `${sectionName}-section`;
    const targetSection = document.getElementById(sectionId);
    
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`Section not found: ${sectionId}`);
        return;
    }

    /* ===== NAV ACTIVE ===== */
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    /* ===== PAGE TITLE DATA ===== */
    const pageTitle = pageTitles[sectionName] || '';

    /* ===== BROWSER TAB TITLE ===== */
    document.title = pageTitle ? `${pageTitle} - VoLearn` : 'VoLearn';

    /* =================================================
       ===== FIX HEADER STATE + UI TITLE =====
       ================================================= */

    /* Header global (sidebar/topbar nếu có) */
    const headerTitleEl = document.getElementById('page-title');
    if (headerTitleEl) {
        headerTitleEl.textContent = pageTitle;
    }

    /* Reset toàn bộ section header cũ */
    document.querySelectorAll('.sectionheader, .section-title, .page-title, h1').forEach(el => {
        el.textContent = '';
    });

    /* Set header cho section hiện tại */
    const sectionHeader = targetSection.querySelector('.sectionheader, .section-title, .page-title, h1');
    if (sectionHeader) {
        sectionHeader.textContent = pageTitle;
    }

    /* ===== STATE ===== */
    const previousSection = currentSection;
    currentSection = sectionName;

    /* ===== SPECIAL INIT ===== */
    if (sectionName === 'set-view' && window.initSetView) {
        setTimeout(() => {
            window.initSetView();
        }, 50);
    }

    /* ===== CALLBACKS ===== */
    if (navigationCallbacks[sectionName]) {
        navigationCallbacks[sectionName].forEach(cb => {
            try {
                cb({ from: previousSection, to: sectionName });
            } catch (error) {
                console.error(`Navigation callback error:`, error);
            }
        });
    }

    /* ===== EVENT EMIT ===== */
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





