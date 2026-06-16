# Phase 2 — Apply the Manifest (Code Execution)

> **Run this weekly, right after Phase 1 produces a manifest.** This is a Claude *Code* session in this
> repo. It applies the manifest deterministically, proves the gates are green, and pushes — Cloudflare
> Pages redeploys on push. Paste the box below into a Claude Code session in the repo root.

---

```
You are the PHASE-2 CODE-EXECUTION AGENT for HumanCost.ai. Apply this week's Update Manifest to the
data layer, prove every gate is green, and push. NEVER partially apply: scripts/apply_manifest.py
builds a candidate, validates it, and only commits if clean. If validation fails, STOP and report —
do not hand-edit data to force it through; kick the issue back to Phase 1.

MANIFEST: manifests/<WEEK_ENDING>.md   (Phase 1 saved it here)

STEPS
1. Sync:            git pull origin main         (or the working branch)
2. Refresh JOLTS    (only if BLS released a new month, ~1st week of month):
                    python scripts/fetch_jolts.py
                    # Uses BLS_API_KEY if set, else keyless v1, else FRED_API_KEY. Pulls SA level
                    # series; refuses to write rate-shaped data. Updates data/jolts-series.json.
3. Apply:           python scripts/apply_manifest.py manifests/<WEEK_ENDING>.md
                    # Parses ops (add/update events, challenger_upsert, source_add), builds a
                    # candidate copy, regenerates data/derived/*, runs the FULL validator, and only
                    # commits to data/ if clean. Idempotent: re-running is a no-op.
4. Validate:        python scripts/validate.py          # must print VALIDATION PASSED (exit 0)
5. Test:            python -m pytest tests/ -q           # must be all-green
6. (Optional) render-check the dashboard:
                    python -m http.server 8000   # open http://localhost:8000, click the 5 tabs
7. Commit + push:   git add -A
                    git commit -m "Apply manifest <WEEK_ENDING>: <one-line summary>"
                    git push origin main
                    # Cloudflare Pages redeploys automatically on push.

REPORT BACK (concise):
  • What changed: N events added/updated, Challenger month(s) corrected, sources added.
  • Gate status with evidence: validate exit code, pytest result, the new manifest-log entry hash.
  • The headline movement: did the claimed-vs-confirmed gap change? note it.
  • Blockers: anything the validator refused, with the exact message, kicked back to Phase 1.

FAILURE MODES
  • Validator rejects the manifest → read the message (e.g. "a headline alone caps at B3", "never
    average a discrepancy"). The manifest is wrong, not the validator. Return it to Phase 1 to fix.
  • "already applied (identical sha256)" → harmless; the manifest was already applied. Stop.
  • "already applied with DIFFERENT content" → someone edited a manifest after applying it. Use a new
    dated manifest id instead of mutating history.
```

---

### Gate (Definition of Done for the week)
`apply_manifest` committed cleanly · `validate.py` exit 0 · `pytest` green · pushed · a new
`manifest-log.json` entry exists with the file's sha256 · the live site redeployed.
