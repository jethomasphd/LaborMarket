"""apply_manifest: idempotency, all op types, all-or-nothing (seed.md §10 step 4 gate).

Uses a self-contained fixture (tests/fixtures/apply-base + apply-weekly.md) so the tests are
independent of the live, mutable data/ layer.
"""
import json
import pathlib
import shutil

import apply_manifest  # noqa: E402 (path injected by conftest)

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMAS = str(ROOT / "schemas")
BASE = ROOT / "tests/fixtures/apply-base"
MANIFEST = str(ROOT / "tests/fixtures/apply-weekly.md")


def _seed(tmp_path):
    dst = tmp_path / "data"
    shutil.copytree(BASE, dst)
    return str(dst)


def _events(d):
    return json.load(open(pathlib.Path(d) / "ai-layoff-events.json"))["events"]


def _challenger(d):
    return {m["month"]: m for m in json.load(open(pathlib.Path(d) / "challenger-monthly.json"))["months"]}


def _sources(d):
    return {s["source_id"] for s in json.load(open(pathlib.Path(d) / "sources.json"))["sources"]}


def _log(d):
    return json.load(open(pathlib.Path(d) / "manifest-log.json"))["manifests"]


def test_apply_all_op_types_and_idempotent(tmp_path):
    d = _seed(tmp_path)
    assert apply_manifest.run(MANIFEST, d, SCHEMAS) == 0

    ids = [e["event_id"] for e in _events(d)]
    assert "LM-0050" in ids                                   # event add
    ch = _challenger(d)
    assert ch["2026-01"]["total_cuts"] == 1200                # challenger_upsert (update)
    assert "2026-02" in ch and ch["2026-02"]["total_cuts"] == 800  # challenger_upsert (add)
    assert "SRC-NEW" in _sources(d)                           # source_add

    after1 = pathlib.Path(d, "ai-layoff-events.json").read_text()
    assert apply_manifest.run(MANIFEST, d, SCHEMAS) == 0      # re-apply: no-op
    assert pathlib.Path(d, "ai-layoff-events.json").read_text() == after1
    assert [m["manifest_id"] for m in _log(d)].count("MAN-2026-07-06") == 1


def test_update_op_upgraded_tier(tmp_path):
    d = _seed(tmp_path)
    apply_manifest.run(MANIFEST, d, SCHEMAS)
    lm = [e for e in _events(d) if e["event_id"] == "LM-0050"][0]
    assert lm["event_confidence"] == "A1"                     # upgraded A2 -> A1 by WARN
    assert lm["ai_attribution"] == "B1"
    assert "SRC-WARN-CA" in [s["source_id"] for s in lm["sources"]]


def test_log_records_hash_and_op_counts(tmp_path):
    d = _seed(tmp_path)
    apply_manifest.run(MANIFEST, d, SCHEMAS)
    entry = [m for m in _log(d) if m["manifest_id"] == "MAN-2026-07-06"][0]
    assert len(entry["sha256"]) == 64
    assert entry["ops"] == {"add": 1, "update": 1, "challenger_upsert": 2, "source_add": 1}


def test_malformed_manifest_applies_nothing(tmp_path):
    """A manifest introducing a B1-from-headline must abort with NOTHING applied."""
    d = _seed(tmp_path)
    n0 = len(_events(d))
    bad = tmp_path / "2026-07-13.md"
    bad.write_text(
        "# Update Manifest — 2026-07-13\n## Summary\nbad\n## New Events\n```json\n"
        + json.dumps([{"op": "add", "event": {
            "event_id": "LM-0999", "date_announced": "2026-07-13", "company": "Liar Co",
            "sector": "Technology", "headcount": 10, "headcount_basis": "press_estimate",
            "event_confidence": "A2", "ai_attribution": "B1",
            "ai_attribution_rationale": "a headline said AI", "stated_reasons": [],
            "sources": [{"source_id": "SRC-WIRE", "type": "headline",
                         "url": "https://e.com", "retrieved": "2026-07-13", "claim": "x"}],
            "discrepancy_note": None}}])
        + "\n```\n## Provenance\n- Analyst: test\n")

    assert apply_manifest.run(str(bad), d, SCHEMAS) == 1       # refused
    assert len(_events(d)) == n0                               # nothing added
    assert "MAN-2026-07-13" not in [m["manifest_id"] for m in _log(d)]
