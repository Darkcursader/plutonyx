# HANDOFF — where we left off

**Last updated:** Sat 14 Nov 2026, 16:27 Tashkent · **Phase 0** (setup) running alongside Phase 1 data prep

## State right now
- **No Unity yet.** Editor installer still downloading (795 of 4,750 MB at 16:24). Nothing in-engine exists.
- Unity Hub 4.0.0 installed, builder signed in: `~/.unity/bin/unity license` shows **Unity Personal - Assigned**.
  The Hub also installed an official `unity` CLI (`~/.unity/bin/unity`: install, build, test, run, mcp, status).
- **The Hub was quit on purpose at 16:10**: it had started its own download of 6000.6.9f1 + WebGL (7 GB, not LTS),
  halving the line. Partials are kept in `~/Library/Application Support/UnityHub/downloads/`. Do not let it resume.
- Done and verified (all committed locally, nothing pushed):
  - Real NASA data: `tools/data/*.py` -> `Assets/StreamingAssets/data/timeline-{may-2024,sep-2017,recent}.json` + `SOURCES.md`
    (DONKI flares/CMEs with modelled Mars arrivals + Curiosity RAD surface dose rates from RadLab).
  - Real terrain: `TerrainData/` (2049 RAW16 heightmap, albedo, layer weights, map, `jezero_meta.json`), checked by eye.
  - **Design draft** in `design-draft/design/` (balance, crew, events, endings) - written here because `/shared` does not exist.
  - **Reference simulator** `tools/sim/sim.js` (the rules), `tools/sim/run.js` (bots + balance test: all 7 endings
    reachable on all 3 timelines), `tools/sim/golden.js` -> `Assets/PlutonyX/Tests/EditMode/golden_runs.json`.
- `/shared` still absent on `origin/main` at 16:05.

## In progress
1. **Unity editor download** - background `curl` writing `<scratchpad>/dl/unity-editor/Unity-6000.0.85f2.pkg`
   (complete at 4,980,000,000 bytes). Scratchpad = newest `/private/tmp/claude-501/-Users-maclap-uz-Documents-Nasa-Space-Apps/*/scratchpad`.
   If curl died, resume in that folder:
   `curl -L -C - -o Unity-6000.0.85f2.pkg https://download.unity3d.com/download_unity/b028303d8e7d/MacEditorInstallerArm64/Unity-6000.0.85f2.pkg`
2. Nothing else is half-done.

## Next 3 steps
1. Install the editor when the .pkg is complete: either `pkgutil --expand-full` and move `Unity.app` to
   `/Applications/Unity/Hub/Editor/6000.0.85f2/`, or try `~/.unity/bin/unity install 6000.0.85f2 -m windows-mono --resume`
   (read `unity install --help` first; the Windows module is 313 MB, 3.5 MB already in `<scratchpad>/dl/unity-win/`).
2. Create the HDRP project in `desktop/` (`unity projects --help` / `unity templates --help`), then port
   `tools/sim/sim.js` line by line to plain C# in `Assets/PlutonyX/Scripts/Core/` and add an EditMode test that replays
   `golden_runs.json` and matches every `after` snapshot to 3 decimals. Run with `unity test`.
3. `TerrainImporter` editor script: read `TerrainData/jezero_meta.json` + RAW16 (row 0 = south) into a Unity Terrain,
   4 layers from `jezero_splat_2048.png`, landing site at world origin; then sky/sun/exposure and a first screenshot.
   `git fetch` first: if `/shared` has arrived, reconcile `design-draft/` with it (shared wins).

## Known bugs / gotchas
- **Slow, uneven internet** (0.1–0.5 MB/s total). Never run two big downloads at once; the editor comes first.
- DONKI moved hosts: `kauai.ccmc.gsfc.nasa.gov` is dead. Use `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/<TYPE>?startDate=&endDate=`
  (no key). `api.nasa.gov/DONKI/FLR` returned 404 today; `DEMO_KEY` is limited to 10 requests/hour here.
- RadLab `MSL-RAD-Surface` has no rows before ~2016 or after 2024; `dose_equivalent_rate` and `flux` are null for it.
- RadLab's readings for 20 May 2024 integrate to ~1,600 µGy above background, while JPL's article says an astronaut
  would have received 8,100 µGy. We use RadLab for the **shape and timing** and quote JPL for the headline. Don't mix them.
- This Mac cannot run or test the Windows build. A teammate with a PC must test it.
- An install script piped from the web (`dotnet-install.sh`) was blocked by the permission system; don't retry it.
  The simulation gets compiled and tested inside Unity instead.
- The project path contains a space (`Nasa Space Apps`): always quote paths.

## Waiting on team
- **Builder:** Unity sign-in is DONE. Keep the Hub's own editor install cancelled.
- **Builder:** run `~/.local/bin/gh auth login` (GitHub.com → HTTPS → browser) and accept the repo invite, so pushes work.
- **Builder:** faster internet if at all possible (phone hotspot, cable).
- **Web lead:** `shared/GAME_BIBLE.md`, `shared/style-guide.md`, `shared/design/*.json`.
- **Team:** final game title (placeholder lives in one config value).
- **Team:** a Windows PC to test the cross-built Windows player.

## Do NOT redo
- Data fetch + snapshot scripts and the three archived timelines (verified against the raw records).
- The Unity version decision (6000.0.85f2) and the direct-download install method.
