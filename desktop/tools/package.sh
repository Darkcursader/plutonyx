#!/bin/bash
# Packages the player builds into portable ZIPs with SHA-256 checksums: Build/release/
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"; V="${1:-v1.0}"; OUT="$HERE/Build/release"; mkdir -p "$OUT"
if [ -d "$HERE/Build/win/PlutonyX" ]; then
  rm -f "$OUT/PlutonyX-DesktopUltra-Windows-x64-$V.zip"
  (cd "$HERE/Build/win" && zip -q -r -9 "$OUT/PlutonyX-DesktopUltra-Windows-x64-$V.zip" PlutonyX -x "*_BackUpThisFolder_ButDontShipItWithYourGame/*" -x "*.DS_Store")
fi
if [ -d "$HERE/Build/mac/PlutonyX.app" ]; then
  rm -f "$OUT/PlutonyX-DesktopUltra-macOS-$V.zip"
  ditto -c -k --keepParent "$HERE/Build/mac/PlutonyX.app" "$OUT/PlutonyX-DesktopUltra-macOS-$V.zip"
fi
(cd "$OUT" && shasum -a 256 *.zip > SHA256SUMS.txt && cat SHA256SUMS.txt && ls -la *.zip | awk '{printf "%.0f MB  %s\n", $5/1048576, $9}')
