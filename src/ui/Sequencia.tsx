// Sequência (docs/spec.md §6): só o rótulo, o número e a régua de 14 dias.
import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import type { DiaRegua, Sequencia as Seq } from '../domain/regras';
import { INICIAIS_SEMANA } from '../domain/tempo';
import { Hachura } from './Hachura';
import { Rolete } from './Rolete';
import { DUR, EASE, F, RAIO, ls, useCores } from './tema';

const ALinha = Animated.createAnimatedComponent(Line);

export function BlocoSequencia({ seq, animar }: { seq: Seq; animar: boolean }) {
  const c = useCores();
  return (
    <View style={{ marginBottom: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.rule, borderRadius: RAIO }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 8, paddingHorizontal: 16 }}>
        <Text style={{ fontFamily: F.mono600, fontSize: 10, lineHeight: 12, letterSpacing: ls(0.1, 10), textTransform: 'uppercase', color: c.ink2, marginBottom: 6 }}>Sequência</Text>
        <Rolete texto={String(seq.dias)} tam={56} animar={animar} estilo={{ fontFamily: F.relogio, fontSize: 56, color: c.ink, fontVariant: ['tabular-nums'] }} />
      </View>
      <View
        style={{ flexDirection: 'row', gap: 3, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.rule }}
        accessibilityLabel={`Sequência de ${seq.dias} ${seq.dias === 1 ? 'dia' : 'dias'}`}
      >
        {seq.regua.map((d, i) => (
          <Dia key={d.inicio} dia={d} hoje={i === seq.regua.length - 1} animar={animar} />
        ))}
      </View>
    </View>
  );
}

function Dia({ dia, hoje, animar }: { dia: DiaRegua; hoje: boolean; animar: boolean }) {
  const c = useCores();
  const reduzido = useReducedMotion();
  const anterior = useRef(dia.situacao);
  const corte = useSharedValue(dia.situacao === 'perdido' ? 1 : 0);
  const escala = useSharedValue(1);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = dia.situacao;
    if (antes === dia.situacao) return;
    const mexe = animar && !reduzido;
    if (dia.situacao === 'perdido') corte.value = mexe ? withTiming(1, { duration: DUR.release, easing: EASE.heavy }) : 1;
    if (dia.situacao === 'cumprido' && mexe) escala.value = withSequence(withTiming(1.15, { duration: 1 }), withTiming(1, { duration: 260, easing: EASE.stamp }));
  }, [dia.situacao, animar, reduzido, corte, escala]);

  const pCorte = useAnimatedProps(() => ({ strokeDashoffset: 40 * (1 - corte.value) }));
  const sCel = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const vazio = dia.situacao === 'vazio';
  const dow = new Date(dia.inicio).getDay();

  return (
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
      <Animated.View
        style={[
          { height: 18, borderWidth: 1, borderColor: vazio ? c.rule : c.ink, borderRadius: RAIO, padding: 1, flexDirection: 'row', gap: 1, backgroundColor: vazio ? 'transparent' : c.surface, overflow: 'hidden' },
          sCel,
        ]}
      >
        {dia.situacao === 'cumprido' && <View style={{ flex: 1, backgroundColor: c.ink }} />}
        {dia.situacao === 'andamento' &&
          (dia.fatias ?? []).map((f, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: f === 'f' ? c.ink : f === 'a' ? c.lime : c.paper2, overflow: 'hidden' }}>
              {f === 'p' && <Hachura linha={c.hatch} periodo={5} />}
            </View>
          ))}
        {dia.situacao === 'perdido' && (
          <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" viewBox="0 0 20 18" preserveAspectRatio="none">
            <ALinha x1={0} y1={18} x2={20} y2={0} stroke={c.ink} strokeWidth={2} strokeDasharray={[40, 40]} animatedProps={pCorte} />
          </Svg>
        )}
      </Animated.View>
      <Text numberOfLines={1} style={{ fontFamily: hoje ? F.mono700 : F.mono600, fontSize: 9, lineHeight: 10, letterSpacing: ls(0.04, 9), textAlign: 'center', color: hoje ? c.ink : c.ink2, textDecorationLine: hoje ? 'underline' : 'none' }}>
        {INICIAIS_SEMANA[dow]}
      </Text>
    </View>
  );
}
