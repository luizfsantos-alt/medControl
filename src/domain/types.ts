export const INTERVALOS = [24, 12, 8, 6, 4, 3, 2, 1] as const;
export type Intervalo = (typeof INTERVALOS)[number];

/** Regra de horários em vigor a partir de `desde` (sempre o início de um bloco). */
export interface Agenda {
  desde: number;
  intervaloHoras: Intervalo;
  /** Horário escolhido, em minutos desde 00:00. */
  horarioMin: number;
}

export interface Remedio {
  id: string;
  nome: string;
  dose: string;
  comprimidosPorDose: number;
  estoque: number;
  agendas: Agenda[];
  criadoEm: number;
  excluidoEm: number | null;
}

export interface Dose {
  id: string;
  remedioId: string;
  em: number;
  /** Início do bloco que esta dose marcou como Tomado. */
  blocoInicio: number;
  /** Comprimidos descontados de fato do estoque (devolvidos ao desfazer). */
  descontado: number;
}

export interface Dados {
  remedios: Remedio[];
  doses: Dose[];
}
