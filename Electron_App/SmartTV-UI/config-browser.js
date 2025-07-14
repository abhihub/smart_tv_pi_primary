// Browser-compatible configuration
// This file provides global configuration variables for use in HTML files

window.APP_CONFIG = {
    // Backend server configuration
    SERVER_URL: 'http://localhost:3001',
    
    // WebSocket configuration  
    WEBSOCKET_URL: 'ws://localhost:3000',
    
    // Development flag
    isDevelopment: true,
    isLocalDev: true
};

// Add logging to see which server URL is being used
console.log('🔗 APP CONFIG LOADED:', window.APP_CONFIG);
console.log('🔗 SERVER_URL set to:', window.APP_CONFIG.SERVER_URL);