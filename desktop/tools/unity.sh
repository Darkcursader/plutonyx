#!/bin/bash
# Runs the Unity editor in batch mode on this project and prints the interesting part of the log.
# Usage: tools/unity.sh [-nographics] -executeMethod Namespace.Class.Method [more Unity args]
HERE="$(cd "$(dirname "$0")/.." && pwd)"
UNITY="${UNITY_EDITOR:-$(ls -d /Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity 2>/dev/null | tail -1)}"
mkdir -p "$HERE/Logs"; LOG="$HERE/Logs/batch-$(date +%H%M%S).log"
"$UNITY" -batchmode -projectPath "$HERE" -logFile "$LOG" -quit "$@"; CODE=$?
echo "exit code $CODE, log $LOG"
grep -nE "error CS|Exception|\[PlutonyX\]|Compilation failed|Aborting batchmode|executeMethod" "$LOG" | grep -v "^.*UnityEditor.Graphs" | head -60
exit $CODE
