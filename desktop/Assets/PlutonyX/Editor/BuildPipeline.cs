// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// BuildPipeline.cs — player builds from the command line:
//   tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildMac     -> Build/mac/PlutonyX.app
//   tools/unity.sh -executeMethod PlutonyX.EditorTools.BuildPipeline.BuildWin     -> Build/win/PlutonyX/PlutonyX.exe
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace PlutonyX.EditorTools
{
    public static class BuildPipeline
    {
        static string Root { get { return Path.GetFullPath(Path.Combine(Application.dataPath, "../Build")); } }

        [MenuItem("PlutonyX/Build/macOS")]
        public static void BuildMac() { Build(BuildTarget.StandaloneOSX, Path.Combine(Root, "mac/PlutonyX.app")); }

        [MenuItem("PlutonyX/Build/Windows x64")]
        public static void BuildWin() { Build(BuildTarget.StandaloneWindows64, Path.Combine(Root, "win/PlutonyX/PlutonyX.exe")); }

        static void Build(BuildTarget target, string path)
        {
            SharedSync.Sync();
            if (!File.Exists(WorldBuilder.ScenePath)) WorldBuilder.BuildWorld();
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var options = new BuildPlayerOptions { scenes = new[] { WorldBuilder.ScenePath }, locationPathName = path, target = target, targetGroup = BuildTargetGroup.Standalone, options = BuildOptions.None };
            BuildReport report = UnityEditor.BuildPipeline.BuildPlayer(options);
            BuildSummary s = report.summary;
            Debug.Log("[PlutonyX] Build " + target + ": " + s.result + ", " + (s.totalSize / 1048576) + " MB, " + s.totalTime + ", errors " + s.totalErrors + " -> " + path);
            if (s.result != BuildResult.Succeeded) EditorApplication.Exit(1);
        }
    }
}
