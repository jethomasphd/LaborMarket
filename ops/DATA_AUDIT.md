# DATA AUDIT — HumanCost.ai

> A standing, honest audit of what the data layer actually is. This project's entire purpose is to
> stop unverified things from looking verified — so it must hold *itself* to that standard first.
> **Re-run and update this every few weeks, and after every major data change.**

**Audit date:** 2026-09-18 (previous: 2026-06-16) · **Auditor:** Phase-2 agent · **Method:** live BLS API call + live reads of
the Challenger reports on challengergray.com (see Sources).

> ## ✅ AUDIT 2026-09-18 — second research pass applied (`manifests/2026-09-18.md`)
> **JOLTS — real & current** through **2026-07** (55 months; re-pulled 2026-09-18 via the keyless FRED CSV mirror because BLS's
> keyless API quota was exhausted from this environment; values are the BLS series, BLS's April revision included). August data
> releases **2026-09-29** — re-pull then.
> **Challenger — real & current** through **2026-08**: June 45,849 / AI 14,029 · July 33,429 / 10,970 · August 52,881 / 3,462, read
> from the report PDFs (Table 1 / Table 4) and chained YTD-to-YTD with zero residual (529,914 total / 116,175 AI). No revisions to
> Jan–May. September report due ~2026-10-01.
> **Event ledger — researched, 46 events** (B1 16 · B2 7 · B3 7 · B0 16; A1 32 · A2 13 · A3 1). 27 added and 17 corrected this pass
> (SEC filings now corroborate every flagship B1 from the first pass). Honest caveats carried in the data itself:
> - **Floors, not totals** for four B1 events where the firm cited AI but disclosed no count (Oracle Sept round 800, PayPal 251,
>   ServiceNow 287, Uber customer support 41): the headcount is the state-WARN-documented figure and the note says so.
> - **Every B1 added this pass is mixed-cause** (AI named alongside efficiency, restructuring, or geography) — flagged in the rationale.
> - **Oracle (March) is B1 with no count** — its FY2026 10-K attributes workforce reductions to AI in general terms.
> - **Intel (Jan) is A3** — the ~3,800 figure could not be corroborated (no 2026 Oregon WARN).
> - **Microsoft (Jul, 4,800) is B3** — its own post says the roles are “not being replaced by AI”; the “AI-driven” label is press framing.
> **Coverage:** the ledger is hand-researched and skews to tech/large firms; part of the claimed-vs-confirmed gap is coverage. August
> shows 3,462 AI-cited cuts and nothing on the record — read that as “no company said it where we looked”, not “none happened”.
> **B-tiers remain a Phase-1 draft flagged for Jacob's review** (see the manifest's Provenance and Discrepancies Logged).
> **Next:** re-pull JOLTS 2026-09-29; ingest Challenger September ~2026-10-01; sweep WARN portals (CA xlsx, WA ESD, TX TWC, OH JFS)
> for A2→A1 upgrades; watch Oracle for a disclosed count.

> ## ✅ RESOLVED 2026-06-16 — first real research pass applied (`manifests/2026-06-16.md`)
> The illustrative seed was replaced wholesale. Challenger Jan–May corrected to the actual published
> figures (YTD reconciles exactly: 397,755 total / 87,714 AI). **19 real, primary-sourced 2026 events**
> tiered conservatively (B1:7 firm-cited-AI · B2:5 inference · B3:1 headlines-only · B0:6 not-AI), via 3
> parallel research agents with seam-verification of the flagship B1s (Snap, Cloudflare re-fetched).
> `provenance` flipped to `researched`; the UI seed banner cleared. **B-tiers are a Phase-1 draft flagged
> for Jacob's review** (see the manifest's Provenance section). The audit below is retained as the record
> of *why* the pass was needed.

---

## Verdict (pre-pass, 2026-06-16) — now resolved above
**JOLTS is real and current. The claim layer (Challenger) is reconstructed and materially wrong. The
event ledger is an illustrative seed, not researched data.** Until the first real Phase-1 pass runs, the
dashboard's flagship "confirmed by the company" number is a placeholder and must be labeled as such.

---

## File-by-file

### `data/jolts-series.json` — ✅ REAL & CURRENT
Pulled live from BLS (SA, total nonfarm, level). 52 months through **2026-04**, the latest BLS release.
Values verified against the official series. **No action** beyond the routine monthly re-pull (May data
releases ~2026-07-02). This is the one fully trustworthy layer.

### `data/challenger-monthly.json` — ⚠️ RECONSTRUCTED, MATERIALLY WRONG
The monthly splits were *reconstructed* from `seed.md`'s YTD anchors and share percentages — not taken
from the published reports. Checked against the actual Challenger releases this session:

| Month | Total cuts (ours) | Total cuts (real) | AI cuts (ours) | AI cuts (real) |
|------|------:|------:|------:|------:|
| Feb 2026 | 62,075 | **48,307** | 6,208 | (tbc) |
| Mar 2026 | 79,000 | ~61,400 | 19,750 | **15,341** |
| Apr 2026 | 75,650 | **83,387** | 19,691 | **21,490** |
| May 2026 | 96,448 | **97,006** | 38,579 | 38,579 ✓ |
| **YTD (Jan–May)** | 362,968 | **397,755** | 87,714 ✓ | 87,714 ✓ |

The YTD AI total and May happen to match (they were the anchors); **everything in between is off** — Feb
total is ~28% too high, Mar AI is ~29% too high, Apr is understated. **Action:** a `challenger_upsert`
op per month with the real published figures (first Phase-1 pass). Jan/Feb AI splits still need to be
read from their reports to lock exact numbers.

### `data/ai-layoff-events.json` — ⚠️ ILLUSTRATIVE SEED, NOT RESEARCHED
8 events (LM-0001…0008), real companies from `seed.md §2.3`, but the figures, dates, and source URLs are
**illustrative starting points** (URLs point to issuer *homepages*, not specific filings/articles). The
`meta.description` says so — but the dashboard renders them as if verified, and the hero's "1,000
confirmed by the company" headline is built on them. **This is the exact failure mode the project
exists to prevent.** Action: (a) immediately flag provenance in the UI + data so nothing masquerades as
verified; (b) replace with real, sourced, conservatively-tiered 2026 events in the first Phase-1 pass.

### `data/warn-notices.json` — ⚠️ ILLUSTRATIVE
Two notices tied to the illustrative Snap/Dell events. Replace alongside the events.

### `data/sources.json` — ✅ STRUCTURE OK
The registry lists real outlets with correct classes. Some `SRC-*` rows exist only to back illustrative
events; that's fine — they become real as events are researched. No orphan/incorrect classes found.

### `data/derived/*` — ✅ FAITHFUL (inherits upstream status)
Regenerated deterministically from the above, so they are correct *as derivations* — but they inherit the
illustrative status of their inputs. They'll be right automatically once real data lands.

---

## "Relevant to the entirety of 2026" — coverage assessment
The problem is **veracity, not recency**. Time-wise the data is roughly current for mid-June 2026
(JOLTS→Apr, Challenger→May, events Jan–May). To be genuinely relevant for *all of 2026* the loop must
(a) carry **real** figures, and (b) **run weekly** so each new Challenger month, JOLTS release, and
material layoff lands within days. The machine for that now exists (`ops/`, `apply_manifest` extended to
upsert Challenger months and register sources). What's missing is the first real research pass.

---

## Remediation plan
1. **Done this session (no judgment required):**
   - Extended `apply_manifest.py` with `challenger_upsert` + `source_add` ops so a weekly manifest can
     carry the real claim layer and new sources (tested, idempotent).
   - Added explicit **provenance flags** to the data (`meta.provenance`) and a visible **data-status
     banner** in the UI, so the illustrative ledger can never be mistaken for verified data.
2. **First real Phase-1 pass (needs Jacob's go-ahead — it's contested-data judgment):**
   - `challenger_upsert` Jan–May with the **actual published** monthly totals + AI figures.
   - Replace the 8 illustrative events with **real, primary-sourced** 2026 layoffs, tiered conservatively
     (B1 only where the firm itself stated AI, with a primary/govt source).
   - Flip `meta.provenance` to `researched`; the status banner auto-clears.
3. **Then weekly**, per `ops/README.md`.

---

## Sources (this audit)
- Challenger, Gray & Christmas — May 2026 report (May total 97,006; AI 38,579; YTD total 397,755; YTD AI 87,714): https://www.challengergray.com/blog/challenger-report-may-job-cuts-rise-16-from-april-highest-may-total-since-2020/
- Challenger — March 2026 report (AI 15,341; 25%): https://www.challengergray.com/blog/challenger-report-march-cuts-rise-25-from-february-ai-leads-reasons/
- Challenger — April 2026 report (April total 83,387): https://www.challengergray.com/blog/challenger-report-april-job-cuts-rise-38-from-march-ytd-cuts-down-50/
- CBS News — April 2026 (AI 26% of April cuts): https://www.cbsnews.com/news/ai-layoffs-job-cuts-challenger-report-april-2026/
- BLS JOLTS (live API pull, through 2026-04): https://www.bls.gov/jlt/
