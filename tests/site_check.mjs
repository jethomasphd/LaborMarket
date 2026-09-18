// Real-browser check of the one-page dashboard (Playwright + Chromium).
// Serves the repo root, opens the page, and verifies every headline figure is DERIVED FROM
// THE DATA FILES (never typed in), that the charts/receipts/baseline render, that the
// evidentiary-bar control recomputes the numbers, that nothing throws, and that the page
// fits a 360px phone without horizontal scroll. Screenshots go to SHOTS (default dist/shots).
//
//   npm run check            (or)   node tests/site_check.mjs
//   SHOTS=/some/dir CHROMIUM_PATH=/path/to/chrome node tests/site_check.mjs
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

// ---- expected values, computed straight from the data files (same rules as the page) ----
const J = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const events = J("data/ai-layoff-events.json").events;
const months = J("data/challenger-monthly.json").months.filter((m) => m.ai_cited_cuts != null).sort((a, b) => a.month.localeCompare(b.month));
const jolts = J("data/jolts-series.json");
const countable = (e) => ["A1", "A2"].includes(e.event_confidence);
const sumIn = (m, tiers) => events.filter((e) => countable(e) && tiers.includes(e.ai_attribution) && e.date_announced.startsWith(m)).reduce((s, e) => s + (e.headcount || 0), 0);
const latest = months[months.length - 1];
const ytdOf = (tiers) => months.reduce((s, m) => s + sumIn(m.month, tiers), 0);
const expClaimed = months.reduce((s, m) => s + m.ai_cited_cuts, 0);   // year to date — the hero
const expStrict = ytdOf(["B1"]);
const expLoose = ytdOf(["B1", "B2", "B3"]);
const expPct = Math.round((1 - expStrict / expClaimed) * 100) + "%";
const expLatestStrict = sumIn(latest.month, ["B1"]);
const fmt = (n) => n.toLocaleString("en-US");
const lastLay = jolts.series.layoffs_discharges.observations.filter((o) => o.value != null).pop();

let failures = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : "  <-- " + extra}`); if (!cond) failures++; };

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));

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
  await page.waitForTimeout(1600);   // let the count-up finish

  const txt = async (sel) => (await page.textContent(sel))?.trim();
  ok("no JS exceptions", jsErrors.length === 0, jsErrors.join(" | "));
  ok("no failed requests (fonts excepted)", badRequests.length === 0, badRequests.join(", "));
  ok("error box hidden", await page.isHidden("#err"));
  ok(`hero names the year through ${latest.month}`, (await txt("#hero-year")).includes(latest.month.slice(0, 4)));
  ok(`hero claimed (YTD) = ${fmt(expClaimed)} (from data)`, (await txt("#hero-claimed")) === fmt(expClaimed), await txt("#hero-claimed"));
  ok(`hero strict (YTD) = ${fmt(expStrict)} (from data)`, (await txt("#hero-confirmed")) === fmt(expStrict), await txt("#hero-confirmed"));
  ok(`verdict = ${expPct} unverified (from data)`, (await txt("#verdict")).includes(expPct), await txt("#verdict"));
  ok(`latest-month line = ${fmt(latest.ai_cited_cuts)} / ${fmt(expLatestStrict)} (from data)`, (await txt("#latest")).includes(fmt(latest.ai_cited_cuts)) && (await txt("#latest")).includes(fmt(expLatestStrict)), await txt("#latest"));
  ok("stamp shows Challenger + JOLTS coverage", /Challenger through .* JOLTS through/.test(await txt("#stamp")), await txt("#stamp"));

  // II — the seam
  ok(`monthly chart: one column per Challenger month (${months.length})`, (await page.locator("#plot svg g.band").count()) === months.length);
  ok("monthly chart: gold segments present", (await page.locator("#plot svg .col-conf").count()) > 0);
  ok("seam chart drawn (two lines + area)", (await page.locator("#seam svg .ln").count()) === 2 && (await page.locator("#seam svg .area-u").count()) === 1);
  ok("table twin has one row per month", (await page.locator("#chart-table tbody tr").count()) === months.length);
  await page.locator("#plot svg g.band").last().hover();
  ok("monthly tooltip appears on hover", await page.isVisible("#fig-monthly .tip"));
  ok("monthly tooltip carries the latest month's strict figure", (await txt("#fig-monthly .tip")).includes(fmt(expLatestStrict)));
  await page.locator("#seam svg").focus();
  await page.keyboard.press("ArrowLeft");
  ok("seam chart answers the keyboard", await page.isVisible("#fig-seam .tip"));
  await page.mouse.move(5, 5);

  // the bar — loosen to headlines and watch the number change
  await page.locator('#bar-opts button[data-std="2"]').click();
  await page.waitForTimeout(900);
  ok(`bar → headlines: hero = ${fmt(expLoose)} (from data)`, (await txt("#hero-confirmed")) === fmt(expLoose), await txt("#hero-confirmed"));
  ok("bar → headlines: B3 group marked counted", (await page.locator('#groups .group[data-key="B3"].counted').count()) === 1);
  ok("bar → headlines: B0 never counted", (await page.locator('#groups .group[data-key="B0"].counted').count()) === 0);
  await page.locator('#bar-opts button[data-std="0"]').click();
  await page.waitForTimeout(900);
  ok("bar → strict again: hero restored", (await txt("#hero-confirmed")) === fmt(expStrict));

  // III/IV — disputes + receipts
  const nDisputed = events.filter((e) => e.discrepancy_note || new Set((e.sources || []).map((s) => s.headcount).filter((v) => v > 0)).size > 1).length;
  ok(`telephone game renders disputed events (${nDisputed} candidates)`, (await page.locator("#disputes .dispute").count()) >= Math.min(1, nDisputed));
  if (nDisputed > 6) {
    ok("telephone game shows six, hides the rest", (await page.locator("#disputes > .dispute").count()) === 6 && await page.isHidden("#disputes .more"));
    await page.locator("#disputes .morebtn").click();
    ok("…and the toggle reveals them all", (await page.locator("#disputes .dispute:visible").count()) === (await page.locator("#disputes .dispute").count()));
  }
  ok(`receipts list every event (${events.length})`, (await page.locator("#groups .row").count()) === events.length);
  ok("receipts count in copy matches", (await txt("#n-events")) === String(events.length));
  ok("every receipt row links a source", (await page.locator("#groups a.src[href^='http']").count()) === events.length);
  await page.locator("#groups .row").first().locator("button.co").click();
  ok("a row expands to its reasoning", await page.locator("#groups .row.open .rdet").first().isVisible());

  // V — the baseline
  ok("JOLTS line drawn", (await page.locator("#jolts-line svg .ln").count()) === 1);
  ok("JOLTS note names the latest month", (await txt("#jolts-note")).includes(lastLay.period.slice(0, 4)));
  ok("baseline draws three bars", (await page.locator("#scale-bars .barrow").count()) === 3);
  ok("what-changed box populated", ((await txt("#changes")) || "").length > 40);

  // walk the page so every scroll-revealed section is in before the full-page capture
  const walk = async (pg) => { await pg.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo({ top: 0, behavior: "instant" }); }); await pg.waitForTimeout(900); };
  await walk(page);
  const dimmed = await page.evaluate(() => [...document.querySelectorAll(".reveal")].filter((e) => getComputedStyle(e).opacity !== "1").length);
  ok("every section fully revealed after scrolling", dimmed === 0, `${dimmed} still dimmed`);
  await page.screenshot({ path: `${SHOTS}/desktop.png`, fullPage: true });

  // ---- phone ----
  const mobile = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await mobile.goto(BASE, { waitUntil: "networkidle" });
  await mobile.waitForFunction(() => window.__HUMANCOST, null, { timeout: 8000 });
  await mobile.waitForTimeout(1600);
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
