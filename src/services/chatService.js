// ===== CHAT API SERVICE =====
// Talks ONLY to the `chat` MockAPI resource
// (https://6a87366470fbbd308f98cd06.mockapi.io/chat) and ONLY for
// text/emoji messages. No other message type is ever read, written, or
// deleted through this file — voice messages live in audioService.js
// against the Audio resource, and images live in imageService.js against
// the Rasm resource. Nothing here reaches into those.
import { ENDPOINTS, apiGet, apiPost, apiDelete, withNamespacedId, stripNamespace } from './api.js';

const NS = 'text';

/** GET all text/emoji messages from the chat API. */
export async function getChatMessages() {
  const records = await apiGet(ENDPOINTS.CHAT);
  return (records || []).map(r => withNamespacedId(r, NS));
}

/** POST a new text/emoji message to the chat API. */
export async function postChatMessage(text, senderId, receiverId, replyTo = null) {
  const message = {
    text,
    senderId,
    receiverId,
    replyTo,
    createdAt: new Date().toISOString(),
    type: 'text',
  };
  const created = await apiPost(ENDPOINTS.CHAT, message);
  return withNamespacedId(created, NS);
}

/** DELETE a text/emoji message from the chat API by its (namespaced) id. */
export async function deleteChatMessage(id) {
  return apiDelete(`${ENDPOINTS.CHAT}/${stripNamespace(id)}`);
}
