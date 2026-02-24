import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, SectionHeader, Stepper } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

const TABS_VI = ['NGUỒN', 'MOTOR', 'TỐC ĐỘ', 'CÔNG TẮC'];
const TABS_EN = ['POWER', 'MOTOR', 'SPEED', 'SWITCH'];

// Row với 2 nút ĐỌC và GHI riêng biệt
function ParamRow({ label, param, value, children, onRead, onWrite }) {
  const { Colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.paramRow, { borderBottomColor: Colors.border }]}>
      <View style={styles.paramTop}>
        <View style={styles.paramInfo}>
          <Text style={[styles.paramLabel, { color: Colors.text }]}>{label}</Text>
          
        </View>
        <View style={styles.paramBtns}>
          <TouchableOpacity onPress={onRead}
            style={[styles.rwBtn, { backgroundColor: `${Colors.accentDim}22`, borderColor: Colors.accentDim }]}>
            <Text style={[styles.rwBtnText, { color: Colors.accentDim }]}>{t.read}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onWrite}
            style={[styles.rwBtn, { backgroundColor: `${Colors.green}22`, borderColor: Colors.green }]}>
            <Text style={[styles.rwBtnText, { color: Colors.green }]}>{t.write}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.paramControl}>{children}</View>
    </View>
  );
}

function SelectRow({ label, param, value, options, onChange, onRead, onWrite }) {
  const { Colors } = useTheme();
  return (
    <ParamRow label={label} param={param} onRead={onRead} onWrite={onWrite}>
      <View style={styles.optionGroup}>
        {options.map(opt => (
          <TouchableOpacity key={opt.value} onPress={() => onChange(param, opt.value)}
            style={[styles.optionBtn, {
              backgroundColor: value === opt.value ? `${Colors.accent}22` : Colors.border,
              borderColor: value === opt.value ? Colors.accent : 'transparent',
            }]}>
            <Text style={[styles.optionText, { color: value === opt.value ? Colors.accent : Colors.muted }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ParamRow>
  );
}

function StepperRow({ label, param, value, unit, min, max, onChange, onRead, onWrite }) {
  return (
    <ParamRow label={label} param={param} onRead={onRead} onWrite={onWrite}>
      <Stepper value={value} min={min} max={max} unit={unit} onChangeValue={(v) => onChange(param, v)} />
    </ParamRow>
  );
}

export default function SettingScreen() {
  const { Colors } = useTheme();
  const { t, lang } = useLanguage();
  const { connected, writeParam, readParam } = useBluetooth();
  const [activeTab, setActiveTab] = useState(0);
  const TABS = lang === 'vi' ? TABS_VI : TABS_EN;

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

  const doRead = (param) => {
    if (!connected) { Alert.alert(t.notConnectedAlert, t.connectFirst); return; }
    readParam(param);
  };

  const doWrite = (param) => {
    if (!connected) { Alert.alert(t.notConnectedAlert, t.connectFirst); return; }
    writeParam(param, params[param]);
    Alert.alert('OK', `${param} = ${params[param]}`);
  };

  const pw = (p) => ({ onRead: () => doRead(p), onWrite: () => doWrite(p) });

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg }]}>
      <View style={[styles.tabBar, { backgroundColor: Colors.card }]}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} onPress={() => setActiveTab(i)}
            style={[styles.tab, { backgroundColor: activeTab === i ? Colors.accent : 'transparent' }]}>
            <Text style={[styles.tabText, { color: activeTab === i ? Colors.bg : Colors.muted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card>
          {activeTab === 0 && (<>
            <SectionHeader title={t.powerSettings} />
            <SelectRow label={t.powerType} param="TYPE_POWER" value={params.TYPE_POWER}
              options={[{ value: 0, label: t.battery }, { value: 1, label: t.smps }]}
              onChange={change} {...pw('TYPE_POWER')} />
            <StepperRow label={t.voltageParam} param="VOLTAGE" value={params.VOLTAGE} unit="V" min={12} max={72} onChange={change} {...pw('VOLTAGE')} />
            <StepperRow label={t.soc} param="SOC" value={params.SOC} unit="%" min={1} max={100} onChange={change} {...pw('SOC')} />
            <StepperRow label={t.ovp} param="OVP" value={params.OVP} unit="V" min={12} max={100} onChange={change} {...pw('OVP')} />
            <StepperRow label={t.uvp} param="UVP" value={params.UVP} unit="V" min={10} max={60} onChange={change} {...pw('UVP')} />
            <StepperRow label={t.ocp} param="OCP" value={params.OCP} unit="A" min={5} max={100} onChange={change} {...pw('OCP')} />
          </>)}
          {activeTab === 1 && (<>
            <SectionHeader title={t.motorSettings} />
            <StepperRow label={t.gearBox} param="GEAR_BOX" value={params.GEAR_BOX} unit="" min={1} max={40} onChange={change} {...pw('GEAR_BOX')} />
            <SelectRow label={t.motorDir} param="INVERT" value={params.INVERT}
              options={[{ value: 0, label: 'CW' }, { value: 1, label: 'CCW' }]}
              onChange={change} {...pw('INVERT')} />
            <SelectRow label={t.driverType} param="TYPE_DRIVER" value={params.TYPE_DRIVER}
              options={[{ value: 1, label: 'S48V500W' }, { value: 2, label: 'U60V750W' }, { value: 3, label: 'S24V350W' }, { value: 4, label: 'DT48V2kW' }, { value: 5, label: 'U48V500W' }, { value: 6, label: 'PMT500W' }]}
              onChange={change} {...pw('TYPE_DRIVER')} />
            <SelectRow label={t.cmdType} param="TYPE_CMD" value={params.TYPE_CMD}
              options={[{ value: 1, label: 'RS485' }, { value: 2, label: 'RF433' }, { value: 3, label: 'Button' }, { value: 4, label: 'All' }]}
              onChange={change} {...pw('TYPE_CMD')} />
            <SelectRow label={t.decelType} param="TYPE_RUN_DECEL" value={params.TYPE_RUN_DECEL}
              options={[{ value: 1, label: 'Hold' }, { value: 2, label: 'Timed' }]}
              onChange={change} {...pw('TYPE_RUN_DECEL')} />
            <StepperRow label={t.decelTime} param="TIME_RUN_DECEL" value={params.TIME_RUN_DECEL} unit="ms" min={100} max={9000} onChange={change} {...pw('TIME_RUN_DECEL')} />
            <SelectRow label={t.photocellMode} param="TYPE_RUN_PHOTOCELL" value={params.TYPE_RUN_PHOTOCELL}
              options={[{ value: 1, label: 'Stop' }, { value: 2, label: 'Reopen' }]}
              onChange={change} {...pw('TYPE_RUN_PHOTOCELL')} />
          </>)}
          {activeTab === 2 && (<>
            <SectionHeader title={t.speedSettings} />
            <StepperRow label={t.closeSpeedParam} param="CLOSE_SPEED" value={params.CLOSE_SPEED} unit="%" min={0} max={95} onChange={change} {...pw('CLOSE_SPEED')} />
            <StepperRow label={t.openSpeedParam} param="OPEN_SPEED" value={params.OPEN_SPEED} unit="%" min={0} max={95} onChange={change} {...pw('OPEN_SPEED')} />
            <StepperRow label={t.closeDecelSpeed} param="CLOSE_DECEL_SPEED" value={params.CLOSE_DECEL_SPEED} unit="%" min={0} max={95} onChange={change} {...pw('CLOSE_DECEL_SPEED')} />
            <StepperRow label={t.openDecelSpeed} param="OPEN_DECEL_SPEED" value={params.OPEN_DECEL_SPEED} unit="%" min={0} max={95} onChange={change} {...pw('OPEN_DECEL_SPEED')} />
            <StepperRow label={t.startCwSpeed} param="SPEED_START_CW" value={params.SPEED_START_CW} unit="%" min={1} max={30} onChange={change} {...pw('SPEED_START_CW')} />
            <StepperRow label={t.startCcwSpeed} param="SPEED_START_CCW" value={params.SPEED_START_CCW} unit="%" min={1} max={30} onChange={change} {...pw('SPEED_START_CCW')} />
            <StepperRow label={t.startCwTime} param="TIME_START_CW" value={params.TIME_START_CW} unit="ms" min={10} max={5000} onChange={change} {...pw('TIME_START_CW')} />
            <StepperRow label={t.startCcwTime} param="TIME_START_CCW" value={params.TIME_START_CCW} unit="ms" min={10} max={5000} onChange={change} {...pw('TIME_START_CCW')} />
          </>)}
          {activeTab === 3 && (<>
            <SectionHeader title={t.switchSettings} />
            {[
              { label: 'Close Limit', param: 'TYPE_SW_CLOSE' },
              { label: 'Open Limit', param: 'TYPE_SW_OPEN' },
              { label: 'Close Decel', param: 'TYPE_SW_CLOSE_DECEL' },
              { label: 'Open Decel', param: 'TYPE_SW_OPEN_DECEL' },
              { label: 'Photocell', param: 'TYPE_SW_PHOTOCELL' },
            ].map(item => (
              <SelectRow key={item.param} label={item.label} param={item.param} value={params[item.param]}
                options={[{ value: 0, label: 'Disable' }, { value: 1, label: 'Wire' }, { value: 2, label: 'Wireless' }]}
                onChange={change} {...pw(item.param)} />
            ))}
          </>)}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', margin: 14, marginBottom: 0, borderRadius: 10, padding: 4, gap: 3 },
  tab: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },
  paramRow: { paddingVertical: 10, borderBottomWidth: 1, gap: 6 },
  paramTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paramInfo: { flex: 1 },
  paramLabel: { fontSize: 12 },
  paramCode: { fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
  paramBtns: { flexDirection: 'row', gap: 6 },
  rwBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5 },
  rwBtnText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  paramControl: { paddingTop: 4 },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  optionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  optionText: { fontSize: 10, fontFamily: 'monospace' },
});
