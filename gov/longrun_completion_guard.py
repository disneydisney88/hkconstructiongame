"""Machine completion guard for durable multi-item runs."""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

TERMINAL = {"VERIFIED", "BLOCKED", "FAILED", "SKIPPED"}
ALLOWED = {"NOT_STARTED", "RUNNING", "DONE", *TERMINAL}


def load_manifest(path: pathlib.Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, 2, f"manifest missing: {path}"
    except Exception as exc:
        return None, 3, f"invalid JSON: {exc}"

    required = {"run_id", "title", "created_at", "updated_at", "controller_pid", "lock_file", "items", "history"}
    if not isinstance(data, dict) or not required.issubset(data):
        return None, 3, "schema invalid: manifest required fields"
    if not isinstance(data.get("items"), list) or not isinstance(data.get("history"), list):
        return None, 3, "schema invalid: items/history must be lists"

    fields = {"id", "title", "priority", "status", "started_at", "updated_at", "last_success", "evidence", "blocker", "error", "next_action", "depends_on", "notes"}
    for item in data["items"]:
        if not isinstance(item, dict) or not fields.issubset(item):
            return None, 3, "schema invalid: item fields"
        if not item.get("id") or item.get("status") not in ALLOWED:
            return None, 3, "schema invalid: item id/status"
        if not isinstance(item.get("evidence"), list):
            return None, 3, "schema invalid: evidence must be a list"
    return data, 0, ""


def check_item(item: dict) -> str | None:
    status = item["status"]
    evidence = item.get("evidence") or []

    if status not in TERMINAL:
        return f"status {status} is not terminal"
    if status == "VERIFIED" and not evidence:
        return "VERIFIED requires evidence"
    if status == "BLOCKED" and (not item.get("blocker") or not evidence):
        return "BLOCKED requires blocker and evidence"
    if status == "FAILED" and (not item.get("error") or not evidence):
        return "FAILED requires error and evidence"
    if status == "SKIPPED":
        notes = item.get("notes")
        required = {"reason", "attempted_checks", "evidence", "why_safe_to_skip", "follow_up"}
        if not isinstance(notes, dict) or not required.issubset(notes):
            return "SKIPPED requires notes.reason, attempted_checks, evidence, why_safe_to_skip and follow_up"
        if not isinstance(notes.get("attempted_checks"), list) or not notes.get("attempted_checks"):
            return "SKIPPED attempted_checks must be a non-empty list"
        if not isinstance(notes.get("evidence"), list) or not notes.get("evidence"):
            return "SKIPPED notes.evidence must be a non-empty list"
        if not notes.get("reason") or not notes.get("why_safe_to_skip") or not notes.get("follow_up"):
            return "SKIPPED notes fields must be non-empty"
        if item.get("core") is True and not notes.get("skip_approved_by_user"):
            hard_blocker = item.get("blocker") and notes.get("hard_blocker") is True and notes.get("evidence")
            if not hard_blocker:
                return "core SKIPPED requires user approval or hard blocker evidence"
    return None


def check_manifest(data: dict):
    failures = []
    for item in data["items"]:
        reason = check_item(item)
        if reason:
            failures.append((item["id"], reason))
    return failures


def main(argv=None):
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--run-id")
    group.add_argument("--manifest")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    path = pathlib.Path(args.manifest) if args.manifest else pathlib.Path("gov/runs") / args.run_id / "manifest.json"
    data, code, message = load_manifest(path)
    if code:
        result = {"run_id": args.run_id, "code": code, "error": message}
        print(json.dumps(result, ensure_ascii=False) if args.json else message)
        return code

    counts = {status: sum(item["status"] == status for item in data["items"]) for status in sorted(ALLOWED)}
    failures = check_manifest(data)
    result = {
        "run_id": data["run_id"],
        "total_items": len(data["items"]),
        "counts": counts,
        "failing_item_ids": [item_id for item_id, _ in failures],
        "failures": [{"id": item_id, "reason": reason} for item_id, reason in failures],
        "code": 1 if failures else 0,
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"run_id: {data['run_id']}")
        print(f"total items: {len(data['items'])}")
        print("counts: " + ", ".join(f"{k}={v}" for k, v in counts.items()))
        print("failing item IDs: " + (", ".join(result["failing_item_ids"]) or "none"))
        for item_id, reason in failures:
            print(f"- {item_id}: {reason}")
    return result["code"]


if __name__ == "__main__":
    sys.exit(main())
