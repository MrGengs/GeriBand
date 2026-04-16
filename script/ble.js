/* ============================================================
   GERIBAND — BLE Manager
   Web Bluetooth API wrapper for ESP32 + MPU6050 GeriBand device
   ============================================================ */

const BLE = (() => {

  /* ── UUIDs (match ESP32 firmware) ────────────────────── */
  const SERVICE_UUID     = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const FALL_CHAR_UUID   = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
  const SENSOR_CHAR_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';
  const BATT_CHAR_UUID   = '00002a19-0000-1000-8000-00805f9b34fb';

  /* ── State ─────────────────────────────────────────────── */
  let device         = null;
  let server         = null;
  let fallChar       = null;
  let sensorChar     = null;
  let battChar       = null;
  let reconnectTimer = null;
  let isConnecting   = false;
  let _simMode       = false;
  let _simInterval   = null;

  /* ── Public callbacks (set by app.js) ─────────────────── */
  let onFallDetected  = null;
  let onStanding      = null;
  let onSensorData    = null;
  let onConnected     = null;
  let onDisconnected  = null;
  let onConnecting    = null;
  let onBatteryUpdate = null;

  /* ── State getters ────────────────────────────────────── */
  function isConnected() {
    return device && device.gatt && device.gatt.connected;
  }

  function getDeviceName() {
    return device ? (device.name || 'GeriBand Device') : null;
  }

  function getDeviceId() {
    return device ? device.id : null;
  }

  /* ── Connect ──────────────────────────────────────────── */
  async function connect() {
    if (!navigator.bluetooth) {
      App.showToast('BLE Tidak Didukung', 'Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge.', 'warning', 6000);
      return false;
    }
    if (isConnecting) return false;
    if (isConnected())  { disconnect(); return false; }

    isConnecting = true;
    if (onConnecting) onConnecting();

    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'GeriBand' },
          { namePrefix: 'GB-' },
          { services: [SERVICE_UUID] },
        ],
        optionalServices: [SERVICE_UUID, 'battery_service'],
      });

      device.addEventListener('gattserverdisconnected', _onGattDisconnected);
      await _connectGatt();
      return true;

    } catch (err) {
      isConnecting = false;
      if (err.name !== 'NotFoundError' && err.name !== 'NotAllowedError') {
        App.showToast('Gagal Terhubung', err.message, 'danger');
      }
      if (onDisconnected) onDisconnected();
      return false;
    }
  }

  /* ── Internal GATT connect ─────────────────────────────── */
  async function _connectGatt() {
    try {
      server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);

      // Fall Detection Characteristic
      try {
        fallChar = await service.getCharacteristic(FALL_CHAR_UUID);
        await fallChar.startNotifications();
        fallChar.addEventListener('characteristicvaluechanged', _onFallData);
      } catch (e) { console.warn('[BLE] Fall char unavailable:', e.message); }

      // Sensor Data Characteristic
      try {
        sensorChar = await service.getCharacteristic(SENSOR_CHAR_UUID);
        await sensorChar.startNotifications();
        sensorChar.addEventListener('characteristicvaluechanged', _onSensorData);
      } catch (e) { console.warn('[BLE] Sensor char unavailable:', e.message); }

      // Battery (optional)
      try {
        const battService = await server.getPrimaryService('battery_service');
        battChar = await battService.getCharacteristic('battery_level');
        battChar.addEventListener('characteristicvaluechanged', _onBattData);
        await battChar.startNotifications();
        const val = await battChar.readValue();
        if (onBatteryUpdate) onBatteryUpdate(val.getUint8(0));
      } catch (e) { /* Battery service optional */ }

      isConnecting = false;
      if (onConnected) onConnected(device.name || 'GeriBand');
      console.log('[BLE] Connected to', device.name);

    } catch (err) {
      isConnecting = false;
      console.error('[BLE] GATT connect error:', err);
      if (onDisconnected) onDisconnected();
      throw err;
    }
  }

  /* ── Disconnect ────────────────────────────────────────── */
  function disconnect() {
    clearTimeout(reconnectTimer);
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
    device = server = fallChar = sensorChar = battChar = null;
    if (onDisconnected) onDisconnected();
  }

  /* ── GATT Disconnected Handler ─────────────────────────── */
  function _onGattDisconnected() {
    console.warn('[BLE] GATT disconnected');
    if (onDisconnected) onDisconnected();
    const settings = Storage.getSettings();
    if (settings.autoConnect && device) {
      console.log('[BLE] Auto-reconnect in 3s...');
      reconnectTimer = setTimeout(() => {
        if (device && !isConnected()) {
          if (onConnecting) onConnecting();
          _connectGatt().catch(() => {});
        }
      }, 3000);
    }
  }

  /* ── Data Parsers ─────────────────────────────────────── */
  function _onFallData(event) {
    const value = event.target.value;
    const raw   = new TextDecoder().decode(value);
    let data;
    try { data = JSON.parse(raw); } catch { data = { status: raw.trim() }; }

    if (data.status === 'fall' || data.status === 'fallen' || data.fall === true) {
      if (onFallDetected) onFallDetected(data);
    } else if (data.status === 'standing' || data.status === 'normal') {
      if (onStanding) onStanding(data);
    }
  }

  function _onSensorData(event) {
    const value = event.target.value;
    const raw   = new TextDecoder().decode(value);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      // fallback: raw bytes (AccX, AccY, AccZ as int16 * 100)
      if (value.byteLength >= 6) {
        data = {
          ax: value.getInt16(0, true) / 100,
          ay: value.getInt16(2, true) / 100,
          az: value.getInt16(4, true) / 100,
        };
        if (value.byteLength >= 12) {
          data.gx = value.getInt16(6,  true) / 100;
          data.gy = value.getInt16(8,  true) / 100;
          data.gz = value.getInt16(10, true) / 100;
        }
      }
    }
    if (data && onSensorData) onSensorData(data);
  }

  function _onBattData(event) {
    const level = event.target.value.getUint8(0);
    if (onBatteryUpdate) onBatteryUpdate(level);
  }

  /* ── Read Battery (on demand) ────────────────────────── */
  async function readBattery() {
    if (!battChar) return null;
    try {
      const val = await battChar.readValue();
      return val.getUint8(0);
    } catch { return null; }
  }

  /* ── Simulation Mode (for demo/testing without hardware) ─ */
  function startSimulation() {
    _simMode = true;
    let standing = true;
    let t = 0;

    // Fake device
    device = { name: 'GeriBand-SIM', id: 'SIM-001', gatt: { connected: true, disconnect: stopSimulation } };
    if (onConnected) onConnected('GeriBand-SIM');

    _simInterval = setInterval(() => {
      t++;
      const angle = standing ? (5 + Math.sin(t * 0.3) * 8) : (85 + Math.sin(t * 0.5) * 5);
      const noise = () => (Math.random() - 0.5) * 0.2;
      const data = {
        ax: noise() + (standing ? 0.1 : 0.9),
        ay: noise() + (standing ? 0.1 : 0.1),
        az: noise() + (standing ? 0.9 : 0.1),
        gx: noise() * 2,
        gy: noise() * 2,
        gz: noise() * 2,
        angle: angle,
        status: standing ? 'standing' : 'fall',
        battery: 78,
      };
      if (onSensorData) onSensorData(data);

      // Simulate fall every 30s
      if (t % 150 === 0 && standing) {
        standing = false;
        if (onFallDetected) onFallDetected({ ...data, status: 'fall' });
        setTimeout(() => { standing = true; if (onStanding) onStanding({ ...data, status: 'standing' }); }, 8000);
      }
    }, 200);
  }

  function stopSimulation() {
    clearInterval(_simInterval);
    _simMode = false;
    device = null;
    if (onDisconnected) onDisconnected();
  }

  function isSimMode() { return _simMode; }

  /* ── Public API ─────────────────────────────────────────── */
  return {
    connect,
    disconnect,
    isConnected,
    getDeviceName,
    getDeviceId,
    readBattery,
    startSimulation,
    stopSimulation,
    isSimMode,
    // Callbacks
    set onFallDetected(fn)  { onFallDetected = fn; },
    set onStanding(fn)      { onStanding = fn; },
    set onSensorData(fn)    { onSensorData = fn; },
    set onConnected(fn)     { onConnected = fn; },
    set onDisconnected(fn)  { onDisconnected = fn; },
    set onConnecting(fn)    { onConnecting = fn; },
    set onBatteryUpdate(fn) { onBatteryUpdate = fn; },
  };
})();
