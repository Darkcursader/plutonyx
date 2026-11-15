# PROGRESS — every feature and deliverable from the briefs

`[x]` done · `[~]` partly · `[ ]` not done (updated Sun 15 Nov, 18:25 Tashkent)

## Foundation (/shared)
- [x] Game Bible, style guide, design JSON (game, balance, crew, events, endings, dialogue, achievements, glossary, windows, sources) + SCHEMA.md
- [x] Space-weather archive script + 5 real windows; terrain metadata + 16-bit heightmap for Unity
- [x] science-log.md, references.md (generated), art/PROMPTS.md, art/SI_LOG.md, CHANGELOG.md
- [x] web/CLAUDE.md, HANDOFF, PROGRESS, DECISIONS, BRIEF

## Game
- [x] Pure simulation from shared JSON, unit tests, balance bots (all 7 endings reachable)
- [x] Real Jezero terrain (CTX elevation + image), true vertical scale
- [x] Mission loop: dawn report, power board, events, storm crisis with timers, night report
- [x] 7 endings + reveal ("It really happened") + debrief with science, stats, chart, timeline, badges
- [x] Live DONKI with archived fallback, LIVE/ARCHIVED badges, "Play today's real sky"
- [x] Replay history (Sept 2017, Oct 2021, Feb 2022, May 2024), mission codes
- [x] Real-data chips and cards, Science Log + references + glossary screen
- [x] Cadet / Commander / Classroom (discussion cards), Mission Planner view (real units)
- [x] Achievements, ending gallery
- [x] Tutorial by doing on Sol 1 (first play), PIP hints and "PIP's plan" on Cadet
- [x] Settings: quality, sound, read-aloud, text size, reduced motion, colour-blind patterns
- [x] Keyboard, touch, mouse; [~] gamepad (implemented, not tested on hardware)
- [x] Pause menu, photo mode with PNG export
- [x] Code-generated audio: wind, hum, Geiger from real dose rate, adaptive music, UI sounds
- [x] PWA: manifest + service worker (offline after first visit)
- [ ] Save/continue mid-mission
- [ ] Share card image (mission code can be copied)

## Look (ultra-realism pass)
- [x] Hero zone: Poly Haven PBR ground blended at two scales, scanned rock clusters
- [x] NASA Perseverance model, insignia stripped
- [x] Sky-based image lighting, N8AO, tight soft shadows, low sun, haze
- [x] Rover tracks + footprints, dust accumulation tied to gameplay, dust-storm wall, launch dust at Mars gravity
- [x] Night sky: stars, Earth as an evening star, aurora in solar storms, shield dome
- [x] Film-poster title framing; panel-aware camera framing
- [x] Habitat and ascent vehicle rebuilt in Blender (bevels, panels, rivets, hatches, struts, markings, baked AO/wear) → shared/models
- [~] Greenhouse, shelter, solar panels, dish, Air Maker, crew rover, pad, room interiors: still simple procedural shapes
- [ ] WebGPURenderer (WebGL 2 only) · [ ] KTX2 textures (WebP used) · [ ] LODs · [ ] Phobos/Deimos
- [ ] Pre-rendered backgrounds for Low preset (Low just reduces effects)
- [ ] Per-ending LUTs (per-ending grade via saturation/contrast instead)

## First person (beta, Settings → Play style or ?fp=1)
- [x] Astronaut controller: WASD + mouse look, Mars gravity jump, visor, suit oxygen, footprints, gamepad mapping
- [x] Walk-in command deck, storm shelter, greenhouse (doors are fade-teleports); live wall screens
- [x] Hand-held 3D tablet carrying all mission panels + 7 status tabs; objective beacons and guidance arrow
- [x] Physical jobs (hold E): brush panels, swap filter, throw breaker, load drone, aim dish, run to shelter
- [x] Scripted full mission passes; light Low preset default on integrated GPUs
- [ ] Mouse look verified by a human · [ ] collision with small objects and interior furniture · [ ] rover driving · [ ] walk-through airlock

## Cinematics and dialogue
- [x] Real-time cinematics: letterbox, captions, skippable; intro, reveal, endings with launch
- [x] Frame-perfect capture pipeline (Playwright) for demo footage
- [x] Dialogue: speaker plate, role, radio cue, choices by keyboard/gamepad/touch, timer only in the storm
- [ ] In-game video cutscenes with WebVTT · [ ] voices · [ ] SI portraits and postcards (prompts ready)

## Submission
- [x] README, LICENSE, docs/submission.md, docs/demo-script.md, docs/checklist.md, docs/lesson-guide.md
- [x] Demo video `docs/demo/plutonyx-demo-30s.mp4` (29.8 s, 24.8 MB, real game footage)
- [x] Deploy workflow → `gh-pages` branch · [ ] **GitHub Pages switched on by the owner**
- [ ] Demo uploaded publicly · [ ] team names in README · [ ] Desktop link · [ ] Submit for Judging
- [ ] Device tests (Chromebook, tablet, phone, Firefox, Safari) · [ ] playtest with 2 adults + 2 kids
