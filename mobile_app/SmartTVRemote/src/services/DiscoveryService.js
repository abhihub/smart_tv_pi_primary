import Zeroconf from 'react-native-zeroconf';
import NetInfo from '@react-native-community/netinfo';

class DiscoveryService {
  constructor() {
    this.zeroconf = new Zeroconf();
    this.devices = new Map();
    this.onDeviceFound = null;
    this.onDeviceLost = null;
    this.isScanning = false;
    this.autoConnectEnabled = true;
    this.networkState = null;
  }

  async startDiscovery(onDeviceFound, onDeviceLost) {
    this.onDeviceFound = onDeviceFound;
    this.onDeviceLost = onDeviceLost;

    // Check network state first
    this.networkState = await NetInfo.fetch();
    console.log('📶 Network state:', this.networkState);

    if (!this.networkState.isConnected || !this.networkState.details.ipAddress) {
      console.warn('⚠️ Not connected to WiFi network');
      return;
    }

    this.zeroconf.on('start', () => {
      console.log('🔍 mDNS discovery started');
      this.isScanning = true;
    });

    this.zeroconf.on('found', (name) => {
      console.log('📡 Found service:', name);
    });

    this.zeroconf.on('resolved', (service) => {
      console.log('✅ Resolved service:', service);
      
      // Enhanced device detection for SmartTV Pi
      const isSmartTVPi = (
        (service.type === 'smarttv-remote' && service.txt?.device === 'smarttv') ||
        (service.name && service.name.toLowerCase().includes('smarttv')) ||
        (service.txt?.app === 'smarttv') ||
        (service.port === 8080 && service.txt?.type === 'smarttv-pi')
      );
      
      if (isSmartTVPi) {
        const device = {
          name: service.name || 'SmartTV Pi',
          host: service.addresses?.[0] || service.host,
          port: service.port || 8080,
          txt: service.txt,
          fullName: service.fullName,
          type: 'smarttv-pi',
          discovered: Date.now(),
          version: service.txt?.version || '1.0.0',
          features: service.txt?.features ? service.txt.features.split(',') : ['remote', 'video']
        };
        
        this.devices.set(service.name, device);
        
        if (this.onDeviceFound) {
          this.onDeviceFound(device);
          
          // Auto-connect to first discovered Pi if enabled
          if (this.autoConnectEnabled && this.devices.size === 1) {
            console.log('🤖 Auto-connecting to first discovered Pi');
            setTimeout(() => {
              this.triggerAutoConnect(device);
            }, 2000);
          }
        }
      }
    });

    this.zeroconf.on('remove', (name) => {
      console.log('❌ Service removed:', name);
      const device = this.devices.get(name);
      if (device) {
        this.devices.delete(name);
        if (this.onDeviceLost) {
          this.onDeviceLost(device);
        }
      }
    });

    this.zeroconf.on('error', (error) => {
      console.error('❌ Discovery error:', error);
    });

    // Scan for multiple service types to catch different configurations
    this.zeroconf.scan('smarttv-remote', 'tcp', 'local.');
    
    // Also scan for common HTTP services that might be our Pi
    setTimeout(() => {
      this.scanForHttpServices();
    }, 5000);
  }

  stopDiscovery() {
    if (this.isScanning) {
      this.zeroconf.stop();
      this.isScanning = false;
      console.log('🛑 mDNS discovery stopped');
    }
  }

  // Fallback HTTP service discovery for Pi devices
  async scanForHttpServices() {
    if (!this.networkState?.details?.ipAddress) return;
    
    const baseIP = this.networkState.details.ipAddress.split('.').slice(0, 3).join('.');
    console.log('🔍 Scanning local network for SmartTV Pi servers:', baseIP + '.x');
    
    // Common Pi IP ranges and ports to check
    const commonIPs = [];
    for (let i = 1; i < 255; i++) {
      commonIPs.push(`${baseIP}.${i}`);
    }
    
    const ports = [8080, 3000, 3001, 8000];
    
    // Quick ping test for common SmartTV endpoints
    const promises = [];
    for (let ip of commonIPs.slice(0, 50)) { // Limit to first 50 IPs
      for (let port of ports) {
        promises.push(this.checkSmartTVEndpoint(ip, port));
      }
    }
    
    try {
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          this.handleDiscoveredHttpDevice(result.value);
        }
      });
    } catch (error) {
      console.log('HTTP scan completed with some errors');
    }
  }
  
  async checkSmartTVEndpoint(ip, port) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`http://${ip}:${port}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.service === 'smarttv' || data.app === 'smarttv') {
          return { ip, port, data };
        }
      }
    } catch (error) {
      // Ignore connection errors - expected for most IPs
    }
    return null;
  }
  
  handleDiscoveredHttpDevice(result) {
    const { ip, port, data } = result;
    const deviceId = `http-${ip}-${port}`;
    
    if (!this.devices.has(deviceId)) {
      const device = {
        name: data.name || `SmartTV Pi (${ip})`,
        host: ip,
        port: port,
        txt: data,
        fullName: deviceId,
        type: 'smarttv-pi-http',
        discovered: Date.now(),
        version: data.version || '1.0.0',
        features: data.features || ['remote', 'video']
      };
      
      console.log('🌐 Discovered SmartTV Pi via HTTP:', device);
      this.devices.set(deviceId, device);
      
      if (this.onDeviceFound) {
        this.onDeviceFound(device);
      }
    }
  }
  
  triggerAutoConnect(device) {
    if (this.onAutoConnect && this.autoConnectEnabled) {
      console.log('🤖 Triggering auto-connect to:', device.name);
      this.onAutoConnect(device);
    }
  }
  
  setAutoConnectCallback(callback) {
    this.onAutoConnect = callback;
  }
  
  enableAutoConnect(enabled = true) {
    this.autoConnectEnabled = enabled;
    console.log(`🤖 Auto-connect ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  getNetworkInfo() {
    return this.networkState;
  }
  
  getFoundDevices() {
    return Array.from(this.devices.values()).sort((a, b) => b.discovered - a.discovered);
  }
}

export default new DiscoveryService();