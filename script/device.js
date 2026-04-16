/* ============================================================
   GERIBAND — Device Page (BLE Pairing & Connection)
   ============================================================ */

const DevicePage = (() => {
  let _scanning = false;

  /* ── Render HTML ──────────────────────────────────────── */
  function render() {
    const connected = BLE.isConnected();
    const devName   = BLE.getDeviceName();

    return `
    <div class="page-header">
      <h2>${i18n.t('dev.title')}</h2>
      <p>${i18n.t('dev.subtitle')}</p>
    </div>

    <!-- Device Status Card -->
    <div class="device-card">
      <div class="ble-icon-wrap">
        <div class="ble-icon-inner ${connected ? 'connected' : ''}" id="dev-ble-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6.5,6.5 17.5,17.5"/>
            <polyline points="17.5,6.5 6.5,17.5"/>
            <path d="M12 3 L12 21"/>
            <path d="M12 3 L18 9"/>
            <path d="M12 3 L6 9"/>
            <path d="M12 21 L18 15"/>
            <path d="M12 21 L6 15"/>
          </svg>
        </div>
      </div>

      <div class="device-name" id="dev-name">${connected ? (devName || 'GeriBand') : i18n.t('dev.defaultName')}</div>
      <div class="device-id" id="dev-id" style="${connected && BLE.isSimMode() ? '' : 'display:none;'}">${connected && BLE.isSimMode() ? i18n.t('dev.demoBadge') : ''}</div>

      <div class="connection-status ${connected ? 'connected' : 'disconnected'}" id="dev-status-badge">
        <div class="connection-status-dot"></div>
        <span id="dev-status-text">${connected ? i18n.t('dev.connected') : i18n.t('dev.disconnected')}</span>
      </div>

      <!-- Device Details (shown when connected) -->
      <div id="dev-details" style="${connected ? '' : 'display:none'}">
        <div class="device-detail-grid" style="grid-template-columns:1fr 1fr;">
          <div class="device-detail-item">
            <div class="device-detail-label">${i18n.t('dev.battery')}</div>
            <div class="device-detail-value" id="dev-battery">–%</div>
          </div>
          <div class="device-detail-item">
            <div class="device-detail-label">${i18n.t('dev.signal')}</div>
            <div class="device-detail-value" id="dev-signal">${i18n.t('common.strong')}</div>
          </div>
        </div>

        <button class="btn btn-danger" id="dev-disconnect-btn" onclick="DevicePage.handleDisconnect()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          ${i18n.t('dev.disconnectBtn')}
        </button>
      </div>

      <!-- Connect Button (shown when disconnected) -->
      <div id="dev-connect-wrap" style="${connected ? 'display:none' : ''}">
        <button class="btn btn-primary" id="dev-scan-btn" onclick="DevicePage.startScan()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          ${i18n.t('dev.scanBtn')}
        </button>
        <button class="btn btn-ghost" onclick="DevicePage.startSimulation()" style="margin-top:10px;font-size:0.82rem;">
          ${i18n.t('dev.simBtn')}
        </button>
      </div>
    </div>

    <!-- Scan Results -->
    <div id="dev-scan-section" style="display:none;margin-bottom:14px;">
      <div class="section-header">
        <span class="section-title">${i18n.isEn() ? 'Scan Results' : 'Hasil Pemindaian'}</span>
        <button class="section-link" onclick="DevicePage.stopScan()">${i18n.isEn() ? 'Stop' : 'Berhenti'}</button>
      </div>
      <div id="dev-scan-list" class="scan-list">
        <div class="loading-wrap">
          <div class="spinner"></div>
          <span>${i18n.isEn() ? 'Searching for GeriBand devices...' : 'Mencari perangkat GeriBand...'}</span>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="neu-card" style="margin-bottom:14px;">
      <div style="margin-bottom:12px;">
        <span class="section-title">${i18n.t('dev.howToTitle')}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${_renderStep(1, i18n.t('dev.step1'), 'blue')}
        ${_renderStep(2, i18n.t('dev.step2'), 'amber')}
        ${_renderStep(3, i18n.t('dev.step3'), 'green')}
        ${_renderStep(4, i18n.t('dev.step4'), 'blue')}
      </div>
    </div>

    <!-- BLE Requirements -->
    <div class="alert-banner info" style="margin-bottom:14px;" id="dev-ble-warn" style="display:none;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <strong>${i18n.t('dev.bleWarnTitle')}</strong>
        <p>${i18n.t('dev.bleWarnDesc')}</p>
      </div>
    </div>
    `;
  }

  /* ── Step Helper ─────────────────────────────────────── */
  function _renderStep(num, text, color) {
    return `
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:26px;height:26px;border-radius:50%;background:var(--${color === 'amber' ? 'accent-light' : (color === 'green' ? 'safe-bg' : 'primary-light')});
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    font-size:0.72rem;font-weight:800;color:var(--${color === 'amber' ? 'accent-dark' : (color === 'green' ? 'safe' : 'primary')});">
          ${num}
        </div>
        <p style="font-size:0.8rem;color:var(--text-muted);line-height:1.5;padding-top:3px;">${text}</p>
      </div>
    `;
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    if (!navigator.bluetooth) {
      const warn = document.getElementById('dev-ble-warn');
      if (warn) warn.style.display = 'flex';
    }
    if (BLE.isConnected()) {
      BLE.readBattery().then(pct => {
        if (pct !== null) {
          const el = document.getElementById('dev-battery');
          if (el) el.textContent = `${pct}%`;
        }
      });
    }
    BLE.onBatteryUpdate = (pct) => {
      const el = document.getElementById('dev-battery');
      if (el) el.textContent = `${pct}%`;
    };
  }

  /* ── Destroy ─────────────────────────────────────────── */
  function destroy() {
    _scanning = false;
  }

  /* ── Start Scan ──────────────────────────────────────── */
  async function startScan() {
    const section = document.getElementById('dev-scan-section');
    if (section) section.style.display = 'block';
    _scanning = true;

    const ok = await BLE.connect();
    if (!ok) {
      _scanning = false;
      if (section) section.style.display = 'none';
    }
  }

  /* ── Stop Scan ───────────────────────────────────────── */
  function stopScan() {
    _scanning = false;
    const section = document.getElementById('dev-scan-section');
    if (section) section.style.display = 'none';
  }

  /* ── Start Simulation ────────────────────────────────── */
  function startSimulation() {
    App.showModal(i18n.t('dev.simTitle'), `
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">
        ${i18n.t('dev.simDesc')}
      </p>
      <div class="alert-banner warning" style="margin-bottom:16px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <p>${i18n.t('dev.simWarn')}</p>
      </div>
      <button class="btn btn-accent" onclick="BLE.startSimulation();App.closeModal();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>
        ${i18n.t('dev.simStart')}
      </button>
      <button class="btn btn-outline" onclick="App.closeModal()">${i18n.t('common.cancel')}</button>
    `);
  }

  /* ── Handle Disconnect ────────────────────────────────── */
  function handleDisconnect() {
    App.showModal(i18n.t('dev.disconnTitle'), `
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">
        ${i18n.t('dev.disconnDesc')}
      </p>
      <button class="btn btn-danger" onclick="BLE.disconnect();App.closeModal();">
        ${i18n.t('dev.disconnConfirm')}
      </button>
      <button class="btn btn-outline" onclick="App.closeModal()">${i18n.t('common.cancel')}</button>
    `);
  }

  /* ── BLE Event Callbacks ─────────────────────────────── */
  function onConnected(deviceName) {
    stopScan();
    const icon   = document.getElementById('dev-ble-icon');
    const badge  = document.getElementById('dev-status-badge');
    const text   = document.getElementById('dev-status-text');
    const name   = document.getElementById('dev-name');
    const id     = document.getElementById('dev-id');
    const details= document.getElementById('dev-details');
    const wrap   = document.getElementById('dev-connect-wrap');
    const modeEl = document.getElementById('dev-mode');

    if (icon)    icon.className   = 'ble-icon-inner connected';
    if (badge)   badge.className  = 'connection-status connected';
    if (text)    text.textContent = i18n.t('dev.connected');
    if (name)    name.textContent = deviceName || 'GeriBand';
    if (id) {
      if (BLE.isSimMode()) { id.style.display = ''; id.textContent = i18n.t('dev.demoBadge'); }
      else                 { id.style.display = 'none'; id.textContent = ''; }
    }
    if (details) details.style.display = '';
    if (wrap)    wrap.style.display    = 'none';
  }

  function onDisconnected() {
    const icon   = document.getElementById('dev-ble-icon');
    const badge  = document.getElementById('dev-status-badge');
    const text   = document.getElementById('dev-status-text');
    const name   = document.getElementById('dev-name');
    const id     = document.getElementById('dev-id');
    const details= document.getElementById('dev-details');
    const wrap   = document.getElementById('dev-connect-wrap');

    if (icon)    icon.className    = 'ble-icon-inner';
    if (badge)   badge.className   = 'connection-status disconnected';
    if (text)    text.textContent  = i18n.t('dev.disconnected');
    if (name)    name.textContent  = i18n.t('dev.defaultName');
    if (id) { id.textContent = ''; id.style.display = 'none'; }
    if (details) details.style.display = 'none';
    if (wrap)    wrap.style.display    = '';
  }

  return { render, init, destroy, startScan, stopScan, startSimulation, handleDisconnect, onConnected, onDisconnected };
})();
