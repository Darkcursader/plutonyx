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
        public ActorsDirector Actors;
        public ExploreController Explore;
        public static bool Active;

        struct Take { public string Name, Shot, ToShot; public float Hour, Dust, Storm, Grow, Seconds; public int Action; }   // 1 launch, 2 crew to shelter, 3 rover leaves
        static readonly Take[] Takes =
        {
            new Take { Name = "01_flyover_sunrise", Shot = "flyover", ToShot = "flyover_end", Hour = 6.9f, Seconds = 9f, Grow = 0.6f },
            new Take { Name = "02_outpost_morning", Shot = "title", Hour = 8.2f, Seconds = 4f, Grow = 0.6f },
            new Take { Name = "03_greenhouse_dusk", Shot = "greenhouse", Hour = 17.75f, Seconds = 5f, Grow = 1f },
            new Take { Name = "04_dust_storm", Shot = "solar", Hour = 13f, Dust = 1f, Seconds = 5f, Grow = 0.3f },
            new Take { Name = "05_radiation_storm", Shot = "shelter", Hour = 17.8f, Storm = 1f, Seconds = 7f, Grow = 0.3f, Action = 2 },
            new Take { Name = "06_delta_blue_hour", Shot = "delta", Hour = 17.3f, Seconds = 5f, Action = 5 },
            new Take { Name = "07_launch_sunset", Shot = "pad_sunset_launch", Hour = 17.4f, Seconds = 11f, Grow = 1f, Action = 1 },
            new Take { Name = "09_rover_leaves", Shot = "garage", Hour = 9f, Seconds = 7f, Grow = 0.6f, Action = 3 },
            new Take { Name = "10_explore_walk", Shot = "outpost", Hour = 9.6f, Seconds = 8f, Grow = 0.8f, Action = 4 },
            new Take { Name = "08_outpost_night", Shot = "night", Hour = 22f, Seconds = 4f, Grow = 1f },
            new Take { Name = "11_ship_on_pad", Shot = "cu_ship", Hour = 9.0f, Seconds = 5f, Grow = 0.8f },
            new Take { Name = "12_crew_closeup", Shot = "cu_crew", Hour = 9.4f, Seconds = 5f, Grow = 0.6f },
            new Take { Name = "13_habitat_closeup", Shot = "cu_hab", Hour = 16.2f, Seconds = 5f, Grow = 0.8f },
            new Take { Name = "14_rover_closeup", Shot = "cu_rover", Hour = 8.6f, Seconds = 5f, Grow = 0.6f },
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

        IEnumerator AutoJumps() { while (Explore != null && Explore.Active) { yield return new WaitForSeconds(2.6f); Explore.AutoJump = true; } }

        public IEnumerator Run(string dir, bool video)
        {
            Active = true;
            Directory.CreateDirectory(dir);
            string only = null; string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++) if (args[i] == "-take") only = args[i + 1];
            foreach (Take t in Takes)
            {
                if (only != null && !t.Name.Contains(only)) continue;
                World.SetDust(t.Dust); World.SetStorm(t.Storm); World.SetGrowLights(t.Grow); World.SetTime(t.Hour, true); World.Shot(t.Shot, true);
                Time.captureFramerate = 0;
                yield return new WaitForSeconds(10f);             // let sun, dust, particles and exposure settle
                if (Actors != null) { Actors.ResetAll(); World.Track = null; }
                if (!video)
                {
                    if (t.Action == 1 && Actors != null) { Actors.Launch(); World.Track = Actors.Ship; yield return new WaitForSeconds(5.2f); }
                    if (t.Action == 2 && Actors != null) { Actors.CrewToShelter(true); yield return new WaitForSeconds(4f); }
                    if (t.Action == 3 && Actors != null) { Actors.SetDilAway(true, true); yield return new WaitForSeconds(4.0f); }
                    if (t.Action == 5 && Actors != null) { Actors.SetDilAway(true, false); yield return new WaitForSeconds(1.5f); }
                    if (t.Action == 4 && Explore != null) { World.ExternalCamera = true; Explore.Begin(); Explore.AutoMove = new Vector2(0.25f, 1f); yield return new WaitForSeconds(3.2f); }
                    ScreenCapture.CaptureScreenshot(Path.Combine(dir, t.Name + ".png"), 2);
                    yield return null; yield return null;
                    if (t.Action == 4 && Explore != null) { Explore.AutoMove = Vector2.zero; Explore.End(); World.ExternalCamera = false; }
                    continue;
                }
                string sub = Path.Combine(dir, t.Name); Directory.CreateDirectory(sub);
                if (!string.IsNullOrEmpty(t.ToShot)) World.Shot(t.ToShot);
                if (t.Action == 1 && Actors != null) { Actors.Launch(); World.Track = Actors.Ship; }
                if (t.Action == 2 && Actors != null) Actors.CrewToShelter(true);
                if (t.Action == 3 && Actors != null) Actors.SetDilAway(true, true);
                if (t.Action == 5 && Actors != null) Actors.SetDilAway(true, false);
                if (t.Action == 4 && Explore != null) { World.ExternalCamera = true; Explore.Begin(); Explore.AutoMove = new Vector2(0.25f, 1f); StartCoroutine(AutoJumps()); }
                Time.captureFramerate = 30;
                int frames = Mathf.RoundToInt(t.Seconds * 30f);
                for (int f = 0; f < frames; f++)
                {
                    ScreenCapture.CaptureScreenshot(Path.Combine(sub, f.ToString("0000") + ".png"));
                    yield return null;
                }
                Time.captureFramerate = 0;
                if (t.Action == 4 && Explore != null) { Explore.AutoMove = Vector2.zero; Explore.End(); World.ExternalCamera = false; }
            }
            Debug.Log("[PlutonyX] capture finished: " + dir);
            Application.Quit();
        }
    }
}
