#!/bin/bash

# Run this as sudo to setup the auto-boot

set -e

echo "🛠 Installing minimal X stack and dependencies..."

sudo apt update
sudo apt install -y --no-install-recommends \
  xserver-xorg xinit x11-xserver-utils \
  plymouth plymouth-themes \
  pipewire pipewire-pulse wireplumber \
  unclutter

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

echo "🔄 Reloading systemd and enabling smarttv.service..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable smarttv.service

echo "✅ Done. Reboot now to start the Electron app automatically!"
