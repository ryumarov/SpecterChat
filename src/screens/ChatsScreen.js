import { getOtherUser } from '../store/auth.js';
import { getProfile, profileStore } from '../store/profile.js';
import { chatStore } from '../store/chat.js';
import { selectChat, getSelectedChatId } from '../router.js';
import { createChatRow } from '../components/ChatRow.js';

export function renderChatsScreen(container) {
  container.innerHTML = `
    <div class="screen">
      <div class="chats-header">
        <div class="chats-title">Chats</div>
      </div>
      <div class="scroll-area chats-list-area" id="chats-list"></div>
    </div>
  `;

  const listArea = container.querySelector('#chats-list');
  const otherUser = getOtherUser();
  if (!otherUser) return; // shouldn't happen if logged in

  let unsubscribeProfile;
  let unsubscribeChat;

  function renderList() {
    listArea.innerHTML = '';
    
    const profile = getProfile(otherUser.userId);
    const { messages, unread } = chatStore.getState();
    
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isSelected = getSelectedChatId() === otherUser.userId;
    
    const row = createChatRow(profile, lastMessage, unread, isSelected, () => {
      selectChat(otherUser.userId);
    });
    
    listArea.appendChild(row);
  }

  renderList();

  unsubscribeChat = chatStore.subscribe(() => {
    renderList();
  });
  
  unsubscribeProfile = profileStore.subscribe(() => {
    renderList();
  });

  return () => {
    if (unsubscribeChat) unsubscribeChat();
    if (unsubscribeProfile) unsubscribeProfile();
  };
}
