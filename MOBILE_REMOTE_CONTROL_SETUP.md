# Smart TV Mobile Remote Control - Complete Setup

This document provides a complete setup guide for the mobile remote control system that allows Android devices to control the Smart TV Electron application on Raspberry Pi.

## Overview

The system consists of two main components:
1. **Electron App** (modified) - Runs on Raspberry Pi with WebSocket server and mDNS advertising
2. **React Native Android App** - Mobile remote control interface

## System Architecture

```
[Mobile Device] ←→ WiFi Network ←→ [Raspberry Pi]
     Android              |           Electron App
   Remote App             |         + WebSocket Server
 mDNS Discovery          |         + mDNS Advertising
```

## Features Implemented

### Electron App Enhancements
- **WebSocket Server**: Listens on port 8765 for remote control commands
- **mDNS Service**: Advertises itself as `smarttv-remote._tcp.local.`
- **Command Processing**: Handles navigation, gestures, key presses, and UI interactions
- **Auto-discovery**: Automatically broadcasts availability on WiFi networks

### Mobile App Features
- **Automatic Discovery**: Scans and finds Smart TV devices on same WiFi network
- **Remote Navigation**: Control page navigation (Home, Video Call, Trivia, Games)
- **Directional Control**: D-pad for UI navigation
- **Gesture Support**: Swipe gestures and tap actions
- **Real-time Connection**: WebSocket communication with auto-reconnection
- **Connection Status**: Visual feedback for connection state

## Installation Instructions

### 1. Electron App Setup (Raspberry Pi)

The Electron app has been modified with the following new files:

**Dependencies added:**
```json
"ws": "^8.18.3",
"bonjour-service": "^1.3.0"
```

**New files:**
- `remote-control-service.js` - WebSocket server and mDNS advertising
- Modified `main.js` - Integration with remote control service

**To run:**
```bash
cd Electron_App/SmartTV-UI/
npm install
npm start
```

### 2. Mobile App Setup (Android)

**Location:** `mobile_app/SmartTVRemote/`

**Key files created:**
- `src/services/DiscoveryService.js` - mDNS device discovery
- `src/services/RemoteControlService.js` - WebSocket communication
- `src/screens/DiscoveryScreen.js` - Device discovery interface
- `src/screens/RemoteControlScreen.js` - Remote control interface
- `App.tsx` - Main application logic

**Dependencies:**
```json
"react-native-zeroconf": "^1.3.0",
"react-native-vector-icons": "^10.2.0"
```

**Android permissions added:**
- `INTERNET`
- `ACCESS_NETWORK_STATE`
- `ACCESS_WIFI_STATE`
- `CHANGE_WIFI_MULTICAST_STATE`

**To run:**
```bash
cd mobile_app/SmartTVRemote/
npm install
npm run android
```

## Network Configuration

### Requirements
- Both devices on same WiFi network
- Port 8765 accessible on Raspberry Pi
- mDNS/Bonjour service enabled (default on most systems)

### Firewall Configuration
If connection fails, ensure port 8765 is open:
```bash
# On Raspberry Pi
sudo ufw allow 8765/tcp
```

## Usage Workflow

1. **Start Electron App**: Launch on Raspberry Pi (connects to home WiFi)
2. **Connect Mobile**: Ensure Android device on same WiFi network
3. **Launch Mobile App**: Open Smart TV Remote app
4. **Auto-Discovery**: App automatically finds Smart TV devices
5. **Connect**: Tap discovered Smart TV to connect
6. **Remote Control**: Use interface to control Smart TV

## Command Protocol

The WebSocket communication uses JSON commands:

### Navigation Commands
```javascript
{ action: "navigate", page: "home" }        // Go to homepage
{ action: "navigate", page: "video-call" }  // Go to video call
{ action: "navigate", page: "trivia" }      // Go to trivia game
{ action: "navigate", page: "games" }       // Go to games page
```

### Gesture Commands
```javascript
{ action: "gesture", gesture: "swipe_left" }
{ action: "gesture", gesture: "swipe_right" }
{ action: "gesture", gesture: "swipe_up" }
{ action: "gesture", gesture: "swipe_down" }
{ action: "gesture", gesture: "tap" }
```

### Key Press Commands
```javascript
{ action: "keypress", key: "Return" }     // Enter key
{ action: "keypress", key: "Escape" }     // Back/Escape
{ action: "keypress", key: "BackSpace" }  // Delete/Backspace
```

### UI Interaction Commands
```javascript
{ action: "click", selector: ".button-class" }
{ action: "input", selector: "#input-field", value: "text" }
```

## Troubleshooting

### Device Not Found
- Verify both devices on same WiFi network
- Check if Electron app is running and remote control service started
- Restart mobile app discovery

### Connection Failed
- Check port 8765 accessibility
- Verify firewall settings
- Check network connectivity

### Service Not Advertising
- Restart Electron app
- Check mDNS service status
- Verify network interface configuration

## Testing

### Manual Testing Steps
1. Start Electron app - should see "Remote control service started on port 8765" in logs
2. Start mobile app - should auto-discover Smart TV device
3. Connect from mobile - should see connection success on both sides
4. Test navigation buttons - should change pages on Smart TV
5. Test directional pad - should navigate UI elements
6. Test disconnect/reconnect - should handle gracefully

### Debug Logs
- **Electron App**: Check console for remote control service messages
- **Mobile App**: Check React Native debugger for WebSocket and discovery logs

## Security Considerations

- The system operates on local WiFi network only
- No authentication implemented (suitable for home use)
- WebSocket communication is unencrypted
- mDNS broadcasts device information locally

## Future Enhancements

Potential improvements:
- Authentication/pairing system
- Encrypted WebSocket communication (WSS)
- Voice control integration
- Custom gesture recognition
- Volume control integration
- Screen mirroring capabilities

## File Structure Summary

### Electron App Changes
```
Electron_App/SmartTV-UI/
├── remote-control-service.js (new)
├── main.js (modified)
└── package.json (updated dependencies)
```

### Mobile App Structure
```
mobile_app/SmartTVRemote/
├── src/
│   ├── screens/
│   │   ├── DiscoveryScreen.js
│   │   └── RemoteControlScreen.js
│   └── services/
│       ├── DiscoveryService.js
│       └── RemoteControlService.js
├── App.tsx (modified)
├── android/app/src/main/AndroidManifest.xml (modified)
└── package.json (updated dependencies)
```

The mobile remote control system is now fully implemented and ready for testing!