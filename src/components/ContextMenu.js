// ===== CUSTOM CONTEXT / DROPDOWN MENU =====
// One small, reusable "floating menu" used everywhere the app needs to
// replace a browser default (right-click context menu) or a simple
// anchored dropdown (the chat header's trash button). Dark-mode aware,
// soft rounded corners, shadow, smooth open animation — see
// .ctx-menu* in styles/chat.css.
//
// Usage:
//   openContextMenu({ x, y, items })                 -> point-positioned (right-click)
//   openContextMenu({ anchorEl, items, align:'end' }) -> anchored under a button
//
// items: [{ key, label, icon?, danger?, onSelect }]

let activeMenu = null;
let activeCleanup = null;

export function closeContextMenu() {
  if (!activeMenu) return;
  const menu = activeMenu;
  const cleanup = activeCleanup;
  activeMenu = null;
  activeCleanup = null;
  if (cleanup) cleanup();
  menu.classList.remove('open');
  setTimeout(() => menu.remove(), 160);
}

export function openContextMenu({ x, y, anchorEl, items = [], align = 'start' } = {}) {
  closeContextMenu();
  if (!items.length) return () => {};

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.setAttribute('role', 'menu');

  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ctx-menu-item${item.danger ? ' danger' : ''}`;
    btn.setAttribute('role', 'menuitem');
    btn.innerHTML = `${item.icon ? `<span class="ctx-menu-icon">${item.icon}</span>` : ''}<span class="ctx-menu-label">${item.label}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      if (item.onSelect) item.onSelect();
    });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  activeMenu = menu;

  // Position off-screen first so we can measure, then place + clamp to viewport.
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';

  requestAnimationFrame(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let left, top;

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      top = rect.bottom + 6;
      left = align === 'end' ? rect.right - mw : rect.left;
      if (top + mh > vh - 8) top = rect.top - mh - 6;
    } else {
      left = x;
      top = y;
    }

    if (left + mw > vw - 8) left = vw - mw - 8;
    if (left < 8) left = 8;
    if (top + mh > vh - 8) top = vh - mh - 8;
    if (top < 8) top = 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.classList.add('open');
  });

  function onOutside(e) {
    if (!menu.contains(e.target)) closeContextMenu();
  }
  function onKey(e) {
    if (e.key === 'Escape') closeContextMenu();
  }
  function onViewportChange() { closeContextMenu(); }

  // Deferred so the same click/right-click that opened the menu doesn't
  // immediately close it via the outside-click listener.
  const attachTimer = setTimeout(() => {
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('contextmenu', onOutside, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
  }, 0);

  activeCleanup = () => {
    clearTimeout(attachTimer);
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('contextmenu', onOutside, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
  };

  return closeContextMenu;
}
