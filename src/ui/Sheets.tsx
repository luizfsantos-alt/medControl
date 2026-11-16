import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { horariosDoDia, agendaAtualOuFutura, agendaVigente } from '../domain/regras';
import { formatHorarioMin } from '../domain/tempo';
import { INTERVALOS, type Intervalo, type Remedio } from '../domain/types';
import { Botao, BotaoIcone, BotaoLink, LinhaBotoes } from './Botoes';
import { Campo, Paragrafo, Rotulo } from './Campo';
import { Sheet } from './Sheet';
import { lerNumero, numero } from './formato';
import { F, RAIO, ls, useCores } from './tema';

/* ---------- Cadastro / edição ---------- */

export interface ValoresRemedio {
  nome: string;
  dose: string;
  comprimidosPorDose: number;
  estoque: number;
  intervaloHoras: Intervalo;
  horarioMin: number;
}

function lerHorario(t: string): number | null {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function mascaraHorario(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function SheetRemedio({
  aberto,
  remedio,
  temDoses,
  now,
  onFechar,
  onSalvar,
  onExcluir,
  onErro,
}: {
  aberto: boolean;
  remedio: Remedio | null;
  temDoses: boolean;
  now: number;
  onFechar: () => void;
  onSalvar: (v: ValoresRemedio) => void;
  onExcluir: (r: Remedio) => void;
  onErro: (msg: string) => void;
}) {
  const c = useCores();
  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [comp, setComp] = useState('1');
  const [estoque, setEstoque] = useState('0');
  const [intervalo, setIntervalo] = useState<Intervalo>(24);
  const [horario, setHorario] = useState('08:00');
  const refNome = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (!aberto) return;
    if (remedio) {
      const a = agendaAtualOuFutura(remedio);
      setNome(remedio.nome);
      setDose(remedio.dose);
      setComp(numero(remedio.comprimidosPorDose));
      setEstoque(numero(remedio.estoque));
      setIntervalo(a.intervaloHoras);
      setHorario(formatHorarioMin(a.horarioMin));
    } else {
      setNome('');
      setDose('');
      setComp('1');
      setEstoque('0');
      setIntervalo(24);
      setHorario('08:00');
      setTimeout(() => refNome.current?.focus(), 350);
    }
  }, [aberto, remedio]);

  const min = lerHorario(horario);
  const horarios = min === null ? [] : horariosDoDia(intervalo, min).map(formatHorarioMin);
  const vigente = remedio ? agendaVigente(remedio, now) : null;
  const mudaAmanha = !!remedio && temDoses && min !== null && (vigente!.intervaloHoras !== intervalo || vigente!.horarioMin !== min);

  const salvar = () => {
    const n = nome.trim();
    const d = dose.trim();
    const cp = Math.round(lerNumero(comp) * 2) / 2;
    const es = Math.round(lerNumero(estoque) * 2) / 2;
    if (!n || !d) return onErro('Preencha nome e dose');
    if (!(cp >= 0.5 && cp <= 20)) return onErro('Comprimidos por dose: de 0,5 a 20');
    if (!(es >= 0 && es <= 100000)) return onErro('Estoque: de 0 a 100.000');
    if (min === null) return onErro('Horário inválido');
    onSalvar({ nome: n, dose: d, comprimidosPorDose: cp, estoque: es, intervaloHoras: intervalo, horarioMin: min });
  };

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={remedio ? 'Editar remédio' : 'Novo remédio'}>
      <Campo ref={refNome} rotulo="Nome do remédio" value={nome} onChangeText={setNome} maxLength={60} placeholder="Ex.: Ritalina" autoCapitalize="sentences" />
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Campo rotulo="Dose" value={dose} onChangeText={setDose} maxLength={30} placeholder="Ex.: 10mg" />
        <Campo rotulo="Comprimidos por dose" value={comp} onChangeText={setComp} keyboardType="decimal-pad" placeholder="Ex.: 1 ou 1,5" />
      </View>

      <View style={{ gap: 8, marginBottom: 16 }}>
        <Rotulo texto="Intervalo" />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {INTERVALOS.map((h) => {
            const sel = h === intervalo;
            return (
              <Pressable
                key={h}
                onPress={() => setIntervalo(h)}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`A cada ${h} horas`}
                style={{ flex: 1, height: 44, borderWidth: 1, borderColor: c.ink, borderRadius: RAIO, backgroundColor: sel ? c.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: F.mono600, fontSize: 12, letterSpacing: ls(0.04, 12), color: sel ? c.paper : c.ink }}>{`${h}h`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Campo rotulo="Horário da dose" value={horario} onChangeText={(t) => setHorario(mascaraHorario(t))} keyboardType="number-pad" maxLength={5} placeholder="08:00" />
        <Campo rotulo="Estoque (comprimidos)" value={estoque} onChangeText={setEstoque} keyboardType="decimal-pad" placeholder="Ex.: 30" />
      </View>

      <View style={{ marginTop: -4, marginBottom: 18, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: c.rule, gap: 6 }}>
        <Text style={{ fontFamily: F.mono600, fontSize: 11, lineHeight: 16, letterSpacing: ls(0.08, 11), textTransform: 'uppercase', color: c.ink }}>
          {horarios.length ? horarios.join(' · ') : '--:--'}
        </Text>
        {mudaAmanha && (
          <Text style={{ fontFamily: F.mono500, fontSize: 11, lineHeight: 15, letterSpacing: ls(0.06, 11), textTransform: 'uppercase', color: c.ink2 }}>Novo horário a partir de amanhã</Text>
        )}
      </View>

      {remedio && <BotaoLink rotulo="Excluir este remédio" onPress={() => onExcluir(remedio)} />}
      <LinhaBotoes>
        <Botao rotulo="Cancelar" onPress={onFechar} />
        <Botao rotulo="Salvar" onPress={salvar} primario />
      </LinhaBotoes>
    </Sheet>
  );
}

/* ---------- Ajuste rápido de estoque ---------- */

export function SheetEstoque({ aberto, remedio, onFechar, onSalvar }: { aberto: boolean; remedio: Remedio | null; onFechar: () => void; onSalvar: (v: number) => void }) {
  const c = useCores();
  const [valor, setValor] = useState('0');
  useEffect(() => {
    if (aberto && remedio) setValor(numero(remedio.estoque));
  }, [aberto, remedio]);
  const passo = (d: number) => setValor((v) => numero(Math.max(0, Math.round(((Number.isFinite(lerNumero(v)) ? lerNumero(v) : 0) + d) * 2) / 2)));
  const salvar = () => {
    const n = Math.round(lerNumero(valor) * 2) / 2;
    onSalvar(Number.isFinite(n) ? Math.min(100000, Math.max(0, n)) : 0);
  };
  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={remedio?.nome ?? 'Ajustar estoque'} sub="Comprimidos disponíveis">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
        <BotaoIcone icone="menos" rotulo="Diminuir meio comprimido" tam={52} grosso onPress={() => passo(-0.5)} />
        <TextInput
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          accessibilityLabel="Estoque em comprimidos"
          selectionColor={c.ink}
          style={{ width: 140, paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: c.ink, textAlign: 'center', fontFamily: F.relogio, fontSize: 44, color: c.ink, fontVariant: ['tabular-nums'] }}
        />
        <BotaoIcone icone="mais" rotulo="Aumentar meio comprimido" tam={52} grosso onPress={() => passo(0.5)} />
      </View>
      <LinhaBotoes>
        <Botao rotulo="Cancelar" onPress={onFechar} />
        <Botao rotulo="Salvar" onPress={salvar} primario />
      </LinhaBotoes>
    </Sheet>
  );
}

/* ---------- Confirmação ---------- */

export interface Confirmacao {
  titulo: string;
  mensagem: string;
  ok: string;
  fn: () => void;
}

export function SheetConfirmar({ conf, onFechar }: { conf: Confirmacao | null; onFechar: () => void }) {
  const [ultimo, setUltimo] = useState<Confirmacao | null>(conf);
  useEffect(() => {
    if (conf) setUltimo(conf);
  }, [conf]);
  const x = conf ?? ultimo;
  return (
    <Sheet aberto={!!conf} onFechar={onFechar} titulo={x?.titulo ?? ''}>
      {x?.mensagem ? <Paragrafo texto={x.mensagem} /> : null}
      <LinhaBotoes>
        <Botao rotulo="Cancelar" onPress={onFechar} />
        <Botao
          rotulo={x?.ok ?? 'Confirmar'}
          primario
          onPress={() => {
            onFechar();
            x?.fn();
          }}
        />
      </LinhaBotoes>
    </Sheet>
  );
}
