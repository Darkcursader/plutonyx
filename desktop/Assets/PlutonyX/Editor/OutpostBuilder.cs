// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// OutpostBuilder.cs — Lakeshore Outpost, modelled from code with MeshKit (original designs; no real vehicle is
// copied and no agency insignia, flag or logo is depicted). Also authors the camera shots and wires the game
// objects. Called by WorldBuilder.
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
        static Material hull, hullDark, orange, solar, frame, darkMetal, regolith, grow, window, glass, shieldGlow, beacon, pad, foilGold, foilSilver, fabric, sandbag, visor, lampWhite, statusGreen;
        static Texture2D[] _hullTex, _foilTex, _fabricTex, _solarTex, _padTex, _suitTex;

        static float Ground(float x, float z) { return _terrain.SampleHeight(new Vector3(x, 0, z)) + _terrain.transform.position.y; }
        static Vector3 On(float x, float z, float up = 0f) { return new Vector3(x, Ground(x, z) + up, z); }

        // ------------------------------------------------------------------ materials
        static Material Mat(string name, Color color, float metallic, float smoothness, Color? emissive = null, Texture2D[] tex = null, float tile = 1f)
        {
            Material m;
            if (Mats.TryGetValue(name, out m)) return m;
            m = new Material(Shader.Find("HDRP/Lit")) { name = name };
            m.SetColor("_BaseColor", color); m.SetFloat("_Metallic", metallic); m.SetFloat("_Smoothness", smoothness);
            if (tex != null)
            {
                m.SetTexture("_BaseColorMap", tex[0]); m.SetTexture("_NormalMap", tex[1]); m.SetTexture("_MaskMap", tex[2]);
                m.SetFloat("_NormalScale", 1f);
                m.SetFloat("_MetallicRemapMin", metallic); m.SetFloat("_MetallicRemapMax", 1f);
                m.SetFloat("_SmoothnessRemapMin", Mathf.Clamp01(smoothness - 0.3f)); m.SetFloat("_SmoothnessRemapMax", Mathf.Clamp01(smoothness + 0.3f));
                m.SetTextureScale("_BaseColorMap", new Vector2(tile, tile));
            }
            if (emissive.HasValue) { m.SetColor("_EmissiveColor", emissive.Value); m.SetFloat("_EmissiveExposureWeight", 0f); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive; }
            m.enableInstancing = true;
            HDMaterial.ValidateMaterial(m);
            AssetDatabase.CreateAsset(m, TerrainImporter.GeneratedDir + "/Mat_" + name + ".mat");
            Mats[name] = m; return m;
        }

        static Texture2D[] Bake(string name, int size, float bump, MeshKit.Texel f)
        {
            Texture2D a, n, k; MeshKit.Bake(name, size, bump, f, out a, out n, out k);
            return new[] { a, n, k };
        }

        static void MakeMaterials()
        {
            _hullTex = Bake("HullPanels", 1024, 2.2f, MeshKit.HullPanels);
            _foilTex = Bake("Foil", 512, 3.0f, MeshKit.Foil);
            _fabricTex = Bake("Fabric", 512, 2.0f, MeshKit.Fabric);
            _solarTex = Bake("SolarCells", 1024, 1.2f, MeshKit.SolarCells);
            _padTex = Bake("PadSurface", 1024, 2.0f, MeshKit.PadSurface);
            _suitTex = Bake("SuitCloth", 512, 1.4f, MeshKit.SuitCloth);
            hull = Mat("Hull", new Color(0.95f, 0.95f, 0.94f), 0.05f, 0.42f, null, _hullTex);
            hullDark = Mat("HullDark", new Color(0.26f, 0.27f, 0.29f), 0.45f, 0.45f, null, _hullTex);
            orange = Mat("Orange", new Color(0.90f, 0.40f, 0.10f), 0.05f, 0.40f, null, _hullTex);
            foilGold = Mat("FoilGold", new Color(1.0f, 0.74f, 0.30f), 1f, 0.62f, null, _foilTex, 2f);
            foilSilver = Mat("FoilSilver", new Color(0.88f, 0.89f, 0.92f), 1f, 0.60f, null, _foilTex, 2f);
            fabric = Mat("Fabric", new Color(0.90f, 0.89f, 0.86f), 0f, 0.30f, null, _fabricTex, 3f);
            sandbag = Mat("Sandbag", new Color(0.66f, 0.47f, 0.34f), 0f, 0.22f, null, _fabricTex, 4f);
            solar = Mat("SolarCell", Color.white, 0.1f, 0.68f, null, _solarTex);
            pad = Mat("Pad", Color.white, 0f, 0.3f, null, _padTex);
            frame = Mat("Frame", new Color(0.62f, 0.63f, 0.65f), 0.9f, 0.55f);
            darkMetal = Mat("DarkMetal", new Color(0.10f, 0.10f, 0.11f), 0.7f, 0.42f);
            glass = Mat("Glass", new Color(0.015f, 0.02f, 0.03f), 0f, 0.95f, new Color(1f, 0.74f, 0.42f) * 0.5f);
            window = Mat("WindowWarm", new Color(0.03f, 0.03f, 0.035f), 0f, 0.92f, new Color(1f, 0.74f, 0.42f) * 1.8f);
            grow = Mat("GrowGlow", new Color(0.92f, 0.80f, 0.88f), 0f, 0.5f, new Color(1f, 0.25f, 0.85f) * 2.2f, _fabricTex, 4f);
            shieldGlow = Mat("ShieldGlow", new Color(0.2f, 0.2f, 0.3f), 0.2f, 0.7f, new Color(0.42f, 0.30f, 1f) * 1.5f);
            beacon = Mat("Beacon", new Color(0.2f, 0.05f, 0.05f), 0f, 0.6f, new Color(1f, 0.2f, 0.12f) * 3f);
            lampWhite = Mat("LampWhite", new Color(0.9f, 0.9f, 0.9f), 0f, 0.6f, new Color(1f, 0.93f, 0.82f) * 2.6f);
            statusGreen = Mat("StatusGreen", new Color(0.05f, 0.2f, 0.08f), 0f, 0.6f, new Color(0.25f, 1f, 0.45f) * 2.0f);
            visor = Mat("Visor", new Color(1.0f, 0.74f, 0.30f), 1f, 0.94f);
            regolith = Mat("RegolithBerm", new Color(0.50f, 0.31f, 0.20f), 0f, 0.12f);
            Texture2D ra = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/PlutonyX/Textures/PolyHaven/Layers/regolith_albedo.png");
            Texture2D rn = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/PlutonyX/Textures/PolyHaven/Layers/regolith_normal.png");
            if (ra != null) { regolith.SetTexture("_BaseColorMap", ra); regolith.SetColor("_BaseColor", new Color(0.92f, 0.90f, 0.88f)); }
            if (rn != null) regolith.SetTexture("_NormalMap", rn);
            HDMaterial.ValidateMaterial(regolith);
        }

        // ------------------------------------------------------------------ building blocks (all in local space)
        static string F(float v) { return v.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture); }
        static Mesh Cyl(float r, float h, float bevel = 0.02f, int seg = 24) { return MeshKit.Lathe("cyl_" + F(r) + "_" + F(h) + "_" + F(bevel) + "_" + seg, MeshKit.CylProfile(r, h, bevel), seg, 40f, Mathf.Max(1f, Mathf.Round(r * 0.8f)), 0.125f); }
        static Mesh Vessel(float r, float h, float dome, int seg = 36) { return MeshKit.Lathe("ves_" + F(r) + "_" + F(h) + "_" + F(dome), MeshKit.VesselProfile(r, h, dome), seg, 50f, r < 0.2f ? r * 0.785f : Mathf.Max(1f, Mathf.Round(r * 0.8f)), 0.125f); }
        static Mesh Box(float x, float y, float z, float bevel = 0.03f) { return MeshKit.RBox("box_" + F(x) + "_" + F(y) + "_" + F(z) + "_" + F(bevel), new Vector3(x, y, z), bevel, 0.125f); }
        static Mesh Tor(float ring, float tube, int seg = 32) { return MeshKit.Torus("tor_" + F(ring) + "_" + F(tube) + "_" + seg, ring, tube, seg, 8); }
        static Mesh Taper(float r0, float r1, float h, int seg = 20) { return MeshKit.Lathe("tap_" + F(r0) + "_" + F(r1) + "_" + F(h), new[] { new Vector2(0, 0), new Vector2(r0, 0), new Vector2(r1, h), new Vector2(0, h) }, seg, 40f, 1f, 0.125f); }
        static Mesh Sphere()
        {
            var p = new Vector2[17]; for (int i = 0; i <= 16; i++) { float a = i / 16f * Mathf.PI; p[i] = new Vector2(Mathf.Sin(a) * 0.5f, -Mathf.Cos(a) * 0.5f); }
            return MeshKit.Lathe("sphere", p, 28, 80f, 2f, 1f);
        }
        static Mesh UnitRod() { return MeshKit.Lathe("unitrod", new[] { new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1) }, 10, 40f, 1f, 1f); }

        static Transform G(Transform parent, string name, Vector3 lp, Vector3 le = default(Vector3))
        {
            var t = new GameObject(name).transform; t.SetParent(parent, false); t.localPosition = lp; t.localRotation = Quaternion.Euler(le); return t;
        }
        static GameObject M(Transform parent, string name, Mesh mesh, Material mat, Vector3 lp, Vector3 le = default(Vector3), float s = 1f)
        {
            var g = new GameObject(name); g.transform.SetParent(parent, false); g.transform.localPosition = lp; g.transform.localRotation = Quaternion.Euler(le); g.transform.localScale = Vector3.one * s;
            g.AddComponent<MeshFilter>().sharedMesh = mesh; g.AddComponent<MeshRenderer>().sharedMaterial = mat;
            return g;
        }
        static GameObject Rod(Transform parent, string name, Vector3 a, Vector3 b, float r, Material mat)
        {
            GameObject g = M(parent, name, UnitRod(), mat, a);
            Vector3 d = b - a; g.transform.localRotation = Quaternion.FromToRotation(Vector3.up, d.normalized); g.transform.localScale = new Vector3(r, d.magnitude, r);
            return g;
        }
        static GameObject Ball(Transform parent, string name, Vector3 lp, Vector3 scale, Material mat)
        {
            GameObject g = M(parent, name, Sphere(), mat, lp); g.transform.localScale = scale; return g;
        }
        static void Porthole(Transform parent, Vector3 lp, Vector3 normal, float r, Material glassMat)
        {
            Transform g = G(parent, "Porthole", lp); g.localRotation = Quaternion.FromToRotation(Vector3.up, normal.normalized);
            M(g, "Frame", Tor(r, r * 0.17f, 24), frame, Vector3.zero); M(g, "Pane", Cyl(r, 0.06f, 0.01f), glassMat, new Vector3(0, -0.03f, 0));
        }
        /// <summary>A pipe or cable lying on the real ground between waypoints (world x, z).</summary>
        static void GroundTube(Transform parent, string name, float[][] xz, float radius, Material mat, float lift = 0f)
        {
            var pts = new List<Vector3>();
            for (int i = 0; i < xz.Length - 1; i++)
            {
                Vector2 a = new Vector2(xz[i][0], xz[i][1]), b = new Vector2(xz[i + 1][0], xz[i + 1][1]); int n = Mathf.Max(1, Mathf.CeilToInt(Vector2.Distance(a, b) / 1.2f));
                for (int k = 0; k < n; k++) { Vector2 q = Vector2.Lerp(a, b, k / (float)n); pts.Add(On(q.x, q.y, radius * 0.7f + lift)); }
            }
            float[] last = xz[xz.Length - 1]; pts.Add(On(last[0], last[1], radius * 0.7f + lift));
            M(parent, name, MeshKit.Tube("gt_" + name, pts, radius, 6), mat, Vector3.zero);
        }
        static void Shot(Transform root, string name, Vector3 pos, Vector3 look, float fov = 45f, float driftX = 1.5f, float driftY = 0.4f)
        {
            var s = new GameObject(name); s.transform.SetParent(root, false); s.transform.position = pos;
            s.transform.rotation = Quaternion.LookRotation(look - pos);
            s.transform.localScale = new Vector3(driftX, driftY, fov);       // x, y = drift amplitude in metres; z = field of view
            var l = new GameObject("LookAt"); l.transform.SetParent(s.transform, true); l.transform.position = look;
        }
        static Light PointLight(Transform parent, string name, Vector3 lp, Color color, float lumen, float range)
        {
            var g = new GameObject(name); g.transform.SetParent(parent, false); g.transform.localPosition = lp;
            var l = g.AddComponent<Light>(); l.type = LightType.Point; l.color = color; l.range = range; g.AddComponent<HDAdditionalLightData>();
            l.lightUnit = LightUnit.Lumen; l.intensity = lumen; l.shadows = LightShadows.None;
            return l;
        }
        static void Decal(Transform parent, string name, Material m, Vector3 pos, float yaw, float width, float length, Vector2 uvScale)
        {
            var g = new GameObject(name); g.transform.SetParent(parent, false); g.transform.position = pos + Vector3.up * 2f; g.transform.rotation = Quaternion.Euler(90, yaw, 0);
            var d = g.AddComponent<DecalProjector>(); d.material = m; d.size = new Vector3(width, length, 4.5f); d.pivot = new Vector3(0, 0, 2.25f); d.uvScale = uvScale; d.fadeFactor = 1f;
            d.drawDistance = 1200f;
        }
        static Material DecalMat(string name, Texture2D tex, float opacity)
        {
            var m = new Material(Shader.Find("HDRP/Decal")) { name = name };
            m.SetTexture("_BaseColorMap", tex); m.SetColor("_BaseColor", Color.white); m.SetFloat("_DecalBlend", opacity);
            m.SetFloat("_AffectAlbedo", 1f); m.SetFloat("_AffectNormal", 0f); m.SetFloat("_AffectMetal", 0f); m.SetFloat("_AffectAO", 0f); m.SetFloat("_AffectSmoothness", 0f);
            m.enableInstancing = true;          // decal projectors are drawn instanced; without this nothing shows
            HDMaterial.ValidateMaterial(m);
            AssetDatabase.CreateAsset(m, TerrainImporter.GeneratedDir + "/" + name + ".mat");
            return m;
        }
        static void MarkStatic(Transform t)
        {
            foreach (Transform c in t.GetComponentsInChildren<Transform>(true)) GameObjectUtility.SetStaticEditorFlags(c.gameObject, StaticEditorFlags.BatchingStatic);
        }

        // ------------------------------------------------------------------ models
        /// <summary>Horizontal pressure module along local +X, centred on the origin at height cy, on a cradle with legs.</summary>
        static void Module(Transform g, float length, float r, float cy, int windows, bool bandLeft)
        {
            float x0 = -length * 0.5f;
            M(g, "Hull", Vessel(r, length, 1.35f), hull, new Vector3(x0, cy, 0), new Vector3(0, 0, -90));
            int rings = Mathf.RoundToInt((length - 3.4f) / 2.6f);
            for (int i = 0; i <= rings; i++) M(g, "Flange", Tor(r + 0.02f, 0.07f, 40), frame, new Vector3(x0 + 1.7f + i * (length - 3.4f) / rings, cy, 0), new Vector3(0, 0, 90));
            M(g, "Colour band", MeshKit.Lathe("band_" + F(r), new[] { new Vector2(r + 0.012f, 0), new Vector2(r + 0.012f, 0.55f) }, 40, 40f, 2f, 0.125f), orange, new Vector3(bandLeft ? x0 + 2.05f : -x0 - 2.6f, cy, 0), new Vector3(0, 0, -90));
            // cradle: two skid beams and splayed legs with foot pads
            float bz = r * 0.62f, by = cy - Mathf.Sqrt(r * r - bz * bz) - 0.1f;
            for (int s = -1; s <= 1; s += 2)
            {
                M(g, "Skid beam", Box(length - 2.6f, 0.2f, 0.2f, 0.03f), darkMetal, new Vector3(0, by, bz * s));
                int legs = Mathf.Max(3, Mathf.RoundToInt(length / 3.8f));
                for (int i = 0; i < legs; i++)
                {
                    float x = x0 + 1.9f + i * (length - 3.8f) / (legs - 1);
                    Rod(g, "Leg", new Vector3(x, by, bz * s), new Vector3(x, 0.1f, (bz + 0.55f) * s), 0.085f, frame);
                    Rod(g, "Brace", new Vector3(x + 0.9f, by, bz * s), new Vector3(x, 0.35f, (bz + 0.5f) * s), 0.04f, frame);
                    M(g, "Foot pad", Cyl(0.34f, 0.7f, 0.02f, 16), darkMetal, new Vector3(x, -0.6f, (bz + 0.55f) * s));
                }
            }
            for (int i = 0; i < legsCross(length); i++) Rod(g, "Cross tie", new Vector3(x0 + 1.9f + i * 3.2f, by, -bz), new Vector3(x0 + 1.9f + i * 3.2f, by, bz), 0.05f, frame);
            // windows on the camera side, a rail and roof equipment
            float wy = 0.72f, wz = -Mathf.Sqrt(r * r - wy * wy);
            for (int i = 0; i < windows; i++)
            {
                float wx = x0 + 2.9f + i * (length - 5.8f) / Mathf.Max(1, windows - 1);
                Porthole(g, new Vector3(wx, cy + wy, wz), new Vector3(0, wy, wz), 0.42f, window);
                if (i % 2 == 0) Porthole(g, new Vector3(wx, cy + wy, -wz), new Vector3(0, wy, -wz), 0.42f, window);
            }
            var rail = new List<Vector3>(); for (int i = 0; i <= 8; i++) rail.Add(new Vector3(x0 + 1.6f + i * (length - 3.2f) / 8f, cy + r + 0.34f, 0.5f));
            M(g, "Roof rail", MeshKit.Tube("rail_" + F(length), rail, 0.03f, 6), frame, Vector3.zero);
            for (int i = 0; i <= 8; i += 2) Rod(g, "Rail post", new Vector3(rail[i].x, cy + r - 0.05f, 0.5f), rail[i], 0.025f, frame);
        }
        static int legsCross(float length) { return Mathf.Max(2, Mathf.FloorToInt((length - 3.8f) / 3.2f) + 1); }

        static void BuildHabitat(Transform root, float gy)
        {
            Transform hab = G(root, "Habitat", new Vector3(0, gy, 0));
            // module A: living quarters
            Transform a = G(hab, "Module A", new Vector3(-8.9f, 0, 0));
            Module(a, 14.4f, 2.6f, 3.4f, 6, true);
            M(a, "Radiator", Box(6.2f, 0.07f, 1.5f, 0.02f), foilSilver, new Vector3(-1.0f, 6.55f, -0.9f), new Vector3(-12, 0, 0));
            M(a, "Radiator", Box(6.2f, 0.07f, 1.5f, 0.02f), foilSilver, new Vector3(-1.0f, 6.55f, 0.9f), new Vector3(12, 0, 0));
            for (int i = 0; i < 3; i++) { Rod(a, "Radiator strut", new Vector3(-3.6f + i * 2.6f, 5.95f, -0.5f), new Vector3(-3.6f + i * 2.6f, 6.5f, -0.9f), 0.03f, frame); Rod(a, "Radiator strut", new Vector3(-3.6f + i * 2.6f, 5.95f, 0.5f), new Vector3(-3.6f + i * 2.6f, 6.5f, 0.9f), 0.03f, frame); }
            Rod(a, "Whip antenna", new Vector3(5.2f, 5.95f, 0.2f), new Vector3(5.2f, 9.6f, 0.2f), 0.025f, frame);
            Ball(a, "Antenna beacon", new Vector3(5.2f, 9.66f, 0.2f), Vector3.one * 0.18f, beacon);
            M(a, "Roof box", Box(1.1f, 0.5f, 0.8f, 0.06f), foilGold, new Vector3(4.2f, 6.15f, -0.2f));
            Transform lg = G(a, "Low-gain dish", new Vector3(3.0f, 6.0f, 0.3f)); Rod(lg, "Mast", Vector3.zero, new Vector3(0, 0.9f, 0), 0.04f, frame);
            M(lg, "Dish", MeshKit.Dish("dish_small", 0.6f, 0.16f, 24, 6), hull, new Vector3(0, 0.95f, 0), new Vector3(-55, 20, 0));
            // sandbag wall on the far side: bagged soil is a simple radiation and dust barrier
            for (int row = 0; row < 4; row++)
                for (int i = 0; i < 12 - row; i++)
                    M(a, "Soil bag", Box(1.05f, 0.34f, 0.55f, 0.15f), sandbag, new Vector3(-6.2f + i * 1.08f + row * 0.54f, 0.17f + row * 0.31f, 3.6f - row * 0.12f), new Vector3(0, (i * 37 + row * 11) % 9 - 4, 0));

            // node: a vertical hub with a cupola
            Transform node = G(hab, "Node", new Vector3(0.5f, 0, 1.2f));
            M(node, "Node hull", Vessel(2.3f, 5.3f, 0.9f), hull, new Vector3(0, 0.85f, 0));
            M(node, "Flange", Tor(2.32f, 0.07f, 40), frame, new Vector3(0, 1.9f, 0)); M(node, "Flange", Tor(2.32f, 0.07f, 40), frame, new Vector3(0, 5.1f, 0));
            M(node, "Cupola ring", MeshKit.Lathe("cupola", new[] { new Vector2(1.05f, 0), new Vector2(1.05f, 0.55f) }, 24, 40f, 1f, 1f), window, new Vector3(0, 6.1f, 0));
            M(node, "Cupola cap", MeshKit.Lathe("cupolacap", new[] { new Vector2(1.12f, 0), new Vector2(1.12f, 0.1f), new Vector2(0.6f, 0.38f), new Vector2(0, 0.42f) }, 24, 40f, 1f, 1f), hull, new Vector3(0, 6.65f, 0));
            for (int i = 0; i < 8; i++) { float an = i * Mathf.PI / 4f; Rod(node, "Cupola mullion", new Vector3(Mathf.Cos(an) * 1.07f, 6.1f, Mathf.Sin(an) * 1.07f), new Vector3(Mathf.Cos(an) * 1.07f, 6.66f, Mathf.Sin(an) * 1.07f), 0.035f, frame); }
            for (int i = 0; i < 4; i++)
            {
                float an = i * Mathf.PI / 2f + 0.78f; Vector3 d = new Vector3(Mathf.Cos(an), 0, Mathf.Sin(an));
                Rod(node, "Leg", d * 1.6f + Vector3.up * 1.2f, d * 2.5f + Vector3.up * 0.1f, 0.09f, frame); M(node, "Foot pad", Cyl(0.36f, 0.7f, 0.02f, 16), darkMetal, d * 2.5f - Vector3.up * 0.6f);
            }
            // airlock toward the camera (-Z), with a porch and steps
            M(node, "Airlock", Cyl(1.25f, 3.5f, 0.12f, 28), hull, new Vector3(0, 2.35f, -0.9f), new Vector3(-90, 0, 0));
            M(node, "Airlock band", MeshKit.Lathe("alband", new[] { new Vector2(1.262f, 0), new Vector2(1.262f, 0.5f) }, 28, 40f, 2f, 0.125f), orange, new Vector3(0, 2.35f, -3.2f), new Vector3(-90, 0, 0));
            M(node, "Hatch frame", Tor(0.92f, 0.09f, 28), frame, new Vector3(0, 2.35f, -4.42f), new Vector3(90, 0, 0));
            M(node, "Hatch", Cyl(0.9f, 0.1f, 0.03f, 28), hullDark, new Vector3(0, 2.35f, -4.4f), new Vector3(-90, 0, 0));
            M(node, "Hatch window", Cyl(0.2f, 0.04f, 0.01f, 16), window, new Vector3(0, 2.75f, -4.5f), new Vector3(-90, 0, 0));
            M(node, "Hatch wheel", Tor(0.24f, 0.03f, 20), frame, new Vector3(0, 2.2f, -4.56f), new Vector3(90, 0, 0));
            M(node, "Hatch lamp", Box(0.5f, 0.1f, 0.12f, 0.03f), lampWhite, new Vector3(0, 3.72f, -4.3f));
            M(node, "Porch", Box(2.6f, 0.1f, 1.9f, 0.03f), darkMetal, new Vector3(0, 1.38f, -5.4f));
            for (int s = -1; s <= 1; s += 2)
            {
                Rod(node, "Porch leg", new Vector3(1.2f * s, 1.33f, -4.6f), new Vector3(1.2f * s, 0, -4.6f), 0.05f, frame); Rod(node, "Porch leg", new Vector3(1.2f * s, 1.33f, -6.2f), new Vector3(1.2f * s, 0, -6.2f), 0.05f, frame);
                var hr = new List<Vector3> { new Vector3(1.25f * s, 1.43f, -4.55f), new Vector3(1.25f * s, 2.4f, -4.55f), new Vector3(1.25f * s, 2.4f, -6.3f), new Vector3(1.25f * s, 1.05f, -8.6f), new Vector3(1.25f * s, 0.1f, -8.6f) };
                M(node, "Handrail", MeshKit.Tube("porchrail" + s, hr, 0.03f, 6), frame, Vector3.zero);
                Rod(node, "Rail post", new Vector3(1.25f * s, 1.43f, -6.3f), new Vector3(1.25f * s, 2.4f, -6.3f), 0.025f, frame);
            }
            for (int i = 0; i < 5; i++) M(node, "Step", Box(2.2f, 0.07f, 0.42f, 0.02f), darkMetal, new Vector3(0, 1.14f - i * 0.25f, -6.6f - i * 0.45f));

            // module B: the lab, joined to the node
            Transform b = G(hab, "Module B", new Vector3(0.5f, 0, 1.2f), new Vector3(0, -20, 0));
            Transform bb = G(b, "Lab", new Vector3(8.0f, 0, 0)); Module(bb, 10.4f, 2.6f, 3.4f, 4, false);
            M(b, "Vestibule", Cyl(1.3f, 1.0f, 0.05f, 28), hullDark, new Vector3(2.1f, 3.4f, 0), new Vector3(0, 0, -90));
            M(bb, "Roof box", Box(1.6f, 0.6f, 1.0f, 0.06f), foilSilver, new Vector3(1.0f, 6.2f, 0));
            M(bb, "Vent", Cyl(0.3f, 0.7f, 0.03f, 16), frame, new Vector3(-2.2f, 5.9f, 0.4f));

            // cargo, wrapped and strapped
            Transform cargo = G(root, "Cargo", Vector3.zero);
            float[][] cr = { new[] { 4.5f, -8.2f, 1.2f, 12f, 0 }, new[] { 6.1f, -8.5f, 1.2f, -6f, 1 }, new[] { 7.7f, -8.0f, 1.0f, 20f, 2 }, new[] { 5.0f, -9.9f, 1.2f, 3f, 2 }, new[] { 6.6f, -10.1f, 0.9f, 31f, 0 }, new[] { 5.4f, -8.4f, 0.8f, 40f, 1 } };
            for (int i = 0; i < cr.Length; i++)
            {
                float sz = cr[i][2]; bool stacked = i == 5;
                Transform c = G(cargo, "Crate", On(cr[i][0], cr[i][1], stacked ? 1.2f : 0f), new Vector3(0, cr[i][3], 0));
                Material cm = cr[i][4] == 0 ? hullDark : cr[i][4] == 1 ? orange : foilGold;
                M(c, "Box", Box(sz, sz * 0.9f, sz, 0.06f), cm, new Vector3(0, sz * 0.45f, 0));
                M(c, "Strap", Box(sz + 0.03f, sz * 0.9f + 0.03f, 0.09f, 0.02f), darkMetal, new Vector3(0, sz * 0.45f, sz * 0.22f)); M(c, "Strap", Box(sz + 0.03f, sz * 0.9f + 0.03f, 0.09f, 0.02f), darkMetal, new Vector3(0, sz * 0.45f, -sz * 0.22f));
            }
        }

        static GameObject BuildGreenhouse(Transform root, out Light ghLight)
        {
            float ggy = Ground(-18, 12);
            Transform gh = G(root, "Greenhouse", new Vector3(-18, ggy, 12), new Vector3(0, 60, 0));
            GameObject tunnel = M(gh, "Grow tunnel", Vessel(2.2f, 13f, 1.1f), grow, new Vector3(-6.5f, 2.05f, 0), new Vector3(0, 0, -90));
            for (int i = 0; i < 7; i++) M(gh, "Hoop", Tor(2.24f, 0.06f, 36), frame, new Vector3(-4.8f + i * 1.6f, 2.05f, 0), new Vector3(0, 0, 90));
            for (int s = -1; s <= 1; s += 2)
            {
                M(gh, "Base rail", Box(11.6f, 0.18f, 0.18f, 0.03f), darkMetal, new Vector3(0, 0.12f, 1.75f * s));
                for (int i = 0; i < 4; i++) { Rod(gh, "Guy line", new Vector3(-4.8f + i * 3.2f, 3.4f, 1.75f * s), new Vector3(-4.8f + i * 3.2f, 0.05f, 4.2f * s), 0.015f, darkMetal); M(gh, "Stake", Cyl(0.06f, 0.35f, 0.01f, 8), frame, new Vector3(-4.8f + i * 3.2f, 0, 4.2f * s)); }
            }
            M(gh, "End collar", Cyl(1.15f, 0.5f, 0.05f, 24), hull, new Vector3(6.3f, 1.6f, 0), new Vector3(0, 0, -90));
            M(gh, "Door collar", Cyl(1.0f, 0.5f, 0.05f, 24), hull, new Vector3(-6.3f, 1.6f, 0), new Vector3(0, 0, 90));
            M(gh, "Door", Cyl(0.72f, 0.08f, 0.02f, 24), hull, new Vector3(-6.8f, 1.6f, 0), new Vector3(0, 0, 90));
            M(gh, "Door frame", Tor(0.76f, 0.07f, 24), frame, new Vector3(-6.84f, 1.6f, 0), new Vector3(0, 0, 90));
            M(gh, "Door window", Cyl(0.2f, 0.04f, 0.01f, 14), window, new Vector3(-6.87f, 1.85f, 0), new Vector3(0, 0, 90));
            M(gh, "Water tank", Vessel(0.55f, 2.2f, 0.4f, 20), foilSilver, new Vector3(-3.5f, 0.6f, -3.1f), new Vector3(0, 0, -90));
            // flexible tunnel to the habitat
            Transform tube = G(root, "Tunnel to habitat", Vector3.zero);
            Vector3 p0 = gh.TransformPoint(new Vector3(6.6f, 1.6f, 0)), p1 = new Vector3(-12.6f, Ground(0, 0) + 3.2f, 2.45f);
            Rod(tube, "Tunnel", p0, p1, 0.85f, fabric);
            for (int i = 0; i <= 4; i++) { GameObject r = M(tube, "Tunnel hoop", Tor(0.87f, 0.045f, 24), frame, Vector3.Lerp(p0, p1, i / 4f)); r.transform.rotation = Quaternion.FromToRotation(Vector3.up, (p1 - p0).normalized); }
            ghLight = PointLight(gh, "Grow light", new Vector3(0, 5f, 0), new Color(1f, 0.3f, 0.85f), 26000f, 38f);
            return tunnel;
        }

        static void BuildAirMaker(Transform root)
        {
            float agy = Ground(12, 14);
            Transform air = G(root, "Air Maker", new Vector3(12, agy, 14), new Vector3(0, 20, 0));
            M(air, "Skid", Box(5.4f, 1.0f, 3.6f, 0.05f), darkMetal, new Vector3(0, -0.3f, 0));
            M(air, "Reactor box", Box(2.2f, 1.9f, 2.0f, 0.1f), foilGold, new Vector3(-1.2f, 1.15f, 0));
            M(air, "Compressor", Vessel(0.55f, 2.3f, 0.3f, 20), hullDark, new Vector3(0.3f, 0.78f, -1.15f), new Vector3(0, 0, -90));
            M(air, "Intake stack", Cyl(0.32f, 2.9f, 0.03f, 18), frame, new Vector3(-1.7f, 2.1f, 0.5f));
            M(air, "Intake filter", Cyl(0.46f, 0.7f, 0.08f, 18), hullDark, new Vector3(-1.7f, 4.7f, 0.5f));
            M(air, "Intake cap", Taper(0.6f, 0.1f, 0.3f, 18), frame, new Vector3(-1.7f, 5.45f, 0.5f));
            M(air, "Radiator", Box(2.4f, 1.7f, 0.08f, 0.02f), foilSilver, new Vector3(1.3f, 1.75f, 1.3f));
            for (int i = 0; i < 6; i++) M(air, "Radiator fin", Box(0.04f, 1.6f, 0.2f, 0.01f), frame, new Vector3(0.3f + i * 0.4f, 1.75f, 1.42f));
            Rod(air, "Radiator post", new Vector3(0.2f, 0.2f, 1.3f), new Vector3(0.2f, 2.6f, 1.3f), 0.05f, frame); Rod(air, "Radiator post", new Vector3(2.4f, 0.2f, 1.3f), new Vector3(2.4f, 2.6f, 1.3f), 0.05f, frame);
            M(air, "Control cabinet", Box(0.8f, 1.3f, 0.5f, 0.04f), hull, new Vector3(1.9f, 0.85f, -0.3f));
            M(air, "Status light", Box(0.3f, 0.08f, 0.02f, 0.005f), statusGreen, new Vector3(1.9f, 1.3f, -0.56f));
            M(air, "Pipe", MeshKit.Tube("airpipe1", new[] { new Vector3(-0.1f, 1.6f, 0), new Vector3(0.6f, 1.6f, 0), new Vector3(0.6f, 2.9f, 0), new Vector3(3.6f, 3.75f, 0.3f), new Vector3(7.0f, 3.75f, 0.3f) }, 0.07f, 8), frame, Vector3.zero);
            M(air, "Pipe", MeshKit.Tube("airpipe2", new[] { new Vector3(-1.2f, 2.1f, 0), new Vector3(-1.2f, 2.5f, 0), new Vector3(-1.7f, 2.5f, 0.5f) }, 0.09f, 8), frame, Vector3.zero);
            for (int i = 0; i < 3; i++)
            {
                Transform t = G(air, "Oxygen tank", new Vector3(3.6f + i * 1.7f, 0, 0.3f));
                M(t, "Tank", Vessel(0.7f, 3.2f, 0.6f, 24), hull, new Vector3(0, 0.3f, 0));
                M(t, "Band", Tor(0.71f, 0.035f, 24), frame, new Vector3(0, 1.2f, 0)); M(t, "Band", Tor(0.71f, 0.035f, 24), frame, new Vector3(0, 2.6f, 0));
                M(t, "Stand", Cyl(0.5f, 1.3f, 0.03f, 16), darkMetal, new Vector3(0, -0.98f, 0)); M(t, "Valve", Cyl(0.1f, 0.3f, 0.01f, 10), frame, new Vector3(0, 3.45f, 0));
            }
        }

        static GameObject SolarPanelPrototype(Transform root)
        {
            Transform p = G(root, "Solar panel", Vector3.zero);
            Transform top = G(p, "Table", new Vector3(0, 1.7f, 0), new Vector3(-24, 0, 0));
            M(top, "Cells", MeshKit.RBox("solar_cells", new Vector3(4.6f, 0.04f, 2.9f), 0.012f, 0.5f), solar, new Vector3(0, 0.025f, 0));
            M(top, "Frame", Box(4.72f, 0.05f, 3.02f, 0.02f), frame, new Vector3(0, -0.012f, 0));
            for (int i = -1; i <= 1; i++) M(top, "Rib", Box(0.07f, 0.09f, 2.8f, 0.01f), frame, new Vector3(i * 1.6f, -0.07f, 0));
            M(p, "Torque tube", Cyl(0.07f, 4.5f, 0.01f, 10), frame, new Vector3(-2.25f, 1.56f, 0.05f), new Vector3(0, 0, -90));
            for (int s = -1; s <= 1; s += 2)
            {
                Rod(p, "Post", new Vector3(1.5f * s, -0.4f, 0.05f), new Vector3(1.5f * s, 1.56f, 0.05f), 0.06f, frame);
                Rod(p, "Brace", new Vector3(1.5f * s, 0.5f, 0.05f), new Vector3(1.5f * s, 1.25f, -0.95f), 0.03f, frame);
                M(p, "Footing", Cyl(0.24f, 0.6f, 0.02f, 12), darkMetal, new Vector3(1.5f * s, -0.52f, 0.05f));
            }
            M(p, "Junction box", Box(0.35f, 0.25f, 0.18f, 0.02f), hullDark, new Vector3(1.5f, 1.15f, 0.2f));
            return p.gameObject;
        }

        static void BuildShelter(Transform root)
        {
            float sgy = Ground(-32, -24);
            Transform sh = G(root, "Storm shelter", new Vector3(-32, sgy, -24));
            M(sh, "Soil cover", MeshKit.Mound("berm", 9.5f, 8.5f, 3.7f, 5), regolith, Vector3.zero);
            Vector3 d = new Vector3(0.925f, 0, 0.38f); float yaw = Mathf.Atan2(d.x, d.z) * Mathf.Rad2Deg;
            Transform en = G(sh, "Entrance", d * 5.2f, new Vector3(0, yaw, 0));          // local +Z points out of the mound
            M(en, "Arch", Cyl(1.7f, 4.4f, 0.06f, 28), hullDark, new Vector3(0, 0.45f, -0.6f), new Vector3(90, 0, 0));
            for (int i = 0; i < 4; i++) M(en, "Arch rib", Tor(1.72f, 0.06f, 28), frame, new Vector3(0, 0.45f, 0.4f + i * 1.05f), new Vector3(90, 0, 0));
            M(en, "Door", Box(1.5f, 2.0f, 0.12f, 0.04f), orange, new Vector3(0, 1.0f, 3.86f));
            M(en, "Door window", Box(0.5f, 0.35f, 0.04f, 0.01f), window, new Vector3(0, 1.5f, 3.93f));
            M(en, "Door bar", Box(0.9f, 0.07f, 0.07f, 0.02f), frame, new Vector3(0, 0.95f, 3.95f));
            M(en, "Door lamp", Box(0.5f, 0.1f, 0.12f, 0.03f), lampWhite, new Vector3(0, 2.25f, 3.8f));
            for (int s = -1; s <= 1; s += 2)
                for (int row = 0; row < 4; row++) for (int i = 0; i < 3 - row / 2; i++)
                    M(en, "Soil bag", Box(1.05f, 0.34f, 0.55f, 0.15f), sandbag, new Vector3((2.0f + i * 0.2f) * s, 0.17f + row * 0.31f, 3.4f - i * 1.05f - (row % 2) * 0.5f), new Vector3(0, 90 + (row * 13 + i * 7) % 8 - 4, 0));
            for (int i = 0; i < 6; i++)
            {
                float a = i * Mathf.PI / 3f; float x = Mathf.Cos(a) * 12.5f, z = Mathf.Sin(a) * 11.5f, y = Ground(-32 + x, -24 + z) - sgy;
                Transform py = G(sh, "Shield pylon", new Vector3(x, y, z));
                M(py, "Base", Cyl(0.5f, 0.8f, 0.04f, 16), darkMetal, new Vector3(0, -0.6f, 0));
                M(py, "Pole", Taper(0.2f, 0.11f, 4.7f, 14), frame, new Vector3(0, 0.15f, 0));
                M(py, "Coil", Tor(0.42f, 0.07f, 24), foilGold, new Vector3(0, 4.75f, 0)); M(py, "Coil", Tor(0.3f, 0.05f, 24), foilGold, new Vector3(0, 4.45f, 0));
                Ball(py, "Shield emitter", new Vector3(0, 5.05f, 0), Vector3.one * 0.62f, shieldGlow);
                M(py, "Power box", Box(0.4f, 0.5f, 0.3f, 0.03f), hullDark, new Vector3(0.3f, 0.6f, 0));
            }
        }

        static void BuildDish(Transform root)
        {
            float dgy = Ground(20, -14);
            Transform dish = G(root, "Dish", new Vector3(20, dgy, -14));
            M(dish, "Slab", Cyl(1.7f, 1.0f, 0.05f, 24), darkMetal, new Vector3(0, -0.75f, 0));
            M(dish, "Pedestal", Taper(0.75f, 0.42f, 4.6f, 20), hull, new Vector3(0, 0.2f, 0));
            M(dish, "Bearing", Cyl(0.6f, 0.35f, 0.05f, 20), darkMetal, new Vector3(0, 4.75f, 0));
            M(dish, "Cabinet", Box(0.9f, 1.3f, 0.6f, 0.04f), hullDark, new Vector3(1.3f, 0.85f, 0.4f));
            for (int i = 0; i < 9; i++) Rod(dish, "Rung", new Vector3(-0.2f, 0.7f + i * 0.42f, -0.72f + i * 0.03f), new Vector3(0.2f, 0.7f + i * 0.42f, -0.72f + i * 0.03f), 0.02f, frame);
            Transform yoke = G(dish, "Yoke", new Vector3(0, 5.1f, 0), new Vector3(0, 30, 0));
            for (int s = -1; s <= 1; s += 2) M(yoke, "Arm", Box(0.22f, 1.5f, 0.5f, 0.05f), hullDark, new Vector3(0.95f * s, 0.7f, 0));
            M(yoke, "Cross beam", Box(2.1f, 0.3f, 0.5f, 0.05f), hullDark, new Vector3(0, 0.05f, 0));
            Transform head = G(yoke, "Reflector head", new Vector3(0, 1.3f, 0), new Vector3(-52, 0, 0));       // +Y = pointing direction
            M(head, "Reflector", MeshKit.Dish("dish_main", 3.5f, 0.9f, 48, 12), hull, new Vector3(0, 0.3f, 0));
            M(head, "Hub", Cyl(0.75f, 0.6f, 0.06f, 20), hullDark, new Vector3(0, -0.25f, 0));
            M(head, "Counterweight", Box(1.4f, 0.5f, 0.6f, 0.06f), darkMetal, new Vector3(0, -0.6f, 0.9f));
            for (int i = 0; i < 8; i++)
            {
                float a = i * Mathf.PI / 4f; Vector3 rim = new Vector3(Mathf.Cos(a) * 3.4f, 0.3f + 0.85f, Mathf.Sin(a) * 3.4f);
                Rod(head, "Back rib", new Vector3(Mathf.Cos(a) * 0.7f, 0.1f, Mathf.Sin(a) * 0.7f), rim - Vector3.up * 0.08f, 0.035f, frame);
                if (i % 2 == 0) Rod(head, "Feed strut", new Vector3(Mathf.Cos(a) * 3.3f, 1.12f, Mathf.Sin(a) * 3.3f), new Vector3(Mathf.Cos(a) * 0.2f, 3.5f, Mathf.Sin(a) * 0.2f), 0.03f, frame);
            }
            M(head, "Feed horn", Taper(0.16f, 0.3f, 0.5f, 14), frame, new Vector3(0, 3.15f, 0), new Vector3(180, 0, 0));
            M(head, "Feed box", Box(0.4f, 0.3f, 0.4f, 0.04f), foilGold, new Vector3(0, 3.6f, 0));
            Ball(dish, "Dish beacon", new Vector3(0, 5.3f, -0.7f), Vector3.one * 0.3f, beacon);
        }

        /// <summary>A wheel: a metal drum with cleats, merged into one mesh. Axis along local X.</summary>
        static Mesh WheelMesh()
        {
            if (_wheel != null) return _wheel;
            var tmp = new GameObject("tmp").transform;
            var prof = new[] { new Vector2(0.30f, -0.21f), new Vector2(0.52f, -0.21f), new Vector2(0.58f, -0.15f), new Vector2(0.60f, 0f), new Vector2(0.58f, 0.15f), new Vector2(0.52f, 0.21f), new Vector2(0.30f, 0.21f), new Vector2(0.30f, -0.21f) };
            M(tmp, "t", MeshKit.Lathe("wheel_drum", prof, 32, 50f, 1f, 1f), null, Vector3.zero, new Vector3(0, 0, 90));
            for (int i = 0; i < 20; i++) { GameObject c = M(tmp, "c", Box(0.40f, 0.05f, 0.07f, 0.012f), null, Vector3.zero); c.transform.localRotation = Quaternion.Euler(i * 18f, 0, 0) * Quaternion.Euler(0, i % 2 == 0 ? 14 : -14, 0); c.transform.localPosition = Quaternion.Euler(i * 18f, 0, 0) * new Vector3(0, 0.605f, 0); }
            for (int i = 0; i < 6; i++) { GameObject sp = M(tmp, "s", Box(0.06f, 0.56f, 0.07f, 0.015f), null, Vector3.zero); sp.transform.localRotation = Quaternion.Euler(i * 60f, 0, 0); sp.transform.localPosition = Quaternion.Euler(i * 60f, 0, 0) * new Vector3(0.12f, 0.28f, 0); }
            var ci = new List<CombineInstance>();
            foreach (MeshFilter mf in tmp.GetComponentsInChildren<MeshFilter>()) ci.Add(new CombineInstance { mesh = mf.sharedMesh, transform = mf.transform.localToWorldMatrix });
            var m = new Mesh { name = "wheel" }; m.CombineMeshes(ci.ToArray(), true, true); m.RecalculateBounds();
            Object.DestroyImmediate(tmp.gameObject);
            MeshKit.Save(m); _wheel = m;
            return m;
        }
        static Mesh _wheel;

        static Transform BuildRover(Transform root, Vector3 at, float yaw, out ParticleSystem dust)
        {
            Transform r = G(root, "Rover", at, new Vector3(0, yaw, 0));
            M(r, "Chassis", Box(2.0f, 0.34f, 5.0f, 0.08f), darkMetal, new Vector3(0, 1.02f, 0));
            M(r, "Belly pan", Box(1.7f, 0.2f, 3.6f, 0.06f), foilGold, new Vector3(0, 0.82f, 0.1f));
            M(r, "Cabin", Box(2.4f, 1.75f, 3.5f, 0.38f), hull, new Vector3(0, 2.05f, 0.45f));
            M(r, "Windshield", Box(1.85f, 0.85f, 0.1f, 0.04f), glass, new Vector3(0, 2.42f, 2.16f), new Vector3(-16, 0, 0));
            M(r, "Lower window", Box(1.5f, 0.42f, 0.1f, 0.04f), glass, new Vector3(0, 1.63f, 2.18f), new Vector3(12, 0, 0));
            for (int s = -1; s <= 1; s += 2)
            {
                M(r, "Side window", Box(0.08f, 0.62f, 1.25f, 0.03f), glass, new Vector3(1.18f * s, 2.42f, 1.15f));
                M(r, "Side port", Box(0.08f, 0.5f, 0.6f, 0.03f), window, new Vector3(1.18f * s, 2.42f, -0.35f));
                M(r, "Stripe", Box(0.04f, 0.2f, 3.0f, 0.01f), orange, new Vector3(1.205f * s, 1.72f, 0.45f));
                M(r, "Headlight", Cyl(0.13f, 0.08f, 0.02f, 14), lampWhite, new Vector3(0.82f * s, 1.42f, 2.2f), new Vector3(90, 0, 0));
                M(r, "Fender", Box(0.5f, 0.06f, 4.9f, 0.03f), hullDark, new Vector3(1.42f * s, 1.32f, 0));
                var rr = new List<Vector3> { new Vector3(1.0f * s, 2.9f, 1.9f), new Vector3(1.0f * s, 3.08f, 1.6f), new Vector3(1.0f * s, 3.08f, -0.9f), new Vector3(1.0f * s, 2.9f, -1.2f) };
                M(r, "Roof rail", MeshKit.Tube("rovrail" + s, rr, 0.03f, 6), frame, Vector3.zero);
                // suit ports at the back: the crew climb straight into their suits from inside
                M(r, "Suit port", Box(0.62f, 0.9f, 0.3f, 0.1f), fabric, new Vector3(0.6f * s, 2.0f, -1.42f));
                M(r, "Suit port ring", Tor(0.3f, 0.04f, 20), frame, new Vector3(0.6f * s, 2.1f, -1.3f), new Vector3(90, 0, 0));
            }
            M(r, "Light bar", Box(1.5f, 0.09f, 0.12f, 0.03f), lampWhite, new Vector3(0, 3.0f, 2.0f));
            M(r, "Roof pack", Box(1.3f, 0.3f, 1.4f, 0.06f), foilSilver, new Vector3(0, 3.06f, 0.2f));
            Transform ant = G(r, "Antenna", new Vector3(-0.7f, 2.95f, -0.9f)); Rod(ant, "Mast", Vector3.zero, new Vector3(0, 0.7f, 0), 0.03f, frame);
            M(ant, "Dish", MeshKit.Dish("dish_small", 0.6f, 0.16f, 24, 6), hull, new Vector3(0, 0.75f, 0), new Vector3(-40, 150, 0), 0.75f);
            Transform mast = G(r, "Camera mast", new Vector3(0.85f, 2.95f, -0.9f)); Rod(mast, "Mast", Vector3.zero, new Vector3(0, 1.1f, 0), 0.04f, frame);
            M(mast, "Camera head", Box(0.42f, 0.2f, 0.24f, 0.04f), hull, new Vector3(0, 1.2f, 0)); M(mast, "Lens", Cyl(0.06f, 0.05f, 0.01f, 12), glass, new Vector3(0.1f, 1.2f, 0.12f), new Vector3(90, 0, 0)); M(mast, "Lens", Cyl(0.06f, 0.05f, 0.01f, 12), glass, new Vector3(-0.1f, 1.2f, 0.12f), new Vector3(90, 0, 0));
            M(r, "Sample box", Box(1.5f, 0.5f, 0.8f, 0.06f), foilGold, new Vector3(0, 1.45f, -2.0f));
            Rod(r, "Drill arm", new Vector3(0, 1.3f, 2.35f), new Vector3(0.5f, 1.75f, 3.0f), 0.05f, frame); Rod(r, "Drill arm", new Vector3(0.5f, 1.75f, 3.0f), new Vector3(0.5f, 0.9f, 3.25f), 0.045f, frame);
            M(r, "Drill head", Cyl(0.11f, 0.35f, 0.02f, 12), darkMetal, new Vector3(0.5f, 0.6f, 3.25f));
            Mesh wheel = WheelMesh();
            for (int i = 0; i < 6; i++)
            {
                float x = i % 2 == 0 ? -1.42f : 1.42f, z = -1.9f + (i / 2) * 1.9f;
                Rod(r, "Suspension", new Vector3(Mathf.Sign(x) * 0.9f, 1.0f, z * 0.85f), new Vector3(Mathf.Sign(x) * 1.2f, 0.62f, z), 0.06f, frame);
                Rod(r, "Axle", new Vector3(Mathf.Sign(x) * 1.15f, 0.62f, z), new Vector3(x, 0.62f, z), 0.07f, darkMetal);
                Transform w = G(r, "WheelSpin", new Vector3(x, 0.62f, z));
                M(w, "Wheel", wheel, frame, Vector3.zero);
                M(w, "Hub", Cyl(0.16f, 0.5f, 0.03f, 12), darkMetal, new Vector3(-0.25f, 0, 0), new Vector3(0, 0, -90));
            }
            dust = Particles("Rover dust", r, new Color(0.78f, 0.55f, 0.38f, 0.10f), new Vector3(0, 0.5f, -2.6f), new Vector3(2.8f, 0.3f, 0.8f), new Vector3(0, 0.7f, 0), 2.2f, 2.6f, false);
            return r;
        }

        /// <summary>A suited crew member, about 1.85 m tall, with a mirrored visor (no face) and jointed limbs.</summary>
        static Transform BuildAstronaut(Transform root, string name, Vector3 at, float yaw, Color colour, int index)
        {
            Material suit = Mat("Suit" + index, Color.Lerp(new Color(0.96f, 0.96f, 0.95f), colour, 0.05f), 0f, 0.3f, null, _suitTex, 10f);
            Material stripe = Mat("SuitStripe" + index, colour, 0f, 0.4f);
            Material grey = Mat("SuitGrey", new Color(0.32f, 0.33f, 0.35f), 0.1f, 0.35f);
            Transform c = G(root, name, at, new Vector3(0, yaw, 0));
            var rig = c.gameObject.AddComponent<AstronautRig>(); rig.IdleSeed = index * 2.7f;
            Transform body = G(c, "Body", new Vector3(0, 0.95f, 0)); rig.Body = body;
            M(body, "Pelvis", Box(0.38f, 0.24f, 0.28f, 0.09f), suit, new Vector3(0, 0.05f, 0));
            M(body, "Torso", Box(0.52f, 0.52f, 0.34f, 0.13f), suit, new Vector3(0, 0.42f, 0));
            M(body, "Waist ring", Tor(0.2f, 0.03f, 20), frame, new Vector3(0, 0.17f, 0));
            M(body, "Chest pack", Box(0.27f, 0.2f, 0.1f, 0.03f), grey, new Vector3(0, 0.44f, 0.2f));
            M(body, "Chest stripe", Box(0.28f, 0.035f, 0.11f, 0.01f), stripe, new Vector3(0, 0.56f, 0.2f));
            M(body, "Chest light", Box(0.07f, 0.03f, 0.02f, 0.005f), statusGreen, new Vector3(0.07f, 0.44f, 0.252f));
            M(body, "Backpack", Box(0.46f, 0.6f, 0.22f, 0.07f), suit, new Vector3(0, 0.46f, -0.26f));
            M(body, "Pack stripe", Box(0.47f, 0.06f, 0.23f, 0.02f), stripe, new Vector3(0, 0.68f, -0.26f));
            M(body, "Pack vent", Box(0.3f, 0.2f, 0.03f, 0.01f), grey, new Vector3(0, 0.38f, -0.395f));
            Rod(body, "Pack antenna", new Vector3(0.18f, 0.75f, -0.3f), new Vector3(0.18f, 1.08f, -0.3f), 0.008f, darkMetal);
            M(body, "Neck ring", Tor(0.165f, 0.03f, 20), frame, new Vector3(0, 0.7f, 0.01f));
            Transform head = G(body, "Head", new Vector3(0, 0.72f, 0)); rig.Head = head;
            Ball(head, "Helmet", new Vector3(0, 0.17f, -0.02f), Vector3.one * 0.38f, suit);
            Ball(head, "Visor", new Vector3(0, 0.175f, 0.035f), new Vector3(0.345f, 0.32f, 0.33f), visor);
            for (int s = -1; s <= 1; s += 2) M(head, "Helmet lamp", Box(0.05f, 0.05f, 0.08f, 0.012f), lampWhite, new Vector3(0.195f * s, 0.24f, 0.05f));
            for (int s = -1; s <= 1; s += 2)
            {
                Transform sh = G(body, s < 0 ? "ShoulderL" : "ShoulderR", new Vector3(0.325f * s, 0.6f, 0));
                Ball(sh, "Shoulder", Vector3.zero, Vector3.one * 0.2f, suit);
                M(sh, "Upper arm", Vessel(0.078f, 0.34f, 0.07f, 14), suit, new Vector3(0, -0.33f, 0));
                M(sh, "Arm stripe", Tor(0.08f, 0.018f, 14), stripe, new Vector3(0, -0.16f, 0));
                Transform el = G(sh, "Elbow", new Vector3(0, -0.31f, 0));
                M(el, "Forearm", Vessel(0.07f, 0.3f, 0.06f, 14), suit, new Vector3(0, -0.29f, 0));
                M(el, "Wrist ring", Tor(0.07f, 0.016f, 14), frame, new Vector3(0, -0.26f, 0));
                Ball(el, "Glove", new Vector3(0, -0.34f, 0.01f), new Vector3(0.13f, 0.17f, 0.15f), grey);
                if (s < 0) { rig.ShoulderL = sh; rig.ElbowL = el; } else { rig.ShoulderR = sh; rig.ElbowR = el; }
                Transform hip = G(c, s < 0 ? "HipL" : "HipR", new Vector3(0.12f * s, 0.95f, 0));
                M(hip, "Thigh", Vessel(0.108f, 0.48f, 0.09f, 14), suit, new Vector3(0, -0.46f, 0));
                Transform kn = G(hip, "Knee", new Vector3(0, -0.44f, 0));
                M(kn, "Knee stripe", Tor(0.1f, 0.022f, 14), stripe, new Vector3(0, -0.02f, 0));
                M(kn, "Shin", Vessel(0.098f, 0.44f, 0.08f, 14), suit, new Vector3(0, -0.43f, 0));
                M(kn, "Boot", Box(0.19f, 0.15f, 0.33f, 0.06f), grey, new Vector3(0, -0.435f, 0.055f));
                M(kn, "Boot ring", Tor(0.1f, 0.02f, 14), frame, new Vector3(0, -0.34f, 0));
                if (s < 0) { rig.HipL = hip; rig.KneeL = kn; } else { rig.HipR = hip; rig.KneeR = kn; }
            }
            return c;
        }

        static Transform BuildLaunchSite(Transform root, Vector3 p, out Light flame, out ParticleSystem exhaust, out ParticleSystem padDust, out Transform flameMesh)
        {
            Transform lp = G(root, "Launch pad", p);
            M(lp, "Pad base", Cyl(17.4f, 1.6f, 0.15f, 64), regolith, new Vector3(0, -1.48f, 0));
            M(lp, "Pad surface", MeshKit.Disc("pad_disc", 17f), pad, new Vector3(0, 0.125f, 0));
            for (int i = 0; i < 8; i++) { float a = i * Mathf.PI / 4f + 0.39f; Transform bl = G(lp, "Pad light", new Vector3(Mathf.Cos(a) * 16.2f, 0.12f, Mathf.Sin(a) * 16.2f)); M(bl, "Housing", Cyl(0.22f, 0.25f, 0.03f, 12), darkMetal, Vector3.zero); Ball(bl, "Pad beacon", new Vector3(0, 0.32f, 0), Vector3.one * 0.26f, beacon); }

            // service tower on the far side (+Z), with a crew arm
            Transform tw = G(lp, "Service tower", new Vector3(3.2f, 0.12f, 8.6f));
            const float th = 16.5f, tw2 = 1.3f;
            for (int sx = -1; sx <= 1; sx += 2) for (int sz = -1; sz <= 1; sz += 2) Rod(tw, "Post", new Vector3(tw2 * sx, 0, tw2 * sz), new Vector3(tw2 * sx, th, tw2 * sz), 0.11f, frame);
            for (int lv = 0; lv <= 5; lv++)
            {
                float y = lv * th / 5f;
                Rod(tw, "Girt", new Vector3(-tw2, y, -tw2), new Vector3(tw2, y, -tw2), 0.06f, frame); Rod(tw, "Girt", new Vector3(-tw2, y, tw2), new Vector3(tw2, y, tw2), 0.06f, frame);
                Rod(tw, "Girt", new Vector3(-tw2, y, -tw2), new Vector3(-tw2, y, tw2), 0.06f, frame); Rod(tw, "Girt", new Vector3(tw2, y, -tw2), new Vector3(tw2, y, tw2), 0.06f, frame);
                if (lv == 5) break;
                float y2 = y + th / 5f; int f = lv % 2 == 0 ? 1 : -1;
                Rod(tw, "Brace", new Vector3(-tw2 * f, y, -tw2), new Vector3(tw2 * f, y2, -tw2), 0.04f, frame); Rod(tw, "Brace", new Vector3(-tw2 * f, y, tw2), new Vector3(tw2 * f, y2, tw2), 0.04f, frame);
                Rod(tw, "Brace", new Vector3(-tw2, y, -tw2 * f), new Vector3(-tw2, y2, tw2 * f), 0.04f, frame); Rod(tw, "Brace", new Vector3(tw2, y, -tw2 * f), new Vector3(tw2, y2, tw2 * f), 0.04f, frame);
            }
            M(tw, "Top deck", Box(3.2f, 0.12f, 3.2f, 0.03f), darkMetal, new Vector3(0, th + 0.05f, 0));
            Rod(tw, "Lightning rod", new Vector3(0, th, 0), new Vector3(0, th + 3.2f, 0), 0.035f, frame); Ball(tw, "Tower beacon", new Vector3(0, th + 3.3f, 0), Vector3.one * 0.3f, beacon);
            M(tw, "Lift car", Box(1.5f, 2.2f, 1.5f, 0.06f), hull, new Vector3(0, 1.3f, 0));
            M(tw, "Flood light", Box(0.9f, 0.5f, 0.2f, 0.04f), lampWhite, new Vector3(-0.4f, th - 1.2f, -tw2 - 0.15f), new Vector3(25, 0, 0));
            M(tw, "Crew arm", Box(1.0f, 0.12f, 5.6f, 0.03f), darkMetal, new Vector3(-3.2f * 0.5f, 12.35f, -4.0f), new Vector3(0, 20, 0));
            for (int s = -1; s <= 1; s += 2) M(tw, "Arm rail", Box(0.05f, 0.05f, 5.6f, 0.01f), frame, new Vector3(-1.6f + 0.5f * s, 13.4f, -4.0f), new Vector3(0, 20, 0));

            // propellant made on Mars, stored beside the pad
            Transform farm = G(lp, "Propellant store", new Vector3(-8.5f, 0.13f, 7.5f), new Vector3(0, 35, 0));
            for (int i = 0; i < 2; i++)
            {
                M(farm, "Tank", Vessel(1.25f, 6.2f, 0.9f, 24), i == 0 ? hull : foilSilver, new Vector3(-3.1f, 1.75f, i * 3.2f), new Vector3(0, 0, -90));
                for (int k = 0; k < 2; k++) { M(farm, "Saddle", Box(0.3f, 1.3f, 2.4f, 0.05f), darkMetal, new Vector3(-1.6f + k * 3.2f, 0.6f, i * 3.2f)); M(farm, "Band", Tor(1.27f, 0.04f, 24), frame, new Vector3(-1.6f + k * 3.2f, 1.75f, i * 3.2f), new Vector3(0, 0, 90)); }
            }
            M(farm, "Pump", Box(1.0f, 0.9f, 0.8f, 0.06f), foilGold, new Vector3(4.2f, 0.5f, 1.6f));

            // ---- the ascent ship: engines, tank section, crew cabin, nose; four legs ----
            Transform ship = G(lp, "Ascent ship", Vector3.zero);
            var bell = new[] { new Vector2(0.22f, 1.25f), new Vector2(0.3f, 0.9f), new Vector2(0.46f, 0.45f), new Vector2(0.6f, 0f), new Vector2(0.56f, 0f), new Vector2(0.42f, 0.45f), new Vector2(0.26f, 0.9f), new Vector2(0.18f, 1.25f) };
            Mesh bellMesh = MeshKit.Lathe("engine_bell", bell, 24, 60f, 1f, 1f);
            M(ship, "Engine", bellMesh, darkMetal, new Vector3(0, 1.75f, 0));
            for (int i = 0; i < 4; i++) { float a = i * Mathf.PI / 2f; M(ship, "Engine", bellMesh, darkMetal, new Vector3(Mathf.Cos(a) * 1.35f, 1.75f, Mathf.Sin(a) * 1.35f)); }
            M(ship, "Thrust section", Cyl(2.3f, 0.9f, 0.08f, 40), hullDark, new Vector3(0, 2.9f, 0));
            M(ship, "Heat blanket", MeshKit.Lathe("blanket", new[] { new Vector2(2.42f, 0), new Vector2(2.42f, 1.1f) }, 40, 40f, 3f, 0.5f), foilGold, new Vector3(0, 3.75f, 0));
            var body = new List<Vector2> { new Vector2(0, 3.7f), new Vector2(2.4f, 3.7f), new Vector2(2.4f, 10.6f), new Vector2(1.95f, 12.0f), new Vector2(1.95f, 14.5f) };
            for (int i = 1; i <= 10; i++) { float t = i / 10f; body.Add(new Vector2(Mathf.Lerp(1.95f, 0.32f, Mathf.Pow(t, 1.7f)), 14.5f + 4.0f * t)); }
            body.Add(new Vector2(0, 18.62f));
            M(ship, "Ship body", MeshKit.Lathe("ship_body", body.ToArray(), 48, 30f, 2f, 0.125f), hull, Vector3.zero);
            M(ship, "Flange", Tor(2.42f, 0.06f, 48), frame, new Vector3(0, 4.9f, 0)); M(ship, "Flange", Tor(2.42f, 0.06f, 48), frame, new Vector3(0, 7.7f, 0)); M(ship, "Flange", Tor(2.42f, 0.06f, 48), frame, new Vector3(0, 10.55f, 0));
            M(ship, "Flange", Tor(1.97f, 0.05f, 48), frame, new Vector3(0, 12.05f, 0)); M(ship, "Flange", Tor(1.97f, 0.05f, 48), frame, new Vector3(0, 14.5f, 0));
            M(ship, "Colour band", MeshKit.Lathe("shipband", new[] { new Vector2(2.412f, 0), new Vector2(2.412f, 0.7f) }, 48, 40f, 2f, 0.125f), orange, new Vector3(0, 9.3f, 0));
            M(ship, "Dark band", MeshKit.Lathe("shipband2", new[] { new Vector2(2.412f, 0), new Vector2(1.962f, 1.4f) }, 48, 40f, 2f, 0.125f), hullDark, new Vector3(0, 10.6f, 0));
            M(ship, "Nose cap", MeshKit.Lathe("nosecap", new[] { new Vector2(0.62f, 0), new Vector2(0.33f, 0.72f), new Vector2(0, 0.86f) }, 24, 50f, 1f, 1f), hullDark, new Vector3(0, 17.78f, 0));
            M(ship, "Cable cover", Box(0.3f, 6.4f, 0.16f, 0.05f), hullDark, new Vector3(2.44f * 0.7071f, 7.2f, -2.44f * 0.7071f), new Vector3(0, 45, 0));
            M(ship, "Nose band", MeshKit.Lathe("noseband", new[] { new Vector2(1.962f, 0), new Vector2(1.962f, 0.26f) }, 48, 40f, 2f, 0.125f), orange, new Vector3(0, 14.18f, 0));
            for (int i = 0; i < 8; i++) { float a = i * Mathf.PI / 4f + 0.2f; Vector3 d = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)); Porthole(ship, d * 1.96f + Vector3.up * 13.35f, d, 0.27f, window); }
            for (int i = 0; i < 12; i++) { float a = i * Mathf.PI / 6f; Vector3 d = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)); M(ship, "Roll mark", Box(0.62f, 0.42f, 0.04f, 0.01f), darkMetal, d * 2.4f + Vector3.up * 8.6f).transform.localRotation = Quaternion.LookRotation(d); }
            {
                float a = -1.95f; Vector3 d = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)); Transform sv = G(ship, "Service hatch", d * 2.41f + Vector3.up * 6.3f); sv.localRotation = Quaternion.FromToRotation(Vector3.up, d);
                M(sv, "Frame", Tor(0.56f, 0.05f, 24), frame, Vector3.zero); M(sv, "Cover", Cyl(0.52f, 0.05f, 0.015f, 24), hullDark, new Vector3(0, -0.02f, 0)); M(sv, "Latch", Box(0.3f, 0.05f, 0.08f, 0.01f), frame, new Vector3(0, 0.03f, 0));
            }
            for (int i = 0; i < 4; i++)
            {
                float b = i * Mathf.PI / 2f + 0.785f; Vector3 e = new Vector3(Mathf.Cos(b), 0, Mathf.Sin(b));
                Transform pod = G(ship, "Thruster pod", e * 2.0f + Vector3.up * 14.1f); pod.localRotation = Quaternion.LookRotation(e);
                M(pod, "Pod", Box(0.5f, 0.45f, 0.3f, 0.08f), hullDark, Vector3.zero); M(pod, "Jet", Taper(0.05f, 0.09f, 0.14f, 10), darkMetal, new Vector3(0, 0, 0.14f), new Vector3(90, 0, 0));
                // landing leg
                Vector3 foot = e * 4.7f + Vector3.up * 0.2f, knee = e * 2.42f + Vector3.up * 6.0f, low = e * 2.35f + Vector3.up * 3.3f, mid = Vector3.Lerp(knee, foot, 0.72f);
                Rod(ship, "Ship leg", knee, foot, 0.13f, hull); Rod(ship, "Leg strut", low, mid, 0.07f, frame);
                Vector3 side = Vector3.Cross(Vector3.up, e) * 0.9f;
                Rod(ship, "Leg strut", low + side * 0.9f, mid, 0.045f, frame); Rod(ship, "Leg strut", low - side * 0.9f, mid, 0.045f, frame);
                M(ship, "Leg fairing", Box(0.5f, 1.3f, 0.3f, 0.1f), hullDark, e * 2.45f + Vector3.up * 5.8f).transform.localRotation = Quaternion.LookRotation(e);
                M(ship, "Foot pad", Cyl(0.62f, 0.16f, 0.05f, 18), darkMetal, e * 4.7f + Vector3.up * 0.12f);
            }
            // crew hatch faces the tower
            Transform hatch = G(ship, "Crew hatch", new Vector3(0.67f, 12.95f, 1.84f), new Vector3(0, 20, 0));
            M(hatch, "Door", Box(0.9f, 1.3f, 0.08f, 0.2f), hullDark, Vector3.zero); M(hatch, "Door window", Cyl(0.14f, 0.05f, 0.01f, 14), window, new Vector3(0, 0.3f, 0.03f), new Vector3(90, 0, 0));

            flame = PointLight(ship, "Engine flame", new Vector3(0, 1.2f, 0), new Color(1f, 0.72f, 0.42f), 0f, 260f); flame.enabled = false;
            var fm = new Material(Shader.Find("HDRP/Unlit")) { name = "FlameCore" };
            fm.SetFloat("_SurfaceType", 1f); fm.SetFloat("_BlendMode", 1f); fm.SetColor("_UnlitColor", new Color(1f, 0.80f, 0.52f, 0.85f)); fm.SetFloat("_DoubleSidedEnable", 1f);
            fm.SetColor("_EmissiveColor", new Color(1f, 0.62f, 0.3f) * 9f); fm.SetFloat("_EmissiveExposureWeight", 0f);
            HDMaterial.ValidateMaterial(fm); AssetDatabase.CreateAsset(fm, TerrainImporter.GeneratedDir + "/FlameCore.mat");
            flameMesh = M(ship, "Flame", MeshKit.Lathe("flame", new[] { new Vector2(0.0f, -11f), new Vector2(0.55f, -6f), new Vector2(1.25f, -1.6f), new Vector2(1.55f, -0.4f), new Vector2(1.2f, 0f) }, 24, 80f, 1f, 1f), fm, new Vector3(0, 1.75f, 0)).transform;
            flameMesh.gameObject.GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;
            flameMesh.localScale = Vector3.zero;
            exhaust = Particles("Exhaust", ship, new Color(1f, 0.84f, 0.66f, 0.42f), new Vector3(0, 0.6f, 0), new Vector3(3.4f, 0.6f, 3.4f), new Vector3(0, -30f, 0), 5.5f, 2.2f, true);
            padDust = Particles("Pad dust", lp, new Color(0.80f, 0.60f, 0.44f, 0.16f), new Vector3(0, 1.2f, 0), new Vector3(1, 1, 1), new Vector3(0, 1.6f, 0), 11f, 6.5f, false);
            var psh = padDust.shape; psh.shapeType = ParticleSystemShapeType.Circle; psh.radius = 3.5f; psh.radiusThickness = 1f; psh.rotation = new Vector3(90, 0, 0); psh.scale = Vector3.one;
            var pm = padDust.main; pm.startSpeed = new ParticleSystem.MinMaxCurve(9f, 26f); pm.startSize = new ParticleSystem.MinMaxCurve(7f, 15f); pm.maxParticles = 1500;
            var lim = padDust.limitVelocityOverLifetime; lim.enabled = true; lim.drag = 0.9f; lim.dampen = 0.06f; lim.limit = 60f;
            return ship;
        }

        public static void Build(Terrain terrain, Light sun, Volume skyVolume, Camera cam)
        {
            _terrain = terrain; Mats.Clear(); MeshKit.Begin(); _wheel = null; _soft = null;
            MakeMaterials();
            var root = new GameObject("Lakeshore Outpost").transform;
            float gy = Ground(0, 0);

            BuildHabitat(root, gy);
            Light ghLight; GameObject tunnel = BuildGreenhouse(root, out ghLight);
            BuildAirMaker(root);

            // ---- solar field ----
            Transform sf = G(root, "Solar field", Vector3.zero);
            GameObject proto = SolarPanelPrototype(sf);
            for (int r = 0; r < 4; r++)
                for (int c = 0; c < 7; c++)
                {
                    float x = 22 + c * 5.2f, z = -46 + r * 6.5f;
                    GameObject pnl = r == 0 && c == 0 ? proto : Object.Instantiate(proto, sf); pnl.name = "Solar panel";
                    pnl.transform.position = On(x, z);
                }
            for (int r = 0; r < 4; r++) GroundTube(sf, "Row cable " + r, new[] { new[] { 20f, -45.4f + r * 6.5f }, new[] { 54f, -45.4f + r * 6.5f } }, 0.05f, darkMetal);
            GroundTube(sf, "Trunk cable", new[] { new[] { 20f, -45.4f }, new[] { 19.2f, -24f }, new[] { 12f, -12f }, new[] { 3.5f, -3.2f } }, 0.08f, darkMetal);
            M(sf, "Power cabinet", Box(1.3f, 1.5f, 0.8f, 0.05f), hull, On(18.4f, -24.5f, 0.75f), new Vector3(0, 12, 0));
            M(sf, "Cabinet light", Box(0.3f, 0.08f, 0.02f, 0.005f), statusGreen, On(18.4f, -24.5f, 1.25f) + Quaternion.Euler(0, 12, 0) * new Vector3(0, 0, -0.41f), new Vector3(0, 12, 0));

            BuildShelter(root);
            BuildDish(root);
            GroundTube(root, "Dish cable", new[] { new[] { 18.6f, -13.6f }, new[] { 10f, -8f }, new[] { 3.2f, -3.0f } }, 0.05f, darkMetal);
            GroundTube(root, "Air pipe", new[] { new[] { 9.5f, 12.6f }, new[] { 6.5f, 8.5f }, new[] { 3.4f, 5.6f } }, 0.09f, frame);

            // weather mast (wind, temperature, dust)
            Transform wm = G(root, "Weather mast", On(29f, 7f));
            M(wm, "Base", Cyl(0.4f, 0.6f, 0.03f, 12), darkMetal, new Vector3(0, -0.45f, 0)); Rod(wm, "Mast", Vector3.zero, new Vector3(0, 4.2f, 0), 0.04f, frame);
            Rod(wm, "Boom", new Vector3(0, 3.6f, 0), new Vector3(0.9f, 3.6f, 0), 0.02f, frame); Rod(wm, "Boom", new Vector3(0, 3.1f, 0), new Vector3(-0.5f, 3.1f, 0.6f), 0.02f, frame);
            M(wm, "Wind sensor", Cyl(0.05f, 0.18f, 0.01f, 10), hull, new Vector3(0.9f, 3.6f, 0)); M(wm, "Sensor", Box(0.12f, 0.12f, 0.12f, 0.02f), foilGold, new Vector3(-0.5f, 3.1f, 0.6f));
            M(wm, "Panel", MeshKit.RBox("solar_small", new Vector3(0.7f, 0.03f, 0.5f), 0.01f, 2f), solar, new Vector3(0, 1.6f, -0.2f), new Vector3(-35, 0, 0));
            M(wm, "Logger", Box(0.3f, 0.4f, 0.2f, 0.03f), hull, new Vector3(0, 1.0f, 0.1f));

            // ---- rover ----
            ParticleSystem roverDust, fieldDust;
            Transform rover = BuildRover(root, On(-9, -19), 25f, out roverDust);

            // ---- launch site ----
            Vector3 p = On(170, 130);
            Light flame; ParticleSystem exhaust, padDust; Transform flameMesh;
            Transform ship = BuildLaunchSite(root, p, out flame, out exhaust, out padDust, out flameMesh);

            // ---- path lights ----
            float[][] lamps = { new[] { -4f, -9f }, new[] { 12f, -8f }, new[] { -20f, -6f }, new[] { 6f, 9f }, new[] { -26f, -14f }, new[] { 30f, -22f } };
            var lampLights = new List<Light>();
            foreach (float[] l in lamps)
            {
                Transform lt = G(root, "Lamp", On(l[0], l[1]));
                M(lt, "Lamp base", Cyl(0.2f, 0.6f, 0.03f, 12), darkMetal, new Vector3(0, -0.48f, 0)); M(lt, "Lamp post", Taper(0.07f, 0.045f, 3.0f, 10), frame, Vector3.zero);
                M(lt, "Lamp head", Box(0.42f, 0.12f, 0.3f, 0.04f), hullDark, new Vector3(0, 3.05f, 0)); M(lt, "Lamp glow", Box(0.32f, 0.04f, 0.2f, 0.01f), window, new Vector3(0, 2.98f, 0));
                lampLights.Add(PointLight(lt, "Lamp light", new Vector3(0, 2.85f, 0), new Color(1f, 0.78f, 0.5f), 3200f, 22f));
            }

            // ---- the field site at the delta (real place: Three Forks, where Perseverance left sample tubes) ----
            JsonValue meta = TerrainImporter.Meta();
            Vector3 forks = TerrainImporter.LandmarkPosition(meta, "three_forks"); forks = On(forks.x, forks.z);
            Vector3 delta = TerrainImporter.LandmarkPosition(meta, "delta_front"); delta = On(delta.x, delta.z);
            Transform site = G(root, "Field site", forks);
            for (int i = 0; i < 3; i++) { float a = i * Mathf.PI * 2f / 3f; Rod(site, "Tripod leg", new Vector3(Mathf.Cos(a) * 1.3f, 0, Mathf.Sin(a) * 1.3f), new Vector3(0, 3.6f, 0), 0.05f, frame); }
            Rod(site, "Drill string", new Vector3(0, 3.6f, 0), new Vector3(0, 0.1f, 0), 0.04f, darkMetal); M(site, "Drill motor", Box(0.4f, 0.5f, 0.4f, 0.05f), foilGold, new Vector3(0, 3.5f, 0));
            Ball(site, "Site beacon", new Vector3(0, 4.2f, 0), Vector3.one * 0.4f, beacon);
            M(site, "Sample case", Box(0.9f, 0.4f, 0.5f, 0.05f), hull, new Vector3(1.8f, 0.2f, 0.6f), new Vector3(0, 30, 0));

            // ---- crew in suits (no faces: mirrored visors only) ----
            Color[] suitColors = { new Color(0.24f, 0.78f, 0.60f), new Color(0.90f, 0.30f, 0.22f), new Color(0.95f, 0.72f, 0.20f) };
            float[][] crewAt = { new[] { -12f, 7f, 150f }, new[] { -6.5f, -15.5f, 40f }, new[] { 14f, 10.5f, 250f } };
            var crewRoots = new Transform[3];
            for (int i = 0; i < 3; i++) crewRoots[i] = BuildAstronaut(root, "Crew " + i, On(crewAt[i][0], crewAt[i][1]), crewAt[i][2], suitColors[i], i);

            BuildRocks(root, forks, p);
            BuildGroundMarks(root, p);

            // everything built so far stands still, except the things that move
            var movers = new HashSet<Transform> { ship, rover, crewRoots[0], crewRoots[1], crewRoots[2] };
            foreach (Transform child in root) if (!movers.Contains(child) && child.name != "Launch pad") MarkStatic(child);
            foreach (Transform child in ship.parent) if (child != ship) MarkStatic(child);

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
            Shot(shots, "shelter", On(-10, -40, 4.5f), On(-30, -23, 2.2f), 42f);
            Shot(shots, "dish", On(34, -30, 3f), On(20, -14, 6.5f), 40f);
            Shot(shots, "earthrise_dish", On(34, -30, 3f), On(20, -14, 9f), 40f);
            Shot(shots, "airmaker", On(26, 28, 3.5f), On(13, 14.5f, 2f), 40f);
            Shot(shots, "garage", On(-17, -36, 3.2f), On(-9, -19, 1.5f), 40f);
            Shot(shots, "rover_storm_return", On(-22, -34, 3f), On(-9, -19, 1.5f), 40f);
            Shot(shots, "interior", On(13, -17, 2.6f), On(-3, 0, 3.6f), 38f, 0.6f, 0.15f);
            Shot(shots, "delta", forks + new Vector3(19, 4.5f, -15), forks + new Vector3(1.5f, 1.6f, -1f), 42f, 1.2f, 0.3f);
            Shot(shots, "delta_bluehour", forks + new Vector3(19, 4.5f, -15), forks + new Vector3(1.5f, 1.6f, -1f), 42f, 1.2f, 0.3f);
            Shot(shots, "pad", p + new Vector3(34, 5, -40), p + Vector3.up * 9, 40f);
            Shot(shots, "pad_night_launch", p + new Vector3(34, 5, -40), p + Vector3.up * 9, 40f);
            Shot(shots, "pad_sunset_launch", p + new Vector3(-40, 6, -44), p + Vector3.up * 10, 38f);
            Shot(shots, "sky", On(44, -44, 2f), On(-200, -44, 150f), 50f, 0.5f, 0.2f);
            Shot(shots, "night", On(74, 44, 11f), c0, 42f);
            // close-ups (used for stills and for checking the models)
            Shot(shots, "cu_hab", On(9, -19, 2.2f), On(-2, 0, 3.2f), 42f, 0.8f, 0.2f);
            Shot(shots, "cu_crew", On(-3.9f, -12.4f, 1.45f), On(-6.5f, -15.5f, 1.25f), 38f, 0.3f, 0.1f);
            Shot(shots, "cu_rover", On(-2.5f, -26.5f, 1.9f), On(-9, -19, 1.6f), 40f, 0.6f, 0.15f);
            Shot(shots, "cu_ship", p + new Vector3(15, 3.2f, -21), p + Vector3.up * 8.5f, 48f, 0.8f, 0.2f);
            Shot(shots, "cu_air", On(21, 6, 2.2f), On(14, 14.2f, 2f), 42f, 0.5f, 0.15f);
            Shot(shots, "cu_dish", On(27, -24, 2.0f), On(20, -14, 5.5f), 44f, 0.5f, 0.15f);
            Shot(shots, "cu_solar", On(48, -52, 2.2f), On(36, -38, 1.6f), 44f, 0.6f, 0.15f);

            // ---- game objects ----
            var ui = new GameObject("UI");
            var doc = ui.AddComponent<UIDocument>();
            doc.panelSettings = UiAssets.PanelSettings();
            var gameUi = ui.AddComponent<GameUI>(); gameUi.Document = doc;
            var game = new GameObject("Game");
            var world = game.AddComponent<WorldDirector>();
            world.Cam = cam; world.Sun = sun; world.SkyVolume = skyVolume; world.ShotsRoot = shots;
            world.GrowLights.Add(tunnel.GetComponent<Renderer>());
            world.NightGlow.Add(window); world.NightGlow.Add(glass); world.NightGlow.Add(lampWhite); world.StormGlow.Add(shieldGlow);
            var audio = game.AddComponent<AudioDirector>();
            // Dil's field camp at the delta (shown only while she is away)
            var fieldSet = new GameObject("Field camp");
            BuildRover(fieldSet.transform, On(forks.x + 5f, forks.z - 4f), 200f, out fieldDust);
            Transform dilThere = Object.Instantiate(crewRoots[1].gameObject, fieldSet.transform).transform; dilThere.name = "Dil at the delta";
            dilThere.position = On(forks.x - 1.5f, forks.z + 1.2f); dilThere.rotation = Quaternion.Euler(0, 120f, 0);
            var actors = game.AddComponent<ActorsDirector>();
            actors.Ship = ship; actors.ShipFlame = flame; actors.ShipExhaust = exhaust; actors.PadDust = padDust; actors.FlameMesh = flameMesh;
            actors.Rover = rover; actors.RoverDust = roverDust; actors.FieldSet = fieldSet; actors.Crew = crewRoots; actors.DilIndex = 1; actors.World = world;
            actors.ShelterDoor = On(-23.2f, -20.4f); actors.RoverExit = On(-150f, 40f);
            var director = game.AddComponent<GameDirector>(); director.UI = gameUi; director.World = world; director.Audio = audio; director.Actors = actors;

            // ---- Explore mode: the Commander on foot, and what each place is (every fact has a source in shared/references.md) ----
            Transform player = Object.Instantiate(crewRoots[2].gameObject, root).transform; player.name = "Commander";
            player.position = On(14f, -25f); player.rotation = Quaternion.Euler(0, 326f, 0); player.gameObject.SetActive(true);
            var explore = game.AddComponent<ExploreController>(); explore.Player = player; explore.Cam = cam; director.Explore = explore;
            var drive = game.AddComponent<RoverDriver>(); drive.Rover = rover; drive.Dust = roverDust; drive.Cam = cam; drive.Destination = On(forks.x, forks.z); drive.Solid = explore.Spots; explore.Drive = drive;
            System.Action<string, string, Vector3, float> spot = (title, text, c, r) => explore.Spots.Add(new ExploreController.Spot { Title = title, Text = text, Center = c, Radius = r });
            spot("Habitat", "Home for four people. A sol, one day on Mars, is about 24.6 hours long, and nights can fall to about -153 degrees Celsius. (NASA Mars facts)", On(0.5f, 0f), 5.4f);
            spot("", "", On(-5f, 0f), 3.9f); spot("", "", On(-9.5f, 0.3f), 4.0f); spot("", "", On(-13.5f, 0.3f), 4.0f);
            spot("", "", On(5.2f, 2.9f), 3.6f); spot("", "", On(9.2f, 4.4f), 3.6f); spot("", "", On(12.4f, 5.5f), 3.2f);
            spot("Greenhouse", "Astronauts really grow lettuce, kale and mizuna on the International Space Station under pink LED lights. Fresh food keeps its vitamins. (NASA Veggie)", On(-18, 12), 4.2f);
            spot("", "", On(-20.6f, 16.5f), 3.4f); spot("", "", On(-15.4f, 7.5f), 3.4f);
            spot("Air Maker", "NASA's MOXIE experiment on the Perseverance rover made 122 grams of oxygen out of Mars air, up to 12 grams an hour. Each person needs about 0.84 kg a day. (NASA)", On(13, 14.5f), 3.6f);
            spot("", "", On(17.2f, 16.2f), 2.6f);
            spot("Solar field", "Mars is about 1.5 times farther from the Sun than Earth, so panels get less than half the sunlight. Dust makes it worse. (NASA Mars facts)", On(37.6f, -36.2f), 0f);
            spot("Storm shelter", "On 20 May 2024 the Curiosity rover measured its biggest radiation surge in 12 years. NASA says cliffs or lava tubes would give astronauts extra shielding. The Storm Shield here is future technology. (NASA/JPL)", On(-32, -24), 8.2f);
            spot("Radio dish", "A radio call between Mars and Earth takes roughly 3 to 22 minutes each way, depending on where the planets are. No live phone calls. (NASA)", On(20, -14), 2.2f);
            spot("Rover garage", "The Perseverance rover landed in this crater on 18 February 2021. In 2024 it found a rock named Cheyava Falls, with leopard spots that need more study. (NASA)", On(-9, -19), 3.6f);
            spot("Ascent ship", "A ship can only leave Mars for Earth when the two planets line up the right way. Miss the launch window and you wait a very long time. (NASA)", p, 6.2f);
            spot("", "", p + new Vector3(3.2f, 0, 8.6f), 2.4f);

            // night fill (starlight and dust-scattered glow), shield light, particles
            var nf = new GameObject("Night fill"); nf.transform.rotation = Quaternion.Euler(55, 20, 0);
            var nl = nf.AddComponent<Light>(); nl.type = LightType.Directional; nl.color = new Color(0.55f, 0.66f, 1f); nl.shadows = LightShadows.None; nf.AddComponent<HDAdditionalLightData>();
            nl.lightUnit = LightUnit.Lux; nl.intensity = 0.9f; nl.color = new Color(0.62f, 0.70f, 1f); nl.enabled = false; world.NightFill = nl;
            var slg = new GameObject("Shield light"); slg.transform.position = On(-32, -24, 7f);
            var sl = slg.AddComponent<Light>(); sl.type = LightType.Point; sl.color = new Color(0.6f, 0.5f, 1f); sl.range = 60f; sl.shadows = LightShadows.None; slg.AddComponent<HDAdditionalLightData>();
            sl.lightUnit = LightUnit.Lumen; sl.intensity = 0f; sl.enabled = false; world.ShieldLight = sl;
            world.SmallLights.AddRange(lampLights);
            world.SmallLights.Add(PointLight(root, "Airlock light", new Vector3(0.5f, gy + 3.4f, -4.6f), new Color(1f, 0.9f, 0.75f), 2600f, 14f));
            world.SmallLights.Add(PointLight(root, "Shelter light", On(-26.6f, -21.6f, 2.4f), new Color(1f, 0.9f, 0.75f), 2400f, 14f));
            world.SmallLights.Add(PointLight(root, "Tower flood", p + new Vector3(2.6f, 14.5f, 6.4f), new Color(1f, 0.93f, 0.82f), 60000f, 46f));
            // white specks, like the "snow" charged particles left in the Curiosity rover's camera images during the May 2024 storm
            world.StormParticles = Particles("Storm particles", cam.transform, new Color(1f, 1f, 1f, 0.9f), new Vector3(0, 0, 4), new Vector3(7f, 4f, 0.5f), new Vector3(0, 0, 0), 0.018f, 0.09f, true);
            world.DustParticles = Particles("Dust", cam.transform, new Color(0.80f, 0.56f, 0.38f, 0.035f), new Vector3(0, 8, 70), new Vector3(180, 16, 100), new Vector3(16, 0.5f, 3), 14f, 9f, false);
        }

        // ------------------------------------------------------------------ rocks
        static void BuildRocks(Transform root, Vector3 forks, Vector3 pad)
        {
            // photo-scanned rocks (Poly Haven, CC0: Earth rocks, tinted) for the big ones; procedural meshes for pebbles
            string[] ids = { "namaqualand_boulder_02", "namaqualand_boulder_03", "namaqualand_boulder_05", "moon_rock_01", "moon_rock_03", "namaqualand_stones_01" };
            var scanned = new List<GameObject>(); var scanMats = new List<Material>(); var scanMatsAlt = new List<Material>(); var scanTris = new List<int>(); int heroes = 0;
            foreach (string id in ids)
            {
                string dir = "Assets/PlutonyX/Models/PolyHaven/" + id, fbx = dir + "/" + id + ".fbx";
                var imp = AssetImporter.GetAtPath(fbx) as ModelImporter;
                if (imp == null) continue;
                if (imp.materialImportMode != ModelImporterMaterialImportMode.None || imp.importCameras || imp.importLights || imp.meshCompression != ModelImporterMeshCompression.Medium)
                { imp.materialImportMode = ModelImporterMaterialImportMode.None; imp.importCameras = false; imp.importLights = false; imp.importAnimation = false; imp.meshCompression = ModelImporterMeshCompression.Medium; imp.SaveAndReimport(); }
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(fbx); if (model == null) continue;
                Texture2D diff = TerrainImporter.ImportTexture(dir + "/textures/" + id + "_diff_1k.jpg", TextureImporterType.Default, true, 1024);
                Texture2D nor = TerrainImporter.ImportTexture(dir + "/textures/" + id + "_nor_gl_1k.exr", TextureImporterType.NormalMap, false, 1024);
                var m = new Material(Shader.Find("HDRP/Lit")) { name = "Rock_" + id };
                m.SetColor("_BaseColor", id.StartsWith("moon") ? new Color(1.0f, 0.62f, 0.44f) : new Color(1.0f, 0.74f, 0.58f));
                if (diff != null) m.SetTexture("_BaseColorMap", diff); if (nor != null) m.SetTexture("_NormalMap", nor);
                m.SetFloat("_Smoothness", 0.16f); m.SetFloat("_Metallic", 0f); m.enableInstancing = true; HDMaterial.ValidateMaterial(m);
                AssetDatabase.CreateAsset(m, TerrainImporter.GeneratedDir + "/Rock_" + id + ".mat");
                // a darker, redder variant so neighbouring rocks are not identical (dust and oxidation vary)
                var m2 = new Material(m) { name = "Rock_" + id + "_dark" };
                m2.SetColor("_BaseColor", id.StartsWith("moon") ? new Color(0.78f, 0.45f, 0.30f) : new Color(0.84f, 0.55f, 0.40f)); m2.SetFloat("_Smoothness", 0.1f); HDMaterial.ValidateMaterial(m2);
                AssetDatabase.CreateAsset(m2, TerrainImporter.GeneratedDir + "/Rock_" + id + "_dark.mat");
                scanned.Add(model); scanMats.Add(m); scanMatsAlt.Add(m2);
                int tris = 0; foreach (MeshFilter mf in model.GetComponentsInChildren<MeshFilter>()) tris += mf.sharedMesh.triangles.Length / 3;
                scanTris.Add(tris);
            }
            Material rockMat = Mat("Rock", new Color(0.46f, 0.30f, 0.21f), 0f, 0.18f);
            Texture2D rockAlbedo = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/PlutonyX/Textures/PolyHaven/Layers/steep_rock_albedo.png");
            Texture2D rockNormal = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/PlutonyX/Textures/PolyHaven/Layers/steep_rock_normal.png");
            if (rockAlbedo != null) { rockMat.SetTexture("_BaseColorMap", rockAlbedo); rockMat.SetColor("_BaseColor", Color.white); }
            if (rockNormal != null) rockMat.SetTexture("_NormalMap", rockNormal);
            HDMaterial.ValidateMaterial(rockMat);
            var rr = new System.Random(77);
            var rockMeshes = new Mesh[6];
            for (int i = 0; i < rockMeshes.Length; i++) rockMeshes[i] = MeshKit.Rock("Rock" + i, rr);
            Transform rocks = G(root, "Rocks", Vector3.zero);
            Vector3[] centers = { Vector3.zero, new Vector3(forks.x, 0, forks.z), new Vector3(pad.x, 0, pad.z) };
            int[] counts = { 900, 300, 140 }; float[] radii = { 200f, 110f, 90f };
            int big = 0;
            for (int cIdx = 0; cIdx < centers.Length; cIdx++)
                for (int i = 0; i < counts[cIdx]; i++)
                {
                    float ang = (float)rr.NextDouble() * Mathf.PI * 2f, rad = Mathf.Sqrt((float)rr.NextDouble()) * radii[cIdx];
                    float x = centers[cIdx].x + Mathf.Cos(ang) * rad, z = centers[cIdx].z + Mathf.Sin(ang) * rad;
                    float size = Mathf.Lerp(0.10f, 1.9f, Mathf.Pow((float)rr.NextDouble(), 3.4f));
                    if (cIdx == 0 && x > -20 && x < 16 && z > -9 && z < 9 && size > 0.25f) continue;         // keep the habitat clear
                    if (cIdx == 0 && x > 17 && x < 58 && z > -50 && z < -22) continue;                      // and the solar field
                    if (cIdx == 0 && Vector2.Distance(new Vector2(x, z), new Vector2(-32, -24)) < 14f) continue;
                    if (cIdx == 0 && Vector2.Distance(new Vector2(x, z), new Vector2(-18, 12)) < 8f) continue;
                    if (cIdx == 0 && Vector2.Distance(new Vector2(x, z), new Vector2(13, 14)) < 7f) continue;
                    if (cIdx == 0 && Mathf.Abs((x + 9) * 0.386f + (z + 19) * 0.922f) < 3.2f && x < -5) continue;  // the rover's road
                    if (cIdx == 2 && rad < 19f) continue;
                    float yaw = (float)rr.NextDouble() * 360f;
                    if (size > 0.28f && scanned.Count > 0 && big < 520)
                    {
                        // the heavy scans (65-98 thousand triangles) are kept for a few hero boulders; the light ones do the rest
                        bool hero = size > 1.05f && heroes < 26;
                        int k = -1; for (int tries = 0; tries < 12 && k < 0; tries++) { int c = rr.Next(scanned.Count); if ((scanTris[c] > 20000) == hero) k = c; }
                        if (k < 0) k = 0;
                        if (hero) heroes++;
                        var g = Object.Instantiate(scanned[k], rocks); g.name = "Boulder";
                        g.transform.position = Vector3.zero; g.transform.rotation = Quaternion.Euler(((float)rr.NextDouble() - 0.5f) * 22f, yaw, ((float)rr.NextDouble() - 0.5f) * 22f);   // real rocks sit tilted g.transform.localScale = scanned[k].transform.localScale;
                        Bounds b = new Bounds(); bool first = true;
                        Material useMat = (big % 3 == 1 && scanMatsAlt.Count > k) ? scanMatsAlt[k] : scanMats[k];
                        foreach (Renderer rn in g.GetComponentsInChildren<Renderer>()) { rn.sharedMaterial = useMat; rn.shadowCastingMode = size > 0.45f ? ShadowCastingMode.On : ShadowCastingMode.Off; if (first) { b = rn.bounds; first = false; } else b.Encapsulate(rn.bounds); }
                        float sc = size * 1.25f / Mathf.Max(0.01f, Mathf.Max(b.size.x, b.size.z));
                        g.transform.localScale *= sc;
                        g.transform.position = new Vector3(x, Ground(x, z) - b.min.y * sc - size * (0.12f + (float)rr.NextDouble() * 0.14f), z)   /* partly buried in the regolith */ - new Vector3(b.center.x, 0, b.center.z) * sc;
                        big++; continue;
                    }
                    var go = new GameObject("Rock"); go.transform.SetParent(rocks, false);
                    go.transform.position = new Vector3(x, Ground(x, z) + size * 0.10f, z);
                    go.transform.rotation = Quaternion.Euler((float)rr.NextDouble() * 30f, yaw, (float)rr.NextDouble() * 30f);
                    go.transform.localScale = new Vector3(size * (0.8f + (float)rr.NextDouble() * 0.6f), size * (0.45f + (float)rr.NextDouble() * 0.4f), size * (0.8f + (float)rr.NextDouble() * 0.6f));
                    go.AddComponent<MeshFilter>().sharedMesh = rockMeshes[rr.Next(rockMeshes.Length)];
                    var mr = go.AddComponent<MeshRenderer>(); mr.sharedMaterial = rockMat;
                    mr.shadowCastingMode = size > 0.3f ? ShadowCastingMode.On : ShadowCastingMode.Off;
                }
            Debug.Log("[PlutonyX] rocks: " + big + " scanned, " + heroes + " hero boulders");
        }

        // ------------------------------------------------------------------ tracks, paths and blast marks on the ground
        static void BuildGroundMarks(Transform root, Vector3 pad)
        {
            Transform marks = G(root, "Ground marks", Vector3.zero);
            Material tracks = DecalMat("Decal_Tracks", MeshKit.TrackDecal("decal_tracks", 0), 0.9f);
            Material path = DecalMat("Decal_Path", MeshKit.TrackDecal("decal_path", 1), 0.75f);
            Material blast = DecalMat("Decal_Blast", MeshKit.TrackDecal("decal_blast", 2), 0.9f);
            System.Action<Material, float[][], float, float> lay = (mat, pts, width, tile) =>
            {
                for (int i = 0; i < pts.Length - 1; i++)
                {
                    Vector3 a = On(pts[i][0], pts[i][1]), b = On(pts[i + 1][0], pts[i + 1][1]); float len = Vector3.Distance(a, b); int n = Mathf.Max(1, Mathf.CeilToInt(len / 14f));
                    for (int k = 0; k < n; k++)
                    {
                        Vector3 m0 = Vector3.Lerp(a, b, (k + 0.5f) / n); m0.y = Ground(m0.x, m0.z); float seg = len / n;
                        Decal(marks, "Mark", mat, m0, Mathf.Atan2(b.x - a.x, b.z - a.z) * Mathf.Rad2Deg, width, seg + 0.4f, new Vector2(1f, seg / tile));
                    }
                }
            };
            lay(tracks, new[] { new[] { -9f, -19f }, new[] { -150f, 40f } }, 3.4f, 3.4f);                 // the rover's road to the delta
            lay(tracks, new[] { new[] { -6f, -24f }, new[] { 40f, -64f }, new[] { 150f, 100f } }, 3.4f, 3.4f);   // and to the launch pad
            lay(path, new[] { new[] { 0.5f, -9f }, new[] { -8f, -15f }, new[] { -23f, -20.4f } }, 2.2f, 4f);
            lay(path, new[] { new[] { 0.5f, -9f }, new[] { 9f, -11f }, new[] { 19f, -15.5f } }, 2.0f, 4f);
            lay(path, new[] { new[] { 0.5f, -9f }, new[] { 14f, -20f }, new[] { 24f, -30f } }, 2.0f, 4f);
            lay(path, new[] { new[] { 6f, 7f }, new[] { 12f, 10.5f } }, 1.8f, 4f);
            lay(path, new[] { new[] { -10f, 5.5f }, new[] { -12.5f, 8f } }, 1.8f, 4f);
            Decal(marks, "Blast mark", blast, pad, 0f, 110f, 110f, Vector2.one);
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
            string matName = "Particles_" + name.Replace(" ", "");
            var mat = AssetDatabase.LoadAssetAtPath<Material>(TerrainImporter.GeneratedDir + "/" + matName + ".mat");
            if (mat == null || !Mats.ContainsKey(matName))
            {
                mat = new Material(Shader.Find("HDRP/Unlit")) { name = matName };
                mat.SetFloat("_SurfaceType", 1f); mat.SetFloat("_BlendMode", streaks ? 1f : 0f); mat.SetColor("_UnlitColor", color); mat.SetTexture("_UnlitColorMap", _soft);   // HDRP/Unlit ignores particle vertex colour, so the tint lives in the material
                HDMaterial.ValidateMaterial(mat);
                AssetDatabase.CreateAsset(mat, TerrainImporter.GeneratedDir + "/" + mat.name + ".mat");
                Mats[matName] = mat;
            }
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
            var r = go.GetComponent<ParticleSystemRenderer>(); r.sharedMaterial = mat;
            r.renderMode = ParticleSystemRenderMode.Billboard;
            return ps;
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
