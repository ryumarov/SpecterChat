// ===== TOAST =====
// A small, auto-dismissing banner used instead of browser alert()/confirm()
// for things like "couldn't delete a message" — non-blocking, themed,
// consistent with the rest of the custom UI. See .app-toast* in
// styles/chat.css.

let hideTimer = null;

export function showToast(message, { variant = 'default', duration = 2600 } = {}) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'app-toast';
    document.body.appendChild(el);
  }

  clearTimeout(hideTimer);
  el.textContent = message;
  el.className = `app-toast${variant === 'error' ? ' error' : ''}`;

  // Restart the enter animation even if a toast is already showing.
  requestAnimationFrame(() => el.classList.add('open'));

  hideTimer = setTimeout(() => {
    el.classList.remove('open');
  }, duration);
}
