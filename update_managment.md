# SmartTV Auto-Update System

This document describes the auto-update system implemented for the SmartTV Electron application.

## Overview

The auto-update system consists of:
1. **Backend API** - Flask server endpoints for version management and .deb package hosting
2. **Electron Frontend** - Settings page with update checking and installation UI
3. **System Manager** - Local root-privileged service for secure package installation
4. **Package Management** - Automated download and installation of .deb packages

## Backend Components

### API Endpoints

#### `GET /api/updates/check?version=<current_version>`
Check for available updates by comparing the current version with the latest available version.

**Response:**
```json
{
  "hasUpdate": true,
  "currentVersion": "1.0.0",
  "latestVersion": "1.1.0",
  "releaseNotes": "Bug fixes and new features",
  "releaseDate": "2024-01-15T10:30:00",
  "downloadUrl": "/api/updates/download/1.1.0",
  "fileSize": 125829120
}
```

#### `GET /api/updates/download/<version>`
Download a specific version of the .deb package.

#### `GET /api/updates/versions`
List all available versions with metadata.

#### `POST /api/updates/upload`
Upload a new .deb package (for administrators).

**Form Data:**
- `file`: .deb package file
- `version`: Version string (e.g., "1.1.0")
- `releaseNotes`: Optional release notes

#### `DELETE /api/updates/delete/<version>`
Delete a specific version from the update system (for administrators).

**Response:**
```json
{
  "message": "Version 1.1.0 deleted successfully",
  "version": "1.1.0",
  "filename": "smart-tv-ui_1.1.0_amd64.deb"
}
```

### File Structure

```
server_side/
├── api/
│   └── update_routes.py       # Update API endpoints
├── updates/                   # Directory for .deb packages
│   ├── versions.json          # Version metadata
│   └── *.deb                  # Package files
├── upload_update.py           # Helper script for uploading updates
└── requirements.txt           # Updated dependencies
```

### Version Metadata (`versions.json`)

```json
{
  "versions": [
    {
      "version": "1.1.0",
      "filename": "smart-tv-ui_1.1.0_amd64.deb",
      "releaseNotes": "Added auto-update functionality",
      "releaseDate": "2024-01-15T10:30:00",
      "fileSize": 125829120
    }
  ]
}
```

## Frontend Components

### Settings Page (`settings.html`)

The settings page provides a user-friendly interface for:
- Displaying current app version
- Checking for updates manually or automatically
- Viewing release notes and update information
- Downloading and installing updates with progress tracking

### Update Flow

1. **Check for Updates**: Compare current version with backend
2. **Display Information**: Show available update details and release notes
3. **Download**: Stream .deb package with progress indication to Downloads folder
4. **Verify**: Use system manager to verify package integrity
5. **Install**: System manager installs package with root privileges via `dpkg -i`
6. **Restart**: System manager automatically restarts the application after installation

### Electron Integration

#### Preload Script (`preload.js`)
Exposes secure APIs to the renderer process:
- `downloadUpdate(downloadUrl, version)` - Download packages to Downloads folder
- `getAppVersion()` - Get current application version
- `onUpdateProgress(callback)` - Listen for download progress events

#### Main Process (`main.js`)
Handles IPC communication for:
- Downloading .deb packages to user's Downloads folder
- Progress reporting during download
- Version management

## System Manager Integration

### Local System Server (`system_manager/local_system_server.py`)

The system manager runs as a root-privileged service on `localhost:5000` and provides secure installation endpoints:

#### `/api/system/install-update` (POST)
Installs .deb packages with root privileges.

**Request:**
```json
{
  "packagePath": "/home/user/Downloads/smart-tv-ui_1.1.0_amd64.deb",
  "confirm": true,
  "restartApp": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Update installation initiated",
  "packagePath": "/home/user/Downloads/smart-tv-ui_1.1.0_amd64.deb",
  "restartApp": true,
  "timestamp": "2024-01-15 10:30:00"
}
```

#### `/api/system/verify-package` (POST)
Verifies .deb package integrity before installation.

**Request:**
```json
{
  "packagePath": "/home/user/Downloads/smart-tv-ui_1.1.0_amd64.deb"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "packageInfo": {
    "Package": "smart-tv-ui",
    "Version": "1.1.0",
    "Architecture": "amd64",
    "Description": "Smart TV console application"
  },
  "size": 125829120
}
```

### Security Benefits

- **Privilege Separation**: Electron app runs as user, installation runs as root
- **Process Isolation**: Installation happens in separate service process
- **Local-only Access**: System manager only accepts connections from localhost
- **Package Verification**: Validates .deb integrity before installation
- **Automatic Cleanup**: Removes downloaded packages after installation

## Usage

### For Administrators: Uploading Updates

1. **Build the .deb package:**
   ```bash
   cd Electron_App/SmartTV-UI/
   npm run make
   ```

2. **Upload to server:**
   ```bash
   cd server_side/
   python upload_update.py path/to/smart-tv-ui_1.1.0_amd64.deb 1.1.0 "Bug fixes and improvements"
   ```

3. **List available versions:**
   ```bash
   python upload_update.py --list
   ```

4. **Delete a version:**
   ```bash
   python upload_update.py --delete 1.1.0
   ```

### For End Users: Installing Updates

1. Open the SmartTV application
2. Navigate to Settings (press 6 or click the Settings tile)
3. The app will automatically check for updates on page load
4. If an update is available:
   - Review the release notes and file size
   - Click "Download Update" to start the download
   - Click "Install Update" once download completes
   - The application will restart automatically

### Manual Update Check

Users can manually check for updates by clicking the "Check for Updates" button in the Settings page.

## Security Considerations

### Authentication
- The upload endpoint should be protected with authentication in production
- Consider implementing API keys or admin user authentication

### Package Verification
- System manager verifies package integrity using `dpkg --info`
- Consider implementing package signature verification
- Add checksum validation for downloaded packages

### Permissions
- System manager runs with root privileges via systemd service
- No user interaction required for installation (passwordless)
- Electron app runs with standard user privileges

## Configuration

### Server Configuration
The update server URL is configurable in the Electron app:
```javascript
const CONFIG = {
    SERVER_URL: 'http://localhost:3001',        // Backend update server
    SYSTEM_SERVER_URL: 'http://127.0.0.1:5000', // Local system manager
    APP_VERSION: '1.0.0'
};
```

### Environment Variables
Set `SERVER_URL` in the Electron app's environment to point to your production server.

## Deployment Notes

### Production Setup
1. Deploy the Flask server with the update routes enabled
2. Ensure the `updates/` directory has proper read/write permissions
3. Configure a reverse proxy (nginx) to handle large file uploads if needed
4. Set up SSL/TLS for secure package downloads

### Linux Package Installation
The system uses `dpkg` for package installation, which requires:
- The target system to support .deb packages (Debian/Ubuntu)
- PolicyKit (`pkexec`) for elevated privileges
- Proper package dependencies listed in the .deb control file

### File Size Limits
- Flask has default limits for file uploads
- Configure `MAX_CONTENT_LENGTH` if uploading large packages
- Consider implementing chunked uploads for very large files

## Recent Improvements

### Protocol Support Fix
Fixed HTTP/HTTPS protocol detection in Electron download mechanism. The system now automatically detects whether to use HTTP or HTTPS based on the server URL, resolving the "Protocol 'http:' not supported. Expected 'https:'" error.

### Version Management
Added ability to delete versions from the update server:
- New DELETE endpoint: `/api/updates/delete/<version>`
- Enhanced upload script with `--delete` flag
- Automatic file cleanup when versions are removed

## Troubleshooting

### Common Issues

1. **Download Fails**
   - Check network connectivity
   - Verify server URL configuration
   - Check Flask server logs for errors
   - Ensure protocol (HTTP/HTTPS) matches server configuration

2. **Installation Fails**
   - Verify user has sudo privileges
   - Check package dependencies
   - Review system logs: `journalctl -u smart-tv-ui`

3. **Version Check Fails**
   - Ensure Flask server is running
   - Check CORS configuration
   - Verify API endpoint accessibility

### Debugging

Enable development mode in Electron to see detailed logs:
```bash
npm run dev
```

Check Flask server logs for API request details and errors.

## Future Enhancements

- **Delta Updates**: Only download changed files
- **Rollback Capability**: Ability to revert to previous versions
- **Automatic Updates**: Schedule automatic update checks
- **Update Channels**: Support for beta/stable release channels
- **Progress Persistence**: Resume interrupted downloads
- **Bandwidth Throttling**: Control download speed for slower connections