import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Network from 'expo-network';

export default function WifiQRScreen({ onBack }) {
  const [networks, setNetworks] = useState([]);
  const [selectedSSID, setSelectedSSID] = useState('');
  const [password, setPassword] = useState('');
  const [security, setSecurity] = useState('WPA');
  const [qrData, setQRData] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [manualSSID, setManualSSID] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    loadAvailableNetworks();
  }, []);

  const loadAvailableNetworks = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected && networkState.type === Network.NetworkStateType.WIFI) {
        setNetworks([{
          ssid: 'Current Network',
          description: 'Currently connected WiFi'
        }]);
      }
    } catch (error) {
      console.log('Error loading networks:', error);
    }
  };

  const generateWifiQR = () => {
    if (!selectedSSID && !manualSSID) {
      Alert.alert('Error', 'Please select a network or enter an SSID');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter the WiFi password');
      return;
    }

    const ssid = selectedSSID || manualSSID;
    const wifiString = `WIFI:T:${security};S:${ssid};P:${password};H:false;;`;
    
    setQRData(wifiString);
    setShowQR(true);
  };

  const resetForm = () => {
    setSelectedSSID('');
    setManualSSID('');
    setPassword('');
    setQRData('');
    setShowQR(false);
    setShowManualInput(false);
  };

  const NetworkSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Network</Text>
      
      <TouchableOpacity
        style={[styles.networkOption, showManualInput && styles.networkOptionSelected]}
        onPress={() => {
          setShowManualInput(!showManualInput);
          setSelectedSSID('');
        }}
      >
        <Ionicons name="create-outline" size={24} color="#667eea" />
        <Text style={styles.networkText}>Enter SSID Manually</Text>
        <Ionicons 
          name={showManualInput ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#667eea" 
        />
      </TouchableOpacity>

      {showManualInput && (
        <TextInput
          style={styles.input}
          value={manualSSID}
          onChangeText={setManualSSID}
          placeholder="Enter network name (SSID)"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {networks.map((network, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.networkOption,
            selectedSSID === network.ssid && styles.networkOptionSelected
          ]}
          onPress={() => {
            setSelectedSSID(network.ssid);
            setShowManualInput(false);
            setManualSSID('');
          }}
        >
          <Ionicons name="wifi" size={24} color="#667eea" />
          <View style={styles.networkInfo}>
            <Text style={styles.networkText}>{network.ssid}</Text>
            <Text style={styles.networkDescription}>{network.description}</Text>
          </View>
          {selectedSSID === network.ssid && (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const QRModal = () => (
    <Modal
      visible={showQR}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowQR(false)}>
            <Ionicons name="close" size={28} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>WiFi QR Code</Text>
          <TouchableOpacity onPress={resetForm}>
            <Ionicons name="refresh" size={28} color="#667eea" />
          </TouchableOpacity>
        </View>

        <View style={styles.qrContainer}>
          <Text style={styles.qrInstructions}>
            Point your TV camera at this QR code to connect to WiFi
          </Text>
          
          <View style={styles.qrCodeWrapper}>
            {qrData ? (
              <QRCode
                value={qrData}
                size={250}
                backgroundColor="white"
                color="black"
              />
            ) : null}
          </View>

          <View style={styles.networkDetails}>
            <Text style={styles.detailLabel}>Network:</Text>
            <Text style={styles.detailValue}>{selectedSSID || manualSSID}</Text>
            <Text style={styles.detailLabel}>Security:</Text>
            <Text style={styles.detailValue}>{security}</Text>
          </View>

          <TouchableOpacity
            style={styles.generateNewButton}
            onPress={() => setShowQR(false)}
          >
            <Ionicons name="create" size={20} color="white" />
            <Text style={styles.generateNewButtonText}>Generate New QR Code</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="qr-code" size={48} color="#667eea" />
            <Text style={styles.title}>WiFi QR Generator</Text>
            <Text style={styles.subtitle}>Generate QR code for WiFi connection</Text>
          </View>
        </View>

        <NetworkSelector />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WiFi Password</Text>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter WiFi password"
            placeholderTextColor="#666"
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Type</Text>
          <View style={styles.securityOptions}>
            {['WPA', 'WEP', 'nopass'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.securityOption,
                  security === type && styles.securityOptionSelected
                ]}
                onPress={() => setSecurity(type)}
              >
                <Text style={[
                  styles.securityText,
                  security === type && styles.securityTextSelected
                ]}>
                  {type === 'nopass' ? 'Open' : type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateWifiQR}
        >
          <Ionicons name="qr-code" size={24} color="white" />
          <Text style={styles.generateButtonText}>Generate QR Code</Text>
        </TouchableOpacity>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>📱 How to use:</Text>
          <Text style={styles.instructionsText}>
            1. Select your WiFi network or enter SSID manually
          </Text>
          <Text style={styles.instructionsText}>
            2. Enter the WiFi password
          </Text>
          <Text style={styles.instructionsText}>
            3. Choose the correct security type
          </Text>
          <Text style={styles.instructionsText}>
            4. Generate and show the QR code to your TV camera
          </Text>
        </View>
      </ScrollView>

      <QRModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  networkOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  networkOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
  },
  networkInfo: {
    flex: 1,
    marginLeft: 12,
  },
  networkText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  networkDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
  },
  passwordInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  securityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  securityOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  securityOptionSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  securityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  securityTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructions: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    marginBottom: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  qrInstructions: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  networkDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    marginBottom: 12,
  },
  generateNewButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateNewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});