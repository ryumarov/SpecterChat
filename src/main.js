import { syncNow } from './store/chat.js';
import { initAuth } from './store/auth.js';
import { initTheme } from './store/theme.js';
import { fetchProfilesFromApi } from './services/profileService.js';
import { initRouter } from './router.js';
import { createBottomNav } from './components/BottomNav.js';

async function bootstrap() {
  initTheme();
  initAuth();
  createBottomNav();
  initRouter();
  fetchProfilesFromApi();
  // The recurring 1s poll loop is owned by ChatScreen (starts on mount,
  // stops on unmount) so it only runs while a chat conversation is
  // actually open — see store/chat.js's startPolling/stopPolling. Here at
  // boot we just do a single one-off fetch so the cache/unread badge is
  // accurate immediately, without leaving a global timer running forever.
  syncNow();

  // Enforce auto-fullscreen on interaction. No exit-confirmation prompt is
  // ever shown — leaving fullscreen (including when a native file/photo
  // picker forces the browser out of it) is just quietly left alone.
  document.body.addEventListener('click', () => {
    const route = window.location.hash;
    if (route !== '#login' && route !== '') {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  });

  // Site-wide: block the browser's native right-click menu (Copy, Save
  // image, Inspect, Back, etc.) everywhere. Screens/components that want
  // their own custom menu on right-click (e.g. a chat message bubble)
  // stopPropagation() on their own 'contextmenu' listener before this one
  // ever runs, so this only ever suppresses the native browser menu, never
  // a custom one.
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

bootstrap();
