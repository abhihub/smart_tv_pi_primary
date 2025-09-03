class SmartTVServiceClass {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.tvInfo = null;
    this.baseUrl = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.pingInterval = null;
    this.pongTimeout = null;
    this.reconnectTimeout = null;
    this.isReconnecting = false;
    this.shouldReconnect = true;
    this.lastPingTime = null;
    this.connectionListeners = [];
  }

  // Connect to SmartTV
  async connect(tvInfo) {
    try {
      console.log('🔗 Starting connection to:', tvInfo);
      this.tvInfo = tvInfo;
      this.baseUrl = `http://${tvInfo.ip}:${tvInfo.port || 8080}`;
      console.log('📡 Base URL:', this.baseUrl);
      
      this.shouldReconnect = true;
      this.reconnectAttempts = 0;
      
      // Skip HTTP test for now, go directly to WebSocket
      console.log('🔌 Establishing WebSocket connection directly...');
      await this.connectWebSocket();
      
      this.connected = true;
      this.startHeartbeat();
      console.log('✅ Successfully connected to SmartTV:', tvInfo.name);
      this.notifyConnectionListeners('connected');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to TV:', error.message);
      console.error('❌ Full error:', error);
      this.connected = false;
      this.notifyConnectionListeners('failed', error);
      return false;
    }
  }

  // Connect WebSocket for real-time communication
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.tvInfo.ip}:${this.tvInfo.port || 8080}`;
      console.log('🔌 Connecting WebSocket to:', wsUrl);
      console.log('🔍 Environment check:', {
        platform: global?.Platform?.OS || 'unknown',
        isExpoGo: global?.__DEV__ || false,
        webSocketSupport: typeof WebSocket !== 'undefined',
        networkState: global?.navigator?.connection?.effectiveType || 'unknown'
      });
      
      try {
        this.ws = new WebSocket(wsUrl);
        console.log('📱 WebSocket instance created successfully');
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          console.log('📋 WebSocket details:', {
            url: this.ws.url,
            readyState: this.ws.readyState,
            protocol: this.ws.protocol,
            extensions: this.ws.extensions
          });
          resolve();
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error details:', {
            error: error,
            message: error.message,
            type: error.type,
            target: error.target,
            readyState: this.ws.readyState,
            url: wsUrl,
            timestamp: new Date().toISOString()
          });
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log('📡 WebSocket disconnected details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            timestamp: new Date().toISOString()
          });
          this.connected = false;
          this.stopHeartbeat();
          this.notifyConnectionListeners('disconnected', event);
          
          if (this.shouldReconnect && !this.isReconnecting) {
            this.scheduleReconnect();
          }
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
            console.error('❌ WebSocket connection timeout details:', {
              readyState: this.ws.readyState,
              readyStateText: this.getReadyStateText(this.ws.readyState),
              url: wsUrl,
              timestamp: new Date().toISOString()
            });
            reject(new Error('WebSocket connection timeout after 15 seconds'));
          }
        }, 15000);
        
      } catch (constructorError) {
        console.error('❌ WebSocket constructor failed:', {
          error: constructorError,
          message: constructorError.message,
          url: wsUrl,
          timestamp: new Date().toISOString()
        });
        reject(constructorError);
      }
    });
  }

  // Helper method to get readable WebSocket ready state
  getReadyStateText(state) {
    const states = {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSING',
      3: 'CLOSED'
    };
    return states[state] || 'UNKNOWN';
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
      case 'pong':
        // Handle pong response
        this.handlePong(message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Disconnect from TV
  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.tvInfo = null;
    this.baseUrl = null;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners('disconnected');
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

  // Start heartbeat mechanism
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      }
    }, 30000); // Ping every 30 seconds
    
    console.log('❤️ Heartbeat started');
  }

  // Stop heartbeat mechanism
  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    console.log('❤️ Heartbeat stopped');
  }

  // Send ping to TV
  sendPing() {
    if (!this.isConnected()) return;
    
    this.lastPingTime = Date.now();
    const message = {
      type: 'ping',
      timestamp: this.lastPingTime
    };
    
    try {
      this.ws.send(JSON.stringify(message));
      console.log('🏓 Ping sent');
      
      // Set timeout for pong response
      this.pongTimeout = setTimeout(() => {
        console.error('❌ Pong timeout - connection may be stale');
        if (this.ws) {
          this.ws.close();
        }
      }, 10000); // 10 second timeout for pong
      
    } catch (error) {
      console.error('❌ Failed to send ping:', error);
    }
  }

  // Handle pong response
  handlePong(message) {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    
    const latency = Date.now() - this.lastPingTime;
    console.log(`🏓 Pong received - latency: ${latency}ms`);
  }

  // Schedule reconnection attempt
  scheduleReconnect() {
    if (this.isReconnecting || !this.shouldReconnect) return;
    
    this.isReconnecting = true;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(async () => {
      await this.attemptReconnect();
    }, delay);
  }

  // Attempt to reconnect
  async attemptReconnect() {
    if (!this.shouldReconnect) {
      this.isReconnecting = false;
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.isReconnecting = false;
      this.notifyConnectionListeners('max_reconnects_reached');
      return;
    }
    
    try {
      await this.connectWebSocket();
      this.connected = true;
      this.reconnectAttempts = 0; // Reset on successful connection
      this.isReconnecting = false;
      this.startHeartbeat();
      console.log('✅ Reconnection successful');
      this.notifyConnectionListeners('reconnected');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.isReconnecting = false;
      this.scheduleReconnect(); // Try again
    }
  }

  // Clear reconnection timer
  clearReconnectTimer() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isReconnecting = false;
  }

  // Add connection listener
  addConnectionListener(callback) {
    this.connectionListeners.push(callback);
  }

  // Remove connection listener
  removeConnectionListener(callback) {
    this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
  }

  // Notify all connection listeners
  notifyConnectionListeners(status, data) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(status, data);
      } catch (error) {
        console.error('❌ Error in connection listener:', error);
      }
    });
  }

  // Force reconnection (for manual retry)
  forceReconnect() {
    if (this.connected && this.ws) {
      this.ws.close();
    } else {
      this.attemptReconnect();
    }
  }

  // Get connection status with details
  getConnectionStatus() {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      shouldReconnect: this.shouldReconnect,
      tvInfo: this.tvInfo
    };
  }
}

// Export singleton instance
export const SmartTVService = new SmartTVServiceClass();