// Call monitoring service for incoming calls
class CallMonitor {
    constructor() {
        this.isMonitoring = false;
        this.currentUser = null;
        this.checkInterval = null;
        this.notificationInterval = 1000; // Check every 1 seconds
    }

    // Get server URL from config - waits for config to be ready
    async getServerUrl() {
        // Try electronAPI first (preload script)
        if (window.electronAPI?.getAppConfig) {
            const config = window.electronAPI.getAppConfig();
            if (config?.SERVER_URL) {
                return config.SERVER_URL;
            }
        }
        
        // Try window.appConfig (main process injection)
        if (window.appConfig?.SERVER_URL) {
            return window.appConfig.SERVER_URL;
        }
        
        // Wait for config to be ready
        return new Promise((resolve) => {
            const checkConfig = () => {
                // Check electronAPI again
                if (window.electronAPI?.getAppConfig) {
                    const config = window.electronAPI.getAppConfig();
                    if (config?.SERVER_URL) {
                        resolve(config.SERVER_URL);
                        return;
                    }
                }
                
                // Check window.appConfig again
                if (window.appConfig?.SERVER_URL) {
                    resolve(window.appConfig.SERVER_URL);
                    return;
                }
                
                // Wait a bit and try again
                setTimeout(checkConfig, 100);
            };
            
            // Also listen for configReady event
            window.addEventListener('configReady', (event) => {
                if (event.detail?.SERVER_URL) {
                    resolve(event.detail.SERVER_URL);
                }
            }, { once: true });
            
            checkConfig();
        });
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
            const serverUrl = await this.getServerUrl();
            const response = await fetch(`${serverUrl}/api/calls/pending/${this.currentUser.username}`);
            
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
        
    }

    
    // Answer incoming call
    async answerCall(callId, callerUsername) {
        try {
            this.hideNotification();

            const serverUrl = await this.getServerUrl();
            const response = await fetch(`${serverUrl}/api/calls/answer`, {
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

            const serverUrl = await this.getServerUrl();
            const response = await fetch(`${serverUrl}/api/calls/decline`, {
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
            const serverUrl = await this.getServerUrl();
            await fetch(`${serverUrl}/api/calls/presence`, {
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

    // Static method to create beautiful incoming call UI for any page
    static createIncomingCallUI(call, answerCallback, declineCallback) {  
        // Remove existing notification if any
        const existing = document.getElementById('incomingCallNotification');
        if (existing) {
            existing.remove();
        }

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

        // Generate initials for avatar
        const initials = call.caller_username.substring(0, 2).toUpperCase();

        notification.innerHTML = `
            <div style="
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border-radius: 30px;
                padding: 60px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 500px;
                width: 90%;
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                animation: scaleIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            ">
                <div style="font-size: 1.2rem; opacity: 0.7; margin-bottom: 20px; animation: fadeIn 1s ease-out 0.5s both;">Incoming Call</div>
                <div style="
                    width: 150px;
                    height: 150px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                    font-weight: bold;
                    margin: 0 auto 30px auto;
                    animation: pulse 2s ease-in-out infinite;
                    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
                ">${initials}</div>
                <div style="font-size: 2.5rem; font-weight: 600; margin-bottom: 10px; animation: fadeIn 1s ease-out 0.7s both;">${call.caller_username}</div>
                <div style="font-size: 1.1rem; opacity: 0.6; margin-bottom: 40px; animation: fadeIn 1s ease-out 0.9s both;">is calling you</div>
                <div style="display: flex; gap: 40px; justify-content: center; animation: fadeIn 1s ease-out 1.1s both;">
                    <button id="answerCallBtn" class="call-btn answer-btn" data-focusable="true" style="
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        border: none;
                        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                        color: white;
                        font-size: 2rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                    " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 15px 35px rgba(46, 204, 113, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.3)'">📞</button>
                    <button id="declineCallBtn" class="call-btn decline-btn" data-focusable="true" style="
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        border: none;
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        color: white;
                        font-size: 2rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                    " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 15px 35px rgba(231, 76, 60, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.3)'">❌</button>
                </div>
            </div>
        `;

        // Add CSS animations if not already added
        if (!document.getElementById('incomingCallStyles')) {
            const style = document.createElement('style');
            style.id = 'incomingCallStyles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
                    70% { box-shadow: 0 0 0 20px rgba(102, 126, 234, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Refresh TV remote to make buttons focusable, then constrain focus to popup
        if (window.tvRemote) {
            console.log('📞 Refreshing TV remote and constraining focus to call popup');
            window.tvRemote.refresh();
            // Small delay to ensure DOM is ready, then constrain focus
            setTimeout(() => {
                window.tvRemote.constrainFocusToContainer(notification);
            }, 50);
        }

        // Add event listeners
        document.getElementById('answerCallBtn').addEventListener('click', () => {
            // Hide UI and restore focus immediately
            CallMonitor.hideIncomingCallUI();
            answerCallback(call);
        });

        document.getElementById('declineCallBtn').addEventListener('click', () => {
            // Hide UI and restore focus immediately
            CallMonitor.hideIncomingCallUI();
            declineCallback(call);
        });

        // Auto-decline after 30 seconds
        setTimeout(() => {
            if (document.getElementById('incomingCallNotification')) {
                // Hide UI and restore focus before auto-decline
                CallMonitor.hideIncomingCallUI();
                declineCallback(call);
            }
        }, 30000);

        return notification;
    }

    // Static method to hide incoming call UI
    static hideIncomingCallUI() {
        const notification = document.getElementById('incomingCallNotification');
        if (notification) {
            notification.remove();
        }
        
        // Restore original TV remote focus scope
        if (window.tvRemote) {
            window.tvRemote.restoreOriginalFocusScope();
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