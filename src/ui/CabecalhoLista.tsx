import React from 'react';
import { Text, View } from 'react-native';
import { F, ls, useCores } from './tema';

/** .list-head */
export function CabecalhoLista({ esquerda, direita, children }: { esquerda: string; direita?: string; children?: React.ReactNode }) {
  const c = useCores();
  const estilo = { fontFamily: F.mono600, fontSize: 11, lineHeight: 13, letterSpacing: ls(0.1, 11), textTransform: 'uppercase' as const, color: c.ink2 };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 2, paddingBottom: 12 }}>
      <Text style={estilo}>{esquerda}</Text>
      {direita ? <Text style={estilo}>{direita}</Text> : children}
    </View>
  );
}
