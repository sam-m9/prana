# PRANA — Clean-Eating Intelligence

A self-contained, installable web app (PWA) that ranks food by **protein per dollar**, filtered
through a 4-level clean-eating evidence ladder. Built from the PRANA build spec, the clean-hypertrophy
science doc, and a seeded catalog of **341 real Austin-area products across 28 categories**.

It is a single static site — no server, no build step, no tracking. All state lives in the browser
(`localStorage`), so it works fully offline once loaded and can be installed to the iPhone Home Screen.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app — 5 screens, overlays, gestures, persistence |
| `data.js` | The 341-product catalog + the science/mechanism knowledge base |
| `manifest.webmanifest` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker — offline caching + installability |
| `icons/` | App icons (any / maskable / apple-touch) + `icon.svg` |

## Screens

- **HOME** — daily protein vs 160 g target, store rocker (H·E·B / Whole Foods / Online), voice log, top protein-per-dollar, the Science panel, backup/restore.
- **QUEUE** — swipe to agree/dismiss each product's rating (right = agree, left = dismiss).
- **RANK** — 3D carousel of every product sorted by g/$, with an evidence detail card.
- **DATA** — search / multi-select category filter / sort, add-edit-delete foods & categories.
- **LIST** — approved items grouped by store, with out-of-stock swap suggestions.

Tap any product anywhere to open the **Evidence Drawer** (L1–L4 ladder + gut-mechanism summary,
plus a manual "override to Tier 1"). The science and tiering come straight from the PRANA logic doc
(A1/A2 casein, sourdough fermentation, bronze-die pasta, seed oils, emulsifiers, engineered isolates —
and the pseudoscience it deliberately ignores).

## Deploy to Cloudflare Pages

1. Push this repo to GitHub (already the case).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
3. Build settings: **Framework preset = None**, **Build command = (blank)**, **Output directory = `/`** (root).
4. Deploy. Your site is live at `https://<project>.pages.dev` (add a custom domain if you like).

Because it's fully static, you can also just drag the folder into **Pages → Direct Upload**.

## Install on iPhone (iOS 17+)

1. Open the deployed URL in **Safari**.
2. Share button → **Add to Home Screen**.
3. Launch from the Home Screen — it opens full-screen (no Safari chrome), works offline.

## App icon

The home-screen / favicon / manifest icons in `/icons` are generated from **`LOGO.PNG`** (your
artwork, kept at the repo root and mirrored to `icons/logo.png`). All icon sizes composite the logo
onto a dark square so nothing clips and iOS renders it cleanly.

To change the logo later: replace `LOGO.PNG`, then regenerate the sized PNGs
(`icon-1024/512/256`, `apple-touch-icon`, `icon-512-maskable`, `favicon`) from it and redeploy.

## Regenerate the catalog

`data.js` is generated from the source docs. The parser and builder live under the project's
scratchpad (`parse.py` → `products.json`, then `build_data.py` → `data.js`) if you want to re-derive
or extend the catalog.
