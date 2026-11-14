// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Screenshotter.cs — renders stills from the open scene in batch mode (used for the quality gate and for iteration).
using System.IO;
using UnityEngine;

namespace PlutonyX.EditorTools
{
    public static class Screenshotter
    {
        public static string OutDir { get { return Path.GetFullPath(Path.Combine(Application.dataPath, "../Captures")); } }

        public static string Shot(Camera cam, string name, Vector3 position, Vector3 lookAt, float fov = 45f, int width = 1920, int height = 1080, int frames = 12)
        {
            Directory.CreateDirectory(OutDir);
            cam.transform.position = position; cam.transform.LookAt(lookAt); cam.fieldOfView = fov;
            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
            RenderTexture prevTarget = cam.targetTexture; cam.targetTexture = rt;
            for (int i = 0; i < frames; i++) cam.Render();          // several frames so TAA and the sky converge
            RenderTexture prev = RenderTexture.active; RenderTexture.active = rt;
            var tex = new Texture2D(width, height, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, width, height), 0, 0); tex.Apply();
            RenderTexture.active = prev; cam.targetTexture = prevTarget;
            string path = Path.Combine(OutDir, name + ".png");
            File.WriteAllBytes(path, tex.EncodeToPNG());
            Object.DestroyImmediate(tex); rt.Release(); Object.DestroyImmediate(rt);
            Debug.Log("[PlutonyX] screenshot " + path);
            return path;
        }
    }
}
