/* =====================================================================
   PRANA push reminders — a second Cloudflare Worker.

   It stores push subscriptions (in KV) and, on an hourly cron, sends a
   "bodyless" Web Push to any subscription whose reminder hour matches the
   current UTC hour. The service worker (sw.js) shows the notification text —
   so this Worker never encrypts a payload, only signs the VAPID auth. That
   keeps it small and reliable.

   Requires (see PUSH_SETUP.md):
     - KV namespace bound as  SUBS
     - Secrets:  VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mailto:you@…)
     - A cron trigger:  0 * * * *   (hourly)
   ===================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (url.pathname === '/')          return cors(new Response('PRANA push worker OK', { status: 200 }));

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || !body.subscription || !body.subscription.endpoint) return cors(json({ error: 'bad body' }, 400));
      const hour = Math.max(0, Math.min(23, parseInt(body.hour, 10) || 19));
      const key = 'sub:' + await sha(body.subscription.endpoint);
      await env.SUBS.put(key, JSON.stringify({ subscription: body.subscription, hour }));
      return cors(json({ ok: true }));
    }
    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (body && body.endpoint) await env.SUBS.delete('sub:' + await sha(body.endpoint));
      return cors(json({ ok: true }));
    }
    return cors(new Response('Not found', { status: 404 }));
  },

  // hourly cron: notify subscriptions whose reminder hour == current UTC hour
  async scheduled(event, env, ctx) {
    const utcHour = new Date(event.scheduledTime).getUTCHours();
    const list = await env.SUBS.list({ prefix: 'sub:' });
    for (const k of list.keys) {
      const rec = JSON.parse(await env.SUBS.get(k.name) || 'null');
      if (!rec || rec.hour !== utcHour) continue;
      ctx.waitUntil(sendPush(rec.subscription, env).then(async (status) => {
        if (status === 404 || status === 410) await env.SUBS.delete(k.name); // subscription gone
      }));
    }
  },
};

async function sendPush(sub, env) {
  const endpoint = sub.endpoint;
  const aud = new URL(endpoint).origin;
  const jwt = await vapidJWT(aud, env.VAPID_SUBJECT || 'mailto:prana@example.com', env.VAPID_PRIVATE, env.VAPID_PUBLIC);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Authorization': 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC,
      'Content-Length': '0',
    },
  });
  return res.status;
}

/* ---- VAPID (ES256 JWT) signing with Web Crypto ---- */
async function vapidJWT(aud, sub, privB64, pubB64) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 12 * 3600, sub };
  const unsigned = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
  const key = await importVapidPrivate(privB64, pubB64);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return unsigned + '.' + b64urlBytes(new Uint8Array(sig));
}
async function importVapidPrivate(privB64, pubB64) {
  const d = ub64(privB64);                 // 32-byte private scalar
  const pub = ub64(pubB64);                // 65-byte uncompressed point (0x04 X Y)
  const x = pub.slice(1, 33), y = pub.slice(33, 65);
  const jwk = { kty: 'EC', crv: 'P-256', d: b64urlBytes(d), x: b64urlBytes(x), y: b64urlBytes(y), ext: true };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/* ---- helpers ---- */
function cors(res) { res.headers.set('Access-Control-Allow-Origin', '*'); res.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS'); res.headers.set('Access-Control-Allow-Headers', 'content-type'); return res; }
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } }); }
function b64url(str) { return b64urlBytes(new TextEncoder().encode(str)); }
function b64urlBytes(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function ub64(b64) { b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; const s = atob(b64); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
async function sha(str) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return b64urlBytes(new Uint8Array(h)).slice(0, 24); }
