import { loadState, saveState, exportBackup, mergeImport, wipeAll } from './state.js';
import { toast, openSheet, closeSheet, confirmDialog } from './ui.js';
import {
  uid,
  formatHora,
  formatDiaHora,
  formatDuracao,
  clampNumber,
  roundToHalf,
  formatComprimidos,
  diasRestantesEstoque,
  formatDiasRestantes,
  urlBase64ToUint8Array,
} from './util.js';
import {
  roll,
  flip,
  stamp,
  unstamp,
  holdToConfirm,
  fadeIn,
  enterView,
  intro,
  removeEl,
  printRow,
  ajustarFita,
  prefersReduced,
  onReducedChange,
} from './motion.js';

const VERSION = '2.0.1';
const ATRASO_CRITICO_MS = 24 * 3600000;
const VAPID_PUBLIC_KEY = 'BKSAhZOEXpGaragLcfwcMTF2NRG3mD-vLWl5DLD2yCoB9SOAjWiUxX2qaOAEK7SgeVGAVFuGY7P5zqO7fcPczNg';
const PUSH_CONFIG_KEY = 'medcontrol_push_config_v1';

let state = loadState();
let activeTab = 'medicamentos';
let notificacoesAtivas = false;
let statusAnterior = new Map();

const el = {
  app: document.getElementById('app'),
  tabMedicamentos: document.getElementById('tab-medicamentos'),
  tabEstoque: document.getElementById('tab-estoque'),
  tabHistorico: document.getElementById('tab-historico'),
  tabInd: document.getElementById('tab-ind'),
  viewMedicamentos: document.getElementById('view-medicamentos'),
  viewEstoque: document.getElementById('view-estoque'),
  viewHistorico: document.getElementById('view-historico'),
  headMedicamentos: document.getElementById('head-medicamentos'),
  headEstoque: document.getElementById('head-estoque'),
  headHistorico: document.getElementById('head-historico'),
  resumoMedicamentos: document.getElementById('resumo-medicamentos'),
  relogioData: document.getElementById('relogio-data'),
  relogioHora: document.getElementById('relogio-hora'),
  listaMedicamentos: document.getElementById('lista-medicamentos'),
  emptyMedicamentos: document.getElementById('empty-medicamentos'),
  listaEstoque: document.getElementById('lista-estoque'),
  emptyEstoque: document.getElementById('empty-estoque'),
  listaHistorico: document.getElementById('lista-historico'),
  emptyHistorico: document.getElementById('empty-historico'),
  btnNovo: document.getElementById('btn-novo'),
  btnConfig: document.getElementById('btn-config'),
  updateBanner: document.getElementById('update-banner'),
  modalMedicamento: document.getElementById('modal-medicamento'),
  formMedicamento: document.getElementById('form-medicamento'),
  medModalTitle: document.getElementById('med-modal-title'),
  medId: document.getElementById('med-id'),
  medNome: document.getElementById('med-nome'),
  medDose: document.getElementById('med-dose'),
  medIntervalo: document.getElementById('med-intervalo'),
  medComprimidos: document.getElementById('med-comprimidos'),
  medEstoque: document.getElementById('med-estoque'),
  medCancel: document.getElementById('med-cancel'),
  medExcluir: document.getElementById('med-excluir'),
  modalEstoque: document.getElementById('modal-estoque'),
  estoqueModalTitle: document.getElementById('estoque-modal-title'),
  estoqueMedId: document.getElementById('estoque-med-id'),
  estoqueValor: document.getElementById('estoque-valor'),
  estoqueMenos: document.getElementById('estoque-menos'),
  estoqueMais: document.getElementById('estoque-mais'),
  estoqueCancel: document.getElementById('estoque-cancel'),
  estoqueSalvar: document.getElementById('estoque-salvar'),
  modalConfig: document.getElementById('modal-config'),
  configFechar: document.getElementById('config-fechar'),
  btnExportar: document.getElementById('btn-exportar'),
  btnImportar: document.getElementById('btn-importar'),
  inputImportar: document.getElementById('input-importar'),
  btnNotificacoes: document.getElementById('btn-notificacoes'),
  pushServerUrl: document.getElementById('push-server-url'),
  pushSecret: document.getElementById('push-secret'),
  btnPushAtivar: document.getElementById('btn-push-ativar'),
  btnPushDesativar: document.getElementById('btn-push-desativar'),
  pushStatus: document.getElementById('push-status'),
  btnZerar: document.getElementById('btn-zerar'),
  modalImportMode: document.getElementById('modal-import-mode'),
  importMerge: document.getElementById('import-merge'),
  importReplace: document.getElementById('import-replace'),
  importCancel: document.getElementById('import-cancel'),
};

const HORARIO_DOSE_1X_DIA = 8; // horário de referência pra remédios de 1x ao dia
const INTERVALO_SEGURANCA_1X_DIA_MS = 12 * 3600000;

function ehUmaVezAoDia(med) {
  return med.intervaloHoras === 24;
}

// Marco das 8h mais recente que já passou (hoje, ou ontem se ainda não deu 8h hoje).
function marco8hMaisRecente(now) {
  const marco = new Date(now);
  marco.setHours(HORARIO_DOSE_1X_DIA, 0, 0, 0);
  if (marco.getTime() > now.getTime()) marco.setDate(marco.getDate() - 1);
  return marco;
}

function computeStatus(med, now) {
  const umaVezAoDia = ehUmaVezAoDia(med);

  if (!med.ultimaTomada) {
    return {
      podeTomar: true,
      proxima: null,
      restanteMs: 0,
      atrasoMs: 0,
      atrasoCritico: false,
      atrasado: false,
      atrasoAgendaMs: 0,
      msDesdeUltima: null,
      umaVezAoDia,
    };
  }

  const ultima = new Date(med.ultimaTomada).getTime();

  if (umaVezAoDia) {
    const liberaEm = ultima + INTERVALO_SEGURANCA_1X_DIA_MS;
    const podeTomar = now.getTime() >= liberaEm;
    const marco = marco8hMaisRecente(now).getTime();
    const atrasado = ultima < marco;
    const atrasoAgendaMs = atrasado ? now.getTime() - marco : 0;
    const msDesdeUltima = now.getTime() - ultima;
    const atrasoCritico = msDesdeUltima > ATRASO_CRITICO_MS;
    return {
      podeTomar,
      proxima: new Date(liberaEm),
      restanteMs: liberaEm - now.getTime(),
      atrasoMs: Math.max(0, msDesdeUltima - ATRASO_CRITICO_MS),
      atrasoCritico,
      atrasado,
      atrasoAgendaMs,
      msDesdeUltima,
      umaVezAoDia,
    };
  }

  const proxima = ultima + med.intervaloHoras * 3600000;
  const restanteMs = proxima - now.getTime();
  const atrasoMs = Math.max(0, -restanteMs);
  return {
    podeTomar: restanteMs <= 0,
    proxima: new Date(proxima),
    restanteMs,
    atrasoMs,
    atrasoCritico: atrasoMs > ATRASO_CRITICO_MS,
    atrasado: false,
    atrasoAgendaMs: 0,
    msDesdeUltima: now.getTime() - ultima,
    umaVezAoDia,
  };
}


/* ==========================================================================
   Apresentação. O visual segue docs/redesign/BRIEFING.md; a lógica de status
   acima não muda.
   ========================================================================== */

const HORA_MS = 3600000;
const MIN_MS = 60000;
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const RANK_ESTADO = { crit: 0, ok: 1, wait: 2 };
const ATRASO_ORDEM_LIBERACAO_MS = 700;
const ATRASO_ORDEM_CARIMBO_MS = 380;

// Cards persistentes por id: atualizados no lugar para que as transições
// de estado possam animar (o render roda a cada 15s).
const cards = new Map();
// Doses registradas nesta sessão que ainda não foram "impressas" no Histórico.
const historicoNovo = new Set();
let primeiraRenderizacao = true;
let timerOrdem = null;

const TABS = {
  medicamentos: () => [el.tabMedicamentos, el.viewMedicamentos],
  estoque: () => [el.tabEstoque, el.viewEstoque],
  historico: () => [el.tabHistorico, el.viewHistorico],
};

function icone(id) {
  return `<svg class="icon" aria-hidden="true"><use href="#${id}" /></svg>`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function numero(qtd) {
  return roundToHalf(qtd).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function mesmoDia(a, b) {
  return a.toDateString() === b.toDateString();
}

function deslocarDias(d, dias) {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

// Forma curta para chips e dados: "Hoje 09:13", "Ontem 23:40", "Amanhã 08:00", "12/10 08:00".
function diaHoraCurto(d, now) {
  const hora = formatHora(d);
  if (mesmoDia(d, now)) return `Hoje ${hora}`;
  if (mesmoDia(d, deslocarDias(now, -1))) return `Ontem ${hora}`;
  if (mesmoDia(d, deslocarDias(now, 1))) return `Amanhã ${hora}`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hora}`;
}

function rotuloDia(d, now) {
  let prefixo = '';
  if (mesmoDia(d, now)) prefixo = 'Hoje · ';
  else if (mesmoDia(d, deslocarDias(now, -1))) prefixo = 'Ontem · ';
  const ano = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${prefixo}${DIAS_SEMANA[d.getDay()]} ${pad2(d.getDate())} ${MESES[d.getMonth()]}${ano}`;
}

// Traduz o status calculado em um dos três estados visuais (BRIEFING §4).
function estadoVisual(med, status, now) {
  if (status.atrasoCritico) {
    const horas = Math.floor(status.atrasoMs / HORA_MS);
    const relogio = horas >= 1 ? `${horas}h` : `${Math.max(1, Math.floor(status.atrasoMs / MIN_MS))}min`;
    return {
      k: 'crit',
      label: 'Atrasado há',
      relogio,
      lado: `Desde ${diaHoraCurto(new Date(now.getTime() - status.atrasoMs), now)}`,
      p: 1,
    };
  }
  if (status.podeTomar) {
    return {
      k: 'ok',
      label: 'Liberado',
      relogio: 'Agora',
      lado: med.ultimaTomada ? `Desde ${diaHoraCurto(status.proxima, now)}` : 'Primeira dose',
      p: 1,
    };
  }
  const minutos = Math.max(1, Math.ceil(status.restanteMs / MIN_MS));
  const total = status.umaVezAoDia ? INTERVALO_SEGURANCA_1X_DIA_MS : med.intervaloHoras * HORA_MS;
  const libera = mesmoDia(status.proxima, now) ? `às ${formatHora(status.proxima)}` : diaHoraCurto(status.proxima, now);
  return {
    k: 'wait',
    label: 'Faltam',
    relogio: `${Math.floor(minutos / 60)}:${pad2(minutos % 60)}`,
    lado: `Libera ${libera}`,
    p: Math.min(1, Math.max(0, 1 - status.restanteMs / total)),
  };
}

// Urgência: atraso crítico (maior primeiro), liberados (alfabético),
// aguardando (menor tempo restante primeiro).
function chaveOrdem(med, status, vis) {
  const valor = vis.k === 'crit' ? -status.atrasoMs : vis.k === 'wait' ? status.restanteMs : 0;
  return { rank: RANK_ESTADO[vis.k], valor, nome: med.nome };
}

function compararCards(a, b) {
  const ka = a._chave;
  const kb = b._chave;
  return ka.rank - kb.rank || ka.valor - kb.valor || ka.nome.localeCompare(kb.nome, 'pt-BR');
}

function criarCard(id) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = id;
  card.innerHTML = `
    <div class="card-top">
      <div class="gauge" aria-hidden="true"><i></i></div>
      <div class="fita" aria-hidden="true" hidden><div class="fita-track"></div></div>
    </div>
    <div class="card-head">
      <button class="card-name" type="button"></button>
      <div class="card-meta"><span class="card-meta-txt"></span><span class="chip chip-8h" hidden>Passou das 8h</span></div>
    </div>
    <div class="hero">
      <div class="hero-base"></div>
      <div class="hero-hatch"></div>
      <div class="hero-content">
        <span class="hero-label"></span>
        <span class="clock roll"></span>
        <span class="hero-aside"></span>
      </div>
      <div class="stamp" aria-hidden="true" hidden></div>
    </div>
    <p class="alerta" hidden></p>
    <div class="facts">
      <div class="fact">
        <span class="fact-k">Última dose</span>
        <span class="fact-v fv-ultima"></span>
      </div>
      <button class="fact fact-btn" type="button">
        <span class="fact-k"><span>Estoque</span>${icone('i-seta')}</span>
        <span class="fact-v">
          <span class="roll fv-estoque"></span><span class="fact-unit">comp.</span>
          <span class="chip solid chip-insuf" hidden>Insuficiente</span>
        </span>
      </button>
    </div>
    <p class="contexto" hidden></p>
    <div class="action"></div>
  `;
  const acharMed = () => state.medications.find((m) => m.id === id);
  card.querySelector('.card-name').addEventListener('click', () => {
    const med = acharMed();
    if (med) abrirEdicao(med);
  });
  card.querySelector('.fact-btn').addEventListener('click', () => {
    const med = acharMed();
    if (med) abrirAjusteEstoque(med);
  });
  return card;
}

function definirAcao(card, tipo, animar) {
  if (card._acao === tipo) return;
  card._acao = tipo;
  const id = card.dataset.id;
  const box = card.querySelector('.action');
  box.textContent = '';
  const botao = document.createElement('button');
  botao.type = 'button';
  if (tipo === 'take') {
    botao.className = 'take-btn';
    botao.textContent = 'Tomei agora';
    botao.addEventListener('click', () => tomarMedicamento(id));
  } else {
    const rotulo = 'Segure para antecipar a dose';
    botao.className = 'hold-btn';
    botao.setAttribute('aria-label', 'Segure por um segundo e meio para registrar a dose antes da hora');
    botao.innerHTML = '<span class="hold-base"></span><span class="hold-fill" aria-hidden="true"></span>';
    botao.querySelector('.hold-base').textContent = rotulo;
    botao.querySelector('.hold-fill').textContent = rotulo;
    holdToConfirm(botao, () => tomarMedicamento(id, true));
  }
  box.appendChild(botao);
  if (animar) fadeIn(botao);
}

function atualizarCard(card, med, status, now, animar) {
  const vis = estadoVisual(med, status, now);
  const anterior = card.dataset.k;
  const q = (s) => card.querySelector(s);
  card.dataset.k = vis.k;
  card.classList.remove('k-ok', 'k-wait', 'k-crit');
  card.classList.add(`k-${vis.k}`);

  const comprimidos = med.comprimidosPorDose ?? 1;
  const estoque = med.estoque ?? 0;
  const freq = status.umaVezAoDia ? '1x ao dia · ref. 8h' : `a cada ${med.intervaloHoras}h`;
  q('.card-name').textContent = med.nome;
  q('.card-name').setAttribute('aria-label', `Editar ${med.nome}`);
  q('.card-meta-txt').textContent = `${med.dose} · ${numero(comprimidos)} comp · ${freq}`;
  q('.chip-8h').hidden = !(status.atrasado && !status.atrasoCritico);

  q('.hero-label').textContent = vis.label;
  q('.hero-aside').textContent = vis.lado;
  roll(q('.clock'), vis.relogio, animar);
  q('.gauge i').style.transform = `scaleX(${vis.p.toFixed(4)})`;

  const fita = q('.fita');
  const alerta = q('.alerta');
  fita.hidden = vis.k !== 'crit';
  alerta.hidden = vis.k !== 'crit';
  if (vis.k === 'crit') {
    const texto = `Atrasado há ${vis.relogio} · Mais de 24h sem tomar ${med.nome} · `;
    const track = q('.fita-track');
    if (track.dataset.t !== texto) {
      track.dataset.t = texto;
      track.textContent = '';
      for (let i = 0; i < 2; i++) {
        const metade = document.createElement('span');
        metade.textContent = texto.repeat(3);
        track.appendChild(metade);
      }
      requestAnimationFrame(() => ajustarFita(track));
    }
    alerta.textContent = '';
    const titulo = document.createElement('b');
    titulo.textContent = `Mais de 24h sem tomar ${med.nome}.`;
    alerta.append(
      titulo,
      ' Ficar tanto tempo sem essa dose pode ter consequências negativas à sua saúde. Tome assim que possível ou busque orientação médica.',
    );
  }

  q('.fv-ultima').textContent = med.ultimaTomada ? diaHoraCurto(new Date(med.ultimaTomada), now) : 'Nenhuma';
  roll(q('.fv-estoque'), numero(estoque), animar);
  q('.chip-insuf').hidden = estoque >= comprimidos;
  q('.fact-btn').setAttribute('aria-label', `Ajustar estoque de ${med.nome}: ${formatComprimidos(estoque)}`);

  const contexto = q('.contexto');
  contexto.hidden = vis.k !== 'wait';
  if (vis.k === 'wait') {
    const intervalo = status.umaVezAoDia ? 'intervalo mínimo de 12h' : `intervalo de ${med.intervaloHoras}h`;
    contexto.textContent = `Última dose há ${formatDuracao(now - new Date(med.ultimaTomada))} · ${intervalo}`;
  }

  definirAcao(card, vis.k === 'wait' ? 'hold' : 'take', animar);

  const liberou = anterior === 'wait' && vis.k !== 'wait';
  if (liberou && animar && prefersReduced()) fadeIn(q('.hero-content'), 160);
  card._chave = chaveOrdem(med, status, vis);
  return { vis, liberou };
}

function ordenarCards(animar) {
  const ordem = [...cards.values()].sort(compararCards);
  flip(el.listaMedicamentos, ordem, animar);
}

function agendarOrdem(atrasoMs, animar) {
  clearTimeout(timerOrdem);
  if (!atrasoMs || !animar || prefersReduced()) {
    ordenarCards(animar);
    return;
  }
  timerOrdem = setTimeout(() => ordenarCards(true), atrasoMs);
}

function renderMedicamentos(animar = true, atrasoOrdemMs = 0) {
  const now = new Date();
  const meds = state.medications;
  el.emptyMedicamentos.hidden = meds.length > 0;
  el.headMedicamentos.hidden = meds.length === 0;

  for (const [id, card] of cards) {
    if (!meds.some((m) => m.id === id)) {
      cards.delete(id);
      if (animar) removeEl(card);
      else card.remove();
    }
  }

  let liberou = false;
  let criticos = 0;
  for (const med of meds) {
    const status = computeStatus(med, now);
    checkNotification(med, status);
    let card = cards.get(med.id);
    const novo = !card;
    if (novo) {
      card = criarCard(med.id);
      cards.set(med.id, card);
      el.listaMedicamentos.appendChild(card);
    }
    if (!card._busy) {
      const r = atualizarCard(card, med, status, now, animar && !novo);
      if (r.liberou) liberou = true;
    }
    if (status.atrasoCritico) criticos++;
    if (novo && animar && !primeiraRenderizacao) fadeIn(card, 320);
  }

  const atraso = liberou ? ATRASO_ORDEM_LIBERACAO_MS : atrasoOrdemMs;
  agendarOrdem(atraso, animar && !primeiraRenderizacao);
  if (primeiraRenderizacao && activeTab === 'medicamentos') intro([...el.listaMedicamentos.children]);

  const n = meds.length;
  el.resumoMedicamentos.textContent = '';
  el.resumoMedicamentos.append(`${n} ${n === 1 ? 'cadastrado' : 'cadastrados'}`);
  if (criticos) {
    const b = document.createElement('b');
    b.textContent = `${criticos} ${criticos === 1 ? 'atrasado' : 'atrasados'}`;
    el.resumoMedicamentos.append(' · ', b);
  }
}

// Carimbo de dose (movimento 04): o card fica "ocupado" até o carimbo
// assentar; só então muda de estado e de posição.
function carimbar(card, med, now) {
  card._busy = true;
  const botao = card.querySelector('.action button');
  if (botao) botao.disabled = true;
  stamp(card, `Tomado · ${formatHora(now)}`, botao);
  const estoque = med.estoque ?? 0;
  roll(card.querySelector('.fv-estoque'), numero(estoque), true);
  card.querySelector('.chip-insuf').hidden = estoque >= (med.comprimidosPorDose ?? 1);
  card.querySelector('.fv-ultima').textContent = diaHoraCurto(now, now);
  setTimeout(
    () => {
      card._busy = false;
      unstamp(card);
      renderMedicamentos(true, ATRASO_ORDEM_CARIMBO_MS);
    },
    prefersReduced() ? 900 : 1100,
  );
}

function renderEstoque() {
  const meds = [...state.medications].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  el.emptyEstoque.hidden = meds.length > 0;
  el.headEstoque.hidden = meds.length === 0;
  el.listaEstoque.textContent = '';

  for (const med of meds) {
    const comprimidosPorDose = med.comprimidosPorDose ?? 1;
    const estoque = med.estoque ?? 0;
    const dias = diasRestantesEstoque(med);

    const row = document.createElement('div');
    row.className = 'estoque-row';
    row.innerHTML = `
      <button class="estoque-main" type="button">
        <span class="estoque-info"><span class="estoque-nome"></span><span class="estoque-meta"></span></span>
        <span class="estoque-qtd"><span class="estoque-num"></span><span class="estoque-unit">comp.</span></span>
        <span class="estoque-dias"><span class="estoque-dias-txt"></span></span>
      </button>
      <button class="icon-btn" type="button">${icone('i-editar')}</button>
    `;
    row.querySelector('.estoque-nome').textContent = med.nome;
    row.querySelector('.estoque-meta').textContent = `${med.dose} · ${numero(comprimidosPorDose)} comp por dose`;
    row.querySelector('.estoque-num').textContent = numero(estoque);
    row.querySelector('.estoque-dias-txt').textContent = formatDiasRestantes(dias);

    let alerta = null;
    if (estoque <= 0) alerta = 'Esgotado';
    else if (estoque < comprimidosPorDose) alerta = 'Insuficiente';
    else if (dias !== null && dias <= 7) alerta = 'Repor';
    if (alerta) {
      const chip = document.createElement('span');
      chip.className = 'chip solid';
      chip.textContent = alerta;
      row.querySelector('.estoque-dias').appendChild(chip);
    }

    const main = row.querySelector('.estoque-main');
    main.setAttribute('aria-label', `Ajustar estoque de ${med.nome}: ${formatComprimidos(estoque)}`);
    main.addEventListener('click', () => abrirAjusteEstoque(med));
    const editar = row.querySelector('.icon-btn');
    editar.setAttribute('aria-label', `Editar ${med.nome}`);
    editar.addEventListener('click', () => abrirEdicao(med));
    el.listaEstoque.appendChild(row);
  }
}

function renderHistorico() {
  const now = new Date();
  const items = [...state.history].sort((a, b) => new Date(b.tomadoEm) - new Date(a.tomadoEm));
  el.emptyHistorico.hidden = items.length > 0;
  el.headHistorico.hidden = items.length === 0;
  el.listaHistorico.textContent = '';

  let diaAtual = null;
  let primeiraNova = null;
  for (const item of items) {
    const quando = new Date(item.tomadoEm);
    if (quando.toDateString() !== diaAtual) {
      diaAtual = quando.toDateString();
      const dia = document.createElement('div');
      dia.className = 'dia';
      dia.textContent = rotuloDia(quando, now);
      el.listaHistorico.appendChild(dia);
    }

    const med = state.medications.find((m) => m.id === item.medicamentoId);
    const nome = med ? med.nome : 'Remédio removido';
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <span class="hist-hora"></span>
      <span class="hist-nome"><span class="hist-nome-txt"></span></span>
      <span class="hist-meta"></span>
      <button class="icon-btn" type="button">${icone('i-excluir')}</button>
    `;
    row.querySelector('.hist-hora').textContent = formatHora(quando);
    row.querySelector('.hist-nome-txt').textContent = nome;
    if (item.forcado) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = 'Antes da hora';
      row.querySelector('.hist-nome').appendChild(chip);
    }
    if (med) {
      const comprimidos = item.comprimidos ?? med.comprimidosPorDose ?? 1;
      row.querySelector('.hist-meta').textContent = `${med.dose} · ${formatComprimidos(comprimidos)}`;
    }
    const apagar = row.querySelector('.icon-btn');
    apagar.setAttribute('aria-label', `Apagar registro de ${nome} às ${formatHora(quando)}`);
    apagar.addEventListener('click', () => apagarHistorico(item.id));
    el.listaHistorico.appendChild(row);

    if (historicoNovo.has(item.id)) {
      historicoNovo.delete(item.id);
      if (!primeiraNova) primeiraNova = row;
    }
  }
  if (primeiraNova) printRow(primeiraNova);
}

function atualizarRelogio(now, animar) {
  el.relogioData.textContent = `${DIAS_SEMANA[now.getDay()]} ${pad2(now.getDate())} ${MESES[now.getMonth()]} ·`;
  roll(el.relogioHora, formatHora(now), animar);
}

function posicionarIndicador() {
  const [botao] = TABS[activeTab]();
  el.tabInd.style.width = `${botao.offsetWidth}px`;
  el.tabInd.style.transform = `translateX(${botao.offsetLeft}px)`;
}

function switchTab(tab) {
  const mudou = tab !== activeTab;
  activeTab = tab;
  for (const [nome, partes] of Object.entries(TABS)) {
    const [botao, view] = partes();
    const ativo = nome === tab;
    botao.setAttribute('aria-selected', String(ativo));
    botao.tabIndex = ativo ? 0 : -1;
    view.hidden = !ativo;
  }
  posicionarIndicador();
  render();
  if (mudou) {
    window.scrollTo(0, 0);
    enterView(TABS[tab]()[1]);
    if (tab === 'medicamentos') document.querySelectorAll('.fita-track').forEach(ajustarFita);
  }
}

function render(animar = true) {
  atualizarRelogio(new Date(), animar);
  renderMedicamentos(animar);
  if (activeTab === 'estoque') renderEstoque();
  else if (activeTab === 'historico') renderHistorico();
  primeiraRenderizacao = false;
}

function checkNotification(med, status) {
  const anterior = statusAnterior.get(med.id);
  statusAnterior.set(med.id, status.podeTomar);
  if (!notificacoesAtivas) return;
  if (anterior === false && status.podeTomar) {
    fireNotification(`${med.nome} liberado`, `Já pode tomar ${med.dose}.`);
  }
}

function fireNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: 'assets/icon-v2-192.png' });
  } catch {
    /* alguns navegadores exigem service worker para notificações; ignorar falha */
  }
}

async function tomarMedicamento(medId, forcado = false) {
  const med = state.medications.find((m) => m.id === medId);
  if (!med) return;
  const card = cards.get(medId);
  if (card && card._busy) return;
  const now = new Date();
  const status = computeStatus(med, now);

  if (!status.podeTomar && !forcado) {
    const intervaloTexto = status.umaVezAoDia
      ? 'O intervalo mínimo de segurança é de 12h.'
      : `O intervalo recomendado é de ${med.intervaloHoras}h.`;
    const confirmado = await confirmDialog({
      title: 'Registrar mesmo assim?',
      message: `Você tomou ${med.nome} há ${formatDuracao(now - new Date(med.ultimaTomada))} (às ${formatHora(new Date(med.ultimaTomada))}). ${intervaloTexto} Confirme apenas se tiver certeza de que não é dose duplicada.`,
      okText: 'Registrar mesmo assim',
      danger: true,
    });
    if (!confirmado) return;
    return tomarMedicamento(medId, true);
  }

  const comprimidos = med.comprimidosPorDose ?? 1;
  const registro = {
    id: uid(),
    medicamentoId: med.id,
    tomadoEm: now.toISOString(),
    forcado: !status.podeTomar,
    comprimidos,
  };
  state.history.push(registro);
  historicoNovo.add(registro.id);
  med.ultimaTomada = now.toISOString();
  med.estoque = Math.max(0, roundToHalf((med.estoque ?? 0) - comprimidos));
  saveState(state);
  if (card && activeTab === 'medicamentos') carimbar(card, med, now);
  render();
  toast(`Dose de ${med.nome} registrada · ${formatHora(now)}`, 'success');
}

function recomputeUltimaTomada(med) {
  const doses = state.history
    .filter((h) => h.medicamentoId === med.id)
    .map((h) => new Date(h.tomadoEm).getTime());
  med.ultimaTomada = doses.length ? new Date(Math.max(...doses)).toISOString() : null;
}

async function apagarHistorico(histId) {
  const item = state.history.find((h) => h.id === histId);
  if (!item) return;
  const confirmado = await confirmDialog({
    title: 'Apagar registro?',
    message: 'Esse registro de dose será removido do histórico. Essa ação não pode ser desfeita.',
    okText: 'Apagar',
    danger: true,
  });
  if (!confirmado) return;

  state.history = state.history.filter((h) => h.id !== histId);
  const med = state.medications.find((m) => m.id === item.medicamentoId);
  if (med) {
    recomputeUltimaTomada(med);
    if (item.comprimidos) med.estoque = roundToHalf((med.estoque ?? 0) + item.comprimidos);
  }
  saveState(state);
  render();
  toast('Registro apagado', 'success');
}

async function removerMedicamento(med) {
  const confirmado = await confirmDialog({
    title: `Remover ${med.nome}?`,
    message: 'O remédio e todo o histórico de doses dele serão apagados. Essa ação não pode ser desfeita.',
    okText: 'Remover',
    danger: true,
  });
  if (!confirmado) return;

  state.medications = state.medications.filter((m) => m.id !== med.id);
  state.history = state.history.filter((h) => h.medicamentoId !== med.id);
  saveState(state);
  render();
  toast(`${med.nome} removido`, 'success');
}

function abrirCadastro() {
  el.medModalTitle.textContent = 'Novo remédio';
  el.medExcluir.hidden = true;
  el.medId.value = '';
  el.medNome.value = '';
  el.medDose.value = '';
  el.medIntervalo.value = '';
  el.medComprimidos.value = '1';
  el.medEstoque.value = '0';
  openSheet(el.modalMedicamento);
  setTimeout(() => el.medNome.focus(), 50);
}

function abrirEdicao(med) {
  el.medModalTitle.textContent = 'Editar remédio';
  el.medExcluir.hidden = false;
  el.medId.value = med.id;
  el.medNome.value = med.nome;
  el.medDose.value = med.dose;
  el.medIntervalo.value = med.intervaloHoras;
  el.medComprimidos.value = med.comprimidosPorDose ?? 1;
  el.medEstoque.value = med.estoque ?? 0;
  openSheet(el.modalMedicamento);
}

function salvarMedicamento(ev) {
  ev.preventDefault();
  const id = el.medId.value;
  const nome = el.medNome.value.trim();
  const dose = el.medDose.value.trim();
  const intervaloHoras = clampNumber(el.medIntervalo.value, 0.5, 72);
  const comprimidosPorDose = roundToHalf(clampNumber(el.medComprimidos.value, 0.5, 20));
  const estoque = roundToHalf(clampNumber(el.medEstoque.value, 0, 100000));

  if (!nome || !dose) return;

  if (id) {
    const med = state.medications.find((m) => m.id === id);
    if (med) {
      med.nome = nome;
      med.dose = dose;
      med.intervaloHoras = intervaloHoras;
      med.comprimidosPorDose = comprimidosPorDose;
      med.estoque = estoque;
    }
  } else {
    state.medications.push({
      id: uid(),
      nome,
      dose,
      intervaloHoras,
      comprimidosPorDose,
      estoque,
      ultimaTomada: null,
      criadoEm: new Date().toISOString(),
    });
  }
  saveState(state);
  closeSheet(el.modalMedicamento);
  render();
  toast('Remédio salvo', 'success');
}

function abrirAjusteEstoque(med) {
  el.estoqueModalTitle.textContent = med.nome;
  el.estoqueMedId.value = med.id;
  el.estoqueValor.value = med.estoque ?? 0;
  openSheet(el.modalEstoque);
}

function passoEstoque(delta) {
  const atual = Number(el.estoqueValor.value) || 0;
  el.estoqueValor.value = Math.max(0, roundToHalf(atual + delta));
}

function salvarAjusteEstoque() {
  const med = state.medications.find((m) => m.id === el.estoqueMedId.value);
  if (!med) return;
  med.estoque = roundToHalf(clampNumber(el.estoqueValor.value, 0, 100000));
  saveState(state);
  closeSheet(el.modalEstoque);
  render();
  toast('Estoque atualizado', 'success');
}

function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarBackup() {
  const backup = exportBackup(state);
  const data = new Date().toISOString().slice(0, 10);
  baixarArquivo(`medcontrol-backup-${data}.json`, JSON.stringify(backup, null, 2), 'application/json');
  toast('Backup exportado', 'success');
}

let arquivoImportado = null;

function importarBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      arquivoImportado = JSON.parse(reader.result);
      openSheet(el.modalImportMode);
    } catch {
      toast('Arquivo inválido', 'error');
    }
  };
  reader.readAsText(file);
}

function aplicarImportacao(mode) {
  if (!arquivoImportado) return;
  state = mergeImport(state, arquivoImportado, mode);
  saveState(state);
  arquivoImportado = null;
  closeSheet(el.modalImportMode);
  closeSheet(el.modalConfig);
  render();
  toast('Backup importado', 'success');
}

async function ativarNotificacoes() {
  if (!('Notification' in window)) {
    toast('Notificações não são suportadas neste navegador', 'error');
    return;
  }
  const permissao = await Notification.requestPermission();
  notificacoesAtivas = permissao === 'granted';
  toast(
    notificacoesAtivas
      ? 'Avisos ativados enquanto o app estiver aberto'
      : 'Permissão de notificação não concedida',
    notificacoesAtivas ? 'success' : 'error',
  );
}

function carregarConfigPush() {
  try {
    const raw = localStorage.getItem(PUSH_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { serverUrl: '', secret: '' };
  } catch {
    return { serverUrl: '', secret: '' };
  }
}

function salvarConfigPush(config) {
  localStorage.setItem(PUSH_CONFIG_KEY, JSON.stringify(config));
}

async function atualizarStatusPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    el.pushStatus.textContent = 'Push não é suportado neste navegador.';
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    el.pushStatus.textContent = sub ? 'Lembrete das 8h ativado neste aparelho.' : 'Lembrete das 8h desativado.';
  } catch {
    el.pushStatus.textContent = '';
  }
}

function abrirConfigPush() {
  const config = carregarConfigPush();
  el.pushServerUrl.value = config.serverUrl || '';
  el.pushSecret.value = config.secret || '';
  atualizarStatusPush();
}

async function ativarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast('Este navegador não suporta notificações push', 'error');
    return;
  }
  const serverUrl = el.pushServerUrl.value.trim().replace(/\/+$/, '');
  const secret = el.pushSecret.value.trim();
  if (!serverUrl) {
    toast('Preencha o endereço do servidor primeiro', 'error');
    return;
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    toast('Permissão de notificação não concedida', 'error');
    return;
  }

  let sub;
  try {
    const reg = await navigator.serviceWorker.ready;
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
  } catch (err) {
    toast(`Não consegui criar a inscrição de push: ${err?.message || err}`, 'error');
    atualizarStatusPush();
    return;
  }

  try {
    const resposta = await fetch(`${serverUrl}/subscribe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { 'x-medcontrol-key': secret } : {}),
      },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => '');
      throw new Error(`HTTP ${resposta.status}${texto ? ' — ' + texto : ''}`);
    }

    salvarConfigPush({ serverUrl, secret });
    toast('Lembrete das 8h ativado', 'success');
  } catch (err) {
    toast(`Não consegui falar com o servidor: ${err?.message || err}`, 'error');
  }
  atualizarStatusPush();
}

async function desativarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const config = carregarConfigPush();

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (config.serverUrl) {
        fetch(`${config.serverUrl}/unsubscribe`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(config.secret ? { 'x-medcontrol-key': config.secret } : {}),
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
      }
      await sub.unsubscribe();
    }
    toast('Lembrete das 8h desativado', 'success');
  } catch {
    toast('Não consegui desativar o lembrete', 'error');
  }
  atualizarStatusPush();
}

async function zerarDados() {
  const confirmado = await confirmDialog({
    title: 'Apagar todos os dados?',
    message: 'Todos os remédios e todo o histórico serão apagados deste aparelho. Exporte um backup antes, se quiser guardar os dados.',
    okText: 'Apagar tudo',
    danger: true,
  });
  if (!confirmado) return;
  wipeAll();
  state = loadState();
  closeSheet(el.modalConfig);
  render();
  toast('Dados apagados', 'success');
}

function wireEvents() {
  el.tabMedicamentos.addEventListener('click', () => switchTab('medicamentos'));
  el.tabEstoque.addEventListener('click', () => switchTab('estoque'));
  el.tabHistorico.addEventListener('click', () => switchTab('historico'));
  el.btnNovo.addEventListener('click', abrirCadastro);
  document.querySelectorAll('[data-action="novo"]').forEach((b) => b.addEventListener('click', abrirCadastro));
  el.medCancel.addEventListener('click', () => closeSheet(el.modalMedicamento));
  el.medExcluir.addEventListener('click', () => {
    const med = state.medications.find((m) => m.id === el.medId.value);
    closeSheet(el.modalMedicamento);
    if (med) removerMedicamento(med);
  });

  // Setas trocam de aba, como em qualquer tablist.
  const ordemAbas = ['medicamentos', 'estoque', 'historico'];
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = ordemAbas.indexOf(activeTab);
    const prox = ordemAbas[(i + (e.key === 'ArrowRight' ? 1 : ordemAbas.length - 1)) % ordemAbas.length];
    switchTab(prox);
    TABS[prox]()[0].focus();
  });
  window.addEventListener('resize', posicionarIndicador);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
  el.formMedicamento.addEventListener('submit', salvarMedicamento);

  el.estoqueMenos.addEventListener('click', () => passoEstoque(-0.5));
  el.estoqueMais.addEventListener('click', () => passoEstoque(0.5));
  el.estoqueSalvar.addEventListener('click', salvarAjusteEstoque);
  el.estoqueCancel.addEventListener('click', () => closeSheet(el.modalEstoque));

  el.btnConfig.addEventListener('click', () => {
    openSheet(el.modalConfig);
    abrirConfigPush();
  });
  el.configFechar.addEventListener('click', () => closeSheet(el.modalConfig));
  el.btnExportar.addEventListener('click', exportarBackup);
  el.btnImportar.addEventListener('click', () => el.inputImportar.click());
  el.inputImportar.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (file) importarBackup(file);
    ev.target.value = '';
  });
  el.btnNotificacoes.addEventListener('click', ativarNotificacoes);
  el.btnPushAtivar.addEventListener('click', ativarPush);
  el.btnPushDesativar.addEventListener('click', desativarPush);
  el.btnZerar.addEventListener('click', zerarDados);

  el.importMerge.addEventListener('click', () => aplicarImportacao('merge'));
  el.importReplace.addEventListener('click', () => aplicarImportacao('replace'));
  el.importCancel.addEventListener('click', () => {
    arquivoImportado = null;
    closeSheet(el.modalImportMode);
  });

  const rescueClear = document.getElementById('rescue-clear');
  if (rescueClear) {
    rescueClear.addEventListener('click', () => {
      location.hash = '#/reset';
      location.reload();
    });
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          const banner = el.updateBanner;
          banner.hidden = false;
          banner.onclick = () => {
            installing.postMessage('skipWaiting');
          };
          banner.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              installing.postMessage('skipWaiting');
            }
          };
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());

    const checarAtualizacao = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checarAtualizacao();
    });
    window.addEventListener('online', checarAtualizacao);
  } catch {
    /* PWA funciona sem service worker, só perde o modo offline */
  }
}

function init() {
  wireEvents();
  render(false);
  posicionarIndicador();
  // Nada anima na primeira pintura: as transições só valem depois de 2 frames.
  requestAnimationFrame(() => requestAnimationFrame(() => el.app.classList.remove('no-tr')));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      posicionarIndicador();
      document.querySelectorAll('.fita-track').forEach(ajustarFita);
    });
  }
  onReducedChange(() => render(false));
  setInterval(render, 15000);
  registerServiceWorker();
  window.__mcBooted = true;
}

init();
