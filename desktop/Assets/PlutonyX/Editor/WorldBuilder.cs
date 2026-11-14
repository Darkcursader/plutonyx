// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// WorldBuilder.cs — generates the whole Mars scene from code: real terrain, sun, sky, outpost, cameras.
// Scenes are never hand-edited; run  PlutonyX > Build world  (or -executeMethod ...WorldBuilder.BuildWorld).
using System.IO;
using PlutonyX.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

namespace PlutonyX.EditorTools
{
    public static class WorldBuilder
    {
        public const string ScenePath = "Assets/PlutonyX/Scenes/Main.unity";
        const float MarsRadius = 3389500f;

        [MenuItem("PlutonyX/Build world")]
        public static void BuildWorld()
        {
            Directory.CreateDirectory("Assets/PlutonyX/Scenes");
            Directory.CreateDirectory(TerrainImporter.GeneratedDir);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            Terrain terrain = TerrainImporter.Import();

            // ---- Sun: the real Sun as seen from Mars is about 0.35 degrees wide ----
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.shadows = LightShadows.Soft; sun.color = new Color(1f, 0.93f, 0.84f);
            var hdSun = sunGo.AddComponent<HDAdditionalLightData>();
            sun.lightUnit = LightUnit.Lux; sun.intensity = 42000f;
            hdSun.angularDiameter = 0.35f; hdSun.interactsWithSky = true; hdSun.affectsVolumetric = true;
            SetSun(sunGo.transform, 100f, 18f);

            // ---- Sky, fog, exposure, grading ----
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, TerrainImporter.GeneratedDir + "/MarsSky.asset");
            var env = profile.Add<VisualEnvironment>(true);
            env.skyType.Override((int)SkyType.PhysicallyBased);
            env.skyAmbientMode.Override(SkyAmbientMode.Dynamic);
            env.planetRadius.Override(MarsRadius);
            var sky = profile.Add<PhysicallyBasedSky>(true);
            sky.type.Override(PhysicallyBasedSkyModel.Custom);
            sky.atmosphericScattering.Override(true);
            sky.airDensityR.Override(0.04f); sky.airDensityG.Override(0.03f); sky.airDensityB.Override(0.02f);
            sky.airTint.Override(new Color(0.95f, 0.72f, 0.52f));
            sky.airMaximumAltitude.Override(45000f);
            sky.aerosolDensity.Override(0.55f);
            sky.aerosolTint.Override(new Color(0.83f, 0.60f, 0.42f));
            sky.aerosolMaximumAltitude.Override(30000f);
            sky.aerosolAnisotropy.Override(0.72f);
            sky.groundTint.Override(new Color(0.42f, 0.25f, 0.16f));
            sky.horizonTint.Override(new Color(1f, 0.86f, 0.70f));
            sky.zenithTint.Override(new Color(0.86f, 0.66f, 0.50f));
            sky.horizonZenithShift.Override(0.1f);
            var fog = profile.Add<Fog>(true);
            fog.enabled.Override(true);
            fog.meanFreePath.Override(22000f);
            fog.baseHeight.Override(-400f); fog.maximumHeight.Override(9000f);
            fog.colorMode.Override(FogColorMode.SkyColor);
            fog.tint.Override(new Color(1f, 0.82f, 0.64f));
            fog.maxFogDistance.Override(60000f);
            fog.enableVolumetricFog.Override(false);
            var exposure = profile.Add<Exposure>(true);
            exposure.mode.Override(ExposureMode.Fixed); exposure.fixedExposure.Override(13.2f);
            var tone = profile.Add<Tonemapping>(true); tone.mode.Override(TonemappingMode.ACES);
            var bloom = profile.Add<Bloom>(true); bloom.intensity.Override(0.18f); bloom.threshold.Override(1.0f);
            var shadows = profile.Add<HDShadowSettings>(true); shadows.maxShadowDistance.Override(900f);
            var color = profile.Add<ColorAdjustments>(true); color.contrast.Override(8f); color.saturation.Override(-4f); color.colorFilter.Override(Color.white);
            foreach (VolumeComponent c in profile.components) { c.hideFlags = HideFlags.HideInInspector | HideFlags.HideInHierarchy; AssetDatabase.AddObjectToAsset(c, profile); }
            EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            var volGo = new GameObject("Global Volume (Mars sky)");
            var vol = volGo.AddComponent<Volume>(); vol.isGlobal = true; vol.priority = 0; vol.sharedProfile = profile;

            // ---- Camera ----
            var camGo = new GameObject("Main Camera"); camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>(); cam.nearClipPlane = 0.3f; cam.farClipPlane = 80000f; cam.fieldOfView = 45f;
            var hdCam = camGo.AddComponent<HDAdditionalCameraData>();
            hdCam.antialiasing = HDAdditionalCameraData.AntialiasingMode.TemporalAntialiasing; hdCam.taaSharpenStrength = 0.6f;
            camGo.AddComponent<AudioListener>();
            camGo.transform.position = new Vector3(60, 12, -80); camGo.transform.LookAt(new Vector3(0, 4, 0));

            // apply the tuned sky (tools/sky.json) and build the outpost, shots and game objects
            string skyJson = Path.GetFullPath(Path.Combine(Application.dataPath, "../tools/sky.json"));
            if (File.Exists(skyJson)) ApplySky(JsonValue.Parse(File.ReadAllText(skyJson)));
            OutpostBuilder.Build(terrain, sun, vol, cam);

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("[PlutonyX] World built: " + ScenePath + " terrain " + terrain.terrainData.size);
        }

        /// <summary>azimuth: compass direction the Sun is in (0 = north, 90 = east); elevation: degrees above the horizon.</summary>
        public static void SetSun(Transform sun, float azimuthDeg, float elevationDeg)
        {
            sun.rotation = Quaternion.Euler(elevationDeg, azimuthDeg + 180f, 0f);
        }

        /// <summary>Batch entry point: build, then render a few test stills into desktop/Captures.</summary>
        public static void BuildAndShoot()
        {
            BuildWorld();
            Shoot();
        }
        public static void BuildAndTune()
        {
            BuildWorld();
            Tune();
        }

        /// <summary>Sky tuning loop: reads tools/sky.json, applies it to the scene's sky profile and sun, renders small stills.</summary>
        public static void Tune()
        {
            EditorSceneManager.OpenScene(ScenePath);
            JsonValue j = JsonValue.Parse(File.ReadAllText(Path.GetFullPath(Path.Combine(Application.dataPath, "../tools/sky.json"))));
            ApplySky(j);
            Camera cam = Camera.main; Terrain t = Terrain.activeTerrain;
            Vector3 delta = TerrainImporter.LandmarkPosition(TerrainImporter.Meta(), "delta_front");
            float g = t.SampleHeight(new Vector3(40, 0, -60)) + t.transform.position.y;
            string tag = j["tag"].Str("tune");
            Transform shots = GameObject.Find("Shots") != null ? GameObject.Find("Shots").transform : null;
            if (shots != null && j["shots"].IsArray)
            {
                foreach (JsonValue sn in j["shots"].Items)
                {
                    Transform st = shots.Find(sn.Str()); if (st == null) continue;
                    Screenshotter.Shot(cam, tag + "_" + sn.Str(), st.position, st.GetChild(0).position, st.localScale.z, 1280, 720, 10);
                }
                return;
            }
            Vector3 sunDir = -Object.FindFirstObjectByType<Light>().transform.forward;
            Screenshotter.Shot(cam, tag + "_ground", new Vector3(40, g + 1.7f, -60), delta + Vector3.up * 30, 50f, 960, 540, 8);
            Screenshotter.Shot(cam, tag + "_sun", new Vector3(40, g + 1.7f, -60), new Vector3(40, g + 1.7f, -60) + new Vector3(sunDir.x, Mathf.Max(0.02f, sunDir.y * 0.6f), sunDir.z) * 100f, 60f, 960, 540, 8);
            Screenshotter.Shot(cam, tag + "_fly", new Vector3(5200, 1500, -2500), delta, 40f, 960, 540, 8);
        }

        static Color Col(JsonValue v, Color d) { return v.IsArray ? new Color((float)v[0].Num(), (float)v[1].Num(), (float)v[2].Num()) : d; }

        public static void ApplySky(JsonValue j)
        {
            var vol = Object.FindFirstObjectByType<Volume>(); VolumeProfile p = vol.sharedProfile;
            PhysicallyBasedSky sky; Fog fog; Exposure ex;
            p.TryGet(out sky); p.TryGet(out fog); p.TryGet(out ex);
            sky.airDensityR.Override((float)j["airR"].Num(0.001)); sky.airDensityG.Override((float)j["airG"].Num(0.001)); sky.airDensityB.Override((float)j["airB"].Num(0.001));
            sky.airTint.Override(Col(j["airTint"], Color.white)); sky.airMaximumAltitude.Override((float)j["airMaxAlt"].Num(45000));
            sky.aerosolDensity.Override((float)j["aerosol"].Num(0.05)); sky.aerosolTint.Override(Col(j["aerosolTint"], Color.white));
            sky.aerosolMaximumAltitude.Override((float)j["aerosolMaxAlt"].Num(30000)); sky.aerosolAnisotropy.Override((float)j["anisotropy"].Num(0.7));
            sky.groundTint.Override(Col(j["groundTint"], Color.gray)); sky.horizonTint.Override(Col(j["horizonTint"], Color.white)); sky.zenithTint.Override(Col(j["zenithTint"], Color.white));
            sky.horizonZenithShift.Override((float)j["hzShift"].Num(0)); sky.colorSaturation.Override((float)j["saturation"].Num(1));
            sky.ozoneDensityDimmer.Override((float)j["ozone"].Num(0));
            fog.meanFreePath.Override((float)j["fogMfp"].Num(22000)); fog.tint.Override(Col(j["fogTint"], Color.white)); fog.maximumHeight.Override((float)j["fogMaxH"].Num(9000));
            ex.fixedExposure.Override((float)j["ev"].Num(13));
            Light sun = Object.FindFirstObjectByType<Light>();
            sun.intensity = (float)j["sunLux"].Num(42000); sun.color = Col(j["sunColor"], Color.white);
            SetSun(sun.transform, (float)j["sunAz"].Num(100), (float)j["sunEl"].Num(18));
            EditorUtility.SetDirty(p);
        }

        public static void Shoot()
        {
            if (EditorSceneManager.GetActiveScene().path != ScenePath) EditorSceneManager.OpenScene(ScenePath);
            Camera cam = Camera.main;
            JsonValue meta = TerrainImporter.Meta();
            Vector3 delta = TerrainImporter.LandmarkPosition(meta, "delta_front");
            Terrain t = Terrain.activeTerrain;
            System.Func<float, float, float> ground = (x, z) => t.SampleHeight(new Vector3(x, 0, z)) + t.transform.position.y;
            Screenshotter.Shot(cam, "t1_ground_to_delta", new Vector3(40, ground(40, -60) + 1.7f, -60), delta + Vector3.up * 30, 50f);
            Screenshotter.Shot(cam, "t2_flyover", new Vector3(5200, 1500, -2500), delta + Vector3.up * 0, 40f);
            Screenshotter.Shot(cam, "t3_high_west", new Vector3(9000, 5200, 1500), new Vector3(-4000, 0, 2500), 45f);
        }
    }
}
