/* ============================================================
   GERIBAND — Dashboard Page
   ============================================================ */

const DashboardPage = (() => {
  let _status    = 'disconnected'; // 'safe' | 'fall' | 'disconnected'
  let _battery   = null;
  let _lastSeen  = null;
  let _fallToday = 0;
  let _fallWeek  = 0;
  let _updateTimer = null;

  /* ── Render HTML ──────────────────────────────────────── */
  function render() {
    _computeStats();
    const profile = Storage.getProfile();
    const name    = profile.childName || i18n.t('set.monitor');
    const pName   = profile.parentName || i18n.t('dev.defaultName');
    return `
    <div class="page-header">
      <h2>${i18n.t('db.title')}</h2>
      <p style="font-size:0.82rem;color:var(--text-muted);">${i18n.t('db.subtitle', {name})}</p>
    </div>

    <!-- Main Status Card -->
    <div class="status-card" style="margin-bottom:14px;">
      <div style="margin-bottom:8px;">
        <span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;">${i18n.t('db.conditionOf', {name: pName})}</span>
      </div>
      <div class="status-ring disconnected" id="db-ring">
        <div class="status-ring-inner" id="db-ring-inner">
          <svg id="db-status-icon" viewBox="0 0 24 24" fill="none" stroke="var(--disconnected)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            ${_getPersonIcon('disconnected')}
          </svg>
        </div>
      </div>
      <div class="status-label disconnected" id="db-status-label">${i18n.t('db.statusOffline')}</div>
      <div class="status-desc" id="db-status-desc">${i18n.t('db.descDisconn')}</div>
      <div class="status-time" id="db-status-time">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
        <span id="db-last-seen">–</span>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-item">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="db-fall-today">0</div>
          <div class="stat-label">${i18n.t('db.fallToday')}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="db-fall-week">0</div>
          <div class="stat-label">${i18n.t('db.fallWeek')}</div>
        </div>
      </div>
      <div class="stat-item" id="db-battery-item" style="${BLE.isConnected() ? '' : 'display:none;'}">
        <div class="stat-icon green" id="db-batt-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="18" height="11" rx="2" ry="2"/><path d="M22 11v3"/><line x1="6" y1="12" x2="12" y2="12"/><line x1="9" y1="9" x2="9" y2="15"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="db-battery">–%</div>
          <div class="stat-label">${i18n.t('db.battery')}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M5 10.5s2.5-1.5 7-1.5 7 1.5 7 1.5"/><path d="M9 15s1.5-1 3-1 3 1 3 1"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="db-signal">–</div>
          <div class="stat-label">${i18n.t('db.signal')}</div>
        </div>
      </div>
    </div>

    <!-- Connect Prompt / Alert -->
    <div id="db-alert" style="display:none;margin-bottom:14px;"></div>

    <!-- Recent Events -->
    <div style="margin-bottom:14px;">
      <div class="section-header">
        <span class="section-title">${i18n.t('db.recentActivity')}</span>
        <button class="section-link" onclick="App.navigate('history')">${i18n.t('db.viewAll')}</button>
      </div>
      <div class="event-list" id="db-events">
        ${_renderRecentEvents()}
      </div>
    </div>

    <!-- Quick Action: Connect -->
    <button class="btn btn-primary" id="db-connect-btn" onclick="DashboardPage.handleConnectBtn()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18">
        <polyline points="6.5,6.5 17.5,17.5"/>
        <polyline points="17.5,6.5 6.5,17.5"/>
        <path d="M12 3 L12 21"/>
        <path d="M12 3 L18 9"/>
        <path d="M12 3 L6 9"/>
        <path d="M12 21 L18 15"/>
        <path d="M12 21 L6 15"/>
      </svg>
      ${i18n.t('db.connectBtn')}
    </button>
    `;
  }

  /* ── Compute Stats ──────────────────────────────────── */
  function _computeStats() {
    const events = Storage.getFallEvents();
    const now    = Date.now();
    const today  = new Date(); today.setHours(0,0,0,0);
    const week   = new Date(now - 7 * 86400000);
    _fallToday = events.filter(e => e.type === 'fall' && e.timestamp >= today.getTime()).length;
    _fallWeek  = events.filter(e => e.type === 'fall' && e.timestamp >= week.getTime()).length;
  }

  /* ── Render Recent Events ────────────────────────────── */
  function _renderRecentEvents() {
    const events = Storage.getFallEvents().filter(e => e.type !== 'connect').slice(0, 5);
    if (!events.length) {
      return `<div class="no-data" style="padding:20px 0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;opacity:0.3;display:block;margin:0 auto 8px;"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
        ${i18n.t('db.noActivity')}
      </div>`;
    }
    return events.map(e => {
      const type  = e.type === 'fall' ? 'danger' : (e.type === 'connect' ? 'info' : 'safe');
      const badge = e.type === 'fall' ? i18n.t('db.badgeFall') : (e.type === 'connect' ? i18n.t('db.badgeInfo') : i18n.t('db.badgeSafe'));
      return `
        <div class="event-item">
          <div class="event-dot ${type}"></div>
          <div class="event-info">
            <div class="event-title">${e.message}</div>
            <div class="event-time">${App.formatTime(e.timestamp)}</div>
          </div>
          <span class="event-badge ${type}">${badge}</span>
        </div>
      `;
    }).join('');
  }

  /* ── Person SVG Icons ────────────────────────────────── */
  function _getPersonIcon(status) {
    if (status === 'safe') {
      return `<path d="M12 2 C13.1 2 14 2.9 14 4 C14 5.1 13.1 6 12 6 C10.9 6 10 5.1 10 4 C10 2.9 10.9 2 12 2Z" fill="var(--safe)" stroke="none"/>
              <line x1="12" y1="6" x2="12" y2="15" stroke="var(--safe)" stroke-width="2"/>
              <polyline points="8,10 12,8 16,10" stroke="var(--safe)" stroke-width="2"/>
              <polyline points="10,22 12,15 14,22" stroke="var(--safe)" stroke-width="2"/>`;
    } else if (status === 'fall') {
      return `<circle cx="19" cy="5" r="2" fill="var(--danger)" stroke="none"/>
              <line x1="4" y1="10" x2="19" y2="7" stroke="var(--danger)" stroke-width="2"/>
              <polyline points="15,7 19,7 19,12" stroke="var(--danger)" stroke-width="2"/>
              <line x1="4" y1="14" x2="8" y2="10" stroke="var(--danger)" stroke-width="2"/>
              <line x1="7" y1="14" x2="4" y2="18" stroke="var(--danger)" stroke-width="2"/>`;
    } else {
      return `<circle cx="12" cy="12" r="8" stroke="var(--disconnected)" stroke-width="1.5" fill="none"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke="var(--disconnected)" stroke-width="2"/>`;
    }
  }

  /* ── Update Status UI ────────────────────────────────── */
  function _updateStatusUI(status, desc, time) {
    _status = status;
    const ring   = document.getElementById('db-ring');
    const icon   = document.getElementById('db-status-icon');
    const label  = document.getElementById('db-status-label');
    const descEl = document.getElementById('db-status-desc');

    if (!ring) return;

    ring.className  = `status-ring ${status}`;
    label.className = `status-label ${status}`;

    const labels = {
      safe:         { text: i18n.t('db.statusSafe'),    color: 'var(--safe)' },
      fall:         { text: i18n.t('db.statusFall'),    color: 'var(--danger)' },
      disconnected: { text: i18n.t('db.statusOffline'), color: 'var(--disconnected)' },
    };
    label.textContent = labels[status]?.text || status;
    if (icon) {
      icon.innerHTML = _getPersonIcon(status);
      icon.setAttribute('stroke', labels[status]?.color || 'currentColor');
    }
    if (descEl && desc) descEl.textContent = desc;
    if (time) document.getElementById('db-last-seen').textContent = time;

    // Connect btn
    const btn = document.getElementById('db-connect-btn');
    if (btn) {
      if (BLE.isConnected()) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> ${i18n.t('db.disconnectBtn')}`;
        btn.className = 'btn btn-ghost';
      } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><path d="M12 3 L12 21"/><path d="M12 3 L18 9"/><path d="M12 3 L6 9"/><path d="M12 21 L18 15"/><path d="M12 21 L6 15"/><polyline points="6.5,6.5 17.5,17.5"/></svg> ${i18n.t('db.connectBtn')}`;
        btn.className = 'btn btn-primary';
      }
    }
  }

  /* ── Update Stats UI ─────────────────────────────────── */
  function _updateStatsUI() {
    _computeStats();
    const ftEl = document.getElementById('db-fall-today');
    const fwEl = document.getElementById('db-fall-week');
    if (ftEl) ftEl.textContent = _fallToday;
    if (fwEl) fwEl.textContent = _fallWeek;
  }

  /* ── Update Events UI ──────────────────────────────── */
  function _updateEventsUI() {
    const el = document.getElementById('db-events');
    if (el) el.innerHTML = _renderRecentEvents();
  }

  /* ── Handlers for BLE callbacks ────────────────────── */
  function onFallDetected(data) {
    _lastSeen = new Date();
    const profile = Storage.getProfile();
    const pName   = profile.parentName || i18n.t('dev.defaultName');
    _updateStatusUI('fall', i18n.t('db.descFall', {name: pName}), _formatTimestamp(_lastSeen));
    _updateStatsUI();
    _updateEventsUI();
    _showFallAlert();
  }

  function onStanding(data) {
    _lastSeen = new Date();
    const profile = Storage.getProfile();
    const pName   = profile.parentName || i18n.t('dev.defaultName');
    _updateStatusUI('safe', i18n.t('db.descSafe', {name: pName}), _formatTimestamp(_lastSeen));
    _updateEventsUI();
  }

  function onSensorData(data) {
    _lastSeen = new Date();
    if (document.getElementById('db-last-seen')) {
      document.getElementById('db-last-seen').textContent = _formatTimestamp(_lastSeen);
    }
    const sigEl = document.getElementById('db-signal');
    if (sigEl) sigEl.textContent = i18n.t('common.strong');
    if (data.battery !== undefined) _updateBattery(data.battery);
    if (_status === 'disconnected') {
      const pName = Storage.getProfile().parentName || i18n.t('dev.defaultName');
      _updateStatusUI('safe', i18n.t('db.descMonitoring', {name: pName}), _formatTimestamp(_lastSeen));
    }
  }

  function onConnected(name) {
    _lastSeen = new Date();
    const profile = Storage.getProfile();
    const pName   = profile.parentName || i18n.t('dev.defaultName');
    _updateStatusUI('safe', i18n.t('db.descConnected', {name: pName}), _formatTimestamp(_lastSeen));
    const sigEl = document.getElementById('db-signal');
    if (sigEl) sigEl.textContent = i18n.t('common.strong');
    _updateEventsUI();
  }

  function onDisconnected() {
    _updateStatusUI('disconnected', i18n.t('db.descDisconn'), '–');
    const sigEl = document.getElementById('db-signal');
    if (sigEl) sigEl.textContent = '–';
    _hideBattery();
    _updateEventsUI();
  }

  /* ── Update Battery ───────────────────────────────── */
  function _updateBattery(pct) {
    _battery = pct;
    const item     = document.getElementById('db-battery-item');
    const battStat = document.getElementById('db-battery');
    const icon     = document.getElementById('db-batt-icon');
    if (item)     item.style.display = '';
    if (battStat) battStat.textContent = `${pct}%`;
    if (icon)     icon.className = `stat-icon ${pct < 20 ? 'red' : (pct < 50 ? 'amber' : 'green')}`;
  }

  function _hideBattery() {
    _battery = null;
    const item = document.getElementById('db-battery-item');
    if (item) item.style.display = 'none';
  }

  /* ── Show Fall Alert ────────────────────────────── */
  function _showFallAlert() {
    const alertEl = document.getElementById('db-alert');
    if (!alertEl) return;
    alertEl.style.display = 'block';
    const profile = Storage.getProfile();
    const pName   = profile.parentName || i18n.t('dev.defaultName');
    alertEl.innerHTML = `
      <div class="alert-banner danger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <strong>${i18n.t('db.fallAlertTitle')}</strong>
          <p>${i18n.t('db.fallAlertDesc', {name: pName})}</p>
        </div>
      </div>
    `;
    setTimeout(() => {
      if (alertEl && _status !== 'fall') alertEl.style.display = 'none';
    }, 30000);
  }

  /* ── Format Timestamp ─────────────────────────── */
  function _formatTimestamp(date) {
    if (!date) return '–';
    const now    = new Date();
    const diffMs = now - date;
    if (diffMs < 60000) return i18n.t('common.justNow');
    return date.toLocaleTimeString(i18n.isEn() ? 'en-US' : 'id-ID', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  }

  /* ── Handle Connect Button ───────────────────── */
  function handleConnectBtn() {
    if (BLE.isConnected()) {
      BLE.disconnect();
    } else {
      App.navigate('device');
    }
  }

  /* ── Init ────────────────────────────────────── */
  function init() {
    _updateStatsUI();
    _updateEventsUI();
    if (BLE.isConnected()) {
      const profile = Storage.getProfile();
      const pName   = profile.parentName || i18n.t('dev.defaultName');
      _updateStatusUI('safe', i18n.t('db.descConnected', {name: pName}), _formatTimestamp(_lastSeen));
    }
    _updateTimer = setInterval(() => {
      if (_lastSeen) {
        const el = document.getElementById('db-last-seen');
        if (el) el.textContent = _formatTimestamp(_lastSeen);
      }
    }, 10000);
  }

  /* ── Destroy ─────────────────────────────────── */
  function destroy() {
    clearInterval(_updateTimer);
  }

  return { render, init, destroy, onFallDetected, onStanding, onSensorData, onConnected, onDisconnected, handleConnectBtn };
})();
