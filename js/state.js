const KEY = 'medcontrol_data_v1';
const BACKUP_KEY = 'medcontrol_data_backup';
const SCHEMA = 1;

function defaultState() {
  return { schema: SCHEMA, medications: [], history: [] };
}

function isValid(state) {
  return (
    state &&
    typeof state === 'object' &&
    Array.isArray(state.medications) &&
    Array.isArray(state.history)
  );
}

function parse(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadState() {
  const primary = parse(localStorage.getItem(KEY));
  if (primary) return primary;
  const backup = parse(localStorage.getItem(BACKUP_KEY));
  if (backup) return backup;
  return defaultState();
}

export function saveState(state) {
  const serialized = JSON.stringify(state);
  try {
    const current = localStorage.getItem(KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
  } catch {
    /* backup promotion is best-effort */
  }
  localStorage.setItem(KEY, serialized);
}

export function exportBackup(state) {
  return {
    app: 'MedControl',
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    data: {
      medications: state.medications,
      history: state.history,
    },
  };
}

export function mergeImport(state, imported, mode) {
  const incomingMeds = Array.isArray(imported?.data?.medications) ? imported.data.medications : [];
  const incomingHist = Array.isArray(imported?.data?.history) ? imported.data.history : [];

  if (mode === 'replace') {
    return { schema: SCHEMA, medications: incomingMeds, history: incomingHist };
  }

  const medIds = new Set(state.medications.map((m) => m.id));
  const histIds = new Set(state.history.map((h) => h.id));
  const medications = [...state.medications, ...incomingMeds.filter((m) => !medIds.has(m.id))];
  const history = [...state.history, ...incomingHist.filter((h) => !histIds.has(h.id))];
  return { schema: SCHEMA, medications, history };
}

export function wipeAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(BACKUP_KEY);
}
