# GAME BIBLE — Team PlutonyX · NASA Space Apps 2026 · "Build a Junior Astronaut Mission Trainer"

> **Single source of truth for both editions** (Web = Three.js, Desktop Ultra = Unity).
> If the two simulations ever disagree, `shared/design/balance.json` + this file win.
> Any change here needs one line in `shared/CHANGELOG.md`. Never silently change balance or ending conditions.
>
> Portions of this document were drafted with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
> The concept in section 1 is the team's own (see `web/docs/BRIEF.md`, Section 2).

---

## 1. Concept (decided by the team)

- **World:** Mars, **Jezero Crater** — the floor of a lake that dried up about 3.5 billion years ago, next to its river delta. Built from real NASA orbital elevation data and imagery.
- **Working title:** stored in `shared/design/game.json` → `title` (placeholder: **PROJECT JEZERO**). Change it there and it changes everywhere.
- **Hook:** "Keep your crew alive on Mars, where every choice costs something precious and the real Sun decides how hard it gets."
- **Player:** the Commander of **Lakeshore Outpost** (never shown, never named — no personal data).
- **Audience:** kids 7–12 first. Deep enough underneath that a parent says "wait, let me try."
- **Tone:** emotional, cinematic, hopeful underneath the danger. Tension and awe. **No horror, no gore, no jump-scares, nobody dies.**
- **Story question:** *Are we alone?* The crew came for a rock core that might hold signs of ancient life. Endings resolve it honestly: the sample *might* hold the answer and goes to scientists on Earth. **We never claim life was found.**

## 2. The one-paragraph pitch

You command four people at Lakeshore Outpost for the last **10 sols** before the ship home launches. Every dawn you split a limited power budget between the Air Maker, the Greenhouse, the Storm Shield and the Rover that is hunting for the "Leopard Core". Dust dims your solar panels. Machines break. And the space weather is **real**: each sol is one real day of NASA DONKI records, and the radiation that reaches your crew is what NASA's Curiosity rover actually measured on Mars that day. At the end the game tells you: *every storm you just survived really happened.*

## 3. Pillars

1. **Every choice costs something.** No safe option, ever. Power spent on the shield is light the tomatoes never get.
2. **The Sun is real.** Space weather comes from NASA data, never from a random number generator.
3. **Decide alone.** Earth is light-minutes away. Advice arrives after the crisis.
4. **Lose something you love, learn something true.** Failure costs plants, a sample, a message from home — never a life — and the debrief explains the real science.
5. **The world is the interface.** Lights dim, frost creeps, the Geiger crackle rises. Gauges appear only when you need them.

## 4. Crew (original characters, all adults — full sheets in `design/crew.json` and `style-guide.md`)

| id | Name | Role | What they love | What they stand to lose |
|---|---|---|---|---|
| `ana` | **Ana Reyes** | Botanist and crew doctor | Names every plant after a river on Earth (the tomato vines are *Amu* and *Syr*) | The garden — her life's work |
| `dil` | **Dilnoza "Dil" Karimova** | Geologist and rover driver, from Samarkand | The question "Are we alone?" | The Leopard Core, and her last days of field work |
| `kofi` | **Kofi Mensah** | Engineer — keeps air, power and radio alive | Fixing things; his family's messages | The birthday message from home |
| `sam` | **Sam Whitfield** | Flight director at Mission Control, Earth | Bringing every crew home | Is always minutes too late to help |
| `pip` | **PIP** | The Commander's wrist computer | Clear numbers | (guide/narrator; gives hints in Cadet mode) |

Morale matters: the crew reacts to what you protect and what you sacrifice. If morale falls very low, someone acts against your orders once (a scheduled surprise).

## 5. Resources

**Three core meters (the only permanent gauges; each has its own icon, shape and colour — never colour alone):**

| Meter | id | What it is | Real anchor |
|---|---|---|---|
| **AIR** | `air` | Oxygen reserve + CO₂ scrubbing margin | A person needs about 0.84 kg of oxygen per day (NASA life-support planning value) |
| **POWER** | `power` | Battery charge. 10 points = 1 "power cell" = 10 kWh (game scale) | Mars gets about 43 % of Earth's sunlight; the 2018 dust storm reached opacity (tau) 10.8 and silenced the Opportunity rover |
| **SHIELD** | `shield` | Charge of the Storm Shield around the shelter | Mars has no global magnetic field today; active shields are a real research idea, not flight hardware (labelled in-game as future tech) |

**Slow supplies (shown on the greenhouse/pantry screens and in events, not as permanent bars):** `water`, `food`.
**Hidden values (drive story and endings):** `plants` (garden growth 0–100), `science` (Leopard Core progress 0–100), `health`, `morale`, `dose` / `doseDil` (radiation in µGy), `risk` (count of gambles), plus flags.

**Communication delay** is not a meter. It is drama: see section 9.

## 6. Core loop (one sol ≈ 60–80 seconds; mission ≈ 12–15 minutes)

1. **Dawn briefing** — the sky (real space weather for that date + dust), today's solar harvest, delayed consequences arriving ("Because you dimmed the greenhouse 2 sols ago…"), any message from Earth.
2. **Power board** — set each of four systems to Off / Low / Normal / Boost. You can only spend today's sunlight plus the battery.
3. **The day's event** — a story beat or a problem from the deck. 2–3 choices. Each one raises something and lowers something.
4. **Night** — consequences play out in the world: meters ease to new values, real-data cards unlock, the crew reacts.

A meaningful decision every 30–60 s. All text skippable. Quiet sols can be fast-forwarded.

### The four powered systems (numbers live in `design/balance.json`)

| System id | Name | Off | Low | Normal | Boost | The hidden cost |
|---|---|---|---|---|---|---|
| `life` | Air Maker | air drops fast | air drops slowly | air holds | air recovers | Hungriest system on bad days |
| `garden` | Greenhouse | plants wilt | plants survive | plants grow | plants grow fast | Uses water; dead plants do not come back this mission |
| `shield` | Storm Shield | charge leaks | slow charge | charge | fast charge | Power banked for a storm that may be weaker than forecast |
| `rover` | Rover and drill | science stops | slow | steady | fast | Dil is further from home when the storm comes |

Cost = level × 1 power cell. A fixed **base load** (heat, lights, computers) is paid first every sol.
On a clear sol, running everything on Normal slowly drains the battery on Commander difficulty — you can never have everything.

## 7. Trade-off matrix (every action raises one thing and lowers another)

| Action | Raises | Lowers | Delayed consequence |
|---|---|---|---|
| Boost Air Maker | air | power | — |
| Air Maker on Low | power | air | Low air for 2 sols → tired crew (health) |
| Boost Greenhouse | plants, later food + a little air + morale | power, water | Harvest arrives sols later |
| Greenhouse Off | power | plants, Ana's morale | Two dark sols in a row kill the garden; no harvest → food runs short at the end |
| Charge Shield | shield | power | Wasted if the storm is weak; priceless if it is strong |
| Skip Shield | power | storm protection | Radiation dose badges fill → crew grounded or sent home |
| Boost Rover | science (the sample) | power | Dil reaches the delta sooner — in or out of the storm |
| Fill the water wall | storm protection | water | Less water for crew and plants afterwards |
| Divert greenhouse to shield (storm) | shield now | plants, morale | The team's "hardest choice" |
| Recall Dil | Dil's safety | the sample, science | The question stays unanswered |
| Let Dil shelter at the cliff | keeps the sample | risk, Dil's dose | Needs rover charge to get home |
| Ask Earth | better future decisions | 1 power cell, time | The answer arrives after you already had to choose |
| Download Kofi's birthday message | morale | power (dish) | Skipped → "a message from home that never arrives" |
| Help the neighbour camp | morale, a later favour | power, rover time | They return the favour — or you never hear from them |
| Send Kofi out to clean panels | solar harvest for following sols | Kofi's dose/time | — |

## 8. Real data → mechanics (the heart of the game)

| NASA source | What we take | What it drives |
|---|---|---|
| **DONKI** (CCMC) — FLR, CME, SEP, GST, IPS, WSA-ENLIL simulations | Real solar flares (class, time), CMEs (speed, direction), NASA's modelled **arrival times at Mars**, and Earth's geomagnetic storms | The space-weather timeline of every mission: forecasts, storm sols, radio noise, the "It really happened" reveal |
| **RadLab** (OSDR) — instrument `MSL-RAD-Surface` | Dose rate measured **on the surface of Mars** by Curiosity's RAD | The radiation dose of every sol (calm baseline and storms) |
| **JPL approximate planetary positions** | Keplerian elements for Earth and Mars | The real Earth–Mars distance and one-way radio delay on the mission date |
| **Mars 2020 / MRO terrain** (USGS + Mars Trek) | CTX elevation model (20 m) and image mosaic (6 m) of Jezero | The game world itself |
| **OSDR** plant studies (Veggie lettuce, tomato lighting) | What really grew on the ISS and under which light | Greenhouse crops, grow-light colour, growth rules |
| **CSA** "Food production on the Moon" toolkit | Kid-level framing of growing food off Earth | Greenhouse tutorial cards and the classroom guide |
| NASA mission facts (MOXIE, ECLSS, Perseverance, Curiosity) | Verified numbers | Fact cards, units in Mission Planner mode |

**One sol = one real day.** A mission runs on a real 10-day window:

- **Story mission (first play): 13–22 May 2024.** Sol 8 is **20 May 2024**, when Curiosity's RAD recorded its biggest radiation surge in 12 years on Mars (NASA/JPL: 8,100 micrograys, about 30 chest X-rays). Days earlier the same solar outbursts lit auroras across Earth. The player is *not told* until the ending.
- **Today's real sky:** the most active 10 days out of the last 30 days of live DONKI data.
- **Replay history:** other archived real windows (e.g. September 2017).

Rules of honesty:

- Two clearly labelled modes: **LIVE** ("Live NASA space weather · fetched <time>") and **ARCHIVED** ("Real NASA data from <dates> (archived)"). Never present archived data as live.
- When Curiosity's measured dose exists for a date we use it (`radSource: "measured"`). When it does not (live windows), dose is **estimated** from the DONKI event class and labelled as an estimate.
- Flare classes in DONKI are measured near Earth. In May 2024 Mars sat far around the Sun from Earth and saw a different face of it. The game says so — it is why Earth could not warn the crew.
- Dust storms and machine faults are **scenario events** based on real Mars facts. They are never presented as data.
- Every data-driven moment shows a **"Real data" chip** that opens a card: what happened, the real number, source, link, date.
- Kid unit for dose: **chest X-rays**, using NASA/JPL's own comparison for the May 2024 storm (8,100 µGy ≈ 30 chest X-rays → 270 µGy each).
- Radiation at these levels does **not** make anyone sick in the game. It fills a dose badge. Mission rules (our simplified version of the real "As Low As Reasonably Achievable" principle) ground or send home a crew member who goes over.

## 9. Communication delay as drama

- The one-way radio delay is computed for the real mission date from JPL orbital elements (NASA quotes roughly 3 to 22 minutes depending on where the planets are).
- **Ask Earth** is a choice in many events. It costs one power cell for the dish. The reply always arrives **after** you had to decide — next dawn in normal play, seconds too late in the storm scene.
- The storm scene runs on a visible clock with **1 real second = 1 mission minute**. A signal pulse crawls across a mini solar-system map toward Earth and back while the storm front closes in.
- A message from Earth arrives **incomplete** on Sol 1. Keeping the dish powered at the right moments recovers its three fragments. Decoded, it reads: *"The sunspot group that lit our skies has turned out of our sight and into yours. We cannot see what it does next. You are our eyes now. Do not wait for us."*

## 10. Mission structure — beat sheet (story mission)

| Sol | Real date | Beat | Tension |
|---|---|---|---|
| 1 | 13 May 2024 | **Wake-up.** Tutorial by doing: first power split within 30 s of pressing Play. A message from Earth arrives broken by solar static (story question). | calm |
| 2 | 14 May | Earth sees a giant flare; the link is noisy. Dil asks for rover power to scout the old river valley. | calm → curious |
| 3 | 15 May | First system fault from the deck. The garden's first true leaves. | rising |
| 4 | 16 May | **Dust front.** Solar harvest collapses for 2–3 sols (seeded). | pressure |
| 5 | 17 May | Power crunch: air vs. garden vs. shield vs. rover. Kofi's birthday message waits on the relay. | pressure |
| 6 | 18 May | **Real forecast:** NASA's WSA-ENLIL model says a solar eruption may graze Mars on Sol 9. Dil reaches the outcrop. | dread |
| 7 | 19 May | Relief: dust thins, a dust devil may clean the panels, harvest is close, Dil finds leopard spots. | relief |
| 8 | 20 May | **THE STORM** — a day early and far bigger than forecast, from a region Earth could not see. Shield vs. garden. Recall Dil or let her shelter under the cliff. Earth's answer arrives too late. | crisis |
| 9 | 21 May | Aftermath: delayed consequences land. The forecast grazing blow arrives. The neighbour camp calls for help. | bigger crisis or recovery |
| 10 | 22 May | **Launch window.** Final decision, ending, the "It really happened" reveal, debrief. | climax → hope |

Scheduled surprises (at least three per mission, varied by seed): the early storm, a cascading fault, a crew member acting against orders when morale is low, the decoded message, a dust devil cleaning the panels, the neighbour's favour returned, a Phobos eclipse.

## 11. The hardest choice (team concept, kid-safe)

On the storm sol the shield is rarely charged enough. The shelter can only be fully powered by **diverting the greenhouse** — saving the crew's dose badges tonight and losing Ana's plants. At the same moment **Dil is at the delta with the core**. Recall her now and the half-drilled core is lost; let her finish and she must shelter under the cliff (NASA/JPL: "Cliffsides or lava tubes would provide additional shielding") and get home on whatever charge the rover has. Earth's advice is still in flight. The player decides alone.

A player who read the forecasts, decoded the message and banked shield charge early can save everything. That is the mastery curve: **learn from failure, earn the good ending.**

## 12. Endings (6 + 1 secret — exact conditions in `design/endings.json`, checked top to bottom)

| # | id | Title | In one line |
|---|---|---|---|
| 1 | `evac` | **Abort to Orbit** | A core meter hit zero, or the crew wore out. The mission ends early and everyone is saved — exactly what real mission rules require. Not a loss. |
| S | `secret` | **Same Sun** *(secret)* | Sample home, garden thriving, crew fit, shield never failed, message fully decoded. The reveal widens: the same Sun that hit Mars painted Earth's sky. |
| 2 | `full` | **Homeward with Hope** | Crew fit, Leopard Core aboard, garden alive, no reckless gambles. |
| 3 | `gamble` | **The Gamble** | The core is aboard — but it took risks, a failed shield, a grounded crewmate or a dead garden. The debrief shows how close it was. |
| 4 | `green` | **The Green Outpost** | No sample, but the garden thrives and the crew is fit: the outpost can feed itself. |
| 5 | `bittersweet` | **Safe Hands, Empty Hands** | Everyone is fine. The question stays on Mars. Safety can cost discovery. |
| 6 | `survival` | **Hold the Line** | You lost the sample and the garden or a crewmate's flight status — and still brought everyone through. |

Each ending: a cinematic shot, an illustrated postcard (SI art, watermarked), a narrated epilogue, **"The real science behind your ending"** with source, and a slot in the ending gallery (locked silhouettes).

**The reveal ("It really happened")** plays before every ending of a real-window mission: the real dates, the real flare classes, what Curiosity measured, with links.

## 13. Difficulty and modes

- **Cadet (7–9):** bigger reserves, more sun, PIP hints and a "PIP's plan" button on the power board, no timers.
- **Commander (10–12+):** tighter margins, timed storm scene, hints only on request. The fair, Souls-like challenge.
- **Classroom:** Cadet numbers, no timers, class seed code so everyone plays the same mission, discussion prompts at three pause points, a one-page lesson guide.
- **Mission Planner view** (toggle): real units (kWh, kg O₂, µGy), graphs of the run, and the player's dose curve against the real measured data.

Real space-weather numbers are **never** scaled by difficulty. Difficulty only changes the outpost's reserves and limits.

## 14. Replayability

- Seeded runs: mission code = `<window id>-<seed>` (no personal data). Same code = same mission for a friend.
- The solar timeline comes from the chosen real window; the deck of faults, dust timing and crew moments is drawn from the seed.
- Achievements tied to real science, an ending gallery, a post-mission timeline of turning points with "what if you had…" hints.
- Deterministic PRNG for both engines: **mulberry32** seeded with a 32-bit integer (see `design/SCHEMA.md`).

## 15. Simulation rules (summary — exact numbers in `design/balance.json`)

**Order of one sol:** `dawn` (apply real space weather, dust, delayed effects, deliver messages) → `allocate` → `event(s)` → `night` (apply system levels, supplies, radiation, health and morale drift, check fail states, log turning points).

- `power_after = clamp(power + solar_today − base_load − Σ(level × 10), 0, 100)`. The board will not let the player overspend.
- Air, plants, shield and science move by the per-level tables. Plants ≥ 60 give a small air bonus (plants make oxygen — a real effect, simplified).
- Garden reaching 100 → **harvest** (food + morale), then it keeps cropping. Garden reaching 0 → dead for this mission.
- `science ≥ 40` → Dil leaves for the river valley. `science ≥ 100` → core sealed; Dil is home next dawn → `sampleSecured`.
- Radiation per sol: `calm part × hab factor` always; the **storm part** is cut by the shield: `protection = 0.92 × min(1, shield ÷ required[level])`. A storm also drains shield charge.
- Dose badge limits (game flight rules): amber = grounded from outside work; red = sent home early (ending pressure, never sickness).
- Fail states → **Abort to Orbit**: air ≤ 0, two sols of blackout, or health ≤ 0.
- Delayed effects are first-class: every one carries a "because…" line shown when it lands.

## 16. Content rules (non-negotiable, both editions)

- Real data only, attributed in-game; simplifications labelled. No number without a source in `references.md`.
- No NASA logos, "meatball"/"worm", flags or mission insignia anywhere — including on 3D models and SI art.
- SI-generated images/video carry a visible "SI-generated" watermark; SI code, data and audio are acknowledged in README, credits and file headers.
- No image, video, voice or likeness of anyone under 18. Crew are adults. Narration is synthetic or adult.
- English everywhere. No copyrighted characters, music or images.
- Never claim life was found on Mars.

## 17. Shared file map

| File | Purpose |
|---|---|
| `design/game.json` | Title, tagline, links, mission length, versions |
| `design/balance.json` | Every number of the simulation, per difficulty |
| `design/crew.json` | Characters |
| `design/events.json` | Story beats and the event deck (choices, effects, real-data links) |
| `design/endings.json` | Ending conditions, epilogues, real-science text |
| `design/dialogue.json` | Tutorial, PIP hints, Earth messages, barks |
| `design/achievements.json` | Badges |
| `design/facts.json` | Loading-screen and fact-card facts, each with a source id |
| `design/glossary.json` | Plain-language terms (sol, dose, flare, CME…) |
| `design/sources.json` | Machine-readable reference list (ids used everywhere) |
| `design/SCHEMA.md` | The effect/condition mini-language and file schemas |
| `data/` | Archived real NASA snapshots + `SOURCES.md` |
| `scripts/` | Fetch scripts that produce `data/` |
| `science-log.md` | Dataset → mechanic explanations shown in-game |
| `references.md` | Master reference list |
