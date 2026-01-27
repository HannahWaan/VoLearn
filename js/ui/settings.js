<!-- ==================== SETTINGS SECTION ==================== -->
<section id="settings-section" class="section">
    <div class="section-header">
        <h1 class="section-title"><i class="fas fa-cog"></i> Cài đặt</h1>
    </div>
    
    <div class="settings-grid">
        <!-- ROW 1: Giao diện + Giọng đọc -->
        
        <!-- ===== GIAO DIỆN ===== -->
        <div class="settings-card">
            <div class="settings-card-header">
                <i class="fas fa-palette"></i>
                <h3>Giao diện</h3>
            </div>
            <div class="settings-card-body">
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-label">Chế độ tối</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="theme-toggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-label">Phông chữ</span>
                    </div>
                    <select id="font-select" class="setting-select">
                        <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Nunito">Nunito</option>
                        <option value="Inter">Inter</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- ===== GIỌNG ĐỌC ===== -->
        <div class="settings-card">
            <div class="settings-card-header">
                <i class="fas fa-volume-up"></i>
                <h3>Giọng đọc</h3>
            </div>
            <div class="settings-card-body">
                <div class="setting-row">
                    <span class="setting-label">🇺🇸 US</span>
                    <select id="voice-us-select" class="setting-select"></select>
                </div>
                
                <div class="setting-row">
                    <span class="setting-label">🇬🇧 UK</span>
                    <select id="voice-uk-select" class="setting-select"></select>
                </div>
                
                <div class="setting-row">
                    <span class="setting-label">🇻🇳 VN</span>
                    <select id="voice-vi-select" class="setting-select"></select>
                </div>
                
                <div class="setting-row">
                    <span class="setting-label">Tốc độ</span>
                    <div class="speed-control">
                        <input type="range" id="speed-slider" min="0.5" max="2" step="0.1" value="1">
                        <span id="speed-value">1.0x</span>
                    </div>
                </div>
                
                <div class="voice-test-row">
                    <button id="btn-test-us" class="btn-test">Test US</button>
                    <button id="btn-test-uk" class="btn-test">Test UK</button>
                    <button id="btn-test-vi" class="btn-test">Test VN</button>
                </div>
            </div>
        </div>

        <!-- ROW 2: Quản lý dữ liệu + Google Drive -->
        
        <!-- ===== QUẢN LÝ DỮ LIỆU ===== -->
        <div class="settings-card">
            <div class="settings-card-header">
                <i class="fas fa-database"></i>
                <h3>Quản lý dữ liệu</h3>
            </div>
            <div class="settings-card-body">
                <div class="data-stats">
                    <div class="stat-box">
                        <span class="stat-num" id="stats-total-words">0</span>
                        <span class="stat-txt">Từ vựng</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-num" id="stats-total-sets">0</span>
                        <span class="stat-txt">Bộ từ</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-num" id="stats-storage">0 KB</span>
                        <span class="stat-txt">Dung lượng</span>
                    </div>
                </div>
                
                <div class="data-btns">
                    <button id="btn-export-json" class="btn-data">
                        <i class="fas fa-download"></i> JSON
                    </button>
                    <button id="btn-export-csv" class="btn-data">
                        <i class="fas fa-file-csv"></i> CSV
                    </button>
                    <button id="btn-import" class="btn-data">
                        <i class="fas fa-upload"></i> Nhập
                    </button>
                </div>
                <input type="file" id="import-file" accept=".json,.csv" hidden>
                
                <button id="btn-clear-data" class="btn-danger">
                    <i class="fas fa-trash-alt"></i> Xóa tất cả dữ liệu
                </button>
            </div>
        </div>

        <!-- ===== GOOGLE DRIVE ===== -->
        <div class="settings-card">
            <div class="settings-card-header">
                <i class="fab fa-google-drive"></i>
                <h3>Google Drive</h3>
            </div>
            <div class="settings-card-body">
                <div id="gdrive-status" class="gdrive-status">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <span>Đang kiểm tra...</span>
                </div>
                
                <div class="gdrive-btns">
                    <button id="btn-gdrive-login" class="btn-google">
                        <i class="fab fa-google"></i> Đăng nhập Google
                    </button>
                    <button id="btn-gdrive-logout" class="btn-logout-google" style="display:none;">
                        <i class="fas fa-sign-out-alt"></i> Đăng xuất
                    </button>
                </div>
                
                <div class="gdrive-sync" id="gdrive-sync-section" style="display:none;">
                    <button id="btn-gdrive-backup" class="btn-sync">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Sao lưu</span>
                    </button>
                    <button id="btn-gdrive-restore" class="btn-sync">
                        <i class="fas fa-cloud-download-alt"></i>
                        <span>Khôi phục</span>
                    </button>
                </div>
                
                <div id="gdrive-last-sync" class="gdrive-info"></div>
            </div>
        </div>
    </div>
</section>
