# Asset prompt pack — SI images and clips (optional layer)

> Both editions look complete **without** these. Add them only if there is time, and only under the rules below.
> Portions of this document were drafted with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.

## Rules for every generated image or clip

1. **Visible mark:** the game shows portraits through one component that adds an "SI-generated" tag automatically. Postcards and video clips must have the words **SI-generated** in a corner of the file itself.
2. **Never:** NASA logos, "meatball" or "worm", flags, mission patches, agency names, real people, children, existing film or game characters, readable text on clothing.
3. **Never fake data:** no generated terrain, charts or "NASA images". Real things stay real.
4. **Log it:** add a line to `shared/art/SI_LOG.md` (file, tool, date, used for).
5. **Check every image** (and every frame of a clip) for stray logos before committing.

## Shared style block (paste at the start of every image prompt)

```
Semi-realistic digital painting with visible brushwork, cinematic lighting, warm dusty-orange rim light from a window on the left, cool cyan fill light from a console on the right, dark softly blurred habitat interior behind, muted palette of rust, charcoal and butterscotch with small cyan accents, 85 mm portrait lens look, shallow depth of field. Plain rust-and-charcoal flight suit with a thin cyan collar light. No logos, no patches, no flags, no badges, no name tags, no text anywhere. Adult.
```

## Crew portraits — 1024 × 1024 PNG, head and shoulders, three-quarter view, no helmet

| File (put in `web/public/art/portraits/` and `shared/art/portraits/`) | Prompt (after the style block) |
|---|---|
| `ana.png` | A 38-year-old woman, warm brown skin, dark curly hair tied up loosely, a little soil on her fingers, a tiny green sprig tucked in her chest pocket, gentle stubborn half-smile, looking slightly off camera as if at a plant. |
| `dil.png` | A 31-year-old woman, light olive skin, straight black hair in a short braid, a streak of red dust on one cheek, a geologist's hand lens on a cord around her neck, bright restless eyes looking toward a far horizon. |
| `kofi.png` | A 44-year-old man, deep brown skin, short greying hair and beard, reading glasses pushed up on his forehead, a rolled tool pouch over one shoulder, calm face with a dry hint of a smile. |
| `sam.png` | A 55-year-old flight director, pale skin, short silver hair, a slim headset, seen as if on a video screen with soft blue light and faint scan lines, steady tired kind eyes. Background: blurred dark control room with small points of light. |
| `pip.png` | Not a person: a soft glowing cyan ring floating above a dark wrist device, simple and friendly, on a near-black background. |

## Ending postcards — 2048 × 1152 PNG, "SI-generated" in the bottom-right corner of the image

Style block change: replace the portrait sentence with *"wide illustrated postcard, painterly, 24 mm lens look"*.

| File (`web/public/art/postcards/`) | Prompt |
|---|---|
| `full.png` | A small rocket rising on a column of pale dust from a red desert plain at sunset, the sky butterscotch with a blue glow around the low Sun, a tiny outpost with warm windows in the foreground, hopeful. |
| `secret.png` | Night on a red desert plain, a dish antenna in silhouette pointing at one bright blue-white star low over a crater rim, faint green and violet aurora above, deep blue and gold palette. |
| `gamble.png` | A six-wheeled rover racing home across red sand under a dark violet sky full of faint sparkling streaks, long dust trail, headlights on, amber and teal palette, tense. |
| `green.png` | Inside a clear half-cylinder greenhouse at night, rows of lettuce and two tomato vines heavy with red fruit glowing under magenta-pink lights, red desert dimly visible outside, peaceful. |
| `bittersweet.png` | Blue hour over an ancient dry river delta, layered cliffs, a single drill stand left alone beside a rock, cool desaturated blues, quiet. |
| `survival.png` | A dusty dawn, a battered small outpost half-covered in red dust with one warm light on, four small suited figures walking toward a distant rocket, low contrast. |
| `evac.png` | Pre-dawn blue darkness, a rocket lifting off on hard white engine light, the outpost below with its lights going out one by one. |

## Video clips (only if time) — 1920 × 1080, 4–6 s, "SI-generated" burned into a corner of every frame

| File (`web/public/art/clips/`) | Prompt |
|---|---|
| `earth_from_orbit.mp4` | Slow drift past the night side of Earth from orbit, green and red aurora curtains glowing over the dark continents, city lights below, no spacecraft, no text. Used in the "Same Sun" ending. |
| `message_from_home.mp4` | A kitchen table with a lopsided home-made cake shaped like a six-wheeled rover, candle flames flickering, warm light, hands of adults only entering the frame to cut it, no faces, no children. Used for Kofi's birthday message. |

## Voices (only if time)

Adult voices only. If text-to-speech is used, say so in the Credits and the SI field. Suggested direction: Ana warm and unhurried; Dil quick and bright; Kofi low and dry; Sam steady, slightly distant (radio filter); PIP neutral and friendly. The game already ships with subtitles and radio sound cues, so voices are a bonus, never a blocker.
