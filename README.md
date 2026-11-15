# PROJECT JEZERO — a Junior Astronaut Mission Trainer

**NASA Space Apps Challenge 2026 · Challenge: "Build a Junior Astronaut Mission Trainer" · Team PlutonyX (Universal Event)**

> Keep your crew alive on Mars, where every choice costs something precious and the real Sun decides how hard it gets.

**Play it in your browser (no download, no account):** https://darkcursader.github.io/plutonyx/

*"PROJECT JEZERO" is a working title. It lives in one config value (`shared/design/game.json`).*

| Edition | Where | Built with |
|---|---|---|
| **Web** — the judged, playable build | [`web/`](web/) · [live link](https://darkcursader.github.io/plutonyx/) | Three.js, TypeScript, Vite |
| **Desktop Ultra** — the same game at higher fidelity | [`desktop/`](desktop/) · download link added here on release | Unity |

Both editions read the same design files and the same real NASA data from [`shared/`](shared/).

---

## The problem

Kids hear that space is dangerous, but they almost never get to *feel* why: that power spent on one thing is power another thing never gets, that help from Earth arrives many minutes too late, that the Sun can change everything in under an hour. Those trade-offs are what real mission planning is made of.

## What we built

You command **Lakeshore Outpost**, four people on the floor of Jezero Crater, for the last **10 sols** before the ship home launches.

- Every dawn you share out a limited number of **power cells** between four machines: the **Air Maker**, the **Greenhouse**, the **Storm Shield** and the **Rover** that is drilling a rock core which might hold a clue about ancient life.
- Only three meters are ever on screen: **Air, Power, Shield**. Food, water and the radio delay arrive as events.
- **Every choice costs something.** There is no safe option, and consequences land sols later with a "because you…" line.
- The **space weather is real.** One sol is one real day of NASA's DONKI record, and the radiation dose is what NASA's Curiosity rover measured on Mars that day.
- On Sol 8 a storm arrives that no forecast listed. Earth cannot see that side of the Sun, a question and its answer need 32 minutes of travel, and the radiation peaks in 39. **You decide alone.**
- At the end the game tells you: **it really happened.** Sol 8 was 20 May 2024, the biggest radiation surge Curiosity has recorded on Mars.
- **Seven endings** (one secret), each with the real science behind it. Failure never kills anyone: it costs the garden, the sample, a message from home.

Modes: **Cadet** (ages 7–9), **Commander** (10–12 and adults), **Classroom** (pause-and-discuss cards, a shared mission code, [lesson guide](docs/lesson-guide.md)), **Today's real sky** (a mission built from the last 30 days of live NASA data), **Replay history** (other real storms), and a **Mission Planner view** with real units.

## How to play

1. Open the link and press **Start mission**. Pick Cadet or Commander.
2. Each sol: read the morning report → share out the power → answer the day's event → see what your choices did overnight.
3. Tap any **REAL DATA** chip to see the real numbers and their NASA source.
4. Survive 10 sols. Then read the debrief, and fly again: the Sun stays the same, dust and breakdowns change.

Controls: mouse or touch; keyboard (arrow keys, Enter, 1–9, Esc); gamepad (d-pad, A, B, Start). Settings include text size, read-aloud, reduced motion, colour-blind patterns and picture quality.

## NASA data used, and why

Full explanation with the calibration and every simplification: [`shared/science-log.md`](shared/science-log.md) (also in the game under **Science log**). Archived snapshots and request URLs: [`shared/data/SOURCES.md`](shared/data/SOURCES.md).

| NASA source | What we take | What it does in the game |
|---|---|---|
| **DONKI** (Goddard / CCMC) | Solar flares, CMEs, particle events, Earth's storm index, and WSA-ENLIL predicted CME arrivals **at Mars** | The space-weather timeline of every mission: morning reports, forecast cards, radio static, the reveal |
| **RadLab** (Open Science Data Repository), instrument `MSL-RAD-Surface` | Dose rate measured on the surface of Mars by Curiosity's Radiation Assessment Detector, 2015–2024 | The radiation dose of every sol and the storm's minute-by-minute curve |
| **JPL planetary orbit elements** | Positions of Earth and Mars | The real radio delay on the mission date (checked against JPL Horizons: within 0.01 minute) |
| **Mars Reconnaissance Orbiter CTX** elevation model and image mosaic (USGS for NASA Mars 2020), found through **Mars Trek** | 20 m elevation and 6 m imagery of Jezero Crater | The game world, at true vertical scale |
| **OSDR** plant studies OSD-268, OSD-269, OSD-766 | What grew on the Space Station and under which light | The greenhouse crops and grow lights |
| **NASA 3D Resources** | The Perseverance rover model (logos removed) | The "old explorer" parked beside the outpost |
| **Canadian Space Agency** (partner) | "Food production on the Moon and in remote areas" toolkit | Framing of the greenhouse and the lesson guide |
| **ESA** (partner) | Solar Orbiter report on sunspot region AR3664 | The "Same Sun" ending |

Two data modes, always labelled: **LIVE** ("Live NASA space weather · fetched 07:47") and **ARCHIVED** ("Real NASA data · archived"). If NASA cannot be reached the game says so and falls back to the archive. Archived data is never presented as live.

### Where we simplified (and say so in the game)

- Dose limits are scaled to a 10-sol mission; real limits are far higher. Radiation never makes a character sick: it fills a badge.
- The powered Storm Shield is future technology. The water wall and sheltering under a cliff are real ideas.
- Live missions have no rover measurement (RadLab's Mars record ends in June 2024), so dose is **estimated** and labelled. A calm live window replays the archived 20 May 2024 storm on Sols 8–9, labelled ARCHIVED.
- NASA/JPL's news release gives 8,100 micrograys for the 20 May 2024 event; the RadLab series we use adds up to about 1,700. We show both and explain the difference instead of hiding it.
- Power, air, water and food use game units tied to real anchors. Plants grow faster than in real life.
- Ground detail smaller than the 20 m data, and the rocks near the outpost, are scanned Earth materials tinted to match; they are not Mars data.
- Dust storms, breakdowns, the neighbour camp and the crew are fiction based on real Mars facts. The game never says life was found.

## How it works

```
web/src/sim/      pure simulation, no rendering; reads shared/design/*.json; unit-tested (npm test)
web/src/data/     live DONKI fetch + archived fallback; builds the 10 real days of a mission
web/src/world/    Three.js scene: real terrain, Mars sky, outpost, weather, cameras
web/src/ui/       HTML/CSS interface: gauges, power board, events, storm, debrief
web/src/audio.ts  every sound is generated in code (Web Audio)
shared/           one source of truth for both editions: game bible, style guide, design JSON, real data, scripts
docs/             submission texts, demo script, checklist, lesson guide
```

- The simulation is deterministic (seeded). A **mission code** replays the same dust and breakdowns for a friend.
- Strategy bots play hundreds of missions in the test suite to prove that **every ending is reachable** and that different strategies reach different endings.
- Run it locally: `cd web && npm install && npm run dev` · tests: `npm test` · build: `npm run build`.

Tech: TypeScript, Three.js (WebGL 2), pmndrs postprocessing, n8ao, Vite, Vitest. Static site on GitHub Pages; no backend, no login, no tracking, no personal data.

## SI (AI) disclosure

- **Code, in-game text, documentation and the code-generated sound design** were produced with the assistance of an SI tool (**Claude**, Anthropic) and reviewed by Team PlutonyX. Source files carry a header saying so.
- **The game concept is the team's own:** Mars and Jezero, the three-plus-two resource structure, the storm dilemma, the crew stakes and the tone. SI drafted wording options that the team chose from, then built the result.
- **No SI-generated images or video** are in the Web edition at the time of writing. All visuals are the real-time game, real NASA data and openly licensed assets. If SI portraits or clips are added they carry a visible "SI-generated" mark and are listed in [`shared/art/SI_LOG.md`](shared/art/SI_LOG.md).
- **Voices:** none recorded. Optional read-aloud uses the browser's built-in synthetic speech.
- No NASA logos, flags or mission insignia are shown. Logos were removed from the NASA rover model's textures before use.

## References

Complete list (data, models, textures, libraries, fonts, tools, SI tools): [`shared/references.md`](shared/references.md).

## Team

Team PlutonyX — five members, Uzbekistan.
<!-- TEAM: replace this line with the five member names (names only, no photos). -->

## Licence and notices

Code: MIT (see `LICENSE`). NASA data and models are used under the NASA Media Usage Guidelines. This is a student hackathon project; NASA does not endorse it.
