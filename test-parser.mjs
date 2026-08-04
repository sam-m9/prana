// Standalone diagnostic for the PRANA nutrition-parser Lambda endpoint.
// Mocked by default (no network call, no Gemini quota used).
// Run: node test-parser.mjs
// For a real call against the live endpoint: LIVE_TEST=true node test-parser.mjs
const PRANA_PARSER_URL = "https://qnhxxeyf3lecnohzcaperd7kwm0ofsgg.lambda-url.us-east-1.on.aws/";
const LIVE = process.env.LIVE_TEST === "true";

const payload = { transcript: "Had a 3 egg omelet with 30g cheddar cheese and black coffee" };

if (!LIVE) {
  globalThis.fetch = async (url, opts) => {
    const body = { data: {
      food_items: ["3 egg omelet", "30g cheddar cheese", "black coffee"],
      protein_g: 27, carbs_g: 2, fat_g: 24, pe_ratio: 0.53, diaas_tier: "high",
    }};
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

async function main() {
  console.log(LIVE ? "[LIVE — hitting real endpoint]" : "[MOCKED — no network call, no Gemini quota used]");
  console.log("POST", PRANA_PARSER_URL);
  console.log("Body:", JSON.stringify(payload));

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);

  const started = Date.now();
  let res;
  try {
    res = await fetch(PRANA_PARSER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error(`\nRequest failed after ${Date.now() - started}ms:`, err.message || err);
    process.exit(1);
  }
  clearTimeout(timeout);

  console.log(`\nHTTP ${res.status} ${res.statusText} (${Date.now() - started}ms)`);

  if (res.status === 429) {
    console.warn("Daily Gemini limit reached (429) — no data to display.");
    process.exit(0);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Non-OK response body:", text);
    process.exit(1);
  }

  const result = await res.json();
  const data = result && result.data;
  if (!data) {
    console.error("Response had no `.data` field. Full response:", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("\n--- Parsed result ---");
  console.log(JSON.stringify({
    food_items: data.food_items,
    protein_g: data.protein_g,
    carbs_g: data.carbs_g,
    fat_g: data.fat_g,
    pe_ratio: data.pe_ratio,
    diaas_tier: data.diaas_tier,
  }, null, 2));
}

main();
