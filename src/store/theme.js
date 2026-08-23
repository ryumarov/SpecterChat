// ===== THEME STORE =====
// Manages appearance (light/dark/system) and message text size.

const THEME_KEY     = 'cs_theme';
const TEXTSIZE_KEY  = 'cs_text_size';

const DEFAULT_THEME     = 'light';
const DEFAULT_TEXT_SIZE = 15;
const MIN_TEXT_SIZE     = 11;
const MAX_TEXT_SIZE     = 22;

// ---- State ----
let _theme    = localStorage.getItem(THEME_KEY)    || DEFAULT_THEME;
let _textSize = parseInt(localStorage.getItem(TEXTSIZE_KEY), 10) || DEFAULT_TEXT_SIZE;

const listeners = [];

function notify() { listeners.forEach(fn => fn({ theme: _theme, textSize: _textSize })); }

export const themeStore = {
  getState: () => ({ theme: _theme, textSize: _textSize }),
  subscribe: (fn) => {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  },
};

// ---- Media query for system preference ----
const mq = window.matchMedia('(prefers-color-scheme: dark)');

function resolveActualTheme() {
  if (_theme === 'system') return mq.matches ? 'dark' : 'light';
  return _theme;
}

function applyToDOM() {
  document.documentElement.setAttribute('data-theme', resolveActualTheme());
  document.documentElement.style.setProperty('--msg-font-size', _textSize + 'px');
}

// Listen for OS-level changes when in system mode
mq.addEventListener('change', () => {
  if (_theme === 'system') applyToDOM();
});

// ---- Public API ----

export function setTheme(theme) {
  _theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  applyToDOM();
  notify();
}

export function setTextSize(size) {
  _textSize = Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, size));
  localStorage.setItem(TEXTSIZE_KEY, _textSize);
  applyToDOM();
  notify();
}

export function getTheme()    { return _theme; }
export function getTextSize() { return _textSize; }
export const TEXT_SIZE_MIN = MIN_TEXT_SIZE;
export const TEXT_SIZE_MAX = MAX_TEXT_SIZE;

/** Call once at app start — applies saved theme + text size before first render */
export function initTheme() {
  applyToDOM();
}
