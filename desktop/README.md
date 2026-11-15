# PlutonyX — Desktop Ultra edition (Unity)

The installable edition of Team PlutonyX's **Junior Astronaut Mission Trainer** for the NASA Space Apps Challenge 2026.
It is the same game as the [Web edition](../web/) — same story, crew, events, endings and real NASA data, all read
from [`/shared`](../shared/) — rendered in Unity 6 with the High Definition Render Pipeline.

> You command four people at Lakeshore Outpost in Jezero Crater for ten sols. Every dawn you split a limited power
> budget between air, greenhouse, storm shield and rover. The space weather is real: each sol is one real day of NASA
> records, and the radiation is what NASA's Curiosity rover measured on Mars that day.

## Download

**Download:** https://github.com/Darkcursader/plutonyx/releases/tag/v1.0-desktop

| File | Platform | Notes |
|---|---|---|
| `PlutonyX-DesktopUltra-Windows-x64-v1.0.zip` | Windows 10/11, 64-bit | Unzip, run `PlutonyX\PlutonyX.exe` |
| `PlutonyX-DesktopUltra-macOS-v1.0.zip` | macOS 12+ (Apple silicon and Intel) | Unzip, right-click `PlutonyX.app` → Open |
| `SHA256SUMS.txt` | | Checksums of both files |

**Unsigned hackathon build.** Windows: "Windows protected your PC" → *More info* → *Run anyway*.
macOS: right-click the app → *Open* → *Open*. No installer, no admin rights, no account, no internet needed
(the real NASA data is bundled).

**System requirements.** Minimum: 4-core CPU, 8 GB RAM, a GPU with DirectX 12 / Metal support (integrated graphics from
about 2020 on; choose *Graphics: Low* in the pause menu). Recommended: a dedicated GPU with 4 GB of memory, 16 GB RAM.
About 500 MB of disk space.

> Honest status: the Windows build is cross-compiled on a Mac. The macOS build was tested end to end; the Windows
> build must be tested on a PC before it is relied on.

## Controls

| | Keyboard / mouse | Gamepad |
|---|---|---|
| Continue | Space, Enter or click | A |
| Move between choices | Arrow keys or W/S, or number keys 1–6 | D-pad |
| Power board | Up/Down choose a machine, Left/Right change its level | D-pad |
| Pause, settings | Esc | Start |
| Explore mode | WASD move, Shift run, Space jump, Q/E or right mouse look, T time of day, Tab back | Sticks, RT run, A jump, Y time, B back |

Pause menu: text size, graphics preset (Low / Medium / High / Ultra), window or fullscreen, volume, less motion.

## What the Ultra edition adds

- The **real terrain of Jezero Crater** at true scale (30 × 30 km, 1,195 m of relief) from NASA Mars Reconnaissance
  Orbiter Context Camera data, lit by a physically based Mars sky: butterscotch days, blue-tinted sunsets, dust storms
  that thicken the air and starve the solar panels.
- **Explore the outpost on foot**: walk and run as the Commander in third person, and jump under the real gravity of
  Mars (3.73 m/s², 38% of Earth's). Each building tells you what it is and one sourced fact.
- The world moves: the ascent ship really launches in every ending, the rover drives out when Dil leaves for the
  delta, and the crew walk to the shelter when the storm hits.
- A day–night cycle, a storm scene at dusk with a Geiger counter that follows the storm, and camera "snow" like the
  specks charged particles left in Curiosity's images in May 2024.
- Sound and music synthesised in code, keyboard + gamepad + mouse, 1080p to 4K with vector UI.

Everything that is judged — mechanics, data, endings, story — is the shared design and also exists in the Web edition.

## Real data in this edition

| Source | Used for | Where |
|---|---|---|
| NASA DONKI (CCMC) | Flares, CMEs, WSA-ENLIL arrivals at Mars: the space-weather timeline | `shared/data/spaceweather/*.json` |
| NASA RadLab (OSDR), `MSL-RAD-Surface` | The radiation dose of every sol, measured on Mars by Curiosity | same files |
| JPL approximate planetary positions | The real Earth–Mars radio delay for the mission date | `Assets/PlutonyX/Scripts/Core/SpaceWeather.cs` |
| MRO CTX elevation (20 m) + image mosaic (6 m), USGS Astrogeology / Mars 2020 | The game world | `TerrainData/`, `tools/terrain/` |

Two clearly labelled modes. **LIVE:** at start-up the game asks NASA DONKI for the last 30 days of flares and CMEs
(12-second timeout); "Today's real sky" then runs on them and the badge says LIVE with the fetch time. No rover
radiation measurement exists for recent dates, so live missions use an estimate and say so; if the Sun was calm, the
storm sols replay the archived 20 May 2024 storm, labelled ARCHIVED. **ARCHIVED:** without internet, or for the story
and history missions, the bundled real records are used and labelled ARCHIVED.

**Read aloud.** Press Esc and switch on *Read aloud*: the computer's own built-in speech voice (macOS `say`, Windows speech)
reads the dialogue, cards, choices and menus. It is off by default. No voice recordings ship with the game.

## Build from source

Requires Unity **6000.6.9f1** with Windows Build Support (Mono), Python 3.9+.

```bash
cd desktop
python3 -m venv tools/.venv && tools/.venv/bin/pip install numpy pillow rasterio
python3 tools/fetch_textures.py                       # CC0 ground textures (not in git)
python3 tools/fetch_models.py                         # CC0 scanned rock models (not in git)
tools/.venv/bin/python tools/terrain/prepare_layers.py
tools/unity.sh -executeMethod PlutonyX.EditorTools.ProjectSetup.Configure
tools/unity.sh -executeMethod PlutonyX.EditorTools.WorldBuilder.BuildWorld      # the scene is generated by code
tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildWin       # or BuildMac
tools/package.sh v1.0
```

`tools/harness/run.sh 1000` compiles the simulation core without Unity and plays thousands of bot missions to check
balance and that endings are reachable. The terrain files in `TerrainData/` are rebuilt from the raw NASA files with
`tools/terrain/process_terrain.py` (download commands in `source/README.md`).

## Assets and credits

- Terrain: NASA/JPL-Caltech/MSSS (MRO Context Camera); mosaics by the USGS Astrogeology Science Center for the
  Mars 2020 Terrain Relative Navigation system.
- Space weather: NASA DONKI, Community Coordinated Modeling Center, Goddard Space Flight Center.
- Radiation: NASA RadLab, Open Science Data Repository; MSL RAD data NASA/JPL-Caltech/SwRI.
- Ground textures: Poly Haven (CC0) — `sand_01`, `rocky_trail_02`, `brown_mud_dry`, `dry_riverbed_rock`, tinted.
- Rocks: Poly Haven (CC0) photo-scanned models — Namaqualand Boulder 02/03/05, Moon Rock 01/03, Namaqualand Stones 01. They are Earth rocks, tinted; scenery, not Mars data.
- Engine: Unity 6, High Definition Render Pipeline. Habitat, ascent ship, rover, crew figures and their surface textures are original models generated in code for this project (no real vehicle is copied; no agency logo, insignia or flag appears). UI, sounds and music: made for this project.
- No NASA logos or insignia appear anywhere. NASA does not endorse this game.

## SI disclosure

Portions of the code, text and all audio in this edition were generated with the assistance of an SI tool (Claude)
and reviewed by Team PlutonyX. The game concept is the team's own. This edition contains no SI-generated images or
video. Every C# file carries the disclosure line in its header.
