/* ===== GOOGLE DRIVE AUTH ===== */
/* VoLearn v2 - Google Drive Authentication */

import { showToast } from '../ui/toast.js';

/* ===== CONFIG ===== */
// Replace with your actual Google Client ID
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

/* ===== STATE ===== */
let accessToken = null;
let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let isSignedIn = false;

/* ===== INIT ===== */
export async function initDrive() {
    return new Promise((resolve, reject) => {
        // Check if Google APIs are loaded
        if (typeof gapi === 'undefined') {
            console.warn('Google API not loaded - Drive sync disabled');
            resolve(false);
            return;
        }

        // Initialize GAPI client
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    discoveryDocs: DISCOVERY_DOCS
                });
                gapiInited = true;
                console.log('✅ GAPI client initialized');
                maybeEnableButtons();
                resolve(true);
            } catch (error) {
                console.error('GAPI init error:', error);
                reject(error);
            }
        });

        // Initialize Google Identity Services
        if (typeof google !== 'undefined' && google.accounts) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: handleTokenResponse
            });
            gisInited = true;
            console.log('✅ GIS initialized');
            maybeEnableButtons();
        }
    });
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        updateAuthUI();
    }
}

/* ===== LOGIN ===== */
export function loginGoogle() {
    if (!tokenClient) {
        showToast('Google API chưa sẵn sàng', 'error');
        return;
    }

    if (accessToken === null) {
        // Prompt user to select account and consent
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip consent if already have token
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

function handleTokenResponse(response) {
    if (response.error !== undefined) {
        console.error('Token error:', response);
        showToast('Đăng nhập thất bại', 'error');
        return;
    }

    accessToken = response.access_token;
    isSignedIn = true;
    
    console.log('✅ Google logged in');
    showToast('Đã đăng nhập Google', 'success');
    updateAuthUI();
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('volearn:googleSignedIn', { detail: { accessToken } }));
}

/* ===== LOGOUT ===== */
export function logoutGoogle() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
            isSignedIn = false;
            console.log('✅ Google logged out');
            showToast('Đã đăng xuất Google', 'info');
            updateAuthUI();
        });
    }
}

/* ===== UI UPDATE ===== */
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

/* ===== EXPORTS ===== */
export { accessToken };

window.loginGoogle = loginGoogle;
window.logoutGoogle = logoutGoogle;
