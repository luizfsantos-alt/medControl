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

export function roundToHalf(value) {
  return Math.round(Number(value) * 2) / 2;
}

export function formatComprimidos(qtd) {
  const n = roundToHalf(qtd);
  const texto = n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${texto} ${n === 1 ? 'comprimido' : 'comprimidos'}`;
}

export function diasRestantesEstoque(med) {
  const comprimidosPorDose = med.comprimidosPorDose ?? 1;
  const estoque = med.estoque ?? 0;
  const dosesPorDia = 24 / med.intervaloHoras;
  const consumoDiario = comprimidosPorDose * dosesPorDia;
  if (!(consumoDiario > 0)) return null;
  return estoque / consumoDiario;
}

export function formatDiasRestantes(dias) {
  if (dias === null) return 'duração indefinida';
  if (dias <= 0) return 'estoque esgotado';
  if (dias < 1) return 'dura menos de 1 dia';
  const arredondado = Math.round(dias);
  return `dura ~${arredondado} ${arredondado === 1 ? 'dia' : 'dias'}`;
}

// PushManager.subscribe espera a chave VAPID como Uint8Array, não como a
// string base64url que o servidor fornece.
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
