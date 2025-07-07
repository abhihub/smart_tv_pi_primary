#!/bin/bash
# TV Remote Setup Script for Raspberry Pi
# Sets up HDMI-CEC and other TV remote protocols

echo "🎮 Setting up TV Remote support for SmartTV..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install HDMI-CEC tools
echo "📺 Installing HDMI-CEC support..."
sudo apt install -y cec-utils

# Install IR remote support (optional)
echo "📡 Installing IR remote support..."
sudo apt install -y lirc

# Enable HDMI-CEC in Raspberry Pi config
echo "⚙️ Configuring HDMI-CEC..."
CONFIG_FILE="/boot/firmware/config.txt"
if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="/boot/config.txt"
fi

# Add HDMI-CEC configuration if not already present
if ! grep -q "hdmi_cec_init=1" "$CONFIG_FILE"; then
    echo "hdmi_cec_init=1" | sudo tee -a "$CONFIG_FILE"
    echo "✅ Added HDMI-CEC initialization"
fi

if ! grep -q "cec_osd_name" "$CONFIG_FILE"; then
    echo 'cec_osd_name="SmartTV"' | sudo tee -a "$CONFIG_FILE"
    echo "✅ Set CEC device name to SmartTV"
fi

# Configure CEC for TV remote
echo "🎛️ Configuring CEC client..."
sudo tee /etc/cec-client.conf > /dev/null << 'EOF'
# CEC Client configuration for SmartTV
d 8
at 0x1001
# Enable TV remote passthrough
as
# Set device type as playback device
t p
# Monitor all CEC messages
EOF

# Create CEC service for automatic startup
echo "🚀 Creating CEC service..."
sudo tee /etc/systemd/system/cec-client.service > /dev/null << 'EOF'
[Unit]
Description=CEC Client for TV Remote
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/cec-client -d 8 -f /etc/cec-client.conf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable CEC service
sudo systemctl enable cec-client.service
echo "✅ CEC service enabled"

# Create udev rules for TV remote input
echo "🔧 Setting up input device rules..."
sudo tee /etc/udev/rules.d/99-tv-remote.rules > /dev/null << 'EOF'
# TV Remote input device rules
# CEC devices
SUBSYSTEM=="input", ATTRS{name}=="*CEC*", MODE="0666", GROUP="input"
# HDMI CEC
SUBSYSTEM=="input", ATTRS{name}=="*hdmi*", MODE="0666", GROUP="input"
# Generic TV remote devices
SUBSYSTEM=="input", ATTRS{name}=="*remote*", MODE="0666", GROUP="input"
SUBSYSTEM=="input", ATTRS{name}=="*Remote*", MODE="0666", GROUP="input"
EOF

# Add user to input group
sudo usermod -a -G input $USER
echo "✅ Added $USER to input group"

# Create TV remote test script
echo "🧪 Creating TV remote test script..."
tee ~/test-tv-remote.sh > /dev/null << 'EOF'
#!/bin/bash
echo "🎮 Testing TV Remote..."
echo "Press buttons on your TV remote. Press Ctrl+C to exit."
echo ""

# Test CEC
echo "📺 Testing HDMI-CEC..."
if command -v cec-client &> /dev/null; then
    echo "CEC client available"
    cec-client -l
else
    echo "CEC client not installed"
fi

echo ""
echo "🔍 Monitoring input events..."
echo "Available input devices:"
ls /dev/input/by-id/ 2>/dev/null || echo "No input devices found"

echo ""
echo "📊 Input device information:"
sudo dmesg | grep -i "input\|cec\|remote" | tail -10

echo ""
echo "🎮 To test in browser, open DevTools console and watch for key events"
echo "💡 Try these TV remote buttons:"
echo "   - Arrow keys (Up/Down/Left/Right)"
echo "   - OK/Enter button"
echo "   - Back/Exit button"
echo "   - Number keys"
EOF

chmod +x ~/test-tv-remote.sh

# Display setup information
echo ""
echo "🎉 TV Remote setup complete!"
echo ""
echo "📋 Setup Summary:"
echo "   ✅ HDMI-CEC support installed"
echo "   ✅ CEC client configured"
echo "   ✅ Input device permissions set"
echo "   ✅ User added to input group"
echo ""
echo "🔄 REBOOT REQUIRED to activate changes:"
echo "   sudo reboot"
echo ""
echo "🧪 After reboot, test TV remote with:"
echo "   ./test-tv-remote.sh"
echo ""
echo "🎮 TV Remote should work with:"
echo "   - HDMI-CEC compatible remotes"
echo "   - Most modern TV remotes"
echo "   - Bluetooth remotes"
echo "   - IR remotes (if IR receiver connected)"
echo ""
echo "🐛 For debugging, check SmartTV app console for:"
echo "   '🎮 Key event - key: ...' messages"