import React, { useState } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import SimpleConnectScreen from './src/screens/SimpleConnectScreen';
import RemoteScreen from './src/screens/RemoteScreen';

// Services
import { SmartTVService } from './src/services/SmartTVService';

export default function App() {
  const [connectedTV, setConnectedTV] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleTVConnection = async (tvInfo) => {
    console.log('🔗 Attempting to connect to TV:', tvInfo);
    setIsConnecting(true);
    try {
      const connected = await SmartTVService.connect(tvInfo);
      console.log('📱 Connection result:', connected);
      if (connected) {
        console.log('✅ Setting connected TV and switching to remote screen');
        setConnectedTV(tvInfo);
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
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />
      
      {connectedTV ? (
        <RemoteScreen 
          tvInfo={connectedTV} 
          onDisconnect={handleDisconnect}
        />
      ) : (
        <SimpleConnectScreen 
          onConnect={handleTVConnection}
          isConnecting={isConnecting}
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
