import React, { useState } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import SimpleConnectScreen from './src/screens/SimpleConnectScreen';
import RemoteScreen from './src/screens/RemoteScreen';
import WifiQRScreen from './src/screens/WifiQRScreen';

// Services
import { SmartTVService } from './src/services/SmartTVService';

export default function App() {
  const [connectedTV, setConnectedTV] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('connect'); // 'connect', 'remote', 'wifi-qr'

  const handleTVConnection = async (tvInfo) => {
    console.log('🔗 Attempting to connect to TV:', tvInfo);
    setIsConnecting(true);
    try {
      const connected = await SmartTVService.connect(tvInfo);
      console.log('📱 Connection result:', connected);
      if (connected) {
        console.log('✅ Setting connected TV and switching to remote screen');
        setConnectedTV(tvInfo);
        setCurrentScreen('remote');
      } else {
        console.log('❌ Connection failed, staying on discovery screen');
        alert('Failed to connect to SmartTV. Please try again.');
      }
    } catch (error) {
      console.error('❌ Failed to connect to TV:', error);
      alert('Connection error: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    SmartTVService.disconnect();
    setConnectedTV(null);
    setCurrentScreen('connect');
  };

  const handleShowWifiQR = () => {
    setCurrentScreen('wifi-qr');
  };

  const handleBackToConnect = () => {
    setCurrentScreen('connect');
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />
      
      {connectedTV && currentScreen === 'remote' ? (
        <RemoteScreen 
          tvInfo={connectedTV} 
          onDisconnect={handleDisconnect}
        />
      ) : currentScreen === 'wifi-qr' ? (
        <WifiQRScreen onBack={handleBackToConnect} />
      ) : (
        <SimpleConnectScreen 
          onConnect={handleTVConnection}
          isConnecting={isConnecting}
          onShowWifiQR={handleShowWifiQR}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
});
