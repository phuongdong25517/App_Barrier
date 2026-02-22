import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';

// NOTE: react-native-bluetooth-classic được tích hợp sau khi app build thành công.
// Hiện tại dùng mock để test UI và luồng kết nối.

const BluetoothContext = createContext(null);

export function BluetoothProvider({ children }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [pairedDevices, setPairedDevices] = useState([]);
  const [log, setLog] = useState([]);

  const [bmsData, setBmsData] = useState({ voltage: 48.7, capacity: 92, current: 12.5, wattage: 1460, temperature: 36 });
  const [driverData, setDriverData] = useState({ voltage: 48.5, current: 28.5, wattage: 3280, throttle: 50, temperature: 40 });
  const [motorData, setMotorData] = useState({ phaseCurrent: 16.7, rpm: 1420, temperature: 36 });
  const [inforData, setInforData] = useState({ firmware: '1.0.2', serial: 'JK8839421', device: 'BARRIER', odometer: 1000, mode: 'Normal', error: '' });
  const [signals, setSignals] = useState({
    closeLimit: false, openLimit: true, closeDecel: false, openDecel: false, photocell: false
  });

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  }, []);

  // Simulate live data when connected
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setBmsData(b => ({
        ...b,
        voltage: +(b.voltage + (Math.random() - 0.5) * 0.2).toFixed(1),
        current: +(b.current + (Math.random() - 0.5) * 0.5).toFixed(1),
      }));
      setDriverData(d => ({
        ...d,
        throttle: Math.max(0, Math.min(100, d.throttle + Math.round((Math.random() - 0.5) * 4))),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [connected]);

  const scanPairedDevices = useCallback(async () => {
    setScanning(true);
    setTimeout(() => {
      setPairedDevices([
        { name: 'HC-05', address: '00:11:22:33:44:55', id: '1' },
        { name: 'HC-05-BARRIER', address: 'AA:BB:CC:DD:EE:FF', id: '2' },
        { name: 'SPP-DEVICE', address: '11:22:33:44:55:66', id: '3' },
      ]);
      setScanning(false);
      addLog('Scan hoàn tất — tìm thấy 3 thiết bị (demo)');
    }, 2000);
  }, [addLog]);

  const connectDevice = useCallback(async (device) => {
    addLog(`Đang kết nối ${device.name}...`);
    setTimeout(() => {
      setConnectedDevice(device);
      setConnected(true);
      addLog(`✓ Đã kết nối: ${device.name} (${device.address})`);
    }, 1500);
    return true;
  }, [addLog]);

  const disconnectDevice = useCallback(async () => {
    setConnected(false);
    setConnectedDevice(null);
    addLog('Đã ngắt kết nối');
  }, [addLog]);

  const sendCommand = useCallback(async (frame) => {
    addLog(`TX: ${frame}`);
  }, [addLog]);

  const writeParam = useCallback((param, value) => {
    sendCommand(`$APP_WRITE,${param},${value}`);
  }, [sendCommand]);

  const readParam = useCallback((param) => {
    sendCommand(`$APP_READ,${param}`);
  }, [sendCommand]);

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
