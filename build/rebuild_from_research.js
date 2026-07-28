/* Rebuild data.js from the verified online research (build/research_merged.json).
 * - Deletes every product whose decision is `disqualify` or `delete_unverifiable`.
 * - Keeps tier1/tier2/tier3, re-deriving tier, tlabel, flags, audit, verified
 *   ingredients and sources from the research.
 * - Drops now-empty categories; recomputes tier counts.
 * Run: node build/rebuild_from_research.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const D = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8')
    .replace(/^window\.PRANA_DATA\s*=\s*/, '').replace(/;\s*$/, '')
);
const research = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/research_merged.json'), 'utf8'));
const byId = {}; research.forEach(r => { byId[r.id] = r; });

const SWEET = new Set(['Desserts','Ice Cream','Jam','Chocolate','Candy & Gummies','Cookies','Dried Fruit','Protein Bar']);

// Positive scan of the verified ingredient statement for a Matrix-approved added
// sweetener (ingredient lists are positive lists, so no negation traps here).
function hasSweetener(r){
  const s = (r.ingredients_found || '').toLowerCase();
  return /\bsugar\b|\bhoney\b|\bmaple\b|\bcane\b|coconut sugar|\ballulose\b|\bdextrose\b|\bagave\b|molasses|\bstevia\b|monk fruit|rice syrup|tapioca syrup|date paste|\bdates?\b|fruit juice/.test(s);
}

function deriveFlag(p, r){
  const tier = r.decision === 'tier1' ? 1 : r.decision === 'tier2' ? 2 : 3;
  if (tier === 1) return 'clean';
  // 'tool' = an engineered / isolated protein product (the protein IS the product):
  // whey & plant protein powders and formulated protein bars. Everything else that
  // is kept passed the pre-filter as a whole food. (Keyword-sniffing the reason text
  // mis-fires on negations like "not from concentrate" / "not an isolate", so we key
  // off the category instead.)
  if (tier === 2){
    if (p.cat === 'Clear Whey' || p.cat === 'Protein Bar') return 'tool';
    if (SWEET.has(p.cat) && hasSweetener(r)) return 'sugar';
    return 'clean';           // conventional clean whole-food staple
  }
  // tier 3
  if (SWEET.has(p.cat) && hasSweetener(r)) return 'sugar';   // sweet category, matrix-approved sweetener
  return 'clean';              // clean-label basic (fast-yeasted bread, etc.)
}

const TAG = {1:'Gold Standard · Whole-Food Clean', 2:'Practical Clean Tool (Tier 2)', 3:'Acceptable Safe Fallback (Tier 3)'};
const TLABEL = {1:'Gold Standard', 2:'Clean Tool', 3:'Safe Fallback'};

function buildAudit(r, tier){
  const parts = [];
  if (r.justification) parts.push(r.justification.trim());
  if (r.reason) parts.push(r.reason.trim());
  let a = parts.join(' ').replace(/\s+/g,' ').trim();
  a += ` Tag: ${TAG[tier]}.`;
  return a;
}

const kept = [];
const deleted = [];
D.products.forEach(p => {
  const r = byId[p.id];
  if (!r){ deleted.push({id:p.id, name:p.name, why:'no research row'}); return; }
  if (r.decision === 'disqualify' || r.decision === 'delete_unverifiable'){
    deleted.push({id:p.id, name:p.name, why:r.decision, dq:r.dqLevel, reason:r.reason});
    return;
  }
  const tier = r.decision === 'tier1' ? 1 : r.decision === 'tier2' ? 2 : 3;
  const flag = deriveFlag(p, r);
  const np = Object.assign({}, p);
  np.tier = tier;
  np.tlabel = TLABEL[tier];
  np.flags = [flag];
  np.audit = buildAudit(r, tier);
  if (r.ingredients_found) np.ingr = r.ingredients_found.trim();
  if (Array.isArray(r.sources) && r.sources.length) np.src = r.sources.slice(0, 3);
  np.conf = r.confidence || 'high';
  kept.push(np);
});

// recompute categories present, preserve original ordering
const present = new Set(kept.map(p => p.cat));
const cats = D.cats.filter(c => present.has(c));
const catEmoji = {}; cats.forEach(c => { if (D.catEmoji[c]) catEmoji[c] = D.catEmoji[c]; });
const cleanNotes = {}; Object.keys(D.cleanNotes||{}).forEach(k => { if (present.has(k)) cleanNotes[k] = D.cleanNotes[k]; });

// Re-word the two mechanism cards that now describe SAFE, kept trade-offs rather
// than disqualifiers (everything in the catalog has cleared the pre-filter).
const mech = Object.assign({}, D.mech);
mech.tool = {
  label: 'CLEAN ISOLATE',
  level: 3,
  summary: 'A clean protein isolate / concentrate (whey, casein or plant) or a formulated protein bar — zero added gums, sweeteners or fillers.',
  mechanism: 'Highly digestible and macro-efficient, but the protein is extracted rather than delivered in a whole-food matrix, so it lacks the native co-factors and enzymatic pre-digestion of a Tier-1 source. A safe, effective clean-surplus tool — capped at Tier 2.',
  cite: 'Whole-food protein > engineered protein for clean hypertrophy — capped at Tier 2, never disqualified.'
};
mech.sugar = {
  label: 'SWEET · MATRIX-OK',
  level: 2,
  summary: 'Added sweetener in an inherently-sweet food (chocolate, dessert, jam, cookie) — cleared by the Sweetener Matrix, never in a savory staple.',
  mechanism: 'The sweetener is whole fruit, raw honey, pure maple, unrefined cane or allulose — no synthetic sweeteners (sucralose, aspartame, ace-K) and no polyols (erythritol, maltitol). Acceptable for a sweet-category treat; it is not the savory-staple disqualifier.',
  cite: 'Sweetener Matrix — added sugar judged by category, not auto-trashed.'
};

const out = {
  products: kept,
  cats,
  catEmoji,
  mech,
  cleanNotes,
  science: D.science
};

fs.writeFileSync(path.join(ROOT, 'data.js'), 'window.PRANA_DATA = ' + JSON.stringify(out) + ';\n');

// report
const tc = kept.reduce((a,p)=>{a[p.tier]=(a[p.tier]||0)+1;return a;},{});
const fc = kept.reduce((a,p)=>{a[p.flags[0]]=(a[p.flags[0]]||0)+1;return a;},{});
console.log('KEPT:', kept.length, 'tiers', tc, 'flags', fc);
console.log('DELETED:', deleted.length);
const dq = deleted.reduce((a,d)=>{const k=d.why+(d.dq?'/'+d.dq:'');a[k]=(a[k]||0)+1;return a;},{});
console.log('  breakdown', dq);
console.log('CATS kept:', cats.length, '→', cats.join(', '));
// flag-by-tier sanity
[2,3].forEach(t=>{
  const s={}; kept.filter(p=>p.tier===t).forEach(p=>{s[p.flags[0]]=(s[p.flags[0]]||0)+1;});
  console.log('  tier'+t+' flags', s);
});
