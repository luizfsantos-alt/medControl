const toastStack = document.getElementById('toast-stack');

export function toast(message, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  toastStack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function openSheet(el) {
  el.hidden = false;
}

export function closeSheet(el) {
  el.hidden = true;
}

const confirmOverlay = document.getElementById('modal-confirm');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');

export function confirmDialog({ title, message, okText = 'Confirmar', cancelText = 'Cancelar', danger = false }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOk.textContent = okText;
  confirmCancel.textContent = cancelText;
  confirmOk.className = danger ? 'btn danger' : 'btn primary';
  openSheet(confirmOverlay);

  return new Promise((resolve) => {
    function cleanup(result) {
      closeSheet(confirmOverlay);
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() {
      cleanup(true);
    }
    function onCancel() {
      cleanup(false);
    }
    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onCancel);
  });
}
