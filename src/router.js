import { renderLoginScreen } from './screens/LoginScreen.js';
import { renderChatsScreen } from './screens/ChatsScreen.js';
import { renderChatScreen } from './screens/ChatScreen.js';
import { renderProfileScreen } from './screens/ProfileScreen.js';
import { renderSettingsScreen } from './screens/SettingsScreen.js';
import { getCurrentUser, getOtherUser } from './store/auth.js';
import { syncNow } from './store/chat.js';

let currentRoute = null;
let unmountCurrent = null;

// Which chat is "open" on mobile's chat-list screen (used only to highlight
// the selected row there — mobile keeps its existing list-then-chat flow).
// Desktop no longer has a chat list at all (see navigate() below): the app
// is a single 2-person conversation, so opening "Chats" on desktop goes
// straight into it without any selection step. Lives only in memory: it
// starts null on every fresh page load and is cleared on logout, so a
// session never inherits a stale selection.
let selectedChatId = null;

export function getSelectedChatId() {
  return selectedChatId;
}

// Called by the mobile chat list when the user taps the chat row.
export function selectChat(chatId) {
  selectedChatId = chatId;
  navigate('chat');
}

// Left-to-right order of the three top-level tabs (matches BottomNav),
// used only to pick a swipe direction between them.
const TAB_ORDER = ['profile', 'chats', 'settings'];

function getDirection(from, to) {
  if (!from || from === to) return null;
  if (to === 'chat' && from !== 'chat') return 'forward';   // opening a chat = going deeper
  if (from === 'chat' && to !== 'chat') return 'backward';  // leaving a chat = going back
  const fi = TAB_ORDER.indexOf(from);
  const ti = TAB_ORDER.indexOf(to);
  if (fi === -1 || ti === -1) return 'forward';
  return ti > fi ? 'forward' : 'backward';
}

// Mounts `wrapper` into `container` and, when there's a previous screen to
// transition from, runs a short swipe-style slide between the two. The old
// screen's unmount() has already run by this point (see navigate()) — this
// function only ever animates/removes a DOM node, so no listeners or API
// requests linger during the transition.
function mountWithTransition(container, wrapper, direction) {
  // If a previous transition never finished (e.g. rapid taps), settle it
  // immediately before starting a new one.
  while (container.children.length > 1) {
    container.removeChild(container.firstElementChild);
  }
  container.classList.remove('screen-transition-active');
  const oldEl = container.firstElementChild;

  container.appendChild(wrapper);

  if (!oldEl) return;        // first screen ever mounted — nothing to slide from
  if (!direction) { oldEl.remove(); return; } // e.g. a resize-triggered re-render

  container.classList.add('screen-transition-active');
  const exitClass = direction === 'forward' ? 'screen-exit-forward' : 'screen-exit-backward';
  const enterClass = direction === 'forward' ? 'screen-enter-forward' : 'screen-enter-backward';
  oldEl.classList.add('screen-exit', exitClass);
  wrapper.classList.add('screen-enter', enterClass);

  // Force a reflow before flipping to the "run" state so the transition
  // actually animates instead of snapping straight to the end values.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      oldEl.classList.add('screen-anim-run');
      wrapper.classList.add('screen-anim-run');
    });
  });

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    oldEl.remove();
    container.classList.remove('screen-transition-active');
    wrapper.classList.remove('screen-enter', 'screen-enter-forward', 'screen-enter-backward', 'screen-anim-run');
  };
  wrapper.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, 260); // fallback in case transitionend doesn't fire
}

// Screens other than 'login' require an authenticated session. Checking this
// once, here, before any screen is rendered is what lets ChatScreen (and any
// other guarded screen) safely assume it's only ever mounted when logged in
// — it no longer needs to call navigate('login') itself mid-render, which
// used to re-enter navigate() while the original call was still in progress.
const AUTH_REQUIRED_ROUTES = new Set(['chat', 'chats', 'profile', 'settings']);

export function navigate(route) {
  if (AUTH_REQUIRED_ROUTES.has(route) && (!getCurrentUser() || !getOtherUser())) {
    route = 'login';
    selectedChatId = null;
  }

  if (currentRoute === route) return;

  const prevRoute = currentRoute;

  if (unmountCurrent) { unmountCurrent(); unmountCurrent = null; }

  currentRoute = route;
  window.location.hash = route;

  // One-off freshness check on every real navigation (not a recurring
  // timer) so the unread badge/cache aren't stale when switching between
  // Chats/Profile/Settings on mobile, where the recurring poll loop isn't
  // running (that loop is owned by ChatScreen's own mount/unmount).
  // Skip it for 'chat' itself — ChatScreen's startPolling() below does its
  // own immediate sync, so this would just be a redundant duplicate call.
  // Fire-and-forget: never blocks the transition below.
  if (route !== 'login' && route !== 'chat') syncNow();

  const container = document.getElementById('screen-container');
  const direction = getDirection(prevRoute, route);

  const wrapper = document.createElement('div');
  wrapper.className = 'screen-anim-wrapper';

  const isDesktop = window.innerWidth >= 768;

  if (route === 'login') {
    unmountCurrent = renderLoginScreen(wrapper);
  } else if (route === 'profile') {
    unmountCurrent = renderProfileScreen(wrapper);
  } else if (route === 'settings') {
    unmountCurrent = renderSettingsScreen(wrapper);
  } else if (route === 'chats' || route === 'chat') {
    if (isDesktop) {
      // DESKTOP: no chat-list sidebar. This app is a single 2-person
      // conversation, so both the "Chats" tab and a direct "chat" hash open
      // that one conversation full-width, immediately — there's nothing to
      // pick from a list.
      wrapper.className = 'screen-anim-wrapper desktop-single-chat';
      unmountCurrent = renderChatScreen(wrapper);
    } else {
      // MOBILE LAYOUT — unchanged.
      if (route === 'chats') unmountCurrent = renderChatsScreen(wrapper);
      if (route === 'chat')  unmountCurrent = renderChatScreen(wrapper);
    }
  }

  mountWithTransition(container, wrapper, direction);
}

export function initRouter() {
  const handleHash = () => {
    const hash = window.location.hash.slice(1) || 'chats';
    navigate(hash);
  };

  window.addEventListener('hashchange', handleHash);
  let lastIsDesktop = window.innerWidth >= 768;
  window.addEventListener('resize', () => {
    // If we resize across the desktop/mobile breakpoint while on chat/chats,
    // re-render (no swipe animation for this — it's a layout correction,
    // not navigation).
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop !== lastIsDesktop) {
      lastIsDesktop = isDesktop;
      if (currentRoute === 'chat' || currentRoute === 'chats') {
        const cr = currentRoute;
        currentRoute = null; // force re-render without treating it as a navigation
        navigate(cr);
      }
    }
  });

  handleHash();
}

export function getCurrentRoute() { return currentRoute; }
