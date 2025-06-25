const { app, BrowserWindow, session } = require('electron');
const path = require('path');
require('dotenv').config();

// Store config in global for preload script access
global.appConfig = {
  SERVER_URL: process.env.SERVER_URL || 'http://167.71.0.87:3001',
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development'
};

console.log('Main process config:', global.appConfig);

// Suppress noisy network-service errors
app.commandLine.appendSwitch('disable-features', 'NetworkService');
app.commandLine.appendSwitch('log-net-log-level', '0');
app.commandLine.appendSwitch('log-file', path.join(app.getPath('userData'), 'electron.log'));
// Enable experimental Web Speech & Web Platform features
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false,       // set to true for full-screen TV mode
    autoHideMenuBar: true,   // hide top menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // allow audio capture
      microphone: true,
      // enable recognition features
      experimentalFeatures: true
    }
  });

  // Grant media permission (microphone) automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Send config to renderer as soon as DOM starts loading
  win.webContents.once('dom-ready', () => {
    win.webContents.executeJavaScript(`
      window.appConfig = ${JSON.stringify(global.appConfig)};
      console.log('Config overwritten by main process:', window.appConfig);
    `);
  });

  win.loadFile('homepage.html');
  // win.webContents.openDevTools(); // for debugging
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
