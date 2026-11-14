// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Reveal.cs — fills the "It really happened" lines (shared/design/windows.json) with the real numbers of the window.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace PlutonyX.Core
{
    public static class Reveal
    {
        static double Flux(string cls)
        {
            if (string.IsNullOrEmpty(cls)) return 0;
            double b = cls[0] == 'X' ? 1e-4 : cls[0] == 'M' ? 1e-5 : cls[0] == 'C' ? 1e-6 : cls[0] == 'B' ? 1e-7 : 1e-8, n;
            return double.TryParse(cls.Substring(1), NumberStyles.Float, CultureInfo.InvariantCulture, out n) ? b * n : b;
        }
        static string Clock(string iso) { return !string.IsNullOrEmpty(iso) && iso.Length >= 16 ? iso.Substring(11, 5) : "--:--"; }
        static string N(double v, string f = "0") { return v.ToString(f, CultureInfo.InvariantCulture); }

        public static Dictionary<string, string> Tokens(MissionWindow w, int sols)
        {
            WeatherDay peak = w.Day(1); string flareMax = null; double kp = 0;
            for (int s = 1; s <= sols; s++)
            {
                WeatherDay d = w.Day(s);
                if (d.DoseOutside > peak.DoseOutside) peak = d;
                if (Flux(d.FlareMax) > Flux(flareMax)) flareMax = d.FlareMax;
                if (d.KpMax > kp) kp = d.KpMax;
            }
            // the eruption behind the peak: the fastest cloud of the peak day or the day before
            int pi = w.Days.IndexOf(peak); WeatherDay prev = pi > 0 ? w.Days[pi - 1] : peak;
            WeatherDay src = prev.CmeFastest > peak.CmeFastest && Clock(prev.CmeFastestStart).CompareTo("12:00") >= 0 ? prev : peak;
            double calmRate = w.CalmDose / 24.0;
            var t = new Dictionary<string, string>();
            t["peakRate"] = N(peak.RadMaxRate); t["calmRate"] = N(calmRate, "0.0");
            t["peakRatio"] = N(calmRate > 0 ? peak.RadMaxRate / calmRate : 0); t["peakTime"] = Clock(peak.RadMaxTime);
            t["cmeSpeed"] = N(src.CmeFastest, "#,0"); t["cmeTime"] = Clock(src.CmeFastestStart);
            t["delayMin"] = N(peak.LightMinutes); t["roundTripMin"] = N(peak.LightMinutes * 2);
            t["kpMax"] = N(kp); t["flareMax"] = flareMax ?? "C or smaller";
            t["doseRatio"] = N(w.CalmDose > 0 ? peak.DoseOutside / w.CalmDose : 1, "0.0");
            t["window"] = w.Day(1).Date + " to " + w.Day(sols).Date; t["peakDate"] = peak.Date;
            return t;
        }

        public static List<string> Lines(Design design, MissionWindow w, string windowDefId, int sols)
        {
            var lines = new List<string>();
            Dictionary<string, string> tok = Tokens(w, sols);
            foreach (JsonValue l in design.Window(windowDefId)["reveal"].Items)
            {
                string s = l.Str();
                foreach (KeyValuePair<string, string> kv in tok) s = s.Replace("{" + kv.Key + "}", kv.Value);
                lines.Add(s);
            }
            if (w.StormInjected) lines.Add(design.Dialogue["reveal"]["injected"].Str());
            return lines;
        }
    }
}
