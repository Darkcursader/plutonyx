# PROGRESS — every feature and deliverable from the brief

`[x]` done · `[~]` partly · `[ ]` not started

## Phase 1 — foundation
- [x] Repo cloned, folder layout, `.gitignore`, brief saved to `web/docs/BRIEF.md`
- [x] `shared/GAME_BIBLE.md` (concept, crew, resources, trade-off matrix, beat sheet, endings)
- [x] `shared/style-guide.md`
- [x] `shared/design/` game, balance, crew, events, endings, dialogue, achievements, glossary, windows + SCHEMA.md
- [x] Space-weather archive script + 5 real windows (`shared/data/spaceweather/`)
- [ ] `shared/design/sources.json` + `facts.json`
- [ ] `shared/references.md`, `shared/science-log.md`
- [ ] `shared/art/PROMPTS.md`, `shared/art/SI_LOG.md`
- [x] `web/CLAUDE.md`, HANDOFF, PROGRESS, DECISIONS
- [ ] First push to GitHub (needs owner sign-in)

## Phase 2 — vertical slice
- [ ] Vite + TS + Three.js scaffold, Vitest
- [ ] Simulation module from shared JSON + unit tests
- [ ] Real Jezero terrain (DEM heightmap, albedo, normal, detail maps)
- [ ] Sky, sun, lighting, post-processing
- [ ] Outpost models (habitat, greenhouse, shelter, solar field, dish, air maker, rover, pad)
- [ ] Power board UI + event cards + night results
- [ ] One full mission on archived data, ≥ 2 endings, debrief
- [ ] Fullscreen immersive start, title screen
- [ ] GitHub Pages deploy (public link)

## Phase 3 — data and story depth
- [ ] Live DONKI + archived fallback with LIVE/ARCHIVED badges
- [ ] "It really happened" reveal
- [ ] Real-data chips and cards
- [ ] Storm scene with comms-delay clock and solar-system mini map
- [ ] All 7 endings + gallery
- [ ] Tutorial by doing, Cadet/Commander/Classroom
- [ ] Mission Planner view (real units, graphs)
- [ ] Science Log + Credits & Data screens
- [ ] Achievements, mission code, share card
- [ ] Balance bots: every ending reachable, no dominant strategy

## Phase 4 — polish
- [ ] Signature moments: title orbit, solar storm, dust storm, greenhouse growth, ending shots
- [ ] Cinematic camera paths, letterbox, skippable
- [ ] Audio: ambience, adaptive music, UI sounds, Geiger from real curve, optional read-aloud
- [ ] Quality presets (Ultra/High/Low), GPU auto-detect
- [ ] Photo mode
- [ ] Gamepad + keyboard + touch, input glyph switching
- [ ] Settings, pause menu, save/continue
- [ ] Accessibility: colour-blind mode, text size, reduced motion, captions
- [ ] PWA (manifest + service worker)
- [ ] NASA 3D models (insignia stripped), SI art slots with watermark component
- [ ] Cross-browser/device test, zero console errors

## Phase 5 — submission
- [ ] Root `README.md` (pitch, how to play, NASA data, simplifications, SI disclosure, credits)
- [ ] `docs/submission.md` (all fields)
- [ ] `docs/demo-script.md` (≤ 30 s video) + 7-slide fallback
- [ ] `docs/checklist.md`
- [ ] `docs/lesson-guide.md` (Classroom mode)
- [ ] Desktop download link wired in
- [ ] Playtest notes (2 adults, 2 kids) in HANDOFF
- [ ] FortiGuard classification request (team action)
- [ ] Submit for Judging by Sun 20:00 Tashkent
