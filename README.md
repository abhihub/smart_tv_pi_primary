# SmartTV

A hybrid application designed for Smart TVs that provides video calling capabilities and multiplayer trivia games with gesture-friendly navigation optimized for large screen interfaces.

## 🏗️ Architecture

SmartTV consists of three main components:

1. **Electron Desktop App** (`Electron_App/SmartTV-UI/`) - Main user interface optimized for TV screens
2. **Flask Backend Server** (`server_side/`) - API services and Twilio integration
3. **Kiosk Configuration** (`kiosk/`) - Linux TV deployment setup

## 🚀 Features

- **Video Calling**: Twilio-powered video conferencing with WebRTC
- **Multiplayer Trivia**: Real-time multiplayer trivia games with WebSocket support
- **TV-Optimized UI**: Large, gesture-friendly interface elements designed for TV screens
- **Cross-Platform**: Supports macOS, Linux, and Windows with specialized TV deployment
- **Kiosk Mode**: Full-screen deployment for Smart TV installations

## 🛠️ Technology Stack

- **Frontend**: Electron 28.0.0 with vanilla HTML/CSS/JavaScript
- **Backend**: Flask 5.1.0 with Twilio SDK
- **Build System**: Electron Forge with security fuses
- **Deployment**: Linux kiosk mode with hardware acceleration
- **Communication**: HTTP REST API and WebSocket connections

## 📦 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- Twilio account (for video calling features)

### 1. Clone the Repository

```bash
git clone https://github.com/abhihub/smarttvpi2.git
cd SmartTV
```

### 2. Set Up the Backend

```bash
cd server_side
pip install flask flask-cors python-dotenv twilio
cp .env.example .env
# Edit .env with your Twilio credentials
python app.py
```

### 3. Set Up the Frontend

```bash
cd Electron_App/SmartTV-UI
npm install
npm start
```

The application will launch in a 1280x800 window optimized for TV screens.

## 🔧 Development

### Backend Development

```bash
cd server_side
python app.py  # Runs on port 3001 by default
```

### Frontend Development

```bash
cd Electron_App/SmartTV-UI
npm start      # Development mode
npm run make   # Build distributables
```

## 📱 Application Structure

### Main Pages

- **Homepage** (`homepage.html`) - Main dashboard and navigation
- **Video Call** (`video-call.html`) - Twilio video conferencing interface  
- **Trivia Game** (`trivia-game.html`) - Multiplayer trivia with real-time updates
- **Game Page** (`gamepage.html`) - Game selection and menu

### API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/token` - Generate Twilio access tokens for video calls

## 🖥️ Deployment

### Standard Desktop Deployment

```bash
cd Electron_App/SmartTV-UI
npm run make  # Creates platform-specific installers
```

### Linux TV Kiosk Deployment

```bash
# Use the kiosk configuration
cp kiosk/xinit.rc ~/.xinitrc
# Configure auto-login and launch
```

The kiosk mode provides:
- Hardware-accelerated video playback
- Screen blanking prevention
- Audio system integration
- Full-screen browser launch

## 🔒 Security Features

- Electron security fuses enabled
- Context isolation and disabled node integration
- CORS properly configured for API access
- Environment variable management for secrets
- ASAR packaging with integrity verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the component-specific README files in `Electron_App/SmartTV-UI/` and `server_side/`

## 📚 Documentation

- [Electron App Documentation](Electron_App/SmartTV-UI/README.md)
- [Backend Server Documentation](server_side/README.md)
- [Kiosk Deployment Guide](kiosk/README.md)