# MedControl: especificação (app Android, Expo)

Fonte da verdade das regras. O visual e o movimento seguem
`docs/redesign/BRIEFING.md` e `docs/redesign/maquete.html` (a identidade
"Rótulo de Farmácia"), copiados 1:1 do PWA que este app substitui.

O app é para **remédios de uso controlado, tomados em intervalos fixos**.
Começa em branco: nada é importado do PWA antigo.

---

## 1. Vocabulário

Com o usuário, só existem **horário**, **dose**, **Tomado** e **Não tomado**.
A palavra "janela" e a ideia de blocos do dia nunca aparecem na interface,
nos avisos ou nos textos. Elas existem só no cálculo (seção 3).

## 2. Cadastro

| Campo | Regra |
|---|---|
| Nome | texto, obrigatório |
| Dose | texto livre, obrigatório (ex.: `10mg`) |
| Comprimidos por dose | 0,5 a 20, de meio em meio |
| Intervalo | um destes: **24, 12, 8, 6, 4, 3, 2 ou 1 hora** (todos dividem o dia) |
| Horário | um horário do dia (HH:MM). Os outros horários saem dele somando o intervalo |
| Estoque | 0 a 100.000 comprimidos, de meio em meio |

Exemplo: intervalo 12h e horário 08:00 → horários 08:00 e 20:00.
Intervalo 8h e horário 22:00 → 06:00, 14:00 e 22:00.

## 3. Cálculo (interno)

**Blocos.** O dia é dividido, a partir de 00:00, em blocos do tamanho do
intervalo: 24h → `00:00–24:00`; 12h → `00:00–12:00`, `12:00–24:00`; e assim
por diante. Cada bloco contém exatamente um horário do remédio (o horário
reduzido ao tamanho do intervalo cai sempre na mesma posição dentro de cada
bloco).

**Tomado / Não tomado.**
- Uma dose registrada dentro de um bloco marca aquele bloco como **Tomado**.
- Um bloco que termina sem dose fica **Não tomado**.
- Um bloco aceita uma dose só. Com o bloco atual Tomado, não há botão para
  registrar de novo.

**Começa de imediato.** O bloco em que o remédio é cadastrado já conta.

**Tempo desde a última dose.** Aparece no card como referência e na barreira
contra dose dupla (seção 5). Não entra no cálculo de Tomado / Não tomado.

**Sem retroativo e sem apagar.** Não existe registrar dose num bloco que já
passou, nem apagar um registro. A única correção é o **Desfazer** de 5
segundos que aparece logo depois de registrar (seção 5).

**Mudança de intervalo ou horário.** Vale a partir da próxima meia-noite; o
dia atual segue a regra antiga. Exceção: se o remédio ainda não tem nenhuma
dose registrada, a mudança vale na hora (é correção de cadastro, não mudança
de tratamento). Os blocos que já passaram nunca são recalculados.

**Excluir remédio.** Tira o remédio da lista e para de cobrar a partir dali.
As doses e os Não tomado já registrados continuam no histórico e na sequência.

## 4. Card do remédio

Topo: nome; linha de metadados (`10MG · 1 COMP · A CADA 12H · 08:00 E 20:00`).

Bloco grande (o "hero"), por prioridade:

| Situação | Visual | Rótulo | Grande | Lado |
|---|---|---|---|---|
| O bloco anterior ficou Não tomado e o atual ainda não foi tomado | **vermelho** + fita | `Não tomado` | horário da dose perdida (`08:00`) | `Dose anterior` |
| Já passou do horário do bloco atual e não foi tomado | **lima** | `Hora de tomar` | `Agora` | `Dose das 20:00` |
| Ainda não é o horário do bloco atual e não foi tomado | **hachura** + barra de progresso até o horário | `Faltam` | `H:MM` | `Dose das 20:00` |
| Bloco atual Tomado | papel liso | `Tomado` | hora do registro (`08:12`) | `Próxima 20:00` |

O vermelho é exclusivo da dose perdida e some assim que a dose atual é tomada.

Abaixo: **Última dose** (dia e hora) com "há 3h20" como referência, e
**Estoque** (toque abre o ajuste rápido). Botão de ação:
- `Tomei agora` quando o bloco atual não foi tomado;
- `Segure para registrar` quando a barreira está ativa (seção 5);
- nenhum botão quando o bloco atual já foi Tomado.

**Ordem dos cards:** vermelho → lima (há mais tempo no horário primeiro) →
hachura (horário mais próximo primeiro) → Tomado (próxima dose mais próxima
primeiro). Empate: nome.

## 5. Registrar dose

- `Tomei agora` registra no instante atual, no bloco atual, e desconta os
  comprimidos do estoque (sem ficar negativo). Carimbo `Tomado · HH:MM`.
- **Barreira contra dose dupla:** se a última dose do remédio foi há menos da
  metade do intervalo, é preciso **segurar o botão por 2 s**. Enquanto segura,
  o botão mostra a confirmação e o tempo desde a última dose
  (`Última dose há 0:20`). Soltar antes cancela.
- **Desfazer:** depois de registrar, o aviso na base da tela traz `Desfazer`
  por 5 s. Desfazer apaga o registro e devolve os comprimidos.

## 6. Sequência

Bloco no topo da aba Remédios, sem texto explicativo: rótulo `Sequência`, o
número de dias e uma régua dos últimos 14 dias.

- **Dia cumprido:** todos os blocos do dia, de todos os remédios ativos
  naquele dia, Tomados. Hoje entra na conta assim que o último bloco do dia
  é tomado.
- **Dia perdido:** algum bloco do dia terminou Não tomado. A sequência zera
  nesse instante.
- **Dia sem remédio** (antes do primeiro cadastro): não conta e não quebra.
- **Número:** dias cumpridos seguidos, contando para trás a partir de hoje
  (hoje só entra se já estiver cumprido; se hoje tem um Não tomado, é 0).

Régua: um quadrado por dia. Tinta cheia = cumprido; corte diagonal =
perdido; contorno apagado = sem remédio; **hoje** dividido em fatias, uma por
dose do dia em ordem de horário: tinta = tomada, lima = bloco atual ainda não
tomado, hachura = ainda vai chegar.

Movimento: dia cumprido → a última fatia é carimbada em tinta e o número rola
para cima; quebra → o número rola até 0 e o corte é desenhado.

## 7. Avisos (com o app fechado)

- **No horário:** `Hora de tomar` com a lista dos remédios daquele horário
  ainda não tomados no bloco (`Ritalina 10mg · Venlafaxina 75mg`). Remédios
  com o mesmo horário saem num aviso só.
- **Dose não tomada:** no fim de um bloco que termina sem dose,
  `A última dose de Ritalina não foi tomada`. Os que terminam juntos saem
  juntos.
- Registrar a dose cancela os avisos daquele bloco. Os avisos são agendados
  à frente (até 64 avisos) e refeitos a cada mudança e a cada abertura do app.

## 8. Estoque

- Cada dose desconta os comprimidos da dose. Desfazer devolve.
- Duração: `estoque ÷ (doses por dia × comprimidos por dose)`, com doses por
  dia = 24 ÷ intervalo.
- Selos: `Esgotado` (0), `Insuficiente` (menos que uma dose), `Repor`
  (7 dias ou menos).
- Ajuste rápido: `+`/`−` de meio em meio ou valor digitado.

## 9. Histórico

Por dia, do mais novo ao mais antigo. Cada horário de cada remédio aparece
como `Tomado às 08:12` ou `Não tomado`. Sem apagar.

## 10. Ajustes

- Avisos: estado da permissão e botão para pedir.
- Backup: **Exportar** (`medcontrol-backup-AAAA-MM-DD.json`) e **Importar**
  (`Juntar` ou `Substituir tudo`). O formato do PWA antigo não é aceito.
- Apagar todos os dados (com confirmação).
- Versão e aviso de nova versão disponível (consulta os Releases do GitHub).
