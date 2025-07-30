// User identification utility for SmartTV
// Uses device ID as persistent username for cross-reinstall consistency

class UserUtils {
    constructor() {
        this.storageKey = 'smarttv_user_id';
        this.username = null;
        this.deviceId = null;
        this.serverUrl = null;
        this.isRegistered = false;
        this.configReady = false;
        
        // Try to get config immediately
        this.initializeConfig();
    }
    
    initializeConfig() {
        // Try electronAPI first (preload script)
        if (window.electronAPI?.getAppConfig) {
            const config = window.electronAPI.getAppConfig();
            if (config?.SERVER_URL) {
                this.serverUrl = config.SERVER_URL;
                this.configReady = true;
                console.log('Config loaded via electronAPI:', config);
                return;
            }
        }
        
        // Try window.appConfig (main process injection)
        if (window.appConfig?.SERVER_URL) {
            this.serverUrl = window.appConfig.SERVER_URL;
            this.configReady = true;
            console.log('Config loaded via window.appConfig:', window.appConfig);
            return;
        }
        
        // Wait for config to be ready
        console.log('Config not ready, waiting for configReady event...');
        window.addEventListener('configReady', (event) => {
            console.log('Config ready event received:', event.detail);
            this.serverUrl = event.detail.SERVER_URL;
            this.configReady = true;
        });
    }

    // Get device ID from system or fallback to localStorage
    async getDeviceId() {
        try {
            // First try to get device ID from system manager API
            if (this.serverUrl) {
                try {
                    const response = await fetch(`${this.serverUrl}/api/system/device-id`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.device_id) {
                            console.log('Retrieved device ID from system:', data.device_id);
                            return data.device_id;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to get device ID from system API:', error);
                }
            }
            
            // Fallback to localStorage (for compatibility)
            let deviceId = localStorage.getItem(this.storageKey);
            
            if (!deviceId) {
                // Generate a UUID-like device ID as final fallback
                deviceId = this.generateUUID();
                localStorage.setItem(this.storageKey, deviceId);
                console.log('Generated new device ID as fallback:', deviceId);
            } else {
                console.log('Loaded existing device ID from localStorage:', deviceId);
            }
            
            return deviceId;
        } catch (error) {
            console.warn('Error getting device ID, using session fallback:', error);
            // Final fallback for environments where localStorage might not be available
            if (!this.sessionDeviceId) {
                this.sessionDeviceId = this.generateUUID();
            }
            return this.sessionDeviceId;
        }
    }

    // Generate a UUID-like string for device identification
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Initialize username based on device ID
    async initializeUsername() {
        if (!this.username) {
            this.deviceId = await this.getDeviceId();
            this.username = this.deviceId;
            console.log('Username set to device ID:', this.username);
        }
        return this.username;
    }

    // Get the current username (async to ensure it's initialized)
    async getUsername() {
        if (!this.username) {
            await this.initializeUsername();
        }
        return this.username;
    }

    // Reset username (for testing/debugging)
    async resetUsername() {
        try {
            localStorage.removeItem(this.storageKey);
            this.username = null;
            this.deviceId = null;
            await this.initializeUsername();
            return this.username;
        } catch (error) {
            console.warn('Could not reset username:', error);
            return this.username;
        }
    }

    // Create and display the username element
    async displayUsername() {
        // Ensure username is initialized
        await this.initializeUsername();
        
        // Remove existing username display if any
        const existingDisplay = document.getElementById('user-id-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }

        // Create username display element with shorter device ID for display
        const displayId = this.username.length > 8 ? this.username.substring(0, 8) + '...' : this.username;
        const userDisplay = document.createElement('div');
        userDisplay.id = 'user-id-display';
        userDisplay.innerHTML = `Your Device ID: ${displayId} | <a href="super.html" style="color: rgba(255,255,255,0.8); text-decoration: none;">🔧 Admin</a>`;
        
        // Style the display element
        userDisplay.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            pointer-events: auto;
            user-select: none;
            max-width: 400px;
            cursor: pointer;
        `;

        // Add click to copy full device ID
        userDisplay.addEventListener('click', () => {
            navigator.clipboard?.writeText(this.username).then(() => {
                const originalText = userDisplay.innerHTML;
                userDisplay.innerHTML = `Device ID copied! | <a href="super.html" style="color: rgba(255,255,255,0.8); text-decoration: none;">🔧 Admin</a>`;
                setTimeout(() => {
                    userDisplay.innerHTML = originalText;
                }, 2000);
            }).catch(() => {
                console.log('Full Device ID:', this.username);
            });
        });

        // Add to document body
        document.body.appendChild(userDisplay);
        
        return userDisplay;
    }

    // Register user with backend server
    async registerWithServer() {
        try {
            // Ensure username is initialized first
            await this.initializeUsername();
            
            // First, check if user exists to avoid overwriting display_name
            const checkResponse = await fetch(`${this.serverUrl}/api/users/profile/${this.username}`);
            const isExistingUser = checkResponse.ok;
            
            // Prepare registration data
            const registrationData = {
                username: this.username,
                device_type: 'smarttv',
                metadata: {
                    device_id: this.deviceId,
                    user_agent: navigator.userAgent,
                    screen_resolution: `${screen.width}x${screen.height}`,
                    app_version: '1.0.0',
                    registration_time: new Date().toISOString()
                }
            };
            
            // Only set display_name for new users (to avoid overwriting existing custom display names)
            if (!isExistingUser) {
                // Use a shorter, user-friendly display name
                const shortId = this.username.length > 8 ? this.username.substring(0, 8) : this.username;
                registrationData.display_name = `Device-${shortId}`;
            }
            
            const response = await fetch(`${this.serverUrl}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.isRegistered = true;
                console.log('User registered with server:', data.user);
                
                if (data.user.is_new_user) {
                    console.log('Welcome new user!');
                } else {
                    console.log('Welcome back!');
                }
                
                return data.user;
            } else {
                console.error('Failed to register with server:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Error registering with server:', error);
            return null;
        }
    }

    // Get user profile from server
    async getUserProfile() {
        try {
            await this.initializeUsername();
            const response = await fetch(`${this.serverUrl}/api/users/profile/${this.username}`);
            const data = await response.json();
            
            if (data.success) {
                return data.user;
            } else {
                console.error('Failed to get user profile:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    // Save game score to server
    async saveGameScore(gameType, score, questionsAnswered, correctAnswers, gameDuration, roomName = null) {
        try {
            await this.initializeUsername();
            const response = await fetch(`${this.serverUrl}/api/users/game/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: this.username,
                    game_type: gameType,
                    score: score,
                    questions_answered: questionsAnswered,
                    correct_answers: correctAnswers,
                    game_duration: gameDuration,
                    room_name: roomName
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('Game score saved successfully');
                return true;
            } else {
                console.error('Failed to save game score:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Error saving game score:', error);
            return false;
        }
    }

    // Wait for config to be ready
    async waitForConfig() {
        if (this.configReady) return;
        
        return new Promise((resolve) => {
            const checkConfig = () => {
                if (this.configReady) {
                    resolve();
                    return;
                }
                
                // Check again in case config was set between checks
                this.initializeConfig();
                if (this.configReady) {
                    resolve();
                    return;
                }
                
                // Wait a bit and try again
                setTimeout(checkConfig, 100);
            };
            
            checkConfig();
        });
    }

    // Initialize username display and register with server when DOM is ready
    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                await this.waitForConfig();
                await this.initializeUsername();
                await this.displayUsername();
                await this.registerWithServer();
            });
        } else {
            await this.waitForConfig();
            await this.initializeUsername();
            await this.displayUsername();
            await this.registerWithServer();
        }
    }
}

// Create global instance
window.userUtils = new UserUtils();

// Auto-initialize when script loads
window.userUtils.init();

// Helper functions for compatibility with existing code
async function getCurrentUser() {
    await window.userUtils.waitForConfig();
    await window.userUtils.initializeUsername();
    if (!window.userUtils.isRegistered) {
        await window.userUtils.registerWithServer();
    }
    const username = await window.userUtils.getUsername();
    return {
        username: username,
        display_name: username
    };
}

async function registerWithServer() {
    return await window.userUtils.registerWithServer();
}

function getUserProfile() {
    return window.userUtils.getUserProfile();
}

function saveGameScore(gameType, score, questionsAnswered, correctAnswers, gameDuration, roomName = null) {
    return window.userUtils.saveGameScore(gameType, score, questionsAnswered, correctAnswers, gameDuration, roomName);
}