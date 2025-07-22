#!/bin/bash

# SmartTV Remote - Download Latest EAS Build APK
# This script downloads the latest successful EAS build APK

set -e

echo "📱 SmartTV Remote - Download Latest APK"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Latest successful build information
BUILD_ID="7dfd3dd6-28eb-43d6-80aa-fab3b4f3a080"
APK_URL="https://expo.dev/artifacts/eas/gym4maTRmVJwFBFHSkNrE1.apk"
APK_FILENAME="smarttv-remote-preview.apk"

print_step "Downloading latest preview APK..."
echo "Build ID: $BUILD_ID"
echo "Download URL: $APK_URL"
echo ""

# Download the APK
if command -v wget &> /dev/null; then
    wget -O "$APK_FILENAME" "$APK_URL"
elif command -v curl &> /dev/null; then
    curl -L -o "$APK_FILENAME" "$APK_URL"
else
    print_warning "Neither wget nor curl found. Please download manually:"
    echo "$APK_URL"
    exit 1
fi

if [ -f "$APK_FILENAME" ]; then
    # Get file size
    APK_SIZE=$(du -h "$APK_FILENAME" | cut -f1)
    print_success "APK downloaded successfully!"
    print_success "File: $APK_FILENAME"
    print_success "Size: $APK_SIZE"
    
    echo ""
    print_step "Installation instructions:"
    echo "1. Enable 'Install from Unknown Sources' on your Android device"
    echo "2. Transfer the APK to your device or install via ADB:"
    echo "   adb install $APK_FILENAME"
    echo "3. Make sure your SmartTV Pi is running and connected to WiFi"
    echo "4. Open the SmartTV Remote app on your device"
    echo ""
    print_success "Ready to test! 🚀"
else
    print_warning "Download may have failed. Check the URL and try again."
fi