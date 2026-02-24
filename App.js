import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Image } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { BluetoothProvider, useBluetooth } from './src/context/BluetoothContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import DashScreen from './src/screens/DashScreen';
import SettingScreen from './src/screens/SettingScreen';
import OtaScreen from './src/screens/OtaScreen';
import AppSettingScreen from './src/screens/AppSettingScreen';
import BluetoothModal from './src/components/BluetoothModal';

const TABS = [
  { id: 0, labelKey: 'DASH', icon: '◉' },
  { id: 1, labelKey: 'SET', icon: '⚙' },
  { id: 2, labelKey: 'OTA', icon: '↑' },
  { id: 3, labelKey: 'APP', image: require('./assets/icons/icon_app.png') },
];

function Header({ onConnectPress }) {
  const { Colors } = useTheme();
  const { t } = useLanguage();
  const { connected, connectedDevice, inforData } = useBluetooth();
  return (
    <View style={[styles.header, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, { color: Colors.accent }]}>{t.appName}</Text>
        {/* Firmware version thay cho "GEN2 MAINBOARD" */}
        <Text style={[styles.headerSub, { color: Colors.muted }]}>
          FW: {inforData?.firmware || '--'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.connectBtn, {
          backgroundColor: connected ? `${Colors.green}18` : `${Colors.muted}18`,
          borderColor: connected ? Colors.green : Colors.muted,
        }]}
        onPress={onConnectPress}
      >
        <View style={[styles.dot, {
          backgroundColor: connected ? Colors.green : Colors.muted,
          shadowColor: connected ? Colors.green : 'transparent',
          shadowOpacity: connected ? 1 : 0, shadowRadius: 4,
        }]} />
        <Text style={[styles.connectText, { color: connected ? Colors.green : Colors.muted }]}>
          {connected ? (connectedDevice?.name || t.connected) : t.connect}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [showBt, setShowBt] = useState(false);
  const { Colors, isDark } = useTheme();
  const { connected, disconnectDevice } = useBluetooth();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: Colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={Colors.surface} />
      <Header onConnectPress={() => connected ? disconnectDevice() : setShowBt(true)} />

      <View style={styles.screenContainer}>
        {activeTab === 0 && <DashScreen />}
        {activeTab === 1 && <SettingScreen />}
        {activeTab === 2 && <OtaScreen />}
        {activeTab === 3 && <AppSettingScreen />}
      </View>

      <View style={[styles.navbar, { backgroundColor: Colors.surface, borderTopColor: Colors.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.navItem, { borderTopColor: activeTab === tab.id ? Colors.accent : 'transparent' }]}
          >
            {tab.image
              ? <Image source={tab.image} style={[styles.navImage, { tintColor: activeTab === tab.id ? Colors.accent : Colors.muted }]} />
              : <Text style={[styles.navIcon, { color: activeTab === tab.id ? Colors.accent : Colors.muted }]}>{tab.icon}</Text>
            }
            <Text style={[styles.navLabel, { color: activeTab === tab.id ? Colors.accent : Colors.muted }]}>{tab.labelKey}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <BluetoothModal visible={showBt} onClose={() => setShowBt(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <BluetoothProvider>
          <AppContent />
        </BluetoothProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  headerLeft: { gap: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace' },
  headerSub: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  connectText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  screenContainer: { flex: 1 },
  navbar: { borderTopWidth: 1, flexDirection: 'row', paddingBottom: 8, paddingTop: 4 },
  navItem: { flex: 1, alignItems: 'center', paddingTop: 8, gap: 3, borderTopWidth: 2 },
  navIcon: { fontSize: 18 },
  navImage: { width: 20, height: 20 },
  navLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
});
