import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import type { Dados, Dose, Remedio } from '../domain/types';
import type { Persist } from './persistTypes';

let db: SQLiteDatabase | null = null;

function open(): SQLiteDatabase {
  if (db) return db;
  db = openDatabaseSync('medcontrol.db');
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS remedios (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS doses (id TEXT PRIMARY KEY NOT NULL, remedio_id TEXT NOT NULL, em INTEGER NOT NULL, json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS doses_remedio ON doses(remedio_id);
  `);
  return db;
}

export const persist: Persist = {
  load(): Dados {
    const d = open();
    const remedios = d.getAllSync<{ json: string }>('SELECT json FROM remedios').map((r) => JSON.parse(r.json) as Remedio);
    const doses = d.getAllSync<{ json: string }>('SELECT json FROM doses ORDER BY em').map((r) => JSON.parse(r.json) as Dose);
    return { remedios, doses };
  },
  saveRemedio(r) {
    open().runSync('INSERT OR REPLACE INTO remedios (id, json) VALUES (?, ?)', r.id, JSON.stringify(r));
  },
  saveDose(x) {
    open().runSync('INSERT OR REPLACE INTO doses (id, remedio_id, em, json) VALUES (?, ?, ?, ?)', x.id, x.remedioId, x.em, JSON.stringify(x));
  },
  deleteDose(id) {
    open().runSync('DELETE FROM doses WHERE id = ?', id);
  },
  replaceAll(dados) {
    const d = open();
    d.withTransactionSync(() => {
      d.execSync('DELETE FROM remedios; DELETE FROM doses;');
      for (const r of dados.remedios) d.runSync('INSERT INTO remedios (id, json) VALUES (?, ?)', r.id, JSON.stringify(r));
      for (const x of dados.doses) d.runSync('INSERT INTO doses (id, remedio_id, em, json) VALUES (?, ?, ?, ?)', x.id, x.remedioId, x.em, JSON.stringify(x));
    });
  },
};
