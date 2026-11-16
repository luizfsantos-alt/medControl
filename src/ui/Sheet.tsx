// Sheets (BRIEFING §6.4): o véu esmaece em 200 ms e o painel sobe em 320 ms;
// na saída, desce em 200 ms com a curva de saída.
import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUR, EASE, F, ls, useCores } from './tema';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  sub?: string;
  children: React.ReactNode;
}

export function Sheet({ aberto, onFechar, titulo, sub, children }: Props) {
  const c = useCores();
  const ins = useSafeAreaInsets();
  const reduzido = useReducedMotion();
  const [montado, setMontado] = useState(aberto);
  const veu = useSharedValue(0);
  const y = useSharedValue(1);
  const [altura, setAltura] = useState(800);

  useEffect(() => {
    if (aberto) {
      setMontado(true);
      if (reduzido) {
        veu.value = withTiming(1, { duration: 120 });
        y.value = 0;
      } else {
        veu.value = 0;
        y.value = 1;
        veu.value = withTiming(1, { duration: DUR.fast, easing: EASE.std });
        y.value = withTiming(0, { duration: DUR.base, easing: EASE.std });
      }
    } else if (montado) {
      const fim = () => setMontado(false);
      if (reduzido) {
        veu.value = withTiming(0, { duration: 1 }, () => runOnJS(fim)());
        return;
      }
      veu.value = withTiming(0, { duration: DUR.fast, easing: EASE.exit });
      y.value = withTiming(1, { duration: DUR.fast, easing: EASE.exit }, (ok) => {
        if (ok) runOnJS(fim)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onFechar();
      return true;
    });
    return () => sub.remove();
  }, [aberto, onFechar]);

  const sVeu = useAnimatedStyle(() => ({ opacity: veu.value }));
  const sPainel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * altura }] }));

  if (!montado) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, justifyContent: 'flex-end' }]} pointerEvents={aberto ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, sVeu]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View
        onLayout={(e) => setAltura(e.nativeEvent.layout.height)}
        style={[{ maxHeight: '88%', backgroundColor: c.surface, borderTopWidth: 3, borderTopColor: c.ink, alignSelf: 'center', width: '100%', maxWidth: 680 }, sPainel]}
        accessibilityViewIsModal
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 16, paddingBottom: 20 + ins.bottom }}>
          <Text style={{ fontFamily: F.titulo, fontSize: 30, lineHeight: 30, textTransform: 'uppercase', color: c.ink, marginBottom: sub ? 10 : 18 }} accessibilityRole="header">
            {titulo}
          </Text>
          {sub ? (
            <Text style={{ fontFamily: F.mono600, fontSize: 11, lineHeight: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: c.ink2, marginBottom: 12 }}>{sub}</Text>
          ) : null}
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
