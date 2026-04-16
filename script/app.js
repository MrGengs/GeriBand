/* ============================================================
   GERIBAND — App Core / SPA Router
   Manages page navigation without reload (BLE stays alive)
   ============================================================ */

const App = (() => {
  let currentPage      = 'dashboard';
  let notifCount       = 0;
  let _currentUser     = null; // Firebase user object
  let _deferredInstall = null; // beforeinstallprompt event
  const PWA_KEY        = 'gb_pwa_last_shown';
  const PWA_INTERVAL   = 3 * 60 * 60 * 1000; // 3 hours in ms

  /* ══════════════════════════════════════════════════════════
     SERVICE WORKER — auto-update on new deploy
     On every new build:
       1. sw.js is fetched fresh (no-cache headers)
       2. New SW installs in the background
       3. We postMessage SKIP_WAITING to activate it
       4. controllerchange fires → page reloads with fresh assets
     ══════════════════════════════════════════════════════════ */
  function _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    let reloadOnce = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnce) return;
      reloadOnce = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
      if (!reg) return;

      const handleNewWorker = nw => {
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // New build ready — take control now
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      };

      if (reg.waiting) handleNewWorker(reg.waiting);
      reg.addEventListener('updatefound', () => handleNewWorker(reg.installing));

      // Poll for updates: on tab focus and hourly while open
      const checkForUpdate = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      setInterval(checkForUpdate, 60 * 60 * 1000);
    }).catch(() => {});
  }

  /* ── Page Registry ─────────────────────────────────────── */
  const pages = {
    dashboard: { init: DashboardPage.init, destroy: DashboardPage.destroy },
    monitor:   { init: MonitorPage.init,   destroy: MonitorPage.destroy   },
    history:   { init: HistoryPage.init,   destroy: HistoryPage.destroy   },
    device:    { init: DevicePage.init,    destroy: DevicePage.destroy    },
    settings:  { init: SettingsPage.init,  destroy: SettingsPage.destroy  },
  };

  /* ── Navigate ─────────────────────────────────────────── */
  function navigate(page) {
    if (!pages[page]) return;
    if (page === currentPage) return;

    const oldSection = document.getElementById(`page-${currentPage}`);
    if (oldSection) oldSection.classList.remove('active');
    const oldNav = document.getElementById(`nav-${currentPage}`);
    if (oldNav) oldNav.classList.remove('active');
    if (pages[currentPage]?.destroy) pages[currentPage].destroy();

    currentPage = page;
    const newSection = document.getElementById(`page-${page}`);
    const newNav     = document.getElementById(`nav-${page}`);

    if (newSection) {
      if (!newSection.dataset.rendered) {
        renderPage(page, newSection);
        newSection.dataset.rendered = 'true';
      }
      newSection.classList.add('active');
      document.getElementById('app-content').scrollTop = 0;
    }
    if (newNav) newNav.classList.add('active');

    if (pages[page]?.init) {
      setTimeout(() => pages[page].init(), 50);
    }

    // Show PWA install banner when landing on dashboard
    if (page === 'dashboard') setTimeout(() => _maybeShowPWABanner(), 1500);

    history.replaceState(null, '', `#${page}`);
  }

  /* ── Render Page HTML ─────────────────────────────────── */
  function renderPage(page, section) {
    const renderers = {
      dashboard: DashboardPage.render,
      monitor:   MonitorPage.render,
      history:   HistoryPage.render,
      device:    DevicePage.render,
      settings:  SettingsPage.render,
    };
    if (renderers[page]) section.innerHTML = renderers[page]();
  }

  /* ── Show Notification Info ──────────────────────────── */
  function showNotifInfo() {
    clearNotifBadge();
    const events = Storage.getFallEvents().slice(0, 5);
    if (events.length === 0) {
      showModal(i18n.t('app.notifTitle'), `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <h4>${i18n.t('app.noNotif')}</h4>
          <p>${i18n.t('app.allNormal')}</p>
        </div>
      `);
      return;
    }
    let html = `<div class="event-list">`;
    events.forEach(e => {
      const icon  = e.type === 'fall' ? 'danger' : (e.type === 'connect' ? 'info' : 'safe');
      const badge = e.type === 'fall' ? i18n.t('db.badgeFall') : (e.type === 'connect' ? i18n.t('db.badgeInfo') : i18n.t('db.badgeSafe'));
      html += `
        <div class="event-item">
          <div class="event-dot ${icon}"></div>
          <div class="event-info">
            <div class="event-title">${e.message}</div>
            <div class="event-time">${formatTime(e.timestamp)}</div>
          </div>
          <span class="event-badge ${icon}">${badge}</span>
        </div>
      `;
    });
    html += `</div>`;
    showModal(i18n.t('app.notifTitle'), html);
  }

  /* ── Modal Helpers ────────────────────────────────────── */
  function showModal(title, content) {
    document.getElementById('modalContent').innerHTML = `
      <h3 class="modal-title">${title}</h3>
      ${content}
    `;
    document.getElementById('modalOverlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  /* ── Toast Helpers ─────────────────────────────────────  */
  function showToast(title, desc, type = 'info', duration = 4000) {
    const icons = {
      danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    document.getElementById('toastContainer').prepend(toast);

    setTimeout(() => {
      toast.classList.add('exiting');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ── Notification Badge ───────────────────────────────── */
  function addNotifBadge() {
    notifCount++;
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'block';
  }

  function clearNotifBadge() {
    notifCount = 0;
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
  }

  /* ── Time Formatter ──────────────────────────────────── */
  function formatTime(ts) {
    const d      = new Date(ts);
    const diff   = Date.now() - d;
    const locale = i18n.isEn() ? 'en-US' : 'id-ID';
    if (diff < 60000)    return i18n.t('common.justNow');
    if (diff < 3600000)  return i18n.t('common.minsAgo', {n: Math.floor(diff/60000)});
    if (diff < 86400000) return d.toLocaleTimeString(locale, {hour:'2-digit', minute:'2-digit'});
    return d.toLocaleDateString(locale, {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
  }

  /* ── Get current Firebase user ────────────────────────── */
  function getCurrentUser() {
    return _currentUser;
  }

  /* ── Sign Out ─────────────────────────────────────────── */
  async function signOut() {
    showModal(i18n.t('app.signOutTitle'), `
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">
        ${i18n.t('app.signOutDesc')}
      </p>
      <button class="btn btn-danger" onclick="App._doSignOut()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        ${i18n.t('app.signOutConfirm')}
      </button>
      <button class="btn btn-outline" onclick="App.closeModal()">${i18n.t('common.cancel')}</button>
    `);
  }

  async function _doSignOut() {
    closeModal();
    if (BLE.isConnected()) BLE.disconnect();
    try {
      await auth.signOut();
      window.location.replace('auth.html');
    } catch (e) {
      showToast(i18n.t('app.signOutFailed'), e.message, 'danger');
    }
  }

  /* ── Update Header Avatar ─────────────────────────────── */
  function _updateHeaderAvatar(user) {
    const avatarEl = document.getElementById('headerAvatar');
    if (!avatarEl) return;
    if (user?.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Avatar" onerror="this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' width=\\'18\\' height=\\'18\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\'/><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\'/></svg>'">`;
    }
    // Update subtitle with user name
    const profile = Storage.getProfile();
    const subtitle = document.getElementById('header-subtitle');
    if (subtitle) {
      const name = profile.childName || user?.displayName;
      subtitle.textContent = name ? i18n.t('header.monitoringAs', {name}) : i18n.t('header.tagline');
    }
  }

  /* ── Show Loading / Hide Loading ──────────────────────── */
  function _showApp() {
    const loading = document.getElementById('app-loading');
    const app     = document.getElementById('app');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => { loading.style.display = 'none'; }, 400);
    }
    if (app) app.style.display = '';
  }

  /* ── Boot ─────────────────────────────────────────────── */
  function boot() {
    // Register Service Worker with auto-update on new deploy
    _registerServiceWorker();

    // ── i18n change listener ─────────────────────────────
    i18n.onChange(() => {
      // Update static nav labels
      document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = i18n.t(el.dataset.i18n);
      });
      // Clear render cache for all pages so they re-render with new language
      Object.keys(pages).forEach(p => {
        const sec = document.getElementById(`page-${p}`);
        if (sec) {
          if (p === currentPage) {
            // Re-render the visible page immediately
            if (pages[p]?.destroy) pages[p].destroy();
            sec.innerHTML = '';
            renderPage(p, sec);
            sec.dataset.rendered = 'true';
            if (pages[p]?.init) setTimeout(() => pages[p].init(), 50);
          } else {
            // Clear cache so it re-renders next time it's visited
            sec.innerHTML = '';
            delete sec.dataset.rendered;
          }
        }
      });
      // Update header subtitle
      const subtitle = document.getElementById('header-subtitle');
      if (subtitle) {
        const profile = Storage.getProfile();
        const name = profile.childName || _currentUser?.displayName;
        subtitle.textContent = name ? i18n.t('header.monitoringAs', {name}) : i18n.t('header.tagline');
      }
      // Update PWA banner description if visible
      const pwaDesc = document.getElementById('pwa-banner-desc');
      if (pwaDesc) pwaDesc.textContent = i18n.isEn()
        ? 'Install as an app for quick access & offline use'
        : 'Pasang sebagai aplikasi untuk akses cepat & offline';
    });

    // ── Firebase Auth Guard ──────────────────────────────
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // Not logged in → redirect to auth page
        window.location.replace('auth.html');
        return;
      }

      // Logged in
      _currentUser = user;

      // Load profile from Firestore (merges into localStorage)
      await loadUserProfile(user.uid);

      // Hydrate event history from Firestore → localStorage cache
      await Storage.hydrateFromFirestore(user.uid);

      // Show the app
      _showApp();

      // Update header avatar
      _updateHeaderAvatar(user);

      // Init rest of app
      _initApp();
    });
  }

  /* ── Internal app init (called after auth confirmed) ──── */
  function _initApp() {
    // Request notification permission
    Notifications.requestPermission();

    // Handle BLE events
    BLE.onFallDetected = (data) => {
      const pName = Storage.getProfile().parentName || i18n.t('dev.defaultName');
      const msg   = i18n.t('app.fallDetected');
      const desc  = i18n.t('app.fallDesc', {name: pName});
      showToast(msg, desc, 'danger', 8000);
      addNotifBadge();
      Notifications.sendFallAlert(desc);
      Storage.addFallEvent({ type: 'fall', message: msg, detail: desc, timestamp: Date.now() });
      if (currentPage === 'dashboard') DashboardPage.onFallDetected(data);
      if (currentPage === 'monitor')   MonitorPage.onFallDetected(data);
    };

    BLE.onStanding = (data) => {
      if (currentPage === 'dashboard') DashboardPage.onStanding(data);
      if (currentPage === 'monitor')   MonitorPage.onSensorData(data);
    };

    BLE.onSensorData = (data) => {
      if (currentPage === 'monitor')   MonitorPage.onSensorData(data);
      if (currentPage === 'dashboard') DashboardPage.onSensorData(data);
    };

    BLE.onConnected = (deviceName) => {
      document.getElementById('bleDot').className = 'ble-dot connected';
      showToast(i18n.t('app.connected'), i18n.t('app.connectedDesc', {name: deviceName}), 'success');
      if (currentPage === 'device')    DevicePage.onConnected(deviceName);
      if (currentPage === 'dashboard') DashboardPage.onConnected(deviceName);
    };

    BLE.onDisconnected = () => {
      document.getElementById('bleDot').className = 'ble-dot disconnected';
      showToast(i18n.t('app.disconnected'), i18n.t('app.disconnDesc'), 'warning');
      if (currentPage === 'device')    DevicePage.onDisconnected();
      if (currentPage === 'dashboard') DashboardPage.onDisconnected();
    };

    BLE.onConnecting = () => {
      document.getElementById('bleDot').className = 'ble-dot connecting';
    };

    // Modal close on overlay click
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });

    // Determine initial page from hash
    const hash      = location.hash.replace('#', '') || 'dashboard';
    const startPage = pages[hash] ? hash : 'dashboard';

    // Render & activate first page
    const firstSection = document.getElementById(`page-${startPage}`);
    if (firstSection && !firstSection.dataset.rendered) {
      renderPage(startPage, firstSection);
      firstSection.dataset.rendered = 'true';
    }
    if (firstSection) firstSection.classList.add('active');

    const firstNav = document.getElementById(`nav-${startPage}`);
    if (firstNav) firstNav.classList.add('active');
    if (startPage !== 'dashboard') {
      document.getElementById('nav-dashboard')?.classList.remove('active');
    }

    currentPage = startPage;
    if (pages[startPage]?.init) setTimeout(() => pages[startPage].init(), 100);

    window.addEventListener('popstate', () => {
      const p = location.hash.replace('#', '') || 'dashboard';
      if (pages[p]) navigate(p);
    });

    // ── PWA Install Prompt ───────────────────────────────
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredInstall = e;
      // If we just opened dashboard, check timing
      if (currentPage === 'dashboard') _maybeShowPWABanner();
    });

    // Also check when user navigates to dashboard
    const _origNavigate = navigate;

    console.log('[GeriBand] App ready. User:', _currentUser?.email);

    // Show banner on first load if on dashboard
    if (startPage === 'dashboard') {
      setTimeout(() => _maybeShowPWABanner(), 2000);
    }
  }

  /* ── PWA Banner Logic ─────────────────────────────────── */
  function _maybeShowPWABanner() {
    if (!_deferredInstall) return;
    const last = parseInt(localStorage.getItem(PWA_KEY) || '0', 10);
    if (Date.now() - last < PWA_INTERVAL) return;
    _showPWABanner();
  }

  function _showPWABanner() {
    const banner = document.getElementById('pwaBanner');
    if (!banner) return;
    // Update description text with i18n
    const desc = document.getElementById('pwa-banner-desc');
    if (desc) desc.textContent = i18n.isEn()
      ? 'Install as an app for quick access & offline use'
      : 'Pasang sebagai aplikasi untuk akses cepat & offline';
    banner.classList.remove('hiding');
    banner.style.display = 'block';
  }

  function installPWA() {
    if (!_deferredInstall) return;
    _deferredInstall.prompt();
    _deferredInstall.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        localStorage.setItem(PWA_KEY, Date.now().toString());
        showToast('GeriBand', i18n.isEn() ? 'App installed successfully!' : 'Aplikasi berhasil dipasang!', 'success');
      }
      _deferredInstall = null;
      dismissPWA();
    });
  }

  function dismissPWA() {
    const banner = document.getElementById('pwaBanner');
    if (!banner) return;
    localStorage.setItem(PWA_KEY, Date.now().toString());
    banner.classList.add('hiding');
    setTimeout(() => { banner.style.display = 'none'; banner.classList.remove('hiding'); }, 300);
  }

  /* ── Public API ────────────────────────────────────────── */
  return {
    navigate,
    showToast,
    showModal,
    closeModal,
    addNotifBadge,
    clearNotifBadge,
    showNotifInfo,
    formatTime,
    getCurrentUser,
    signOut,
    _doSignOut,
    installPWA,
    dismissPWA,
    boot,
  };
})();

/* ── Storage Helper ──────────────────────────────────────── */
const Storage = (() => {
  const EVENTS_KEY   = 'gb_events';
  const PROFILE_KEY  = 'gb_profile';
  const SETTINGS_KEY = 'gb_settings';

  function getFallEvents() {
    try { return JSON.parse(localStorage.getItem(EVENTS_KEY)) || []; } catch { return []; }
  }

  function addFallEvent(event) {
    const events = getFallEvents();
    events.unshift(event);
    if (events.length > 200) events.splice(200);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    // Mirror to Firestore under /users/{uid}/events/{eventId}
    const user = App.getCurrentUser();
    if (user && typeof addEventToFirestore === 'function') {
      addEventToFirestore(user.uid, event).catch(() => {});
    }
  }

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { parentName: '', childName: '', age: '', email: '', photoURL: null };
    } catch {
      return { parentName: '', childName: '', age: '', email: '', photoURL: null };
    }
  }

  function saveProfile(data) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    // Sync to Firestore
    const user = App.getCurrentUser();
    if (user) {
      updateUserProfile(user.uid, {
        parentName: data.parentName || '',
        childName:  data.childName  || '',
        age:        data.age        || '',
      }).catch(() => {});
    }
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
        notifEnabled: true, soundEnabled: true, vibration: true, sensitivity: 'medium', autoConnect: false,
      };
    } catch {
      return { notifEnabled: true, soundEnabled: true, vibration: true, sensitivity: 'medium', autoConnect: false };
    }
  }

  function saveSettings(data) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    // Sync settings to Firestore
    const user = App.getCurrentUser();
    if (user) {
      updateUserProfile(user.uid, { settings: data }).catch(() => {});
    }
  }

  function clearAll() {
    localStorage.removeItem(EVENTS_KEY);
    // Mirror-clear Firestore events
    const user = App.getCurrentUser();
    if (user && typeof clearEventsFromFirestore === 'function') {
      clearEventsFromFirestore(user.uid).catch(() => {});
    }
  }

  /**
   * Hydrate local cache from Firestore (called on login).
   * Firestore is the source of truth across devices.
   */
  async function hydrateFromFirestore(uid) {
    if (!uid || typeof loadEventsFromFirestore !== 'function') return;
    const remote = await loadEventsFromFirestore(uid);
    if (Array.isArray(remote)) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(remote));
    }
  }

  return { getFallEvents, addFallEvent, getProfile, saveProfile, getSettings, saveSettings, clearAll, hydrateFromFirestore };
})();

/* ── Boot on DOM ready ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.boot());
