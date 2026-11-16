// Dados de exemplo para a pré-visualização web (?demo). Nunca usados no app.
import { blocosDoRemedio, novoRemedio } from '../domain/regras';
import { HORA, inicioDoDia, somarDias } from '../domain/tempo';
import type { Dados, Dose } from '../domain/types';

export function dadosDeExemplo(now: number): Dados {
  const criado = somarDias(inicioDoDia(now), -12);
  const ritalina = novoRemedio({ nome: 'Ritalina', dose: '10mg', comprimidosPorDose: 1, estoque: 40, intervaloHoras: 12, horarioMin: 8 * 60 }, criado, 'ex1');
  const venla = novoRemedio({ nome: 'Venlafaxina', dose: '75mg', comprimidosPorDose: 1, estoque: 6, intervaloHoras: 24, horarioMin: 9 * 60 }, criado, 'ex2');
  const clona = novoRemedio({ nome: 'Clonazepam', dose: '0,5mg', comprimidosPorDose: 0.5, estoque: 22, intervaloHoras: 8, horarioMin: 7 * 60 }, criado, 'ex3');
  const doses: Dose[] = [];
  let n = 0;
  const pular = new Set<string>([`ex3|${somarDias(inicioDoDia(now), -5) + 16 * HORA}`]);
  for (const r of [ritalina, venla, clona]) {
    for (const b of blocosDoRemedio(r, criado, now)) {
      if (pular.has(`${r.id}|${b.inicio}`)) continue;
      // Ritalina: a dose anterior fica sem registro (card vermelho).
      if (r.id === 'ex1' && b.fim <= now && b.fim > now - 12 * HORA) continue;
      // Bloco em andamento: só a Venlafaxina já foi tomada.
      if (b.fim > now && (r.id !== 'ex2' || b.inicio > now)) continue;
      const em = b.fim > now ? Math.min(now - 40 * 60_000, b.horario) : b.horario + ((n * 7) % 40) * 60_000;
      doses.push({ id: `exd${n++}`, remedioId: r.id, em, blocoInicio: b.inicio, descontado: r.comprimidosPorDose });
    }
  }
  return { remedios: [ritalina, venla, clona], doses };
}
