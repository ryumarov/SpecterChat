export function createAvatar(profile, size = 48) {
  const el = document.createElement('div');
  el.className = 'avatar';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;

  if (profile.avatarBase64) {
    el.innerHTML = `<img src="${profile.avatarBase64}" alt="Avatar">`;
  } else {
    // Default placeholder SVG
    el.innerHTML = `
      <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    `;
  }
  return el;
}
