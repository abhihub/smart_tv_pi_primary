# SmartTV System Manager

This directory contains the system management components for the SmartTV project, including setup scripts and system services.

## Components

### 1. Main Setup Script
- **`setup.sh`** - Main installation and configuration script
  - Installs minimal X server stack
  - Configures SmartTV kiosk service
  - Sets up local system management server
  - Configures sudo permissions for shutdown/reboot

### 2. SmartTV Kiosk Service
- **`smarttvboot.service`** - Systemd service for the main SmartTV application
- **`launch-smarttv.sh`** - Launch script for the Electron app

### 3. Local System Management Server
- **`local_system_server.py`** - Flask server handling local system operations
- **`smarttv-local-system.service`** - Systemd service for the local server

## Architecture

The system uses a **dual-server architecture** to prevent remote server shutdown issues:

1. **Remote Server** (`http://167.71.0.87:3001`)
   - Handles user management, calls, and application logic
   - Located on remote infrastructure
   - Cannot safely handle shutdown commands (would kill the server)

2. **Local System Server** (`http://localhost:5000`)
   - Handles local system operations (shutdown, reboot, status)
   - Runs on the same device as the SmartTV client
   - Safe to execute shutdown commands without affecting remote services

## Installation

Run the setup script with sudo privileges:

```bash
cd system_manager
sudo ./setup.sh
```

This will:
1. Install required system packages
2. Configure the SmartTV kiosk service
3. Install and start the local system management server
4. Set up proper permissions and logging

## Services

After installation, two systemd services will be running:

### SmartTV Kiosk (`smarttv.service`)
```bash
# Status
sudo systemctl status smarttv.service

# Logs
sudo journalctl -u smarttv.service -f

# Control
sudo systemctl start|stop|restart smarttv.service
```

### Local System Management (`smarttv-local-system.service`)
```bash
# Status
sudo systemctl status smarttv-local-system.service

# Logs
sudo journalctl -u smarttv-local-system.service -f

# Control
sudo systemctl start|stop|restart smarttv-local-system.service
```

## API Endpoints

The local system server provides these endpoints:

- `POST /api/system/shutdown` - Shutdown the local device
- `POST /api/system/reboot` - Reboot the local device  
- `GET /api/system/status` - Get system status information
- `GET /health` - Health check

### Example shutdown request:
```bash
curl -X POST http://localhost:5000/api/system/shutdown \
  -H "Content-Type: application/json" \
  -d '{"confirm": true, "delay": 2}'
```

## File Locations

After installation:
- Local system server: `/usr/local/share/smarttv/local_system_server.py`
- Service files: `/etc/systemd/system/smarttv*.service`
- Launch script: `/usr/local/bin/launch-smarttv.sh`
- Sudo config: `/etc/sudoers.d/smarttv-shutdown`
- Logs: `/var/log/smarttv-local-system.log` and systemd journal

## Security

- Local system server only listens on `127.0.0.1:5000` (localhost only)
- Shutdown operations require confirmation parameter
- Sudo permissions configured only for specific shutdown/reboot commands
- Services run with restricted privileges and sandboxing