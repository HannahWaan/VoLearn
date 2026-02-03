/* ========================================
   VoLearn - Template Loader
   Load HTML templates dynamically
   ======================================== */

/**
 * Load một template HTML từ file
 * @param {string} path - Đường dẫn đến file template
 * @returns {Promise<string>} - Nội dung HTML
 */
export async function loadTemplate(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${path}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`❌ Error loading template ${path}:`, error);
        return '';
    }
}

/**
 * Load template và chèn vào một element
 * @param {string} selector - CSS selector của element đích
 * @param {string} path - Đường dẫn đến file template
 */
export async function injectTemplate(selector, path) {
    const html = await loadTemplate(path);
    const target = document.querySelector(selector);
    if (target && html) {
        target.innerHTML = html;
    }
}

/**
 * Load template và thêm vào cuối một element
 * @param {string} selector - CSS selector của element đích
 * @param {string} path - Đường dẫn đến file template
 */
export async function appendTemplate(selector, path) {
    const html = await loadTemplate(path);
    const target = document.querySelector(selector);
    if (target && html) {
        target.insertAdjacentHTML('beforeend', html);
    }
}

/**
 * Load nhiều templates cùng lúc
 * @param {Array} templates - Mảng {selector, path}
 */
export async function loadMultipleTemplates(templates) {
    const promises = templates.map(({ selector, path }) => 
        appendTemplate(selector, path)
    );
    await Promise.all(promises);
}

/* ========================================
   LOAD ALL SECTIONS
   ======================================== */

export async function loadAllSections() {
    console.log('📦 Loading sections...');
    
    const sections = [
        'home',
        'add-word',
        'bookshelf',
        'set-view',
        'practice',
        'news',
        'calendar',
        'settings'
    ];

    for (const section of sections) {
        try {
            await appendTemplate(
                '#sections-container', 
                `./templates/sections/${section}.html`
            );
            console.log(`  ✅ Section: ${section}`);
        } catch (error) {
            console.error(`  ❌ Section: ${section}`, error);
        }
    }
    
    console.log('✅ All sections loaded');
}

/* ========================================
   LOAD ALL MODALS
   ======================================== */

export async function loadAllModals() {
    console.log('📦 Loading modals...');
    
    const modals = [
      'create-set',
      'word-detail',
      'day-detail',
      'flashcard-settings',
      'quiz-settings',
      'dictation-settings',
      'typing-settings',
      'weak-review-settings',
      'scope-selector',
      'confirm-modal',
   ];

    for (const modal of modals) {
        try {
            await appendTemplate(
                '#modals-container', 
                `./templates/modals/${modal}.html`
            );
            console.log(`  ✅ Modal: ${modal}`);
        } catch (error) {
            console.error(`  ❌ Modal: ${modal}`, error);
        }
    }
    
    console.log('✅ All modals loaded');
}

/* ========================================
   LOAD ALL COMPONENTS
   ======================================== */

export async function loadAllComponents() {
    console.log('📦 Loading components...');
    
    const components = [
        'toast',
        'cambridge-widget'
    ];

    for (const component of components) {
        try {
            await appendTemplate(
                '#components-container', 
                `./templates/components/${component}.html`
            );
            console.log(`  ✅ Component: ${component}`);
        } catch (error) {
            console.error(`  ❌ Component: ${component}`, error);
        }
    }
    
    console.log('✅ All components loaded');
}

/* ========================================
   LOAD ALL TEMPLATES
   ======================================== */

export async function loadAllTemplates() {
    console.log('🚀 Starting template loading...');
    const startTime = performance.now();
    
    try {
        // Load theo thứ tự: sections -> modals -> components
        await loadAllSections();
        await loadAllModals();
        await loadAllComponents();
        
        const endTime = performance.now();
        console.log(`🎉 All templates loaded in ${Math.round(endTime - startTime)}ms`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to load templates:', error);
        return false;
    }
}

/* ========================================
   HIDE LOADING SCREEN
   ======================================== */

export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            loadingScreen.remove();
        }, 500);
    }
    
    if (app) {
        app.style.display = 'block';
    }
}

/* ========================================
   SHOW LOADING ERROR
   ======================================== */

export function showLoadingError(message) {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (loadingScreen) {
        const content = loadingScreen.querySelector('.loading-content');
        if (content) {
            content.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--danger-color); margin-bottom: 16px;"></i>
                <h2 style="color: var(--danger-color);">Lỗi tải ứng dụng</h2>
                <p style="margin-bottom: 16px;">${message}</p>
                <button onclick="location.reload()" class="btn-primary">
                    <i class="fas fa-redo"></i> Tải lại
                </button>
            `;
        }
    }
}







