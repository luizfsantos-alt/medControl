import { sheetIn, sheetOut, toastIn, toastOut } from './motion.js';

const toastStack = document.getElementById('toast-stack');
let toastTimer = null;

// Um aviso por vez: o novo substitui o anterior.
export function toast(message, kind = 'info') {
  clearTimeout(toastTimer);
  toastStack.textContent = '';
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  if (kind === 'error') {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = 'Erro';
    el.appendChild(chip);
  }
  const texto = document.createElement('span');
  texto.textContent = message;
  el.appendChild(texto);
  toastStack.appendChild(el);
  toastIn(el);
  toastTimer = setTimeout(
    () => {
      toastOut(el).then(() => el.remove());
    },
    kind === 'error' ? 7000 : 2400,
  );
}

const gatilhos = new Map();

export function openSheet(el) {
  el._closing = null;
  if (el.hidden && !gatilhos.has(el)) gatilhos.set(el, document.activeElement);
  el.hidden = false;
  sheetIn(el);
  const titulo = el.querySelector('h2');
  if (titulo) titulo.focus({ preventScroll: true });
}

export function closeSheet(el) {
  if (el.hidden) return Promise.resolve();
  if (el._closing) return el._closing;
  const fechando = sheetOut(el).then(() => {
    if (el._closing !== fechando) return;
    el._closing = null;
    el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    el.hidden = true;
    const gatilho = gatilhos.get(el);
    gatilhos.delete(el);
    if (gatilho && document.contains(gatilho) && typeof gatilho.focus === 'function') {
      gatilho.focus({ preventScroll: true });
    }
  });
  el._closing = fechando;
  return fechando;
}

// Esc e toque fora da sheet acionam o botão de cancelar/fechar dela.
function dispensar(overlay) {
  const botao = overlay.querySelector('[data-dismiss]');
  if (botao) botao.click();
  else closeSheet(overlay);
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const abertos = [...document.querySelectorAll('.overlay:not([hidden])')];
  if (abertos.length) dispensar(abertos[abertos.length - 1]);
});

document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('overlay')) dispensar(e.target);
});

const confirmOverlay = document.getElementById('modal-confirm');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');

// `danger` é aceito por compatibilidade, mas não muda o visual: o vermelho
// do app é exclusivo do atraso crítico.
export function confirmDialog({ title, message, okText = 'Confirmar', cancelText = 'Cancelar' }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOk.textContent = okText;
  confirmCancel.textContent = cancelText;
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
