# STYLE GUIDE — one look for both editions

> Web (Three.js) and Desktop Ultra (Unity) must be recognisable as the same game within three seconds.
> Portions of this document were drafted with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.

## 1. The look in one sentence

**A warm, dusty, real Mars seen through cool, quiet instruments.** The planet is butterscotch, rust and long blue shadow; everything human is small, precise and lit in cyan-white. Cinematic, never cartoonish, never horror.

Reference feelings (not to be copied): the lived-in tension of a survival thriller where every system feels real; the stillness of real rover panoramas at dawn.

## 2. Palette

### World (taken from real Mars imagery — do not "fantasy up" the colours)

| Name | Hex | Use |
|---|---|---|
| Butterscotch sky | `#C9A27A` | Daytime sky near horizon |
| High sky | `#8E7460` | Daytime sky overhead |
| Regolith rust | `#8C4A2F` | Sunlit ground mid-tone |
| Delta tan | `#B58A63` | Lighter sediments, dust |
| Basalt shadow | `#2A1B16` | Deep shadow, never pure black |
| Sunset blue | `#7FA6D9` | Glow around the Sun at sunrise/sunset (real Mars effect) |
| Night | `#0B0D14` | Night sky base |
| Grow-light magenta | `#E05AD0` | Greenhouse LEDs (real: plants use red + blue light, so chambers glow magenta-pink) |
| Hab light | `#FFE2B0` | Warm window light |
| Shield glow | `#9F8CFF` | Storm Shield field and emitters |

### Interface (colour-blind safe; **every colour is paired with its own icon and shape — never colour alone**)

| Token | Hex | Meaning | Icon / shape |
|---|---|---|---|
| `--ui-air` | `#5CC8F0` | Air | wind swirl · round gauge |
| `--ui-power` | `#F2C744` | Power | lightning bolt · segmented cells |
| `--ui-shield` | `#B79CFF` | Shield | shield outline · hexagon |
| `--ui-food` | `#3CC79A` | Garden / food | sprout |
| `--ui-water` | `#4D8FE0` | Water | droplet |
| `--ui-science` | `#F5F1E8` | Science / sample | core tube |
| `--ui-warn` | `#FFB05C` | Caution | triangle, single pulse |
| `--ui-danger` | `#FF6B4A` | Danger | octagon, striped fill pattern |
| `--ui-ok` | `#8BE0B0` | Good | check mark |
| `--ui-ink` | `#F4F7FA` | Text | — |
| `--ui-dim` | `#9FB0BF` | Secondary text | — |
| `--ui-glass` | `rgba(10,15,22,0.58)` | Panel fill (with 18 px background blur) | — |
| `--ui-line` | `rgba(255,255,255,0.16)` | Hairlines | — |

Contrast: body text on glass ≥ 7:1; never put text straight on the 3D scene without a glass panel or a soft shadow plate.
Colour-blind mode adds patterns (stripes for danger, dots for caution) and thicker icon outlines.

## 3. Typography (all open-licensed, bundled with the game — no web-font requests)

| Role | Font | Notes |
|---|---|---|
| Display, numerals, labels | **Oxanium** (SIL OFL) | Wide tracking (+6 %) for titles, tabular figures for gauges |
| Body, dialogue, kids' reading text | **Atkinson Hyperlegible** (SIL OFL) | Designed for legibility. Minimum 18 px at 1080p; text-size setting 100–150 % |
| Data in Mission Planner view | **JetBrains Mono** (SIL OFL) | Real units and tables only |

Reading level: grade 3–5. One idea per sentence. Speaker name + role icon on every line of dialogue.

## 4. Interface language

- **Mostly diegetic.** Information lives on the wristband projection ("PIP"), holographic panels anchored in the world and the world itself: dim lights = low power, frost on the lens = failing heat, Geiger crackle + sparkle = radiation, magenta glow strength = greenhouse power, a visible dome = shield charge.
- **No permanent dashboard.** The three core gauges sit in a small wristband cluster that fades in for decisions and out for cinematics.
- **Panels:** smoked glass, 14 px radius, 1 px hairline, small corner ticks. 8 px spacing grid. Touch targets ≥ 48 px.
- **Motion:** 150–250 ms ease-out for UI, 600–1200 ms eased for gauges. Reduced-motion setting removes camera sway, particles on UI and parallax.
- **Buttons show the last-used input:** keyboard keys, mouse, touch or gamepad glyphs (generic shapes only — no console brand art).
- **"Real data" chip:** small pill with a satellite-dish icon and the word REAL DATA. Opens a card: what happened · the real number · source · link · date.
- **SI watermark:** every SI-generated image or clip is displayed through one reusable component that adds the corner tag `SI-generated`.
- **Letterbox bars** (2.39:1) in cutscenes. Always skippable.

## 5. Wordmark and emblem

- Wordmark: the title in Oxanium, uppercase, tracking +12 %, with a thin horizon line under it.
- Emblem: a plain ring (Mars) crossed by a low horizon arc, with one small dot above it (Earth as an evening star). Flat, single colour.
- Team credit: "A PlutonyX game".
- **Forbidden:** anything resembling NASA's insignia or mission patches (no red chevron/vector, no blue starfield sphere with an orbit swoosh, no agency names in lock-ups), no flags.

## 6. Camera language

| Situation | Lens (35 mm equiv.) | Movement |
|---|---|---|
| Title orbit, sol transitions | 24–28 mm | Slow arc over the real terrain, eased, horizon low in frame |
| Decisions (power board) | 35 mm | Gentle drift toward the system being changed |
| Character moments | 50–85 mm | Almost still; slight push-in |
| Storm | 28 mm | Low angle on the shelter; tiny handheld sway (off with reduced motion) |
| Endings | per ending | One authored hero move each, with deliberate depth of field |

Never snap-cut during gameplay; use 0.6–1.2 s eased moves. Depth of field only in cutscenes and photo mode. No motion blur in gameplay.

## 7. Light and time of day

Each sol moves through four looks; both editions use the same order:

1. **Dawn** (briefing): long shadows, blue glow around the low Sun, hab lights still on.
2. **Day** (power board, events): butterscotch sky, hard warm key light, soft dusty fill.
3. **Sunset** (results): the real **blue Martian sunset**.
4. **Night** (storm and quiet moments): stars, warm windows, magenta greenhouse, violet shield.

Dust storm: sky and sun turn deep amber-brown, contrast and visibility drop, solar panels visibly dim.
Solar storm: thin violet-green shimmer high in the sky (Mars has real, faint global auroras), sparkle "snow" on camera feeds (real effect seen by Curiosity's cameras), Geiger crackle.

Colour grade per ending (LUT / look):

| Ending | Look |
|---|---|
| Homeward with Hope | Warm gold, lifted shadows |
| Same Sun (secret) | Gold to deep blue split-tone, stars visible |
| The Gamble | High contrast, amber and teal |
| The Green Outpost | Soft, slightly green-magenta, glowing interior |
| Safe Hands, Empty Hands | Cool, desaturated blue hour |
| Hold the Line | Dusty, low contrast, one warm light |
| Abort to Orbit | Pre-dawn blue with a hard white engine light |

## 8. The outpost (shared layout — both editions place the same things)

World origin = centre of the landing pad circle. +X east, +Z south (Unity: convert as needed), units = metres.

| Element | Position (x, z) | Notes |
|---|---|---|
| **Core habitat** (two-storey drum, real NASA "Habitat Demonstration Unit" proportions) | (0, −38) | Warm windows, airlock to the south |
| **Greenhouse** (clear inflatable half-cylinder, magenta LEDs, visible plants) | (−22, −44) | Joined to the core by a soft tunnel |
| **Storm shelter** (regolith-covered mound with a door; four shield emitter pylons around it) | (20, −52) | Dome appears when shield is charged |
| **Solar field** (4 × 5 tilted panels) | (38, −8) | Panels dull with dust and dim in storms |
| **Comms dish** (steerable, points at Earth) | (−34, −14) | Blinks while a message is in flight |
| **Air Maker** (tank cluster + chimney) | (10, −30) | Vent plume strength = system level |
| **Rover garage / charge pad** | (−8, −10) | Rover is missing when Dil is in the field |
| **Landing pad + ascent ship** | (0, 60) | Far enough for launch dust not to reach the hab |

Real terrain location of the origin: see `shared/data/terrain/jezero.json` (latitude, longitude, metres per pixel).

## 9. Crew character sheets (for SI portraits and 3D suits)

All crew are **adults**. Outpost clothing: rust-and-charcoal flight suit with a cyan collar light. **No patches, flags, logos, names or readable text on clothing.** No helmets in portraits.

| id | Name | Age | Look | Personality cue for the artist |
|---|---|---|---|---|
| `ana` | Ana Reyes | 38 | Warm brown skin, dark curly hair tied up, soil under the nails, a tiny sprig tucked in a pocket | Gentle, stubborn, smiles at plants first |
| `dil` | Dilnoza "Dil" Karimova | 31 | Light olive skin, straight black hair in a short braid, dust on the cheek, geologist's hand lens on a cord | Restless curiosity, eyes always on the horizon |
| `kofi` | Kofi Mensah | 44 | Deep brown skin, short greying hair and beard, tool roll on the shoulder, reading glasses pushed up | Calm, dry humour, fixes things while he talks |
| `sam` | Sam Whitfield | 55 | Pale skin, silver hair, headset, seen on a Mission Control screen with soft blue light | Steady voice, tired eyes, cares a lot |
| `pip` | PIP | — | Not a person: a soft cyan ring on the wristband that pulses when it talks | Friendly, precise, never sarcastic |

Portrait format: head and shoulders, three-quarter view, warm rim light from a window (Mars dust orange), cool fill from a console (cyan), dark blurred habitat interior. Painted, semi-realistic, visible brushwork.

## 10. Sound direction

- Code-generated ambience: thin Mars wind, habitat hum that drops in pitch as power falls, greenhouse pump, Geiger clicks whose rate follows the real dose rate.
- Music: slow, modal pads; a pulse layer joins as risk rises; a single warm chord on relief. No copyrighted music.
- UI sounds: soft glass ticks; confirm = two rising notes; warning = one low double pulse (never a siren).
- Voices: text-to-speech or adult narrators only. Captions for everything.

## 11. Quality bar

Razor-sharp at native resolution, anti-aliased, 4K textures on hero assets, vector UI that survives 200 % zoom. If a mode cannot look premium, it does not ship.

## 12. Art direction — "cinematic sci-fi film" (added 15 Nov; overrides anything above that conflicts)

The look is a grounded science-fiction film (in the spirit of the great realistic space films), **not** a cartoon and **not** generic game realism. Both editions follow this.

**Hardware — "used future"**
- Believable engineering with a strong, consistent identity: clean functional shapes, real proportions, panel seams, rivets, hatches, handrails, pipes, cables, vents, struts, radiators, ladders, lights.
- Palette: **off-white `#E6E1D6`, graphite `#2B2D31`, burnt orange `#C8551E`**. Matte panels; accent colours used sparingly (one orange band or hatch per module).
- Every hard edge bevelled. No razor-sharp CG edges, no glossy plastic, no toy proportions.
- Weathering: Mars dust gathered on lower parts and top surfaces, scorch marks around engines, scratches, worn paint at edges.
- Our own markings only: the mission name **PLUTONYX**, module numbers (`LS-01`, `GH-02`, `SH-03`), hazard stripes. **No flag or insignia of any real agency.**

**Film lighting**
- One dominant low sun, deep shadows, strong rim light on the habitat. Practical lights glow at dusk. Silhouettes against the sky in wide shots.
- Dust in the light beams, a hazy horizon, wind-blown sand at ground level. A sense of scale and silence.

**Camera language**
- Wide, slow, epic establishing shots: tiny base, huge landscape and sky. Close shots of hands, visors and screens.
- Anamorphic feel in cutscenes only: 2.39:1 letterbox, a subtle horizontal flare from the Sun only, light film grain, slight vignette, gentle chromatic aberration at the frame edges.

**Colour grade (LUTs or equivalent)**

| Moment | Grade |
|---|---|
| Day | Teal-and-amber split tone over the Mars palette (teal shadows, amber highlights) |
| Sunset, shelter at night | Cold blue |
| Hopeful endings (Homeward, Same Sun, Green Outpost) | Warm, lifted |
| Loss endings (Hold the Line, Abort, Safe Hands) | Cold, low saturation |

**First person and the tablet**
- The player is an astronaut on the surface: helmet visor frame at the edge of view, breath and suit sounds, footprints.
- No flat dashboards in play. Information lives on a **hand-held tablet** (graphite body, orange corner bumpers, matte screen with a slight glare), a small wrist display, physical screens in the habitat, and the world itself (dimming lights, frost, Geiger crackle, dust on panels).
- Tablet interface: dark graphite background, off-white text, burnt-orange highlights, the same icons as the rest of the game.

**Sound and score**
- Minimal, emotional music: slow pads and organ-like swells, original and generated in code. Silence used on purpose. Breathing and suit sounds up close.

**Avoid:** saturated cartoon colours, toy proportions, glossy plastic, cluttered interface, heavy bloom.
