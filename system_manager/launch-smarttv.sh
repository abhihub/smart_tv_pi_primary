#!/bin/bash

# will be auto created by setup.sh
# Wait for X to be ready
sleep 2

xset s off -dpms
xset s noblank
unclutter -idle 2 &

# Optional resolution setting
xrandr --output HDMI-1 --mode 1280x720 --rate 60

# Delay slightly to allow X11 to initialize
sleep 2

echo "Launching smart-tv-ui..." >> /tmp/smarttv.log
smart-tv-ui >> /tmp/smarttv.log 2>&1