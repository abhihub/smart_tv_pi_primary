```
#!/bin/bash
# 1) Private D-Bus session
eval "$(dbus-launch --sh-syntax --exit-with-session)"

# 2) PipeWire for audio
export XDG_RUNTIME_DIR=/run/user/$(id -u)
mkdir -p "$XDG_RUNTIME_DIR"
pipewire &      # core
pipewire-pulse &  # PulseAudio shim
wireplumber &   # session manager

# 3) Disable screen blanking & hide cursor
xset s off -dpms
xset s noblank
unclutter -idle 2 &

# 4) Detect resolution
RES=$(xrandr | awk '/\*/{print $1; exit}')
W=${RES%x*}; H=${RES#*x}

# 5) VA-API driver
export LIBVA_DRIVER_NAME=iHD  # or 'radeonsi' for AMD

# 6) Launch Chrome with GPU/VA-API flags
exec google-chrome \
  --window-size="$W,$H" --window-position=0,0 \
  --no-first-run --disable-translate --disable-infobars --incognito \
  --ignore-gpu-blocklist \
  --enable-features=VaapiVideoDecoder \
  --use-gl=desktop \
  --disable-software-rasterizer \
  --enable-zero-copy \
  --disable-sync \
  --disable-background-mode \
  --start-fullscreen\
  --disable-breakpad \
  --disable-dev-shm-usage \
  --disable-gpu-driver-bug-workarounds \
  --no-sandbox \
  https://trivia-with-kids.replit.app/
```