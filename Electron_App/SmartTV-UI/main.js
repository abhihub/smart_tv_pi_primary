const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

// Store config in global for preload script access
global.appConfig = {
  SERVER_URL: process.env.SERVER_URL || 'http://167.71.0.87:3001',
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development'
};

console.log('🚀 MAIN PROCESS STARTING');
console.log('📋 Main process config:', global.appConfig);
console.log('🔧 Command line args:', process.argv);
console.log('🖥️ Platform:', process.platform);

// Suppress noisy network-service errors
app.commandLine.appendSwitch('disable-features', 'NetworkService');
app.commandLine.appendSwitch('log-net-log-level', '0');
app.commandLine.appendSwitch('log-file', path.join(app.getPath('userData'), 'electron.log'));
// Enable experimental Web Speech & Web Platform features
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

// Add more detailed error logging
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

function createWindow() {
  console.log('🪟 CREATING WINDOW');
  
  // Check if explicitly running in kiosk mode via command line flag
  const isKioskMode = process.argv.includes('--kiosk') || process.platform === 'linux';
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
       // Allow media capture for video calling
       microphone: true,
       camera: true,
       // Enable recognition features
       experimentalFeatures: true
    }
  };
  
  console.log('🔧 Window config:', windowConfig);
  
  const win = new BrowserWindow(windowConfig);
  
  console.log('✅ Window created successfully');

  // Grant media permissions (microphone and camera) automatically
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

  // Show window when ready
  win.once('ready-to-show', () => {
    console.log('👁️ Window ready to show');
    win.show();
    if (isKioskMode) {
      console.log('🎯 Focusing kiosk window');
      win.focus();
    }
  });

  // Add error handling for web contents
  win.webContents.on('crashed', (event, killed) => {
    console.error('💥 Web contents crashed:', { killed });
  });

  win.webContents.on('unresponsive', () => {
    console.error('😴 Web contents became unresponsive');
  });

  win.webContents.on('responsive', () => {
    console.log('😊 Web contents became responsive again');
  });

  // Send config to renderer as soon as DOM starts loading
  win.webContents.once('dom-ready', () => {
    console.log('🌐 DOM ready, injecting config');
    win.webContents.executeJavaScript(`
      console.log('🔧 Injecting config from main process');
      window.appConfig = ${JSON.stringify(global.appConfig)};
      console.log('📋 Config injected:', window.appConfig);
      
      // Trigger custom event to notify scripts that config is ready
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('configReady', { detail: window.appConfig }));
        console.log('📋 ConfigReady event dispatched');
      }, 100);
    `).catch(error => {
      console.error('❌ Failed to inject config:', error);
    });
  });

  // Prevent navigation away from the app (only block external URLs, allow local files)
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('🧭 Navigation attempt to:', navigationUrl);
    const parsedUrl = new URL(navigationUrl);
    
    // Allow navigation to local HTML files, block external URLs
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
  
  // Dev tools can be opened with F12 or Ctrl+Shift+I if needed
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

// IPC handlers for update functionality
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('download-update', async (event, url, version) => {
  return new Promise((resolve, reject) => {
    console.log('📥 Downloading update from:', url);
    
    const fileName = `smart-tv-ui_${version}_amd64.deb`;
    const downloadPath = path.join(app.getPath('downloads'), fileName);
    
    const file = fs.createWriteStream(downloadPath);
    
    const request = http.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status code: ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = Math.round((downloadedSize / totalSize) * 100);
        
        // Send progress update to renderer
        event.sender.send('update-progress', {
          progress,
          downloadedSize,
          totalSize
        });
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('✅ Update downloaded to:', downloadPath);
        resolve({ success: true, filePath: downloadPath });
      });
      
      file.on('error', (err) => {
        fs.unlink(downloadPath, () => {}); // Delete incomplete file
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
  });
});
