/* ============================================================
   GERIBAND — Notifications Manager
   Web Notifications API + optional Service Worker push
   ============================================================ */

const Notifications = (() => {
  let _permitted = false;

  /* ── Request Permission ───────────────────────────────── */
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notif] Notifications not supported');
      return false;
    }
    if (Notification.permission === 'granted') {
      _permitted = true;
      return true;
    }
    if (Notification.permission === 'denied') {
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      _permitted = result === 'granted';
      return _permitted;
    } catch {
      return false;
    }
  }

  /* ── Send Fall Alert ──────────────────────────────────── */
  function sendFallAlert(detail = '') {
    const settings = Storage.getSettings();
    if (!settings.notifEnabled) return;

    const profile = Storage.getProfile();
    const name    = profile.parentName || i18n.t('dev.defaultName');

    _send({
      title: i18n.t('notif.fallTitle', {name}),
      body:  detail || i18n.t('notif.fallBody', {name}),
      icon:  'assets/icon-192.png',
      badge: 'assets/badge-72.png',
      tag:   'geriband-fall',
      renotify: true,
      requireInteraction: true,
      vibrate: settings.vibration ? [300, 100, 300, 100, 300] : undefined,
      data:  { type: 'fall', timestamp: Date.now() },
      actions: [
        { action: 'view',    title: i18n.t('notif.viewDetail') },
        { action: 'dismiss', title: i18n.t('notif.dismiss') },
      ],
    });

    // Also play sound
    if (settings.soundEnabled) playAlertSound();
  }

  /* ── Send Info Notification ──────────────────────────── */
  function sendInfo(title, body) {
    const settings = Storage.getSettings();
    if (!settings.notifEnabled) return;
    _send({ title, body, icon: 'assets/icon-192.png', tag: 'geriband-info' });
  }

  /* ── Send Connected Notification ────────────────────── */
  function sendConnected(deviceName) {
    _send({
      title: i18n.t('notif.connTitle'),
      body:  i18n.t('notif.connBody', {name: deviceName}),
      icon:  'assets/icon-192.png',
      tag:   'geriband-connect',
    });
  }

  /* ── Internal Send ────────────────────────────────────── */
  function _send(options) {
    if (!_permitted || Notification.permission !== 'granted') {
      requestPermission().then(ok => { if (ok) _send(options); });
      return;
    }

    // Try via Service Worker first (for background support)
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', payload: options });
      return;
    }

    // Fallback: direct Notification API
    try {
      const notif = new Notification(options.title || 'GeriBand', {
        body:             options.body,
        icon:             options.icon,
        badge:            options.badge,
        tag:              options.tag,
        renotify:         options.renotify,
        requireInteraction: options.requireInteraction,
        vibrate:          options.vibrate,
        data:             options.data,
      });
      notif.onclick = () => { window.focus(); notif.close(); };
    } catch (e) {
      console.warn('[Notif] Failed to send:', e.message);
    }
  }

  /* ── Alert Sound ─────────────────────────────────────── */
  function playAlertSound() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, start, dur) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      play(880, 0,   0.15);
      play(660, 0.2, 0.15);
      play(880, 0.4, 0.15);
      play(440, 0.6, 0.3);
    } catch (e) { /* Audio not available */ }
  }

  /* ── Vibrate ─────────────────────────────────────────── */
  function vibrate(pattern = [300, 100, 300]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /* ── Is Permitted ────────────────────────────────────── */
  function isPermitted() {
    return _permitted || Notification.permission === 'granted';
  }

  /* ── Permission Status ───────────────────────────────── */
  function getStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  return {
    requestPermission,
    sendFallAlert,
    sendInfo,
    sendConnected,
    playAlertSound,
    vibrate,
    isPermitted,
    getStatus,
  };
})();
