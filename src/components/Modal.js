export function createModal(options) {
  const { title, initialValue = '', onConfirm, onCancel, inputPlaceholder = 'Enter text...' } = options;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  
  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  
  const input = document.createElement('input');
  input.className = 'modal-input';
  input.type = 'text';
  input.value = initialValue;
  input.placeholder = inputPlaceholder;
  
  bodyEl.appendChild(input);
  
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn modal-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'modal-btn modal-btn-confirm';
  confirmBtn.textContent = 'Save';
  
  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  
  modal.appendChild(titleEl);
  modal.appendChild(bodyEl);
  modal.appendChild(actions);
  
  overlay.appendChild(modal);
  
  // Events
  const close = () => {
    overlay.remove();
  };
  
  cancelBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
    close();
  });
  
  confirmBtn.addEventListener('click', () => {
    if (onConfirm) onConfirm(input.value.trim());
    close();
  });
  
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      if (onConfirm) onConfirm(input.value.trim());
      close();
    }
  });
  
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      if (onCancel) onCancel();
      close();
    }
  });
  
  document.body.appendChild(overlay);
  input.focus();
}
