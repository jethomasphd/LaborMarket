#!/usr/bin/env python3
"""
build_standalone.py — Bundle the dashboard into ONE self-contained HTML file.

The live site (index.html) reads its four data files over HTTP at load time. That is
perfect for Cloudflare Pages, but it means the page can't be opened straight from disk
(browsers block fetch() on file://). This script inlines the data so the result opens
anywhere — double-click it, attach it to an email, drop it in Slack.

Usage:
    python scripts/build_standalone.py                 # -> dist/humancost.html
    python scripts/build_standalone.py -o ~/Desktop/humancost.html

Re-run after every data update (apply_manifest.py / fetch_jolts.py). Nothing else changes:
the page's own JavaScript prefers window.HUMANCOST_DATA when it is present and only falls
back to fetch() when it isn't.
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The same four files index.html fetches at runtime, keyed the same way.
DATA_FILES = {
    "challenger": "data/challenger-monthly.json",
    "events": "data/ai-layoff-events.json",
    "jolts": "data/jolts-series.json",
    "log": "data/manifest-log.json",
}
MARKER = "<!-- DATA -->"   # index.html carries this marker in <head>; the blob is injected there.


def build(out_path: str) -> str:
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        html = f.read()
    if MARKER not in html:
        sys.exit(f"index.html has no {MARKER} marker — nowhere to inject the data.")

    data = {}
    for key, rel in DATA_FILES.items():
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            data[key] = json.load(f)

    # `</` inside a JSON string would terminate the <script> early; escape it.
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    inject = f"<script>window.HUMANCOST_DATA = {blob};</script>"
    html = html.replace(MARKER, inject, 1)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-o", "--out", default=os.path.join(ROOT, "dist", "humancost.html"),
                    help="output file (default: dist/humancost.html)")
    args = ap.parse_args()
    out = build(args.out)
    size_kb = os.path.getsize(out) / 1024
    print(f"  ✓ standalone dashboard written: {out} ({size_kb:.0f} KB) — opens from disk, no server needed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
