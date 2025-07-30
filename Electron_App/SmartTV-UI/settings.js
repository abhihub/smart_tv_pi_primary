let updateInfo = null;
let downloadedFilePath = null;

// Configuration
const CONFIG = {
    SERVER_URL: 'http://localhost:3001',
    SYSTEM_SERVER_URL: 'http://127.0.0.1:5000',
    APP_VERSION: '1.0.0' // Default version, will be updated from Electron
};

// DOM Elements
const elements = {
    currentVersion: document.getElementById('currentVersion'),
    updateStatus: document.getElementById('updateStatus'),
    checkUpdatesBtn: document.getElementById('checkUpdatesBtn'),
    updateAvailable: document.getElementById('updateAvailable'),
    releaseNotes: document.getElementById('releaseNotes'),
    downloadUpdateBtn: document.getElementById('downloadUpdateBtn'),
    updateModal: document.getElementById('updateModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    installBtn: document.getElementById('installBtn'),
    appVersion: document.getElementById('appVersion')
};

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Get actual app version from Electron if available, otherwise use config
    let appVersion = CONFIG.APP_VERSION;
    
    if (window.electronAPI) {
        try {
            const actualVersion = await window.electronAPI.getAppVersion();
            appVersion = actualVersion;
            CONFIG.APP_VERSION = actualVersion;
        } catch (error) {
            console.warn('Could not get app version from Electron:', error);
        }
    }
    
    // Always display the version immediately
    elements.currentVersion.textContent = `Current Version: ${appVersion}`;
    elements.appVersion.textContent = `Version: ${appVersion}`;
    
    // Set up progress listener
    if (window.electronAPI) {
        window.electronAPI.onUpdateProgress((event, progress) => {
            elements.progressFill.style.width = `${progress}%`;
            elements.progressText.textContent = `${progress}%`;
        });
    }
    
    // Auto-check for updates on page load
    checkForUpdates();
});

function goBack() {
    window.history.back();
}

async function checkForUpdates() {
    try {
        elements.checkUpdatesBtn.disabled = true;
        elements.updateStatus.textContent = 'Checking for updates...';
        elements.updateStatus.className = 'update-status';
        
        const response = await fetch(`${CONFIG.SERVER_URL}/api/updates/check?version=${CONFIG.APP_VERSION}`);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        updateInfo = data;
        
        if (data.hasUpdate) {
            elements.updateStatus.textContent = `Update available: v${data.latestVersion}`;
            elements.updateStatus.className = 'update-status update-available';
            
            elements.releaseNotes.innerHTML = `
                <h3>What's New in v${data.latestVersion}</h3>
                <p><strong>Release Date:</strong> ${new Date(data.releaseDate).toLocaleDateString()}</p>
                <p><strong>File Size:</strong> ${formatFileSize(data.fileSize)}</p>
                <div><strong>Release Notes:</strong></div>
                <div>${data.releaseNotes || 'No release notes available.'}</div>
            `;
            
            elements.updateAvailable.style.display = 'block';
        } else {
            elements.updateStatus.textContent = 'You have the latest version';
            elements.updateStatus.className = 'update-status update-current';
            elements.updateAvailable.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        elements.updateStatus.textContent = 'Failed to check for updates. Please check your internet connection.';
        elements.updateStatus.className = 'update-status';
    } finally {
        elements.checkUpdatesBtn.disabled = false;
    }
}

async function downloadUpdate() {
    if (!updateInfo || !updateInfo.hasUpdate) {
        alert('No update available to download.');
        return;
    }
    
    showModal();
    elements.modalTitle.textContent = 'Downloading Update';
    elements.modalMessage.textContent = `Downloading v${updateInfo.latestVersion}...`;
    
    try {
        const downloadUrl = `${CONFIG.SERVER_URL}${updateInfo.downloadUrl}`;
        
        // Use Electron's shell module to download file
        if (window.electronAPI) {
            const result = await window.electronAPI.downloadUpdate(downloadUrl, updateInfo.latestVersion);
            
            if (result.success) {
                downloadedFilePath = result.filePath;
                elements.modalTitle.textContent = 'Download Complete';
                elements.modalMessage.textContent = 'Update downloaded successfully. Ready to install.';
                elements.progressFill.style.width = '100%';
                elements.progressText.textContent = '100%';
                elements.installBtn.style.display = 'inline-block';
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } else {
            // Fallback for browser testing
            elements.modalTitle.textContent = 'Download Complete';
            elements.modalMessage.textContent = 'Update would be downloaded in the Electron app.';
            elements.progressFill.style.width = '100%';
            elements.progressText.textContent = '100%';
            elements.modalCloseBtn.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Download error:', error);
        elements.modalTitle.textContent = 'Download Failed';
        elements.modalMessage.textContent = `Failed to download update: ${error.message}`;
        elements.modalCloseBtn.style.display = 'inline-block';
    }
}

async function installUpdate() {
    if (!downloadedFilePath) {
        alert('No update file downloaded.');
        return;
    }
    
    elements.modalTitle.textContent = 'Installing Update';
    elements.modalMessage.textContent = 'Installing the update via system manager. The application will restart automatically.';
    elements.installBtn.style.display = 'none';
    
    try {
        // First verify the package with the system manager
        const verifyResponse = await fetch(`${CONFIG.SYSTEM_SERVER_URL}/api/system/verify-package`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                packagePath: downloadedFilePath
            })
        });
        
        if (!verifyResponse.ok) {
            const verifyError = await verifyResponse.json();
            throw new Error(`Package verification failed: ${verifyError.error}`);
        }
        
        const verifyData = await verifyResponse.json();
        if (!verifyData.success || !verifyData.valid) {
            throw new Error('Package verification failed: Invalid package');
        }
        
        console.log('Package verified:', verifyData.packageInfo);
        
        // Now install the package
        const installResponse = await fetch(`${CONFIG.SYSTEM_SERVER_URL}/api/system/install-update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                packagePath: downloadedFilePath,
                confirm: true,
                restartApp: true
            })
        });
        
        if (!installResponse.ok) {
            const installError = await installResponse.json();
            throw new Error(`Installation failed: ${installError.error}`);
        }
        
        const installData = await installResponse.json();
        if (!installData.success) {
            throw new Error('Installation failed: Unknown error');
        }
        
        console.log('Installation initiated:', installData);
        elements.modalTitle.textContent = 'Installation Started';
        elements.modalMessage.textContent = 'Update installation initiated successfully. The application will restart automatically when complete.';
        
        // Close modal after a delay since the app will restart
        setTimeout(() => {
            closeModal();
        }, 3000);
        
    } catch (error) {
        console.error('Installation error:', error);
        elements.modalTitle.textContent = 'Installation Failed';
        elements.modalMessage.textContent = `Failed to install update: ${error.message}`;
        elements.modalCloseBtn.style.display = 'inline-block';
    }
}

function showModal() {
    elements.updateModal.style.display = 'block';
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '0%';
    elements.modalCloseBtn.style.display = 'none';
    elements.installBtn.style.display = 'none';
}

function closeModal() {
    elements.updateModal.style.display = 'none';
    downloadedFilePath = null;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    switch(event.code) {
        case 'Escape':
            if (elements.updateModal.style.display === 'block') {
                closeModal();
            } else {
                goBack();
            }
            break;
        case 'Enter':
            if (elements.updateModal.style.display === 'block') {
                if (elements.installBtn.style.display !== 'none') {
                    installUpdate();
                } else if (elements.modalCloseBtn.style.display !== 'none') {
                    closeModal();
                }
            }
            break;
    }
});