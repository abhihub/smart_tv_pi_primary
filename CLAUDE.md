# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartTV is a hybrid application consisting of an Electron-based desktop UI for Smart TVs and a Python Flask backend server. The application provides video calling capabilities via Twilio and multiplayer trivia games, designed specifically for large screen TV interfaces with gesture-friendly navigation.

## Architecture

### Four-Component System
1. **Electron App** (`Electron_App/SmartTV-UI/`) - Main desktop application
2. **Flask Server** (`server_side/`) - Backend API services  
3. **Mobile Remote App** (`mobile_remote_app/`) - React Native mobile remote control
4. **Kiosk Configuration** (`kiosk/`) - Linux TV deployment setup

### Technology Stack
- **Frontend**: Electron 28.0.0 with vanilla HTML/CSS/JavaScript
- **Backend**: Flask 5.1.0 with Twilio SDK integration
- **Mobile**: React Native with Expo SDK 53.0.20 for cross-platform mobile remote
- **Build**: Electron Forge with security fuses and cross-platform packaging
- **Deployment**: Linux kiosk mode with hardware acceleration

## Development Commands

### Electron Application
```bash
cd Electron_App/SmartTV-UI/

# Development
npm start                    # Start in development mode with Electron Forge
npm run dev                  # Alternative development command

# Building
npm run package             # Package application (no installer)
npm run make                # Build distributables (DMG, DEB, ZIP, AppImage)
npm run dist                # Build Linux distribution
```

### Flask Server
```bash
cd server_side/

# Install dependencies
pip install flask flask-cors python-dotenv twilio

# Run server
python app.py              # Starts on port 3001 by default
# or set custom port: PORT=5000 python app.py
```

### Mobile Remote App
```bash
cd mobile_remote_app/

# Install dependencies
npm install

# Development
npm start                   # Start Expo development server
npm run android            # Run on Android device/emulator
npm run ios                # Run on iOS device/simulator
npm run web                # Run in web browser

# Building
# Configure EAS Build in eas.json for production builds
# See: https://docs.expo.dev/build/introduction/
```

### Environment Setup
Create `server_side/.env` with:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
PORT=3001
```

## Key Application Architecture

### Electron Main Process (`main.js`)
- Creates 1280x800 window optimized for TV screens
- Supports fullscreen mode for kiosk deployment
- Security-hardened with context isolation and node integration disabled

### Frontend Pages
- **`homepage.html`** - Main dashboard/landing interface
- **`video-call.html`** - Twilio-powered video calling interface
- **`trivia-game.html`** - Multiplayer trivia game with WebSocket support
- **`gamepage.html`** - Game selection and navigation

### Backend API Structure
- **`app.py`** - Flask application factory with CORS enabled
- **`api/twilio_routes.py`** - Twilio API endpoints (`/api/token`, `/api/health`)
- **`services/twilio_service.py`** - Twilio business logic and service layer

### Build Configuration
The `forge.config.js` implements:
- Cross-platform packaging (macOS DMG, Linux DEB/AppImage, Windows)
- Security fuses for runtime hardening
- Auto-unpack natives for binary dependencies
- ASAR packaging with integrity verification

## Deployment Considerations

### Kiosk Mode (`kiosk/xinit.rc.md`)
Linux TV deployment script handles:
- D-Bus session management for system integration
- PipeWire audio setup for modern Linux audio
- Screen blanking prevention for always-on displays
- Hardware-accelerated video via VA-API
- Chromium browser launch with TV-optimized flags

### Security Features
- Electron Fuses enabled for runtime security
- Context isolation and disabled node integration
- CORS properly configured for cross-origin requests
- Environment variable management for secrets

## Communication Flow

1. Electron UI makes HTTP requests to Flask server (port 3001)
2. Flask server generates Twilio access tokens for video calls
3. Frontend establishes WebRTC connections via Twilio's infrastructure
4. Trivia games use WebSocket connections for real-time multiplayer
5. Mobile remote app connects via WebSocket to SmartTV (port 8080) for real-time control
6. Mobile app can also make HTTP requests to Flask server for advanced features

## File Organization Patterns

- Frontend assets and pages are in `Electron_App/SmartTV-UI/`
- Backend follows Flask blueprint pattern with `api/` and `services/` separation
- Mobile app follows React Native/Expo structure with `src/` containing components, screens, and services
- Build outputs go to `out/` directory (gitignored)
- Kiosk deployment scripts are in dedicated `kiosk/` directory

## Mobile Remote App Architecture

The mobile remote app (`mobile_remote_app/`) provides smartphone control for the SmartTV system with the following features:

### Key Components
- **`App.js`** - Main application entry point with navigation state management
- **`SimpleConnectScreen.js`** - IP-based connection interface for TV discovery
- **`RemoteScreen.js`** - Full-featured remote control interface with navigation, volume, and app shortcuts
- **`WifiQRScreen.js`** - WiFi QR code generator for easy TV network setup
- **`SmartTVService.js`** - WebSocket and HTTP communication service

### Mobile App Features
- **TV Connection**: Direct IP connection with WebSocket communication
- **Remote Control**: D-pad navigation, select/back/home buttons with haptic feedback
- **Volume Control**: Volume up/down/mute with real-time feedback
- **App Launcher**: Quick access shortcuts to TV applications (Home, Video Call, Trivia, Settings)
- **WiFi Setup**: Generate QR codes for WiFi network configuration
- **Real-time Status**: Live TV status updates and connection monitoring

### Communication Protocol
- **WebSocket**: Real-time bidirectional communication on port 8080
- **HTTP API**: Status queries and configuration via Flask backend
- **Command Format**: JSON messages with `type`, `command`, and `data` fields

### Security Considerations
- Uses cleartext traffic for local network communication
- Network security configuration allows HTTP on local networks
- No authentication currently implemented (designed for trusted home networks)

## Development Notes

- The TV app is designed for large screen interfaces with gesture-friendly UI elements
- Mobile app uses dark theme optimized for TV remote control usage
- Video calling requires Twilio credentials and internet connectivity
- Cross-platform builds configured for Linux TV deployment and mobile platforms (iOS/Android)
- The Flask server runs independently and can be deployed separately from the Electron app
- Mobile remote app requires same WiFi network as the SmartTV for WebSocket connection