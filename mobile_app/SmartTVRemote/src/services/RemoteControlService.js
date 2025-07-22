class RemoteControlService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentDevice = null;
    this.onStateChange = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.appState = {
      currentApp: 'homepage',
      videoCallState: 'disconnected',
      callData: {}
    };
  }

  connect(device) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        this.disconnect();
      }

      // Use WebSocket port 8080 for SmartTV Pi
      const wsPort = device.port === 8080 ? 8080 : device.port;
      const wsUrl = `ws://${device.host}:${wsPort}`;
      console.log('📱 Connecting to Smart TV Pi:', wsUrl);

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

  // TV Remote Navigation Commands (matching WebSocket server protocol)
  navigateUp() {
    return this.sendCommand({ type: 'navigate', direction: 'up' });
  }

  navigateDown() {
    return this.sendCommand({ type: 'navigate', direction: 'down' });
  }

  navigateLeft() {
    return this.sendCommand({ type: 'navigate', direction: 'left' });
  }

  navigateRight() {
    return this.sendCommand({ type: 'navigate', direction: 'right' });
  }

  selectAction() {
    return this.sendCommand({ type: 'select' });
  }

  backAction() {
    return this.sendCommand({ type: 'back' });
  }

  // App Launch Commands
  launchApp(app) {
    return this.sendCommand({ type: 'launch', app: app });
  }

  // Text Input Commands
  sendTextInput(field, value) {
    return this.sendCommand({ type: 'input', field: field, value: value });
  }

  requestTextInput(field, currentValue = '') {
    return this.sendCommand({ type: 'requestTextInput', field: field, value: currentValue });
  }

  // Video Call Commands
  videoCallConnect() {
    return this.sendCommand({ type: 'videoCall', action: 'connect' });
  }

  videoCallToggleMute() {
    return this.sendCommand({ type: 'videoCall', action: 'toggleMute' });
  }

  videoCallToggleVideo() {
    return this.sendCommand({ type: 'videoCall', action: 'toggleVideo' });
  }

  videoCallEndCall() {
    return this.sendCommand({ type: 'videoCall', action: 'endCall' });
  }

  // Key Press Commands (for compatibility)
  pressKey(key) {
    return this.sendCommand({ type: 'keypress', key: key });
  }

  pressEnter() {
    return this.selectAction();
  }

  pressEscape() {
    return this.backAction();
  }

  // Get current app state
  requestAppState() {
    return this.sendCommand({ type: 'get_state' });
  }

  handleServerMessage(message) {
    console.log('📱 Received from Smart TV:', message);
    
    switch (message.type) {
      case 'connected':
        console.log('✅ WebSocket connection confirmed:', message.message);
        if (message.appState) {
          this.appState = message.appState;
        }
        break;
      
      case 'appStateChange':
        this.appState.currentApp = message.currentApp;
        this.appState.videoCallState = message.videoCallState;
        this.notifyStateChange('app_state_change', this.appState);
        break;
      
      case 'videoCallUpdate':
        this.appState.videoCallState = message.state;
        this.appState.callData = {
          userName: message.userName,
          roomName: message.roomName,
          callTimer: message.callTimer,
          participantCount: message.participantCount,
          isMuted: message.isMuted,
          isVideoOn: message.isVideoOn
        };
        this.notifyStateChange('video_call_update', this.appState.callData);
        break;
      
      case 'showTextInput':
        this.notifyStateChange('show_text_input', {
          mode: message.mode,
          field: message.field,
          placeholder: message.placeholder,
          currentValue: message.currentValue
        });
        break;
      
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
      reconnectAttempts: this.reconnectAttempts,
      appState: this.appState
    };
  }
  
  getCurrentApp() {
    return this.appState.currentApp;
  }
  
  getVideoCallState() {
    return this.appState.videoCallState;
  }
  
  getCallData() {
    return this.appState.callData;
  }
}

export default new RemoteControlService();