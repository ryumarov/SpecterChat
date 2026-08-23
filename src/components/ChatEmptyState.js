// ===== CHAT EMPTY STATE =====
// Shown in the desktop split-view's right panel whenever no chat is
// selected yet (app just loaded, or the user hasn't clicked a chat row).
// Deliberately generic — it doesn't know or care which chat(s) exist.

export function renderChatEmptyState(container) {
  container.innerHTML = `
    <div class="chat-empty-state">
      <div class="chat-empty-state-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
      <div class="chat-empty-state-title">Select a chat</div>
      <div class="chat-empty-state-subtitle">Choose a conversation from the list to start messaging.</div>
    </div>
  `;

  return () => {}; // nothing to tear down — no listeners, no subscriptions
}
