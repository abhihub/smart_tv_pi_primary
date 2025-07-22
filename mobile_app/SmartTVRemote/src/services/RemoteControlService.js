class RemoteControlService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentDevice = null;
    this.onStateChange = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(device) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        this.disconnect();
      }

      const wsUrl = `ws://${device.host}:${device.port}`;
      console.log('📱 Connecting to Smart TV:', wsUrl);

      this.socket = new WebSocket(wsUrl);
      this.currentDevice = device;

      this.socket.onopen = () => {
        console.log('✅ Connected to Smart TV');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStateChange('connected');
        resolve(device);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('❌ Error parsing server message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('📱 Connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.notifyStateChange('disconnected');
        
        // Auto-reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.connect(device);
          }, 2000 * this.reconnectAttempts);
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.notifyStateChange('error');
        reject(error);
      };

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          this.socket?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentDevice = null;
    this.reconnectAttempts = 0;
    this.notifyStateChange('disconnected');
  }

  sendCommand(command) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ Not connected to Smart TV');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(command));
      return true;
    } catch (error) {
      console.error('❌ Error sending command:', error);
      return false;
    }
  }

  // Navigation commands
  navigateToPage(page) {
    return this.sendCommand({ action: 'navigate', page });
  }

  // UI interaction commands
  clickElement(selector) {
    return this.sendCommand({ action: 'click', selector });
  }

  inputText(selector, value) {
    return this.sendCommand({ action: 'input', selector, value });
  }

  // Gesture commands
  swipeLeft() {
    return this.sendCommand({ action: 'gesture', gesture: 'swipe_left' });
  }

  swipeRight() {
    return this.sendCommand({ action: 'gesture', gesture: 'swipe_right' });
  }

  swipeUp() {
    return this.sendCommand({ action: 'gesture', gesture: 'swipe_up' });
  }

  swipeDown() {
    return this.sendCommand({ action: 'gesture', gesture: 'swipe_down' });
  }

  tap() {
    return this.sendCommand({ action: 'gesture', gesture: 'tap' });
  }

  // Key press commands
  pressKey(key) {
    return this.sendCommand({ action: 'keypress', key });
  }

  pressEnter() {
    return this.pressKey('Return');
  }

  pressEscape() {
    return this.pressKey('Escape');
  }

  pressBackspace() {
    return this.pressKey('BackSpace');
  }

  // Volume control
  setVolume(volume) {
    return this.sendCommand({ action: 'volume', volume });
  }

  // Get current app state
  requestAppState() {
    return this.sendCommand({ action: 'get_state' });
  }

  handleServerMessage(message) {
    console.log('📱 Received from Smart TV:', message);
    
    switch (message.type) {
      case 'app_state':
        this.notifyStateChange('app_state', message.state);
        break;
      case 'page_changed':
        this.notifyStateChange('page_changed', message.page);
        break;
      default:
        console.log('ℹ️ Unknown message type:', message.type);
    }
  }

  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  notifyStateChange(type, data = null) {
    if (this.onStateChange) {
      this.onStateChange(type, data);
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      device: this.currentDevice,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default new RemoteControlService();