import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import RemoteControlService from '../services/RemoteControlService';

const RemoteControlScreen = ({ device, onDisconnect, connectionState }) => {
  const [currentPage, setCurrentPage] = useState('unknown');
  const [appState, setAppState] = useState(null);

  useEffect(() => {
    // Request initial app state
    RemoteControlService.requestAppState();

    // Set up state change handler
    const originalCallback = RemoteControlService.onStateChange;
    RemoteControlService.setStateChangeCallback((type, data) => {
      if (originalCallback) originalCallback(type, data);
      
      if (type === 'app_state' && data) {
        setAppState(data);
        // Extract page name from pathname
        const pageName = data.currentPage?.split('/').pop()?.replace('.html', '') || 'unknown';
        setCurrentPage(pageName);
      } else if (type === 'page_changed') {
        setCurrentPage(data);
      }
    });
  }, []);

  const handleNavigationPress = (page) => {
    RemoteControlService.navigateToPage(page);
  };

  const handleGesturePress = (gesture) => {
    switch (gesture) {
      case 'up':
        RemoteControlService.swipeUp();
        break;
      case 'down':
        RemoteControlService.swipeDown();
        break;
      case 'left':
        RemoteControlService.swipeLeft();
        break;
      case 'right':
        RemoteControlService.swipeRight();
        break;
      case 'center':
        RemoteControlService.tap();
        break;
    }
  };

  const handleKeyPress = (key) => {
    switch (key) {
      case 'enter':
        RemoteControlService.pressEnter();
        break;
      case 'escape':
        RemoteControlService.pressEscape();
        break;
      case 'backspace':
        RemoteControlService.pressBackspace();
        break;
    }
  };

  const handleDisconnectPress = () => {
    Alert.alert(
      'Disconnect',
      `Disconnect from ${device?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: onDisconnect },
      ]
    );
  };

  const NavigationButton = ({ page, title, icon, color = '#4CAF50' }) => (
    <TouchableOpacity
      style={[styles.navButton, { backgroundColor: currentPage === page ? color : '#1a1a2e' }]}
      onPress={() => handleNavigationPress(page)}
    >
      <Text style={styles.navButtonIcon}>{icon}</Text>
      <Text style={styles.navButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  const DirectionalPad = () => (
    <View style={styles.dpadContainer}>
      <TouchableOpacity
        style={[styles.dpadButton, styles.dpadUp]}
        onPress={() => handleGesturePress('up')}
      >
        <Text style={styles.dpadButtonText}>▲</Text>
      </TouchableOpacity>
      
      <View style={styles.dpadMiddle}>
        <TouchableOpacity
          style={[styles.dpadButton, styles.dpadLeft]}
          onPress={() => handleGesturePress('left')}
        >
          <Text style={styles.dpadButtonText}>◀</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.dpadButton, styles.dpadCenter]}
          onPress={() => handleGesturePress('center')}
        >
          <Text style={styles.dpadButtonText}>●</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.dpadButton, styles.dpadRight]}
          onPress={() => handleGesturePress('right')}
        >
          <Text style={styles.dpadButtonText}>▶</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.dpadButton, styles.dpadDown]}
        onPress={() => handleGesturePress('down')}
      >
        <Text style={styles.dpadButtonText}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const ControlButton = ({ title, icon, onPress, color = '#FF5722' }) => (
    <TouchableOpacity
      style={[styles.controlButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.controlButtonIcon}>{icon}</Text>
      <Text style={styles.controlButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device?.name || 'Smart TV'}</Text>
          <Text style={styles.currentPage}>Currently on: {currentPage}</Text>
        </View>
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnectPress}>
          <Text style={styles.disconnectButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {connectionState !== 'connected' && (
        <View style={styles.connectionWarning}>
          <Text style={styles.connectionWarningText}>
            {connectionState === 'disconnected' ? 'Disconnected' : 'Connecting...'}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.navigationGrid}>
          <NavigationButton page="home" title="Home" icon="🏠" />
          <NavigationButton page="video-call" title="Video Call" icon="📹" />
          <NavigationButton page="trivia" title="Trivia" icon="🎯" />
          <NavigationButton page="games" title="Games" icon="🎮" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Remote Control</Text>
        <DirectionalPad />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.controlGrid}>
          <ControlButton
            title="Enter"
            icon="⏎"
            onPress={() => handleKeyPress('enter')}
            color="#4CAF50"
          />
          <ControlButton
            title="Back"
            icon="←"
            onPress={() => handleKeyPress('escape')}
            color="#FF9800"
          />
          <ControlButton
            title="Delete"
            icon="⌫"
            onPress={() => handleKeyPress('backspace')}
            color="#F44336"
          />
        </View>
      </View>

      {appState && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Title: {appState.title}</Text>
            <Text style={styles.statusText}>Page: {appState.currentPage}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  currentPage: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionWarning: {
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  connectionWarningText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navButton: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  navButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dpadContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dpadMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dpadButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a3e',
  },
  dpadUp: {},
  dpadDown: {},
  dpadLeft: {},
  dpadRight: {},
  dpadCenter: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 12,
  },
  dpadButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  controlButton: {
    width: '30%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonIcon: {
    fontSize: 18,
    marginBottom: 4,
    color: '#ffffff',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  statusText: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default RemoteControlScreen;