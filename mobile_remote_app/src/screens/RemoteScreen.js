import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SmartTVService } from '../services/SmartTVService';
import RemoteButton from '../components/RemoteButton';
import VolumeControl from '../components/VolumeControl';
import AppLauncher from '../components/AppLauncher';

export default function RemoteScreen({ tvInfo, onDisconnect }) {
  const [tvStatus, setTvStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get initial TV status
    loadTVStatus();
    
    // Set up periodic status updates
    const interval = setInterval(loadTVStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTVStatus = async () => {
    try {
      const status = await SmartTVService.getTVStatus();
      setTvStatus(status);
    } catch (error) {
      console.error('❌ Failed to get TV status:', error);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Disconnect from TV?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', onPress: onDisconnect, style: 'destructive' }
      ]
    );
  };

  const vibrateFeedback = () => {
    Vibration.vibrate(50);
  };

  const handleNavigation = (direction) => {
    vibrateFeedback();
    switch (direction) {
      case 'up': SmartTVService.navigateUp(); break;
      case 'down': SmartTVService.navigateDown(); break;
      case 'left': SmartTVService.navigateLeft(); break;
      case 'right': SmartTVService.navigateRight(); break;
    }
  };

  const handleSelect = () => {
    vibrateFeedback();
    SmartTVService.select();
  };

  const handleBack = () => {
    vibrateFeedback();
    SmartTVService.back();
  };

  const handleHome = () => {
    vibrateFeedback();
    SmartTVService.home();
  };

  const handleShutdown = () => {
    Alert.alert(
      'Shutdown TV',
      'Are you sure you want to shutdown the TV?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Shutdown', 
          onPress: () => {
            vibrateFeedback();
            SmartTVService.shutdown();
          }, 
          style: 'destructive' 
        }
      ]
    );
  };

  const handleVolumeChange = (action) => {
    vibrateFeedback();
    switch (action) {
      case 'up': SmartTVService.volumeUp(); break;
      case 'down': SmartTVService.volumeDown(); break;
      case 'mute': SmartTVService.mute(); break;
    }
  };

  const handleAppLaunch = (appName) => {
    vibrateFeedback();
    SmartTVService.launchApp(appName);
  };

  const renderConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>Connected to {tvInfo.name}</Text>
    </View>
  );

  const renderNavigationPad = () => (
    <View style={styles.navigationPad}>
      {/* Up Button */}
      <View style={styles.navRow}>
        <RemoteButton
          onPress={() => handleNavigation('up')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-up" size={24} color="white" />
        </RemoteButton>
      </View>

      {/* Left - Select - Right */}
      <View style={styles.navRow}>
        <RemoteButton
          onPress={() => handleNavigation('left')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </RemoteButton>

        <RemoteButton
          onPress={handleSelect}
          style={[styles.navButton, styles.selectButton]}
        >
          <Text style={styles.selectText}>OK</Text>
        </RemoteButton>

        <RemoteButton
          onPress={() => handleNavigation('right')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={24} color="white" />
        </RemoteButton>
      </View>

      {/* Down Button */}
      <View style={styles.navRow}>
        <RemoteButton
          onPress={() => handleNavigation('down')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-down" size={24} color="white" />
        </RemoteButton>
      </View>
    </View>
  );

  const renderControlButtons = () => (
    <View style={styles.controlButtons}>
      <RemoteButton
        onPress={handleBack}
        style={styles.controlButton}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
        <Text style={styles.controlButtonText}>Back</Text>
      </RemoteButton>

      <RemoteButton
        onPress={handleHome}
        style={styles.controlButton}
      >
        <Ionicons name="home" size={20} color="white" />
        <Text style={styles.controlButtonText}>Home</Text>
      </RemoteButton>

      <RemoteButton
        onPress={handleShutdown}
        style={[styles.controlButton, styles.shutdownButton]}
      >
        <Ionicons name="power" size={20} color="#ff6b6b" />
        <Text style={[styles.controlButtonText, styles.shutdownText]}>Shutdown</Text>
      </RemoteButton>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="tv" size={24} color="#667eea" />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Remote Control</Text>
            {renderConnectionStatus()}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={handleDisconnect}
        >
          <Ionicons name="close" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Launcher */}
        <AppLauncher onAppLaunch={handleAppLaunch} />

        {/* Navigation Pad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          {renderNavigationPad()}
        </View>

        {/* Control Buttons */}
        <View style={styles.section}>
          {renderControlButtons()}
        </View>

        {/* Volume Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume</Text>
          <VolumeControl onVolumeChange={handleVolumeChange} />
        </View>

        {/* TV Status */}
        {tvStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TV Status</Text>
            <View style={styles.statusCard}>
              <Text style={styles.statusInfo}>
                Status: <Text style={styles.statusValue}>{tvStatus.status}</Text>
              </Text>
              {tvStatus.current_app && (
                <Text style={styles.statusInfo}>
                  Current App: <Text style={styles.statusValue}>{tvStatus.current_app}</Text>
                </Text>
              )}
              {tvStatus.volume !== undefined && (
                <Text style={styles.statusInfo}>
                  Volume: <Text style={styles.statusValue}>{tvStatus.volume}%</Text>
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: '#00ff88',
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  disconnectButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  navigationPad: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  selectButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: 'rgba(102, 126, 234, 0.6)',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  selectText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    flexWrap: 'wrap',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 100,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  shutdownButton: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  shutdownText: {
    color: '#ff6b6b',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  statusValue: {
    color: 'white',
    fontWeight: '500',
  },
});