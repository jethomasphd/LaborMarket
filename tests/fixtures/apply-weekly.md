# Update Manifest — 2026-07-06

## Summary
Self-contained test manifest exercising every op type: challenger_upsert (update + add),
source_add, event add, and an A2->A1 upgrade.

## Challenger
```json
[
  { "op": "challenger_upsert", "month": "2026-01", "total_cuts": 1200, "ai_cited_cuts": 150, "ai_cited_share": 0.125, "source_ids": ["SRC-CHALLENGER"] },
  { "op": "challenger_upsert", "month": "2026-02", "total_cuts": 800, "ai_cited_cuts": 80, "ai_cited_share": 0.10, "source_ids": ["SRC-CHALLENGER"] }
]
```

## Sources
```json
[
  { "op": "source_add", "source": { "source_id": "SRC-NEW", "name": "NewCo statement", "class": "PRIMARY_FIRM", "home_url": "https://e.com", "access": "manual_read" } }
]
```

## New Events
```json
[
  { "op": "add", "event": {
    "event_id": "LM-0050", "date_announced": "2026-07-01", "company": "NewCo", "sector": "Technology",
    "headcount": 50, "headcount_basis": "company_statement", "event_confidence": "A2", "ai_attribution": "B1",
    "ai_attribution_rationale": "CEO statement attributes the cut to AI automation of support roles.",
    "stated_reasons": ["AI/automation"],
    "sources": [ { "source_id": "SRC-NEW", "type": "company_statement", "url": "https://e.com", "retrieved": "2026-07-01", "claim": "50 roles, AI cited", "headcount": 50, "carries_ai_attribution": true } ],
    "discrepancy_note": null } }
]
```

## Upgrades / Corrections
```json
[
  { "op": "update", "event_id": "LM-0050", "set": { "event_confidence": "A1" },
    "add_sources": [ { "source_id": "SRC-WARN-CA", "type": "warn_filing", "url": "https://e.com", "retrieved": "2026-07-02", "claim": "WARN corroborates 50 roles", "headcount": 50 } ],
    "reason": "CA WARN filing corroborates 50 roles; REPORTED -> VERIFIED." }
]
```

## Provenance
- Analyst: test
