/* ===== GOOGLE DRIVE BACKUP ===== */
/* VoLearn v2.2.0 - Backup & Restore to Google Drive */

import { getAccessToken, isGoogleSignedIn, loginGoogle } from './gdriveAuth.js';
import { appData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';

/* ===== CONFIG ===== */
const BACKUP_FILENAME = 'volearn_backup.json';
const BACKUP_FOLDER = 'appDataFolder';
const STORAGE_KEY = 'volearn_data';

/* ===== BACKUP ===== */
export async function backupToDrive() {
    if (!isGoogleSignedIn()) {
        showToast('Vui lòng đăng nhập Google trước', 'warning');
        loginGoogle();
        return false;
    }

    try {
        showToast('Đang sao lưu...', 'info');

        const backupData = {
            vocabulary: appData.vocabulary || [],
            sets: appData.sets || [],
            history: appData.history || [],
            settings: appData.settings || {},
            streak: appData.streak || 0,
            lastStudyDate: appData.lastStudyDate || null,
            backupDate: new Date().toISOString(),
            version: '2.2.0'
        };

        console.log('📤 Backup data:', {
            vocabulary: backupData.vocabulary.length,
            sets: backupData.sets.length,
            history: backupData.history.length
        });

        const existingFile = await findBackupFile();

        if (existingFile) {
            await updateDriveFile(existingFile.id, backupData);
        } else {
            await createDriveFile(backupData);
        }

        showToast('Sao lưu thành công!', 'success');
        updateLastBackupUI();
        return true;

    } catch (error) {
        console.error('Backup error:', error);
        showToast('Sao lưu thất bại: ' + error.message, 'error');
        return false;
    }
}

/* ===== RESTORE ===== */
export async function restoreFromDrive() {
    if (!isGoogleSignedIn()) {
        showToast('Vui lòng đăng nhập Google trước', 'warning');
        loginGoogle();
        return false;
    }

    try {
        showToast('Đang tìm bản sao lưu...', 'info');

        const existingFile = await findBackupFile();

        if (!existingFile) {
            showToast('Không tìm thấy bản sao lưu trên Google Drive!', 'warning');
            return false;
        }

        showToast('Đang tải dữ liệu...', 'info');

        let content;
        try {
            content = await downloadDriveFile(existingFile.id);
        } catch (downloadErr) {
            console.error('Download error:', downloadErr);
            showToast('Không thể tải file sao lưu: ' + downloadErr.message, 'error');
            return false;
        }

        // === DEBUG: Log cấu trúc dữ liệu tải về ===
        console.log('📥 Downloaded content type:', typeof content);
        console.log('📥 Downloaded content keys:', content ? Object.keys(content) : 'null');
        if (content) {
            console.log('📥 vocabulary:', Array.isArray(content.vocabulary) ? content.vocabulary.length + ' words' : typeof content.vocabulary);
            console.log('📥 sets:', Array.isArray(content.sets) ? content.sets.length + ' sets' : typeof content.sets);
        }

        // Validate
        if (!content || typeof content !== 'object') {
            showToast('Dữ liệu sao lưu không hợp lệ!', 'error');
            return false;
        }

        if (!Array.isArray(content.vocabulary)) {
            // Thử tìm dữ liệu ở vị trí khác (backup cũ có thể có cấu trúc khác)
            console.warn('vocabulary is not array, checking nested structures...');
            console.log('Full content keys:', JSON.stringify(Object.keys(content)));
            
            showToast('Dữ liệu sao lưu không hợp lệ (thiếu vocabulary)!', 'error');
            return false;
        }

        const backupDate = content.backupDate
            ? new Date(content.backupDate).toLocaleString('vi-VN')
            : existingFile.modifiedTime 
                ? new Date(existingFile.modifiedTime).toLocaleString('vi-VN')
                : 'không rõ';

        const wordCount = content.vocabulary.length;
        const setCount = (content.sets || []).length;

        // Dùng showConfirm modal
        return new Promise((resolve) => {
            const doRestore = () => {
                try {
                    applyRestoreData(content);
                    resolve(true);
                } catch (applyErr) {
                    console.error('Apply restore error:', applyErr);
                    showToast('Lỗi khi áp dụng dữ liệu: ' + applyErr.message, 'error');
                    resolve(false);
                }
            };

            if (typeof window.showConfirm === 'function') {
                window.showConfirm({
                    title: 'Khôi phục dữ liệu',
                    message: `Khôi phục từ bản sao lưu ngày ${backupDate}?`,
                    submessage: `Gồm ${wordCount} từ vựng, ${setCount} bộ từ.\nDữ liệu hiện tại sẽ bị thay thế.`,
                    type: 'warning',
                    confirmText: 'Khôi phục',
                    icon: 'fas fa-cloud-download-alt',
                    onConfirm: doRestore,
                    onCancel: () => {
                        showToast('Đã hủy khôi phục', 'info');
                        resolve(false);
                    }
                });
            } else {
                const confirmed = confirm(
                    `Khôi phục từ ${backupDate}?\n${wordCount} từ, ${setCount} bộ.\nDữ liệu hiện tại sẽ bị thay thế.`
                );
                if (confirmed) {
                    doRestore();
                } else {
                    resolve(false);
                }
            }
        });

    } catch (error) {
        console.error('Restore error:', error);
        showToast('Khôi phục thất bại: ' + error.message, 'error');
        return false;
    }
}

/* ===== APPLY RESTORE DATA ===== */
function applyRestoreData(content) {
    const restored = {
        vocabulary: Array.isArray(content.vocabulary) ? content.vocabulary : [],
        sets: Array.isArray(content.sets) ? content.sets : [],
        history: Array.isArray(content.history) ? content.history : [],
        settings: content.settings || {},
        streak: content.streak || 0,
        lastStudyDate: content.lastStudyDate || null
    };

    console.log('💾 Applying restore data:', {
        vocabulary: restored.vocabulary.length,
        sets: restored.sets.length,
        history: restored.history.length
    });

    // === CÁCH AN TOÀN NHẤT: Ghi TRỰC TIẾP vào localStorage ===
    // Không phụ thuộc vào saveData() hay appData reference
    const toSave = {
        vocabulary: restored.vocabulary,
        sets: restored.sets,
        history: restored.history
    };

    const jsonString = JSON.stringify(toSave);
    localStorage.setItem(STORAGE_KEY, jsonString);

    // Verify đã lưu thành công
    const verification = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(verification);

    console.log('✅ localStorage verification:', {
        saved: jsonString.length + ' chars',
        vocabulary: parsed.vocabulary?.length,
        sets: parsed.sets?.length,
        history: parsed.history?.length
    });

    if (!parsed.vocabulary?.length && restored.vocabulary.length > 0) {
        console.error('❌ CRITICAL: Data was not saved correctly!');
        showToast('Lỗi nghiêm trọng: Dữ liệu không được lưu đúng!', 'error');
        return;
    }

    // Cũng cập nhật appData hiện tại (cho session này trước khi reload)
    Object.keys(appData).forEach(key => delete appData[key]);
    Object.assign(appData, restored);
    try { window.appData = appData; } catch (e) {}

    showToast(
        `Khôi phục thành công! (${restored.vocabulary.length} từ, ${restored.sets.length} bộ). Đang tải lại...`,
        'success'
    );

    // Reload để tất cả module đọc lại từ localStorage
    setTimeout(() => {
        console.log('🔄 Reloading page...');
        window.location.reload();
    }, 1500);
}

/* ===== DRIVE API HELPERS ===== */
async function findBackupFile() {
    const accessToken = getAccessToken();

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `spaces=${BACKUP_FOLDER}&` +
        `q=name='${BACKUP_FILENAME}'&` +
        `fields=files(id,name,modifiedTime,size)`,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('Find file error:', response.status, errText);
        throw new Error(`Lỗi tìm file (${response.status})`);
    }

    const data = await response.json();
    console.log('🔍 Found files:', data.files?.length, data.files);
    return data.files?.[0] || null;
}

async function createDriveFile(content) {
    const accessToken = getAccessToken();

    const metadata = {
        name: BACKUP_FILENAME,
        parents: [BACKUP_FOLDER],
        mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('Create file error:', response.status, errText);
        throw new Error(`Lỗi tạo file (${response.status})`);
    }

    return response.json();
}

async function updateDriveFile(fileId, content) {
    const accessToken = getAccessToken();

    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('Update file error:', response.status, errText);
        throw new Error(`Lỗi cập nhật file (${response.status})`);
    }

    return response.json();
}

async function downloadDriveFile(fileId) {
    const accessToken = getAccessToken();

    console.log('⬇️ Downloading file:', fileId);

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );

    console.log('⬇️ Download response status:', response.status);
    console.log('⬇️ Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
        const errText = await response.text();
        console.error('Download error:', response.status, errText);
        throw new Error(`Lỗi tải file (${response.status})`);
    }

    const text = await response.text();
    console.log('⬇️ Raw response length:', text.length);
    console.log('⬇️ Raw response preview:', text.substring(0, 300));

    try {
        const parsed = JSON.parse(text);
        return parsed;
    } catch (parseErr) {
        console.error('JSON parse error:', parseErr.message);
        console.error('Raw text (first 500):', text.substring(0, 500));
        throw new Error('File sao lưu không phải JSON hợp lệ');
    }
}

/* ===== GET BACKUP INFO ===== */
export async function getBackupInfo() {
    if (!isGoogleSignedIn()) return null;

    try {
        const file = await findBackupFile();
        if (file) {
            return { lastBackup: file.modifiedTime, fileId: file.id };
        }
    } catch (error) {
        console.error('Get backup info error:', error);
    }
    return null;
}

/* ===== UI UPDATE ===== */
async function updateLastBackupUI() {
    const info = await getBackupInfo();
    const lastBackupEl = document.getElementById('last-backup-time');

    if (lastBackupEl && info) {
        lastBackupEl.textContent = new Date(info.lastBackup).toLocaleString('vi-VN');
    }
}

/* ===== DELETE BACKUP ===== */
export async function deleteBackup() {
    if (!isGoogleSignedIn()) {
        showToast('Vui lòng đăng nhập Google trước', 'warning');
        return false;
    }

    return new Promise((resolve) => {
        const doDelete = async () => {
            try {
                const file = await findBackupFile();
                if (!file) {
                    showToast('Không có bản sao lưu để xóa', 'info');
                    resolve(false);
                    return;
                }

                const accessToken = getAccessToken();
                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${file.id}`,
                    {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    }
                );

                if (!response.ok) throw new Error('Delete failed');
                showToast('Đã xóa bản sao lưu', 'success');
                resolve(true);
            } catch (error) {
                console.error('Delete backup error:', error);
                showToast('Xóa thất bại: ' + error.message, 'error');
                resolve(false);
            }
        };

        if (typeof window.showConfirm === 'function') {
            window.showConfirm({
                title: 'Xóa bản sao lưu',
                message: 'Xóa bản sao lưu trên Google Drive?',
                submessage: 'Hành động này không thể hoàn tác.',
                type: 'danger',
                confirmText: 'Xóa',
                icon: 'fas fa-trash',
                onConfirm: doDelete,
                onCancel: () => resolve(false)
            });
        } else {
            if (confirm('Xóa bản sao lưu trên Google Drive?')) {
                doDelete();
            } else {
                resolve(false);
            }
        }
    });
}

/* ===== INIT ===== */
export function initDriveBackup() {
    window.addEventListener('volearn:googleSignedIn', () => updateLastBackupUI());
    console.log('✅ Drive backup module initialized');
}

/* ===== EXPORTS ===== */
window.backupToDrive = backupToDrive;
window.restoreFromDrive = restoreFromDrive;
window.deleteBackup = deleteBackup;
