// Versão web: só para pré-visualizar o visual no navegador. Guarda no localStorage.
// `?demo` carrega dados de exemplo (usados nas capturas de comparação com o PWA).
import type { Dados } from '../domain/types';
import type { Persist } from './persistTypes';
import { dadosDeExemplo } from './exemplo';

const KEY = 'medcontrol';

function read(): Dados {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  if (params.has('demo')) return dadosDeExemplo(Date.now());
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw) as Dados;
  } catch {}
  return { remedios: [], doses: [] };
}

let snap: Dados | null = null;
function cur(): Dados {
  if (!snap) snap = read();
  return snap;
}
function write() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(cur()));
  } catch {}
}

export const persist: Persist = {
  load: () => cur(),
  saveRemedio(r) {
    const s = cur();
    s.remedios = [...s.remedios.filter((x) => x.id !== r.id), r];
    write();
  },
  saveDose(d) {
    const s = cur();
    s.doses = [...s.doses.filter((x) => x.id !== d.id), d];
    write();
  },
  deleteDose(id) {
    cur().doses = cur().doses.filter((x) => x.id !== id);
    write();
  },
  replaceAll(d) {
    snap = d;
    write();
  },
};
