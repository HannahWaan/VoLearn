/* ========================================
   VoLearn - Google Drive Authentication
   ======================================== */

// Google API Config
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

/* ===== STATE ===== */
export let accessToken = null;
export let isSignedIn = false;

/* ===== INIT DRIVE ===== */
export function initDrive() {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    apiKey: API_KEY,
                    clientId: CLIENT_ID,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES
                });

                // Listen for sign-in state changes
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
                
                // Handle initial sign-in state
                updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                
                console.log('✅ Google Drive initialized');
                resolve(true);
            } catch (error) {
                console.error('❌ Google Drive init error:', error);
                reject(error);
            }
        });
    });
}

/* ===== UPDATE SIGN IN STATUS ===== */
function updateSignInStatus(signedIn) {
    isSignedIn = signedIn;
    
    if (signedIn) {
        const user = gapi.auth2.getAuthInstance().currentUser.get();
        accessToken = user.getAuthResponse().access_token;
        
        // Update UI
        updateDriveUI(true, user.getBasicProfile().getName());
    } else {
        accessToken = null;
        updateDriveUI(false);
    }
}

/* ===== LOGIN GOOGLE ===== */
export function loginGoogle() {
    if (!gapi.auth2) {
        window.showToast?.('Google API chưa sẵn sàng. Vui lòng thử lại.', 'warning');
        return;
    }
    
    gapi.auth2.getAuthInstance().signIn().then(() => {
        window.showToast?.('Đăng nhập Google thành công!', 'success');
    }).catch((error) => {
        console.error('Login error:', error);
        window.showToast?.('Đăng nhập thất bại', 'error');
    });
}

/* ===== LOGOUT GOOGLE ===== */
export function logoutGoogle() {
    if (!gapi.auth2) return;
    
    gapi.auth2.getAuthInstance().signOut().then(() => {
        window.showToast?.('Đã đăng xuất', 'info');
    });
}

/* ===== UPDATE DRIVE UI ===== */
function updateDriveUI(signedIn, userName = '') {
    const loginBtn = document.getElementById('btn-google-login');
    const logoutBtn = document.getElementById('btn-google-logout');
    const userInfo = document.getElementById('google-user-info');
    const backupBtns = document.querySelectorAll('.drive-action-btn');
    
    if (signedIn) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userInfo) userInfo.textContent = `Đã kết nối: ${userName}`;
        backupBtns.forEach(btn => btn.disabled = false);
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.textContent = 'Chưa đăng nhập';
        backupBtns.forEach(btn => btn.disabled = true);
    }
}

/* ===== CHECK SIGNED IN ===== */
export function checkSignedIn() {
    return isSignedIn;
}

/* ===== GET ACCESS TOKEN ===== */
export function getAccessToken() {
    return accessToken;
}

/* ===== EXPORTS ===== */
window.loginGoogle = loginGoogle;
window.logoutGoogle = logoutGoogle;
window.initDrive = initDrive;
