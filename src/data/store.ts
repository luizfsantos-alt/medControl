import { useSyncExternalStore } from 'react';
import { desfazerDose, editarRemedio, novoRemedio, registrarDose, type CamposRemedio } from '../domain/regras';
import { chaveDia } from '../domain/tempo';
import type { Dados, Dose, Remedio } from '../domain/types';
import { persist } from './persist';

export interface State extends Dados {
  ready: boolean;
}

let state: State = { remedios: [], doses: [], ready: false };
const listeners = new Set<() => void>();
const effects: ((s: State) => void)[] = [];

function emit(next: Partial<State>, changed = true) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  if (changed) effects.forEach((f) => f(state));
}

export function onChange(f: (s: State) => void) {
  effects.push(f);
}

export function getState() {
  return state;
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(state),
  );
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function init() {
  if (state.ready) return;
  const d = persist.load();
  emit({ remedios: d.remedios, doses: d.doses, ready: true });
}

export function remediosAtivos(s: State): Remedio[] {
  return s.remedios.filter((r) => r.excluidoEm === null);
}

/* ---------- ações ---------- */

export function tomar(remedioId: string, now = Date.now()): Dose | null {
  const r = registrarDose(state, remedioId, now, uid());
  if (!r) return null;
  const rem = r.dados.remedios.find((x) => x.id === remedioId)!;
  persist.saveDose(r.dose);
  persist.saveRemedio(rem);
  emit({ remedios: r.dados.remedios, doses: r.dados.doses });
  return r.dose;
}

export function desfazer(doseId: string) {
  const dose = state.doses.find((d) => d.id === doseId);
  if (!dose) return;
  const d = desfazerDose(state, doseId);
  persist.deleteDose(doseId);
  const rem = d.remedios.find((x) => x.id === dose.remedioId);
  if (rem) persist.saveRemedio(rem);
  emit({ remedios: d.remedios, doses: d.doses });
}

export function salvarRemedio(id: string | null, c: CamposRemedio, now = Date.now()): Remedio {
  let r: Remedio;
  if (id) {
    const atual = state.remedios.find((x) => x.id === id)!;
    r = editarRemedio(atual, c, state.doses.some((d) => d.remedioId === id), now);
  } else {
    r = novoRemedio(c, now, uid());
  }
  persist.saveRemedio(r);
  emit({ remedios: [...state.remedios.filter((x) => x.id !== r.id), r] });
  return r;
}

export function excluirRemedio(id: string, now = Date.now()) {
  const r = state.remedios.find((x) => x.id === id);
  if (!r) return;
  const novo = { ...r, excluidoEm: now };
  persist.saveRemedio(novo);
  emit({ remedios: state.remedios.map((x) => (x.id === id ? novo : x)) });
}

export function ajustarEstoque(id: string, estoque: number) {
  const r = state.remedios.find((x) => x.id === id);
  if (!r) return;
  const novo = { ...r, estoque };
  persist.saveRemedio(novo);
  emit({ remedios: state.remedios.map((x) => (x.id === id ? novo : x)) });
}

export function apagarTudo() {
  persist.replaceAll({ remedios: [], doses: [] });
  emit({ remedios: [], doses: [] });
}

/* ---------- backup ---------- */

const APP = 'medcontrol';
const SCHEMA = 2;

export interface ArquivoBackup {
  app: typeof APP;
  schema: number;
  exportadoEm: string;
  dados: Dados;
}

export function exportarBackup(now = Date.now()): { nome: string; conteudo: string } {
  const arq: ArquivoBackup = { app: APP, schema: SCHEMA, exportadoEm: new Date(now).toISOString(), dados: { remedios: state.remedios, doses: state.doses } };
  return { nome: `medcontrol-backup-${chaveDia(now)}.json`, conteudo: JSON.stringify(arq, null, 2) };
}

export function lerBackup(texto: string): Dados | { erro: string } {
  try {
    const arq = JSON.parse(texto) as Partial<ArquivoBackup>;
    if (arq?.app !== APP || arq.schema !== SCHEMA || !Array.isArray(arq.dados?.remedios) || !Array.isArray(arq.dados?.doses)) {
      return { erro: 'Arquivo não é um backup deste app' };
    }
    return arq.dados;
  } catch {
    return { erro: 'Não foi possível ler o arquivo' };
  }
}

export function aplicarBackup(d: Dados, modo: 'juntar' | 'substituir') {
  let dados: Dados = d;
  if (modo === 'juntar') {
    const rIds = new Set(state.remedios.map((r) => r.id));
    const dIds = new Set(state.doses.map((x) => x.id));
    const blocos = new Set(state.doses.map((x) => `${x.remedioId}|${x.blocoInicio}`));
    dados = {
      remedios: [...state.remedios, ...d.remedios.filter((r) => !rIds.has(r.id))],
      doses: [...state.doses, ...d.doses.filter((x) => !dIds.has(x.id) && !blocos.has(`${x.remedioId}|${x.blocoInicio}`))],
    };
  }
  persist.replaceAll(dados);
  emit({ remedios: dados.remedios, doses: dados.doses });
}
