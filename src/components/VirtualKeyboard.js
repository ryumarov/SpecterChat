export function createVirtualKeyboard(onKeyPress, onBackspace, onEnter) {
  const container = document.createElement('div');
  container.className = 'virtual-keyboard';
  
  let isShift = false;
  let isSymbols = false;
  
  const layoutLetters = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['123', 'space', 'return']
  ];
  
  const layoutSymbols = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['#+=', '.', ',', '?', '!', "'", 'backspace'],
    ['ABC', 'space', 'return']
  ];
  
  function renderKeys() {
    container.innerHTML = '';
    const layout = isSymbols ? layoutSymbols : layoutLetters;
    
    layout.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'vk-row';
      
      row.forEach(key => {
        const keyEl = document.createElement('div');
        keyEl.className = 'vk-key';
        
        let display = key;
        
        if (key === 'shift') {
          keyEl.classList.add('vk-key-special');
          if (isShift) keyEl.classList.add('vk-key-active');
          display = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
        } else if (key === 'backspace') {
          keyEl.classList.add('vk-key-special');
          display = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>';
        } else if (key === 'space') {
          keyEl.classList.add('vk-key-space');
          display = 'Space';
        } else if (key === 'return') {
          keyEl.classList.add('vk-key-special', 'vk-key-return');
          display = 'Return';
        } else if (key === '123' || key === 'ABC' || key === '#+=') {
          keyEl.classList.add('vk-key-special');
        } else {
          display = isShift && !isSymbols ? key.toUpperCase() : key;
        }
        
        keyEl.innerHTML = display;
        
        // Touch events for better responsiveness
        keyEl.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          keyEl.classList.add('vk-key-pressed');
          
          if (key === 'shift') {
            isShift = !isShift;
            renderKeys();
          } else if (key === '123' || key === '#+=') {
            isSymbols = true;
            isShift = false;
            renderKeys();
          } else if (key === 'ABC') {
            isSymbols = false;
            renderKeys();
          } else if (key === 'backspace') {
            onBackspace();
          } else if (key === 'return') {
            onEnter();
          } else if (key === 'space') {
            onKeyPress(' ');
          } else {
            const char = isShift && !isSymbols ? key.toUpperCase() : key;
            onKeyPress(char);
            if (isShift) {
              isShift = false;
              renderKeys();
            }
          }
        });
        
        keyEl.addEventListener('pointerup', () => keyEl.classList.remove('vk-key-pressed'));
        keyEl.addEventListener('pointerleave', () => keyEl.classList.remove('vk-key-pressed'));
        
        rowEl.appendChild(keyEl);
      });
      
      container.appendChild(rowEl);
    });
  }
  
  renderKeys();
  
  return container;
}
