// ===== UPLOAD MENU =====
// Custom in-app action sheet shown when the attach button is tapped, in
// place of triggering a raw <input type="file"> click directly. Matches
// the app's modern messenger look (rounded corners, theme-aware, smooth
// slide/fade animation) and is fully mobile + desktop responsive via CSS
// (see .upload-menu-* in styles/chat.css).
//
// This component never touches fullscreen or the native OS picker itself —
// it only decides WHICH option the user picked. The caller is responsible
// for actually opening the file input (and coordinating with
// utils/fullscreenGuard.js) in response to onGallery/onPhotos/onFiles.

let activeOverlay = null;

export function openUploadMenu({ onGallery, onPhotos, onFiles } = {}) {
  closeUploadMenu(); // avoid stacking duplicate menus

  const overlay = document.createElement('div');
  overlay.className = 'upload-menu-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'upload-menu-sheet';
  sheet.innerHTML = `
    <div class="upload-menu-handle"></div>
    <div class="upload-menu-title">Upload</div>
    <div class="upload-menu-options">
      <button type="button" class="upload-menu-option" data-action="gallery">
        <span class="upload-menu-icon">📷</span>
        <span>Gallery</span>
      </button>
      <button type="button" class="upload-menu-option" data-action="photos">
        <span class="upload-menu-icon">🖼️</span>
        <span>Photos</span>
      </button>
      <button type="button" class="upload-menu-option" data-action="files">
        <span class="upload-menu-icon">📁</span>
        <span>Files</span>
      </button>
    </div>
  `;

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('open');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      overlay.remove();
      if (activeOverlay === overlay) activeOverlay = null;
    };
    overlay.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 300);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  // Tap the dimmed backdrop to dismiss without picking anything.
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });

  sheet.querySelectorAll('.upload-menu-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      close();
      // Fire the callback right away (still within the same user gesture)
      // so the caller can open the native picker while transient user
      // activation is still active.
      if (action === 'gallery' && onGallery) onGallery();
      if (action === 'photos' && onPhotos) onPhotos();
      if (action === 'files' && onFiles) onFiles();
    });
  });

  document.addEventListener('keydown', onKey);

  // Trigger the enter animation on next frame.
  requestAnimationFrame(() => overlay.classList.add('open'));

  return close;
}

export function closeUploadMenu() {
  if (activeOverlay) {
    activeOverlay.remove();
    activeOverlay = null;
  }
}
