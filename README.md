# MedControl

Registro de uso de remédios diários. PWA instalável, **funciona 100% offline**,
sem back-end, sem conta e sem nenhuma dependência externa em tempo de execução.

O objetivo é simples e concreto: nunca deixar passar um remédio e nunca tomar a
mesma dose duas vezes por esquecimento.

---

## Começando

Não há build step: os arquivos **são** o app. Ele precisa ser servido por HTTP
— abrir `index.html` com duplo clique (`file://`) não funciona, porque módulos
ES e service workers exigem `https://` ou `localhost`.

```bash
git clone https://github.com/luizfsantos-alt/medcontrol.git
cd medcontrol
python3 -m http.server 8000
# abra http://localhost:8000
```

Qualquer servidor estático serve: `npx serve`, `php -S localhost:8000`, nginx.

**Instalar no celular:** abra a URL publicada no Chrome (Android) ou Safari
(iOS) e use "Adicionar à tela de início".

---

## O que o app faz

**Cadastro de remédio.** Nome, dose (ex.: `50mg`), quantos comprimidos tem
essa dose (aceita meios comprimidos, ex.: `1,5`), o intervalo mínimo entre
doses em horas (ex.: `8`) e o estoque atual de comprimidos.

**Tela principal.** Um card por remédio, com o status:

- 🟢 **Pode tomar** — nenhuma dose registrada ainda, ou o intervalo já passou.
- 🔴 **Próxima às HH:MM** — ainda dentro do intervalo, com o tempo restante e
  o horário da última dose.

**Alerta de dose muito atrasada.** Mais grave que tomar cedo demais é ficar
mais de 24h sem tomar. Passado esse limite (contado a partir do momento em
que a dose ficou disponível, não do horário da última dose), o status vira
vermelho — "⚠ Atrasado há Xh" — e um aviso explícito aparece no card
avisando que isso pode ter consequências negativas à saúde.

**Remédios de 1x ao dia.** Cadastrar um remédio com intervalo de **24h**
muda o comportamento do card: em vez de contar a partir da última dose, o
app passa a considerar **8h** como o horário de referência da dose diária.

- Libera para tomar quando já tiverem passado **12h desde a última dose**
  — vale tanto antes quanto depois das 8h (quem toma cedo não fica
  bloqueado até o dia seguinte).
- Depois das 8h, se a dose do dia ainda não foi registrada, o card mostra
  **"⚠ Atrasado — passou das 8h"**. É só aviso: se já tiver passado das
  12h de segurança, o botão continua liberado direto.
- Se passar das 8h **e** ainda não tiverem completado 12h desde a última
  dose, o botão vira "Registrar mesmo assim" com confirmação — mesma
  barreira contra dose duplicada, só que medida pelas 12h em vez do
  intervalo cadastrado.
- O tempo desde a última dose continua aparecendo no card, mas só como
  referência — quem decide o status agora são as 8h e as 12h.
- O alerta de 24h acima continua valendo do mesmo jeito, contado a partir
  da última dose registrada.

**"Tomei agora"** registra a dose na hora. Se o remédio ainda estiver dentro
do intervalo, o botão vira **"Registrar mesmo assim"** e pede confirmação
explícita antes de gravar — é a barreira contra dose duplicada por
esquecimento, mas sem travar quem realmente precisa registrar fora do padrão
(orientação médica pontual, por exemplo).

**Histórico.** Toda dose registrada, com data/hora e um aviso quando foi
"forçada" (registrada dentro do intervalo). Dá para apagar um registro
errado — a próxima dose permitida é recalculada a partir do que sobrar, e os
comprimidos daquela dose voltam para o estoque.

**Estoque.** Cada dose registrada desconta automaticamente do estoque a
quantidade de comprimidos daquela dose. Um aviso aparece quando o estoque não
é mais suficiente para a próxima dose. O estoque pode ser corrigido de duas
formas — o que for mais rápido no momento:

- **Ajuste rápido** — o ícone 📦 no card abre um ajuste com botões `+`/`−`
  (de meio em meio comprimido) e um campo numérico para digitar o valor
  exato, sem precisar abrir o formulário inteiro.
- **Editar remédio** — o mesmo formulário de cadastro também atualiza o
  estoque, junto com nome, dose e intervalo.

**Aba Estoque.** Uma terceira aba lista todos os remédios cadastrados com o
estoque atual, um ao lado do outro — os mesmos remédios da aba Remédios,
sem lista separada. Dá para ajustar o estoque (rápido ou pelo formulário
completo) direto dali. Cada linha também mostra **para quantos dias o
estoque atual dá** (estoque ÷ consumo diário, calculado a partir do
intervalo entre doses e dos comprimidos por dose), com aviso quando restam
7 dias ou menos.

**Backup.** Dado de saúde não pode se perder. Em Ajustes:

- **Exportar backup** gera um `medcontrol-backup-AAAA-MM-DD.json`;
- **Importar backup** oferece **Juntar** (mantém o que já existe e só
  acrescenta o que falta) ou **Substituir tudo**.

**Avisos.** Em Ajustes, "Ativar avisos de horário" pede permissão de
notificação do navegador e avisa quando um remédio bloqueado é liberado —
funciona enquanto o app está aberto.

**Lembrete diário às 8h.** Diferente do aviso acima, esse chega **mesmo com
o app fechado** — porque usa Web Push de verdade, através de um servidor
próprio (`server/`, um Cloudflare Worker gratuito). É a única parte do
projeto que depende de algo fora do aparelho: o servidor guarda só a
inscrição de push (um endpoint técnico do navegador), nunca remédios, dose
ou histórico — esses continuam só no `localStorage`. Veja
[`server/README.md`](server/README.md) para publicar o seu e ativar em
Ajustes → "Lembrete diário (8h)".

---

## Seus dados

Tudo fica em `localStorage`, só no aparelho, em duas chaves:

| Chave | Conteúdo |
|---|---|
| `medcontrol_data_v1` | remédios cadastrados e histórico de doses |
| `medcontrol_data_backup` | a última versão íntegra, promovida a cada gravação |

Se `medcontrol_data_v1` estiver corrompido, o app cai automaticamente para o
backup na próxima abertura.

**Saída de emergência:** `.../index.html#/reset` limpa cache, service worker e
os dados do app — use abrindo a URL diretamente (num link ou digitando no
navegador), não editando a hash de uma aba já aberta.

---

## Estrutura do projeto

```
index.html              shell da aplicação + resgate de emergência
manifest.webmanifest    identidade do PWA
sw.js                   service worker: network-first no código, cache nos assets
css/
  styles.css            estilos, safe-area, animações
js/
  app.js                lógica da aplicação: telas, remédios, histórico, backup
  state.js              persistência, backup automático, exportar/importar
  ui.js                 toasts e modal de confirmação
  util.js               formatação de data/hora e duração
assets/                 ícones PWA
server/                 Worker opcional que manda o lembrete das 8h (Web Push)
```

---

## Decisões de projeto

**Sem framework, sem CDN.** Mesma filosofia do [NERv2](https://github.com/luizfsantos-alt/nerv):
nada pode depender da rede em tempo de execução.

**Confirmação em vez de bloqueio.** A barreira contra dose duplicada é um
passo extra de confirmação, não um bloqueio absoluto — porque só quem está
tomando o remédio sabe se aquele caso é uma exceção legítima.

**Intervalo, não horário fixo.** A próxima dose permitida é calculada a
partir da última dose registrada, não de horários fixos do dia — assim o
controle se ajusta sozinho quando uma dose atrasa ou adianta.

**O servidor de push é opcional e isolado.** Notificação exata às 8h com o
app fechado não é possível só com HTML/JS estático — exige algo escutando
num horário fixo, o que por definição é um servidor. Para não contradizer o
"sem back-end" do resto do projeto, esse servidor fica fora do app (pasta
`server/`, deploy separado), não guarda nenhum dado de saúde e é inteiro
opcional: sem ele, o app continua 100% funcional, só sem o lembrete das 8h.

---

## Publicar

Qualquer host estático. No GitHub Pages: *Settings → Pages → Deploy from
branch*, escolha a branch e a raiz (`/`). Todos os caminhos do projeto são
relativos (`./`), então funciona tanto na raiz de um domínio quanto num
subdiretório.

---

## Privacidade

Não há servidor, conta, analytics ou requisição de rede em tempo de execução.
Os únicos dados que saem do aparelho são os que **você** exporta, para onde
você escolher.
