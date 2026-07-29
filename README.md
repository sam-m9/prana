# PRANA — Clean-Eating Intelligence

A self-contained, installable web app (PWA) that ranks food by **protein per dollar**, filtered
through a strict clean-eating pre-filter and a five-principle biological audit. Built from the PRANA
build spec, the clean-hypertrophy science doc, and a catalog of **203 online-verified Austin-area
products across 28 categories** — every item has cleared the pre-filter (seed oils, emulsifiers/gums,
dyes, trans fat, hidden savory sugar and synthetic sweeteners are disqualified and removed, not shown).

It is a single static site — no server, no build step, no tracking. All state lives in the browser
(`localStorage`), so it works fully offline once loaded and can be installed to the iPhone Home Screen.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app — 5 screens, overlays, gestures, persistence |
| `data.js` | The 203-product verified catalog + the science/mechanism knowledge base |
| `manifest.webmanifest` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker — offline caching + installability |
| `icons/` | App icons (any / maskable / apple-touch) + `icon.svg` |

## Screens

- **HOME** — daily protein vs target (tap the Protein·Today card to open the editable daily log — add/delete items, or log by voice), store rocker (H·E·B / Whole Foods / Online), top protein-per-dollar, the Science panel, backup/restore, and **category upload** (merge a new category from a CSV / Excel-exported sheet).
- **QUEUE** — swipe to agree/dismiss each product's rating (right = agree, left = dismiss).
- **RANK** — 3D carousel of every product sorted by g/$, with an evidence detail card.
- **DATA** — search / multi-select category filter / sort, add-edit-delete foods & categories.
- **LIST** — approved items grouped by store, with out-of-stock swap suggestions.

Tap any product anywhere to open the **Evidence Drawer** — a category-agnostic **five-principle audit**,
the gut-mechanism summary, the **verified ingredient deck with source links**, and a manual "override to
Tier 1". The science and tiering come straight from the PRANA logic doc (`docs/CATEGORIZATION_LOGIC.md`):
the strict pre-filter (L1 bans, L2 regulatory-gap additives + hidden savory sugar, L3 seed oils / gums /
sweeteners), the **Sweetener Matrix** for inherently-sweet categories, A1/A2 casein, sourdough
fermentation, bronze-die pasta, engineered isolates — and the pseudoscience it deliberately ignores.
Both the pre-filter and the Sweetener Matrix are viewable in-app from the Science panel.

### Voice & the on-device science engine

The mic does two jobs and routes automatically by what you say:

- **Log** — “ate a chicken spinach wrap and a scoop of Isopure” parses quantities, composite dishes,
  and **real catalog brands** (Isopure → one serving at its verified per-serving protein), then adds
  each item as an editable row in the daily log.
- **Add a product** — “add Chobani zero-sugar vanilla to yogurt, ingredients: milk, cultures, stevia”
  opens the add-product form pre-filled and runs the **client-side science engine** (`classify()` — the
  same strict pre-filter + Sweetener Matrix) on the ingredient list.

Anything you enter with an ingredient list (voice, the manual Add-food form, or a CSV import row) is
either **auto-tiered** or **disqualified with a prompt** naming the level (L1/L2/L3) and the exact
offending ingredient. Disqualified items never enter the safe catalog.

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

## Fonts

- **JetBrains Mono** (UI / labels / descriptions) is **self-hosted** in `fonts/`
  (`JetBrainsMono-Regular.ttf`, `JetBrainsMono-Bold.ttf`, OFL license included) and
  cached by the service worker — no runtime dependency, works fully offline.
- **Archivo** (display: wordmark, numbers, food names) currently loads from Google
  Fonts. To make it offline-proof too: download the Archivo family, drop
  `archivo-600/700/800/900.woff2` into `fonts/`, then replace the Google `<link>`
  in `index.html` with matching `@font-face` rules (a placeholder comment marks the
  spot) and add the files to the `sw.js` cache list.

## Regenerate the catalog

`data.js` is generated from the source docs. The parser and builder live under the project's
scratchpad (`parse.py` → `products.json`, then `build_data.py` → `data.js`) if you want to re-derive
or extend the catalog.
