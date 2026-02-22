import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme';
import { useBluetooth } from '../context/BluetoothContext';

export default function BluetoothModal({ visible, onClose }) {
  const { pairedDevices, scanning, scanPairedDevices, connectDevice } = useBluetooth();

  useEffect(() => {
    if (visible) scanPairedDevices();
  }, [visible]);

  const handleConnect = async (device) => {
    onClose();
    await connectDevice(device);
  };

  const getRssiColor = (rssi) => {
    if (!rssi) return Colors.muted;
    if (rssi > -60) return Colors.green;
    if (rssi > -75) return Colors.orange;
    return Colors.red;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>BLUETOOTH SCAN</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            HC-05 dùng Bluetooth Classic. Hãy ghép đôi (pair) với HC-05 trong Settings của Android trước, sau đó chọn thiết bị bên dưới.
          </Text>

          <TouchableOpacity style={styles.scanBtn} onPress={scanPairedDevices}>
            {scanning
              ? <ActivityIndicator color={Colors.accent} />
              : <Text style={styles.scanBtnText}>🔍  QUÉT THIẾT BỊ ĐÃ GHÉP ĐÔI</Text>
            }
          </TouchableOpacity>

          <FlatList
            data={pairedDevices}
            keyExtractor={(item) => item.address || item.id}
            style={styles.list}
            ListEmptyComponent={
              !scanning && (
                <Text style={styles.empty}>
                  Không tìm thấy thiết bị nào.{'\n'}Hãy pair HC-05 trong Cài đặt Android trước.
                </Text>
              )
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.deviceRow} onPress={() => handleConnect(item)}>
                <View style={styles.btIcon}>
                  <Text style={{ fontSize: 16 }}>📶</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{item.name || 'Unknown'}</Text>
                  <Text style={styles.deviceAddr}>{item.address}</Text>
                </View>
                {item.rssi && (
                  <Text style={[styles.rssi, { color: getRssiColor(item.rssi) }]}>
                    {item.rssi} dBm
                  </Text>
                )}
                <Text style={styles.connectArrow}>›</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  close: { color: Colors.muted, fontSize: 18, padding: 4 },
  hint: {
    fontSize: 11,
    color: Colors.muted,
    backgroundColor: `${Colors.accent}11`,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    lineHeight: 16,
  },
  scanBtn: {
    backgroundColor: `${Colors.accent}22`,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  scanBtnText: {
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 12,
  },
  list: { maxHeight: 280 },
  empty: {
    textAlign: 'center',
    color: Colors.muted,
    fontSize: 12,
    padding: 20,
    lineHeight: 20,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  btIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${Colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: { flex: 1 },
  deviceName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  deviceAddr: { color: Colors.muted, fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
  rssi: { fontSize: 11, fontFamily: 'monospace' },
  connectArrow: { color: Colors.accent, fontSize: 22, fontWeight: '300' },
});
