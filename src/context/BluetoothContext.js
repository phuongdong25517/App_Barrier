import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

// ── FSC-BT630 Default UUIDs ─────────────────────────────────────
// Service UUID: FFF0  |  Write UUID: FFF2  |  Notify UUID: FFF1
const SERVICE_UUID  = 'FFF0';
const WRITE_UUID    = 'FFF2';
const NOTIFY_UUID   = 'FFF1';

let BleManager = null;
try {
  const { BleManager: BM } = require('react-native-ble-plx');
  BleManager = new BM();
} catch (e) {}

const BluetoothContext = createContext(null);

// ── Base64 helpers ──────────────────────────────────────────────
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i+1] ?? 0, b2 = bytes[i+2] ?? 0;
    const idx0 = b0 >> 2;
    const idx1 = ((b0 & 3) << 4) | (b1 >> 4);
    const idx2 = ((b1 & 0xF) << 2) | (b2 >> 6);
    const idx3 = b2 & 0x3F;
    result += base64Chars[idx0] + base64Chars[idx1];
    result += (i+1 < bytes.length) ? base64Chars[idx2] : '=';
    result += (i+2 < bytes.length) ? base64Chars[idx3] : '=';
  }
  return result;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function BluetoothProvider({ children }) {
  const [isEnabled, setIsEnabled]             = useState(false);
  const [connected, setConnected]             = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scanning, setScanning]               = useState(false);
  const [scannedDevices, setScannedDevices]   = useState([]);
  const [log, setLog]                         = useState([]);

  const [bmsData,    setBmsData]    = useState({ voltage:0, capacity:0, current:0, wattage:0, temperature:0 });
  const [driverData, setDriverData] = useState({ voltage:0, current:0, wattage:0, throttle:0, temperature:0 });
  const [motorData,  setMotorData]  = useState({ phaseCurrent:0, rpm:0, temperature:0 });
  const [inforData,  setInforData]  = useState({ firmware:'--', serial:'--', device:'--', odometer:0, mode:'--', error:'' });
  const [signals,    setSignals]    = useState({ closeLimit:false, openLimit:false, closeDecel:false, openDecel:false, photocell:false });

  const bleDevice        = useRef(null);
  const notifySub        = useRef(null);
  const disconnectSub    = useRef(null);
  const textBuffer       = useRef('');
  const rawByteListener  = useRef(null);
  const scanSub          = useRef(null);

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
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

  // ── Handle incoming BLE notification data ──────────────────────
  const handleIncomingData = useCallback((base64Data) => {
    if (!base64Data) return;

    // Decode base64 → bytes
    const bytes = Array.from(base64ToBytes(base64Data));

    // ── OTA RAW MODE ─────────────────────────────────────────────
    if (rawByteListener.current) {
      if (bytes.length > 0) {
        addLog(`DBG OTA: ${bytes.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
        rawByteListener.current(bytes);
      }
      return;
    }

    // ── NORMAL TEXT MODE ─────────────────────────────────────────
    // Convert bytes → string
    const str = bytes.map(b => String.fromCharCode(b)).join('');
    textBuffer.current += str;
    const lines = textBuffer.current.split('\n');
    textBuffer.current = lines.pop();
    lines.forEach(l => { if (l.trim()) parseTextFrame(l.trim()); });
  }, [parseTextFrame, addLog]);

  // ── BLE state monitor ────────────────────────────────────────
  useEffect(() => {
    if (!BleManager) return;
    const sub = BleManager.onStateChange((state) => {
      setIsEnabled(state === 'PoweredOn');
      if (state === 'PoweredOn') addLog('BLE bật sẵn sàng');
    }, true);
    return () => sub?.remove();
  }, []);

  // ── Request permissions ──────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 31) {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(grants).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return g === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch { return false; }
  };

  // ── Scan BLE devices ─────────────────────────────────────────
  const scanPairedDevices = useCallback(async () => {
    setScanning(true);
    setScannedDevices([]);

    if (!BleManager) {
      // Demo mode
      setTimeout(() => {
        setScannedDevices([{ name:'FSC-BT630', id:'AA:BB:CC:DD:EE:FF' }]);
        setScanning(false);
        addLog('Demo mode — không có BLE thật');
      }, 1500);
      return;
    }

    const ok = await requestPermissions();
    if (!ok) {
      Alert.alert('Cần quyền Bluetooth & Location');
      setScanning(false);
      return;
    }

    const found = new Map();

    try {
      BleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          addLog(`Scan lỗi: ${error.message}`);
          setScanning(false);
          return;
        }
        if (device && device.name) {
          if (!found.has(device.id)) {
            found.set(device.id, device);
            setScannedDevices(Array.from(found.values()));
          }
        }
      });

      // Tự dừng sau 10 giây
      scanSub.current = setTimeout(() => {
        BleManager.stopDeviceScan();
        setScanning(false);
        addLog(`Tìm thấy ${found.size} thiết bị BLE`);
      }, 10000);
    } catch (e) {
      addLog(`Lỗi scan: ${e.message}`);
      setScanning(false);
    }
  }, [addLog]);

  const stopScan = useCallback(() => {
    if (BleManager) BleManager.stopDeviceScan();
    if (scanSub.current) clearTimeout(scanSub.current);
    setScanning(false);
  }, []);

  // ── Connect ──────────────────────────────────────────────────
  const connectDevice = useCallback(async (device) => {
    stopScan();
    addLog(`Đang kết nối BLE: ${device.name}...`);

    if (!BleManager) {
      // Demo mode
      setTimeout(() => {
        bleDevice.current = { _demo: true, id: device.id };
        setConnectedDevice(device);
        setConnected(true);
        addLog(`✓ Demo: ${device.name}`);
      }, 800);
      return true;
    }

    try {
      const dev = await BleManager.connectToDevice(device.id, {
        autoConnect: false,
        requestMTU: 512,
      });

      await dev.discoverAllServicesAndCharacteristics();
      bleDevice.current = dev;
      setConnectedDevice(device);
      setConnected(true);
      addLog(`✓ Kết nối BLE: ${device.name}`);

      // Subscribe notifications (FFF1)
      notifySub.current = dev.monitorCharacteristicForService(
        SERVICE_UUID, NOTIFY_UUID,
        (error, characteristic) => {
          if (error) {
            if (error.errorCode !== 205) { // 205 = subscription cancelled (normal on disconnect)
              addLog(`Notify lỗi: ${error.message}`);
            }
            return;
          }
          if (characteristic?.value) {
            handleIncomingData(characteristic.value);
          }
        }
      );

      // Monitor disconnect
      disconnectSub.current = dev.onDisconnected((error) => {
        addLog('BLE ngắt kết nối');
        setConnected(false);
        setConnectedDevice(null);
        bleDevice.current = null;
        notifySub.current?.remove();
        notifySub.current = null;
      });

      // Request device info
      setTimeout(() => {
        sendCmdRaw('$APP_READ,INFOR_G1\r\n');
        sendCmdRaw('$APP_READ,INFOR_G2\r\n');
      }, 800);

      return true;
    } catch (e) {
      addLog(`✗ Lỗi kết nối BLE: ${e.message}`);
      Alert.alert('Lỗi kết nối BLE', e.message);
      setConnected(false);
      return false;
    }
  }, [addLog, handleIncomingData, stopScan]);

  // ── Disconnect ───────────────────────────────────────────────
  const disconnectDevice = useCallback(async (silent = false) => {
    rawByteListener.current = null;
    notifySub.current?.remove();
    notifySub.current = null;
    disconnectSub.current?.remove();
    disconnectSub.current = null;

    if (BleManager && bleDevice.current && !bleDevice.current._demo) {
      try { await BleManager.cancelDeviceConnection(bleDevice.current.id); } catch {}
    }
    bleDevice.current = null;

    if (!silent) {
      setConnected(false);
      setConnectedDevice(null);
      setBmsData({ voltage:0, capacity:0, current:0, wattage:0, temperature:0 });
      setDriverData({ voltage:0, current:0, wattage:0, throttle:0, temperature:0 });
      setInforData({ firmware:'--', serial:'--', device:'--', odometer:0, mode:'--', error:'' });
      addLog('Đã ngắt kết nối BLE');
    } else {
      addLog('Ngắt kết nối tạm (OTA)...');
    }
  }, [connectedDevice, addLog]);

  // ── Reconnect for OTA ────────────────────────────────────────
  const connectDeviceOta = useCallback(async (device) => {
    if (!device) { addLog('✗ OTA: không có device'); return false; }
    addLog(`Reconnect OTA BLE: ${device.name}...`);

    if (!BleManager || bleDevice.current?._demo) {
      addLog('Demo OTA OK');
      setConnected(true);
      bleDevice.current = { _demo: true, id: device.id };
      return true;
    }

    try {
      const dev = await BleManager.connectToDevice(device.id, { requestMTU: 512 });
      await dev.discoverAllServicesAndCharacteristics();
      bleDevice.current = dev;
      setConnected(true);
      addLog(`✓ OTA BLE connected: ${device.name}`);

      notifySub.current = dev.monitorCharacteristicForService(
        SERVICE_UUID, NOTIFY_UUID,
        (error, characteristic) => {
          if (error) return;
          if (characteristic?.value) handleIncomingData(characteristic.value);
        }
      );
      return true;
    } catch (e) {
      addLog(`✗ OTA BLE lỗi: ${e.message}`);
      setConnected(false);
      return false;
    }
  }, [addLog, handleIncomingData]);

  // ── Write text string via BLE (FFF2) ─────────────────────────
  const sendCmdRaw = useCallback(async (frame) => {
    if (!bleDevice.current || !connected) return;
    if (bleDevice.current._demo) return; // demo: ignore

    try {
      // Convert string → base64
      const bytes = new Uint8Array(frame.length);
      for (let i = 0; i < frame.length; i++) bytes[i] = frame.charCodeAt(i);
      const b64 = bytesToBase64(bytes);

      await BleManager.writeCharacteristicWithResponseForDevice(
        bleDevice.current.id,
        SERVICE_UUID,
        WRITE_UUID,
        b64
      );
    } catch (e) {
      addLog(`✗ BLE TX lỗi: ${e.message}`);
    }
  }, [connected, addLog]);

  // ── Send raw bytes for OTA ───────────────────────────────────
  const sendRawBytes = useCallback(async (uint8Array) => {
    if (!connected) { addLog('✗ sendRawBytes: chưa kết nối'); return false; }
    if (!BleManager || bleDevice.current?._demo) {
      addLog(`TX bytes(demo): ${Array.from(uint8Array).map(b=>'0x'+b.toString(16).padStart(2,'0')).join(' ')}`);
      return true;
    }
    try {
      const b64 = bytesToBase64(uint8Array);
      await BleManager.writeCharacteristicWithoutResponseForDevice(
        bleDevice.current.id,
        SERVICE_UUID,
        WRITE_UUID,
        b64
      );
      return true;
    } catch (e) {
      addLog(`✗ sendRawBytes lỗi: ${e.message}`);
      return false;
    }
  }, [connected, addLog]);

  // ── Public commands ──────────────────────────────────────────
  const sendCommand = useCallback(async (frame) => {
    addLog(`TX: ${frame}`);
    await sendCmdRaw(frame + '\r\n');
  }, [sendCmdRaw, addLog]);

  const writeParam = useCallback((param, value) => sendCommand(`$APP_WRITE,${param},${value}`), [sendCommand]);
  const readParam  = useCallback((param)         => sendCommand(`$APP_READ,${param}`),          [sendCommand]);

  return (
    <BluetoothContext.Provider value={{
      isEnabled, connected, connectedDevice, scanning,
      pairedDevices: scannedDevices,  // giữ tên cũ để không đổi các screen khác
      scannedDevices, log,
      bmsData, driverData, motorData, inforData, signals,
      connectDevice, disconnectDevice, connectDeviceOta,
      scanPairedDevices, stopScan,
      sendCommand, sendRawBytes, writeParam, readParam,
      setRawByteListener,
      // Expose UUIDs cho debug
      SERVICE_UUID, WRITE_UUID, NOTIFY_UUID,
    }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export const useBluetooth = () => useContext(BluetoothContext);
