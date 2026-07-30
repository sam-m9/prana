# Auto-deploy the Workers from GitHub (Workers Builds)

Instead of copy-pasting code into the Cloudflare editor, connect the repo once
and Cloudflare **redeploys each Worker automatically on every push** to the
default branch. This repo is laid out for it — one folder per Worker, each with
its own `wrangler.toml`:

```
worker/proxy/   → wrangler.toml (name: prana-proxy)  + worker.js
worker/push/    → wrangler.toml (name: prana-push)   + push-worker.js
```

You create **two** connected Worker projects (one per folder). Both point at the
same GitHub repo but a different **Root directory**.

## A. Fetch proxy (`prana-proxy`)
1. dash.cloudflare.com → **Workers & Pages → Create → Workers → Connect to Git**
   (a.k.a. "Import a repository"). Authorize GitHub, pick **`sam-m9/prana`**.
2. **Project name:** `prana-proxy`. **Root directory:** `worker/proxy`.
3. Leave build command empty; **Deploy command:** `npx wrangler deploy` (default).
4. **Save and Deploy.** You get `https://prana-proxy.<you>.workers.dev`.
5. Paste that URL into PRANA → **YOUR DATA → Web fetch service**.

## B. Push reminders (`prana-push`)
This one needs KV storage, three secrets, and a cron — the cron is already in
`worker/push/wrangler.toml`; you supply the KV id and secrets.

1. **Make VAPID keys** on any machine with Node: `npx web-push generate-vapid-keys`.
2. **Create KV:** Workers & Pages → **KV → Create namespace** → name `subs` →
   copy its **Namespace ID**. Open `worker/push/wrangler.toml`, replace
   `PASTE_YOUR_KV_NAMESPACE_ID_HERE` with that id, and **commit + push** (so the
   auto-deploy picks it up).
3. **Connect the project:** Create → Workers → Connect to Git → same repo →
   **Project name** `prana-push`, **Root directory** `worker/push`, deploy
   command `npx wrangler deploy`. Save and Deploy.
4. **Set the secrets** (persist across deploys): the Worker → **Settings →
   Variables → Add**, encrypted:
   - `VAPID_PUBLIC`, `VAPID_PRIVATE` (from step 1), `VAPID_SUBJECT` =
     `mailto:samarth@blueprint-dc.com`.
   (Or from a terminal: `cd worker/push && npx wrangler secret put VAPID_PRIVATE`
   etc.) Trigger one more deploy (push any commit, or **Deployments → Retry**) so
   the secrets are in effect.
5. In PRANA → **History & trends → Daily reminder**: paste the
   `https://prana-push.<you>.workers.dev` URL and the **VAPID public key**, then
   turn on **Push to my phone**. (iPhone: add PRANA to the Home Screen first.)

## After setup
Every push to the repo's default branch auto-redeploys whichever Worker's folder
changed. Secrets and the KV binding stay put. You never touch the Cloudflare code
editor again.

> Prefer the no-Git route? The copy-paste steps still work — see
> `WORKER_SETUP.md` and `PUSH_SETUP.md`.
