const { app, BrowserWindow, session } = require('electron');
const path = require('path');
require('dotenv').config();

global.appConfig = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3001',
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development'
};

console.log('🚀 MAIN PROCESS STARTING');
console.log('📋 Main process config:', global.appConfig);
console.log('🔧 Command line args:', process.argv);
console.log('🖥️ Platform:', process.platform);

app.commandLine.appendSwitch('disable-features', 'NetworkService');
app.commandLine.appendSwitch('log-net-log-level', '0');
app.commandLine.appendSwitch('log-file', path.join(app.getPath('userData'), 'electron.log'));

app.commandLine.appendSwitch('enable-experimental-web-platform-features');

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

function createWindow() {
  console.log('🪟 CREATING WINDOW');
  
  const isKioskMode = process.argv.includes('--kiosk') && process.platform === 'linux';
  console.log('🎯 Kiosk mode:', isKioskMode);
  
  const windowConfig = {
    width: isKioskMode ? 1920 : 1280,
    height: isKioskMode ? 1080 : 800,
    fullscreen: isKioskMode,     // Full screen only when --kiosk flag is used
    frame: !isKioskMode,         // No window frame in kiosk mode
    kiosk: isKioskMode,          // True kiosk mode - prevents Alt+Tab, etc.
    autoHideMenuBar: true,       // Hide top menu bar
    show: false,                 // Don't show until ready
    backgroundColor: '#0f0f23',  // Match app background
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
       microphone: true,
       camera: true,
       experimentalFeatures: true
    }
  };
  
  console.log('🔧 Window config:', windowConfig);
  
  const win = new BrowserWindow(windowConfig);
  
  console.log('✅ Window created successfully');

  console.log('🔐 Setting up permission handler');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🔐 Permission requested:', permission);
    if (['media', 'camera', 'microphone'].includes(permission)) {
      console.log('✅ Permission granted:', permission);
      callback(true);
    } else {
      console.log('❌ Permission denied:', permission);
      callback(false);
    }
  });

  win.once('ready-to-show', () => {
    console.log('👁️ Window ready to show');
    win.show();
    if (isKioskMode) {
      console.log('🎯 Focusing kiosk window');
      win.focus();
    }
  });

  win.webContents.on('crashed', (event, killed) => {
    console.error('💥 Web contents crashed:', { killed });
  });

  win.webContents.on('unresponsive', () => {
    console.error('😴 Web contents became unresponsive');
  });

  win.webContents.on('responsive', () => {
    console.log('😊 Web contents became responsive again');
  });

  win.webContents.once('dom-ready', () => {
    console.log('🌐 DOM ready, injecting config');
    win.webContents.executeJavaScript(`
      console.log('🔧 Injecting config from main process');
      window.appConfig = ${JSON.stringify(global.appConfig)};
      console.log('📋 Config injected:', window.appConfig);
    `).catch(error => {
      console.error('❌ Failed to inject config:', error);
    });
  });

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('🧭 Navigation attempt to:', navigationUrl);
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.protocol !== 'file:') {
      console.log('🚫 Preventing external navigation to:', parsedUrl.protocol);
      event.preventDefault();
    } else {
      console.log('✅ Allowing local file navigation');
    }
  });

  console.log('📄 Loading homepage.html');
  win.loadFile('homepage.html').then(() => {
    console.log('✅ Homepage loaded successfully');
  }).catch(error => {
    console.error('❌ Failed to load homepage:', error);
  });
  
  // Dev tools disabled for production use
  // win.webContents.openDevTools();
}

console.log('⏳ Waiting for app to be ready...');
app.whenReady().then(() => {
  console.log('🚀 App is ready, creating window');
  createWindow();
}).catch(error => {
  console.error('❌ App failed to become ready:', error);
});

app.on('window-all-closed', () => {
  console.log('🪟 All windows closed');
  if (process.platform !== 'darwin') {
    console.log('🛑 Quitting app (not macOS)');
    app.quit();
  }
});

app.on('activate', () => {
  console.log('🔄 App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('🪟 No windows, creating new one');
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('👋 App is about to quit');
});

app.on('will-quit', () => {
  console.log('🛑 App will quit');
});

app.on('ready', () => {
  console.log('✅ App ready event fired');
});
