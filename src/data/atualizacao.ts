import Constants from 'expo-constants';

const REPO = 'luizfsantos-alt/medControl';

export interface Atualizacao {
  versao: string;
  url: string;
}

function partes(v: string): number[] {
  return v.replace(/^v/, '').split('.').map((x) => Number(x) || 0);
}

function maior(a: string, b: string): boolean {
  const pa = partes(a);
  const pb = partes(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

export function versaoAtual(): string {
  return Constants.expoConfig?.version ?? '0';
}

/** Consulta o último release publicado. Sem internet ou sem release, devolve null. */
export async function buscarAtualizacao(): Promise<Atualizacao | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const j = (await r.json()) as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] };
    const versao = (j.tag_name ?? '').replace(/^v/, '');
    const apk = j.assets?.find((a) => a.name.endsWith('.apk'));
    if (!versao || !apk || !maior(versao, versaoAtual())) return null;
    return { versao, url: apk.browser_download_url };
  } catch {
    return null;
  }
}
