"""Hand-computed rollup expectations (seed.md §10 step 4 gate)."""
import pathlib

import build_rollups  # noqa: E402 (path injected by conftest)

ROOT = pathlib.Path(__file__).resolve().parents[1]
SAMPLE = str(ROOT / "tests/fixtures/rollup-sample")


def test_attribution_timeseries_hand_computed():
    ts = build_rollups.build_rollups(SAMPLE)["ai-attribution-timeseries.json"]
    by_month = {m["month"]: m for m in ts["months"]}
    assert by_month["2026-03"]["counts"] == {"B1": 1, "B2": 0, "B3": 0, "B0": 1}
    assert by_month["2026-03"]["headcount"] == {"B1": 100, "B2": 0, "B3": 0, "B0": 50}
    assert by_month["2026-05"]["counts"] == {"B1": 1, "B2": 0, "B3": 1, "B0": 0}
    assert by_month["2026-05"]["headcount"] == {"B1": 10, "B2": 0, "B3": 999, "B0": 0}


def test_discrepancy_series_hand_computed():
    disc = build_rollups.build_rollups(SAMPLE)["discrepancy-series.json"]
    by_month = {m["month"]: m for m in disc["months"]}
    # Only B1 + A1/A2 counts toward our verified total.
    assert by_month["2026-03"]["challenger_ai_cited"] == 1000
    assert by_month["2026-03"]["lm_b1_verified"] == 100
    assert by_month["2026-03"]["gap"] == 900
    assert by_month["2026-05"]["challenger_ai_cited"] == 2000
    assert by_month["2026-05"]["lm_b1_verified"] == 10   # B3 event excluded
    assert by_month["2026-05"]["gap"] == 1990


def test_sector_rollup_hand_computed():
    sec = build_rollups.build_rollups(SAMPLE)["sector-rollup.json"]
    by_sector = {s["sector"]: s for s in sec["sectors"]}
    assert by_sector["Technology"]["event_count"] == 3
    assert by_sector["Technology"]["total_headcount"] == 1149  # 100+50+999
    assert by_sector["Technology"]["by_b_tier"] == {"B1": 1, "B2": 0, "B3": 1, "B0": 1}
    assert by_sector["Finance"]["total_headcount"] == 10
    assert by_sector["Finance"]["by_b_tier"]["B1"] == 1


def test_rollups_are_deterministic():
    a = build_rollups.build_rollups(SAMPLE)
    b = build_rollups.build_rollups(SAMPLE)
    assert a == b  # pure function of inputs, no wall-clock
