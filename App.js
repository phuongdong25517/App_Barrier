import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';
import { BluetoothProvider, useBluetooth } from './src/context/BluetoothContext';
import { Colors } from './src/theme';
import DashScreen from './src/screens/DashScreen';
import SettingScreen from './src/screens/SettingScreen';
import OtaScreen from './src/screens/OtaScreen';
import AppSettingScreen from './src/screens/AppSettingScreen';
import BluetoothModal from './src/components/BluetoothModal';

const TABS = [
  { id: 0, label: 'DASH', icon: '◉' },
  { id: 1, label: 'SETTINGS', icon: '⚙' },
  { id: 2, label: 'OTA', icon: '↑' },
  { id: 3, label: 'APP', icon: '☰' },
];

function Header({ onConnectPress }) {
  const { connected, connectedDevice } = useBluetooth();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>BARRIER</Text>
        <Text style={styles.headerSub}>HC-05 CONTROLLER</Text>
      </View>
      <TouchableOpacity
        style={[styles.connectBtn, connected && styles.connectBtnActive]}
        onPress={onConnectPress}
      >
        <View style={[styles.dot, connected && styles.dotActive]} />
        <Text style={[styles.connectText, connected && styles.connectTextActive]}>
          {connected ? (connectedDevice?.name || 'CONNECTED') : 'CONNECT'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [showBt, setShowBt] = useState(false);
  const { connected, disconnectDevice } = useBluetooth();

  const handleConnectPress = () => {
    if (connected) {
      disconnectDevice();
    } else {
      setShowBt(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.surface} />
      <Header onConnectPress={handleConnectPress} />

      <View style={styles.screenContainer}>
        {activeTab === 0 && <DashScreen />}
        {activeTab === 1 && <SettingScreen />}
        {activeTab === 2 && <OtaScreen />}
        {activeTab === 3 && <AppSettingScreen />}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navbar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.navItem, activeTab === tab.id && styles.navItemActive]}
          >
            <Text style={[styles.navIcon, activeTab === tab.id && styles.navIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <BluetoothModal visible={showBt} onClose={() => setShowBt(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <BluetoothProvider>
      <AppContent />
    </BluetoothProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: { gap: 2 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  headerSub: { fontSize: 8, color: Colors.muted, fontFamily: 'monospace', letterSpacing: 1 },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.muted}18`,
    borderWidth: 1.5,
    borderColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  connectBtnActive: {
    backgroundColor: `${Colors.green}18`,
    borderColor: Colors.green,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.muted },
  dotActive: { backgroundColor: Colors.green },
  connectText: { fontSize: 11, color: Colors.muted, fontWeight: '700', letterSpacing: 1 },
  connectTextActive: { color: Colors.green },
  screenContainer: { flex: 1 },
  navbar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingTop: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    gap: 3,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  navItemActive: { borderTopColor: Colors.accent },
  navIcon: { fontSize: 18, color: Colors.muted },
  navIconActive: { color: Colors.accent },
  navLabel: { fontSize: 8, color: Colors.muted, fontWeight: '700', letterSpacing: 1 },
  navLabelActive: { color: Colors.accent },
});
