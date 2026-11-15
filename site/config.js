/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  SITE CONFIG — the only file you need to edit to change links or footage.
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Links: change `links.playWeb` and `links.download.*`.
 *  • Footage: put a new file in site/media/ and point the matching entry here.
 *    Each video has a desktop file, an optional `small` file for phones
 *    (used when the screen is 900 px wide or less) and a `poster` image
 *    shown while it loads, for reduced-motion visitors and on Save-Data.
 *  • Paths are relative to index.html. Full URLs (e.g. a CDN) also work.
 */
window.SITE_CONFIG = {
  title: "PROJECT JEZERO",          // game name (working title) — shown in the logo and page title
  studio: "A PlutonyX game",

  links: {
    // PLAY ON WEB — the browser edition.
    playWeb: "https://darkcursader.github.io/plutonyx/",
    openWebInNewTab: false,

    // DOWNLOAD THE APP — Desktop Ultra edition. The button picks the file for
    // the visitor's system; phones/tablets and unknown systems get `page`.
    download: {
      windows: "https://github.com/Darkcursader/plutonyx/releases/download/v1.0-desktop/PlutonyX-DesktopUltra-Windows-x64-v1.0.zip",
      macos:   "https://github.com/Darkcursader/plutonyx/releases/download/v1.0-desktop/PlutonyX-DesktopUltra-macOS-v1.0.zip",
      page:    "https://github.com/Darkcursader/plutonyx/releases/tag/v1.0-desktop",
      windowsSize: "203 MB",
      macosSize: "198 MB",
      version: "v1.0",
    },

    source: "https://github.com/Darkcursader/plutonyx",
  },

  media: {
    // Opening shot, full screen behind the logo. Loops.
    hero:   { src: "media/video/hero-1080.mp4",   small: "media/video/hero-720.mp4",   poster: "media/img/hero.webp" },

    // Experience chapters (scroll-driven, in order).
    chapters: [
      { src: "media/video/ch-outpost.mp4",    poster: "media/img/outpost.webp" },
      { src: "media/video/ch-greenhouse.mp4", poster: "media/img/greenhouse.webp" },
      { src: "media/video/ch-sky.mp4",        poster: "media/img/sky.webp" },
      { src: "media/video/ch-dust.mp4",       poster: "media/img/dust.webp" },
      { src: "media/video/ch-explore.mp4",    poster: "media/img/explore.webp" },
    ],

    // The large gameplay film.
    film:   { src: "media/video/film-1080.mp4",   small: "media/video/film-720.mp4",   poster: "media/img/film.webp" },

    // Scene strip under the film — click one to play it in the big frame.
    scenes: [
      { label: "Flyover at sunrise", src: "media/video/hero-1080.mp4",     poster: "media/img/hero.webp" },
      { label: "Outpost, morning",   src: "media/video/ch-outpost.mp4",    poster: "media/img/outpost.webp" },
      { label: "Greenhouse at dusk", src: "media/video/ch-greenhouse.mp4", poster: "media/img/greenhouse.webp" },
      { label: "Dust storm",         src: "media/video/ch-dust.mp4",       poster: "media/img/dust.webp" },
      { label: "Radiation storm",    src: "media/video/ch-sky.mp4",        poster: "media/img/sky.webp" },
      { label: "Outpost at night",   src: "media/video/ch-night.mp4",      poster: "media/img/night.webp" },
      { label: "The rover leaves",   src: "media/video/ch-rover.mp4",      poster: "media/img/rover.webp" },
      { label: "Launch at sunset",   src: "media/video/launch-1080.mp4",   poster: "media/img/launch.webp" },
    ],

    // Background of the final call to action. Loops.
    launch: { src: "media/video/launch-1080.mp4", small: "media/video/launch-720.mp4", poster: "media/img/launch.webp" },

    crew:   "media/img/crew.webp",
  },
};
