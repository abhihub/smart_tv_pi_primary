console.log('Preload script starting...');

const { contextBridge, ipcRenderer } = require('electron');

// Make config available immediately from global
const appConfig = global.appConfig || {
    SERVER_URL: process.env.SERVER_URL || 'http://167.71.0.87:3001',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
    isDevelopment: process.env.NODE_ENV === 'development'
};

// Expose environment variables to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    getEnvVariable: (name) => {
        return process.env[name];
    },
    getAppConfig: () => appConfig,
    downloadUpdate: (url, version) => ipcRenderer.invoke('download-update', url, version),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

// Inject config immediately into the DOM when it's ready
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Preload: DOMContentLoaded, injecting config');
    window.appConfig = appConfig;
    
    // Dispatch config ready event immediately
    window.dispatchEvent(new CustomEvent('configReady', { detail: appConfig }));
    console.log('📋 Preload: Config injected and event dispatched:', appConfig);
});

console.log('Preload script loaded - config available via electronAPI:', appConfig);