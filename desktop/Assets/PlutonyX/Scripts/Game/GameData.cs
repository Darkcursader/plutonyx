// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// GameData.cs — loads the shared design and real-data files from StreamingAssets (copied from /shared by SharedSync).
using System.Collections.Generic;
using System.IO;
using PlutonyX.Core;
using UnityEngine;

namespace PlutonyX.Game
{
    public static class GameData
    {
        public static Design Design;
        static string Root { get { return Application.streamingAssetsPath; } }

        public static void Load()
        {
            Design = Design.Load(name => { string p = Path.Combine(Root, "design", name); return File.Exists(p) ? File.ReadAllText(p) : null; });
        }

        static JsonValue ReadWindowFile(string id)
        {
            string p = Path.Combine(Root, "data", "spaceweather", id + ".json");
            return File.Exists(p) ? JsonValue.Parse(File.ReadAllText(p)) : JsonValue.Null;
        }

        /// <summary>The real record behind a mission window. "live" falls back to the archived snapshot of the last 30 days.</summary>
        public static MissionWindow LoadWindow(string windowDefId, out bool live)
        {
            live = false;
            JsonValue def = Design.Window(windowDefId);
            string fileId = windowDefId == "live" ? "recent" : windowDefId;
            MissionWindow w;
            int sols = Design.MissionSols;
            if (windowDefId == "live" && LiveData.Window != null)
            {   // a fresh copy each time: a mission may inject the archived storm into its window
                MissionWindow src = LiveData.Window;
                w = new MissionWindow { Id = src.Id, Label = src.Label, Mode = src.Mode, RetrievedUtc = src.RetrievedUtc, RadSource = src.RadSource, Sol1 = src.Sol1, CalmDose = src.CalmDose, Sol1Index = src.Sol1Index };
                foreach (WeatherDay d in src.Days) w.Days.Add(d.Clone());
                live = true;
            }
            else
            {
                JsonValue data = ReadWindowFile(fileId);
                if (data.IsNull) { data = ReadWindowFile("may-2024"); def = Design.Window("may-2024"); }
                w = MissionWindow.FromJson(data, def["sol1"].IsNull ? null : def["sol1"].Str());
            }
            if (windowDefId == "live" && w.PeakStormLevel(sols) < 2)
            {   // GAME_BIBLE decision 8: a calm window replays the archived real storm, labelled ARCHIVED
                JsonValue inj = Design.Balance["spaceWeather"]["calmWindowStorm"];
                JsonValue arch = ReadWindowFile(inj["window"].Str("may-2024"));
                if (!arch.IsNull)
                {
                    var dates = new List<string>(); foreach (JsonValue d in inj["dates"].Items) dates.Add(d.Str());
                    w.InjectArchivedStorm(MissionWindow.FromJson(arch), dates, Design.Balance["spaceWeather"]["peakSol"].Int(8));
                }
            }
            return w;
        }

        public static string Badge(MissionWindow w, bool live)
        {
            if (live) return "LIVE NASA SPACE WEATHER  ·  FETCHED " + w.RetrievedUtc;
            return "REAL NASA DATA  ·  ARCHIVED " + (string.IsNullOrEmpty(w.RetrievedUtc) ? "" : w.RetrievedUtc.Substring(0, 10));
        }
    }
}
