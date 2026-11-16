import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Hora atual, atualizada a cada 15 s e ao voltar para o app. */
export function useNow(passoMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), passoMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [passoMs]);
  return now;
}
