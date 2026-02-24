import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card, DataRow } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function OtaScreen() {
  const { Colors } = useTheme();
  const { inforData } = useBluetooth();
  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.placeholder, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <Text style={styles.icon}>🔧</Text>
        <Text style={[styles.title, { color: Colors.muted }]}>OTA UPDATE</Text>
        <Text style={[styles.subtitle, { color: Colors.muted }]}>Tính năng đang phát triển</Text>
        <View style={[styles.badge, { backgroundColor: `${Colors.orange}22`, borderColor: Colors.orange }]}>
          <Text style={[styles.badgeText, { color: Colors.orange }]}>COMING SOON</Text>
        </View>
      </View>
      <Card>
        <Text style={[styles.sectionHeader, { color: Colors.muted }]}>FIRMWARE HIỆN TẠI</Text>
        <DataRow label="Version" value={inforData.firmware} />
        <DataRow label="Device" value={inforData.device} />
        <DataRow label="Serial" value={inforData.serial} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12 },
  placeholder: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 40, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 4 },
  subtitle: { fontSize: 12, marginTop: 4, marginBottom: 16 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 },
  sectionHeader: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 },
});
