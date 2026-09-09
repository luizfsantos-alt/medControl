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

**Cadastro de remédio.** Nome, dose (ex.: `50mg`) e o intervalo mínimo entre
doses, em horas (ex.: `8`).

**Tela principal.** Um card por remédio, com o status:

- 🟢 **Pode tomar** — nenhuma dose registrada ainda, ou o intervalo já passou.
- 🔴 **Próxima às HH:MM** — ainda dentro do intervalo, com o tempo restante e
  o horário da última dose.

**"Tomei agora"** registra a dose na hora. Se o remédio ainda estiver dentro
do intervalo, o botão vira **"Registrar mesmo assim"** e pede confirmação
explícita antes de gravar — é a barreira contra dose duplicada por
esquecimento, mas sem travar quem realmente precisa registrar fora do padrão
(orientação médica pontual, por exemplo).

**Histórico.** Toda dose registrada, com data/hora e um aviso quando foi
"forçada" (registrada dentro do intervalo). Dá para apagar um registro
errado — a próxima dose permitida é recalculada a partir do que sobrar.

**Backup.** Dado de saúde não pode se perder. Em Ajustes:

- **Exportar backup** gera um `medcontrol-backup-AAAA-MM-DD.json`;
- **Importar backup** oferece **Juntar** (mantém o que já existe e só
  acrescenta o que falta) ou **Substituir tudo**.

**Avisos.** Em Ajustes, "Ativar avisos de horário" pede permissão de
notificação do navegador e avisa quando um remédio bloqueado é liberado —
funciona enquanto o app está aberto.

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
