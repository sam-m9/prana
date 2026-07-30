# PRANA fetch proxy — 3-step setup (free, ~5 minutes)

This is **optional**. Without it, importing a recipe from a link still works via
public proxies — they're just occasionally slow or down. Deploying your own
Worker makes link-import (and re-verify) reliable and private. It holds no
secrets and stores nothing.

## Where this runs (important)
Two separate hosts. Your **app** is static files on **GitHub Pages**
(`sam-m9.github.io`) — Pages cannot run server code. This **Worker** runs on
**Cloudflare**, at its own `*.workers.dev` URL. It is NOT created through GitHub;
`worker.js` in the repo is just a copy you paste into Cloudflare once. The app
then calls the Worker's URL over HTTPS.

## What you get
- Reliable "import from link" in the recipe editor.
- One-tap **re-verify** can read the live source page instead of only re-checking
  stored text.

## Deploy (Cloudflare dashboard — no install)
1. Go to **dash.cloudflare.com → Workers & Pages → Create → Create Worker**.
   Give it a name (e.g. `prana-proxy`) and click **Deploy**.
2. Click **Edit code**, delete the sample, and paste the entire contents of
   [`proxy/worker.js`](./proxy/worker.js). Click **Deploy** again.
3. Copy your Worker URL (looks like `https://prana-proxy.<you>.workers.dev`).
   In PRANA: **Home → YOUR DATA → Web fetch service** and paste it. Done.

That's it. Test it by opening `https://prana-proxy.<you>.workers.dev/` in a
browser — it should say `PRANA fetch proxy OK`.

## Deploy (CLI alternative)
```bash
npm i -g wrangler
cd worker/proxy
wrangler deploy
```

## Auto-deploy from GitHub (recommended if you'll edit it)
Connect the repo once and Cloudflare redeploys on every push — see
[`GIT_DEPLOY.md`](./GIT_DEPLOY.md).

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
