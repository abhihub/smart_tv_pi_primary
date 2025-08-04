let updateInfo = null;
let downloadedFilePath = null;

// Configuration
const CONFIG = {
    SERVER_URL: 'http://100.124.6.99:3001',
    SYSTEM_SERVER_URL: 'http://127.0.0.1:5000',
    APP_VERSION: '1.0.2' // Default version, will be updated from Electron
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
    progressBar: document.getElementById('progressBar'),
    loadingSpinner: document.getElementById('loadingSpinner'),
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
    
    // Load and display device information
    await loadDeviceInfo();
    
    // Set up progress listener
    if (window.electronAPI) {
        window.electronAPI.onUpdateProgress((event, progress) => {
            // Show progress bar and hide spinner when we have actual progress
            if (progress > 0) {
                elements.loadingSpinner.style.display = 'none';
                elements.progressBar.style.display = 'block';
                elements.progressText.style.display = 'block';
                elements.progressFill.style.width = `${progress}%`;
                elements.progressText.textContent = `${progress}%`;
            }
        });
    }
    
    // Auto-check for updates on page load
    checkForUpdates();
});

function goBack() {
    window.history.back();
}

async function loadDeviceInfo() {
    if (!window.electronAPI) {
        console.log('Device info not available (not running in Electron)');
        return;
    }
    
    try {
        console.log('🆔 Loading device information...');
        const deviceInfo = await window.electronAPI.getDeviceInfo();
        
        if (deviceInfo && deviceInfo.device_id) {
            // Find or create device info display element
            let deviceInfoElement = document.getElementById('deviceInfo');
            if (!deviceInfoElement) {
                // Create device info section if it doesn't exist
                const settingsContainer = document.querySelector('.settings-container');
                if (settingsContainer) {
                    const deviceSection = document.createElement('div');
                    deviceSection.className = 'setting-item';
                    deviceSection.innerHTML = `
                        <h3>Device Information</h3>
                        <div id="deviceInfo" class="device-info">
                            <p><strong>Device ID:</strong> <span id="deviceId">Loading...</span></p>
                            <p><strong>Hostname:</strong> <span id="deviceHostname">Loading...</span></p>
                            <p><strong>Registered:</strong> <span id="deviceRegistered">Loading...</span></p>
                        </div>
                    `;
                    settingsContainer.appendChild(deviceSection);
                    deviceInfoElement = document.getElementById('deviceInfo');
                }
            }
            
            // Update device info display
            const deviceIdElement = document.getElementById('deviceId');
            const hostnameElement = document.getElementById('deviceHostname');  
            const registeredElement = document.getElementById('deviceRegistered');
            
            if (deviceIdElement) {
                deviceIdElement.textContent = deviceInfo.device_id;
            }
            
            if (hostnameElement && deviceInfo.hostname) {
                hostnameElement.textContent = deviceInfo.hostname;
            }
            
            if (registeredElement && deviceInfo.generated_at) {
                const registeredDate = new Date(deviceInfo.generated_at);
                registeredElement.textContent = registeredDate.toLocaleDateString();
            }
            
            console.log('✅ Device info loaded:', deviceInfo.device_id);
        }
    } catch (error) {
        console.log('⚠️ Could not load device info:', error);
        // Don't show error to user, just log it
    }
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
            
            let updateBadges = '';
            if (data.important) {
                updateBadges += '<span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px; font-size: 12px;">IMPORTANT - REQUIRES REBOOT</span>';
            }
            
            elements.releaseNotes.innerHTML = `
                <h3>What's New in v${data.latestVersion}</h3>
                ${updateBadges ? `<div style="margin: 8px 0;">${updateBadges}</div>` : ''}
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
    elements.modalTitle.textContent = 'Processing Update';
    elements.modalMessage.textContent = `Starting download, install, and shutdown for v${updateInfo.latestVersion}...`;
    
    try {
        const downloadUrl = `${CONFIG.SERVER_URL}${updateInfo.downloadUrl}`;
        
        // Call system manager to download, install, and shutdown in one go
        const response = await fetch(`${CONFIG.SYSTEM_SERVER_URL}/api/system/download-and-install`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                downloadUrl: downloadUrl,
                version: updateInfo.latestVersion,
                confirm: true
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`System manager error: ${errorData.error}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error('System manager failed to initiate update process');
        }
        
        console.log('Update process initiated:', result);
        elements.modalTitle.textContent = 'Update In Progress';
        elements.modalMessage.textContent = 'Download, installation, and shutdown initiated. The system will automatically download the update, install it, and shutdown. Please wait...';
        
        // Hide spinner and show completed initiation
        elements.loadingSpinner.style.display = 'none';
        elements.progressBar.style.display = 'block';
        elements.progressFill.style.width = '100%';
        elements.progressText.style.display = 'block';
        elements.progressText.textContent = 'Update Process Started';
        
        // Hide the install button since everything happens automatically
        elements.installBtn.style.display = 'none';
        
        // Auto-close modal after showing message
        setTimeout(() => {
            closeModal();
        }, 5000);
        
    } catch (error) {
        console.error('Update process error:', error);
        elements.modalTitle.textContent = 'Update Failed';
        elements.modalMessage.textContent = `Failed to start update process: ${error.message}`;
        // Hide spinner and show error state
        elements.loadingSpinner.style.display = 'none';
        elements.progressBar.style.display = 'none';
        elements.progressText.style.display = 'none';
        elements.modalCloseBtn.style.display = 'inline-block';
    }
}

// DISABLED: Installation now handled by system manager in single call
// async function installUpdate() {
//     if (!downloadedFilePath) {
//         alert('No update file downloaded.');
//         return;
//     }
//     
//     elements.modalTitle.textContent = 'Installing Update';
//     elements.modalMessage.textContent = 'Installing the update via system manager...';
//     elements.installBtn.style.display = 'none';
//     // Show spinner during installation
//     elements.loadingSpinner.style.display = 'block';
//     elements.progressBar.style.display = 'none';
//     elements.progressText.style.display = 'none';
//     
//     try {
//         // First verify the package with the system manager
//         const verifyResponse = await fetch(`${CONFIG.SYSTEM_SERVER_URL}/api/system/verify-package`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 packagePath: downloadedFilePath
//             })
//         });
//         
//         if (!verifyResponse.ok) {
//             const verifyError = await verifyResponse.json();
//             throw new Error(`Package verification failed: ${verifyError.error}`);
//         }
//         
//         const verifyData = await verifyResponse.json();
//         if (!verifyData.success || !verifyData.valid) {
//             throw new Error('Package verification failed: Invalid package');
//         }
//         
//         console.log('Package verified:', verifyData.packageInfo);
//         
//         // Now install the package
//         const installResponse = await fetch(`${CONFIG.SYSTEM_SERVER_URL}/api/system/install-update`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 packagePath: downloadedFilePath,
//                 confirm: true,
//                 restartApp: true
//             })
//         });
//         
//         if (!installResponse.ok) {
//             const installError = await installResponse.json();
//             throw new Error(`Installation failed: ${installError.error}`);
//         }
//         
//         const installData = await installResponse.json();
//         if (!installData.success) {
//             throw new Error('Installation failed: Unknown error');
//         }
//         
//         console.log('Installation initiated:', installData);
//         elements.modalTitle.textContent = 'Installation Complete';
//         elements.modalMessage.textContent = 'Update installed successfully. The device will shutdown automatically to complete the update.';
//         
//         // Trigger device shutdown after successful installation
//         setTimeout(async () => {
//             try {
//                 const shutdownResponse = await fetch(`${CONFIG.SYSTEM_SERVER_URL}/api/system/shutdown`, {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify({
//                         confirm: true,
//                         delay: 5  // 5 second delay to allow UI to show message
//                     })
//                 });
//                 
//                 if (shutdownResponse.ok) {
//                     elements.modalMessage.textContent = 'Update complete. Device will shutdown in 5 seconds...';
//                 } else {
//                     console.error('Failed to initiate shutdown');
//                     elements.modalMessage.textContent = 'Update complete. Please shutdown the device manually.';
//                 }
//             } catch (error) {
//                 console.error('Shutdown request failed:', error);
//                 elements.modalMessage.textContent = 'Update complete. Please shutdown the device manually.';
//             }
//         }, 2000);
//         
//         // Close modal after showing shutdown message
//         setTimeout(() => {
//             closeModal();
//         }, 8000);
//         
//     } catch (error) {
//         console.error('Installation error:', error);
//         elements.modalTitle.textContent = 'Installation Failed';
//         elements.modalMessage.textContent = `Failed to install update: ${error.message}`;
//         // Hide spinner and show error state
//         elements.loadingSpinner.style.display = 'none';
//         elements.progressBar.style.display = 'none';
//         elements.progressText.style.display = 'none';
//         elements.modalCloseBtn.style.display = 'inline-block';
//     }
// }

function showModal() {
    elements.updateModal.style.display = 'block';
    // Show spinner initially, hide progress bar
    elements.loadingSpinner.style.display = 'block';
    elements.progressBar.style.display = 'none';
    elements.progressText.style.display = 'none';
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = 'Preparing download...';
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
                // Install button removed - only close button available
                if (elements.modalCloseBtn.style.display !== 'none') {
                    closeModal();
                }
            }
            break;
    }
});
