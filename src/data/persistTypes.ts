import type { Dados, Dose, Remedio } from '../domain/types';

export interface Persist {
  load(): Dados;
  saveRemedio(r: Remedio): void;
  saveDose(d: Dose): void;
  deleteDose(id: string): void;
  replaceAll(d: Dados): void;
}
