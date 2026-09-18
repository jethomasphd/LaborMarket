// Real-browser check of the one-page dashboard (Playwright + the pre-installed Chromium).
// Serves the repo root, opens the page, and verifies every headline figure is DERIVED FROM
// THE DATA FILES (never typed in), that the chart/receipts/scale render, that nothing throws,
// and that the page fits a 360px phone without horizontal scroll. Screenshots go to SHOTS.
//
//   npm run check            (or)   node tests/site_check.mjs
//   SHOTS=/some/dir node tests/site_check.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 8099;
const BASE = `http://127.0.0.1:${PORT}/`;
const SHOTS = process.env.SHOTS || resolve(ROOT, "dist", "shots");
mkdirSync(SHOTS, { recursive: true });

// ---- expected values, computed straight from the data files (same rule as the page) ----
const J = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const events = J("data/ai-layoff-events.json").events;
const months = J("data/challenger-monthly.json").months.filter((m) => m.ai_cited_cuts != null).sort((a, b) => a.month.localeCompare(b.month));
const jolts = J("data/jolts-series.json");
const confirmedIn = (m) => events.filter((e) => e.ai_attribution === "B1" && ["A1", "A2"].includes(e.event_confidence) && e.date_announced.startsWith(m))
  .reduce((s, e) => s + (e.headcount || 0), 0);
const latest = months[months.length - 1];
const expClaimed = latest.ai_cited_cuts, expConfirmed = confirmedIn(latest.month);
const expPct = Math.round((1 - expConfirmed / expClaimed) * 100) + "%";
const fmt = (n) => n.toLocaleString("en-US");

let failures = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : "  <-- " + extra}`); if (!cond) failures++; };

// ---- serve the repo root ----
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));

// Use a system Chromium when one is provided (CHROMIUM_PATH, or the sandbox's /opt/pw-browsers link);
// otherwise Playwright's own download.
const executablePath = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ executablePath });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const jsErrors = [], badRequests = [];
  const isFont = (u) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u || "");
  page.on("pageerror", (e) => jsErrors.push(String(e)));
  page.on("requestfailed", (r) => { if (!isFont(r.url())) badRequests.push(r.url()); });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__HUMANCOST && document.querySelectorAll("#groups .row").length > 0, null, { timeout: 8000 });
  await page.waitForTimeout(1500);   // let the count-up finish

  const txt = async (sel) => (await page.textContent(sel))?.trim();
  ok("no JS exceptions", jsErrors.length === 0, jsErrors.join(" | "));
  ok("no failed requests (fonts excepted)", badRequests.length === 0, badRequests.join(", "));
  ok("error box hidden", await page.isHidden("#err"));
  ok(`hero month = ${latest.month}`, (await txt("#hero-month")).includes(latest.month.slice(0, 4)));
  ok(`hero claimed = ${fmt(expClaimed)} (from data)`, (await txt("#hero-claimed")) === fmt(expClaimed), await txt("#hero-claimed"));
  ok(`hero confirmed = ${fmt(expConfirmed)} (from data)`, (await txt("#hero-confirmed")) === fmt(expConfirmed), await txt("#hero-confirmed"));
  ok(`hero unverified = ${expPct} (from data)`, (await txt("#hero-pct")) === expPct, await txt("#hero-pct"));
  ok("stamp shows Challenger + JOLTS coverage", /Challenger through .* JOLTS through/.test(await txt("#stamp")), await txt("#stamp"));

  const nCols = await page.locator("#plot svg g.band").count();
  ok(`chart draws one column per Challenger month (${months.length})`, nCols === months.length, `got ${nCols}`);
  const nGold = await page.locator("#plot svg .col-conf").count();
  ok("gold (confirmed) segments present", nGold > 0);
  const nTableRows = await page.locator("#chart-table tbody tr").count();
  ok("table twin has one row per month", nTableRows === months.length, `got ${nTableRows}`);

  // hover a column → tooltip shows
  await page.locator("#plot svg g.band").last().hover();
  ok("tooltip appears on hover", await page.isVisible("#tip"));
  ok("tooltip carries the confirmed figure", (await txt("#tip")).includes(fmt(expConfirmed)));

  const nRows = await page.locator("#groups .row").count();
  ok(`receipts list every event (${events.length})`, nRows === events.length, `got ${nRows}`);
  ok("receipts count in copy matches", (await txt("#n-events")) === String(events.length));
  const nLinks = await page.locator("#groups a.src[href^='http']").count();
  ok("every receipt row links a source", nLinks === events.length, `got ${nLinks}`);
  // expand a row
  await page.locator("#groups .row").first().locator("button.co").click();
  ok("a row expands to its reasoning", await page.locator("#groups .row.open .rdet").first().isVisible());

  ok("scale draws three bars", (await page.locator("#scale-bars .bar").count()) === 3);
  const lastLay = jolts.series.layoffs_discharges.observations.filter((o) => o.value != null).pop();
  ok("scale line names the JOLTS month", (await txt("#scale-line")).includes(String(+lastLay.period.slice(0, 4))));

  // Walk the page so every scroll-revealed section is in before the full-page capture.
  const walk = async (pg) => { await pg.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); }); await pg.waitForTimeout(800); };
  await walk(page);
  const hiddenSections = await page.evaluate(() => [...document.querySelectorAll(".reveal")].filter((e) => getComputedStyle(e).opacity !== "1").length);
  ok("every section fully revealed after scrolling", hiddenSections === 0, `${hiddenSections} still dimmed`);
  await page.screenshot({ path: `${SHOTS}/desktop.png`, fullPage: true });

  // ---- phone ----
  const mobile = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await mobile.goto(BASE, { waitUntil: "networkidle" });
  await mobile.waitForFunction(() => window.__HUMANCOST, null, { timeout: 8000 });
  await mobile.waitForTimeout(1500);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("no horizontal overflow at 360px", overflow <= 2, `overflow=${overflow}px`);
  await walk(mobile);
  await mobile.screenshot({ path: `${SHOTS}/phone.png`, fullPage: true });
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
console.log(`screenshots: ${SHOTS}`);
process.exit(failures ? 1 : 0);
