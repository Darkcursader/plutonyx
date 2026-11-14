# HANDOFF — where we left off

**Last updated:** Sat 14 Nov 2026, 16:15 Tashkent · **Phase 0** (setup) running alongside Phase 1 data prep

## State right now
- **No Unity yet.** The editor installer is downloading on a ~3 Mbit/s line. Nothing in-engine exists.
- Working and verified:
  - `tools/data/*.py` fetch real NASA data and build the archived timelines in
    `Assets/StreamingAssets/data/` (`timeline-may-2024.json`, `timeline-sep-2017.json`,
    `timeline-recent.json`, `SOURCES.md`).
  - Real Jezero elevation (CTX 20 m) is in `source/terrain/`; `tools/terrain/process_terrain.py`
    is written but has not run end to end yet (waiting for the orthoimage download).
- Nothing is pushed. Commits are local on `main` under a placeholder identity.
- `/shared` does not exist on `origin/main` (only "Initial commit"). The Web lead has pushed nothing.

## In progress
1. **Unity editor download** — `curl` writing
   `<scratchpad>/dl/unity-editor/Unity-6000.0.85f2.pkg` (4,980,000,000 bytes when complete).
   The scratchpad is session-specific; if the session changed, look for the newest
   `/private/tmp/claude-501/*/*/scratchpad/dl/unity-editor/` or simply resume:
   `curl -L -C - -o Unity-6000.0.85f2.pkg https://download.unity3d.com/download_unity/b028303d8e7d/MacEditorInstallerArm64/Unity-6000.0.85f2.pkg`
2. **Orthoimage download** — `source/terrain/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif`
   (36,269,402 bytes when complete; resume with `curl -C -`, URL in `source/README.md`).

## Next 3 steps
1. When the orthoimage is complete: `tools/.venv/bin/python tools/terrain/process_terrain.py source/terrain TerrainData`,
   open `TerrainData/jezero_map_2048.png` to sanity-check, commit `TerrainData/`.
2. When the editor `.pkg` is complete: `pkgutil --expand-full <pkg> <tmp>`; move the `Unity.app` payload to
   `/Applications/Unity/Hub/Editor/6000.0.85f2/Unity.app`; resume the Windows module
   (`UnitySetup-Windows-Mono-Support-for-Editor-6000.0.85f2.pkg`, same CDN folder `MacEditorTargetInstaller/`)
   and expand its payload into `Unity.app/Contents/PlaybackEngines/WindowsStandaloneSupport`.
   Then create the HDRP project in `desktop/` (extract the HDRP template tgz from
   `Unity.app/Contents/Resources/PackageManager/ProjectTemplates/`) and open it once in batch mode.
3. `git fetch`; if `/shared` has arrived, read `shared/GAME_BIBLE.md` + `shared/design/*.json` and build the
   simulation against them. If not, use the draft in `desktop/design-draft/`.

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
- **Builder:** sign in to Unity Hub (free Personal licence). Skip any "install editor" prompt in the Hub.
- **Builder:** run `~/.local/bin/gh auth login` (GitHub.com → HTTPS → browser) and accept the repo invite, so pushes work.
- **Builder:** faster internet if at all possible (phone hotspot, cable).
- **Web lead:** `shared/GAME_BIBLE.md`, `shared/style-guide.md`, `shared/design/*.json`.
- **Team:** final game title (placeholder lives in one config value).
- **Team:** a Windows PC to test the cross-built Windows player.

## Do NOT redo
- Data fetch + snapshot scripts and the three archived timelines (verified against the raw records).
- The Unity version decision (6000.0.85f2) and the direct-download install method.
