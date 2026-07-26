import json

products = json.load(open('products.json'))

# category order as they appear in the source
cat_order = []
for p in products:
    if p['cat'] not in cat_order:
        cat_order.append(p['cat'])

# emoji per category for a little visual identity
CAT_EMOJI = {
    'Yogurt':'🥛','Pizza Bases':'🍕','Pasta Sauce':'🍅','Bread':'🍞','Plant Milk':'🥥','Cheese':'🧀',
    'Pasta':'🍝','Nuts':'🥜','Eggs':'🥚','Butter':'🧈','Dried Fruit':'🍇','Olive Oil':'🫒','Nut Butter':'🥜',
    'Desserts':'🍮','Ice Cream':'🍨','Jam':'🍓','Protein Bar':'🍫','Clear Whey':'💪','Cooking Sauces':'🥘',
    'Chips':'🥔','Cookies':'🍪','Juice':'🧃','Frozen Pizza':'🍕','Healthy Snacks':'🥗','Indian Foods':'🍛',
    'Chocolate':'🍫','Candy & Gummies':'🍬','Frozen Meals':'🧊',
}

# mechanism knowledge distilled from the PRANA science doc — drives the evidence ladder
MECH = {
  'seed': {
    'label':'SEED OIL','level':2,
    'summary':'Industrial seed oils (canola, soybean, corn, sunflower, safflower) are hexane-extracted under high heat and concentrated in omega-6 linoleic acid.',
    'mechanism':'In a hyper-caloric surplus, oxidized omega-6 shifts the cell-membrane omega-3:omega-6 ratio toward a pro-inflammatory state via the arachidonic-acid cascade. Clean surplus fats come from EVOO, grass-fed butter/ghee, and whole dairy/meat.',
    'cite':'Disqualifier for Tiers 1–2 — PRANA Fat Filter.'},
  'emul': {
    'label':'EMULSIFIER / GUM','level':3,
    'summary':'Carboxymethylcellulose (CMC), polysorbate-80, carrageenan and excess xanthan/guar gums stabilize mass-produced dairy and sauces.',
    'mechanism':'These agents act like detergents in the gut, stripping the protective mucin layer and exposing the intestinal epithelium to bacteria — driving low-grade systemic inflammation and intestinal permeability ("leaky gut").',
    'cite':'Gut-barrier mechanism — clinical gastroenterology.'},
  'sugar': {
    'label':'ADDED SUGAR','level':2,
    'summary':'Added fructose/sucrose in items where it does not naturally belong (breads, sauces, jerky, savory staples).',
    'mechanism':'In a surplus, flooding the liver with added/liquid fructose without the fibrous matrix of whole fruit accelerates de novo lipogenesis — conversion of carbohydrate to liver/visceral fat — faster than complex carbs.',
    'cite':'Zero added sugar in savory items — barley malt in traditional bagels is the sole exception.'},
  'tool': {
    'label':'ENGINEERED / ISOLATE','level':3,
    'summary':'Whey/soy isolates, soluble corn fiber and sugar alcohols (erythritol) are used to artificially inflate protein and fiber counts.',
    'mechanism':'Sugar alcohols undergo zero upper-GI digestion and ferment osmotically in the colon, drawing in water → gas and distension. A whole-food protein (Skyr, grass-fed beef, eggs) is the anabolic gold standard; an engineered bar is a functional tool.',
    'cite':'Whole-food protein > engineered protein for clean hypertrophy.'},
  'pho': {
    'label':'TRANS FAT / PHO','level':1,
    'summary':'Partially hydrogenated oils / industrial trans fats.',
    'mechanism':'Settled science: raise LDL, lower HDL, drive cardiovascular disease. Banned from the US food supply (FDA) and across the EU. An immediate hard fail.',
    'cite':'L1 settled science / regulatory ban.'},
  'brom': {
    'label':'POTASSIUM BROMATE','level':2,
    'summary':'Dough oxidizer used to strengthen flour.',
    'mechanism':'Classified a possible human carcinogen; banned in the EU, UK, Canada and beyond, yet still permitted in US flour — a clear regulatory-gap signal.',
    'cite':'L2 regulatory-gap signal.'},
  'dye': {
    'label':'SYNTHETIC DYE','level':2,
    'summary':'Petroleum-derived synthetic colors (Red 40, Yellow 5, Blue 1).',
    'mechanism':'Regulatory-gap additives linked to behavioral/attention effects in children; carry warning labels or are restricted across Europe. Cosmetic, non-nutritive, and avoidable.',
    'cite':'L2 regulatory-gap signal.'},
  'preserv': {
    'label':'SYNTHETIC PRESERVATIVE','level':2,
    'summary':'BHT / BHA / TBHQ, nitrites, sodium bisulfite.',
    'mechanism':'Synthetic preservatives restricted or warning-labeled abroad; markers of an ultra-processed formulation rather than a whole food.',
    'cite':'L2 regulatory-gap signal.'},
  'clean': {
    'label':'WHOLE FOOD','level':0,
    'summary':'Passes every level with zero flags.',
    'mechanism':'Whole-food clean: no seed oils, no added sugar in savory items, no emulsifiers/gums, no engineered isolates. Eat in the calorie-dense volume a clean surplus needs without GI inflammation.',
    'cite':'Tier 1 — Gold Standard.'},
}

# positive "why it's clean" notes for select Tier-1 categories (from the science doc)
CLEAN_NOTES = {
  'Yogurt':'Priority for verified A2 / sheep / goat dairy — no A1 β-casein, so no BCM-7-driven bloat.',
  'Cheese':'Aged & raw blocks are naturally low-lactose with high amino-acid bio-accessibility.',
  'Bread':'Wild sourdough fermentation pre-digests FODMAPs and degrades phytic acid & gluten.',
  'Pasta':'Bronze-die extrusion + slow low-heat drying preserves the durum protein-starch matrix; ancient grains (einkorn, spelt, emmer) carry a simpler gluten structure.',
  'Eggs':'Pasture-raised whole eggs — a complete, highly bioavailable protein matrix.',
  'Olive Oil':'Cold-pressed EVOO: monounsaturated oleic acid + polyphenols, thermally stable.',
}

SCIENCE = {
  'title':'The Science of Clean Hypertrophy',
  'intro':'PRANA scores food for one goal: build a dense, muscular frame in a caloric surplus while minimising gastrointestinal inflammation. Protein target 1.6–2.2 g/kg bodyweight. The engine ranks by protein per dollar, then filters by a 4-level evidence ladder.',
  'sections':[
    {'h':'A1 vs A2 β-casein (dairy)','p':'US Holstein milk is mostly A1 β-casein; digestion releases BCM-7, an opioid-receptor peptide that slows gut transit and triggers localised inflammation in sensitive people — often misread as lactose intolerance. Verified A2, sheep and goat dairy release no BCM-7, so large clean-surplus volumes go down without distress.'},
    {'h':'Wild sourdough vs baker\'s yeast (bread)','p':'Slow 12–48h Lactobacilli fermentation drops dough pH, activating phytase (frees zinc/iron/magnesium) and pre-digesting FODMAP fructans and gluten. Fast commercial yeast, DATEM and added vital wheat gluten bypass this biological pre-digestion.'},
    {'h':'Bronze-die & ancient grains (pasta)','p':'Bronze extrusion + low-temp drying preserves the durum protein-starch matrix; Teflon extrusion + flash-drying denatures it. Ancient wheats (einkorn, spelt, emmer) have a genetically simpler gluten structure processed with less immunological friction.'},
    {'h':'The hard exclusions','p':'Seed oils (oxidised omega-6 → inflammation), emulsifiers/gums (strip gut mucin → permeability), hidden sugar in savory foods (de novo lipogenesis → visceral fat), and engineered isolates + sugar alcohols (colonic fermentation → distension).'},
  ],
  'debunk':[
    {'h':'Folic acid / reduced iron cause bloating','p':'False. Flour enrichment with B9 and iron is a vital public-health measure; microgram amounts don\'t alter the microbiome or cause fat storage. US-bread bloat comes from lack of fermentation (FODMAPs) and UPF conditioners — not vitamins.'},
    {'h':'Glyphosate causes fat storage','p':'False. Dietary exposure in grocery produce sits magnitudes below the threshold of toxicological concern. A failed bulk is total caloric load + ultra-processed food — not trace glyphosate.'},
    {'h':'Ghee/butter boosts testosterone','p':'False. Baseline dietary fat is needed for steroidogenesis, but excess grass-fed butter won\'t push testosterone past its physiological ceiling. Clean fats win on caloric density and lack of oxidative stress — not an anabolic-steroid effect.'},
  ],
}

payload = {
  'products': products,
  'cats': cat_order,
  'catEmoji': CAT_EMOJI,
  'mech': MECH,
  'cleanNotes': CLEAN_NOTES,
  'science': SCIENCE,
}
js = 'window.PRANA_DATA = ' + json.dumps(payload, separators=(',', ':'), ensure_ascii=False) + ';\n'
open('data.js', 'w', encoding='utf-8').write(js)
print('wrote data.js', len(js), 'bytes,', len(products), 'products')
