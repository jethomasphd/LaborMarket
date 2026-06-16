#!/usr/bin/env python3
"""
fetch_jolts.py — Pull the measured JOLTS baseline into data/jolts-series.json.

The honest denominator the narrative layer lacks: BLS JOLTS, seasonally adjusted,
total nonfarm, LEVEL (thousands). Six series. Causation-blind by design.

Source chain (first that works wins, per series request):
  1. BLS Public Data API v2  (POST, needs BLS_API_KEY; up to 20-year span, 50 series)
  2. BLS Public Data API v1  (POST, no key; ~10-year span, lower daily quota)   [fallback]
  3. FRED                    (GET, needs FRED_API_KEY; mirrors the JOLTS series)  [fallback]

Charter guardrail honored: series IDs are the seed.md §2.1/§5.3 starting points, and the
caller is expected to have round-tripped them against a live API (see BUILD_LOG findings).
A series ID that silently returns the RATE instead of the LEVEL is a poison; this script
sanity-checks magnitude and refuses to write obviously-rate-shaped data to a 'thousands' unit.

Usage:
  python scripts/fetch_jolts.py [--startyear 2022] [--endyear 2026] [--out data/jolts-series.json]
Env:
  BLS_API_KEY   (optional; enables v2)
  FRED_API_KEY  (optional; enables FRED fallback)
"""
import argparse
import datetime as dt
import json
import os
import sys

import requests

# seed.md §2.1/§5.3 — national, total nonfarm, SA, level (thousands).
SERIES = {
    "job_openings":       {"bls": "JTS000000000000000JOL", "fred": "JTSJOL", "label": "Job Openings"},
    "hires":              {"bls": "JTS000000000000000HIL", "fred": "JTSHIL", "label": "Hires"},
    "quits":              {"bls": "JTS000000000000000QUL", "fred": "JTSQUL", "label": "Quits"},
    "layoffs_discharges": {"bls": "JTS000000000000000LDL", "fred": "JTSLDL", "label": "Layoffs & Discharges"},
    "total_separations":  {"bls": "JTS000000000000000TSL", "fred": "JTSTSL", "label": "Total Separations"},
    "other_separations":  {"bls": "JTS000000000000000OSL", "fred": "JTSOSL", "label": "Other Separations"},
}

BLS_V2 = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
BLS_V1 = "https://api.bls.gov/publicAPI/v1/timeseries/data/"
FRED_URL = "https://api.stlouisfed.org/fred/series/observations"

# A JOLTS level (thousands) is in the hundreds-to-tens-of-thousands range; a rate is < 100.
# Guard against silently ingesting the rate series under a 'thousands' unit.
RATE_POISON_CEILING = 100.0


def _period_to_iso(year, period):
    """BLS period 'M04' + year '2026' -> '2026-04'. Returns None for annual (M13) etc."""
    if not period.startswith("M"):
        return None
    month = period[1:]
    if month == "13":  # annual average
        return None
    return f"{year}-{month}"


def fetch_bls(endpoint, api_key, startyear, endyear):
    body = {
        "seriesid": [s["bls"] for s in SERIES.values()],
        "startyear": str(startyear),
        "endyear": str(endyear),
    }
    if api_key:
        body["registrationkey"] = api_key
    r = requests.post(endpoint, json=body, headers={"Content-Type": "application/json"}, timeout=45)
    r.raise_for_status()
    payload = r.json()
    if payload.get("status") != "REQUEST_SUCCEEDED":
        raise RuntimeError(f"BLS status={payload.get('status')} message={payload.get('message')}")
    by_id = {}
    for s in payload.get("Results", {}).get("series", []):
        obs = []
        for d in s.get("data", []):
            iso = _period_to_iso(d["year"], d["period"])
            if iso is None:
                continue
            try:
                val = float(d["value"].replace(",", ""))
            except (ValueError, AttributeError):
                val = None
            obs.append({"period": iso, "value": val})
        obs.sort(key=lambda o: o["period"])
        by_id[s["seriesID"]] = obs
    return by_id


def fetch_fred(api_key, startyear):
    """FRED fallback. One GET per series."""
    by_name = {}
    for name, meta in SERIES.items():
        params = {
            "series_id": meta["fred"],
            "api_key": api_key,
            "file_type": "json",
            "observation_start": f"{startyear}-01-01",
        }
        r = requests.get(FRED_URL, params=params, timeout=45)
        r.raise_for_status()
        obs = []
        for o in r.json().get("observations", []):
            if o["value"] in (".", "", None):
                continue
            obs.append({"period": o["date"][:7], "value": float(o["value"])})
        obs.sort(key=lambda x: x["period"])
        by_name[name] = obs
    return by_name


def _looks_like_rate(observations):
    vals = [o["value"] for o in observations if o["value"] is not None]
    if not vals:
        return False
    # If EVERY value is below the rate ceiling, this is almost certainly a rate series.
    return max(vals) < RATE_POISON_CEILING


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--startyear", type=int, default=dt.date.today().year - 4)
    ap.add_argument("--endyear", type=int, default=dt.date.today().year)
    ap.add_argument("--out", default="data/jolts-series.json")
    args = ap.parse_args()

    bls_key = os.environ.get("BLS_API_KEY")
    fred_key = os.environ.get("FRED_API_KEY")

    series_obs = {}     # name -> [obs]
    used_api = None

    # 1) BLS v2 (if key), 2) BLS v1 (keyless)
    for endpoint, label, key in (
        (BLS_V2, "BLS v2", bls_key),
        (BLS_V1, "BLS v1 (keyless)", None),
    ):
        if endpoint is BLS_V2 and not bls_key:
            continue
        try:
            print(f"[fetch_jolts] trying {label} {args.startyear}-{args.endyear} ...", file=sys.stderr)
            by_id = fetch_bls(endpoint, key, args.startyear, args.endyear)
            series_obs = {name: by_id.get(meta["bls"], []) for name, meta in SERIES.items()}
            if all(series_obs.values()):
                used_api = label
                break
        except Exception as e:  # noqa: BLE001 — fall through to next source
            print(f"[fetch_jolts] {label} failed: {e}", file=sys.stderr)

    # 3) FRED fallback
    if (not used_api or not all(series_obs.values())) and fred_key:
        try:
            print("[fetch_jolts] trying FRED fallback ...", file=sys.stderr)
            series_obs = fetch_fred(fred_key, args.startyear)
            used_api = "FRED"
        except Exception as e:  # noqa: BLE001
            print(f"[fetch_jolts] FRED failed: {e}", file=sys.stderr)

    if not used_api or not all(series_obs.values()):
        print("[fetch_jolts] ERROR: could not retrieve all six series from any source.", file=sys.stderr)
        print("  Set BLS_API_KEY (v2) or FRED_API_KEY, or check network/quota.", file=sys.stderr)
        return 2

    # Poison check: refuse to write rate-shaped data under a 'thousands' unit.
    for name, obs in series_obs.items():
        if _looks_like_rate(obs):
            print(f"[fetch_jolts] ERROR: series '{name}' looks like a RATE, not a LEVEL "
                  f"(all values < {RATE_POISON_CEILING}). Refusing to write poisoned data. "
                  f"Check the series ID ({SERIES[name]['bls']}).", file=sys.stderr)
            return 3

    out = {
        "meta": {
            "source": "BLS JOLTS (SA, total nonfarm, level, thousands)",
            "last_pull": dt.date.today().isoformat(),
            "api": used_api,
            "note": "Measured baseline. Rigorous, lagged ~2 months, CANNOT attribute causation.",
        },
        "series": {},
    }
    for name, meta in SERIES.items():
        out["series"][name] = {
            "series_id": meta["bls"],
            "fred": meta["fred"],
            "label": meta["label"],
            "unit": "thousands",
            "seasonally_adjusted": True,
            "observations": series_obs[name],
        }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    months = {len(o) for o in series_obs.values()}
    latest = max(o[-1]["period"] for o in series_obs.values())
    print(f"[fetch_jolts] OK via {used_api}: wrote {args.out} | "
          f"{min(months)}–{max(months)} months/series | latest {latest}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
