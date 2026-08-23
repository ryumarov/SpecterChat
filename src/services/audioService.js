// ===== AUDIO API SERVICE =====
// Talks ONLY to the `Audio` MockAPI resource
// (https://6a87366470fbbd308f98cd06.mockapi.io/Audio) and ONLY for voice
// messages (audio stored as Base64). Text/emoji and image messages are
// never read, written, or deleted through this file.
import { ENDPOINTS, apiGet, apiPost, apiDelete, withNamespacedId, stripNamespace } from './api.js';

const NS = 'audio';

/** GET all voice messages from the Audio API. */
export async function getAudioMessages() {
  const records = await apiGet(ENDPOINTS.AUDIO);
  return (records || []).map(r => withNamespacedId(r, NS));
}

/** POST a new voice message (Base64 audio) to the Audio API. */
export async function postAudioMessage(audioData, senderId, receiverId, replyTo = null, duration = 0) {
  const message = {
    audioUrl: audioData, // Base64 data
    duration,
    senderId,
    receiverId,
    replyTo,
    createdAt: new Date().toISOString(),
    type: 'audio',
  };
  const created = await apiPost(ENDPOINTS.AUDIO, message);
  return withNamespacedId(created, NS);
}

/** DELETE a voice message from the Audio API by its (namespaced) id. */
export async function deleteAudioMessage(id) {
  return apiDelete(`${ENDPOINTS.AUDIO}/${stripNamespace(id)}`);
}
