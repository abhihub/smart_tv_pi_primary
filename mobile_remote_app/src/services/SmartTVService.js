class SmartTVServiceClass {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.tvInfo = null;
    this.baseUrl = null;
  }

  // Connect to SmartTV
  async connect(tvInfo) {
    try {
      console.log('🔗 Starting connection to:', tvInfo);
      this.tvInfo = tvInfo;
      this.baseUrl = `http://${tvInfo.ip}:${tvInfo.port || 8080}`;
      console.log('📡 Base URL:', this.baseUrl);
      
      // Skip HTTP test for now, go directly to WebSocket
      console.log('🔌 Establishing WebSocket connection directly...');
      await this.connectWebSocket();
      
      this.connected = true;
      console.log('✅ Successfully connected to SmartTV:', tvInfo.name);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to TV:', error.message);
      console.error('❌ Full error:', error);
      this.connected = false;
      return false;
    }
  }

  // Connect WebSocket for real-time communication
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.tvInfo.ip}:${this.tvInfo.port || 8080}`;
      console.log('🔌 Connecting WebSocket to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        console.log('📋 WebSocket details:', {
          url: this.ws.url,
          readyState: this.ws.readyState,
          protocol: this.ws.protocol
        });
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('❌ WebSocket state:', this.ws.readyState);
        console.error('❌ WebSocket URL:', wsUrl);
        reject(error);
      };
      
      this.ws.onclose = (event) => {
        console.log('📡 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        this.connected = false;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      // Timeout after 15 seconds (increased from 5)
      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.error('❌ WebSocket connection timeout. ReadyState:', this.ws.readyState);
          reject(new Error('WebSocket connection timeout'));
        }
      }, 15000);
    });
  }

  // Handle incoming messages from TV
  handleMessage(message) {
    console.log('📨 Received from TV:', message);
    
    switch (message.type) {
      case 'status_update':
        // Handle TV status updates
        break;
      case 'app_changed':
        // Handle app change notifications
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Disconnect from TV
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.tvInfo = null;
    this.baseUrl = null;
    console.log('📱 Disconnected from TV');
  }

  // Send command to TV via WebSocket
  sendCommand(command, data = {}) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Not connected to TV');
      return false;
    }

    const message = {
      type: 'remote_command',
      command: command,
      data: data,
      timestamp: Date.now()
    };

    try {
      this.ws.send(JSON.stringify(message));
      console.log('📤 Sent command:', command, data);
      return true;
    } catch (error) {
      console.error('❌ Error sending command:', error);
      return false;
    }
  }

  // Send HTTP request to TV
  async sendHTTPRequest(endpoint, method = 'GET', data = null) {
    if (!this.baseUrl) {
      throw new Error('Not connected to TV');
    }

    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ HTTP request failed:', error);
      throw error;
    }
  }

  // Remote Control Commands
  navigateUp() { return this.sendCommand('navigate', { direction: 'up' }); }
  navigateDown() { return this.sendCommand('navigate', { direction: 'down' }); }
  navigateLeft() { return this.sendCommand('navigate', { direction: 'left' }); }
  navigateRight() { return this.sendCommand('navigate', { direction: 'right' }); }
  select() { return this.sendCommand('select'); }
  back() { return this.sendCommand('back'); }
  home() { return this.sendCommand('home'); }

  // Volume Control
  volumeUp() { return this.sendCommand('volume', { action: 'up' }); }
  volumeDown() { return this.sendCommand('volume', { action: 'down' }); }
  mute() { return this.sendCommand('volume', { action: 'mute' }); }

  // App Control
  launchApp(appName) { return this.sendCommand('launch_app', { app: appName }); }
  
  // WiFi Control
  async getWiFiStatus() {
    return await this.sendHTTPRequest('/api/wifi/status');
  }

  async scanWiFiNetworks() {
    return await this.sendHTTPRequest('/api/wifi/scan');
  }

  async connectToWiFi(ssid, password, security = 'WPA2') {
    return await this.sendHTTPRequest('/api/wifi/connect', 'POST', {
      ssid,
      password,
      security
    });
  }

  // Get TV status
  async getTVStatus() {
    return await this.sendHTTPRequest('/api/status');
  }

  // Check if connected
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const SmartTVService = new SmartTVServiceClass();