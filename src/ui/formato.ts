export function numero(qtd: number): string {
  const n = Math.round(qtd * 2) / 2;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

export function formatComprimidos(qtd: number): string {
  const n = Math.round(qtd * 2) / 2;
  return `${numero(n)} ${n === 1 ? 'comprimido' : 'comprimidos'}`;
}

export function formatDiasRestantes(dias: number | null): string {
  if (dias === null) return 'duração indefinida';
  if (dias <= 0) return 'estoque esgotado';
  if (dias < 1) return 'dura menos de 1 dia';
  const r = Math.round(dias);
  return `dura ~${r} ${r === 1 ? 'dia' : 'dias'}`;
}

export function lerNumero(texto: string): number {
  return Number(texto.replace(',', '.').trim());
}
