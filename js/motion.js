// Sistema de movimento "Mecânica de Precisão". Só transform, opacity e
// clip-path; nada de bibliotecas. Valores em docs/redesign/BRIEFING.md §7.

export const EASE = {
  std: 'cubic-bezier(0.2, 0, 0, 1)',
  stamp: 'cubic-bezier(0.3, 1.4, 0.5, 1)',
  heavy: 'cubic-bezier(0.7, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
};

export const DUR = {
  press: 80,
  fast: 200,
  print: 240,
  roll: 280,
  base: 320,
  release: 600,
  hold: 1500,
};

const reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function prefersReduced() {
  return !!(reducedQuery && reducedQuery.matches);
}

export function onReducedChange(fn) {
  if (reducedQuery && reducedQuery.addEventListener) reducedQuery.addEventListener('change', fn);
}

// Envelope de el.animate que tolera navegadores sem Web Animations.
export function animate(el, keyframes, options) {
  if (!el || typeof el.animate !== 'function') return null;
  try {
    return el.animate(keyframes, options);
  } catch {
    return null;
  }
}

function finished(anim) {
  return anim ? anim.finished.catch(() => {}) : Promise.resolve();
}

/* ---------- Rolete de caracteres (movimento 02) ---------- */

function slot(ch) {
  const s = document.createElement('span');
  s.className = 's';
  s.dataset.c = ch;
  s.setAttribute('aria-hidden', 'true');
  const inner = document.createElement('span');
  inner.textContent = ch === ' ' ? ' ' : ch;
  s.appendChild(inner);
  return s;
}

// Troca o texto de `el` girando só os caracteres que mudaram.
export function roll(el, text, animar = true) {
  const anterior = el._rollText;
  if (anterior === text) return;
  el._rollText = text;
  el.setAttribute('aria-label', text);

  if (!animar || anterior === undefined || prefersReduced()) {
    el.textContent = '';
    for (const ch of text) el.appendChild(slot(ch));
    if (animar && anterior !== undefined) animate(el, [{ opacity: 0.25 }, { opacity: 1 }], { duration: 160 });
    return;
  }

  const slots = [...el.children];
  const chars = [...text];
  while (slots.length < chars.length) {
    const s = slot('');
    el.appendChild(s);
    slots.push(s);
  }
  while (slots.length > chars.length) slots.pop().remove();

  let n = 0;
  chars.forEach((ch, i) => {
    const s = slots[i];
    if (s.dataset.c === ch) return;
    s.dataset.c = ch;
    const velho = s.lastElementChild;
    const novo = document.createElement('span');
    novo.textContent = ch === ' ' ? ' ' : ch;
    s.appendChild(novo);
    const delay = n++ * 30;
    if (velho) {
      Object.assign(velho.style, { position: 'absolute', left: '0', top: '0' });
      const a = animate(velho, [{ transform: 'translateY(0)' }, { transform: 'translateY(-105%)' }], {
        duration: DUR.roll,
        delay,
        easing: EASE.std,
        fill: 'forwards',
      });
      if (a) a.onfinish = () => velho.remove();
      else velho.remove();
    }
    animate(novo, [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], {
      duration: DUR.roll,
      delay,
      easing: EASE.std,
      fill: 'backwards',
    });
  });
}

/* ---------- Reordenação FLIP (movimento 07) ---------- */

export function flip(container, ordenados, animar = true) {
  const atuais = [...container.children];
  if (ordenados.length === atuais.length && ordenados.every((c, i) => atuais[i] === c)) return;
  const antes = animar ? new Map(atuais.map((c) => [c, c.getBoundingClientRect().top])) : null;
  ordenados.forEach((c) => container.appendChild(c));
  if (!animar) return;
  if (prefersReduced()) {
    ordenados.forEach((c) => animate(c, [{ opacity: 0.4 }, { opacity: 1 }], { duration: DUR.fast }));
    return;
  }
  for (const c of ordenados) {
    if (!antes.has(c)) continue;
    const dy = antes.get(c) - c.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) {
      animate(c, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: DUR.base, easing: EASE.std });
    }
  }
}

/* ---------- Carimbo (movimento 04) ---------- */

export function stamp(card, texto, botao) {
  const el = card.querySelector('.stamp');
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
  el.textContent = texto;
  el.hidden = false;
  // O conteúdo do bloco esmaece para o carimbo ser lido por cima dele.
  const conteudo = card.querySelector('.hero-content');
  if (conteudo) {
    conteudo.getAnimations().forEach((a) => a.cancel());
    animate(conteudo, [{ opacity: 1 }, { opacity: 0.15 }], {
      duration: prefersReduced() ? 120 : 260,
      delay: prefersReduced() ? 0 : DUR.press,
      easing: EASE.std,
      fill: 'forwards',
    });
  }
  if (prefersReduced()) {
    animate(el, [{ opacity: 0 }, { opacity: 0.88 }], { duration: 120, fill: 'forwards' });
    return;
  }
  if (botao) {
    animate(botao, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], {
      duration: DUR.press * 2,
      easing: EASE.std,
    });
  }
  animate(
    el,
    [
      { opacity: 0, transform: 'rotate(-4deg) scale(1.15)' },
      { opacity: 1, transform: 'rotate(-4deg) scale(1)' },
    ],
    { duration: 260, delay: DUR.press, easing: EASE.stamp, fill: 'both' },
  );
  animate(el, [{ opacity: 1 }, { opacity: 0.85 }], { duration: DUR.release, delay: 340, easing: EASE.std, fill: 'forwards' });
  animate(card, [{ transform: 'none' }, { transform: 'translateY(1px)' }, { transform: 'none' }], { duration: 140, delay: 260 });
  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch {
    /* vibração é opcional */
  }
}

export function unstamp(card) {
  const el = card.querySelector('.stamp');
  if (!el || el.hidden) return;
  const a = animate(el, [{ opacity: 0.85 }, { opacity: 0 }], {
    duration: prefersReduced() ? 120 : 300,
    easing: EASE.exit,
    fill: 'forwards',
  });
  const conteudo = card.querySelector('.hero-content');
  if (conteudo) {
    conteudo.getAnimations().forEach((x) => x.cancel());
    animate(conteudo, [{ opacity: 0.15 }, { opacity: 1 }], { duration: prefersReduced() ? 120 : DUR.base, easing: EASE.std });
  }
  const limpar = () => {
    el.getAnimations().forEach((x) => x.cancel());
    el.hidden = true;
  };
  if (a) a.onfinish = limpar;
  else limpar();
}

/* ---------- Segurar para confirmar (movimento 05) ---------- */

export function holdToConfirm(botao, onConfirm) {
  const fill = botao.querySelector('.hold-fill');
  let anim = null;
  let feito = false;

  const press = () => {
    if (feito || botao.disabled) return;
    if (!anim) {
      anim = animate(fill, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], {
        duration: DUR.hold,
        easing: 'linear',
        fill: 'both',
      });
      if (!anim) {
        // Sem Web Animations: confirma após o mesmo tempo, se continuar pressionado.
        botao._timer = setTimeout(() => {
          feito = true;
          onConfirm();
        }, DUR.hold);
        return;
      }
      anim.onfinish = () => {
        if (anim.playbackRate > 0 && !feito) {
          feito = true;
          onConfirm();
        }
      };
    } else {
      anim.playbackRate = 1;
      anim.play();
    }
  };

  const release = () => {
    if (feito) return;
    if (botao._timer) {
      clearTimeout(botao._timer);
      botao._timer = null;
    }
    if (!anim || anim.playState === 'finished') return;
    anim.playbackRate = -3;
    anim.play();
  };

  botao.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    try {
      botao.setPointerCapture(e.pointerId);
    } catch {
      /* captura é opcional */
    }
    press();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => botao.addEventListener(ev, release));
  botao.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      press();
    }
  });
  botao.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') release();
  });
  botao.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ---------- Entradas e saídas ---------- */

export function fadeIn(el, duration = DUR.fast) {
  return animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration, easing: EASE.std });
}

export function enterView(el) {
  if (prefersReduced()) return fadeIn(el, 120);
  return animate(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
    duration: DUR.fast,
    easing: EASE.std,
  });
}

// Abertura do app: cards entram em sequência, uma vez por carregamento.
export function intro(els) {
  if (prefersReduced()) return;
  els.forEach((el, i) =>
    animate(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
      duration: DUR.base,
      delay: i * 40,
      easing: EASE.std,
      fill: 'backwards',
    }),
  );
}

export function removeEl(el) {
  const a = animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: DUR.fast, easing: EASE.exit, fill: 'forwards' });
  if (a) a.onfinish = () => el.remove();
  else el.remove();
}

const desktop = window.matchMedia ? window.matchMedia('(min-width: 720px)') : null;

function scrim(overlay, de, para, duration, easing) {
  return animate(overlay, [{ opacity: de }, { opacity: para }], { duration, easing, pseudoElement: '::before', fill: 'forwards' });
}

export function sheetIn(overlay) {
  const painel = overlay.querySelector('.sheet');
  overlay.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  if (prefersReduced()) return fadeIn(overlay, 120);
  scrim(overlay, 0, 1, DUR.fast, EASE.std);
  const de = desktop && desktop.matches ? 'translateY(16px)' : 'translateY(100%)';
  return animate(painel, [{ transform: de, opacity: desktop && desktop.matches ? 0 : 1 }, { transform: 'none', opacity: 1 }], {
    duration: DUR.base,
    easing: EASE.std,
  });
}

export function sheetOut(overlay) {
  const painel = overlay.querySelector('.sheet');
  if (prefersReduced()) return Promise.resolve();
  scrim(overlay, 1, 0, DUR.fast, EASE.exit);
  const para = desktop && desktop.matches ? 'translateY(16px)' : 'translateY(100%)';
  return finished(
    animate(painel, [{ transform: 'none', opacity: 1 }, { transform: para, opacity: desktop && desktop.matches ? 0 : 1 }], {
      duration: DUR.fast,
      easing: EASE.exit,
      fill: 'forwards',
    }),
  );
}

export function toastIn(el) {
  if (prefersReduced()) return fadeIn(el, 120);
  return animate(el, [{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: DUR.fast, easing: EASE.std });
}

export function toastOut(el) {
  const kf = prefersReduced()
    ? [{ opacity: 1 }, { opacity: 0 }]
    : [{ transform: 'none' }, { transform: 'translateY(-100%)' }];
  return finished(animate(el, kf, { duration: DUR.fast, easing: EASE.exit, fill: 'forwards' }));
}

// Impressora (movimento 08): revela a linha de cima para baixo e empurra as seguintes.
export function printRow(row) {
  if (prefersReduced()) return;
  const h = row.offsetHeight;
  animate(row, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], {
    duration: DUR.print,
    delay: 120,
    easing: EASE.std,
    fill: 'backwards',
  });
  for (let n = row.nextElementSibling; n; n = n.nextElementSibling) {
    animate(n, [{ transform: `translateY(${-h}px)` }, { transform: 'none' }], {
      duration: DUR.print,
      delay: 120,
      easing: EASE.std,
      fill: 'backwards',
    });
  }
}

// Fita de advertência: velocidade constante de 40px/s, qualquer que seja o texto.
export function ajustarFita(track) {
  const metade = track.scrollWidth / 2;
  if (metade > 0) track.style.animationDuration = `${metade / 40}s`;
}
