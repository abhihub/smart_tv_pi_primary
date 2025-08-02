const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const QRCode = require('qrcode');
const os = require('os');
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
  
  // Check if running in server-only mode (for testing)
  const serverOnlyMode = process.argv.includes('--server-only');
  if (serverOnlyMode) {
    console.log('🔧 Server-only mode: skipping window creation');
    setupRemoteControlServer();
    return;
  }
  
  // Check if explicitly running in kiosk mode via command line flag
  const isKioskMode = process.argv.includes('--kiosk') || (process.platform === 'linux' && process.env.DISPLAY);
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
  
  // Store window reference for remote control
  mainWindow = win;
  
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

  // Forward renderer console messages to main process
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
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
    
    // Start remote control server after window is ready
    setupRemoteControlServer();
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
  if (process.platform !== 'darwin' && !process.argv.includes('--server-only')) {
    console.log('🛑 Quitting app (not macOS)');
    app.quit();
  } else if (process.argv.includes('--server-only')) {
    console.log('🔧 Server-only mode: keeping app alive');
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

// Remote Control Server Setup
let mainWindow = null;
let qrOverlayWindow = null;
let remoteServer = null;
let wsServer = null;
let deviceIP = null;

// Get device IP address
function getDeviceIP() {
  const networks = os.networkInterfaces();
  for (const name of Object.keys(networks)) {
    for (const net of networks[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function setupRemoteControlServer() {
  console.log('🎮 Setting up remote control server...');
  
  // Get device IP
  deviceIP = getDeviceIP();
  console.log(`📱 Device IP: ${deviceIP}`);
  
  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      device_type: 'smarttv',
      app_name: 'SmartTV',
      device_name: 'SmartTV Device',
      version: '1.0.0',
      status: 'online',
      current_app: 'homepage',
      capabilities: ['navigation', 'volume', 'apps', 'wifi'],
      timestamp: Date.now()
    });
  });

  // WebSocket test endpoint
  app.get('/test', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head><title>WebSocket Test</title></head>
<body>
  <h1>SmartTV WebSocket Test</h1>
  <button onclick="testWS()">Test Connection</button>
  <div id="log"></div>
  <script>
    function testWS() {
      const log = document.getElementById('log');
      log.innerHTML = 'Testing WebSocket connection...\\n';
      const ws = new WebSocket('ws://10.81.97.183:8080');
      ws.onopen = () => log.innerHTML += '✅ Connected!\\n';
      ws.onerror = (e) => log.innerHTML += '❌ Error: ' + JSON.stringify(e) + '\\n';
      ws.onmessage = (e) => log.innerHTML += '📨 Message: ' + e.data + '\\n';
      ws.onclose = (e) => log.innerHTML += '📡 Closed: ' + e.code + ' ' + e.reason + '\\n';
    }
  </script>
</body>
</html>`);
  });
  
  // WiFi endpoints
  app.get('/api/wifi/status', async (req, res) => {
    try {
      const status = await wifiManager.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.get('/api/wifi/scan', async (req, res) => {
    try {
      const networks = await wifiManager.scanNetworks();
      res.json(networks);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.post('/api/wifi/connect', async (req, res) => {
    try {
      const { ssid, password, security } = req.body;
      const result = await wifiManager.connectToNetwork(ssid, password, security);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Setup WebSocket server
  wsServer = new WebSocket.Server({ server });
  
  wsServer.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    console.log(`📱 Mobile app connected from ${clientIP}`);
    
    // Notify QR overlay of connection
    notifyMobileConnected({
      ip: clientIP,
      userAgent: userAgent,
      timestamp: Date.now()
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'Connected to SmartTV',
      timestamp: Date.now()
    }));
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 Received from mobile:', message);
        handleRemoteCommand(message, ws);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`📱 Mobile app disconnected from ${clientIP}`);
      notifyMobileDisconnected({ ip: clientIP, timestamp: Date.now() });
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
  
  // Start server
  const PORT = 8080;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Remote control server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for mobile connections`);
    console.log(`🔗 Connection URL: http://${deviceIP}:${PORT}`);
    
    console.log('📱 Remote control server ready - IP address displayed on homepage');
  });
  
  remoteServer = server;
}

function handleRemoteCommand(message, ws) {
  if (!mainWindow) {
    console.error('❌ No main window available for remote command');
    return;
  }
  
  const { type, command, data } = message;
  
  if (type === 'remote_command') {
    switch (command) {
      case 'navigate':
        handleNavigation(data.direction);
        break;
      case 'select':
        handleSelect();
        break;
      case 'back':
        handleBack();
        break;
      case 'home':
        handleHome();
        break;
      case 'volume':
        handleVolumeControl(data.action);
        break;
      case 'launch_app':
        handleAppLaunch(data.app);
        break;
      default:
        console.log('❓ Unknown remote command:', command);
    }
    
    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'command_ack',
      command: command,
      status: 'executed',
      timestamp: Date.now()
    }));
  }
}

function handleNavigation(direction) {
  console.log(`🎮 Navigation: ${direction}`);
  
  // Map direction to proper Arrow key names
  const keyMap = {
    'up': 'ArrowUp',
    'down': 'ArrowDown',
    'left': 'ArrowLeft',
    'right': 'ArrowRight'
  };
  
  const arrowKey = keyMap[direction];
  if (arrowKey) {
    // Execute JavaScript to simulate arrow key press
    const jsCode = `
      try {
        const event = new KeyboardEvent('keydown', {
          key: '${arrowKey}',
          code: '${arrowKey}',
          keyCode: ${getKeyCode(direction)},
          which: ${getKeyCode(direction)},
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
        console.log('🎮 Simulated ${arrowKey} key press');
        'success';
      } catch (error) {
        console.error('🎮 Error in navigation:', error);
        'error: ' + error.message;
      }
    `;
    
    mainWindow.webContents.executeJavaScript(jsCode)
      .then((result) => {
        console.log(`✅ Navigation ${direction} result: ${result}`);
      })
      .catch(error => {
        console.error(`❌ Error sending navigation event:`, error);
      });
  }
}

function getKeyCode(direction) {
  const codes = {
    'up': 38,
    'down': 40,
    'left': 37,
    'right': 39
  };
  return codes[direction] || 0;
}

function handleSelect() {
  console.log('🎮 Select/Enter');
  
  const jsCode = `
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      console.log('🎮 Simulated Enter key press');
      'success';
    } catch (error) {
      console.error('🎮 Error in select:', error);
      'error: ' + error.message;
    }
  `;
  
  mainWindow.webContents.executeJavaScript(jsCode)
    .then((result) => {
      console.log(`✅ Select result: ${result}`);
    })
    .catch(error => {
      console.error(`❌ Error sending select event:`, error);
    });
}

function handleBack() {
  console.log('🎮 Back/Escape');
  
  const jsCode = `
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      console.log('🎮 Simulated Escape key press');
      'success';
    } catch (error) {
      console.error('🎮 Error in back:', error);
      'error: ' + error.message;
    }
  `;
  
  mainWindow.webContents.executeJavaScript(jsCode)
    .then((result) => {
      console.log(`✅ Back result: ${result}`);
    })
    .catch(error => {
      console.error(`❌ Error sending back event:`, error);
    });
}

function handleHome() {
  console.log('🎮 Home');
  mainWindow.loadFile('homepage.html');
}

function handleVolumeControl(action) {
  console.log(`🎮 Volume: ${action}`);
  // In a real implementation, you'd control system volume
  // For now, just log the action
}

function handleAppLaunch(appName) {
  console.log(`🎮 Launch app: ${appName}`);
  
  const appPages = {
    'home': 'homepage.html',
    'video-call': 'user-directory.html',  // Fix: video-call should go to user-directory like navigation keys
    'trivia-game': 'trivia-game.html',
    'settings': 'settings.html',
    'wifi-settings': 'wifi-settings.html',
    'qr-test': 'qr-test.html',
    'user-directory': 'user-directory.html'  // Also add explicit mapping for user-directory
  };
  
  const page = appPages[appName];
  if (page) {
    mainWindow.loadFile(page);
  }
}

// QR Overlay Functions
function showQROverlay() {
  if (qrOverlayWindow) {
    qrOverlayWindow.focus();
    return;
  }

  console.log('📱 Creating QR overlay window');
  
  qrOverlayWindow = new BrowserWindow({
    width: 600,
    height: 700,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    maximizable: false,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  qrOverlayWindow.loadFile('qr-connection.html');

  qrOverlayWindow.on('closed', () => {
    qrOverlayWindow = null;
    console.log('📱 QR overlay window closed');
  });

  console.log('✅ QR overlay window created');
}

function closeQROverlay() {
  if (qrOverlayWindow) {
    qrOverlayWindow.close();
    qrOverlayWindow = null;
    console.log('🚫 QR overlay closed');
  }
}

// IPC handlers for QR functionality
ipcMain.handle('get-connection-info', () => {
  return {
    ip: deviceIP || getDeviceIP(),
    port: 8080,
    device_name: 'SmartTV Device',
    version: '1.0.0'
  };
});

ipcMain.handle('generate-qr-code', async (event, data) => {
  try {
    console.log('📱 Generating QR code with data:', data);
    const qrDataURL = await QRCode.toDataURL(data, {
      width: 250,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('✅ QR code generated successfully');
    return qrDataURL;
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    throw error;
  }
});

ipcMain.handle('close-qr-overlay', () => {
  closeQROverlay();
});

// Notify QR overlay and main window when mobile connects
function notifyMobileConnected(deviceInfo) {
  if (qrOverlayWindow) {
    qrOverlayWindow.webContents.send('mobile-connected', deviceInfo);
  }
  if (mainWindow) {
    mainWindow.webContents.send('mobile-connected', deviceInfo);
  }
}

function notifyMobileDisconnected(deviceInfo) {
  if (mainWindow) {
    mainWindow.webContents.send('mobile-disconnected', deviceInfo);
  }
}

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
