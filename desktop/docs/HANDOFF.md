# HANDOFF — where we left off

**Last updated:** Sun 15 Nov 2026, 21:30 Tashkent · **Phase 5** (release). Builder's deadline for this edition: **22:00**; submission 23:59.

## UPDATE — Mon 16 Nov 2026 (Windows PC, Unity 6000.6.9f1 at D:\Unity)
- Release v1.0-desktop now ships **PlutonyX-Setup-v1.0.exe** (Inno Setup, `tools/installer.iss`, per-user install, no admin),
  **PlutonyX-Mac-v1.0.zip** (.app, exec bits set) and a new `SHA256SUMS.txt`. The old ZIPs are gone.
- **Drivable rover** in Explore (`Scripts/Game/RoverDriver.cs`): R / gamepad X gets in and out; W S drive, A D steer, Shift boost,
  Space brake, C cockpit or chase camera. Suspension follows the terrain, Mars gravity, battery, dust, engine sound, sample run to
  the river delta. Self-test: `PlutonyX.exe -drivetest <dir>` (drives for 25 s, logs and takes screenshots). Passed on Windows.
- More realistic rocks: scanned rocks get a random tilt, are buried partly in the ground, and come in two material shades.
- **Crew voices** (`Scripts/Game/VoiceBank.cs` + `shared/scripts/make-voices.mjs`): ElevenLabs SI voices as local files in
  `StreamingAssets/voices`. **Not recorded yet**: put `ELEVENLABS_API_KEY=...` in the repo `.env` (gitignored), run
  `node shared/scripts/make-voices.mjs --dry`, then without `--dry`, then rebuild. Lines without a recording use Read aloud.
- Windows autoplay: 68 screens, 0 exceptions. **The Mac build was cross-built and never run.**

## RELEASED — Sun 15 Nov 21:28
**https://github.com/Darkcursader/plutonyx/releases/tag/v1.0-desktop** (tag on `main` 31d6e7c). Both ZIPs and `SHA256SUMS.txt`
download without signing in (HTTP 200, sizes match the local files). Give this URL to the Web lead for `game.json → links.desktopDownload`.
GitHub login on this Mac is now a browser (OAuth) token with `repo` scope, so pushing works.
Note: at 20:49 someone switched this checkout to branch `feat/cinematic-site` (untracked `site/` folder). Desktop work was pushed to
`main` from it as a fast-forward; that branch and `site/` were left alone.

## State right now
- **Playable, built, tested, packaged with the new realistic look.** `Build/mac/PlutonyX.app`, `Build/win/PlutonyX/PlutonyX.exe`;
  ZIPs + `SHA256SUMS.txt` in `Build/release/` (built 19:43 by `tools/package.sh v1.0`):
  - `PlutonyX-DesktopUltra-Windows-x64-v1.0.zip` 193 MB · sha256 `db66af42d414b3447cf41f96e37ecf30392e6d8cc70e94b22cc6215e9d2d7ab3`
  - `PlutonyX-DesktopUltra-macOS-v1.0.zip` 189 MB · sha256 `6bd9302cb2d3642146f21836ef3beca3bb556c446a16b1e690c1e2e53615b599`
- macOS build passed a full autoplay mission (68 screens, re-run at 19:20 on the final build), the stills run and the recording run with **0 exceptions** in the player logs.
  **The Windows build has never been run on a PC.**
- Realism pass (Sun afternoon): every outpost model rebuilt in code with `Editor/MeshKit.cs` — habitat modules with flanges, portholes,
  airlock and porch; greenhouse; air maker; solar field; storm shelter; dish; six-wheeled rover; launch pad with service tower;
  ascent ship (engines, legs, bands, portholes); jointed astronauts (`Scripts/Game/AstronautRig.cs`). Poly Haven scanned rocks.
  AO, contact shadows, grain, vignette. Launch has a flame core, pad dust, camera shake and a pitch-over. Windows/lamps/greenhouse
  glow at night and in dust; shield emitters glow in the storm. Terrain heights get a light blur (removes 1 m terraces).
- Added Sun 19:15: debrief **resource chart** (air, power, food, health, dose; storm sols marked) with computed **turning points**;
  **mission card** (ending, code, numbers; "Save picture" writes a PNG to Pictures/PlutonyX); **Enter a mission code** under Replay
  history (same window + seed = same mission). The chart and card are verified in autoplay screenshots; **"Save picture" and code
  entry were never exercised** (autoplay skips them).
- Added Sun 19:40: optional **Read aloud** (Esc menu, off by default) — `Scripts/Game/Narrator.cs`. Uses the computer's own voice:
  macOS `say`, Windows System.Speech through one hidden PowerShell process. Reads dialogue (with the speaker's name), info cards,
  choices, the focused menu item, the power board, Explore info points and the mission card. Tested on macOS: a full autoplay with
  `-narratortest` (silent, logs each line) read 140 lines with 0 exceptions; a run with it off read none. **The Windows voice was
  never tried** (needs a Windows PC); if PowerShell or System.Speech is missing it fails quietly and the menu says "Not available".
- **Fixed Sun 20:00: keyboard and gamepad did nothing in the built game.** `ProjectSettings.asset` had `activeInputHandler: 0`
  (old Input Manager only) while all game code reads the Input System package, so `Keyboard.current` was null; only mouse clicks on
  buttons worked. Now `2` (Both); `ProjectSetup.Configure` enforces it. The player logs `input devices: keyboard True, mouse True` at
  start. Real key presses could not be sent from this session (macOS blocks synthetic keystrokes), so **a human must press keys once**.
- Sun 20:45: builder reported keys still partly broken (menus work; Explore WASD/Space suspected). All key reads now go through
  `Scripts/Game/Keys.cs`, which accepts a key if EITHER the Input System or the classic Input Manager sees it. `-keylog` writes every
  key press (both systems, window focus) and Explore positions to the log; `tools/keytest.command` (double-click) starts the Mac
  build with it, log in `Logs/player-keys.log`. **Not yet confirmed by a human key test.**
- Sun 21:00: merged the Web lead's agency-neutral `/shared` text; rebuilt; autoplay 68 screens, 0 exceptions; harness OK.
  Desktop-only C# strings (credits, badges, captions, Explore facts) still name NASA where they credit real data.
- Builder decided Sun 20:00: keep "NASA" wherever it names real data, missions or the event (no rename to "HASA").
- Simulation unchanged since the morning: title menu, story mission, Today's real sky (LIVE DONKI, fallback ARCHIVED),
  Replay history, Explore, Cadet/Commander, power board, events, storm scene, night report, reveal, 7 endings with launch, debrief,
  badges, gallery, pause/settings, synthesised audio, keyboard/gamepad/mouse.
- Captures (not in git, on the builder's Mac): `Captures/stills/*.png` (14 × 3840×2160), `Captures/video/*.mp4` (14 clips, 1080p) +
  `PlutonyX_desktop_montage.mp4` (29 s). **The builder must send them to the Web lead.**
- Release notes text: `docs/RELEASE_NOTES.md`.

## How to run things (from `desktop/`) — use ABSOLUTE paths for the player's folders and log file
```
python3 tools/fetch_textures.py && python3 tools/fetch_models.py               # once after a clone (CC0 textures and rocks)
tools/unity.sh -executeMethod PlutonyX.EditorTools.WorldBuilder.BuildWorld     # regenerate scene + generated assets
tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildMac | BuildWin
P=Build/mac/PlutonyX.app/Contents/MacOS/PlutonyX; D="$PWD"
$P -autoplay "$D/Captures/auto" -difficulty commander -screen-width 1600 -screen-height 900 -screen-fullscreen 0 -logFile "$D/Logs/player-auto.log"
$P -stills "$D/Captures/stills" -logFile "$D/Logs/player-stills.log"          # 4K stills, no UI  (add  -take <part of name>)
$P -record "$D/Captures/video"  -logFile "$D/Logs/player-record.log"          # then FFMPEG=... tools/encode_clips.sh Captures/video
tools/harness/run.sh 1000        # simulation balance test without Unity
tools/package.sh v1.0
tools/out/final.sh               # the whole chain above in one go (local file, not in git)
```
`tools/unity.sh -executeMethod PlutonyX.EditorTools.WorldBuilder.BuildAndTune` rebuilds and renders the shots listed in `tools/sky.json`
into `Captures/c_*.png` (fast look-check without a player build; emissive windows look brighter there than in the game).

## Next 3 steps
1. Key test on the Mac (`tools/keytest.command`), then read `Logs/player-keys.log`; fix and re-upload the ZIPs if needed
   (`gh release upload v1.0-desktop Build/release/*.zip Build/release/SHA256SUMS.txt --clobber -R Darkcursader/plutonyx`).
2. Get the Windows ZIP run once on a real PC; fix whatever it shows.
3. Have two or three kids/adults play; note where they stall (nobody but the autoplay bot has played it).

## Known gaps (be blunt)
- Ground-track decals (`BuildGroundMarks`) are built but **do not show** in the game; cause not found. Harmless.
- The Web lead's `shared/models/habitat.glb` / `ascent.glb` are not used (no glTF importer in the project); the desktop models are
  similar in design but not the same meshes. Astronauts are stylised (simple jointed figures).
- Scanned boulders are heavy (65–98 k triangles each, 26 of them) and the build grew to ~190 MB zipped; never tested on weak hardware.
- No save/continue, photo mode, key rebinding, classroom mode UI, SI portraits/postcards.
- Live missions: flares/CMEs are live; forecasts are not fetched live; radiation is an estimate (labelled).
- Some history replays cannot reach the `full`/`secret` endings on some difficulties (harness result).
- Cross-edition numbers are aligned by reading the reference engine, not by shared test vectors.

## Known bugs / gotchas
- The player ignores **relative** paths for `-stills/-record/-autoplay/-logFile` (exits at once): always pass absolute paths.
- `git pull --rebase` fails here because generated, git-ignored files sit in `desktop/`: use `git merge origin/main` instead.
- `VolumeProfile.Add<T>()` in editor code must be followed by `AssetDatabase.AddObjectToAsset`.
- HDRP/Unlit ignores particle vertex colour: tint lives in the material; fade with size-over-lifetime.
- Emissive materials use exposure weight 0; `WorldDirector` scales the window/lamp/shield materials at run time (shared materials).
- Do not edit scripts while a Unity batch run is in progress. Only one Unity batch process at a time. The project path has a space.
- DONKI host: `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/<TYPE>` (no key).

## Waiting on team
- **Builder:** key test; send captures to the Web lead; Windows PC test.
- **Web lead:** put the release URL in `game.json`; merge `desktop/docs/references-desktop.md` rows into `shared/references.md`.

## Do NOT redo
- Terrain pipeline, sky tuning (`tools/sky.json`), Core simulation, build/capture tooling, the model toolkit.

## Self-grade, desktop part (1–5)
Impact 3 · Creativity 4 · Validity 3 (no human playtest, Windows untested) · Relevance 4 · Presentation 4 (real terrain, detailed outpost, launch)
