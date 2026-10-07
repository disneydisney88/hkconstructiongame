"""Minimal controller helper for durable long-run manifests.

This controller does not execute project work. It selects the next executable
manifest item and can update a heartbeat/lock-friendly manifest for external agents.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import time
from datetime import datetime, timezone

TERMINAL = {"VERIFIED", "BLOCKED", "FAILED", "SKIPPED"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: pathlib.Path, data: dict) -> None:
    data["updated_at"] = now()
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def dependencies_terminal(item: dict, items_by_id: dict) -> bool:
    for dep in item.get("depends_on", []):
        dep_item = items_by_id.get(dep)
        if not dep_item or dep_item.get("status") not in TERMINAL:
            return False
    return True


def select_next(data: dict, retry_blocked: bool = False):
    items = data.get("items", [])
    by_id = {item["id"]: item for item in items}
    candidates = []
    for item in items:
        status = item.get("status")
        if status == "VERIFIED" or status == "FAILED" or status == "SKIPPED":
            continue
        if status == "BLOCKED" and not retry_blocked:
            continue
        if not dependencies_terminal(item, by_id):
            continue
        candidates.append(item)
    candidates.sort(key=lambda x: (x.get("priority", 999999), x.get("id", "")))
    return candidates[0] if candidates else None


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--recover", action="store_true")
    parser.add_argument("--retry-blocked", action="store_true")
    parser.add_argument("--max-steps", type=int, default=1)
    parser.add_argument("--heartbeat-seconds", type=float, default=0.0)
    args = parser.parse_args(argv)

    path = pathlib.Path(args.manifest)
    data = load(path)
    next_item = select_next(data, retry_blocked=args.retry_blocked)

    if args.dry_run:
        print(json.dumps({
            "run_id": args.run_id,
            "next_item": next_item.get("id") if next_item else None,
            "status": next_item.get("status") if next_item else None,
            "next_action": next_item.get("next_action") if next_item else None,
        }, ensure_ascii=False, indent=2))
        return 0

    steps = 0
    while next_item and steps < max(args.max_steps, 1):
        next_item["status"] = "RUNNING"
        next_item["started_at"] = next_item.get("started_at") or now()
        next_item["updated_at"] = now()
        data.setdefault("history", []).append({"time": now(), "event": "selected", "item": next_item["id"]})
        save(path, data)
        print(f"selected {next_item['id']}: {next_item.get('next_action')}")
        steps += 1
        if args.once:
            break
        if args.heartbeat_seconds:
            time.sleep(args.heartbeat_seconds)
        data = load(path)
        next_item = select_next(data, retry_blocked=args.retry_blocked)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
