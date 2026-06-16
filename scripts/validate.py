#!/usr/bin/env python3
"""
validate.py — The instrument that can refuse a lie.

An instrument that cannot refuse a false claim is a billboard. This validator enforces,
in order of severity, the non-negotiables from seed.md:

  • JSON Schema conformance for every data file (structure, enums, conditional rationale).
  • seed.md §5.2 semantic rules 1–6 on the event ledger.
  • seed.md §6 source-class CEILINGS: a source cannot push an event above the confidence
    its class warrants. A headline alone caps attribution at B3.
  • Cross-file referential integrity (events ↔ sources ↔ WARN).
  • A JOLTS rate-vs-level poison check.

Exit code: 0 if no ERRORs; 1 if any ERROR. WARNINGs never fail the build but are printed.
Re-usable: apply_manifest.py imports validate_all() and must see zero ERRORs before committing.

Usage:  python scripts/validate.py [--data-dir data] [--schema-dir schemas] [--quiet]
"""
import argparse
import json
import os
import sys
from statistics import mean

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("FATAL: jsonschema not installed. `pip install jsonschema`.", file=sys.stderr)
    raise SystemExit(2)

# ---------------------------------------------------------------------------
# Rubric constants (seed.md §4, §5.2, §6)
# ---------------------------------------------------------------------------

# Source TYPE (per-claim, on each event source) -> reliability CLASS (per seed.md §6).
TYPE_TO_CLASS = {
    "sec_filing": "GOV_LEGAL", "warn_filing": "GOV_LEGAL", "bls": "GOV_LEGAL", "fred": "GOV_LEGAL",
    "company_statement": "PRIMARY_FIRM", "earnings_call": "PRIMARY_FIRM",
    "company_blog": "PRIMARY_FIRM", "internal_memo": "PRIMARY_FIRM",
    "outplacement": "OUTPLACEMENT_ANALYTICS", "aggregator": "OUTPLACEMENT_ANALYTICS",
    "wire": "WIRE_PRESS", "press": "WIRE_PRESS", "headline": "WIRE_PRESS",
    "social": "SOCIAL_RUMOR", "rumor": "SOCIAL_RUMOR",
}

# Higher rank = more authoritative.
CLASS_RANK = {"GOV_LEGAL": 4, "PRIMARY_FIRM": 4, "OUTPLACEMENT_ANALYTICS": 3, "WIRE_PRESS": 2, "SOCIAL_RUMOR": 1}

# Types that can CARRY a B1 (stated-by-firm) attribution (seed.md §5.2 rule 6).
AUTH_ATTR_TYPES = {"sec_filing", "company_statement", "earnings_call", "company_blog", "warn_filing", "internal_memo"}

# Types that may legitimately have a null url (with a note).
NO_URL_OK_TYPES = {"internal_memo", "social", "rumor"}

A1_MIN_RANK = 4   # A1 (VERIFIED) needs a GOV/LEGAL or PRIMARY_FIRM source.
A2_MIN_RANK = 2   # A2 (REPORTED) needs at least wire/press or better.
B1_MIN_RANK = 4   # B1 (STATED-BY-FIRM) needs a rank-4 authoritative source carrying the attribution.

SCHEMA_MAP = {
    "ai-layoff-events.json": "ai-layoff-events.schema.json",
    "jolts-series.json": "jolts-series.schema.json",
    "challenger-monthly.json": "challenger-monthly.schema.json",
    "warn-notices.json": "warn-notices.schema.json",
    "sources.json": "sources.schema.json",
    "manifest-log.json": "manifest-log.schema.json",
    "derived/ai-attribution-timeseries.json": "derived-ai-attribution-timeseries.schema.json",
    "derived/discrepancy-series.json": "derived-discrepancy-series.schema.json",
    "derived/sector-rollup.json": "derived-sector-rollup.schema.json",
}


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, msg):
        self.errors.append((where, msg))

    def warn(self, where, msg):
        self.warnings.append((where, msg))

    @property
    def ok(self):
        return not self.errors


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Schema layer
# ---------------------------------------------------------------------------

def validate_schemas(data_dir, schema_dir, rpt):
    for rel, schema_name in SCHEMA_MAP.items():
        path = os.path.join(data_dir, rel)
        if not os.path.exists(path):
            # derived/* may not exist until build_rollups runs; required core files must exist.
            if rel.startswith("derived/"):
                continue
            rpt.error(rel, "required data file is missing")
            continue
        schema_path = os.path.join(schema_dir, schema_name)
        try:
            data = _load(path)
        except json.JSONDecodeError as e:
            rpt.error(rel, f"invalid JSON: {e}")
            continue
        schema = _load(schema_path)
        validator = Draft202012Validator(schema)
        for err in sorted(validator.iter_errors(data), key=lambda e: e.path):
            loc = "/".join(str(p) for p in err.path) or "(root)"
            rpt.error(rel, f"schema: at [{loc}] {err.message}")


# ---------------------------------------------------------------------------
# Semantic layer — the event ledger (seed.md §5.2, §6) — the crown jewel
# ---------------------------------------------------------------------------

def _effective_rank(src, registry, rpt, where):
    """Lower of (type-implied class, registry class) — prevents laundering a weak source
    by mislabeling its type (e.g., a SOCIAL_RUMOR outlet used as 'company_statement')."""
    t = src.get("type")
    type_class = TYPE_TO_CLASS.get(t)
    type_rank = CLASS_RANK.get(type_class, 1)
    sid = src.get("source_id")
    reg = registry.get(sid)
    if reg is None:
        rpt.error(where, f"source '{sid}' is not in the source registry (sources.json)")
        return type_rank, type_class
    reg_rank = CLASS_RANK.get(reg.get("class"), 1)
    if reg_rank < type_rank:
        rpt.warn(where, f"source '{sid}' is registered {reg.get('class')} but used as type "
                        f"'{t}' ({type_class}); using the lower (registry) ceiling.")
    return min(type_rank, reg_rank), type_class


def validate_events(data_dir, rpt):
    events_path = os.path.join(data_dir, "ai-layoff-events.json")
    if not os.path.exists(events_path):
        return
    events = _load(events_path).get("events", [])

    registry = {}
    sources_path = os.path.join(data_dir, "sources.json")
    if os.path.exists(sources_path):
        registry = {s["source_id"]: s for s in _load(sources_path).get("sources", [])}

    seen_ids = set()
    last_num = None
    for ev in events:
        eid = ev.get("event_id", "<no id>")
        where = f"events/{eid}"

        # Rule 4 — unique & sequential ids.
        if eid in seen_ids:
            rpt.error(where, "duplicate event_id — ids are immutable and never reused")
        seen_ids.add(eid)
        try:
            num = int(eid.split("-")[1])
            if last_num is not None and num <= last_num:
                rpt.warn(where, f"event_id not strictly ascending (after LM-{last_num:04d})")
            last_num = num
        except (IndexError, ValueError):
            pass

        attr = ev.get("ai_attribution")
        rationale = (ev.get("ai_attribution_rationale") or "").strip()

        # Rule 2 — rationale required when attributed.
        if attr != "B0" and not rationale:
            rpt.error(where, f"ai_attribution={attr} requires a non-empty ai_attribution_rationale")
        if attr == "B0" and rationale:
            rpt.warn(where, "ai_attribution=B0 but a rationale is present (B0 means not attributed)")

        sources = ev.get("sources", [])

        # Rule 3 — at least one resolvable url, unless all sources are memo/social with notes.
        if not any(s.get("url") for s in sources):
            for s in sources:
                if s.get("type") not in NO_URL_OK_TYPES or not (s.get("note") or "").strip():
                    rpt.error(where, "no source has a resolvable url, and a null-url source lacks a "
                                     f"note / allowed type (got type='{s.get('type')}')")
                    break

        # Per-source ranks / classes.
        ranks = []
        for s in sources:
            r, _cls = _effective_rank(s, registry, rpt, where)
            ranks.append((s, r))
        best_rank = max((r for _, r in ranks), default=0)

        # --- Axis A ceilings (seed.md §6) ---
        ec = ev.get("event_confidence")
        if ec == "A1" and best_rank < A1_MIN_RANK:
            rpt.error(where, "A1 (VERIFIED) claimed but no GOV/LEGAL or PRIMARY_FIRM source present; "
                             "best available source class caps this at A2 or lower")
        if ec == "A2" and best_rank < A2_MIN_RANK:
            rpt.error(where, "A2 (REPORTED) claimed but only SOCIAL/RUMOR sourcing present; caps at A3")

        # --- Axis B ceilings (seed.md §5.2 rule 6, §4) ---
        if attr == "B1":
            carriers = [s for s in sources
                        if s.get("type") in AUTH_ATTR_TYPES
                        and _effective_rank(s, registry, Report(), where)[0] >= B1_MIN_RANK]
            explicit = [s for s in carriers if s.get("carries_ai_attribution") is True]
            if not carriers:
                rpt.error(where, "B1 (STATED-BY-FIRM) claimed but NO authoritative attribution-carrying "
                                 "source (need sec_filing/company_statement/earnings_call/company_blog/"
                                 "warn_filing/internal_memo at GOV/FIRM class). A headline alone caps at B3.")
            elif not explicit:
                rpt.error(where, "B1 claimed: an authoritative source exists but none sets "
                                 "carries_ai_attribution=true — no source actually asserts the AI cause.")
        if attr == "B2" and ec == "A3":
            rpt.error(where, "B2 (STRUCTURAL-INFERENCE) requires a real, at-least-reported event; "
                             "B2 on an A3 (unconfirmed) event is not permitted.")

        # Rule 5 — discrepancy handling: store both figures + sources; NEVER average.
        sh = [(s.get("source_id"), s.get("headcount")) for s in sources if s.get("headcount") is not None]
        distinct = sorted({h for _, h in sh})
        note = (ev.get("discrepancy_note") or "").strip()
        if len(distinct) > 1:
            if not note:
                rpt.error(where, f"conflicting source headcounts {distinct} from "
                                 f"{[sid for sid, _ in sh]} but discrepancy_note is empty — "
                                 "a discrepancy is signal, not noise; store both, never drop/average.")
            else:
                for sid, _ in sh:
                    if sid not in note:
                        rpt.error(where, f"discrepancy_note must name every conflicting source; "
                                         f"missing '{sid}'.")
                        break
            hc = ev.get("headcount")
            if hc is not None and hc not in distinct:
                avg = round(mean(distinct))
                if hc == avg:
                    rpt.error(where, f"headcount {hc} is the AVERAGE of conflicting figures {distinct} — "
                                     "never average a discrepancy away. Use one real figure; keep both in the note.")
                else:
                    rpt.warn(where, f"headcount {hc} matches no source figure {distinct}")

    if not events:
        rpt.warn("events", "ledger is empty")


# ---------------------------------------------------------------------------
# Cross-file + light domain checks
# ---------------------------------------------------------------------------

def validate_cross(data_dir, rpt):
    def maybe(name):
        p = os.path.join(data_dir, name)
        return _load(p) if os.path.exists(p) else None

    events_doc = maybe("ai-layoff-events.json")
    sources_doc = maybe("sources.json")
    warn_doc = maybe("warn-notices.json")
    challenger_doc = maybe("challenger-monthly.json")
    jolts_doc = maybe("jolts-series.json")

    src_ids = {s["source_id"] for s in sources_doc.get("sources", [])} if sources_doc else set()
    event_ids = {e["event_id"] for e in events_doc.get("events", [])} if events_doc else set()

    if warn_doc:
        for n in warn_doc.get("notices", []):
            lid = n.get("linked_event_id")
            if lid and lid not in event_ids:
                rpt.warn("warn", f"{n.get('warn_id')} links to unknown event {lid}")
            sid = n.get("source_id")
            if sid and src_ids and sid not in src_ids:
                rpt.warn("warn", f"{n.get('warn_id')} cites unknown source {sid}")

    if challenger_doc:
        for m in challenger_doc.get("months", []):
            tot, ai = m.get("total_cuts"), m.get("ai_cited_cuts")
            if tot is not None and ai is not None and ai > tot:
                rpt.error("challenger", f"{m['month']}: ai_cited_cuts ({ai}) > total_cuts ({tot})")
            share = m.get("ai_cited_share")
            if share is not None and tot:
                if abs(share - ai / tot) > 0.02:
                    rpt.warn("challenger", f"{m['month']}: ai_cited_share {share} disagrees with ai/total {ai/tot:.3f}")
            for sid in m.get("source_ids", []):
                if src_ids and sid not in src_ids:
                    rpt.warn("challenger", f"{m['month']} cites unknown source {sid}")

    # JOLTS rate-vs-level poison check.
    if jolts_doc:
        for name, s in jolts_doc.get("series", {}).items():
            if s.get("unit") == "thousands":
                vals = [o["value"] for o in s.get("observations", []) if o.get("value") is not None]
                if vals and max(vals) < 100:
                    rpt.error("jolts", f"series '{name}' declares unit=thousands but all values < 100 — "
                                       "this looks like the RATE series, not the LEVEL. Poisoned series ID?")


# ---------------------------------------------------------------------------

def validate_all(data_dir="data", schema_dir="schemas"):
    rpt = Report()
    validate_schemas(data_dir, schema_dir, rpt)
    # Only run semantic checks if the core file parsed (schema layer already reported parse errors).
    try:
        validate_events(data_dir, rpt)
        validate_cross(data_dir, rpt)
    except json.JSONDecodeError:
        pass  # parse errors already reported by the schema layer
    return rpt


def main():
    ap = argparse.ArgumentParser(description="Validate the LaborMarket.ai data layer.")
    ap.add_argument("--data-dir", default="data")
    ap.add_argument("--schema-dir", default="schemas")
    ap.add_argument("--quiet", action="store_true", help="suppress warnings")
    args = ap.parse_args()

    rpt = validate_all(args.data_dir, args.schema_dir)

    if rpt.warnings and not args.quiet:
        print(f"\n  {len(rpt.warnings)} warning(s):", file=sys.stderr)
        for where, msg in rpt.warnings:
            print(f"  ⚠  [{where}] {msg}", file=sys.stderr)

    if rpt.errors:
        print(f"\n  ✗ VALIDATION FAILED — {len(rpt.errors)} error(s):", file=sys.stderr)
        for where, msg in rpt.errors:
            print(f"  ✗  [{where}] {msg}", file=sys.stderr)
        print("\n  The instrument refused the data. Fix the errors above; nothing was applied.", file=sys.stderr)
        return 1

    print(f"  ✓ VALIDATION PASSED — {len(SCHEMA_MAP)} schemas, "
          f"event rubric (§5.2), source ceilings (§6), cross-file integrity. "
          f"{len(rpt.warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
