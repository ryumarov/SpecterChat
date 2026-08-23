import { login } from '../store/auth.js';
import { navigate } from '../router.js';

export function renderLoginScreen(container) {
  container.innerHTML = `
    <div class="screen login-screen">
      <div class="login-logo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <h1 class="login-title">ChatSpecter</h1>
      <p class="login-subtitle">Private Web Messenger</p>
      
      <div class="login-card">
        <div class="login-label">Login Code</div>
        <div class="login-input-wrap">
          <input type="password" id="login-input" class="login-input" placeholder="••••" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
          <button id="login-eye" class="login-eye-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <div id="login-error" class="login-error"></div>
        <button id="login-btn" class="login-btn">Enter</button>
      </div>
    </div>
  `;

  // NOTE: `container` is not attached to the live document yet at this point
  // (router.js appends it to the DOM only after this function returns), so
  // document.getElementById()/document.querySelector() would search the
  // wrong tree and return null. Always query relative to `container`.
  const input = container.querySelector('#login-input');
  const eyeBtn = container.querySelector('#login-eye');
  const errorEl = container.querySelector('#login-error');
  const btn = container.querySelector('#login-btn');

  let showPassword = false;
  eyeBtn.addEventListener('click', () => {
    showPassword = !showPassword;
    input.type = showPassword ? 'text' : 'password';
    eyeBtn.style.color = showPassword ? 'var(--accent)' : 'var(--text-tertiary)';
  });

  function attemptLogin() {
    const val = input.value;
    if (!val) return;
    
    errorEl.textContent = '';
    input.classList.remove('error');
    
    if (login(val)) {
      // Fullscreen is requested centrally by the global click handler in
      // main.js once we're past the login screen — requesting it here too
      // would fire a second requestFullscreen() for the same click, and the
      // second call always fails ("API can only be initiated by a user
      // gesture") because the gesture was already consumed by the first.
      navigate('chats');
    } else {
      errorEl.textContent = 'Invalid code';
      input.classList.add('error');
      input.focus();
    }
  }

  btn.addEventListener('click', attemptLogin);
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
  
  input.addEventListener('input', () => {
    errorEl.textContent = '';
    input.classList.remove('error');
  });

  setTimeout(() => input.focus(), 100);
}
