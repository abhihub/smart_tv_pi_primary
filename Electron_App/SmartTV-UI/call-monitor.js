// Call monitoring service for incoming calls
class CallMonitor {
    constructor() {
        this.isMonitoring = false;
        this.currentUser = null;
        this.checkInterval = null;
        this.notificationInterval = 3000; // Check every 3 seconds
    }

    // Get server URL from config
    getServerUrl() {
        return window.appConfig?.SERVER_URL || 'http://167.71.0.87:3001';
    }

    // Start monitoring for incoming calls
    async startMonitoring() {
        if (this.isMonitoring) return;

        try {
            // Get current user
            this.currentUser = await getCurrentUser();
            if (!this.currentUser) {
                console.log('No current user found, cannot monitor calls');
                return;
            }

            this.isMonitoring = true;
            console.log(`Started call monitoring for user: ${this.currentUser.username}`);

            // Start checking for pending calls
            this.checkInterval = setInterval(() => {
                this.checkForPendingCalls();
            }, this.notificationInterval);

            // Do an immediate check
            this.checkForPendingCalls();

        } catch (error) {
            console.error('Failed to start call monitoring:', error);
        }
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isMonitoring = false;
        console.log('Stopped call monitoring');
    }

    // Check for pending calls
    async checkForPendingCalls() {
        if (!this.currentUser || !this.isMonitoring) return;

        try {
            const response = await fetch(`${this.getServerUrl()}/api/calls/pending/${this.currentUser.username}`);
            
            if (!response.ok) {
                // Don't log errors for monitoring checks to avoid spam
                return;
            }

            const data = await response.json();
            
            if (data.success && data.calls && data.calls.length > 0) {
                // Get the most recent pending call
                const pendingCall = data.calls[0];
                
                // Show incoming call notification
                this.handleIncomingCall(pendingCall);
            }

        } catch (error) {
            // Silently handle errors to avoid console spam
            console.debug('Call monitoring check failed:', error.message);
        }
    }

    // Handle incoming call notification
    handleIncomingCall(call) {
        console.log('Incoming call detected:', call);
        
        // Stop monitoring temporarily to prevent multiple notifications
        this.stopMonitoring();

        // Show incoming call notification
        this.showIncomingCallNotification(call);
    }

    // Show incoming call notification
    showIncomingCallNotification(call) {
        // Create notification overlay
        const notification = document.createElement('div');
        notification.id = 'incomingCallNotification';
        notification.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(20px);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.5s ease-out;
        `;

        notification.innerHTML = `
            <div style="
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border-radius: 25px;
                padding: 40px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 400px;
                width: 90%;
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="font-size: 1.2rem; opacity: 0.7; margin-bottom: 20px;">Incoming Call</div>
                <div style="
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    font-weight: bold;
                    margin: 0 auto 20px auto;
                    animation: pulse 2s ease-in-out infinite;
                ">${call.caller_username.substring(0, 2)}</div>
                <div style="font-size: 2rem; font-weight: 600; margin-bottom: 10px;">${call.caller_username}</div>
                <div style="font-size: 1rem; opacity: 0.6; margin-bottom: 30px;">is calling you</div>
                <div style="display: flex; gap: 20px; justify-content: center;">
                    <button onclick="callMonitor.answerCall('${call.call_id}', '${call.caller_username}')" style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        border: none;
                        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">📞</button>
                    <button onclick="callMonitor.declineCall('${call.call_id}')" style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        border: none;
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">❌</button>
                </div>
            </div>
        `;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
                70% { box-shadow: 0 0 0 20px rgba(102, 126, 234, 0); }
                100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-decline after 30 seconds
        setTimeout(() => {
            if (document.getElementById('incomingCallNotification')) {
                this.declineCall(call.call_id);
            }
        }, 30000);
    }

    // Answer incoming call
    async answerCall(callId, callerUsername) {
        try {
            this.hideNotification();

            const response = await fetch(`${this.getServerUrl()}/api/calls/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    call_id: callId,
                    callee: this.currentUser.username
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to answer call');
            }

            // Redirect to video call
            const roomName = data.call.room_name;
            window.location.href = `video-call.html?room=${roomName}&caller=${callerUsername}&callee=${this.currentUser.username}&answered=true`;

        } catch (error) {
            console.error('Failed to answer call:', error);
            this.showError(`Failed to answer call: ${error.message}`);
            this.hideNotification();
            this.startMonitoring(); // Resume monitoring
        }
    }

    // Decline incoming call
    async declineCall(callId) {
        try {
            this.hideNotification();

            const response = await fetch(`${this.getServerUrl()}/api/calls/decline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    call_id: callId,
                    callee: this.currentUser.username
                })
            });

            // Resume monitoring after a brief delay
            setTimeout(() => {
                this.startMonitoring();
            }, 2000);

        } catch (error) {
            console.error('Failed to decline call:', error);
            this.hideNotification();
            this.startMonitoring(); // Resume monitoring
        }
    }

    // Hide notification
    hideNotification() {
        const notification = document.getElementById('incomingCallNotification');
        if (notification) {
            notification.remove();
        }
    }

    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10001;
            font-size: 1rem;
            box-shadow: 0 8px 20px rgba(231, 76, 60, 0.4);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Update presence status
    async updatePresence(status = 'online') {
        if (!this.currentUser) return;

        try {
            await fetch(`${this.getServerUrl()}/api/calls/presence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.currentUser.username,
                    status: status
                })
            });
        } catch (error) {
            console.debug('Failed to update presence:', error.message);
        }
    }
}

// Create global instance
const callMonitor = new CallMonitor();

// Auto-start monitoring when user utils are available
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for user-utils to be ready
    setTimeout(async () => {
        if (typeof getCurrentUser === 'function') {
            await callMonitor.startMonitoring();
            await callMonitor.updatePresence('online');
        }
    }, 1000);
});

// Update presence when page becomes visible/hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        callMonitor.updatePresence('away');
    } else {
        callMonitor.updatePresence('online');
        callMonitor.startMonitoring();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    callMonitor.stopMonitoring();
    callMonitor.updatePresence('offline');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallMonitor;
}