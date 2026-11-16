import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { remediosAtivos, useStore } from '../data/store';
import { agendaVigente, diasDeEstoque, seloEstoque } from '../domain/regras';
import type { Remedio } from '../domain/types';
import { BotaoIcone, Chip } from './Botoes';
import { CabecalhoLista } from './CabecalhoLista';
import { Vazio } from './Vazio';
import { formatDiasRestantes, numero } from './formato';
import { F, ls, useCores } from './tema';

export function TelaEstoque({ now, onEditar, onEstoque, onNovo }: { now: number; onEditar: (r: Remedio) => void; onEstoque: (r: Remedio) => void; onNovo: () => void }) {
  const c = useCores();
  const remedios = useStore((s) => s.remedios);
  const ativos = useMemo(
    () => remediosAtivos({ remedios, doses: [], ready: true }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [remedios],
  );
  if (ativos.length === 0) {
    return <Vazio titulo="Nada em estoque ainda" texto="O estoque de cada remédio aparece aqui depois do cadastro." acao="Adicionar remédio" onAcao={onNovo} />;
  }
  const mono = { fontFamily: F.mono500, fontSize: 11, lineHeight: 14, letterSpacing: ls(0.08, 11), textTransform: 'uppercase' as const, color: c.ink2 };
  return (
    <View>
      <CabecalhoLista esquerda="Estoque" direita="Duração estimada" />
      {ativos.map((r, i) => {
        const dias = diasDeEstoque(r, agendaVigente(r, now));
        const selo = seloEstoque(r, dias);
        return (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: c.rule, borderTopWidth: i === 0 ? 1 : 0, borderTopColor: c.ink }}>
            <Pressable
              style={{ flex: 1, paddingVertical: 14, gap: 8 }}
              onPress={() => onEstoque(r)}
              accessibilityRole="button"
              accessibilityLabel={`Ajustar estoque de ${r.nome}: ${numero(r.estoque)} comprimidos`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.nome, fontSize: 19, lineHeight: 21, color: c.ink }}>{r.nome}</Text>
                  <Text style={mono}>{`${r.dose} · ${numero(r.comprimidosPorDose)} comp por dose`}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: F.relogio, fontSize: 44, lineHeight: 40, color: c.ink, fontVariant: ['tabular-nums'] }}>{numero(r.estoque)}</Text>
                  <Text style={{ fontFamily: F.mono500, fontSize: 10, letterSpacing: ls(0.08, 10), textTransform: 'uppercase', color: c.ink2 }}>comp.</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text style={mono}>{formatDiasRestantes(dias)}</Text>
                {selo && <Chip texto={selo} solido />}
              </View>
            </Pressable>
            <BotaoIcone icone="editar" rotulo={`Editar ${r.nome}`} onPress={() => onEditar(r)} />
          </View>
        );
      })}
    </View>
  );
}
