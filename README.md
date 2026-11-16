# MedControl

App Android para remédios controlados tomados em intervalos fixos. O usuário
escolhe o horário da dose e o app cobra nesse horário: mostra se cada dose
foi **Tomado** ou **Não tomado**, impede dose repetida e acompanha a
**sequência** de dias sem nenhuma dose perdida.

- Regras: [`docs/spec.md`](docs/spec.md) (fonte da verdade).
- Visual e movimento: [`docs/redesign/BRIEFING.md`](docs/redesign/BRIEFING.md)
  e a maquete `docs/redesign/maquete.html`. A identidade "Rótulo de Farmácia"
  é a mesma do PWA que este app substituiu.

Tudo fica no aparelho (SQLite). Não há conta, servidor nem telemetria. A única
requisição de rede é a consulta de nova versão aos Releases do GitHub.

## Instalar no celular

1. A cada push, o GitHub Actions gera o APK (aba **Actions** → *APK Android*).
2. Baixe o `.apk` na página **Releases** do repositório, pelo celular.
3. Toque no arquivo para instalar (o Android pede para permitir instalação
   desta fonte na primeira vez).
4. Versões novas instalam por cima e mantêm os dados, porque o APK é sempre
   assinado com a mesma chave. O app avisa quando sai uma versão nova da
   branch principal.

## Desenvolvimento

```bash
npm install
npm test                  # regras: blocos, estados, barreira, sequência, avisos
npm run typecheck
npx expo start --web      # pré-visualização no navegador
```

Na pré-visualização web, `?demo` carrega dados de exemplo. Os avisos só
existem no Android.

- `src/domain/` regras puras (`regras.ts`) e datas (`tempo.ts`), com testes.
- `src/data/` banco local (SQLite; `localStorage` na web), estado e backup.
- `src/app/` telas (Expo Router).
- `src/ui/` componentes, tema e movimento (Reanimated).
- `src/notifications/` agendamento dos avisos.
- `assets/fonts/static/` instâncias estáticas do Archivo (larguras 66, 70, 82,
  88 e 100) e do IBM Plex Mono. O React Native não lê os eixos da fonte
  variável, então as instâncias são geradas com `fonttools` a partir dos
  `.woff2` em `assets/fonts/`.

### Assinatura do APK

Sem configuração, o APK sai com a chave de desenvolvimento do modelo Expo,
que é a mesma em todos os builds. Para usar uma chave própria, crie os
segredos `ANDROID_KEYSTORE_BASE64` (o `.keystore` em base64, alias
`medcontrol`) e `ANDROID_KEYSTORE_PASSWORD` em *Settings → Secrets and
variables → Actions*. Trocar de chave exige desinstalar o app uma vez, então
exporte o backup antes.

```bash
keytool -genkeypair -v -keystore medcontrol.keystore -alias medcontrol \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 medcontrol.keystore   # valor de ANDROID_KEYSTORE_BASE64
```

## Avisos

O app agenda no próprio aparelho, refeitos a cada mudança e a cada abertura:

- **Hora de tomar**, no horário de cada dose (remédios com o mesmo horário
  saem num aviso só);
- **Dose não tomada**, quando uma dose termina sem registro.

Alguns fabricantes (Xiaomi, Samsung e outros) atrasam avisos para economizar
bateria. Se os avisos chegarem atrasados, desative a otimização de bateria
para o MedControl.
