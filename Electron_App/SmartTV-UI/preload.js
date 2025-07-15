console.log('Preload script starting...');

const { contextBridge } = require('electron');

// Expose environment variables to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    getEnvVariable: (name) => {
        return process.env[name];
    }
});

// Config will be injected by main process via executeJavaScript
console.log('Preload script loaded - config will be injected by main process');