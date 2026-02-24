import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card, SectionHeader, Stepper } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

const TABS = ['POWER', 'MOTOR', 'SPEED', 'SWITCH'];

function SelectRow({ label, param, value, options, onChange }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.paramRow}>
      <View style={styles.paramInfo}>
        <Text style={[styles.paramLabel, { color: Colors.text }]}>{label}</Text>
        <Text style={[styles.paramCode, { color: Colors.muted }]}>{param}</Text>
      </View>
      <View style={styles.optionGroup}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(param, opt.value)}
            style={[styles.optionBtn, {
              backgroundColor: value === opt.value ? `${Colors.accent}22` : Colors.border,
              borderColor: value === opt.value ? Colors.accent : 'transparent',
            }]}
          >
            <Text style={[styles.optionText, { color: value === opt.value ? Colors.accent : Colors.muted }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StepperRow({ label, param, value, unit, min, max, onChange }) {
  const { Colors } = useTheme();
  return (
    <View style={[styles.paramRow, { borderBottomColor: Colors.border }]}>
      <View style={styles.paramInfo}>
        <Text style={[styles.paramLabel, { color: Colors.text }]}>{label}</Text>
        <Text style={[styles.paramCode, { color: Colors.muted }]}>{param}</Text>
      </View>
      <Stepper value={value} min={min} max={max} unit={unit} onChangeValue={(v) => onChange(param, v)} />
    </View>
  );
}

export default function SettingScreen() {
  const { Colors } = useTheme();
  const { connected, writeParam } = useBluetooth();
  const [activeTab, setActiveTab] = useState(0);
  const [params, setParams] = useState({
    TYPE_POWER: 0, VOLTAGE: 24, SOC: 100, OVP: 30, UVP: 12, OCP: 10,
    GEAR_BOX: 1, INVERT: 0, TYPE_DRIVER: 1, TYPE_CMD: 4,
    TYPE_RUN_DECEL: 1, TIME_RUN_DECEL: 3000, TYPE_RUN_PHOTOCELL: 1,
    CLOSE_SPEED: 15, OPEN_SPEED: 15, CLOSE_DECEL_SPEED: 15, OPEN_DECEL_SPEED: 15,
    SPEED_START_CW: 15, SPEED_START_CCW: 10,
    TIME_START_CW: 10, TIME_START_CCW: 400,
    TYPE_SW_CLOSE: 1, TYPE_SW_OPEN: 1,
    TYPE_SW_CLOSE_DECEL: 1, TYPE_SW_OPEN_DECEL: 1, TYPE_SW_PHOTOCELL: 1,
  });

  const change = (param, value) => setParams(p => ({ ...p, [param]: value }));

  const sendAll = () => {
    if (!connected) { Alert.alert('Chưa kết nối', 'Kết nối với HC-05 để gửi cài đặt'); return; }
    Object.entries(params).forEach(([k, v]) => writeParam(k, v));
    Alert.alert('Thành công', 'Đã gửi toàn bộ thông số cài đặt');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg }]}>
      <View style={[styles.tabBar, { backgroundColor: Colors.card }]}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(i)}
            style={[styles.tab, { backgroundColor: activeTab === i ? Colors.accent : 'transparent' }]}>
            <Text style={[styles.tabText, { color: activeTab === i ? Colors.bg : Colors.muted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card>
          {activeTab === 0 && (<>
            <SectionHeader title="POWER SETTINGS" />
            <SelectRow label="Nguồn điện" param="TYPE_POWER" value={params.TYPE_POWER}
              options={[{ value: 0, label: 'Battery' }, { value: 1, label: 'SMPS' }]} onChange={change} />
            <StepperRow label="Điện áp" param="VOLTAGE" value={params.VOLTAGE} unit="V" min={12} max={72} onChange={change} />
            <StepperRow label="Dung lượng Pin" param="SOC" value={params.SOC} unit="%" min={1} max={100} onChange={change} />
            <StepperRow label="Bảo vệ quá áp" param="OVP" value={params.OVP} unit="V" min={12} max={100} onChange={change} />
            <StepperRow label="Bảo vệ thấp áp" param="UVP" value={params.UVP} unit="V" min={10} max={60} onChange={change} />
            <StepperRow label="Bảo vệ quá dòng" param="OCP" value={params.OCP} unit="A" min={5} max={100} onChange={change} />
          </>)}
          {activeTab === 1 && (<>
            <SectionHeader title="MOTOR SETTINGS" />
            <StepperRow label="Tỷ số hộp giảm tốc" param="GEAR_BOX" value={params.GEAR_BOX} unit="" min={1} max={40} onChange={change} />
            <SelectRow label="Chiều quay" param="INVERT" value={params.INVERT}
              options={[{ value: 0, label: 'CW' }, { value: 1, label: 'CCW' }]} onChange={change} />
            <SelectRow label="Loại Driver" param="TYPE_DRIVER" value={params.TYPE_DRIVER}
              options={[{ value: 1, label: 'S48V500W' }, { value: 2, label: 'U60V750W' }, { value: 3, label: 'S24V350W' }, { value: 4, label: 'DT48V2kW' }, { value: 5, label: 'U48V500W' }, { value: 6, label: 'PMT500W' }]} onChange={change} />
            <SelectRow label="Kiểu lệnh" param="TYPE_CMD" value={params.TYPE_CMD}
              options={[{ value: 1, label: 'RS485' }, { value: 2, label: 'RF433' }, { value: 3, label: 'Button' }, { value: 4, label: 'All' }]} onChange={change} />
            <SelectRow label="Kiểu giảm tốc" param="TYPE_RUN_DECEL" value={params.TYPE_RUN_DECEL}
              options={[{ value: 1, label: 'Hold' }, { value: 2, label: 'Timed' }]} onChange={change} />
            <StepperRow label="Thời gian giảm tốc" param="TIME_RUN_DECEL" value={params.TIME_RUN_DECEL} unit="ms" min={100} max={9000} onChange={change} />
            <SelectRow label="Photocell mode" param="TYPE_RUN_PHOTOCELL" value={params.TYPE_RUN_PHOTOCELL}
              options={[{ value: 1, label: 'Stop' }, { value: 2, label: 'Reopen' }]} onChange={change} />
          </>)}
          {activeTab === 2 && (<>
            <SectionHeader title="SPEED SETTINGS" />
            <StepperRow label="Tốc độ đóng cửa" param="CLOSE_SPEED" value={params.CLOSE_SPEED} unit="%" min={0} max={95} onChange={change} />
            <StepperRow label="Tốc độ mở cửa" param="OPEN_SPEED" value={params.OPEN_SPEED} unit="%" min={0} max={95} onChange={change} />
            <StepperRow label="Giảm tốc đóng" param="CLOSE_DECEL_SPEED" value={params.CLOSE_DECEL_SPEED} unit="%" min={0} max={95} onChange={change} />
            <StepperRow label="Giảm tốc mở" param="OPEN_DECEL_SPEED" value={params.OPEN_DECEL_SPEED} unit="%" min={0} max={95} onChange={change} />
            <StepperRow label="Khởi động CW" param="SPEED_START_CW" value={params.SPEED_START_CW} unit="%" min={1} max={30} onChange={change} />
            <StepperRow label="Khởi động CCW" param="SPEED_START_CCW" value={params.SPEED_START_CCW} unit="%" min={1} max={30} onChange={change} />
            <StepperRow label="Thời gian start CW" param="TIME_START_CW" value={params.TIME_START_CW} unit="ms" min={10} max={5000} onChange={change} />
            <StepperRow label="Thời gian start CCW" param="TIME_START_CCW" value={params.TIME_START_CCW} unit="ms" min={10} max={5000} onChange={change} />
          </>)}
          {activeTab === 3 && (<>
            <SectionHeader title="SWITCH SETTINGS" />
            {[
              { label: 'Close Limit', param: 'TYPE_SW_CLOSE' },
              { label: 'Open Limit', param: 'TYPE_SW_OPEN' },
              { label: 'Close Decel', param: 'TYPE_SW_CLOSE_DECEL' },
              { label: 'Open Decel', param: 'TYPE_SW_OPEN_DECEL' },
              { label: 'Photocell', param: 'TYPE_SW_PHOTOCELL' },
            ].map(item => (
              <SelectRow key={item.param} label={item.label} param={item.param} value={params[item.param]}
                options={[{ value: 0, label: 'Disable' }, { value: 1, label: 'Wire' }, { value: 2, label: 'Wireless' }]}
                onChange={change} />
            ))}
          </>)}
        </Card>

        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
          onPress={sendAll}
        >
          <Text style={[styles.applyBtnText, { color: Colors.accent }]}>↑  ÁP DỤNG TẤT CẢ CÀI ĐẶT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', margin: 14, marginBottom: 0, borderRadius: 10, padding: 4, gap: 3 },
  tab: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },
  paramRow: { paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  paramInfo: { flex: 1 },
  paramLabel: { fontSize: 12 },
  paramCode: { fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  optionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  optionText: { fontSize: 10, fontFamily: 'monospace' },
  applyBtn: { borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center' },
  applyBtnText: { fontWeight: '700', letterSpacing: 2, fontSize: 13 },
});
