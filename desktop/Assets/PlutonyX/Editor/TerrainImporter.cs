// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// TerrainImporter.cs — builds the Unity terrain from the processed real NASA data in desktop/TerrainData
// (see tools/terrain/process_terrain.py). Heights are the real MRO CTX elevation values at true scale.
using System.IO;
using PlutonyX.Core;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace PlutonyX.EditorTools
{
    public static class TerrainImporter
    {
        public const string GeneratedDir = "Assets/PlutonyX/Generated";
        const string LayerDir = "Assets/PlutonyX/Textures/PolyHaven/Layers";
        static readonly string[] LayerIds = { "dark_sand", "regolith", "bright_dust", "steep_rock" };
        static readonly float[] LayerTile = { 9f, 13f, 17f, 22f };

        public static string DataDir { get { return Path.GetFullPath(Path.Combine(Application.dataPath, "../TerrainData")); } }
        public static JsonValue Meta() { return JsonValue.Parse(File.ReadAllText(Path.Combine(DataDir, "jezero_meta.json"))); }

        /// <summary>World position of a real landmark (the landing site is the world origin).</summary>
        public static Vector3 LandmarkPosition(JsonValue meta, string id)
        {
            JsonValue origin = JsonValue.Null, lm = JsonValue.Null;
            foreach (JsonValue l in meta["landmarks"].Items) { if (l["id"].Str() == "landing_site") origin = l; if (l["id"].Str() == id) lm = l; }
            return new Vector3((float)(lm["x_m"].Num() - origin["x_m"].Num()), (float)(lm["elevation_m"].Num() - origin["elevation_m"].Num()), (float)(lm["z_m"].Num() - origin["z_m"].Num()));
        }

        public static Terrain Import()
        {
            Directory.CreateDirectory(GeneratedDir);
            JsonValue meta = Meta();
            int res = meta["height_resolution"].Int(2049);
            byte[] raw = File.ReadAllBytes(Path.Combine(DataDir, meta["height_file"].Str()));
            var heights = new float[res, res];
            int i = 0;
            for (int y = 0; y < res; y++)            // row 0 = south edge = Unity z 0
                for (int x = 0; x < res; x++) { heights[y, x] = (raw[i] | (raw[i + 1] << 8)) / 65535f; i += 2; }

            // The source DTM stores whole-metre steps, which show up as terraces on gentle slopes. A light Gaussian
            // blur (about 30 m) removes the steps; the shape of the land is unchanged at the scale of the data (20 m).
            float[] kernel = { 0.0625f, 0.25f, 0.375f, 0.25f, 0.0625f };
            var tmp = new float[res, res];
            for (int pass = 0; pass < 2; pass++)
            {
                for (int y = 0; y < res; y++) for (int x = 0; x < res; x++) { float a = 0; for (int k = -2; k <= 2; k++) a += heights[y, Mathf.Clamp(x + k, 0, res - 1)] * kernel[k + 2]; tmp[y, x] = a; }
                for (int y = 0; y < res; y++) for (int x = 0; x < res; x++) { float a = 0; for (int k = -2; k <= 2; k++) a += tmp[Mathf.Clamp(y + k, 0, res - 1), x] * kernel[k + 2]; heights[y, x] = a; }
            }

            var td = new TerrainData();
            td.heightmapResolution = res;
            td.size = new Vector3((float)meta["size_x_m"].Num(), (float)meta["relief_m"].Num(), (float)meta["size_z_m"].Num());
            td.SetHeights(0, 0, heights);
            AssetDatabase.CreateAsset(td, GeneratedDir + "/JezeroTerrain.asset");

            // detail layers (CC0 Poly Haven textures tinted to Mars colours; weights come from the real image + slope)
            var layers = new TerrainLayer[LayerIds.Length];
            for (int l = 0; l < LayerIds.Length; l++)
            {
                string id = LayerIds[l];
                Texture2D albedo = ImportTexture(LayerDir + "/" + id + "_albedo.png", TextureImporterType.Default, true);
                Texture2D normal = ImportTexture(LayerDir + "/" + id + "_normal.png", TextureImporterType.NormalMap, false);
                Texture2D mask = ImportTexture(LayerDir + "/" + id + "_mask.png", TextureImporterType.Default, false);
                var layer = new TerrainLayer { diffuseTexture = albedo, normalMapTexture = normal, maskMapTexture = mask,
                                               tileSize = new Vector2(LayerTile[l], LayerTile[l]), metallic = 0f, smoothness = 0.15f, normalScale = 1.2f };
                AssetDatabase.CreateAsset(layer, GeneratedDir + "/Layer_" + id + ".terrainlayer");
                layers[l] = layer;
            }
            td.terrainLayers = layers;

            var splat = new Texture2D(2, 2, TextureFormat.RGBA32, false, true);
            splat.LoadImage(File.ReadAllBytes(Path.Combine(DataDir, meta["splat_file"].Str())));
            int sres = splat.width;
            td.alphamapResolution = sres;
            Color32[] px = splat.GetPixels32();      // row 0 = bottom of the image = south
            var alpha = new float[sres, sres, 4];
            for (int y = 0; y < sres; y++)
                for (int x = 0; x < sres; x++)
                {
                    Color32 c = px[y * sres + x];
                    float sum = c.r + c.g + c.b + c.a; if (sum < 1f) sum = 1f;
                    alpha[y, x, 0] = c.r / sum; alpha[y, x, 1] = c.g / sum; alpha[y, x, 2] = c.b / sum; alpha[y, x, 3] = c.a / sum;
                }
            td.SetAlphamaps(0, 0, alpha);
            Object.DestroyImmediate(splat);
            td.baseMapResolution = 2048;

            GameObject go = Terrain.CreateTerrainGameObject(td);
            go.name = "Jezero Terrain (real NASA MRO CTX data)";
            JsonValue site = JsonValue.Null;
            foreach (JsonValue lm in meta["landmarks"].Items) if (lm["id"].Str() == "landing_site") site = lm;
            go.transform.position = new Vector3(-(float)site["x_m"].Num(), -(float)(site["elevation_m"].Num() - meta["elevation_min_m"].Num()), -(float)site["z_m"].Num());
            var terrain = go.GetComponent<Terrain>();
            if (GraphicsSettings.defaultRenderPipeline != null) terrain.materialTemplate = GraphicsSettings.defaultRenderPipeline.defaultTerrainMaterial;
            terrain.heightmapPixelError = 3f;
            terrain.basemapDistance = 6000f;
            terrain.drawInstanced = true;
            terrain.shadowCastingMode = ShadowCastingMode.On;
            terrain.allowAutoConnect = false;
            EditorUtility.SetDirty(td);
            Debug.Log("[PlutonyX] Terrain imported: " + td.size + " m, landing site at world origin, " + layers.Length + " layers");
            return terrain;
        }

        public static Texture2D ImportTexture(string path, TextureImporterType type, bool srgb, int maxSize = 2048)
        {
            var imp = (TextureImporter)AssetImporter.GetAtPath(path);
            if (imp == null) { AssetDatabase.ImportAsset(path); imp = (TextureImporter)AssetImporter.GetAtPath(path); }
            if (imp != null && (imp.textureType != type || imp.sRGBTexture != srgb || imp.anisoLevel != 16 || imp.maxTextureSize != maxSize))
            {
                imp.textureType = type; imp.sRGBTexture = srgb; imp.mipmapEnabled = true; imp.anisoLevel = 16; imp.maxTextureSize = maxSize;
                imp.wrapMode = TextureWrapMode.Repeat; imp.filterMode = FilterMode.Trilinear; imp.textureCompression = TextureImporterCompression.CompressedHQ;
                imp.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }
    }
}
