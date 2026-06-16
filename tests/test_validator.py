"""
The refusal proof, as regression. seed.md §10 step 3 + the charter's HARD GATE:
validate.py must PASS valid fixtures and REFUSE malformed events with clear messages.
"""
import json
import pathlib

import validate  # noqa: E402  (path injected by conftest)

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMAS = str(ROOT / "schemas")


def _write_minimal(d):
    """Write a minimal, VALID data layer into dir `d` (one B0 event)."""
    (d / "derived").mkdir(parents=True, exist_ok=True)
    (d / "sources.json").write_text(json.dumps({
        "meta": {}, "sources": [
            {"source_id": "SRC-CO", "name": "Co", "class": "PRIMARY_FIRM", "home_url": "https://e.com", "access": "manual_read"},
            {"source_id": "SRC-WIRE", "name": "Wire", "class": "WIRE_PRESS", "home_url": "https://e.com", "access": "manual_read"},
        ]}))
    (d / "jolts-series.json").write_text(json.dumps({
        "meta": {"source": "t", "last_pull": "2026-06-15", "api": "t"},
        "series": {"job_openings": {"series_id": "X", "unit": "thousands",
                                    "observations": [{"period": "2026-04", "value": 7618}]}}}))
    (d / "challenger-monthly.json").write_text(json.dumps({"meta": {}, "months": []}))
    (d / "warn-notices.json").write_text(json.dumps({"meta": {}, "notices": []}))
    (d / "manifest-log.json").write_text(json.dumps({"meta": {}, "manifests": []}))
    return d


def _event(**over):
    base = {
        "event_id": "LM-0001", "date_announced": "2026-05-01", "company": "Co",
        "sector": "Technology", "headcount": 100, "headcount_basis": "company_statement",
        "event_confidence": "A1", "ai_attribution": "B0", "ai_attribution_rationale": None,
        "stated_reasons": [], "manifest_id": "M",
        "sources": [{"source_id": "SRC-CO", "type": "company_statement",
                     "url": "https://e.com", "retrieved": "2026-05-01", "claim": "x"}],
        "discrepancy_note": None,
    }
    base.update(over)
    return base


def _validate_with(d, events):
    (d / "ai-layoff-events.json").write_text(json.dumps({"meta": {}, "events": events}))
    return validate.validate_all(str(d), SCHEMAS)


# --- the real, shipped fixtures must PASS ---

def test_real_fixtures_pass():
    rpt = validate.validate_all(str(ROOT / "data"), SCHEMAS)
    assert rpt.ok, [e for e in rpt.errors]


# --- the canonical malformed fixtures must be REFUSED with clear messages ---

def test_malformed_fixture_dir_is_refused():
    rpt = validate.validate_all(str(ROOT / "tests/fixtures/malformed-events"), SCHEMAS)
    assert not rpt.ok
    blob = " ".join(m for _, m in rpt.errors)
    assert "headline alone caps at B3" in blob          # B1 from a headline
    assert "AVERAGE" in blob                             # averaged discrepancy
    assert "discrepancy_note is empty" in blob           # silently dropped both figures


# --- per-rule micro-refusals (seed.md §5.2 / §6) ---

def test_b1_needs_authoritative_source(tmp_path):
    d = _write_minimal(tmp_path)
    bad = _event(ai_attribution="B1", ai_attribution_rationale="headline said so",
                 sources=[{"source_id": "SRC-WIRE", "type": "headline", "url": "https://e.com",
                           "retrieved": "2026-05-01", "claim": "x"}])
    rpt = _validate_with(d, [bad])
    assert any("B1" in m for _, m in rpt.errors)


def test_b1_requires_carries_attribution_flag(tmp_path):
    d = _write_minimal(tmp_path)
    # authoritative source present, but it does NOT assert the AI cause.
    bad = _event(ai_attribution="B1", ai_attribution_rationale="we think so",
                 sources=[{"source_id": "SRC-CO", "type": "company_statement", "url": "https://e.com",
                           "retrieved": "2026-05-01", "claim": "x", "carries_ai_attribution": False}])
    rpt = _validate_with(d, [bad])
    assert any("carries_ai_attribution" in m for _, m in rpt.errors)


def test_rationale_required_when_attributed(tmp_path):
    d = _write_minimal(tmp_path)
    bad = _event(ai_attribution="B2", ai_attribution_rationale="")
    rpt = _validate_with(d, [bad])
    assert any("rationale" in m.lower() for _, m in rpt.errors)


def test_a1_ceiling_blocks_wire_only(tmp_path):
    d = _write_minimal(tmp_path)
    bad = _event(event_confidence="A1", ai_attribution="B0",
                 sources=[{"source_id": "SRC-WIRE", "type": "wire", "url": "https://e.com",
                           "retrieved": "2026-05-01", "claim": "x"}])
    rpt = _validate_with(d, [bad])
    assert any("A1" in m for _, m in rpt.errors)


def test_unknown_source_is_refused(tmp_path):
    d = _write_minimal(tmp_path)
    bad = _event(sources=[{"source_id": "SRC-NOPE", "type": "company_statement", "url": "https://e.com",
                           "retrieved": "2026-05-01", "claim": "x"}])
    rpt = _validate_with(d, [bad])
    assert any("registry" in m for _, m in rpt.errors)


def test_duplicate_event_id_is_refused(tmp_path):
    d = _write_minimal(tmp_path)
    rpt = _validate_with(d, [_event(event_id="LM-0001"), _event(event_id="LM-0001")])
    assert any("duplicate" in m.lower() for _, m in rpt.errors)


def test_jolts_rate_poison_is_refused(tmp_path):
    d = _write_minimal(tmp_path)
    (d / "jolts-series.json").write_text(json.dumps({
        "meta": {"source": "t", "last_pull": "2026-06-15", "api": "t"},
        "series": {"job_openings": {"series_id": "X", "unit": "thousands",
                                    "observations": [{"period": "2026-04", "value": 4.3}]}}}))
    (d / "ai-layoff-events.json").write_text(json.dumps({"meta": {}, "events": []}))
    rpt = validate.validate_all(str(d), SCHEMAS)
    assert any("RATE" in m for _, m in rpt.errors)
