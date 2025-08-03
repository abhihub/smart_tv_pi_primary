import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SimpleConnectScreen({ onConnect, isConnecting, onShowWifiQR }) {
  const [ipAddress, setIpAddress] = useState(''); // Empty IP for user input
  const [port, setPort] = useState('8080'); // Default port

  const handleConnect = () => {
    if (!ipAddress.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    const deviceInfo = {
      id: `${ipAddress}:${port}`,
      name: `SmartTV (${ipAddress})`,
      ip: ipAddress.trim(),
      port: parseInt(port) || 8080,
      status: 'online',
    };

    onConnect(deviceInfo);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="tv" size={48} color="#667eea" />
        <Text style={styles.title}>SmartTV Remote</Text>
        <Text style={styles.subtitle}>Connect to your SmartTV</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>IP Address</Text>
          <TextInput
            style={styles.input}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder="Enter TV IP address"
            placeholderTextColor="#666"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Port</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="8080"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="wifi" size={24} color="white" />
          )}
          <Text style={styles.connectButtonText}>
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.wifiQRButton}
          onPress={onShowWifiQR}
        >
          <Ionicons name="qr-code" size={24} color="#667eea" />
          <Text style={styles.wifiQRButtonText}>
            Generate WiFi QR Code
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📺 How to find your TV's IP:</Text>
        <Text style={styles.instructionsText}>
          1. Look at your SmartTV screen for the IP address
        </Text>
        <Text style={styles.instructionsText}>
          2. Make sure both devices are on the same WiFi network
        </Text>
        <Text style={styles.instructionsText}>
          3. Enter the IP address above and tap Connect
        </Text>
        <Text style={styles.instructionsText}>
          💡 OR use "Generate WiFi QR Code" if you can't find your TV's WiFi QR code
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  form: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  connectButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectButtonDisabled: {
    backgroundColor: '#666',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  wifiQRButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  wifiQRButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructions: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 4,
  },
});