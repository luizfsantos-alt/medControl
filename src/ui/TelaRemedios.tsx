import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion, withDelay, withTiming } from 'react-native-reanimated';
import { getState, remediosAtivos, tomar, useStore } from '../data/store';
import { IndiceDoses, chaveOrdem, compararChaves, sequencia, statusRemedio } from '../domain/regras';
import type { Remedio } from '../domain/types';
import { CardRemedio } from './Card';
import { dosesNovas } from './novas';
import { Vazio } from './Vazio';
import { CabecalhoLista } from './CabecalhoLista';
import { BlocoSequencia } from './Sequencia';
import { DUR, EASE, F, ls, useCores } from './tema';


const ATRASO_ORDEM_CARIMBO_MS = 380;

function entrada(i: number) {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
      animations: {
        opacity: withDelay(i * 40, withTiming(1, { duration: DUR.base, easing: EASE.std })),
        transform: [{ translateY: withDelay(i * 40, withTiming(0, { duration: DUR.base, easing: EASE.std })) }],
      },
    };
  };
}

function entradaNovo() {
  'worklet';
  return {
    initialValues: { opacity: 0 },
    animations: { opacity: withTiming(1, { duration: DUR.base, easing: EASE.std }) },
  };
}

interface Props {
  now: number;
  onEditar: (r: Remedio) => void;
  onEstoque: (r: Remedio) => void;
  onNovo: () => void;
  onDoseRegistrada: (doseId: string, nome: string, em: number) => void;
}

export function TelaRemedios({ now, onEditar, onEstoque, onNovo, onDoseRegistrada }: Props) {
  const c = useCores();
  const reduzido = useReducedMotion();
  const remedios = useStore((s) => s.remedios);
  const doses = useStore((s) => s.doses);
  const ativos = useMemo(() => remediosAtivos({ remedios, doses, ready: true }), [remedios, doses]);
  const primeira = useRef(true);
  const [ordemCongelada, setOrdemCongelada] = useState<string[] | null>(null);

  const idx = useMemo(() => new IndiceDoses(doses), [doses]);
  const itens = useMemo(() => ativos.map((r) => ({ r, s: statusRemedio(r, idx, now) })), [ativos, idx, now]);
  const ordenados = useMemo(() => [...itens].sort((a, b) => compararChaves(chaveOrdem(a.r, a.s), chaveOrdem(b.r, b.s))), [itens]);
  const seq = useMemo(() => sequencia({ remedios, doses }, now), [remedios, doses, now]);

  const ordem = ordemCongelada
    ? [...ordemCongelada.map((id) => ordenados.find((x) => x.r.id === id)).filter((x): x is (typeof ordenados)[number] => !!x), ...ordenados.filter((x) => !ordemCongelada.includes(x.r.id))]
    : ordenados;

  useEffect(() => {
    primeira.current = false;
  }, []);

  const naoTomados = itens.filter((x) => x.s.estado.k === 'perdido').length;

  if (ativos.length === 0) {
    return <Vazio titulo="Nenhum remédio ainda" texto="Cadastre o primeiro para começar a registrar as doses." acao="Adicionar remédio" onAcao={onNovo} />;
  }

  const onTomar = (id: string) => {
    setOrdemCongelada(ordem.map((x) => x.r.id));
    const dose = tomar(id);
    if (!dose) {
      setOrdemCongelada(null);
      return null;
    }
    dosesNovas.add(dose.id);
    const nome = getState().remedios.find((r) => r.id === id)?.nome ?? '';
    onDoseRegistrada(dose.id, nome, dose.em);
    return dose.em;
  };

  const onCarimbado = () => {
    setTimeout(() => setOrdemCongelada(null), reduzido ? 0 : ATRASO_ORDEM_CARIMBO_MS);
  };

  return (
    <View>
      <BlocoSequencia seq={seq} animar={!primeira.current} />
      <CabecalhoLista esquerda="Remédios">
        <Text style={{ fontFamily: F.mono600, fontSize: 11, lineHeight: 13, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: c.ink2 }}>
          {`${ativos.length} ${ativos.length === 1 ? 'cadastrado' : 'cadastrados'}`}
          {naoTomados > 0 && (
            <>
              {' · '}
              <Text style={{ color: c.ink }}>{`${naoTomados} não ${naoTomados === 1 ? 'tomado' : 'tomados'}`}</Text>
            </>
          )}
        </Text>
      </CabecalhoLista>
      <View style={{ gap: 12 }}>
        {ordem.map(({ r, s }, i) => (
          <Animated.View
            key={r.id}
            entering={reduzido ? undefined : primeira.current ? entrada(i) : entradaNovo}
            layout={reduzido ? undefined : LinearTransition.duration(DUR.base).easing(EASE.std)}
          >
            <CardRemedio
              remedio={r}
              status={s}
              now={now}
              animar={!primeira.current}
              onTomar={onTomar}
              onCarimbado={onCarimbado}
              onEditar={onEditar}
              onEstoque={onEstoque}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
