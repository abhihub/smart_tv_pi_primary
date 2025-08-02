# SmartTV System Manager

The System Manager is a local service that handles system-level operations for SmartTV devices, including force updates, shutdown, reboot, and device ID management.

## Components

### local_system_server.py
Flask server running on `localhost:5000` that provides:
- **Force Update Checking**: Automatically checks for and installs force updates on startup
- **Package Installation**: Root-privileged .deb package installation via `dpkg`
- **System Control**: Secure shutdown and reboot operations
- **Device Management**: Device ID generation and system information

### device_id.py
Device identification utility that:
- Generates persistent UUID-based device IDs
- Stores device ID in `/etc/smarttv/device_id` as read-only file
- Provides fallback device ID generation for Electron app
- Collects system information (hostname, MAC address, OS info)

### setup.sh
System installation script that:
- Installs minimal X stack and dependencies
- Sets up Tailscale networking
- Configures systemd services for SmartTV components
- Creates device ID and system configuration

## Force Update System

### Automatic Force Updates
The system manager automatically handles force updates:

1. **Startup Check**: Checks for force updates 5 seconds after service start
2. **Version Detection**: Gets current version from installed `smart-tv-ui` package
3. **Update Query**: Makes HTTP request to `/api/updates/check?version=<current>`
4. **Force Update Detection**: Processes updates with `forceUpdate: true` or `important: true`
5. **Download**: Downloads .deb package to `/tmp/smarttv-updates/`
6. **Verification**: Validates package using `dpkg --info`
7. **Installation**: Uninstalls old package and installs new one
8. **Reboot**: Automatically reboots system if update is marked as `important`

### Configuration
Force updates are configured via environment variables:
- `SERVER_URL`: Update server URL (default: `http://167.71.0.87:3001`)

### Logging
All force update operations are logged to `/var/log/smarttv-local-system.log`

## API Endpoints

### POST /api/system/shutdown
Shutdown the local system
```json
{
  "confirm": true,
  "delay": 0
}
```

### POST /api/system/reboot  
Reboot the local system
```json
{
  "confirm": true,
  "delay": 0
}
```

### POST /api/system/install-update
Install a .deb package update
```json
{
  "packagePath": "/path/to/package.deb",
  "confirm": true,
  "restartApp": true
}
```

### POST /api/system/verify-package
Verify a .deb package before installation
```json
{
  "packagePath": "/path/to/package.deb"
}
```

### GET /api/system/status
Get system status information

### GET /api/system/device-info
Get device ID and system information

### GET /health
Health check endpoint

## Installation

Run the setup script as root:
```bash
sudo ./setup.sh
```

This will:
1. Install system dependencies
2. Create systemd services
3. Generate device ID
4. Configure system for kiosk mode

## Service Management

### Start/Stop Services
```bash
# Start local system manager
sudo systemctl start smarttv-local-system

# Stop local system manager  
sudo systemctl stop smarttv-local-system

# Check service status
sudo systemctl status smarttv-local-system
```

### View Logs
```bash
# System manager logs
sudo journalctl -u smarttv-local-system -f

# Or view log file directly
sudo tail -f /var/log/smarttv-local-system.log
```

## Security

- Service runs with root privileges for system operations
- Only listens on localhost (127.0.0.1) for security
- Package verification using `dpkg --info` before installation
- All operations require explicit confirmation flags

## Development

### Running Manually
```bash
cd system_manager/
python3 local_system_server.py
```

### Testing Force Updates
1. Set up a test update server with force update flag
2. Restart the system manager service
3. Check logs for force update processing

### Device ID Management
```bash
# Generate new device ID
python3 device_id.py --create

# Read existing device ID
python3 device_id.py --read

# Get full device information
python3 device_id.py --info
```