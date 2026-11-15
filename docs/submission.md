# Submission text — copy and paste, field by field

> All fields are in English. Replace anything in `[[double brackets]]` before submitting.
> Deadline: click **Submit for Judging** before **Sun 15 Nov 2026, 23:59 Tashkent** (team target 20:00).

---

## 1. Project Name

```
PROJECT JEZERO
```
*(working title — if the team renames the game, change `shared/design/game.json` → `title` too)*

---

## 2. High-Level Project Summary (about 150 words)

```
PROJECT JEZERO is a free browser game that puts kids aged 7 to 12 in command of a four-person outpost in Jezero Crater, Mars, for the last ten sols before the ship home launches. Each dawn they share a limited number of power cells between air, a greenhouse, a storm shield and a rover hunting for a rock core that might hold a clue about ancient life. Every choice costs something, and the cost often lands sols later.

The danger is real. One sol in the game is one real day of NASA's DONKI space-weather record, and the radiation dose is what NASA's Curiosity rover measured on Mars that day. On Sol 8 a storm arrives that no forecast listed, Earth is 16 light-minutes away, and the player decides alone. The ending reveals that it really happened: 20 May 2024.

Players leave understanding why deep-space crews need margins, shelter and independence. It needs no download or account, has a Low preset for school laptops, and includes a classroom mode.
```

---

## 3. Link to Project Demo

```
[[PUBLIC LINK TO THE 30-SECOND VIDEO — YouTube (Public or Unlisted is NOT enough: set Public) or Google Drive "Anyone with the link"]]
```
The video file is `docs/demo/plutonyx-demo-30s.mp4` (exactly 30.0 s, English captions burned in, gameplay only, no faces or voices).

---

## 4. Link to Final Project

```
https://darkcursader.github.io/plutonyx/
```
Source code: `https://github.com/Darkcursader/plutonyx`

---

## 5. Detailed Project Description

```
WHAT IT DOES
PROJECT JEZERO is a Junior Astronaut Mission Trainer. The player commands Lakeshore Outpost, four people on the floor of Jezero Crater, for ten sols. Only three meters are ever on screen: Air, Power and Shield. Food, water and the communication delay with Earth arrive as events, so young players are never overwhelmed.

Each sol has four steps. (1) A morning report: the real space weather for that date, the dust in the sky, and the delayed consequences of earlier choices, each with a "because you..." line. (2) The power board: share today's power cells between the Air Maker, the Greenhouse, the Storm Shield and the Rover. Running everything at once is impossible. (3) An event from the story or from a shuffled deck, with two or three choices that each raise one thing and lower another. (4) Night: the world shows what the choices did.

The centre of the game is a real solar storm. Forecasts from NASA's WSA-ENLIL model warn of solar clouds reaching Mars, and most of them turn out to be harmless, exactly as they were in the real record. Then, on Sol 8, a far bigger storm arrives from a side of the Sun that Earth cannot see. The shelter can only be fully powered by cutting the greenhouse. A crewmate is out at the old river delta with the half-drilled core. A question to Earth needs 32 minutes for the round trip; the radiation peaks in 39. The player decides alone.

There are seven endings, one of them secret, built from the combination of choices across the mission. Nobody dies: failure costs the garden, the sample, or a message from home, and the debrief explains the real science. Before every ending the game reveals that each storm really happened, with dates, numbers and sources.

HOW IT WORKS
One game sol is one real UTC day. Solar flares, coronal mass ejections, particle events and predicted arrival times at Mars come from NASA DONKI. The radiation dose of every sol comes from NASA RadLab's record of the Curiosity rover's Radiation Assessment Detector on the surface of Mars. The Earth-Mars radio delay is computed for the mission date from JPL orbit elements and was checked against JPL Horizons. The terrain is the real Jezero Crater, built from Mars Reconnaissance Orbiter Context Camera elevation and imagery at true vertical scale.

The game has two clearly labelled data modes. LIVE fetches the last 30 days of DONKI records when the game starts and builds a mission from them ("Play today's real sky"). ARCHIVED uses saved snapshots of real records, so the game works offline and never fakes live data. Every data-driven moment has a "Real data" chip that opens a card with the real number, the source and a link. A Mission Science Log inside the game explains each dataset, how it becomes a rule, and every simplification we made.

The simulation is a separate, deterministic module with unit tests. Strategy bots play hundreds of missions in the test suite to prove that every ending can be reached and that no single strategy always wins. A mission code lets a friend or a whole class fly the same mission.

BENEFITS
- Reaches any classroom: a static web page with no download, account, advertising or personal data. It works with mouse, touch, keyboard or gamepad, and after the first visit it works offline.
- Teaches real constraints: power budgeting, life support, radiation shielding, food production and communication delay, each through a decision the player has to make.
- Honest science: every number is traceable, simplifications are labelled, and where two NASA figures differ we show both.
- Accessible: grade 3-5 reading level, read-aloud, text size, reduced motion, patterns as well as colour, a "Words to know" glossary.
- For teachers: Classroom mode with pause-and-discuss cards and a one-page lesson guide.
- For older players: Commander difficulty, a Mission Planner view with real units, replay of other real storms (September 2017, October 2021, February 2022), achievements and an ending gallery.

GOALS
We want a nine-year-old to walk away able to explain why a Mars crew cannot phone home for help, why you bank shield power before you need it, and why a garden matters. We want the adult next to them to ask for a turn.

TWO EDITIONS, ONE GAME
- Web edition (this link): https://darkcursader.github.io/plutonyx/
- Desktop Ultra edition (Unity, Windows): [[DESKTOP DOWNLOAD LINK — delete this line if the build is not released by 17:00]]
Both editions read the same design files and the same archived NASA data from the /shared folder of the repository: https://github.com/Darkcursader/plutonyx

TOOLS AND LANGUAGES
TypeScript, Three.js (WebGL 2), pmndrs postprocessing, n8ao, Vite, Vitest, Web Audio API, HTML and CSS. Node.js scripts with geotiff.js, sharp and glTF Transform for data and asset preparation. Playwright and FFmpeg for the demo video. GitHub Pages for hosting. Unity for the Desktop edition.
```

---

## 6. Use of Super Intelligence (SI)

```
We used an SI coding assistant (Claude, by Anthropic) as a tool to speed up the work. The idea for solving the challenge is the team's own: a Mars outpost at Jezero Crater, three always-visible systems with food and water as slower supplies, communication delay as drama, a real solar storm that forces a choice between the shelter, the greenhouse and a crewmate, and failure that costs something the player cares about instead of a life. SI drafted wording options for parts of the concept; the team reviewed and chose them.

What SI helped produce, all reviewed by the team:
- Code: the simulation, the 3D scene, the interface, the data scripts and the tests. Every source file carries a header saying so.
- Text: in-game dialogue and fact cards, the Science Log, the README and these submission texts. Every science claim was checked against a NASA or partner-agency source listed in References.
- Data handling: scripts that download and summarise NASA records. The data itself is real and unmodified apart from keeping only the fields we use.
- Audio: all sound effects and music are generated by code at run time. There are no recorded or SI-generated voices. Optional read-aloud uses the browser's built-in synthetic speech.

What SI did not produce: no SI-generated images or video are used in the Web edition or in the demo. Every frame of the demo is the game itself. [[If the team adds SI portraits or clips: "The following images/clips are SI-generated and carry a visible 'SI-generated' mark: ..." and list them from shared/art/SI_LOG.md. Desktop builder: add one sentence on SI use in the Unity edition.]]

No NASA logos, flags or mission insignia appear anywhere. Agency logos were removed from the textures of the NASA rover model before use.
```

---

## 7. NASA Data

```
1. NASA DONKI - Space Weather Database Of Notifications, Knowledge, Information (Goddard / CCMC)
   https://ccmc.gsfc.nasa.gov/tools/DONKI/
   Solar flares, coronal mass ejections, solar energetic particle events, geomagnetic storms and WSA-ENLIL simulations with predicted arrival times at Mars. Drives the space-weather timeline of every mission (live and archived): morning reports, forecast cards, radio static and the "it really happened" reveal.

2. NASA Open Science Data Repository - RadLab, instrument MSL-RAD-Surface
   https://visualization.osdr.nasa.gov/radlab/gui/
   Absorbed dose rate measured on the surface of Mars by the Curiosity rover's Radiation Assessment Detector (2015-2024). Sets the radiation dose of every sol, the storm level, and the storm's minute-by-minute curve.

3. NASA JPL Solar System Dynamics - Approximate Positions of the Planets, and Horizons
   https://ssd.jpl.nasa.gov/planets/approx_pos.html
   Earth and Mars positions for the mission date, giving the real distance and radio delay. Checked against Horizons.

4. Mars 2020 Terrain Relative Navigation CTX DTM and orthoimage mosaics of Jezero Crater (USGS Astrogeology for NASA Mars 2020; Mars Reconnaissance Orbiter Context Camera), located with NASA Mars Trek
   https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic
   https://trek.nasa.gov/mars/
   The game world: real elevation (20 m) and imagery (6 m) at true vertical scale.

5. NASA Open Science Data Repository studies OSD-268, OSD-269 and OSD-766
   https://osdr.nasa.gov/bio/repo/data/studies/OSD-268
   Lettuce and tomato crops grown in the Veggie system on the International Space Station. Basis for the greenhouse crops and light recipes.

6. NASA 3D Resources - Mars 2020 Perseverance Rover model
   https://github.com/nasa/NASA-3D-Resources
   The rover parked beside the outpost (logos removed).

7. NASA articles and fact pages used for in-game facts: Mars Facts; Mars Fact Sheet; "NASA Watches Mars Light Up During Epic Solar Storm" (JPL, 2024); "Large Solar Storm Sparks Global Aurora and Doubles Radiation Levels on the Martian Surface" (JPL, 2017); "NASA Says Mars Rover Discovered Potential Biosignature Last Year" (2025); MOXIE; ISS water recovery; Veggie; the 2018 dust storm. Full list with links: shared/references.md in the repository.
```

---

## 8. Space Agency Partner Data and Other References

Paste the whole of [`shared/references.md`](../shared/references.md) here (it is generated from `shared/design/sources.json`). Short version if the field is limited:

```
PARTNER AGENCIES
- Canadian Space Agency: Toolkit for educators and youth - Food production on the Moon and in remote areas. https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/
- European Space Agency (Solar Orbiter, ESA/NASA): "Can't stop won't stop: Solar Orbiter shows the Sun raging on". https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter/Can_t_stop_won_t_stop_Solar_Orbiter_shows_the_Sun_raging_on

OPEN ASSETS
- Poly Haven (CC0): ground textures Red Sand, Red Laterite Soil Stones, Rocky Terrain 02; rock models Namaqualand Boulder 02/03/05, Moon Rock 01/03, Namaqualand Stones 01. https://polyhaven.com
- Fonts (SIL Open Font License): Oxanium; Atkinson Hyperlegible (Braille Institute).

CODE LIBRARIES
- three.js (MIT), postprocessing by pmndrs (Zlib), n8ao (ISC), Vite and Vitest (MIT), Fontsource.

TOOLS (not shipped in the game)
- geotiff.js, sharp, glTF Transform, Playwright, FFmpeg, Blender.

SI TOOL
- Claude (Anthropic): coding and writing assistant.

Everything else (concept, story, characters, interface, rules, sounds, music) is original work by Team PlutonyX. Full list with links: https://github.com/Darkcursader/plutonyx/blob/main/shared/references.md
```
