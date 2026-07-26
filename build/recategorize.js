/* PRANA re-categorization engine — implements docs/CATEGORIZATION_LOGIC.md exactly.
 *
 * Reads the current data.js, runs every product through the STRICT PRE-FILTER + the
 * Sweetener Classification Matrix, re-derives safe-zone tiers from the audit ingredient
 * decks, and writes data.js back out with per-product:
 *   disq:   true if DISQUALIFIED / TRASHED (hidden from the app entirely)
 *   dqLevel:'L1' | 'L2' | 'L3'  (severity that trashed it)
 *   dqReason: short human string naming the offending ingredient class
 *   tier:   1 | 2 | 3   (only meaningful when disq === false)
 *
 * Categorization is derived from each product's `audit` ingredient text + `flags`.
 * It is deterministic and reproducible; run `node build/recategorize.js` to redo it.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data.js');
global.window = {};
require(DATA);
const D = window.PRANA_DATA;

const A = p => (p.audit || '').toLowerCase();
const flag = (p, f) => (p.flags || []).includes(f);

// Inherently-sweet categories: added sugar here is judged by the Sweetener Matrix,
// not the "hidden sugar in a savory staple" L2 rule.
const SWEET = new Set(['Desserts','Ice Cream','Jam','Chocolate','Candy & Gummies','Cookies','Dried Fruit','Protein Bar']);

// Negation-aware presence: "zero seed oils" / "free of gums" do NOT count as present.
function present(text, term){
  let i = 0;
  while((i = text.indexOf(term, i)) !== -1){
    const pre = text.slice(Math.max(0, i - 16), i);
    if(!/(zero|no|free of|free from|without|not|minus)\s*(added\s*)?[\w-]*\s*$/.test(pre)) return true;
    i += term.length;
  }
  return false;
}
const any = (text, terms) => terms.some(t => present(text, t));

// ---- ingredient class dictionaries (from the spec) ----
const L1_TRANS   = ['partially hydrogenated','hydrogenated oil','hydrogenated','trans fat'];
const L2_ADDITIVE= ['potassium bromate','azodicarbonamide','propyl gallate','sodium benzoate',
                    'red 40','red 3','yellow 5','yellow 6','blue 1','titanium dioxide',' bha',' bht','tbhq'];
const L3_SEEDOIL = ['canola','soybean oil','soy oil','sunflower oil','safflower','corn oil',
                    'cottonseed','vegetable oil','seed oil','palm kernel','shortening','rapeseed'];
const L3_GUM     = ['carrageenan','cellulose gum','carboxymethyl','polysorbate','xanthan','guar gum',
                    'locust bean','carob bean','gellan','tara gum','soy lecithin','sunflower lecithin',
                    'mono- and diglyceride','monoglyceride','diglyceride','mono/diglyceride','datem'];
const L3_SYNTH   = ['sucralose','aspartame','acesulfame','saccharin','neotame'];
const L3_POLYOL  = ['erythritol','xylitol','sorbitol','maltitol','isomalt','lactitol','mannitol'];
const L3_ENGFIB  = ['soluble corn fiber','isomalto-oligosaccharide','isomaltooligosaccharide','polydextrose',
                    'soluble tapioca fiber','vegetable glycerin','modified corn starch'];
const ADD_SUGAR  = ['high fructose corn syrup','corn syrup','cane sugar','brown sugar','invert sugar',
                    'glucose syrup','agave','coconut sugar','tapioca syrup','brown rice syrup','beet sugar'];
// premium natural carbs that are Tier-1 allowed sweeteners
const NAT_PREMIUM= ['raw honey','pure maple','maple syrup','honey'];
// Tier-1 bioavailability / pre-digestion markers
const T1_MARK    = ['a2/a2','a2 ','100% a2','sheep milk','goat milk','wild sourdough','sourdough',
                    'long ferment','naturally fermented','traditionally fermented','sprouted','bronze',
                    'extra virgin olive','cold-pressed','cold pressed','first cold','grass-fed','grass fed',
                    'pasture','pastured','wild-caught','wild caught','single-origin','single origin',
                    'raw honey','cultured cream'];
// clean-label-basic (Tier-3) markers
const T3_BASIC   = ['fast-yeast','fast yeast','quick yeast','commercial yeast','dough conditioner',
                    'store brand','store-brand','conventional','non-organic','enriched flour'];

function categorize(p){
  const a = A(p);
  const R = [];                       // disqualification reasons [level, text]
  const savory = !SWEET.has(p.cat);

  if(any(a, L1_TRANS) || flag(p,'pho'))                       R.push(['L1','trans fat / partially hydrogenated oil']);
  if(any(a, L2_ADDITIVE) || flag(p,'dye') || flag(p,'brom') || flag(p,'preserv'))
                                                              R.push(['L2','regulatory-gap additive (dye / preservative / bromate)']);
  if(any(a, L3_SEEDOIL) || flag(p,'seed'))                    R.push(['L3','industrial seed oil']);
  if(any(a, L3_GUM) || flag(p,'emul'))                        R.push(['L3','emulsifier / industrial gum']);
  if(any(a, L3_SYNTH))                                        R.push(['L3','synthetic sweetener']);
  if(any(a, L3_POLYOL))                                       R.push(['L3','sugar alcohol / polyol']);
  if(any(a, L3_ENGFIB))                                       R.push(['L3','engineered fiber filler']);

  // Stevia / monk fruit blended with polyol, inulin/chicory, or gums => trashed
  const stevMonk = present(a,'stevia') || present(a,'monk fruit') || present(a,'monk');
  if(stevMonk && (any(a,['erythritol','inulin','chicory']) || any(a, L3_GUM) || any(a, L3_ENGFIB)))
                                                              R.push(['L3','stevia/monk blended with polyol, fiber, or gum']);

  // Hidden added sugar in a savory / staple food => trashed (L2)
  const addedSugar = flag(p,'sugar') || any(a, ADD_SUGAR);
  if(savory && addedSugar)                                    R.push(['L2','hidden added sugar in a savory / staple food']);

  if(R.length){
    // report the most severe level (L1 > L2 > L3)
    const order = {L1:0,L2:1,L3:2};
    R.sort((x,y)=>order[x[0]]-order[y[0]]);
    return { disq:true, dqLevel:R[0][0], dqReason:R[0][1], tier:p.tier };
  }

  // ---- SAFE ZONE: assign tier ----
  // Engineered but clean protein isolate (pure whey / plant isolate, no gums/sweeteners) => Tier 2 tool
  if(flag(p,'tool')) return { disq:false, dqLevel:null, dqReason:null, tier:2 };

  // Sweet item carrying added sugar that survived (i.e. it's a sweet category, no other flags):
  const naturalOnly = any(a, NAT_PREMIUM) && !any(a, ADD_SUGAR);
  if(addedSugar && !naturalOnly)      return { disq:false, dqLevel:null, dqReason:null, tier:3 }; // organic cane sugar / allulose in sweets

  // Whole-food clean: Tier 1 if pre-digestion / bioavailability markers, else basic split
  if(any(a, T1_MARK) || naturalOnly)  return { disq:false, dqLevel:null, dqReason:null, tier:1 };
  if(any(a, T3_BASIC))                return { disq:false, dqLevel:null, dqReason:null, tier:3 };
  return { disq:false, dqLevel:null, dqReason:null, tier:2 };   // default clean = practical staple
}

// ---- run ----
const stats = { disq:0, byLevel:{L1:0,L2:0,L3:0}, safe:0, byTier:{1:0,2:0,3:0} };
D.products.forEach(p=>{
  const c = categorize(p);
  p.disq = c.disq; p.dqLevel = c.dqLevel; p.dqReason = c.dqReason; p.tier = c.tier;
  p.tlabel = c.disq ? 'Disqualified' : ({1:'Gold Standard',2:'Practical Staple',3:'Safe Fallback'}[c.tier]);
  if(c.disq){ stats.disq++; stats.byLevel[c.dqLevel]++; }
  else { stats.safe++; stats.byTier[c.tier]++; }
});

// ---- re-emit data.js preserving all aux structures ----
const payload = {
  products: D.products,
  cats: D.cats,
  catEmoji: D.catEmoji,
  mech: D.mech,
  cleanNotes: D.cleanNotes,
  science: D.science,
};
const js = 'window.PRANA_DATA = ' + JSON.stringify(payload) + ';\n';

if(process.argv.includes('--write')){
  fs.writeFileSync(DATA, js);
  console.log('WROTE data.js (' + js.length + ' bytes)');
}
console.log('TOTAL', D.products.length);
console.log('DISQUALIFIED (hidden):', stats.disq, 'by level', JSON.stringify(stats.byLevel));
console.log('SAFE ZONE:', stats.safe, 'by tier', JSON.stringify(stats.byTier));
