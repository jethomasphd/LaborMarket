#!/usr/bin/env python3
"""
apply_manifest.py — Phase 2 core. Ingest an Update Manifest, validate, apply, log.

  python scripts/apply_manifest.py manifests/2026-06-15.md

Contract (seed.md §8):
  • Parse the fenced JSON op-blocks (add / update).
  • Apply to a CANDIDATE copy of the data layer, regenerate derived rollups, then run the
    full validator on the candidate. If ANY error → abort, write nothing (never partially apply).
  • IDEMPOTENT: re-running the same manifest is a no-op (one log entry, identical data).
  • Append a manifest-log.json entry with the file's sha256.

Ops:
  { "op": "add", "event": { ...full event... } }
  { "op": "update", "event_id": "LM-0010", "set": { "field": value, ... },
    "add_sources": [ { ...source... } ], "reason": "..." }
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_rollups  # noqa: E402
import validate as validator  # noqa: E402


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def parse_manifest(path):
    raw = open(path, "rb").read()
    sha = hashlib.sha256(raw).hexdigest()
    text = raw.decode("utf-8")

    m = re.search(r"Update Manifest\s*[—\-:]\s*(\d{4}-\d{2}-\d{2})", text)
    date = m.group(1) if m else os.path.splitext(os.path.basename(path))[0]
    manifest_id = f"MAN-{date}"

    sm = re.search(r"##\s*Summary\s*\n(.+?)(?:\n##|\Z)", text, re.S)
    summary = " ".join(sm.group(1).split()) if sm else None
    am = re.search(r"Analyst:\s*(.+)", text)
    analyst = am.group(1).strip() if am else None

    ops = []
    for block in re.findall(r"```json\s*(.+?)```", text, re.S):
        try:
            parsed = json.loads(block)
        except json.JSONDecodeError as e:
            raise SystemExit(f"FATAL: manifest contains invalid JSON block: {e}")
        ops.extend(parsed if isinstance(parsed, list) else [parsed])
    return {"manifest_id": manifest_id, "sha256": sha, "file": os.path.basename(path),
            "summary": summary, "analyst": analyst, "ops": ops}


def apply_ops(docs, ops, manifest_id):
    """Apply ops to the candidate data docs (mutating in place). Returns (touched, counts).

    docs = {"events": [...], "challenger": [...months], "sources": [...]}
    Op types: add / update (events) · challenger_upsert (a month) · source_add (registry row).
    All ops are idempotent so re-applying the same manifest is a no-op.
    """
    events, challenger, sources = docs["events"], docs["challenger"], docs["sources"]
    by_id = {e["event_id"]: e for e in events}
    src_ids = {s["source_id"] for s in sources}
    ch_by_month = {m["month"]: m for m in challenger}
    touched = []
    counts = {"add": 0, "update": 0, "challenger_upsert": 0, "source_add": 0}

    for op in ops:
        kind = op.get("op")
        if kind == "add":
            ev = json.loads(json.dumps(op["event"]))  # deep copy
            ev["manifest_id"] = manifest_id
            eid = ev["event_id"]
            if eid in by_id:
                if by_id[eid] == ev:
                    continue  # idempotent re-add
                raise SystemExit(f"FATAL: add op for existing event_id {eid} with different content. "
                                 f"event_ids are immutable; use an 'update' op instead.")
            events.append(ev)
            by_id[eid] = ev
            counts["add"] += 1
            touched.append(eid)
        elif kind == "update":
            eid = op["event_id"]
            if eid not in by_id:
                raise SystemExit(f"FATAL: update op references unknown event_id {eid}.")
            ev = by_id[eid]
            for k, v in op.get("set", {}).items():
                ev[k] = v
            existing_src = {s["source_id"] for s in ev.get("sources", [])}
            for s in op.get("add_sources", []):
                if s["source_id"] not in existing_src:
                    ev.setdefault("sources", []).append(s)
                    existing_src.add(s["source_id"])
            ev["manifest_id"] = manifest_id
            counts["update"] += 1
            if eid not in touched:
                touched.append(eid)
        elif kind == "source_add":
            s = json.loads(json.dumps(op["source"]))
            if s["source_id"] in src_ids:
                continue  # idempotent — registry is append-only; existing rows are left as-is
            sources.append(s)
            src_ids.add(s["source_id"])
            counts["source_add"] += 1
        elif kind == "challenger_upsert":
            row = json.loads(json.dumps({k: v for k, v in op.items() if k != "op"}))
            month = row["month"]
            row["manifest_id"] = manifest_id
            if month in ch_by_month:
                ch_by_month[month].update(row)
            else:
                challenger.append(row)
                ch_by_month[month] = row
            counts["challenger_upsert"] += 1
        else:
            raise SystemExit(f"FATAL: unknown op '{kind}' "
                             f"(expected add|update|challenger_upsert|source_add).")

    challenger.sort(key=lambda m: m["month"])
    return touched, counts


def run(manifest, data_dir="data", schema_dir="schemas"):
    schema_dir = os.path.abspath(schema_dir)
    man = parse_manifest(manifest)
    print(f"[apply_manifest] {man['manifest_id']} ({man['file']}) sha256={man['sha256'][:12]}… "
          f"{len(man['ops'])} op(s)")

    # --- Idempotency guard: already applied with identical content? ---
    log_path = os.path.join(data_dir, "manifest-log.json")
    log = _load(log_path) if os.path.exists(log_path) else {"meta": {}, "manifests": []}
    for entry in log["manifests"]:
        if entry["manifest_id"] == man["manifest_id"]:
            if entry["sha256"] == man["sha256"]:
                print(f"[apply_manifest] {man['manifest_id']} already applied (identical sha256). "
                      f"Idempotent no-op — nothing changed.")
                return 0
            raise SystemExit(f"FATAL: {man['manifest_id']} already applied with DIFFERENT content "
                             f"(log sha256 {entry['sha256'][:12]}… vs file {man['sha256'][:12]}…). "
                             f"Use a new dated manifest id.")

    # --- Build a CANDIDATE copy and mutate it (never touch data/ until validated) ---
    tmp = tempfile.mkdtemp(prefix="lm_apply_")
    work = os.path.join(tmp, "data")
    shutil.copytree(data_dir, work)
    try:
        events_doc = _load(os.path.join(work, "ai-layoff-events.json"))
        challenger_doc = _load(os.path.join(work, "challenger-monthly.json"))
        sources_doc = _load(os.path.join(work, "sources.json"))
        docs = {"events": events_doc["events"], "challenger": challenger_doc["months"],
                "sources": sources_doc["sources"]}

        touched, counts = apply_ops(docs, man["ops"], man["manifest_id"])

        events_doc["events"] = docs["events"]
        events_doc.setdefault("meta", {})["last_manifest"] = man["manifest_id"]
        challenger_doc["months"] = docs["challenger"]
        sources_doc["sources"] = docs["sources"]
        _dump(os.path.join(work, "ai-layoff-events.json"), events_doc)
        _dump(os.path.join(work, "challenger-monthly.json"), challenger_doc)
        _dump(os.path.join(work, "sources.json"), sources_doc)

        build_rollups.write_rollups(work)

        log["manifests"].append({
            "manifest_id": man["manifest_id"],
            "file": f"manifests/{man['file']}",
            "applied_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sha256": man["sha256"],
            "summary": man["summary"],
            "analyst": man["analyst"],
            "ops": counts,
            "events_touched": touched,
        })
        _dump(os.path.join(work, "manifest-log.json"), log)

        # --- THE GATE: validate the candidate. Refuse to apply a lie. ---
        rpt = validator.validate_all(work, schema_dir)
        if not rpt.ok:
            print(f"\n[apply_manifest] ✗ candidate FAILED validation — {len(rpt.errors)} error(s). "
                  f"NOTHING applied:", file=sys.stderr)
            for where, msg in rpt.errors:
                print(f"  ✗  [{where}] {msg}", file=sys.stderr)
            return 1

        # --- Commit: copy candidate files back over data/ (all-or-nothing) ---
        for root, _dirs, files in os.walk(work):
            rel = os.path.relpath(root, work)
            dst_dir = os.path.join(data_dir, rel) if rel != "." else data_dir
            os.makedirs(dst_dir, exist_ok=True)
            for fn in files:
                shutil.copy2(os.path.join(root, fn), os.path.join(dst_dir, fn))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print(f"[apply_manifest] ✓ applied {man['manifest_id']}: "
          f"{counts['add']} add, {counts['update']} update, "
          f"{counts['challenger_upsert']} challenger, {counts['source_add']} source"
          f"{' → ' + str(touched) if touched else ''}. "
          f"Rollups rebuilt, log appended, validation passed.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest")
    ap.add_argument("--data-dir", default="data")
    ap.add_argument("--schema-dir", default="schemas")
    args = ap.parse_args()
    return run(args.manifest, args.data_dir, args.schema_dir)


if __name__ == "__main__":
    raise SystemExit(main())
