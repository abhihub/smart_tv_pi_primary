#!/usr/bin/env node

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const QRCode = require('qrcode');
const os = require('os');

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

console.log('🚀 Starting SmartTV Remote Control Server...');

// Get device IP
const deviceIP = getDeviceIP();
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

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server
const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  console.log(`📱 Mobile app connected from ${clientIP}`);
  
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
      
      // Handle different command types
      if (message.type === 'remote_command') {
        handleRemoteCommand(message);
      }
      
      // Echo back acknowledgment
      ws.send(JSON.stringify({
        type: 'command_ack',
        command: message.command,
        status: 'executed',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`📱 Mobile app disconnected from ${clientIP}`);
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
  
  // Generate QR code data
  const qrData = JSON.stringify({
    type: 'smarttv_connection',
    ip: deviceIP,
    port: PORT,
    device_name: 'SmartTV Device',
    version: '1.0.0',
    timestamp: Date.now()
  });
  
  console.log(`📱 QR Code Data: ${qrData}`);
  
  // Generate QR code
  QRCode.toString(qrData, { type: 'terminal' }, (err, url) => {
    if (err) {
      console.error('❌ Error generating QR code:', err);
    } else {
      console.log('\n📱 QR Code for mobile app:\n');
      console.log(url);
      console.log('\n🔗 Server is ready for connections!');
    }
  });
});

// Handle remote commands (simulate Electron app responses)
function handleRemoteCommand(message) {
  const { command, data } = message;
  
  console.log(`🎮 Executing command: ${command}`, data || '');
  
  switch (command) {
    case 'navigate':
      console.log(`🎮 Navigation: ${data.direction} (simulated)`);
      // In real Electron app, this would send key events
      break;
    case 'select':
      console.log('🎮 Select/Enter pressed (simulated)');
      break;
    case 'back':
      console.log('🎮 Back/Escape pressed (simulated)');
      break;
    case 'home':
      console.log('🎮 Home button pressed (simulated)');
      break;
    case 'volume':
      console.log(`🎮 Volume: ${data.action} (simulated)`);
      break;
    case 'launch_app':
      console.log(`🎮 Launch app: ${data.app} (simulated)`);
      break;
    case 'power':
    case 'shutdown':
      console.log('🔌 Power/Shutdown command (simulated)');
      break;
    default:
      console.log(`🎮 Unknown command: ${command} (simulated)`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});