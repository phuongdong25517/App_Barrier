import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../theme';
import { Card, DataRow } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function OtaScreen() {
  const { inforData } = useBluetooth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.icon}>🔧</Text>
        <Text style={styles.title}>OTA UPDATE</Text>
        <Text style={styles.subtitle}>Tính năng đang phát triển</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.sectionHeader}>FIRMWARE HIỆN TẠI</Text>
        <DataRow label="Version" value={inforData.firmware} />
        <DataRow label="Device" value={inforData.device} />
        <DataRow label="Serial" value={inforData.serial} />
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionHeader}>THÔNG TIN</Text>
        <Text style={styles.infoText}>
          Tính năng OTA (Over-the-Air) cho phép cập nhật firmware của mainboard BARRIER trực tiếp qua kết nối Bluetooth Classic mà không cần tháo thiết bị.
        </Text>
        <Text style={[styles.infoText, { marginTop: 8, color: Colors.orange }]}>
          ⚠ Trong quá trình cập nhật, không ngắt kết nối Bluetooth hoặc tắt nguồn thiết bị.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14, gap: 12 },
  placeholder: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 0,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: `${Colors.orange}22`,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  badgeText: {
    color: Colors.orange,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  sectionHeader: {
    fontSize: 9,
    color: Colors.muted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 10,
  },
  infoCard: { marginTop: 0 },
  infoText: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 18,
  },
});
