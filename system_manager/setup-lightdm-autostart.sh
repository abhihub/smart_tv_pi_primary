#!/bin/bash

set -e
AUTHKEY="tskey-auth-kfR7cQJRAe11CNTRL-9HoznDzEvMbNhyqwcNMvMbTGftUFhV9WT"
echo "🛠 Installing minimal X stack and dependencies..."
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
sudo apt update
sudo apt install -y --no-install-recommends \
  xserver-xorg x11-xserver-utils \
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

echo "🧱 Creating SmartTV launch script..."
sudo tee /usr/local/bin/launch-smarttv.sh > /dev/null << 'EOF'
#!/bin/bash
export DISPLAY=:0
xset s off -dpms
xset s noblank
unclutter -idle 2 &
xrandr --output HDMI-1 --mode 1280x720 --rate 60
exec /usr/lib/smart-tv-ui/smart-tv-ui >> /tmp/smarttv.log 2>&1
EOF

sudo chmod +x /usr/local/bin/launch-smarttv.sh

echo "📁 Creating autostart .desktop entry..."
AUTOSTART_DIR="/home/ubuntu/.config/autostart"
sudo mkdir -p "$AUTOSTART_DIR"
sudo tee "$AUTOSTART_DIR/smart-tv-ui.desktop" > /dev/null << 'EOF'
[Desktop Entry]
Type=Application
Exec=/usr/local/bin/launch-smarttv.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Smart TV UI
EOF

sudo chmod 644 "$AUTOSTART_DIR/smart-tv-ui.desktop"

echo "🔐 Configuring sudo permissions for shutdown/reboot without password..."
sudo tee /etc/sudoers.d/smarttv-shutdown > /dev/null << 'EOF'
# Allow ubuntu user to shutdown and reboot without password
ubuntu ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot
EOF

sudo chmod 440 /etc/sudoers.d/smarttv-shutdown

echo "🐍 Installing local system management server..."
sudo mkdir -p /usr/local/share/smarttv
sudo cp "$(dirname "$0")/local_system_server.py" /usr/local/share/smarttv/
sudo chmod +x /usr/local/share/smarttv/local_system_server.py
sudo cp "$(dirname "$0")/smarttv-local-system.service" /etc/systemd/system/

echo "🔄 Reloading systemd and enabling local system service..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable smarttv-local-system.service
sudo systemctl start smarttv-local-system.service

echo "📊 Service status:"
sudo systemctl status smarttv-local-system.service --no-pager -l

echo "✅ Done! Services installed:"
echo "  - smarttv-local-system.service: Local system management (shutdown/reboot)"
echo ""
echo "📝 Logs:"
echo "  - Local System: journalctl -u smarttv-local-system.service -f"
echo ""
echo "🔄 Reboot now to launch the SmartTV UI automatically under LightDM session!"
