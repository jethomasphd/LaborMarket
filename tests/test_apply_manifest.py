"""apply_manifest idempotency + all-or-nothing (seed.md §10 step 4 gate)."""
import json
import pathlib
import shutil

import apply_manifest  # noqa: E402 (path injected by conftest)

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMAS = str(ROOT / "schemas")
MANIFEST = str(ROOT / "manifests/2026-06-15.md")


def _seed_data(tmp_path):
    dst = tmp_path / "data"
    shutil.copytree(ROOT / "data", dst)
    return str(dst)


def _events(data_dir):
    return json.load(open(pathlib.Path(data_dir) / "ai-layoff-events.json"))["events"]


def _log(data_dir):
    return json.load(open(pathlib.Path(data_dir) / "manifest-log.json"))["manifests"]


def test_apply_is_idempotent(tmp_path):
    data = _seed_data(tmp_path)
    n0 = len(_events(data))

    assert apply_manifest.run(MANIFEST, data, SCHEMAS) == 0
    after1 = pathlib.Path(data, "ai-layoff-events.json").read_text()
    ids = [e["event_id"] for e in _events(data)]
    assert "LM-0009" in ids and "LM-0010" in ids
    assert len(ids) == n0 + 2

    # second apply: no-op, identical data, exactly one log entry for this manifest
    assert apply_manifest.run(MANIFEST, data, SCHEMAS) == 0
    after2 = pathlib.Path(data, "ai-layoff-events.json").read_text()
    assert after1 == after2
    man_ids = [m["manifest_id"] for m in _log(data)]
    assert man_ids.count("MAN-2026-06-15") == 1


def test_update_op_upgraded_tier(tmp_path):
    data = _seed_data(tmp_path)
    apply_manifest.run(MANIFEST, data, SCHEMAS)
    lm10 = [e for e in _events(data) if e["event_id"] == "LM-0010"][0]
    assert lm10["event_confidence"] == "A1"        # upgraded A2 -> A1 by WARN
    assert lm10["ai_attribution"] == "B2"          # inference unchanged
    assert "SRC-WARN-CA" in [s["source_id"] for s in lm10["sources"]]


def test_log_records_hash(tmp_path):
    data = _seed_data(tmp_path)
    apply_manifest.run(MANIFEST, data, SCHEMAS)
    entry = [m for m in _log(data) if m["manifest_id"] == "MAN-2026-06-15"][0]
    assert len(entry["sha256"]) == 64
    assert entry["ops"] == {"add": 2, "update": 1}


def test_malformed_manifest_applies_nothing(tmp_path):
    """A manifest that would introduce a B1-from-headline must abort with NOTHING applied."""
    data = _seed_data(tmp_path)
    n0 = len(_events(data))
    bad = tmp_path / "2026-07-01.md"
    bad.write_text(
        "# Update Manifest — 2026-07-01\n## Summary\nbad\n## New Events\n```json\n"
        + json.dumps([{"op": "add", "event": {
            "event_id": "LM-0999", "date_announced": "2026-07-01", "company": "Liar Co",
            "sector": "Technology", "headcount": 10, "headcount_basis": "press_estimate",
            "event_confidence": "A2", "ai_attribution": "B1",
            "ai_attribution_rationale": "a headline said AI", "stated_reasons": [],
            "sources": [{"source_id": "SRC-WIRE-REUT", "type": "headline",
                         "url": "https://e.com", "retrieved": "2026-07-01", "claim": "x"}],
            "discrepancy_note": None}}])
        + "\n```\n## Provenance\n- Analyst: test\n")

    assert apply_manifest.run(str(bad), data, SCHEMAS) == 1   # refused
    assert len(_events(data)) == n0                            # nothing added
    assert "LM-0999" not in [e["event_id"] for e in _events(data)]
    assert "MAN-2026-07-01" not in [m["manifest_id"] for m in _log(data)]  # no log entry
