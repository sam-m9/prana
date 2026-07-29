# PRANA fetch proxy — 3-step setup (free, ~5 minutes)

This is **optional**. Without it, importing a recipe from a link still works via
public proxies — they're just occasionally slow or down. Deploying your own
Worker makes link-import (and re-verify) reliable and private. It holds no
secrets and stores nothing.

## What you get
- Reliable "import from link" in the recipe editor.
- One-tap **re-verify** can read the live source page instead of only re-checking
  stored text.

## Deploy (Cloudflare dashboard — no install)
1. Go to **dash.cloudflare.com → Workers & Pages → Create → Create Worker**.
   Give it a name (e.g. `prana-proxy`) and click **Deploy**.
2. Click **Edit code**, delete the sample, and paste the entire contents of
   [`worker.js`](./worker.js). Click **Deploy** again.
3. Copy your Worker URL (looks like `https://prana-proxy.<you>.workers.dev`).
   In PRANA: **Home → YOUR DATA → Web fetch service** and paste it. Done.

That's it. Test it by opening `https://prana-proxy.<you>.workers.dev/` in a
browser — it should say `PRANA fetch proxy OK`.

## Deploy (CLI alternative)
```bash
npm i -g wrangler
cd worker
wrangler deploy worker.js --name prana-proxy
```

## Notes
- **Lock it down (optional):** in `worker.js` set `ALLOW_ORIGIN` to your site
  origin (e.g. `'https://sam-m9.github.io'`) so only PRANA can call it.
- **Cost:** Cloudflare's free tier is 100,000 requests/day — personal use won't
  come close.
- **OCR / photo reading** stays on-device in the app (no server needed).
- **Push reminders** (getting a nudge while the app is closed) are a *separate*
  future addition — they need web-push VAPID keys and a small change to this
  Worker to store subscriptions. Not included here; ask when you want it and
  it's a focused follow-up.
