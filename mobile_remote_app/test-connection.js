// Test script to verify WebSocket connection stability fixes
const WebSocket = require('ws');

const TEST_TV_IP = '192.168.86.42';
const TEST_TV_PORT = 8080;

class TestSmartTVService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    this.pongTimeout = null;
    this.isReconnecting = false;
    this.shouldReconnect = true;
    this.lastPingTime = null;
  }

  async connect() {
    try {
      console.log(`🔗 Testing connection to ${TEST_TV_IP}:${TEST_TV_PORT}`);
      await this.connectWebSocket();
      this.connected = true;
      this.startHeartbeat();
      console.log('✅ Connection successful!');
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${TEST_TV_IP}:${TEST_TV_PORT}`;
      console.log(`🔌 Connecting to: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      };
      
      this.ws.onclose = (event) => {
        console.log(`📡 WebSocket disconnected: ${event.code} ${event.reason}`);
        this.connected = false;
        this.stopHeartbeat();
        
        if (this.shouldReconnect && !this.isReconnecting) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received:', message.type);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Message parse error:', error);
        }
      };
      
      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'pong':
        this.handlePong(message);
        break;
      case 'connection_established':
        console.log('🎉 Connection established message received');
        break;
      default:
        console.log(`📨 Unknown message type: ${message.type}`);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      }
    }, 30000); // 30 second ping
    
    console.log('❤️ Heartbeat started (30s interval)');
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

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
      
      this.pongTimeout = setTimeout(() => {
        console.error('❌ Pong timeout - closing connection');
        if (this.ws) {
          this.ws.close();
        }
      }, 10000);
      
    } catch (error) {
      console.error('❌ Failed to send ping:', error);
    }
  }

  handlePong(message) {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    
    const latency = Date.now() - this.lastPingTime;
    console.log(`🏓 Pong received - latency: ${latency}ms`);
  }

  scheduleReconnect() {
    if (this.isReconnecting || !this.shouldReconnect) return;
    
    this.isReconnecting = true;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 10000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(async () => {
      await this.attemptReconnect();
    }, delay);
  }

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
      return;
    }
    
    try {
      await this.connectWebSocket();
      this.connected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startHeartbeat();
      console.log('✅ Reconnection successful');
    } catch (error) {
      console.error('❌ Reconnection failed:', error.message);
      this.isReconnecting = false;
      this.scheduleReconnect();
    }
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  sendCommand(command, data = {}) {
    if (!this.isConnected()) {
      console.error('❌ Not connected');
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
      console.log(`📤 Sent command: ${command}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send command:', error);
      return false;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    console.log('👋 Disconnected');
  }
}

// Run test
async function runTest() {
  console.log('🧪 Starting WebSocket connection stability test...\n');
  
  const service = new TestSmartTVService();
  
  // Test initial connection
  const connected = await service.connect();
  if (!connected) {
    console.log('❌ Initial connection failed - check if Electron app is running');
    process.exit(1);
  }
  
  // Test sending commands
  setTimeout(() => {
    console.log('\n🎮 Testing remote commands...');
    service.sendCommand('navigate', { direction: 'up' });
    service.sendCommand('select');
    service.sendCommand('volume', { action: 'up' });
  }, 2000);
  
  // Test connection resilience (will be handled by heartbeat)
  console.log('\n⏰ Monitoring connection for 2 minutes...');
  console.log('📝 You can manually disconnect the Electron app to test reconnection');
  
  // Keep test running for 2 minutes
  setTimeout(() => {
    console.log('\n✅ Test completed successfully');
    service.disconnect();
    process.exit(0);
  }, 120000);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted');
  process.exit(0);
});

runTest().catch(console.error);