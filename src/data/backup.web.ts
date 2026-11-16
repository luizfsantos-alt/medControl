import type { Dados } from '../domain/types';
import { exportarBackup, lerBackup } from './store';

export async function exportarArquivo(): Promise<{ erro?: string }> {
  const { nome, conteudo } = exportarBackup();
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return {};
}

export function escolherArquivo(): Promise<Dados | { erro: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve(lerBackup(await f.text()));
    };
    input.click();
  });
}
