import React from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { Icone, type NomeIcone } from './Icone';
import { F, RAIO, ls, useCores } from './tema';

/** .btn e .btn.primary do PWA. */
export function Botao({ rotulo, onPress, primario = false, estilo }: { rotulo: string; onPress: () => void; primario?: boolean; estilo?: ViewStyle }) {
  const c = useCores();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 50,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: c.ink,
          borderRadius: RAIO,
          backgroundColor: primario ? c.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: pressed ? 1 : 0 }],
        },
        estilo,
      ]}
    >
      <Text style={{ fontFamily: F.botao, fontSize: 15, letterSpacing: ls(0.08, 15), textTransform: 'uppercase', color: primario ? c.paper : c.ink, textAlign: 'center' }}>{rotulo}</Text>
    </Pressable>
  );
}

export function LinhaBotoes({ children, topo = 0 }: { children: React.ReactNode; topo?: number }) {
  return <View style={{ flexDirection: 'row', gap: 10, marginTop: topo }}>{children}</View>;
}

/** .icon-btn: 44×44, contorno de tinta, inverte ao tocar. */
export function BotaoIcone({ icone, onPress, rotulo, tam = 44, corBorda, grosso }: { icone: NomeIcone; onPress: () => void; rotulo: string; tam?: number; corBorda?: string; grosso?: boolean }) {
  const c = useCores();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => ({
        width: tam,
        height: tam,
        borderWidth: 1,
        borderColor: corBorda ?? c.ink,
        borderRadius: RAIO,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.ink : 'transparent',
      })}
    >
      {({ pressed }) => <Icone nome={icone} cor={pressed ? c.paper : c.ink} grosso={grosso} />}
    </Pressable>
  );
}

/** .link-btn */
export function BotaoLink({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  const c = useCores();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 4 }}>
      <Text style={{ fontFamily: F.mono600, fontSize: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', textDecorationLine: 'underline', color: c.ink2 }}>{rotulo}</Text>
    </Pressable>
  );
}

/** .chip e .chip.solid */
export function Chip({ texto, solido = false, cor }: { texto: string; solido?: boolean; cor?: string }) {
  const c = useCores();
  const tinta = cor ?? c.ink;
  return (
    <View style={{ paddingVertical: 3, paddingHorizontal: 6, borderWidth: 1, borderColor: tinta, borderRadius: RAIO, backgroundColor: solido ? tinta : 'transparent', alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: F.mono600, fontSize: 10, lineHeight: 11, letterSpacing: ls(0.08, 10), textTransform: 'uppercase', color: solido ? c.paper : tinta }}>{texto}</Text>
    </View>
  );
}
