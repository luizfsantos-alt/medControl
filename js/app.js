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
} from './util.js';

const VERSION = '1.1.0';

let state = loadState();
let activeTab = 'medicamentos';
let notificacoesAtivas = false;
let statusAnterior = new Map();

const el = {
  tabMedicamentos: document.getElementById('tab-medicamentos'),
  tabEstoque: document.getElementById('tab-estoque'),
  tabHistorico: document.getElementById('tab-historico'),
  viewMedicamentos: document.getElementById('view-medicamentos'),
  viewEstoque: document.getElementById('view-estoque'),
  viewHistorico: document.getElementById('view-historico'),
  listaMedicamentos: document.getElementById('lista-medicamentos'),
  emptyMedicamentos: document.getElementById('empty-medicamentos'),
  listaEstoque: document.getElementById('lista-estoque'),
  emptyEstoque: document.getElementById('empty-estoque'),
  listaHistorico: document.getElementById('lista-historico'),
  emptyHistorico: document.getElementById('empty-historico'),
  btnNovo: document.getElementById('btn-novo'),
  btnConfig: document.getElementById('btn-config'),
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
  btnZerar: document.getElementById('btn-zerar'),
  modalImportMode: document.getElementById('modal-import-mode'),
  importMerge: document.getElementById('import-merge'),
  importReplace: document.getElementById('import-replace'),
  importCancel: document.getElementById('import-cancel'),
};

function computeStatus(med, now) {
  if (!med.ultimaTomada) {
    return { podeTomar: true, proxima: null, restanteMs: 0 };
  }
  const ultima = new Date(med.ultimaTomada).getTime();
  const proxima = ultima + med.intervaloHoras * 3600000;
  const restanteMs = proxima - now.getTime();
  return { podeTomar: restanteMs <= 0, proxima: new Date(proxima), restanteMs };
}

function switchTab(tab) {
  activeTab = tab;
  el.tabMedicamentos.classList.toggle('active', tab === 'medicamentos');
  el.tabEstoque.classList.toggle('active', tab === 'estoque');
  el.tabHistorico.classList.toggle('active', tab === 'historico');
  el.viewMedicamentos.hidden = tab !== 'medicamentos';
  el.viewEstoque.hidden = tab !== 'estoque';
  el.viewHistorico.hidden = tab !== 'historico';
  el.btnNovo.hidden = tab !== 'medicamentos';
  render();
}

function renderMedicamentos() {
  const now = new Date();
  const meds = [...state.medications].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  el.emptyMedicamentos.hidden = meds.length > 0;
  el.listaMedicamentos.innerHTML = '';

  for (const med of meds) {
    const status = computeStatus(med, now);
    checkNotification(med, status);

    const card = document.createElement('div');
    card.className = 'med-card';

    const comprimidosPorDose = med.comprimidosPorDose ?? 1;
    const estoque = med.estoque ?? 0;

    const head = document.createElement('div');
    head.className = 'med-head';
    head.innerHTML = `
      <div>
        <div class="med-name"></div>
        <div class="med-dose"></div>
      </div>
      <div class="med-actions">
        <button class="icon-btn" data-action="editar" title="Editar">✎</button>
        <button class="icon-btn" data-action="remover" title="Remover">🗑</button>
      </div>
    `;
    head.querySelector('.med-name').textContent = med.nome;
    head.querySelector('.med-dose').textContent =
      `${med.dose} (${formatComprimidos(comprimidosPorDose)}) · a cada ${med.intervaloHoras}h`;
    head.querySelector('[data-action="editar"]').addEventListener('click', () => abrirEdicao(med));
    head.querySelector('[data-action="remover"]').addEventListener('click', () => removerMedicamento(med));
    card.appendChild(head);

    const pill = document.createElement('div');
    pill.className = `status-pill ${status.podeTomar ? 'ok' : 'locked'}`;
    pill.innerHTML = '<span class="dot"></span><span></span>';
    pill.querySelector('span:last-child').textContent = status.podeTomar
      ? 'Pode tomar'
      : `Próxima às ${formatHora(status.proxima)}`;
    card.appendChild(pill);

    if (!status.podeTomar) {
      const meta = document.createElement('div');
      meta.className = 'meta-line';
      meta.textContent = `Faltam ${formatDuracao(status.restanteMs)} · última dose ${formatDiaHora(new Date(med.ultimaTomada))}`;
      card.appendChild(meta);
    }

    const estoqueLine = document.createElement('div');
    estoqueLine.className = 'stock-line';
    const estoqueInsuficiente = estoque < comprimidosPorDose;
    estoqueLine.innerHTML = `
      <span class="stock-text${estoqueInsuficiente ? ' estoque-baixo' : ''}"></span>
      <button class="icon-btn" data-action="estoque" title="Ajustar estoque">📦</button>
    `;
    estoqueLine.querySelector('.stock-text').textContent = estoqueInsuficiente
      ? `Estoque: ${formatComprimidos(estoque)} · insuficiente para a próxima dose`
      : `Estoque: ${formatComprimidos(estoque)}`;
    estoqueLine.querySelector('[data-action="estoque"]').addEventListener('click', () => abrirAjusteEstoque(med));
    card.appendChild(estoqueLine);

    const takeBtn = document.createElement('button');
    takeBtn.className = `take-btn ${status.podeTomar ? 'ok' : 'locked'}`;
    takeBtn.textContent = status.podeTomar ? 'Tomei agora' : 'Registrar mesmo assim';
    takeBtn.addEventListener('click', () => tomarMedicamento(med.id));
    card.appendChild(takeBtn);

    el.listaMedicamentos.appendChild(card);
  }
}

function renderEstoque() {
  const meds = [...state.medications].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  el.emptyEstoque.hidden = meds.length > 0;
  el.listaEstoque.innerHTML = '';

  for (const med of meds) {
    const comprimidosPorDose = med.comprimidosPorDose ?? 1;
    const estoque = med.estoque ?? 0;
    const estoqueInsuficiente = estoque < comprimidosPorDose;
    const dias = diasRestantesEstoque(med);
    const duracaoBaixa = dias !== null && dias <= 7;

    const row = document.createElement('div');
    row.className = 'estoque-item';
    row.innerHTML = `
      <div class="estoque-info">
        <div class="name"></div>
        <div class="detail"></div>
        <div class="duracao"></div>
      </div>
      <div class="estoque-actions">
        <span class="estoque-qtd${estoqueInsuficiente ? ' estoque-baixo' : ''}"></span>
        <button class="icon-btn" data-action="editar" title="Editar remédio">✎</button>
        <button class="icon-btn" data-action="estoque" title="Ajustar estoque">📦</button>
      </div>
    `;
    row.querySelector('.name').textContent = med.nome;
    row.querySelector('.detail').textContent = `${med.dose} · ${formatComprimidos(comprimidosPorDose)} por dose`;
    const duracaoEl = row.querySelector('.duracao');
    duracaoEl.textContent = formatDiasRestantes(dias);
    duracaoEl.classList.toggle('duracao-baixa', duracaoBaixa);
    row.querySelector('.estoque-qtd').textContent = formatComprimidos(estoque);
    row.querySelector('[data-action="editar"]').addEventListener('click', () => abrirEdicao(med));
    row.querySelector('[data-action="estoque"]').addEventListener('click', () => abrirAjusteEstoque(med));
    el.listaEstoque.appendChild(row);
  }
}

function renderHistorico() {
  const items = [...state.history].sort((a, b) => new Date(b.tomadoEm) - new Date(a.tomadoEm));
  el.emptyHistorico.hidden = items.length > 0;
  el.listaHistorico.innerHTML = '';

  for (const item of items) {
    const med = state.medications.find((m) => m.id === item.medicamentoId);
    const row = document.createElement('div');
    row.className = 'hist-item';
    row.innerHTML = `
      <div class="hist-info">
        <span class="name"></span>${item.forcado ? '<span class="badge-forcado">forçado</span>' : ''}
        <div class="when"></div>
      </div>
      <button class="icon-btn" data-action="apagar" title="Apagar registro">🗑</button>
    `;
    row.querySelector('.name').textContent = med ? med.nome : '(remédio removido)';
    row.querySelector('.when').textContent = `${formatDiaHora(new Date(item.tomadoEm))}${med ? ' · ' + med.dose : ''}`;
    row.querySelector('[data-action="apagar"]').addEventListener('click', () => apagarHistorico(item.id));
    el.listaHistorico.appendChild(row);
  }
}

function render() {
  if (activeTab === 'medicamentos') renderMedicamentos();
  else if (activeTab === 'estoque') renderEstoque();
  else renderHistorico();
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
    new Notification(title, { body, icon: 'assets/icon-192.png' });
  } catch {
    /* alguns navegadores exigem service worker para notificações; ignorar falha */
  }
}

async function tomarMedicamento(medId, forcado = false) {
  const med = state.medications.find((m) => m.id === medId);
  if (!med) return;
  const now = new Date();
  const status = computeStatus(med, now);

  if (!status.podeTomar && !forcado) {
    const confirmado = await confirmDialog({
      title: 'Registrar mesmo assim?',
      message: `Você tomou ${med.nome} há ${formatDuracao(now - new Date(med.ultimaTomada))} (às ${formatHora(new Date(med.ultimaTomada))}). O intervalo recomendado é de ${med.intervaloHoras}h. Confirme apenas se tiver certeza de que não é dose duplicada.`,
      okText: 'Registrar mesmo assim',
      danger: true,
    });
    if (!confirmado) return;
    return tomarMedicamento(medId, true);
  }

  const comprimidos = med.comprimidosPorDose ?? 1;
  state.history.push({
    id: uid(),
    medicamentoId: med.id,
    tomadoEm: now.toISOString(),
    forcado: !status.podeTomar,
    comprimidos,
  });
  med.ultimaTomada = now.toISOString();
  med.estoque = Math.max(0, roundToHalf((med.estoque ?? 0) - comprimidos));
  saveState(state);
  render();
  toast(`${med.nome} registrado às ${formatHora(now)}`, 'success');
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
  el.estoqueModalTitle.textContent = `Ajustar estoque · ${med.nome}`;
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
  el.medCancel.addEventListener('click', () => closeSheet(el.modalMedicamento));
  el.formMedicamento.addEventListener('submit', salvarMedicamento);

  el.estoqueMenos.addEventListener('click', () => passoEstoque(-0.5));
  el.estoqueMais.addEventListener('click', () => passoEstoque(0.5));
  el.estoqueSalvar.addEventListener('click', salvarAjusteEstoque);
  el.estoqueCancel.addEventListener('click', () => closeSheet(el.modalEstoque));

  el.btnConfig.addEventListener('click', () => openSheet(el.modalConfig));
  el.configFechar.addEventListener('click', () => closeSheet(el.modalConfig));
  el.btnExportar.addEventListener('click', exportarBackup);
  el.btnImportar.addEventListener('click', () => el.inputImportar.click());
  el.inputImportar.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (file) importarBackup(file);
    ev.target.value = '';
  });
  el.btnNotificacoes.addEventListener('click', ativarNotificacoes);
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
          const banner = document.getElementById('update-banner');
          banner.hidden = false;
          banner.onclick = () => {
            installing.postMessage('skipWaiting');
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
  render();
  setInterval(render, 15000);
  registerServiceWorker();
  window.__mcBooted = true;
}

init();
