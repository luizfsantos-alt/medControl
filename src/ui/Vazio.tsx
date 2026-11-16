import React from 'react';
import { Text, View } from 'react-native';
import { Botao } from './Botoes';
import { Hachura } from './Hachura';
import { F, RAIO, ls, useCores } from './tema';

/** .empty-state */
export function Vazio({ titulo, texto, acao, onAcao, fantasma = true }: { titulo: string; texto: string; acao?: string; onAcao?: () => void; fantasma?: boolean }) {
  const c = useCores();
  return (
    <View style={{ alignItems: 'flex-start', gap: 12, paddingTop: 8, paddingBottom: 24 }}>
      {fantasma && (
        <View style={{ width: '100%', height: 132, marginBottom: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.rule, borderRadius: RAIO, opacity: 0.6, overflow: 'hidden' }}>
          <Hachura linha={c.rule} periodo={10} espessura={1} />
        </View>
      )}
      <Text style={{ fontFamily: F.titulo, fontSize: 34, lineHeight: 34, textTransform: 'uppercase', color: c.ink }}>{titulo}</Text>
      <Text style={{ maxWidth: 360, marginBottom: 4, fontFamily: F.mono500, fontSize: 12, lineHeight: 18, letterSpacing: ls(0.04, 12), textTransform: 'uppercase', color: c.ink2 }}>{texto}</Text>
      {acao && onAcao && (
        <View style={{ flexDirection: 'row' }}>
          <Botao rotulo={acao} onPress={onAcao} primario estilo={{ flex: 0, paddingHorizontal: 20 }} />
        </View>
      )}
    </View>
  );
}
