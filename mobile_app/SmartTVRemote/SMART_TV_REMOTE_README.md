# Smart TV Remote - Mobile App

This is an Android mobile application for remotely controlling the Smart TV Electron application running on Raspberry Pi.

## Features

- **Automatic Discovery**: Finds Smart TV devices on the same WiFi network using mDNS
- **Remote Navigation**: Navigate between different pages (Home, Video Call, Trivia, Games)
- **Gesture Control**: Directional pad for navigation and interaction
- **Real-time Connection**: WebSocket-based communication for instant response
- **Auto-reconnection**: Automatically reconnects when connection is lost

## Setup Instructions

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **React Native Development Environment**:
   - Android Studio with SDK
   - Java JDK 11 or higher
   - Android device or emulator

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Link native dependencies (if required):
   ```bash
   npx react-native link
   ```

3. For Android development:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

### Running the App

1. **Start Metro bundler**:
   ```bash
   npm start
   ```

2. **Run on Android device/emulator**:
   ```bash
   npm run android
   ```
   
   Or alternatively:
   ```bash
   npx react-native run-android
   ```

## Usage

1. **Ensure Smart TV is running**: Make sure your Smart TV Electron app is running on the Raspberry Pi and connected to the same WiFi network.

2. **Open Mobile App**: Launch the Smart TV Remote app on your Android device.

3. **Automatic Discovery**: The app will automatically scan for Smart TV devices on your network.

4. **Connect**: Tap on your Smart TV device to connect.

5. **Remote Control**: Once connected, you can:
   - Navigate to different pages using the navigation buttons
   - Use the directional pad for UI navigation
   - Use quick action buttons (Enter, Back, Delete)

## Network Requirements

- Both the mobile device and Raspberry Pi must be connected to the same WiFi network
- The Raspberry Pi should have mDNS/Bonjour service running (enabled by default)
- Ports 8765 (WebSocket) should be accessible on the Raspberry Pi

## Troubleshooting

### Device Not Found
- Ensure both devices are on the same WiFi network
- Check if the Smart TV Electron app is running
- Try restarting the mobile app discovery

### Connection Issues
- Verify WiFi connectivity on both devices
- Check if port 8765 is not blocked by firewall
- Restart both applications

### Android Permissions
The app requires the following permissions:
- `INTERNET`: For network communication
- `ACCESS_NETWORK_STATE`: To check network connectivity
- `ACCESS_WIFI_STATE`: For WiFi network information
- `CHANGE_WIFI_MULTICAST_STATE`: For mDNS discovery

## Architecture

### Network Discovery
- Uses mDNS (Multicast DNS) to discover Smart TV devices
- Service type: `smarttv-remote._tcp.local.`
- Automatic service resolution and connection

### Communication Protocol
- WebSocket connection on port 8765
- JSON-based command structure
- Real-time bidirectional communication

### Command Types
- `navigate`: Change pages on Smart TV
- `click`: Simulate UI clicks
- `input`: Send text input
- `keypress`: Send keyboard events
- `gesture`: Send gesture commands (swipe, tap)

## Development

### File Structure
```
src/
├── screens/
│   ├── DiscoveryScreen.js    # Device discovery and connection
│   └── RemoteControlScreen.js # Remote control interface
└── services/
    ├── DiscoveryService.js   # mDNS discovery service
    └── RemoteControlService.js # WebSocket communication
```

### Building for Release

1. Generate signed APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. The APK will be generated in:
   `android/app/build/outputs/apk/release/app-release.apk`

## Dependencies

- **react-native**: Core framework
- **react-native-zeroconf**: mDNS service discovery
- **react-native-vector-icons**: UI icons

## License

This project is part of the Smart TV system and follows the same licensing terms.