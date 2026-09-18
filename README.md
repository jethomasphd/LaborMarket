# HumanCost.ai

**The human cost of the AI layoff story — separating what's *claimed* from what's *verified*.**

> Layoffs are real and rising, a genuine human cost. But the "AI did it" explanation is mostly
> unverified. HumanCost.ai holds the official jobs data (JOLTS) and the contested AI-layoff narrative
> in one frame, scores every layoff on two separate questions — *did it happen?* and *is AI the cause?* —
> and charts the gap between what's claimed and what's confirmed.

The information flood's only trick is making an unproven headline feel like an established fact. Every
choice in this project exists to make that confusion impossible.

- **Scribe:** Jacob E. Thomas, PhD — Principal Investigator, LAMP Lab
- **Lineage:** IranWar.ai (event-level dataset & dashboard) — *The Word against the Flood.*
- **Stack:** static HTML/CSS/JS + JSON, no backend. Python tooling for the data layer. Cloudflare Pages.

---

## The one number, handled correctly

> **“X jobs lost to AI” is a contested casualty count.** It silently fuses (a) direct task substitution,
> (b) budget reallocation from headcount to AI capex, (c) narrative laundering of cuts that would have
> happened anyway, and (d) genuine uncertainty inside the firm. A serious instrument never reports this as
> one confident number. It reports a **claim** — attributed, tiered, and shown against the verified baseline.

So every layoff event carries **two orthogonal tiers**:

### Axis A — *did the layoff happen?*
| Tier | Name | Evidentiary standard |
|------|------|----------------------|
| **A1** | VERIFIED | Government/legal record (WARN, SEC 8-K/10-Q) or official company statement with a headcount. |
| **A2** | REPORTED | Credible secondary reporting (Reuters, Bloomberg) or an established aggregator; not yet in a filing. |
| **A3** | UNCONFIRMED | Rumor, anonymous memo, single-source social post, or no count. |

### Axis B — *is AI actually the cause?*
| Tier | Name | What it means |
|------|------|---------------|
| **B1** | STATED-BY-FIRM | The company explicitly attributes the cut to AI. The strongest signal — **but a claim, not proof of causation.** |
| **B2** | STRUCTURAL-INFERENCE | No firm attribution, but role mix + AI capex + sector pattern make displacement a plausible **analyst inference**, labeled as such. |
| **B3** | NARRATIVE-ONLY | “AI” appears only in third-party framing, or is contradicted by other firm reasons. A contested narrative artifact. |
| **B0** | NOT-ATTRIBUTED | No actor claims AI. **Most layoffs are B0** — the denominator. |

**The rule that makes the dashboard honest:** the headline *AI-attributed cuts* counter shows the **B1 total only**.
B2 renders as a distinct band; B3 is shown but **never summed into the headline**; B0 stays visible as the denominator.

**The discrepancy panel** charts Challenger's *AI-cited* total against our stricter *B1-verified* total. The gap
between them is not an error to reconcile — **it is the measurement of the strategic layer**, charted as its own series.

---

## The dashboard — one page, one idea

The site is a **single scrolling page** (`index.html`): inline CSS and JS, inline-SVG charts, no dependencies,
no build step. No tabs, no tier codes on the surface — the two-axis rubric lives in the data layer and the
page translates it into plain words. Six movements, numbered in the margin like an argument:

| | Movement | What it shows |
|---|---|---|
| I | **The numbers** | For the latest month: jobs **blamed on AI** (Challenger's AI-cited total) beside jobs that **meet the bar**, and the share of the blame that is unverified. Then the page's signature control — **“Where do you set the bar?”** — three evidentiary standards (*only the company's own words* → *plus our inferences* → *plus the headlines*). Every gold figure on the page recomputes live, so a reader can watch the number inflate as the standard loosens. The strict figure is the only one we publish. |
| II | **The seam** | Monthly stacked columns (gold = meets the bar, grey = unverified, whole column = blamed) with AI's share of all announced cuts beneath each month, plus the **cumulative seam**: running totals whose widening gap is the distance between the story and the record. Hover/tap tooltips, keyboard navigation, and a table twin. |
| III | **The telephone game** | Every event whose sources disagree on a headcount, drawn as a range: each source's figure as a dot, the figure we use in gold. Nothing is averaged. |
| IV | **The receipts** | The whole ledger, grouped in plain language (*the company itself said AI · probably AI but the company never said so · only the headlines said AI · not about AI*), each group marked counted/not-counted for the current bar. Rows carry the sourced claim and a link, expand to the full rationale, disputed figures and every source, and are tagged **new** when added by the latest research pass. |
| V | **The baseline** | JOLTS layoffs & discharges, every month since 2022, with a data-derived sentence (year-over-year change, the window average vs. the year before, the peak AI share); then all layoffs vs. blamed vs. meets-the-bar on one linear scale and the “for every 1,000 people laid off…” line. |
| VI | **The method** | The four definitions, what the page can't tell you, and a **what changed** box read from the manifest log. |

Every figure is computed in the browser from `data/*.json` at load; nothing is typed into the markup.
`scripts/build_standalone.py` inlines the data into a single `dist/humancost.html` that opens from disk
(email it, drop it in Slack — no server needed).

---

## Repository layout

```
index.html                 the whole dashboard — one page, six movements, inline CSS + JS + SVG, no build step
data/*.json                the data layer (event ledger, JOLTS, Challenger, WARN, sources, manifest log)
data/derived/*.json        auto-generated rollups (never hand-edited; used by the pipeline + tests)
schemas/*.schema.json      JSON Schema for every data file
manifests/YYYY-MM-DD.md    dated Update Manifests (the operating log)
scripts/                   fetch_jolts.py · validate.py · apply_manifest.py · build_rollups.py · build_standalone.py
tests/                     pytest (validator refusal, rollups, idempotency) + site_check.mjs (real-browser check)
ops/                       the weekly operating loop (research prompt, apply prompt, data audit)
```

---

## Operating it weekly — see [`ops/`](ops/)

This is a machine run weekly, not a static page. The recurring prompts live in **`ops/`**:
`phase-1-research.md` (research → manifest), `phase-2-apply.md` (validate + apply + push),
`manifest-template.md`, and `DATA_AUDIT.md` (standing data-provenance audit). Start there.

## How it operates — the dual-agent loop

The dashboard is a static publication target; the intelligence comes from a recurring human-in-the-loop loop.

1. **Phase 1 — Deep research (human-directed).** Read the day's reporting (JOLTS/FRED, the Challenger report,
   Layoffs.fyi, WARN). Reconcile discrepancies (store *both* figures, never average). Assign A-tier + B-tier.
   Emit a dated **Update Manifest** in `manifests/`.
2. **Phase 2 — Code execution (this repo).** Apply the manifest deterministically:

   ```bash
   python scripts/apply_manifest.py manifests/2026-06-15.md
   ```

   This validates every op against the schema + rubric + source-class ceilings, applies it to a candidate copy,
   regenerates the derived rollups, runs the full validator, and **only commits if clean** (never partially applies).
   Re-running the same manifest is an idempotent no-op. Cloudflare Pages redeploys on push.

Refresh the measured baseline any time:

```bash
python scripts/fetch_jolts.py            # BLS v2 (BLS_API_KEY) → v1 (keyless) → FRED API (FRED_API_KEY) → FRED CSV (keyless, no quota)
```

---

## Local development

```bash
pip install -r requirements.txt

python scripts/validate.py               # validate the whole data layer (schema + rubric + ceilings)
python scripts/build_rollups.py          # regenerate data/derived/*
python -m pytest tests/ -q               # 17 tests: validator refusal, rollups, idempotency

python -m http.server 8000               # then open http://localhost:8000  (the page fetches data/ over HTTP)
python scripts/build_standalone.py       # or: dist/humancost.html — a single file that opens from disk

npm install && npm run check             # optional real-browser check (Playwright): hero figures == data, the bar
                                         # recomputes, charts/receipts/baseline render, no overflow at 360px, screenshots
```

Secrets are env-vars only — `BLS_API_KEY`, `FRED_API_KEY`. **Never commit a key.**

---

## Contributing — submit a correctly-tiered event

Found a missing event, an error, or a mis-tiered attribution? The data and methodology are open.

1. **Fork**, then add an event to `data/ai-layoff-events.json` (or, preferably, a dated manifest in `manifests/`).
2. Tier it on **both** axes. Cite a real source for every claim; **no orphan numbers**.
3. Run `python scripts/validate.py` — it must pass.
4. Open a PR.

A correctly-tiered **A1 / B1** event looks like this:

```jsonc
{
  "event_id": "LM-0042",                       // sequential, immutable, never reused
  "date_announced": "2026-06-20",
  "company": "Example Corp",
  "sector": "Technology",
  "headcount": 800,
  "headcount_basis": "company_statement",
  "event_confidence": "A1",                    // VERIFIED — backed by a firm statement w/ a count
  "ai_attribution": "B1",                      // STATED-BY-FIRM …
  "ai_attribution_rationale": "CEO statement cites AI automation of support roles as the reason.",
  "stated_reasons": ["AI/automation"],
  "sources": [
    {
      "source_id": "SRC-EXAMPLE-PR",           // must exist in data/sources.json
      "type": "company_statement",             // … and B1 REQUIRES an authoritative type here
      "url": "https://example.com/press/...",
      "retrieved": "2026-06-21",
      "claim": "800 roles eliminated; AI cited",
      "headcount": 800,
      "carries_ai_attribution": true           // this source actually asserts the AI cause
    }
  ],
  "manifest_id": "MAN-2026-06-20"
}
```

The validator **enforces the rubric and will refuse common lies**, with clear messages:

- a **B1 backed only by a headline** → *“a headline alone caps at B3.”*
- a **discrepancy silently averaged** into one number → *“never average a discrepancy away.”*
- an **A1 with no GOV/LEGAL or PRIMARY_FIRM source** → caps at A2.
- a missing `ai_attribution_rationale` when attributed, a source not in the registry, a duplicate `event_id`, a
  JOLTS series that returns the *rate* instead of the *level*.

Source-class **ceilings** (`data/sources.json` → each source's `class`) cap what a source can justify:
GOV/LEGAL & PRIMARY_FIRM → A1/B1 · OUTPLACEMENT/ANALYTICS → A2, B≤B2 · WIRE/PRESS → A2, B≤B3 · SOCIAL/RUMOR → A3, B3.

---

## Deploy (Cloudflare Pages)

The deployed artifact is the repository root as-is (no build step). In the Cloudflare dashboard:
**Workers & Pages → Create → Pages → Connect to Git →** select this repo → framework preset **None**,
build command empty, output directory `/`. `_headers` configures JSON caching + CORS; `wrangler.toml` pins the
project name. Every `git push` to the production branch triggers a redeploy.

---

## Ethics & honest limitations

- **JOLTS cannot attribute causation.** It is the rigorous denominator, not an AI-impact measure.
- **“AI-attributed” is a claim layer.** We surface claims with tiers; we do **not** certify that AI caused any specific job loss.
- **Coverage is skewed** to tech and large firms (WARN thresholds, aggregator focus). Small-business and gig displacement is under-captured.
- **WARN ≠ all layoffs.** Threshold-limited, state-uneven, timing-variable.
- **Propagate uncertainty downstream.** Anyone citing a figure should carry its tier and source. Stripping the tier is the exact information loss this project exists to resist.

---

*Build the instrument that holds the measured and the claimed in one frame and shows the seam between them. Ship the seam.*
