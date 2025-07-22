# SmartTV Remote - EAS Build Setup Guide

This guide covers the complete setup and usage of Expo Application Services (EAS) for building preview APKs of your enhanced SmartTV Remote mobile app.

## ✅ Setup Complete

Your EAS build environment is now fully configured with:

- **EAS CLI**: Installed and authenticated as `daksh-123`
- **Project Configuration**: Enhanced `eas.json` with optimized build profiles
- **Build Scripts**: Automated scripts for easy APK generation
- **Asset Management**: All required app assets configured

## 🚀 Current Build Status

### Latest Build (In Progress)
- **Build ID**: `e823cf4c-0bc1-4dd9-8f5b-a801b4603264`
- **Profile**: `preview`
- **Platform**: Android
- **Status**: Building... ⏳
- **Monitor**: https://expo.dev/accounts/daksh-123/projects/mobile/builds/e823cf4c-0bc1-4dd9-8f5b-a801b4603264

### Previous Successful Build (Available Now)
- **Build ID**: `7dfd3dd6-28eb-43d6-80aa-fab3b4f3a080`
- **Status**: ✅ Finished
- **APK Download**: https://expo.dev/artifacts/eas/gym4maTRmVJwFBFHSkNrE1.apk

## 📱 Quick Start - Get APK Now

### Option 1: Download Latest Built APK
```bash
# Download the already-built APK
./download-latest-apk.sh
```

### Option 2: Build New APK
```bash
# Interactive build with options
./build-preview.sh

# Or direct command
eas build --platform android --profile preview
```

## 🔧 Build Profiles Available

Your `eas.json` is configured with these optimized profiles:

### `preview` (Recommended)
- **Use**: Testing and sharing
- **Output**: Optimized APK file
- **Build Type**: Release build with preview features
- **Distribution**: Internal (no app store)

### `preview-local`
- **Use**: Faster local builds (requires Android SDK)
- **Output**: Local APK file
- **Build Type**: Release build
- **Speed**: Faster (builds locally)

### `development`
- **Use**: Development and debugging
- **Output**: Debug APK with development tools
- **Features**: Hot reload, debugging tools

### `production`
- **Use**: Final production builds
- **Output**: Production-ready APK
- **Optimization**: Maximum optimization

## 📋 Build Commands

### Standard Preview Build
```bash
eas build --platform android --profile preview
```

### Local Build (Faster)
```bash
eas build --platform android --profile preview-local
```

### Check Build Status
```bash
eas build:list --limit=10
```

### Monitor Specific Build
```bash
eas build:view [BUILD_ID]
```

## 📊 Enhanced Features in This Build

Your preview APK includes all the enhanced SmartTV Remote features:

### 🔍 **Enhanced Discovery**
- **Dual Protocol**: mDNS (Zeroconf) + HTTP endpoint scanning
- **Auto-Connect**: Automatically connects to discovered SmartTV Pi
- **Network Monitoring**: Checks WiFi state before discovery
- **Fallback Methods**: Multiple discovery strategies for reliability

### 🎮 **Complete Remote Control**
- **TV Remote Layout**: Familiar D-pad navigation interface
- **Haptic Feedback**: Vibration feedback for button presses
- **Quick Launch**: Direct app launching (Video Call, Trivia, Games)
- **Smart Text Input**: Modal keyboard for Pi text input fields
- **Video Call Controls**: Mute, video toggle, end call buttons

### 🔧 **Android Optimizations**
- **Network Security**: Local network access configuration
- **Performance**: Optimized bundle size and memory usage
- **Permissions**: Minimal required permissions
- **Compatibility**: Android 7.0+ (API 24+) support

## 🔗 WebSocket Protocol

The APK implements the complete WebSocket protocol matching your proof-of-concept:

```javascript
// Navigation Commands
{ type: 'navigate', direction: 'up|down|left|right' }
{ type: 'select' }
{ type: 'back' }

// App Launch
{ type: 'launch', app: 'video-call|trivia-game|gamepage|homepage' }

// Text Input
{ type: 'input', field: 'userName', value: 'John Doe' }

// Video Calls
{ type: 'videoCall', action: 'connect|toggleMute|toggleVideo|endCall' }
```

## 📱 Installation Instructions

### Method 1: ADB Install
```bash
# Download APK first
./download-latest-apk.sh

# Install via ADB
adb install smarttv-remote-preview.apk
```

### Method 2: Direct Download
1. Download APK from build URL
2. Transfer to Android device
3. Enable "Install from Unknown Sources"
4. Tap APK file to install

### Method 3: QR Code
EAS provides QR codes for easy installation - check the build page.

## 🧪 Testing Your APK

### Prerequisites
1. **SmartTV Pi Setup**: Ensure Pi completed WiFi onboarding
2. **Same Network**: Both devices on same WiFi network
3. **Pi Running**: WebSocket server running on port 8080

### Test Flow
1. **Install APK** on Android device
2. **Open App** - should show discovery screen
3. **Auto-Discovery** - app scans for SmartTV Pi
4. **Auto-Connect** - connects to first discovered Pi
5. **Remote Control** - test all navigation and features

### Troubleshooting
- **No Devices Found**: Check WiFi network, restart Pi
- **Connection Failed**: Verify WebSocket server on Pi
- **Discovery Issues**: Try manual IP if auto-discovery fails

## 📈 Build Monitoring

### EAS Dashboard
Visit: https://expo.dev/accounts/daksh-123/projects/mobile

### Build Logs
Each build provides detailed logs for debugging:
- Compilation output
- Dependency resolution
- Asset processing
- Build artifacts

### Notifications
EAS sends email notifications when builds complete.

## 🔄 Future Builds

### Automated Building
```bash
# Set up automatic builds on code changes
eas build --platform android --profile preview --auto-submit
```

### Version Management
Update version in `app.json`:
```json
{
  "expo": {
    "version": "1.1.0",
    "android": {
      "versionCode": 2
    }
  }
}
```

### Environment Variables
Add build-specific variables in `eas.json`:
```json
{
  "build": {
    "preview": {
      "env": {
        "API_URL": "https://your-api.com",
        "DEBUG": "true"
      }
    }
  }
}
```

## 🚨 Common Issues & Solutions

### Build Failures
- **Missing Assets**: Ensure all icons/splash screens exist
- **Dependency Conflicts**: Check package.json compatibility
- **Memory Issues**: Use smaller assets, optimize code

### Network Issues
- **Local Network**: Verify network security config
- **WebSocket**: Check Pi server port and firewall
- **Discovery**: Try both mDNS and HTTP scanning

### Performance Issues
- **Bundle Size**: Check for unused dependencies
- **Memory**: Profile app memory usage
- **Battery**: Optimize scanning intervals

## 📞 Support Resources

### Expo Documentation
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Build Configuration](https://docs.expo.dev/build-reference/app-versions/)
- [Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)

### Project-Specific
- Check build logs for detailed error information
- Monitor network connectivity between devices
- Verify SmartTV Pi WebSocket server status

---

## 🎯 Summary

Your EAS build setup is complete and ready for production use! The system will:

1. **Automatically discover** your SmartTV Pi after WiFi setup
2. **Seamlessly connect** and provide full remote control
3. **Handle all communication** via WebSocket protocol
4. **Provide optimal performance** on Android devices

**Current Status**: ✅ Ready to build APKs anytime with `eas build --platform android --profile preview`

**Latest APK**: Available for immediate download and testing

Happy building! 🚀📱✨