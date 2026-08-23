// ===== AUTHENTICATION STORE =====
// Manages session state, login, logout, user data.

const STORAGE_KEY = 'cs_session';

// Valid login codes → user objects
const CREDENTIALS = {
  lovy: { userId: 'mad1na', username: 'Mad1na_Lov3', gender: 'female' },
  mony: { userId: 'specter', username: 'Specter',    gender: 'male'   },
};

// The opposite user for each account
const COUNTERPART = {
  mad1na:  { userId: 'specter', username: 'Specter'     },
  specter: { userId: 'mad1na',  username: 'Mad1na_Lov3' },
};

// ---- Simple reactive store ----
function createStore(initial) {
  let state = initial;
  const listeners = [];
  return {
    getState: ()        => state,
    setState: (partial) => { state = { ...state, ...partial }; listeners.forEach(fn => fn(state)); },
    subscribe: (fn)     => { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }; },
  };
}

// Load persisted session
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
})();

export const authStore = createStore({ session: saved });

// ---- Public API ----

/** Returns false on invalid code, true + stores session on success */
export function login(code) {
  const user = CREDENTIALS[code.trim().toLowerCase()];
  if (!user) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  authStore.setState({ session: user });
  return true;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  authStore.setState({ session: null });
}

/** Returns the currently-logged-in user object, or null */
export function getCurrentUser() {
  return authStore.getState().session;
}

/** Returns the OTHER user's basic info (userId + username) */
export function getOtherUser() {
  const s = authStore.getState().session;
  return s ? COUNTERPART[s.userId] : null;
}

/** Called at app boot — returns the saved session (or null) */
export function initAuth() {
  return authStore.getState().session;
}
