import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator,
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
const TIMEOUT_CMD   = 5000;
const TIMEOUT_ERASE = 30000;
const TIMEOUT_BLOCK = 3000;

const STATUSES = {
  idle:    { label: 'IDLE',       color: '#5a7a94' },
  booting: { label: 'BOOTING...', color: '#ffd600' },
  hello:   { label: 'HELLO',      color: '#00d4ff' },
  fwinfo:  { label: 'FW INFO',    color: '#00d4ff' },
  erasing: { label: 'ERASING...', color: '#ff8c00' },
  writing: { label: 'WRITING...', color: '#00d4ff' },
  done:    { label: '✓ DONE',     color: '#00ff88' },
  error:   { label: '✗ ERROR',    color: '#ff3355' },
};

export default function OtaScreen() {
  const { Colors } = useTheme();
  const {
    connected, connectedDevice,
    sendRawBytes, writeParam,
    setRawByteListener,
    disconnectDevice, connectDeviceOta,
  } = useBluetooth();

  const [fileName, setFileName] = useState('');
  const [fwData,   setFwData]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState('idle');
  const [logs,     setLogs]     = useState([]);
  const [running,  setRunning]  = useState(false);

  const abortRef    = useRef(false);
  const byteQueue   = useRef([]);
  const byteResolve = useRef(null);

  useEffect(() => { return () => { setRawByteListener(null); }; }, []);

  const log = useCallback((msg, type = 'info') => {
    const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    const icon = type === 'error' ? '✗' : type === 'ok' ? '✓' : '›';
    setLogs(p => [`[${t}] ${icon} ${msg}`, ...p.slice(0, 299)]);
  }, []);

  // ── Raw byte mode ──────────────────────────────────────────────
  const activateRawMode = useCallback(() => {
    byteQueue.current = [];
    byteResolve.current = null;
    setRawByteListener((bytes) => {
      // Log mọi byte nhận được để debug
      log(`RX ← ${bytes.map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);
      byteQueue.current.push(...bytes);
      if (byteResolve.current) {
        const resolve = byteResolve.current;
        byteResolve.current = null;
        resolve(byteQueue.current.shift());
      }
    });
  }, [setRawByteListener, log]);

  const deactivateRawMode = useCallback(() => {
    setRawByteListener(null);
    byteQueue.current = [];
    byteResolve.current = null;
  }, [setRawByteListener]);

  // ── Wait 1 byte ────────────────────────────────────────────────
  const waitByte = (timeoutMs = TIMEOUT_CMD) => new Promise((resolve, reject) => {
    if (byteQueue.current.length > 0) {
      resolve(byteQueue.current.shift()); return;
    }
    const timer = setTimeout(() => {
      byteResolve.current = null;
      reject(new Error(`Timeout ${timeoutMs/1000}s — không nhận ACK từ thiết bị`));
    }, timeoutMs);
    byteResolve.current = (byte) => { clearTimeout(timer); resolve(byte); };
  });

  // ── Wait ACK/NACK ──────────────────────────────────────────────
  const waitAck = async (timeoutMs = TIMEOUT_CMD) => {
    const byte = await waitByte(timeoutMs);
    if (byte === ACK)  { log(`ACK ✓ (0x79)`, 'ok'); return; }
    if (byte === NACK) throw new Error(`NACK (0x1F) — thiết bị báo lỗi`);
    throw new Error(`Byte lạ: 0x${byte.toString(16)} (expected ACK=0x79)`);
  };

  // ── Send bytes ─────────────────────────────────────────────────
  const send = async (uint8Array) => {
    const preview = Array.from(uint8Array.slice(0,6))
      .map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ');
    log(`TX → [${preview}${uint8Array.length > 6 ? ` ... ${uint8Array.length}B` : ''}]`);
    const ok = await sendRawBytes(uint8Array);
    if (!ok) throw new Error('Gửi bytes thất bại — kiểm tra kết nối BT');
  };

  // ── Parse Intel HEX ────────────────────────────────────────────
  const parseIntelHex = (hexStr) => {
    const bytes = [];
    for (const line of hexStr.split('\n')) {
      const l = line.trim();
      if (!l.startsWith(':')) continue;
      const count = parseInt(l.substr(1, 2), 16);
      const type  = parseInt(l.substr(7, 2), 16);
      if (type === 0x00)
        for (let i = 0; i < count; i++)
          bytes.push(parseInt(l.substr(9 + i * 2, 2), 16));
      else if (type === 0x01) break;
    }
    if (bytes.length === 0) throw new Error('HEX file không có data');
    return new Uint8Array(bytes);
  };

  // ── Pick file ──────────────────────────────────────────────────
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const isBin = file.name.endsWith('.bin');
      const isHex = file.name.endsWith('.hex');
      if (!isBin && !isHex) { Alert.alert('Sai định dạng', 'Chỉ hỗ trợ .bin hoặc .hex'); return; }

      log(`Đọc: ${file.name} (${(file.size/1024).toFixed(1)} KB)`);
      let data;
      if (isBin) {
        const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        log(`BIN: ${data.length} bytes — gửi thẳng`, 'ok');
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
        data = parseIntelHex(text);
        log(`HEX decoded → ${data.length} bytes`, 'ok');
      }
      setFileName(file.name);
      setFwData(data);
      log(`Sẵn sàng: ${data.length} bytes = ${Math.ceil(data.length/BLOCK_SIZE)} blocks`, 'ok');
    } catch (e) { log(`Lỗi đọc file: ${e.message}`, 'error'); }
  };

  // ── OTA Steps ──────────────────────────────────────────────────
  const stepHello = async () => {
    log('── STEP 1: HELLO (0x7F) ──');
    await send(new Uint8Array([CMD_HELLO]));
    await waitAck(TIMEOUT_CMD);
  };

  const stepFwInfo = async (size) => {
    log(`── STEP 2: FW_INFO — addr=0x${START_ADDR.toString(16).toUpperCase()} size=${size}B ──`);
    const buf = new ArrayBuffer(9);
    const v = new DataView(buf);
    v.setUint8(0, CMD_FWINFO);
    v.setUint32(1, START_ADDR, true);
    v.setUint32(5, size, true);
    await send(new Uint8Array(buf));
    await waitAck(TIMEOUT_CMD);
  };

  const stepErase = async () => {
    log('── STEP 3: ERASE (0x43) ──');
    await send(new Uint8Array([CMD_ERASE]));
    await waitAck(TIMEOUT_ERASE);
  };

  const stepWrite = async (data) => {
    const total = Math.ceil(data.length / BLOCK_SIZE);
    log(`── STEP 4: WRITE (0x31) — ${total} blocks ──`);
    await send(new Uint8Array([CMD_WRITE]));
    await waitAck(TIMEOUT_CMD);
    for (let i = 0; i < total; i++) {
      if (abortRef.current) throw new Error('Đã hủy');
      const block = new Uint8Array(BLOCK_SIZE).fill(0xFF);
      block.set(data.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE));
      await send(block);
      await waitAck(TIMEOUT_BLOCK);
      const pct = Math.round(((i + 1) / total) * 100);
      setProgress(pct);
      if (i % 20 === 0 || i === total - 1) log(`Block ${i+1}/${total} (${pct}%)`, 'ok');
    }
  };

  const stepGotoApp = async () => {
    log('── STEP 5: GOTOAPP (0x21) ──');
    await send(new Uint8Array([CMD_GOTOAPP]));
    await waitAck(TIMEOUT_CMD);
  };

  // ── MAIN FLASH ─────────────────────────────────────────────────
  const startFlash = async () => {
    if (!connected)  { Alert.alert('Chưa kết nối', 'Kết nối HC-05 trước'); return; }
    if (!fwData)     { Alert.alert('Chưa có firmware', 'Chọn file .bin/.hex trước'); return; }

    abortRef.current = false;
    setRunning(true); setProgress(0); setLogs([]);

    try {
      // ── BƯỚC QUAN TRỌNG: ngắt kết nối 9600, kết nối lại 38400 ──
      setStatus('booting');
      log('Gửi lệnh vào Bootloader Mode...');
      writeParam('UPDATE_FW', 1);
      log('Chờ STM32 reboot vào bootloader (2s)...');
      await new Promise(r => setTimeout(r, 2000));

      // Ngắt kết nối cũ (9600 baud)
      log('Ngắt kết nối 9600 baud...');
      await disconnectDevice(true); // true = silent, không clear state
      await new Promise(r => setTimeout(r, 500));

      // Kết nối lại với 38400 baud cho bootloader
      log('Kết nối lại 38400 baud cho bootloader...');
      const ok = await connectDeviceOta(connectedDevice, 38400);
      if (!ok) throw new Error('Không thể kết nối lại ở 38400 baud');
      log('Kết nối bootloader OK', 'ok');
      await new Promise(r => setTimeout(r, 300));

      // Bật raw mode SAU KHI đã kết nối lại
      activateRawMode();

      setStatus('hello');   await stepHello();
      setStatus('fwinfo');  await stepFwInfo(fwData.length);
      setStatus('erasing'); await stepErase();
      setStatus('writing'); await stepWrite(fwData);
                            await stepGotoApp();

      setStatus('done');
      log('🎉 FOTA thành công!', 'ok');
      Alert.alert('✓ Thành công', 'Firmware đã cập nhật!');
    } catch (e) {
      setStatus('error');
      log(`LỖI: ${e.message}`, 'error');
      Alert.alert('✗ Lỗi FOTA', e.message);
    } finally {
      setRunning(false);
      deactivateRawMode();
    }
  };

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
          await disconnectDevice(true);
          await new Promise(r => setTimeout(r, 500));
          const ok = await connectDeviceOta(connectedDevice, 38400);
          if (!ok) throw new Error('Không kết nối được ở 38400 baud');
          activateRawMode();
          setStatus('hello');   await stepHello();
          setStatus('erasing'); await stepErase();
          setStatus('idle');
          log('Erase hoàn thành', 'ok');
        } catch(e) {
          setStatus('error'); log(`Lỗi: ${e.message}`, 'error');
        } finally { setRunning(false); deactivateRawMode(); }
      }}
    ]);
  };

  const s = STATUSES[status] || STATUSES.idle;

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={[styles.statusCard, { backgroundColor: Colors.card, borderColor: s.color }]}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
          {fwData && <Text style={[styles.fwMeta, { color: Colors.muted }]}>
            {(fwData.length/1024).toFixed(1)} KB · {Math.ceil(fwData.length/BLOCK_SIZE)} blocks
          </Text>}
        </View>

        <Card>
          <SectionHeader title="FIRMWARE FILE (.bin / .hex)" />
          <TouchableOpacity
            style={[styles.filePicker, { backgroundColor: Colors.bg, borderColor: fwData ? Colors.green : Colors.border }]}
            onPress={pickFile} disabled={running}>
            <Text style={{ fontSize: 28 }}>{fwData ? '✅' : '📂'}</Text>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileNameTxt, { color: fwData ? Colors.green : Colors.muted }]}>
                {fileName || 'Nhấn để chọn file .bin hoặc .hex...'}
              </Text>
              <Text style={[styles.fileMeta, { color: Colors.muted }]}>
                {fwData
                  ? `${fwData.length} bytes · ${Math.ceil(fwData.length/BLOCK_SIZE)} blocks × ${BLOCK_SIZE}B`
                  : '.bin → gửi thẳng · .hex → tự decode sang binary'}
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {(running || status === 'done' || status === 'error') && (
          <Card>
            <SectionHeader title={`TIẾN TRÌNH — ${progress}%`} />
            <View style={[styles.progressBg, { backgroundColor: Colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${progress}%`,
                backgroundColor: status === 'error' ? Colors.red : status === 'done' ? Colors.green : Colors.accent,
              }]} />
            </View>
            <Text style={[styles.progressTxt, { color: Colors.muted }]}>
              {status === 'erasing' ? 'Đang xóa flash (~10-30s)...'
             : status === 'writing' ? 'Đang ghi firmware...'
             : status === 'done' ? 'Hoàn thành!' : ''}
            </Text>
          </Card>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, { flex: 2,
              backgroundColor: running ? `${Colors.red}18` : `${Colors.accent}18`,
              borderColor: running ? Colors.red : Colors.accent,
              opacity: (!connected && !running) ? 0.4 : 1,
            }]}
            onPress={running ? () => { abortRef.current = true; } : startFlash}>
            {running && <ActivityIndicator color={Colors.accent} size="small" />}
            {!running && <Text style={styles.btnIcon}>⚡</Text>}
            <Text style={[styles.btnTxt, { color: running ? Colors.red : Colors.accent }]}>
              {running ? 'HỦY' : 'FLASH FIRMWARE'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { flex: 1, backgroundColor: `${Colors.red}15`, borderColor: Colors.red, opacity: (running || !connected) ? 0.4 : 1 }]}
            onPress={eraseOnly} disabled={running || !connected}>
            <Text style={styles.btnIcon}>🗑</Text>
            <Text style={[styles.btnTxt, { color: Colors.red }]}>ERASE</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <SectionHeader title="PROTOCOL REFERENCE" />
          {[
            { step:'1', id:'0x7F', name:'HELLO',   desc:'Kiểm tra bootloader sẵn sàng' },
            { step:'2', id:'0x10', name:'FW_INFO', desc:'[CMD][Addr 4B LE][Size 4B LE]' },
            { step:'3', id:'0x43', name:'ERASE',   desc:'Xóa toàn bộ application flash' },
            { step:'4', id:'0x31', name:'WRITE',   desc:`CMD→ACK→[${BLOCK_SIZE}B block]×N→ACK` },
            { step:'5', id:'0x21', name:'GOTOAPP', desc:'Khởi chạy firmware mới' },
          ].map(r => (
            <View key={r.step} style={[styles.protoRow, { borderBottomColor: Colors.border }]}>
              <Text style={[styles.protoStep, { color: Colors.muted }]}>{r.step}</Text>
              <Text style={[styles.protoId,   { color: Colors.accent }]}>{r.id}</Text>
              <Text style={[styles.protoName, { color: Colors.text }]}>{r.name}</Text>
              <Text style={[styles.protoDesc, { color: Colors.muted }]}>{r.desc}</Text>
            </View>
          ))}
          <View style={[styles.ackRow, { backgroundColor: `${Colors.green}12`, borderColor: Colors.border }]}>
            <Text style={[styles.ackTxt, { color: Colors.green }]}>ACK 0x79</Text>
            <Text style={[styles.ackSep, { color: Colors.border }]}>|</Text>
            <Text style={[styles.nackTxt, { color: Colors.red }]}>NACK 0x1F → dừng ngay</Text>
          </View>
          <Text style={[styles.baudNote, { color: Colors.muted, borderColor: Colors.border }]}>
            ⚡ Bootloader baud rate: 38400 · App tự reconnect khi FLASH
          </Text>
        </Card>

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
                  color: l.includes('✗') || l.includes('LỖI') ? Colors.red
                       : l.includes('✓') || l.includes('🎉') ? Colors.green
                       : l.includes('TX →') ? Colors.accent
                       : l.includes('RX ←') ? '#ffd600'
                       : Colors.muted,
                }]}>{l}</Text>
              ))}
          </ScrollView>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12 },
  statusCard: { flexDirection:'row', alignItems:'center', gap:10, borderWidth:1.5, borderRadius:10, padding:12 },
  dot: { width:10, height:10, borderRadius:5 },
  statusLabel: { fontFamily:'monospace', fontWeight:'700', letterSpacing:2, fontSize:13, flex:1 },
  fwMeta: { fontFamily:'monospace', fontSize:9 },
  filePicker: { flexDirection:'row', alignItems:'center', gap:14, borderWidth:1.5, borderRadius:10, padding:16 },
  fileInfo: { flex:1 },
  fileNameTxt: { fontFamily:'monospace', fontSize:11, marginBottom:3 },
  fileMeta: { fontSize:10, lineHeight:15 },
  progressBg: { height:14, borderRadius:7, overflow:'hidden', marginBottom:6 },
  progressFill: { height:'100%', borderRadius:7 },
  progressTxt: { fontSize:10, textAlign:'center' },
  btnRow: { flexDirection:'row', gap:10 },
  btn: { borderWidth:1.5, borderRadius:10, padding:14, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  btnIcon: { fontSize:16 },
  btnTxt: { fontWeight:'700', letterSpacing:1.5, fontSize:12 },
  protoRow: { flexDirection:'row', alignItems:'center', paddingVertical:7, borderBottomWidth:1, gap:6 },
  protoStep: { fontSize:10, width:14 },
  protoId:   { fontFamily:'monospace', fontSize:10, width:44 },
  protoName: { fontWeight:'700', fontSize:10, width:64 },
  protoDesc: { fontSize:9, flex:1 },
  ackRow: { flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderRadius:8, padding:10, marginTop:8 },
  ackTxt:  { fontFamily:'monospace', fontWeight:'700', fontSize:11 },
  ackSep:  { fontSize:16 },
  nackTxt: { fontFamily:'monospace', fontWeight:'700', fontSize:11 },
  baudNote: { fontSize:9, marginTop:8, borderTopWidth:1, paddingTop:8, fontFamily:'monospace' },
  logHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  clearBtn: { fontSize:10, fontWeight:'700', marginBottom:10 },
  logBox: { maxHeight:260, borderWidth:1, borderRadius:8, padding:10 },
  logEmpty: { fontSize:10, fontStyle:'italic' },
  logLine: { fontSize:10, fontFamily:'monospace', marginBottom:3, lineHeight:16 },
});
