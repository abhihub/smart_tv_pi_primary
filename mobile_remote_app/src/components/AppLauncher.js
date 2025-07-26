import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import RemoteButton from './RemoteButton';

const APPS = [
  {
    id: 'home',
    name: 'Home',
    icon: 'home',
    color: '#667eea',
  },
  {
    id: 'video-call',
    name: 'Video Call',
    icon: 'videocam',
    color: '#00ff88',
  },
  {
    id: 'trivia-game',
    name: 'Trivia',
    icon: 'game-controller',
    color: '#fbbf24',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: 'settings',
    color: '#f87171',
  },
  {
    id: 'wifi-settings',
    name: 'WiFi',
    icon: 'wifi',
    color: '#4ade80',
  },
  {
    id: 'qr-test',
    name: 'QR Test',
    icon: 'qr-code',
    color: '#a78bfa',
  },
];

export default function AppLauncher({ onAppLaunch }) {
  const renderApp = (app) => (
    <RemoteButton
      key={app.id}
      onPress={() => onAppLaunch(app.id)}
      style={[styles.appButton, { borderColor: `${app.color}40` }]}
    >
      <View style={[styles.appIcon, { backgroundColor: `${app.color}20` }]}>
        <Ionicons name={app.icon} size={24} color={app.color} />
      </View>
      <Text style={styles.appName}>{app.name}</Text>
    </RemoteButton>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Launch</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.appsContainer}
      >
        {APPS.map(renderApp)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  appsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  appButton: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 12,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});