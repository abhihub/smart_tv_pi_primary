import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DiscoveryService from '../services/DiscoveryService';

const DiscoveryScreen = ({ onDeviceConnect, connectionState }) => {
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Set up auto-connect callback
    DiscoveryService.setAutoConnectCallback((device) => {
      console.log('🤖 Auto-connecting to discovered Pi:', device.name);
      handleDevicePress(device);
    });
    
    startDiscovery();
    return () => {
      DiscoveryService.stopDiscovery();
    };
  }, []);

  const startDiscovery = async () => {
    setIsScanning(true);
    setDevices([]);
    
    await DiscoveryService.startDiscovery(
      (device) => {
        setDevices(prevDevices => {
          const existingIndex = prevDevices.findIndex(d => d.name === device.name || d.fullName === device.fullName);
          if (existingIndex >= 0) {
            const updated = [...prevDevices];
            updated[existingIndex] = device;
            return updated;
          }
          return [...prevDevices, device];
        });
      },
      (device) => {
        setDevices(prevDevices => 
          prevDevices.filter(d => d.name !== device.name && d.fullName !== device.fullName)
        );
      }
    );

    // Stop scanning after 45 seconds (extended for HTTP scan)
    setTimeout(() => {
      setIsScanning(false);
    }, 45000);
  };

  const handleDevicePress = async (device) => {
    try {
      await onDeviceConnect(device);
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        `Failed to connect to ${device.name}: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleDevicePress(item)}
      disabled={connectionState === 'connecting'}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceDetails}>
          {item.host}:{item.port}
        </Text>
        <Text style={styles.deviceVersion}>
          Version: {item.version || item.txt?.version || 'Unknown'}
        </Text>
        {item.features && (
          <Text style={styles.deviceFeatures}>
            Features: {Array.isArray(item.features) ? item.features.join(', ') : item.features}
          </Text>
        )}
        <Text style={styles.deviceType}>
          {item.type === 'smarttv-pi' ? '📡 mDNS' : '🌐 HTTP'}
        </Text>
      </View>
      <View style={styles.deviceStatus}>
        <View style={styles.statusIndicator} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {isScanning ? (
        <>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.emptyText}>Searching for Smart TVs...</Text>
          <Text style={styles.emptySubtext}>
            Make sure your Smart TV is on the same WiFi network
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyText}>No Smart TVs Found</Text>
          <Text style={styles.emptySubtext}>
            Make sure your Smart TV is running and connected to WiFi
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={startDiscovery}>
            <Text style={styles.retryButtonText}>Retry Scan</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart TV Remote</Text>
        <Text style={styles.subtitle}>
          {isScanning ? 'Scanning WiFi network...' : `Found ${devices.length} SmartTV Pi(s)`}
        </Text>
        {!isScanning && devices.length === 0 && (
          <Text style={styles.helpText}>
            Make sure SmartTV Pi completed WiFi setup
          </Text>
        )}
      </View>

      {devices.length > 0 ? (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.name}
          renderItem={renderDevice}
          style={styles.deviceList}
          contentContainerStyle={styles.deviceListContent}
        />
      ) : (
        renderEmptyState()
      )}

      {connectionState === 'connecting' && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={startDiscovery}
        disabled={isScanning || connectionState === 'connecting'}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Scan Again'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingBottom: 100,
  },
  deviceItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 2,
  },
  deviceVersion: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 2,
  },
  deviceFeatures: {
    fontSize: 10,
    color: '#a0a0a0',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 10,
    color: '#FF9800',
  },
  helpText: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 5,
  },
  deviceStatus: {
    marginLeft: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },
});

export default DiscoveryScreen;