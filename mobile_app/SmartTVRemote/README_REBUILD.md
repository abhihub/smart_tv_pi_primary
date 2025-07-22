# SmartTV Remote - Enhanced Mobile App

This is the rebuilt and enhanced version of the SmartTV Remote mobile app, designed to work seamlessly with the SmartTV Pi after WiFi onboarding completion.

## 🚀 New Features

### Enhanced WiFi Discovery
- **Automatic Network Detection**: The app automatically scans your WiFi network for SmartTV Pi devices
- **Dual Discovery Protocol**: Uses both mDNS (Zeroconf) and HTTP endpoint scanning for maximum reliability
- **Auto-Connect**: Automatically connects to the first discovered SmartTV Pi (can be disabled)
- **Network State Monitoring**: Checks WiFi connection status before starting discovery

### Comprehensive Remote Control Interface
- **TV Remote Layout**: Familiar D-pad navigation with directional arrows and central OK button
- **Haptic Feedback**: Vibration feedback for button presses on supported devices
- **Quick App Launch**: Direct buttons for Video Call, Trivia Game, and Games page
- **Video Call Controls**: Mute, video toggle, and end call buttons during active calls
- **Smart Text Input**: Modal keyboard input for entering usernames, room names, etc.

### Robust Communication
- **WebSocket Protocol**: Matches the protocol used in the working proof-of-concept
- **Auto-Reconnection**: Automatically attempts to reconnect if connection is lost
- **Real-time Status**: Live updates of current app state and connection status
- **Error Handling**: Graceful error handling with user-friendly messages

## 📱 Android Optimizations

### Network Configuration
- **Local Network Access**: Configured to allow HTTP communication with local devices
- **Cleartext Traffic**: Enabled for communication with SmartTV Pi WebSocket server
- **Network Security**: Comprehensive network security config for various home network ranges

### Performance Features
- **Optimized Bundle**: Efficient code splitting and bundle optimization
- **Network Efficiency**: Smart scanning with timeouts and connection pooling
- **Memory Management**: Proper cleanup of WebSocket connections and discovery services
- **Battery Optimization**: Efficient scanning intervals and connection management

## 🔧 Technical Architecture

### Service Layer
- **DiscoveryService**: Enhanced mDNS/HTTP discovery with network scanning
- **RemoteControlService**: WebSocket communication with SmartTV Pi
- **Auto-Connect Logic**: Intelligent device detection and connection

### UI Components
- **DiscoveryScreen**: Device discovery with auto-connect and manual selection
- **RemoteControlScreen**: Full-featured TV remote with contextual controls
- **Text Input Modal**: Smooth keyboard input for SmartTV Pi text fields

### Communication Protocol
```javascript
// Navigation Commands
{ type: 'navigate', direction: 'up|down|left|right' }
{ type: 'select' }
{ type: 'back' }

// App Launch Commands
{ type: 'launch', app: 'video-call|trivia-game|gamepage|homepage' }

// Text Input Commands
{ type: 'input', field: 'userName', value: 'John Doe' }

// Video Call Commands
{ type: 'videoCall', action: 'connect|toggleMute|toggleVideo|endCall' }
```

## 🛠️ Build Instructions

### Prerequisites
- Node.js 18+
- React Native CLI or Expo CLI
- Android Studio with SDK
- Java Development Kit (JDK) 11+

### Quick Build
```bash
# Make build script executable
chmod +x android-build.sh

# Run comprehensive build and test
./android-build.sh
```

### Manual Build Steps
```bash
# Install dependencies
npm install

# Build for Android
npm run android

# Or use EAS Build for production
eas build --platform android --profile production
```

### Development Build
```bash
# Development build with debugging
npm run build:dev

# Preview build for testing
npm run build:preview
```

## 📋 Usage Instructions

### Initial Setup
1. **Build and Install**: Use the build script to create and install the APK
2. **WiFi Connection**: Ensure your Android device is on the same WiFi network as the SmartTV Pi
3. **Pi Prerequisites**: Make sure the SmartTV Pi has completed WiFi onboarding

### Automatic Discovery
1. **Open App**: Launch the SmartTV Remote app
2. **Auto-Scan**: The app automatically scans your network for SmartTV Pi devices
3. **Auto-Connect**: If enabled, automatically connects to the first discovered Pi
4. **Manual Selection**: Choose from multiple discovered devices if needed

### Using the Remote Control
1. **Navigation**: Use the D-pad arrows to navigate the SmartTV interface
2. **Selection**: Press the central OK button to select/activate elements
3. **Back/Home**: Use BACK and HOME buttons for navigation
4. **App Launch**: Use Quick Launch buttons for direct app access
5. **Text Input**: Keyboard modal appears automatically when text input is needed
6. **Video Calls**: Call control buttons appear during active video calls

## 🔍 Troubleshooting

### Connection Issues
- **No Devices Found**: Ensure both devices are on the same WiFi network
- **Connection Failed**: Check that SmartTV Pi WebSocket server is running on port 8080
- **Auto-Connect Problems**: Disable auto-connect and manually select the device

### Network Problems
- **Local Network Access**: Verify network security config allows local traffic
- **Firewall Issues**: Ensure no firewall blocking WebSocket connections
- **Router Configuration**: Some routers may block device-to-device communication

### Performance Issues
- **Slow Discovery**: Extended scan time is normal for HTTP fallback
- **Connection Lag**: Check WiFi signal strength for both devices
- **App Crashes**: Check logcat output for detailed error information

## 🧪 Testing Features

### Network Discovery Testing
- **mDNS Discovery**: Tests Zeroconf/Bonjour service discovery
- **HTTP Endpoint Scan**: Fallback HTTP scanning for Pi detection
- **Network State Monitoring**: WiFi connection status verification
- **Auto-Connect Logic**: Automatic device connection testing

### Remote Control Testing
- **Navigation Commands**: All directional navigation and selection
- **App Launch Commands**: Direct app launching functionality
- **Text Input Handling**: Keyboard modal and input submission
- **Video Call Integration**: Call control button functionality
- **WebSocket Communication**: Real-time message handling

### Android Compatibility Testing
- **Permissions**: Network, WiFi, and vibration permissions
- **Network Security**: Local network access configuration
- **Performance**: Bundle size, memory usage, and battery impact
- **UI Responsiveness**: Touch response and haptic feedback

## 📊 Performance Metrics

### Bundle Optimization
- **Code Splitting**: Efficient component loading
- **Asset Optimization**: Minimized images and resources
- **Network Efficiency**: Smart connection pooling and timeouts

### Memory Management
- **Service Cleanup**: Proper WebSocket and discovery service cleanup
- **Component Lifecycle**: Efficient React component mounting/unmounting
- **Background Processing**: Minimal background activity

## 🔐 Security Features

### Network Security
- **Local Network Only**: Restricts communication to local network ranges
- **Cleartext Configuration**: Properly configured for local HTTP/WebSocket communication
- **Permission Management**: Minimal required permissions

### Data Protection
- **No External Servers**: All communication stays on local network
- **Session Management**: Secure WebSocket session handling
- **Input Validation**: Sanitized text input handling

## 🚀 Future Enhancements

### Planned Features
- **Gesture Controls**: Swipe gestures for navigation
- **Voice Commands**: Voice input integration
- **Device Profiles**: Multiple SmartTV Pi device management
- **Offline Mode**: Local caching for better offline experience

### Performance Improvements
- **Faster Discovery**: Optimized network scanning algorithms
- **Better Reconnection**: Smarter auto-reconnection logic
- **UI Enhancements**: Improved animations and transitions

## 📞 Support

### Debug Information
- Check `metro` logs for React Native debugging
- Use `adb logcat` for Android system logs
- Enable remote debugging for WebSocket inspection

### Common Solutions
- **App Won't Connect**: Restart both the mobile app and SmartTV Pi
- **Discovery Issues**: Check WiFi network and try manual IP entry
- **Control Problems**: Verify WebSocket server is running on Pi

---

**Built with React Native, Expo, and modern Android development practices for optimal performance and reliability.** 🤖📱✨