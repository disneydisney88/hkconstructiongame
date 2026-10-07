# Long-run governance

Lightweight guard scripts for long multi-item AI/Codex runs.

## Purpose

These tools prevent a multi-item task from being called complete when only a subset of items have terminal status or when the required outcome is not met.

A governed run stores its durable manifest under:

```text
gov/runs/<run_id>/manifest.json
```

A run should only be described as complete when both relevant guards pass:

```bash
python gov/longrun_completion_guard.py --run-id <run_id>
python gov/longrun_outcome_guard.py --run-id <run_id>
```

If either guard fails, the work should be reported as a checkpoint rather than a final completion.

## Status values

Items may use:

- `NOT_STARTED`
- `RUNNING`
- `DONE`
- `VERIFIED`
- `BLOCKED`
- `FAILED`
- `SKIPPED`

`DONE` is not a terminal completion state. Evidence is required for terminal states.

## Limits

The guards validate declared status and evidence structure. They do not prove that the evidence is factually correct; human review is still required before production merge.
