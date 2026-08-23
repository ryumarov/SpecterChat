import { chatStore } from '../store/chat.js';
import { navigate, getCurrentRoute } from '../router.js';

export function createBottomNav() {
  const container = document.getElementById('bottom-nav');
  if (!container) return;

  function render() {
    const route = getCurrentRoute();
    const isDesktop = window.innerWidth >= 768;
    // On mobile, a full-screen open chat hides the tab bar (Telegram-style).
    // On desktop the chat lives in a side panel with room to spare, so the
    // nav bar stays put and stays usable.
    if (route === 'login' || (route === 'chat' && !isDesktop)) {
      container.classList.add('hidden');
      return;
    }
    
    container.classList.remove('hidden');
    const { unread } = chatStore.getState();
    const chatsActive = route === 'chats' || route === 'chat';

    container.innerHTML = `
      <div class="nav-tab ${route === 'profile' ? 'active' : ''}" data-route="profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="nav-tab-label">Profile</span>
      </div>
      
      <div class="nav-tab ${chatsActive ? 'active' : ''}" data-route="chats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="nav-tab-label">Chats</span>
        ${unread > 0 ? `<div class="nav-badge">${unread > 99 ? '99+' : unread}</div>` : ''}
      </div>
      
      <div class="nav-tab ${route === 'settings' ? 'active' : ''}" data-route="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span class="nav-tab-label">Settings</span>
      </div>
    `;

    // Event listeners
    container.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        navigate(tab.dataset.route);
      });
    });
  }

  // Subscribe to changes
  chatStore.subscribe(render);
  window.addEventListener('hashchange', render);
  // Crossing the desktop/mobile breakpoint changes whether the nav should
  // be visible while a chat is open, even when the route itself doesn't
  // change (so hashchange alone wouldn't catch it).
  window.addEventListener('resize', render);
  
  // Initial render
  render();

  return {
    update: render
  };
}
