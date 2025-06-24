// User identification utility for SmartTV
// Generates and manages persistent usernames using localStorage

class UserUtils {
    constructor() {
        this.storageKey = 'smarttv_user_id';
        this.username = this.getOrCreateUsername();
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

    // Initialize username display when DOM is ready
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.displayUsername();
            });
        } else {
            this.displayUsername();
        }
    }
}

// Create global instance
window.userUtils = new UserUtils();

// Auto-initialize when script loads
window.userUtils.init();