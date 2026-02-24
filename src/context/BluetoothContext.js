import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

// Try to load native bluetooth module
let RNBluetooth = null;
try {
  RNBluetooth = require('react-native-bluetooth-classic').default;
} catch(e) {}

const BluetoothContext = createContext(null);

export function BluetoothProvider({ children }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [pairedDevices, setPairedDevices] = useState([]);
  const [log, setLog] = useState([]);

  const [bmsData, setBmsData]       = useState({ voltage: 0, capacity: 0, current: 0, wattage: 0, temperature: 0 });
  const [driverData, setDriverData] = useState({ voltage: 0, current: 0, wattage: 0, throttle: 0, temperature: 0 });
  const [motorData, setMotorData]   = useState({ phaseCurrent: 0, rpm: 0, temperature: 0 });
  const [inforData, setInforData]   = useState({ firmware: '--', serial: '--', device: '--', odometer: 0, mode: '--', error: '' });
  const [signals, setSignals]       = useState({ closeLimit: false, openLimit: false, closeDecel: false, openDecel: false, photocell: false });

  const readSub = useRef(null);
  const btDevice = useRef(null);
  const readBuffer = useRef('');

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  }, []);

  // ── Parse incoming frame ────────────────────────────────────
  const parseFrame = useCallback((raw) => {
    const line = raw.trim();
    if (!line.startsWith('$')) return;
    addLog(`RX: ${line}`);
    const parts = line.split(',');

    if (line.startsWith('$BMS,G1,') && parts.length >= 7) {
      setBmsData({
        voltage: parseFloat(parts[2]) || 0,
        capacity: parseInt(parts[3]) || 0,
        current: parseFloat(parts[4]) || 0,
        wattage: parseInt(parts[5]) || 0,
        temperature: parseInt(parts[6]) || 0,
      });
    } else if (line.startsWith('$MOTOR,G1,') && parts.length >= 5) {
      setMotorData({ phaseCurrent: parseFloat(parts[2]) || 0, rpm: parseInt(parts[3]) || 0, temperature: parseInt(parts[4]) || 0 });
    } else if (line.startsWith('$DRIVER,G1,') && parts.length >= 7) {
      setDriverData({
        voltage: parseFloat(parts[2]) || 0,
        current: parseFloat(parts[3]) || 0,
        wattage: parseInt(parts[4]) || 0,
        throttle: parseInt(parts[5]) || 0,
        temperature: parseInt(parts[6]) || 0,
      });
    } else if (line.startsWith('$INFOR,G1,') && parts.length >= 5) {
      setInforData(p => ({ ...p, firmware: parts[2] || '--', serial: parts[3] || '--', device: parts[4] || '--' }));
    } else if (line.startsWith('$INFOR,G2,') && parts.length >= 5) {
      setInforData(p => ({ ...p, odometer: parseInt(parts[2]) || 0, mode: parts[3] || '--', error: parts[4] || '' }));
    } else if (line.startsWith('$SIGNAL,') && parts.length >= 6) {
      setSignals({
        closeLimit: parts[1] === '1', openLimit: parts[2] === '1',
        closeDecel: parts[3] === '1', openDecel: parts[4] === '1', photocell: parts[5] === '1',
      });
    } else if (line.startsWith('$APP_READ,') && parts.length >= 3) {
      // Response to read command: $APP_READ,PARAM,VALUE
      addLog(`← ${parts[1]} = ${parts[2]}`);
    }
  }, [addLog]);

  // ── Request Android permissions ─────────────────────────────
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
        const grant = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return grant === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch { return false; }
  };

  // ── Check BT enabled ────────────────────────────────────────
  useEffect(() => {
    if (!RNBluetooth) return;
    RNBluetooth.isBluetoothEnabled()
      .then(enabled => {
        setIsEnabled(enabled);
        if (!enabled) Alert.alert('Bluetooth', 'Vui lòng bật Bluetooth trên thiết bị');
      }).catch(() => {});
  }, []);

  // ── Scan paired devices ─────────────────────────────────────
  const scanPairedDevices = useCallback(async () => {
    setScanning(true);
    if (!RNBluetooth) {
      // Demo mode
      setTimeout(() => {
        setPairedDevices([
          { name: 'HC-05', address: '00:11:22:33:44:55', id: '1' },
          { name: 'HC-05-BARRIER', address: 'AA:BB:CC:DD:EE:FF', id: '2' },
        ]);
        setScanning(false);
        addLog('Demo: tìm thấy 2 thiết bị');
      }, 1500);
      return;
    }
    try {
      const ok = await requestPermissions();
      if (!ok) { Alert.alert('Cần quyền Bluetooth'); setScanning(false); return; }
      const devices = await RNBluetooth.getBondedDevices();
      setPairedDevices(devices || []);
      addLog(`Tìm thấy ${devices?.length || 0} thiết bị đã pair`);
    } catch(e) {
      addLog(`Lỗi scan: ${e.message}`);
      Alert.alert('Lỗi', e.message);
    } finally {
      setScanning(false);
    }
  }, [addLog]);

  // ── Connect ─────────────────────────────────────────────────
  const connectDevice = useCallback(async (device) => {
    addLog(`Đang kết nối ${device.name} (${device.address})...`);
    if (!RNBluetooth) {
      // Demo: simulate connection
      setTimeout(() => {
        setConnectedDevice(device);
        setConnected(true);
        addLog(`✓ Demo kết nối: ${device.name}`);
        // Simulate incoming data
        const sim = setInterval(() => {
          setBmsData(b => ({ ...b, voltage: +(b.voltage || 48.7 + (Math.random()-0.5)*0.3).toFixed(1), current: +(5 + Math.random()*3).toFixed(1) }));
          setDriverData(d => ({ ...d, throttle: Math.round(40 + Math.random()*20) }));
        }, 2000);
        btDevice.current = { _sim: sim };
      }, 1000);
      return true;
    }
    try {
      const dev = await RNBluetooth.connectToDevice(device.address, { delimiter: '\n' });
      btDevice.current = dev;
      setConnectedDevice(device);
      setConnected(true);
      addLog(`✓ Đã kết nối: ${device.name}`);

      // Subscribe to data
      readSub.current = dev.onDataReceived((evt) => {
        // Buffer data until newline
        readBuffer.current += evt.data || '';
        const lines = readBuffer.current.split('\n');
        readBuffer.current = lines.pop(); // keep incomplete
        lines.forEach(l => { if (l.trim()) parseFrame(l); });
      });

      // Request device info
      setTimeout(() => {
        sendCommandRaw('$APP_READ,INFOR_G1\r\n');
        sendCommandRaw('$APP_READ,INFOR_G2\r\n');
      }, 500);

      return true;
    } catch(e) {
      addLog(`✗ Lỗi kết nối: ${e.message}`);
      Alert.alert('Lỗi kết nối', e.message);
      return false;
    }
  }, [addLog, parseFrame]);

  // ── Disconnect ──────────────────────────────────────────────
  const disconnectDevice = useCallback(async () => {
    if (readSub.current) { readSub.current.remove?.(); readSub.current = null; }
    if (btDevice.current?._sim) { clearInterval(btDevice.current._sim); }
    if (RNBluetooth && connectedDevice) {
      try { await RNBluetooth.disconnectFromDevice(connectedDevice.address); } catch {}
    }
    btDevice.current = null;
    setConnected(false);
    setConnectedDevice(null);
    setBmsData({ voltage: 0, capacity: 0, current: 0, wattage: 0, temperature: 0 });
    setDriverData({ voltage: 0, current: 0, wattage: 0, throttle: 0, temperature: 0 });
    setInforData({ firmware: '--', serial: '--', device: '--', odometer: 0, mode: '--', error: '' });
    addLog('Đã ngắt kết nối');
  }, [connectedDevice, addLog]);

  // ── Send raw command ────────────────────────────────────────
  const sendCommandRaw = useCallback(async (frame) => {
    if (!RNBluetooth || !btDevice.current || !connected) return;
    try {
      await RNBluetooth.writeToDevice(connectedDevice.address, frame);
    } catch(e) { addLog(`✗ Gửi lỗi: ${e.message}`); }
  }, [connected, connectedDevice, addLog]);

  // ── Public send command ─────────────────────────────────────
  const sendCommand = useCallback(async (frame) => {
    addLog(`TX: ${frame}`);
    if (!connected) return;
    await sendCommandRaw(frame + '\r\n');
  }, [connected, sendCommandRaw, addLog]);

  const writeParam = useCallback((param, value) => sendCommand(`$APP_WRITE,${param},${value}`), [sendCommand]);
  const readParam  = useCallback((param) => sendCommand(`$APP_READ,${param}`), [sendCommand]);

  return (
    <BluetoothContext.Provider value={{
      isEnabled, connected, connectedDevice, scanning,
      pairedDevices, log,
      bmsData, driverData, motorData, inforData, signals,
      connectDevice, disconnectDevice, scanPairedDevices,
      sendCommand, writeParam, readParam,
    }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export const useBluetooth = () => useContext(BluetoothContext);
