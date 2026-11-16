import { describe, expect, it } from 'vitest';
import {
  IndiceDoses,
  blocoEm,
  blocosDoRemedio,
  desfazerDose,
  editarRemedio,
  historico,
  horariosDoDia,
  novoRemedio,
  planoDeAvisos,
  registrarDose,
  sequencia,
  statusRemedio,
  diasDeEstoque,
} from './regras';
import type { CamposRemedio } from './regras';
import type { Dados } from './types';

const t = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
let n = 0;
const id = () => `id${n++}`;

const campos = (o: Partial<CamposRemedio> = {}): CamposRemedio => ({
  nome: 'Ritalina',
  dose: '10mg',
  comprimidosPorDose: 1,
  estoque: 30,
  intervaloHoras: 12,
  horarioMin: 8 * 60,
  ...o,
});

function base(c = campos(), criado = t(10, 7)): Dados {
  return { remedios: [novoRemedio(c, criado, 'r1')], doses: [] };
}

function tomar(d: Dados, at: number, rid = 'r1'): Dados {
  const r = registrarDose(d, rid, at, id());
  if (!r) throw new Error('não registrou');
  return r.dados;
}

describe('blocos', () => {
  it('dividem o dia a partir da meia-noite', () => {
    expect(blocoEm(t(10, 13), 12)).toEqual({ inicio: t(10, 12), fim: t(11, 0) });
    expect(blocoEm(t(10, 5), 8)).toEqual({ inicio: t(10, 0), fim: t(10, 8) });
    expect(blocoEm(t(10, 23, 59), 24)).toEqual({ inicio: t(10, 0), fim: t(11, 0) });
  });

  it('horários saem do horário escolhido somando o intervalo', () => {
    expect(horariosDoDia(12, 8 * 60)).toEqual([480, 1200]);
    expect(horariosDoDia(8, 22 * 60)).toEqual([360, 840, 1320]);
  });

  it('cada bloco tem o horário no lugar certo', () => {
    const r = base().remedios[0];
    const bs = blocosDoRemedio(r, t(10, 0), t(11, 0));
    expect(bs.map((b) => b.horario)).toEqual([t(10, 8), t(10, 20)]);
  });

  it('o bloco do cadastro já conta', () => {
    const r = base(campos(), t(10, 15)).remedios[0];
    expect(blocosDoRemedio(r, t(10, 0), t(11, 0)).map((b) => b.inicio)).toEqual([t(10, 12)]);
  });
});

describe('estado do card', () => {
  it('espera antes do horário, agora depois, tomado ao registrar', () => {
    let d = base();
    const s1 = statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 7));
    expect(s1.estado.k).toBe('espera');
    const s2 = statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 9));
    expect(s2.estado.k).toBe('agora');
    d = tomar(d, t(10, 9));
    const s3 = statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 10));
    expect(s3.estado.k).toBe('tomado');
    expect(s3.podeRegistrar).toBe(false);
    if (s3.estado.k === 'tomado') expect(s3.estado.proximo?.horario).toBe(t(10, 20));
  });

  it('vermelho quando a dose anterior não foi tomada, até tomar a atual', () => {
    let d = base();
    const s = statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 13));
    expect(s.estado.k).toBe('perdido');
    if (s.estado.k === 'perdido') expect(s.estado.horarioPerdido).toBe(t(10, 8));
    d = tomar(d, t(10, 13));
    expect(statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 14)).estado.k).toBe('tomado');
  });

  it('não registra duas vezes no mesmo bloco', () => {
    const d = tomar(base(), t(10, 8));
    expect(registrarDose(d, 'r1', t(10, 11), 'x')).toBeNull();
  });

  it('barreira quando a última dose foi há menos da metade do intervalo', () => {
    const d = tomar(base(), t(10, 11, 50));
    const s = statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 12, 10));
    expect(s.estado.k).toBe('espera');
    expect(s.barreira).toBe(true);
    const s2 = statusRemedio(d.remedios[0], new IndiceDoses(d.doses), t(10, 18));
    expect(s2.barreira).toBe(false);
  });
});

describe('estoque', () => {
  it('desconta, não fica negativo e desfazer devolve o que foi descontado', () => {
    let d = base(campos({ estoque: 0.5 }));
    const r = registrarDose(d, 'r1', t(10, 8), 'd1')!;
    expect(r.dados.remedios[0].estoque).toBe(0);
    d = desfazerDose(r.dados, 'd1');
    expect(d.remedios[0].estoque).toBe(0.5);
    expect(d.doses).toHaveLength(0);
  });

  it('duração em dias', () => {
    const d = base(campos({ estoque: 30, intervaloHoras: 12 }));
    expect(diasDeEstoque(d.remedios[0], d.remedios[0].agendas[0])).toBe(15);
  });
});

describe('edição de horário', () => {
  it('sem doses, vale na hora', () => {
    const d = base();
    const r = editarRemedio(d.remedios[0], campos({ intervaloHoras: 24, horarioMin: 9 * 60 }), false, t(10, 8));
    expect(r.agendas).toHaveLength(1);
    expect(r.agendas[0].desde).toBe(t(10, 0));
  });

  it('com doses, vale a partir da próxima meia-noite', () => {
    const d = tomar(base(), t(10, 8));
    const r = editarRemedio(d.remedios[0], campos({ intervaloHoras: 24, horarioMin: 9 * 60 }), true, t(10, 10));
    expect(r.agendas.map((a) => a.desde)).toEqual([t(10, 0), t(11, 0)]);
    const bs = blocosDoRemedio(r, t(10, 0), t(12, 0));
    expect(bs.map((b) => b.horario)).toEqual([t(10, 8), t(10, 20), t(11, 9)]);
  });
});

describe('sequência', () => {
  it('conta dias cumpridos e hoje só quando completo', () => {
    let d = base(campos(), t(10, 7));
    for (const dia of [10, 11, 12]) {
      d = tomar(d, t(dia, 8));
      d = tomar(d, t(dia, 20));
    }
    d = tomar(d, t(13, 8));
    expect(sequencia(d, t(13, 10)).dias).toBe(3);
    d = tomar(d, t(13, 20));
    expect(sequencia(d, t(13, 21)).dias).toBe(4);
  });

  it('zera quando um horário termina sem dose', () => {
    let d = base(campos(), t(10, 7));
    d = tomar(d, t(10, 8));
    d = tomar(d, t(10, 20));
    d = tomar(d, t(11, 8));
    // bloco 12–24 do dia 11 passou em branco
    const s = sequencia(d, t(12, 1));
    expect(s.dias).toBe(0);
    expect(s.regua[12].situacao).toBe('perdido');
    expect(s.regua[11].situacao).toBe('cumprido');
    expect(s.regua[0].situacao).toBe('vazio');
  });

  it('fatias de hoje', () => {
    let d = base(campos({ intervaloHoras: 8, horarioMin: 6 * 60 }), t(10, 0));
    d = tomar(d, t(10, 6));
    const hoje = sequencia(d, t(10, 9)).regua[13];
    expect(hoje.fatias).toEqual(['f', 'a', 'p']);
  });

  it('excluir com dose em aberto não quebra', () => {
    let d = base(campos({ intervaloHoras: 24 }), t(10, 7));
    d = { ...d, remedios: [{ ...d.remedios[0], excluidoEm: t(10, 9) }] };
    expect(sequencia(d, t(11, 10)).regua[13].situacao).toBe('vazio');
    expect(sequencia(d, t(11, 10)).regua[12].situacao).toBe('vazio');
  });
});

describe('histórico', () => {
  it('lista tomados e não tomados, do mais novo ao mais antigo', () => {
    let d = base(campos(), t(10, 7));
    d = tomar(d, t(10, 8, 12));
    const h = historico(d, t(11, 1));
    expect(h).toHaveLength(1);
    expect(h[0].itens.map((i) => !!i.dose)).toEqual([false, true]);
  });
});

describe('avisos', () => {
  it('agrupa remédios do mesmo horário e avisa dose não tomada', () => {
    const d: Dados = {
      remedios: [
        novoRemedio(campos(), t(10, 7), 'r1'),
        novoRemedio(campos({ nome: 'Venlafaxina', dose: '75mg', intervaloHoras: 24 }), t(10, 7), 'r2'),
      ],
      doses: [],
    };
    const p = planoDeAvisos(d, t(10, 7));
    expect(p[0]).toMatchObject({ em: t(10, 8), titulo: 'Hora de tomar', corpo: 'Ritalina 10mg · Venlafaxina 75mg' });
    const perdida = p.find((a) => a.chave === `perdida-${t(10, 12)}`);
    expect(perdida?.corpo).toBe('A última dose de Ritalina não foi tomada.');
    const meiaNoite = p.find((a) => a.chave === `perdida-${t(11, 0)}`);
    expect(meiaNoite?.corpo).toBe('As últimas doses de Ritalina e Venlafaxina não foram tomadas.');
  });

  it('dose registrada cancela os avisos do bloco', () => {
    const d = tomar(base(), t(10, 7, 30));
    const p = planoDeAvisos(d, t(10, 7, 31));
    expect(p.some((a) => a.em === t(10, 8))).toBe(false);
    expect(p.some((a) => a.em === t(10, 12))).toBe(false);
  });
});
