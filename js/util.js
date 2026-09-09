export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function formatHora(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDiaHora(date) {
  const hoje = new Date();
  const hora = formatHora(date);
  if (date.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (date.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return `${date.toLocaleDateString('pt-BR')}, ${hora}`;
}

export function formatDuracao(ms) {
  const abs = Math.abs(ms);
  const totalMin = Math.max(0, Math.round(abs / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

export function clampNumber(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
