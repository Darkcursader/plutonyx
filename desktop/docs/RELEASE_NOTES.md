# PlutonyX — Desktop Ultra edition v1.0

The installable edition of Team PlutonyX's entry for the 2026 NASA Space Apps Challenge ("Build a Junior Astronaut
Mission Trainer"). Same game as the web edition, on the real terrain of Jezero Crater.

## Download
- **Windows 10/11 (64-bit):** `PlutonyX-DesktopUltra-Windows-x64-v1.0.zip` — unzip, run `PlutonyX/PlutonyX.exe`.
  Unsigned hackathon build: if Windows SmartScreen appears, choose **More info → Run anyway**.
- **macOS (Apple silicon and Intel):** `PlutonyX-DesktopUltra-macOS-v1.0.zip` — unzip, then **right-click → Open** the first time
  (unsigned hackathon build).
- `SHA256SUMS.txt` holds the SHA-256 checksum of each ZIP.

No installer, no account, no admin rights. Internet is optional: without it the game uses the bundled NASA records and
labels them ARCHIVED.

## What is in it
- A full 10-sol mission at Lakeshore Outpost with 7 endings (one secret), two difficulty levels, badges and an ending gallery.
- Real NASA data: Jezero terrain from Mars Reconnaissance Orbiter CTX elevation and imagery; space weather from NASA DONKI
  (live for "Today's real sky", archived for the story of the May 2024 storm); Curiosity RAD surface dose rates.
- Explore mode: walk the outpost in third person and jump under real Mars gravity.
- A detailed outpost: habitat, greenhouse, oxygen plant, solar field, storm shelter, radio dish, pressurised rover and an
  ascent ship that launches at the end of every mission.

## Tested
- macOS build: a complete automated playthrough with no errors in the player log.
- Windows build: cross-compiled from macOS; **not yet run on a Windows PC by the team**. Please report problems.

## System requirements
Minimum: 4-core CPU, 8 GB RAM, a DirectX 12 / Metal GPU with 4 GB memory (2019 or newer), 1 GB of disk.
Recommended: 16 GB RAM, a dedicated GPU (GTX 1660 / Apple M1 or better). Graphics presets are in the pause menu (Esc).

## Notes
Portions of the code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX. The outpost,
vehicles and crew are original models generated in code; they are not real NASA hardware and carry no logos or insignia.
NASA does not endorse this project. Sources and licences: `desktop/docs/references-desktop.md` and `shared/references.md`.
