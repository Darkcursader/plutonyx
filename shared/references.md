# References — every dataset, model, texture, library, font, tool and SI tool used

> Generated from `shared/design/sources.json` by `shared/scripts/build-references.mjs`. Edit the JSON, not this file.
> Links checked 2026-11-15. NASA material is used under the NASA Images and Media Usage Guidelines: credit given, no endorsement implied, no NASA insignia shown.

## NASA data that drives game mechanics

| Source | What we used it for |
|---|---|
| **NASA Goddard / CCMC** — [DONKI - Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Solar flares, CMEs, particle events, Earth geomagnetic storms and WSA-ENLIL predicted arrivals at Mars. Drives the space-weather timeline of every mission, live or archived. *Research-quality data; NOAA SWPC is the official forecast source. Also reachable through api.nasa.gov/DONKI.* |
| **NASA Open Science Data Repository (OSDR)** — [RadLab radiation dosimetry portal - instrument MSL-RAD-Surface (Curiosity rover Radiation Assessment Detector, Mars surface)](https://visualization.osdr.nasa.gov/radlab/gui/) | Absorbed dose rate (µGy/h) measured on the surface of Mars. Sets the radiation dose of every sol and the minute-by-minute storm curve. |
| **NASA JPL Solar System Dynamics** — [Approximate Positions of the Planets (Keplerian elements, 1800-2050)](https://ssd.jpl.nasa.gov/planets/approx_pos.html) | Earth and Mars positions for the mission date: real distance and one-way radio delay; the mini solar-system map. |
| **NASA JPL Solar System Dynamics** — [Horizons System API](https://ssd.jpl.nasa.gov/horizons/) | Used only to check our radio-delay maths (agreement within 0.01 minute on three dates). |
| **USGS Astrogeology Science Center for NASA Mars 2020 · NASA/JPL/MSSS** — [Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (Jezero Crater, 20 m/pixel)](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic) | Real elevation of Jezero Crater from Mars Reconnaissance Orbiter Context Camera stereo images. The game terrain. |
| **USGS Astrogeology Science Center for NASA Mars 2020 · NASA/JPL/MSSS** — [Mars 2020 Terrain Relative Navigation CTX Orthorectified Image Mosaic (Jezero Crater, 6 m/pixel)](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif) | Real orbital image of Jezero Crater. The ground texture (greyscale image, tinted with Mars colours by us). |
| **NASA Solar System Treks (JPL / SSERVI)** — [Mars Trek](https://trek.nasa.gov/mars/) | Used to find and check the Jezero site, landing location and map layers. |
| **NASA OSDR** — [OSD-268: Microbiological and nutritional analysis of lettuce crops grown on the International Space Station - VEG-01B](https://osdr.nasa.gov/bio/repo/data/studies/OSD-268) | Evidence that lettuce grown in space was analysed as food. Basis for the greenhouse crops. |
| **NASA OSDR** — [OSD-269: Microbiological and nutritional analysis of lettuce crops grown on the International Space Station - VEG-03A](https://osdr.nasa.gov/bio/repo/data/studies/OSD-269) | Second Veggie lettuce harvest study. |
| **NASA OSDR** — [OSD-766: The microbial communities of a tomato crop grown in Veggie under different lighting regimes on the International Space Station](https://osdr.nasa.gov/bio/repo/data/studies/OSD-766) | Tomatoes and light 'recipes' in the greenhouse. |

## Space agency partner data and resources

| Source | What we used it for |
|---|---|
| **Canadian Space Agency** — [Toolkit for educators and youth - Food production on the Moon and in remote areas](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Framing for the greenhouse and the classroom guide: food production in space, astronaut nutrition, benefits on Earth. |
| **European Space Agency (Solar Orbiter is an ESA/NASA mission)** — [Can't stop won't stop: Solar Orbiter shows the Sun raging on](https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter/Can_t_stop_won_t_stop_Solar_Orbiter_shows_the_Sun_raging_on) | Sunspot region AR3664 stayed active on the far side of the Sun; on 20 May 2024 Solar Orbiter's STIX saw a flare with an estimated class of X12. |

## NASA facts checked for in-game text

| Source | What we used it for |
|---|---|
| **NASA JPL** — [NASA Watches Mars Light Up During Epic Solar Storm (10 June 2024)](https://www.jpl.nasa.gov/news/nasa-watches-mars-light-up-during-epic-solar-storm/) | 20 May 2024: X12 flare estimate; 8,100 micrograys = about 30 chest X-rays; biggest surge RAD has measured; cliffsides or lava tubes give extra shielding; camera 'snow'; MAVEN auroras. |
| **NASA JPL** — [Large Solar Storm Sparks Global Aurora and Doubles Radiation Levels on the Martian Surface (29 Sept 2017)](https://www.jpl.nasa.gov/news/large-solar-storm-sparks-global-aurora-and-doubles-radiation-levels-on-the-martian-surface/) | 11 Sept 2017 event: radiation more than double any earlier RAD reading for more than two days; aurora 25 times brighter; 'you would definitely want to take shelter'. |
| **NASA** — [NASA Says Mars Rover Discovered Potential Biosignature Last Year (10 Sept 2025)](https://www.nasa.gov/news-release/nasa-says-mars-rover-discovered-potential-biosignature-last-year/) | Cheyava Falls rock, Sapphire Canyon core, Bright Angel formation in Neretva Vallis, leopard spots, vivianite and greigite, 'potential biosignature', non-biological explanations not ruled out. |
| **NASA JPL** — [Mars 2020 Perseverance Landing Press Kit - Landing Site](https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/) | Jezero Crater: 28 miles (45 km) wide, lake about 3.5 billion years ago, river delta, Isidis Planitia. |
| **NASA Science** — [Mars: Facts](https://science.nasa.gov/mars/facts/) | Day length 24.6 hours; year 687 Earth days; sunlight takes 13 minutes; thin CO2 atmosphere; temperatures 20 C to about -153 C; no global magnetic field today; moons Phobos and Deimos; dust storms. |
| **NASA** — [NASA's Oxygen-Generating Experiment MOXIE Completes Mars Mission (6 Sept 2023)](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) | MOXIE made 122 g of oxygen from Mars air in 16 runs, up to 12 g per hour, 98 % pure or better. |
| **NASA** — [NASA Achieves Water Recovery Milestone on International Space Station (20 June 2023)](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) | 98 % water recovery; about a gallon per crew member per day. |
| **NASA (NTRS)** — [ICES-2017-87, 47th International Conference on Environmental Systems (oxygen requirement 0.84 kg per crew member per day)](https://ntrs.nasa.gov/api/citations/20170010337/downloads/20170010337.pdf) | Oxygen need per person per day. |
| **NASA** — [Growing Plants in Space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/) | Veggie garden on the ISS: lettuce, mizuna, kale, zinnias; LEDs glow magenta pink; vitamins in packed food break down; plants help well-being. |
| **NASA JPL** — [Opportunity Hunkers Down During Dust Storm (June 2018)](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/) | 2018 dust storm: tau 10.8 (2007 storm: above 5.5); a quarter of the planet; rover could not charge; low-power fault mode. |
| **NASA Science** — [What Do Sunrises and Sunsets Look Like on Mars?](https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/) | Blue Martian sunset: fine dust scatters blue light forward. |
| **NASA Science** — [Speaking Percy's Language: How to Talk so Perseverance Will Listen](https://science.nasa.gov/blog/speaking-percys-language-how-to-talk-so-perseverance-will-listen/) | Radio delay between Earth and Mars: roughly 3 to 22 minutes depending on the planets' positions. |
| **NASA (NTRS)** — [Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions (ASCEND 2022)](https://ntrs.nasa.gov/citations/20220013418) | NASA analysis of how delay forces crew independence. |
| **NASA JPL** — [The Mars Relay Network Connects Us to NASA's Martian Explorers](https://www.jpl.nasa.gov/news/the-mars-relay-network-connects-us-to-nasas-martian-explorers/) | Surface missions send most data through orbiters. |
| **NASA Goddard (NSSDCA)** — [Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | Mean surface gravity 3.73 m/s² (launch dust falls at this rate); sunlight at Mars 586.2 W/m² against 1361.0 at Earth (about 43 %). |

## 3D models, textures, code libraries and fonts

| Source | What we used it for |
|---|---|
| **NASA** — [NASA 3D Resources](https://science.nasa.gov/3d-resources/) | Free 3D models (see references for the exact models used). Used under the NASA Images and Media Usage Guidelines; insignia removed; no endorsement implied. |
| **three.js authors** — [three.js (MIT licence)](https://threejs.org/) · MIT | 3D engine of the Web edition. |
| **pmndrs** — [postprocessing (Zlib licence)](https://github.com/pmndrs/postprocessing) · Zlib | Bloom, anti-aliasing, tone mapping, colour grading. |
| **Vite contributors** — [Vite and Vitest (MIT licence)](https://vite.dev/) · MIT | Build tool and unit tests. |
| **Severin Meyer** — [Oxanium typeface (SIL Open Font License)](https://fonts.google.com/specimen/Oxanium) | Display type. |
| **Braille Institute** — [Atkinson Hyperlegible typeface (SIL Open Font License)](https://www.brailleinstitute.org/freefont/) | Body type chosen for legibility. |
| **NASA 3D Resources** — [Mars 2020 Perseverance Rover (3D model)](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Mars%202020%20Perseverance%20Rover) · NASA Media Usage Guidelines | The rover parked beside the outpost. Agency logos, the flag and the mission nameplate were painted out of its textures (web/scripts/strip-insignia.mjs). |
| **Poly Haven** — [PBR ground textures: Red Sand, Red Laterite Soil Stones, Rocky Terrain 02](https://polyhaven.com/textures) · CC0 | Scanned ground detail in the hero zone around the outpost, tinted with Mars colours taken from the real orbital image. This detail is not Mars data. |
| **Poly Haven** — [Scanned rock models: Namaqualand Boulder 02, 03, 05; Moon Rock 01, 03; Namaqualand Stones 01](https://polyhaven.com/models) · CC0 | Rocks and gravel scattered around the outpost (Earth rocks, tinted; not Mars data). |
| **N8 Programs** — [n8ao (screen-space ambient occlusion)](https://github.com/N8python/n8ao) · ISC | Soft contact shadows. |
| **Fontsource** — [Fontsource font packages (Oxanium, Atkinson Hyperlegible)](https://fontsource.org/) · SIL OFL fonts, MIT packaging | Self-hosted fonts so the game works offline. |

## Tools used to build the project (not shipped in the game)

| Source | What we used it for |
|---|---|
| **geotiff.js contributors** — [geotiff.js](https://geotiffjs.github.io/) · MIT | Reading the NASA/USGS elevation and image GeoTIFF files. |
| **Lovell Fuller and contributors** — [sharp](https://sharp.pixelplumbing.com/) · Apache-2.0 | Image processing in the asset build scripts. |
| **Don McCurdy** — [glTF Transform](https://gltf-transform.dev/) · MIT | Compressing 3D models (meshopt, WebP). |
| **Microsoft** — [Playwright](https://playwright.dev/) · Apache-2.0 | Frame-by-frame capture of the real game for the demo video. |
| **FFmpeg project** — [FFmpeg](https://ffmpeg.org/) · LGPL/GPL | Encoding the demo video. |
| **Blender Foundation** — [Blender](https://www.blender.org/) · GPL | Installed for asset preparation. |

## SI (AI) tools

| Source | What we used it for |
|---|---|
| **Anthropic** — [Claude (SI coding assistant)](https://claude.com/) | Assisted with code, in-game text, documentation and code-generated audio. All reviewed by Team PlutonyX. Did not originate the game concept. |

## Original work

Game concept, story, characters, interface, simulation rules and all in-game text are original to Team PlutonyX (text and code drafted with SI assistance and reviewed by the team). All sound effects and music are generated in code at run time. No copyrighted music, images or characters are used.
