import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { NetworkDiscovery } from '../utils/NetworkDiscovery';

export default function DiscoveryScreen({ onConnect, isConnecting }) {
  const [scanning, setScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState([]);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Load saved devices and show QR scanner by default
    initializeDiscovery();
    // Auto-open QR scanner on first load
    setTimeout(() => {
      openQRScanner();
    }, 500);
  }, []);

  const initializeDiscovery = async () => {
    try {
      // Get network info
      const netInfo = await NetworkDiscovery.getLocalNetworkInfo();
      setNetworkInfo(netInfo);
      
      // Load previously saved devices
      const savedDevices = await NetworkDiscovery.loadSavedDevices();
      setFoundDevices(savedDevices);
      
      // Start quick scan
      await performQuickScan();
    } catch (error) {
      console.error('❌ Discovery initialization failed:', error);
      Alert.alert('Network Error', 'Unable to access network. Please check WiFi connection.');
    }
  };

  const performQuickScan = async () => {
    try {
      setScanning(true);
      const quickDevices = await NetworkDiscovery.quickScan();
      
      // Merge with existing devices (avoid duplicates)
      setFoundDevices(prevDevices => {
        const merged = [...prevDevices];
        quickDevices.forEach(newDevice => {
          if (!merged.find(d => d.id === newDevice.id)) {
            merged.push(newDevice);
          }
        });
        return merged;
      });
    } catch (error) {
      console.error('❌ Quick scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const performFullScan = async () => {
    try {
      setScanning(true);
      setScanProgress({ current: 0, total: 254 });
      
      const devices = await NetworkDiscovery.scanForSmartTVs(
        // On device found
        (device) => {
          setFoundDevices(prevDevices => {
            if (!prevDevices.find(d => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        },
        // On progress
        (current, total) => {
          setScanProgress({ current, total });
        }
      );
      
      // Save discovered devices
      await NetworkDiscovery.saveDiscoveredDevices(devices);
      
    } catch (error) {
      console.error('❌ Full scan failed:', error);
      Alert.alert('Scan Error', 'Network scan failed. Please try again.');
    } finally {
      setScanning(false);
      setScanProgress({ current: 0, total: 0 });
    }
  };

  const testKnownIP = async () => {
    try {
      setScanning(true);
      console.log('🧪 Testing known laptop IP: 10.81.110.20:8080');
      
      const device = await NetworkDiscovery.testSpecificIP('10.81.110.20', 8080);
      if (device) {
        console.log('✅ Found device at known IP!', device);
        setFoundDevices(prev => {
          if (!prev.find(d => d.id === device.id)) {
            return [...prev, device];
          }
          return prev;
        });
        Alert.alert('Success!', `Found SmartTV at 10.81.110.20:8080`);
      } else {
        Alert.alert('Not Found', 'No SmartTV found at 10.81.110.20:8080. Check if Electron app is running.');
      }
    } catch (error) {
      console.error('❌ Test IP failed:', error);
      Alert.alert('Test Failed', error.message);
    } finally {
      setScanning(false);
    }
  };

  const openQRScanner = async () => {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            'Camera Permission',
            'Camera permission is required to scan QR codes.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => requestPermission() }
            ]
          );
          return;
        }
      }
      setShowQRScanner(true);
    } catch (error) {
      console.error('❌ Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission.');
    }
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
  };

  const handleQRCodeScanned = ({ data }) => {
    console.log('📱 QR Code scanned:', data);
    
    try {
      const connectionData = JSON.parse(data);
      
      if (connectionData.type === 'smarttv_connection') {
        console.log('✅ Valid SmartTV QR code detected:', connectionData);
        
        // Close scanner
        closeQRScanner();
        
        // Create device object from QR data
        const device = {
          id: `${connectionData.ip}:${connectionData.port}`,
          name: connectionData.device_name || `SmartTV (${connectionData.ip})`,
          ip: connectionData.ip,
          port: connectionData.port || 8080,
          version: connectionData.version || '1.0.0',
          status: 'online',
          capabilities: ['navigation', 'volume', 'apps', 'wifi'],
          lastSeen: Date.now(),
          connectedViaQR: true
        };
        
        // Add to found devices if not already present
        setFoundDevices(prevDevices => {
          if (!prevDevices.find(d => d.id === device.id)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
        
        // Auto-connect
        Alert.alert(
          'SmartTV Found!',
          `Found ${device.name} via QR code. Connect now?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Connect', onPress: () => onConnect(device) }
          ]
        );
      } else {
        Alert.alert('Invalid QR Code', 'This is not a SmartTV connection QR code.');
      }
    } catch (error) {
      console.error('❌ Error parsing QR code:', error);
      Alert.alert('Invalid QR Code', 'Unable to parse QR code data.');
    }
  };

  const handleDeviceConnect = (device) => {
    Alert.alert(
      'Connect to TV',
      `Connect to ${device.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => onConnect(device) }
      ]
    );
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => handleDeviceConnect(item)}
      disabled={isConnecting}
    >
      <View style={styles.deviceIcon}>
        <Ionicons name="tv" size={32} color="#667eea" />
      </View>
      
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceDetails}>{item.ip}:{item.port}</Text>
        <Text style={styles.deviceStatus}>
          Status: <Text style={styles.statusOnline}>{item.status}</Text>
        </Text>
      </View>
      
      <View style={styles.connectButton}>
        <Ionicons name="chevron-forward" size={24} color="#667eea" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="qr-code" size={64} color="#667eea" />
      <Text style={styles.emptyTitle}>Connect to SmartTV</Text>
      <Text style={styles.emptySubtitle}>
        Scan the QR code displayed on your SmartTV to connect
      </Text>
      <TouchableOpacity
        style={[styles.scanButton, styles.qrButton]}
        onPress={openQRScanner}
        disabled={scanning}
      >
        <Text style={styles.qrButtonText}>📱 Scan QR Code</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.scanButton}
        onPress={performFullScan}
        disabled={scanning}
      >
        <Text style={styles.scanButtonText}>🔍 Scan Network</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="tv" size={28} color="#667eea" />
          <Text style={styles.headerTitle}>SmartTV Remote</Text>
        </View>
        
        {networkInfo && (
          <Text style={styles.networkInfo}>
            Network: {networkInfo.subnet}.0/24
          </Text>
        )}
      </View>

      {scanning && (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="small" color="#667eea" />
          <Text style={styles.scanningText}>
            {scanProgress.total > 0 
              ? `Scanning... ${scanProgress.current}/${scanProgress.total}`
              : 'Scanning for devices...'
            }
          </Text>
        </View>
      )}

      <FlatList
        data={foundDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        style={styles.deviceList}
        contentContainerStyle={foundDevices.length === 0 ? styles.emptyContainer : null}
        ListEmptyComponent={!scanning ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={performQuickScan}
            tintColor="#667eea"
          />
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.quickScanButton]}
          onPress={performQuickScan}
          disabled={scanning}
        >
          <Ionicons name="flash" size={20} color="#00ff88" />
          <Text style={styles.quickScanText}>Quick Scan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.testButton]}
          onPress={testKnownIP}
          disabled={scanning}
        >
          <Ionicons name="bug" size={20} color="#fbbf24" />
          <Text style={styles.testText}>Test IP</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.fullScanButton]}
          onPress={performFullScan}
          disabled={scanning}
        >
          <Ionicons name="search" size={20} color="#667eea" />
          <Text style={styles.fullScanText}>Full Scan</Text>
        </TouchableOpacity>
      </View>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.qrModalContainer}>
          <SafeAreaView style={styles.qrModalContent}>
            <View style={styles.qrHeader}>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={closeQRScanner}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.qrTitle}>Scan SmartTV QR Code</Text>
              <View style={styles.qrHeaderSpacer} />
            </View>

            {!permission ? (
              <View style={styles.qrPermissionContainer}>
                <Text style={styles.qrPermissionText}>Requesting camera permission...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.qrPermissionContainer}>
                <Ionicons name="camera-off" size={64} color="#ff6b6b" />
                <Text style={styles.qrPermissionText}>Camera permission denied</Text>
                <TouchableOpacity
                  style={styles.qrPermissionButton}
                  onPress={() => requestPermission()}
                >
                  <Text style={styles.qrPermissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.qrCameraContainer}>
                <CameraView
                  style={styles.qrCamera}
                  facing="back"
                  onBarcodeScanned={handleQRCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                >
                  <View style={styles.qrOverlay}>
                    <View style={styles.qrFrame}>
                      <View style={styles.qrCorner} />
                      <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
                      <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
                      <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
                    </View>
                  </View>
                </CameraView>
                
                <View style={styles.qrInstructions}>
                  <Text style={styles.qrInstructionText}>
                    Point your camera at the QR code displayed on your SmartTV
                  </Text>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  networkInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 40,
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 126, 234, 0.2)',
  },
  scanningText: {
    color: '#667eea',
    marginLeft: 12,
    fontSize: 14,
  },
  deviceList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 12,
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statusOnline: {
    color: '#00ff88',
  },
  connectButton: {
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickScanButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  quickScanText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScanButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  fullScanText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  testText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '600',
  },
  qrButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderColor: 'rgba(102, 126, 234, 0.6)',
    marginTop: 12,
  },
  qrButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  // QR Scanner Modal Styles
  qrModalContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  qrModalContent: {
    flex: 1,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  qrCloseButton: {
    padding: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  qrHeaderSpacer: {
    width: 40,
  },
  qrPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  qrPermissionText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginVertical: 20,
  },
  qrPermissionButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  qrPermissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrCameraContainer: {
    flex: 1,
  },
  qrCamera: {
    flex: 1,
  },
  qrOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  qrCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff88',
    borderWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  qrCornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  qrCornerBottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 0,
  },
  qrCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  qrInstructions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  qrInstructionText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 10,
  },
});