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

const fmt = (n) => n.toLocaleString("en-US");
// Expected values computed FROM the data, so this stays valid as the data changes weekly.
const dmonths = state.data.discrepancy.months.filter((m) => m.challenger_ai_cited != null);
const lastM = dmonths[dmonths.length - 1];
const b1total = state.data.events.events
  .filter((e) => e.ai_attribution === "B1" && e.event_confidence !== "A3")
  .reduce((s, e) => s + (e.headcount || 0), 0);
const companies = state.data.events.events.map((e) => e.company);
const nEvents = state.data.events.events.length;

const run = async () => {
  // PULSE — story-first: claimed vs confirmed gap + B1 breakdown, all derived from data
  const pulse = await renderView("pulse.js", "renderPulse");
  const pt = pulse.textContent;
  check("pulse renders", pulse.children.length > 0);
  check("pulse hero shows derived claimed number", pt.includes(fmt(lastM.challenger_ai_cited)), `${fmt(lastM.challenger_ai_cited)} from data`);
  check("pulse hero shows derived gap", pt.includes(fmt(lastM.gap)), `gap ${fmt(lastM.gap)}`);
  check("pulse breakdown headline = derived B1 total", pt.includes(fmt(b1total)), `B1 total ${fmt(b1total)}`);
  check("pulse marks unproven claims as never added", /never added to this number/i.test(pt));
  check("pulse shows the non-AI baseline", /baseline/i.test(pt));
  check("pulse uses plain tier label 'Not about AI'", /Not about AI/i.test(pt));

  // LEDGER — events from data, count, companies
  const ledger = await renderView("ledger.js", "renderLedger");
  const lt = ledger.textContent;
  check("ledger lists first event company", lt.includes(companies[0]), companies[0]);
  check("ledger lists another event company", lt.includes(companies[1]), companies[1]);
  check("ledger shows full event count", lt.includes(`of ${nEvents} events`), `${nEvents} events`);
  check("ledger has tier badges", ledger.querySelectorAll(".badge").length > 0);

  // JOLTS — measured baseline, openings present, causation framing
  const jolts = await renderView("jolts.js", "renderJolts");
  const jt = jolts.textContent;
  check("jolts shows Openings", jt.includes("Openings"));
  check("jolts says it never explains why", /never/i.test(jt) && /why/i.test(jt));
  check("jolts renders a people figure (millions)", /\d\.\d+M/.test(jt), "openings ~7.6M derived from data");

  // ATTRIBUTION — rubric + discrepancy gap derived (May 38,579 - 1,000 = 37,579)
  const attr = await renderView("attribution.js", "renderAttribution");
  const at = attr.textContent;
  check("attribution uses plain label 'Company blames AI'", at.includes("Company blames AI"));
  check("attribution discrepancy gap = derived", at.includes(fmt(lastM.gap)), `gap ${fmt(lastM.gap)}`);
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
