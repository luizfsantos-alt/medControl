// Regras do MedControl (docs/spec.md). Funções puras: recebem os dados e o
// instante atual, devolvem o que a interface e os avisos precisam.
import { HORA, MIN, inicioDoDia, proximaMeiaNoite, somarDias } from './tempo';
import type { Agenda, Dados, Dose, Intervalo, Remedio } from './types';

/* ---------- Blocos ---------- */

export interface Bloco {
  remedioId: string;
  inicio: number;
  fim: number;
  /** Instante do horário de tomar dentro do bloco. */
  horario: number;
  intervaloHoras: Intervalo;
}

/** Bloco de `h` horas que contém `t`. Blocos começam à meia-noite. */
export function blocoEm(t: number, h: Intervalo): { inicio: number; fim: number } {
  const d = new Date(t);
  const k = Math.floor(d.getHours() / h) * h;
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), k).getTime();
  const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), k + h).getTime();
  return { inicio, fim };
}

export function horarioNoBloco(inicio: number, a: Agenda): number {
  const offset = a.horarioMin % (a.intervaloHoras * 60);
  return inicio + offset * MIN;
}

/** Horários do dia, em minutos, a partir do horário escolhido. */
export function horariosDoDia(intervalo: Intervalo, horarioMin: number): number[] {
  const passo = intervalo * 60;
  const base = horarioMin % passo;
  const r: number[] = [];
  for (let m = base; m < 24 * 60; m += passo) r.push(m);
  return r;
}

export function agendaEm(r: Remedio, t: number): Agenda | null {
  let a: Agenda | null = null;
  for (const x of r.agendas) if (x.desde <= t) a = x;
  return a;
}

/**
 * Blocos do remédio que cruzam [de, ate). Um bloco só existe enquanto o
 * remédio não foi excluído (blocos que começam depois da exclusão não contam).
 */
export function blocosDoRemedio(r: Remedio, de: number, ate: number): Bloco[] {
  const out: Bloco[] = [];
  const fimVida = r.excluidoEm ?? Infinity;
  r.agendas.forEach((a, i) => {
    const segFim = Math.min(r.agendas[i + 1]?.desde ?? Infinity, fimVida, ate);
    let t = blocoEm(Math.max(a.desde, de), a.intervaloHoras).inicio;
    if (t < a.desde) t = a.desde;
    while (t < segFim) {
      const { fim } = blocoEm(t, a.intervaloHoras);
      if (fim > de) out.push({ remedioId: r.id, inicio: t, fim, horario: horarioNoBloco(t, a), intervaloHoras: a.intervaloHoras });
      t = fim;
    }
  });
  return out;
}

/* ---------- Índice de doses ---------- */

export class IndiceDoses {
  private porBloco = new Map<string, Dose>();
  private ultima = new Map<string, Dose>();
  constructor(doses: Dose[]) {
    for (const d of doses) {
      this.porBloco.set(`${d.remedioId}|${d.blocoInicio}`, d);
      const u = this.ultima.get(d.remedioId);
      if (!u || d.em > u.em) this.ultima.set(d.remedioId, d);
    }
  }
  noBloco(remedioId: string, inicio: number): Dose | undefined {
    return this.porBloco.get(`${remedioId}|${inicio}`);
  }
  ultimaDose(remedioId: string): Dose | undefined {
    return this.ultima.get(remedioId);
  }
}

export type SituacaoBloco = 'tomado' | 'nao' | 'aberto' | 'futuro' | 'ignorado';

export function situacaoBloco(b: Bloco, r: Remedio, idx: IndiceDoses, now: number): SituacaoBloco {
  if (idx.noBloco(b.remedioId, b.inicio)) return 'tomado';
  // Excluído com o bloco ainda em andamento: não cobra.
  if (r.excluidoEm !== null && b.fim > r.excluidoEm) return 'ignorado';
  if (b.fim <= now) return 'nao';
  if (b.inicio <= now) return 'aberto';
  return 'futuro';
}

/* ---------- Card ---------- */

export type EstadoCard =
  | { k: 'perdido'; horarioPerdido: number; atual: Bloco }
  | { k: 'agora'; atual: Bloco }
  | { k: 'espera'; atual: Bloco; faltaMs: number; progresso: number }
  | { k: 'tomado'; atual: Bloco; tomadoEm: number; proximo: Bloco | null };

export interface StatusRemedio {
  estado: EstadoCard;
  ultimaDose: Dose | undefined;
  /** Segurar para registrar: última dose há menos da metade do intervalo. */
  barreira: boolean;
  /** Pode registrar agora (bloco atual ainda não tomado). */
  podeRegistrar: boolean;
}

export function statusRemedio(r: Remedio, idx: IndiceDoses, now: number): StatusRemedio {
  const blocos = blocosDoRemedio(r, now - 24 * HORA - 1, now + 48 * HORA);
  const i = blocos.findIndex((b) => b.inicio <= now && now < b.fim);
  const atual = blocos[i];
  const anterior = i > 0 ? blocos[i - 1] : undefined;
  const ultimaDose = idx.ultimaDose(r.id);
  const doseAtual = idx.noBloco(r.id, atual.inicio);
  const h = atual.intervaloHoras;

  let estado: EstadoCard;
  if (doseAtual) {
    estado = { k: 'tomado', atual, tomadoEm: doseAtual.em, proximo: blocos[i + 1] ?? null };
  } else if (anterior && anterior.fim === atual.inicio && !idx.noBloco(r.id, anterior.inicio)) {
    estado = { k: 'perdido', horarioPerdido: anterior.horario, atual };
  } else if (now >= atual.horario) {
    estado = { k: 'agora', atual };
  } else {
    const faltaMs = atual.horario - now;
    const progresso = Math.min(1, Math.max(0, 1 - faltaMs / (h * HORA)));
    estado = { k: 'espera', atual, faltaMs, progresso };
  }

  const barreira = !doseAtual && !!ultimaDose && now - ultimaDose.em < (h * HORA) / 2;
  return { estado, ultimaDose, barreira, podeRegistrar: !doseAtual };
}

const RANK = { perdido: 0, agora: 1, espera: 2, tomado: 3 } as const;

export function chaveOrdem(r: Remedio, s: StatusRemedio): [number, number, string] {
  const e = s.estado;
  let valor = 0;
  if (e.k === 'perdido') valor = e.horarioPerdido;
  else if (e.k === 'agora') valor = e.atual.horario;
  else if (e.k === 'espera') valor = e.atual.horario;
  else valor = e.proximo?.horario ?? Infinity;
  return [RANK[e.k], valor, r.nome];
}

export function compararChaves(a: [number, number, string], b: [number, number, string]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2], 'pt-BR');
}

/* ---------- Registrar, desfazer e editar ---------- */

export function arredondarMeio(v: number): number {
  return Math.round(v * 2) / 2;
}

export function registrarDose(dados: Dados, remedioId: string, now: number, id: string): { dados: Dados; dose: Dose } | null {
  const r = dados.remedios.find((x) => x.id === remedioId);
  if (!r || r.excluidoEm !== null) return null;
  const idx = new IndiceDoses(dados.doses);
  const s = statusRemedio(r, idx, now);
  if (!s.podeRegistrar) return null;
  const descontado = Math.min(r.estoque, r.comprimidosPorDose);
  const dose: Dose = { id, remedioId, em: now, blocoInicio: s.estado.atual.inicio, descontado };
  const remedios = dados.remedios.map((x) => (x.id === remedioId ? { ...x, estoque: arredondarMeio(x.estoque - descontado) } : x));
  return { dados: { remedios, doses: [...dados.doses, dose] }, dose };
}

export function desfazerDose(dados: Dados, doseId: string): Dados {
  const dose = dados.doses.find((d) => d.id === doseId);
  if (!dose) return dados;
  return {
    remedios: dados.remedios.map((x) => (x.id === dose.remedioId ? { ...x, estoque: arredondarMeio(x.estoque + dose.descontado) } : x)),
    doses: dados.doses.filter((d) => d.id !== doseId),
  };
}

export interface CamposRemedio {
  nome: string;
  dose: string;
  comprimidosPorDose: number;
  estoque: number;
  intervaloHoras: Intervalo;
  horarioMin: number;
}

export function novoRemedio(c: CamposRemedio, now: number, id: string): Remedio {
  return {
    id,
    nome: c.nome,
    dose: c.dose,
    comprimidosPorDose: c.comprimidosPorDose,
    estoque: c.estoque,
    agendas: [{ desde: blocoEm(now, c.intervaloHoras).inicio, intervaloHoras: c.intervaloHoras, horarioMin: c.horarioMin }],
    criadoEm: now,
    excluidoEm: null,
  };
}

/**
 * Edição. Mudança de horário/intervalo vale a partir da próxima meia-noite;
 * sem nenhuma dose registrada, é correção de cadastro e vale na hora.
 */
export function editarRemedio(r: Remedio, c: CamposRemedio, temDoses: boolean, now: number): Remedio {
  const base = { ...r, nome: c.nome, dose: c.dose, comprimidosPorDose: c.comprimidosPorDose, estoque: c.estoque };
  const nova = { intervaloHoras: c.intervaloHoras, horarioMin: c.horarioMin };
  if (!temDoses) {
    return { ...base, agendas: [{ desde: blocoEm(r.criadoEm, c.intervaloHoras).inicio, ...nova }] };
  }
  // Mantém o que já valeu e o que vale agora; uma mudança futura pendente é substituída.
  const agendas = r.agendas.filter((a) => a.desde <= now);
  const vigente = agendas[agendas.length - 1];
  if (vigente.intervaloHoras === nova.intervaloHoras && vigente.horarioMin === nova.horarioMin) return { ...base, agendas };
  return { ...base, agendas: [...agendas, { desde: proximaMeiaNoite(now), ...nova }] };
}

/** A agenda que o formulário deve mostrar: a última (inclusive a que ainda vai valer). */
export function agendaAtualOuFutura(r: Remedio): Agenda {
  return r.agendas[r.agendas.length - 1];
}

export function agendaVigente(r: Remedio, now: number): Agenda {
  return agendaEm(r, now) ?? r.agendas[0];
}

/* ---------- Sequência ---------- */

export type SituacaoDia = 'cumprido' | 'perdido' | 'vazio' | 'andamento';

export interface Fatia {
  s: 'f' | 'a' | 'p';
}

export interface DiaRegua {
  inicio: number;
  situacao: SituacaoDia;
  /** Só para hoje: uma fatia por dose do dia, em ordem de horário. */
  fatias?: Fatia['s'][];
}

function situacaoDia(dados: Dados, idx: IndiceDoses, dia: number, now: number): { situacao: SituacaoDia; blocos: { b: Bloco; s: SituacaoBloco }[] } {
  const fimDia = proximaMeiaNoite(dia);
  const blocos: { b: Bloco; s: SituacaoBloco }[] = [];
  for (const r of dados.remedios) {
    for (const b of blocosDoRemedio(r, dia, fimDia)) {
      const s = situacaoBloco(b, r, idx, now);
      if (s !== 'ignorado') blocos.push({ b, s });
    }
  }
  let situacao: SituacaoDia;
  if (blocos.length === 0) situacao = 'vazio';
  else if (blocos.some((x) => x.s === 'nao')) situacao = 'perdido';
  else if (blocos.every((x) => x.s === 'tomado')) situacao = 'cumprido';
  else situacao = 'andamento';
  return { situacao, blocos };
}

export interface Sequencia {
  dias: number;
  regua: DiaRegua[];
}

export function sequencia(dados: Dados, now: number, tamanhoRegua = 14): Sequencia {
  const idx = new IndiceDoses(dados.doses);
  const hoje = inicioDoDia(now);
  const primeiro = dados.remedios.length ? inicioDoDia(Math.min(...dados.remedios.map((r) => r.criadoEm))) : hoje;

  let dias = 0;
  for (let d = hoje; d >= primeiro; d = somarDias(d, -1)) {
    const { situacao } = situacaoDia(dados, idx, d, now);
    if (situacao === 'perdido') break;
    if (situacao === 'cumprido') dias++;
  }

  const regua: DiaRegua[] = [];
  for (let k = tamanhoRegua - 1; k >= 0; k--) {
    const d = somarDias(hoje, -k);
    if (d < primeiro) {
      regua.push({ inicio: d, situacao: 'vazio' });
      continue;
    }
    const { situacao, blocos } = situacaoDia(dados, idx, d, now);
    const dia: DiaRegua = { inicio: d, situacao };
    if (k === 0) {
      dia.fatias = blocos
        .sort((a, b) => a.b.horario - b.b.horario)
        .map((x) => (x.s === 'tomado' ? 'f' : x.s === 'aberto' ? 'a' : 'p'));
    }
    regua.push(dia);
  }
  return { dias, regua };
}

/* ---------- Histórico ---------- */

export interface ItemHistorico {
  remedio: Remedio;
  bloco: Bloco;
  dose: Dose | undefined;
}

/** Blocos já encerrados ou tomados, do mais novo ao mais antigo, agrupados por dia. */
export function historico(dados: Dados, now: number): { dia: number; itens: ItemHistorico[] }[] {
  const idx = new IndiceDoses(dados.doses);
  const itens: ItemHistorico[] = [];
  for (const r of dados.remedios) {
    for (const b of blocosDoRemedio(r, r.agendas[0].desde, now + 1)) {
      const s = situacaoBloco(b, r, idx, now);
      if (s === 'tomado' || s === 'nao') itens.push({ remedio: r, bloco: b, dose: idx.noBloco(r.id, b.inicio) });
    }
  }
  itens.sort((a, b) => b.bloco.horario - a.bloco.horario || a.remedio.nome.localeCompare(b.remedio.nome, 'pt-BR'));
  const grupos: { dia: number; itens: ItemHistorico[] }[] = [];
  for (const it of itens) {
    const dia = inicioDoDia(it.bloco.inicio);
    const g = grupos[grupos.length - 1];
    if (g && g.dia === dia) g.itens.push(it);
    else grupos.push({ dia, itens: [it] });
  }
  return grupos;
}

/* ---------- Estoque ---------- */

export function diasDeEstoque(r: Remedio, a: Agenda): number | null {
  const consumoDiario = (24 / a.intervaloHoras) * r.comprimidosPorDose;
  if (!(consumoDiario > 0)) return null;
  return r.estoque / consumoDiario;
}

export function seloEstoque(r: Remedio, dias: number | null): 'Esgotado' | 'Insuficiente' | 'Repor' | null {
  if (r.estoque <= 0) return 'Esgotado';
  if (r.estoque < r.comprimidosPorDose) return 'Insuficiente';
  if (dias !== null && dias <= 7) return 'Repor';
  return null;
}

/* ---------- Avisos ---------- */

export interface Aviso {
  chave: string;
  em: number;
  titulo: string;
  corpo: string;
}

function listaNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join('');
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

export function planoDeAvisos(dados: Dados, now: number, limite = 64, horizonteDias = 14): Aviso[] {
  const idx = new IndiceDoses(dados.doses);
  const hora = new Map<number, Remedio[]>();
  const perdida = new Map<number, Remedio[]>();
  const ate = somarDias(now, horizonteDias);
  for (const r of dados.remedios) {
    if (r.excluidoEm !== null) continue;
    for (const b of blocosDoRemedio(r, now, ate)) {
      if (idx.noBloco(r.id, b.inicio)) continue;
      if (b.horario > now) hora.set(b.horario, [...(hora.get(b.horario) ?? []), r]);
      if (b.fim > now) perdida.set(b.fim, [...(perdida.get(b.fim) ?? []), r]);
    }
  }
  const avisos: Aviso[] = [];
  const ordenar = (rs: Remedio[]) => [...rs].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  for (const [em, rs] of hora) {
    avisos.push({
      chave: `hora-${em}`,
      em,
      titulo: 'Hora de tomar',
      corpo: ordenar(rs)
        .map((r) => `${r.nome} ${r.dose}`)
        .join(' · '),
    });
  }
  for (const [em, rs] of perdida) {
    const nomes = ordenar(rs).map((r) => r.nome);
    avisos.push({
      chave: `perdida-${em}`,
      em,
      titulo: 'Dose não tomada',
      corpo: nomes.length === 1 ? `A última dose de ${nomes[0]} não foi tomada.` : `As últimas doses de ${listaNomes(nomes)} não foram tomadas.`,
    });
  }
  avisos.sort((a, b) => a.em - b.em || a.chave.localeCompare(b.chave));
  return avisos.slice(0, limite);
}
