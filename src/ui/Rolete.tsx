// Rolete de caracteres (movimento 02): só os caracteres que mudaram giram,
// o antigo sobe e sai, o novo entra por baixo, 30 ms de defasagem entre eles.
import React, { useEffect, useRef, useState } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DUR, EASE } from './tema';

interface Props {
  texto: string;
  estilo: TextStyle;
  /** Tamanho da fonte (altura do slot = 1,04 em). */
  tam: number;
  animar?: boolean;
}

export function Rolete({ texto, estilo, tam, animar = true }: Props) {
  const anterior = useRef<string | null>(null);
  const chars = [...texto];
  const prev = anterior.current;
  // Defasagem: só conta caracteres que mudaram.
  let n = 0;
  const delays = chars.map((ch, i) => {
    if (prev === null || [...prev][i] === ch) return 0;
    return n++ * 30;
  });
  useEffect(() => {
    anterior.current = texto;
  });
  const h = Math.round(tam * 1.04);
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel={texto}>
      {chars.map((ch, i) => (
        <Slot key={i} ch={ch} h={h} estilo={estilo} delay={delays[i]} animar={animar && prev !== null} />
      ))}
    </View>
  );
}

function Slot({ ch, h, estilo, delay, animar }: { ch: string; h: number; estilo: TextStyle; delay: number; animar: boolean }) {
  const reduzido = useReducedMotion();
  const [velho, setVelho] = useState<string | null>(null);
  const atual = useRef(ch);
  const p = useSharedValue(1);
  const o = useSharedValue(1);

  useEffect(() => {
    if (atual.current === ch) return;
    const antigo = atual.current;
    atual.current = ch;
    if (!animar) return;
    if (reduzido) {
      o.value = 0.25;
      o.value = withTiming(1, { duration: 160 });
      return;
    }
    setVelho(antigo);
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: DUR.roll, easing: EASE.std }));
    const t = setTimeout(() => setVelho(null), delay + DUR.roll + 20);
    return () => clearTimeout(t);
  }, [ch, animar, delay, reduzido, p, o]);

  const sNovo = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - p.value) * 1.05 * h }] }));
  const sVelho = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * 1.05 * h }] }));
  const t = (c: string) => (c === ' ' ? ' ' : c);
  return (
    <View style={{ height: h, overflow: 'hidden' }}>
      <Animated.Text style={[estilo, { lineHeight: h }, sNovo]}>{t(ch)}</Animated.Text>
      {velho !== null && (
        <Animated.Text style={[estilo, { lineHeight: h, position: 'absolute', left: 0, top: 0 }, sVelho]}>{t(velho)}</Animated.Text>
      )}
    </View>
  );
}

export { Text };
