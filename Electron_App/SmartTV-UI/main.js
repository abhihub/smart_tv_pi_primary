const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
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

// WiFi Management Functions
class WiFiManager {
  constructor() {
    this.isLinux = process.platform === 'linux';
    this.isConnecting = false;
  }

  async getAvailableNetworks() {
    try {
      console.log('📡 Scanning for available WiFi networks...');
      
      if (this.isLinux) {
        // Use nmcli on Linux for NetworkManager
        const { stdout } = await execPromise('nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list');
        const networks = stdout.trim().split('\n')
          .filter(line => line && line.includes(':'))
          .map(line => {
            const [ssid, signal, security] = line.split(':');
            return {
              ssid: ssid.trim(),
              signal: parseInt(signal) || 0,
              security: security.includes('WPA') ? 'WPA2' : (security.includes('WEP') ? 'WEP' : 'Open'),
              encrypted: security !== '--'
            };
          })
          .filter(network => network.ssid && network.ssid !== '')
          .sort((a, b) => b.signal - a.signal); // Sort by signal strength

        console.log(`📡 Found ${networks.length} WiFi networks`);
        return { success: true, networks };
      } else {
        // For non-Linux platforms, return mock data for development
        console.log('📡 Non-Linux platform, returning mock networks');
        return {
          success: true,
          networks: [
            { ssid: 'MockNetwork1', signal: 80, security: 'WPA2', encrypted: true },
            { ssid: 'MockNetwork2', signal: 60, security: 'Open', encrypted: false }
          ]
        };
      }
    } catch (error) {
      console.error('❌ Failed to scan WiFi networks:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentConnection() {
    try {
      console.log('📡 Getting current WiFi connection...');
      
      if (this.isLinux) {
        // Try multiple methods to detect WiFi connection
        try {
          // Method 1: Check active connections
          const { stdout: activeStdout } = await execPromise('nmcli -t -f NAME,DEVICE,STATE connection show --active');
          console.log('📡 Active connections output:', activeStdout);
          
          const activeConnections = activeStdout.trim().split('\n')
            .filter(line => line && line.includes(':'))
            .map(line => {
              const parts = line.split(':');
              if (parts.length >= 3) {
                return { 
                  name: parts[0].trim(), 
                  device: parts[1].trim(), 
                  state: parts[2].trim() 
                };
              }
              return null;
            })
            .filter(conn => conn !== null);

          // Look for WiFi connections (device starting with 'w' usually indicates wireless)
          const wifiConnections = activeConnections.filter(conn => 
            conn.device && (conn.device.startsWith('w') || conn.device.includes('wifi'))
          );

          if (wifiConnections.length > 0) {
            const connection = wifiConnections[0];
            console.log('📡 Found active WiFi connection via method 1:', connection);
            return { success: true, connected: true, connection };
          }

          // Method 2: Check WiFi device status directly
          const { stdout: deviceStdout } = await execPromise('nmcli -t -f DEVICE,STATE,CONNECTION device status');
          console.log('📡 Device status output:', deviceStdout);
          
          const deviceLines = deviceStdout.trim().split('\n')
            .filter(line => line && line.includes(':'));
          
          for (const line of deviceLines) {
            const [device, state, connection] = line.split(':');
            if (device && device.startsWith('w') && state === 'connected' && connection && connection !== '--') {
              console.log('📡 Found active WiFi connection via method 2:', { device, state, connection });
              return { 
                success: true, 
                connected: true, 
                connection: { name: connection.trim(), device: device.trim(), state: state.trim() }
              };
            }
          }

          console.log('📡 No active WiFi connection found');
          return { success: true, connected: false };
          
        } catch (nmcliError) {
          console.error('❌ nmcli command failed:', nmcliError);
          return { success: false, error: nmcliError.message };
        }
      } else {
        // Mock for non-Linux
        return { success: true, connected: false };
      }
    } catch (error) {
      console.error('❌ Failed to get current connection:', error);
      return { success: false, error: error.message };
    }
  }

  async connectToNetwork(ssid, password = '', security = 'WPA2') {
    if (this.isConnecting) {
      console.log('⏳ WiFi connection already in progress');
      return { success: false, error: 'Connection already in progress' };
    }

    this.isConnecting = true;

    try {
      console.log(`📡 Connecting to WiFi network: ${ssid}`);
      
      if (!this.isLinux) {
        // Mock successful connection for non-Linux
        console.log('📡 Non-Linux platform, simulating connection');
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.isConnecting = false;
        return { success: true, message: 'Mock connection successful' };
      }

      // Check if connection already exists
      try {
        await execPromise(`nmcli connection show "${ssid}"`);
        console.log('📡 Connection profile exists, attempting to activate...');
        
        // Try to activate existing connection
        await execPromise(`nmcli connection up "${ssid}"`);
        console.log('✅ Successfully activated existing connection');
        this.isConnecting = false;
        return { success: true, message: 'Connected to existing network profile' };
      } catch (profileError) {
        console.log('📡 No existing profile, creating new connection...');
      }

      // Create new connection
      let connectCommand;
      if (security === 'Open' || !password) {
        connectCommand = `nmcli device wifi connect "${ssid}"`;
      } else {
        connectCommand = `nmcli device wifi connect "${ssid}" password "${password}"`;
      }

      console.log('📡 Executing connection command...');
      const { stdout, stderr } = await execPromise(connectCommand);
      
      if (stderr && stderr.includes('Error')) {
        throw new Error(`Connection failed: ${stderr}`);
      }

      console.log('✅ WiFi connection successful:', stdout);
      this.isConnecting = false;
      return { success: true, message: 'Successfully connected to WiFi' };

    } catch (error) {
      console.error('❌ WiFi connection failed:', error);
      this.isConnecting = false;
      
      let errorMessage = error.message;
      if (errorMessage.includes('Secrets were required')) {
        errorMessage = 'Invalid password or security settings';
      } else if (errorMessage.includes('No network with SSID')) {
        errorMessage = 'Network not found';
      } else if (errorMessage.includes('Connection activation failed')) {
        errorMessage = 'Failed to connect - check password and signal strength';
      }

      return { success: false, error: errorMessage };
    }
  }

  async disconnectFromNetwork() {
    try {
      console.log('📡 Disconnecting from WiFi...');
      
      if (!this.isLinux) {
        // Mock for non-Linux
        return { success: true, message: 'Mock disconnection successful' };
      }

      // Get current connection
      const current = await this.getCurrentConnection();
      if (!current.connected) {
        return { success: true, message: 'Not connected to any network' };
      }

      // Disconnect
      await execPromise(`nmcli connection down "${current.connection.name}"`);
      console.log('✅ Successfully disconnected from WiFi');
      return { success: true, message: 'Disconnected from WiFi' };

    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
      return { success: false, error: error.message };
    }
  }

  async getConnectionStatus() {
    try {
      const current = await this.getCurrentConnection();
      if (current.success && current.connected) {
        // Get additional details about the connection
        if (this.isLinux) {
          try {
            const { stdout } = await execPromise('nmcli -t -f IP4.ADDRESS,IP4.GATEWAY,IP4.DNS connection show --active | head -1');
            const details = stdout.trim();
            return {
              success: true,
              connected: true,
              network: current.connection.name,
              details: details
            };
          } catch (detailError) {
            return {
              success: true,
              connected: true,
              network: current.connection.name
            };
          }
        } else {
          return {
            success: true,
            connected: true,
            network: current.connection.name
          };
        }
      } else {
        return { success: true, connected: false };
      }
    } catch (error) {
      console.error('❌ Failed to get connection status:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize WiFi manager
const wifiManager = new WiFiManager();

// IPC handlers for WiFi functionality
ipcMain.handle('wifi-scan', async () => {
  console.log('📡 IPC: WiFi scan requested');
  return await wifiManager.getAvailableNetworks();
});

ipcMain.handle('wifi-connect', async (event, { ssid, password, security }) => {
  console.log('📡 IPC: WiFi connect requested for:', ssid);
  return await wifiManager.connectToNetwork(ssid, password, security);
});

ipcMain.handle('wifi-disconnect', async () => {
  console.log('📡 IPC: WiFi disconnect requested');
  return await wifiManager.disconnectFromNetwork();
});

ipcMain.handle('wifi-status', async () => {
  console.log('📡 IPC: WiFi status requested');
  return await wifiManager.getConnectionStatus();
});

ipcMain.handle('wifi-current', async () => {
  console.log('📡 IPC: Current WiFi connection requested');
  return await wifiManager.getCurrentConnection();
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
