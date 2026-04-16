/* ============================================================
   GERIBAND — History Page
   ============================================================ */

const HistoryPage = (() => {
  let _currentFilter = 'all';

  /* ── Render HTML ──────────────────────────────────────── */
  function render() {
    return `
    <div class="page-header">
      <h2>${i18n.t('hist.title')}</h2>
      <p>${i18n.t('hist.subtitle')}</p>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs" id="hist-filters">
      <button class="filter-tab active" data-filter="all"    onclick="HistoryPage.setFilter('all')">${i18n.t('hist.filterAll')}</button>
      <button class="filter-tab"        data-filter="today"  onclick="HistoryPage.setFilter('today')">${i18n.t('hist.filterToday')}</button>
      <button class="filter-tab"        data-filter="week"   onclick="HistoryPage.setFilter('week')">${i18n.t('hist.filterWeek')}</button>
      <button class="filter-tab"        data-filter="fall"   onclick="HistoryPage.setFilter('fall')">${i18n.t('hist.filterFall')}</button>
    </div>

    <!-- Summary Stats -->
    <div class="scroll-x" style="gap:10px;margin-bottom:16px;padding:4px 0;">
      <div class="neu-card-sm" style="min-width:100px;text-align:center;flex-shrink:0;">
        <div style="font-size:1.4rem;font-weight:800;color:var(--danger);" id="hist-total-fall">0</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${i18n.t('hist.totalFall')}</div>
      </div>
      <div class="neu-card-sm" style="min-width:100px;text-align:center;flex-shrink:0;">
        <div style="font-size:1.4rem;font-weight:800;color:var(--primary);" id="hist-today-fall">0</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${i18n.t('hist.today')}</div>
      </div>
      <div class="neu-card-sm" style="min-width:100px;text-align:center;flex-shrink:0;">
        <div style="font-size:1.4rem;font-weight:800;color:var(--accent-dark);" id="hist-week-fall">0</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${i18n.t('hist.thisWeek')}</div>
      </div>
    </div>

    <!-- Events List -->
    <div id="hist-list"></div>

    <!-- Clear Button -->
    <div style="margin-top:8px;">
      <button class="btn btn-ghost" onclick="HistoryPage.confirmClear()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6"/></svg>
        ${i18n.t('hist.clearAll')}
      </button>
    </div>
    `;
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    _computeStats();
    renderList();
  }

  /* ── Destroy ─────────────────────────────────────────── */
  function destroy() {}

  /* ── Compute Stats ──────────────────────────────────── */
  function _computeStats() {
    const events = Storage.getFallEvents().filter(e => e.type !== 'connect');
    const now    = Date.now();
    const today  = new Date(); today.setHours(0,0,0,0);
    const week   = new Date(now - 7 * 86400000);

    const totalFall = events.filter(e => e.type === 'fall').length;
    const todayFall = events.filter(e => e.type === 'fall' && e.timestamp >= today.getTime()).length;
    const weekFall  = events.filter(e => e.type === 'fall' && e.timestamp >= week.getTime()).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('hist-total-fall', totalFall);
    set('hist-today-fall', todayFall);
    set('hist-week-fall',  weekFall);
  }

  /* ── Set Filter ─────────────────────────────────────── */
  function setFilter(filter) {
    _currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    renderList();
  }

  /* ── Render List ────────────────────────────────────── */
  function renderList() {
    const listEl = document.getElementById('hist-list');
    if (!listEl) return;

    let events = Storage.getFallEvents().filter(e => e.type !== 'connect');

    const now   = Date.now();
    const today = new Date(); today.setHours(0,0,0,0);
    const week  = new Date(now - 7 * 86400000);

    if (_currentFilter === 'today') {
      events = events.filter(e => e.timestamp >= today.getTime());
    } else if (_currentFilter === 'week') {
      events = events.filter(e => e.timestamp >= week.getTime());
    } else if (_currentFilter === 'fall') {
      events = events.filter(e => e.type === 'fall');
    }

    if (!events.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          <h4>${i18n.t('hist.noData')}</h4>
          <p>${i18n.t('hist.noDataDesc')}</p>
        </div>
      `;
      return;
    }

    const locale = i18n.isEn() ? 'en-US' : 'id-ID';
    const groups = {};
    events.forEach(e => {
      const d   = new Date(e.timestamp);
      const key = d.toLocaleDateString(locale, {weekday:'long', day:'numeric', month:'long', year:'numeric'});
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    let html = '';
    Object.entries(groups).forEach(([date, items]) => {
      html += `<div class="history-group"><div class="history-date">${date}</div>`;
      items.forEach(e => { html += _renderItem(e); });
      html += `</div>`;
    });

    listEl.innerHTML = html;
  }

  /* ── Render Single Item ─────────────────────────────── */
  function _renderItem(e) {
    const locale = i18n.isEn() ? 'en-US' : 'id-ID';
    const d    = new Date(e.timestamp);
    const time = d.toLocaleTimeString(locale, {hour:'2-digit', minute:'2-digit', second:'2-digit'});

    if (e.type === 'fall') {
      return `
        <div class="history-item">
          <div class="history-icon fall">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="19" cy="5" r="2"/>
              <path d="M4 10 L19 7"/>
              <path d="M15 7 L19 7 L19 12"/>
              <path d="M4 14 L8 10"/>
              <path d="M7 14 L4 18"/>
            </svg>
          </div>
          <div class="history-content">
            <div class="history-title">${e.message || i18n.t('hist.fallEvent')}</div>
            <div class="history-meta">
              <span>${e.detail || i18n.t('hist.fallDetail')}</span>
            </div>
            <div class="history-time">${time}</div>
            <span class="history-severity high">${i18n.t('hist.emergency')}</span>
          </div>
        </div>
      `;
    } else if (e.type === 'connect') {
      return `
        <div class="history-item">
          <div class="history-icon connect">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="6.5,6.5 17.5,17.5"/>
              <path d="M12 3L12 21"/>
              <path d="M12 3L18 9"/>
              <path d="M12 3L6 9"/>
              <path d="M12 21L18 15"/>
              <path d="M12 21L6 15"/>
            </svg>
          </div>
          <div class="history-content">
            <div class="history-title">${e.message || i18n.t('hist.deviceConn')}</div>
            <div class="history-time">${time}</div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="history-item">
          <div class="history-icon normal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div class="history-content">
            <div class="history-title">${e.message || i18n.t('hist.statusNormal')}</div>
            <div class="history-time">${time}</div>
          </div>
        </div>
      `;
    }
  }

  /* ── Confirm Clear ─────────────────────────────────── */
  function confirmClear() {
    App.showModal(i18n.t('hist.confirmTitle'), `
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">
        ${i18n.t('hist.confirmDesc')}
      </p>
      <button class="btn btn-danger" onclick="HistoryPage.clearAll();App.closeModal();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/></svg>
        ${i18n.t('hist.confirmBtn')}
      </button>
      <button class="btn btn-outline" onclick="App.closeModal()">${i18n.t('common.cancel')}</button>
    `);
  }

  /* ── Clear All ─────────────────────────────────────── */
  function clearAll() {
    Storage.clearAll();
    _computeStats();
    renderList();
    App.showToast('', i18n.t('hist.clearSuccess'), 'success');
  }

  return { render, init, destroy, setFilter, renderList, confirmClear, clearAll };
})();
