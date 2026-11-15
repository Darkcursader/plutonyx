# HANDOFF — where we left off (rewrite this file, do not append)

**Last updated:** Sun 15 Nov 2026, ~09:00 Tashkent · **Ultra-realism pass (Part A) done · Part B capture done · Part C documents written**

## State right now

- **Works:** the full game, title to ending, on real NASA data. A scripted playthrough of all 10 sols (storm, reveal, debrief) ran with no errors. 7 unit tests pass; bots reach all 7 endings.
- **Looks:** hero-zone pass is in: scanned Poly Haven ground and rocks, NASA Perseverance model (logos stripped), sky-based image lighting, N8AO, rover tracks and footprints, dust accumulation tied to gameplay, dust-storm wall, launch dust at Mars gravity, film-poster title.
- **Deployed:** every push to `main` builds and publishes to the **`gh-pages` branch** (GitHub Actions, `.github/workflows/deploy.yml`). **The public URL still returns 404 until the repo owner switches GitHub Pages on** (Settings → Pages → Deploy from a branch → `gh-pages` / root). Check: `curl -I https://darkcursader.github.io/plutonyx/`.
- **Not done / honest gaps:**
  - No Blender bakes. Blender is installed at `D:\Tools\Blender` but unused; habitat, greenhouse, dish and crew rover are still procedural geometry (with normal maps, dust and AO).
  - No in-game video cutscenes. Cinematics are real-time (letterbox, captions, skippable). Recorded footage is used for the demo video only.
  - No SI portraits, postcards or voices (prompt pack is ready in `shared/art/PROMPTS.md`).
  - WebGPURenderer not attempted (WebGL 2 only). Low preset lowers effects, not a pre-rendered background.
  - Save/continue mid-mission is not implemented. Gamepad is implemented but untested on hardware.
  - Not tested on a real Chromebook, tablet, phone, Firefox or Safari. No playtest with kids or adults yet.

## In progress

Demo video: `node scripts/make-video.mjs` (from `web/`) builds `docs/demo/plutonyx-demo-30s.mp4` (29.8 s) from footage in `D:\PlutonyX-assets\cap\`. Re-record footage with `node scripts/capture.mjs` against a **built** site (`npx vite build && npx vite preview --port 4173`, then `CAPTURE_URL=http://localhost:4173/plutonyx/`). Do not edit source files while the dev server is being captured: it reloads the page.

## Next 3 steps

1. Confirm the public link works once Pages is switched on; play one mission on it in a private window.
2. Team: upload the demo video (YouTube **Public**), add member names to `README.md`, paste `docs/submission.md` fields, run `docs/checklist.md`.
3. If time remains (freeze 17:00): test Low preset on a weak laptop; add the Desktop download URL to `shared/design/game.json` → `links.desktopDownload` (the title button turns into a link automatically).

## Known bugs / gotchas

- Bash heredocs with back-ticks or `${` break in this shell: write patch scripts with the Write tool into `.cache/` and run them with node.
- The preview pane throttles animation when hidden, so screenshots can catch fades and day/night transitions half-way. Not a game bug.
- Playwright capture crashes Chromium on the Ultra preset at 1080p; use `q=high`.
- DONKI: use `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<TYPE>` (no key, CORS open, max 60 days). `api.nasa.gov/DONKI` returned 404 on 14 Nov.
- NASA Mars Fact Sheet gives mean surface gravity **3.73 m/s²** (the brief said 3.71); the game uses 3.73 and cites the fact sheet.
- gyan.dev ffmpeg download stalls; ffmpeg came from the BtbN GitHub builds → `D:\Tools\ffmpeg\bin`.
- C: drive is almost full. Keep caches on D: (`npm_config_cache=D:/npm-cache`, `PLAYWRIGHT_BROWSERS_PATH=D:/PlutonyX-assets/ms-playwright`).
- Vitest's balance test needs a long timeout on a busy machine (set to 120 s).

## Waiting on team

- **Switch on GitHub Pages** (one setting, see above).
- Team member names for the README.
- Final title (placeholder "PROJECT JEZERO" in `shared/design/game.json`).
- Desktop release URL by 17:00, and one sentence on SI use in the Unity edition.
- Upload of the demo video and the submission itself.

## Do NOT redo

- The simulation, balance and event/ending text. The space-weather archive and its calibration.
- The terrain pipeline (`scripts/build-terrain.mjs`) and asset pipeline (`fetch-assets.mjs`, `build-assets.mjs`, `strip-insignia.mjs`).
- The submission texts, README, lesson guide and checklist (edit, don't rewrite).

## Self-grade (honest)

Impact 4 · Creativity 4 · Validity 4 · Relevance 5 · Presentation 3–4. Weakest: Presentation (hardware models are still simple; no device testing, no playtest). Fix first: public link live + demo uploaded; then device test.
