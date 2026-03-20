import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useBluetooth } from '../context/BluetoothContext';

export default function BluetoothModal({ visible, onClose }) {
  const { Colors } = useTheme();
  const { scannedDevices, scanning, scanPairedDevices, stopScan, connectDevice } = useBluetooth();

  useEffect(() => {
    if (visible) scanPairedDevices();
    return () => { if (!visible) stopScan?.(); };
  }, [visible]);

  const handleConnect = async (device) => {
    stopScan?.();
    onClose();
    await connectDevice(device);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { stopScan?.(); onClose(); }}>
        <View style={[styles.sheet, { backgroundColor: Colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: Colors.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: Colors.accent }]}>BLE SCAN</Text>
            <TouchableOpacity onPress={() => { stopScan?.(); onClose(); }}>
              <Text style={[styles.close, { color: Colors.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.hint, { backgroundColor: `${Colors.accent}11` }]}>
            <Text style={[styles.hintText, { color: Colors.muted }]}>
              Tìm kiếm thiết bị BLE gần đây. Module FSC-BT630 sẽ hiển thị tên <Text style={{ color: Colors.accent }}>Feasycom</Text> hoặc tên tuỳ chỉnh.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.scanBtn, {
              backgroundColor: scanning ? `${Colors.red}22` : `${Colors.accent}22`,
              borderColor: scanning ? Colors.red : Colors.accent
            }]}
            onPress={scanning ? stopScan : scanPairedDevices}
          >
            {scanning
              ? <>
                  <ActivityIndicator color={Colors.accent} size="small" />
                  <Text style={[styles.scanBtnText, { color: Colors.red }]}>■  DỪNG QUÉT</Text>
                </>
              : <Text style={[styles.scanBtnText, { color: Colors.accent }]}>🔍  QUÉT BLE</Text>
            }
          </TouchableOpacity>

          <FlatList
            data={scannedDevices}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={!scanning && (
              <Text style={[styles.empty, { color: Colors.muted }]}>
                Chưa tìm thấy thiết bị.{'\n'}Nhấn QUÉT BLE để bắt đầu.
              </Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.deviceRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}
                onPress={() => handleConnect(item)}
              >
                <View style={[styles.bleIcon, { backgroundColor: `${Colors.accent}15` }]}>
                  <Text style={{ fontSize: 16 }}>📡</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: Colors.text }]}>{item.name || 'Unknown'}</Text>
                  <Text style={[styles.deviceAddr, { color: Colors.muted }]}>{item.id}</Text>
                  {item.rssi && (
                    <Text style={[styles.deviceRssi, { color: item.rssi > -60 ? Colors.green : item.rssi > -80 ? Colors.yellow : Colors.muted }]}>
                      RSSI: {item.rssi} dBm
                    </Text>
                  )}
                </View>
                <View style={[styles.bleTag, { backgroundColor: `${Colors.accent}15`, borderColor: Colors.accent }]}>
                  <Text style={[styles.bleTagText, { color: Colors.accent }]}>BLE</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 2, fontFamily: 'monospace' },
  close: { fontSize: 18, padding: 4 },
  hint: { borderRadius: 8, padding: 10, marginBottom: 12 },
  hintText: { fontSize: 11, lineHeight: 16 },
  scanBtn: { borderWidth: 1.5, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16, minHeight: 44, justifyContent: 'center', flexDirection: 'row', gap: 8 },
  scanBtnText: { fontWeight: '700', letterSpacing: 1, fontSize: 12 },
  list: { maxHeight: 300 },
  empty: { textAlign: 'center', fontSize: 12, padding: 20, lineHeight: 20 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 8, gap: 10 },
  bleIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '600' },
  deviceAddr: { fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
  deviceRssi: { fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
  bleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  bleTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
