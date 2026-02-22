import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme';

// ─── Status Light ──────────────────────────────────────────────
export function StatusLight({ label, active }) {
  return (
    <View style={styles.lightWrapper}>
      <View style={[styles.light, active ? styles.lightOn : styles.lightOff]} />
      <Text style={styles.lightLabel}>{label}</Text>
    </View>
  );
}

// ─── Data Card ─────────────────────────────────────────────────
export function DataCard({ title, color = Colors.accent, children }) {
  return (
    <View style={[styles.dataCard, { borderTopColor: color }]}>
      <Text style={[styles.dataCardTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Data Row ──────────────────────────────────────────────────
export function DataRow({ label, value, unit = '' }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>
        {value}<Text style={styles.dataUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

// ─── Action Button ─────────────────────────────────────────────
export function ActionBtn({ label, icon, color = Colors.accent, onPress, disabled, size = 'md' }) {
  const [pressed, setPressed] = useState(false);
  const sz = size === 'lg' ? 68 : size === 'sm' ? 44 : 54;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.actionBtn,
        {
          width: sz,
          height: sz,
          borderColor: disabled ? Colors.border : color,
          backgroundColor: pressed ? `${color}30` : `${color}15`,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={[styles.actionIcon, { fontSize: size === 'lg' ? 22 : 18 }]}>{icon}</Text>
      <Text style={[styles.actionLabel, { color: disabled ? Colors.muted : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ────────────────────────────────────────────
export function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Card Container ────────────────────────────────────────────
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Toggle Switch ─────────────────────────────────────────────
export function Toggle({ value, onToggle }) {
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
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => value > min && onChangeValue(value - 1)}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}{unit}</Text>
      <TouchableOpacity
        onPress={() => value < max && onChangeValue(value + 1)}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // StatusLight
  lightWrapper: { alignItems: 'center', gap: 4 },
  light: { width: 14, height: 14, borderRadius: 7 },
  lightOn: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  lightOff: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  lightLabel: {
    fontSize: 8,
    color: Colors.muted,
    fontFamily: 'monospace',
    textAlign: 'center',
    maxWidth: 48,
  },
  // DataCard
  dataCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 2,
    borderRadius: 8,
    padding: 10,
  },
  dataCardTitle: {
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 8,
  },
  // DataRow
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  dataLabel: { fontSize: 10, color: Colors.muted },
  dataValue: { fontSize: 13, color: Colors.text, fontFamily: 'monospace' },
  dataUnit: { fontSize: 9, color: Colors.muted },
  // ActionBtn
  actionBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionIcon: { textAlign: 'center' },
  actionLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  // SectionHeader
  sectionHeader: {
    fontSize: 9,
    color: Colors.muted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 10,
  },
  // Card
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
  },
  // Toggle
  toggle: {
    width: 46,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  toggleThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.white,
  },
  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  stepValue: {
    minWidth: 52,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.accent,
  },
});
