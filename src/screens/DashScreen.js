import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { StatusLight, DataCard, DataRow, ActionBtn, SectionHeader, Card, Stepper } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function DashScreen() {
  const { Colors } = useTheme();
  const { t } = useLanguage();
  const { connected, bmsData, driverData, signals, writeParam, inforData } = useBluetooth();
  const [lastCmd, setLastCmd] = useState(null);
  const [closeSpeed, setCloseSpeed] = useState(15);
  const [openSpeed, setOpenSpeed] = useState(15);

  const sendCmd = (label, param, value) => {
    if (!connected) { Alert.alert(t.notConnectedAlert, t.notConnected); return; }
    writeParam(param, value);
    setLastCmd(label);
    setTimeout(() => setLastCmd(null), 1500);
  };

  const onLearningRemote = () => {
    if (!connected) { Alert.alert(t.notConnectedAlert, t.connectFirst); return; }
    writeParam('REMOTE', 0);
    Alert.alert('Learning Remote', t.lang === 'vi'
      ? 'Đã gửi lệnh! Nhấn nút remote trong vòng 10 giây.'
      : 'Command sent! Press remote button within 10 seconds.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.bg }]}
      contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Signal Status */}
      <Card style={styles.mb12}>
        <SectionHeader title={t.signalStatus} />
        <View style={styles.lights}>
          <StatusLight label={t.closeLimit} active={signals.closeLimit} />
          <StatusLight label={t.openLimit} active={signals.openLimit} />
          <StatusLight label={t.closeDecel} active={signals.closeDecel} />
          <StatusLight label={t.openDecel} active={signals.openDecel} />
          <StatusLight label={t.photoCell} active={signals.photocell} />
        </View>
      </Card>

      {/* Controls */}
      <Card style={styles.mb12}>
        <SectionHeader title={t.controls} />
        <View style={styles.controls}>
          <ActionBtn label={t.power} iconSource={require('../../assets/icons/icon_power.png')}
            color={Colors.green} size="lg" disabled={!connected} onPress={() => sendCmd(t.power, 'RUN_CMD', 1)} />
          <ActionBtn label={t.stop} iconSource={require('../../assets/icons/icon_stop.png')}
            color={Colors.red} size="lg" disabled={!connected} onPress={() => sendCmd(t.stop, 'RUN_CMD', 3)} />
          <ActionBtn label={t.close} iconSource={require('../../assets/icons/icon_backward.png')}
            color={Colors.orange} size="lg" disabled={!connected} onPress={() => sendCmd(t.close, 'RUN_CMD', 2)} />
          <ActionBtn label={t.open} iconSource={require('../../assets/icons/icon_forward.png')}
            color={Colors.accent} size="lg" disabled={!connected} onPress={() => sendCmd(t.open, 'RUN_CMD', 4)} />
        </View>
        {lastCmd
          ? <Text style={[styles.cmdFeedback, { color: Colors.green }]}>{t.cmdSent}{lastCmd}</Text>
          : !connected && <Text style={[styles.notConnected, { color: Colors.muted }]}>{t.notConnected}</Text>
        }
      </Card>

      {/* Learning Remote */}
      <TouchableOpacity
        style={[styles.learnBtn, { backgroundColor: connected ? `${Colors.accentDim}18` : Colors.card, borderColor: connected ? Colors.accentDim : Colors.border }]}
        onPress={onLearningRemote}>
        <Text style={[styles.learnBtnText, { color: connected ? Colors.accent : Colors.muted }]}>
          {t.learningRemote}
        </Text>
      </TouchableOpacity>

      {/* Data panels */}
      <View style={styles.dataRow}>
        <DataCard title={t.bmsData} color={Colors.green}>
          <DataRow label={t.voltage} value={bmsData.voltage} unit="V" />
          <DataRow label={t.capacity} value={bmsData.capacity} unit="%" />
          <DataRow label={t.current} value={bmsData.current} unit="A" />
          <DataRow label={t.power2} value={bmsData.wattage} unit="W" />
          <DataRow label={t.temp} value={bmsData.temperature} unit="°C" />
        </DataCard>
        <View style={{ width: 10 }} />
        <DataCard title={t.driverData} color={Colors.orange}>
          <DataRow label={t.voltage} value={driverData.voltage} unit="V" />
          <DataRow label={t.current} value={driverData.current} unit="A" />
          <DataRow label={t.power2} value={driverData.wattage} unit="W" />
          <DataRow label={t.throttle} value={driverData.throttle} unit="%" />
          <DataRow label={t.temp} value={driverData.temperature} unit="°C" />
        </DataCard>
      </View>

      {/* Quick Speed */}
      <Card style={styles.mb12}>
        <SectionHeader title={t.quickSpeed} />
        <View style={[styles.speedRow, { borderBottomColor: Colors.border }]}>
          <View style={styles.speedInfo}>
            <Text style={[styles.speedLabel, { color: Colors.text }]}>{t.closeSpeed}</Text>
            <Text style={[styles.speedParam, { color: Colors.muted }]}>CLOSE_SPEED</Text>
          </View>
          <View style={styles.speedRight}>
            <Stepper value={closeSpeed} min={0} max={95} unit="%" onChangeValue={setCloseSpeed} />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: `${Colors.orange}22`, borderColor: Colors.orange }]}
              onPress={() => connected ? writeParam('CLOSE_SPEED', closeSpeed) : null}>
              <Text style={[styles.sendBtnText, { color: Colors.orange }]}>{t.send}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.speedRow, { borderBottomColor: 'transparent' }]}>
          <View style={styles.speedInfo}>
            <Text style={[styles.speedLabel, { color: Colors.text }]}>{t.openSpeed}</Text>
            <Text style={[styles.speedParam, { color: Colors.muted }]}>OPEN_SPEED</Text>
          </View>
          <View style={styles.speedRight}>
            <Stepper value={openSpeed} min={0} max={95} unit="%" onChangeValue={setOpenSpeed} />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
              onPress={() => connected ? writeParam('OPEN_SPEED', openSpeed) : null}>
              <Text style={[styles.sendBtnText, { color: Colors.accent }]}>{t.send}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14 },
  mb12: { marginBottom: 12 },
  lights: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  cmdFeedback: { marginTop: 8, textAlign: 'center', fontSize: 10, fontFamily: 'monospace' },
  notConnected: { marginTop: 8, textAlign: 'center', fontSize: 10 },
  learnBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  learnBtnText: { fontWeight: '700', letterSpacing: 2, fontSize: 13 },
  dataRow: { flexDirection: 'row', marginBottom: 12 },
  speedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  speedInfo: { flex: 1 },
  speedLabel: { fontSize: 12 },
  speedParam: { fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
  speedRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendBtn: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  sendBtnText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
