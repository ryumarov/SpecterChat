// ===== FULLSCREEN GUARD =====
// Root cause of the "Tizimdan chiqmoqchimisiz?" bug during file upload:
// browsers automatically drop the page OUT of fullscreen the moment a
// native OS modal opens (file picker, camera capture, print dialog, etc).
// That's expected browser behavior — nothing in this app calls
// exitFullscreen() — but main.js's `fullscreenchange` listener couldn't
// tell that apart from the user actually leaving fullscreen, so it fired
// the exit-confirmation modal every single time someone tapped Gallery/
// Photos/Files.
//
// This module lets any code that's about to open a native file/photo
// picker say "this fullscreen exit is expected" beforehand. main.js checks
// isFullscreenExitSuppressed() before ever showing the modal, and once the
// native picker closes (file chosen OR cancelled) this module quietly
// restores fullscreen on its own — no modal, no exitFullscreen() call.

let suppressed = false;
let focusListenerAttached = false;

function attachFocusRestore() {
  if (focusListenerAttached) return;
  focusListenerAttached = true;

  // The native file/photo picker steals window focus while it's open and
  // returns it the instant it closes — whether the user picked a file or
  // cancelled. That focus event is a reliable, cross-browser signal that
  // the picker is done, independent of whether 'change' or 'cancel' fired
  // on the <input>.
  window.addEventListener('focus', () => {
    if (!suppressed) return;
    // Give the input's own 'change'/'cancel' handlers a beat to run first,
    // then release suppression and restore fullscreen silently.
    setTimeout(() => {
      suppressed = false;
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }, 150);
  });
}

/** Call right before opening a native file/photo/camera picker. */
export function suppressFullscreenExit() {
  suppressed = true;
  attachFocusRestore();
}

/** True while a native picker is expected to be open (or just closed). */
export function isFullscreenExitSuppressed() {
  return suppressed;
}
