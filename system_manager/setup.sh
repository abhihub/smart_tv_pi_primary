#!/bin/bash

set -e
AUTHKEY="tskey-auth-kfR7cQJRAe11CNTRL-9HoznDzEvMbNhyqwcNMvMbTGftUFhV9WT"
echo "🛠 Installing minimal X stack and dependencies..."
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
sudo apt update
sudo apt install -y --no-install-recommends \
  xserver-xorg xinit x11-xserver-utils \
  plymouth plymouth-themes \
  pipewire pipewire-pulse wireplumber \
  unclutter \
  python3-pip python3-flask python3-flask-cors tailscale

echo "Setting up Tailscale Network..."
sudo systemctl start tailscaled
sudo systemctl enable tailscaled
sudo tailscale up --authkey="${AUTHKEY}"

echo "Enabling SSH..."
sudo systemctl start ssh
sudo systemctl enable ssh

echo "🧹 Disabling resource-intensive desktop environment..."
sudo systemctl disable lightdm.service || true
sudo systemctl mask lightdm.service || true

echo "🧱 Creating SmartTV launch script..."
sudo tee /usr/local/bin/launch-smarttv.sh > /dev/null << 'EOF'
#!/bin/bash

# Disable screen blanking and energy-saving
xset s off -dpms
xset s noblank

# Hide the mouse cursor after 2 seconds of inactivity
unclutter -idle 2 &

# Wait for X to fully initialize
sleep 1

# Launch the Electron app
exec smart-tv-ui
EOF

sudo chmod +x /usr/local/bin/launch-smarttv.sh

echo "📦 Creating systemd service for SmartTV kiosk..."
sudo tee /etc/systemd/system/smarttv.service > /dev/null << 'EOF'
[Unit]
Description=SmartTV Kiosk
After=network.target

[Service]
User=ubuntu
Group=ubuntu
PAMName=login

TTYPath=/dev/tty1
StandardInput=tty
StandardOutput=journal
StandardError=inherit

Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/ubuntu/.Xauthority

ExecStart=/usr/bin/xinit /usr/local/bin/launch-smarttv.sh -- :0 vt1 -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "🛑 Masking getty@tty1 to prevent console login..."
sudo systemctl mask getty@tty1.service

echo "🔐 Configuring sudo permissions for shutdown/reboot without password..."
sudo tee /etc/sudoers.d/smarttv-shutdown > /dev/null << 'EOF'
# Allow ubuntu user to shutdown and reboot without password
ubuntu ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot
EOF

sudo chmod 440 /etc/sudoers.d/smarttv-shutdown

echo "🆔 Generating unique device ID..."
# Create SmartTV configuration directory
sudo mkdir -p /etc/smarttv
sudo mkdir -p /usr/local/share/smarttv

# Generate unique device ID using Python
DEVICE_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
echo "Generated device ID: $DEVICE_ID"

# Write device ID to read-only file
echo "$DEVICE_ID" | sudo tee /etc/smarttv/device_id > /dev/null
sudo chmod 444 /etc/smarttv/device_id

# Create device info file with system details
sudo python3 << 'PYTHON_EOF'
import json
import subprocess
import os
from datetime import datetime

# Read the device ID we just created
with open('/etc/smarttv/device_id', 'r') as f:
    device_id = f.read().strip()

# Get system information
try:
    hostname = subprocess.check_output(['hostname'], text=True).strip()
except:
    hostname = 'unknown'

# Get MAC address
mac_address = None
try:
    result = subprocess.check_output(['ip', 'link', 'show'], text=True)
    for line in result.split('\n'):
        if 'link/ether' in line and 'lo:' not in line:
            parts = line.strip().split()
            if len(parts) >= 2:
                mac_address = parts[1]
                break
except:
    pass

# Get OS info
os_info = "Unknown"
try:
    with open('/etc/os-release', 'r') as f:
        for line in f:
            if line.startswith('PRETTY_NAME='):
                os_info = line.split('=', 1)[1].strip().strip('"')
                break
except:
    pass

# Create device info
device_info = {
    'device_id': device_id,
    'hostname': hostname,
    'mac_address': mac_address,
    'os_info': os_info,
    'generated_at': datetime.now().isoformat()
}

# Write device info file
with open('/etc/smarttv/device_info.json', 'w') as f:
    json.dump(device_info, f, indent=2)

print(f"Device info saved to /etc/smarttv/device_info.json")
PYTHON_EOF

# Make device info file read-only
sudo chmod 444 /etc/smarttv/device_info.json

echo "🐍 Installing local system management server..."

# Copy local system server to system location
sudo cp "$(dirname "$0")/local_system_server.py" /usr/local/share/smarttv/
sudo chmod +x /usr/local/share/smarttv/local_system_server.py

# Install systemd service for local system server
sudo cp "$(dirname "$0")/smarttv-local-system.service" /etc/systemd/system/

echo "🔄 Reloading systemd and enabling services..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable smarttv.service
sudo systemctl enable smarttv-local-system.service

echo "🚀 Starting local system management server..."
sudo systemctl start smarttv-local-system.service

echo "📊 Service status:"
sudo systemctl status smarttv-local-system.service --no-pager -l

echo "✅ Done! Services installed:"
echo "  - smarttv.service: Main SmartTV kiosk application"
echo "  - smarttv-local-system.service: Local system management (shutdown/reboot)"
echo ""
echo "📝 Logs:"
echo "  - SmartTV App: journalctl -u smarttv.service -f"
echo "  - Local System: journalctl -u smarttv-local-system.service -f"
echo ""
echo "🔄 Reboot now to start the SmartTV kiosk automatically!"
