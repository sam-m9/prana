import re, json

lines = open('CATEGORIES.txt', encoding='utf-8').read().split('\n')

# ---- locate category boundaries ----
cat_starts = []  # (line_index_of_category_name, category_name)
for i, l in enumerate(lines):
    if l.strip() == 'Quality Rank & Tier':
        j = i - 1
        while j >= 0 and lines[j].strip() == '':
            j -= 1
        cat_starts.append((i, lines[j].strip()))

# normalize category display names
CAT_NORM = {
    'Yoghurt': 'Yogurt', 'Pizza Bases': 'Pizza Bases', 'Pasta Sauce': 'Pasta Sauce',
    'Bread': 'Bread', 'Plant MIlk': 'Plant Milk', 'Cheese': 'Cheese', 'PASTA': 'Pasta',
    'NUTS': 'Nuts', 'EGGS': 'Eggs', 'BUTTER': 'Butter', 'DRIED FRUIT': 'Dried Fruit',
    'OLIVE OIL': 'Olive Oil', 'NUT BUTTER': 'Nut Butter', 'DESSERTS': 'Desserts',
    'ICE CREAM': 'Ice Cream', 'JAM': 'Jam', 'PROTEIN BAR': 'Protein Bar',
    'CLEAR WHEY PROTEIN': 'Clear Whey', 'COOKING SAUCES': 'Cooking Sauces',
    'CHIPS': 'Chips', 'COOKIES': 'Cookies', 'JUICE': 'Juice', 'FROZEN PIZZA': 'Frozen Pizza',
    'HEALTHY SNACKS': 'Healthy Snacks', 'INDIAN FOODS': 'Indian Foods', 'CHOCOLATE': 'Chocolate',
    'CANDY GUMMIES': 'Candy & Gummies', 'FROZEN MEALS': 'Frozen Meals',
}

# protein density g per gram of product (fallback estimate) by normalized category
DENSITY = {
    'Yogurt': 0.090, 'Pizza Bases': 0.110, 'Pasta Sauce': 0.020, 'Bread': 0.100,
    'Plant Milk': 0.015, 'Cheese': 0.220, 'Pasta': 0.130, 'Nuts': 0.185, 'Eggs': None,
    'Butter': 0.008, 'Dried Fruit': 0.030, 'Olive Oil': 0.0, 'Nut Butter': 0.210,
    'Desserts': 0.055, 'Ice Cream': 0.050, 'Jam': 0.005, 'Protein Bar': 0.300,
    'Clear Whey': 0.750, 'Cooking Sauces': 0.025, 'Chips': 0.070, 'Cookies': 0.060,
    'Juice': 0.005, 'Frozen Pizza': 0.110, 'Healthy Snacks': 0.100, 'Indian Foods': 0.060,
    'Chocolate': 0.080, 'Candy & Gummies': 0.050, 'Frozen Meals': 0.085,
}
SERVG = {  # typical serving grams for reconstructing per-serving display
    'Yogurt': 170, 'Cheese': 28, 'Nuts': 28, 'Pasta': 56, 'Bread': 45, 'Plant Milk': 240,
    'Protein Bar': 60, 'Clear Whey': 30, 'Nut Butter': 32, 'Pizza Bases': 90,
    'Frozen Pizza': 140, 'Frozen Meals': 300, 'Indian Foods': 285,
}

def sanitize(t):
    t = t.replace('\\approx', '~').replace('\\;', ' ').replace('\\,', ' ').replace('\\%', '%')
    t = re.sub(r'\\text\{([^}]*)\}', r'\1', t)
    t = re.sub(r'\\[a-zA-Z]+', ' ', t)
    t = re.sub(r'\$([^$]*)\$', r'\1', t)      # strip $...$ math wrappers
    t = t.replace('--', '–').replace('{', '').replace('}', '')
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def size_to_g(sz, cat):
    if not sz: return None, None
    s = sz.lower()
    m = re.search(r'([\d.]+)\s*(gal|gallon)', s)
    if m: return float(m.group(1)) * 3785.0, None
    m = re.search(r'([\d.]+)\s*l\b', s)
    if m and 'ml' not in s: return float(m.group(1)) * 1000.0, None
    m = re.search(r'([\d.]+)\s*ml', s)
    if m: return float(m.group(1)) * 1.0, None
    m = re.search(r'([\d.]+)\s*(lb|lbs|pound)', s)
    if m: return float(m.group(1)) * 453.6, None
    m = re.search(r'([\d.]+)\s*(oz|ounce)', s)
    if m: return float(m.group(1)) * 28.35, None
    m = re.search(r'([\d.]+)\s*(ct|count|pk|pack|ea)', s)
    if m: return None, int(float(m.group(1)))   # count -> (grams None, count)
    return None, None

def store_code(store_line):
    s = store_line.lower()
    # scan left-to-right, record store code at first mention -> preserves doc order
    tokens = re.split(r'[/,]', s)
    codes = []
    for tok in tokens:
        if 'whole foods' in tok or '365' in tok: c = 'wf'
        elif 'h-e-b' in tok or 'heb' in tok or 'central market' in tok: c = 'heb'
        elif any(w in tok for w in ('trader', 'amazon', 'online', 'direct', 'sprouts', '.com')): c = 'other'
        else: c = None
        if c and c not in codes: codes.append(c)
    if not codes: codes = ['heb']
    return codes

DEFAULT_G = {
    'Olive Oil': 500, 'Cooking Sauces': 680, 'Pasta Sauce': 680, 'Juice': 946, 'Jam': 340,
    'Chocolate': 100, 'Butter': 454, 'Dried Fruit': 227, 'Nut Butter': 454, 'Nuts': 227,
    'Plant Milk': 1420, 'Desserts': 300, 'Ice Cream': 473, 'Candy & Gummies': 142,
    'Chips': 227, 'Cookies': 300, 'Protein Bar': 60, 'Clear Whey': 900, 'Healthy Snacks': 150,
    'Indian Foods': 285, 'Frozen Meals': 300, 'Frozen Pizza': 400, 'Bread': 567,
    'Pizza Bases': 300, 'Cheese': 227, 'Yogurt': 907, 'Pasta': 454,
}

def classify(tier, audit):
    if tier == 1:
        return ['clean']
    a = audit.lower()
    # prefer the explicit disqualifier clause if present
    m = re.search(r'(?:disqualif\w*|fails?|due to|because of|compromised by|penalized|relies on|contains)\b(.*?)(?:\.|$)', a)
    scope = m.group(1) if m else a
    # strip negated segments ("zero X", "no X", "free of X", "without X", "0g X") to avoid false positives
    neg = re.sub(r'\b(zero|no|non|free of|without|0g|0\b|lacks?)\b[^.,;]*', ' ', scope)
    flags = []
    def has(pat): return re.search(pat, neg) is not None
    if has(r'canola|soybean oil|sunflower oil|vegetable oil|seed oil|safflower|corn oil|expeller|palm'):
        flags.append('seed')
    if has(r'xanthan|guar|carrageenan|\bgum\b|gums|emulsif|cellulose|polysorbate|mono/diglyc|lecithin|pectin'):
        flags.append('emul')
    if has(r'isolate|protein concentrate|soy protein|engineered|whey protein|modified|pea protein|starch'):
        flags.append('tool')
    if has(r'added sugar|refined sugar|dextrose|rice syrup|corn syrup|sucralose|erythritol|stevia|sucrose|\bsugar\b|maltitol|syrup|honey|cane sugar'):
        flags.append('sugar')
    if has(r'\bdye|red 40|yellow 5|blue 1|artificial color|fd&c'):
        flags.append('dye')
    if has(r'\bpho\b|hydrogenated|trans fat'):
        flags.append('pho')
    if has(r'bromate'):
        flags.append('brom')
    if has(r'bht|bha|tbhq|nitrite|sodium bisulfite'):
        flags.append('preserv')
    if not flags:  # generic fallback by tier
        flags = ['tool'] if tier == 2 else ['seed']
    return flags

def tier_label(raw):
    r = raw.lower()
    if 'gold standard' in r: return 'Gold Standard'
    if 'surplus efficiency' in r: return 'Surplus Efficiency'
    if 'great alternative' in r: return 'Great Alternative'
    if 'compromised' in r: return 'Compromised Tool'
    if 'functional tool' in r: return 'Functional Tool'
    if 'marketing trap' in r: return 'Marketing Trap'
    return 'Rated'

products = []
pid = 0
for ci, (start_i, rawcat) in enumerate(cat_starts):
    cat = CAT_NORM.get(rawcat, rawcat.title())
    end_i = cat_starts[ci+1][0]-1 if ci+1 < len(cat_starts) else len(lines)
    # find product blocks (# lines) within [start_i, end_i)
    block_idx = [i for i in range(start_i, end_i) if re.match(r'^#\d+\s*-\s*Tier', lines[i].strip())]
    for bi, hi in enumerate(block_idx):
        be = block_idx[bi+1] if bi+1 < len(block_idx) else end_i
        header = lines[hi].strip()
        tm = re.search(r'Tier\s*(\d)', header)
        tier = int(tm.group(1)) if tm else 2
        body = [lines[k].strip() for k in range(hi+1, be) if lines[k].strip() and not lines[k].strip().startswith('[cite')]
        if not body: continue
        name = sanitize(body[0])
        store_line = body[1] if len(body) > 1 else 'H-E-B'
        # price line: a body line (k>=2) that STARTS with optional ~ then $price
        price = None; sizeText = None; price_idx = None
        for k in range(2, len(body)):
            ln = body[k]
            if re.match(r'^~?\s*\$\s*[\d,]+(\.\d{2})?\b', ln):
                pm = re.search(r'\$\s*([\d,]+\.\d{2}|\d+)', ln)
                price = float(pm.group(1).replace(',', ''))
                # size after a slash, or in parentheses
                sm = re.search(r'/\s*([\d.]+\s*(?:oz|lb|lbs|gal|ct|count|ml|l\b|pk|pack|egg)[^,()]*)', ln, re.I)
                if not sm:
                    sm = re.search(r'\(([^)]*(?:oz|lb|gal|ct|ml|count|pack)[^)]*)\)', ln, re.I)
                if sm: sizeText = sm.group(1).strip()
                price_idx = k
                break
        if price is None:  # fallback: any $ price token not immediately per-unit
            for k in range(2, len(body)):
                pm = re.search(r'\$\s*([\d,]+\.\d{2})(?!\s*[\d/])', body[k])
                if pm:
                    price = float(pm.group(1).replace(',', '')); price_idx = k; break
        if price is None or price <= 0:
            continue
        audit = sanitize(' '.join(body[2:price_idx])) if price_idx > 2 else sanitize(' '.join(body[2:]))
        # size fallbacks: name parens, then audit
        if not sizeText:
            nm = re.search(r'\(([^)]*(oz|lb|gal|ct|ml|count|pack)[^)]*)\)', name, re.I)
            if nm: sizeText = nm.group(1).strip()
        if not sizeText:
            am = re.search(r'(\d[\d.]*\s*(oz|lb|gal|ct))', audit, re.I)
            if am: sizeText = am.group(1).strip()
        # per-unit price (e.g. cheese "$X/oz") with no pack price handled above; ensure count for eggs
        if cat == 'Eggs' and not re.search(r'\d+\s*(ct|count)', sizeText or '', re.I):
            cm = re.search(r'/\s*(\d+)\s*(ct|count|egg)', body[price_idx], re.I)
            sizeText = (cm.group(1) + ' ct') if cm else '12 ct'

        grams, count = size_to_g(sizeText, cat)
        # ---- pack protein ----
        pack_protein = None
        if cat == 'Eggs':
            n = count or 12
            pack_protein = 6.3 * n
            grams = n * 50.0
        else:
            dens = DENSITY.get(cat, 0.08)
            if grams is None:
                base = DEFAULT_G.get(cat, 340)
                grams = base * count if count else base
            pack_protein = grams * (dens if dens is not None else 0.08)
        pack_protein = round(pack_protein, 1)
        gd = round(pack_protein / price, 1)
        # servings + per-serving
        sg = SERVG.get(cat, 100)
        if cat == 'Eggs':
            servings = count or 12; per = 6.3
        else:
            servings = max(1, round((grams or sg) / sg))
            per = round(pack_protein / servings, 1)
        flags = classify(tier, audit)
        stores = store_code(store_line)
        store = stores[0]
        # trim audit to ~260 chars at sentence boundary
        aud = audit.strip()
        if len(aud) > 300:
            cut = aud[:300]
            cut = cut[:cut.rfind('.')+1] if '.' in cut else cut
            aud = cut
        pid += 1
        products.append({
            'id': pid, 'name': name, 'cat': cat, 'store': store, 'stores': stores,
            'price': round(price, 2), 'size': sizeText or '', 'grams': round(grams or 0),
            'protein': per, 'servings': servings, 'packProtein': pack_protein,
            'gd': gd, 'tier': tier, 'tlabel': tier_label(header), 'flags': flags,
            'audit': aud,
        })

print('total products:', len(products))
from collections import Counter
print('by tier:', Counter(p['tier'] for p in products))
print('by cat:', len(set(p['cat'] for p in products)), 'categories')
# sanity: top by gd
top = sorted(products, key=lambda p: -p['gd'])[:8]
for p in top: print(f"  {p['gd']:6.1f} g/$  T{p['tier']}  {p['name'][:42]:42}  {p['cat']:14} ${p['price']} {p['size']}")
json.dump(products, open('products.json','w'), separators=(',',':'))
print('wrote products.json', )
