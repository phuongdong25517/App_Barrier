import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card, DataRow, Toggle } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function AppSettingScreen() {
  const { Colors, isDark, setIsDark } = useTheme();
  const { connected, inforData, writeParam } = useBluetooth();

  const handleMainLock = () => {
    Alert.alert(
      '🔐 Xác nhận MAIN LOCK',
      'Bạn có chắc muốn khóa mainboard?\n\nThiết bị sẽ không hoạt động cho đến khi mở khóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'XÁC NHẬN KHÓA', style: 'destructive', onPress: () => writeParam('MAINLOCK', 1) },
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
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <Card>
        <Text style={[styles.sectionHeader, { color: Colors.muted }]}>THÔNG TIN ỨNG DỤNG</Text>
        <DataRow label="Tên App" value="Barrier Gen2" />
        <DataRow label="Phiên bản" value="1.0.0" />
        <DataRow label="Giao thức" value="BT Classic HC-05" />
        <DataRow label="Baud Rate" value="9600" unit="bps" />
      </Card>

      <Card>
        <Text style={[styles.sectionHeader, { color: Colors.muted }]}>THÔNG TIN THIẾT BỊ</Text>
        <DataRow label="Firmware" value={inforData.firmware} />
        <DataRow label="Serial" value={inforData.serial} />
        <DataRow label="Device" value={inforData.device} />
        <DataRow label="Odometer" value={inforData.odometer} unit="h" />
        <DataRow label="Mode" value={inforData.mode} />
        {inforData.error ? <DataRow label="Error" value={inforData.error} /> : null}
      </Card>

      {/* Display Settings - Dark/Light mode WORKS now */}
      <Card>
        <Text style={[styles.sectionHeader, { color: Colors.muted }]}>CÀI ĐẶT HIỂN THỊ</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={[styles.settingLabel, { color: Colors.text }]}>Chế độ tối (Dark Mode)</Text>
            <Text style={[styles.settingHint, { color: Colors.muted }]}>
              {isDark ? '🌙 Đang dùng chế độ tối' : '☀️ Đang dùng chế độ sáng'}
            </Text>
          </View>
          <Toggle value={isDark} onToggle={setIsDark} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionHeader, { color: Colors.muted }]}>HỆ THỐNG</Text>
        <TouchableOpacity
          style={[styles.sysBtn, { backgroundColor: Colors.border }]}
          onPress={handleResetFactory}
        >
          <Text style={[styles.sysBtnText, { color: Colors.muted }]}>🔄  RESET VỀ MẶC ĐỊNH</Text>
        </TouchableOpacity>
      </Card>

      {/* Main Lock */}
      <View style={[styles.lockCard, { borderColor: Colors.red, backgroundColor: `${Colors.red}0d` }]}>
        <Text style={[styles.sectionHeader, { color: Colors.red }]}>MAIN LOCK</Text>
        <Text style={[styles.lockDesc, { color: Colors.muted }]}>
          Khóa mainboard. Thiết bị sẽ bị vô hiệu hóa cho đến khi mở khóa. Sử dụng cẩn thận.
        </Text>
        <TouchableOpacity
          style={[styles.lockBtn, {
            backgroundColor: connected ? `${Colors.red}22` : Colors.card,
            borderColor: connected ? Colors.red : Colors.border,
          }]}
          onPress={connected ? handleMainLock : () => Alert.alert('Chưa kết nối', 'Kết nối HC-05 để dùng tính năng này')}
        >
          <Text style={[styles.lockBtnText, { color: connected ? Colors.red : Colors.muted }]}>
            🔐  MAIN LOCK
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12 },
  sectionHeader: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 13 },
  settingHint: { fontSize: 10, marginTop: 2 },
  sysBtn: { borderRadius: 8, padding: 12, alignItems: 'center' },
  sysBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  lockCard: { borderWidth: 1.5, borderRadius: 10, padding: 14 },
  lockDesc: { fontSize: 11, marginBottom: 12, lineHeight: 17 },
  lockBtn: { borderWidth: 1.5, borderRadius: 8, padding: 12, alignItems: 'center' },
  lockBtnText: { fontWeight: '700', letterSpacing: 2, fontSize: 13 },
});
