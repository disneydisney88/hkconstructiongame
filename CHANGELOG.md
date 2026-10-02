# Changelog

## audit-2026.10.02 — development build

- Add procedural safety classroom, supervised health-check presentation, and admission checklist using actual training, health and PPE state.
- Repair startup, hazard scope, pickup interactions, repeated clearance counting and paused event updates.
- Cache worker geometry while keeping independent skeletons; update role appearance and rename foreman to 老陳.
- Improve landing screen, text size and world-label limits; add local Streamlit audit console.
- Include regression checks, browser screenshots and ACCEPTANCE-2026-10-02.md.

This is a development update, not a completed release. Full first-mission payout, all areas/events, financial deduplication, performance requirements and asset licensing remain incompletely verified. No Steam submission or public Streamlit deployment is included.

## Running this source build

Serve the repository with `python server.py 8123`, then open `http://localhost:8123/`. No compilation/bundling step is configured; ES modules, models and other repository assets are loaded by the browser. Internet access is required for the existing Three.js CDN imports. Do not open index.html through file://.

Browser testing used the Codex in-app Chromium browser on Windows. A browser capable of rendering this Three.js/WebGL application is required. Minimum CPU, GPU, RAM and supported mobile devices have not been benchmarked. Python is needed only for the local server/admin interface, not GitHub Pages playback.

See REFERENCES.md and ASSET-CANDIDATES.md for recorded sources. Their existence is not a complete licensing clearance. The two user-provided reference photographs are not included in this commit; qa-evidence contains rendered game screenshots only.
