/* ============================================================
   GERIBAND — Firebase Configuration & Initialization
   Using Firebase Compat SDK (v10) via CDN
   ============================================================ */

// Credentials are loaded from the gitignored `firebase-config.local.js`
// (see `firebase-config.local.example.js` for the template).
const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  throw new Error(
    '[Firebase] Missing config. Copy script/firebase-config.local.example.js ' +
    'to script/firebase-config.local.js and load it before firebase-config.js.'
  );
}

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exported globals used across the app
const db   = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

/* ── Firestore helpers ──────────────────────────────────── */

/**
 * Save or update a user document in Firestore /users/{uid}
 * Uses merge:true so partial updates don't wipe existing fields.
 */
async function saveUserToFirestore(firebaseUser, extraData = {}) {
  if (!firebaseUser) return;
  const ref  = db.collection('users').doc(firebaseUser.uid);
  const snap = await ref.get();

  const base = {
    uid:         firebaseUser.uid,
    email:       firebaseUser.email || '',
    displayName: firebaseUser.displayName || extraData.displayName || '',
    photoURL:    firebaseUser.photoURL    || null,
    lastLogin:   firebase.firestore.FieldValue.serverTimestamp(),
    provider:    firebaseUser.providerData[0]?.providerId || 'password',
  };

  if (!snap.exists) {
    // New user — set all fields including defaults
    await ref.set({
      ...base,
      parentName: extraData.parentName || '',
      childName:  extraData.childName  || firebaseUser.displayName || '',
      age:        extraData.age        || '',
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      settings: {
        notifEnabled: true,
        soundEnabled: true,
        vibration:    true,
        sensitivity:  'medium',
        autoConnect:  false,
      },
    });
  } else {
    // Existing user — only update base fields
    await ref.update(base);
  }
}

/**
 * Load user profile from Firestore and merge into localStorage
 */
async function loadUserProfile(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
      const data = snap.data();
      // Merge into localStorage Storage helper
      const profile = {
        parentName: data.parentName || '',
        childName:  data.childName  || data.displayName || '',
        age:        data.age        || '',
        email:      data.email      || '',
        photoURL:   data.photoURL   || null,
        displayName:data.displayName|| '',
      };
      localStorage.setItem('gb_profile', JSON.stringify(profile));

      if (data.settings) {
        localStorage.setItem('gb_settings', JSON.stringify(data.settings));
      }
      return data;
    }
  } catch (e) {
    console.warn('[Firestore] loadUserProfile error:', e.message);
  }
  return null;
}

/**
 * Update profile fields in Firestore
 */
async function updateUserProfile(uid, fields) {
  try {
    await db.collection('users').doc(uid).update({
      ...fields,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn('[Firestore] updateUserProfile error:', e.message);
    return false;
  }
}

/* ══════════════════════════════════════════════════════════
   EVENTS SUBCOLLECTION — /users/{uid}/events/{eventId}
   Stores fall-detection / status history per user
   ══════════════════════════════════════════════════════════ */

const EVENTS_MAX = 200;

/**
 * Append a single event to Firestore under the user's events subcollection.
 * Returns the generated document id, or null on failure.
 */
async function addEventToFirestore(uid, event) {
  if (!uid || !event) return null;
  try {
    const col = db.collection('users').doc(uid).collection('events');
    const ref = col.doc();
    await ref.set({
      id:        ref.id,
      type:      event.type    || 'info',
      message:   event.message || '',
      detail:    event.detail  || '',
      timestamp: event.timestamp || Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.warn('[Firestore] addEvent error:', e.message);
    return null;
  }
}

/**
 * Load latest events (ordered desc by timestamp) from Firestore.
 * Returns an array of plain event objects (or [] on error).
 */
async function loadEventsFromFirestore(uid, limit = EVENTS_MAX) {
  if (!uid) return [];
  try {
    const qs = await db.collection('users').doc(uid).collection('events')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return qs.docs.map(doc => {
      const d = doc.data();
      return {
        id:        doc.id,
        type:      d.type      || 'info',
        message:   d.message   || '',
        detail:    d.detail    || '',
        timestamp: d.timestamp || 0,
      };
    });
  } catch (e) {
    console.warn('[Firestore] loadEvents error:', e.message);
    return [];
  }
}

/**
 * Delete all events under the user's subcollection.
 * Batches deletes in groups of 400 (Firestore limit: 500 ops per batch).
 */
async function clearEventsFromFirestore(uid) {
  if (!uid) return false;
  try {
    const col = db.collection('users').doc(uid).collection('events');
    const qs  = await col.get();
    if (qs.empty) return true;

    const chunks = [];
    for (let i = 0; i < qs.docs.length; i += 400) {
      chunks.push(qs.docs.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    return true;
  } catch (e) {
    console.warn('[Firestore] clearEvents error:', e.message);
    return false;
  }
}
