// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// OutpostBuilder.cs — Lakeshore Outpost, built from code (original design; no NASA hardware or insignia is depicted).
// Also authors the camera shots and wires the game objects. Called by WorldBuilder.
using System.Collections.Generic;
using PlutonyX.Core;
using PlutonyX.Game;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEngine.UIElements;

namespace PlutonyX.EditorTools
{
    public static class OutpostBuilder
    {
        static Terrain _terrain;
        static readonly Dictionary<string, Material> Mats = new Dictionary<string, Material>();

        static float Ground(float x, float z) { return _terrain.SampleHeight(new Vector3(x, 0, z)) + _terrain.transform.position.y; }
        static Vector3 On(float x, float z, float up = 0f) { return new Vector3(x, Ground(x, z) + up, z); }

        static Material Mat(string name, Color color, float metallic, float smoothness, Color? emissive = null)
        {
            Material m;
            if (Mats.TryGetValue(name, out m)) return m;
            m = new Material(Shader.Find("HDRP/Lit")) { name = name };
            m.SetColor("_BaseColor", color); m.SetFloat("_Metallic", metallic); m.SetFloat("_Smoothness", smoothness);
            if (emissive.HasValue) { m.SetColor("_EmissiveColor", emissive.Value); m.SetFloat("_EmissiveExposureWeight", 0f); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive; }
            HDMaterial.ValidateMaterial(m);
            AssetDatabase.CreateAsset(m, TerrainImporter.GeneratedDir + "/Mat_" + name + ".mat");
            Mats[name] = m; return m;
        }

        static GameObject Prim(PrimitiveType type, string name, Transform parent, Vector3 pos, Vector3 scale, Vector3 euler, Material mat, bool collider = false)
        {
            GameObject g = GameObject.CreatePrimitive(type); g.name = name; g.transform.SetParent(parent, false);
            g.transform.position = pos; g.transform.localScale = scale; g.transform.rotation = Quaternion.Euler(euler);
            g.GetComponent<Renderer>().sharedMaterial = mat;
            if (!collider) Object.DestroyImmediate(g.GetComponent<Collider>());
            return g;
        }

        static void Shot(Transform root, string name, Vector3 pos, Vector3 look, float fov = 45f, float driftX = 1.5f, float driftY = 0.4f)
        {
            var s = new GameObject(name); s.transform.SetParent(root, false); s.transform.position = pos;
            s.transform.rotation = Quaternion.LookRotation(look - pos);
            s.transform.localScale = new Vector3(driftX, driftY, fov);       // x, y = drift amplitude in metres; z = field of view
            var l = new GameObject("LookAt"); l.transform.SetParent(s.transform, true); l.transform.position = look;
        }

        public static void Build(Terrain terrain, Light sun, Volume skyVolume, Camera cam)
        {
            _terrain = terrain; Mats.Clear();
            var root = new GameObject("Lakeshore Outpost").transform;
            Material hull = Mat("Hull", new Color(0.82f, 0.81f, 0.78f), 0.15f, 0.45f);
            Material hullDark = Mat("HullDark", new Color(0.30f, 0.31f, 0.33f), 0.5f, 0.5f);
            Material orange = Mat("Orange", new Color(0.85f, 0.42f, 0.12f), 0.1f, 0.4f);
            Material solar = Mat("SolarCell", new Color(0.05f, 0.09f, 0.24f), 0.6f, 0.82f);
            Material frame = Mat("Frame", new Color(0.55f, 0.56f, 0.58f), 0.8f, 0.55f);
            Material regolith = Mat("RegolithBerm", new Color(0.50f, 0.31f, 0.20f), 0f, 0.12f);
            Material grow = Mat("GrowGlow", new Color(0.9f, 0.75f, 0.85f), 0f, 0.6f, new Color(1f, 0.25f, 0.85f) * 2.2f);
            Material window = Mat("WindowWarm", new Color(0.1f, 0.1f, 0.1f), 0f, 0.9f, new Color(1f, 0.74f, 0.42f) * 1.8f);
            Material shieldGlow = Mat("ShieldGlow", new Color(0.2f, 0.2f, 0.3f), 0.2f, 0.7f, new Color(0.55f, 0.45f, 1f) * 2.2f);
            Material beacon = Mat("Beacon", new Color(0.2f, 0.05f, 0.05f), 0f, 0.6f, new Color(1f, 0.2f, 0.12f) * 3f);
            Material pad = Mat("Pad", new Color(0.16f, 0.15f, 0.15f), 0.1f, 0.3f);

            // ---- habitat: two modules and a node, on legs ----
            float gy = Ground(0, 0);
            Transform hab = new GameObject("Habitat").transform; hab.SetParent(root, false);
            Prim(PrimitiveType.Capsule, "Module A", hab, new Vector3(-7, gy + 3.4f, 0), new Vector3(5.2f, 7.5f, 5.2f), new Vector3(0, 0, 90), hull);
            Prim(PrimitiveType.Capsule, "Module B", hab, new Vector3(7, gy + 3.4f, 4), new Vector3(5.2f, 6.5f, 5.2f), new Vector3(0, 35, 90), hull);
            Prim(PrimitiveType.Sphere, "Node", hab, new Vector3(0.5f, gy + 3.4f, 1.2f), new Vector3(4.6f, 4.6f, 4.6f), Vector3.zero, hull);
            Prim(PrimitiveType.Cylinder, "Airlock", hab, new Vector3(0.5f, gy + 2.2f, -3.2f), new Vector3(2.4f, 1.3f, 2.4f), new Vector3(90, 0, 0), orange);
            for (int i = 0; i < 6; i++)
            {
                float x = -12 + i * 2f;
                Prim(PrimitiveType.Cube, "Window", hab, new Vector3(x, gy + 4.1f, -2.52f), new Vector3(1.0f, 0.55f, 0.08f), Vector3.zero, window);
            }
            for (int i = 0; i < 8; i++)
            {
                float x = -13 + i * 3.2f, z = (i % 2 == 0 ? -1.6f : 1.6f);
                Prim(PrimitiveType.Cylinder, "Leg", hab, new Vector3(x, gy + 0.6f, z), new Vector3(0.28f, 0.7f, 0.28f), Vector3.zero, frame);
            }
            Prim(PrimitiveType.Cube, "Stripe", hab, new Vector3(-7, gy + 3.4f, -2.62f), new Vector3(9f, 0.35f, 0.05f), Vector3.zero, orange);

            // ---- greenhouse: a glowing grow tunnel ----
            Transform gh = new GameObject("Greenhouse").transform; gh.SetParent(root, false);
            float ggy = Ground(-18, 12);
            GameObject tunnel = Prim(PrimitiveType.Capsule, "Grow tunnel", gh, new Vector3(-18, ggy + 2.0f, 12), new Vector3(4.4f, 6.5f, 4.4f), new Vector3(0, 60, 90), grow);
            for (int i = 0; i < 5; i++)
                Prim(PrimitiveType.Cylinder, "Rib", gh, new Vector3(-18, ggy + 2.0f, 12) + Quaternion.Euler(0, 60, 0) * new Vector3(-5 + i * 2.5f, 0, 0), new Vector3(4.6f, 0.08f, 4.6f), new Vector3(0, 60, 90), frame);
            Prim(PrimitiveType.Cube, "Tube to hab", gh, new Vector3(-13, ggy + 1.8f, 6.5f), new Vector3(1.6f, 1.6f, 9f), new Vector3(0, -38, 0), hull);
            var ghLightGo = new GameObject("Grow light"); ghLightGo.transform.SetParent(gh, false); ghLightGo.transform.position = new Vector3(-18, ggy + 5f, 12);
            var ghLight = ghLightGo.AddComponent<Light>(); ghLight.type = LightType.Point; ghLight.color = new Color(1f, 0.3f, 0.85f); ghLight.range = 38f;
            ghLightGo.AddComponent<HDAdditionalLightData>(); ghLight.lightUnit = LightUnit.Lumen; ghLight.intensity = 26000f; ghLight.shadows = LightShadows.None;

            // ---- air maker ----
            Transform air = new GameObject("Air Maker").transform; air.SetParent(root, false);
            float agy = Ground(12, 14);
            Prim(PrimitiveType.Cube, "Air Maker body", air, new Vector3(12, agy + 1.5f, 14), new Vector3(4.5f, 3f, 3.2f), new Vector3(0, 20, 0), hullDark);
            for (int i = 0; i < 3; i++) Prim(PrimitiveType.Capsule, "Oxygen tank", air, new Vector3(15.5f + i * 1.7f, agy + 1.6f, 15.5f + i * 0.6f), new Vector3(1.4f, 1.7f, 1.4f), Vector3.zero, hull);
            Prim(PrimitiveType.Cylinder, "Intake", air, new Vector3(11, agy + 3.6f, 13.6f), new Vector3(0.7f, 0.9f, 0.7f), Vector3.zero, frame);

            // ---- solar field ----
            Transform sf = new GameObject("Solar field").transform; sf.SetParent(root, false);
            for (int r = 0; r < 4; r++)
                for (int c = 0; c < 7; c++)
                {
                    float x = 22 + c * 5.2f, z = -46 + r * 6.5f, y = Ground(x, z);
                    Prim(PrimitiveType.Cube, "Panel", sf, new Vector3(x, y + 1.7f, z), new Vector3(4.6f, 0.07f, 2.9f), new Vector3(-24, 0, 0), solar);
                    Prim(PrimitiveType.Cylinder, "Post", sf, new Vector3(x, y + 0.8f, z + 0.3f), new Vector3(0.14f, 0.85f, 0.14f), Vector3.zero, frame);
                }

            // ---- storm shelter with the Storm Shield pylons (future tech, labelled as such in the game) ----
            Transform sh = new GameObject("Storm shelter").transform; sh.SetParent(root, false);
            float sgy = Ground(-32, -24);
            Prim(PrimitiveType.Sphere, "Berm", sh, new Vector3(-32, sgy - 0.6f, -24), new Vector3(17f, 6.5f, 15f), Vector3.zero, regolith);
            Prim(PrimitiveType.Cube, "Hatch", sh, new Vector3(-25.2f, sgy + 1.1f, -21.5f), new Vector3(2.0f, 2.2f, 0.4f), new Vector3(0, 70, 0), orange);
            for (int i = 0; i < 6; i++)
            {
                float a = i * Mathf.PI / 3f; float x = -32 + Mathf.Cos(a) * 12.5f, z = -24 + Mathf.Sin(a) * 11.5f, y = Ground(x, z);
                Prim(PrimitiveType.Cylinder, "Shield pylon", sh, new Vector3(x, y + 2.4f, z), new Vector3(0.35f, 2.4f, 0.35f), Vector3.zero, frame);
                Prim(PrimitiveType.Sphere, "Shield emitter", sh, new Vector3(x, y + 5.0f, z), new Vector3(0.8f, 0.8f, 0.8f), Vector3.zero, shieldGlow);
            }

            // ---- dish ----
            Transform dish = new GameObject("Dish").transform; dish.SetParent(root, false);
            float dgy = Ground(20, -14);
            Prim(PrimitiveType.Cylinder, "Mast", dish, new Vector3(20, dgy + 3f, -14), new Vector3(0.5f, 3f, 0.5f), Vector3.zero, frame);
            Prim(PrimitiveType.Sphere, "Reflector", dish, new Vector3(20, dgy + 7.2f, -14), new Vector3(7f, 1.3f, 7f), new Vector3(-52, 30, 0), hull);
            Prim(PrimitiveType.Sphere, "Dish beacon", dish, new Vector3(20, dgy + 6.3f, -14), new Vector3(0.35f, 0.35f, 0.35f), Vector3.zero, beacon);

            // ---- rover ----
            BuildRover(root, On(-9, -19), 25f, hull, hullDark, frame, orange, window);

            // ---- launch pad and ascent ship ----
            Transform lp = new GameObject("Launch pad").transform; lp.SetParent(root, false);
            Vector3 p = On(170, 130);
            Prim(PrimitiveType.Cylinder, "Pad", lp, p + Vector3.up * 0.1f, new Vector3(34f, 0.12f, 34f), Vector3.zero, pad);
            Prim(PrimitiveType.Capsule, "Ascent ship", lp, p + Vector3.up * 9.5f, new Vector3(6.2f, 8.2f, 6.2f), Vector3.zero, hull);
            Prim(PrimitiveType.Cylinder, "Engine skirt", lp, p + Vector3.up * 2.4f, new Vector3(5.2f, 1.2f, 5.2f), Vector3.zero, hullDark);
            Prim(PrimitiveType.Cube, "Ship stripe", lp, p + new Vector3(0, 11f, -3.05f), new Vector3(2.4f, 0.5f, 0.1f), Vector3.zero, orange);
            for (int i = 0; i < 4; i++)
            {
                float a = i * Mathf.PI / 2f + 0.78f;
                Prim(PrimitiveType.Cylinder, "Ship leg", lp, p + new Vector3(Mathf.Cos(a) * 4.2f, 1.6f, Mathf.Sin(a) * 4.2f), new Vector3(0.3f, 2.4f, 0.3f), new Vector3(Mathf.Sin(a) * 28f, 0, -Mathf.Cos(a) * 28f), frame);
                Prim(PrimitiveType.Sphere, "Pad beacon", lp, p + new Vector3(Mathf.Cos(a) * 16f, 0.5f, Mathf.Sin(a) * 16f), new Vector3(0.5f, 0.5f, 0.5f), Vector3.zero, beacon);
            }

            // ---- path lights ----
            float[][] lamps = { new[] { -4f, -9f }, new[] { 12f, -8f }, new[] { -20f, -6f }, new[] { 6f, 9f }, new[] { -26f, -14f }, new[] { 30f, -22f } };
            foreach (float[] l in lamps)
            {
                Vector3 lpPos = On(l[0], l[1]);
                Prim(PrimitiveType.Cylinder, "Lamp post", root, lpPos + Vector3.up * 1.5f, new Vector3(0.1f, 1.5f, 0.1f), Vector3.zero, frame);
                Prim(PrimitiveType.Sphere, "Lamp", root, lpPos + Vector3.up * 3.1f, new Vector3(0.4f, 0.4f, 0.4f), Vector3.zero, window);
                var lg = new GameObject("Lamp light"); lg.transform.SetParent(root, false); lg.transform.position = lpPos + Vector3.up * 3.1f;
                var ll = lg.AddComponent<Light>(); ll.type = LightType.Point; ll.color = new Color(1f, 0.78f, 0.5f); ll.range = 22f; lg.AddComponent<HDAdditionalLightData>();
                ll.lightUnit = LightUnit.Lumen; ll.intensity = 3200f; ll.shadows = LightShadows.None;
            }

            // ---- the field site at the delta (real place: Three Forks, where Perseverance left sample tubes) ----
            JsonValue meta = TerrainImporter.Meta();
            Vector3 forks = TerrainImporter.LandmarkPosition(meta, "three_forks"); forks = On(forks.x, forks.z);
            Vector3 delta = TerrainImporter.LandmarkPosition(meta, "delta_front"); delta = On(delta.x, delta.z);
            Transform site = new GameObject("Field site").transform; site.SetParent(root, false);
            Prim(PrimitiveType.Cylinder, "Drill mast", site, forks + Vector3.up * 2f, new Vector3(0.25f, 2f, 0.25f), Vector3.zero, frame);
            Prim(PrimitiveType.Sphere, "Site beacon", site, forks + Vector3.up * 4.2f, new Vector3(0.5f, 0.5f, 0.5f), Vector3.zero, beacon);

            // ---- camera shots ----
            Transform shots = new GameObject("Shots").transform;
            Vector3 c0 = new Vector3(0, gy + 4, 0);
            Shot(shots, "title", On(96, -72, 9f), c0, 36f, 3f, 0.6f);
            Shot(shots, "flyover", new Vector3(3000, gy + 950, -2100), delta, 40f, 60f, 12f);
            Shot(shots, "flyover_end", On(260, -170, 46f), c0, 40f, 6f, 1.5f);
            Shot(shots, "outpost", On(64, -50, 8f), c0, 42f);
            Shot(shots, "outpost_dust_dawn", On(64, -50, 8f), c0, 42f);
            Shot(shots, "solar", On(70, -62, 7f), On(38, -36, 2f), 42f);
            Shot(shots, "greenhouse", On(-36, 28, 4.5f), On(-18, 12, 2.5f), 40f);
            Shot(shots, "greenhouse_night", On(-36, 28, 4.5f), On(-18, 12, 2.5f), 40f);
            Shot(shots, "shelter", On(-56, -44, 6f), On(-32, -24, 2.5f), 42f);
            Shot(shots, "dish", On(34, -30, 3f), On(20, -14, 6.5f), 40f);
            Shot(shots, "earthrise_dish", On(34, -30, 3f), On(20, -14, 9f), 40f);
            Shot(shots, "airmaker", On(26, 28, 3.5f), On(13, 14.5f, 2f), 40f);
            Shot(shots, "garage", On(-22, -34, 3f), On(-9, -19, 1.5f), 40f);
            Shot(shots, "rover_storm_return", On(-22, -34, 3f), On(-9, -19, 1.5f), 40f);
            Shot(shots, "interior", On(16, -14, 2.4f), On(-4, 0, 3.6f), 38f, 0.6f, 0.15f);
            Shot(shots, "delta", forks + new Vector3(46, 14, -34), forks + Vector3.up * 2, 42f, 3f, 0.8f);
            Shot(shots, "delta_bluehour", forks + new Vector3(46, 14, -34), forks + Vector3.up * 2, 42f, 3f, 0.8f);
            Shot(shots, "pad", p + new Vector3(34, 5, -40), p + Vector3.up * 9, 40f);
            Shot(shots, "pad_night_launch", p + new Vector3(34, 5, -40), p + Vector3.up * 9, 40f);
            Shot(shots, "pad_sunset_launch", p + new Vector3(-40, 6, -44), p + Vector3.up * 10, 38f);
            Shot(shots, "sky", On(44, -44, 2f), On(-200, -44, 150f), 50f, 0.5f, 0.2f);
            Shot(shots, "night", On(74, 44, 11f), c0, 42f);

            // ---- game objects ----
            var ui = new GameObject("UI");
            var doc = ui.AddComponent<UIDocument>();
            doc.panelSettings = UiAssets.PanelSettings();
            var gameUi = ui.AddComponent<GameUI>(); gameUi.Document = doc;
            var game = new GameObject("Game");
            var world = game.AddComponent<WorldDirector>();
            world.Cam = cam; world.Sun = sun; world.SkyVolume = skyVolume; world.ShotsRoot = shots;
            world.GrowLights.Add(tunnel.GetComponent<Renderer>());
            var audio = game.AddComponent<AudioDirector>();
            var director = game.AddComponent<GameDirector>(); director.UI = gameUi; director.World = world; director.Audio = audio;

            // night fill (starlight and dust-scattered glow), shield light, particles
            var nf = new GameObject("Night fill"); nf.transform.rotation = Quaternion.Euler(55, 20, 0);
            var nl = nf.AddComponent<Light>(); nl.type = LightType.Directional; nl.color = new Color(0.55f, 0.66f, 1f); nl.shadows = LightShadows.None; nf.AddComponent<HDAdditionalLightData>();
            nl.lightUnit = LightUnit.Lux; nl.intensity = 0.9f; nl.enabled = false; world.NightFill = nl;
            var slg = new GameObject("Shield light"); slg.transform.position = On(-32, -24, 7f);
            var sl = slg.AddComponent<Light>(); sl.type = LightType.Point; sl.color = new Color(0.6f, 0.5f, 1f); sl.range = 60f; sl.shadows = LightShadows.None; slg.AddComponent<HDAdditionalLightData>();
            sl.lightUnit = LightUnit.Lumen; sl.intensity = 0f; sl.enabled = false; world.ShieldLight = sl;
            foreach (Light l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) if (l.type == LightType.Point && l != sl && l != ghLight) world.SmallLights.Add(l);
            // white specks, like the "snow" charged particles left in the Curiosity rover's camera images during the May 2024 storm
            world.StormParticles = Particles("Storm particles", cam.transform, new Color(1f, 1f, 1f, 0.9f), new Vector3(0, 0, 4), new Vector3(7f, 4f, 0.5f), new Vector3(0, 0, 0), 0.018f, 0.09f, true);
            world.DustParticles = Particles("Dust", cam.transform, new Color(0.80f, 0.56f, 0.38f, 0.035f), new Vector3(0, 8, 70), new Vector3(180, 16, 100), new Vector3(16, 0.5f, 3), 14f, 9f, false);
        }

        static Texture2D _soft;
        static ParticleSystem Particles(string name, Transform parent, Color color, Vector3 offset, Vector3 box, Vector3 velocity, float size, float life, bool streaks)
        {
            if (_soft == null)
            {
                _soft = new Texture2D(64, 64, TextureFormat.RGBA32, true);
                for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++)
                { float d = Mathf.Clamp01(1f - Vector2.Distance(new Vector2(x, y), new Vector2(31.5f, 31.5f)) / 31.5f); _soft.SetPixel(x, y, new Color(1, 1, 1, d * d)); }
                _soft.Apply(); AssetDatabase.CreateAsset(_soft, TerrainImporter.GeneratedDir + "/SoftParticle.asset");
            }
            var mat = new Material(Shader.Find("HDRP/Unlit")) { name = "Particles_" + name.Replace(" ", "") };
            mat.SetFloat("_SurfaceType", 1f); mat.SetFloat("_BlendMode", streaks ? 1f : 0f); mat.SetColor("_UnlitColor", color); mat.SetTexture("_UnlitColorMap", _soft);   // HDRP/Unlit ignores particle vertex colour, so the tint lives in the material
            HDMaterial.ValidateMaterial(mat);
            AssetDatabase.CreateAsset(mat, TerrainImporter.GeneratedDir + "/" + mat.name + ".mat");
            var go = new GameObject(name); go.transform.SetParent(parent, false); go.transform.localPosition = offset;
            var ps = go.AddComponent<ParticleSystem>();
            var main = ps.main; main.startColor = color; main.startSize = size; main.startLifetime = life; main.startSpeed = 0f; main.maxParticles = 4000;
            main.simulationSpace = ParticleSystemSimulationSpace.World; main.playOnAwake = true; main.loop = true;
            var em = ps.emission; em.rateOverTime = 0f;
            var sh = ps.shape; sh.shapeType = ParticleSystemShapeType.Box; sh.scale = box;
            var vel = ps.velocityOverLifetime; vel.enabled = true; vel.space = ParticleSystemSimulationSpace.World;
            vel.x = new ParticleSystem.MinMaxCurve(velocity.x * 0.7f, velocity.x * 1.3f); vel.y = new ParticleSystem.MinMaxCurve(velocity.y * 0.7f, velocity.y * 1.3f); vel.z = new ParticleSystem.MinMaxCurve(velocity.z * 0.7f, velocity.z * 1.3f);
            var sol = ps.sizeOverLifetime; sol.enabled = true;
            sol.size = new ParticleSystem.MinMaxCurve(1f, new AnimationCurve(new Keyframe(0f, 0f), new Keyframe(0.25f, 1f), new Keyframe(0.75f, 1f), new Keyframe(1f, 0f)));
            var col = ps.colorOverLifetime; col.enabled = false;
            var grad = new Gradient(); grad.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) }, new[] { new GradientAlphaKey(0f, 0f), new GradientAlphaKey(1f, 0.2f), new GradientAlphaKey(1f, 0.8f), new GradientAlphaKey(0f, 1f) });
            col.color = grad;
            var r = go.GetComponent<ParticleSystemRenderer>(); r.sharedMaterial = mat;
            r.renderMode = ParticleSystemRenderMode.Billboard;
            return ps;
        }

        static void BuildRover(Transform root, Vector3 at, float yaw, Material hull, Material dark, Material frame, Material orange, Material window)
        {
            Transform r = new GameObject("Rover").transform; r.SetParent(root, false); r.position = at; r.rotation = Quaternion.Euler(0, yaw, 0);
            System.Func<Vector3, Vector3> W = v => at + Quaternion.Euler(0, yaw, 0) * v;
            Prim(PrimitiveType.Cube, "Chassis", r, W(new Vector3(0, 1.0f, 0)), new Vector3(2.4f, 0.5f, 4.6f), new Vector3(0, yaw, 0), dark);
            Prim(PrimitiveType.Capsule, "Cabin", r, W(new Vector3(0, 2.0f, 0.4f)), new Vector3(2.3f, 1.9f, 2.3f), new Vector3(90, yaw, 0), hull);
            Prim(PrimitiveType.Cube, "Windshield", r, W(new Vector3(0, 2.25f, 2.25f)), new Vector3(1.5f, 0.7f, 0.1f), new Vector3(-20, yaw, 0), window);
            Prim(PrimitiveType.Cube, "Rover stripe", r, W(new Vector3(1.17f, 2.0f, 0.4f)), new Vector3(0.05f, 0.3f, 2.6f), new Vector3(0, yaw, 0), orange);
            Prim(PrimitiveType.Cylinder, "Drill arm", r, W(new Vector3(0, 2.2f, -2.2f)), new Vector3(0.18f, 1.2f, 0.18f), new Vector3(35, yaw, 0), frame);
            for (int i = 0; i < 6; i++)
            {
                float x = (i % 2 == 0 ? -1.45f : 1.45f), z = -1.8f + (i / 2) * 1.8f;
                Prim(PrimitiveType.Cylinder, "Wheel", r, W(new Vector3(x, 0.55f, z)), new Vector3(1.1f, 0.22f, 1.1f), new Vector3(0, yaw, 90), dark);
            }
        }
    }

    /// <summary>UI Toolkit assets created from code: theme and panel settings (scaled for 1080p to 4K).</summary>
    public static class UiAssets
    {
        public static PanelSettings PanelSettings()
        {
            const string dir = "Assets/PlutonyX/Settings";
            string tss = dir + "/PlutonyXTheme.tss";
            if (!System.IO.File.Exists(tss)) { System.IO.File.WriteAllText(tss, "@import url(\"unity-theme://default\");\nVisualElement {}\n"); AssetDatabase.ImportAsset(tss); }
            string path = dir + "/PanelSettings.asset";
            var ps = AssetDatabase.LoadAssetAtPath<PanelSettings>(path);
            if (ps == null) { ps = ScriptableObject.CreateInstance<PanelSettings>(); AssetDatabase.CreateAsset(ps, path); }
            ps.themeStyleSheet = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(tss);
            ps.scaleMode = PanelScaleMode.ScaleWithScreenSize; ps.referenceResolution = new Vector2Int(1680, 945);
            ps.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight; ps.match = 0.5f;
            EditorUtility.SetDirty(ps);
            return ps;
        }
    }
}
