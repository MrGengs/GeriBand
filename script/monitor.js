/* ============================================================
   GERIBAND — Monitor Page (User-friendly posture overview)
   ============================================================ */

const MonitorPage = (() => {
  const MAX_ACTIVITY = 6;
  let _currentAngle  = 0;
  let _currentPosture = 'inactive';
  let _lastPostureKey = '';
  let _activity = [];
  let _refreshTimer = null;
  let _battery  = null;
  let _signal   = null;

  /* ── Posture classification from tilt angle (degrees) ──── */
  function _classifyPosture(angle, explicitFall) {
    if (explicitFall) return 'fallen';
    if (angle === undefined || angle === null) return 'inactive';
    if (angle < 20) return 'standing';
    if (angle < 45) return 'sitting';
    if (angle < 65) return 'leaning';
    if (angle < 80) return 'lying';
    return 'fallen';
  }

  function _postureLabel(key) {
    return i18n.t(`mon.${key}`);
  }

  function _postureDesc(key) {
    const map = {
      standing: 'descStanding',
      sitting:  'descSitting',
      leaning:  'descLeaning',
      lying:    'descLying',
      fallen:   'descFallen',
      inactive: 'descInactive',
    };
    return i18n.t(`mon.${map[key] || 'descInactive'}`);
  }

  function _postureTone(key) {
    if (key === 'fallen')   return 'danger';
    if (key === 'leaning' || key === 'lying') return 'warning';
    if (key === 'standing' || key === 'sitting') return 'safe';
    return 'neutral';
  }

  /* ── Render HTML ──────────────────────────────────────── */
  function render() {
    const connected = BLE.isConnected();
    const profile   = Storage.getProfile();
    const pName     = profile.parentName || i18n.t('dev.defaultName');

    return `
    <div class="page-header">
      <h2>${i18n.t('mon.title')}</h2>
      <p>${i18n.t('mon.subtitle')}</p>
    </div>

    <!-- Not-connected prompt -->
    <div id="mon-no-device" style="${connected ? 'display:none' : ''}">
      <div class="alert-banner info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <strong>${i18n.t('mon.notConnTitle')}</strong>
          <p>${i18n.t('mon.notConnDesc')}</p>
        </div>
      </div>
      <button class="btn btn-primary" onclick="App.navigate('device')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6.5,6.5 17.5,17.5"/><path d="M12 3L12 21"/><path d="M12 3L18 9"/><path d="M12 3L6 9"/><path d="M12 21L18 15"/><path d="M12 21L6 15"/></svg>
        ${i18n.t('mon.connectBtn')}
      </button>
    </div>

    <!-- Main Posture Card -->
    <div class="monitor-visual" id="mon-visual">
      <div class="mon-visual-head">
        <div>
          <div class="mon-eyebrow">${i18n.t('mon.postureLabel')}</div>
          <div class="mon-subtitle" id="mon-subtitle">${i18n.t('mon.monitoringFor', {name: pName})}</div>
        </div>
        <div class="connection-status ${connected ? 'connected' : 'disconnected'}" id="mon-conn-badge">
          <div class="connection-status-dot"></div>
          <span id="mon-conn-text">${connected ? i18n.t('mon.active') : i18n.t('mon.inactive')}</span>
        </div>
      </div>

      <div class="mon-hero">
        <!-- Body silhouette -->
        <div class="mon-hero-person">
          <div class="person-wrapper standing" id="mon-person">
            <svg viewBox="0 0 40 80" fill="none" stroke-linecap="round" stroke-linejoin="round" width="72" height="144">
              <circle cx="20" cy="8" r="7" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="2.5"/>
              <line x1="20" y1="15" x2="20" y2="45" stroke="var(--primary)" stroke-width="3.2"/>
              <rect x="13" y="32" width="14" height="6" rx="2.5" fill="var(--accent)" stroke="var(--accent-dark)" stroke-width="1.5"/>
              <circle cx="20" cy="35" r="1.8" fill="var(--primary-dark)"/>
              <line x1="20" y1="22" x2="8"  y2="35" stroke="var(--primary)" stroke-width="2.8"/>
              <line x1="20" y1="22" x2="32" y2="35" stroke="var(--primary)" stroke-width="2.8"/>
              <line x1="20" y1="45" x2="13" y2="65" stroke="var(--primary)" stroke-width="2.8"/>
              <line x1="20" y1="45" x2="27" y2="65" stroke="var(--primary)" stroke-width="2.8"/>
              <line x1="13" y1="65" x2="8"  y2="68" stroke="var(--primary)" stroke-width="2.8"/>
              <line x1="27" y1="65" x2="32" y2="68" stroke="var(--primary)" stroke-width="2.8"/>
            </svg>
          </div>
        </div>

        <!-- Posture text -->
        <div class="mon-hero-text">
          <div class="mon-posture-chip" id="mon-posture-chip">
            <span class="mon-posture-dot"></span>
            <span id="mon-posture-chip-text">${connected ? i18n.t('mon.waitingData') : i18n.t('mon.inactive')}</span>
          </div>
          <div class="mon-posture-title" id="mon-posture-title">${connected ? '—' : i18n.t('mon.inactive')}</div>
          <div class="mon-posture-desc" id="mon-posture-desc">${connected ? i18n.t('mon.waitingData') : i18n.t('mon.descInactive')}</div>
        </div>
      </div>

      <!-- Posture meter -->
      <div class="mon-meter">
        <div class="mon-meter-labels">
          <span>${i18n.t('mon.tiltSafe')}</span>
          <span>${i18n.t('mon.tiltCareful')}</span>
          <span>${i18n.t('mon.tiltFall')}</span>
        </div>
        <div class="mon-meter-track">
          <div class="mon-meter-fill" id="mon-meter-fill"></div>
          <div class="mon-meter-thumb" id="mon-meter-thumb"></div>
        </div>
      </div>
    </div>

    <!-- Quick info row -->
    <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-top:14px;">
      <div class="stat-item">
        <div class="stat-icon blue" id="mon-signal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="mon-signal">${connected ? i18n.t('common.strong') : '—'}</div>
          <div class="stat-label">${i18n.t('mon.signalTitle')}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon green" id="mon-battery-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="18" height="11" rx="2"/><path d="M22 11v3"/><line x1="6" y1="12" x2="14" y2="12"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="mon-battery">–%</div>
          <div class="stat-label">${i18n.t('mon.batteryTitle')}</div>
        </div>
      </div>
    </div>

    <!-- Recent activity -->
    <div style="margin-top:20px;">
      <div class="section-header">
        <span class="section-title">${i18n.t('mon.activityTitle')}</span>
        <button class="section-link" onclick="App.navigate('history')">${i18n.t('mon.viewHistory')}</button>
      </div>
      <div class="event-list" id="mon-activity-list">
        ${_renderActivityList()}
      </div>
    </div>
    `;
  }

  /* ── Render Activity List ───────────────────────────── */
  function _renderActivityList() {
    if (!_activity.length) {
      return `<div class="no-data" style="padding:18px 0;">${i18n.t('mon.noActivity')}</div>`;
    }
    return _activity.map(a => {
      const tone  = a.tone || 'info';
      const icon  = _activityIcon(a.key);
      return `
        <div class="event-item">
          <div class="event-dot ${tone === 'danger' ? 'danger' : (tone === 'safe' ? 'safe' : 'info')}"></div>
          <div class="event-info">
            <div class="event-title">${a.title}</div>
            <div class="event-time" data-ts="${a.ts}">${_friendlyTime(a.ts)}</div>
          </div>
          ${icon ? `<span class="event-badge ${tone === 'danger' ? 'danger' : (tone === 'safe' ? 'safe' : 'info')}">${icon}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  function _activityIcon(key) {
    const map = {
      fallen:   i18n.t('db.badgeFall'),
      standing: i18n.t('db.badgeSafe'),
      sitting:  i18n.t('db.badgeSafe'),
      leaning:  'Info',
      lying:    'Info',
    };
    return map[key] || '';
  }

  /* ── Friendly time formatter ───────────────────────── */
  function _friendlyTime(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return i18n.t('mon.justNow');
    if (mins < 60) return i18n.t('mon.minsAgo', {n: mins});
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return i18n.t('mon.hoursAgo', {n: hrs});
    const d = new Date(ts);
    return d.toLocaleTimeString(i18n.isEn() ? 'en-US' : 'id-ID', {hour:'2-digit', minute:'2-digit'});
  }

  function _refreshTimes() {
    document.querySelectorAll('#mon-activity-list .event-time[data-ts]').forEach(el => {
      const ts = parseInt(el.dataset.ts, 10);
      if (ts) el.textContent = _friendlyTime(ts);
    });
  }

  /* ── Add Activity ──────────────────────────────────── */
  function _addActivity(key, title, tone) {
    _activity.unshift({ ts: Date.now(), key, title, tone });
    if (_activity.length > MAX_ACTIVITY) _activity.length = MAX_ACTIVITY;
    const listEl = document.getElementById('mon-activity-list');
    if (listEl) listEl.innerHTML = _renderActivityList();
  }

  /* ── Set Connection Badge ─────────────────────────── */
  function _setConnBadge(state) {
    const badge = document.getElementById('mon-conn-badge');
    const text  = document.getElementById('mon-conn-text');
    if (!badge) return;
    badge.className = `connection-status ${state}`;
    if (state === 'connected')        text.textContent = i18n.t('mon.active');
    else if (state === 'connecting')  text.textContent = i18n.t('mon.connecting');
    else                              text.textContent = i18n.t('mon.inactive');
  }

  /* ── Update posture card ──────────────────────────── */
  function _setPosture(key) {
    _currentPosture = key;
    const tone = _postureTone(key);
    const chip     = document.getElementById('mon-posture-chip');
    const chipTxt  = document.getElementById('mon-posture-chip-text');
    const titleEl  = document.getElementById('mon-posture-title');
    const descEl   = document.getElementById('mon-posture-desc');
    if (!chip) return;

    chip.dataset.tone = tone;
    if (chipTxt) chipTxt.textContent = _postureLabel(key);
    if (titleEl) titleEl.textContent = _postureLabel(key);
    if (descEl)  descEl.textContent  = _postureDesc(key);

    if (_lastPostureKey !== key) {
      _lastPostureKey = key;
      const actMap = {
        fallen:   { title: i18n.t('mon.actFall'),     tone: 'danger' },
        standing: { title: i18n.t('mon.actStanding'), tone: 'safe' },
        sitting:  { title: i18n.t('mon.actSitting'),  tone: 'safe' },
        leaning:  { title: i18n.t('mon.actLeaning'),  tone: 'info' },
        lying:    { title: i18n.t('mon.actLying'),    tone: 'info' },
      };
      const act = actMap[key];
      if (act) _addActivity(key, act.title, act.tone);
    }
  }

  /* ── Update angle visuals (person rotation + meter) ── */
  function _setAngle(angle) {
    _currentAngle = Math.min(90, Math.max(0, angle));

    const person = document.getElementById('mon-person');
    if (person) {
      person.style.transform = `rotate(${_currentAngle * 0.9}deg)`;
      person.style.transformOrigin = 'center center';
    }

    const fill  = document.getElementById('mon-meter-fill');
    const thumb = document.getElementById('mon-meter-thumb');
    const pct   = (_currentAngle / 90) * 100;
    if (fill)  fill.style.width  = `${pct}%`;
    if (thumb) thumb.style.left  = `${Math.max(0, Math.min(100, pct))}%`;
  }

  /* ── Update info strip (battery, signal) ────────────── */
  function _setBattery(pct) {
    if (pct === undefined || pct === null) return;
    _battery = pct;
    const el = document.getElementById('mon-battery');
    if (el) el.textContent = `${pct}%`;
    const icon = document.getElementById('mon-battery-icon');
    if (icon) icon.className = `stat-icon ${pct < 20 ? 'red' : (pct < 50 ? 'amber' : 'green')}`;
  }

  function _setSignal(label) {
    _signal = label;
    const el = document.getElementById('mon-signal');
    if (el) el.textContent = label;
  }

  /* ── Public: fall detected ─────────────────────────── */
  function onFallDetected(data) {
    _setConnBadge('connected');
    if (data && data.angle !== undefined) _setAngle(data.angle);
    else _setAngle(85);
    _setPosture('fallen');
    _setSignal(i18n.t('common.strong'));
    const nd = document.getElementById('mon-no-device');
    if (nd) nd.style.display = 'none';
  }

  /* ── Public: sensor data ───────────────────────────── */
  function onSensorData(data) {
    _setConnBadge('connected');

    let angle = data.angle;
    if (angle === undefined && data.ax !== undefined && data.az !== undefined) {
      angle = Math.abs(Math.atan2(data.ax, data.az) * 180 / Math.PI);
    }
    if (angle !== undefined) _setAngle(angle);

    const isFall = data.status === 'fall' || data.status === 'fallen';
    _setPosture(_classifyPosture(angle, isFall));

    if (data.battery !== undefined) _setBattery(data.battery);
    _setSignal(i18n.t('common.strong'));

    const nd = document.getElementById('mon-no-device');
    if (nd) nd.style.display = 'none';
  }

  /* ── Init ─────────────────────────────────────────── */
  function init() {
    _activity = [];
    _lastPostureKey = '';
    _addActivity('ready', i18n.t('mon.actReady'), 'info');
    if (BLE.isConnected()) {
      _setConnBadge('connected');
      _setSignal(i18n.t('common.strong'));
      BLE.readBattery && BLE.readBattery().then(pct => { if (pct != null) _setBattery(pct); });
    } else {
      _setConnBadge('disconnected');
    }
    _refreshTimer = setInterval(_refreshTimes, 30000);
  }

  /* ── Destroy ─────────────────────────────────────── */
  function destroy() {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
  }

  return { render, init, destroy, onFallDetected, onSensorData };
})();
