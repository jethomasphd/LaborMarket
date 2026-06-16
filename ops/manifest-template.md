# Update Manifest — YYYY-MM-DD

<!-- Copy this file to manifests/YYYY-MM-DD.md and fill it in. Delete sections you don't use.
     The date in the H1 becomes the manifest id (MAN-YYYY-MM-DD). All ops are idempotent.
     Validator rules live in scripts/validate.py; the rubric is in ops/phase-1-research.md. -->

## Summary
<!-- 2–4 sentences: what changed this week, notable events, tier upgrades, JOLTS status. -->

## JOLTS
<!-- "No change." OR "BLS released <month> on <date> — Phase 2 re-pulls via scripts/fetch_jolts.py." -->
No change.

## Challenger
<!-- Use ACTUAL published monthly figures, not reconstructions from shares. -->
```json
[
  {
    "op": "challenger_upsert",
    "month": "2026-05",
    "total_cuts": 97006,
    "ai_cited_cuts": 38579,
    "ai_cited_share": 0.40,
    "top_reasons": [ { "reason": "AI/Technological Update", "count": 38579 } ],
    "source_ids": ["SRC-CHALLENGER"]
  }
]
```

## New Events
```json
[
  {
    "op": "add",
    "event": {
      "event_id": "LM-0000",
      "date_announced": "2026-06-20",
      "date_effective": null,
      "company": "",
      "ticker": null,
      "sector": "",
      "naics_code": null,
      "geography": { "country": "US", "locations": [] },
      "headcount": null,
      "headcount_basis": "company_statement",
      "pct_workforce": null,
      "event_confidence": "A2",
      "ai_attribution": "B0",
      "ai_attribution_rationale": null,
      "stated_reasons": [],
      "sources": [
        { "source_id": "SRC-", "type": "company_statement", "url": "https://", "retrieved": "2026-06-20", "claim": "", "headcount": null, "carries_ai_attribution": false }
      ],
      "discrepancy_note": null
    }
  }
]
```

## Upgrades / Corrections
```json
[
  { "op": "update", "event_id": "LM-0000", "set": { "event_confidence": "A1" },
    "add_sources": [ { "source_id": "SRC-WARN-XX", "type": "warn_filing", "url": "https://", "retrieved": "2026-06-20", "claim": "", "headcount": null } ],
    "reason": "" }
]
```

## Sources
```json
[
  { "op": "source_add", "source": { "source_id": "SRC-", "name": "", "class": "PRIMARY_FIRM", "home_url": "https://", "access": "manual_read", "notes": "" } }
]
```

## Discrepancies Logged
<!-- Plain-language: claimed-vs-verified gaps you saw. The gap is the product, not an error. -->

## Provenance
- Analyst:
- Method notes:
