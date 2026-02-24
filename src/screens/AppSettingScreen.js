import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, DataRow, Toggle } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

export default function AppSettingScreen() {
  const { Colors, isDark, setIsDark } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { connected, inforData, writeParam } = useBluetooth();

  const handleMainLock = () => {
    Alert.alert(t.confirmLock, t.confirmLockMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.confirm, style: 'destructive', onPress: () => writeParam('MAINLOCK', 1) },
    ]);
  };

  const handleResetFactory = () => {
    Alert.alert('⚠ Reset', t.confirmReset, [
      { text: t.cancel, style: 'cancel' },
      { text: t.reset, style: 'destructive', onPress: () => writeParam('RESET_FACTORY', 1) },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.bg }]} contentContainerStyle={styles.content}>

      {/* App Info */}
      <Card>
        <Text style={[styles.sh, { color: Colors.muted }]}>{t.appInfo}</Text>
        <DataRow label={t.appVersion} value="1.0.0" />
        <DataRow label={t.protocol} value="BT Classic HC-05" />
        <DataRow label={t.baudRate} value="9600" unit="bps" />
      </Card>

      {/* Device Info */}
      <Card>
        <Text style={[styles.sh, { color: Colors.muted }]}>{t.deviceInfo}</Text>
        <DataRow label={t.firmware} value={inforData.firmware} />
        <DataRow label="Serial" value={inforData.serial} />
        <DataRow label="Device" value={inforData.device} />
        <DataRow label={t.odometer} value={inforData.odometer} unit="h" />
        <DataRow label={t.mode} value={inforData.mode} />
        {inforData.error ? <DataRow label={t.error} value={inforData.error} /> : null}
      </Card>

      {/* Language Toggle */}
      <Card>
        <Text style={[styles.sh, { color: Colors.muted }]}>{t.language}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            onPress={() => setLang('vi')}
            style={[styles.langBtn, {
              backgroundColor: lang === 'vi' ? `${Colors.accent}22` : Colors.border,
              borderColor: lang === 'vi' ? Colors.accent : 'transparent',
            }]}
          >
            <Text style={[styles.langBtnText, { color: lang === 'vi' ? Colors.accent : Colors.muted }]}>
              🇻🇳  Tiếng Việt
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLang('en')}
            style={[styles.langBtn, {
              backgroundColor: lang === 'en' ? `${Colors.accent}22` : Colors.border,
              borderColor: lang === 'en' ? Colors.accent : 'transparent',
            }]}
          >
            <Text style={[styles.langBtnText, { color: lang === 'en' ? Colors.accent : Colors.muted }]}>
              🇬🇧  English
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Display */}
      <Card>
        <Text style={[styles.sh, { color: Colors.muted }]}>{t.displaySettings}</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={[styles.settingLabel, { color: Colors.text }]}>{t.darkMode}</Text>
            <Text style={[styles.settingHint, { color: Colors.muted }]}>
              {isDark ? t.darkOn : t.darkOff}
            </Text>
          </View>
          <Toggle value={isDark} onToggle={setIsDark} />
        </View>
      </Card>

      {/* System */}
      <Card>
        <Text style={[styles.sh, { color: Colors.muted }]}>{t.system}</Text>
        <TouchableOpacity style={[styles.sysBtn, { backgroundColor: Colors.border }]} onPress={handleResetFactory}>
          <Text style={[styles.sysBtnText, { color: Colors.muted }]}>{t.resetFactory}</Text>
        </TouchableOpacity>
      </Card>

      {/* Main Lock */}
      <View style={[styles.lockCard, { borderColor: Colors.red, backgroundColor: `${Colors.red}0d` }]}>
        <Text style={[styles.sh, { color: Colors.red }]}>{t.mainLock}</Text>
        <Text style={[styles.lockDesc, { color: Colors.muted }]}>{t.mainLockDesc}</Text>
        <TouchableOpacity
          style={[styles.lockBtn, {
            backgroundColor: connected ? `${Colors.red}22` : Colors.card,
            borderColor: connected ? Colors.red : Colors.border,
          }]}
          onPress={connected ? handleMainLock : () => Alert.alert(t.notConnectedAlert, t.connectFirst)}
        >
          <Text style={[styles.lockBtnText, { color: connected ? Colors.red : Colors.muted }]}>
            {t.mainLockBtn}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12 },
  sh: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 12, alignItems: 'center' },
  langBtnText: { fontSize: 13, fontWeight: '600' },
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
