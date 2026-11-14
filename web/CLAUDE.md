# PlutonyX — Web edition (NASA Space Apps 2026)

Browser game for the challenge **"Build a Junior Astronaut Mission Trainer"**: kids 7–12 command a four-person outpost in Jezero Crater, Mars, for 10 sols, splitting power between air, greenhouse, storm shield and rover. Space weather is real (NASA DONKI), radiation is what Curiosity measured on Mars (NASA RadLab), terrain is real (MRO CTX). A teammate builds the same game in Unity (`/desktop`).

**DEADLINE: click "Submit for Judging" before Sun Nov 15, 2026, 11:59 PM Tashkent (UTC+5). Internal target 8:00 PM. Feature freeze 6:00 PM.**

## Start here

Read `web/docs/HANDOFF.md` first, then only the files it points to. **Do not scan the whole repo.**
Then `web/docs/PROGRESS.md` (what is left) and the latest lines of `shared/CHANGELOG.md`.
The full brief is `web/docs/BRIEF.md` (do not edit except the Decisions appendix). Design truth is `shared/GAME_BIBLE.md` + `shared/design/*.json`.

## Stack and commands (run inside `web/`)

- Vite + TypeScript + Three.js (WebGLRenderer, pmndrs `postprocessing`), Vitest. Static site, no backend.
- `npm install` · `npm run dev` · `npm test` · `npm run build` (output `web/dist`)
- C: drive is nearly full on the owner's laptop: keep the npm cache on D: (`npm_config_cache=D:/npm-cache`).
- Deploy: push to `main` → GitHub Actions builds `web/` and publishes to GitHub Pages.
- Live URL: https://darkcursader.github.io/plutonyx/ · Repo: https://github.com/Darkcursader/plutonyx

## Folder map

| Path | What it is |
|---|---|
| `web/src/sim/` | Pure simulation (no rendering). Reads `shared/design/*.json`. Unit-tested. |
| `web/src/data/` | Live DONKI fetch + archived fallback, mission window builder |
| `web/src/world/` | Three.js scene: terrain, sky, outpost, effects, cameras |
| `web/src/ui/` | HTML/CSS HUD, menus, power board, event cards, debrief |
| `web/src/audio/` | Web Audio synth ambience, music, UI sounds |
| `web/public/` | Static assets (terrain textures, models, icons, manifest) |
| `web/docs/` | BRIEF, HANDOFF, PROGRESS, DECISIONS |
| `shared/` | Single source of truth for both editions (bible, style guide, design JSON, real data, scripts) |
| `shared/scripts/` | `fetch-spaceweather.mjs` (DONKI + RadLab archive), `fetch-terrain.mjs` |
| `docs/` | Submission texts, demo script, checklist |
| `desktop/` | Unity edition. **Never edit.** |

## Non-negotiable rules

- **Real data only, attributed in-game.** Every number traces to `shared/design/sources.json`. Label simplifications. Never show archived data as live.
- **SI disclosure:** SI images/video carry a visible "SI-generated" mark; source files keep the SI header comment.
- **No NASA logos, insignia, flags or mission patches** anywhere (models, art, UI).
- **No likeness or voice of anyone under 18.** Crew are adults; narration is synthetic.
- **Quality gate:** sharp at native resolution, cinematic, nothing that looks cheap. Check screenshots before deploy.
- **English only.** Never claim life was found on Mars.
- Balance and ending conditions change only with a `shared/CHANGELOG.md` line.
- Git: `git pull --rebase` before work, commit after every working step, push. `main` must always run. Rewrite `HANDOFF.md` before every commit.
