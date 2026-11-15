#!/bin/bash
# Double-click this file to start the game with key logging. Play, then close the game; the log is saved for checking.
cd "$(dirname "$0")/.."
D="$PWD"
"$D/Build/mac/PlutonyX.app/Contents/MacOS/PlutonyX" -keylog -screen-fullscreen 0 -screen-width 1600 -screen-height 900 -logFile "$D/Logs/player-keys.log"
echo "Done. Log saved to $D/Logs/player-keys.log"
