import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  SafeAreaView,
  Alert,
} from 'react-native';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import RemoteControlScreen from './src/screens/RemoteControlScreen';
import DiscoveryService from './src/services/DiscoveryService';
import RemoteControlService from './src/services/RemoteControlService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentScreen, setCurrentScreen] = useState('discovery');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');

  useEffect(() => {
    // Set up remote control service state change handler
    RemoteControlService.setStateChangeCallback((type, data) => {
      switch (type) {
        case 'connected':
          setConnectionState('connected');
          setCurrentScreen('remote');
          console.log('✅ Connected to SmartTV Pi - switching to remote control');
          break;
        case 'disconnected':
        case 'error':
          console.log('📱 Disconnected from SmartTV Pi - returning to discovery');
          setConnectionState('disconnected');
          setConnectedDevice(null);
          setCurrentScreen('discovery');
          break;
        case 'app_state':
        case 'page_changed':
          // Handle app state changes if needed
          break;
      }
    });

    return () => {
      DiscoveryService.stopDiscovery();
      RemoteControlService.disconnect();
    };
  }, []);

  const handleDeviceConnect = async (device) => {
    try {
      setConnectionState('connecting');
      console.log('📱 Attempting to connect to:', device.name, device.host + ':' + device.port);
      
      await RemoteControlService.connect(device);
      setConnectedDevice(device);
      
      console.log('✅ Successfully connected to SmartTV Pi');
    } catch (error) {
      console.error('❌ Failed to connect to device:', error);
      setConnectionState('disconnected');
      
      // Show error alert for manual connections (not auto-connect)
      if (currentScreen === 'discovery') {
        Alert.alert(
          'Connection Failed',
          `Could not connect to ${device.name}. Make sure the SmartTV Pi is running and on the same WiFi network.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleDisconnect = () => {
    RemoteControlService.disconnect();
    setCurrentScreen('discovery');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'discovery':
        return (
          <DiscoveryScreen
            onDeviceConnect={handleDeviceConnect}
            connectionState={connectionState}
          />
        );
      case 'remote':
        return (
          <RemoteControlScreen
            device={connectedDevice}
            onDisconnect={handleDisconnect}
            connectionState={connectionState}
          />
        );
      default:
        return (
          <DiscoveryScreen
            onDeviceConnect={handleDeviceConnect}
            connectionState={connectionState}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
});

export default App;
