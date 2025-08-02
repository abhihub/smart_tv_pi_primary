const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DeviceIDManager {
  constructor() {
    this.configDir = '/etc/smarttv';
    this.deviceIdFile = path.join(this.configDir, 'device_id');
    this.userIdFile = path.join(this.configDir, 'user_id');
    this.deviceInfoFile = path.join(this.configDir, 'device_info.json');
  }

  /**
   * Generate a unique device ID using crypto.randomUUID()
   */
  generateDeviceId() {
    return crypto.randomUUID();
  }

  /**
   * Generate a 5-digit alphanumeric user ID that's easy to share
   */
  generateUserId() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Excluded O, 0 for clarity
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get system information for device registration
   */
  async getSystemInfo() {
    try {
      const info = {
        hostname: 'unknown',
        mac_address: null,
        os_info: 'Unknown',
        generated_at: new Date().toISOString()
      };

      // Get hostname
      try {
        const { stdout } = await execPromise('hostname');
        info.hostname = stdout.trim();
      } catch (error) {
        console.warn('Failed to get hostname:', error.message);
      }

      // Get MAC address
      try {
        const { stdout } = await execPromise('ip link show');
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('link/ether') && !line.includes('lo:')) {
            const parts = line.trim().split();
            if (parts.length >= 2) {
              info.mac_address = parts[1];
              break;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to get MAC address:', error.message);
      }

      // Get OS info
      try {
        const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
        const lines = osRelease.split('\n');
        for (const line of lines) {
          if (line.startsWith('PRETTY_NAME=')) {
            info.os_info = line.split('=', 2)[1].replace(/"/g, '');
            break;
          }
        }
      } catch (error) {
        console.warn('Failed to get OS info:', error.message);
      }

      return info;
    } catch (error) {
      console.error('Failed to get system info:', error);
      return {
        hostname: 'unknown',
        mac_address: null,
        os_info: 'Unknown',
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Create device ID and user ID, store them in /etc/smarttv/ as read-only
   */
  async createDeviceId() {
    try {
      console.log('🆔 Creating device and user IDs...');

      // Create /etc/smarttv directory if it doesn't exist (requires sudo)
      try {
        await execPromise(`sudo mkdir -p ${this.configDir}`);
        await execPromise(`sudo chmod 755 ${this.configDir}`);
      } catch (error) {
        console.error('❌ Failed to create config directory:', error.message);
        throw new Error('Failed to create config directory - ensure sudo permissions');
      }

      // Generate new device ID and user ID
      const deviceId = this.generateDeviceId();
      const userId = this.generateUserId();
      console.log(`🆔 Generated device ID: ${deviceId}`);
      console.log(`👤 Generated user ID: ${userId}`);

      // Write device ID to file (requires sudo)
      const tempDeviceFile = `/tmp/smarttv_device_id_${Date.now()}`;
      fs.writeFileSync(tempDeviceFile, deviceId);
      
      await execPromise(`sudo mv ${tempDeviceFile} ${this.deviceIdFile}`);
      await execPromise(`sudo chmod 444 ${this.deviceIdFile}`);

      // Write user ID to file (requires sudo)
      const tempUserFile = `/tmp/smarttv_user_id_${Date.now()}`;
      fs.writeFileSync(tempUserFile, userId);
      
      await execPromise(`sudo mv ${tempUserFile} ${this.userIdFile}`);
      await execPromise(`sudo chmod 444 ${this.userIdFile}`);

      // Create device info file
      const systemInfo = await this.getSystemInfo();
      systemInfo.device_id = deviceId;
      systemInfo.user_id = userId;

      const tempInfoFile = `/tmp/smarttv_device_info_${Date.now()}`;
      fs.writeFileSync(tempInfoFile, JSON.stringify(systemInfo, null, 2));
      
      await execPromise(`sudo mv ${tempInfoFile} ${this.deviceInfoFile}`);
      await execPromise(`sudo chmod 444 ${this.deviceInfoFile}`);

      console.log(`✅ Device ID stored in ${this.deviceIdFile}`);
      console.log(`✅ User ID stored in ${this.userIdFile}`);
      console.log(`✅ Device info stored in ${this.deviceInfoFile}`);

      return { deviceId, userId };
    } catch (error) {
      console.error('❌ Failed to create device/user IDs:', error);
      throw error;
    }
  }

  /**
   * Read existing device ID from /etc/smarttv/device_id
   */
  readDeviceId() {
    try {
      if (fs.existsSync(this.deviceIdFile)) {
        const deviceId = fs.readFileSync(this.deviceIdFile, 'utf8').trim();
        console.log(`🆔 Read existing device ID: ${deviceId}`);
        return deviceId;
      } else {
        console.log('🆔 No existing device ID found');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to read device ID:', error);
      return null;
    }
  }

  /**
   * Read existing user ID from /etc/smarttv/user_id
   */
  readUserId() {
    try {
      if (fs.existsSync(this.userIdFile)) {
        const userId = fs.readFileSync(this.userIdFile, 'utf8').trim();
        console.log(`👤 Read existing user ID: ${userId}`);
        return userId;
      } else {
        console.log('👤 No existing user ID found');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to read user ID:', error);
      return null;
    }
  }

  /**
   * Ensure device and user IDs exist, create if they don't
   */
  async ensureDeviceId() {
    const deviceId = this.readDeviceId();
    const userId = this.readUserId();
    
    if (deviceId && userId) {
      return { deviceId, userId };
    } else {
      console.log('🆔 Creating new device and user IDs...');
      return await this.createDeviceId();
    }
  }

  /**
   * Get complete device information including IDs and system details
   */
  getDeviceInfo() {
    try {
      if (fs.existsSync(this.deviceInfoFile)) {
        const deviceInfo = JSON.parse(fs.readFileSync(this.deviceInfoFile, 'utf8'));
        return deviceInfo;
      } else {
        // Fallback: read individual files if info file doesn't exist
        const deviceId = this.readDeviceId();
        const userId = this.readUserId();
        if (deviceId || userId) {
          return { device_id: deviceId, user_id: userId };
        }
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to read device info:', error);
      return null;
    }
  }

  /**
   * Validate that a device ID is a valid UUID
   */
  validateDeviceId(deviceId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(deviceId);
  }

  /**
   * Validate that a user ID is 5 alphanumeric characters
   */
  validateUserId(userId) {
    const userIdRegex = /^[A-Z0-9]{5}$/;
    return userIdRegex.test(userId);
  }
}

module.exports = DeviceIDManager;