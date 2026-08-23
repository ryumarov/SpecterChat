import { getCurrentUser } from '../store/auth.js';
import { getProfile, updateProfile } from '../store/profile.js';
import { syncProfileToApi } from '../services/profileService.js';
import { navigate } from '../router.js';
import { createAvatar } from '../components/Avatar.js';
import { createModal } from '../components/Modal.js';

export function renderProfileScreen(container) {
  const me = getCurrentUser();
  if (!me) return;

  container.innerHTML = `
    <div class="screen">
      <div class="screen-header">
        <div class="header-back" id="profile-back">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
        <div class="header-title">Profile</div>
      </div>
      
      <div class="scroll-area profile-scroll">
        <div class="profile-avatar-section">
          <div class="profile-avatar-wrap" id="avatar-trigger">
            <div id="profile-avatar-container"></div>
            <div class="profile-camera-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
          </div>
          <div class="profile-avatar-hint">Profile rasmni almashtirish</div>
        </div>

        <div class="card">
          <div class="card-row" id="nickname-row">
            <div class="card-row-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="card-row-content">
              <div class="card-row-title">Nickname</div>
              <div class="card-row-subtitle" id="nickname-display"></div>
            </div>
            <div class="card-row-chevron">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
        </div>
        
        <input type="file" id="avatar-upload" accept="image/*" style="display: none;" />
      </div>
    </div>
  `;

  container.querySelector('#profile-back').addEventListener('click', () => {
    navigate('chats');
  });

  const avatarContainer = container.querySelector('#profile-avatar-container');
  const nicknameDisplay = container.querySelector('#nickname-display');
  const avatarUpload = container.querySelector('#avatar-upload');

  function renderData() {
    const profile = getProfile(me.userId);
    avatarContainer.innerHTML = '';
    avatarContainer.appendChild(createAvatar(profile, 110));
    nicknameDisplay.textContent = profile.nickname;
  }

  renderData();

  // Nickname Editing
  container.querySelector('#nickname-row').addEventListener('click', () => {
    const profile = getProfile(me.userId);
    createModal({
      title: 'Edit Nickname',
      initialValue: profile.nickname,
      onConfirm: async (newVal) => {
        if (!newVal || newVal === profile.nickname) return;
        updateProfile(me.userId, { nickname: newVal });
        renderData();
        await syncProfileToApi(me.userId);
      }
    });
  });

  // Avatar Upload (Local -> base64 for Part 1)
  container.querySelector('#avatar-trigger').addEventListener('click', () => {
    avatarUpload.click();
  });

  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      updateProfile(me.userId, { avatarBase64: base64 });
      renderData();
      await syncProfileToApi(me.userId);
    };
    reader.readAsDataURL(file);
  });
}
