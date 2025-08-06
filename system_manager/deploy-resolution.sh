#!/bin/bash
set -e

echo "🍌 Simple Bananasss Setup Script"
echo "================================"
echo "Setting up X11 and resolution for Raspberry Pi 5"
echo ""

# Check if lightdm is enabled (means X11 setup is complete)
if systemctl is-enabled lightdm >/dev/null 2>&1; then
    echo "🎉 X11 is configured! Proceeding to Step 2..."
    echo ""
    
    # STEP 2: Set up automatic resolution script
    echo "🖥️  STEP 2: Creating automatic resolution script..."
    
    # Get the real user
    REAL_USER=${SUDO_USER:-ubuntu}
    
    # Create the resolution script
    sudo tee /usr/local/bin/bananasss-resolution.sh > /dev/null <<EOF
#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/$REAL_USER/.Xauthority
sleep 10

# Log attempts
echo "\$(date): Bananasss resolution script starting" >> /home/$REAL_USER/bananasss.log

# Try HDMI-1 first, then HDMI-2
if xrandr --output HDMI-1 --mode 1024x768 2>/dev/null; then
    echo "\$(date): Set 1024x768 on HDMI-1" >> /home/$REAL_USER/bananasss.log
elif xrandr --output HDMI-2 --mode 1024x768 2>/dev/null; then
    echo "\$(date): Set 1024x768 on HDMI-2" >> /home/$REAL_USER/bananasss.log
else
    echo "\$(date): Failed to set resolution" >> /home/$REAL_USER/bananasss.log
fi
EOF

    sudo chmod +x /usr/local/bin/bananasss-resolution.sh
    
    # Set up cron job for automatic startup
    echo "⏰ Setting up automatic startup..."
    CRON_LINE="@reboot /usr/local/bin/bananasss-resolution.sh"
    (crontab -l 2>/dev/null | grep -v bananasss-resolution.sh; echo "$CRON_LINE") | crontab -
    
    echo "✅ Automatic resolution script created"
    echo "📝 Script will run on every boot to set 1024x768 resolution"
    echo ""
    echo "🧪 To test the resolution script manually:"
    echo "   sudo -u $REAL_USER /usr/local/bin/bananasss-resolution.sh"
    echo ""
    echo "📋 To check logs:"
    echo "   cat ~/bananasss.log"
    echo ""
    echo "🍌 Bananasss setup complete!"
    echo "Your Pi will automatically use 1024x768 resolution on next boot!"
    
else
    echo "🔧 Setting up X11 (Step 1)..."
    echo ""
    
    # STEP 1: Switch to X11
    sudo systemctl disable wayland-session@ubuntu.service 2>/dev/null || true
    sudo systemctl enable lightdm.service
    sudo systemctl set-default graphical.target
    echo "✅ X11 configuration complete"
    echo ""
    echo "🔄 Please reboot: sudo reboot"
    echo "After reboot, run this script again to complete setup..."
fi
