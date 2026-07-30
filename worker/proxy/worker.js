/* =====================================================================
   PRANA fetch proxy — a tiny Cloudflare Worker.

   Why: the app imports recipes from a web link and (later) re-verifies a
   product's ingredient list by reading the source page. Browsers block those
   cross-origin reads (CORS), so today the app leans on free public proxies
   (allorigins / corsproxy / thingproxy) that rate-limit and go down. This
   Worker is your OWN reliable proxy: it fetches a public URL server-side and
   returns the text with permissive CORS.

   It holds no secrets and stores nothing. Deploy: see WORKER_SETUP.md.
   Free tier (100k requests/day) is far more than personal use needs.
   ===================================================================== */

const ALLOW_ORIGIN = '*'; // optional: set to your site origin, e.g. 'https://sam-m9.github.io'

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (url.pathname === '/')      return cors(new Response('PRANA fetch proxy OK', { status: 200 }));
    if (url.pathname !== '/fetch') return cors(new Response('Not found', { status: 404 }));

    const target = url.searchParams.get('url');
    if (!target) return cors(json({ error: 'missing url' }, 400));

    let t;
    try { t = new URL(target); } catch { return cors(json({ error: 'bad url' }, 400)); }
    if (t.protocol !== 'https:' && t.protocol !== 'http:') return cors(json({ error: 'unsupported scheme' }, 400));
    if (isPrivateHost(t.hostname)) return cors(json({ error: 'blocked host' }, 400)); // SSRF guard

    try {
      const res = await fetch(t.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (PRANA recipe importer)', 'Accept': 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      const body = await res.text();
      return cors(new Response(body.slice(0, 2_000_000), {
        status: res.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }));
    } catch (e) {
      return cors(json({ error: 'fetch failed', detail: String(e) }, 502));
    }
  },
};

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', '*');
  return res;
}
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
}
function isPrivateHost(h) {
  h = (h || '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (/^(10|127)\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (h === '0.0.0.0' || h === '::1') return true;
  return false;
}
