# Decisions log (short; newest at the bottom)

| # | Decision | Reason |
|---|---|---|
| 1 | Mars, Jezero Crater | Team concept. Real CTX elevation + imagery exist; Perseverance science gives the story. |
| 2 | Renderer: Three.js **WebGLRenderer** + pmndrs `postprocessing` (not WebGPURenderer) | Lowest risk across Chromebooks, Firefox and Safari in ~28 h; mature post-processing stack. |
| 3 | One sol = one real UTC day of NASA data | Makes "it really happened" literally true and easy to explain. |
| 4 | Story mission = **13–22 May 2024**, Sol 8 = 20 May 2024 | Curiosity's biggest radiation surge on Mars; same solar outbursts lit auroras on Earth; eruption was on the side of the Sun Earth could not see → "decide alone" is real. |
| 5 | DONKI via `https://ccmc.gsfc.nasa.gov/DONKI-API/get/…` | Key-free, CORS `*`. `api.nasa.gov/DONKI` returned 404 on 14 Nov 2026 and DEMO_KEY is 10 req/h. api.nasa.gov stays as fallback. |
| 6 | Radiation from RadLab `MSL-RAD-Surface` (µGy/h), 2015-01 → 2024-06 | Real dose measured on the surface of Mars. No data after June 2024 → live windows use a labelled estimate. |
| 7 | Estimated storm (live mode) only when a CME ≥ 2,500 km/s launches | Calibrated on our measured windows: 3 of 3 such CMEs doubled the dose at Curiosity; slower CMEs and ENLIL "arrival at Mars" predictions did not. |
| 8 | Calm live window → Sols 8–9 replay the archived 20–21 May 2024 storm, labelled ARCHIVED | Keeps the climax; never fakes live data. |
| 9 | Radiation never makes characters sick; it fills dose badges with game-scaled limits | Real doses at this scale cause no acute illness. Honest, kid-safe, still a real trade-off (ALARA). |
| 10 | Kid dose comparison uses only NASA/JPL's own "8,100 µGy ≈ 30 chest X-rays" | Other NASA pages give conflicting X-ray conversions; one cited statement avoids contradiction. |
| 11 | Three meters: Air, Power, Shield. Food/water are supplies; comms delay is drama | Challenge asks for 2–3 visible resources. |
| 12 | Storm Shield is "future tech" (labelled); water wall and cliff shelter are the grounded options | Team concept needs shelter power vs greenhouse; cliff shelter is NASA/JPL's own remark. |
| 13 | Earth–Mars radio delay computed from JPL approximate planetary elements | Checked against JPL Horizons on 3 dates: within 0.01 min. |
| 14 | Crew: Ana Reyes, Dilnoza Karimova, Kofi Mensah, Sam Whitfield (Earth), PIP (wrist computer) | Original adult characters; plants named after rivers (Amu, Syr) as a team nod. |
| 15 | Title is a placeholder (`shared/design/game.json` → `title`) | Team decides at the end. |
| 16 | Repo cloned to `D:\Space App\plutonyx`; commits authored with the owner's GitHub no-reply address | C: drive has ~2 GB free; keeps personal e-mail out of a public repo. |
| 17 | Work directly on `main` | Brief: main must always run and deploy; two builders touch separate folders. |
