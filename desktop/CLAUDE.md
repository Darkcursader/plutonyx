# PlutonyX — Desktop Ultra edition (Unity)

Team PlutonyX's entry for the 2026 NASA Space Apps Challenge, "Build a Junior Astronaut Mission
Trainer": kids 7–12 keep a crew alive at a Mars outpost in Jezero Crater, on real NASA terrain and
real NASA space-weather data. This folder is the **installable Unity edition**; `/web` is the
browser edition judges open first. Same game, same `/shared` design files.

**Deadline: "Submit for Judging" before Sun Nov 15, 2026, 11:59 PM Tashkent (internal target 8 PM).**
**Desktop build must be released by Sun 17:00 Tashkent; 4K captures to the Web lead by Sun 14:00.**

## Start here
Read `desktop/docs/HANDOFF.md` first, then only the files it points to. Do not scan the whole repo.
Then `docs/PROGRESS.md` (what is left) and the latest lines of `../shared/CHANGELOG.md`.
The full brief is `docs/BRIEF.md` (never edit it, except the Decisions appendix).

## Stack
- Unity **6000.0.85f2** (Unity 6 LTS) + **HDRP**, C#. Dev machine: Apple-silicon Mac (M5, 16 GB).
- Editor path: `/Applications/Unity/Hub/Editor/6000.0.85f2/Unity.app` (see HANDOFF if not there yet).
- No MCP is required: everything runs through batch-mode editor scripts.
- Repo: https://github.com/Darkcursader/plutonyx · Web edition URL: see `../docs` once published.

## Run / test / build (from `desktop/`)
```
tools/unity.sh -executeMethod PlutonyX.EditorTools.SceneBuilder.BuildAll   # rebuild scenes from code
tools/unity.sh -runTests -testPlatform EditMode                            # simulation unit tests
tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildMac  # -> Build/mac
tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildWin  # -> Build/win (cross-built)
```
`tools/unity.sh` wraps the batch-mode call and prints the log tail. Check HANDOFF for which of
these exist yet.

## Folder map
- `Assets/PlutonyX/Scripts/Core/` — simulation as plain C# (no UnityEngine): resources, events,
  endings, comms delay, seeded RNG. Driven by `StreamingAssets/design/*.json`.
- `Assets/PlutonyX/Scripts/Data/` — NASA data: DONKI live fetch, archived fallback, attribution cards.
- `Assets/PlutonyX/Scripts/Game/` — MonoBehaviours: mission flow, HUD, cameras, audio, settings.
- `Assets/PlutonyX/Editor/` — scene builder, terrain import, shared-file sync, build pipeline.
- `Assets/PlutonyX/Tests/` — EditMode tests for Core (resource math, endings, balance).
- `Assets/StreamingAssets/{design,data}/` — copied from `/shared` by the sync script. Never edit here.
- `tools/` — Python/shell: terrain processing, data fetch, `unity.sh`.
- `source/` — raw DEMs / .blend files. Git-ignored; `source/README.md` says how to re-download.
- `docs/` — BRIEF, HANDOFF, PROGRESS, DECISIONS.
- `../shared/` — single source of truth for design + data (both editions). `../web` — never edit.

## Non-negotiable rules
- **Real data only, attributed in-game.** Every number traces to `shared/references.md`. Archived
  data is labelled ARCHIVED, never shown as live. Simplifications are labelled as such.
- **No NASA logos/insignia** anywhere (strip them from NASA 3D models). No real people, no minors'
  faces or voices, no existing franchises, no copyrighted music.
- **SI disclosure:** SI images/video carry a visible watermark; SI code/data/audio is acknowledged
  (C# header line, README, in-game credits, `shared/art/SI_LOG.md`).
- **Quality gate before every build:** 4K screenshots of title, gameplay, storm, ending — zoom in;
  fix anything blurry, aliased or low-res. Native resolution, no dynamic-res downscale.
- Kid-safe (7–12): tension and awe, no horror/gore/jump-scares. Never claim life was found.
- English only. Ages 7–12 reading level in game text.
- Balance and ending conditions live in `shared/design/balance.json` + `GAME_BIBLE.md`; never
  change them silently — small commit + a line in `shared/CHANGELOG.md`.
- Git: `git pull --rebase` before a work block; commit after every working step; rewrite
  `docs/HANDOFF.md` before every commit; `main` must always open and build.
- C# file header: `// Portions of this code were generated with the assistance of an SI tool
  (Claude) and reviewed by Team PlutonyX.`
