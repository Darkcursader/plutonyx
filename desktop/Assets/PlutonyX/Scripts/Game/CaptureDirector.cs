// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// CaptureDirector.cs — makes the stills and clips for the project page and the demo, from the real player:
//   PlutonyX -stills <folder>   4K stills (3840x2160 from a 1920x1080 window), no UI
//   PlutonyX -record <folder>   PNG frame sequences at 30 fps for each cinematic shot (encode with ffmpeg)
using System;
using System.Collections;
using System.IO;
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class CaptureDirector : MonoBehaviour
    {
        public WorldDirector World;
        public static bool Active;

        struct Take { public string Name, Shot, ToShot; public float Hour, Dust, Storm, Grow, Seconds; }
        static readonly Take[] Takes =
        {
            new Take { Name = "01_flyover_sunrise", Shot = "flyover", ToShot = "flyover_end", Hour = 6.9f, Seconds = 9f, Grow = 0.6f },
            new Take { Name = "02_outpost_morning", Shot = "title", Hour = 8.2f, Seconds = 4f, Grow = 0.6f },
            new Take { Name = "03_greenhouse_dusk", Shot = "greenhouse", Hour = 17.75f, Seconds = 5f, Grow = 1f },
            new Take { Name = "04_dust_storm", Shot = "solar", Hour = 13f, Dust = 1f, Seconds = 5f, Grow = 0.3f },
            new Take { Name = "05_radiation_storm", Shot = "shelter", Hour = 17.8f, Storm = 1f, Seconds = 6f, Grow = 0.3f },
            new Take { Name = "06_delta_blue_hour", Shot = "delta", Hour = 17.3f, Seconds = 4f },
            new Take { Name = "07_launch_sunset", Shot = "pad_sunset_launch", Hour = 17.7f, Seconds = 5f, Grow = 1f },
            new Take { Name = "08_outpost_night", Shot = "night", Hour = 22f, Seconds = 4f, Grow = 1f },
        };

        public static bool Wanted(out string dir, out bool video)
        {
            dir = null; video = false;
            string[] a = Environment.GetCommandLineArgs();
            for (int i = 0; i < a.Length - 1; i++)
            {
                if (a[i] == "-stills") { dir = a[i + 1]; return true; }
                if (a[i] == "-record") { dir = a[i + 1]; video = true; return true; }
            }
            return false;
        }

        public IEnumerator Run(string dir, bool video)
        {
            Active = true;
            Directory.CreateDirectory(dir);
            foreach (Take t in Takes)
            {
                World.SetDust(t.Dust); World.SetStorm(t.Storm); World.SetGrowLights(t.Grow); World.SetTime(t.Hour, true); World.Shot(t.Shot, true);
                Time.captureFramerate = 0;
                yield return new WaitForSeconds(10f);             // let sun, dust, particles and exposure settle
                if (!video)
                {
                    ScreenCapture.CaptureScreenshot(Path.Combine(dir, t.Name + ".png"), 2);
                    yield return null; yield return null;
                    continue;
                }
                string sub = Path.Combine(dir, t.Name); Directory.CreateDirectory(sub);
                if (!string.IsNullOrEmpty(t.ToShot)) World.Shot(t.ToShot);
                Time.captureFramerate = 30;
                int frames = Mathf.RoundToInt(t.Seconds * 30f);
                for (int f = 0; f < frames; f++)
                {
                    ScreenCapture.CaptureScreenshot(Path.Combine(sub, f.ToString("0000") + ".png"));
                    yield return null;
                }
                Time.captureFramerate = 0;
            }
            Debug.Log("[PlutonyX] capture finished: " + dir);
            Application.Quit();
        }
    }
}
