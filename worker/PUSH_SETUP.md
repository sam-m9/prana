# Push reminders — setup (free, ~15 min, one time)

This gets you a real phone notification at your chosen time **even when PRANA is
closed** — which a web app can't do on its own. It needs a second Cloudflare
Worker (separate from the fetch proxy) plus a one-time key pair.

## Where this runs
Same two-host idea as the fetch proxy: your **app** is on GitHub Pages; this
**push Worker** runs on **Cloudflare** at its own `*.workers.dev` URL, on an
hourly schedule. `worker/push-worker.js` in the repo is the code you paste in.

## iPhone requirement
iOS only allows web push for apps **added to the Home Screen**. In Safari open
PRANA → Share → **Add to Home Screen**, then open it from the Home Screen icon
before enabling reminders.

## Steps

### 1. Make VAPID keys (identifies your push sender)
On any computer with Node:
```bash
npx web-push generate-vapid-keys
```
Copy the **Public Key** and **Private Key** it prints.

### 2. Create the push Worker
- dash.cloudflare.com → **Workers & Pages → Create → Create Worker** → name it
  `prana-push` → **Deploy**.
- **Edit code** → delete the sample → paste all of `worker/push/push-worker.js`
  → **Deploy**.

> Prefer auto-deploy from GitHub? See [`GIT_DEPLOY.md`](./GIT_DEPLOY.md) — it wires
> KV, the cron, and secrets via `worker/push/wrangler.toml`.

### 3. Give it storage + keys (on the Worker's **Settings** tab)
- **KV namespace:** Workers & Pages → **KV** → **Create namespace** named `subs`.
  Back in the Worker → **Settings → Variables → KV Namespace Bindings** → add
  binding: **Variable name** `SUBS` → select the `subs` namespace → Save.
- **Secrets:** Settings → **Variables → Add** three **encrypted** variables:
  - `VAPID_PUBLIC`  = the public key from step 1
  - `VAPID_PRIVATE` = the private key from step 1
  - `VAPID_SUBJECT` = `mailto:samarth@blueprint-dc.com`
- **Cron:** Settings → **Triggers → Cron Triggers → Add** → `0 * * * *` (hourly).

### 4. Connect the app
PRANA → **History & trends → Daily reminder**:
- Paste the **push Worker URL** (`https://prana-push.<you>.workers.dev`) and the
  **VAPID public key** into the fields there.
- Turn on **Push to my phone** → approve the notification prompt. It registers
  your device and your chosen hour with the Worker.

## Test it
Temporarily set your reminder hour to the next clock hour, make sure PUSH is on,
then fully close the app. At the top of the hour the Worker's cron fires and you
should get a "Time to hit your protein" notification. Set the hour back after.

## Notes
- The Worker sends a **bodyless** push; the notification text lives in the app's
  service worker, so no message content ever passes through Cloudflare.
- Times are handled in UTC. If you change time zones, toggle the reminder off/on
  to re-register.
- Turning **Push** off in-app unsubscribes the device from the Worker.
