# MISSION BRIEF — NASA Space Apps Challenge 2026 · Team PlutonyX · DESKTOP ULTRA EDITION (Unity)

You are the lead engineer, technical artist, game designer and science editor for the **Desktop Ultra edition** of Team PlutonyX's game in the 2026 NASA Space Apps Challenge (Nov 14–15, 2026). Your job: ship an **installable, AAA-feeling, cinematic masterpiece** in Unity: razor-sharp, gorgeous, emotional and scientifically real. A player should launch it and feel they're standing on another world. It's the "Ultra" version of the same game the Web edition delivers (Section 0A), built from the same shared design. You have ~27 hours and must not miss: set up fast, build in playable increments, test constantly, never leave the project broken, and always have a working build.

---

## 0. HARD FACTS (verified from the official guides — do not contradict them)

**Event / team**
- Event: **Universal Event** (virtual). Team: PlutonyX, 5 members, all in Uzbekistan. Team Owner's local time = **Asia/Tashkent (UTC+5)**.
- **Deadline: "Submit for Judging" must be clicked before Sunday, Nov 15, 2026, 11:59 PM Tashkent time.** Anything saved after that is not judged. Treat **8:00 PM Nov 15** as our internal hard deadline.
- Challenge: **"Build a Junior Astronaut Mission Trainer."**
- **Two editions, one game** (see Section 0A): a **Web edition** (built by the Team Owner) and a **Desktop Ultra edition** in Unity (built by a teammate). Judges must experience them as ONE project.

**Submission page fields (all required, all in English)**
1. Project Name
2. High-Level Project Summary — what we built, how it answers the challenge, why it matters
3. Link to Project Demo — **either a video of 30 seconds or less, OR a slide deck of 7 slides max (including title and intro).** Exceeding either limit = **not eligible for Global Judging.** Hosted externally (YouTube/Drive/GitHub), public, no login.
4. Link to Final Project — public, no password/permission/registration
5. Detailed Project Description — what it does, how it works, benefits, goals, tools/languages used
6. Use of Super Intelligence (SI) — how SI tools were used (data-collection only, but judges see any SI markers in the project)
7. NASA Data — **at least one NASA data source/resource is required for Global Award eligibility**
8. Space Agency Partner Data and Other References — list **every** resource used: code, libraries, text, images, fonts, sounds, even open-source/free ones
- Images can be pasted on the page (JPG/PNG/GIF ≤10 MB). Videos/docs must be links.
- Two checkboxes: Terms & Conditions, and "all work is original and every external resource is listed in References; no copyrighted material without permission."

**Content rules**
- **SI is allowed** as a tool to accelerate work, but **SI must not be what comes up with the team's idea for solving the challenge.** The core concept comes from the team (Section 2). You execute and refine it.
- SI-generated content **must not use or modify NASA branding** — no NASA logos, "meatball"/"worm", flags, or mission insignia anywhere in the game, demo or slides.
- SI disclosure: SI-generated **images/video need a visible watermark**; SI-generated **code, data and audio must be acknowledged in descriptive text and metadata** (README, in-game credits, file headers).
- **No images, video, voice or likeness of anyone under 18** in the demo or project. Some team members may be minors → no faces, no voices of minors; use captions/text, a synthesized or adult narrator, or no narration.
- English everywhere. A video may be in another language only if it has English subtitles; slides must be English.
- Partner-agency data is encouraged (e.g., CSA's food-production-on-the-Moon toolkit for this challenge).

**Judging (each scored 1–5, at Universal Event then Global level)**
- **Impact** — real problem, broad reach, inspires
- **Creativity** — original, fresh mechanic, not a reskinned template
- **Validity** — scientifically sound, feasible, complete, **usable and user-friendly**
- **Relevance** — fully answers *this* challenge; **NASA data is a core component, not decoration**
- **Presentation** — clear, engaging storytelling in demo + full project (judges say teams under-invest here — we won't)
- Global awards we are specifically aiming at: **Best Use of Data, Best Storytelling, Art & Technology, Most Inspirational, Best Use of Science.**
- Timeline after hackathon: Global Nominees Dec 3, Finalists Dec 17, Winners Jan 26, 2027.

---

## 0A. TWO EDITIONS, ONE GAME — HOW THE TEAM IS SPLIT

- **Web edition** (Team Owner, 1 Claude Pro account): Three.js in the browser. This is the **"Link to Final Project"** judges open first. It also owns the **submission texts, the demo and the final checklist**.
- **Desktop Ultra edition** (teammate, Unity + Blender, 2 Claude Pro accounts): an installable Windows (and if possible macOS) build with maximum fidelity. Offered as a download from the website, README and Detailed Description.
- **Same game, not two games:** same concept (Section 2), story, crew, events, endings, real-data mechanics, balance numbers, art direction and name. Judges must instantly see they're the same experience, with the desktop being the "Ultra" version. Anything judged (mechanics, data, endings, story) must exist in the **Web edition**. Desktop extras are only fidelity, immersion and bonus features.

**Repository (already created):** https://github.com/Darkcursader/plutonyx (public; owner: Darkcursader = Team Owner/Web lead; collaborator: isatpr3p-droid = Desktop builder, who must accept the email invite). Clone it, work inside it, and set up git authentication on first push (Git Credential Manager browser login or `gh auth login`). The team is new to GitHub: do all git work for them and explain any step they must click in one plain sentence.

**Monorepo layout:**
```
/web        → Web edition (Three.js). Only the web builder edits it.
/desktop    → Unity project (+ /desktop/blender source files). Only the desktop builder edits it.
/shared     → the single source of truth both editions read
   GAME_BIBLE.md   concept, world, crew, tone, full mission structure, trade-off matrix, endings and their conditions
   style-guide.md  palette, typography, UI/HUD style, logo/wordmark, camera language, crew character sheets
   design/*.json   events.json, endings.json, crew.json, dialogue.json, balance.json, achievements.json (same schema for both engines)
   data/           archived real NASA data snapshots + SOURCES.md (URL, date retrieved, fields)
   scripts/        data-fetch scripts
   art/            SI-generated portraits/postcards (watermarked) + SI_LOG.md
   science-log.md  the dataset → mechanic explanations shown in-game
   references.md   master References list (every dataset, model, texture, library, font, sound, SI tool)
   CHANGELOG.md    one line per change to /shared, so the other edition can sync
/docs       → submission texts, demo script/deck, checklist (owned by the Web lead)
```
- **Phase 1 order:** the Web builder writes `shared/GAME_BIBLE.md`, `style-guide.md` and the JSON schemas + first content in the **first ~90 minutes**. Meanwhile the Desktop builder installs Unity/Blender/MCPs and builds the terrain + asset pipeline. After that, either side may improve `/shared` with small commits plus a CHANGELOG line. Never silently change balance or ending conditions.
- Both engines load the **same JSON** at runtime (web: import/fetch; Unity: copied into `StreamingAssets` by an editor script/build step). If the two simulations ever disagree, `shared/design/balance.json` + `GAME_BIBLE.md` win.
- **Sync checkpoints (Tashkent time):** Sat 19:00, Sun 09:00, Sun 15:00. Quick call: compare builds side by side, align names, text and look, update CHANGELOG.
- The Team Owner submits. The Desktop build must be released by **Sun 17:00** so its link goes into the submission.

---

## 1. THE CHALLENGE (what the judges will hold us to)

Build an interactive game or app that lets **kids ages 7–12** manage a **lunar or Martian outpost**, making real decisions about **life support, radiation shielding, power budgeting, food production, and communication delay**, and experiencing how those choices play out over a simulated mission. A young player must walk away **understanding a real constraint of deep-space survival**, not just having played a fun game.

What the challenge authors explicitly reward:
- **Every choice costs something.** No "safe" option. "A choice that saves power today might cost oxygen tomorrow."
- **2–3 core resources visible at once** (e.g., life support, power, shielding). Don't overwhelm with 5–6 meters. Other systems (food, comms delay) can appear as events/modifiers rather than permanent bars.
- **Real NASA data, not invented numbers** — and **attributed inside the tool** so players know it's real science.
- **Link in-game decisions to real-world consequences** — e.g., a shielding decision tied to *actual* current space-weather data.
- **Replayability** — events and conditions vary between runs; failure teaches without feeling punishing.
- **Plain language** — explain unavoidable terms (radiation dose, microgravity, sol) in context.
- **Low barrier to entry**: the challenge explicitly says a browser-playable experience with no download or account reaches more people during judging. That's why the Web edition is the judges' primary link, and the Desktop edition is an optional premium download.
- **Honesty**: if data is a curated snapshot, say so; **never present static data as live.**
- **Mechanics over polish** — but we want both.
- A short **"which NASA datasets we used and why"** explanation so judges can trace the science.

---

## 2. TEAM CONCEPT (decided by Team PlutonyX — build around this, do not replace it)

> Team answers, written up for you. Items marked *(team-selected draft)* are wording/options the team reviewed and chose. Implement them, and suggest improvements only as clearly labeled suggestions.

- **World:** **Mars.** Site: **Jezero Crater** (an ancient lake delta explored by the Perseverance rover; real Mars Trek terrain/imagery available). The team chose Mars because it's a whole planet to explore and the big next step for humans.
- **Working title:** TBD by the team at the end. Use a placeholder name in a single config value so it can be swapped everywhere at once.
- **Hook** *(team-selected draft)*: "Keep your crew alive on Mars, where every choice costs something precious and the real Sun decides how hard it gets."
- **Resources (the team wants all of the challenge's systems, structured so kids aren't overwhelmed):**
  - 3 core, always-relevant systems: **Air / life support**, **Power**, **Radiation shielding**
  - slower supplies that create long-term consequences: **Food (greenhouse)** and **Water**
  - **Communication delay with Earth** as a story/drama mechanic, not a meter
- **The hardest choice (team wants an *Interstellar*-level dilemma; kid-safe, no graphic harm)** *(team-selected draft)*: a **real solar storm** (from DONKI data) is coming. The shelter can only be fully powered if you shut down the greenhouse. Save the crew's health tonight, and you lose the plants that would feed them for the rest of the mission, including the botanist's life's work. At the same time a crewmate is out at the delta with a priceless sample. Do you spend power and time bringing them back early (and lose the sample), or trust them to make it? Earth's advice arrives too late to help (comms delay), so the player decides alone.
- **Failure must cost something precious, and victory must give hope (emotional core):** mistakes lose things the player has come to care about: the greenhouse plants the crew nurtured, a crewmate's health (they're evacuated or sent home, never killed on screen), the sample that could answer humanity's biggest question, a message from home that never arrives. The debrief explains the real science of what went wrong. Victory ends on hope: the crew home safe or the outpost thriving, the sample on its way to Earth, and a look toward the future of humans on Mars. Endings should be able to make players emotional.
- **Format:** a **mix**: an atmospheric, cinematic 3D survival experience with story choices. **No dashboard stuck on screen.** Information is mostly **diegetic**: shown on screens inside the habitat, a wrist device, holographic panels and the environment itself (dimming lights = low power, frost = failing heat, Geiger crackle = radiation). A minimal HUD appears only when needed.
- **Quality & feel references (from the team):** the polish, balance and atmosphere of **Alien Isolation** (tension, immersion, every system feels real) and **Souls-like** design (challenging, learn from failure, mastery feels earned, the world tells the story). Keep it kid-appropriate for 7–12: tension and awe, **no horror, no gore, no jump-scares**. "Cadet" difficulty keeps it fair for younger players; "Commander" brings the Souls-like challenge for teens and adults.
- **Tone:** emotional, cinematic, hopeful underneath the danger.
- **Mystery / story question** *(team-selected draft)*: the crew is at Jezero to retrieve a rock sample that may contain signs of ancient life (ground it in real Perseverance science, e.g. the "Cheyava Falls" rock, and verify the facts from NASA sources before using them). "Are we alone?" runs through the whole mission, and every risk to go after the sample is weighed against crew safety. Endings resolve it honestly: the sample *might* hold the answer and it goes to scientists on Earth. Never claim life was found.

---

## 3. NASA DATA — USE IT AS A CORE MECHANIC

Official resources listed on the challenge page:

| Source | What it gives | URL |
|---|---|---|
| NASA Open APIs | Gateway; free API key (DEMO_KEY works but is rate-limited — the team should request a free key at api.nasa.gov) | https://api.nasa.gov/ |
| DONKI (Space Weather) | Real solar flares (FLR), CMEs, solar energetic particle events (SEP), geomagnetic storms (GST), notifications | https://ccmc.gsfc.nasa.gov/tools/DONKI/ · API via `https://api.nasa.gov/DONKI/{FLR,CME,SEP,GST,notifications}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=KEY` |
| OSDR (Open Science Data Repository) | Space biology & astronaut health studies (bone, muscle, immune, sleep, plants) — searchable | https://osdr.nasa.gov/ |
| RadLab (OSDR radiation dosimetry) | Real measured dose rates (μGy/h, μSv/h) from ISS and other instruments; GET API with `format=json` | https://visualization.osdr.nasa.gov/radlab/api/ (docs: https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| Mars Trek | Real Mars imagery, elevation, terrain for a real outpost site | https://trek.nasa.gov/mars/ |
| CSA (partner) | STEM youth resources; **Food production on the Moon** toolkit | https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/ |

Requirements for how data enters the game:
1. **At least two NASA sources must drive mechanics**, not just appear on an info screen. Strong default: **DONKI** drives the space-weather/radiation event deck (real flare classes, real CME dates → storm warnings the player must react to), and **RadLab** sets realistic dose-rate baselines so shielding choices map to real μSv numbers (translated for kids, e.g. "this storm = X chest X-rays"). Use OSDR findings for health consequences (bone/muscle loss, plant growth) and Mars Trek/Artemis data for the site. Use CSA's food-production material for the greenhouse mechanic.
2. **Two data modes, clearly labeled in the UI:**
   - **LIVE** — fetch recent DONKI events at startup (api.nasa.gov supports direct requests from browsers and apps). Show a badge: "Live NASA space weather · fetched <time>".
   - **ARCHIVED** — a curated real snapshot stored in `shared/data/*.json`, produced by a script in `shared/scripts` that pulls from DONKI and RadLab and records source URL + retrieval date. Badge: "Real NASA data from <date range> (archived)". Automatic fallback when offline, rate-limited, or the API is down. The game must be fully playable in this mode.
   - Optional "Replay history" mode: play a mission during a real historic event (e.g., a major real solar storm) using its actual DONKI record.
3. **In-game attribution**: every data-driven event shows a small "Real data" chip that opens a kid-friendly card: what happened, the real number, source name, link, date.
4. **"Mission Science Log" screen** (and README section): each dataset, why we used it, how it maps to a mechanic, and any simplifications we made. This is what wins Validity and Best Use of Data.
5. **Every factual number in the game must be traceable** to a source listed in References. Verify figures (Moon ↔ Earth light delay, Mars ↔ Earth light delay range, sol length, surface radiation levels, oxygen/water/food needs per crew member, solar panel output vs. dust/night, etc.) against NASA pages before using them. If you can't verify a number, don't use it — or label it as a game simplification.

---

## 4. DESIGN QUALITY BAR

**Core loop** — short sols/turns (a full mission in ~8–12 minutes), each turn: read situation → allocate limited power/crew/time → see consequences unfold → learn why. Consequences compound over turns (delayed effects are the lesson).

**Trade-offs** — design a trade-off matrix before coding: every action raises at least one thing and lowers another. Include communication delay as a real mechanic (e.g., on Mars, asking Mission Control for help means the answer arrives turns later — so the crew must decide alone).

**Kid-first UX (ages 7–12)**
- Reading level ~grade 3–5; short sentences; icons + words; big touch targets (≥48px); keyboard (and, on desktop, gamepad) playable. The Web edition must also work on tablets and Chromebooks (the real classroom devices).
- First minute: an interactive tutorial by doing, not a wall of text. Optional read-aloud narration (text-to-speech).
- Failure = "Mission debrief": what went wrong, the real science behind it, one tip, "Try again" with a different random event deck. Celebrate partial success. No harsh game-over screens.
- Difficulty modes: Cadet (7–9), Commander (10–12), and a Classroom/Teacher mode with a one-page lesson guide and discussion questions (extends reach → Impact).
- Accessibility: color-blind-safe palette (never color alone), high contrast, scalable text, reduced-motion option, captions for any audio.

**Replayability** — seeded randomness, real-event deck drawn from the data, multiple sites or crew traits, end-of-mission stats and badges.

**Look & sound** — see Section 4A. Sound effects/music generated in code (Web Audio) or from clearly licensed sources listed in References. **No NASA logos/insignia, no existing characters, no copyrighted music/images.**

---

## 4A. VISUALS: AAA-CINEMATIC, RAZOR-SHARP, NO COMPROMISES

The team's bar: "it should look like 8K and people should be amazed." No geometric placeholder look, no blur, no pixelation, no cheap UI. The first 3 seconds must make an adult say "wow."

**Rendering stack: Unity 6 LTS + HDRP (High Definition Render Pipeline)**
- Physically Based Sky (configured for the real site: Mars dusty-butterscotch day and **blue sunset**; Moon black sky, harsh unfiltered sun, Earth overhead), Volumetric Fog/Clouds for dust storms, exposure set by physical camera, ACES tonemapping, a color-grading LUT per site and per ending.
- Lighting: real sun direction for the site and time of day, high-resolution cascaded shadows, contact shadows, SSAO, screen-space GI/reflections on Ultra (ray tracing only if the dev GPU supports it **and** it's optional), emissive habitat lights + light probes/APVs at night.
- **Anti-aliasing:** TAA (sharpening tuned so nothing smears) or SMAA. Render at **native resolution**; never use dynamic-resolution downscaling below 100%. Motion blur off in gameplay. Depth-of-field only in cutscenes/photo mode.
- **Textures:** 4K–8K on hero assets (terrain close-ups, habitat, rover, suits, sky/planets), 2K minimum elsewhere, with detail maps (tiled high-res regolith/rock normal + roughness) so close-ups never go soft. Trilinear/anisotropic 16x. Use texture streaming/mipmap streaming so VRAM stays sane.
- **VFX Graph:** dust storms (millions of particles), solar-particle streaks during radiation events, aurora-like shield shimmer, greenhouse grow-light haze, footprint dust puffs, rover wheel dust.
- **Cinemachine + Timeline:** authored cinematic shots for the intro, storms and every ending; letterbox; smooth eased camera moves; Unity Recorder for 4K captures for the demo.
- **UI:** UI Toolkit or uGUI + TextMeshPro with SDF fonts and vector-style icons, scaled for 1080p → 4K with no blurry raster UI. Premium sci-fi HUD: glass panels, crisp type, micro-animations, diegetic screens inside the habitat where possible.

**Real NASA assets = high detail AND real data (core of Relevance / Best Use of Data):**
- **Terrain:** the outpost site is built from **real elevation + imagery** (Mars Trek DEM + orthoimagery for Mars; LRO-based lunar DEM/texture for the Moon, e.g. Moon Trek / CGI Moon Kit). Convert the DEM to a 16-bit RAW heightmap → Unity Terrain (or a Blender-built mesh with LODs), the real orthoimage as the base color, plus detail layers. On-screen caption: "This is the real terrain of <site>, from NASA <mission/instrument> data."
- **Hardware & props:** NASA 3D Resources models (https://science.nasa.gov/3d-resources/, mirror https://github.com/nasa/NASA-3D-Resources), free to use under the NASA Images and Media Usage Guidelines: credit NASA, imply no endorsement, **remove any NASA insignia/logo textures.** Clean them in Blender (scale, pivots, materials → HDRP Lit, LODs).
- **Poly Haven (CC0)** via Blender MCP for HDRIs, rock/sand/metal PBR textures and props. Credit them anyway.
- Sketchfab or Unity Asset Store models only if the license allows use in a free game (CC0/CC-BY or Asset Store EULA), with credit, and no logos/branding. Record each one in `shared/references.md`.
- **AI-generated 3D models** (e.g. Hyper3D/Hunyuan3D through Blender MCP) are SI-generated: allowed only for decorative props, never for anything presented as real NASA hardware or data. Log in `shared/art/SI_LOG.md` and acknowledge in Credits + asset metadata.

**Signature moments (each must be breathtaking):**
1. Launch: cinematic flyover of the real terrain at sunrise, habitat lights flickering on, title reveal.
2. Radiation storm: sky tint, particle streaks, alarms, crew rushing to the shielded shelter, shield domes powering up, Geiger crackle.
3. Dust storm (Mars) / lunar night (Moon): visibility collapses, solar panels visibly dim, power meter drops in real time.
4. Greenhouse: plants grow over sols under pink-purple grow lights.
5. Every ending: its own authored Timeline cinematic.

**Quality presets (judges may run it on ordinary laptops):** Ultra (dedicated GPU), High, Medium, Low. **Low must still look premium** at 1080p and hold ≥30 fps on an integrated-GPU laptop (Intel Iris Xe class): disable volumetrics/SSGI/RT, lower shadow cascades, keep native resolution and sharp textures. Auto-detect a sensible default on first launch. Test every preset.

**Quality gate before every build:** capture 4K screenshots of the title, gameplay, a storm and an ending. Inspect them zoomed in. Anything blurry, smeared, pixelated, aliased or low-res gets fixed before moving on.

**AI-generated art and video (allowed, under the rules):** crew portraits, ending postcards, short cinematic clips, concept art. **Every SI image/video carries a visible watermark** (a reusable UI overlay/shader for in-game display). Log everything in `shared/art/SI_LOG.md`. No NASA insignia, no real people, no children's likenesses, no existing franchises. Real data/terrain is never AI-faked. You can't generate images/video yourself. Use the shared `PROMPTS.md`/style guide, and design the game to look stunning before those assets arrive.

**Make it feel like a real installed game:** a proper main menu over the live scene, settings (quality preset, resolution, fullscreen/borderless, V-sync, FPS cap, volume mixer, subtitles, text size, color-blind mode, reduced motion, key rebinding if time allows), save/continue, **gamepad support** (Input System) with matching button prompts, **photo mode** (free camera, DoF, filters, hide HUD), adaptive music + 3D spatial audio (Audio Mixer snapshots for calm → danger), achievements screen, ending gallery, and a credits roll.

---

## 4B. MAKE IT UNFORGETTABLE: STORY, ENDINGS, AND SURPRISES FOR ADULTS

The game must be fun enough that a parent standing behind the kid says "wait, let me try." Layer it so it's simple at the surface and deep underneath.

> These are **options for the team to choose from** (the concept stays theirs, Section 2). Implement the ones the team picks; if they say "all of them," prioritize in the order listed.

**1. Multiple endings (required — at least 5, plus 1 secret).** Endings come from the *combination* of choices across the whole mission, not from a single final button. Track a few hidden values (crew health, science gathered, risk taken, how you treated the crew/Earth messages, greenhouse success). Example ending families to adapt to the team's concept:
   - **Full Success**: mission complete, crew healthy, major discovery.
   - **Bittersweet**: crew safe, but science sacrificed (teaches that safety can cost discovery).
   - **The Gamble Paid Off**: risky science choices worked, with a debrief that explains how close it was.
   - **Emergency Evacuation**: the mission ends early, crew saved. Not a "loss"; it's framed as what real mission rules would require.
   - **Green Outpost**: the greenhouse makes the base self-sufficient (ties in the CSA food-production data).
   - **Secret ending**: unlocked by a hidden condition (e.g. surviving the real historic storm with no shielding failures, or decoding a delayed message from Earth).
   Each ending gets a cinematic shot, an illustrated "mission postcard", a narrated epilogue, and **"The real science behind your ending"** with real data and the source. Show an **ending gallery** with locked silhouettes so players want to replay to collect them all.

**2. The reveal twist: "It really happened."** Missions can secretly run on a **real historical space-weather timeline from DONKI** (for example, the major solar storm of May 2024; verify the exact dates and event classes from DONKI before using them). At the end: *"Every solar flare you just survived really happened. On <date>, the Sun released <real event>. Here's what it would have meant for a real crew."* That's the moment that surprises adults and wins Storytelling and Best Use of Data.

**3. "Right now on the Sun."** The title screen shows a live DONKI readout: "Today's space weather: <calm / active / storm>". Players can choose **"Play today's real sky"**: a mission seeded by the actual last 30 days of solar activity, so the game is different every day because the Sun is.

**4. Communication delay as drama, not a stat.** Messages from Earth arrive after the real light-travel delay, scaled to game time (Moon ≈ seconds, Mars = minutes; verify the figures). The player sends a question, faces the next crisis alone, and only then gets Mission Control's answer — sometimes too late. Show a pulsing signal traveling across a mini solar-system map.

**5. A crew with personalities.** 3–4 original characters with distinct voices, strengths and small story arcs (e.g. the botanist who names every plant). Choices affect morale. Short dialogue moments make kids care about the trade-offs: "If we turn off the greenhouse lights to save power, Ana's tomatoes won't make it."

**6. Moral dilemmas with no clean answer.** Kid-safe but real: send the rover to rescue a stuck science instrument during a storm warning? Share power with a neighboring outpost's distress call? Adults will argue about these.

**7. Depth for adults: "Mission Planner" mode.** The same game, with real units on screen (μSv/day, kWh, kg O₂), graphs of how resources evolved, and a post-mission chart of the player's run against the real data. Kids get simple meters and icons; adults get the engineering view.

**8. Replay hooks.** Seeded random event decks, unlockable sites (each built from real terrain), achievements tied to real science ("Survived a real X-class flare"), and a shareable end-of-mission card (image + seed code, so friends can play the same mission). The card must not include personal data.

**9. Sound design.** An adaptive soundtrack that tenses up as risk rises. Real NASA sounds where usable (NASA publishes public-domain audio; credit it), plus code-generated ambience. Optional narrator via text-to-speech. **No voices of minors.**

**10. The first 60 seconds decide everything.** Cinematic intro (≤20 s, skippable), then the player makes their first meaningful trade-off within 30 seconds of pressing Play. No menus to wade through first.

**Fun is non-negotiable, and so is science.** Playtest balance by simulating many runs. Every ending must be reachable, no single strategy can always win, and every outcome must be explainable with real science.

---

## 4D. ENGAGEMENT DESIGN: NOBODY GETS BORED, ADULTS INCLUDED

The team's bar: adults must be surprised, excited and satisfied, and want "one more sol." Treat boredom as a bug. Design and playtest for these rules:

- **Tension curve, not flat difficulty:** every mission follows calm → rising pressure → crisis → relief → bigger crisis → climax → ending. Plan it explicitly in the Game Bible as a beat sheet with timestamps for a ~15–20 minute mission.
- **A meaningful decision every 30–60 seconds.** No dead time: no waiting longer than ~3 s without something to look at or decide, all text skippable, fast-forward for quiet sols.
- **A story question from minute one:** an open question the player wants answered (something strange in the data, a message from Earth that arrives incomplete, a crew secret). It's built from the team's concept and resolved in the endings, and its answer must stay scientifically honest.
- **Surprise is scheduled:** at least 3 "I didn't see that coming" moments per mission (a cascading failure, a real-data reveal, a crew decision against your orders, a twist in the delayed message). Vary them across replays.
- **Systems that interact:** the depth adults enjoy comes from emergent consequences. Power affects heat affects plants affects morale. Show these chains visually ("because you dimmed the greenhouse 2 sols ago…").
- **Stakes the player feels:** named crew with faces and voices (adult/synthetic voices only), consequences that persist, close calls shown dramatically, and wins celebrated with spectacle.
- **Juice and feedback:** every action has satisfying sound, animation and camera response. Meters move smoothly, alarms escalate, the habitat visibly reacts.
- **Mastery and curiosity:** a hidden depth layer (Mission Planner stats, achievements tied to real science, locked endings, a secret ending) plus a post-mission timeline showing the turning points of your run and "what if you had…" hints. These make adults replay.
- **Respect the player's time:** a full mission is completable in one sitting, a quick-start skips the tutorial for returning players, and failure restarts in seconds with a different event deck.
- **Playtest check (do it, don't assume):** before Phase 5, have at least 2 adults and (if possible) 2 kids play without help. Note where anyone looks away, hesitates or gets bored, and fix those spots first. Record the findings in HANDOFF.md.

---

## 4C. ENGINE, TOOLS & SETUP (decided — don't re-debate)

**Install immediately (downloads take time; start them before anything else):**
1. **Unity Hub → Unity 6 LTS** with **Windows Build Support** (+ **Mac Build Support (Mono)** if you want a macOS build), new project from the **HDRP template** in `plutonyx/desktop/`. (Unity Personal is free.)
2. **Blender** (latest stable) + **Python 3.10+** and **uv**.
3. **MCP for Unity** (CoplayDev/unity-mcp): in Unity → Window → Package Manager → + → "Add package from git URL" → `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity`, then use its window to auto-configure Claude Code. It lets you create/modify scenes, GameObjects, materials and assets, read the console and run tests.
4. **Blender MCP** (ahujasid/blender-mcp): install its `addon.py` in Blender (Edit → Preferences → Add-ons), click "Connect to Claude" in the sidebar, and register it in Claude Code with `claude mcp add blender uvx blender-mcp`. It includes Poly Haven (CC0 assets) and viewport screenshots.
5. Unity packages: **glTFast** (import GLB), **Cinemachine**, **Timeline**, **Visual Effect Graph**, **Input System**, **Unity Recorder**, **Unity Test Framework**, TextMeshPro/UI Toolkit.

If an MCP won't connect within ~20 minutes, stop fighting it. Write C# editor scripts / Blender Python scripts directly and keep going. Never block the build on tooling.

**Division of labor between tools:**
- **Claude Code + C# files:** all gameplay, simulation, data, UI logic, editor automation scripts.
- **MCP for Unity:** scene assembly, prefab/material setup, lighting/volume profiles, reading console errors, running tests and builds.
- **Blender MCP:** NASA model cleanup (remove insignia, decimate, LODs, UVs), the habitat/outpost kit, terrain mesh from the DEM if not using Unity Terrain, baking AO, Poly Haven assets, high-res stills.

**Architecture:**
- **Simulation = plain C# classes** (no MonoBehaviour), driven by `shared/design/*.json` copied into `StreamingAssets/design` by an editor script on build. Unit tests with Unity Test Framework for resource math, ending conditions and balance. Must match the Web edition's behavior; the shared JSON + GAME_BIBLE win any disagreement.
- **Data:** `UnityWebRequest` to DONKI at startup (short timeout) → LIVE badge; fallback to `StreamingAssets/data` (copied from `shared/data`) → ARCHIVED badge. Same attribution cards and Science Log content as the Web edition (from `shared/science-log.md`).
- Scenes: Boot/Loader → MainMenu (live scene behind) → Mission → Ending cinematics → Credits. Additive loading so transitions are seamless.
- Keep the project folder lean: large source files (Blender .blend, raw DEMs) in `/desktop/source` via Git LFS or kept out of git with download instructions. Never commit `Library/`, `Temp/`, `Build/`, `Logs/` (proper Unity `.gitignore`).

---

## 5. BUILD, RELEASE & DISTRIBUTION

- **Primary target: Windows x64** standalone (Mono backend for fast iteration; IL2CPP only if time allows and it's stable). **Secondary: macOS** (Universal or Intel/Apple Silicon) if the Mac build module works. It's unsigned, so document how to open it.
- Ship as a **portable ZIP** (unzip → run `PlutonyX.exe`), which is the most judge-friendly. Optional: an Inno Setup installer. Keep each release file **under 2 GB** (GitHub Release asset limit); target well under 1.5 GB using texture compression (BC7), streaming, and no unused assets.
- Publish on **GitHub Releases** of the `plutonyx` repo (tag `v1.0-desktop`), and optionally also on **itch.io** (free, judges can download without an account). Include: file size, SHA-256 checksum, minimum/recommended specs, and **"Unsigned hackathon build — Windows: More info → Run anyway; macOS: right-click → Open."**
- First launch: no admin rights required, no internet required (archived data bundled), launches into the cinematic in < 15 s on an SSD.
- Test the built player (not just the editor) on: the dev machine, an integrated-GPU laptop, a 1080p and a 4K/high-DPI display, keyboard+mouse and gamepad. Zero errors in `Player.log`.
- Version and date shown in the main menu, plus a "Play the Web edition" link (from config).

**`/desktop/README.md`:** what the Ultra edition adds, download links, system requirements, controls, how to build from source, assets & credits, SI disclosure. Header comment in C# files: "Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX."

---

## 6. DELIVERABLES YOU MUST PRODUCE (Desktop builder)

1. **Released, tested Windows build** (+ macOS if possible) on GitHub Releases (and itch.io optionally), links working logged-out, **by Sun 17:00 Tashkent**. Send the link to the Web lead immediately.
2. `/desktop` Unity project committed (clean `.gitignore`), with `/desktop/README.md`.
3. **4K cinematic captures** (Unity Recorder) of the intro, a storm, the greenhouse and 2–3 endings, delivered to the Web lead **by Sun 14:00** for the 30-second demo. Gameplay only; no faces/voices of minors.
4. 4–6 gorgeous **4K screenshots** (≤10 MB each as PNG/JPG) for the project page.
5. Every asset you used added to `shared/references.md` (source, license, credit) and every SI asset to `shared/art/SI_LOG.md`.
6. A short **"Desktop Ultra edition"** paragraph for the Detailed Description + an SI-use paragraph for your part, in `/docs/desktop-notes.md`.

---

## 7. SCHEDULE (Tashkent time; adjust to when you actually start)

- **Phase 0 (≤1.5 h, starts now):** installs (Section 4C), Unity HDRP project, MCPs connected, git set up. Meanwhile download NASA terrain (DEM + orthoimage) for the team's site and the NASA 3D models needed.
- **Phase 1 (≈2 h):** Real terrain in Unity with the Physically Based Sky + sun + post-processing looking stunning; habitat kit from cleaned NASA models; first cinematic camera shot. Pull `shared/` as soon as the Web lead pushes the Game Bible + JSON.
- **Phase 2 (≈6 h):** Vertical slice: simulation reading the shared JSON, one full mission, core loop, HUD, at least 2 endings with cinematics, debrief, data LIVE/ARCHIVED. **Make a first Windows build tonight**, then rebuild after every phase.
- **Phase 3 (≈7 h):** All events, real-data mechanics, historical-storm twist, comms delay, crew, all endings + gallery, tutorial, menus/settings, save/continue, gamepad.
- **Phase 4 (≈6 h):** Signature VFX moments, Timeline cinematics for every ending, adaptive audio, photo mode, quality presets tested on weak hardware, AI art integration (watermarked), polish passes with the quality gate.
- **Phase 5 (≈3 h):** 4K captures for the demo (by Sun 14:00), final builds, release with checksums (by Sun 17:00), README, references, SI log.

If time runs short, cut in this order: macOS build → photo mode → key rebinding → AI video clips → extra endings beyond 5 → crew side-arcs → ray tracing. Never cut: the breathtaking main scene, real-data mechanics, the "it really happened" reveal, attribution, debrief learning, a working released Windows build.

---

## 7A. SESSION HANDOFF: WORK SO A FRESH CLAUDE CAN CONTINUE INSTANTLY

Work will be split across several Claude sessions (usage limits reset, and some builders switch between Claude accounts on the same laptop). Whenever a session ends, a brand-new Claude session (no memory of this conversation) takes over. It must be able to resume in minutes, without re-reading the whole codebase. You are responsible for making that possible. Do it from the very first step:

1. **Save this brief:** at the start, save this entire prompt verbatim to `<your edition folder>/docs/BRIEF.md` (with Section 2 filled in). Never edit it except to record team decisions in a "Decisions" appendix at the bottom.

2. **`CLAUDE.md` in your edition's folder (`web/` or `desktop/`; open Claude Code there)** (Claude Code loads this automatically at the start of every session). Keep it **short (≤80 lines)**:
   - One-paragraph project summary + **deadline: Submit for Judging before Sun Nov 15, 2026, 11:59 PM Tashkent (internal target 8 PM)**
   - "Read `desktop/docs/HANDOFF.md` first, then only the files it points to. Do not scan the whole repo."
   - Tech stack, how to run, build and release, live URL, repo URL
   - Folder map (one line per top-level folder/key file and what it does)
   - Non-negotiable rules in brief: real data only and attributed, SI watermark/disclosure, no NASA insignia, no minors' likeness, quality gate (sharp, cinematic), English only

3. **`desktop/docs/HANDOFF.md`, the living "where we left off" file.** Rewrite it (don't just append) **after every completed task, before every commit, and immediately whenever you sense the session may end** (long session, usage warnings, or the team says "switching accounts"). Sections:
   - **Last updated:** timestamp (Tashkent time) + which phase
   - **State right now:** what works, what's deployed, what's broken (be blunt)
   - **In progress:** the exact task, the file(s) and function(s) involved, and what's half-done
   - **Next 3 steps:** concrete and ordered, specific enough to start coding immediately
   - **Known bugs / gotchas:** anything that wasted time, so the next session doesn't repeat it
   - **Waiting on team:** assets, answers, decisions
   - **Do NOT redo:** finished items that must not be rebuilt or refactored

4. **`desktop/docs/PROGRESS.md`:** a checklist of every feature and deliverable from this brief (phases, endings, data sources, visual moments, demo, submission texts), ticked as they're done. A new session sees remaining work at a glance.

5. **`desktop/docs/DECISIONS.md`:** short log of design/architecture decisions with one-line reasons (e.g. "Chose Mars, Jezero crater: real Mars Trek DEM available"), so the next session doesn't re-debate them.

6. **Git as the safety net:** commit after every working step with clear messages (`feat: dust storm event + panel dimming`). Never leave uncommitted work at the end of a reply. If something is mid-way and broken, commit it to a branch and note it in HANDOFF.md, so `main` always runs and deploys.

7. **Keep files navigable:** small focused modules with clear names, a short header comment in each key file saying what it does, and the simulation/data/config separated from rendering. A newcomer should find anything from the folder map in CLAUDE.md alone.

8. **When you start as a continuing session** (you see `docs/HANDOFF.md` exists in your edition folder): read `CLAUDE.md` → `docs/HANDOFF.md` → `docs/PROGRESS.md` → `../shared/CHANGELOG.md` (latest entries only) → only the files named in "In progress / Next steps". Run the app to confirm its state. Then continue with step 1 of "Next 3 steps". Don't re-plan, refactor or re-read the whole project unless HANDOFF.md says something is broken in a way that requires it.

9. **Before every work block:** `git pull --rebase`, so you have the other edition's latest `shared/` changes. **After:** commit and push. Never edit the other edition's folder.

---

## 7B. "SCORE OF 5" CHECKLIST: SELF-GRADE AGAINST THE OFFICIAL RUBRIC

Judges score the **project as a whole** (both editions + demo) 1–5 per criterion at every level. Below is the official "score of 5" bar for each criterion and the features that prove we meet it. At the end of every phase, grade the project 1–5 on each, write the scores in `docs/HANDOFF.md`, and fix the lowest one first.

| Criterion | Official "5" bar (summarized) | How we prove it |
|---|---|---|
| **Impact** | Addresses a significant problem, extensive reach, inspires, benefits a large audience; quality far exceeds expectations | Free, no-login browser game that runs on school Chromebooks; Classroom/Teacher mode + lesson guide; Mission Planner mode for older players; shareable mission cards; README states the problem (kids rarely experience real mission trade-offs) and who benefits |
| **Creativity** | Groundbreaking, never-attempted approach that challenges conventional methods | "It really happened" reveal on real historical DONKI storms; "Play today's real sky" seeded by live solar data; comms delay as drama; multiple endings tied to real science; real NASA terrain as the game world |
| **Validity** | Scientifically sound, technically feasible, **fully developed**, highly usable and user-friendly | Every number traceable to a cited source; Science Log explaining model + simplifications; unit-tested simulation; no broken features; complete playable mission(s) with endings; tutorial, accessibility, quality presets, zero console errors |
| **Relevance** | Thoroughly engages the challenge; **NASA data integral**, providing meaningful insights; well-executed data use | Directly covers life support, radiation shielding, power, food, comms delay for ages 7–12 on a lunar/Martian outpost; DONKI + RadLab drive mechanics, OSDR drives health outcomes, Mars Trek/LRO is the terrain, CSA data drives the greenhouse; in-game attribution chips |
| **Presentation** | Well-structured, compelling, polished storytelling; judges use **both** demo and full project | Cinematic ≤30 s video (or ≤7 slides) with a clear arc: problem → game → real data → future; polished README with GIFs; strong project-page text; the game itself is a story |

If any score is below 4 at the end of Phase 4, spend Phase 5 time on that criterion before extra polish.

---

## 8. HOW TO WORK

- Before writing code, restate the plan in ≤15 lines; wait for the team's "go" only if Section 2 has gaps.
- Build in small verified steps; enter Play mode / run tests after every meaningful change; read the Unity console via MCP and fix errors immediately; keep `main` buildable.
- Make a real player build at least every few hours. The editor working is not proof.
- Self-review against the five judging criteria at the end of each phase and fix the weakest one first.
- Be honest: label simplifications; never fake "live" data; never present AI-generated content as real NASA imagery.
- Final answer: release links (+ checksums), screenshots, capture files, README, and notes for the submission.

Build the thing people will remember: when it launches, the room goes quiet. Every world in it is real NASA terrain, every number is real NASA data, and a 9-year-old and a NASA scientist both love it.
