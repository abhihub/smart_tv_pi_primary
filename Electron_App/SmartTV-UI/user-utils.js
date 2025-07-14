// User identification utility for SmartTV
// Generates and manages persistent usernames using localStorage

class UserUtils {
    constructor() {
        this.storageKey = 'smarttv_user_id';
        this.username = this.getOrCreateUsername();
        this.serverUrl = window.appConfig?.SERVER_URL || 'http://localhost:3001';
        this.isRegistered = false;
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
        userDisplay.innerHTML = `Your Call ID is: ${this.username}`;
        
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
            pointer-events: none;
            user-select: none;
        `;

        // Add to document body
        document.body.appendChild(userDisplay);
        
        return userDisplay;
    }

    // Register user with backend server
    async registerWithServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userid: `APP${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
                    username: this.username,
                    display_name: this.username,
                    device_type: 'smarttv',
                    metadata: {
                        user_agent: navigator.userAgent,
                        screen_resolution: `${screen.width}x${screen.height}`,
                        app_version: '1.0.0',
                        registration_time: new Date().toISOString()
                    }
                })
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

    // Initialize username display and register with server when DOM is ready
    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                this.displayUsername();
                await this.registerWithServer();
            });
        } else {
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
    if (!window.userUtils.isRegistered) {
        await window.userUtils.registerWithServer();
    }
    return {
        username: window.userUtils.getUsername(),
        display_name: window.userUtils.getUsername()
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