const WebSocket = require('ws');
const bonjour = require('bonjour-service')();
const os = require('os');

class RemoteControlService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.wss = null;
    this.port = 8765;
    this.serviceName = 'SmartTV-Remote';
    this.clients = new Set();
  }

  start() {
    // Create WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });
    
    this.wss.on('connection', (ws, req) => {
      console.log('📱 Mobile app connected from:', req.socket.remoteAddress);
      this.clients.add(ws);

      // Send current app state to newly connected client
      this.sendAppState(ws);

      ws.on('message', (message) => {
        try {
          const command = JSON.parse(message);
          this.handleRemoteCommand(command);
        } catch (error) {
          console.error('❌ Error parsing remote command:', error);
        }
      });

      ws.on('close', () => {
        console.log('📱 Mobile app disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Start mDNS advertisement
    this.advertiseService();
    
    console.log(`🎮 Remote control service started on port ${this.port}`);
  }

  advertiseService() {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    
    // Find the first non-internal IPv4 address
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          break;
        }
      }
      if (ipAddress !== 'localhost') break;
    }

    // Advertise the service via mDNS
    this.service = bonjour.publish({
      name: this.serviceName,
      type: 'smarttv-remote',
      port: this.port,
      txt: {
        version: '1.0',
        device: 'smarttv',
        ip: ipAddress
      }
    });

    console.log(`📡 Advertising service "${this.serviceName}" on ${ipAddress}:${this.port}`);
  }

  handleRemoteCommand(command) {
    console.log('📱 Received remote command:', command);

    switch (command.action) {
      case 'navigate':
        this.navigateToPage(command.page);
        break;
      case 'click':
        this.simulateClick(command.selector);
        break;
      case 'input':
        this.simulateInput(command.selector, command.value);
        break;
      case 'keypress':
        this.simulateKeyPress(command.key);
        break;
      case 'gesture':
        this.handleGesture(command.gesture);
        break;
      case 'volume':
        this.handleVolumeControl(command.volume);
        break;
      case 'get_state':
        this.sendAppState();
        break;
      default:
        console.warn('⚠️ Unknown remote command:', command.action);
    }
  }

  navigateToPage(page) {
    const pageMap = {
      'home': 'homepage.html',
      'video-call': 'video-call.html',
      'trivia': 'trivia-game.html',
      'games': 'gamepage.html',
      'users': 'user-directory.html'
    };

    const fileName = pageMap[page];
    if (fileName) {
      this.mainWindow.loadFile(fileName);
      this.broadcastToClients({ type: 'page_changed', page: page });
    }
  }

  simulateClick(selector) {
    this.mainWindow.webContents.executeJavaScript(`
      const element = document.querySelector('${selector}');
      if (element) {
        element.click();
        true;
      } else {
        false;
      }
    `).then(result => {
      if (!result) {
        console.warn('⚠️ Element not found for click:', selector);
      }
    });
  }

  simulateInput(selector, value) {
    this.mainWindow.webContents.executeJavaScript(`
      const element = document.querySelector('${selector}');
      if (element) {
        element.value = '${value}';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        true;
      } else {
        false;
      }
    `);
  }

  simulateKeyPress(key) {
    this.mainWindow.webContents.sendInputEvent({
      type: 'keyDown',
      keyCode: key
    });
    
    this.mainWindow.webContents.sendInputEvent({
      type: 'keyUp',
      keyCode: key
    });
  }

  handleGesture(gesture) {
    switch (gesture) {
      case 'swipe_left':
        this.simulateKeyPress('ArrowLeft');
        break;
      case 'swipe_right':
        this.simulateKeyPress('ArrowRight');
        break;
      case 'swipe_up':
        this.simulateKeyPress('ArrowUp');
        break;
      case 'swipe_down':
        this.simulateKeyPress('ArrowDown');
        break;
      case 'tap':
        this.simulateKeyPress('Return');
        break;
    }
  }

  handleVolumeControl(volume) {
    // This would integrate with system volume controls
    console.log('🔊 Volume control:', volume);
  }

  sendAppState(specificClient = null) {
    this.mainWindow.webContents.executeJavaScript(`
      ({
        currentPage: window.location.pathname,
        title: document.title,
        url: window.location.href
      })
    `).then(state => {
      const message = {
        type: 'app_state',
        state: state
      };

      if (specificClient) {
        if (specificClient.readyState === WebSocket.OPEN) {
          specificClient.send(JSON.stringify(message));
        }
      } else {
        this.broadcastToClients(message);
      }
    });
  }

  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  stop() {
    if (this.service) {
      bonjour.unpublishAll(() => {
        console.log('📡 mDNS service stopped');
      });
    }

    if (this.wss) {
      this.wss.close(() => {
        console.log('🎮 Remote control service stopped');
      });
    }
  }
}

module.exports = RemoteControlService;