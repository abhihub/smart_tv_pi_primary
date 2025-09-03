/**
 * User identification utility for SmartTV
 * Generates and manages persistent usernames using localStorage
 * Handles user registration with backend server and presence management
 */
class UserUtils {
    constructor() {
        this.storageKey = 'smarttv_user_id';
        this.username = this.getOrCreateUsername();
        this.serverUrl = null;
        this.isRegistered = false;
        this.configReady = false;
        
        // Try to get config immediately
        this.initializeConfig();
    }
    
    /**
     * Initialize configuration by trying multiple sources in order:
     * 1. electronAPI (preload script) - highest priority
     * 2. window.appConfig (main process injection) - fallback
     * 3. configReady event listener - async fallback
     * This ensures the server URL is available for API calls
     */
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

    // Generate a random 5-character alphanumeric string
    generateUsername() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Get existing username from localStorage or create new one
    getOrCreateUsername() {
        try {
            let username = localStorage.getItem(this.storageKey);
            
            if (!username) {
                username = this.generateUsername();
                localStorage.setItem(this.storageKey, username);
                console.log('Generated new username:', username);
            } else {
                console.log('Loaded existing username:', username);
            }
            
            return username;
        } catch (error) {
            console.warn('localStorage not available, using session username:', error);
            // Fallback for environments where localStorage might not be available
            if (!this.sessionUsername) {
                this.sessionUsername = this.generateUsername();
            }
            return this.sessionUsername;
        }
    }

    // Get the current username
    getUsername() {
        return this.username;
    }

    // Reset username (for testing/debugging)
    resetUsername() {
        try {
            localStorage.removeItem(this.storageKey);
            this.username = this.getOrCreateUsername();
            return this.username;
        } catch (error) {
            console.warn('Could not reset username:', error);
            return this.username;
        }
    }

    // Create and display the username element
    displayUsername() {
        // Remove existing username display if any
        const existingDisplay = document.getElementById('user-id-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }

        // Create username display element
        const userDisplay = document.createElement('div');
        userDisplay.id = 'user-id-display';
        userDisplay.innerHTML = `Your Call ID is: ${this.username} | <a href="super.html" style="color: rgba(255,255,255,0.8); text-decoration: none;">🔧 Admin</a>`;
        
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
        `;

        // Add to document body
        document.body.appendChild(userDisplay);
        
        return userDisplay;
    }

    // Register user with backend server
    async registerWithServer() {
        try {
            // First, check if user exists to avoid overwriting display_name
            const checkResponse = await fetch(`${this.serverUrl}/api/users/profile/${this.username}`);
            const isExistingUser = checkResponse.ok;
            
            // Prepare registration data
            const registrationData = {
                username: this.username,
                device_type: 'smarttv',
                metadata: {
                    user_agent: navigator.userAgent,
                    screen_resolution: `${screen.width}x${screen.height}`,
                    app_version: '1.0.0',
                    registration_time: new Date().toISOString()
                }
            };
            
            // Only set display_name for new users (to avoid overwriting existing custom display names)
            if (!isExistingUser) {
                registrationData.display_name = this.username;
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
                this.displayUsername();
                await this.registerWithServer();
            });
        } else {
            await this.waitForConfig();
            this.displayUsername();
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
    // Don't register again if already registered
    return {
        username: window.userUtils.getUsername(),
        display_name: window.userUtils.getUsername()
    };
}

// This function is no longer needed - use window.userUtils.registerWithServer() directly

function getUserProfile() {
    return window.userUtils.getUserProfile();
}

function saveGameScore(gameType, score, questionsAnswered, correctAnswers, gameDuration, roomName = null) {
    return window.userUtils.saveGameScore(gameType, score, questionsAnswered, correctAnswers, gameDuration, roomName);
}