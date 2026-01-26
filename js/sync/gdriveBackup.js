/* ========================================
   VoLearn - Google Drive Backup/Restore
   ======================================== */

import { accessToken, checkSignedIn } from './gdriveAuth.js';
import { appData, setAppData } from '../core/state.js';
import { saveData } from '../core/storage.js';

const BACKUP_FILENAME = 'volearn_backup.json';
const BACKUP_FOLDER = 'VoLearn Backups';

/* ===== BACKUP TO DRIVE ===== */
export async function backupToDrive() {
    if (!checkSignedIn()) {
        window.showToast?.('Vui lòng đăng nhập Google trước', 'warning');
        return false;
    }

    try {
        window.showToast?.('Đang sao lưu...', 'info');

        // Get or create backup folder
        const folderId = await getOrCreateFolder(BACKUP_FOLDER);
        
        // Create backup content
        const backupData = {
            ...appData,
            backupDate: new Date().toISOString(),
            version: '2.1.0'
        };
        const content = JSON.stringify(backupData, null, 2);

        // Check if backup file exists
        const existingFileId = await findFile(BACKUP_FILENAME, folderId);
        
        if (existingFileId) {
            // Update existing file
            await updateFile(existingFileId, content);
        } else {
            // Create new file
            await createFile(BACKUP_FILENAME, content, folderId);
        }

        window.showToast?.('Sao lưu thành công!', 'success');
        return true;
    } catch (error) {
        console.error('Backup error:', error);
        window.showToast?.('Sao lưu thất bại: ' + error.message, 'error');
        return false;
    }
}

/* ===== RESTORE FROM DRIVE ===== */
export async function restoreFromDrive() {
    if (!checkSignedIn()) {
        window.showToast?.('Vui lòng đăng nhập Google trước', 'warning');
        return false;
    }

    try {
        window.showToast?.('Đang khôi phục...', 'info');

        // Find backup folder
        const folderId = await findFolder(BACKUP_FOLDER);
        if (!folderId) {
            window.showToast?.('Không tìm thấy bản sao lưu', 'warning');
            return false;
        }

        // Find backup file
        const fileId = await findFile(BACKUP_FILENAME, folderId);
        if (!fileId) {
            window.showToast?.('Không tìm thấy bản sao lưu', 'warning');
            return false;
        }

        // Download file content
        const content = await downloadFile(fileId);
        const backupData = JSON.parse(content);

        // Confirm restore
        if (!confirm(`Khôi phục dữ liệu từ ${new Date(backupData.backupDate).toLocaleString('vi-VN')}?\n\nDữ liệu hiện tại sẽ bị ghi đè.`)) {
            return false;
        }

        // Restore data
        delete backupData.backupDate;
        delete backupData.version;
        
        setAppData(backupData);
        saveData(backupData);

        window.showToast?.('Khôi phục thành công!', 'success');
        
        // Reload page
        setTimeout(() => location.reload(), 1000);
        return true;
    } catch (error) {
        console.error('Restore error:', error);
        window.showToast?.('Khôi phục thất bại: ' + error.message, 'error');
        return false;
    }
}

/* ===== HELPER FUNCTIONS ===== */

async function getOrCreateFolder(name) {
    let folderId = await findFolder(name);
    if (!folderId) {
        folderId = await createFolder(name);
    }
    return folderId;
}

async function findFolder(name) {
    const response = await gapi.client.drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
    });
    return response.result.files?.[0]?.id || null;
}

async function createFolder(name) {
    const response = await gapi.client.drive.files.create({
        resource: {
            name: name,
            mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
    });
    return response.result.id;
}

async function findFile(name, folderId) {
    const response = await gapi.client.drive.files.list({
        q: `name='${name}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
    });
    return response.result.files?.[0]?.id || null;
}

async function createFile(name, content, folderId) {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const metadata = {
        name: name,
        mimeType: 'application/json',
        parents: [folderId]
    };

    const multipartBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelim;

    const response = await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        body: multipartBody
    });

    return response.result.id;
}

async function updateFile(fileId, content) {
    await gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'media' },
        headers: {
            'Content-Type': 'application/json'
        },
        body: content
    });
}

async function downloadFile(fileId) {
    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });
    return response.body;
}

/* ===== EXPORTS ===== */
window.backupToDrive = backupToDrive;
window.restoreFromDrive = restoreFromDrive;
