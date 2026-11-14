# Progress — Desktop Ultra edition

Tick items as they are finished. `[x]` done · `[~]` in progress · `[ ]` not started · `[!]` blocked.

## Phase 0 — setup
- [x] Repo cloned, brief saved (`docs/BRIEF.md`), CLAUDE.md / HANDOFF / PROGRESS / DECISIONS
- [x] Unity Hub 4.0.0 installed (`/Applications/Unity Hub.app`)
- [!] Unity licence — the builder must sign in to Unity Hub once (free Personal licence)
- [~] Unity 6000.0.85f2 editor download (4.98 GB on a ~3 Mbit/s line) — see HANDOFF for the file path
- [ ] Windows Mono build-support module (313 MB, paused at 3.5 MB to give the editor the line)
- [ ] Editor extracted to `/Applications/Unity/Hub/Editor/6000.0.85f2/` and opens the project
- [x] GitHub CLI installed (`~/.local/bin/gh`) — [!] builder must run `gh auth login` once before the first push
- [x] Python venv for tools (`tools/.venv`: numpy, pillow, rasterio)
- [ ] Blender (deferred: only needed if NASA models need cleanup; Unity imports FBX/OBJ/GLB directly)
- [ ] MCP for Unity / Blender MCP (optional; batch-mode scripts are the primary path)

## Phase 1 — world
- [x] Real Jezero elevation (CTX 20 m) downloaded
- [~] Real Jezero orthoimage (CTX 6 m) downloading
- [~] `tools/terrain/process_terrain.py` → `TerrainData/` (heightmap RAW16, albedo, layer weights, map, meta)
- [ ] HiRISE 1 m inset around the outpost (windowed download; optional)
- [ ] Unity terrain import (`TerrainImporter`) with detail layers
- [ ] Physically Based Sky tuned for Mars (butterscotch day, blue sunset), fog/dust, exposure, ACES
- [ ] Habitat kit (NASA 3D Resources models cleaned of insignia + procedural modules)
- [ ] First cinematic camera shot (sunrise flyover)

## Phase 2 — vertical slice
- [x] NASA data: DONKI + RadLab fetch scripts and archived timelines (`Assets/StreamingAssets/data/`)
- [ ] `/shared` pulled from the Web lead (nothing pushed yet — see HANDOFF)
- [ ] Simulation core (plain C#) reading design JSON + unit tests
- [ ] One full mission playable: core loop, HUD, 2 endings with cinematics, debrief
- [ ] Data modes LIVE / ARCHIVED with badges
- [ ] First Windows + macOS player builds

## Phase 3 — full game
- [ ] All events, real-data mechanics (radiation replay from RadLab, DONKI alerts)
- [ ] "It really happened" reveal · "Play today's real sky" · Replay history (Sept 2017)
- [ ] Comms delay drama (real light-time from planetary positions)
- [ ] Crew dialogue and arcs · moral dilemmas
- [ ] Endings: Full Success · Bittersweet · Gamble · Evacuation · Green Outpost · Secret
- [ ] Ending gallery · achievements · mission card with seed
- [ ] Tutorial by doing · Cadet / Commander / Classroom modes · Mission Planner view
- [ ] Main menu over live scene · settings · save/continue · gamepad
- [ ] In-game attribution chips + Mission Science Log + Credits

## Phase 4 — polish
- [ ] Signature moments: launch flyover · radiation storm · dust storm · greenhouse growth · every ending
- [ ] VFX Graph effects · adaptive audio · photo mode
- [ ] Quality presets Ultra/High/Medium/Low tested (Low ≥30 fps on integrated GPU)
- [ ] SI art integration with watermark overlay
- [ ] Accessibility: colour-blind safe, text size, reduced motion, captions
- [ ] Quality gate: 4K screenshots of title, gameplay, storm, ending — inspected zoomed in

## Phase 5 — release
- [ ] 4K captures for the demo → Web lead by **Sun 14:00**
- [ ] 4–6 4K screenshots (≤10 MB each)
- [ ] Windows ZIP (+ macOS) on GitHub Releases `v1.0-desktop` with SHA-256 by **Sun 17:00**
- [ ] Windows build tested on a real PC (cannot be done on this Mac)
- [ ] `desktop/README.md` · `shared/references.md` entries · `shared/art/SI_LOG.md` · `docs/desktop-notes.md`

## Rubric self-grade (1–5) — update at the end of each phase
| Phase | Impact | Creativity | Validity | Relevance | Presentation |
|---|---|---|---|---|---|
| 0 | – | – | – | – | – |
