/* ========================================
   VoLearn - Main Application Entry
   File: js/app.js
   ======================================== */

// ===== CORE IMPORTS =====
import { 
    loadAllTemplates, 
    hideLoadingScreen, 
    showLoadingError 
} from './core/templateLoader.js';
import { initRouter, navigate } from './core/router.js';
import { bootApp } from './core/boot.js';
import { loadData } from './core/storage.js';
import * as Undo from './core/undo.js';

// ===== UI IMPORTS =====
import { initSidebar } from './ui/sidebar.js';
import { initModals } from './ui/modalEngine.js';
import { initToast } from './ui/toast.js';

// ===== PRACTICE IMPORTS =====
import * as Practice from './practice/practiceEngine.js';
import * as SRS from './practice/srsEngine.js';
import './practice/settingsEngine.js';

// ===== SYNC IMPORTS =====
import * as DriveAuth from './sync/gdriveAuth.js';
import * as DriveBackup from './sync/gdriveBackup.js';


/* ========================================
   KHỞI ĐỘNG ỨNG DỤNG
   ======================================== */

async function initApp() {
    console.log('🚀 VoLearn starting...');
    console.log('================================');

    try {
        // ===== BƯỚC 1: Load tất cả HTML templates =====
        console.log('\n📦 Step 1: Loading templates...');
        const templatesLoaded = await loadAllTemplates();
        
        if (!templatesLoaded) {
            throw new Error('Failed to load templates');
        }

        // ===== BƯỚC 2: Load dữ liệu từ localStorage =====
        console.log('\n💾 Step 2: Loading data...');
        loadData();
        console.log('  ✅ Data loaded from localStorage');

        // ===== BƯỚC 3: Khởi tạo Router =====
        console.log('\n🧭 Step 3: Initializing router...');
        initRouter();
        console.log('  ✅ Router initialized');

        // ===== BƯỚC 4: Khởi tạo Sidebar =====
        console.log('\n📱 Step 4: Initializing sidebar...');
        initSidebar();
        console.log('  ✅ Sidebar initialized');

        // ===== BƯỚC 5: Khởi tạo Modal System =====
        console.log('\n🪟 Step 5: Initializing modals...');
        initModals();
        console.log('  ✅ Modals initialized');

        // ===== BƯỚC 6: Khởi tạo Toast System =====
        console.log('\n🔔 Step 6: Initializing toast...');
        initToast();
        console.log('  ✅ Toast initialized');

        // ===== BƯỚC 7: Boot các hệ thống khác =====
        console.log('\n⚙️ Step 7: Booting app systems...');
        bootApp();
        console.log('  ✅ App systems booted');

        // ===== BƯỚC 8: Expose global functions =====
        console.log('\n🌐 Step 8: Exposing global functions...');
        exposeGlobalFunctions();
        console.log('  ✅ Global functions exposed');

        // ===== BƯỚC 9: Điều hướng đến trang chủ =====
        console.log('\n🏠 Step 9: Navigating to home...');
        navigate('home');
        console.log('  ✅ Navigated to home');

        // ===== BƯỚC 10: Ẩn loading screen, hiện app =====
        console.log('\n✨ Step 10: Showing app...');
        hideLoadingScreen();
        
        console.log('\n================================');
        console.log('🎉 VoLearn ready!');
        console.log('================================\n');

    } catch (error) {
        console.error('\n❌ Failed to initialize app:', error);
        showLoadingError('Không thể tải ứng dụng. Vui lòng thử lại.');
    }
}


/* ========================================
   EXPOSE FUNCTIONS TO WINDOW
   (Để các onclick trong HTML gọi được)
   ======================================== */

function exposeGlobalFunctions() {
    // Navigation
    window.navigate = navigate;

    // SRS functions
    window.startSRSReview = SRS.startSRSReview;
    window.answerSRS = SRS.answerSRS;
    window.flipCard = SRS.flipCard;

    // Practice functions
    window.showPracticeArea = Practice.showPracticeArea;
    window.nextPracticeWord = Practice.nextPracticeWord;
    window.endPractice = Practice.endPractice;

    // Undo function
    window.performUndo = Undo.performUndo;

    // Google Drive functions
    window.loginGoogle = DriveAuth.loginGoogle;
    window.initDrive = DriveAuth.initDrive;
    window.backupToDrive = DriveBackup.backupToDrive;
    window.restoreFromDrive = DriveBackup.restoreFromDrive;
}


/* ========================================
   START APP WHEN DOM READY
   ======================================== */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM đã sẵn sàng
    initApp();
}
