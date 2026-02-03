/* ===== GOOGLE DRIVE BACKUP ===== */
/* VoLearn v2.1.0 - Backup & Restore to Google Drive */

import { getAccessToken, isGoogleSignedIn, loginGoogle } from './gdriveAuth.js';
import { appData } from '../core/state.js';
import { setAppData } from '../core/state.js';
import { saveData } from '../core/storage.js';
import { showToast } from '../ui/toast.js';

/* ===== CONFIG ===== */
const BACKUP_FILENAME = 'volearn_backup.json';
const BACKUP_FOLDER = 'appDataFolder'; // Use app-specific folder

/* ===== BACKUP ===== */
export async function backupToDrive() {
    if (!isGoogleSignedIn()) {
        showToast('Vui lòng đăng nhập Google trước', 'warning');
        loginGoogle();
        return false;
    }

    try {
        showToast('Đang sao lưu...', 'info');

        const accessToken = getAccessToken();
        const backupData = {
            ...appData,
            backupDate: new Date().toISOString(),
            version: '2.1.0'
        };

        // Check if backup file exists
        const existingFile = await findBackupFile();
        
        if (existingFile) {
            // Update existing file
            await updateDriveFile(existingFile.id, backupData);
        } else {
            // Create new file
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
        showToast('Đang khôi phục...', 'info');

        const existingFile = await findBackupFile();
        
        if (!existingFile) {
            showToast('Không tìm thấy bản sao lưu!', 'warning');
            return false;
        }

        // Download file content
        const content = await downloadDriveFile(existingFile.id);
        
        if (!content || !content.vocabulary) {
            showToast('Dữ liệu sao lưu không hợp lệ!', 'error');
            return false;
        }

        // Confirm restore
        const confirmed = confirm(
            `Khôi phục dữ liệu từ ${new Date(content.backupDate).toLocaleString()}?\n` +
            `Dữ liệu hiện tại sẽ bị thay thế.`
        );

        if (!confirmed) return false;

        // Restore data
        setAppData(content);
        saveData(content);

        showToast('Khôi phục thành công!', 'success');
        
        // Reload page to apply changes
        setTimeout(() => window.location.reload(), 1000);
        return true;

    } catch (error) {
        console.error('Restore error:', error);
        showToast('Khôi phục thất bại: ' + error.message, 'error');
        return false;
    }
}

/* ===== DRIVE API HELPERS ===== */
async function findBackupFile() {
    const accessToken = getAccessToken();
    
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `spaces=${BACKUP_FOLDER}&` +
        `q=name='${BACKUP_FILENAME}'&` +
        `fields=files(id,name,modifiedTime)`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to search files');
    }

    const data = await response.json();
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
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: form
        }
    );

    if (!response.ok) {
        throw new Error('Failed to create file');
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
        throw new Error('Failed to update file');
    }

    return response.json();
}

async function downloadDriveFile(fileId) {
    const accessToken = getAccessToken();
    
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to download file');
    }

    return response.json();
}

/* ===== GET BACKUP INFO ===== */
export async function getBackupInfo() {
    if (!isGoogleSignedIn()) {
        return null;
    }

    try {
        const file = await findBackupFile();
        if (file) {
            return {
                lastBackup: file.modifiedTime,
                fileId: file.id
            };
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
        const date = new Date(info.lastBackup);
        lastBackupEl.textContent = date.toLocaleString('vi-VN');
    }
}

/* ===== DELETE BACKUP ===== */
export async function deleteBackup() {
    if (!isGoogleSignedIn()) {
        showToast('Vui lòng đăng nhập Google trước', 'warning');
        return false;
    }

    const confirmed = confirm('Xóa bản sao lưu trên Google Drive?');
    if (!confirmed) return false;

    try {
        const file = await findBackupFile();
        if (!file) {
            showToast('Không có bản sao lưu để xóa', 'info');
            return false;
        }

        const accessToken = getAccessToken();
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }

        showToast('Đã xóa bản sao lưu', 'success');
        return true;

    } catch (error) {
        console.error('Delete backup error:', error);
        showToast('Xóa thất bại: ' + error.message, 'error');
        return false;
    }
}

/* ===== INIT ===== */
export function initDriveBackup() {
    // Update UI when signed in
    window.addEventListener('volearn:googleSignedIn', () => {
        updateLastBackupUI();
    });
    
    console.log('✅ Drive backup module initialized');
}

/* ===== EXPORTS ===== */
window.backupToDrive = backupToDrive;
window.restoreFromDrive = restoreFromDrive;
window.deleteBackup = deleteBackup;
