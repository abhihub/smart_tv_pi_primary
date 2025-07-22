import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Vibration,
} from 'react-native';
import RemoteControlService from '../services/RemoteControlService';

const { width, height } = Dimensions.get('window');

const RemoteControlScreen = ({ device, onDisconnect, connectionState }) => {
  const [currentApp, setCurrentApp] = useState('homepage');
  const [videoCallData, setVideoCallData] = useState({});
  const [textInputModal, setTextInputModal] = useState({
    visible: false,
    field: '',
    placeholder: '',
    currentValue: '',
    mode: 'general'
  });
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    // Set up message handlers
    RemoteControlService.setStateChangeCallback((type, data) => {
      switch (type) {
        case 'app_state_change':
          setCurrentApp(data.currentApp);
          break;
        case 'video_call_update':
          setVideoCallData(data);
          break;
        case 'show_text_input':
          setTextInputModal({
            visible: true,
            field: data.field,
            placeholder: data.placeholder,
            currentValue: data.currentValue,
            mode: data.mode
          });
          setInputText(data.currentValue || '');
          break;
        case 'disconnected':
        case 'error':
          onDisconnect();
          break;
      }
    });

    // Request current app state
    RemoteControlService.requestAppState();

    return () => {
      // Cleanup
    };
  }, []);

  // Haptic feedback for button presses
  const hapticFeedback = () => {
    Vibration.vibrate(50);
  };

  // Navigation button handlers
  const handleNavigation = (direction) => {
    hapticFeedback();
    switch (direction) {
      case 'up':
        RemoteControlService.navigateUp();
        break;
      case 'down':
        RemoteControlService.navigateDown();
        break;
      case 'left':
        RemoteControlService.navigateLeft();
        break;
      case 'right':
        RemoteControlService.navigateRight();
        break;
    }
  };

  const handleSelect = () => {
    hapticFeedback();
    RemoteControlService.selectAction();
  };

  const handleBack = () => {
    hapticFeedback();
    RemoteControlService.backAction();
  };

  // App launch handlers
  const handleAppLaunch = (app) => {
    hapticFeedback();
    RemoteControlService.launchApp(app);
  };

  // Video call handlers
  const handleVideoCall = (action) => {
    hapticFeedback();
    switch (action) {
      case 'connect':
        RemoteControlService.videoCallConnect();
        break;
      case 'mute':
        RemoteControlService.videoCallToggleMute();
        break;
      case 'video':
        RemoteControlService.videoCallToggleVideo();
        break;
      case 'end':
        RemoteControlService.videoCallEndCall();
        break;
    }
  };

  // Text input handlers
  const handleTextInputSubmit = () => {
    RemoteControlService.sendTextInput(textInputModal.field, inputText);
    setTextInputModal({ ...textInputModal, visible: false });
    setInputText('');
  };

  const handleTextInputCancel = () => {
    setTextInputModal({ ...textInputModal, visible: false });
    setInputText('');
  };

  // Render TV Remote Layout
  const renderRemoteControl = () => (
    <View style={styles.remoteContainer}>
      {/* Device Status */}
      <View style={styles.deviceStatus}>
        <View style={styles.connectionIndicator} />
        <Text style={styles.deviceName}>{device?.name}</Text>
        <Text style={styles.currentApp}>{currentApp}</Text>
      </View>

      {/* D-Pad Navigation */}
      <View style={styles.dpadContainer}>
        {/* Up Button */}
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonUp]}
          onPress={() => handleNavigation('up')}
        >
          <Text style={styles.navButtonText}>▲</Text>
        </TouchableOpacity>

        {/* Left, Center, Right Row */}
        <View style={styles.dpadMiddleRow}>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={() => handleNavigation('left')}
          >
            <Text style={styles.navButtonText}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectButton]}
            onPress={handleSelect}
          >
            <Text style={styles.selectButtonText}>OK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={() => handleNavigation('right')}
          >
            <Text style={styles.navButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Down Button */}
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonDown]}
          onPress={() => handleNavigation('down')}
        >
          <Text style={styles.navButtonText}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Control Buttons Row */}
      <View style={styles.controlButtonsRow}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleBack}
        >
          <Text style={styles.controlButtonText}>BACK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => handleAppLaunch('homepage')}
        >
          <Text style={styles.controlButtonText}>HOME</Text>
        </TouchableOpacity>
      </View>

      {/* App Launch Buttons */}
      <View style={styles.appButtonsContainer}>
        <Text style={styles.sectionTitle}>Quick Launch</Text>
        <View style={styles.appButtonsRow}>
          <TouchableOpacity
            style={styles.appButton}
            onPress={() => handleAppLaunch('video-call')}
          >
            <Text style={styles.appButtonText}>📞</Text>
            <Text style={styles.appButtonLabel}>Video Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.appButton}
            onPress={() => handleAppLaunch('trivia-game')}
          >
            <Text style={styles.appButtonText}>🎮</Text>
            <Text style={styles.appButtonLabel}>Trivia</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.appButton}
            onPress={() => handleAppLaunch('gamepage')}
          >
            <Text style={styles.appButtonText}>🕹️</Text>
            <Text style={styles.appButtonLabel}>Games</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Call Controls (when in call) */}
      {currentApp === 'video-call' && (
        <View style={styles.videoCallControls}>
          <Text style={styles.sectionTitle}>Call Controls</Text>
          <View style={styles.callButtonsRow}>
            <TouchableOpacity
              style={[styles.callButton, videoCallData.isMuted && styles.callButtonActive]}
              onPress={() => handleVideoCall('mute')}
            >
              <Text style={styles.callButtonText}>{videoCallData.isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, !videoCallData.isVideoOn && styles.callButtonActive]}
              onPress={() => handleVideoCall('video')}
            >
              <Text style={styles.callButtonText}>{videoCallData.isVideoOn ? '📹' : '📷'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, styles.endCallButton]}
              onPress={() => handleVideoCall('end')}
            >
              <Text style={styles.callButtonText}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Disconnect Button */}
      <TouchableOpacity
        style={styles.disconnectButton}
        onPress={onDisconnect}
      >
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );

  // Text Input Modal
  const renderTextInputModal = () => (
    <Modal
      visible={textInputModal.visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {textInputModal.mode === 'username' ? 'Enter Your Name' :
             textInputModal.mode === 'roomname' ? 'Enter Room Name' :
             'Enter Text'}
          </Text>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={textInputModal.placeholder}
            placeholderTextColor="#a0a0a0"
            autoFocus={true}
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={handleTextInputSubmit}
          />
          
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleTextInputCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleTextInputSubmit}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />
      {renderRemoteControl()}
      {renderTextInputModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  remoteContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  deviceStatus: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    marginBottom: 30,
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  currentApp: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  dpadContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  navButtonUp: {
    marginBottom: 10,
  },
  navButtonDown: {
    marginTop: 10,
  },
  navButtonLeft: {
    marginRight: 10,
  },
  navButtonRight: {
    marginLeft: 10,
  },
  navButtonText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  selectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  controlButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    minWidth: 80,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  appButtonsContainer: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  appButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  appButton: {
    backgroundColor: '#1a1a2e',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  appButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  appButtonLabel: {
    color: '#a0a0a0',
    fontSize: 8,
    textAlign: 'center',
  },
  videoCallControls: {
    marginVertical: 20,
  },
  callButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  callButton: {
    backgroundColor: '#1a1a2e',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  callButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  endCallButton: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  callButtonText: {
    fontSize: 24,
  },
  disconnectButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  disconnectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    width: width - 40,
    maxWidth: 400,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#2a2a3e',
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#2a2a3e',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#a0a0a0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RemoteControlScreen;