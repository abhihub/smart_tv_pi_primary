#!/bin/bash

# SmartTV Remote - EAS Preview APK Build Script
# This script builds a preview APK using Expo Application Services (EAS)

set -e  # Exit on any error

echo "🚀 SmartTV Remote - EAS Preview Build"
echo "===================================="

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

# Check prerequisites
print_step "Checking prerequisites..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI is not installed. Installing now..."
    npm install -g eas-cli
    print_success "EAS CLI installed"
else
    print_success "EAS CLI is already installed"
    eas --version
fi

# Check if logged into Expo
print_step "Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    print_error "Not logged into Expo account. Please login:"
    eas login
else
    EXPO_USER=$(eas whoami)
    print_success "Logged in as: $EXPO_USER"
fi

# Verify project configuration
print_step "Verifying project configuration..."
if [ ! -f "eas.json" ]; then
    print_error "eas.json not found. Run 'eas build:configure' first."
    exit 1
fi

if [ ! -f "app.json" ]; then
    print_error "app.json not found. This is required for EAS builds."
    exit 1
fi

print_success "Project configuration verified"

# Check for required assets
print_step "Checking required assets..."
MISSING_ASSETS=()

if [ ! -f "assets/icon.png" ]; then
    MISSING_ASSETS+=("assets/icon.png")
fi

if [ ! -f "assets/adaptive-icon.png" ]; then
    MISSING_ASSETS+=("assets/adaptive-icon.png")
fi

if [ ! -f "assets/splash.png" ]; then
    MISSING_ASSETS+=("assets/splash.png")
fi

if [ ${#MISSING_ASSETS[@]} -gt 0 ]; then
    print_warning "Some assets are missing: ${MISSING_ASSETS[*]}"
    print_step "Creating placeholder assets from sample_icon.png..."
    
    if [ -f "assets/sample_icon.png" ]; then
        for asset in "${MISSING_ASSETS[@]}"; do
            cp assets/sample_icon.png "$asset"
            print_success "Created $asset"
        done
    else
        print_error "sample_icon.png not found. Please ensure all required assets exist."
        exit 1
    fi
else
    print_success "All required assets found"
fi

# Install dependencies
print_step "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Clear any previous builds
print_step "Clearing previous build cache..."
npx expo install --fix
print_success "Cache cleared"

# Show build options
echo ""
print_step "Available build profiles:"
echo "  1. preview       - Standard preview APK (recommended)"
echo "  2. preview-local - Local build (faster, requires Android SDK)"
echo "  3. development   - Development build with debugging"
echo "  4. production    - Production build"

# Ask user for build profile
echo ""
read -p "Select build profile (1-4) [default: 1]: " BUILD_CHOICE

case $BUILD_CHOICE in
    2)
        BUILD_PROFILE="preview-local"
        ;;
    3)
        BUILD_PROFILE="development"
        ;;
    4)
        BUILD_PROFILE="production"
        ;;
    *)
        BUILD_PROFILE="preview"
        ;;
esac

print_step "Selected build profile: $BUILD_PROFILE"

# Show build command that will be executed
echo ""
print_step "Build command to execute:"
echo "eas build --platform android --profile $BUILD_PROFILE"

# Ask for confirmation
echo ""
read -p "Proceed with build? (y/N): " CONFIRM

if [[ $CONFIRM != [yY] && $CONFIRM != [yY][eE][sS] ]]; then
    print_warning "Build cancelled by user"
    exit 0
fi

# Start the build
echo ""
print_step "Starting EAS build..."
echo "This may take 10-20 minutes depending on the build queue..."

# Execute the build
eas build --platform android --profile $BUILD_PROFILE

# Check build result
if [ $? -eq 0 ]; then
    print_success "Build completed successfully! 🎉"
    echo ""
    print_step "Next steps:"
    echo "  1. Download the APK from the EAS build dashboard"
    echo "  2. Install it on your Android device: adb install <apk-file>"
    echo "  3. Make sure your SmartTV Pi is running and connected to WiFi"
    echo "  4. Open the app and it should automatically discover your Pi"
    echo ""
    print_step "Build dashboard: https://expo.dev/accounts/$EXPO_USER/projects/mobile/builds"
else
    print_error "Build failed. Check the output above for details."
    echo ""
    print_step "Common solutions:"
    echo "  • Check that all dependencies are compatible"
    echo "  • Verify eas.json configuration"
    echo "  • Ensure all required assets exist"
    echo "  • Check Expo account limits and quotas"
    exit 1
fi

echo ""
print_success "EAS Preview Build Script completed! 🚀"