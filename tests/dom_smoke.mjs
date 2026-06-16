// Headless render smoke test (jsdom). Verifies every view renders from the JSON layer
// without error, and that headline figures are DERIVED FROM DATA (not hardcoded).
// Run: node tests/dom_smoke.mjs
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.URL = dom.window.URL;
globalThis.Node = dom.window.Node;

const J = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const state = { loaded: true, data: {
  jolts: J("data/jolts-series.json"),
  events: J("data/ai-layoff-events.json"),
  challenger: J("data/challenger-monthly.json"),
  warn: J("data/warn-notices.json"),
  sources: J("data/sources.json"),
  manifestLog: J("data/manifest-log.json"),
  attribution: J("data/derived/ai-attribution-timeseries.json"),
  discrepancy: J("data/derived/discrepancy-series.json"),
  sectorRollup: J("data/derived/sector-rollup.json"),
} };

const imp = (rel) => import(pathToFileURL(resolve(ROOT, "assets/js", rel)).href);
let failures = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : "  <-- " + extra}`);
  if (!cond) failures++;
}

async function renderView(rel, fnName) {
  const mod = await imp(rel);
  const mount = document.createElement("main");
  mod[fnName](state, mount);
  await new Promise((r) => setTimeout(r, 30)); // flush queued chart microtasks
  return mount;
}

const run = async () => {
  // PULSE — B1-only headline derived from data (Snap 1000 + Citi 4200 = 5,200), B0 denominator, B3 excluded
  const pulse = await renderView("pulse.js", "renderPulse");
  const pt = pulse.textContent;
  check("pulse renders", pulse.children.length > 0);
  check("pulse headline = derived B1 total 5,200", pt.includes("5,200"), "B1 verified headcount must come from events");
  check("pulse marks B3 excluded from headline", /excluded from headline/i.test(pt));
  check("pulse shows B0 denominator", /denominator/i.test(pt));
  check("pulse names the discrepancy gap", /gap/i.test(pt));

  // LEDGER — events from data, count, companies
  const ledger = await renderView("ledger.js", "renderLedger");
  const lt = ledger.textContent;
  check("ledger lists Snap", lt.includes("Snap Inc."));
  check("ledger lists Citigroup", lt.includes("Citigroup"));
  check("ledger shows 8-event count", /of 8 events/.test(lt));
  check("ledger has tier badges", ledger.querySelectorAll(".badge").length > 0);

  // JOLTS — measured baseline, openings present, causation framing
  const jolts = await renderView("jolts.js", "renderJolts");
  const jt = jolts.textContent;
  check("jolts shows Openings", jt.includes("Openings"));
  check("jolts states it cannot attribute causation", /cannot attribute causation/i.test(jt));
  check("jolts renders a people figure (millions)", /\d\.\d+M/.test(jt), "openings ~7.6M derived from data");

  // ATTRIBUTION — rubric + discrepancy gap derived (May 38,579 - 1,000 = 37,579)
  const attr = await renderView("attribution.js", "renderAttribution");
  const at = attr.textContent;
  check("attribution explains STATED-BY-FIRM", at.includes("STATED-BY-FIRM"));
  check("attribution discrepancy gap = derived 37,579", at.includes("37,579"), "gap must be challenger - B1-verified");
  check("attribution has the rubric cards", attr.querySelectorAll(".rubric .card").length >= 7);

  // SOURCES — registry + manifest log + ceilings
  const src = await renderView("sources.js", "renderSources");
  const st = src.textContent;
  check("sources shows registry", /Source registry/i.test(st));
  check("sources shows manifest log id", st.includes("MAN-2026-06-15-seed"));
  check("sources shows a sha256", /sha256/i.test(st));
  check("sources shows GOV/LEGAL ceiling", st.includes("GOV / LEGAL"));

  console.log(`\n${failures ? "✗ " + failures + " FAIL" : "✓ all render checks passed"}`);
  process.exit(failures ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
