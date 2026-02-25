import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

let RNBluetooth = null;
try { RNBluetooth = require('react-native-bluetooth-classic').default; } catch(e) {}

const BluetoothContext = createContext(null);

export function BluetoothProvider({ children }) {
  const [isEnabled, setIsEnabled]         = useState(false);
  const [connected, setConnected]         = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scanning, setScanning]           = useState(false);
  const [pairedDevices, setPairedDevices] = useState([]);
  const [log, setLog]                     = useState([]);

  const [bmsData,    setBmsData]    = useState({ voltage:0, capacity:0, current:0, wattage:0, temperature:0 });
  const [driverData, setDriverData] = useState({ voltage:0, current:0, wattage:0, throttle:0, temperature:0 });
  const [motorData,  setMotorData]  = useState({ phaseCurrent:0, rpm:0, temperature:0 });
  const [inforData,  setInforData]  = useState({ firmware:'--', serial:'--', device:'--', odometer:0, mode:'--', error:'' });
  const [signals,    setSignals]    = useState({ closeLimit:false, openLimit:false, closeDecel:false, openDecel:false, photocell:false });

  const readSub          = useRef(null);
  const btDevice         = useRef(null);
  const textBuffer       = useRef('');
  // OTA registers this callback to receive raw bytes from device
  const rawByteListener  = useRef(null);

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12:false });
    setLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  }, []);

  const setRawByteListener = useCallback((fn) => {
    rawByteListener.current = fn;
  }, []);

  // ── Parse text frame ($BMS, $DRIVER...) ────────────────────────
  const parseTextFrame = useCallback((line) => {
    if (!line.startsWith('$')) return;
    const parts = line.split(',');
    if (line.startsWith('$BMS,G1,') && parts.length >= 7) {
      setBmsData({ voltage:parseFloat(parts[2])||0, capacity:parseInt(parts[3])||0, current:parseFloat(parts[4])||0, wattage:parseInt(parts[5])||0, temperature:parseInt(parts[6])||0 });
    } else if (line.startsWith('$DRIVER,G1,') && parts.length >= 7) {
      setDriverData({ voltage:parseFloat(parts[2])||0, current:parseFloat(parts[3])||0, wattage:parseInt(parts[4])||0, throttle:parseInt(parts[5])||0, temperature:parseInt(parts[6])||0 });
    } else if (line.startsWith('$MOTOR,G1,') && parts.length >= 5) {
      setMotorData({ phaseCurrent:parseFloat(parts[2])||0, rpm:parseInt(parts[3])||0, temperature:parseInt(parts[4])||0 });
    } else if (line.startsWith('$INFOR,G1,') && parts.length >= 5) {
      setInforData(p => ({ ...p, firmware:parts[2]||'--', serial:parts[3]||'--', device:parts[4]||'--' }));
    } else if (line.startsWith('$INFOR,G2,') && parts.length >= 5) {
      setInforData(p => ({ ...p, odometer:parseInt(parts[2])||0, mode:parts[3]||'--', error:parts[4]||'' }));
    } else if (line.startsWith('$SIGNAL,') && parts.length >= 6) {
      setSignals({ closeLimit:parts[1]==='1', openLimit:parts[2]==='1', closeDecel:parts[3]==='1', openDecel:parts[4]==='1', photocell:parts[5]==='1' });
    }
  }, []);

  // ── Central data handler ────────────────────────────────────────
  // react-native-bluetooth-classic evt.data format depends on library version:
  //   v1.73.x: string where each char = 1 raw byte (charCodeAt = byte value)
  //   some builds: base64 encoded string
  //   some builds: object { data: string }
  const handleIncomingData = useCallback((raw) => {
    if (raw === null || raw === undefined || raw === '') return;

    // Log raw input for debugging
    addLog(`DBG RX type=${typeof raw} | ${JSON.stringify(raw).slice(0, 80)}`);

    // Extract string content from whatever format
    let str = '';
    if (typeof raw === 'string') {
      str = raw;
    } else if (typeof raw === 'object') {
      // Some versions wrap data in object
      str = String(raw.data ?? raw.message ?? raw.value ?? '');
    }

    // Convert string → byte array: each char's charCode = the raw byte
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }

    // ── OTA RAW MODE: forward bytes directly to OTA listener ─────
    if (rawByteListener.current) {
      if (bytes.length > 0) {
        addLog(`DBG OTA bytes: ${bytes.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
        rawByteListener.current(bytes);
      }
      return; // do NOT parse as text during OTA
    }

    // ── NORMAL TEXT MODE ─────────────────────────────────────────
    textBuffer.current += str;
    const lines = textBuffer.current.split('\n');
    textBuffer.current = lines.pop(); // keep incomplete last line
    lines.forEach(l => { if (l.trim()) parseTextFrame(l.trim()); });
  }, [parseTextFrame, addLog]);

  // ── BT enabled check ────────────────────────────────────────────
  useEffect(() => {
    if (!RNBluetooth) return;
    RNBluetooth.isBluetoothEnabled().then(setIsEnabled).catch(() => {});
  }, []);

  // ── Permissions ─────────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 31) {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        return Object.values(grants).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return g === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch { return false; }
  };

  // ── Scan paired devices ─────────────────────────────────────────
  const scanPairedDevices = useCallback(async () => {
    setScanning(true);
    if (!RNBluetooth) {
      setTimeout(() => {
        setPairedDevices([{ name:'HC-05', address:'00:11:22:33:44:55', id:'1' }]);
        setScanning(false);
        addLog('Demo mode — không có BT thật');
      }, 1000);
      return;
    }
    try {
      const ok = await requestPermissions();
      if (!ok) { Alert.alert('Cần quyền Bluetooth'); setScanning(false); return; }
      const devices = await RNBluetooth.getBondedDevices();
      setPairedDevices(devices || []);
      addLog(`Tìm thấy ${devices?.length||0} thiết bị đã pair`);
    } catch(e) {
      addLog(`Lỗi scan: ${e.message}`);
    } finally { setScanning(false); }
  }, [addLog]);

  // ── Connect ─────────────────────────────────────────────────────
  const connectDevice = useCallback(async (device) => {
    addLog(`Đang kết nối ${device.name}...`);
    if (!RNBluetooth) {
      // Demo mode only — no fake ACK for OTA
      setTimeout(() => {
        setConnectedDevice(device);
        setConnected(true);
        addLog(`✓ Demo: ${device.name}`);
        btDevice.current = { _demo: true };
      }, 800);
      return true;
    }
    try {
      // Connect with no delimiter — we handle framing manually
      // NO delimiter — we handle framing manually
      // Using delimiter:'\n' would block ACK bytes (0x79) since they have no newline
      const dev = await RNBluetooth.connectToDevice(device.address, {
        delimiter: '',  // empty = callback fires for every chunk, no buffering
      });
      btDevice.current = dev;
      setConnectedDevice(device);
      setConnected(true);
      addLog(`✓ Kết nối: ${device.name}`);

      // Single subscription — pass full evt for format detection
      readSub.current = dev.onDataReceived((evt) => {
        // Pass evt.data — but also log full evt for debugging
        handleIncomingData(evt?.data ?? evt ?? '');
      });

      // Request device info after connect
      setTimeout(() => {
        sendCmdRaw('$APP_READ,INFOR_G1\r\n');
        sendCmdRaw('$APP_READ,INFOR_G2\r\n');
      }, 600);
      return true;
    } catch(e) {
      addLog(`✗ Lỗi kết nối: ${e.message}`);
      Alert.alert('Lỗi kết nối', e.message);
      return false;
    }
  }, [addLog, handleIncomingData]);

  // ── Disconnect ──────────────────────────────────────────────────
  const disconnectDevice = useCallback(async () => {
    rawByteListener.current = null;
    if (readSub.current) { readSub.current.remove?.(); readSub.current = null; }
    if (btDevice.current?._sim) clearInterval(btDevice.current._sim);
    if (RNBluetooth && connectedDevice) {
      try { await RNBluetooth.disconnectFromDevice(connectedDevice.address); } catch {}
    }
    btDevice.current = null;
    setConnected(false);
    setConnectedDevice(null);
    setBmsData({ voltage:0, capacity:0, current:0, wattage:0, temperature:0 });
    setDriverData({ voltage:0, current:0, wattage:0, throttle:0, temperature:0 });
    setInforData({ firmware:'--', serial:'--', device:'--', odometer:0, mode:'--', error:'' });
    addLog('Đã ngắt kết nối');
  }, [connectedDevice, addLog]);

  // ── Send raw text string (normal commands) ──────────────────────
  const sendCmdRaw = useCallback(async (frame) => {
    if (!RNBluetooth || !btDevice.current || !connected) return;
    try { await RNBluetooth.writeToDevice(connectedDevice.address, frame); }
    catch(e) { addLog(`✗ TX lỗi: ${e.message}`); }
  }, [connected, connectedDevice, addLog]);

  // ── Send raw bytes for OTA ──────────────────────────────────────
  // react-native-bluetooth-classic writeToDevice accepts a string
  // We convert each byte → char and send as binary string
  const sendRawBytes = useCallback(async (uint8Array) => {
    if (!connected) { addLog('✗ sendRawBytes: chưa kết nối'); return false; }

    if (!RNBluetooth || !btDevice.current || btDevice.current._demo) {
      // Demo mode — just log, no fake ACK
      addLog(`TX bytes(demo): ${Array.from(uint8Array).map(b=>'0x'+b.toString(16).padStart(2,'0')).join(' ')}`);
      return true;
    }

    try {
      // Convert Uint8Array → binary string (char per byte)
      // This is the correct way to send raw bytes via RNBluetoothClassic
      let binaryStr = '';
      uint8Array.forEach(b => { binaryStr += String.fromCharCode(b); });
      await RNBluetooth.writeToDevice(connectedDevice.address, binaryStr);
      return true;
    } catch(e) {
      addLog(`✗ sendRawBytes lỗi: ${e.message}`);
      return false;
    }
  }, [connected, connectedDevice, addLog]);

  // ── Public text command ─────────────────────────────────────────
  const sendCommand = useCallback(async (frame) => {
    addLog(`TX: ${frame}`);
    await sendCmdRaw(frame + '\r\n');
  }, [sendCmdRaw, addLog]);

  const writeParam = useCallback((param, value) => sendCommand(`$APP_WRITE,${param},${value}`), [sendCommand]);
  const readParam  = useCallback((param)         => sendCommand(`$APP_READ,${param}`),          [sendCommand]);

  return (
    <BluetoothContext.Provider value={{
      isEnabled, connected, connectedDevice, scanning,
      pairedDevices, log,
      bmsData, driverData, motorData, inforData, signals,
      connectDevice, disconnectDevice, scanPairedDevices,
      sendCommand, sendRawBytes, writeParam, readParam,
      setRawByteListener,
    }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export const useBluetooth = () => useContext(BluetoothContext);
