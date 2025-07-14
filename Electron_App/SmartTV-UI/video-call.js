// DOM Elements
const connectionUI = document.getElementById('connectionUI');
const callHeader = document.getElementById('callHeader');
const videoContainer = document.getElementById('videoContainer');
const controls = document.getElementById('controls');
const selfVideo = document.getElementById('selfVideo');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const cameraBtn = document.getElementById('cameraBtn');
const endCallBtn = document.getElementById('endCallBtn');
const connectBtn = document.getElementById('connectBtn');
const userNameInput = document.getElementById('userName');
const roomNameInput = document.getElementById('roomName');
const callTimer = document.getElementById('callTimer');
const participantCount = document.getElementById('participantCount');
const statusMessage = document.getElementById('statusMessage');
const roomTags = document.querySelectorAll('.room-tag');

let isMuted = false;
let isVideoOn = true;
let callActive = false;
let activeRoom = null;
let callStartTime = null;
let timerInterval = null;
let currentUserName = "Family Member";
let currentRoomName = "family-room";
let localTracks = [];

// Wait for config to be available
function getServerUrl() {
    const config = window.appConfig;
    console.log('Current window.appConfig:', config);
    const serverUrl = config?.SERVER_URL || 'http://20.244.19.161:3001';
    console.log('SERVER_URL being used:', serverUrl);
    return serverUrl;
} 

function showStatusMessage(message, duration = 3000) {
    statusMessage.textContent = message;
    statusMessage.classList.add('show');
    
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, duration);
}

function startCallTimer() {
    callStartTime = new Date();
    
    timerInterval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - callStartTime) / 1000);
        
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        
        callTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopCallTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateParticipantCount(count) {
    participantCount.textContent = count;
}

document.getElementById('backToConsoleBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (callActive) {
        const confirmLeave = confirm("Are you sure you want to leave the video call?");
        if (confirmLeave) {
            if (activeRoom) {
                activeRoom.disconnect();
            }
            window.location.href = "homepage.html";
            alert("Redirecting back to console...");
        }
    } else {
        window.location.href = "homepage.html";
        alert("Redirecting back to console...");
    }
});

async function connectToRoom() {
    console.log('🔵 CONNECT TO ROOM: Starting connection process');
    
    currentUserName = userNameInput.value.trim() || "Family Member";
    currentRoomName = roomNameInput.value.trim() || "family-room";
    
    console.log('🔵 Connection parameters:', {
        userName: currentUserName,
        roomName: currentRoomName,
        serverUrl: getServerUrl()
    });
    
    if (!currentRoomName) {
        console.error('❌ No room name provided');
        showStatusMessage("Please enter a room name");
        return;
    }
    
    showStatusMessage("Connecting to room...");
    
    try {
        console.log('🔵 Requesting Twilio token...');
        const tokenRequest = {
            identity: currentUserName,
            roomName: currentRoomName
        };
        console.log('🔵 Token request body:', tokenRequest);
        
        const response = await fetch(`${getServerUrl()}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tokenRequest)
        });
        
        console.log('🔵 Token response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error('Failed to get token from server');
        }
        
        const { token } = await response.json();
        
        const room = await Twilio.Video.connect(token, {
            name: currentRoomName,
            audio: true,
            video: { width: 640, height: 480 }
        });
        
        activeRoom = room;
        callActive = true;
        
        connectionUI.style.display = 'none';
        callHeader.style.display = 'flex';
        videoContainer.style.display = 'grid';
        controls.style.display = 'flex';
        
        startCallTimer();
        
        updateParticipantCount(room.participants.size + 1);
        
        room.localParticipant.tracks.forEach(publication => {
            if (publication.track) {
                attachTrack(publication.track, room.localParticipant);
            }
        });
        
        // Handle existing participants
        room.participants.forEach(participant => {
            participantConnected(participant);
        });
        
        // Handle new participants
        room.on('participantConnected', participantConnected);
        
        // Handle disconnections
        room.on('participantDisconnected', participantDisconnected);
        
        // Handle when we disconnect
        room.on('disconnected', roomDisconnected);
        
        showStatusMessage(`Connected to ${currentRoomName} room`);
    } catch (error) {
        console.error('Unable to connect to room:', error);
        showStatusMessage(`Connection failed: ${error.message}`, 5000);
    }
}

// Attach track to UI
function attachTrack(track, participant) {
    if (track.kind === 'video') {
        // Create video element for participant
        const participantElement = document.createElement('div');
        participantElement.className = 'participant';
        participantElement.id = `participant-${participant.sid}`;
        
        const videoElement = document.createElement('video');
        videoElement.className = 'participant-video';
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        const infoElement = document.createElement('div');
        infoElement.className = 'participant-info';
        
        const audioIndicator = document.createElement('div');
        audioIndicator.className = 'audio-indicator';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'participant-name';
        nameElement.textContent = participant.identity;
        
        infoElement.appendChild(audioIndicator);
        infoElement.appendChild(nameElement);
        
        participantElement.appendChild(videoElement);
        participantElement.appendChild(infoElement);
        
        videoContainer.appendChild(participantElement);
        
        // Attach track to video element
        track.attach(videoElement);
        
        // For local participant, we have a separate self-view
        if (participant === activeRoom.localParticipant) {
            track.attach(selfVideo);
        }
    } else if (track.kind === 'audio') {
        // Attach audio track
        track.attach();
    }
}

// Handle participant connection
function participantConnected(participant) {
    console.log('✅ PARTICIPANT CONNECTED:', {
        identity: participant.identity,
        sid: participant.sid,
        tracksCount: participant.tracks.size
    });
    
    updateParticipantCount(activeRoom.participants.size + 1);
    
    // Handle existing tracks
    participant.tracks.forEach(publication => {
        if (publication.track) {
            console.log('🔵 Attaching existing track:', publication.track.kind, 'for', participant.identity);
            attachTrack(publication.track, participant);
        }
    });
    
    // Handle new tracks
    participant.on('trackSubscribed', track => {
        console.log('🔵 NEW TRACK SUBSCRIBED:', track.kind, 'for', participant.identity);
        attachTrack(track, participant);
    });
    
    participant.on('trackUnsubscribed', track => {
        console.log('🔵 TRACK UNSUBSCRIBED:', track.kind, 'for', participant.identity);
        detachTrack(track, participant);
    });
}

// Handle participant disconnection
function participantDisconnected(participant) {
    updateParticipantCount(activeRoom.participants.size + 1);
    
    const participantElement = document.getElementById(`participant-${participant.sid}`);
    if (participantElement) {
        participantElement.remove();
    }
}

// Detach track from UI
function detachTrack(track, participant) {
    if (track.kind === 'video') {
        const participantElement = document.getElementById(`participant-${participant.sid}`);
        if (participantElement) {
            participantElement.remove();
        }
    }
}

// Handle room disconnection
function roomDisconnected(room) {
    // Detach all tracks
    room.localParticipant.tracks.forEach(trackPublication => {
        trackPublication.track.stop();
    });
    
    // Clear UI
    videoContainer.innerHTML = '';
    const selfView = document.createElement('div');
    selfView.className = 'self-view';
    const selfVideo = document.createElement('video');
    selfVideo.id = 'selfVideo';
    selfVideo.autoplay = true;
    selfVideo.playsInline = true;
    selfView.appendChild(selfVideo);
    videoContainer.appendChild(selfView);
    
    // Show connection UI
    connectionUI.style.display = 'flex';
    callHeader.style.display = 'none';
    videoContainer.style.display = 'none';
    controls.style.display = 'none';
    
    // Stop timer
    stopCallTimer();
    callTimer.textContent = '00:00';
    
    callActive = false;
    activeRoom = null;
    
    showStatusMessage("Disconnected from room");
}

// Event Listeners
connectBtn.addEventListener('click', connectToRoom);

roomTags.forEach(tag => {
    tag.addEventListener('click', () => {
        roomNameInput.value = tag.dataset.room;
    });
});

// Toggle mute
muteBtn.addEventListener('click', () => {
    if (!activeRoom) return;
    
    isMuted = !isMuted;
    const icon = muteBtn.querySelector('i');
    const circle = muteBtn.querySelector('.btn-circle');
    
    if (isMuted) {
        icon.className = 'fas fa-microphone-slash';
        circle.classList.add('btn-active');
        activeRoom.localParticipant.audioTracks.forEach(track => {
            track.track.disable();
        });
    } else {
        icon.className = 'fas fa-microphone';
        circle.classList.remove('btn-active');
        activeRoom.localParticipant.audioTracks.forEach(track => {
            track.track.enable();
        });
    }
});

// Toggle video
videoBtn.addEventListener('click', () => {
    if (!activeRoom) return;
    
    isVideoOn = !isVideoOn;
    const icon = videoBtn.querySelector('i');
    const circle = videoBtn.querySelector('.btn-circle');
    
    if (isVideoOn) {
        icon.className = 'fas fa-video';
        circle.classList.remove('btn-active');
        activeRoom.localParticipant.videoTracks.forEach(track => {
            track.track.enable();
        });
    } else {
        icon.className = 'fas fa-video-slash';
        circle.classList.add('btn-active');
        activeRoom.localParticipant.videoTracks.forEach(track => {
            track.track.disable();
        });
    }
});

// Switch camera
cameraBtn.addEventListener('click', async () => {
    if (!activeRoom) return;
    
    const icon = cameraBtn.querySelector('i');
    icon.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
    }, 500);
    
    try {
        // Get all video devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length < 2) {
            showStatusMessage("No other camera available");
            return;
        }
        
        // Determine next camera
        const currentDeviceId = localTracks[0].mediaStreamTrack.getSettings().deviceId;
        const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        const nextDevice = videoDevices[nextIndex];
        
        // Create new video track
        const newTrack = await Twilio.Video.createLocalVideoTrack({
            deviceId: { exact: nextDevice.deviceId }
        });
        
        // Replace existing video tracks
        const oldTrack = localTracks[0];
        activeRoom.localParticipant.unpublishTrack(oldTrack);
        oldTrack.stop();
        
        activeRoom.localParticipant.publishTrack(newTrack);
        newTrack.attach(selfVideo);
        
        localTracks = [newTrack];
        
        showStatusMessage(`Switched to ${nextDevice.label || 'camera'}`);
    } catch (error) {
        console.error('Error switching camera:', error);
        showStatusMessage(`Failed to switch camera: ${error.message}`);
    }
});

// End call
endCallBtn.addEventListener('click', () => {
    if (activeRoom) {
        activeRoom.disconnect();
    }
});

// Debug function for call parameters
function debugVideoCallParams() {
    console.log('=== VIDEO CALL DEBUG ===');
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    const caller = urlParams.get('caller');
    const callee = urlParams.get('callee');
    const answered = urlParams.get('answered');
    
    console.log('URL Parameters:', { room, caller, callee, answered });
    console.log('Full URL:', window.location.href);
    
    // Check DOM elements
    console.log('Room Name Input:', roomNameInput?.value);
    console.log('User Name Input:', userNameInput?.value);
    
    // Check config
    console.log('App Config:', window.appConfig);
    console.log('Server URL:', getServerUrl());
    
    return { room, caller, callee, answered };
}

// Interface switching functions
function showAutoConnectInterface(currentUser, roomName, callerParam, calleeParam, answeredParam) {
    const autoUI = document.getElementById('autoConnectUI');
    const manualUI = document.getElementById('manualConnectUI');
    
    // Hide manual interface
    manualUI.style.display = 'none';
    
    // Show auto-connecting interface
    autoUI.style.display = 'block';
    
    // Update the display information
    document.getElementById('displayUserName').textContent = currentUser.username;
    document.getElementById('displayRoomName').textContent = roomName;
    
    // Update call participants and status based on call type
    const callParticipants = document.getElementById('callParticipants');
    const callStatus = document.getElementById('callStatus');
    
    if (answeredParam === 'true') {
        // User 2 answering call
        callParticipants.textContent = `Call with ${callerParam}`;
        callStatus.textContent = 'Joining video call...';
        updateAutoConnectStatus('📞 Answering call', 'Connecting to video...', 1);
    } else {
        // User 1 initiating call
        callParticipants.textContent = `Calling ${calleeParam}`;
        callStatus.textContent = 'Starting video call...';
        updateAutoConnectStatus('📞 Initiating call', 'Setting up room...', 1);
    }
}

function showManualConnectInterface() {
    const autoUI = document.getElementById('autoConnectUI');
    const manualUI = document.getElementById('manualConnectUI');
    
    // Hide auto interface
    autoUI.style.display = 'none';
    
    // Show manual interface
    manualUI.style.display = 'block';
}

function updateAutoConnectStatus(title, message, step = 1) {
    const callParticipants = document.getElementById('callParticipants');
    const callStatus = document.getElementById('callStatus');
    
    if (title) callParticipants.textContent = title;
    if (message) callStatus.textContent = message;
    
    // Progress indicators
    const steps = [
        'Setting up video call...',
        'Connecting to room...',
        'Establishing connection...',
        'Ready to connect!'
    ];
    
    if (step <= steps.length) {
        callStatus.textContent = steps[step - 1];
    }
}

// Friends functionality
let friendsCheckInterval = null;

async function loadFriendsOnlineStatus() {
    console.log('🔵 Loading friends online status...');
    const friendsList = document.getElementById('friendsList');
    
    if (!friendsList) {
        console.warn('Friends list element not found');
        return;
    }
    
    try {
        // Get current user first
        let currentUser = null;
        try {
            currentUser = await getCurrentUser();
        } catch (error) {
            console.log('getCurrentUser failed, using fallback');
            currentUser = { username: currentUserName };
        }
        
        if (!currentUser || !currentUser.username) {
            console.warn('No current user found for friends check');
            return;
        }
        
        // Get friends list first, then check their online status
        const friendsResponse = await fetch(`${getServerUrl()}/api/users/friends/${currentUser.username}`);
        
        if (!friendsResponse.ok) {
            throw new Error(`HTTP ${friendsResponse.status}: ${friendsResponse.statusText}`);
        }
        
        const friendsData = await friendsResponse.json();
        
        if (friendsData.success && friendsData.friends && friendsData.friends.length > 0) {
            // Get online users to check friend status
            const onlineResponse = await fetch(`${getServerUrl()}/api/calls/online-users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (onlineResponse.ok) {
                const onlineData = await onlineResponse.json();
                const onlineUsers = onlineData.users || [];
                
                // Create friends list with online status
                const friendsWithStatus = friendsData.friends.map(friend => {
                    const isOnline = onlineUsers.some(user => user.username === friend.friend_username);
                    return {
                        username: friend.friend_username,
                        display_name: friend.friend_username,
                        is_online: isOnline
                    };
                });
                
                displayFriendsOnlineStatus(friendsWithStatus, currentUser.username);
            } else {
                // Just show friends without online status
                displayFriendsOnlineStatus(friendsData.friends.map(f => ({
                    username: f.friend_username,
                    display_name: f.friend_username,
                    is_online: false
                })), currentUser.username);
            }
        } else {
            console.log('No friends found');
            showNoFriendsMessage();
        }
        
    } catch (error) {
        console.error('Failed to load friends online status:', error);
        showNoFriendsMessage();
    }
}

function displayFriendsOnlineStatus(friends, currentUsername) {
    const friendsList = document.getElementById('friendsList');
    
    if (!friendsList) return;
    
    // Filter out current user from friends (if any)
    const filteredFriends = friends.filter(friend => friend.username !== currentUsername);
    
    if (filteredFriends.length === 0) {
        showNoFriendsMessage();
        return;
    }
    
    // Create friends list HTML
    friendsList.innerHTML = filteredFriends.map(friend => `
        <div class="friend-item" data-username="${friend.username}">
            <div class="friend-avatar">
                ${friend.display_name ? friend.display_name.charAt(0).toUpperCase() : friend.username.charAt(0).toUpperCase()}
                <div class="friend-online-dot ${friend.is_online ? '' : 'offline'}" style="${friend.is_online ? '' : 'background: #95a5a6;'}"></div>
            </div>
            <div class="friend-info">
                <div class="friend-name">${friend.display_name || friend.username}</div>
                <div class="friend-status">${friend.is_online ? 'Online now' : 'Offline'}</div>
            </div>
            <button class="friend-call-btn" onclick="startCallWithFriend('${friend.username}')" ${friend.is_online ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"'}>
                <i class="fas fa-phone"></i>
            </button>
        </div>
    `).join('');
    
    console.log(`🔵 Displayed ${filteredFriends.length} friends (${filteredFriends.filter(f => f.is_online).length} online)`);
}

function showNoFriendsMessage() {
    const friendsList = document.getElementById('friendsList');
    
    if (!friendsList) return;
    
    friendsList.innerHTML = `
        <div class="no-friends">
            <div class="no-friends-icon">👥</div>
            <p>No friends to call right now</p>
            <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 10px;">
                Add friends in the User Directory to start calling them!
            </p>
        </div>
    `;
}

function startCallWithFriend(friendUsername) {
    console.log('🔵 Starting call with friend:', friendUsername);
    
    // Fill in the friend's username as the room name for now
    // In a full implementation, this would initiate a proper call invitation
    roomNameInput.value = `call-with-${friendUsername}`;
    
    // Show a status message
    showStatusMessage(`Starting call with ${friendUsername}...`);
    
    // Connect to the room
    connectToRoom();
}

function startFriendsStatusCheck() {
    // Load friends immediately
    loadFriendsOnlineStatus();
    
    // Set up periodic checking every 10 seconds
    if (friendsCheckInterval) {
        clearInterval(friendsCheckInterval);
    }
    
    friendsCheckInterval = setInterval(() => {
        loadFriendsOnlineStatus();
    }, 10000);
    
    console.log('🔵 Friends status checking started (10s interval)');
}

function stopFriendsStatusCheck() {
    if (friendsCheckInterval) {
        clearInterval(friendsCheckInterval);
        friendsCheckInterval = null;
    }
    console.log('🔵 Friends status checking stopped');
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // DEBUG: Call debug function immediately
        const debugParams = debugVideoCallParams();
        
        // Check if we have URL parameters for auto-join
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        const callerParam = urlParams.get('caller');
        const calleeParam = urlParams.get('callee');
        const answeredParam = urlParams.get('answered');

        // Create local preview
        const tracks = await Twilio.Video.createLocalTracks({
            audio: true,
            video: { width: 640, height: 480 }
        });
        
        localTracks = tracks;
        
        // Attach video to self view
        const videoTrack = tracks.find(track => track.kind === 'video');
        if (videoTrack) {
            videoTrack.attach(selfVideo);
        }
        
        // Start friends status checking
        startFriendsStatusCheck();

        // If we have room parameters, auto-join the call
        if (roomParam && (callerParam || calleeParam)) {
            console.log('🔵 AUTO-JOIN MODE: URL has room parameters');
            
            // Get current user with fallback
            let currentUser = null;
            try {
                currentUser = await getCurrentUser();
            } catch (error) {
                console.log('🔵 getCurrentUser failed, using fallback');
            }
            
            console.log('🔵 Current user for video call:', currentUser);
            
            if (currentUser && currentUser.username) {
                currentUserName = currentUser.username;
                currentRoomName = roomParam;
                
                console.log('🔵 Setting up auto-join:', {
                    userName: currentUserName,
                    roomName: currentRoomName,
                    isAnswered: answeredParam === 'true'
                });
                
                // Show auto-connecting interface
                showAutoConnectInterface(currentUser, roomParam, callerParam, calleeParam, answeredParam);
                
                // Update hidden input fields for backend compatibility
                userNameInput.value = currentUserName;
                roomNameInput.value = currentRoomName;
                
                // Auto-connect to the room
                console.log('🔵 Starting auto-connect in 2 seconds...');
                setTimeout(() => {
                    console.log('🔵 Executing auto-connect now');
                    connectToRoom();
                }, 2000);
            } else {
                console.error('❌ No current user found for auto-join, using URL parameters as fallback');
                
                // Fallback: Use URL parameters directly
                if (callerParam && calleeParam && answeredParam === 'true') {
                    // User 2 answering call
                    currentUserName = calleeParam;
                } else if (callerParam) {
                    // User 1 initiating call  
                    currentUserName = callerParam;
                } else {
                    currentUserName = "Family Member";
                }
                
                currentRoomName = roomParam;
                
                console.log('🔵 Using fallback parameters:', {
                    userName: currentUserName,
                    roomName: currentRoomName
                });
                
                // Create fake user object for interface
                const fallbackUser = { username: currentUserName };
                showAutoConnectInterface(fallbackUser, roomParam, callerParam, calleeParam, answeredParam);
                
                // Update input fields
                userNameInput.value = currentUserName;
                roomNameInput.value = currentRoomName;
                
                // Auto-connect
                setTimeout(() => {
                    console.log('🔵 Executing fallback auto-connect');
                    connectToRoom();
                }, 2000);
            }
        } else {
            console.log('🔵 MANUAL MODE: No room parameters, waiting for user input');
            showManualConnectInterface();
            showStatusMessage("Camera and microphone ready", 2000);
        }
    } catch (error) {
        console.error('Unable to access camera and microphone:', error);
        showStatusMessage("Camera/microphone access denied", 5000);
    }
});

// Stop friends checking when leaving the page
window.addEventListener('beforeunload', () => {
    stopFriendsStatusCheck();
});