# EAS Build Setup for SmartTV Remote Android App

## Prerequisites

1. **Expo Account**: Create an account at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install globally with `npm install -g @expo/cli eas-cli`

## Setup Instructions

### 1. Login to Expo
```bash
expo login
eas login
```

### 2. Configure Project
The project is already configured with:
- `app.json` - Expo configuration
- `eas.json` - EAS build configuration
- Updated `package.json` scripts

### 3. Initialize EAS Build
```bash
eas init
```
This will link your project to your Expo account.

### 4. Build Android APK

#### For Development/Testing (Preview Build)
```bash
npm run build:android:preview
# or directly:
eas build --platform android --profile preview
```

#### For Production
```bash
npm run build:android:production  
# or directly:
eas build --platform android --profile production
```

### 5. Download APK
After the build completes:
1. Visit your build page on [expo.dev](https://expo.dev)
2. Download the generated APK file
3. Install on Android device using `adb install` or file manager

## Build Profiles

### Preview Profile
- Generates APK for internal testing
- Faster build times
- Good for development and testing

### Production Profile  
- Optimized APK for distribution
- Longer build times
- Ready for Play Store or sideloading

## Local Development

```bash
# Start development server
npm start

# Run on Android device/emulator
npm run android
```

## Troubleshooting

### Missing Assets
If you see warnings about missing assets (icon.png, splash.png), either:
1. Add proper assets to the `assets/` directory
2. Remove the asset references from `app.json`

### Build Errors
- Check build logs on expo.dev
- Ensure all dependencies are compatible with Expo
- Verify Android build configuration in `eas.json`

## App Features

The SmartTV Remote app includes:
- Device discovery via Zeroconf/Bonjour
- WebSocket connection to SmartTV
- Remote control interface
- TV app state synchronization

## Next Steps

1. Add proper app icons and splash screen to `assets/`
2. Configure app signing for Play Store distribution
3. Set up automated builds with GitHub Actions
4. Add crash reporting and analytics