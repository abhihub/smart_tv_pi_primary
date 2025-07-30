import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import RemoteButton from './RemoteButton';

export default function VolumeControl({ onVolumeChange }) {
  return (
    <View style={styles.container}>
      <RemoteButton
        onPress={() => onVolumeChange('up')}
        style={styles.volumeButton}
      >
        <Ionicons name="volume-high" size={24} color="white" />
        <Text style={styles.volumeText}>Volume +</Text>
      </RemoteButton>

      <RemoteButton
        onPress={() => onVolumeChange('mute')}
        style={[styles.volumeButton, styles.muteButton]}
      >
        <Ionicons name="volume-mute" size={24} color="white" />
        <Text style={styles.volumeText}>Mute</Text>
      </RemoteButton>

      <RemoteButton
        onPress={() => onVolumeChange('down')}
        style={styles.volumeButton}
      >
        <Ionicons name="volume-low" size={24} color="white" />
        <Text style={styles.volumeText}>Volume -</Text>
      </RemoteButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  volumeButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  volumeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});