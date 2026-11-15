// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// MeshKit.cs — a small modelling toolkit used by OutpostBuilder: surfaces of revolution, rounded boxes, pipes,
// discs and mounds, plus procedural surface textures (hull panels, insulation foil, fabric, solar cells).
// Everything it makes is original geometry; nothing is copied from a real vehicle.
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace PlutonyX.EditorTools
{
    public static class MeshKit
    {
        static Object _container;
        static readonly Dictionary<string, Mesh> Cache = new Dictionary<string, Mesh>();

        public static void Begin() { _container = null; Cache.Clear(); }

        public static T Save<T>(T o) where T : Object
        {
            if (_container == null) { AssetDatabase.CreateAsset(o, TerrainImporter.GeneratedDir + "/Models.asset"); _container = o; }
            else AssetDatabase.AddObjectToAsset(o, _container);
            return o;
        }

        static Mesh Finish(string name, List<Vector3> v, List<Vector3> n, List<Vector2> uv, List<int> t, bool fixWinding)
        {
            if (fixWinding)
                for (int i = 0; i < t.Count; i += 3)
                {
                    Vector3 g = Vector3.Cross(v[t[i + 1]] - v[t[i]], v[t[i + 2]] - v[t[i]]);
                    Vector3 a = n[t[i]] + n[t[i + 1]] + n[t[i + 2]];
                    if (Vector3.Dot(g, a) < 0f) { int s = t[i + 1]; t[i + 1] = t[i + 2]; t[i + 2] = s; }
                }
            var m = new Mesh { name = name };
            if (v.Count > 65000) m.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetTriangles(t, 0);
            m.RecalculateTangents(); m.RecalculateBounds();
            Cache[name] = m;
            return Save(m);
        }

        public static bool Have(string name, out Mesh m) { return Cache.TryGetValue(name, out m); }

        /// <summary>Surface of revolution about +Y. Profile points are (radius, height); going upward gives an
        /// outward-facing surface, going downward an inward-facing one. Bends sharper than smoothDeg stay crisp.</summary>
        public static Mesh Lathe(string name, Vector2[] p, int seg = 32, float smoothDeg = 40f, float uTiles = 1f, float vPerMetre = 0.25f)
        {
            Mesh cached; if (Have(name, out cached)) return cached;
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
            int bands = p.Length - 1;
            var bn = new Vector2[bands];
            for (int k = 0; k < bands; k++) { Vector2 d = p[k + 1] - p[k]; bn[k] = d.sqrMagnitude < 1e-10f ? Vector2.right : new Vector2(d.y, -d.x).normalized; }
            float cosT = Mathf.Cos(smoothDeg * Mathf.Deg2Rad), len = 0f;
            for (int k = 0; k < bands; k++)
            {
                Vector2 n0 = bn[k], n1 = bn[k];
                if (k > 0 && Vector2.Dot(bn[k - 1], bn[k]) > cosT) n0 = (bn[k - 1] + bn[k]).normalized;
                if (k < bands - 1 && Vector2.Dot(bn[k + 1], bn[k]) > cosT) n1 = (bn[k + 1] + bn[k]).normalized;
                float l1 = len + Vector2.Distance(p[k], p[k + 1]);
                int start = v.Count;
                for (int ring = 0; ring < 2; ring++)
                {
                    Vector2 q = ring == 0 ? p[k] : p[k + 1], nn = ring == 0 ? n0 : n1; float vv = (ring == 0 ? len : l1) * vPerMetre;
                    for (int i = 0; i <= seg; i++)
                    {
                        float a = i / (float)seg * Mathf.PI * 2f, c = Mathf.Cos(a), s = Mathf.Sin(a);
                        v.Add(new Vector3(q.x * c, q.y, q.x * s)); n.Add(new Vector3(nn.x * c, nn.y, nn.x * s)); uv.Add(new Vector2(i / (float)seg * uTiles, vv));
                    }
                }
                for (int i = 0; i < seg; i++)
                {
                    int a0 = start + i, b0 = start + seg + 1 + i, c0 = b0 + 1, d0 = a0 + 1;
                    t.Add(a0); t.Add(b0); t.Add(c0); t.Add(a0); t.Add(c0); t.Add(d0);
                }
                len = l1;
            }
            return Finish(name, v, n, uv, t, false);
        }

        /// <summary>Closed cylinder profile helper: bottom cap, wall, top cap.</summary>
        public static Vector2[] CylProfile(float r, float h, float bevel = 0f)
        {
            if (bevel <= 0f) return new[] { new Vector2(0, 0), new Vector2(r, 0), new Vector2(r, h), new Vector2(0, h) };
            return new[] { new Vector2(0, 0), new Vector2(r - bevel, 0), new Vector2(r, bevel), new Vector2(r, h - bevel), new Vector2(r - bevel, h), new Vector2(0, h) };
        }

        /// <summary>Capsule-like pressure vessel: cylinder of radius r with elliptical end domes of height dome. Total length h.</summary>
        public static Vector2[] VesselProfile(float r, float h, float dome, int steps = 8)
        {
            var l = new List<Vector2>();
            for (int i = 0; i <= steps; i++) { float a = i / (float)steps * Mathf.PI * 0.5f; l.Add(new Vector2(Mathf.Sin(a) * r, dome - Mathf.Cos(a) * dome)); }
            for (int i = 0; i <= steps; i++) { float a = i / (float)steps * Mathf.PI * 0.5f; l.Add(new Vector2(Mathf.Cos(a) * r, h - dome + Mathf.Sin(a) * dome)); }
            return l.ToArray();
        }

        public static Mesh Torus(string name, float ringRadius, float tubeRadius, int seg = 32, int sides = 10)
        {
            var p = new Vector2[sides + 1];
            for (int i = 0; i <= sides; i++) { float a = i / (float)sides * Mathf.PI * 2f - Mathf.PI; p[i] = new Vector2(ringRadius + Mathf.Cos(a) * tubeRadius, Mathf.Sin(a) * tubeRadius); }
            return Lathe(name, p, seg, 80f, 4f, 1f);
        }

        /// <summary>Parabolic reflector, opening toward +Y, with a little thickness. Vertex at the origin.</summary>
        public static Mesh Dish(string name, float radius, float depth, int seg = 40, int steps = 10)
        {
            var p = new List<Vector2>(); float th = radius * 0.012f;
            for (int i = 0; i <= steps; i++) { float r = radius * i / steps; p.Add(new Vector2(r, depth * (r * r) / (radius * radius) - th)); }
            for (int i = steps; i >= 0; i--) { float r = radius * i / steps; p.Add(new Vector2(r, depth * (r * r) / (radius * radius) + th)); }
            return Lathe(name, p.ToArray(), seg, 50f, 8f, 0.5f);
        }

        /// <summary>Box with rounded (smooth-shaded chamfer) edges, centred on the origin.</summary>
        public static Mesh RBox(string name, Vector3 size, float bevel, float uvPerMetre = 0.5f)
        {
            Mesh cached; if (Have(name, out cached)) return cached;
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
            Vector3 h = size * 0.5f; bevel = Mathf.Min(bevel, Mathf.Min(h.x, Mathf.Min(h.y, h.z)) * 0.98f);
            Vector3 inner = h - Vector3.one * bevel;
            for (int axis = 0; axis < 3; axis++)
                for (int sign = -1; sign <= 1; sign += 2)
                {
                    int ua = (axis + 1) % 3, va = (axis + 2) % 3; int start = v.Count;
                    float[] us = { -h[ua], -inner[ua], inner[ua], h[ua] }, vs = { -h[va], -inner[va], inner[va], h[va] };
                    for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++)
                    {
                        Vector3 q = Vector3.zero; q[axis] = sign * h[axis]; q[ua] = us[x]; q[va] = vs[y];
                        Vector3 c = new Vector3(Mathf.Clamp(q.x, -inner.x, inner.x), Mathf.Clamp(q.y, -inner.y, inner.y), Mathf.Clamp(q.z, -inner.z, inner.z));
                        Vector3 d = q - c; Vector3 nn = d.sqrMagnitude < 1e-12f ? Vector3.zero : d.normalized;
                        if (nn == Vector3.zero) nn[axis] = sign;
                        v.Add(c + nn * bevel); n.Add(nn); uv.Add(new Vector2(us[x], vs[y]) * uvPerMetre);
                    }
                    for (int y = 0; y < 3; y++) for (int x = 0; x < 3; x++)
                    {
                        int i0 = start + y * 4 + x;
                        t.Add(i0); t.Add(i0 + 4); t.Add(i0 + 5); t.Add(i0); t.Add(i0 + 5); t.Add(i0 + 1);
                    }
                }
            return Finish(name, v, n, uv, t, true);
        }

        /// <summary>Round pipe along a polyline (local space).</summary>
        public static Mesh Tube(string name, IList<Vector3> pts, float radius, int sides = 8)
        {
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
            Vector3 prevN = Vector3.zero; float len = 0f;
            for (int i = 0; i < pts.Count; i++)
            {
                Vector3 tan = (pts[Mathf.Min(i + 1, pts.Count - 1)] - pts[Mathf.Max(i - 1, 0)]).normalized;
                Vector3 nrm = i == 0 ? Vector3.Cross(tan, Mathf.Abs(tan.y) > 0.9f ? Vector3.right : Vector3.up).normalized : (prevN - tan * Vector3.Dot(prevN, tan)).normalized;
                if (nrm.sqrMagnitude < 0.5f) nrm = Vector3.Cross(tan, Vector3.right).normalized;
                Vector3 bin = Vector3.Cross(tan, nrm); prevN = nrm;
                if (i > 0) len += Vector3.Distance(pts[i], pts[i - 1]);
                for (int s = 0; s <= sides; s++)
                {
                    float a = s / (float)sides * Mathf.PI * 2f; Vector3 d = nrm * Mathf.Cos(a) + bin * Mathf.Sin(a);
                    v.Add(pts[i] + d * radius); n.Add(d); uv.Add(new Vector2(s / (float)sides, len));
                }
                if (i > 0)
                    for (int s = 0; s < sides; s++)
                    {
                        int a0 = (i - 1) * (sides + 1) + s, b0 = a0 + sides + 1;
                        t.Add(a0); t.Add(b0); t.Add(b0 + 1); t.Add(a0); t.Add(b0 + 1); t.Add(a0 + 1);
                    }
            }
            return Finish(name, v, n, uv, t, true);
        }

        /// <summary>Flat disc in the XZ plane facing +Y, with planar UVs (0..1 across the diameter).</summary>
        public static Mesh Disc(string name, float radius, int seg = 64)
        {
            Mesh cached; if (Have(name, out cached)) return cached;
            var v = new List<Vector3> { Vector3.zero }; var n = new List<Vector3> { Vector3.up }; var uv = new List<Vector2> { new Vector2(0.5f, 0.5f) }; var t = new List<int>();
            for (int i = 0; i <= seg; i++) { float a = i / (float)seg * Mathf.PI * 2f; v.Add(new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)) * radius); n.Add(Vector3.up); uv.Add(new Vector2(0.5f + Mathf.Cos(a) * 0.5f, 0.5f + Mathf.Sin(a) * 0.5f)); }
            for (int i = 1; i <= seg; i++) { t.Add(0); t.Add(i + 1); t.Add(i); }
            return Finish(name, v, n, uv, t, true);
        }

        /// <summary>A heaped mound of soil (regolith berm): radial grid with a smooth falloff and lumpy noise.</summary>
        public static Mesh Mound(string name, float rx, float rz, float height, int seed, int rings = 18, int seg = 48)
        {
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
            for (int r = 0; r <= rings; r++)
                for (int i = 0; i <= seg; i++)
                {
                    float f = r / (float)rings, a = i / (float)seg * Mathf.PI * 2f;
                    float edge = 1f + 0.10f * Mathf.Sin(a * 3f + seed) + 0.06f * Mathf.Sin(a * 7f + seed * 2.3f);
                    float x = Mathf.Cos(a) * rx * f * edge, z = Mathf.Sin(a) * rz * f * edge;
                    float y = height * Mathf.Pow(0.5f + 0.5f * Mathf.Cos(Mathf.Clamp01(f) * Mathf.PI), 0.85f);
                    y += (Mathf.PerlinNoise(x * 0.35f + seed, z * 0.35f) - 0.5f) * 0.5f * (1f - f) + (Mathf.PerlinNoise(x * 1.3f, z * 1.3f + seed) - 0.5f) * 0.14f;
                    if (r == rings) y = -0.7f; else if (r == rings - 1) y -= 0.15f;
                    v.Add(new Vector3(x, y, z)); n.Add(Vector3.up); uv.Add(new Vector2(x, z) * 0.22f);
                }
            for (int r = 0; r < rings; r++)
                for (int i = 0; i < seg; i++)
                {
                    int a0 = r * (seg + 1) + i, b0 = a0 + seg + 1;
                    t.Add(a0); t.Add(b0); t.Add(b0 + 1); t.Add(a0); t.Add(b0 + 1); t.Add(a0 + 1);
                }
            var m = new Mesh { name = name }; m.SetVertices(v); m.SetUVs(0, uv); m.SetTriangles(t, 0);
            m.RecalculateNormals();
            // make sure it faces up
            if (m.normals[0].y < 0f) { for (int i = 0; i < t.Count; i += 3) { int s = t[i + 1]; t[i + 1] = t[i + 2]; t[i + 2] = s; } m.SetTriangles(t, 0); m.RecalculateNormals(); }
            m.RecalculateTangents(); m.RecalculateBounds();
            return Save(m);
        }

        /// <summary>A rock: a subdivided cube pushed onto a sphere and roughened with random bumps and fine noise.</summary>
        public static Mesh Rock(string name, System.Random r, int n = 9)
        {
            var verts = new List<Vector3>(); var tris = new List<int>(); var uvs = new List<Vector2>();
            Vector3[] dirs = { Vector3.up, Vector3.down, Vector3.left, Vector3.right, Vector3.forward, Vector3.back };
            var bumps = new Vector4[11];
            for (int i = 0; i < bumps.Length; i++) { Vector3 d = new Vector3((float)r.NextDouble() - 0.5f, (float)r.NextDouble() - 0.5f, (float)r.NextDouble() - 0.5f).normalized; bumps[i] = new Vector4(d.x, d.y, d.z, ((float)r.NextDouble() - 0.4f) * 0.5f); }
            float off = (float)r.NextDouble() * 50f;
            foreach (Vector3 up in dirs)
            {
                Vector3 a = new Vector3(up.y, up.z, up.x), b = Vector3.Cross(up, a); int start = verts.Count;
                for (int y = 0; y <= n; y++) for (int x = 0; x <= n; x++)
                {
                    Vector3 p = (up + (x / (float)n * 2f - 1f) * a + (y / (float)n * 2f - 1f) * b).normalized;
                    float h = 1f;
                    foreach (Vector4 bp in bumps) { float d = Vector3.Dot(p, new Vector3(bp.x, bp.y, bp.z)); if (d > 0.2f) h += bp.w * (d - 0.2f) * (d - 0.2f) * 2.2f; }
                    h += (Mathf.PerlinNoise(p.x * 2.3f + off, p.y * 2.3f + p.z * 1.7f) - 0.5f) * 0.22f;
                    verts.Add(p * h * 0.5f); uvs.Add(new Vector2(x / (float)n, y / (float)n) * 1.5f);
                }
                for (int y = 0; y < n; y++) for (int x = 0; x < n; x++)
                {
                    int i0 = start + y * (n + 1) + x;
                    tris.Add(i0); tris.Add(i0 + n + 2); tris.Add(i0 + n + 1); tris.Add(i0); tris.Add(i0 + 1); tris.Add(i0 + n + 2);
                }
            }
            var m = new Mesh { name = name }; m.SetVertices(verts); m.SetUVs(0, uvs); m.SetTriangles(tris, 0); m.RecalculateNormals(); m.RecalculateTangents(); m.RecalculateBounds();
            return Save(m);
        }

        // ------------------------------------------------------------------ procedural textures
        static float Hash(int x, int y, int seed) { unchecked { uint h = (uint)(x * 374761393 + y * 668265263 + seed * 1274126177); h = (h ^ (h >> 13)) * 1274126177u; return ((h ^ (h >> 16)) & 0xffffff) / 16777215f; } }

        /// <summary>Tileable value noise, period cells per tile.</summary>
        static float Noise(float u, float v, int period, int seed)
        {
            float x = u * period, y = v * period; int x0 = Mathf.FloorToInt(x), y0 = Mathf.FloorToInt(y);
            float fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
            int xa = ((x0 % period) + period) % period, xb = (xa + 1) % period, ya = ((y0 % period) + period) % period, yb = (ya + 1) % period;
            return Mathf.Lerp(Mathf.Lerp(Hash(xa, ya, seed), Hash(xb, ya, seed), fx), Mathf.Lerp(Hash(xa, yb, seed), Hash(xb, yb, seed), fx), fy);
        }
        static float Fbm(float u, float v, int period, int seed, int oct = 4)
        {
            float s = 0, a = 0.5f, n = 0; for (int o = 0; o < oct; o++) { s += Noise(u, v, period << o, seed + o * 17) * a; n += a; a *= 0.5f; }
            return s / n;
        }

        public delegate void Texel(float u, float v, out Color albedo, out float height, out Color mask);

        /// <summary>Makes albedo, normal and HDRP mask (R metallic, G occlusion, A smoothness) maps from one function.</summary>
        public static void Bake(string name, int size, float bump, Texel f, out Texture2D albedo, out Texture2D normal, out Texture2D mask)
        {
            var a = new Color[size * size]; var mk = new Color[size * size]; var h = new float[size * size];
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            { Color ca, cm; float hh; f((x + 0.5f) / size, (y + 0.5f) / size, out ca, out hh, out cm); a[y * size + x] = ca; mk[y * size + x] = cm; h[y * size + x] = hh; }
            var nm = new Color[size * size];
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            {
                float dx = h[y * size + (x + 1) % size] - h[y * size + (x + size - 1) % size], dy = h[((y + 1) % size) * size + x] - h[((y + size - 1) % size) * size + x];
                Vector3 nn = new Vector3(-dx * bump, -dy * bump, 1f).normalized;
                nm[y * size + x] = new Color(nn.x * 0.5f + 0.5f, nn.y * 0.5f + 0.5f, nn.z * 0.5f + 0.5f, 1f);
            }
            albedo = Tex(name + "_albedo", size, a, false); normal = Tex(name + "_normal", size, nm, true); mask = Tex(name + "_mask", size, mk, true);
        }

        public static Texture2D Tex(string name, int size, Color[] px, bool linear)
        {
            var t = new Texture2D(size, size, TextureFormat.RGBA32, true, linear) { name = name, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 8 };
            t.SetPixels(px); t.Apply(true, false);
            return Save(t);
        }

        static float Line(float x, float width) { x = Mathf.Abs(x - Mathf.Round(x)); return Mathf.Clamp01(1f - x / width); }

        /// <summary>Painted hull plates: seams, fasteners, faint streaks and a film of settled dust.</summary>
        public static void HullPanels(float u, float v, out Color albedo, out float height, out Color mask)
        {
            float seam = Mathf.Max(Line(u * 4f, 0.012f), Line(v * 4f + (Mathf.Floor(u * 4f) % 2 == 0 ? 0f : 0.5f), 0.012f));
            float fu = u * 4f - Mathf.Floor(u * 4f), fv = v * 64f - Mathf.Floor(v * 64f);
            float rivet = Mathf.Clamp01(1f - Vector2.Distance(new Vector2(fu * 0.25f * 64f, fv), new Vector2(0.6f, 0.5f)) / 0.2f) + Mathf.Clamp01(1f - Vector2.Distance(new Vector2((1f - fu) * 0.25f * 64f, fv), new Vector2(0.6f, 0.5f)) / 0.2f);
            float dust = Fbm(u, v, 4, 11), fine = Fbm(u, v, 32, 5, 3), streak = Fbm(u * 6f, v * 0.5f, 8, 31, 3);
            float d = Mathf.SmoothStep(0.48f, 0.82f, dust) * 0.42f + Mathf.SmoothStep(0.55f, 0.9f, streak) * 0.14f;
            Color paint = Color.Lerp(new Color(0.97f, 0.97f, 0.96f), new Color(0.90f, 0.90f, 0.89f), fine);
            albedo = Color.Lerp(paint, new Color(0.76f, 0.54f, 0.40f), d * 0.6f) * (1f - seam * 0.5f);
            albedo.a = 1f;
            height = -seam * 1.0f + Mathf.Clamp01(rivet) * 0.22f + fine * 0.06f;
            mask = new Color(0f, 1f - seam * 0.6f, 0f, Mathf.Clamp01(0.62f - d * 0.5f - fine * 0.12f));
        }

        /// <summary>Crinkled multi-layer insulation foil.</summary>
        public static void Foil(float u, float v, out Color albedo, out float height, out Color mask)
        {
            float a = Mathf.Abs(Fbm(u, v, 6, 3, 5) - 0.5f) * 2f, b = Mathf.Abs(Fbm(u + 0.37f, v + 0.11f, 9, 8, 4) - 0.5f) * 2f;
            float quilt = Mathf.Max(Line(u * 3f, 0.02f), Line(v * 3f, 0.02f));
            height = (1f - a) * 0.9f + (1f - b) * 0.5f - quilt * 0.9f;
            float t = Fbm(u, v, 5, 21, 3);
            albedo = Color.Lerp(new Color(0.92f, 0.92f, 0.92f), Color.white, t); albedo.a = 1f;
            mask = new Color(1f, 1f - quilt * 0.4f, 0f, Mathf.Clamp01(0.72f + (t - 0.5f) * 0.25f));
        }

        /// <summary>Quilted suit / inflatable fabric.</summary>
        public static void Fabric(float u, float v, out Color albedo, out float height, out Color mask)
        {
            float weave = Mathf.Sin(u * Mathf.PI * 2f * 96f) * Mathf.Sin(v * Mathf.PI * 2f * 96f);
            float q = Mathf.Max(Line(u * 6f, 0.03f), Line(v * 6f, 0.03f));
            float cu = (u * 6f - Mathf.Floor(u * 6f)) - 0.5f, cv = (v * 6f - Mathf.Floor(v * 6f)) - 0.5f;
            float puff = Mathf.Clamp01(1f - (cu * cu + cv * cv) * 3.2f);
            float dust = Fbm(u, v, 5, 61);
            height = puff * 1.0f - q * 0.8f + weave * 0.06f;
            albedo = Color.Lerp(new Color(0.94f, 0.94f, 0.92f), new Color(0.80f, 0.60f, 0.46f), Mathf.SmoothStep(0.45f, 0.85f, dust) * 0.4f) * (1f - q * 0.25f); albedo.a = 1f;
            mask = new Color(0f, 1f - q * 0.5f, 0f, 0.28f + puff * 0.08f);
        }

        /// <summary>Pressure-suit cloth: a fine weave with soft folds and a little dust.</summary>
        public static void SuitCloth(float u, float v, out Color albedo, out float height, out Color mask)
        {
            float weave = Mathf.Sin(u * Mathf.PI * 2f * 128f) * Mathf.Sin(v * Mathf.PI * 2f * 128f);
            float fold = Fbm(u, v * 3f, 6, 13, 3), dust = Fbm(u, v, 5, 61);
            height = fold * 1.2f + weave * 0.05f;
            albedo = Color.Lerp(new Color(0.97f, 0.97f, 0.96f), new Color(0.82f, 0.64f, 0.50f), Mathf.SmoothStep(0.5f, 0.9f, dust) * 0.3f); albedo.a = 1f;
            mask = new Color(0f, 0.75f + fold * 0.25f, 0f, 0.3f);
        }

        /// <summary>Photovoltaic cells with bus bars, under glass, with a little dust.</summary>
        public static void SolarCells(float u, float v, out Color albedo, out float height, out Color mask)
        {
            float gap = Mathf.Max(Line(u * 8f, 0.03f), Line(v * 4f, 0.05f));
            float bus = Mathf.Max(Line(u * 8f + 0.33f, 0.02f), Line(u * 8f + 0.66f, 0.02f)) * 0.55f, finger = Line(v * 4f * 24f, 0.25f) * 0.10f;
            float cell = Hash(Mathf.FloorToInt(u * 8f), Mathf.FloorToInt(v * 4f), 9);
            float dust = Mathf.SmoothStep(0.4f, 0.85f, Fbm(u, v, 3, 44));
            Color c = Color.Lerp(new Color(0.015f, 0.03f, 0.10f), new Color(0.03f, 0.055f, 0.16f), cell);
            c = Color.Lerp(c, new Color(0.55f, 0.57f, 0.62f), Mathf.Clamp01(bus + finger));
            c = Color.Lerp(c, new Color(0.72f, 0.73f, 0.74f), gap);
            albedo = Color.Lerp(c, new Color(0.55f, 0.36f, 0.25f), dust * 0.28f); albedo.a = 1f;
            height = -gap * 0.6f;
            mask = new Color(gap > 0.5f ? 0.8f : 0.1f, 1f, 0f, Mathf.Clamp01(0.93f - dust * 0.5f - gap * 0.3f));
        }

        /// <summary>Sintered-regolith landing pad: slabs, a ring target and scorch marks from the engines.</summary>
        public static void PadSurface(float u, float v, out Color albedo, out float height, out Color mask)
        {
            float x = u - 0.5f, y = v - 0.5f, r = Mathf.Sqrt(x * x + y * y) * 2f;
            float slab = Mathf.Max(Line(u * 12f, 0.012f), Line(v * 12f, 0.012f));
            float ring = Mathf.Max(Mathf.Clamp01(1f - Mathf.Abs(r - 0.55f) / 0.012f), Mathf.Clamp01(1f - Mathf.Abs(r - 0.9f) / 0.012f));
            float cross = (Mathf.Abs(x) < 0.006f || Mathf.Abs(y) < 0.006f) && r > 0.55f && r < 0.9f ? 1f : 0f;
            float n = Fbm(u, v, 24, 7), big = Fbm(u, v, 5, 2);
            float scorch = Mathf.Clamp01(1f - r / 0.5f) * (0.6f + 0.4f * big) + Mathf.Pow(Mathf.Clamp01(1f - r), 3f) * Mathf.SmoothStep(0.4f, 0.7f, Fbm(Mathf.Atan2(y, x) / 6.283f + 0.5f, 0.3f, 24, 9, 2)) * 0.7f;
            Color c = Color.Lerp(new Color(0.34f, 0.26f, 0.22f), new Color(0.44f, 0.33f, 0.27f), n);
            c = Color.Lerp(c, new Color(0.86f, 0.80f, 0.70f), Mathf.Max(ring, cross) * 0.85f);
            c = Color.Lerp(c, new Color(0.05f, 0.045f, 0.045f), Mathf.Clamp01(scorch) * 0.85f);
            c *= 1f - slab * 0.5f; c.a = 1f; albedo = c;
            height = -slab * 1f + n * 0.25f;
            mask = new Color(0f, 1f - slab * 0.5f, 0f, 0.18f + scorch * 0.2f);
        }

        /// <summary>Soft-edged decal images (RGBA): wheel tracks, a trodden path, blast streaks.</summary>
        public static Texture2D TrackDecal(string name, int kind)
        {
            const int w = 256; var px = new Color[w * w];
            for (int y = 0; y < w; y++) for (int x = 0; x < w; x++)
            {
                float u = (x + 0.5f) / w, v = (y + 0.5f) / w, a = 0f; float shade = 0.5f;
                if (kind == 0)
                {   // two wheel ruts with cleat marks
                    float rut = Mathf.Max(Mathf.Clamp01(1f - Mathf.Abs(u - 0.2f) / 0.085f), Mathf.Clamp01(1f - Mathf.Abs(u - 0.8f) / 0.085f));
                    float cleat = 0.6f + 0.4f * Mathf.Sin(v * Mathf.PI * 2f * 28f + Mathf.Sin(u * 40f) * 1.2f);
                    a = Mathf.SmoothStep(0f, 0.7f, rut) * (0.55f + 0.3f * cleat) * (0.75f + 0.25f * Fbm(u, v, 8, 3));
                    shade = 0.36f + 0.1f * cleat;
                }
                else if (kind == 1)
                {   // a path worn by boots: blotchy, darker in the middle
                    float c = Mathf.Clamp01(1f - Mathf.Abs(u - 0.5f) / 0.5f);
                    a = Mathf.SmoothStep(0.0f, 0.9f, c) * Mathf.SmoothStep(0.25f, 0.7f, Fbm(u, v, 10, 77, 4)) * 0.8f;
                    shade = 0.40f;
                }
                else
                {   // radial dust blown clear around the pad
                    float dx = u - 0.5f, dy = v - 0.5f, r = Mathf.Sqrt(dx * dx + dy * dy) * 2f, ang = Mathf.Atan2(dy, dx) / 6.2832f + 0.5f;
                    float ray = Fbm(ang, 0.5f, 48, 5, 3);
                    a = Mathf.Clamp01(1.05f - r) * Mathf.SmoothStep(0.35f, 0.75f, ray + (1f - r) * 0.35f) * 0.75f;
                    shade = 0.32f;
                }
                px[y * w + x] = new Color(0.50f * shade, 0.31f * shade, 0.22f * shade, Mathf.Clamp01(a));
            }
            var t = new Texture2D(w, w, TextureFormat.RGBA32, true, false) { name = name, wrapMode = kind == 2 ? TextureWrapMode.Clamp : TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 8 };
            t.SetPixels(px); t.Apply(true, false);
            return Save(t);
        }
    }
}
