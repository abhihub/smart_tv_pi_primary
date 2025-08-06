#!/bin/bash

# Desired resolution (change to 1920x1080 if needed)
RESOLUTION="1280x720"
RATE="60"
XRANDR_OUTPUT="HDMI-1"

# Detect current user and home dir
USERNAME=$(logname)
USER_HOME=$(eval echo "~$USERNAME")

echo "Detected user: $USERNAME"
echo "User home: $USER_HOME"

# 1. Switch to X11 backend (Wayland toggle)
sudo raspi-config nonint do_wayland W1
echo "Switched to X11 (raspi-config nonint)"

# 2. Create xrandr script
RES_SCRIPT="$USER_HOME/set-resolution.sh"
echo "#!/bin/bash
sleep 5
xrandr --output $XRANDR_OUTPUT --mode $RESOLUTION --rate $RATE" | sudo tee "$RES_SCRIPT" > /dev/null
sudo chmod +x "$RES_SCRIPT"
echo "Created $RES_SCRIPT"

# 3. Create autostart entry
AUTOSTART_DIR="$USER_HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/set-resolution.desktop"
mkdir -p "$AUTOSTART_DIR"
echo "[Desktop Entry]
Type=Application
Exec=$RES_SCRIPT
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Set Resolution" > "$AUTOSTART_FILE"
echo "Created autostart file: $AUTOSTART_FILE"

# 4. Cleanup conflicting settings
sudo sed -i '/video=HDMI/d;/drm.edid_firmware/d' /boot/firmware/cmdline.txt
sudo sed -i '/hdmi_force_hotplug/d;/hdmi_drive/d;/hdmi_group/d;/hdmi_mode/d' /boot/firmware/config.txt
sudo rm -f /etc/modprobe.d/kms.conf
sudo rm -rf /lib/firmware/edid/
echo "Cleaned up conflicting settings"

# 5. Reboot
echo "✅ Setup complete. Rebooting..."
sudo reboot