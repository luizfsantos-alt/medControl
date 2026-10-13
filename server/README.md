# medcontrol-push

Servidor mínimo (Cloudflare Worker) só para uma coisa: todo dia às 8h
(horário de Brasília), mandar uma notificação push lembrando de registrar
os remédios — mesmo com o app fechado.

**O que ele guarda:** só a inscrição de push do navegador (um endpoint e
duas chaves públicas, nada que identifique pessoalmente). **Nunca** recebe
nome de remédio, dose, histórico ou qualquer dado de saúde — isso continua
só no `localStorage` do aparelho, como o app principal sempre funcionou.

Grátis no plano gratuito da Cloudflare (bem acima do que esse uso gera).

---

## 1. Pré-requisitos

- Conta Cloudflare gratuita: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
- Node.js instalado na sua máquina (pra rodar o `npx wrangler`)

## 2. Instalar dependências

```bash
cd server
npm install
```

## 3. Login na Cloudflare

```bash
npx wrangler login
```
Abre o navegador para autorizar.

## 4. Criar o namespace do KV (onde ficam as inscrições)

```bash
npx wrangler kv namespace create SUBSCRIPTIONS
```

O comando imprime algo como:

```
[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "a1b2c3d4..."
```

Copie o `id` e cole no lugar de `COLE_AQUI_O_ID_DO_NAMESPACE` em
`wrangler.toml`.

## 5. Gerar e configurar os segredos

Gere seu próprio par de chaves VAPID (não reutilize as de ninguém — são
assinatura, não login, mas ainda assim são suas):

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pubJwk = publicKey.export({ format: 'jwk' });
const privJwk = privateKey.export({ format: 'jwk' });
function pad32(b64url) {
  let buf = Buffer.from(b64url, 'base64url');
  if (buf.length < 32) buf = Buffer.concat([Buffer.alloc(32 - buf.length), buf]);
  return buf;
}
const rawPub = Buffer.concat([Buffer.from([0x04]), pad32(pubJwk.x), pad32(pubJwk.y)]);
console.log('VAPID_PUBLIC_KEY=' + rawPub.toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + pad32(privJwk.d).toString('base64url'));
"
```

Cole o `VAPID_PUBLIC_KEY` que saiu no lugar do valor de exemplo em
`[vars]`, em `wrangler.toml` (não é segredo, pode ficar commitado — é
exatamente o que vai junto no JS do app também, em `js/app.js`, na
constante `VAPID_PUBLIC_KEY`; atualize os dois juntos).

Depois, configure os segredos (esses **não** vão pro `wrangler.toml` nem
pro git — ficam só na Cloudflare):

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
# cole o VAPID_PRIVATE_KEY que o comando acima gerou

npx wrangler secret put VAPID_SUBJECT
# cole: mailto:SEU-EMAIL@exemplo.com

npx wrangler secret put APP_SECRET
# gere um valor aleatório, por exemplo:
# node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

`VAPID_SUBJECT` é um contato (e-mail ou URL) que os serviços de push
(Google, Mozilla, Apple) podem usar se precisarem avisar sobre abuso —
é parte do protocolo VAPID, não fica visível para quem usa o app.

`APP_SECRET` é opcional — sem ele o endpoint `/subscribe` fica aberto pra
qualquer um na internet (o pior que alguém faria é poluir o KV com lixo).
Com ele, só quem souber o valor consegue se inscrever; é esse mesmo valor
que você vai colar nos Ajustes do app.

> Guarde `VAPID_PRIVATE_KEY` em um lugar seguro (um gerenciador de senhas,
> por exemplo). Se precisar gerar um par novo depois, rode o comando acima
> de novo — mas aí toda inscrição antiga para de funcionar e é preciso
> ativar de novo em cada aparelho.

## 6. Publicar

```bash
npx wrangler deploy
```

Vai aparecer uma URL assim:

```
https://medcontrol-push.SEU-SUBDOMINIO.workers.dev
```

## 7. Ligar ao app

No MedControl → Ajustes → **Lembrete diário (8h)**:

1. Cole a URL do passo 6 em "Endereço do servidor";
2. Cole o `APP_SECRET` do passo 5 (se configurou um);
3. Toque em **Ativar lembrete às 8h**.

Repita em cada aparelho/navegador onde quiser receber o lembrete — cada
um gera sua própria inscrição.

## Fuso horário

O cron em `wrangler.toml` está em UTC: `0 11 * * *` = 11h UTC = 8h em
Brasília (UTC-3, sem horário de verão desde 2019). Se for usar em outro
fuso, mude a hora no `crons` e rode `npx wrangler deploy` de novo.

## Testar sem esperar o cron

```bash
npx wrangler dev
```

Com o Worker rodando localmente, dispare o cron manualmente numa segunda
aba:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled"
```

Isso executa o mesmo código do `scheduled` e manda o push de verdade para
quem já estiver inscrito.

## Limitações conhecidas

- **iPhone:** push web só funciona em iOS 16.4+ e com o MedControl
  adicionado à Tela de Início (Safari em aba normal não recebe push).
- Um push por dia, sem conteúdo personalizado — o servidor não sabe quais
  remédios você cadastrou (de propósito, por privacidade).
