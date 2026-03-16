/* ===== GOOGLE DRIVE AUTH + AUTO LOGIN ===== */
/* VoLearn v2.1.0 */

import { showToast } from '../ui/toast.js';

/* ===== CONFIG ===== */
const CLIENT_ID = '1053065016561-s84rn7tjsrc16a31s0b7mhs6kg140rvm.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const TOKEN_KEY = 'volearn_google_token';

/* ===== STATE ===== */
let accessToken = null;
let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let isSignedIn = false;

/* ===== INIT ===== */
export async function initDrive() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            console.warn('Google API not loaded - Drive sync disabled');
            resolve(false);
            return;
        }

        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    discoveryDocs: DISCOVERY_DOCS
                });
                gapiInited = true;
                console.log('✅ GAPI client initialized');
                checkReadyAndAutoLogin();
                resolve(true);
            } catch (error) {
                console.error('GAPI init error:', error);
                reject(error);
            }
        });

        if (typeof google !== 'undefined' && google.accounts) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: handleTokenResponse
            });
            gisInited = true;
            console.log('✅ GIS initialized');
            checkReadyAndAutoLogin();
        }
    });
}

/* ===== Kiểm tra sẵn sàng rồi thử auto login ===== */
function checkReadyAndAutoLogin() {
    if (!gapiInited || !gisInited) return;

    // Thử đọc token đã lưu từ lần trước
    try {
        const saved = localStorage.getItem(TOKEN_KEY);
        if (!saved) {
            updateAuthUI();
            return;
        }

        const tokenData = JSON.parse(saved);
        const now = Date.now();

        // Token còn hạn? (trừ 5 phút buffer)
        if (tokenData.expires_at && now < tokenData.expires_at - 300000) {
            // Còn hạn → dùng luôn
            accessToken = tokenData.access_token;
            gapi.client.setToken({ access_token: accessToken });
            isSignedIn = true;
            console.log('✅ Auto login thành công');
            updateAuthUI();
            window.dispatchEvent(new CustomEvent('volearn:googleSignedIn', { detail: { accessToken } }));
        } else {
            // Hết hạn → thử refresh im lặng
            console.log('🔄 Token hết hạn, thử refresh...');
            tokenClient.requestAccessToken({ prompt: '' });
        }
    } catch (e) {
        console.warn('Auto login failed:', e);
        localStorage.removeItem(TOKEN_KEY);
        updateAuthUI();
    }
}

/* ===== LOGIN (bấm nút) ===== */
export function loginGoogle() {
    if (!tokenClient) {
        showToast('Google API chưa sẵn sàng', 'error');
        return;
    }

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

/* ===== XỬ LÝ KHI NHẬN TOKEN ===== */
function handleTokenResponse(response) {
    if (response.error !== undefined) {
        console.error('Token error:', response);

        // Nếu refresh im lặng thất bại → không báo lỗi, chỉ xóa token cũ
        if (response.error === 'interaction_required' || 
            response.error === 'consent_required' ||
            response.error === 'access_denied') {
            localStorage.removeItem(TOKEN_KEY);
            updateAuthUI();
            return;
        }

        showToast('Đăng nhập thất bại', 'error');
        return;
    }

    // Đăng nhập thành công
    accessToken = response.access_token;
    isSignedIn = true;

    // Lưu token + thời gian hết hạn vào localStorage
    const tokenData = {
        access_token: response.access_token,
        expires_at: Date.now() + (response.expires_in * 1000)
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));

    console.log('✅ Google logged in');
    showToast('Đã đăng nhập Google', 'success');
    updateAuthUI();

    window.dispatchEvent(new CustomEvent('volearn:googleSignedIn', { detail: { accessToken } }));
}

/* ===== LOGOUT ===== */
export function logoutGoogle() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
            isSignedIn = false;
            localStorage.removeItem(TOKEN_KEY);
            console.log('✅ Google logged out');
            showToast('Đã đăng xuất Google', 'info');
            updateAuthUI();
        });
    }
}

/* ===== CẬP NHẬT GIAO DIỆN ===== */
function updateAuthUI() {
    const loginBtn = document.getElementById('btn-google-login');
    const logoutBtn = document.getElementById('btn-google-logout');
    const syncSection = document.getElementById('google-sync-section');
    const statusEl = document.getElementById('google-status');

    if (loginBtn) loginBtn.style.display = isSignedIn ? 'none' : 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = isSignedIn ? 'inline-flex' : 'none';
    if (syncSection) syncSection.style.display = isSignedIn ? 'block' : 'none';
    if (statusEl) {
        statusEl.innerHTML = isSignedIn
            ? '<i class="fas fa-check-circle text-success"></i> Đã kết nối'
            : '<i class="fas fa-times-circle text-muted"></i> Chưa kết nối';
    }
}

/* ===== GETTERS ===== */
export function getAccessToken() {
    return accessToken;
}

export function isGoogleSignedIn() {
    return isSignedIn;
}

export function isGapiReady() {
    return gapiInited && gisInited;
}

export { accessToken };

window.loginGoogle = loginGoogle;
window.logoutGoogle = logoutGoogle;
