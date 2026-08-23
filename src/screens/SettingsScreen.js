import { navigate } from '../router.js';
import { themeStore, setTheme, setTextSize, TEXT_SIZE_MIN, TEXT_SIZE_MAX } from '../store/theme.js';

export function renderSettingsScreen(container) {
  container.innerHTML = `
    <div class="screen">
      <div class="screen-header">
        <div class="header-back" id="settings-back">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
        <div class="header-title">Settings</div>
      </div>
      
      <div class="scroll-area settings-scroll">
        <div class="section-label">Appearance</div>
        <div class="card">
          <div class="settings-card-inner">
            <div class="settings-card-top" style="margin-bottom: 0;">
              <div class="settings-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </div>
              <div class="card-row-title" style="flex:1;">Theme Mode</div>
              <div class="theme-toggle-group" id="theme-group">
                <button class="theme-btn" data-val="light">Light</button>
                <button class="theme-btn" data-val="dark">Dark</button>
                <button class="theme-btn" data-val="system">System</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section-label">Chat Settings</div>
        <div class="card">
          <div class="settings-card-inner">
            <div class="settings-card-top">
              <div class="settings-card-icon" style="font-size:22px; font-weight:500; font-family:serif;">Aa</div>
              <div class="card-row-content">
                <div class="settings-card-text-title">Matn o‘lchami</div>
                <div class="settings-card-text-subtitle">Chatdagi yozuvlar hajmini o‘zgartiring</div>
              </div>
            </div>
            <div class="text-size-slider-row">
              <div class="text-size-label-s">A</div>
              <input type="range" class="text-size-slider" id="text-slider" min="${TEXT_SIZE_MIN}" max="${TEXT_SIZE_MAX}" step="1">
              <div class="text-size-label-l">A</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#settings-back').addEventListener('click', () => {
    navigate('chats');
  });

  // --- Theme Toggle ---
  const state = themeStore.getState();
  const themeGroup = container.querySelector('#theme-group');
  const slider = container.querySelector('#text-slider');

  function updateThemeUI(theme) {
    themeGroup.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.dataset.val === theme) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  updateThemeUI(state.theme);

  themeGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('theme-btn')) {
      const val = e.target.dataset.val;
      setTheme(val);
      updateThemeUI(val);
    }
  });

  // --- Text Size Slider ---
  slider.value = state.textSize;
  
  function updateSliderBackground(val) {
    const pct = ((val - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN)) * 100;
    slider.style.setProperty('--slider-pct', `${pct}%`);
  }
  updateSliderBackground(state.textSize);

  slider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    setTextSize(val);
    updateSliderBackground(val);
  });
}
