// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// LiveWindow.cs — turns freshly fetched NASA DONKI records (flares and CMEs) into a mission window,
// with the same rules as shared/scripts/lib/spaceweather.mjs (buildDays, deriveGame, pickWindow).
// No rover radiation measurement exists for recent dates, so dose is ESTIMATED and labelled as such.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace PlutonyX.Core
{
    public static class LiveWindow
    {
        static double Flux(string cls)
        {
            if (string.IsNullOrEmpty(cls)) return 0;
            char c = char.ToUpperInvariant(cls[0]);
            double b = c == 'X' ? 1e-4 : c == 'M' ? 1e-5 : c == 'C' ? 1e-6 : c == 'B' ? 1e-7 : c == 'A' ? 1e-8 : 0, n;
            return cls.Length > 1 && double.TryParse(cls.Substring(1), NumberStyles.Float, CultureInfo.InvariantCulture, out n) ? b * n : b;
        }
        static int Hour(string iso) { return !string.IsNullOrEmpty(iso) && iso.Length >= 13 ? int.Parse(iso.Substring(11, 2), CultureInfo.InvariantCulture) : 0; }

        public static MissionWindow Build(JsonValue flares, JsonValue cmes, string start, string end, JsonValue rules, string retrievedUtc, int sols, int peakSol)
        {
            var w = new MissionWindow { Id = "live", Label = "Live NASA space weather", Mode = "live", RetrievedUtc = retrievedUtc, RadSource = "estimated" };
            var byDate = new Dictionary<string, WeatherDay>();
            for (string d = start; string.CompareOrdinal(d, end) <= 0; d = Orbit.AddDays(d, 1))
            {
                var day = new WeatherDay { Date = d };
                day.ApplyOrbit(Orbit.EarthMars(Orbit.NoonMs(d)));
                w.Days.Add(day); byDate[d] = day;
            }
            foreach (JsonValue f in flares.Items)
            {
                string t = f["peakTime"].Str(null) ?? f["beginTime"].Str(null); WeatherDay d;
                if (t == null || t.Length < 10 || !byDate.TryGetValue(t.Substring(0, 10), out d)) continue;
                string cls = f["classType"].Str("");
                d.FlareCount++;
                if (cls.StartsWith("C")) d.FlareC++; else if (cls.StartsWith("M")) d.FlareM++; else if (cls.StartsWith("X")) d.FlareX++;
                if (Flux(cls) > Flux(d.FlareMax)) { d.FlareMax = cls; d.FlareMaxPeakTime = t; d.FlareMaxLink = f["link"].Str(null); }
            }
            foreach (JsonValue c in cmes.Items)
            {
                string t = c["startTime"].Str(null); WeatherDay d;
                if (t == null || t.Length < 10 || !byDate.TryGetValue(t.Substring(0, 10), out d)) continue;
                d.CmeCount++;
                JsonValue best = JsonValue.Null;
                foreach (JsonValue a in c["cmeAnalyses"].Items) { if (best.IsNull) best = a; if (a["isMostAccurate"].Bool()) { best = a; break; } }
                double speed = best["speed"].Num(0);
                if (speed > d.CmeFastest) { d.CmeFastest = speed; d.CmeFastestType = best["type"].Str(null); d.CmeFastestLink = c["link"].Str(null); d.CmeFastestStart = t; }
            }
            double calm = rules["calmDoseDefault"].Num(115), fast = rules["sepStormCmeSpeed"].Num(2500), extra = rules["estimatedStormExtra"].Num(1.5);
            double fM = rules["flareLevels"]["M"].Num(1e-5), fX = rules["flareLevels"]["X"].Num(1e-4), fX5 = rules["flareLevels"]["X5"].Num(5e-4);
            for (int i = 0; i < w.Days.Count; i++)
            {
                WeatherDay d = w.Days[i], prev = i > 0 ? w.Days[i - 1] : null;
                double flux = Flux(d.FlareMax);
                d.FlareLevel = flux >= fX5 ? 3 : flux >= fX ? 2 : flux >= fM ? 1 : 0;
                d.RadioNoise = d.FlareLevel >= 3 ? 2 : d.FlareLevel >= 2 ? 1 : 0;
                bool early = d.CmeFastest >= fast && Hour(d.CmeFastestStart) < 12;
                bool late = prev != null && prev.CmeFastest >= fast && Hour(prev.CmeFastestStart) >= 12;
                d.StormLevel = early || late ? 2 : 0;
                d.RadSource = "estimated"; d.DoseCalm = calm; d.DoseStorm = d.StormLevel > 0 ? calm * extra : 0; d.DoseOutside = d.DoseCalm + d.DoseStorm;
            }
            w.CalmDose = calm;
            // pickWindow: put the busiest day on the peak sol when the record allows it
            int bestIndex = 0;
            Func<WeatherDay, int> threat = x => x.StormLevel * 10 + x.FlareLevel * 2;
            for (int i = 1; i < w.Days.Count; i++) if (threat(w.Days[i]) > threat(w.Days[bestIndex])) bestIndex = i;
            w.Sol1Index = w.Days.Count <= sols ? 0 : Math.Max(0, Math.Min(w.Days.Count - sols, bestIndex - (peakSol - 1)));
            w.Sol1 = w.Days[w.Sol1Index].Date;
            return w;
        }
    }
}
