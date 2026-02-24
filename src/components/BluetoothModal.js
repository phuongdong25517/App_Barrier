import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useBluetooth } from '../context/BluetoothContext';

export default function BluetoothModal({ visible, onClose }) {
  const { Colors } = useTheme();
  const { pairedDevices, scanning, scanPairedDevices, connectDevice } = useBluetooth();

  useEffect(() => { if (visible) scanPairedDevices(); }, [visible]);

  const handleConnect = async (device) => { onClose(); await connectDevice(device); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: Colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: Colors.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: Colors.accent }]}>BLUETOOTH SCAN</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.close, { color: Colors.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: Colors.muted, backgroundColor: `${Colors.accent}11` }]}>
            Hãy pair HC-05 trong Settings → Bluetooth của Android trước, sau đó quét bên dưới.
          </Text>
          <TouchableOpacity style={[styles.scanBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]} onPress={scanPairedDevices}>
            {scanning
              ? <ActivityIndicator color={Colors.accent} />
              : <Text style={[styles.scanBtnText, { color: Colors.accent }]}>🔍  QUÉT THIẾT BỊ ĐÃ GHÉP ĐÔI</Text>
            }
          </TouchableOpacity>
          <FlatList
            data={pairedDevices}
            keyExtractor={(item) => item.address || item.id}
            style={styles.list}
            ListEmptyComponent={!scanning && (
              <Text style={[styles.empty, { color: Colors.muted }]}>
                Không tìm thấy thiết bị nào.{'\n'}Pair HC-05 trong Cài đặt Android trước.
              </Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.deviceRow, { backgroundColor: Colors.card, borderColor: Colors.border }]} onPress={() => handleConnect(item)}>
                <View style={[styles.btIcon, { backgroundColor: `${Colors.accent}15` }]}>
                  <Text style={{ fontSize: 16 }}>📶</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: Colors.text }]}>{item.name || 'Unknown'}</Text>
                  <Text style={[styles.deviceAddr, { color: Colors.muted }]}>{item.address}</Text>
                </View>
                <Text style={[styles.connectArrow, { color: Colors.accent }]}>›</Text>
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
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 2, fontFamily: 'monospace' },
  close: { fontSize: 18, padding: 4 },
  hint: { fontSize: 11, borderRadius: 8, padding: 10, marginBottom: 12, lineHeight: 16 },
  scanBtn: { borderWidth: 1.5, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16, minHeight: 44, justifyContent: 'center' },
  scanBtnText: { fontWeight: '700', letterSpacing: 1, fontSize: 12 },
  list: { maxHeight: 280 },
  empty: { textAlign: 'center', fontSize: 12, padding: 20, lineHeight: 20 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 8, gap: 10 },
  btIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '600' },
  deviceAddr: { fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
  connectArrow: { fontSize: 22, fontWeight: '300' },
});
