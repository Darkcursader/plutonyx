# Desktop Ultra edition — notes for the submission (written by the Desktop builder)

## Paragraph for "Detailed Project Description"

**Desktop Ultra edition.** For players with a PC or Mac, the same game is also available as a free download built in
Unity 6 with the High Definition Render Pipeline. It reads the very same design files and the same archived NASA
records as the browser edition, so every mechanic, event and ending is identical. What it adds is the place itself:
the real terrain of Jezero Crater at true scale, built from NASA Mars Reconnaissance Orbiter Context Camera elevation
(20 m per pixel) and imagery (6 m per pixel), under a physically based Mars sky with butterscotch days, blue-tinted
sunsets and dust storms that visibly starve the solar panels. Players can also explore the outpost on foot in third
person and jump under the real gravity of Mars, and every ending shows the ascent ship actually launching. During the storm of Sol 8 a Geiger counter crackles
and the picture fills with white specks, as the Curiosity rover's cameras really did on 20 May 2024. The simulation
core is plain C# with no engine dependency; a command-line harness plays thousands of seeded missions with bot
strategies to check the balance and that the endings are reachable. Windows and macOS builds are portable ZIPs
(about 110 MB) that need no installer, account or internet connection.

## Paragraph for "Use of Super Intelligence (SI)" — desktop part

The Desktop Ultra edition was built by a team member working with an SI coding assistant (Claude). The SI tool wrote
most of the C# code, the Python data and terrain scripts and the build tooling under the team's direction, and
generated all sound effects and music procedurally in code. The team's concept, the shared game design and the choice
of NASA datasets came first; the SI tool implemented and tested them. Every source file carries a disclosure line,
and the README and in-game credits repeat it. The desktop edition contains no SI-generated images or video, and all
terrain and data shown as real are real NASA products, never SI-generated.

## Facts the Web lead may want

- Download link (goes in `shared/design/game.json → links.desktopDownload`): see the GitHub release `v1.0-desktop`.
- Tested: macOS build, full mission in autoplay, no runtime errors. **Windows build is cross-compiled and untested on real hardware.**
- In the desktop edition: live DONKI fetch with LIVE/ARCHIVED badges, Explore mode (third-person walk with real Mars gravity),
  rocket launch in every ending, badges from `achievements.json`, ending gallery, pause/settings, keyboard + gamepad.
- Not in the desktop edition: save/continue, photo mode, SI art (portraits/postcards), NASA 3D models (the outpost is original geometry).
- Captures for the demo: `desktop/Captures/stills/*.png` (3840×2160) and `desktop/Captures/video/*.mp4` on the builder's Mac.
