// ===== IMAGE API SERVICE =====
// Talks ONLY to the `Rasm` MockAPI resource
// (https://6a8737cb70fbbd308f98cf01.mockapi.io/Rasm) and ONLY for image
// messages (images stored as Base64). Text/emoji and voice messages are
// never read, written, or deleted through this file.
import { ENDPOINTS, apiGet, apiPost, apiDelete, withNamespacedId, stripNamespace } from './api.js';

const NS = 'image';

/** GET all image messages from the Image API. */
export async function getImageMessages() {
  const records = await apiGet(ENDPOINTS.IMAGE);
  return (records || []).map(r => withNamespacedId(r, NS));
}

/** POST a new image message (Base64 image) to the Image API. */
export async function postImageMessage(imageUrl, senderId, receiverId, replyTo = null) {
  const message = {
    imageUrl, // Base64 data
    senderId,
    receiverId,
    replyTo,
    createdAt: new Date().toISOString(),
    type: 'image',
  };
  const created = await apiPost(ENDPOINTS.IMAGE, message);
  return withNamespacedId(created, NS);
}

/** DELETE an image message from the Image API by its (namespaced) id. */
export async function deleteImageMessage(id) {
  return apiDelete(`${ENDPOINTS.IMAGE}/${stripNamespace(id)}`);
}
