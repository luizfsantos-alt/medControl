# Briefing de execução: redesign "Rótulo de Farmácia" + "Mecânica de Precisão"

Status: **aprovado pela mesa diretora** (outubro 2026). Este documento é a
especificação que o agente executor deve seguir. Onde ele for omisso, a
referência é a maquete em `docs/redesign/maquete.html`. Abra com
`python3 -m http.server` na raiz do repositório e acesse
`/docs/redesign/maquete.html`.

A maquete é **referência visual e de movimento, não código de produção**.
Os valores (cores, curvas, durações, tamanhos) dela são canônicos. A
estrutura de código, não: o app real tem regras de negócio que a maquete
simplifica (ver seção 4).

---

## 0. Resumo em uma frase

Trocar o tema escuro genérico por uma identidade de rótulo de farmácia:
papel, tinta, tipografia condensada pesada, um verde-lima para "liberado",
um vermelhão exclusivo para atraso crítico, e um sistema de movimento
mecânico em que cada animação comunica uma mudança de estado. Nada de
emojis em lugar nenhum.

## 1. Escopo

**Dentro:**
- `css/styles.css`: reescrita completa.
- `index.html`: marcação das telas, sheets, barra inferior e telas vazias.
- `js/app.js`: funções de renderização (`renderMedicamentos`,
  `renderEstoque`, `renderHistorico`, `switchTab`) e o fluxo de
  `tomarMedicamento` (carimbo e segurar para antecipar).
- `js/ui.js`: `toast`, `openSheet` e `closeSheet` ganham animação.
- Novo `js/motion.js`: utilitários de movimento (seção 8).
- Novos arquivos em `assets/`: fontes, ícones e selo de notificação (seção 3.6).
- `sw.js`: precache das fontes e aumento da `VERSION`.
- `manifest.webmanifest` e metas de `index.html`: cores.
- `README.md` e `server/README.md`: remover emojis (seção 10).

**Fora:**
- `js/state.js`, `server/` (exceto o README), formato dos dados e backup.
- A lógica de `computeStatus`, das regras de 1x ao dia, das notificações
  e do push. Elas não mudam. Só a apresentação muda.

**Mudanças de comportamento aprovadas.** São as únicas permitidas:
1. Cards ordenados por urgência, não mais por ordem alfabética (seção 6.1).
2. "Segurar para antecipar" substitui o `confirmDialog` da dose fora de
   hora (seção 6.2).
3. Editar e excluir saem do card e vão para dentro da sheet de edição.
   O ajuste rápido de estoque passa a abrir ao tocar no bloco de estoque
   (seção 6.3).

## 2. Restrições inegociáveis

- **Zero emojis e zero símbolos Unicode decorativos** (⚙ ✎ 🗑 📦 ⚠ 💊 🗒️
  e afins) em HTML, JS, CSS, notificações, toasts e READMEs. Ícones só
  em SVG inline (seção 3.5). Verificação na seção 12.
- **Sem dependências e sem build step.** Nada de framework, nada de
  biblioteca de animação. CSS e Web Animations API nativa.
- **100% offline.** Fontes salvas localmente e precacheadas no service
  worker. Nenhuma requisição a Google Fonts ou CDN em produção.
- **Vermelho (`--red`) é exclusivo de atraso crítico.** Erro, perigo,
  "apagar tudo" e estoque baixo **não** usam vermelho (seção 3.1).
- **O status nunca depende só da cor nem só do movimento.** Todo estado
  tem texto.
- **Textos em pt-BR**, com a mesma redação de alertas de saúde que existe
  hoje (o texto do alerta crítico se mantém).
- **Área de toque mínima de 44px.** Texto corrido com no mínimo 14px,
  campos de formulário com 17px.

---

## 3. Fundamentos visuais

### 3.1 Cores (tokens)

Defina exatamente estes tokens no topo de `styles.css`. O tema segue o
sistema (`prefers-color-scheme`). Não há seletor de tema no app.

```css
:root {
  color-scheme: light;
  --paper:   #EFEBE3; /* fundo */
  --paper-2: #E4DFD4; /* fundo das hachuras, campos */
  --surface: #F8F6F1; /* cards, sheets */
  --ink:     #121210; /* texto principal, botões primários */
  --ink-2:   #5C5850; /* texto secundário, rótulos */
  --rule:    #CBC4B6; /* linhas finas, bordas neutras */
  --hatch:   #B3AA99; /* linhas da hachura "aguardando" */
  --lime:    #C8F031; /* LIBERADO */
  --red:     #FF3B1F; /* ATRASO CRÍTICO, e só isso */
  --on-signal: #121210; /* texto sobre lima e sobre vermelho, nos dois temas */
  --scrim:   rgb(18 18 16 / 0.45);
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --paper: #121210; --paper-2: #1C1B18; --surface: #191815;
    --ink: #EFEBE3; --ink-2: #9A958B; --rule: #34322D; --hatch: #45423B;
    --scrim: rgb(0 0 0 / 0.6);
  }
}
```

Regras de uso:
- Lima e vermelho são **fundos de bloco**, nunca cor de texto. O texto
  sobre eles é sempre `--on-signal`.
- O vermelho também aparece em bordas e na linha de intervalo, mas só
  no card em atraso crítico.
- **Erro** (toast de erro, campo inválido): tinta invertida mais o rótulo
  "Erro". Sem vermelho.
- **Ação destrutiva** ("Apagar todos os dados", "Excluir remédio",
  "Substituir tudo"): botão com contorno de tinta. Se quiser, o texto
  pode ir sublinhado. Sem vermelho. A confirmação continua existindo.
- **Estoque baixo** (insuficiente, ou 7 dias ou menos): chip de tinta
  invertida (`background: var(--ink); color: var(--paper)`) com o texto
  "Insuficiente" ou "Repor".
- **"Passou das 8h"** (1x ao dia, aviso leve): chip com contorno de
  tinta. Não é vermelho, porque não é atraso crítico.

### 3.2 Tipografia

| Papel | Família | Uso |
|---|---|---|
| Display | **Archivo** variável (eixos `wdth` 62–125 e `wght` 100–900) | Marca, horários grandes, nomes de remédio, títulos de sheet, botões |
| Texto | **Archivo** (largura normal) | Corpo, alertas, campos |
| Utilitária | **IBM Plex Mono** 400/500/600/700 | Rótulos, metadados, chips, histórico, abas, toasts |

**Obter as fontes** (formato woff2, subsets `latin` e `latin-ext`):
- Baixe o CSS do Google Fonts com um User-Agent de navegador moderno
  (assim ele devolve woff2):
  `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap`.
  Depois baixe os arquivos `.woff2` listados nos blocos `latin` e
  `latin-ext`.
- Alternativa: os pacotes `@fontsource-variable/archivo` (variante com
  eixo `wdth`) e `@fontsource/ibm-plex-mono`. Copie só os woff2. O npm
  não vira dependência do app.
- Salve em `assets/fonts/`, por exemplo `archivo-var-latin.woff2`,
  `archivo-var-latin-ext.woff2` e `plex-mono-500-latin.woff2`. Declare os
  `@font-face` no topo de `styles.css` com `unicode-range` e
  `font-display: swap`. O Archivo precisa de
  `font-stretch: 62% 125%; font-weight: 100 900;`.
- Inclua todos os arquivos de fonte no `PRECACHE` de `sw.js` e suba a
  `VERSION` (ex.: `medcontrol-v2.0.0`). Faça o mesmo com a constante
  `VERSION` em `app.js`.
- Pilhas de fallback: `'Archivo', 'Arial Narrow', system-ui, sans-serif`
  e `'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace`.
- Se o ambiente não tiver rede para baixar as fontes, **pare e reporte**.
  Não entregue o app apontando para o Google Fonts.

**Escala** (valores da maquete):

| Elemento | Especificação |
|---|---|
| Horário grande do card | Archivo 850, `font-stretch: 66%`, 66px, `tabular-nums`, caixa alta |
| Número de estoque (aba Estoque) | Archivo 850, stretch 66%, 44px |
| Marca no topo | Archivo 900, stretch 70%, 21px, `letter-spacing: .03em`, caixa alta |
| Título de sheet | Archivo 850, stretch 70%, 30px, caixa alta |
| Nome do remédio | Archivo 750, stretch 88%, 23px |
| Botão primário | Archivo 800, stretch 82%, 16px, `letter-spacing: .1em`, caixa alta |
| Texto corrido e alertas | Archivo 400/700, 14–15px, `line-height: 1.45` |
| Campo de formulário | Archivo 500, 17px |
| Rótulos e chips | Plex Mono 600, 10–11px, caixa alta, `letter-spacing: .08–.1em` |
| Dados (última dose, estoque) | Plex Mono 600, 15px, `tabular-nums` |
| Histórico: hora | Plex Mono 600, 16px |

### 3.3 Forma

- `border-radius: 2px` em tudo do app (cards, botões, chips, campos).
  Nada arredondado. Sem pílulas e sem FAB redondo.
- Linhas de 1px (`--rule`) separam seções dentro dos cards. A linha de
  topo dos dias no Histórico e da lista do Estoque é de 1px em `--ink`.
- Sem sombras, exceto o contorno extra de 2px do card crítico
  (`box-shadow: 0 0 0 2px var(--red)`).
- Campos de formulário: só sublinhado (`border-bottom: 1.5px solid var(--ink)`),
  sem caixa.
- Hachura do estado "aguardando":
  `repeating-linear-gradient(-45deg, var(--hatch) 0 1.5px, transparent 1.5px 8px), var(--paper-2)`.

### 3.4 Espaçamento

Gutter lateral de 16px. Gap de 12px entre cards e entre seções internas
do card. O padding interno dos blocos segue a maquete. Largura máxima do
app: 680px, como hoje.

### 3.5 Ícones

Conjunto próprio em SVG inline: `viewBox="0 0 24 24"`,
`stroke="currentColor"`, `stroke-width="1.5"` (o "+" usa 2),
`stroke-linecap="square"`, `fill="none"`. Use `aria-hidden="true"` no
SVG e `aria-label` no botão. Monte um `<svg>` sprite com `<symbol>` no
`index.html` e referencie com `<use href="#i-ajustes">`.

| id | Desenho | Onde |
|---|---|---|
| `i-ajustes` | duas linhas horizontais com um quadrado-cursor cada (ver maquete) | Botão de ajustes no topo |
| `i-mais` | cruz `M12 4v16M4 12h16` | Botão "+" da barra inferior |
| `i-editar` | lápis reto: diagonal com ponta quadrada | Linha do Estoque (editar remédio) |
| `i-excluir` | lixeira retangular: tampa + corpo, sem curvas | Linha do Histórico (apagar registro) |
| `i-estoque` | caixa: retângulo + linha da tampa | Se precisar de ícone de estoque |
| `i-alerta` | triângulo de cantos vivos + traço + ponto | Opcional, ao lado de "Atrasado há" |

Os botões de ícone são quadrados de 38–44px, com borda de 1px em
`--ink`, fundo transparente e `border-radius: 2px`.

### 3.6 Marca

A arte final está em `docs/redesign/marca/`. É a cápsula diagonal com
contorno de tinta, metade lima e metade tinta, separadas por um divisor.
Ela substitui o símbolo de dois retângulos da maquete.

`original-gerado.jpg` é a imagem gerada pela mesa. Os demais arquivos são
o redesenho em vetor dela (`comparacao.png` mostra os dois lado a lado).
Use **só os arquivos vetoriais e os PNGs exportados**, nunca o JPG.

| Arquivo | Destino no app | Uso |
|---|---|---|
| `simbolo.svg` | Inline no topo, ao lado de "MEDCONTROL", com 28–30px | O contorno, o divisor e a metade escura usam `currentColor` (`--ink`), então o símbolo clareia sozinho no tema escuro. A metade lima é fixa. As folgas são transparentes. Ao colar inline, remova o `style="color:…"` da raiz |
| `icon-192.png`, `icon-512.png` | `assets/` (substituem os atuais) | Manifest, `purpose: any` e `maskable`. O símbolo fica dentro do raio seguro de 80%, então o mesmo arquivo serve aos dois |
| `apple-touch-icon.png` (180) | `assets/` | `<link rel="apple-touch-icon">` |
| `selo-notificacao-96.png` | `assets/badge-96.png` | `badge` do `showNotification` em `sw.js`. Silhueta branca sobre fundo transparente; o Android pinta de uma cor só |
| `icon-1024.png`, `icone.svg`, `simbolo-1024.png`, `selo-notificacao.svg` | Ficam na pasta de marca | Matrizes para lojas, materiais e reexportação |

- Inclua os novos arquivos de `assets/` no `PRECACHE` de `sw.js`.
- O ícone das notificações locais (`new Notification`) e do push continua
  sendo `assets/icon-192.png`.
- `theme-color` (meta e manifest): `#EFEBE3`. `background_color`:
  `#EFEBE3`. Mantenha `apple-mobile-web-app-status-bar-style`, mas troque
  para `default`, porque o fundo agora é claro.
- Para o tema escuro, acrescente uma segunda meta:
  `<meta name="theme-color" content="#121210" media="(prefers-color-scheme: dark)">`.

---

## 4. Mapeamento de estados: `computeStatus` → visual

A maquete tem só 3 estados. O app real tem mais nuances. Use esta tabela.
`computeStatus` **não muda**.

| Condição (`status`) | Estado visual | Rótulo (chip) | Horário grande | Lateral (chip) | Linha de intervalo |
|---|---|---|---|---|---|
| `atrasoCritico` | `crit` | "Atrasado há" | horas de `atrasoMs` (ex.: `34H`); abaixo de 1h, minutos (`45MIN`) | "Desde {dia hora}" | cheia, vermelha |
| `podeTomar && !ultimaTomada` | `ok` | "Liberado" | `AGORA` | "Primeira dose" | cheia |
| `podeTomar` | `ok` | "Liberado" | `AGORA` | "Desde {hora de liberação}" | cheia |
| `!podeTomar` | `wait` | "Faltam" | `H:MM` restante (`restanteMs`, arredondado para cima) | "Libera às {hora}" | `1 - restante / intervalo` |

Modificador `atrasado` (1x ao dia, passou das 8h sem a dose do dia, sem
ser crítico): acrescente um chip "Passou das 8h" (contorno de tinta) na
linha de metadados do card, em qualquer estado. Ele não muda a cor nem o
estado.

- Intervalo da linha para remédios de 1x ao dia: use os 12h de segurança
  (`INTERVALO_SEGURANCA_1X_DIA_MS`) como denominador.
- `{dia hora}` segue `formatDiaHora`: "Hoje, 09:13", "Ontem, 23:37" ou a
  data. Na maquete aparece abreviado. No app, use o helper existente.
- Na linha de metadados abaixo do nome (Plex Mono, caixa alta):
  `{dose} · {comprimidos} comp · a cada {N}h`, ou
  `{dose} · {comprimidos} comp · 1x ao dia · ref. 8h`.
- Bloco de dados do card (duas colunas): **Última dose**
  (`formatDiaHora`, ou "Nenhuma") e **Estoque** (número + "comp.", mais o
  chip "Insuficiente" quando `estoque < comprimidosPorDose`).
- No estado `crit`, mostre abaixo do bloco grande o texto de alerta atual,
  sem o símbolo ⚠: **"Mais de 24h sem tomar {nome}."** seguido de "Ficar
  tanto tempo sem essa dose pode ter consequências negativas à sua saúde.
  Tome assim que possível ou busque orientação médica."

---

## 5. Telas e componentes

Siga a maquete para medidas. O que vem abaixo é o que ela não cobre ou
o que difere no app real.

### 5.1 Estrutura geral
- **Topo:** marca à esquerda. À direita, data e hora em Plex Mono
  (`TER 13 OUT · 14:32`, com a hora no rolete, movimento 02) e o botão de
  ajustes. Linha de 1px embaixo.
- **Barra inferior fixa** (substitui as abas do topo e o FAB):
  - Três abas em texto ("Remédios", "Estoque", "Histórico"), com um traço
    de 3px em tinta sobre a aba ativa.
  - À direita, um botão quadrado de 60px em tinta com o ícone "+".
  - Respeita `env(safe-area-inset-bottom)`.
  - O "+" aparece em todas as abas.
  - O `body` reserva altura para a barra, para nenhum conteúdo ficar
    escondido atrás dela. Isso corrige o bug atual do FAB cobrindo o
    alerta.
- Acima da lista: cabeçalho em Plex Mono com o nome da seção à esquerda
  e um resumo à direita (ex.: "3 cadastrados · **1 atrasado**").

### 5.2 Card de remédio
Anatomia de cima para baixo:
1. Linha de intervalo (3px).
2. Fita de advertência (só no estado `crit`).
3. Nome (um botão que abre a edição) e linha de metadados.
4. Bloco grande com 3 camadas: base (lima, ou vermelho no crítico),
   hachura e conteúdo, mais o carimbo por cima.
5. Alerta (só no crítico).
6. Dados (última dose / estoque).
7. Ação: "Tomei agora" (`ok` e `crit`) ou "Segure para antecipar a dose"
   (`wait`).

O bloco de **Estoque** dentro do card é um botão: tocar abre o ajuste
rápido de estoque. Deixe-o com cara de clicável: rótulo sublinhado ou um
chevron SVG pequeno.

### 5.3 Aba Estoque
Lista em ordem alfabética. Cada linha tem:
- Nome e dose por comprimido.
- O número de estoque grande à direita, com "comp.".
- A duração (`formatDiasRestantes`, em caixa alta), com o chip "Repor"
  quando faltam 7 dias ou menos, ou "Esgotado".

Toque na linha → ajuste de estoque. Botão de ícone `i-editar` → editar
remédio.

### 5.4 Aba Histórico
Livro-registro:
- Separador por dia: "Hoje · Ter 13 Out", em Plex Mono caixa alta, com
  linha de tinta embaixo.
- Cada linha mostra a hora (Plex Mono 16px) à esquerda, o nome e
  "dose · comprimidos" à direita, e o chip "Antes da hora" quando
  `forcado`. A palavra "forçado" sai.
- Linhas separadas por linha tracejada em `--rule`.
- Botão `i-excluir` à direita, com a confirmação atual.

### 5.5 Sheets (cadastro/edição, ajuste de estoque, ajustes, importação, confirmação)
- Fundo `--surface`, borda superior de 3px em tinta e título em display
  caixa alta.
- Campos só com sublinhado, rótulos em Plex Mono.
- Dois botões lado a lado: secundário com contorno e primário em tinta.
- **Edição:** o link "Excluir este remédio" (Plex Mono, sublinhado,
  `--ink-2`) fica acima dos botões e chama o `removerMedicamento` atual,
  com a confirmação. No cadastro novo ele não aparece.
- **Ajuste de estoque:** stepper com botões quadrados "−" / "+" (SVG) e o
  número grande no centro, em display 44px.
- **Ajustes:**
  - Títulos de seção em Plex Mono.
  - A "Zona de risco" perde o vermelho: botão com contorno, mantendo a
    confirmação.
  - O texto do push que cita `server/README.md` continua, com `<code>` em
    Plex Mono.
- **Confirmação genérica** (`confirmDialog`): mesmo visual. O parâmetro
  `danger` passa a só trocar o texto do botão. Não pinta nada de
  vermelho.

### 5.6 Avisos (toast)
- Tira de largura total ejetada do topo da tela, em tinta com texto
  papel, Plex Mono caixa alta 12px e borda inferior tracejada de 2px.
- Erro: mesma tira, com um chip "Erro" à esquerda. Fica 7s, como hoje.
- Um aviso por vez: um novo substitui o anterior.

### 5.7 Telas vazias (sem emoji)
- Só tipografia: uma frase grande em display ("Nenhum remédio ainda"),
  uma linha de apoio em Plex Mono e um botão primário "Adicionar remédio"
  que abre o cadastro.
- Pode haver um contorno tracejado com a forma de um card, para indicar
  onde o card vai aparecer.

### 5.8 Banner de atualização e painel de resgate
- **Banner "Nova versão disponível":** mesmo estilo do toast, só que
  fixo acima da barra inferior.
- **Painel de resgate:** fundo papel, texto tinta, botão primário em
  tinta.

---

## 6. Mudanças de comportamento

### 6.1 Ordenação por urgência
`crit` primeiro (maior atraso no topo), depois `ok` (ordem alfabética),
depois `wait` (menor tempo restante no topo). Aplica-se só à aba
Remédios.

### 6.2 Segurar para antecipar (substitui o confirm)
- Quando `!podeTomar`, o botão do card é "Segure para antecipar a dose".
- Segurar por **1500ms** chama `tomarMedicamento(id, true)`.
- Soltar antes faz o preenchimento voltar 3 vezes mais rápido.
- O texto que o `confirmDialog` mostrava ("Você tomou X há Y...") vira
  contexto visível no card enquanto ele está em `wait`, numa linha em
  Plex Mono abaixo dos dados: "Última dose há 3 h 12 min · intervalo de
  8h" ou "· intervalo mínimo de 12h" para 1x ao dia. Assim a informação
  de segurança não se perde.
- Suporte a teclado: Espaço/Enter pressionado conta como segurar.
  Ignore `e.repeat`.
- `aria-label`: "Segure por um segundo e meio para registrar a dose antes
  da hora".
- Bloqueie o menu de contexto do toque longo e aplique
  `user-select: none` no botão.
- A chamada direta `tomarMedicamento(id)` sem `forcado` continua
  protegida pelo `confirmDialog` atual, caso algum outro caminho a chame.

### 6.3 Editar, excluir e estoque
- O card perde os botões ✎, 🗑 e 📦.
- **Editar:** tocar no nome. **Excluir:** dentro da sheet de edição.
- **Ajustar estoque:** tocar no bloco de estoque do card, ou na linha da
  aba Estoque.

---

## 7. Sistema de movimento

### 7.1 Tokens

```css
:root {
  --ease-std:   cubic-bezier(0.2, 0, 0, 1);    /* padrão */
  --ease-stamp: cubic-bezier(0.3, 1.4, 0.5, 1); /* só o carimbo */
  --ease-heavy: cubic-bezier(0.7, 0, 0.2, 1);  /* só a liberação */
  --ease-exit:  cubic-bezier(0.4, 0, 1, 1);    /* saídas */
}
```

- Escala de duração permitida: **80, 200, 240, 280, 320, 600ms**, além de
  1000ms linear (linha de intervalo) e 1500ms linear (segurar).
- Propriedades animáveis: **só** `transform` (e `translate`, `rotate`,
  `scale`), `opacity` e `clip-path`. A exceção é `color` e
  `background-color` em transições de estado.

### 7.2 Os oito movimentos

| # | Movimento | Gatilho | Implementação | Movimento reduzido |
|---|---|---|---|---|
| 01 | Linha de intervalo | Cada render | `transform: scaleX(p)`, `transform-origin: left`, `transition: transform 1000ms linear` | Sem transição |
| 02 | Dígitos de painel | Texto do horário grande, do estoque ou do relógio do topo mudou | Rolete por caractere: só o que mudou anima. O antigo sai `translateY(0 → -105%)` e o novo entra `105% → 0`, 280ms `--ease-std`, com 30ms de atraso entre dígitos alterados | Troca direta + `opacity .25 → 1`, 160ms |
| 03 | Liberação | Estado `wait` → `ok`/`crit` | Hachura `translateX(0 → 101%)`, 600ms `--ease-heavy` (transição CSS ligada à classe de estado). Cor do conteúdo vai para `--on-signal` em 600ms. O horário rola para `AGORA` (02). O botão troca com fade de 200ms. Na volta `ok` → `wait`, a hachura entra em 320ms `--ease-std` | Troca direta + fade do conteúdo |
| 04 | Carimbo | "Tomei agora" ou fim do segurar | 1) O botão afunda 2px em 80ms. 2) Carimbo `TOMADO · HH:MM` sobre o bloco grande: `rotate(-4deg) scale(1.15) → scale(1)`, opacidade `0 → 1`, 260ms `--ease-stamp`, 80ms de atraso. 3) Opacidade `1 → .85` em 600ms ("tinta absorve"). 4) Card desce 1px e volta (140ms). 5) `navigator.vibrate(12)` dentro de try/catch. 6) Cerca de 1100ms depois, o card passa a `wait`, o carimbo some (300ms `--ease-exit`) e acontece a reordenação (07) | Carimbo aparece já assentado (fade de 120ms) e não há vibração |
| 05 | Segurar para confirmar | Pressionar o botão `wait` | Camada de preenchimento em tinta, com o mesmo texto em `--paper`, animando `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)`, 1500ms linear. Ao soltar, `playbackRate = -3`. Ao terminar com `playbackRate > 0`, registra a dose | Mesmo comportamento (é feedback da ação, não decoração) |
| 06 | Fita de advertência | Estado `crit` | Faixa de 28px em `--red`, com o texto "Atrasado há Xh · Mais de 24h sem tomar {nome} ·" repetido em duas metades iguais. `@keyframes { to { transform: translateX(-50%) } }`, linear infinito, com duração calculada para **40px/s** (`metade_da_largura / 40` s). **Único loop do app** | Fita parada |
| 07 | Reordenação | A ordem dos cards mudou | FLIP: mede o `top` de cada card, reordena o DOM, aplica `translateY(delta) → 0` em 320ms `--ease-std`. Depois de uma liberação, espere 700ms (o fim do 03) antes de reordenar | Reordena e faz fade `.4 → 1` em 200ms |
| 08 | Impressora | Dose registrada | O estoque do card rola para o novo valor (02). Na próxima abertura do Histórico, a linha nova se revela com `clip-path: inset(0 0 100% 0) → inset(0)` em 240ms, e as linhas abaixo descem com `translateY(-altura) → 0` no mesmo tempo. Marque o registro como "fresco" em memória (não persista) | Sem animação |

### 7.3 Interface

| Elemento | Especificação | Reduzido |
|---|---|---|
| Traço da aba | `transform` + `width`, 320ms `--ease-std` | Instantâneo |
| Conteúdo da aba | `opacity 0 → 1` + `translateY(8px → 0)`, 200ms | Fade de 120ms |
| Sheet: entrada | Scrim com fade de 200ms. Painel `translateY(100% → 0)`, 320ms `--ease-std` | Fade de 120ms |
| Sheet: saída | Painel `0 → 100%`, 200ms `--ease-exit`. Esconde no `onfinish` | Instantâneo |
| Toast | Entra com `translateY(-100% → 0)`, 200ms `--ease-std`. Fica 2,4s (7s se for erro). Sai com o inverso, 200ms `--ease-exit` | Fade |
| Abertura do app | Cards entram com `opacity 0 → 1` + `translateY(12px → 0)`, 320ms e 40ms de intervalo, **uma vez por carregamento**, com `fill: 'backwards'` (o estado final em repouso é sempre visível) | Sem animação |

### 7.4 Regras do sistema
- Cheque `matchMedia('(prefers-reduced-motion: reduce)')` em tempo de
  execução (não só no CSS) e escute o `change`.
- No CSS: `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0s !important } .fita { animation: none } }`.
- Nada anima na primeira pintura nem em renders sem mudança de estado.
  Use uma classe `.no-tr` na montagem inicial e retire depois de 2 frames
  (`requestAnimationFrame`).
- O render periódico (`setInterval(render, 15000)`) continua, mas **não
  pode recriar os cards** (seção 8).

---

## 8. Arquitetura de renderização

O `renderMedicamentos` atual zera a lista com `innerHTML = ''` a cada 15s.
Isso mata qualquer animação de transição. Mude para:

- **Cards persistentes por id:** um `Map<medId, HTMLElement>`.
  - Cria o card quando aparece um remédio novo.
  - Remove quando o remédio é excluído (com fade de 200ms).
  - Fora isso, **atualiza no lugar**.
- `updateCard(med, status, { animate })` guarda o estado anterior em
  `card.dataset.estado` e decide as transições (03, 07).
- Os textos que rolam passam por `roll(el, texto, animate)`. O rolete
  guarda o texto anterior e só anima os caracteres que mudaram.
- O botão de ação só é recriado quando o tipo muda (`take` ↔ `hold`),
  para não interromper um "segurar" em andamento a cada render.
- Um card com animação de carimbo em andamento (`card.busy`) é pulado
  pelo render periódico até terminar.
- `escapeHTML`: continue usando `textContent` para dados do usuário,
  como hoje. Nunca interpole nome ou dose em `innerHTML`.

Novo módulo **`js/motion.js`**, exportando:
- `prefersReduced()`.
- `roll(el, text, animate)`.
- `flip(container, orderedEls, animate)`.
- `stamp(card, hora)`.
- `holdToConfirm(button, onConfirm)`.
- `enter(el)` / `exit(el)` para sheets e toasts.
- As constantes de curva e duração.

A maquete (`docs/redesign/maquete.html`, bloco `<script>`) tem versões
funcionais de `roll`, `reorder` (FLIP), `take` (carimbo) e `setAction`
(segurar). Use como ponto de partida e adapte aos dados reais.

## 9. Acessibilidade

- Contraste AA em todas as combinações, nos dois temas. Os pares da
  paleta já foram escolhidos para isso; não crie novos sem checar.
- O rolete precisa de `aria-label` com o texto completo no elemento-pai e
  `aria-hidden` nos caracteres.
- Toasts num contêiner `aria-live="polite"`.
- Botões só com ícone: `aria-label`.
- Sheets: foco vai para o primeiro campo ou o título ao abrir, e volta ao
  gatilho ao fechar. `Esc` fecha.
- Foco visível: `outline: 2px solid var(--ink); outline-offset: 2px`. Nos
  blocos lima ou vermelho, use `--on-signal`.
- Abas com `role="tablist"`, `role="tab"` e `aria-selected`.

## 10. Inventário de emojis a remover

Saída de `LC_ALL=C.UTF-8 grep -rnP '[\x{2300}-\x{2BFF}\x{1F000}-\x{1FAFF}\x{FE0F}]'`
no estado atual:

| Arquivo:linha | Hoje | Substituir por |
|---|---|---|
| `index.html:56` | ⚙ | SVG `i-ajustes` |
| `index.html:68, 77, 86` | 💊 📦 🗒️ nas telas vazias | Tela vazia tipográfica (5.7) |
| `js/app.js:184–185` | ✎ 🗑 no card | Removidos (6.3) |
| `js/app.js:200, 203, 231` | ⚠ nos textos de status e alerta | Texto puro + estado visual (seção 4) |
| `js/app.js:247` | 📦 no card | Bloco de estoque clicável (5.2) |
| `js/app.js:287–288` | ✎ 📦 na aba Estoque | SVG `i-editar`. A linha inteira abre o estoque |
| `js/app.js:317` | 🗑 no Histórico | SVG `i-excluir` |
| `README.md:39, 40, 46, 57, 84` | 🟢 🔴 ⚠ 📦 | Texto descrevendo o novo visual ("bloco lima", "hachura", etc.) |
| `server/README.md:122` | ⚙ | "Ajustes" |

Os caracteres "−" e "+" do stepper também viram SVG.

## 11. Ordem de execução sugerida

Um commit por etapa, cada uma deixando o app funcional:

1. **Fundação:** fontes locais + `@font-face` + precache. Tokens de cor e
   de movimento. Reset tipográfico. `VERSION` nova.
2. **Estrutura:** barra inferior, topo novo, sprite de ícones, telas
   vazias, remoção de todos os emojis.
3. **Card e renderização:** card novo com o mapeamento de estados
   (seção 4), cards persistentes por id, ordenação por urgência, edição
   e exclusão movidas.
4. **Estoque, Histórico, sheets, toasts, banner, resgate.**
5. **Movimento:** `motion.js` e os movimentos 01–08 + interface,
   com movimento reduzido.
6. **Marca:** arquivos de `docs/redesign/marca/` instalados (3.6), manifest e metas de cor, READMEs.
7. **Verificação** (seção 12).

## 12. Critérios de aceite

- [ ] O grep da seção 10 em `index.html js css sw.js manifest.webmanifest README.md server/README.md` não retorna nada.
- [ ] Nenhuma requisição de rede para fora da origem com o app carregado.
      Conferir em DevTools ou com Playwright registrando `request`.
- [ ] O app abre e funciona offline depois da primeira visita, com as
      fontes corretas (não as do fallback).
- [ ] Screenshots em 390×844, nos temas claro e escuro, com os 3 estados
      na tela (crítico, liberado, aguardando) e um remédio de 1x ao dia
      depois das 8h. Comparar com a maquete.
- [ ] Os 8 movimentos e os 4 de interface funcionam no app real. O
      movimento reduzido (emulado pelo Playwright com
      `reducedMotion: 'reduce'`) remove deslocamento, loop e escala.
- [ ] Segurar para antecipar: soltar antes de 1,5s não registra nada;
      segurar até o fim registra com `forcado: true`; teclado funciona.
- [ ] Remédio sem dose registrada aparece como "Liberado · Primeira dose".
- [ ] O render a cada 15s não reinicia animações nem um "segurar" em
      andamento.
- [ ] Backup, importação, notificações, push e `#/reset` continuam
      funcionando exatamente como antes.
- [ ] Nenhum conteúdo fica atrás da barra inferior, com até 6 remédios
      cadastrados.
- [ ] Vermelho só aparece em card com atraso crítico.

## 13. Pendências externas

Nenhuma. A arte da marca foi entregue e vetorizada (seção 3.6).
