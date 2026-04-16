/* ============================================================
   GERIBAND — Auth Page Logic
   Handles Login, Register, Google Sign-In on auth.html
   ============================================================ */

const AuthUI = (() => {

  /* ── Auth flow flag (prevents onAuthStateChanged from redirecting
        while login/register is still saving to Firestore) ─────── */
  let _inAuthFlow = false;

  /* ── Tab Switching ─────────────────────────────────────── */
  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('form-login').classList.toggle('active', isLogin);
    document.getElementById('form-register').classList.toggle('active', !isLogin);
    _clearErrors();
    _applyTranslations();
  }

  /* ── Password Visibility ───────────────────────────────── */
  function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.innerHTML = isHidden
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  /* ── Login with Email/Password ─────────────────────────── */
  async function login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      return _showError('login', i18n.t('err.fillAll'));
    }
    if (!_isValidEmail(email)) {
      return _showError('login', i18n.t('err.invalidEmail'));
    }

    _setLoading('login', true);
    _clearErrors();
    _inAuthFlow = true;

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      await saveUserToFirestore(cred.user);
      _redirectToApp();
    } catch (err) {
      _inAuthFlow = false;
      _setLoading('login', false);
      _showError('login', _mapAuthError(err.code));
    }
  }

  /* ── Register with Email/Password ─────────────────────── */
  async function register() {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    if (!name || !email || !password || !confirm) {
      return _showError('register', i18n.t('err.fillAll'));
    }
    if (!_isValidEmail(email)) {
      return _showError('register', i18n.t('err.invalidEmail'));
    }
    if (password.length < 6) {
      return _showError('register', i18n.t('err.passwordMin'));
    }
    if (password !== confirm) {
      return _showError('register', i18n.t('err.passwordMatch'));
    }

    _setLoading('register', true);
    _clearErrors();
    _inAuthFlow = true;

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      await saveUserToFirestore(cred.user, {
        displayName: name,
        childName:   name,
        parentName:  '',
        age:         '',
      });

      document.getElementById('register-success').classList.add('show');
      setTimeout(_redirectToApp, 1200);

    } catch (err) {
      _inAuthFlow = false;
      _setLoading('register', false);
      _showError('register', _mapAuthError(err.code));
    }
  }

  /* ── Google Sign-In ────────────────────────────────────── */
  async function loginWithGoogle() {
    _setLoading('login', true);
    _setLoading('register', true);
    _clearErrors();
    _inAuthFlow = true;

    try {
      const result = await auth.signInWithPopup(googleProvider);
      await saveUserToFirestore(result.user, {
        childName: result.user.displayName || '',
      });
      _redirectToApp();
    } catch (err) {
      _inAuthFlow = false;
      _setLoading('login', false);
      _setLoading('register', false);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        const activeTab = document.getElementById('form-login').classList.contains('active') ? 'login' : 'register';
        _showError(activeTab, _mapAuthError(err.code));
      }
    }
  }

  /* ── Forgot Password ────────────────────────────────────── */
  async function forgotPassword() {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      return _showError('login', i18n.t('err.enterEmail'));
    }
    if (!_isValidEmail(email)) {
      return _showError('login', i18n.t('err.invalidEmail'));
    }

    try {
      await auth.sendPasswordResetEmail(email);
      _clearErrors();
      const errEl  = document.getElementById('login-error');
      const msgEl  = document.getElementById('login-error-msg');
      errEl.style.background = 'var(--safe-bg)';
      errEl.style.color      = 'var(--safe)';
      errEl.classList.add('show');
      msgEl.textContent = i18n.t('auth.resetSent', {email});
    } catch (err) {
      _showError('login', _mapAuthError(err.code));
    }
  }

  /* ── Apply Translations to DOM ──────────────────────────── */
  function _applyTranslations() {
    const s = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const a = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };

    // Tabs
    s('tab-login',    i18n.t('auth.signIn'));
    s('tab-register', i18n.t('auth.register'));

    // Login form labels/placeholders
    a('login-email',    'placeholder', i18n.t('auth.emailPh'));
    a('login-password', 'placeholder', i18n.t('auth.passwordPh'));
    s('login-btn-text', i18n.t('auth.signInBtn'));

    // Register form labels/placeholders
    a('reg-name',    'placeholder', i18n.t('auth.yourNamePh'));
    a('reg-email',   'placeholder', i18n.t('auth.emailPh'));
    a('reg-password','placeholder', i18n.t('auth.passwordPh'));
    a('reg-confirm', 'placeholder', i18n.t('auth.confirmPh'));
    s('register-btn-text', i18n.t('auth.registerBtn'));

    // Input labels
    document.querySelectorAll('[data-i18n-auth]').forEach(el => {
      el.textContent = i18n.t(el.dataset.i18nAuth);
    });

    // Google buttons
    const loginGoogleBtn = document.getElementById('login-google-btn');
    if (loginGoogleBtn) {
      const svg = loginGoogleBtn.querySelector('svg');
      loginGoogleBtn.textContent = i18n.t('auth.googleSignIn');
      if (svg) loginGoogleBtn.insertBefore(svg, loginGoogleBtn.firstChild);
    }
    const regGoogleBtn = document.getElementById('reg-google-btn');
    if (regGoogleBtn) {
      const svg = regGoogleBtn.querySelector('svg');
      regGoogleBtn.textContent = i18n.t('auth.googleReg');
      if (svg) regGoogleBtn.insertBefore(svg, regGoogleBtn.firstChild);
    }

    // Footer
    const footerTitle = document.querySelector('.auth-footer strong');
    if (footerTitle) footerTitle.textContent = i18n.t('auth.footerTitle');

    // Forgot password button
    const forgotBtn = document.querySelector('.auth-forgot button');
    if (forgotBtn) forgotBtn.textContent = i18n.t('auth.forgotPw');

    // Auth divider "atau"
    document.querySelectorAll('.auth-divider').forEach(el => {
      el.textContent = i18n.t('auth.or');
    });

    // Page title
    document.title = `${i18n.t('auth.signIn')} — GeriBand`;
  }

  /* ── Redirect to main app ───────────────────────────────── */
  function _redirectToApp() {
    window.location.replace('dashboard.html');
  }

  /* ── Helpers ───────────────────────────────────────────── */
  function _showError(form, msg) {
    const errEl = document.getElementById(`${form}-error`);
    const msgEl = document.getElementById(`${form}-error-msg`);
    if (!errEl || !msgEl) return;
    errEl.style.background = '';
    errEl.style.color      = '';
    msgEl.textContent = msg;
    errEl.classList.add('show');
  }

  function _clearErrors() {
    ['login-error', 'register-error', 'register-success'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
    });
  }

  function _setLoading(form, loading) {
    const btn     = document.getElementById(`${form === 'login' ? 'login' : 'register'}-btn`);
    const btnText = document.getElementById(`${form === 'login' ? 'login' : 'register'}-btn-text`);
    const gBtn    = document.getElementById(form === 'login' ? 'login-google-btn' : 'reg-google-btn');
    if (btn)     btn.disabled  = loading;
    if (gBtn)    gBtn.disabled = loading;
    if (btnText) btnText.textContent = loading
      ? (form === 'login' ? i18n.t('auth.signingIn') : i18n.t('auth.registering'))
      : (form === 'login' ? i18n.t('auth.signInBtn') : i18n.t('auth.registerBtn'));
  }

  function _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ── Firebase Error Code Mapper ─────────────────────────── */
  function _mapAuthError(code) {
    const map = {
      'auth/user-not-found':          'err.userNotFound',
      'auth/wrong-password':          'err.wrongPassword',
      'auth/invalid-credential':      'err.invalidCred',
      'auth/email-already-in-use':    'err.emailInUse',
      'auth/weak-password':           'err.weakPassword',
      'auth/invalid-email':           'err.invalidEmail',
      'auth/too-many-requests':       'err.tooMany',
      'auth/network-request-failed':  'err.network',
      'auth/popup-blocked':           'err.popupBlocked',
      'auth/account-exists-with-different-credential': 'err.accountDiff',
      'auth/user-disabled':           'err.disabled',
      'auth/operation-not-allowed':   'err.disabled',
    };
    const key = map[code];
    return key ? i18n.t(key) : i18n.t('err.default', {code});
  }

  /* ── Auto-redirect if already logged in ─────────────────── */
  function init() {
    auth.onAuthStateChanged(async user => {
      if (user && !_inAuthFlow) {
        // Returning session (page refresh / already logged in):
        // ensure Firestore doc exists, then redirect.
        try { await saveUserToFirestore(user); } catch (e) { console.warn('[Auth] Firestore save:', e.message); }
        _redirectToApp();
      }
    });

    // Apply initial translations
    _applyTranslations();

    // Re-apply on language change
    i18n.onChange(() => _applyTranslations());

    // Enter key on inputs
    ['login-email', 'login-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    });
    ['reg-name', 'reg-email', 'reg-password', 'reg-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') register(); });
    });
  }

  return { switchTab, togglePw, login, register, loginWithGoogle, forgotPassword, init };
})();

// Boot auth UI
document.addEventListener('DOMContentLoaded', () => AuthUI.init());
