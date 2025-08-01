import * as Network from 'expo-network';

export class NetworkDiscovery {
  // Get device's IP address and subnet
  static async getLocalNetworkInfo() {
    try {
      const ipAddress = await Network.getIpAddressAsync();
      if (!ipAddress) {
        throw new Error('Unable to get IP address');
      }

      // Extract subnet (assuming /24 network)
      const ipParts = ipAddress.split('.');
      const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      
      return {
        deviceIP: ipAddress,
        subnet: subnet,
        networkClass: ipParts[0]
      };
    } catch (error) {
      console.error('❌ Error getting network info:', error);
      throw error;
    }
  }

  // Scan local network for SmartTV devices
  static async scanForSmartTVs(onDeviceFound = null, onProgress = null) {
    try {
      const networkInfo = await this.getLocalNetworkInfo();
      const { subnet } = networkInfo;
      
      console.log(`🔍 Scanning network: ${subnet}.0/24`);
      
      const foundDevices = [];
      const totalIPs = 254; // 1-254
      let scannedIPs = 0;

      // Common SmartTV ports to check
      const portsToScan = [8080, 3000, 5000, 8000];
      
      // Create scan promises for IP range
      const scanPromises = [];
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        
        // Skip our own IP
        if (ip === networkInfo.deviceIP) {
          scannedIPs++;
          if (onProgress) onProgress(scannedIPs, totalIPs);
          continue;
        }
        
        // Scan this IP
        const promise = this.scanIP(ip, portsToScan)
          .then(device => {
            scannedIPs++;
            if (onProgress) onProgress(scannedIPs, totalIPs);
            
            if (device) {
              foundDevices.push(device);
              if (onDeviceFound) onDeviceFound(device);
            }
          })
          .catch(() => {
            scannedIPs++;
            if (onProgress) onProgress(scannedIPs, totalIPs);
          });
          
        scanPromises.push(promise);
      }

      // Wait for all scans to complete
      await Promise.all(scanPromises);
      
      console.log(`✅ Network scan complete. Found ${foundDevices.length} SmartTV devices`);
      return foundDevices;
      
    } catch (error) {
      console.error('❌ Network scan failed:', error);
      throw error;
    }
  }

  // Scan specific IP for SmartTV service
  static async scanIP(ip, ports) {
    for (const port of ports) {
      try {
        const device = await this.checkSmartTVService(ip, port);
        if (device) {
          return device;
        }
      } catch (error) {
        // Continue to next port
      }
    }
    return null;
  }

  // Check if IP:port has SmartTV service
  static async checkSmartTVService(ip, port, timeout = 3000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      console.log(`🔍 Checking SmartTV service at ${ip}:${port}`);
      console.log('🔍 Environment details:', {
        fetchSupport: typeof fetch !== 'undefined',
        networkState: global?.navigator?.onLine,
        platform: global?.Platform?.OS || 'unknown',
        isExpoGo: global?.__DEV__ || false,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch(`http://${ip}:${port}/api/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SmartTV-Remote-Mobile-App',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📡 Response from ${ip}:${port} - Details:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: response.headers,
        type: response.type,
        url: response.url
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📋 Response data from ${ip}:${port}:`, data);
        
        // Check if this is a SmartTV device
        if (data.device_type === 'smarttv' || data.app_name === 'SmartTV') {
          console.log(`✅ Confirmed SmartTV at ${ip}:${port}`);
          return {
            id: `${ip}:${port}`,
            name: data.device_name || `SmartTV (${ip})`,
            ip: ip,
            port: port,
            version: data.version || '1.0.0',
            status: data.status || 'online',
            capabilities: data.capabilities || [],
            lastSeen: Date.now()
          };
        } else {
          console.log(`❌ Not a SmartTV device at ${ip}:${port} - Type: ${data.device_type}`);
        }
      } else {
        console.log(`❌ HTTP error from ${ip}:${port} - Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.log(`❌ Connection failed to ${ip}:${port} - Details:`, {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
    
    return null;
  }

  // Quick discovery using common IPs and mDNS patterns
  static async quickScan() {
    try {
      const networkInfo = await this.getLocalNetworkInfo();
      const { subnet } = networkInfo;
      
      console.log(`⚡ Quick scanning subnet: ${subnet}.x`);
      console.log(`📱 Device IP: ${networkInfo.deviceIP}`);
      
      // Common router/device IPs to check first, plus more ranges
      const commonIPs = [
        // Common ranges
        `${subnet}.1`, `${subnet}.2`, `${subnet}.10`, `${subnet}.11`, `${subnet}.12`,
        `${subnet}.20`, `${subnet}.21`, `${subnet}.22`, `${subnet}.23`, `${subnet}.24`, `${subnet}.25`,
        `${subnet}.50`, `${subnet}.51`, `${subnet}.52`,
        `${subnet}.100`, `${subnet}.101`, `${subnet}.102`,
        `${subnet}.200`, `${subnet}.201`, `${subnet}.202`,
        // Add more specific ranges for university networks
        `${subnet}.30`, `${subnet}.31`, `${subnet}.32`, `${subnet}.33`, `${subnet}.34`, `${subnet}.35`,
        `${subnet}.40`, `${subnet}.41`, `${subnet}.42`, `${subnet}.43`, `${subnet}.44`, `${subnet}.45`,
        `${subnet}.60`, `${subnet}.61`, `${subnet}.62`, `${subnet}.63`, `${subnet}.64`, `${subnet}.65`,
        `${subnet}.70`, `${subnet}.71`, `${subnet}.72`, `${subnet}.73`, `${subnet}.74`, `${subnet}.75`,
      ];
      
      console.log(`⚡ Quick scanning ${commonIPs.length} common IPs...`);
      
      const foundDevices = [];
      const scanPromises = commonIPs.map(async (ip, index) => {
        try {
          console.log(`🔍 [${index + 1}/${commonIPs.length}] Checking ${ip}:8080`);
          const device = await this.scanIP(ip, [8080]);
          if (device) {
            console.log(`✅ Found SmartTV at ${ip}:8080`);
            foundDevices.push(device);
          }
        } catch (error) {
          // Ignore errors in quick scan
          console.log(`❌ No SmartTV at ${ip}:8080`);
        }
      });
      
      await Promise.all(scanPromises);
      
      console.log(`⚡ Quick scan completed. Found ${foundDevices.length} devices`);
      return foundDevices;
      
    } catch (error) {
      console.error('❌ Quick scan failed:', error);
      return [];
    }
  }

  // Save discovered devices to storage
  static async saveDiscoveredDevices(devices) {
    try {
      // In a real app, you'd use AsyncStorage
      // For now, just log
      console.log('💾 Saving discovered devices:', devices.length);
    } catch (error) {
      console.error('❌ Error saving devices:', error);
    }
  }

  // Load previously discovered devices
  static async loadSavedDevices() {
    try {
      // In a real app, you'd use AsyncStorage
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('❌ Error loading saved devices:', error);
      return [];
    }
  }

  // Manual IP test function for debugging
  static async testSpecificIP(ip, port = 8080) {
    console.log(`🧪 Testing specific IP: ${ip}:${port}`);
    try {
      const device = await this.checkSmartTVService(ip, port);
      if (device) {
        console.log(`✅ SUCCESS: Found SmartTV at ${ip}:${port}`, device);
        return device;
      } else {
        console.log(`❌ FAILED: No SmartTV found at ${ip}:${port}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ ERROR testing ${ip}:${port}:`, error);
      return null;
    }
  }
}