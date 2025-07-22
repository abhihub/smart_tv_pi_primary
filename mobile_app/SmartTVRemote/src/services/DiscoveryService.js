import Zeroconf from 'react-native-zeroconf';

class DiscoveryService {
  constructor() {
    this.zeroconf = new Zeroconf();
    this.devices = new Map();
    this.onDeviceFound = null;
    this.onDeviceLost = null;
    this.isScanning = false;
  }

  startDiscovery(onDeviceFound, onDeviceLost) {
    this.onDeviceFound = onDeviceFound;
    this.onDeviceLost = onDeviceLost;

    this.zeroconf.on('start', () => {
      console.log('🔍 mDNS discovery started');
      this.isScanning = true;
    });

    this.zeroconf.on('found', (name) => {
      console.log('📡 Found service:', name);
    });

    this.zeroconf.on('resolved', (service) => {
      console.log('✅ Resolved service:', service);
      
      if (service.type === 'smarttv-remote' && service.txt?.device === 'smarttv') {
        const device = {
          name: service.name,
          host: service.addresses?.[0] || service.host,
          port: service.port,
          txt: service.txt,
          fullName: service.fullName
        };
        
        this.devices.set(service.name, device);
        
        if (this.onDeviceFound) {
          this.onDeviceFound(device);
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

    this.zeroconf.scan('smarttv-remote', 'tcp', 'local.');
  }

  stopDiscovery() {
    if (this.isScanning) {
      this.zeroconf.stop();
      this.isScanning = false;
      console.log('🛑 mDNS discovery stopped');
    }
  }

  getFoundDevices() {
    return Array.from(this.devices.values());
  }
}

export default new DiscoveryService();