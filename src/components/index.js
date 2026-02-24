import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ─── Status Light ──────────────────────────────────────────────
export function StatusLight({ label, active }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.lightWrapper}>
      <View style={[
        styles.light,
        { backgroundColor: active ? Colors.green : '#1a1a1a',
          borderColor: active ? Colors.green : '#333',
          shadowColor: active ? Colors.green : 'transparent',
          shadowOpacity: active ? 0.9 : 0,
          shadowRadius: active ? 6 : 0,
          elevation: active ? 4 : 0,
        }
      ]} />
      <Text style={[styles.lightLabel, { color: Colors.muted }]}>{label}</Text>
    </View>
  );
}

// ─── Data Card ─────────────────────────────────────────────────
export function DataCard({ title, color, children }) {
  const { Colors } = useTheme();
  const c = color || Colors.accent;
  return (
    <View style={[styles.dataCard, {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderTopColor: c,
    }]}>
      <Text style={[styles.dataCardTitle, { color: c }]}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Data Row ──────────────────────────────────────────────────
export function DataRow({ label, value, unit = '' }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.dataRow}>
      <Text style={[styles.dataLabel, { color: Colors.muted }]}>{label}</Text>
      <Text style={[styles.dataValue, { color: Colors.text }]}>
        {value}<Text style={[styles.dataUnit, { color: Colors.muted }]}> {unit}</Text>
      </Text>
    </View>
  );
}

// ─── Action Button with Image Icon ─────────────────────────────
export function ActionBtn({ label, iconSource, icon, color, onPress, disabled, size = 'md' }) {
  const { Colors } = useTheme();
  const c = color || Colors.accent;
  const [pressed, setPressed] = useState(false);
  const sz = size === 'lg' ? 72 : size === 'sm' ? 44 : 54;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.actionBtn, {
        width: sz, height: sz,
        borderColor: disabled ? Colors.border : c,
        backgroundColor: pressed ? `${c}40` : `${c}18`,
        opacity: disabled ? 0.4 : 1,
      }]}
    >
      {iconSource ? (
        <Image source={iconSource} style={{ width: size === 'lg' ? 32 : 24, height: size === 'lg' ? 32 : 24 }} resizeMode="contain" />
      ) : (
        <Text style={{ fontSize: size === 'lg' ? 22 : 18, textAlign: 'center' }}>{icon}</Text>
      )}
      <Text style={[styles.actionLabel, { color: disabled ? Colors.muted : c }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ────────────────────────────────────────────
export function SectionHeader({ title }) {
  const { Colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: Colors.muted }]}>{title}</Text>;
}

// ─── Card Container ────────────────────────────────────────────
export function Card({ children, style }) {
  const { Colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }, style]}>
      {children}
    </View>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────
export function Toggle({ value, onToggle }) {
  const { Colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      style={[styles.toggle, { backgroundColor: value ? Colors.accent : Colors.border }]}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleThumb, { left: value ? 22 : 3 }]} />
    </TouchableOpacity>
  );
}

// ─── Number Stepper ────────────────────────────────────────────
export function Stepper({ value, min, max, onChangeValue, unit = '' }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => value > min && onChangeValue(value - 1)}
        style={[styles.stepBtn, { backgroundColor: Colors.border }]}
      >
        <Text style={[styles.stepBtnText, { color: Colors.text }]}>−</Text>
      </TouchableOpacity>
      <Text style={[styles.stepValue, { color: Colors.accent }]}>{value}{unit}</Text>
      <TouchableOpacity
        onPress={() => value < max && onChangeValue(value + 1)}
        style={[styles.stepBtn, { backgroundColor: Colors.border }]}
      >
        <Text style={[styles.stepBtnText, { color: Colors.text }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  lightWrapper: { alignItems: 'center', gap: 4 },
  light: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  lightLabel: { fontSize: 8, fontFamily: 'monospace', textAlign: 'center', maxWidth: 48 },
  dataCard: { flex: 1, borderWidth: 1, borderTopWidth: 2, borderRadius: 8, padding: 10 },
  dataCardTitle: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  dataLabel: { fontSize: 10 },
  dataValue: { fontSize: 13, fontFamily: 'monospace' },
  dataUnit: { fontSize: 9 },
  actionBtn: { borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  sectionHeader: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 10, padding: 14 },
  toggle: { width: 46, height: 24, borderRadius: 12, position: 'relative', justifyContent: 'center' },
  toggleThumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '600' },
  stepValue: { minWidth: 52, textAlign: 'center', fontFamily: 'monospace', fontSize: 13 },
});
