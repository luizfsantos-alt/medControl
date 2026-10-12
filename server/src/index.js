import { buildPushPayload } from '@block65/webcrypto-web-push';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-medcontrol-key',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders() },
  });
}

function autorizado(request, env) {
  // APP_SECRET não configurado = endpoint aberto (mais simples, menos seguro).
  if (!env.APP_SECRET) return true;
  return request.headers.get('x-medcontrol-key') === env.APP_SECRET;
}

function assinaturaValida(sub) {
  return Boolean(
    sub &&
      typeof sub.endpoint === 'string' &&
      sub.endpoint.startsWith('https://') &&
      sub.keys &&
      typeof sub.keys.p256dh === 'string' &&
      typeof sub.keys.auth === 'string',
  );
}

async function handleSubscribe(request, env) {
  if (!autorizado(request, env)) return json({ error: 'não autorizado' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  if (!assinaturaValida(body)) return json({ error: 'inscrição inválida' }, 400);

  await env.SUBSCRIPTIONS.put(body.endpoint, JSON.stringify(body));
  return json({ ok: true }, 201);
}

async function handleUnsubscribe(request, env) {
  if (!autorizado(request, env)) return json({ error: 'não autorizado' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  if (typeof body.endpoint !== 'string') return json({ error: 'endpoint inválido' }, 400);

  await env.SUBSCRIPTIONS.delete(body.endpoint);
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method === 'POST' && url.pathname === '/subscribe') {
      return handleSubscribe(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/unsubscribe') {
      return handleUnsubscribe(request, env);
    }
    return json({ app: 'medcontrol-push', ok: true });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(enviarLembretes(env));
  },
};

async function enviarLembretes(env) {
  const vapid = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };

  const message = {
    data: JSON.stringify({
      title: 'MedControl',
      body: 'Lembrete diário: confira e registre os remédios de hoje.',
    }),
    options: { ttl: 3600 },
  };

  let cursor;
  let done = false;

  while (!done) {
    const pagina = await env.SUBSCRIPTIONS.list({ cursor });
    cursor = pagina.cursor;
    done = pagina.list_complete;

    await Promise.all(
      pagina.keys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return;

        let subscription;
        try {
          subscription = JSON.parse(raw);
        } catch {
          await env.SUBSCRIPTIONS.delete(name);
          return;
        }

        try {
          const payload = await buildPushPayload(message, subscription, vapid);
          const res = await fetch(subscription.endpoint, payload);
          // 404/410: o navegador cancelou essa inscrição do lado dele.
          if (res.status === 404 || res.status === 410) {
            await env.SUBSCRIPTIONS.delete(name);
          }
        } catch {
          // falha pontual de rede: tenta de novo amanhã, não apaga a inscrição
        }
      }),
    );
  }
}
