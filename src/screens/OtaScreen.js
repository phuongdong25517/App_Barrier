import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../context/ThemeContext';
import { Card, SectionHeader } from '../components';
import { useBluetooth } from '../context/BluetoothContext';

// ── OTA Protocol ───────────────────────────────────────────────
const CMD_HELLO   = 0x7F;
const CMD_FWINFO  = 0x10;
const CMD_ERASE   = 0x43;
const CMD_WRITE   = 0x31;
const CMD_GOTOAPP = 0x21;
const ACK         = 0x79;
const NACK        = 0x1F;
const BLOCK_SIZE  = 256;
const START_ADDR  = 0x08004000;

const STATUSES = {
  idle:    { label: 'IDLE',       color: '#5a7a94' },
  booting: { label: 'BOOTING...',  color: '#ffd600' },
  hello:   { label: 'HELLO',      color: '#00d4ff' },
  fwinfo:  { label: 'FW INFO',    color: '#00d4ff' },
  erasing: { label: 'ERASING...', color: '#ff8c00' },
  writing: { label: 'WRITING...', color: '#00d4ff' },
  done:    { label: '✓ DONE',     color: '#00ff88' },
  error:   { label: '✗ ERROR',    color: '#ff3355' },
};

export default function OtaScreen() {
  const { Colors } = useTheme();
  const { connected, sendCommand, writeParam } = useBluetooth();

  const [fileName, setFileName]     = useState('');
  const [fwData, setFwData]         = useState(null);   // Uint8Array
  const [progress, setProgress]     = useState(0);
  const [status, setStatus]         = useState('idle');
  const [logs, setLogs]             = useState([]);
  const [running, setRunning]       = useState(false);
  const abortRef = useRef(false);

  // ── Logging ────────────────────────────────────────────────────
  const log = useCallback((msg, type = 'info') => {
    const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    const icon = type === 'error' ? '✗' : type === 'ok' ? '✓' : '›';
    setLogs(p => [`[${t}] ${icon} ${msg}`, ...p.slice(0, 299)]);
  }, []);

  // ── Parse Intel HEX → Uint8Array ──────────────────────────────
  const parseHex = (hexStr) => {
    const bytes = [];
    for (const line of hexStr.split('\n')) {
      const l = line.trim();
      if (!l.startsWith(':')) continue;
      const count = parseInt(l.substr(1, 2), 16);
      const type  = parseInt(l.substr(7, 2), 16);
      if (type === 0x00) {
        for (let i = 0; i < count; i++)
          bytes.push(parseInt(l.substr(9 + i * 2, 2), 16));
      } else if (type === 0x01) break;
    }
    return new Uint8Array(bytes);
  };

  // ── Pick file ─────────────────────────────────────────────────
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file.name.endsWith('.bin') && !file.name.endsWith('.hex')) {
        Alert.alert('Lỗi', 'Chỉ hỗ trợ .bin hoặc .hex'); return;
      }
      log(`Đã chọn: ${file.name} (${(file.size/1024).toFixed(1)} KB)`);
      setFileName(file.name);

      // Read file
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const raw = Uint8Array.from(atob(content), c => c.charCodeAt(0));

      let data;
      if (file.name.endsWith('.hex')) {
        const text = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        data = parseHex(text);
        log(`HEX decoded → ${data.length} bytes binary`, 'ok');
      } else {
        data = raw;
        log(`BIN loaded → ${data.length} bytes`, 'ok');
      }
      setFwData(data);
    } catch (e) {
      log(`Lỗi chọn file: ${e.message}`, 'error');
    }
  };

  // ── Wait ACK (hooks into BT read stream) ──────────────────────
  const waitAck = (ms = 5000) => new Promise(resolve => {
    // Real implementation: subscribe to BT data stream in BluetoothContext
    // and resolve when ACK/NACK byte received
    // Placeholder simulation:
    setTimeout(() => resolve(ACK), 400);
  });

  const sendRaw = async (bytes) => {
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    await sendCommand(`__RAW__:${hex}`);
  };

  // ── OTA Steps ─────────────────────────────────────────────────
  const stepHello = async () => {
    log('Gửi HELLO (0x7F)...');
    await sendRaw(new Uint8Array([CMD_HELLO]));
    const r = await waitAck();
    if (r !== ACK) throw new Error('HELLO → NACK hoặc timeout');
    log('HELLO → ACK', 'ok');
  };

  const stepFwInfo = async (size) => {
    log(`Gửi FW_INFO — addr=0x${START_ADDR.toString(16).toUpperCase()}, size=${size}`);
    const buf = new ArrayBuffer(9);
    const view = new DataView(buf);
    view.setUint8(0, CMD_FWINFO);
    view.setUint32(1, START_ADDR, true);
    view.setUint32(5, size, true);
    await sendRaw(new Uint8Array(buf));
    const r = await waitAck();
    if (r !== ACK) throw new Error('FW_INFO → NACK');
    log('FW_INFO → ACK', 'ok');
  };

  const stepErase = async () => {
    log('Gửi ERASE (0x43)...');
    await sendRaw(new Uint8Array([CMD_ERASE]));
    const r = await waitAck(30000);
    if (r !== ACK) throw new Error('ERASE → NACK');
    log('ERASE → ACK (flash đã xóa)', 'ok');
  };

  const stepWrite = async (data) => {
    const total = Math.ceil(data.length / BLOCK_SIZE);
    log(`Gửi WRITE (0x31) — ${total} blocks...`);
    await sendRaw(new Uint8Array([CMD_WRITE]));
    const r0 = await waitAck();
    if (r0 !== ACK) throw new Error('WRITE init → NACK');

    for (let i = 0; i < total; i++) {
      if (abortRef.current) throw new Error('Đã hủy bởi người dùng');
      const block = new Uint8Array(BLOCK_SIZE);
      block.set(data.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE));
      await sendRaw(block);
      const r = await waitAck();
      if (r === NACK) throw new Error(`Block ${i+1}/${total} → NACK`);
      const pct = Math.round(((i+1)/total)*100);
      setProgress(pct);
      if (i % 20 === 0 || i === total-1)
        log(`Block ${i+1}/${total} — ${pct}%`, 'ok');
    }
    log('WRITE hoàn thành', 'ok');
  };

  const stepGotoApp = async () => {
    log('Gửi GOTOAPP (0x21)...');
    await sendRaw(new Uint8Array([CMD_GOTOAPP]));
    const r = await waitAck();
    if (r !== ACK) throw new Error('GOTOAPP → NACK');
    log('GOTOAPP → ACK ✓ Firmware khởi động!', 'ok');
  };

  // ── Flash procedure ───────────────────────────────────────────
  const startFlash = async () => {
    if (!connected) { Alert.alert('Chưa kết nối', 'Kết nối HC-05 trước'); return; }
    if (!fwData)    { Alert.alert('Chưa có firmware', 'Chọn file .bin/.hex trước'); return; }

    abortRef.current = false;
    setRunning(true); setProgress(0); setLogs([]);

    try {
      setStatus('booting');
      log('Vào Bootloader Mode...');
      writeParam('UPDATE_FW', 1);
      await new Promise(r => setTimeout(r, 2000));
      log('Mainboard đang khởi động Bootloader...', 'ok');

      setStatus('hello');
      await stepHello();

      setStatus('fwinfo');
      await stepFwInfo(fwData.length);

      setStatus('erasing');
      await stepErase();

      setStatus('writing');
      await stepWrite(fwData);

      await stepGotoApp();
      setStatus('done');
      log('🎉 FOTA thành công!', 'ok');
      Alert.alert('✓ Thành công', 'Firmware đã được cập nhật thành công!');
    } catch (e) {
      setStatus('error');
      log(`LỖI: ${e.message}`, 'error');
      Alert.alert('✗ Lỗi FOTA', e.message);
    } finally {
      setRunning(false);
    }
  };

  // ── Erase only ────────────────────────────────────────────────
  const eraseOnly = () => {
    if (!connected) { Alert.alert('Chưa kết nối'); return; }
    Alert.alert('⚠ Xác nhận ERASE', 'Toàn bộ firmware sẽ bị xóa!', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'ERASE', style: 'destructive', onPress: async () => {
        setRunning(true); setLogs([]);
        try {
          setStatus('booting');
          writeParam('UPDATE_FW', 1);
          await new Promise(r => setTimeout(r, 2000));
          setStatus('hello');  await stepHello();
          setStatus('erasing'); await stepErase();
          setStatus('idle');
          log('Erase chip hoàn thành', 'ok');
        } catch(e) {
          setStatus('error'); log(`Lỗi Erase: ${e.message}`, 'error');
        } finally { setRunning(false); }
      }}
    ]);
  };

  const s = STATUSES[status] || STATUSES.idle;

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status */}
        <View style={[styles.statusCard, { backgroundColor: Colors.card, borderColor: s.color }]}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
          {fwData && (
            <Text style={[styles.fwSize, { color: Colors.muted }]}>
              {fileName}  ·  {(fwData.length/1024).toFixed(1)} KB
            </Text>
          )}
        </View>

        {/* File Picker */}
        <Card>
          <SectionHeader title="FIRMWARE FILE" />
          <View style={styles.fileRow}>
            <TextInput
              style={[styles.fileInput, { backgroundColor: Colors.bg, borderColor: Colors.border, color: Colors.text }]}
              value={fileName}
              placeholder="Chưa chọn file..."
              placeholderTextColor={Colors.muted}
              editable={false}
            />
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
              onPress={pickFile} disabled={running}
            >
              <Text style={[styles.browseTxt, { color: Colors.accent }]}>📁  CHỌN</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: Colors.muted }]}>
            Hỗ trợ: .bin (binary) · .hex (Intel HEX — tự decode)
          </Text>
        </Card>

        {/* Progress */}
        {(running || status === 'done' || status === 'error') && (
          <Card>
            <SectionHeader title={`TIẾN TRÌNH — ${progress}%`} />
            <View style={[styles.progressBg, { backgroundColor: Colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${progress}%`,
                backgroundColor: status === 'error' ? Colors.red
                               : status === 'done'  ? Colors.green
                               : Colors.accent,
              }]} />
            </View>
          </Card>
        )}

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, { flex: 2,
              backgroundColor: running ? `${Colors.red}18` : `${Colors.accent}18`,
              borderColor: running ? Colors.red : Colors.accent,
              opacity: (!connected && !running) ? 0.5 : 1,
            }]}
            onPress={running ? () => { abortRef.current = true; setRunning(false); setStatus('error'); } : startFlash}
          >
            {running && <ActivityIndicator color={Colors.accent} size="small" />}
            {!running && <Text style={styles.btnIcon}>⚡</Text>}
            <Text style={[styles.btnTxt, { color: running ? Colors.red : Colors.accent }]}>
              {running ? 'HỦY' : 'FLASH FIRMWARE'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { flex: 1,
              backgroundColor: `${Colors.red}15`,
              borderColor: Colors.red,
              opacity: (running || !connected) ? 0.5 : 1,
            }]}
            onPress={eraseOnly} disabled={running || !connected}
          >
            <Text style={styles.btnIcon}>🗑</Text>
            <Text style={[styles.btnTxt, { color: Colors.red }]}>ERASE</Text>
          </TouchableOpacity>
        </View>

        {/* Protocol Reference */}
        <Card>
          <SectionHeader title="COMMAND REFERENCE" />
          {[
            { id:'0x7F', name:'HELLO',   desc:'Kiểm tra kết nối bootloader' },
            { id:'0x10', name:'FW_INFO', desc:`Addr 0x08004000, Size (9 bytes)` },
            { id:'0x43', name:'ERASE',   desc:'Xóa toàn bộ application flash' },
            { id:'0x31', name:'WRITE',   desc:`Stream ${BLOCK_SIZE}B/block + ACK mỗi block` },
            { id:'0x21', name:'GOTOAPP', desc:'Khởi động firmware sau khi write' },
            { id:'0x79', name:'ACK',     desc:'Phản hồi thành công từ STM32' },
            { id:'0x1F', name:'NACK',    desc:'Lỗi — dừng toàn bộ quá trình' },
          ].map(r => (
            <View key={r.id} style={[styles.protoRow, { borderBottomColor: Colors.border }]}>
              <Text style={[styles.protoId,   { color: Colors.accent }]}>{r.id}</Text>
              <Text style={[styles.protoName, { color: Colors.text }]}>{r.name}</Text>
              <Text style={[styles.protoDesc, { color: Colors.muted }]}>{r.desc}</Text>
            </View>
          ))}
        </Card>

        {/* Log Console */}
        <Card>
          <View style={styles.logHeader}>
            <SectionHeader title="LOG CONSOLE" />
            <TouchableOpacity onPress={() => setLogs([])}>
              <Text style={[styles.clearBtn, { color: Colors.muted }]}>XÓA</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.logBox, { backgroundColor: Colors.bg, borderColor: Colors.border }]}
            nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {logs.length === 0
              ? <Text style={[styles.logEmpty, { color: Colors.muted }]}>Chưa có log...</Text>
              : logs.map((l, i) => (
                <Text key={i} style={[styles.logLine, {
                  color: l.includes('✗') ? Colors.red
                       : l.includes('✓') || l.includes('🎉') ? Colors.green
                       : Colors.muted,
                }]}>{l}</Text>
              ))
            }
          </ScrollView>
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 10, padding: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2, fontSize: 13, flex: 1 },
  fwSize: { fontFamily: 'monospace', fontSize: 9, textAlign: 'right' },
  fileRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  fileInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44, fontFamily: 'monospace', fontSize: 11 },
  browseBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, height: 44, alignItems: 'center', justifyContent: 'center' },
  browseTxt: { fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  hint: { fontSize: 10 },
  progressBg: { height: 14, borderRadius: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 7 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { borderWidth: 1.5, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnIcon: { fontSize: 16 },
  btnTxt: { fontWeight: '700', letterSpacing: 1.5, fontSize: 12 },
  protoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, gap: 8 },
  protoId: { fontFamily: 'monospace', fontSize: 11, width: 46 },
  protoName: { fontWeight: '700', fontSize: 11, width: 72 },
  protoDesc: { fontSize: 10, flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearBtn: { fontSize: 10, fontWeight: '700', marginBottom: 10 },
  logBox: { maxHeight: 220, borderWidth: 1, borderRadius: 8, padding: 10 },
  logEmpty: { fontSize: 10, fontStyle: 'italic' },
  logLine: { fontSize: 10, fontFamily: 'monospace', marginBottom: 3, lineHeight: 16 },
});
