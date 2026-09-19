# BUILD_LOG.md — HumanCost.ai (formerly LaborMarket.ai)

> The single authoritative record of build state. Per the Orchestrator Charter, no gate
> is marked green on assertion alone — only after the real check has been **run and watched
> to pass**. `seed.md` is the source of truth; this file is how we operate against it.

---

## Status snapshot

| | |
|---|---|
| **Date** | 2026-09-18 |
| **Branch** | `claude/admiring-hopper-hlfqto` |
| **Phase** | OPERATE (weekly loop) — second research pass applied + page rebuilt as “The Instrument”, 2026-09-18 |
| **Current step** | **All build gates green; two research passes applied (MAN-2026-06-16, MAN-2026-09-18).** Step 9 (Cloudflare connect) remains Jacob's. Next data events: JOLTS Aug 2026 on 2026-09-29; Challenger September report ~2026-10-01. |

---

## Environment & verification findings (reconnaissance, 2026-06-15)

Evidence gathered by running real checks in this remote sandbox:

- **Python** 3.11.15. `requests` present; `jsonschema` 4.26.0 + `python-dateutil` installed via pip (PyPI reachable). `pandas` avoidable — keeping deps lean per Jacob's standing preference.
- **Node** v22.22.2 available.
- **Network:** BLS API reachable (`HTTP 200`, v1 needs no key). PyPI reachable. FRED returns `400` (requires `api_key`).
- **Secrets:** `BLS_API_KEY` **NOT SET**, `FRED_API_KEY` **NOT SET** in this environment. v1 (keyless) is sufficient for verification and the seed fixtures; `fetch_jolts.py` will use **v2 (key) → v1 (keyless) → FRED (key)** fallback so it works in prod once keys are configured.
- **JOLTS series — LIVE ROUND-TRIP PASSED** (BLS v1 POST, startyear 2025 → 2026). All six national SA **level** series IDs from `seed.md §2.1/§5.3` returned data; latest = **2026-M04**, values match `seed.md` and confirm **unit = thousands (level, not rate)**:

  | series | id | 2026-M04 value |
  |---|---|---|
  | job_openings | `JTS000000000000000JOL` | 7,618 |
  | hires | `JTS000000000000000HIL` | 5,116 |
  | total_separations | `JTS000000000000000TSL` | 4,978 |
  | quits | `JTS000000000000000QUL` | 2,977 |
  | layoffs_discharges | `JTS000000000000000LDL` | 1,692 |
  | other_separations | `JTS000000000000000OSL` | 310 |

  → The charter's JOLTS guardrail ("verify every series ID against a live call; confirm the unit") is **satisfied** for these six. Catalog-metadata warnings are expected on keyless v1 and do not affect data correctness.

- **Deploy constraint:** This ephemeral sandbox has no Cloudflare credentials. **Step 9 (deploy) cannot be executed by the agent** — Jacob connects the repo to Cloudflare Pages. The agent will deliver complete deploy config (`_headers`, `wrangler.toml`) + a runbook, and verify the static site renders locally (served over `http://`), which is the agent-side gate.

---

## Open decisions — Human-in-the-loop (Charter §Human Contract)

| # | Decision | Status |
|---|---|---|
| 1 | **Aggregator ingestion** — scrape live vs. Phase-1 manifests only. | **DECIDED 2026-06-15 → Manifest-only (seed.md default).** No scrapers. Challenger/Layoffs.fyi/WARN enter via Update Manifests, validated like all data. |
| 2 | **JOLTS series IDs / units / scope** — verify against live API; choose scope. | **DECIDED 2026-06-15 → Six SA national level series (seed.md §5.3).** IDs+units verified live (findings above). |

---

## The 10 gated build steps (acceptance gates copied from `seed.md §10`)

Legend: ☐ not started · ◐ in progress · ☑ gate passed (evidence logged)

- **☑ Step 1 — Scaffold + schemas.** Tree created; 9 JSON Schemas (6 core + 3 derived); 8 seed events spanning A1/A2/A3 × B0/B1/B2/B3; sources registry; Challenger Jan–May; WARN ×2.
  - *Gate:* `python scripts/validate.py` passes on the fixtures. — **PASSED:** `✓ VALIDATION PASSED — 9 schemas … 0 warning(s). EXIT=0`.
- **☑ Step 2 — `fetch_jolts.py`.** v2(key)→v1(keyless)→FRED fallback chain; rate-vs-level poison guard; `meta.last_pull`.
  - *Gate:* live pull ≥24 months for all six series + validates. — **PASSED:** keyless BLS v1 pull returned **52 months** for all six series, latest 2026-04, unit=thousands; file validates.
- **☑ Step 3 — `validate.py` (full). [THE HARD GATE]** Enforces §5.2 rules 1–6 + §6 source-class ceilings + cross-file integrity + JOLTS poison.
  - *Gate:* malformed fixtures FAIL with clear messages + non-zero exit. — **PASSED:** `tests/fixtures/malformed-events` → `✗ VALIDATION FAILED — 3 error(s)` EXIT=1, refusing (a) B1-from-headline (“headline alone caps at B3”) and (b) averaged discrepancy (“headcount 1500 is the AVERAGE…”, “discrepancy_note is empty”). Locked as regression: `tests/test_validator.py` 9 passed.
- **☑ Step 4 — `apply_manifest.py` + `build_rollups.py`.** Manifest parse (add/update ops), candidate-then-commit (all-or-nothing), idempotency guard, sha256 logging, deterministic rollups.
  - *Gate:* apply twice = identical data + one log entry; rollups match hand-computed expectation. — **PASSED:** twice-applied `manifests/2026-06-15.md` → 10 events, one `MAN-2026-06-15` entry, byte-identical events file on re-run; `tests/` 17 passed (rollup hand-computed values, idempotency, A2→A1 upgrade, hash, malformed-manifest aborts with nothing applied). Committed `data/` kept at the clean 8-event pre-manifest state.
- **☑ Step 5 — Dashboard shell + data loader (`app.js`).** ES-module app: parallel fetch of all 9 JSON files, hash router, loading overlay, error state (with file:// hint), masthead injected from data.
  - *Gate:* all five tabs render from the JSON layer with zero hardcoded figures. — **PASSED:** headless jsdom render of all 5 views (`tests/dom_smoke.mjs` → "all render checks passed"); figure scan finds no data numbers in markup/JS (only hex colors, layout constants, unit multiplier); static server serves index/js/data at HTTP 200.
- **☑ Step 6 — PULSE + tier-honest AI counter.** Headline = B1 (stated-by-firm, A1/A2-verified) ONLY; B2 a distinct band; B3 shown but struck-through “excluded from headline”; B0 labeled denominator; epistemic disclaimer in-component.
  - *Gate:* a casual viewer cannot mistake a B3 figure for the headline; B0 denominator visible. — **PASSED:** render test asserts headline = derived 5,200 (Snap+Citi B1), “excluded from headline” on B3, “denominator” on B0.
- **☑ Step 7 — LEDGER, JOLTS, ATTRIBUTION, SOURCES.** Ledger (sort/filter/expand/CSV); JOLTS (six series + churn + causation framing); Attribution (rubric + B-composition + discrepancy); Sources (registry + ceilings + manifest log + methodology).
  - *Gate:* discrepancy panel renders Challenger-cited vs. B1-verified with the gap as its own series. — **PASSED:** D3 divergence + table; render test asserts derived gap 37,579 (May 38,579 − 1,000).
- **☑ Step 8 — Design pass.** Restrained Watchtower applied; Cormorant/IBM Plex type, restrained motion, responsive; Chart.js + D3 vendored locally (no runtime CDN). 
  - *Gate:* legible at 360px; tier colors consistent everywhere. — **PASSED:** real-browser Playwright run (`tests/screenshots.mjs`): all 5 views render, vendored libs load, a chart canvas has dimensions, **no horizontal overflow at 360px**, no JS exceptions. Screenshots captured (desktop + 360px). Exact tile values verified data-derived (Openings 7.62M …; headline 5,200).
- **◐ Step 9 — Deploy.** `_headers` (JSON cache + CORS), `wrangler.toml`, README deploy runbook all delivered; site is fully self-contained.
  - *Gate:* live at Pages URL; push triggers redeploy. — **AGENT-SIDE COMPLETE; Cloudflare connection is Jacob's to make** (this sandbox has no Cloudflare creds — surfaced per the Human Contract). Agent-side proof: site renders correctly served over HTTP (Playwright). **Action for Jacob:** Cloudflare → Pages → Connect to Git → this repo → preset None, output `/`.
- **☑ Step 10 — Docs.** README: mission, the two-axis rubric, views, the operate loop, local dev, **a worked correctly-tiered A1/B1 example**, the refusal rules, source-class ceilings, deploy runbook, ethics.
  - *Gate:* a stranger could submit a correctly-tiered event. — **PASSED:** the README's worked example was applied in a temp copy and **validates as written**; breaking it (B1-from-headline) is refused. Documentation is accurate and actionable.

---

## Change log (append-only)

- **2026-06-15 — Step 0 (orientation).** Read `seed.md` in full; inventoried repo (only `seed.md` present, on branch `claude/confident-feynman-ceqyix`). Probed environment; ran live BLS round-trip verifying all six JOLTS series IDs + units (evidence above). Wrote this BUILD_LOG. Surfaced the two open decisions. Next: await steer on Decision 1, then Step 1 (scaffold + schemas).
- **2026-06-15 — Decisions resolved.** Jacob chose Manifest-only (Decision 1) and Six SA level series (Decision 2) — both the seed.md defaults. No deviations. Proceeded to build.
- **2026-06-16 — Steps 1–3 GREEN.** Built schemas + fixtures (Step 1 gate passed), `fetch_jolts.py` + real 52-month JOLTS pull (Step 2 gate passed), and full `validate.py` (Step 3 HARD GATE passed — refuses both canonical lies, non-zero exit). pytest `tests/test_validator.py`: 9 passed. requirements.txt + .gitignore added.
- **2026-06-16 — Step 4 GREEN.** `apply_manifest.py` (candidate-then-commit, idempotent, sha256 log) + `build_rollups.py` (deterministic). Twice-applied manifest = identical data + one log entry; rollups hand-verified. tests: 17 passed.
- **2026-06-16 — Steps 5–8 + 10 GREEN.** Full dashboard (shell, loader/router, 5 views, charts) reading only the JSON layer; tier-honest PULSE counter; discrepancy panel (D3, gap as own series); Restrained Watchtower design. Verified via jsdom render harness AND real-browser Playwright (5 views, vendored Chart.js/D3, 360px no-overflow, no JS errors, screenshots). README with worked correctly-tiered example (validated in a temp copy; breaking it is refused). Step 9 config (`_headers`, `wrangler.toml`) delivered; Cloudflare connection awaits Jacob.
- **2026-06-16 — Operate phase: `/ops` + first real data pass.** Added the weekly machine (`ops/` prompts + runbook + audit); extended `apply_manifest` (challenger_upsert + source_add). Ran the **first real Phase-1 research pass** (3 parallel agents + seam-verification): corrected Challenger Jan–May to actual published figures (YTD reconciles 397,755/87,714) and replaced the illustrative seed with **19 real, primary-sourced 2026 events**, conservatively tiered (B1:7/B2:5/B3:1/B0:6), applied via `manifests/2026-06-16.md` through the validated pipeline. `provenance=researched`; seed banner cleared. Real gap (claimed−confirmed): Jan 6,844 · Feb 680 · Mar 13,741 · Apr 20,490 · May 35,879. Tests refactored to a self-contained fixture; 17 pytest + render harness (data-driven) + Playwright all green. **B-tiers flagged for Jacob's review.**
- **Definition of Done:** 9/10 gates green; Step 9 is the single human-gated item (Cloudflare connect → live URL → push-redeploy). No hardcoded figures anywhere; validator refuses lies; README lets a stranger submit a tiered event.
- **2026-06-16 — REBRAND → HumanCost.ai + story-first redesign (Jacob's call).** "LaborMarket.ai" was taken. Renamed across all user-facing surfaces (masthead, title/meta, README, schema $ids, package/wrangler slug); GitHub repo path + `seed.md` covenant + dated manifest history left intact. Redesigned PULSE as a story-first landing for laypeople: plain-language hero ("Are companies really cutting jobs because of AI?"), a claimed-vs-confirmed centerpiece (38,579 vs 1,000, gap 37,579), a how-to-read strip, scale context, and the honest tier breakdown — all still data-driven. Added plain-language labels to every tier (e.g. B1 → "Company blames AI"), a ledger decode key, and plainer copy across JOLTS/Attribution/Sources. Data layer + validators unchanged. Re-verified: validate exit 0; pytest 17; render harness all-pass; Playwright all-pass (no overflow at 360px). **Still pending (Jacob):** buy humancost.ai, point the Cloudflare custom domain at it, merge to redeploy; optionally rename the GitHub repo.
- **2026-09-18 — RADICAL SIMPLIFICATION: one page, one idea (Jacob's call — "the concept was good but it was way too complicated").** Replaced the five-tab app (`assets/js/*` router + 5 view modules, vendored Chart.js/D3 ~480 KB, `watchtower.css`) with a single `index.html` (inline CSS + JS, zero dependencies, inline-SVG chart). The page makes one argument in five beats: the two numbers (blamed on AI vs. company said AI, latest month, with the % unverified) → the gap month by month (stacked columns, gold = confirmed, grey = unverified, AI-share row) → the receipts (all events grouped in plain language, sourced, expandable) → zoom out (JOLTS layoffs vs. blamed vs. confirmed on one linear scale) → how we count + limitations. No A1/B1 codes on the surface; the rubric is applied in the page's JS with the same B1 ∧ A1/A2 rule as `build_rollups.py`. **Data layer, schemas, validator, manifest pipeline, ops loop: untouched.** Added `scripts/build_standalone.py` (inlines the three data files → `dist/humancost.html`, opens from disk). Tests: old jsdom/Playwright harnesses removed; new `tests/site_check.mjs` proves hero figures equal values recomputed from the data files, chart/table/receipts/scale render, tooltip + row expansion work, no JS errors, no horizontal overflow at 360px. Chart palette validated against the dark surface (gold marks stepped to `#c98500`; ember `#c9a227` kept for text accents). Verified: validate exit 0 · pytest 17 passed · site_check all-pass · standalone opens from `file://`.
- **2026-09-18 — SECOND RESEARCH PASS (`manifests/2026-09-18.md`, MAN-2026-09-18) + page rebuilt as “The Instrument”.** Three parallel research agents (Challenger reports; AI-attributed events; baseline events + corrections + context) with seam verification of the flagship B1 cases against primary sources by the orchestrating session (Rackspace 8-K, Visa, GitLab CEO post, Microsoft company post). **Claimed layer:** Challenger Jun/Jul/Aug 2026 added from the report PDFs — 45,849/14,029 · 33,429/10,970 · 52,881/3,462 (total/AI); YTD chains with zero residual to 529,914 / 116,175; no revisions to Jan–May. AI-cited cuts peaked in May (40% of the month), held near a third in Jun/Jul, then fell to 6.5% in August. **Event layer:** 27 new events (8 B1 — GitLab, Rackspace, Uber customer support, monday.com, Visa, ServiceNow, Chime, Oracle Sept round; every one mixed-cause or floor-counted — 3 B2, 6 B3, 10 B0) and 17 corrections (SEC filings corroborate Pinterest, Block, Atlassian, Snap, Cloudflare, Coinbase, Wix → A1; Cloudflare 1,000→1,100 and Estée Lauder 9,000→10,000 per filings; Oracle B2→B1 on its 10-K's own AI language with the count still undisclosed; Intel's uncorroborated count → A3; GM/Disney dates; sharper disputed-figure notes). Editorial rulings recorded in the manifest's Provenance (Microsoft held at B3 because its own post says the roles are “not being replaced by AI”; Robinhood B0; WARN floors used as documented counts with “FLOOR, NOT TOTAL” notes; WARNTracker classed as an aggregator). Ledger: 46 events (B1 16 · B2 7 · B3 7 · B0 16; A1 32 · A2 13 · A3 1); registry +71 sources. **Measured layer:** JOLTS re-pulled through 2026-07 (BLS's keyless quota was spent from this environment → new keyless FRED CSV fallback in `fetch_jolts.py`). **Result:** Jan–Aug claimed 116,175 vs. 14,978 meeting the strict bar (87% unverified); August 3,462 claimed vs. 0 on the record. **Page:** rebuilt in six numbered movements — the numbers (year-to-date hero + the “where do you set the bar?” control that recomputes every gold figure across three evidentiary standards), the seam (monthly columns + cumulative seam chart), the telephone game (disputed figures as ranges), the receipts (46 events, groups marked counted/not-counted, “new” tags), the baseline (55-month JOLTS line + proportion bars), the method (+ a what-changed box from the manifest log). Gates: validate exit 0 with 3 intentional warnings (Robinhood carries a control-case note on a B0 row; Tyson 3,218 and Oracle-Sept 800 are sums of two state WARN records, documented in their notes) · pytest 17 · site_check 31/31 · standalone opens from file://.
