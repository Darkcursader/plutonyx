// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// ProjectSetup.cs — one-shot project configuration, run in batch mode:
//   Unity -batchmode -projectPath desktop -executeMethod PlutonyX.EditorTools.ProjectSetup.Configure -quit
// Creates the HDRP pipeline asset, sets player settings and syncs the shared files. Safe to re-run.
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

namespace PlutonyX.EditorTools
{
    public static class ProjectSetup
    {
        public const string SettingsDir = "Assets/PlutonyX/Settings";

        [MenuItem("PlutonyX/Configure project")]
        public static void Configure()
        {
            Directory.CreateDirectory(SettingsDir);
            PlayerSettings.companyName = "Team PlutonyX";
            PlayerSettings.productName = "PlutonyX";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.Standalone, ApiCompatibilityLevel.NET_Standard);
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone, "team.plutonyx.jezero");
            PlayerSettings.bundleVersion = "1.0.0";
            PlayerSettings.defaultScreenWidth = 1920; PlayerSettings.defaultScreenHeight = 1080;
            PlayerSettings.fullScreenMode = FullScreenMode.FullScreenWindow;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.runInBackground = true;
            PlayerSettings.visibleInBackground = true;

            string path = SettingsDir + "/HDRP_Ultra.asset";
            var asset = AssetDatabase.LoadAssetAtPath<HDRenderPipelineAsset>(path);
            if (asset == null)
            {
                asset = ScriptableObject.CreateInstance<HDRenderPipelineAsset>();
                asset.name = "HDRP_Ultra";
                AssetDatabase.CreateAsset(asset, path);
            }
            GraphicsSettings.defaultRenderPipeline = asset;
            QualitySettings.renderPipeline = asset;
            EditorUtility.SetDirty(asset);
            SharedSync.Sync();
            AssetDatabase.SaveAssets();
            Debug.Log("[PlutonyX] ProjectSetup.Configure done. Pipeline: " + GraphicsSettings.defaultRenderPipeline);
        }
    }
}
