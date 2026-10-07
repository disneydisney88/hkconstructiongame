# S07 boundary check

PASS for the scoped QA proof; not a full mission regression.

- Default: no S07 objects, panel or collider. Mission 0 starts in all four modes.
- Only production source hook is an import and exact `haSafetyScenarioTest=1` conditional. Existing mission, PPE, tutorial, truck, gate and vehicle code is unchanged from checkpoint 934a0af.
- QA adds one exclusion collider around the marked exercise bay. All prior collider entries compare identical in the same paused runtime; gate probes identical; disposal restores the original array.
- Bounds: x -803.8..-800.8, z 929.98..932.42. Computed sidewalk overlap 0, gap 0.551277 m. Both measured approach corridors overlap 0. Gate centres 13.0 m / 21.4 m away.
- Real keyboard route and mouse turn succeeded. Out-of-range and out-of-order actions rejected. Repeat inspection cannot repeat success. Existing mission/wage/registered/PPE unchanged by scenario actions.
- Report -> warning boundary -> explicitly simulated authorized crew clearance -> inspection. Player is not instructed to handle unknown hazards.
- Simple QA collider blocks the entire bay, including open rail side. This is intentional training exclusion, not a detailed physical rack collider.
- Published HEAD boot.js compatibility was tested independently because local boot.js contains preserved, unstaged adapter changes.
- Full site entry, later missions and Mission 5 were not replayed; no certification of all gameplay is implied.

Evidence: boundary-geometry.json, boundary-runtime.json, performance.json, performance-final-ui.json.
