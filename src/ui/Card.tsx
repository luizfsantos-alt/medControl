// Card de remédio (BRIEFING §4–§6), com os quatro estados de docs/spec.md §4.
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { horariosDoDia, type StatusRemedio, agendaVigente } from '../domain/regras';
import { diaHoraCurto, formatDuracao, formatHora, formatHorarioMin, formatRelogio, mesmoDia } from '../domain/tempo';
import type { Remedio } from '../domain/types';
import { Chip } from './Botoes';
import { Hachura } from './Hachura';
import { Icone } from './Icone';
import { Rolete } from './Rolete';
import { numero } from './formato';
import { DUR, EASE, F, RAIO, ls, useCores } from './tema';

interface Props {
  remedio: Remedio;
  status: StatusRemedio;
  now: number;
  animar: boolean;
  /** Registra a dose; devolve a hora registrada ou null. */
  onTomar: (id: string) => number | null;
  /** Avisado quando o carimbo assentou (o card pode mudar de estado e posição). */
  onCarimbado: () => void;
  onEditar: (r: Remedio) => void;
  onEstoque: (r: Remedio) => void;
}

interface Visual {
  k: 'perdido' | 'agora' | 'espera' | 'tomado';
  label: string;
  relogio: string;
  lado: string;
  p: number;
}

function visual(s: StatusRemedio, now: number): Visual {
  const e = s.estado;
  if (e.k === 'perdido') return { k: e.k, label: 'Não tomado', relogio: formatHora(e.horarioPerdido), lado: 'Dose anterior', p: 1 };
  if (e.k === 'agora') return { k: e.k, label: 'Hora de tomar', relogio: 'Agora', lado: `Dose das ${formatHora(e.atual.horario)}`, p: 1 };
  if (e.k === 'espera') return { k: e.k, label: 'Faltam', relogio: formatRelogio(e.faltaMs), lado: `Dose das ${formatHora(e.atual.horario)}`, p: e.progresso };
  const prox = e.proximo;
  const lado = prox ? `Próxima ${mesmoDia(prox.horario, now) ? formatHora(prox.horario) : diaHoraCurto(prox.horario, now)}` : 'Tomado';
  const p = prox ? Math.min(1, Math.max(0, (now - e.tomadoEm) / Math.max(1, prox.horario - e.tomadoEm))) : 1;
  return { k: 'tomado', label: 'Tomado', relogio: formatHora(e.tomadoEm), lado, p };
}

export function frequencia(r: Remedio, now: number): string {
  const a = agendaVigente(r, now);
  const hs = horariosDoDia(a.intervaloHoras, a.horarioMin).map(formatHorarioMin);
  const freq = a.intervaloHoras === 24 ? '1x ao dia' : `a cada ${a.intervaloHoras}h`;
  if (hs.length <= 4) return `${freq} · ${hs.slice(0, -1).join(', ')}${hs.length > 1 ? ' e ' : ''}${hs[hs.length - 1]}`;
  return `${freq} · desde ${hs[0]}`;
}

export function CardRemedio({ remedio, status, now, animar, onTomar, onCarimbado, onEditar, onEstoque }: Props) {
  const c = useCores();
  const reduzido = useReducedMotion();
  const [congelado, setCongelado] = useState<{ status: StatusRemedio; now: number; remedio: Remedio } | null>(null);
  const [carimbo, setCarimbo] = useState<string | null>(null);
  const exib = congelado ?? { status, now, remedio };
  const v = visual(exib.status, exib.now);
  const r = exib.remedio;
  const sinal = v.k === 'perdido' || v.k === 'agora';
  const tinta = sinal ? c.onSignal : c.ink;

  /* ---- animações do bloco grande ---- */
  const [heroW, setHeroW] = useState(400);
  const hatchX = useSharedValue(v.k === 'espera' || v.k === 'tomado' ? 0 : 1);
  const listras = useSharedValue(v.k === 'espera' ? 1 : 0);
  const gauge = useSharedValue(v.p);
  const conteudo = useSharedValue(1);
  const cardY = useSharedValue(0);
  const btnY = useSharedValue(0);
  const stO = useSharedValue(0);
  const stS = useSharedValue(1);

  useEffect(() => {
    const coberto = v.k === 'espera' || v.k === 'tomado';
    const alvo = coberto ? 0 : 1;
    if (!animar || reduzido) hatchX.value = alvo;
    else hatchX.value = withTiming(alvo, coberto ? { duration: DUR.base, easing: EASE.std } : { duration: DUR.release, easing: EASE.heavy });
    const l = v.k === 'espera' ? 1 : 0;
    listras.value = animar && !reduzido ? withTiming(l, { duration: DUR.base, easing: EASE.std }) : l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.k]);

  useEffect(() => {
    gauge.value = animar ? withTiming(v.p, { duration: 1000, easing: Easing.linear }) : v.p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.p]);

  const sHatch = useAnimatedStyle(() => ({ transform: [{ translateX: hatchX.value * heroW * 1.01 }] }));
  const sListras = useAnimatedStyle(() => ({ opacity: listras.value }));
  const sGauge = useAnimatedStyle(() => ({ transform: [{ scaleX: gauge.value }] }));
  const sConteudo = useAnimatedStyle(() => ({ opacity: conteudo.value }));
  const sCard = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }] }));
  const sBtn = useAnimatedStyle(() => ({ transform: [{ translateY: btnY.value }] }));
  const sStamp = useAnimatedStyle(() => ({ opacity: stO.value, transform: [{ rotate: '-4deg' }, { scale: stS.value }] }));

  /* ---- carimbo (movimento 04) ---- */
  const soltar = () => {
    stO.value = withTiming(0, { duration: reduzido ? 120 : 300, easing: EASE.exit }, () => runOnJS(setCarimbo)(null));
    conteudo.value = withTiming(1, { duration: reduzido ? 120 : DUR.base, easing: EASE.std });
    setCongelado(null);
    onCarimbado();
  };

  const tomar = () => {
    if (congelado) return;
    const antes = { status, now, remedio };
    const em = onTomar(remedio.id);
    if (em === null) return;
    setCongelado(antes);
    setCarimbo(`Tomado · ${formatHora(em)}`);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (reduzido) {
      conteudo.value = withTiming(0.15, { duration: 120 });
      stO.value = withTiming(0.88, { duration: 120 });
    } else {
      btnY.value = withSequence(withTiming(2, { duration: DUR.press, easing: EASE.std }), withTiming(0, { duration: DUR.press, easing: EASE.std }));
      conteudo.value = withDelay(DUR.press, withTiming(0.15, { duration: 260, easing: EASE.std }));
      stS.value = 1.15;
      stO.value = withDelay(DUR.press, withSequence(withTiming(1, { duration: 260, easing: EASE.stamp }), withDelay(0, withTiming(0.85, { duration: DUR.release, easing: EASE.std }))));
      stS.value = withDelay(DUR.press, withTiming(1, { duration: 260, easing: EASE.stamp }));
      cardY.value = withDelay(260, withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 70 })));
    }
    setTimeout(soltar, reduzido ? 900 : 1100);
  };

  useEffect(() => () => cancelAnimation(stO), [stO]);

  const ultima = exib.status.ultimaDose;
  const a = agendaVigente(r, exib.now);
  const insuf = r.estoque < r.comprimidosPorDose;

  return (
    <Animated.View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: v.k === 'perdido' ? c.red : c.rule,
          borderRadius: RAIO,
          paddingBottom: 16,
          gap: 12,
        },
        v.k === 'perdido' && { outlineColor: c.red, outlineWidth: 2, outlineStyle: 'solid' },
        sCard,
      ]}
    >
      {/* topo: régua de progresso e fita de advertência */}
      <View>
        <View style={{ height: 3, backgroundColor: c.rule, overflow: 'hidden' }}>
          <Animated.View style={[{ height: 3, width: '100%', backgroundColor: v.k === 'perdido' ? c.red : c.ink, transformOrigin: 'left' }, sGauge]} />
        </View>
        {v.k === 'perdido' && <Fita texto={`Não tomado · dose das ${v.relogio} de ${r.nome} · `} />}
      </View>

      {/* cabeçalho */}
      <View style={{ gap: 6, paddingTop: 4, paddingHorizontal: 16 }}>
        <Pressable onPress={() => onEditar(remedio)} accessibilityRole="button" accessibilityLabel={`Editar ${r.nome}`} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: F.nome, fontSize: 23, lineHeight: 25, color: c.ink }}>{r.nome}</Text>
        </Pressable>
        <Text style={{ fontFamily: F.mono500, fontSize: 11, lineHeight: 14, letterSpacing: ls(0.08, 11), textTransform: 'uppercase', color: c.ink2 }}>
          {`${r.dose} · ${numero(r.comprimidosPorDose)} comp · ${frequencia(r, exib.now)}`}
        </Text>
      </View>

      {/* bloco grande */}
      <View style={{ height: 108, marginHorizontal: 16, overflow: 'hidden', borderRadius: RAIO }} onLayout={(e: LayoutChangeEvent) => setHeroW(e.nativeEvent.layout.width)}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: v.k === 'perdido' ? c.red : c.lime }} />
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.paper2 }, sHatch]}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, sListras]}>
            <Hachura linha={c.hatch} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'space-between' }, sConteudo]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Etiqueta texto={v.label} cor={tinta} fundo={sinal ? undefined : c.surface} />
            <Etiqueta texto={v.lado} cor={tinta} fundo={sinal ? undefined : c.surface} />
          </View>
          <Rolete texto={v.relogio} tam={66} animar={animar} estilo={{ fontFamily: F.relogio, fontSize: 66, letterSpacing: ls(-0.005, 66), textTransform: 'uppercase', color: tinta, fontVariant: ['tabular-nums'] }} />
        </Animated.View>
        {carimbo !== null && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
            <Animated.View style={[{ borderWidth: 1, borderColor: c.onSignal, padding: 3 }, sStamp]}>
              <View style={{ borderWidth: 3, borderColor: c.onSignal, paddingVertical: 8, paddingHorizontal: 14 }}>
                <Text style={{ fontFamily: F.mono700, fontSize: 19, lineHeight: 19, letterSpacing: ls(0.08, 19), textTransform: 'uppercase', color: c.onSignal }}>{carimbo}</Text>
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      {/* fatos */}
      <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.rule }}>
        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <FatoK texto="Última dose" />
          <Text style={{ fontFamily: F.mono600, fontSize: 15, lineHeight: 17, color: c.ink, fontVariant: ['tabular-nums'] }}>{ultima ? diaHoraCurto(ultima.em, exib.now) : 'Nenhuma'}</Text>
        </View>
        <Pressable style={{ flex: 1, gap: 6, minWidth: 0 }} onPress={() => onEstoque(remedio)} accessibilityRole="button" accessibilityLabel={`Ajustar estoque de ${r.nome}: ${numero(r.estoque)} comprimidos`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: F.mono500, fontSize: 10, lineHeight: 10, letterSpacing: ls(0.1, 10), textTransform: 'uppercase', color: c.ink2, textDecorationLine: 'underline' }}>Estoque</Text>
            <Icone nome="seta" cor={c.ink2} tam={12} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 5 }}>
            <Rolete texto={numero(r.estoque)} tam={15} animar={animar} estilo={{ fontFamily: F.mono600, fontSize: 15, color: c.ink, fontVariant: ['tabular-nums'] }} />
            <Text style={{ fontFamily: F.mono500, fontSize: 11, letterSpacing: ls(0.06, 11), textTransform: 'uppercase', color: c.ink2, marginBottom: 1 }}>comp.</Text>
            {insuf && <Chip texto="Insuficiente" solido />}
          </View>
        </Pressable>
      </View>

      {ultima && (
        <Text style={{ marginHorizontal: 16, fontFamily: F.mono500, fontSize: 11, lineHeight: 16, letterSpacing: ls(0.04, 11), textTransform: 'uppercase', color: c.ink2 }}>
          {`Última dose há ${formatDuracao(exib.now - ultima.em)} · a cada ${a.intervaloHoras}h`}
        </Text>
      )}

      {exib.status.podeRegistrar && (
        <Animated.View style={[{ marginHorizontal: 16 }, sBtn]}>
          {exib.status.barreira && ultima ? (
            <BotaoSegurar rotulo="Segure para registrar" confirmacao={`Registrar · última dose há ${formatDuracao(exib.now - ultima.em)}`} onConfirmar={tomar} />
          ) : (
            <BotaoTomar onPress={tomar} />
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

function Etiqueta({ texto, cor, fundo }: { texto: string; cor: string; fundo?: string }) {
  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 6, borderWidth: 1, borderColor: cor, backgroundColor: fundo ?? 'transparent', alignSelf: 'flex-start', flexShrink: 1 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.mono600, fontSize: 11, lineHeight: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: cor }}>
        {texto}
      </Text>
    </View>
  );
}

function FatoK({ texto }: { texto: string }) {
  const c = useCores();
  return <Text style={{ fontFamily: F.mono500, fontSize: 10, lineHeight: 10, letterSpacing: ls(0.1, 10), textTransform: 'uppercase', color: c.ink2 }}>{texto}</Text>;
}

function BotaoTomar({ onPress }: { onPress: () => void }) {
  const c = useCores();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ height: 54, borderRadius: RAIO, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: pressed ? 2 : 0 }] })}
    >
      <Text style={{ fontFamily: F.botao, fontSize: 16, letterSpacing: ls(0.1, 16), textTransform: 'uppercase', color: c.paper }}>Tomei agora</Text>
    </Pressable>
  );
}

/** Segurar para confirmar (movimento 05): a tinta enche da esquerda em 2 s; soltar volta 3x mais rápido. */
export function BotaoSegurar({ rotulo, confirmacao, onConfirmar }: { rotulo: string; confirmacao: string; onConfirmar: () => void }) {
  const c = useCores();
  const [w, setW] = useState(300);
  const [segurando, setSegurando] = useState(false);
  const p = useSharedValue(0);
  const feito = useRef(false);
  const confirmar = () => {
    if (feito.current) return;
    feito.current = true;
    onConfirmar();
  };
  const press = () => {
    if (feito.current) return;
    setSegurando(true);
    p.value = withTiming(1, { duration: (1 - p.value) * DUR.hold, easing: Easing.linear }, (ok) => {
      if (ok) runOnJS(confirmar)();
    });
  };
  const release = () => {
    if (feito.current) return;
    p.value = withTiming(0, { duration: (p.value * DUR.hold) / 3, easing: Easing.linear }, (ok) => {
      if (ok) runOnJS(setSegurando)(false);
    });
  };
  const sFill = useAnimatedStyle(() => ({ width: p.value * w }));
  const texto = { fontFamily: F.sans700, fontSize: 13, lineHeight: 14, letterSpacing: ls(0.08, 13), textTransform: 'uppercase' as const, textAlign: 'center' as const };
  return (
    <Pressable
      onPressIn={press}
      onPressOut={release}
      accessibilityRole="button"
      accessibilityLabel="Segure por dois segundos para registrar a dose"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: 54, borderWidth: 1, borderColor: c.ink, borderRadius: RAIO, backgroundColor: c.surface, overflow: 'hidden', justifyContent: 'center' }}
    >
      <Text style={[texto, { color: c.ink, paddingHorizontal: 12 }]}>{segurando ? confirmacao : rotulo}</Text>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', backgroundColor: c.ink }, sFill]}>
        <View style={{ width: w - 2, height: '100%', justifyContent: 'center', paddingHorizontal: 12 }}>
          <Text style={[texto, { color: c.paper }]}>{confirmacao}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Fita de advertência: rola a 40 px/s, qualquer que seja o texto. */
function Fita({ texto }: { texto: string }) {
  const c = useCores();
  const reduzido = useReducedMotion();
  const [larg, setLarg] = useState(0);
  const x = useSharedValue(0);
  const repetido = texto.repeat(3);
  useEffect(() => {
    if (!larg || reduzido) return;
    x.value = 0;
    x.value = withRepeat(withTiming(-larg, { duration: (larg / 40) * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [larg, reduzido, x]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const estilo = { fontFamily: F.mono700, fontSize: 11, lineHeight: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase' as const, color: c.onSignal };
  return (
    <View style={{ height: 28, backgroundColor: c.red, overflow: 'hidden', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ flexDirection: 'row', width: 10000 }, s]}>
        <Text style={estilo} onLayout={(e) => setLarg(e.nativeEvent.layout.width)}>
          {repetido}
        </Text>
        <Text style={estilo}>{repetido}</Text>
      </Animated.View>
    </View>
  );
}

