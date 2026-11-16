// Aviso no topo (um por vez): desce em 200 ms, sobe ao sair. Erro mostra o
// chip "Erro" e fica 7 s; com ação ("Desfazer"), fica 5 s.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUR, EASE, F, RAIO, ls, useCores } from './tema';

interface Msg {
  id: number;
  texto: string;
  tipo: 'info' | 'erro';
  acao?: { rotulo: string; fn: () => void };
}

type Mostrar = (texto: string, opts?: { tipo?: 'info' | 'erro'; acao?: Msg['acao'] }) => void;
const Ctx = createContext<Mostrar>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const seq = useRef(0);
  const mostrar = useCallback<Mostrar>((texto, opts) => {
    setMsg({ id: ++seq.current, texto, tipo: opts?.tipo ?? 'info', acao: opts?.acao });
  }, []);
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      {msg && <ToastView key={msg.id} msg={msg} onFim={() => setMsg((m) => (m?.id === msg.id ? null : m))} />}
    </Ctx.Provider>
  );
}

function ToastView({ msg, onFim }: { msg: Msg; onFim: () => void }) {
  const c = useCores();
  const ins = useSafeAreaInsets();
  const reduzido = useReducedMotion();
  const y = useSharedValue(reduzido ? 0 : -1);
  const o = useSharedValue(reduzido ? 0 : 1);
  const [h, setH] = useState(80);

  const sair = useCallback(() => {
    const fim = () => onFim();
    if (reduzido) o.value = withTiming(0, { duration: DUR.fast, easing: EASE.exit }, () => runOnJS(fim)());
    else y.value = withTiming(-1, { duration: DUR.fast, easing: EASE.exit }, () => runOnJS(fim)());
  }, [onFim, reduzido, o, y]);

  useEffect(() => {
    if (reduzido) o.value = withTiming(1, { duration: 120 });
    else y.value = withTiming(0, { duration: DUR.fast, easing: EASE.std });
    const t = setTimeout(sair, msg.tipo === 'erro' ? 7000 : msg.acao ? 5000 : 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value * h }] }));
  return (
    <Animated.View
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      pointerEvents="box-none"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, alignItems: 'center' }, s]}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{
          width: '100%',
          maxWidth: 680,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingTop: 16 + ins.top,
          paddingBottom: 15,
          paddingHorizontal: 16,
          backgroundColor: c.ink,
          borderBottomWidth: 2,
          borderStyle: 'dashed',
          borderBottomColor: c.paper,
        }}
      >
        {msg.tipo === 'erro' && (
          <View style={{ paddingVertical: 3, paddingHorizontal: 6, backgroundColor: c.paper, borderRadius: RAIO }}>
            <Text style={{ fontFamily: F.mono600, fontSize: 10, lineHeight: 11, letterSpacing: ls(0.08, 10), textTransform: 'uppercase', color: c.ink }}>Erro</Text>
          </View>
        )}
        <Text style={{ flex: 1, fontFamily: F.mono600, fontSize: 12, lineHeight: 16, letterSpacing: ls(0.08, 12), textTransform: 'uppercase', color: c.paper }}>{msg.texto}</Text>
        {msg.acao && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              msg.acao!.fn();
              sair();
            }}
            hitSlop={12}
            style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: c.paper, borderRadius: RAIO, backgroundColor: pressed ? c.paper : 'transparent' })}
          >
            {({ pressed }) => (
              <Text style={{ fontFamily: F.mono700, fontSize: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: pressed ? c.ink : c.paper }}>{msg.acao!.rotulo}</Text>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
