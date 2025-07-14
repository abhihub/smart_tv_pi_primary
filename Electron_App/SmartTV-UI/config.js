const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  // Backend server configuration
  SERVER_URL: process.env.SERVER_URL || 'http://20.244.19.161:3001',
  
  // WebSocket configuration  
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
  
  // Development flag
  isDevelopment: process.env.NODE_ENV === 'development',
};

module.exports = config;