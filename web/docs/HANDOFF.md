# HANDOFF — where we left off (rewrite this file, do not append)

**Last updated:** Sat 14 Nov 2026, ~18:05 Tashkent · **Phase 1 (shared foundation) — nearly done**

## State right now

- **Works:** `/shared` design foundation is written and committed: Game Bible, style guide, all design JSON (parse-checked), the space-weather archive script, and five archived real NASA windows.
- **Deployed:** nothing yet. No web app exists yet (`web/` has only docs).
- **Broken / missing:** `shared/design/sources.json`, `facts.json`, `shared/science-log.md`, `shared/references.md`, `shared/art/PROMPTS.md` are not written yet. Several source ids used in `events.json`/`endings.json` still need their URL verified (list below).

## In progress

Finishing Phase 1: verify remaining facts → write `sources.json` → generate `references.md` → `science-log.md` → `art/PROMPTS.md`.

## Next 3 steps

1. **Verify + write `shared/design/sources.json`.** Ids already used: `donki, radlab-msl, jpl-may2024-storm, jpl-sep2017-storm, nasa-cheyava, nasa-jezero, nasa-mars-facts, nasa-moxie, nasa-water-98, nasa-o2-084, nasa-veggie, osdr-268, osdr-766, jpl-dust-2018, nasa-oppy-end, nasa-sunset, nasa-comm-delay, nasa-comm-crewed, nasa-launch-window, nasa-insight-dust, nasa-mars-relay, nasa-hrp-sleep, nasa-phobos-eclipse, nasa-flight-rules, nasa-sol, jpl-approx-pos, csa-food`. Unverified so far: the last 9 NASA ids from `nasa-comm-crewed` on, `csa-food` (page fetch kept resetting), and the claim that the 20 May 2024 eruption came from the same sunspot group as the 10–11 May Earth auroras (used in `endings.json` → `secret`, `dialogue.json` → decoded message). If a claim cannot be verified, soften the sentence.
2. **Scaffold `web/`** (Vite + TS + Three.js + Vitest), port the rules in `shared/GAME_BIBLE.md` §15 + `shared/design/SCHEMA.md` into `web/src/sim/` with tests, and a bot that plays many seeded runs to prove every ending is reachable.
3. **Terrain:** write `shared/scripts/fetch-terrain.mjs` (Node + `geotiff`) to crop `.cache/terrain/JEZ_ctx_B_soc_008_DTM_…20m….tif` (9.6 MB, complete) and `…orthoMosaic_6m….tif` (36.3 MB; was re-downloading — check size is 36,269,402 bytes) into a heightmap + albedo + normal map, then build the Three.js scene.

## Known bugs / gotchas

- `api.nasa.gov/DONKI/*` returns 404 (14 Nov 2026). Use `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<TYPE>?startDate=&endDate=` (no key, CORS `*`, **max 60 days per request**).
- RadLab `MSL-RAD-Surface` has data only 2015-01-01 → 2024-06-03 and no `dose_equivalent_rate`.
- RadLab's absorbed-dose series integrates to ~1,500–1,700 µGy for 20–21 May 2024; NASA/JPL's news figure is 8,100 µGy. We show both, use RadLab for mechanics, and say so in the Science Log.
- USGS terrain downloads are slow (~25 kB/s). Raw files live in `.cache/` (git-ignored).
- C: drive has ~2 GB free. Work on D:. Use `npm_config_cache=D:/npm-cache`.
- `gh` CLI is not installed. Git Credential Manager is. First push needs a browser sign-in by the repo owner.
- Web tools hit a usage limit once this session; keep fetches batched.

## Waiting on team

- GitHub sign-in on first `git push` (owner account **Darkcursader**).
- Final game title (placeholder "PROJECT JEZERO" in `shared/design/game.json`).
- Desktop release URL (goes in `game.json` → `links.desktopDownload`) by Sun 17:00.
- SI portraits/postcards once `shared/art/PROMPTS.md` exists.
- Optional: a free api.nasa.gov key (fallback only).

## Do NOT redo

- Game Bible, style guide, the design JSON structure and the event/ending text (edit, don't rewrite).
- The space-weather archive pipeline and its calibration (see DECISIONS #5–#8).
- The Earth–Mars delay maths (validated against JPL Horizons).

## Self-grade (end of Phase 1; no game yet)

Impact 2 · Creativity 3 · Validity 2 · Relevance 3 · Presentation 1 — everything depends on shipping the playable slice next.
