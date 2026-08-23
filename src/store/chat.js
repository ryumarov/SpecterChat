// ===== CHAT STORE & SYNC =====
// This store is an in-memory VIEW over the 3 message APIs (chat/Audio/
// Rasm), not a source of truth of its own — it holds no local/mock/
// pre-seeded messages and persists nothing to localStorage. Every message
// shown in the UI got here by a GET from one of the 3 resource-specific
// services below, or as a short-lived optimistic entry (id starting
// "temp-") that's replaced by the real API record as soon as the POST
// resolves. Refreshing the page re-populates this store from the APIs
// again from scratch (see syncMessages()) rather than restoring a cached
// copy — the APIs are the only durable storage.
import { getChatMessages, deleteChatMessage } from '../services/chatService.js';
import { getAudioMessages, deleteAudioMessage } from '../services/audioService.js';
import { getImageMessages, deleteImageMessage } from '../services/imageService.js';
import { getCurrentUser, getOtherUser } from './auth.js';

const UNREAD_KEY = 'cs_unread_count'; // UI-only badge count, not chat data

function loadUnread() {
  return parseInt(localStorage.getItem(UNREAD_KEY), 10) || 0;
}

let _messages = []; // in-memory only — populated exclusively from API GETs
let _unread   = loadUnread();
let _pollingInterval = null;
let _isPolling = false;

const listeners = [];
function notify() { listeners.forEach(fn => fn({ messages: _messages, unread: _unread })); }

export const chatStore = {
  getState:  () => ({ messages: [..._messages], unread: _unread }),
  subscribe: (fn) => {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  },
  addMessage: (msg) => addMessage(msg),
  replaceMessage: (oldId, newMsg) => replaceMessage(oldId, newMsg)
};

export function setMessages(msgs) {
  _messages = msgs;
  notify();
}

export function addMessage(msg) {
  if (!_messages.find(m => m.id === msg.id)) {
    _messages = [..._messages, msg];
    notify();
  }
}

export function replaceMessage(oldId, newMsg) {
  let updated = _messages.filter(m => m.id !== oldId && m.id !== newMsg.id);
  updated = [...updated, newMsg];
  updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  _messages = updated;
  notify();
}

export function setUnread(count) {
  // Guard against a no-op notify: without this, any subscriber that reacts
  // to a store update by calling clearUnread()/setUnread() (e.g. ChatScreen
  // clearing the badge while the chat is open) retriggers notify() -> that
  // same subscriber -> setUnread() again, forever, since the count is
  // already 0 the second time but notify() fired regardless. Skipping the
  // notify when nothing actually changed breaks that synchronous loop at
  // its root instead of papering over it with a try/catch or a recursion cap.
  if (_unread === count) return;
  _unread = count;
  localStorage.setItem(UNREAD_KEY, count);
  notify();
}

export function incrementUnread() {
  setUnread(_unread + 1);
}

export function clearUnread() {
  setUnread(0);
}

// --- SYNC & CLEANUP LOGIC ---

// Fetches one resource without letting a failure look like "this resource
// is now empty" — callers need to tell the difference between "fetched,
// zero records" and "fetch failed" so a removal-reconciliation pass never
// mistakes a network hiccup for every message of that type being deleted.
async function fetchResource(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, data: [] };
  }
}

// Is the conversation actually the screen on-screen right now? On mobile
// this is simply hash === '#chat' (the only route that ever mounts
// ChatScreen there). On desktop there's no separate chat-list screen —
// opening the "Chats" tab (hash '#chats') renders this same single
// conversation directly (see router.js) — so '#chats' also counts as
// "currently open" there. Used to decide whether an incoming message
// should bump the unread badge (skip it — they're already looking at it)
// or not (show it — they're elsewhere in the app).
function isChatCurrentlyOpen() {
  const hash = window.location.hash;
  if (hash === '#chat') return true;
  if (hash === '#chats' && window.innerWidth >= 768) return true;
  return false;
}

async function syncMessages() {
  if (_isPolling) return;
  _isPolling = true;
  
  const me = getCurrentUser();
  const otherUser = getOtherUser();
  if (!me || !otherUser) {
    _isPolling = false;
    return;
  }

  try {
    const [chat, audio, image] = await Promise.all([
      fetchResource(getChatMessages),
      fetchResource(getAudioMessages),
      fetchResource(getImageMessages),
    ]);
    const byNs = { text: chat, audio: audio, image: image };

    // Combine all remote records into a single stream
    const remoteMessages = [...chat.data, ...audio.data, ...image.data];
    
    let hasNew = false;
    let hasRemoved = false;
    let newIncomingCount = 0;
    
    // The user stated there is only 1 chat in the whole app, so no need to filter by sender/receiver
    const conversationMessages = remoteMessages.filter(m => m && (m.id || m.createdAt));

    // Merge logic
    const localMap = new Map(_messages.map(m => [m.id, m]));
    let merged = [..._messages];

    conversationMessages.forEach(rm => {
      if (!localMap.has(rm.id)) {
        merged.push(rm);
        hasNew = true;
        if (rm.senderId === otherUser.userId) {
          newIncomingCount++;
        }
      }
    });

    // Removal reconciliation: a message deleted (by either participant, on
    // this device or the other one) disappears from its resource's GET
    // response. If we can confirm that resource's fetch actually
    // succeeded, and a locally-held message's id is no longer in it, drop
    // it locally too — this is what lets a delete show up for the other
    // user without them refreshing, and keeps a deleted message from
    // reappearing on the next poll. An optimistic (not-yet-sent, "temp-")
    // message is never touched here, and anything whose resource fetch
    // failed is left alone rather than guessed-removed.
    const remoteIdSets = {
      text: new Set(chat.data.map(m => m.id)),
      audio: new Set(audio.data.map(m => m.id)),
      image: new Set(image.data.map(m => m.id)),
    };
    merged = merged.filter(m => {
      if (typeof m.id !== 'string' || m.id.startsWith('temp-')) return true;
      const ns = m.id.slice(0, m.id.indexOf(':'));
      const resource = byNs[ns];
      if (!resource || !resource.ok) return true; // can't verify right now — keep it
      const stillExists = remoteIdSets[ns].has(m.id);
      if (!stillExists) hasRemoved = true;
      return stillExists;
    });

    if (hasNew || hasRemoved) {
      // Sort chronologically
      merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(merged);
      
      if (!isChatCurrentlyOpen() && newIncomingCount > 0) {
        setUnread(_unread + newIncomingCount);
      }
    }

    // CLEANUP LOGIC - Chat (80 records)
    if (chat.ok && chat.data.length >= 80) {
      const toDelete = chat.data.slice(0, 40);
      for (const msg of toDelete) {
        try { await deleteChatMessage(msg.id); } catch(e) {}
      }
    }

  } catch (error) {
    console.error('Failed to sync messages:', error);
  } finally {
    _isPolling = false;
  }
}

async function syncMediaCleanup() {
  // Cleanup Audio (8 records)
  try {
    const audio = await getAudioMessages();
    if (audio.length >= 8) {
      const toDelete = audio.slice(0, 4);
      for (const a of toDelete) {
        try { await deleteAudioMessage(a.id); } catch(e){}
      }
    }
  } catch(e) {}

  // Cleanup Image (8 records)
  try {
    const images = await getImageMessages();
    if (images.length >= 8) {
      const toDelete = images.slice(0, 4);
      for (const i of toDelete) {
        try { await deleteImageMessage(i.id); } catch(e){}
      }
    }
  } catch(e) {}
}

export function startPolling() {
  if (_pollingInterval) return;
  syncMessages();
  _pollingInterval = setInterval(() => {
    syncMessages();
    // Do media cleanup less frequently, e.g. every 20th poll
    if (Math.random() < 0.05) syncMediaCleanup();
  }, 1000);
}

export function stopPolling() {
  if (_pollingInterval) {
    clearInterval(_pollingInterval);
    _pollingInterval = null;
  }
}

// One-off check, independent of the interval loop. Used for a single
// "catch up" fetch (app boot, switching to a non-chat screen) without
// committing to a recurring timer — keeps the badge/cache reasonably
// fresh everywhere without polling continuously outside the chat screen.
export function syncNow() {
  return syncMessages();
}

// Pause polling while the tab/app isn't visible, resume once it is —
// but only if polling was actually running before the tab was hidden.
// Without that guard, becoming visible again would unconditionally start
// the interval even when the user is sitting on a screen (Profile,
// Settings, Chats on mobile) that never asked for it, silently turning
// the chat-screen-scoped polling back into an always-on global timer.
if (typeof document !== 'undefined') {
  let wasPollingBeforeHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasPollingBeforeHidden = !!_pollingInterval;
      stopPolling();
    } else if (wasPollingBeforeHidden) {
      wasPollingBeforeHidden = false;
      startPolling();
    }
  });
}
