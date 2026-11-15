# PROGRESS — every feature and deliverable from the briefs

`[x]` done · `[~]` partly · `[ ]` not done (updated Sun 15 Nov, ~09:15 Tashkent)

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
- [~] Habitat/greenhouse/dish/crew rover: procedural with normal maps and dust (no Blender bakes)
- [ ] WebGPURenderer (WebGL 2 only) · [ ] KTX2 textures (WebP used) · [ ] LODs · [ ] Phobos/Deimos
- [ ] Pre-rendered backgrounds for Low preset (Low just reduces effects)
- [ ] Per-ending LUTs (per-ending grade via saturation/contrast instead)

## Cinematics and dialogue
- [x] Real-time cinematics: letterbox, captions, skippable; intro, reveal, endings with launch
- [x] Frame-perfect capture pipeline (Playwright) for demo footage
- [x] Dialogue: speaker plate, role, radio cue, choices by keyboard/gamepad/touch, timer only in the storm
- [ ] In-game video cutscenes with WebVTT · [ ] voices · [ ] SI portraits and postcards (prompts ready)

## Submission
- [x] README, LICENSE, docs/submission.md, docs/demo-script.md, docs/checklist.md, docs/lesson-guide.md
- [~] Demo video `docs/demo/plutonyx-demo-30s.mp4` (pipeline works; re-recording footage)
- [x] Deploy workflow → `gh-pages` branch · [ ] **GitHub Pages switched on by the owner**
- [ ] Demo uploaded publicly · [ ] team names in README · [ ] Desktop link · [ ] Submit for Judging
- [ ] Device tests (Chromebook, tablet, phone, Firefox, Safari) · [ ] playtest with 2 adults + 2 kids
