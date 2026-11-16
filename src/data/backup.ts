import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Dados } from '../domain/types';
import { exportarBackup, lerBackup } from './store';

export async function exportarArquivo(): Promise<{ erro?: string }> {
  try {
    const { nome, conteudo } = exportarBackup();
    const file = new File(Paths.cache, nome);
    if (file.exists) file.delete();
    file.create();
    file.write(conteudo);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup do MedControl' });
    return {};
  } catch {
    return { erro: 'Não foi possível exportar o backup' };
  }
}

export async function escolherArquivo(): Promise<Dados | { erro: string } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled) return null;
  try {
    return lerBackup(await new File(r.assets[0].uri).text());
  } catch {
    return { erro: 'Não foi possível ler o arquivo' };
  }
}
