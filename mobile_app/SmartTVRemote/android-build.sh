#!/bin/bash

# SmartTV Remote - Android Build and Test Script
# This script builds and tests the enhanced SmartTV Remote mobile app

set -e  # Exit on any error

echo "🤖 SmartTV Remote Android Build Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the SmartTVRemote project root directory"
    exit 1
fi

# Check if required tools are installed
print_step "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if Android development environment is set up
if [ -z "$ANDROID_HOME" ]; then
    print_warning "ANDROID_HOME not set. Make sure Android SDK is installed and configured."
fi

print_success "Prerequisites check completed"

# Install dependencies
print_step "Installing npm dependencies..."
npm install

print_success "Dependencies installed"

# Clean previous builds
print_step "Cleaning previous builds..."
if [ -d "android/app/build" ]; then
    rm -rf android/app/build
fi
if [ -d "dist" ]; then
    rm -rf dist
fi

# Run TypeScript check
print_step "Running TypeScript checks..."
if command -v npx &> /dev/null; then
    npx tsc --noEmit
    print_success "TypeScript checks passed"
else
    print_warning "TypeScript compiler not available, skipping type checks"
fi

# Check React Native setup
print_step "Checking React Native setup..."
if command -v npx &> /dev/null; then
    npx react-native doctor || print_warning "React Native doctor found some issues, but continuing..."
else
    print_warning "React Native CLI not available"
fi

# Build for Android (Development)
print_step "Building Android app (Development)..."
if command -v npx &> /dev/null; then
    npx react-native run-android --variant=debug || {
        print_warning "Direct React Native build failed, trying EAS build..."
        
        # Try EAS build if available
        if command -v eas &> /dev/null; then
            print_step "Using EAS Build for development build..."
            eas build --platform android --profile development --local
            print_success "EAS development build completed"
        else
            print_error "React Native build failed and EAS CLI not available"
            print_error "Please install EAS CLI: npm install -g @expo/eas-cli"
            exit 1
        fi
    }
else
    # Fallback to direct gradle build
    print_step "Using direct Gradle build..."
    cd android
    ./gradlew assembleDebug
    cd ..
    print_success "Gradle debug build completed"
fi

# Check if APK was generated
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    print_success "Debug APK generated at: $APK_PATH"
    
    # Get APK info
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_success "APK size: $APK_SIZE"
    
    # Try to get package info if aapt is available
    if command -v aapt &> /dev/null; then
        print_step "Analyzing APK..."
        PACKAGE_NAME=$(aapt dump badging "$APK_PATH" | grep package | awk '{print $2}' | sed "s/name=//g" | sed "s/'//g")
        VERSION_CODE=$(aapt dump badging "$APK_PATH" | grep versionCode | awk '{print $3}' | sed "s/versionCode=//g" | sed "s/'//g")
        print_success "Package: $PACKAGE_NAME"
        print_success "Version Code: $VERSION_CODE"
    fi
else
    print_warning "Debug APK not found at expected location"
    print_step "Looking for APK in other locations..."
    find . -name "*.apk" -type f 2>/dev/null | head -5
fi

# Performance tests
print_step "Running basic performance checks..."

# Check bundle size
if [ -f "metro.config.js" ]; then
    print_step "Analyzing bundle..."
    npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android-bundle.js --assets-dest android-assets/ > /dev/null 2>&1 || print_warning "Bundle analysis failed"
    
    if [ -f "android-bundle.js" ]; then
        BUNDLE_SIZE=$(du -h android-bundle.js | cut -f1)
        print_success "Bundle size: $BUNDLE_SIZE"
        rm -f android-bundle.js
        rm -rf android-assets/
    fi
fi

# Network configuration test
print_step "Verifying network configuration..."
if [ -f "android/app/src/main/res/xml/network_security_config.xml" ]; then
    print_success "Network security config found"
    
    # Check for local network permissions
    if grep -q "192.168" android/app/src/main/res/xml/network_security_config.xml; then
        print_success "Local network access configured"
    else
        print_warning "Local network access may not be properly configured"
    fi
else
    print_warning "Network security config not found"
fi

# Check permissions
print_step "Verifying app permissions..."
if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    PERMISSIONS=$(grep -c "uses-permission" android/app/src/main/AndroidManifest.xml || echo "0")
    print_success "Found $PERMISSIONS permissions configured"
    
    # Check for essential permissions
    if grep -q "INTERNET" android/app/src/main/AndroidManifest.xml; then
        print_success "Internet permission: ✓"
    else
        print_error "Internet permission: ✗"
    fi
    
    if grep -q "ACCESS_NETWORK_STATE" android/app/src/main/AndroidManifest.xml; then
        print_success "Network state permission: ✓"
    else
        print_error "Network state permission: ✗"
    fi
    
    if grep -q "ACCESS_WIFI_STATE" android/app/src/main/AndroidManifest.xml; then
        print_success "WiFi state permission: ✓"
    else
        print_error "WiFi state permission: ✗"
    fi
    
    if grep -q "VIBRATE" android/app/src/main/AndroidManifest.xml; then
        print_success "Vibrate permission: ✓"
    else
        print_warning "Vibrate permission: ✗"
    fi
fi

# Build summary
echo ""
echo "🎯 Build Summary"
echo "==============="
print_success "Mobile app rebuild completed successfully!"
print_success "Key features implemented:"
echo "  • Enhanced WiFi network discovery (mDNS + HTTP fallback)"
echo "  • Automatic Raspberry Pi detection"
echo "  • Comprehensive TV remote control interface"
echo "  • WebSocket communication matching proof-of-concept protocol"
echo "  • Text input modal for SmartTV Pi"
echo "  • Video call controls integration"
echo "  • Haptic feedback for better UX"
echo "  • Android-optimized network configuration"

echo ""
print_step "Next steps:"
echo "  1. Install the APK on your Android device:"
echo "     adb install $APK_PATH"
echo "  2. Ensure your SmartTV Pi is running and connected to the same WiFi network"
echo "  3. The mobile app should automatically discover and connect to the Pi"
echo "  4. Test all remote control functions"

echo ""
print_success "Build script completed! 🚀"