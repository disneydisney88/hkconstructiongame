# SPAWN VISUAL OUTCOME: MET
Scope: opt-in spawnHeroTest=1, normal third-person camera. Current tested URL parameters: worldAssetTest=1&spawnHeroTest=1&csdioff=1. Default remains unchanged.

Question: at normal spawn first glance, do crude construction masses still dominate? NO for the captured normal spawn. The formerly dominant left blank front/side and right oversized dark windows now read as small industrial windows, tiled bays, service shutters and shallow equipment. Combined former sample occupancy34.2%. The narrow active scaffold gap remains visible, intentionally unaltered. This is a scoped visual improvement, not photoreal or user art approval.

Acceptance evidence:
- SPAWN_before/after: fixed original game camera, FOV62,1440x900. No inspection-camera substitution.
- WALK10_before/after: actual keyboard A4.2seconds, displacement14.20m. Ground remains sparse, but the street facades have human-scale detail.
- GATE_before/after: actual return/forward keyboard approach. Gate sign and route remain visible.
- TURN_LEFT and TURN_RIGHT: mouse-drag camera controls in game, no programmatic camera repositioning.
- Each pair pauses simulation and toggles only the skin, preserving player, camera position/quaternion and lighting. Paired recorded transforms exactly equal.
- New cost2calls/1452triangles/one1024 atlas, within requested budgets. Live three-run before medians33.4,33.3,33.4ms; after33.3,33.3,33.4ms. P95 approximately50ms both. No large differential observed; short smoke, not full performance certification.
- Console/page errors0; HTTP failures0 under csdioff. Flag-off starts and skin absent.
- Protected runtime test PASS; existing 4,295 meshes and1,214 colliders unchanged.

Iteration record:
First iteration1648triangles exceeded budget. Reduced elevated bands and limited distant tower skin to37.2m (12storeys); added AC grille detail; reran complete screenshot route. Final1452triangles. Initial evidence retained in iteration1. Two test helper encoding errors were fixed (utf8-sig alias and Windows cp950 default); no game runtime failure from those helpers.

Limits:
Remaining untreated narrow side elevation in WALK10, dark distant tower at far right on turn, grass/black ground texture and high repetitive upper-floor rhythm still need work. Tower above37.2m is unchanged; upward inspection can expose transition. Finite normal route only; no claim entire district improved. Ground openings are painted recess impressions plus actual thin awnings, not traversable entrances. No collision or mission changes; no full mission completion tested. No commit/push; Kimodo untouched.
