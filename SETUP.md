# PRANA — Setup & Operations

**The app itself needs no backend.** Host the static files, open it, done — the
core experience is fully client-side. Four *optional* add-ons unlock extra
reliability/convenience; each is independent, and the app degrades gracefully
when one isn't set up. **No AWS Lambda** — we use **Cloudflare Workers** (free
tier) plus a **Google OAuth client ID**. (Why not Lambda: see the end.)

---

## 0. Host the app  ·  REQUIRED  ·  ~5 min
PRANA is static files (`index.html`, `sw.js`, `data.js`, `manifest.webmanifest`,
`/icons`, `/fonts`). Any static host works; you're on GitHub Pages.

1. GitHub repo → **Settings → Pages** → Build and deployment: **Deploy from a
   branch** → Branch **main** → **/** (root) → **Save**. URL:
   `https://sam-m9.github.io/prana/`.
2. **iPhone:** open that URL in Safari → **Share → Add to Home Screen**. Launch it
   from the Home-Screen icon (required for offline use and for push later).

**Works immediately with zero backend:** the 200-product catalog + tiering
science, voice logging, recipes (incl. on-device photo OCR), the smart shopping
list, protein + opt-in macro tracking, history/trends/streaks, on-open reminder
nudges, IndexedDB photo durability, and local + iCloud **file** backups
(month-rolling).

---

## Feature → what it needs

| Feature | Backend needed | If not set up |
|---|---|---|
| Catalog, tiers, science, voice log, recipes, OCR, shopping, tracking, history, exit/UX | **None** | — (always works) |
| Local / iCloud file backup (month-rolling, 14-day prompt) | **None** | — (always works) |
| Reliable recipe **link-import** | Cloudflare Worker `prana-proxy` | Falls back to public proxies (works, occasionally flaky) |
| **Hands-off cloud backup** (Google Drive) | Google OAuth client ID | Use file/iCloud backup instead |
| **Push reminders while app is closed** | Cloudflare Worker `prana-push` + KV + cron + VAPID keys | On-open nudge still works |

---

## 1. Reliable link-import — Cloudflare Worker `prana-proxy`  ·  OPTIONAL  ·  ~5 min
Your own relay so importing a recipe from a URL doesn't depend on flaky public
proxies. Holds no secrets, stores nothing.
- **Steps:** `worker/WORKER_SETUP.md` (copy-paste) or `worker/GIT_DEPLOY.md`
  (auto-deploy from GitHub).
- **Then in app:** Home → **YOUR DATA → Web fetch service** → paste the
  `https://prana-proxy.<you>.workers.dev` URL.

## 2. Hands-off cloud backup — Google Drive  ·  OPTIONAL  ·  ~10 min
After one Google sign-in, PRANA silently uploads a single rolling
`prana-backup.json` to **samarthmaira9@gmail.com**'s Drive whenever you open the
app and a backup is due. No server — just your own OAuth client ID.
- **Steps:** `worker/GDRIVE_SETUP.md`.
- **Then in app:** Home → **YOUR DATA → Cloud backup · Google Drive** → paste the
  client ID → **Connect** → approve as samarthmaira9@gmail.com.

## 3. Push reminders (app closed) — Cloudflare Worker `prana-push`  ·  OPTIONAL  ·  ~15 min
A notification at your chosen hour even when PRANA is closed. Needs a second
Worker with KV storage + an hourly cron + a VAPID key pair.
- **Steps:** `worker/PUSH_SETUP.md` (copy-paste) or `worker/GIT_DEPLOY.md`
  (auto-deploy; wires KV + cron via `worker/push/wrangler.toml`).
- **iPhone:** Add PRANA to the Home Screen first (iOS only allows web push there).
- **Then in app:** History & trends → **Daily reminder → Push to my phone** →
  paste the `prana-push.<you>.workers.dev` URL + the VAPID **public** key → toggle
  ON and approve the prompt.

---

## Config cheat-sheet — what goes where

**In the app** (Home → YOUR DATA, and History → Daily reminder):
| Field | Value |
|---|---|
| Web fetch service | `https://prana-proxy.<you>.workers.dev` |
| Google OAuth Client ID | `…apps.googleusercontent.com` |
| Push worker URL | `https://prana-push.<you>.workers.dev` |
| VAPID public key | from `npx web-push generate-vapid-keys` |

**In Cloudflare** (push Worker → Settings → Variables, encrypted — *never* in the app):
`VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT` (`mailto:samarth@blueprint-dc.com`),
plus KV binding `SUBS` and cron `0 * * * *`.

## Costs
Everything is free tier: GitHub Pages (free), Cloudflare Workers (100k req/day),
Cloudflare KV (free allotment), Google Drive API (free). Personal use won't come
close to any limit.

## Why Cloudflare Workers, not AWS Lambda
Same idea, far less assembly. The two endpoints PRANA needs (a fetch proxy and a
"store subscription + send on a schedule" service) are one Worker file each, with
KV and cron built in and a generous always-free tier. The Lambda equivalent would
be Lambda **+ API Gateway + DynamoDB + EventBridge (cron) + IAM** — more services
to wire and secure for no benefit here. If you ever want the Lambda version, that
mapping is the whole recipe.
