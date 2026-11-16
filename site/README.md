# Website — cinematic landing page

A single static page: no build step, no framework. Open it with any static server:

```bash
python3 -m http.server 4173 --directory site
```

Then visit http://127.0.0.1:4173/.

## Deploy (Vercel)

Live at **https://plutonyx.vercel.app** (Vercel project `plutonyx`, deployed from this `site/` folder).

```bash
cd site && npx vercel@latest deploy --prod
```

`vercel.json` sets cache headers; `.vercelignore` keeps `tools/`, this README and local env files off the
live site. If the site moves to another domain, update the `og:image`, `og:url` and `canonical` tags in
`index.html`.

## Change a link

Edit **`config.js`** only.

| Setting | What it does |
|---|---|
| `links.playWeb` | **PLAY ON WEB** button (hero, nav, final section) |
| `links.download.windows` / `.macos` | **DOWNLOAD THE APP** — the button gives Windows visitors the Windows file and Mac visitors the macOS file |
| `links.download.page` | Used on phones/tablets and unknown systems (the release page) |
| `links.download.windowsSize` / `macosSize` / `version` | Small print under the download button |
| `links.source` | Footer "Source code" link — set to `""` to remove it |
| `title`, `studio` | Game name and studio credit, shown in the logo and page title |

The download links point to the GitHub release `v1.0-desktop`, using the zip names in
`desktop/Build/release/`. They work as soon as that release is published with those two files attached.

## Replace footage

1. Put the new file in `site/media/video/` (or `site/media/img/` for posters).
2. Point the matching entry in `config.js → media` at it.

Every video takes `src` (desktop), an optional `small` (phones, ≤ 900 px wide) and a `poster`
(shown while loading, for reduced-motion visitors and on Save-Data).

To re-encode everything from the game captures in `desktop/Captures/`, run:

```bash
bash site/tools/encode-media.sh
```

Change the source paths at the top of that script to use other captures. Keep videos H.264 MP4 with
`+faststart` and no audio track. Aim for about 2 MB for the hero loop and under 1 MB per chapter clip.

## How it behaves

- **Opening title** plays once per browser session. Any key, click or scroll skips it.
- **Only one video plays at a time.** Videos below the fold load just before they scroll into view.
- **Reduced motion** (OS setting): no opening title, no background video, no particles or parallax.
  Posters are shown instead.
- **Save-Data**: posters only. The film plays only when the visitor presses play.
- **Motion toggle** in the nav pauses all background video and the dust layer. The choice is remembered.
- The drifting dust over the hero is a small WebGL layer (`js/dust.js`). Without WebGL it simply doesn't appear.

## Files

```
index.html        page structure and copy
config.js         links + media (edit this)
css/site.css      the whole visual system
js/main.js        intro, scroll scenes, video loading, film player, link wiring
js/dust.js        WebGL dust particles
media/            encoded video, posters, favicon, social card
tools/            encode-media.sh
```
