# BUILD_LOG.md — LaborMarket.ai

> The single authoritative record of build state. Per the Orchestrator Charter, no gate
> is marked green on assertion alone — only after the real check has been **run and watched
> to pass**. `seed.md` is the source of truth; this file is how we operate against it.

---

## Status snapshot

| | |
|---|---|
| **Date** | 2026-06-15 |
| **Branch** | `claude/confident-feynman-ceqyix` |
| **Phase** | BUILD (one-time scaffold) → then hand to Jacob for Phase-1 operate loop |
| **Current step** | Step 0 complete (orientation). Awaiting steer on 2 decisions before scaffold-affecting work. |

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
| 1 | **Aggregator ingestion** — does the dashboard scrape Challenger / Layoffs.fyi / WARN live, or do they enter only via Phase-1 manifests (`seed.md` default)? Affects the scaffold (presence of scraper scripts). | **SURFACED — awaiting steer.** Building everything this does *not* affect under the seed.md default (manifest-only). |
| 2 | **JOLTS series IDs / units** — verify against live API before trusting. | **RESOLVED by verification** (see findings above). Confirming scope (levels vs. +rates/+industry) with Jacob. |

---

## The 10 gated build steps (acceptance gates copied from `seed.md §10`)

Legend: ☐ not started · ◐ in progress · ☑ gate passed (evidence logged)

- **☐ Step 1 — Scaffold + schemas.** Create tree; JSON Schemas for all data files; seed each data file with a tiny valid fixture (2–3 events spanning tiers).
  - *Gate:* `python scripts/validate.py` passes on the fixtures.
  - *Deps:* none.
- **☐ Step 2 — `fetch_jolts.py`.** BLS v2 POST (`BLS_API_KEY`) with FRED fallback; write `jolts-series.json` with `meta.last_pull`.
  - *Gate:* a live pull returns ≥24 months for all six series and validates.
  - *Deps:* Step 1 (schema). Note: prod needs `BLS_API_KEY` for ≥24mo/20yr; keyless v1 returns ~16mo in this sandbox — will document.
- **☐ Step 3 — `validate.py` (full). [THE HARD GATE]** Enforce all §5.2 rules + §6 source ceilings.
  - *Gate:* deliberately malformed fixtures (B1 with only a headline source; averaged discrepancy) **FAIL with clear messages** and non-zero exit.
  - *Deps:* Step 1.
- **☐ Step 4 — `apply_manifest.py` + `build_rollups.py`.** Manifest ingestion, idempotency, hash logging, rollup regeneration.
  - *Gate:* applying `manifests/2026-06-15.md` twice yields identical data and **one** log entry; rollups match a hand-computed expectation in `tests/`.
  - *Deps:* Steps 1, 3.
- **☐ Step 5 — Dashboard shell + data loader (`app.js`).** Router, async JSON loading, empty/loading/error states.
  - *Gate:* all five tabs render from the JSON layer with **zero hardcoded figures**.
  - *Deps:* Step 1 (data + schemas).
- **☐ Step 6 — PULSE + tier-honest AI counter.**
  - *Gate:* a casual viewer **cannot** mistake a B3 figure for the headline; B0 denominator is visible.
  - *Deps:* Step 5.
- **☐ Step 7 — LEDGER, JOLTS, ATTRIBUTION, SOURCES.** Build out, wire charts.
  - *Gate:* the discrepancy panel renders Challenger-cited vs. B1-verified with the gap as its own series.
  - *Deps:* Steps 4, 5.
- **☐ Step 8 — Design pass.** Restrained Watchtower system; typography, motion, responsive.
  - *Gate:* legible at 360px width; tier colors consistent everywhere.
  - *Deps:* Steps 6, 7.
- **☐ Step 9 — Deploy.** Cloudflare Pages, `_headers` for JSON caching.
  - *Gate:* live at the Pages URL; a push triggers redeploy. **(Jacob-executed; agent delivers config + runbook + local render proof.)**
  - *Deps:* Step 8.
- **☐ Step 10 — Docs.** README with methodology + rubric + contribution flow (fork → add to `data/` or `manifests/` → PR).
  - *Gate:* a stranger could submit a correctly-tiered event.
  - *Deps:* Steps 1–8.

---

## Change log (append-only)

- **2026-06-15 — Step 0 (orientation).** Read `seed.md` in full; inventoried repo (only `seed.md` present, on branch `claude/confident-feynman-ceqyix`). Probed environment; ran live BLS round-trip verifying all six JOLTS series IDs + units (evidence above). Wrote this BUILD_LOG. Surfaced the two open decisions. Next: await steer on Decision 1, then Step 1 (scaffold + schemas).
