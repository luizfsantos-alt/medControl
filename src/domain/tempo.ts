export const MIN = 60_000;
export const HORA = 3_600_000;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function inicioDoDia(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function somarDias(t: number, dias: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
}

export function proximaMeiaNoite(t: number): number {
  return somarDias(inicioDoDia(t), 1);
}

export function mesmoDia(a: number, b: number): boolean {
  return inicioDoDia(a) === inicioDoDia(b);
}

export function chaveDia(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatHora(t: number): string {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatHorarioMin(min: number): string {
  return `${pad2(Math.floor(min / 60) % 24)}:${pad2(min % 60)}`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const INICIAIS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** "Hoje 09:13", "Ontem 23:40", "Amanhã 08:00", "12/10 08:00". */
export function diaHoraCurto(t: number, now: number): string {
  const hora = formatHora(t);
  if (mesmoDia(t, now)) return `Hoje ${hora}`;
  if (mesmoDia(t, somarDias(now, -1))) return `Ontem ${hora}`;
  if (mesmoDia(t, somarDias(now, 1))) return `Amanhã ${hora}`;
  const d = new Date(t);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hora}`;
}

/** "Hoje · Seg 16 Nov", "Ontem · Dom 15 Nov", "Sáb 14 Nov". */
export function rotuloDia(t: number, now: number): string {
  let prefixo = '';
  if (mesmoDia(t, now)) prefixo = 'Hoje · ';
  else if (mesmoDia(t, somarDias(now, -1))) prefixo = 'Ontem · ';
  const d = new Date(t);
  const ano = d.getFullYear() !== new Date(now).getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${prefixo}${DIAS_SEMANA[d.getDay()]} ${pad2(d.getDate())} ${MESES[d.getMonth()]}${ano}`;
}

export function rotuloRelogio(t: number): string {
  const d = new Date(t);
  return `${DIAS_SEMANA[d.getDay()]} ${pad2(d.getDate())} ${MESES[d.getMonth()]} ·`;
}

/** "3h20", "45min", "2h". Referência de tempo desde a última dose. */
export function formatDuracao(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / MIN));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${pad2(m)}`;
}

/** "H:MM" do relógio grande. */
export function formatRelogio(ms: number): string {
  const minutos = Math.max(1, Math.ceil(ms / MIN));
  return `${Math.floor(minutos / 60)}:${pad2(minutos % 60)}`;
}
