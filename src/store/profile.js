// ===== PROFILE STORE =====
// Manages profile data (nickname + avatar) for both users.
// Priority: localStorage (instant) → API (sync in background).

const KEY_PREFIX = 'cs_profile_';

const DEFAULTS = {
  mad1na:  { userId: 'mad1na',  nickname: 'Mad1na_Lov3', avatarBase64: null, apiId: null },
  specter: { userId: 'specter', nickname: 'Specter',      avatarBase64: null, apiId: null },
};

function storageKey(userId) { return KEY_PREFIX + userId; }

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? { ...DEFAULTS[userId], ...JSON.parse(raw) } : { ...DEFAULTS[userId] };
  } catch {
    return { ...DEFAULTS[userId] };
  }
}

function saveToStorage(profile) {
  localStorage.setItem(storageKey(profile.userId), JSON.stringify(profile));
}

// In-memory cache
const _profiles = {
  mad1na:  loadFromStorage('mad1na'),
  specter: loadFromStorage('specter'),
};

const listeners = [];

function notify() {
  listeners.forEach(fn => fn({ ..._profiles }));
}

export const profileStore = {
  getState: ()    => ({ ..._profiles }),
  subscribe: (fn) => {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  },
};

// ---- Public API ----

export function getProfile(userId) {
  return { ..._profiles[userId] };
}

export function updateProfile(userId, partial) {
  _profiles[userId] = { ..._profiles[userId], ...partial };
  saveToStorage(_profiles[userId]);
  notify();
}

/** Sets apiId once we learn it from the AvatarProfile API */
export function setApiId(userId, apiId) {
  _profiles[userId].apiId = apiId;
  saveToStorage(_profiles[userId]);
}
