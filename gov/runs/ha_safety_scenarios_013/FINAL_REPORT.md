# HA safety scenario 013

Scoped outcome: matrix + one opt-in actual-game proof. See OUTCOME_EVALUATION.md for limitations.

Try `?haSafetyScenarioTest=1&csdioff=1`; combined visuals use `?worldAssetTest=1&spawnHeroTest=1&haSafetyScenarioTest=1&csdioff=1`. Start, approach the marked bay near spawn, report, request simulated authorized crew clearance, then inspect. Normal game has no S07 panel or objects.

Source changes: ha-safety-scenario.js and four app.js lines. Test default, S07, clean S07 and combined visual mode. Default CSDI failures are preserved and reported. Original handbook photos informed spatial layout, not copied assets. No new downloaded assets.

Branch receipt: push-result.json. Main is not pushed or merged. Existing local boot.js modification remains unstaged. Package contains source, scoped patch, tests, screenshots and source references; no manual PDF, unknown model, credentials or full asset library. Run against the existing project; dependent asset paths remain those in app.js / project checkout.

Validation retry: initial final governance test failed on Windows cp950 decoding a UTF-8 em dash. Re-ran with PYTHONUTF8=1 plus PYTHONIOENCODING=utf-8; 17 governance and 6 outcome tests pass. Original error preserved in validation-encoding-failure.json. Final source differs from last gameplay test only by a corrected comment describing the QA collider.

Validation retry: initial final governance test failed on Windows cp950 decoding a UTF-8 em dash. Re-ran with PYTHONUTF8=1 plus PYTHONIOENCODING=utf-8; 17 governance and 6 outcome tests pass. Original error preserved in validation-encoding-failure.json. Final source differs from last gameplay test only by a corrected comment describing the QA collider.
