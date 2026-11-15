# HANDOFF — where we left off

**Last updated:** Sun 15 Nov 2026, 11:45 Tashkent · **Phase 5** (release prep). Builder's deadline for this edition: **22:00**; submission 23:59.

## State right now
- **Playable, built, packaged.** `Build/mac/PlutonyX.app`, `Build/win/PlutonyX/PlutonyX.exe`; ZIPs + `SHA256SUMS.txt` in `Build/release/`
  (`tools/package.sh v1.0`). macOS build passes a full autoplay mission with no runtime errors.
  **The Windows build has never been run on a PC.**
- Merged the Web lead's work (web edition + updated `/shared`) on Sun 11:25. Simulation aligned with `web/src/sim/engine.ts`:
  message fragments with every Earth reply, `cooldownSols`, cold-night rule, ending-value definitions. Harness: all 7 endings
  reachable on the story and live windows.
- Features in: title menu, story mission, Today's real sky (LIVE DONKI fetch, fallback ARCHIVED), Replay history, **Explore the outpost**
  (third-person walk, Mars-gravity jump, info points), Cadet/Commander, power board, events, storm scene with timer, night report with
  real units, reveal, endings with **rocket launch**, debrief with badges, ending gallery, pause/settings (text size, graphics preset,
  window/fullscreen, volume, less motion), synthesised audio, keyboard/gamepad/mouse.
- Captures on the builder's Mac: `desktop/Captures/stills/*.png` (3840×2160), `desktop/Captures/video/*.mp4` (1080p clips +
  `PlutonyX_desktop_montage.mp4`, 29 s). **These are not in git** — the builder must send them to the Web lead.
- **Nothing is pushed.** Local `main` = web lead's commits + 11 desktop commits + 1 merge. `gh` is installed but not logged in.

## How to run things (from `desktop/`)
```
tools/unity.sh -executeMethod PlutonyX.EditorTools.WorldBuilder.BuildWorld     # regenerate scene + generated assets (needed after clone)
tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildMac | BuildWin
Build/mac/PlutonyX.app/Contents/MacOS/PlutonyX -autoplay Captures/auto -difficulty commander -screen-width 1600 -screen-height 900 -screen-fullscreen 0
Build/mac/PlutonyX.app/Contents/MacOS/PlutonyX -stills Captures/stills      # 4K stills, no UI   (add  -take <part of name>  for one take)
Build/mac/PlutonyX.app/Contents/MacOS/PlutonyX -record Captures/video       # frame sequences; then tools/encode_clips.sh Captures/video
tools/harness/run.sh 1000        # simulation balance test without Unity
tools/package.sh v1.0
```

## Next 3 steps
1. **Release** (blocked on login): `~/.local/bin/gh auth login`, then `git push origin main` and
   `gh release create v1.0-desktop Build/release/*.zip Build/release/SHA256SUMS.txt --title "Desktop Ultra edition v1.0" --notes-file desktop/README.md`.
   Then tell the Web lead the URL for `shared/design/game.json → links.desktopDownload`.
2. Get the Windows ZIP run once on a real PC; fix whatever it shows.
3. Have two or three kids/adults play; note where they stall (nobody but the autoplay bot has played it).

## Known gaps (be blunt)
- Outpost is original low-poly geometry made from primitives; no NASA 3D models (converting the web edition's GLBs needed an npm
  install that the permission system blocked). No VFX Graph, Cinemachine or Timeline (custom camera and particle systems).
- No save/continue, photo mode, key rebinding, read-aloud, classroom mode UI, SI portraits/postcards.
- Live missions: flares/CMEs are live; forecasts (`marsForecasts`) are not fetched live; radiation is an estimate (labelled).
- Quality presets exist but were never tested on weak hardware. Explore mode has simple circle collisions only.
- Cross-edition numbers are aligned by reading the reference engine, not by shared test vectors.

## Known bugs / gotchas
- `git pull --rebase` fails here because generated, git-ignored files sit in `desktop/`: use `git merge origin/main` instead.
- `VolumeProfile.Add<T>()` in editor code must be followed by `AssetDatabase.AddObjectToAsset`.
- HDRP/Unlit ignores particle vertex colour: tint lives in the material; fade with size-over-lifetime.
- Emissive materials use exposure weight 0 so they read the same at noon and at night; point lights are tuned for night exposure.
- Only one Unity batch process at a time. The project path has a space: quote it.
- DONKI host: `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/<TYPE>` (no key).

## Waiting on team
- **Builder:** GitHub login; send captures to the Web lead; Windows PC test.
- **Web lead:** put the release URL in `game.json`; final title.

## Do NOT redo
- Terrain pipeline, sky tuning (`tools/sky.json`), Core simulation, build/capture tooling.

## Self-grade, desktop part (1–5)
Impact 3 · Creativity 4 · Validity 3 (no human playtest, Windows untested) · Relevance 4 · Presentation 3 (real terrain and launch help; simple models hurt)
