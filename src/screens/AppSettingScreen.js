import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { Colors } from '../theme';
import { Card, DataRow, Toggle } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function AppSettingScreen() {
  const { connected, inforData, writeParam } = useBluetooth();
  const [darkMode, setDarkMode] = useState(true);
  const [lockConfirm, setLockConfirm] = useState(false);

  const handleMainLock = () => {
    Alert.alert(
      '🔐 Xác nhận MAIN LOCK',
      'Bạn có chắc muốn khóa mainboard?\n\nThiết bị sẽ không hoạt động cho đến khi mở khóa.',
      [
        { text: 'Hủy', style: 'cancel', onPress: () => setLockConfirm(false) },
        {
          text: 'XÁC NHẬN KHÓA',
          style: 'destructive',
          onPress: () => {
            writeParam('MAINLOCK', 1);
            setLockConfirm(false);
          },
        },
      ]
    );
  };

  const handleResetFactory = () => {
    Alert.alert(
      '⚠ Reset Factory',
      'Toàn bộ thông số sẽ về mặc định. Tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => writeParam('RESET_FACTORY', 1) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Info */}
      <Card>
        <Text style={styles.sectionHeader}>THÔNG TIN ỨNG DỤNG</Text>
        <DataRow label="Tên App" value="BARRIER" />
        <DataRow label="Phiên bản" value="1.0.0" />
        <DataRow label="Giao thức" value="BT Classic HC-05" />
        <DataRow label="Baud Rate" value="9600" unit="bps" />
      </Card>

      {/* Device Info */}
      <Card>
        <Text style={styles.sectionHeader}>THÔNG TIN THIẾT BỊ</Text>
        <DataRow label="Firmware" value={inforData.firmware} />
        <DataRow label="Serial" value={inforData.serial} />
        <DataRow label="Device" value={inforData.device} />
        <DataRow label="Odometer" value={inforData.odometer} unit="h" />
        <DataRow label="Mode" value={inforData.mode} />
        {inforData.error && (
          <DataRow label="Error" value={inforData.error} />
        )}
      </Card>

      {/* Display Settings */}
      <Card>
        <Text style={styles.sectionHeader}>CÀI ĐẶT HIỂN THỊ</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Chế độ tối (Dark Mode)</Text>
          <Toggle value={darkMode} onToggle={setDarkMode} />
        </View>
      </Card>

      {/* System */}
      <Card>
        <Text style={styles.sectionHeader}>HỆ THỐNG</Text>
        <TouchableOpacity style={styles.sysBtn} onPress={handleResetFactory}>
          <Text style={styles.sysBtnText}>🔄  RESET VỀ MẶC ĐỊNH</Text>
        </TouchableOpacity>
      </Card>

      {/* Main Lock */}
      <View style={styles.lockCard}>
        <Text style={[styles.sectionHeader, { color: Colors.red }]}>MAIN LOCK</Text>
        <Text style={styles.lockDesc}>
          Khóa mainboard. Thiết bị sẽ bị vô hiệu hóa cho đến khi mở khóa. Sử dụng cẩn thận.
        </Text>
        <TouchableOpacity
          style={[styles.lockBtn, !connected && styles.lockBtnDisabled]}
          onPress={connected ? handleMainLock : () => Alert.alert('Chưa kết nối', 'Kết nối HC-05 để dùng tính năng này')}
        >
          <Text style={[styles.lockBtnText, !connected && { color: Colors.muted }]}>
            🔐  MAIN LOCK
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14, gap: 12 },
  sectionHeader: {
    fontSize: 9,
    color: Colors.muted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  settingLabel: { fontSize: 13, color: Colors.text },
  sysBtn: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  sysBtnText: { color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  lockCard: {
    backgroundColor: `${Colors.red}0d`,
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderRadius: 10,
    padding: 14,
  },
  lockDesc: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 12,
    lineHeight: 17,
  },
  lockBtn: {
    backgroundColor: `${Colors.red}22`,
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  lockBtnDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  lockBtnText: {
    color: Colors.red,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 13,
  },
});
