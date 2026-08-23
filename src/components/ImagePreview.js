// ===== IMAGE PREVIEW OVERLAY =====
// Full-screen centered preview for chat images. Original aspect ratio is
// always preserved (object-fit: contain in CSS) — the image never stretches
// or crops. Closes via the close button, tapping outside the image, or Esc.

let activeOverlay = null;

export function openImagePreview(src) {
  if (activeOverlay) return; // avoid stacking duplicate previews

  const overlay = document.createElement('div');
  overlay.className = 'image-preview-overlay';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'image-preview-close';
  closeBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  const img = document.createElement('img');
  img.className = 'image-preview-img';
  img.src = src;
  img.alt = 'Image preview';

  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
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
    setTimeout(finish, 220);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  overlay.addEventListener('click', (e) => {
    // Close on backdrop or close-button taps; the image itself stays tappable
    // without closing so people can pinch/inspect it on mobile.
    if (e.target === overlay || e.target === closeBtn || closeBtn.contains(e.target)) {
      close();
    }
  });

  document.addEventListener('keydown', onKey);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => overlay.classList.add('open'));
}
