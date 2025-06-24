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
    const serverUrl = config?.SERVER_URL || 'http://localhost:3001';
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
    currentUserName = userNameInput.value.trim() || "Family Member";
    currentRoomName = roomNameInput.value.trim() || "family-room";
    
    if (!currentRoomName) {
        showStatusMessage("Please enter a room name");
        return;
    }
    
    showStatusMessage("Connecting to room...");
    
    try {
        const response = await fetch(`${getServerUrl()}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identity: currentUserName,
                roomName: currentRoomName
            })
        });
        
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
    updateParticipantCount(activeRoom.participants.size + 1);
    
    participant.tracks.forEach(publication => {
        if (publication.track) {
            attachTrack(publication.track, participant);
        }
    });
    
    participant.on('trackSubscribed', track => {
        attachTrack(track, participant);
    });
    
    participant.on('trackUnsubscribed', track => {
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
        showStatusMessage("Failed to switch camera");
    }
});

// End call
endCallBtn.addEventListener('click', () => {
    if (activeRoom) {
        activeRoom.disconnect();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
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
        
        showStatusMessage("Camera and microphone ready", 2000);
    } catch (error) {
        console.error('Unable to access camera and microphone:', error);
        showStatusMessage("Camera/microphone access denied", 5000);
    }
});