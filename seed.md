# ◊ LaborMarket.ai — PROJECT SEED ◊
### A Definitive, Dual-Agent Intelligence Dashboard for the U.S. Labor Market in the Age of the Information Flood

> **Scribe:** Jacob E. Thomas, PhD — Principal Investigator, LAMP Lab, Results Generation
> **Architecture lineage:** IranWar.ai (Operation Epic Fury event-level dataset & dashboard)
> **Operating doctrine:** *The Word against the Flood* — attention as contested ground; transparency as counter-technology
> **This document is a covenant, not a config.** It tells a coding agent what to build, why it matters, and how the machine must operate after it is built.

---

## 0. READ THIS FIRST (Agent Orientation)

You are a coding agent (Claude Code) being unleashed on an empty (or near-empty) GitHub repository. Your job has **two horizons**:

1. **BUILD (one-time scaffold).** Stand up the full static-site dashboard, the JSON data layer, the validation tooling, and the operating scripts described below. Deploy to Cloudflare Pages.
2. **OPERATE (recurring loop).** This project is not a one-shot artifact. It is a *machine that is run daily/weekly* by a two-phase human-in-the-loop pipeline (Section 3). You are building the second half of that machine: the part that ingests an **Update Manifest** and applies it deterministically to the data layer.

**Non-negotiable design commitments** (these are the soul of the project — violating them defeats the entire point):

- **Event-level granularity.** Aggregation is irreversible. Store the smallest observable unit; roll up in the view layer, never in storage.
- **Record-level source attribution.** Every datum names its source. No orphan numbers.
- **Two-axis confidence scoring** (Section 4). Every layoff event carries both an *event-confidence* tier and an *AI-attribution-confidence* tier. **These are orthogonal and are NEVER collapsed into one number.**
- **No false consensus.** When sources disagree, store *both* figures and their provenance. Do not average contested numbers into a single "clean" value. A discrepancy is signal, not noise.
- **Radical transparency about uncertainty.** Interpolations, inferences, and unverified records are labeled as such, in the data and on the surface.
- **Self-contained, no backend.** Static HTML/CSS/JS + JSON. Hostable on Cloudflare Pages with zero server.

If you find yourself "cleaning up" the data by hiding uncertainty, stop. The uncertainty *is the product.*

---

## 1. MISSION

The U.S. labor market is being narrated faster than it can be measured.

Government instrumentation (JOLTS, CES, the unemployment rate) is rigorous but lagged by 5–6 weeks and structurally incapable of isolating *why* a job disappeared. Meanwhile, a real-time narrative layer — outplacement-firm press releases, crowdsourced trackers, WARN filings, analyst notes, and AI-generated summaries of all of the above — moves at the speed of the feed, attributes causation it cannot prove, and is increasingly ingested back into the models that then re-summarize it. This is the **dual-layer information flood** applied to labor:

- **Structural layer.** Volume, velocity, and synthetic origin of labor-market claims overwhelm the infrastructure available to evaluate them. Confidence intervals and provenance get stripped as a claim moves from filing → tracker → headline → model summary.
- **Strategic layer.** Actors *produce* labor narratives on purpose. "We cut these roles because of AI" is a strategic statement — it can flatter a stock price, soften the optics of an overhiring correction, or be literally true. The firm has incentives; the diaspora of laid-off workers has different ones; the press has a third set.

**LaborMarket.ai is the counter-technology.** It does not try to be faster than the flood. It tries to make the flood *assessable*: structured, provenance-tagged, confidence-scored labor data that holds the measured baseline and the contested narrative in the same frame — and shows you exactly where they diverge.

The defining intellectual move of this dashboard is one number handled correctly:

> **"X jobs lost to AI" is the labor-market equivalent of a contested casualty count.**
> It is among the least epistemically stable figures in circulation, because it silently fuses four distinct things: (a) direct task substitution, (b) budget reallocation from headcount to AI capex, (c) narrative laundering of cuts that would have happened anyway, and (d) genuine uncertainty inside the firm itself. A serious instrument never reports this as a single confident number. It reports a *claim*, attributed, tiered, and shown against the verified baseline.

---

## 2. THE DATA REALITY (Current as of mid-2026 — for grounding, not hardcoding)

The agent should treat these as the live signal landscape the dashboard must integrate. **Do not hardcode these figures into the UI** — they flow in through the data layer and the update loop. They are here so you understand the shape of what you are building.

### 2.1 The measured baseline — JOLTS (high trust, lagged, causation-blind)
- **What it is:** BLS monthly survey, ~21,000 establishments. Six series: Job Openings, Hires, Quits, Layoffs & Discharges, Other Separations, Total Separations. National + state (publication changes land July 22, 2026).
- **Release cadence:** ~first week of the month, two months in arrears (April 2026 data released June 2, 2026).
- **Most recent reading at seed time (April 2026):** Openings ≈ 7.6M; Hires ≈ 5.1M; Total Separations ≈ 5.0M; Quits ≈ 3.0M; Layoffs & Discharges ≈ 1.7M.
- **Critical property:** JOLTS measures churn with rigor but *cannot tell you a layoff was caused by AI.* It is the honest denominator the narrative layer lacks.

### 2.2 The narrative layer — Challenger, Gray & Christmas (the contested numerator)
- **What it is:** Monthly Job Cut Announcement Report. Tracks **AI as a stated reason since 2023.** This is *announced/cited* cuts — claims, not verified causation.
- **The trajectory that makes this dashboard necessary:** AI-cited cuts as a share of monthly totals ran roughly 7% (Jan) → 10% (Feb) → 25% (Mar) → 26% (Apr) → **40% (May, the highest monthly figure ever recorded for the reason).** Year-to-date through May ≈ 87,714 AI-cited cuts (~22% of 2026 cuts), already surpassing the 54,836 attributed to AI in *all* of 2025.
- **The methodological landmine, stated by the source itself:** even where AI is not literally performing the role, the *budget* for the role is being redirected to AI. This is exactly why attribution must be tiered, not asserted.
- **The cross-domain tell:** the same source explicitly names the **U.S.–Iran war** (your IranWar.ai theater) and tariff policy as concurrent layoff drivers. The flood is not modular. Your two projects touch the same data.

### 2.3 The crowdsourced/aggregator layer (medium trust, tech-skewed, fast)
- **Layoffs.fyi** (Roger Lee, since 2020; 450,000+ aggregated; free with attribution): tech/startup layoffs. 2025 ≈ 123,941 at 269 companies. 2026 Q1 ≈ 81,700 tech cuts (highest quarterly since early 2023); topped 100K by early May.
- **WARN notices** (Worker Adjustment and Retraining Notification Act): state filings, employers with 100+ employees must give 60 days' notice for mass layoffs (50+). **Public record, often precede announcements**, but threshold-limited and uneven across states. Aggregators: WARNTracker.com, LayoffTrends, Revamped, etc.
- **Named 2026 events to expect in the feed:** Dell (~11K / 10%), Oracle (largest in its history, pivoting spend to AI data centers), Meta Reality Labs (~10%), Amazon/AWS (~16K), Citigroup (~4.2K back-office, AI automation), Snap (~1K, CEO cites AI), Intel, Cisco, LinkedIn, TCS (~23.5K).

### 2.4 Source access (programmatic)
- **BLS Public Data API:** v1 (GET, no key) and **v2** (POST, free registration key, up to 50 series/request, 20-year span, net/percent-change calcs, catalog metadata, `latest=true`). Endpoint: `https://api.bls.gov/publicAPI/v2/timeseries/data/`. Signature: `https://www.bls.gov/developers/api_signature_v2.htm`.
- **FRED API** (St. Louis Fed): mirrors BLS JOLTS series + broader macro (840k+ series). Useful for baselines, recession shading, cross-checks.
- **Challenger / Layoffs.fyi / WARN:** no clean public API. These enter via the **Phase 1 research agent**, which reads the published reports and produces structured manifest entries with attribution. *This is by design — the human-curated research phase is where strategic-layer judgment lives.*

> **JOLTS series IDs (starting points — the agent MUST verify against the BLS series directory before trusting them).**
> National, total nonfarm, seasonally adjusted, level (thousands):
> Openings `JTS000000000000000JOL` · Hires `JTS000000000000000HIL` · Total Sep `JTS000000000000000TSL` · Quits `JTS000000000000000QUL` · Layoffs & Discharges `JTS000000000000000LDL` · Other Sep `JTS000000000000000OSL`.
> FRED mirrors: `JTSJOL`, `JTSHIL`, `JTSTSL`, `JTSQUL`, `JTSLDL`, `JTSOSL`.
> Rate series swap the trailing `L` for `R`. **Do not ship a series ID you have not round-tripped against a live API call.**

---

## 3. THE OPERATING MODEL — DUAL-AGENT PIPELINE

This mirrors the IranWar.ai two-phase protocol exactly. The dashboard is a *static publication target*; the intelligence comes from a recurring loop the human (Jacob) runs.

```
                        ┌─────────────────────────────────────────────┐
                        │            DAILY / WEEKLY CYCLE             │
                        └─────────────────────────────────────────────┘

   ┌──────────────────────────┐         ┌──────────────────────────────┐
   │  PHASE 1 — DEEP RESEARCH  │         │   PHASE 2 — CODE EXECUTION   │
   │  (Claude, research mode)  │         │   (Claude Code, this repo)   │
   ├──────────────────────────┤         ├──────────────────────────────┤
   │ • Pull latest JOLTS / FRED│         │ • Read update_manifest.md     │
   │ • Read Challenger report   │  ──▶    │ • Validate every entry vs     │
   │ • Scan Layoffs.fyi / WARN  │ MANIFEST│   schema + rubric (Sec 4–5)   │
   │ • Reconcile discrepancies  │         │ • Apply edits to /data/*.json │
   │ • Assign A-tier + B-tier   │         │ • Run validate.py (must pass) │
   │ • Emit Update Manifest     │         │ • Regenerate derived rollups  │
   │   (structured, attributed) │         │ • Commit + push               │
   └──────────────────────────┘         └───────────────┬──────────────┘
                                                          │
                                                          ▼
                                          ┌──────────────────────────────┐
                                          │  Cloudflare Pages auto-deploy │
                                          │      → https://labormarket.ai │
                                          └──────────────────────────────┘
```

**Phase 1 (Deep Research).** A human-directed research agent reads the day's reporting and produces an **Update Manifest** (Section 8): a structured document specifying every data change, every source, and — critically — every confidence-tier assignment. When sources disagree (e.g., Challenger's AI-cited total vs. firm-stated cuts), the manifest records **both figures and their sources**, never an average. This is where strategic-layer interpretation happens; it is intentionally not automated.

**Phase 2 (Code Execution — what you are building the consumer for).** The coding agent ingests the manifest, validates it against the schema and the rubric, applies it deterministically to the JSON data files, regenerates derived rollups, runs the validator, and commits. Cloudflare redeploys on push.

**Your build must make Phase 2 a one-command operation:** `python apply_manifest.py manifests/2026-06-15.md` → validated, applied, rollups rebuilt, ready to commit.

---

## 4. THE CONFIDENCE RUBRIC — THE CROWN JEWEL

Every layoff event carries **two orthogonal tiers**. This is the single most important specification in this document. It is the labor-market generalization of IranWar.ai's "record both casualty figures and the source of each."

### Axis A — Event Confidence: *Did the layoff happen, and at what magnitude?*

| Tier | Name | Evidentiary standard |
|------|------|----------------------|
| **A1** | VERIFIED | Government/legal record: WARN filing, SEC disclosure (8-K/10-Q), or official company statement with a headcount figure. |
| **A2** | REPORTED | Credible secondary reporting (Reuters, Bloomberg, NYT) or established aggregator (Layoffs.fyi) naming the company and an approximate count; not yet in a filing. |
| **A3** | UNCONFIRMED | Rumor, anonymous internal memo, single-source social post, or no count available. |

### Axis B — AI-Attribution Confidence: *Is AI actually the cause?*

| Tier | Name | Standard | What it really means |
|------|------|----------|----------------------|
| **B1** | STATED-BY-FIRM | The company explicitly attributes the cut to AI/automation (CEO statement, filing language, internal memo). | The **strongest attribution signal — but it is a claim, not proof of causation.** Treat like a CENTCOM target list: authoritative as to *what the actor asserts*, not as to ground truth. |
| **B2** | STRUCTURAL-INFERENCE | No explicit firm attribution, but role composition (support, junior SWE, content, data-entry) + concurrent AI capex + sector pattern make displacement plausible. | An *inference by the analyst*, labeled as such. |
| **B3** | NARRATIVE-ONLY | "AI" appears only in third-party framing (headline, analyst, tracker tag) — or is contradicted by other stated firm reasons (tariffs, demand, overhiring). | A contested narrative artifact. The flood talking to itself. |
| **B0** | NOT-ATTRIBUTED | No actor claims AI involvement; ordinary macro/structural layoff. | **Most layoffs are B0.** Essential context. |

### The rule that makes the dashboard honest

> The headline **"AI-attributed cuts"** counter shows the **B1 (stated-by-firm) total only.** B2 (inferred) renders as a *separate, visually distinct band*. B3 (narrative) is shown but *never summed into the headline.* B0 is the denominator that keeps the AI story proportionate.
>
> **The dashboard must make it impossible to read "AI is causing N layoffs" as a settled fact when the evidence is a tier-B3 headline.** If a designer choice would let a casual viewer conflate B1 and B3, that choice is wrong.

### The discrepancy panel (required)
Render, side by side and explicitly labeled:
- Challenger's **AI-cited** monthly total (their methodology, their claim), vs.
- LaborMarket.ai's **B1 firm-stated, A1/A2-verified** total (your stricter standard).

The gap between these two numbers is not an error to reconcile. **It is the measurement of the strategic layer** — the distance between what is claimed and what is independently corroborated. Treat it as a first-class metric and chart it over time.

---

## 5. DATA ARCHITECTURE

Static JSON in `/data/`. UTF-8. ISO-8601 dates. Every file validates against a JSON Schema in `/schemas/`. Nothing is discarded; fields that don't fit the common schema live in domain-prefixed `extra_*` keys.

### 5.1 File inventory

| File | Grain | Purpose |
|------|-------|---------|
| `data/jolts-series.json` | month × series | The measured baseline. Pulled from BLS/FRED. |
| `data/ai-layoff-events.json` | event | The core event-level ledger. Two-axis tiered. |
| `data/challenger-monthly.json` | month | The narrative-layer aggregate (AI-cited share, total cuts, top reasons). |
| `data/warn-notices.json` | filing | WARN filings ingested as A1-eligible corroboration. |
| `data/sources.json` | source | Source registry with reliability class (Section 6). |
| `data/manifest-log.json` | manifest | Provenance trail: every update, dated, with a content hash. |
| `data/narrative-propagation.json` | claim-chain | *(Roadmap — Section 12)* tracks how an AI-layoff claim mutates across firm → tracker → press → AI summary. |

### 5.2 Core schema — `ai-layoff-events.json`

```jsonc
{
  "event_id": "LM-0001",                       // sequential, immutable
  "date_announced": "2026-05-12",              // ISO-8601
  "date_effective": "2026-07-31",              // nullable
  "company": "Snap Inc.",
  "ticker": "SNAP",                            // nullable
  "sector": "Technology",                      // NAICS-aligned label
  "naics_code": "5132",                        // nullable
  "geography": {                               // nullable; arrays allowed
    "country": "US",
    "locations": ["Santa Monica, CA", "Remote"]
  },
  "headcount": 1000,                           // nullable if not disclosed
  "headcount_basis": "company_statement",      // warn_filing | sec_filing | company_statement | press_estimate | aggregator | unknown
  "pct_workforce": 0.10,                       // nullable
  "event_confidence": "A1",                    // A1 | A2 | A3
  "ai_attribution": "B1",                      // B1 | B2 | B3 | B0
  "ai_attribution_rationale": "CEO statement cites AI reducing repetitive support tasks.", // REQUIRED whenever ai_attribution != B0
  "stated_reasons": ["AI/automation", "restructuring"], // verbatim-ish reason tags from the firm
  "sources": [                                 // 1..n; record-level, never orphaned
    {
      "source_id": "SRC-SEC",
      "type": "sec_filing",
      "url": "https://www.sec.gov/...",
      "retrieved": "2026-05-13",
      "claim": "1,000 roles eliminated; AI cited"
    }
  ],
  "discrepancy_note": null,                     // populated when sources disagree; store all figures + sources
  "manifest_id": "MAN-2026-05-13",             // which update introduced/last-touched this row
  "extra_layoffsfyi": { "...": "..." }         // preserve source-specific fields here
}
```

**Validation rules the agent must enforce in `validate.py`:**
1. `event_confidence ∈ {A1,A2,A3}` and `ai_attribution ∈ {B1,B2,B3,B0}`.
2. If `ai_attribution ≠ B0`, then `ai_attribution_rationale` is non-empty.
3. Every event has ≥1 source with a resolvable `url` (or an explicit `"url": null, "type": "internal_memo"` with a note).
4. `event_id` is unique and sequential; never reused.
5. If two sources give different `headcount`, the row must carry a `discrepancy_note` listing both figures and both source_ids — and the validator must FAIL if a single averaged number silently replaced them.
6. No event may set `ai_attribution: B1` unless a source of `type ∈ {sec_filing, company_statement, warn_filing, internal_memo}` carries the attribution. A headline alone caps attribution at B3.

### 5.3 `jolts-series.json` (shape)

```jsonc
{
  "meta": { "source": "BLS JOLTS (SA, total nonfarm, level, thousands)", "last_pull": "2026-06-02", "api": "BLS v2" },
  "series": {
    "job_openings":        { "series_id": "JTS000000000000000JOL", "fred": "JTSJOL", "unit": "thousands", "observations": [ { "period": "2026-04", "value": 7600 } ] },
    "hires":               { "series_id": "JTS000000000000000HIL", "fred": "JTSHIL", "...": "..." },
    "quits":               { "series_id": "JTS000000000000000QUL", "fred": "JTSQUL", "...": "..." },
    "layoffs_discharges":  { "series_id": "JTS000000000000000LDL", "fred": "JTSLDL", "...": "..." },
    "total_separations":   { "series_id": "JTS000000000000000TSL", "fred": "JTSTSL", "...": "..." },
    "other_separations":   { "series_id": "JTS000000000000000OSL", "fred": "JTSOSL", "...": "..." }
  }
}
```

---

## 6. SOURCE REGISTRY & ATTRIBUTION (`sources.json`)

Every source gets a reliability **class** that *caps* the tiers it can justify. (A source cannot push an event above the confidence its class warrants.)

| Class | Examples | Tier ceiling |
|-------|----------|--------------|
| **GOV/LEGAL** | BLS, FRED, SEC EDGAR, state WARN portals | Can justify A1 / B1 |
| **PRIMARY FIRM** | Company press release, earnings call, official blog | Can justify A1 / B1 |
| **OUTPLACEMENT/ANALYTICS** | Challenger Gray, Layoffs.fyi | Can justify A2; B-tier ≤ B2 unless they quote the firm |
| **WIRE/PRESS** | Reuters, Bloomberg, AP, NYT, CBS | A2; B-tier ≤ B3 unless quoting a primary attribution |
| **SOCIAL/RUMOR** | Anonymous posts, unverified memos | A3; B3 only |

Store for each source: `source_id`, `name`, `class`, `home_url`, `access` (`api` | `scrape` | `manual_read`), `notes`. Propagate `source_id` to every event that uses it.

---

## 7. THE DASHBOARD — UI SPECIFICATION

Self-contained static site. **No backend, no build step required to view** (a static bundler like Vite is fine for DX, but the deployed artifact is plain HTML/CSS/JS reading the JSON files). Mobile-first responsive.

### 7.1 Tabs / views

1. **PULSE** *(landing).* The honest at-a-glance. JOLTS headline tiles (Openings / Hires / Quits / Layoffs & Discharges) with 24-month sparklines. The **AI-attributed cuts** counter rendered with its full tier breakdown inline — B1 prominent, B2 as a distinct band, B3 explicitly excluded from the headline, B0 shown as the denominator. A one-line epistemic disclaimer is part of the component, not a footnote.
2. **THE LEDGER.** Event-level table over `ai-layoff-events.json`. Sortable/filterable by company, sector, date, A-tier, B-tier, geography, source class. Each row expands to show sources and rationale and links out. Tier badges are color-coded (Section 7.3). Export to CSV (free, attributed).
3. **JOLTS.** The measured baseline in full: six series, by industry, the **churn view** (hires vs. quits vs. layoffs), seasonally adjusted toggle, recession shading from FRED. Clear "this is what is measured; it cannot attribute causation" framing.
4. **ATTRIBUTION** *(the epistemics tab).* The rubric explained in plain language. B1/B2/B3 composition over time (stacked area). The **discrepancy panel** (Section 4): Challenger AI-cited total vs. LaborMarket.ai B1-verified total, with the gap charted as its own series. The "money vs. the job" distinction made explicit.
5. **SOURCES.** The registry, the methodology, the **manifest log** (provenance trail with dates + content hashes), and a "how to contribute / correct" section pointing at the repo.

### 7.2 Charts
Chart.js for standard time series and stacked composition; D3 for the discrepancy/divergence visual and any custom flow diagrams; Plotly acceptable for the churn scatter. Everything reads from the JSON layer at runtime; **no figures hardcoded in markup.**

### 7.3 Design system — "Restrained Watchtower"

This is an intelligence instrument that economists and journalists must trust, carrying Jacob's signature without tipping into ornament. Serious first, beautiful second, mystical third.

```css
:root {
  /* Base — warm-cool dark slate, NOT pure black, for data legibility */
  --bg:            #0a0e14;
  --bg-elev:       #11161f;
  --panel:         #151b26;
  --hairline:      #232b39;

  /* Ink */
  --ink:           #e8eaed;
  --ink-muted:     #9aa4b2;

  /* The single signature accent — ember gold, for emphasis + action only */
  --ember:         #c9a227;

  /* Confidence encoding (consistent everywhere a tier appears) */
  --tier-verified: #4cc4a8;  /* A1 / strong */
  --tier-reported: #6aa3d8;  /* A2 */
  --tier-claim:    #d9a441;  /* B1 stated-by-firm — gold-adjacent, "asserted" */
  --tier-inferred: #b08bd0;  /* B2 inference */
  --tier-narrative:#8a93a3;  /* B3 narrative-only — deliberately desaturated */
  --tier-context:  #5b6472;  /* B0 / denominator */
  --alert:         #d96a6a;  /* discrepancy / contested */
}
```

- **Type:** `Cormorant Garamond` for display headers and section titles; `IBM Plex Mono` for all data, tier badges, timestamps, and source IDs; `IBM Plex Sans` (or Inter) for body copy.
- **Motion:** restrained. Subtle scroll-reveal on section entry; tier badges may have a one-beat fade-in. No gratuitous animation on data — numbers must read instantly.
- **Tone of copy:** precise and unhedged, but never sensational. The data is grave; the voice is steady. (Cf. the IranWar.ai ethics posture.)
- **A note in the masthead** should make the doctrine visible: this dashboard shows what is *measured*, what is *claimed*, and the distance between them.

---

## 8. THE UPDATE MANIFEST FORMAT (Phase 1 → Phase 2 contract)

The research agent emits this; your `apply_manifest.py` consumes it. Markdown with fenced YAML/JSON blocks for machine-parsable edits.

```markdown
# Update Manifest — 2026-06-15

## Summary
Two new A1/B1 events (Citigroup expansion, Klarna). JOLTS unchanged (next release 2026-07-02).
Challenger May figures ingested. One A2 event upgraded to A1 on WARN filing.

## JOLTS
- No change. (April 2026 already current; May releases 2026-07-02.)

## New Events
```json
[
  {
    "op": "add",
    "event": {
      "event_id": "LM-0148",
      "date_announced": "2026-06-11",
      "company": "Klarna",
      "sector": "Financial Technology",
      "headcount": 0,
      "headcount_basis": "company_statement",
      "event_confidence": "A2",
      "ai_attribution": "B1",
      "ai_attribution_rationale": "CEO publicly states customer-service headcount frozen and absorbed by AI agents.",
      "stated_reasons": ["AI/automation"],
      "sources": [ { "source_id": "SRC-WIRE-REUT", "type": "wire", "url": "https://...", "retrieved": "2026-06-12", "claim": "AI absorbing service roles" } ]
    }
  }
]
```

## Upgrades / Corrections
```json
[
  { "op": "update", "event_id": "LM-0131", "set": { "event_confidence": "A1" },
    "reason": "WARN filing TX-2026-0612 corroborates 320 roles; add source SRC-WARN-TX." }
]
```

## Discrepancies Logged
- Challenger reports May AI-cited total ≈ 38,579; LaborMarket.ai B1-verified May total = <computed>. Gap stored to attribution series, not reconciled.

## Provenance
- Manifest hash: <sha256 of this file, filled by Phase 2>
- Analyst: J.E. Thomas
```

`apply_manifest.py` must: parse the blocks, validate every op against the schema + rubric + source-class ceilings, apply additivity/idempotency (re-running the same manifest is a no-op), append a `manifest-log.json` entry with the file hash, regenerate all derived rollups, and exit non-zero on any validation failure (never partially apply).

---

## 9. REPOSITORY STRUCTURE

```
labormarket-ai/
├── seed.md                      # this document
├── README.md                    # public-facing: mission, methodology, contribution
├── index.html                   # the dashboard shell
├── assets/
│   ├── css/watchtower.css       # design system (Section 7.3)
│   ├── js/
│   │   ├── app.js               # view router + data loader
│   │   ├── pulse.js
│   │   ├── ledger.js
│   │   ├── jolts.js
│   │   ├── attribution.js
│   │   └── charts/              # Chart.js / D3 / Plotly helpers
│   └── fonts/                   # or load via CDN
├── data/
│   ├── jolts-series.json
│   ├── ai-layoff-events.json
│   ├── challenger-monthly.json
│   ├── warn-notices.json
│   ├── sources.json
│   ├── manifest-log.json
│   └── derived/                 # auto-generated rollups (never hand-edited)
│       ├── ai-attribution-timeseries.json
│       ├── discrepancy-series.json
│       └── sector-rollup.json
├── schemas/                     # JSON Schema for every data file
├── manifests/                   # dated Update Manifests (the operating log)
│   └── 2026-06-15.md
├── scripts/
│   ├── fetch_jolts.py           # BLS v2 / FRED puller → jolts-series.json
│   ├── apply_manifest.py        # Phase 2 core: manifest → validated data
│   ├── build_rollups.py         # regenerate data/derived/*
│   └── validate.py              # schema + rubric + source-ceiling validator
├── tests/                       # pytest: schema, idempotency, ceiling enforcement
├── _headers                     # Cloudflare Pages headers (caching, CORS for JSON)
└── wrangler.toml                # Cloudflare Pages config (optional)
```

---

## 10. BUILD ORDER (with acceptance criteria)

Do these in sequence. Each step has a gate; do not advance until the gate passes.

1. **Scaffold + schemas.** Create the tree, write JSON Schemas for all data files, seed each data file with a tiny valid fixture (2–3 events spanning different tiers). *Gate:* `python scripts/validate.py` passes on the fixtures.
2. **`fetch_jolts.py`.** Implement the BLS v2 POST (env var `BLS_API_KEY`) with a FRED fallback; write `jolts-series.json` with `meta.last_pull`. *Gate:* a live pull returns ≥24 months for all six series and validates.
3. **`validate.py` (full).** Enforce all Section 5.2 rules + Section 6 source ceilings. *Gate:* deliberately malformed fixtures (B1 with only a headline source; averaged discrepancy) FAIL with clear messages.
4. **`apply_manifest.py` + `build_rollups.py`.** Manifest ingestion, idempotency, hash logging, rollup regeneration. *Gate:* applying `manifests/2026-06-15.md` twice yields identical data and one log entry; rollups match a hand-computed expectation in `tests/`.
5. **Dashboard shell + data loader (`app.js`).** Router, async JSON loading, empty/loading/error states. *Gate:* all five tabs render from the JSON layer with zero hardcoded figures.
6. **PULSE + the tier-honest AI counter.** *Gate:* a casual viewer cannot mistake a B3 figure for the headline; B0 denominator is visible.
7. **LEDGER, JOLTS, ATTRIBUTION, SOURCES.** Build out, wire charts. *Gate:* the discrepancy panel renders Challenger-cited vs. B1-verified with the gap as its own series.
8. **Design pass.** Apply the Restrained Watchtower system; typography, motion, responsive. *Gate:* legible at 360px width; tier colors consistent everywhere.
9. **Deploy.** Cloudflare Pages, `_headers` for JSON caching. *Gate:* live at the Pages URL; a push triggers redeploy.
10. **Docs.** README with methodology + the rubric + contribution flow (fork → add to `data/` or `manifests/` → PR). *Gate:* a stranger could submit a correctly-tiered event.

---

## 11. TECH STACK

- **Frontend:** vanilla HTML/CSS/JS (optionally Vite for DX). Chart.js, D3, Plotly via CDN or bundled.
- **Data/scripts:** Python 3.11+. `requests`, `pandas`, `jsonschema`, `python-dateutil`. Keep dependencies lean (Jacob's standing preference); one `requirements.txt`, copy-pasteable.
- **APIs:** BLS Public Data API v2 (`BLS_API_KEY` env), FRED (`FRED_API_KEY` env). Challenger/Layoffs.fyi/WARN enter via Phase 1 manifests, not live scraping.
- **Hosting:** Cloudflare Pages (static, auto-deploy on push). Same operating model as IranWar.ai.
- **Secrets:** never commit keys. `.env` local, Pages environment variables in prod.

---

## 12. ETHICS, LIMITATIONS & ROADMAP

### Ethics & honest limitations (state these in the README and the Sources tab)
- **JOLTS cannot attribute causation.** It is the rigorous denominator, not an AI-impact measure. Never imply otherwise.
- **"AI-attributed" is a claim layer.** The dashboard surfaces claims with tiers; it does not certify that AI caused any specific job loss.
- **Coverage is skewed.** Tech and large firms are over-represented (WARN thresholds, aggregator focus). Small-business and gig displacement is under-captured. Say so.
- **WARN ≠ all layoffs.** Threshold-limited, state-uneven, timing-variable.
- **Propagate uncertainty downstream.** Anyone citing a figure should carry its tier and source. Stripping the tier is the exact information loss this project exists to resist.

### Roadmap
- **Narrative-propagation tracker** (`narrative-propagation.json`): trace a single AI-layoff claim across firm → tracker → press → AI summary, recording where the confidence tier is stripped. This is the labor instantiation of the IranWar.ai "training loop / provenance decay" thesis — the counter-technology turned on the flood itself.
- **Sector + occupation enrichment** via LLM-labeled role taxonomies (your LAMP Lab embedding stack), to sharpen B2 structural inference.
- **State-level JOLTS** once the July 22, 2026 publication change lands.
- **Cross-link to IranWar.ai** on the macro shocks (war, tariffs) that Challenger itself names as concurrent layoff drivers — the two dashboards share a flood.
- **Confidence calibration:** periodically audit B1 claims against subsequent reporting; publish how often "stated-by-firm AI" survived scrutiny.

---

> **Closing charge to the agent.** Build the instrument that holds the measured and the claimed in one frame and shows the seam between them. The flood's trick is to make a tier-B3 headline feel like a tier-A1 fact. Your entire job is to make that confusion impossible. Ship the seam.

◊ LaborMarket.ai — seed v1.0 ◊
