# Long-run governance

For every multi-item, batch, nightshift or overnight task create `gov/runs/<run_id>/manifest.json` using the required item fields. `DONE` is deliberately non-terminal. Evidence-backed `VERIFIED`, `BLOCKED`, `FAILED` or reasoned `SKIPPED` are terminal.

Run the guard before reporting completion:

```powershell
python gov/longrun_completion_guard.py --run-id <run_id>
python gov/longrun_completion_guard.py --run-id <run_id> --json
```

Use the controller to resume and select work without redoing verified items:

```powershell
python gov/longrun_controller.py --run-id <run_id> --manifest gov/runs/<run_id>/manifest.json --dry-run
```

The controller governs state only; it does not execute game-specific commands.
