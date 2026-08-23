import { getCurrentUser, getOtherUser } from '../store/auth.js';
import { getProfile, profileStore } from '../store/profile.js';
import { chatStore, clearUnread, startPolling, stopPolling, setMessages } from '../store/chat.js';
import { navigate } from '../router.js';
import { createAvatar } from '../components/Avatar.js';
import { createMessageBubble } from '../components/MessageBubble.js';
import { createVirtualKeyboard } from '../components/VirtualKeyboard.js';
import { createEmojiPanel } from '../components/EmojiPanel.js';
import { postChatMessage, deleteChatMessage } from '../services/chatService.js';
import { postImageMessage, deleteImageMessage } from '../services/imageService.js';
import { postAudioMessage, deleteAudioMessage } from '../services/audioService.js';
import { openUploadMenu } from '../components/UploadMenu.js';
import { openContextMenu, closeContextMenu } from '../components/ContextMenu.js';
import { showToast } from '../components/Toast.js';
import { suppressFullscreenExit } from '../utils/fullscreenGuard.js';

const TRASH_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
const SELECT_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>';
const REPLY_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>';

// Every message id is namespaced by which mock API resource it lives in
// (see services/api.js's withNamespacedId: "text:7", "audio:3", "image:9").
// Deleting a message for real means calling that specific resource's
// DELETE endpoint — this picks the right one from the id itself.
function deleteByNamespacedId(id) {
  if (typeof id === 'string') {
    if (id.startsWith('text:')) return deleteChatMessage(id);
    if (id.startsWith('audio:')) return deleteAudioMessage(id);
    if (id.startsWith('image:')) return deleteImageMessage(id);
  }
  return Promise.reject(new Error('Unknown message id'));
}

export function renderChatScreen(container) {
  const me = getCurrentUser();
  const otherUser = getOtherUser();
  // Auth is guarded centrally in router.js's navigate() before any screen is
  // rendered, so this should never actually be reached unauthenticated.
  // Kept only as a defensive no-op — it must NOT call navigate() itself:
  // doing so while this function is already executing as part of an
  // in-progress navigate() call re-enters the router mid-transition, which
  // is exactly what produced the LoginScreen.js:38 crash reachable via
  // BottomNav -> navigate -> renderChatScreen -> navigate -> renderLoginScreen.
  if (!me || !otherUser) { return () => {}; }
  const profile = getProfile(otherUser.userId);

  container.innerHTML = `
    <div class="screen chat-screen">
      <div class="chat-header">
        <div class="chat-header-back" id="chat-back">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </div>
        <div class="chat-header-info" id="chat-header-info">
          <div id="chat-header-avatar"></div>
          <div class="chat-header-text">
            <div class="chat-header-name">${profile.nickname}</div>
            <div class="chat-header-status"><div class="online-dot"></div><span>Online</span></div>
          </div>
        </div>
        <button type="button" class="chat-header-trash" id="chat-header-trash" aria-label="Chat options">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
      
      <div class="messages-area-wrap">
        <div class="messages-area" id="messages-area"></div>
        <button type="button" class="scroll-to-bottom-btn" id="scroll-to-bottom-btn" aria-label="Scroll to latest messages" style="display:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>
      
      <!-- Reply Preview Bar -->
      <div class="reply-bar" id="reply-bar" style="display:none;">
        <div class="reply-bar-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg></div>
        <div class="reply-bar-content">
          <div class="reply-bar-name" id="reply-name"></div>
          <div class="reply-bar-text" id="reply-text"></div>
        </div>
        <div class="reply-bar-close" id="reply-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
      </div>

      <!-- Attachment Preview Bar (staged image, before send) -->
      <div class="attach-preview-bar" id="attach-preview-bar" style="display:none;">
        <div class="attach-preview-thumb-wrap">
          <img class="attach-preview-thumb" id="attach-preview-thumb" alt="Selected image preview" />
          <div class="attach-preview-remove" id="attach-preview-remove">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
        </div>
        <div class="attach-preview-label">Photo ready to send</div>
        <button type="button" class="attach-preview-send" id="attach-preview-send" aria-label="Send image">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      <!-- Audio Record Bar -->
      <div class="audio-record-bar" id="audio-record-bar" style="display:none;">
        <div class="audio-record-time">
          <div class="audio-record-dot"></div>
          <span id="audio-record-timer">00:00</span>
        </div>
        <div class="audio-record-actions">
          <button class="audio-record-btn audio-record-cancel" id="audio-record-cancel">Cancel</button>
          <button class="audio-record-btn audio-record-send" id="audio-record-send">Send</button>
        </div>
      </div>
      
      <!-- Selection Toolbar (replaces the input bar while selecting messages) -->
      <div class="selection-toolbar" id="selection-toolbar" style="display:none;">
        <button type="button" class="selection-toolbar-btn selection-cancel" id="selection-cancel">Cancel</button>
        <div class="selection-toolbar-count" id="selection-count">Select messages</div>
        <button type="button" class="selection-toolbar-btn selection-delete" id="selection-delete" disabled aria-label="Delete selected">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
        </button>
      </div>

      <!-- Composer wrapper: groups the input bar with its two slide-up panels
           (virtual keyboard / emoji picker) so the panels can be positioned
           relative to the input bar itself. On mobile these panels sit in
           normal flow directly below the bar (pushing the layout up); on
           desktop the emoji panel instead floats above the bar as an
           absolutely-positioned popover — which requires this wrapper (not
           just .chat-input-bar) to be the "position: relative" positioning
           context, since the panels are its siblings, not its children. -->
      <div class="composer-wrap" id="composer-wrap">
        <!-- Normal Input Bar -->
        <div class="chat-input-bar" id="chat-input-bar">
          <div class="chat-input-controls">
            <div id="attach-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            </div>
          </div>
          <div class="chat-input-wrap" id="chat-input-wrap">
            <input type="text" id="chat-input" class="chat-input" placeholder="Message..." autocomplete="off" inputmode="none" enterkeyhint="send" />
            <div class="chat-input-controls" style="margin-left:8px;">
              <div id="emoji-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </div>
            </div>
          </div>
          <button id="chat-send" class="chat-send-btn" disabled>
            <svg id="send-icon-text" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <svg id="send-icon-mic" style="display:none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
        </div>

        <!-- Custom Input Panels -->
        <div id="keyboard-container" class="input-panel"></div>
        <div id="emoji-container" class="input-panel"></div>
      </div>
      <input type="file" id="image-upload" accept="image/*" style="display:none;" />
    </div>
  `;

  const headerAvatarEl = container.querySelector('#chat-header-avatar');
  const headerNameEl = container.querySelector('.chat-header-name');
  headerAvatarEl.appendChild(createAvatar(profile, 36));
  container.querySelector('#chat-back').addEventListener('click', () => navigate('chats'));

  // Keep the header (name/avatar) in sync if the other user's profile changes
  // while this screen is mounted (e.g. they update their nickname/avatar).
  let profileUnsub = profileStore.subscribe(() => {
    const updated = getProfile(otherUser.userId);
    headerAvatarEl.innerHTML = '';
    headerAvatarEl.appendChild(createAvatar(updated, 36));
    headerNameEl.textContent = updated.nickname;
  });

  const messagesArea = container.querySelector('#messages-area');
  const input = container.querySelector('#chat-input');
  const inputWrap = container.querySelector('#chat-input-wrap');
  const sendBtn = container.querySelector('#chat-send');
  const attachBtn = container.querySelector('#attach-btn');
  const emojiBtn = container.querySelector('#emoji-btn');
  const keyboardContainer = container.querySelector('#keyboard-container');
  const emojiContainer = container.querySelector('#emoji-container');
  const sendIconText = container.querySelector('#send-icon-text');
  const sendIconMic = container.querySelector('#send-icon-mic');

  clearUnread();

  // Attachment (image) preview elements
  const attachPreviewBar = container.querySelector('#attach-preview-bar');
  const attachPreviewThumb = container.querySelector('#attach-preview-thumb');
  const attachPreviewRemove = container.querySelector('#attach-preview-remove');
  const attachPreviewSend = container.querySelector('#attach-preview-send');

  // Reply Elements
  const replyBar = container.querySelector('#reply-bar');
  const replyName = container.querySelector('#reply-name');
  const replyText = container.querySelector('#reply-text');
  const replyClose = container.querySelector('#reply-close');
  let currentReplyTo = null;

  // --- MESSAGE SELECTION / DELETE ---
  const trashBtn = container.querySelector('#chat-header-trash');
  const selectionToolbar = container.querySelector('#selection-toolbar');
  const selectionCountEl = container.querySelector('#selection-count');
  const selectionCancelBtn = container.querySelector('#selection-cancel');
  const selectionDeleteBtn = container.querySelector('#selection-delete');

  let selectMode = false;
  const selectedIds = new Set();

  function updateSelectionToolbar() {
    const count = selectedIds.size;
    selectionCountEl.textContent = count === 0 ? 'Select messages' : `${count} selected`;
    selectionDeleteBtn.disabled = count === 0;
  }

  function enterSelectMode() {
    if (selectMode) return;
    selectMode = true;
    selectedIds.clear();
    messagesArea.classList.add('select-mode');
    inputBar.style.display = 'none';
    replyBar.style.display = 'none';
    attachPreviewBar.style.display = 'none';
    audioBar.style.display = 'none';
    selectionToolbar.style.display = 'flex';
    updateSelectionToolbar();
  }

  function exitSelectMode() {
    if (!selectMode) return;
    selectMode = false;
    selectedIds.clear();
    messagesArea.classList.remove('select-mode');
    messagesArea.querySelectorAll('.message-wrapper.selected').forEach(el => el.classList.remove('selected'));
    selectionToolbar.style.display = 'none';
    inputBar.style.display = 'flex';
    if (currentReplyTo) replyBar.style.display = 'flex';
    if (pendingImage) attachPreviewBar.style.display = 'flex';
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    const node = messagesArea.querySelector(`[data-mid="${id}"]`);
    if (node) node.classList.toggle('selected', selectedIds.has(id));
    updateSelectionToolbar();
  }

  // Removes messages from local state once they're confirmed gone from
  // the mock API (not just from the DOM) — a message never disappears
  // from the UI without first succeeding (or, for a not-yet-sent
  // optimistic message, without ever having existed server-side).
  async function deleteMessagesByIds(ids) {
    const pendingIds = ids.filter(id => typeof id === 'string' && id.startsWith('temp-'));
    const realIds = ids.filter(id => !pendingIds.includes(id));

    const results = await Promise.allSettled(realIds.map(id => deleteByNamespacedId(id)));
    const succeeded = new Set(pendingIds);
    let failCount = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') succeeded.add(realIds[i]);
      else failCount++;
    });

    if (succeeded.size > 0) {
      const { messages } = chatStore.getState();
      setMessages(messages.filter(m => !succeeded.has(m.id)));
    }
    return failCount;
  }

  async function deleteSelectedMessages() {
    const ids = Array.from(selectedIds);
    exitSelectMode();
    if (ids.length === 0) return;
    const failCount = await deleteMessagesByIds(ids);
    if (failCount > 0) {
      showToast(`Couldn't delete ${failCount} message${failCount > 1 ? 's' : ''}`, { variant: 'error' });
    }
  }

  async function deleteAllMessages() {
    const { messages } = chatStore.getState();
    if (messages.length === 0) return;
    const ids = messages.map(m => m.id);
    const failCount = await deleteMessagesByIds(ids);
    if (failCount > 0) {
      showToast(`Couldn't delete ${failCount} message${failCount > 1 ? 's' : ''}`, { variant: 'error' });
    } else {
      showToast('Chat cleared');
    }
  }

  async function deleteSingleMessage(msg) {
    const failCount = await deleteMessagesByIds([msg.id]);
    if (failCount > 0) {
      showToast("Couldn't delete message", { variant: 'error' });
    }
  }

  function openTrashMenu() {
    openContextMenu({
      anchorEl: trashBtn,
      align: 'end',
      items: [
        { key: 'select', label: 'Select', icon: SELECT_ICON_SVG, onSelect: () => enterSelectMode() },
        { key: 'all', label: 'All', danger: true, icon: TRASH_ICON_SVG, onSelect: () => deleteAllMessages() },
      ],
    });
  }

  function handleMessageContextMenu(msg, event) {
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        { key: 'reply', label: 'Reply', icon: REPLY_ICON_SVG, onSelect: () => handleReplySelect(msg) },
        { key: 'delete', label: 'Delete', danger: true, icon: TRASH_ICON_SVG, onSelect: () => deleteSingleMessage(msg) },
      ],
    });
  }

  trashBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectMode) {
      deleteSelectedMessages();
    } else {
      openTrashMenu();
    }
  });

  selectionCancelBtn.addEventListener('click', () => exitSelectMode());
  selectionDeleteBtn.addEventListener('click', () => deleteSelectedMessages());

  function handleGlobalKeydown(e) {
    if (e.key === 'Enter' && selectMode) {
      e.preventDefault();
      deleteSelectedMessages();
    }
  }
  document.addEventListener('keydown', handleGlobalKeydown);

  // Audio Elements
  const audioBar = container.querySelector('#audio-record-bar');
  const inputBar = container.querySelector('#chat-input-bar');
  const timerEl = container.querySelector('#audio-record-timer');
  const audioCancelBtn = container.querySelector('#audio-record-cancel');
  const audioSendBtn = container.querySelector('#audio-record-send');
  let mediaRecorder = null;
  let audioChunks = [];
  let recordTimer = null;
  let recordSeconds = 0;


  // Live "background polling" for this conversation: check the 4 MockAPIs
  // every ~1s for new messages while this screen is mounted, and stop the
  // instant it's torn down (idempotent either way — see store/chat.js).
  // This is the ONLY place the recurring poll timer is started/stopped, so
  // re-entering the chat can never stack a second interval on top of one
  // still running from a previous mount.
  startPolling();

  const scrollToBottomBtn = container.querySelector('#scroll-to-bottom-btn');

  let autoScroll = true;
  messagesArea.addEventListener('scroll', () => {
    // If user scrolled up significantly, stop auto-scrolling
    const threshold = 50;
    const isAtBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < threshold;
    autoScroll = isAtBottom;
    scrollToBottomBtn.style.display = isAtBottom ? 'none' : 'flex';
  });

  scrollToBottomBtn.addEventListener('click', () => {
    autoScroll = true;
    messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
    scrollToBottomBtn.style.display = 'none';
  });

  // --- Incremental message rendering ---
  // Rebuilding the whole message list on every store update is what was
  // causing the freeze: every poll (or every send) destroyed and
  // recreated every bubble, re-triggering animations on old messages and
  // resetting scroll to the top when the user had scrolled up. Instead we
  // diff against what's already in the DOM and only touch what changed.
  let renderedIds = [];   // ids currently rendered, in order
  let lastDateStr = null; // date-separator cursor, kept in sync with the DOM

  function buildBubble(msg) {
    const isOutgoing = msg.senderId === me.userId;
    const node = createMessageBubble(msg, isOutgoing, {
      onReply: handleReplySelect,
      onContextMenu: handleMessageContextMenu,
      isSelectMode: () => selectMode,
      isSelected: (id) => selectedIds.has(id),
      onToggleSelect: toggleSelect,
    });
    node.dataset.mid = msg.id;
    return node;
  }

  function appendMessages(ids, byId, target, animate) {
    ids.forEach(id => {
      const msg = byId.get(id);
      if (!msg) return;
      const dateStr = new Date(msg.createdAt).toLocaleDateString();
      if (dateStr !== lastDateStr) {
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.innerHTML = `<div class="date-separator-line"></div><div class="date-separator-text">${dateStr}</div><div class="date-separator-line"></div>`;
        target.appendChild(sep);
        lastDateStr = dateStr;
      }
      const node = buildBubble(msg);
      // Only messages that are genuinely new get the slide-in animation —
      // messages already seen are never re-animated.
      if (animate) node.classList.add('message-enter');
      target.appendChild(node);
    });
  }

  function fullRebuild(messages) {
    messagesArea.innerHTML = '';
    lastDateStr = null;
    if (messages.length === 0) {
      messagesArea.innerHTML = '<div class="messages-empty">No messages yet. Say hi!</div>';
      renderedIds = [];
      return;
    }
    const byId = new Map(messages.map(m => [m.id, m]));
    const frag = document.createDocumentFragment();
    appendMessages(messages.map(m => m.id), byId, frag, false);
    messagesArea.appendChild(frag);
    renderedIds = messages.map(m => m.id);
  }

  function renderMessages() {
    const { messages } = chatStore.getState();
    const newIds = messages.map(m => m.id);

    // Nothing actually changed — skip all work (this also absorbs the
    // duplicate render that naturally happens right after an optimistic
    // add, since the follow-up call sees an identical list).
    if (newIds.length === renderedIds.length && newIds.every((id, i) => id === renderedIds[i])) {
      return;
    }

    const isPureAppend = renderedIds.length > 0 &&
      newIds.length > renderedIds.length &&
      renderedIds.every((id, i) => id === newIds[i]);

    // Remember how far the user is from the bottom so a non-append rebuild
    // (e.g. an optimistic temp-id being swapped for the real message) can
    // restore the exact same view instead of jumping to the top.
    const distanceFromBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;

    if (isPureAppend) {
      const appendedIds = newIds.slice(renderedIds.length);
      const byId = new Map(messages.map(m => [m.id, m]));
      const frag = document.createDocumentFragment();
      appendMessages(appendedIds, byId, frag, true);
      messagesArea.appendChild(frag);
      renderedIds = newIds;
    } else {
      fullRebuild(messages);
      if (!autoScroll) {
        messagesArea.scrollTop = Math.max(0, messagesArea.scrollHeight - messagesArea.clientHeight - distanceFromBottom);
      }
    }

    if (autoScroll) {
      // Smooth scroll when simply appending (feels like a live chat);
      // instant for structural rebuilds so it doesn't visibly "travel".
      messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: isPureAppend ? 'smooth' : 'auto' });
    }
  }

  // This subscription only exists while ChatScreen itself is mounted — it's
  // torn down in this screen's own unmount (see stopPolling()/unsubscribe()
  // below), and router.js's navigate() always unmounts the current screen
  // BEFORE mounting a new one. So "this callback is running" already means
  // "this conversation is the one currently open," on both mobile and
  // desktop; no extra visibility check is needed.
  //
  // Previously this gated on `window.location.hash === '#chat'`, which only
  // holds on MOBILE, where ChatScreen is exclusively mounted for the 'chat'
  // route. On DESKTOP this same screen is also mounted for the 'chats'
  // route (there's no separate chat-list — see router.js), which sets the
  // hash to '#chats' instead. That mismatch silently dropped every live
  // update (new messages arriving via polling while the conversation was
  // already open) whenever the desktop conversation had been opened via the
  // "Chats" tab — the store still updated correctly underneath, but this
  // callback's hash check made it look like nobody was watching, so the UI
  // only ever caught up on the next full remount (e.g. Profile → Chats).
  const unsubscribe = chatStore.subscribe(() => {
    renderMessages();
    clearUnread(); // this chat is open right now, so any new message is seen immediately
  });

  renderMessages();

  // --- REPLY LOGIC ---
  function handleReplySelect(msg) {
    currentReplyTo = {
      id: msg.id,
      senderName: msg.senderId === me.userId ? me.username : profile.nickname,
      text: msg.text || (msg.type === 'audio' ? 'Audio message' : 'Image message')
    };
    replyName.textContent = currentReplyTo.senderName;
    replyText.textContent = currentReplyTo.text;
    replyBar.style.display = 'flex';
    openKeyboard();
  }
  
  replyClose.addEventListener('click', () => {
    currentReplyTo = null;
    replyBar.style.display = 'none';
  });

  // --- INPUT LOGIC (Custom Keyboard) ---
  let inputValue = '';
  let activePanel = null; // 'keyboard' | 'emoji' | null

  function updateInputUI() {
    input.value = inputValue;
    if (inputValue.length > 0) {
      sendBtn.disabled = false;
      sendIconText.style.display = 'block';
      sendIconMic.style.display = 'none';
    } else {
      sendBtn.disabled = false; // Enable for mic
      sendIconText.style.display = 'none';
      sendIconMic.style.display = 'block';
    }
  }

  const vk = createVirtualKeyboard(
    (char) => { inputValue += char; updateInputUI(); },
    () => { inputValue = inputValue.slice(0, -1); updateInputUI(); },
    handleSendText
  );
  keyboardContainer.appendChild(vk);

  const emoji = createEmojiPanel((char) => {
    inputValue += char;
    updateInputUI();
  });
  emojiContainer.appendChild(emoji);

  // Both panels are always present in the DOM; visibility is purely
  // CSS-driven via the .panel-open class (max-height/opacity transition on
  // mobile, opacity/transform popover on desktop — see chat.css / app.css).
  // This is what makes open/close animate smoothly instead of the previous
  // abrupt display:none/block toggle, and it's also what makes the desktop
  // emoji popover render at all (it never gets stuck behind an inline
  // display:none the CSS can't override).
  function openKeyboard() {
    activePanel = 'keyboard';
    keyboardContainer.classList.add('panel-open');
    emojiContainer.classList.remove('panel-open');
    inputWrap.style.borderColor = 'var(--accent)';
    if (window.innerWidth < 768) {
      setTimeout(() => { if (autoScroll) messagesArea.scrollTop = messagesArea.scrollHeight; }, 50);
    }
  }

  function openEmoji() {
    activePanel = 'emoji';
    emojiContainer.classList.add('panel-open');
    keyboardContainer.classList.remove('panel-open');
    inputWrap.style.borderColor = 'var(--accent)';
    if (window.innerWidth < 768) {
      setTimeout(() => { if (autoScroll) messagesArea.scrollTop = messagesArea.scrollHeight; }, 50);
    }
  }

  function closePanels() {
    activePanel = null;
    keyboardContainer.classList.remove('panel-open');
    emojiContainer.classList.remove('panel-open');
    inputWrap.style.borderColor = 'transparent';
  }

  // Sync physical keyboard typing
  input.addEventListener('input', (e) => {
    inputValue = e.target.value;
    updateInputUI();
    // On mobile: close virtual keyboard when physical typing detected.
    // On desktop: there is no virtual keyboard; just close the emoji panel
    // if it's open so it doesn't linger while the user types.
    if (window.innerWidth < 768) {
      closePanels();
    } else {
      if (activePanel === 'emoji') closePanels();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendText();
    }
  });

  input.addEventListener('click', () => {
    // On mobile: clicking the input opens the virtual keyboard panel.
    // On desktop: physical keyboard is used — do NOT open the virtual keyboard.
    // Just close the emoji panel if it was open.
    if (window.innerWidth < 768) {
      if (activePanel !== 'keyboard') openKeyboard();
    } else {
      if (activePanel === 'emoji') closePanels();
    }
  });
  
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activePanel === 'emoji') {
      // Toggle emoji panel closed.
      // On mobile the original behavior was to open the keyboard instead;
      // on desktop we simply close (no virtual keyboard exists on desktop).
      if (window.innerWidth < 768) openKeyboard();
      else closePanels();
    } else {
      openEmoji();
    }
  });
  
  messagesArea.addEventListener('pointerdown', () => {
    closePanels();
  });

  // --- SEND LOGIC ---
  async function handleSendText() {
    const text = inputValue.trim();
    if (!text) return;
    
    const reply = currentReplyTo;
    inputValue = '';
    updateInputUI();
    replyBar.style.display = 'none';
    currentReplyTo = null;
    closePanels();

    // Optimistic UI
    const tempId = 'temp-' + Date.now();
    chatStore.addMessage({
      id: tempId,
      text,
      senderId: me.userId,
      receiverId: otherUser.userId,
      createdAt: new Date().toISOString(),
      type: 'text',
      replyTo: reply
    });
    
    autoScroll = true;
    renderMessages();
    
    try {
      const realMsg = await postChatMessage(text, me.userId, otherUser.userId, reply);
      chatStore.replaceMessage(tempId, realMsg);
    } catch(e) {
      console.error(e);
      alert('Failed to send message');
    }
  }

  // --- IMAGE LOGIC ---
  const imageUpload = container.querySelector('#image-upload');
  let pendingImage = null; // base64 of a staged image, shown in the preview bar, not yet sent

  // Custom upload menu (Gallery / Photos / Files) replaces a bare
  // imageUpload.click() so the person gets an in-app chooser that matches
  // the rest of the chat UI instead of jumping straight to the OS picker.
  attachBtn.addEventListener('click', () => {
    closePanels();
    openUploadMenu({
      onGallery: () => openImagePicker({ capture: false }),
      onPhotos: () => openImagePicker({ capture: true }),
      onFiles: () => openImagePicker({ capture: false }),
    });
  });

  function openImagePicker({ capture }) {
    // Supported file types stay whatever the existing project logic already
    // sends to the backend (images only — see services/imageService.js), so
    // every entry point (Gallery/Photos/Files) still points at the same
    // accept="image/*" input; only whether it opens the camera directly
    // (Photos) differs.
    if (capture) {
      imageUpload.setAttribute('capture', 'environment');
    } else {
      imageUpload.removeAttribute('capture');
    }

    // The native OS file/photo picker is about to open. Browsers force the
    // page out of fullscreen for as long as it's open — that's normal
    // browser behavior, not an exitFullscreen() call from this app, and not
    // the user asking to leave. Suppress the exit-confirmation modal until
    // the picker closes; fullscreenGuard restores fullscreen quietly on its
    // own once it does (whether a file was picked or the picker was
    // cancelled).
    suppressFullscreenExit();
    imageUpload.click();
  }

  function setPendingImage(base64) {
    pendingImage = base64;
    attachPreviewThumb.src = base64;
    attachPreviewBar.style.display = 'flex';
  }

  function clearPendingImage() {
    pendingImage = null;
    attachPreviewThumb.src = '';
    attachPreviewBar.style.display = 'none';
  }

  attachPreviewRemove.addEventListener('click', clearPendingImage);

  imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // reset so picking the same file again still fires change
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Show a preview before sending anything — the person can still
      // cancel/remove it, or confirm with the send action in the bar.
      setPendingImage(event.target.result);
    };
    reader.readAsDataURL(file);
  });

  attachPreviewSend.addEventListener('click', async () => {
    if (!pendingImage) return;
    const base64 = pendingImage;
    const reply = currentReplyTo;
    clearPendingImage();
    replyBar.style.display = 'none';
    currentReplyTo = null;
    closePanels();

    // Optimistic
    const tempId = 'temp-' + Date.now();
    chatStore.addMessage({
      id: tempId,
      imageUrl: base64,
      senderId: me.userId,
      receiverId: otherUser.userId,
      createdAt: new Date().toISOString(),
      type: 'image',
      replyTo: reply
    });
    autoScroll = true;
    renderMessages();

    try {
      const realMsg = await postImageMessage(base64, me.userId, otherUser.userId, reply);
      chatStore.replaceMessage(tempId, realMsg);
    } catch(e) {
      alert('Failed to send image');
    }
  });

  // --- AUDIO LOGIC ---
  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone not supported');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      inputBar.style.display = 'none';
      audioBar.style.display = 'flex';
      
      recordSeconds = 0;
      timerEl.textContent = '00:00';
      recordTimer = setInterval(() => {
        recordSeconds++;
        const m = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
        const s = String(recordSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
        
        // Auto stop at 4 seconds max
        if (recordSeconds >= 4) {
          stopRecording(true);
        }
      }, 1000);

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data);
      });
      mediaRecorder.start();
    }).catch(err => {
      console.error(err);
      alert('Microphone access denied or unavailable');
    });
  }

  function stopRecording(sendData) {
    if (!mediaRecorder) return;
    clearInterval(recordTimer);
    const duration = recordSeconds; // snapshot before it's reset by the next recording

    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorder = null;
      
      inputBar.style.display = 'flex';
      audioBar.style.display = 'none';

      if (sendData) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result;
          const reply = currentReplyTo;
          replyBar.style.display = 'none';
          currentReplyTo = null;

          // Optimistic
          const tempId = 'temp-' + Date.now();
          chatStore.addMessage({
            id: tempId,
            audioUrl: base64,
            duration,
            senderId: me.userId,
            receiverId: otherUser.userId,
            createdAt: new Date().toISOString(),
            type: 'audio',
            replyTo: reply
          });
          autoScroll = true;
          renderMessages();

          try {
            const realMsg = await postAudioMessage(base64, me.userId, otherUser.userId, reply, duration);
            chatStore.replaceMessage(tempId, realMsg);
          } catch(e) {
            alert('Failed to send audio');
          }
        };
        reader.readAsDataURL(audioBlob);
      }
    });
    mediaRecorder.stop();
  }

  sendBtn.addEventListener('click', () => {
    if (inputValue.length > 0) {
      handleSendText();
    } else {
      startRecording();
    }
  });
  
  audioCancelBtn.addEventListener('click', () => {
    stopRecording(false);
  });
  
  audioSendBtn.addEventListener('click', () => {
    stopRecording(true);
  });

  // Init UI state
  updateInputUI();

  // On desktop: close the floating emoji panel when the user clicks anywhere
  // outside the panel or the emoji button. Using 'pointerdown' so it fires
  // before the panel's own click handlers and doesn't need a capture phase.
  function handleOutsideClick(e) {
    if (window.innerWidth < 768) return; // mobile: ignore
    if (activePanel !== 'emoji') return;
    // Allow clicks that originate inside the emoji container or on the emoji button
    if (emojiContainer.contains(e.target) || emojiBtn.contains(e.target)) return;
    closePanels();
  }
  document.addEventListener('pointerdown', handleOutsideClick);

  return () => {
    if (unsubscribe) unsubscribe();
    if (profileUnsub) profileUnsub();
    stopPolling();
    document.removeEventListener('pointerdown', handleOutsideClick);
    document.removeEventListener('keydown', handleGlobalKeydown);
    closeContextMenu();
  };
}
