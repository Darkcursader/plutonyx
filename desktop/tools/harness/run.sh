#!/bin/bash
# Builds the simulation core + Harness.cs with the C# compiler that ships inside the Unity editor, then runs it.
# Usage: tools/harness/run.sh [runs]        (set UNITY_SCRIPTING to .../Unity.app/Contents/Resources/Scripting if needed)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; DESKTOP="$(cd "$HERE/../.." && pwd)"
SCR="${UNITY_SCRIPTING:-}"
if [ -z "$SCR" ]; then
  for c in /Applications/Unity/Hub/Editor/*/Unity.app/Contents/Resources/Scripting /private/tmp/claude-501/*/*/scratchpad/unity-partial/Unity/Unity.app/Contents/Resources/Scripting; do
    [ -x "$c/DotNetSdk/dotnet" ] && SCR="$c" && break
  done
fi
[ -x "$SCR/DotNetSdk/dotnet" ] || { echo "Unity's bundled .NET SDK not found; set UNITY_SCRIPTING"; exit 2; }
DOTNET="$SCR/DotNetSdk/dotnet"; CSC="$(ls "$SCR"/DotNetSdk/sdk/*/Roslyn/bincore/csc.dll | head -1)"
REF="$(ls -d "$SCR"/DotNetSdk/packs/Microsoft.NETCore.App.Ref/*/ref/net8.0 | head -1)"
OUT="$DESKTOP/tools/out/harness"; mkdir -p "$OUT"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
REFS=(); for r in "$REF"/*.dll; do REFS+=("-r:$r"); done
# 1) Unity compatibility: the core must compile as a .NET Standard 2.1 library with C# 9 (what Unity uses).
"$DOTNET" "$CSC" -nologo -langversion:9.0 -warn:4 -nowarn:CS1591 -target:library -nostdlib+ -noconfig "-r:$SCR/NetStandard/ref/2.1.0/netstandard.dll" "-out:$OUT/core-netstandard.dll" "$DESKTOP"/Assets/PlutonyX/Scripts/Core/*.cs
echo "core: compiles against .NET Standard 2.1 (Unity profile)"
# 2) the runnable harness
"$DOTNET" "$CSC" -nologo -langversion:9.0 -warn:4 -optimize+ -target:exe "${REFS[@]}" "-out:$OUT/harness.dll" "$DESKTOP"/Assets/PlutonyX/Scripts/Core/*.cs "$HERE/Harness.cs"
printf '{"runtimeOptions":{"tfm":"net8.0","framework":{"name":"Microsoft.NETCore.App","version":"8.0.0"}}}\n' > "$OUT/harness.runtimeconfig.json"
"$DOTNET" "$OUT/harness.dll" "$DESKTOP/../shared" "${1:-1000}"
