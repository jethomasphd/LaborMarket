# ops/ — the weekly operating loop

HumanCost.ai is not a one-shot site. It's a **machine run on a weekly cadence** by a two-phase,
human-in-the-loop pipeline. The dashboard is just the publication target; the intelligence is the loop.

```
   ┌──────────────────────────┐        MANIFEST        ┌──────────────────────────────┐
   │  PHASE 1 — DEEP RESEARCH  │   manifests/DATE.md    │   PHASE 2 — CODE EXECUTION   │
   │  (Claude research, web on) │  ───────────────────▶ │   (Claude Code, this repo)   │
   │  ops/phase-1-research.md   │                        │   ops/phase-2-apply.md       │
   │                            │                        │                              │
   │ • JOLTS/FRED status        │                        │ • fetch_jolts.py (if new mo) │
   │ • Read Challenger report   │                        │ • apply_manifest.py DATE.md  │
   │ • Scan Layoffs.fyi / WARN  │                        │ • validate.py + pytest       │
   │ • Reconcile discrepancies  │                        │ • commit + push              │
   │ • Assign A-tier + B-tier   │                        └───────────────┬──────────────┘
   │ • Emit Update Manifest     │                                        │ push
   └──────────────────────────┘                                        ▼
                                                          Cloudflare Pages auto-deploy → live site
```

## Files here
| File | What it is |
|------|------------|
| `phase-1-research.md` | The weekly **research prompt**. Paste into a Claude research session → produces a manifest. |
| `phase-2-apply.md` | The weekly **apply prompt**. Paste into a Claude Code session → validates, applies, pushes. |
| `manifest-template.md` | Blank manifest skeleton. Copy to `manifests/YYYY-MM-DD.md`. |
| `DATA_AUDIT.md` | Standing audit of data provenance & 2026 coverage. Update it when the data status changes. |

## The cadence (suggested: every Monday)
1. **Phase 1** — run `phase-1-research.md` with that day's date. Save output to `manifests/<date>.md`.
2. **Phase 2** — run `phase-2-apply.md`. It re-pulls JOLTS if BLS released a new month, applies the
   manifest (validated, idempotent, all-or-nothing), runs the tests, and pushes. Cloudflare redeploys.
3. Spot-check the live site: the claimed-vs-confirmed gap on Pulse, the Ledger's newest rows.

## The release calendar that drives the loop
- **JOLTS** (the measured baseline): BLS releases ~1st week of the month, **two months in arrears**.
  (e.g. April data lands early June; May lands ~July 2.) Re-pull when a new month is out.
- **Challenger Job Cut Report** (the claimed layer): monthly, usually the **first Thursday**, covering
  the prior month. Always ingest the *actual* figures — never reconstruct from shares.
- **WARN filings / Layoffs.fyi**: continuous; sweep weekly for new events and A2→A1 corroboration.

## The contract that never bends (see `seed.md §0`, `ops/phase-1-research.md`)
- Event-level grain; record-level sources; **no orphan numbers**.
- Two axes — *did it happen* (A) and *is it AI* (B) — **never collapsed**.
- **B1 only when the firm itself says AI**, backed by a primary/govt source. A headline caps at B3.
- Discrepancies are **stored, not averaged**. The gap is the measurement.
- Secrets via env vars (`BLS_API_KEY`, `FRED_API_KEY`) — never commit a key.

> Note on event IDs: new events continue the `LM-####` sequence. The prefix is a historical, opaque
> namespace (kept stable for immutability) — it is **not** the brand, and is never shown prominently.
