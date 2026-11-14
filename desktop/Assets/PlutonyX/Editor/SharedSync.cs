// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// SharedSync.cs — copies the shared design and data files (../shared) into StreamingAssets so the
// player reads exactly what the Web edition reads. Never edit the copies; edit /shared.
using System.IO;
using UnityEditor;
using UnityEngine;

namespace PlutonyX.EditorTools
{
    public static class SharedSync
    {
        public static string SharedRoot { get { return Path.GetFullPath(Path.Combine(Application.dataPath, "../../shared")); } }

        [MenuItem("PlutonyX/Sync shared design and data")]
        public static void Sync()
        {
            int n = CopyDir(Path.Combine(SharedRoot, "design"), Path.Combine(Application.streamingAssetsPath, "design"), "*.json")
                  + CopyDir(Path.Combine(SharedRoot, "data/spaceweather"), Path.Combine(Application.streamingAssetsPath, "data/spaceweather"), "*.json");
            foreach (string f in new[] { "data/SOURCES.md", "science-log.md", "references.md" })
            {
                string src = Path.Combine(SharedRoot, f);
                if (File.Exists(src)) { string dst = Path.Combine(Application.streamingAssetsPath, f); Directory.CreateDirectory(Path.GetDirectoryName(dst)); File.Copy(src, dst, true); n++; }
            }
            AssetDatabase.Refresh();
            Debug.Log("[PlutonyX] SharedSync: copied " + n + " files from " + SharedRoot);
        }

        static int CopyDir(string from, string to, string pattern)
        {
            if (!Directory.Exists(from)) { Debug.LogWarning("[PlutonyX] SharedSync: missing " + from); return 0; }
            Directory.CreateDirectory(to);
            int n = 0;
            foreach (string f in Directory.GetFiles(from, pattern)) { File.Copy(f, Path.Combine(to, Path.GetFileName(f)), true); n++; }
            return n;
        }
    }
}
