# Demo — 30-second video (script, shot list, and a 7-slide fallback)

**Rule:** the demo must be **30 seconds or less**. Ours is built at **29.8 s** and the build script refuses to finish if the file is longer than 30 s.

- File: `docs/demo/plutonyx-demo-30s.mp4` (1920 × 1080, 30 fps, H.264 + AAC).
- Every frame is the real game, recorded frame by frame from the real-time renderer (`web/scripts/capture.mjs`). No SI-generated images or video. No faces, no voices.
- English captions are burned in. The soundtrack is a simple synthesised drone made by FFmpeg (no recordings, no music library).
- Rebuild: from `web/`, run `node scripts/capture.mjs` (records footage into `D:\PlutonyX-assets\cap`) and then `node scripts/make-video.mjs`.
- **Upload:** YouTube set to **Public** (or Google Drive "Anyone with the link"), then paste the link into the submission field and into `docs/submission.md`.

## Script (follows the official structure)

| Time | On screen (real game footage) | Caption |
|---|---|---|
| 0:00–0:02 | Title shot: the outpost small on the horizon at dawn | **TEAM PLUTONYX** · NASA Space Apps Challenge 2026 |
| 0:02–0:05 | Slow flight around Lakeshore Outpost | **Challenge: Build a Junior Astronaut Mission Trainer** · Kids hear that space is dangerous. They rarely get to feel why. |
| 0:05–0:10 | The flight continues | **PROJECT JEZERO** · Keep your crew alive on Mars, where every choice costs something and the real Sun decides how hard it gets. |
| 0:10–0:13 | The power board; levels being changed | **Share out real power: air, food, shield, science** · Ten sols. Three meters. You can never have everything. |
| 0:13–0:15.5 | An event card with three choices | **Every choice costs something** · Consequences arrive sols later, with a "because you…" line. |
| 0:15.5–0:18 | The "What really happened" real-data card | **Real NASA data, shown in the game** · DONKI space weather · Curiosity rover radiation · real Jezero terrain |
| 0:18–0:20 | The storm: shield dome, aurora, storm choices | **Sol 8 was 20 May 2024. The storm really happened.** · The biggest radiation surge NASA's Curiosity has measured on Mars. |
| 0:20–0:23 | "Call Earth?" with the Sun–Earth–Mars map | **Earth is 16 light-minutes away** · The answer cannot arrive in time. You decide alone. |
| 0:23–0:27 | The ship launches at sunset | **Seven endings. Nobody dies. Everything is explained.** · Free in any browser · Cadet, Commander and Classroom modes |
| 0:27–0:29.8 | Sunset over the outpost | **darkcursader.github.io/plutonyx** · Next: more real storms, more sites, Desktop Ultra edition |

If the Desktop builder sends 4K clips, swap them into the 0:02–0:10 and 0:23–0:27 slots (edit the `PLAN` table in `web/scripts/make-video.mjs`); keep the total under 30 s.

## Fallback: 7-slide deck (use only instead of the video, never both)

1. **Title** — PROJECT JEZERO · Team PlutonyX · NASA Space Apps Challenge 2026 (title screenshot).
2. **Team and challenge** — member names · "Build a Junior Astronaut Mission Trainer" · why: kids rarely get to feel real mission trade-offs.
3. **The game** — screenshot of the power board: four machines, limited power cells, three meters.
4. **The experience** — the storm on Sol 8: shelter, greenhouse or crewmate, and Earth is 16 light-minutes away.
5. **NASA data makes it possible** — DONKI (space weather and arrival times at Mars), RadLab (Curiosity's radiation on Mars), real Jezero terrain, JPL orbits; screenshot of a real-data card.
6. **It really happened** — the reveal: 20 May 2024; seven endings with the real science behind each.
7. **Impact and future** — free in any browser, classroom mode and lesson guide, today's real sky, more real storms, Desktop Ultra edition; the link.
