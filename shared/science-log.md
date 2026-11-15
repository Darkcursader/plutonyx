# Mission Science Log

> Which NASA data this game uses, why, how each dataset becomes a game rule, and where we simplified.
> Shown in-game (Science Log screen) and used in the README. Every source is listed under References.

## The short version

- **Space weather is real.** One sol in the game is one real day in NASA's DONKI record.
- **Radiation is real.** The dose each sol is what NASA's Curiosity rover measured on the surface of Mars that day.
- **The ground is real.** The terrain is Jezero Crater, built from Mars Reconnaissance Orbiter elevation data.
- **The radio delay is real.** It is computed from the true positions of Earth and Mars on the mission date.
- **The story is ours.** The crew, the outpost, dust storms and breakdowns are fiction based on real Mars facts.

## Dataset 1 — DONKI (NASA Goddard, CCMC)

**What it is:** NASA's database of space-weather events: solar flares, coronal mass ejections (CMEs), solar particle events, geomagnetic storms at Earth, and runs of the WSA-ENLIL model that predict where a CME will go.

**Why we use it:** It is the challenge's suggested source for real space weather, and it includes something special: predicted CME arrival times **at Mars**.

**How it becomes a game rule:**

| DONKI record | In the game |
|---|---|
| Solar flares (class and time) | The morning report. Big flares put static on the radio link and break up messages from Earth. |
| WSA-ENLIL "impact at Mars" predictions | Forecast cards: "NASA's model says a cloud from the Sun will reach Mars on Sol N." Shown on the sol the real model run was finished. |
| CME speed and direction | Shown in real-data cards and in the ending reveal. Used to estimate storms when no rover measurement exists. |
| Earth's Kp index | "Earth is having its own storm today" notes, and the Same Sun ending. |

**What we learned from the data:** in May 2024 NASA's model predicted many solar clouds reaching Mars. On the ground, Curiosity's radiation reading barely changed, and even dipped by about a fifth (scientists call such a dip a Forbush decrease). The dangerous event came from a different eruption that no forecast listed. The game keeps that exactly as it happened, so forecasts in the game can be wrong the same way real ones were.

## Dataset 2 — RadLab, instrument MSL-RAD-Surface (NASA Open Science Data Repository)

**What it is:** RadLab is NASA's portal for radiation measurements. `MSL-RAD-Surface` is the Radiation Assessment Detector on the Curiosity rover, measuring absorbed dose rate on the surface of Mars in micrograys per hour (µGy/h). We downloaded the full record available: January 2015 to June 2024.

**Why we use it:** It is real radiation measured where our crew would stand.

**How it becomes a game rule:**

- For every real day we add up the dose rate over 24 hours (time-weighted) to get the day's dose in µGy.
- The calm dose is the median day of the window (about 113 µGy per day in May 2024).
- **Storm level** comes from the ratio of a day's dose to the calm dose: under 1.3 = calm, under 2 = active, under 6 = storm, 6 or more = severe.
- Inside the habitat the crew receives 85 % of the calm part (cosmic rays are very hard to stop) and 60 % of the storm part, reduced further by the Storm Shield.
- The storm scene replays the real minute-by-minute curve.

**The real numbers behind the story mission:**

| Real day | Dose that day | Level |
|---|---|---|
| 13–19 May 2024 | 91–117 µGy | calm |
| **20 May 2024** | **1,487 µGy** (peak 304 µGy/h at 06:15 UTC; a calm hour is about 4.7) | severe |
| 21 May 2024 | 275 µGy | storm |

DONKI lists the eruption's CME at 05:36 UTC, leaving the Sun at 2,678 km/s on the side Earth could not see. The rover's reading peaked 39 minutes later.

**An honest note about two numbers.** NASA/JPL's news release says a person next to the rover would have received 8,100 µGy, "equivalent to 30 chest X-rays". The RadLab series we use adds up to about 1,700 µGy for the same event. We do not know exactly how the news figure was calculated, so the game uses the RadLab series for its rules and quotes the NASA/JPL sentence separately, as NASA's own summary. We chose to show both instead of hiding the difference.

## Dataset 3 — JPL planetary positions

We compute where Earth and Mars were on each mission day from JPL's published orbit elements, then the distance and the one-way radio delay (distance ÷ speed of light). We checked three dates against NASA's JPL Horizons system and agreed within 0.01 minute. On 20 May 2024 the delay was 15.8 minutes each way, so a question and its answer needed about 32 minutes of travel. The radiation peaked 39 minutes after the eruption was first seen. That is why the player decides alone.

## Dataset 4 — Jezero Crater terrain (Mars Reconnaissance Orbiter CTX, USGS for NASA Mars 2020)

The game world is a 30 km square of the real crater: a 20-metre elevation model and a 6-metre image mosaic made from Context Camera pictures. Heights are shown at true scale. The outpost stands near the place where the Perseverance rover landed.

## Dataset 5 — OSDR plant studies and the CSA food toolkit

The greenhouse grows crops that really grew on the International Space Station (lettuce, mizuna, kale, tomatoes, zinnias) under magenta LED light, as in NASA's Veggie system. OSDR studies OSD-268, OSD-269 and OSD-766 are the open datasets from those harvests. The Canadian Space Agency's "Food production on the Moon and in remote areas" toolkit shaped how we explain it to students.

## How the storm estimate works when there is no rover data

RadLab's Mars record ends in June 2024, so a **live** mission has no measured dose. Then the game estimates: a storm (level 2) only when DONKI lists a CME faster than 2,500 km/s. We calibrated this on our four measured windows: the three CMEs that fast (10 September 2017, 15 February 2022, 20 May 2024) were each followed within a day by at least a doubling of dose at Curiosity. Slower CMEs, and clouds the model predicted to reach Mars, did not raise the measured dose. Estimated values are always labelled "estimated".

If a live window is calm, Sols 8 and 9 replay the archived storm of 20–21 May 2024, and the game labels those sols ARCHIVED.

## Simplifications (things we changed on purpose)

- **Dose limits are scaled.** Real limits cover a whole career and are far higher than a 10-sol mission could reach. We scaled the badge limits so players feel the real rule: keep dose as low as you reasonably can. Radiation never makes a character sick in the game.
- **The Storm Shield is future technology.** Powered shields are a research idea, not flight hardware. The water wall and sheltering under a cliff are real, practical ideas (NASA/JPL: "Cliffsides or lava tubes would provide additional shielding").
- **One sol = one day.** A sol is about 24.6 hours; we pair each sol with one 24-hour day of data.
- **Flare classes are measured near Earth.** Mars often faces a different side of the Sun. The game says so.
- **Power, air, water and food use game units** tied to real anchors: 0.84 kg of oxygen per person per day, about a gallon of water per person per day with 98 % recycling, sunlight about 43 % as strong as at Earth.
- **Plants grow faster** than in real life so a harvest fits in 10 sols.
- **Dust storms, breakdowns, Isidis Camp and the crew** are fiction based on real Mars facts.
- **The ground image is greyscale;** we tint it with Mars colours. Rocks and grain smaller than 20 m are generated, not data.
- **The Leopard Core** is fiction inspired by the real Cheyava Falls rock. The game never says life was found.
