#!/bin/bash
# Encodes the PNG frame sequences written by `PlutonyX -record <dir>` into H.264 clips, plus a short montage.
# Usage: tools/encode_clips.sh Captures/video
set -e
DIR="${1:-Captures/video}"; FF="${FFMPEG:-ffmpeg}"
for d in "$DIR"/*/; do
  n="$(basename "$d")"
  "$FF" -y -loglevel error -framerate 30 -i "$d/%04d.png" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart "$DIR/$n.mp4"
  echo "$n.mp4 $(du -h "$DIR/$n.mp4" | cut -f1)"
done
# montage: an equal slice of each clip, hard cuts, 29 s in total (the demo limit is 30 s; the Web lead cuts the real one)
LIST="$DIR/montage.txt"; : > "$LIST"
N=$(ls "$DIR"/[01][0-9]_*.mp4 | wc -l | tr -d ' '); T=$(python3 -c "print(round(29.0/$N,2))")
for f in "$DIR"/[01][0-9]_*.mp4; do "$FF" -y -loglevel error -ss 0.6 -i "$f" -t $T -c:v libx264 -crf 16 -pix_fmt yuv420p "${f%.mp4}_cut.mp4"; echo "file '$(basename "${f%.mp4}_cut.mp4")'" >> "$LIST"; done
(cd "$DIR" && "$FF" -y -loglevel error -f concat -safe 0 -i montage.txt -c copy PlutonyX_desktop_montage.mp4 && rm -f *_cut.mp4 montage.txt)
echo "montage: $(du -h "$DIR/PlutonyX_desktop_montage.mp4" | cut -f1)"
