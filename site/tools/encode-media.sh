#!/usr/bin/env bash
# Re-encodes the website's videos and posters from the game captures.
# Usage:   bash site/tools/encode-media.sh            (run from the repo root)
# Needs:   ffmpeg
#
# To use different footage, change the SOURCE paths below (or drop your own
# files into site/media/ with the same names) — the page never needs editing.
set -euo pipefail
cd "$(dirname "$0")/.."            # -> site/
SRC=../desktop/Captures
OUT_V=media/video
OUT_I=media/img
mkdir -p "$OUT_V" "$OUT_I"

H264=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart -an)

# ---------------------------------------------------------------- hero loop
# A seamless loop: the last second cross-fades into the first second.
hero_src="$SRC/video/01_flyover_sunrise.mp4"
loop() { # in out width crf
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
  ffmpeg -v error -y -i "$1" -filter_complex "
    [0:v]split[a][b];
    [a]trim=0:1,setpts=PTS-STARTPTS[head];
    [b]trim=1:${d},setpts=PTS-STARTPTS[body];
    [body][head]xfade=transition=fade:duration=1:offset=$(echo "$d - 2" | bc),scale=$3:-2[v]" \
    -map "[v]" "${H264[@]}" -crf "$4" "$2"
}
loop "$hero_src" "$OUT_V/hero-1080.mp4" 1920 26
loop "$hero_src" "$OUT_V/hero-720.mp4"  1280 27

# ------------------------------------------------------------ chapter clips
clip() { # name source width crf
  ffmpeg -v error -y -i "$2" -vf "scale=$3:-2" "${H264[@]}" -crf "$4" "$OUT_V/$1.mp4"
}
clip ch-outpost    "$SRC/video/02_outpost_morning.mp4" 1600 27
clip ch-greenhouse "$SRC/video/03_greenhouse_dusk.mp4" 1600 27
clip ch-sky        "$SRC/video/05_radiation_storm.mp4" 1600 27
clip ch-dust       "$SRC/video/04_dust_storm.mp4"      1600 27
clip ch-explore    "$SRC/video/10_explore_walk.mp4"    1600 28
clip ch-night      "$SRC/video/08_outpost_night.mp4"   1600 27
clip ch-rover      "$SRC/video/09_rover_leaves.mp4"    1600 27
loop "$SRC/video/07_launch_sunset.mp4" "$OUT_V/launch-1080.mp4" 1920 26
loop "$SRC/video/07_launch_sunset.mp4" "$OUT_V/launch-720.mp4"  1280 27

# ---------------------------------------------------- gameplay film (montage)
clip film-1080 "$SRC/video/PlutonyX_desktop_montage.mp4" 1920 24
clip film-720  "$SRC/video/PlutonyX_desktop_montage.mp4" 1280 26

# ----------------------------------------------------------------- posters
poster() { # name still width
  ffmpeg -v error -y -i "$SRC/stills/$2" -vf "scale=$3:-2" -quality 80 "$OUT_I/$1.webp"
}
poster hero        01_flyover_sunrise.png 1920
poster outpost     02_outpost_morning.png 1600
poster greenhouse  03_greenhouse_dusk.png 1600
poster dust        04_dust_storm.png      1600
poster sky         05_radiation_storm.png 1600
poster launch      07_launch_sunset.png   1920
poster night       08_outpost_night.png   1600
poster rover       09_rover_leaves.png    1600
poster explore     10_explore_walk.png    1600
poster ship        11_ship_on_pad.png     1600
poster crew        12_crew_closeup.png    1600
poster habitat     13_habitat_closeup.png 1600
poster film        02_outpost_morning.png 1920
# Social preview card (1200x630)
ffmpeg -v error -y -i "$SRC/stills/07_launch_sunset.png" -vf "scale=1200:-2,crop=1200:630" -q:v 4 "$OUT_I/og.jpg"

du -sh media/video/* media/img/*
