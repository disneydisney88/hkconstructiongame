"""Outcome guard for governed runs.

The completion guard proves all work items are terminal. This guard separately checks
whether the required mission outcomes were actually met or explicitly waived/blocked.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

ALLOWED = {"NOT_MET", "MET", "BLOCKED", "WAIVED_BY_USER"}


def load(path: pathlib.Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, 2, f"outcome file missing: {path}"
    except Exception as exc:
        return None, 3, f"invalid JSON: {exc}"

    if isinstance(data, dict) and "outcomes" in data:
        outcomes = data["outcomes"]
    elif isinstance(data, list):
        outcomes = data
        data = {"run_id": path.parent.name, "outcomes": outcomes}
    else:
        return None, 3, "schema invalid: expected outcomes[]"

    if not isinstance(outcomes, list):
        return None, 3, "schema invalid: outcomes must be a list"
    for outcome in outcomes:
        required = {"id", "title", "required", "status", "evidence", "blocked_allowed", "success_criteria", "failure_reason", "follow_up"}
        if not isinstance(outcome, dict) or not required.issubset(outcome):
            return None, 3, "schema invalid: outcome fields"
        if outcome.get("status") not in ALLOWED:
            return None, 3, "schema invalid: outcome status"
        if not isinstance(outcome.get("evidence"), list) or not isinstance(outcome.get("success_criteria"), list):
            return None, 3, "schema invalid: outcome arrays"
    return data, 0, ""


def check(outcome: dict) -> str | None:
    if not outcome.get("required"):
        return None

    status = outcome["status"]
    evidence = outcome.get("evidence") or []

    if status == "MET":
        if not evidence:
            return "required outcome MET requires evidence"
        return None

    if status == "WAIVED_BY_USER":
        if not evidence:
            return "required outcome waived by user requires evidence"
        return None

    if status == "BLOCKED":
        if not outcome.get("blocked_allowed"):
            return "required outcome is BLOCKED but blocked_allowed=false"
        if not evidence or not outcome.get("failure_reason"):
            return "blocked required outcome requires evidence and failure_reason"
        return None

    return "required outcome is not MET"


def main(argv=None):
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--run-id")
    group.add_argument("--manifest")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    path = pathlib.Path(args.manifest) if args.manifest else pathlib.Path("gov/runs") / args.run_id / "outcome.json"
    data, code, message = load(path)
    if code:
        result = {"run_id": args.run_id, "code": code, "error": message}
        print(json.dumps(result, ensure_ascii=False) if args.json else message)
        return code

    failures = []
    for outcome in data["outcomes"]:
        reason = check(outcome)
        if reason:
            failures.append((outcome["id"], reason))

    result = {
        "run_id": data.get("run_id", args.run_id),
        "total_outcomes": len(data["outcomes"]),
        "failing_outcome_ids": [item_id for item_id, _ in failures],
        "failures": [{"id": item_id, "reason": reason} for item_id, reason in failures],
        "code": 1 if failures else 0,
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"run_id: {result['run_id']}")
        print(f"total outcomes: {result['total_outcomes']}")
        print("failing outcome IDs: " + (", ".join(result["failing_outcome_ids"]) or "none"))
        for item_id, reason in failures:
            print(f"- {item_id}: {reason}")
    return result["code"]


if __name__ == "__main__":
    sys.exit(main())
