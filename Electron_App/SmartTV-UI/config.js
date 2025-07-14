const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check if we should use local server
const isLocalDev = process.env.USE_LOCAL_SERVER === 'true' || process.env.NODE_ENV === 'development';

const config = {
  // Backend server configuration
  SERVER_URL:'http://localhost:3001',
  //SERVER_URL: 'http://20.244.19.161:3001',
  // WebSocket configuration  
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
  
  // Development flag
  isDevelopment: process.env.NODE_ENV === 'development',
  isLocalDev: isLocalDev
};

module.exports = config;