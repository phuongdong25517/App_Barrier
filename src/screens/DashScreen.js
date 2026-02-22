import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import { Colors } from '../theme';
import { StatusLight, DataCard, DataRow, ActionBtn, SectionHeader, Card } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function DashScreen() {
  const { connected, bmsData, driverData, signals, writeParam, sendCommand } = useBluetooth();
  const [lastCmd, setLastCmd] = useState(null);

  const sendCmd = (label, param, value) => {
    if (!connected) {
      Alert.alert('Chưa kết nối', 'Hãy kết nối với HC-05 trước');
      return;
    }
    writeParam(param, value);
    setLastCmd(label);
    setTimeout(() => setLastCmd(null), 1500);
  };

  const onLearningRemote = () => {
    Alert.alert(
      'Learning Remote',
      'Nhấn nút trên remote trong vòng 10 giây để học lệnh.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Bắt đầu', onPress: () => writeParam('REMOTE', 0) },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Signal Status */}
      <Card style={styles.mb12}>
        <SectionHeader title="SIGNAL STATUS" />
        <View style={styles.lights}>
          <StatusLight label={'CLOSE\nLIMIT'} active={signals.closeLimit} />
          <StatusLight label={'OPEN\nLIMIT'} active={signals.openLimit} />
          <StatusLight label={'CLOSE\nDECEL'} active={signals.closeDecel} />
          <StatusLight label={'OPEN\nDECEL'} active={signals.openDecel} />
          <StatusLight label={'PHOTO\nCELL'} active={signals.photocell} />
        </View>
      </Card>

      {/* Control Buttons */}
      <Card style={styles.mb12}>
        <SectionHeader title="CONTROLS" />
        <View style={styles.controls}>
          <ActionBtn
            label="POWER"
            icon="⏻"
            color={Colors.green}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('POWER', 'RUN_CMD', 1)}
          />
          <ActionBtn
            label="STOP"
            icon="⏹"
            color={Colors.red}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('STOP', 'RUN_CMD', 3)}
          />
          <ActionBtn
            label="CLOSE"
            icon="🔒"
            color={Colors.orange}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('CLOSE', 'RUN_CMD', 2)}
          />
          <ActionBtn
            label="OPEN"
            icon="🔓"
            color={Colors.accent}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('OPEN', 'RUN_CMD', 4)}
          />
        </View>
        {lastCmd && (
          <Text style={styles.cmdFeedback}>↑ Đã gửi lệnh: {lastCmd}</Text>
        )}
        {!connected && (
          <Text style={styles.notConnected}>Kết nối HC-05 để sử dụng điều khiển</Text>
        )}
      </Card>

      {/* Learning Remote */}
      <TouchableOpacity
        style={[styles.learnBtn, !connected && styles.learnBtnDisabled]}
        onPress={onLearningRemote}
      >
        <Text style={[styles.learnBtnText, !connected && { color: Colors.muted }]}>
          📡  LEARNING REMOTE
        </Text>
      </TouchableOpacity>

      {/* Data panels */}
      <View style={styles.dataRow}>
        <DataCard title="BMS DATA" color={Colors.green}>
          <DataRow label="Voltage" value={bmsData.voltage} unit="V" />
          <DataRow label="Capacity" value={bmsData.capacity} unit="%" />
          <DataRow label="Current" value={bmsData.current} unit="A" />
          <DataRow label="Power" value={bmsData.wattage} unit="W" />
          <DataRow label="Temp" value={bmsData.temperature} unit="°C" />
        </DataCard>
        <View style={{ width: 10 }} />
        <DataCard title="DRIVER DATA" color={Colors.orange}>
          <DataRow label="Voltage" value={driverData.voltage} unit="V" />
          <DataRow label="Current" value={driverData.current} unit="A" />
          <DataRow label="Power" value={driverData.wattage} unit="W" />
          <DataRow label="Throttle" value={driverData.throttle} unit="%" />
          <DataRow label="Temp" value={driverData.temperature} unit="°C" />
        </DataCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14, gap: 0 },
  mb12: { marginBottom: 12 },
  lights: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  cmdFeedback: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 10,
    color: Colors.green,
    fontFamily: 'monospace',
  },
  notConnected: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 10,
    color: Colors.muted,
  },
  learnBtn: {
    backgroundColor: `${Colors.accentDim}18`,
    borderWidth: 1.5,
    borderColor: Colors.accentDim,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  learnBtnDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  learnBtnText: {
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 13,
  },
  dataRow: { flexDirection: 'row', marginBottom: 12 },
});
