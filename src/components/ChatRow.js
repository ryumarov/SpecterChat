import { createAvatar } from './Avatar.js';

export function createChatRow(profile, lastMessage, unreadCount, isSelected, onClick) {
  const row = document.createElement('div');
  row.className = 'chat-row' + (isSelected ? ' selected' : '');
  row.addEventListener('click', onClick);

  const avatar = createAvatar(profile, 50);
  avatar.classList.add('chat-row-avatar');
  
  const content = document.createElement('div');
  content.className = 'chat-row-content';
  
  const top = document.createElement('div');
  top.className = 'chat-row-top';
  
  const name = document.createElement('div');
  name.className = 'chat-row-name';
  name.textContent = profile.nickname;
  
  const time = document.createElement('div');
  time.className = 'chat-row-time';
  
  const bottom = document.createElement('div');
  bottom.className = 'chat-row-bottom';
  
  const preview = document.createElement('div');
  preview.className = 'chat-row-preview';
  
  if (lastMessage) {
    preview.textContent = lastMessage.text || (lastMessage.type === 'audio' ? 'Audio message' : 'Image');
    const date = new Date(lastMessage.createdAt);
    time.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } else {
    preview.textContent = 'No messages yet';
    time.textContent = '';
  }
  
  top.appendChild(name);
  top.appendChild(time);
  
  bottom.appendChild(preview);
  
  if (unreadCount > 0) {
    const badge = document.createElement('div');
    badge.className = 'chat-row-badge';
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    bottom.appendChild(badge);
  }
  
  content.appendChild(top);
  content.appendChild(bottom);
  
  row.appendChild(avatar);
  row.appendChild(content);
  
  return row;
}
