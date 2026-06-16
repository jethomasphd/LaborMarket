// Real-browser verification (Playwright/chromium): renders the live site, confirms the
// vendored chart libs load, captures console errors, and screenshots every tab.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:8099/";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const VIEWS = ["pulse", "ledger", "jolts", "attribution", "sources"];
const SEL = {
  pulse: ".counter", ledger: ".table-wrap", jolts: ".chart-box",
  attribution: ".discrepancy", sources: ".class-pill",
};

let failures = 0;
const ok = (n, c, x = "") => { console.log(`${c ? "ok  " : "FAIL"} ${n}${c ? "" : "  <-- " + x}`); if (!c) failures++; };

const isFont = (u) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u || "");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const jsErrors = [];       // real exceptions from our code
const badRequests = [];    // failed loads that are NOT the (sandbox-cert-blocked) font CDN
page.on("pageerror", (e) => jsErrors.push(String(e)));
page.on("requestfailed", (r) => { if (!isFont(r.url())) badRequests.push(r.url()); });

// Desktop: load each tab fresh, wait for its signature element, screenshot.
for (const v of VIEWS) {
  await page.goto(`${BASE}#/${v}`, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector(SEL[v], { timeout: 5000 });
    ok(`${v} renders (${SEL[v]})`, true);
  } catch {
    ok(`${v} renders (${SEL[v]})`, false, "selector not found");
  }
  await page.screenshot({ path: `${OUT}/${v}.png`, fullPage: true });
}

// Vendored libs actually loaded?
await page.goto(`${BASE}#/jolts`, { waitUntil: "networkidle" });
const libs = await page.evaluate(() => ({ chart: typeof window.Chart, d3: typeof window.d3 }));
ok("Chart.js vendored lib loaded", libs.chart === "function", `typeof=${libs.chart}`);
ok("D3 vendored lib loaded", libs.d3 === "object", `typeof=${libs.d3}`);

// A chart actually drew onto a canvas (non-zero pixels)?
const drew = await page.evaluate(() => {
  const cs = [...document.querySelectorAll("canvas")];
  return cs.some((c) => c.width > 0 && c.height > 0);
});
ok("a chart canvas has dimensions", drew);

// Mobile legibility at 360px — screenshot pulse.
const mobile = await browser.newPage({ viewport: { width: 360, height: 780 } });
await mobile.goto(`${BASE}#/pulse`, { waitUntil: "networkidle" });
await mobile.waitForSelector(".counter", { timeout: 5000 });
// No horizontal overflow (content fits the 360px viewport).
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok("no horizontal overflow at 360px", overflow <= 2, `overflow=${overflow}px`);
await mobile.screenshot({ path: `${OUT}/pulse-360.png`, fullPage: true });

ok("no JS exceptions from app code", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
ok("no failed requests (excluding sandbox-blocked font CDN)", badRequests.length === 0, badRequests.slice(0, 3).join(" | "));

await browser.close();
console.log(`\n${failures ? "✗ " + failures + " FAIL" : "✓ browser checks passed"} — shots in ${OUT}`);
process.exit(failures ? 1 : 0);
