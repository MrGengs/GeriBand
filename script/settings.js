/* ============================================================
   GERIBAND — Settings Page
   ============================================================ */

const SettingsPage = (() => {

  /* ── Render HTML ──────────────────────────────────────── */
  function render() {
    const profile     = Storage.getProfile();
    const settings    = Storage.getSettings();
    const notifStatus = Notifications.getStatus();
    const fireUser    = App.getCurrentUser();

    const photoURL    = fireUser?.photoURL || profile.photoURL || null;
    const email       = fireUser?.email    || profile.email    || '';
    const provider    = fireUser?.providerData?.[0]?.providerId || 'password';

    return `
    <div class="page-header">
      <h2>${i18n.t('set.title')}</h2>
      <p>${i18n.t('set.subtitle')}</p>
    </div>

    <!-- Akun Pemantau (Anda) -->
    <div class="settings-group-title" style="margin-bottom:10px;">${i18n.t('set.yourAccount')}</div>
    <div class="neu-card" style="margin-bottom:20px;">
      <div class="profile-section">
        <div class="profile-avatar" style="cursor:default;">
          ${photoURL
            ? `<img src="${photoURL}" alt="Avatar" onerror="this.style.display='none'">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
          }
        </div>
        <div class="profile-info">
          <h3>${profile.childName || fireUser?.displayName || i18n.t('set.notSet')}</h3>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${i18n.t('set.monitor')}</p>
          ${email ? `<p style="margin-top:4px;font-size:0.7rem;color:var(--text-light);">${email}</p>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(200,205,216,0.4);">
        ${provider === 'google.com'
          ? `<span class="chip" style="background:var(--surface);"><svg viewBox="0 0 48 48" width="12" height="12"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>&nbsp;Google</span>`
          : `<span class="chip" style="background:var(--surface);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>&nbsp;Email</span>`
        }
        <span style="font-size:0.68rem;color:var(--text-light);">${i18n.t('set.loginMethod')}</span>
      </div>
    </div>

    <!-- Profil Orang Tua yang Dipantau -->
    <div class="settings-group-title" style="margin-bottom:10px;">${i18n.t('set.monitoredParent')}</div>
    <div class="neu-card" style="margin-bottom:20px;">
      <div class="section-header" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:44px;height:44px;border-radius:12px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <div id="set-parent-name" style="font-size:1rem;font-weight:700;color:var(--text);">${profile.parentName || i18n.t('set.notSet')}</div>
            <div id="set-parent-age" style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">${profile.age ? i18n.t('set.ageYears', {age: profile.age}) : i18n.t('set.ageNotSet')}</div>
          </div>
        </div>
        <button class="section-link" onclick="SettingsPage.editProfile()">${i18n.t('common.edit')}</button>
      </div>
      <div class="alert-banner info" style="padding:10px 12px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style="font-size:0.74rem;">${i18n.t('set.beltNote')}</p>
      </div>
    </div>

    <!-- Notification Settings -->
    <div class="settings-group">
      <div class="settings-group-title">${i18n.t('set.notifGroup')}</div>

      <div class="settings-item" onclick="SettingsPage.toggleNotif()">
        <div class="settings-item-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.notifPush')}</div>
          <div class="settings-item-desc">${notifStatus === 'denied' ? i18n.t('set.notifDenied') : i18n.t('set.notifDesc')}</div>
        </div>
        <div class="settings-item-control">
          <button class="toggle ${settings.notifEnabled && notifStatus !== 'denied' ? 'on' : ''}" id="tog-notif" onclick="event.stopPropagation();SettingsPage.toggleNotif()"></button>
        </div>
      </div>

      <div class="settings-item" onclick="SettingsPage.toggleSound()">
        <div class="settings-item-icon amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.sound')}</div>
          <div class="settings-item-desc">${i18n.t('set.soundDesc')}</div>
        </div>
        <div class="settings-item-control">
          <button class="toggle ${settings.soundEnabled ? 'on' : ''}" id="tog-sound" onclick="event.stopPropagation();SettingsPage.toggleSound()"></button>
        </div>
      </div>

      <div class="settings-item" onclick="SettingsPage.toggleVibration()">
        <div class="settings-item-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 19l-3-3-3 3"/><path d="M22 5l-3-3-3 3"/><line x1="5" y1="16" x2="19" y2="8"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.vibration')}</div>
          <div class="settings-item-desc">${i18n.t('set.vibDesc')}</div>
        </div>
        <div class="settings-item-control">
          <button class="toggle ${settings.vibration ? 'on' : ''}" id="tog-vib" onclick="event.stopPropagation();SettingsPage.toggleVibration()"></button>
        </div>
      </div>

      ${notifStatus === 'default' ? `
      <div class="alert-banner warning" style="margin-top:4px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <p>${i18n.t('set.notifWarning')}</p>
        </div>
      </div>
      <button class="btn btn-primary" onclick="SettingsPage.requestNotifPermission()" style="margin-top:6px;">
        ${i18n.t('set.enableNotif')}
      </button>
      ` : ''}
    </div>

    <!-- Detection Settings -->
    <div class="settings-group">
      <div class="settings-group-title">${i18n.t('set.detectGroup')}</div>

      <div class="settings-item" onclick="SettingsPage.showSensitivity()">
        <div class="settings-item-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/><circle cx="2" cy="6"  r="2" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.sensitivity')}</div>
          <div class="settings-item-desc" id="set-sensitivity-desc">${_sensitivityLabel(settings.sensitivity)}</div>
        </div>
        <div class="settings-item-control chevron-right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </div>
      </div>

      <div class="settings-item" onclick="SettingsPage.toggleAutoConnect()">
        <div class="settings-item-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.autoReconn')}</div>
          <div class="settings-item-desc">${i18n.t('set.autoReconnDesc')}</div>
        </div>
        <div class="settings-item-control">
          <button class="toggle ${settings.autoConnect ? 'on' : ''}" id="tog-auto" onclick="event.stopPropagation();SettingsPage.toggleAutoConnect()"></button>
        </div>
      </div>
    </div>

    <!-- Language -->
    <div class="settings-group">
      <div class="settings-group-title">${i18n.t('set.langGroup')}</div>

      <div class="settings-item">
        <div class="settings-item-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.language')}</div>
          <div class="settings-item-desc" id="set-lang-desc">${i18n.isEn() ? i18n.t('set.langEn') : i18n.t('set.langId')}</div>
        </div>
        <div class="settings-item-control" style="gap:6px;display:flex;">
          <button class="chip ${i18n.isId() ? 'active' : ''}" id="lang-id-btn"
            style="cursor:pointer;padding:4px 10px;font-size:0.72rem;font-weight:700;border:none;border-radius:20px;
                   background:${i18n.isId() ? 'var(--primary)' : 'var(--surface)'};
                   color:${i18n.isId() ? 'white' : 'var(--text-muted)'};"
            onclick="SettingsPage.setLanguage('id')">ID</button>
          <button class="chip ${i18n.isEn() ? 'active' : ''}" id="lang-en-btn"
            style="cursor:pointer;padding:4px 10px;font-size:0.72rem;font-weight:700;border:none;border-radius:20px;
                   background:${i18n.isEn() ? 'var(--primary)' : 'var(--surface)'};
                   color:${i18n.isEn() ? 'white' : 'var(--text-muted)'};"
            onclick="SettingsPage.setLanguage('en')">EN</button>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="settings-group">
      <div class="settings-group-title">${i18n.t('set.infoGroup')}</div>

      <div class="settings-item" onclick="SettingsPage.showAbout()">
        <div class="settings-item-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.about')}</div>
          <div class="settings-item-desc">${i18n.t('set.aboutDesc')}</div>
        </div>
        <div class="settings-item-control chevron-right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </div>
      </div>

      <div class="settings-item" onclick="SettingsPage.testNotif()">
        <div class="settings-item-icon amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title">${i18n.t('set.testNotif')}</div>
          <div class="settings-item-desc">${i18n.t('set.testNotifDesc')}</div>
        </div>
        <div class="settings-item-control chevron-right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </div>
      </div>
    </div>

    <!-- Account Section -->
    <div class="settings-group">
      <div class="settings-group-title">${i18n.t('set.accountGroup')}</div>

      <div class="logout-item" onclick="App.signOut()">
        <div class="settings-item-icon red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <div class="settings-item-info">
          <div class="settings-item-title" style="color:var(--danger);">${i18n.t('set.signOut')}</div>
          <div class="settings-item-desc">${email}</div>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding:16px 0;color:var(--text-light);font-size:0.72rem;">
      ${i18n.t('set.footer')}
    </div>
    `;
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {}

  /* ── Destroy ─────────────────────────────────────────── */
  function destroy() {}

  /* ── Sensitivity label ─────────────────────────────── */
  function _sensitivityLabel(val) {
    const map = {
      low:    i18n.t('set.sensLowLabel'),
      medium: i18n.t('set.sensMedLabel'),
      high:   i18n.t('set.sensHighLabel'),
    };
    return map[val] || map.medium;
  }

  /* ── Toggle Helpers ────────────────────────────────── */
  function toggleNotif() {
    const settings = Storage.getSettings();
    if (Notifications.getStatus() === 'denied') {
      App.showToast(i18n.t('set.notifBlocked'), i18n.t('set.notifBlockedDesc'), 'warning');
      return;
    }
    settings.notifEnabled = !settings.notifEnabled;
    Storage.saveSettings(settings);
    const tog = document.getElementById('tog-notif');
    if (tog) tog.className = `toggle ${settings.notifEnabled ? 'on' : ''}`;
    App.showToast(settings.notifEnabled ? i18n.t('set.notifActive') : i18n.t('set.notifOff'), '', settings.notifEnabled ? 'success' : 'info');
  }

  function toggleSound() {
    const settings = Storage.getSettings();
    settings.soundEnabled = !settings.soundEnabled;
    Storage.saveSettings(settings);
    const tog = document.getElementById('tog-sound');
    if (tog) tog.className = `toggle ${settings.soundEnabled ? 'on' : ''}`;
    if (settings.soundEnabled) Notifications.playAlertSound();
  }

  function toggleVibration() {
    const settings = Storage.getSettings();
    settings.vibration = !settings.vibration;
    Storage.saveSettings(settings);
    const tog = document.getElementById('tog-vib');
    if (tog) tog.className = `toggle ${settings.vibration ? 'on' : ''}`;
    if (settings.vibration) Notifications.vibrate([100, 50, 100]);
  }

  function toggleAutoConnect() {
    const settings = Storage.getSettings();
    settings.autoConnect = !settings.autoConnect;
    Storage.saveSettings(settings);
    const tog = document.getElementById('tog-auto');
    if (tog) tog.className = `toggle ${settings.autoConnect ? 'on' : ''}`;
  }

  /* ── Language Switch ────────────────────────────────── */
  function setLanguage(lang) {
    i18n.setLang(lang);
    // onChange listener in App will re-render pages
  }

  /* ── Sensitivity Modal ───────────────────────────── */
  function showSensitivity() {
    const settings = Storage.getSettings();
    App.showModal(i18n.t('set.sensTitle'), `
      <p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:16px;">
        ${i18n.t('set.sensDesc')}
      </p>
      ${['low','medium','high'].map(v => `
        <div class="settings-item" style="margin-bottom:8px;cursor:pointer;" onclick="SettingsPage.setSensitivity('${v}');App.closeModal()">
          <div class="settings-item-info">
            <div class="settings-item-title">${v === 'low' ? i18n.t('set.sensLow') : v === 'medium' ? i18n.t('set.sensMed') : i18n.t('set.sensHigh')}</div>
            <div class="settings-item-desc">${_sensitivityLabel(v)}</div>
          </div>
          ${settings.sensitivity === v ? `<svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" width="20" height="20"><polyline points="20,6 9,17 4,12"/></svg>` : ''}
        </div>
      `).join('')}
    `);
  }

  function setSensitivity(val) {
    const settings = Storage.getSettings();
    settings.sensitivity = val;
    Storage.saveSettings(settings);
    const desc = document.getElementById('set-sensitivity-desc');
    if (desc) desc.textContent = _sensitivityLabel(val);
    App.showToast(i18n.t('set.sensChanged'), _sensitivityLabel(val), 'success');
  }

  /* ── Edit Profile Modal ──────────────────────────── */
  function editProfile() {
    const p = Storage.getProfile();
    App.showModal(i18n.t('set.editTitle'), `
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:16px;line-height:1.5;">
        ${i18n.t('set.editDesc')}
      </p>
      <div class="input-group">
        <label class="input-label">${i18n.t('set.parentName')}</label>
        <div class="input-wrap">
          <input class="input-field" id="inp-parent-name" type="text" value="${p.parentName || ''}" placeholder="${i18n.t('set.parentNamePh')}" maxlength="40" autocomplete="off">
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">${i18n.t('set.parentAge')}</label>
        <div class="input-wrap">
          <input class="input-field" id="inp-parent-age" type="number" value="${p.age || ''}" placeholder="${i18n.t('set.parentAgePh')}" min="50" max="120">
        </div>
      </div>
      <div class="divider"></div>
      <div class="input-group">
        <label class="input-label">${i18n.t('set.yourName')}</label>
        <div class="input-wrap">
          <input class="input-field" id="inp-child-name" type="text" value="${p.childName || ''}" placeholder="${i18n.t('set.yourNamePh')}" maxlength="40" autocomplete="off">
        </div>
      </div>
      <button class="btn btn-primary" onclick="SettingsPage.saveProfile()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
        ${i18n.t('common.save')}
      </button>
      <button class="btn btn-outline" onclick="App.closeModal()">${i18n.t('common.cancel')}</button>
    `);
  }

  function saveProfile() {
    const parentName = document.getElementById('inp-parent-name')?.value.trim();
    const age        = document.getElementById('inp-parent-age')?.value.trim();
    const childName  = document.getElementById('inp-child-name')?.value.trim();
    Storage.saveProfile({ parentName, age, childName });
    const n = document.getElementById('set-parent-name');
    const a = document.getElementById('set-parent-age');
    if (n) n.textContent = parentName || i18n.t('set.notSet');
    if (a) a.textContent = age ? i18n.t('set.ageYears', {age}) : i18n.t('set.ageNotSet');
    App.closeModal();
    App.showToast(i18n.t('set.profileSaved'), i18n.t('set.profileSavedDesc'), 'success');
    // Update header subtitle
    const subtitle = document.getElementById('header-subtitle');
    if (subtitle && childName) subtitle.textContent = i18n.t('header.monitoringAs', {name: childName});
  }

  /* ── Request Notif Permission ────────────────────── */
  function requestNotifPermission() {
    Notifications.requestPermission().then(ok => {
      if (ok) {
        App.showToast(i18n.t('set.notifActive'), i18n.t('set.notifGranted'), 'success');
        const section = document.getElementById('page-settings');
        if (section) { section.innerHTML = render(); init(); }
      } else {
        App.showToast(i18n.isEn() ? 'Failed' : 'Gagal', i18n.t('set.notifDeniedFail'), 'danger');
      }
    });
  }

  /* ── Test Notification ───────────────────────────── */
  function testNotif() {
    Notifications.sendFallAlert(i18n.isEn() ? 'This is a test notification from GeriBand' : 'Ini adalah notifikasi tes dari GeriBand');
    App.showToast(i18n.t('set.testSent'), i18n.t('set.testSentDesc'), 'info');
    Notifications.vibrate([200, 100, 200]);
  }

  /* ── About Modal ─────────────────────────────────── */
  function showAbout() {
    App.showModal(i18n.t('set.about'), `
      <div style="text-align:center;padding:10px 0 20px;">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:var(--neu-md);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" width="36" height="36">
            <path d="M4 10 C4 7 7 5 12 5 C17 5 20 7 20 10 L20 14 C20 17 17 19 12 19 C7 19 4 17 4 14 Z"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
          </svg>
        </div>
        <h2 style="font-size:1.3rem;margin-bottom:4px;">GeriBand</h2>
        <p style="color:var(--primary);font-size:0.78rem;font-weight:600;margin-bottom:16px;">${i18n.t('about.tagline')}</p>
        <p style="color:var(--text-muted);font-size:0.8rem;line-height:1.6;text-align:left;margin-bottom:16px;">
          ${i18n.t('about.desc')}
        </p>
        <div style="display:flex;flex-direction:column;gap:6px;text-align:left;">
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);">
            <span>${i18n.t('about.version')}</span><strong>1.0.0</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);">
            <span>${i18n.t('about.sensor')}</span><strong>MPU6050 (6-axis)</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);">
            <span>${i18n.t('about.protocol')}</span><strong>BLE 4.0+</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);">
            <span>${i18n.t('about.accuracy')}</span><strong>~95%</strong>
          </div>
        </div>
        <p style="margin-top:16px;font-size:0.68rem;color:var(--text-light);">"Seamless Safety for the Golden Years"</p>
      </div>
    `);
  }

  return { render, init, destroy, toggleNotif, toggleSound, toggleVibration, toggleAutoConnect, setLanguage, showSensitivity, setSensitivity, editProfile, saveProfile, requestNotifPermission, testNotif, showAbout };
})();
