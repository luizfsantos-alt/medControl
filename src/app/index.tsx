import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buscarAtualizacao, type Atualizacao } from '../data/atualizacao';
import { ajustarEstoque, aplicarBackup, apagarTudo, desfazer, excluirRemedio, getState, salvarRemedio } from '../data/store';
import { formatHora, rotuloRelogio } from '../domain/tempo';
import type { Dados, Remedio } from '../domain/types';
import { BotaoIcone } from '../ui/Botoes';
import { Icone } from '../ui/Icone';
import { Marca } from '../ui/Marca';
import { Rolete } from '../ui/Rolete';
import { SheetAjustes, SheetImportar } from '../ui/SheetAjustes';
import { SheetConfirmar, SheetEstoque, SheetRemedio, type Confirmacao, type ValoresRemedio } from '../ui/Sheets';
import { TelaEstoque } from '../ui/TelaEstoque';
import { TelaHistorico } from '../ui/TelaHistorico';
import { TelaRemedios } from '../ui/TelaRemedios';
import { Tracejado } from '../ui/Tracejado';
import { BBAR_H, DUR, EASE, F, GUTTER, ls, useCores } from '../ui/tema';
import { useToast } from '../ui/Toast';
import { useNow } from '../ui/useNow';

type Aba = 'remedios' | 'estoque' | 'historico';
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'remedios', rotulo: 'Remédios' },
  { id: 'estoque', rotulo: 'Estoque' },
  { id: 'historico', rotulo: 'Histórico' },
];

export default function Inicio() {
  const c = useCores();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow();
  const toast = useToast();
  const [aba, setAba] = useState<Aba>('remedios');
  const [editando, setEditando] = useState<{ r: Remedio | null } | null>(null);
  const [estoque, setEstoque] = useState<Remedio | null>(null);
  const [conf, setConf] = useState<Confirmacao | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const [importando, setImportando] = useState<Dados | null>(null);
  const [atualizacao, setAtualizacao] = useState<Atualizacao | null>(null);
  const [ultimoEditado, setUltimoEditado] = useState<Remedio | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    buscarAtualizacao().then(setAtualizacao).catch(() => {});
  }, []);

  const erro = (m: string) => toast(m, { tipo: 'erro' });

  const trocarAba = (a: Aba) => {
    if (a === aba) return;
    setAba(a);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const abrirNovo = () => {
    setUltimoEditado(null);
    setEditando({ r: null });
  };
  const abrirEdicao = (r: Remedio) => {
    setUltimoEditado(r);
    setEditando({ r });
  };

  const salvar = (v: ValoresRemedio) => {
    salvarRemedio(editando?.r?.id ?? null, v);
    setEditando(null);
    toast('Remédio salvo');
  };

  const excluir = (r: Remedio) => {
    setConf({
      titulo: `Remover ${r.nome}?`,
      mensagem: 'O remédio sai da lista e deixa de ser cobrado. As doses já registradas continuam no histórico.',
      ok: 'Remover',
      fn: () => {
        excluirRemedio(r.id);
        setEditando(null);
        toast(`${r.nome} removido`);
      },
    });
  };

  const doseRegistrada = (doseId: string, nome: string, em: number) => {
    toast(`Dose de ${nome} registrada · ${formatHora(em)}`, { acao: { rotulo: 'Desfazer', fn: () => desfazer(doseId) } });
  };

  const temDoses = !!editando?.r && getState().doses.some((d) => d.remedioId === editando.r!.id);

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView ref={scroll} contentContainerStyle={{ alignItems: 'center', paddingBottom: BBAR_H + ins.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 680, paddingTop: 4 + ins.top, paddingHorizontal: GUTTER, paddingBottom: 16 }}>
          {/* topo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: c.rule }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
              <Marca cor={c.ink} />
              <Text style={{ fontFamily: F.marca, fontSize: 22, lineHeight: 24, letterSpacing: ls(0.03, 22), textTransform: 'uppercase', color: c.ink }} accessibilityRole="header">
                MedControl
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {width > 440 && (
                  <Text style={{ fontFamily: F.mono600, fontSize: 11, letterSpacing: ls(0.08, 11), textTransform: 'uppercase', color: c.ink2 }}>{rotuloRelogio(now)}</Text>
                )}
                <Rolete texto={formatHora(now)} tam={12} estilo={{ fontFamily: F.mono600, fontSize: 12, letterSpacing: ls(0.08, 12), color: c.ink }} />
              </View>
              <BotaoIcone icone="ajustes" rotulo="Ajustes" onPress={() => setAjustes(true)} />
            </View>
          </View>

          <Vista key={aba}>
            {aba === 'remedios' && <TelaRemedios now={now} onEditar={abrirEdicao} onEstoque={setEstoque} onNovo={abrirNovo} onDoseRegistrada={doseRegistrada} />}
            {aba === 'estoque' && <TelaEstoque now={now} onEditar={abrirEdicao} onEstoque={setEstoque} onNovo={abrirNovo} />}
            {aba === 'historico' && <TelaHistorico now={now} />}
          </Vista>
        </View>
      </ScrollView>

      {atualizacao && (
        <Pressable
          onPress={() => Linking.openURL(atualizacao.url)}
          accessibilityRole="button"
          style={{ position: 'absolute', left: 0, right: 0, bottom: BBAR_H + ins.bottom, zIndex: 40, alignItems: 'center' }}
        >
          <View style={{ width: '100%', maxWidth: 680, backgroundColor: c.ink }}>
            <Tracejado cor={c.paper} espessura={2} />
            <Text style={{ paddingVertical: 14, paddingHorizontal: 16, fontFamily: F.mono600, fontSize: 12, lineHeight: 15, letterSpacing: ls(0.08, 12), textTransform: 'uppercase', textAlign: 'center', color: c.paper }}>
              {`Nova versão ${atualizacao.versao} disponível · toque para baixar`}
            </Text>
          </View>
        </Pressable>
      )}

      <BarraInferior aba={aba} onAba={trocarAba} onNovo={abrirNovo} />

      <SheetRemedio
        aberto={!!editando}
        remedio={editando?.r ?? ultimoEditado}
        temDoses={temDoses}
        now={now}
        onFechar={() => setEditando(null)}
        onSalvar={salvar}
        onExcluir={excluir}
        onErro={erro}
      />
      <SheetEstoque
        aberto={!!estoque}
        remedio={estoque}
        onFechar={() => setEstoque(null)}
        onSalvar={(v) => {
          if (estoque) ajustarEstoque(estoque.id, v);
          setEstoque(null);
          toast('Estoque atualizado');
        }}
      />
      <SheetAjustes
        aberto={ajustes}
        onFechar={() => setAjustes(false)}
        onErro={erro}
        onImportar={(d) => setImportando(d)}
        onApagarTudo={() =>
          setConf({
            titulo: 'Apagar todos os dados?',
            mensagem: 'Remédios, doses e sequência serão apagados deste aparelho. Exporte um backup antes se quiser guardar.',
            ok: 'Apagar tudo',
            fn: () => {
              apagarTudo();
              setAjustes(false);
              toast('Dados apagados');
            },
          })
        }
      />
      <SheetImportar
        dados={importando}
        onFechar={() => setImportando(null)}
        onAplicar={(modo) => {
          if (importando) aplicarBackup(importando, modo);
          setImportando(null);
          setAjustes(false);
          toast('Backup importado');
        }}
      />
      <SheetConfirmar conf={conf} onFechar={() => setConf(null)} />
    </View>
  );
}

/** Troca de aba: a nova vista entra subindo 8 px em 200 ms. */
function Vista({ children }: { children: React.ReactNode }) {
  const reduzido = useReducedMotion();
  const o = useSharedValue(0);
  const y = useSharedValue(reduzido ? 0 : 8);
  useEffect(() => {
    o.value = withTiming(1, { duration: reduzido ? 120 : DUR.fast, easing: EASE.std });
    y.value = withTiming(0, { duration: DUR.fast, easing: EASE.std });
  }, [o, y, reduzido]);
  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

function BarraInferior({ aba, onAba, onNovo }: { aba: Aba; onAba: (a: Aba) => void; onNovo: () => void }) {
  const c = useCores();
  const ins = useSafeAreaInsets();
  const [largTabs, setLargTabs] = useState(0);
  const i = ABAS.findIndex((a) => a.id === aba);
  const x = useSharedValue(0);
  const primeira = useRef(true);
  const larg = largTabs / ABAS.length;

  useEffect(() => {
    if (!largTabs) return;
    const alvo = i * larg;
    x.value = primeira.current ? alvo : withTiming(alvo, { duration: DUR.base, easing: EASE.std });
    primeira.current = false;
  }, [i, larg, largTabs, x]);

  const sInd = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, paddingBottom: ins.bottom, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.rule, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 680, height: BBAR_H, flexDirection: 'row' }}>
        <View style={{ flex: 1, flexDirection: 'row' }} onLayout={(e) => setLargTabs(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {ABAS.map((a) => {
            const sel = a.id === aba;
            return (
              <Pressable key={a.id} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => onAba(a.id)} accessibilityRole="tab" accessibilityState={{ selected: sel }}>
                <Text style={{ fontFamily: F.mono600, fontSize: 11, letterSpacing: ls(0.1, 11), textTransform: 'uppercase', color: sel ? c.ink : c.ink2 }}>{a.rotulo}</Text>
              </Pressable>
            );
          })}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -1, left: 0, width: larg, height: 3, backgroundColor: c.ink }, sInd]} />
        </View>
        <Pressable onPress={onNovo} accessibilityRole="button" accessibilityLabel="Adicionar remédio" style={{ width: BBAR_H, alignItems: 'center', justifyContent: 'center', backgroundColor: c.ink }}>
          <Icone nome="mais" cor={c.paper} tam={24} grosso />
        </Pressable>
      </View>
    </View>
  );
}
