import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { buscarAtualizacao, versaoAtual, type Atualizacao } from '../data/atualizacao';
import { escolherArquivo, exportarArquivo } from '../data/backup';
import type { Dados } from '../domain/types';
import { estadoAvisos, pedirAvisos, type EstadoPermissao } from '../notifications/effects';
import { Botao, LinhaBotoes } from './Botoes';
import { Paragrafo } from './Campo';
import { Sheet } from './Sheet';
import { F, ls, useCores } from './tema';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const c = useCores();
  return (
    <View style={{ marginBottom: 22, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.rule }}>
      <Text style={{ marginBottom: 12, fontFamily: F.mono600, fontSize: 11, lineHeight: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: c.ink2 }}>{titulo}</Text>
      {children}
    </View>
  );
}

const TEXTO_AVISOS: Record<EstadoPermissao, string> = {
  ativo: 'Ativos. O app avisa no horário de cada dose e quando uma dose não for tomada.',
  pendente: 'Desativados. Sem eles, o app não avisa no horário das doses.',
  negado: 'Bloqueados nas configurações do Android. Libere as notificações do MedControl por lá.',
};

export function SheetAjustes({
  aberto,
  onFechar,
  onImportar,
  onApagarTudo,
  onErro,
}: {
  aberto: boolean;
  onFechar: () => void;
  onImportar: (d: Dados) => void;
  onApagarTudo: () => void;
  onErro: (m: string) => void;
}) {
  const [avisos, setAvisos] = useState<EstadoPermissao>('pendente');
  const [atualizacao, setAtualizacao] = useState<Atualizacao | null>(null);

  useEffect(() => {
    if (!aberto) return;
    estadoAvisos().then(setAvisos).catch(() => {});
    buscarAtualizacao().then(setAtualizacao).catch(() => {});
  }, [aberto]);

  const importar = async () => {
    const r = await escolherArquivo();
    if (!r) return;
    if ('erro' in r) return onErro(r.erro);
    onImportar(r);
  };

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Ajustes">
      <Secao titulo="Avisos">
        <Paragrafo texto={TEXTO_AVISOS[avisos]} />
        {avisos !== 'ativo' && (
          <LinhaBotoes>
            <Botao
              rotulo={avisos === 'negado' ? 'Abrir configurações' : 'Ativar avisos'}
              onPress={() => (avisos === 'negado' ? Linking.openSettings() : pedirAvisos().then(setAvisos))}
            />
          </LinhaBotoes>
        )}
      </Secao>
      <Secao titulo="Backup">
        <LinhaBotoes>
          <Botao rotulo="Exportar backup" onPress={() => exportarArquivo().then((r) => r.erro && onErro(r.erro))} />
          <Botao rotulo="Importar backup" onPress={importar} />
        </LinhaBotoes>
      </Secao>
      <Secao titulo="Zona de risco">
        <LinhaBotoes>
          <Botao rotulo="Apagar todos os dados" onPress={onApagarTudo} />
        </LinhaBotoes>
      </Secao>
      <Secao titulo={`Versão ${versaoAtual()}`}>
        {atualizacao ? (
          <LinhaBotoes>
            <Botao rotulo={`Baixar versão ${atualizacao.versao}`} onPress={() => Linking.openURL(atualizacao.url)} />
          </LinhaBotoes>
        ) : (
          <Paragrafo texto="Você está na versão mais recente." />
        )}
      </Secao>
      <LinhaBotoes>
        <Botao rotulo="Fechar" onPress={onFechar} primario />
      </LinhaBotoes>
    </Sheet>
  );
}

export function SheetImportar({ dados, onFechar, onAplicar }: { dados: Dados | null; onFechar: () => void; onAplicar: (modo: 'juntar' | 'substituir') => void }) {
  return (
    <Sheet aberto={!!dados} onFechar={onFechar} titulo="Importar backup">
      <Paragrafo texto="Como você quer aplicar este backup?" />
      <LinhaBotoes>
        <Botao rotulo="Juntar" onPress={() => onAplicar('juntar')} />
        <Botao rotulo="Substituir tudo" onPress={() => onAplicar('substituir')} />
      </LinhaBotoes>
      <LinhaBotoes topo={10}>
        <Botao rotulo="Cancelar" onPress={onFechar} />
      </LinhaBotoes>
    </Sheet>
  );
}
