# Draft: spawn / facade visual proof

Independent base: f3933ce83a1e65b20fdc72f1839c137d5647fb8a. Does not depend on PR #3 or archive PR #1.

Use `?worldAssetTest=1&spawnHeroTest=1`. Original project-authored canvas atlases and detached procedural facade meshes only. Five visual modules plus eight app.js wiring lines. Existing main gate coordinates and site zones provide selection/exclusion context; no new opening/collision system is imported. No CSDI exclusion is needed because this base does not include the later CSDI background path.

Default leaves the visual groups absent. No base geometry, mission, tutorial, vehicle or collision edits. Includes facade family plus legacy visual variants needed by the existing module imports. No downloaded assets or textures.

Clean-main startup and flag tests recorded separately from older PR #1 evidence. Prior visual acceptance/performance figures are not automatically transferred to this older gameplay base. This remains an opt-in Draft visual proof, not production/default approval. Full mission regression and stable performance acceptance are not claimed.

Do not merge or mark ready. No HA S07, boot.js, character/model, CSDI, screenshots or qa-evidence files are included.

Observed limitation on clean main: spawnHero discovers only right_tower_west (1 face); the later demo-street host meshes for three left/adjacent faces are absent in main. They are deliberately not imported because that would expand this clean visual-only PR into unrelated scene changes. World facade selection returns GENERATED. Both default and flag runs start at mission 0 with zero captured console/page errors or HTTP failures. This does NOT reproduce the complete four-face visual acceptance of archive PR #1; resolving missing hosts is a future explicit review decision.
