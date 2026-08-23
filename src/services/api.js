// ===== BASE API SERVICE =====
// Centralized fetch wrapper with error handling.

const BASE_CHAT    = 'https://6a87366470fbbd308f98cd06.mockapi.io';
const BASE_MEDIA   = 'https://6a8737cb70fbbd308f98cf01.mockapi.io';

export const ENDPOINTS = {
  CHAT:           `${BASE_CHAT}/chat`,
  AUDIO:          `${BASE_CHAT}/Audio`,
  IMAGE:          `${BASE_MEDIA}/Rasm`,
  AVATAR_PROFILE: `${BASE_MEDIA}/AvatarProfile`,
};

/**
 * Thin fetch wrapper.
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>} Parsed JSON or throws Error
 */
export async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export async function apiGet(url)           { return apiFetch(url, { method: 'GET' }); }
export async function apiPost(url, body)    { return apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }); }
export async function apiPut(url, body)     { return apiFetch(url, { method: 'PUT',    body: JSON.stringify(body) }); }
export async function apiDelete(url)        { return apiFetch(url, { method: 'DELETE' }); }

// ---- Cross-resource id namespacing ----
// chat / Audio / Rasm are three SEPARATE MockAPI resources, each with its
// own auto-incrementing integer id starting at 1. A text message and a
// voice message can therefore end up with the exact same raw `id` (e.g.
// chat id "7" and Audio id "7"). Everywhere in the app that merges these
// three streams into one message list de-dupes purely by `id`
// (store/chat.js's syncMessages), so without namespacing, a colliding
// audio/image record looks like "already have this one" and gets silently
// dropped for anyone who receives it via the sync/merge path rather than
// their own optimistic send. Tagging the id with its resource type the
// moment a record enters the app (both from GET and from a POST response)
// makes every id collision-free across the whole app, root cause fixed at
// the one place all three services already funnel through.
export function withNamespacedId(record, ns) {
  if (!record || record.id == null) return record;
  return { ...record, id: `${ns}:${record.id}` };
}

export function stripNamespace(id) {
  if (typeof id !== 'string') return id;
  const i = id.indexOf(':');
  return i === -1 ? id : id.slice(i + 1);
}
