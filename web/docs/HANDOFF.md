# HANDOFF — where we left off (rewrite this file, do not append)

**Last updated:** Sun 15 Nov 2026, 18:25 Tashkent · **Past the 17:00 feature freeze. Only fixes, deploy and submission from here. Submit by 20:00 (hard deadline 23:59).**

## State right now

- **The game works end to end** in both play styles on real NASA data. Unit tests: 7 pass. Bots reach all 7 endings.
  - Command view (default): a scripted full mission, title → ending → debrief, ran with no errors.
  - First person (beta; Settings → Play style, or `?fp=1`): a scripted full mission (teleporting to each objective, using E and the tablet) reached an ending in 109 steps with no errors, visiting 13 stations.
- **Published build:** every push to `main` that touches `web/` or `shared/` builds and publishes to the `gh-pages` branch. That branch is current (built from `8e51cfe`: first person, new models, light Low preset).
- **BLOCKER: the public URL https://darkcursader.github.io/plutonyx/ still returns 404** because GitHub Pages is not switched on. Only the repo owner can do it: repo **Settings → Pages → Deploy from a branch → `gh-pages` / root → Save**. Nothing else is missing for the link to work.
- **Demo video:** `docs/demo/plutonyx-demo-30s.mp4` — 29.8 s, 24.8 MB, 1080p, every frame is the real game, English captions burned in. Needs uploading (YouTube Public / Drive "anyone with the link").
- **Submission texts:** `docs/submission.md` (all fields), `docs/checklist.md`, `docs/lesson-guide.md`, `docs/demo-script.md`, `shared/references.md` (46 sources).

## Measured, not guessed (15 Nov, this laptop: 8 GB RAM, GTX 1650 + Intel UHD)

| Check | Result |
|---|---|
| Frame rate, NVIDIA GTX 1650, High preset, 720p | title 36 fps · command deck 52 · outside 56. **Not 60.** |
| Frame rate, Intel UHD (what a browser uses by default on this laptop) | Low preset (now the default for Intel): title 28 · inside 50 · outside 45. On High it was 7–12 fps. |
| Walking (real W key), wall collision, airlock door, jump (1.38 s in the air = Mars gravity) | pass |
| Mouse look (pointer lock) | **not verified**: pointer lock cannot be granted to an automated browser. Needs a human with a mouse. |
| Full mission, first person | pass (scripted) — but nobody has walked a whole mission by hand |
| Gamepad, touch, Firefox, Safari, Chromebook, phone | **not tested** |

## Honest gaps

- **Clipping:** first-person collision only knows the big buildings (circles) and the greenhouse box. You can walk through solar panels, rocks, the dish stand, the rover, greenhouse racks and the consoles and bunks inside.
- **Entering rooms is a fade-teleport at a door with [E]**, not a walk-through airlock.
- **Not everything is on the tablet:** objective banner, [E] prompt, guidance arrow, wrist read-out and toasts are still flat overlays; pause, settings, science log, classroom questions and cutscene captions are full-screen.
- **Models that still look simple:** greenhouse shell and plants, storm shelter mound and pylons, solar panels, comms dish, Air Maker tanks, crew rover, landing pad, and everything inside the rooms (boxes). New and good: habitat, ascent vehicle (Blender), Perseverance (NASA), rocks and ground (scans).
- **Not built:** rover driving, in-game video cutscenes, voices, SI portraits/postcards, save/continue, WebGPU, KTX2, LODs, Unity work (this session has no Unity and does not touch `/desktop`).
- A few event choices cost only an opportunity (for example "By the book", "Carry on as planned").
- No playtest with kids or adults has happened.

## Next 3 steps (in this order)

1. **Owner: switch on GitHub Pages** (see blocker). Then open the link in a private window and start a mission.
2. **Team: upload the demo video publicly**, put the link in `docs/submission.md` field 3, add the five member names to `README.md`, paste the fields into the submission page, tick `docs/checklist.md`, click **Submit for Judging**.
3. If the Desktop build is released: put its URL in `shared/design/game.json` → `links.desktopDownload` and push (the title-screen button becomes a link). Otherwise delete the Desktop line from the Detailed Description.

## Known bugs / gotchas

- `git add -A` once swept a 180 MB video into a commit and GitHub rejected the push. Keep `docs/demo/` under 100 MB per file (the video script now caps the bitrate).
- Blender → glTF: materials need a node Base Colour to stay distinct; text meshes add their own UV and colour layers (the script removes them); do **not** run `gltf-transform optimize` on the models (it merges materials and drops UVs and vertex colours) — use `meshopt` only.
- Recording with Playwright: use the built site (`npx vite build && npx vite preview --port 4173`), the window must stay visible, and force the discrete GPU (`--force_high_performance_gpu`). Close other copies of the game first: 8 GB RAM is tight.
- Bash heredocs containing back-ticks or `${` break in this shell: write patch scripts to `.cache/` with the Write tool and run them with node.
- DONKI: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<TYPE>` (no key, max 60 days). `api.nasa.gov/DONKI` returned 404 on 14 Nov.
- NASA Mars Fact Sheet gives mean gravity 3.73 m/s² (the briefs said 3.71); the game uses 3.73 and cites it.
- C: is almost full. Caches live on D: (`npm_config_cache=D:/npm-cache`, `PLAYWRIGHT_BROWSERS_PATH=D:/PlutonyX-assets/ms-playwright`). Tools: `D:\Tools\Blender`, `D:\Tools\ffmpeg`.

## Waiting on team

GitHub Pages switch · demo upload · member names · final title (placeholder "PROJECT JEZERO") · Desktop link and one sentence on SI use in Unity · the submission itself.

## Do NOT redo

Simulation, balance, events and endings · space-weather archive and calibration · terrain and asset pipelines · Blender hardware script · first-person / tablet architecture (`web/src/fp/`) · submission texts.

## Self-grade (honest, end of day)

Impact 4 · Creativity 4 · Validity 4 · Relevance 5 · Presentation 3. Presentation is the weak one: no public link yet, no device testing, several simple models remain.
