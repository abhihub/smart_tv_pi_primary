# SmartTV Electron App

The frontend desktop application for SmartTV, built with Electron and optimized for large screen TV interfaces with gesture-friendly navigation.

## 🖥️ Overview

This Electron application provides the main user interface for SmartTV, featuring:
- Video calling interface powered by Twilio
- TV-optimized UI with large, touch-friendly elements
- Full-screen kiosk mode for Smart TV deployment

## 🏗️ Architecture

### Main Components

- **`main.js`** - Electron main process with security hardening
- **`preload.js`** - Secure bridge between main and renderer processes
- **`config.js`** - Configuration management and environment setup
- **Pages** - Individual HTML pages for different app sections

### Security Features

- Context isolation enabled
- Node integration disabled in renderer
- Security fuses for runtime hardening
- ASAR packaging with integrity verification

## 📱 Application Pages

### Core Pages

- **`homepage.html`** - Main dashboard and navigation hub
- **`video-call.html`** - Twilio video conferencing interface

### Styling

- **`styles.css`** - Global styles optimized for TV screens
- **`video-call.css`** - Video calling interface styles
- Large fonts and buttons for TV viewing distance
- High contrast colors for better visibility

## 🚀 Development

### Prerequisites

- Node.js 18+ and npm
- Electron 28.0.0

### Installation

```bash
npm install
```

### Development Commands

```bash
# Start in development mode
npm start
npm run dev

# Package application (no installer)
npm run package

# Build distributables (DMG, DEB, ZIP, AppImage)
npm run make

# Build Linux distribution
npm run dist
```

### Window Configuration

The app creates a 1280x800 window by default:
- Optimized for TV screen ratios
- Supports fullscreen mode for kiosk deployment
- Minimum size constraints for usability

## 🔧 Configuration

### Environment Setup

Create `.env` file with:
```
BACKEND_URL=http://localhost:3001
TWILIO_REGION=us1
```

Use `.env.example` as a template.

### Config Management

The `config.js` file handles:
- Environment variable loading
- Default configuration values
- Runtime configuration management

## 🎮 Features

### Video Calling

- Twilio WebRTC integration
- Camera and microphone controls
- Screen sharing capabilities
- Call quality optimization for TV screens

### Navigation

- Keyboard navigation support
- Large click targets for touch interaction
- Breadcrumb navigation system

## 📦 Build System

### Electron Forge Configuration

The `forge.config.js` provides:

- **Cross-platform packaging**:
  - macOS: DMG installer
  - Linux: DEB package and AppImage
  - Windows: ZIP distribution

- **Security Configuration**:
  - Fuses for runtime security
  - Auto-unpack natives for binary dependencies
  - ASAR packaging with security verification

### Build Outputs

Build artifacts are generated in the `out/` directory:
```
out/
├── make/           # Platform installers
├── package/        # Packaged applications
└── distributables/ # Ready-to-distribute files
```

## 🖥️ TV Deployment

### Kiosk Mode

For Smart TV deployment:
1. Build Linux distribution: `npm run dist`
2. Install on target TV system
3. Configure auto-launch via systemd or xinit
4. Enable fullscreen mode in main.js

### Hardware Requirements

- **Minimum**: 2GB RAM, dual-core CPU
- **Recommended**: 4GB RAM, quad-core CPU with hardware video acceleration
- **Display**: 1280x720 minimum, 1920x1080 recommended
- **Network**: Stable internet connection for video calling

## 🔒 Security Considerations

### Electron Security

- **Context Isolation**: Renderer processes run in isolated contexts
- **Preload Scripts**: Secure API exposure to renderer processes
- **CSP Headers**: Content Security Policy for XSS protection
- **Node Integration**: Disabled in renderer for security

### Best Practices

- Regular dependency updates
- Security audit with `npm audit`
- Secure configuration management
- Input validation and sanitization

## 🐛 Troubleshooting

### Common Issues

1. **App won't start**:
   - Check Node.js version (18+ required)
   - Verify all dependencies installed: `npm install`
   - Check for port conflicts with backend

2. **Video calling not working**:
   - Verify backend server is running
   - Check Twilio credentials in server environment
   - Ensure camera/microphone permissions granted

3. **Build failures**:
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check platform-specific build requirements
   - Verify Electron Forge configuration

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm start
```

## 📊 Performance

### Optimization

- Efficient DOM manipulation
- Lazy loading for game assets
- Image compression for UI elements
- WebRTC optimization for video quality

### Monitoring

- Memory usage tracking
- FPS monitoring for smooth animation
- Network bandwidth monitoring for video calls
- Error reporting and crash analytics

## 🤝 Contributing

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Make changes and test thoroughly
5. Submit pull request with clear description

### Code Style

- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ standards
- Comment complex logic and TV-specific optimizations
- Test on multiple screen sizes and resolutions