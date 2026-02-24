import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StatusLight, DataCard, DataRow, ActionBtn, SectionHeader, Card, Stepper } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function DashScreen() {
  const { Colors } = useTheme();
  const { connected, bmsData, driverData, signals, writeParam } = useBluetooth();
  const [lastCmd, setLastCmd] = useState(null);
  const [closeSpeed, setCloseSpeed] = useState(15);
  const [openSpeed, setOpenSpeed] = useState(15);

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
    if (!connected) {
      Alert.alert('Chưa kết nối', 'Kết nối HC-05 trước');
      return;
    }
    // Gửi lệnh 1 lần ngay không hỏi lại
    writeParam('REMOTE', 0);
    Alert.alert('Learning Remote', 'Đã gửi lệnh! Nhấn nút remote trong vòng 10 giây.');
  };

  const applyCloseSpeed = () => {
    if (!connected) return;
    writeParam('CLOSE_SPEED', closeSpeed);
    Alert.alert('OK', `Đã gửi tốc độ đóng: ${closeSpeed}%`);
  };

  const applyOpenSpeed = () => {
    if (!connected) return;
    writeParam('OPEN_SPEED', openSpeed);
    Alert.alert('OK', `Đã gửi tốc độ mở: ${openSpeed}%`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.bg }]}
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
            iconSource={require('../../assets/icons/icon_power.png')}
            color={Colors.green}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('POWER', 'RUN_CMD', 1)}
          />
          <ActionBtn
            label="STOP"
            iconSource={require('../../assets/icons/icon_stop.png')}
            color={Colors.red}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('STOP', 'RUN_CMD', 3)}
          />
          <ActionBtn
            label="CLOSE"
            iconSource={require('../../assets/icons/icon_backward.png')}
            color={Colors.orange}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('CLOSE', 'RUN_CMD', 2)}
          />
          <ActionBtn
            label="OPEN"
            iconSource={require('../../assets/icons/icon_forward.png')}
            color={Colors.accent}
            size="lg"
            disabled={!connected}
            onPress={() => sendCmd('OPEN', 'RUN_CMD', 4)}
          />
        </View>
        {lastCmd && (
          <Text style={[styles.cmdFeedback, { color: Colors.green }]}>
            ↑ Đã gửi lệnh: {lastCmd}
          </Text>
        )}
        {!connected && (
          <Text style={[styles.notConnected, { color: Colors.muted }]}>
            Kết nối HC-05 để sử dụng điều khiển
          </Text>
        )}
      </Card>

      {/* Learning Remote - 1 tap */}
      <TouchableOpacity
        style={[styles.learnBtn, {
          backgroundColor: connected ? `${Colors.accentDim}18` : Colors.card,
          borderColor: connected ? Colors.accentDim : Colors.border,
        }]}
        onPress={onLearningRemote}
      >
        <Text style={[styles.learnBtnText, { color: connected ? Colors.accent : Colors.muted }]}>
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

      {/* Speed Controls */}
      <Card style={styles.mb12}>
        <SectionHeader title="QUICK SPEED" />
        {/* Close Speed */}
        <View style={[styles.speedRow, { borderBottomColor: Colors.border }]}>
          <View style={styles.speedInfo}>
            <Text style={[styles.speedLabel, { color: Colors.text }]}>Tốc độ đóng cửa</Text>
            <Text style={[styles.speedParam, { color: Colors.muted }]}>CLOSE_SPEED</Text>
          </View>
          <View style={styles.speedRight}>
            <Stepper value={closeSpeed} min={0} max={95} unit="%" onChangeValue={setCloseSpeed} />
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: `${Colors.orange}22`, borderColor: Colors.orange }]}
              onPress={applyCloseSpeed}
            >
              <Text style={[styles.applyBtnText, { color: Colors.orange }]}>GỬI</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Open Speed */}
        <View style={[styles.speedRow, { borderBottomColor: 'transparent' }]}>
          <View style={styles.speedInfo}>
            <Text style={[styles.speedLabel, { color: Colors.text }]}>Tốc độ mở cửa</Text>
            <Text style={[styles.speedParam, { color: Colors.muted }]}>OPEN_SPEED</Text>
          </View>
          <View style={styles.speedRight}>
            <Stepper value={openSpeed} min={0} max={95} unit="%" onChangeValue={setOpenSpeed} />
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
              onPress={applyOpenSpeed}
            >
              <Text style={[styles.applyBtnText, { color: Colors.accent }]}>GỬI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 0 },
  mb12: { marginBottom: 12 },
  lights: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  cmdFeedback: { marginTop: 8, textAlign: 'center', fontSize: 10, fontFamily: 'monospace' },
  notConnected: { marginTop: 8, textAlign: 'center', fontSize: 10 },
  learnBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 12,
  },
  learnBtnText: { fontWeight: '700', letterSpacing: 2, fontSize: 13 },
  dataRow: { flexDirection: 'row', marginBottom: 12 },
  speedRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, gap: 8,
  },
  speedInfo: { flex: 1 },
  speedLabel: { fontSize: 12 },
  speedParam: { fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
  speedRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyBtn: {
    borderWidth: 1.5, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  applyBtnText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
