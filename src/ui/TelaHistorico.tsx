import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useStore } from '../data/store';
import { historico, type ItemHistorico } from '../domain/regras';
import { formatHora, rotuloDia } from '../domain/tempo';
import { Chip } from './Botoes';
import { CabecalhoLista } from './CabecalhoLista';
import { Tracejado } from './Tracejado';
import { Vazio } from './Vazio';
import { dosesNovas } from './novas';
import { formatComprimidos } from './formato';
import { DUR, EASE, F, ls, useCores } from './tema';

const DIAS_POR_PAGINA = 30;

export function TelaHistorico({ now }: { now: number }) {
  const c = useCores();
  const remedios = useStore((s) => s.remedios);
  const doses = useStore((s) => s.doses);
  const [paginas, setPaginas] = useState(1);
  const grupos = useMemo(() => historico({ remedios, doses }, now), [remedios, doses, now]);

  if (grupos.length === 0) {
    return <Vazio titulo="Nenhuma dose registrada" texto="Cada dose fica registrada aqui, com dia e hora." fantasma={false} />;
  }

  const visiveis = grupos.slice(0, paginas * DIAS_POR_PAGINA);
  return (
    <View>
      <CabecalhoLista esquerda="Histórico" direita="Livro de doses" />
      {visiveis.map((g, gi) => (
        <View key={g.dia}>
          <View style={{ paddingTop: gi === 0 ? 4 : 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.ink }}>
            <Text style={{ fontFamily: F.mono600, fontSize: 11, lineHeight: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: c.ink2 }}>{rotuloDia(g.dia, now)}</Text>
          </View>
          {g.itens.map((it) => (
            <Linha key={`${it.remedio.id}|${it.bloco.inicio}`} it={it} />
          ))}
        </View>
      ))}
      {visiveis.length < grupos.length && (
        <Text
          onPress={() => setPaginas((p) => p + 1)}
          accessibilityRole="button"
          style={{ marginTop: 16, paddingVertical: 8, fontFamily: F.mono600, fontSize: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', textDecorationLine: 'underline', color: c.ink2 }}
        >
          Mostrar dias anteriores
        </Text>
      )}
    </View>
  );
}

function Linha({ it }: { it: ItemHistorico }) {
  const c = useCores();
  const reduzido = useReducedMotion();
  const nova = !!it.dose && dosesNovas.has(it.dose.id);
  const [h, setH] = useState(0);
  const p = useSharedValue(nova && !reduzido ? 0 : 1);

  useEffect(() => {
    if (!nova || !it.dose) return;
    dosesNovas.delete(it.dose.id);
    if (!reduzido && h > 0) p.value = withDelay(120, withTiming(1, { duration: DUR.print, easing: EASE.std }));
  }, [nova, h, reduzido, it.dose, p]);

  // Impressora (movimento 08): a linha se revela de cima para baixo e empurra as seguintes.
  const s = useAnimatedStyle(() => (h > 0 && p.value < 1 ? { height: p.value * h, overflow: 'hidden' } : {}));
  const r = it.remedio;
  const meta = it.dose ? `Tomado às ${formatHora(it.dose.em)} · ${r.dose} · ${formatComprimidos(r.comprimidosPorDose)}` : r.dose;

  return (
    <Animated.View style={s}>
      <View onLayout={(e) => !h && setH(e.nativeEvent.layout.height)} style={{ backgroundColor: c.paper }}>
        <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
          <Text style={{ width: 62, paddingTop: 2, fontFamily: F.mono600, fontSize: 16, lineHeight: 18, color: it.dose ? c.ink : c.ink2, fontVariant: ['tabular-nums'] }}>
            {formatHora(it.bloco.horario)}
          </Text>
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: F.sans600, fontSize: 15, lineHeight: 19, color: c.ink }}>{r.nome}</Text>
              {!it.dose && <Chip texto="Não tomado" />}
            </View>
            <Text style={{ fontFamily: F.mono500, fontSize: 11, lineHeight: 14, letterSpacing: ls(0.06, 11), textTransform: 'uppercase', color: c.ink2 }}>{meta}</Text>
          </View>
        </View>
        <Tracejado cor={c.rule} />
      </View>
    </Animated.View>
  );
}
