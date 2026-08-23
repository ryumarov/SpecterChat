// ===== AVATAR/PROFILE API SERVICE =====
// Talks ONLY to the `AvatarProfile` MockAPI resource
// (https://6a8737cb70fbbd308f98cf01.mockapi.io/AvatarProfile), which holds
// profile data (nickname + avatar) for exactly the 2 users in this app.
// No message data (text/audio/image) is ever read, written, or deleted
// through this file.
import { ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from './api.js';
import { getProfile, updateProfile, setApiId } from '../store/profile.js';

// ---- Low-level per-endpoint primitives ----

/** GET every profile record from the Avatar/Profile API (there should be exactly 2: mad1na, specter). */
export async function getAvatarProfiles() {
  return (await apiGet(ENDPOINTS.AVATAR_PROFILE)) || [];
}

/** POST a brand-new profile record to the Avatar/Profile API. */
export async function postAvatarProfile(payload) {
  return apiPost(ENDPOINTS.AVATAR_PROFILE, payload);
}

/** PUT (update) an existing profile record in the Avatar/Profile API by its record id. */
export async function updateAvatarProfile(apiId, payload) {
  return apiPut(`${ENDPOINTS.AVATAR_PROFILE}/${apiId}`, payload);
}

/** DELETE a profile record from the Avatar/Profile API by its record id. */
export async function deleteAvatarProfile(apiId) {
  return apiDelete(`${ENDPOINTS.AVATAR_PROFILE}/${apiId}`);
}

// ---- App-level orchestration (used by main.js / SettingsScreen.js) ----
// These compose the primitives above with the local profile store; they
// still touch only the AvatarProfile endpoint.

export async function fetchProfilesFromApi() {
  try {
    const profiles = await getAvatarProfiles();

    // Check if mad1na exists
    const mad1na = profiles.find(p => p.userId === 'mad1na');
    if (mad1na) {
      setApiId('mad1na', mad1na.id);
      updateProfile('mad1na', { nickname: mad1na.nickname, avatarBase64: mad1na.avatarBase64 });
    }

    // Check if specter exists
    const specter = profiles.find(p => p.userId === 'specter');
    if (specter) {
      setApiId('specter', specter.id);
      updateProfile('specter', { nickname: specter.nickname, avatarBase64: specter.avatarBase64 });
    }
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
  }
}

export async function syncProfileToApi(userId) {
  const profile = getProfile(userId);
  const payload = {
    userId: profile.userId,
    nickname: profile.nickname,
    avatarBase64: profile.avatarBase64,
  };

  try {
    if (profile.apiId) {
      await updateAvatarProfile(profile.apiId, payload);
    } else {
      const res = await postAvatarProfile(payload);
      setApiId(userId, res.id);
    }
  } catch (error) {
    console.error('Failed to sync profile to API:', error);
  }
}
