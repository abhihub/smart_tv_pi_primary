import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  SafeAreaView,
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
          break;
        case 'disconnected':
        case 'error':
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
      await RemoteControlService.connect(device);
      setConnectedDevice(device);
    } catch (error) {
      console.error('Failed to connect to device:', error);
      setConnectionState('disconnected');
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
