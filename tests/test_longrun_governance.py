from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUARD = ROOT / "gov" / "longrun_completion_guard.py"
OUTCOME = ROOT / "gov" / "longrun_outcome_guard.py"
CONTROLLER = ROOT / "gov" / "longrun_controller.py"


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, *args], cwd=ROOT, text=True, capture_output=True)


def manifest(items):
    return {
        "run_id": "test",
        "title": "test",
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
        "controller_pid": None,
        "lock_file": None,
        "items": items,
        "history": [],
    }


def item(item_id: str, status: str, **extra):
    base = {
        "id": item_id,
        "title": item_id,
        "priority": 1,
        "status": status,
        "started_at": None,
        "updated_at": None,
        "last_success": None,
        "evidence": [],
        "blocker": None,
        "error": None,
        "next_action": "none",
        "depends_on": [],
        "notes": {},
    }
    base.update(extra)
    return base


def write_json(path: pathlib.Path, data) -> pathlib.Path:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def test_completion_guard_rules():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = pathlib.Path(tmp)

        incomplete = write_json(tmp_path / "incomplete.json", manifest([
            item("done", "VERIFIED", evidence=["evidence.txt"]),
            item("todo", "NOT_STARTED"),
        ]))
        assert run(str(GUARD), "--manifest", str(incomplete)).returncode == 1

        blocked_allowed = write_json(tmp_path / "blocked.json", manifest([
            item("ok", "VERIFIED", evidence=["evidence.txt"]),
            item("blocked", "BLOCKED", evidence=["blocker.txt"], blocker="tool unavailable"),
        ]))
        assert run(str(GUARD), "--manifest", str(blocked_allowed)).returncode == 0

        skipped_bad = write_json(tmp_path / "skipped_bad.json", manifest([
            item("skip", "SKIPPED"),
        ]))
        assert run(str(GUARD), "--manifest", str(skipped_bad)).returncode == 1

        skipped_core_bad = write_json(tmp_path / "skipped_core_bad.json", manifest([
            item("core", "SKIPPED", core=True, notes={
                "reason": "not available",
                "attempted_checks": ["check"],
                "evidence": ["log.txt"],
                "why_safe_to_skip": "demo",
                "follow_up": "retry later",
            }),
        ]))
        assert run(str(GUARD), "--manifest", str(skipped_core_bad)).returncode == 1

        skipped_core_ok = write_json(tmp_path / "skipped_core_ok.json", manifest([
            item("core", "SKIPPED", core=True, blocker="official source unavailable", notes={
                "reason": "blocked",
                "attempted_checks": ["official access check"],
                "evidence": ["access.log"],
                "why_safe_to_skip": "hard blocker",
                "follow_up": "retry after access",
                "hard_blocker": True,
            }),
        ]))
        assert run(str(GUARD), "--manifest", str(skipped_core_ok)).returncode == 0


def test_outcome_guard_rules():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = pathlib.Path(tmp)
        base = {
            "run_id": "outcome-test",
            "outcomes": [{
                "id": "goal",
                "title": "goal",
                "required": True,
                "status": "NOT_MET",
                "evidence": [],
                "blocked_allowed": False,
                "success_criteria": ["thing exists"],
                "failure_reason": "",
                "follow_up": "",
            }],
        }

        not_met = write_json(tmp_path / "not_met.json", base)
        assert run(str(OUTCOME), "--manifest", str(not_met)).returncode == 1

        met = json.loads(json.dumps(base))
        met["outcomes"][0]["status"] = "MET"
        met["outcomes"][0]["evidence"] = ["proof.txt"]
        assert run(str(OUTCOME), "--manifest", str(write_json(tmp_path / "met.json", met))).returncode == 0

        blocked = json.loads(json.dumps(base))
        blocked["outcomes"][0]["status"] = "BLOCKED"
        blocked["outcomes"][0]["blocked_allowed"] = True
        blocked["outcomes"][0]["evidence"] = ["blocker.txt"]
        blocked["outcomes"][0]["failure_reason"] = "official gated model access denied"
        assert run(str(OUTCOME), "--manifest", str(write_json(tmp_path / "blocked.json", blocked))).returncode == 0


def test_controller_dry_run_selects_next():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = pathlib.Path(tmp)
        path = write_json(tmp_path / "manifest.json", manifest([
            item("done", "VERIFIED", priority=1, evidence=["evidence.txt"]),
            item("next", "NOT_STARTED", priority=2),
            item("later", "NOT_STARTED", priority=3),
        ]))
        proc = run(str(CONTROLLER), "--run-id", "test", "--manifest", str(path), "--dry-run")
        assert proc.returncode == 0
        assert '"next_item": "next"' in proc.stdout


if __name__ == "__main__":
    test_completion_guard_rules()
    test_outcome_guard_rules()
    test_controller_dry_run_selects_next()
    print("governance tests passed")
