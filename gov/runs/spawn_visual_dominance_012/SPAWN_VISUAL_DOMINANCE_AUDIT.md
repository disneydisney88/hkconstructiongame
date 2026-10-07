# Normal spawn visual dominance audit
Captured before new assets. Normal game camera, FOV62,1440x900; player(-801,938), camera(-809.5,3.2,938). No inspection camera.
40x25 first-hit ray sampling; percentage of full viewport, excludes sky misses but not HUD occlusion. Region bounds are grid cells, not exact pixel masks. These are approximate screen occupancy, not photometric salience.
|surface|sample area|bounding region|quality|protected?|candidate?|
|---|---:|---|---|---|---|
|Left street building front (5228:undefined:0,0,1)|16.9%|[7, 0, 20, 13]|Crude blank / oversized window|Base preserved; visual skin only|Yes|
|Pedestrian paving (5136:undefined:0,0,1)|13.1%|[0, 12, 30, 24]|Existing context|Yes; excluded|No|
|Right upper tower west face (515:61:-1,0,0)|12.7%|[24, 0, 39, 9]|Crude blank / oversized window|Base preserved; visual skin only|Yes|
|Road surface (5137:undefined:0,0,1)|12.5%|[11, 14, 35, 24]|Existing context|Yes; excluded|No|
|Ground mesh (394:undefined:0,1,0)|8.7%|[0, 10, 39, 24]|Existing context|Yes; excluded|No|
|Left street building side (5228:undefined:-1,0,0)|4.6%|[3, 0, 7, 13]|Crude blank / oversized window|Base preserved; visual skin only|Yes|
|Site ground polygon (307:undefined:0,0,1)|3.7%|[1, 10, 37, 24]|Existing context|Yes; excluded|No|
|Scaffold/net face (2662:undefined:0,0,1)|2.2%|[21, 1, 23, 8]|Existing context|Yes; excluded|No|
|Ground mesh subface (394:undefined:0,0.9999999999999999,0)|2.1%|[15, 12, 37, 19]|Existing context|Yes; excluded|No|
|Drain channel (5177:undefined:0,1,0)|2.0%|[1, 14, 26, 24]|Existing context|Yes; excluded|No|
|Vehicle approach marking (5140:undefined:0,0,1)|1.9%|[37, 14, 39, 21]|Existing context|Yes; excluded|No|
|Adjacent street building side (5218:undefined:-1,0,0)|1.4%|[1, 0, 3, 11]|Crude blank / oversized window|Base preserved; visual skin only|Yes|
Source correction: largest left mass is buildDemoStreet() street building (app.js around3748), not active scaffold core. Right tower BUILDINGS instance centred(-749.9,982.7) overlaps site; detached visual-only skin permitted by this task. No base geometry edits.
Selected four faces: largest left front, same side, right west tower, adjacent street side. Left front+side+right sample count342/1000=34.2%. Ground and routes deliberately excluded.
Situation proposals are deferred design backlog; no new safety/mission situations in this visual-only run.