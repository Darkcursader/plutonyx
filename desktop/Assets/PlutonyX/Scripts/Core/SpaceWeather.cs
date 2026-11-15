// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// SpaceWeather.cs — reads the shared real-NASA-data windows (shared/data/spaceweather/*.json) and
// computes the real Earth–Mars radio delay. Port of shared/scripts/lib/spaceweather.mjs (orbit part).
// Nothing here invents data: one game sol = one real UTC day from the file.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace PlutonyX.Core
{
    /// <summary>NASA's modelled arrival of a solar cloud (CME) at Mars, from DONKI WSA-ENLIL.</summary>
    public sealed class MarsArrival
    {
        public string Issued, Arrival, CmeStart, Link;
        public bool Glancing;
        public double CmeSpeed;
    }

    /// <summary>One real UTC day of space weather (SCHEMA.md, section 5).</summary>
    public sealed class WeatherDay
    {
        public string Date;
        public int FlareCount, FlareC, FlareM, FlareX;
        public string FlareMax, FlareMaxPeakTime, FlareMaxLink;
        public int CmeCount; public double CmeFastest; public string CmeFastestType, CmeFastestLink, CmeFastestStart;
        public readonly List<MarsArrival> MarsArrivals = new List<MarsArrival>();
        public readonly List<MarsArrival> MarsForecasts = new List<MarsArrival>();
        public double KpMax; public bool EarthStorm;
        public int SepCount;
        public bool RadMeasured; public double RadMeanRate, RadMaxRate, RadDose; public string RadMaxTime;
        public readonly List<double[]> RadProfile = new List<double[]>();     // [minute of day, µGy/h] — the real curve
        // derived game values
        public string RadSource = "estimated";
        public double DoseOutside, DoseCalm, DoseStorm;
        public int StormLevel, FlareLevel, RadioNoise;
        // orbit
        public double LightMinutes, DistanceMillionKm, MarsAheadOfEarthDeg, EarthX, EarthY, MarsX, MarsY;
        public bool Injected;                 // true when this day was replayed from the archive into a calm live window
        public WeatherDay Clone() { return (WeatherDay)MemberwiseClone(); }

        public static WeatherDay FromJson(JsonValue j)
        {
            var d = new WeatherDay();
            d.Date = j["date"].Str();
            JsonValue f = j["flares"];
            d.FlareCount = f["count"].Int(); d.FlareC = f["C"].Int(); d.FlareM = f["M"].Int(); d.FlareX = f["X"].Int();
            d.FlareMax = f["max"].IsNull ? null : f["max"].Str(); d.FlareMaxPeakTime = f["maxPeakTime"].Str(null); d.FlareMaxLink = f["maxLink"].Str(null);
            JsonValue c = j["cmes"];
            d.CmeCount = c["count"].Int(); d.CmeFastest = c["fastest"].Num(0); d.CmeFastestType = c["fastestType"].Str(null);
            d.CmeFastestLink = c["fastestLink"].Str(null); d.CmeFastestStart = c["fastestStart"].Str(null);
            foreach (JsonValue a in j["marsArrivals"].Items) d.MarsArrivals.Add(ReadArrival(a));
            foreach (JsonValue a in j["marsForecasts"].Items) d.MarsForecasts.Add(ReadArrival(a));
            d.KpMax = j["earth"]["kpMax"].Num(0); d.EarthStorm = j["earth"]["gst"].Bool();
            d.SepCount = j["sep"].Count;
            JsonValue r = j["rad"];
            if (r.IsObject)
            {
                d.RadMeasured = r["source"].Str() == "measured";
                d.RadMeanRate = r["meanRate"].Num(); d.RadMaxRate = r["maxRate"].Num(); d.RadDose = r["dose"].Num(); d.RadMaxTime = r["maxTime"].Str(null);
                foreach (JsonValue p in r["profile"].Items) d.RadProfile.Add(new[] { p[0].Num(), p[1].Num() });
            }
            JsonValue g = j["game"];
            d.RadSource = g["radSource"].Str("estimated");
            d.DoseOutside = g["doseOutside"].Num(); d.DoseCalm = g["doseCalm"].Num(); d.DoseStorm = g["doseStorm"].Num();
            d.StormLevel = g["stormLevel"].Int(); d.FlareLevel = g["flareLevel"].Int(); d.RadioNoise = g["radioNoise"].Int();
            JsonValue o = j["orbit"];
            if (o.IsObject)
            {
                d.LightMinutes = o["lightMinutes"].Num(); d.DistanceMillionKm = o["distanceMillionKm"].Num(); d.MarsAheadOfEarthDeg = o["marsAheadOfEarthDeg"].Num();
                d.EarthX = o["earth"]["x"].Num(); d.EarthY = o["earth"]["y"].Num(); d.MarsX = o["mars"]["x"].Num(); d.MarsY = o["mars"]["y"].Num();
            }
            else d.ApplyOrbit(Orbit.EarthMars(Orbit.NoonMs(d.Date)));
            return d;
        }

        static MarsArrival ReadArrival(JsonValue a)
        {
            return new MarsArrival { Issued = a["issued"].Str(null), Arrival = a["arrival"].Str(null), CmeStart = a["cmeStart"].Str(null),
                                     Link = a["link"].Str(null), Glancing = a["glancing"].Bool(), CmeSpeed = a["cmeSpeed"].Num(0) };
        }

        public void ApplyOrbit(OrbitInfo o)
        {
            LightMinutes = o.LightMinutes; DistanceMillionKm = o.DistanceMillionKm; MarsAheadOfEarthDeg = o.MarsAheadOfEarthDeg;
            EarthX = o.EarthX; EarthY = o.EarthY; MarsX = o.MarsX; MarsY = o.MarsY;
        }

        /// <summary>The forecast worth reporting today: the fastest cloud NASA's model sent toward Mars.</summary>
        public MarsArrival BestForecast()
        {
            MarsArrival best = null;
            foreach (MarsArrival a in MarsForecasts) if (best == null || a.CmeSpeed > best.CmeSpeed) best = a;
            return best;
        }

        /// <summary>Value used by { "sw": name } conditions.</summary>
        public double Field(string name)
        {
            switch (name)
            {
                case "stormLevel": return StormLevel;
                case "flareLevel": return FlareLevel;
                case "radioNoise": return RadioNoise;
                case "hasForecast": return MarsForecasts.Count > 0 ? 1 : 0;
                case "hasArrival": return MarsArrivals.Count > 0 ? 1 : 0;
                case "doseOutside": return DoseOutside;
                case "doseStorm": return DoseStorm;
                case "doseCalm": return DoseCalm;
                case "kpMax": return KpMax;
                case "measured": return RadSource == "measured" ? 1 : 0;
                default: return 0;
            }
        }
    }

    /// <summary>A real record of consecutive days, and which of them a 10-sol mission uses.</summary>
    public sealed class MissionWindow
    {
        public string Id, Label, Blurb, Mode = "archived", RetrievedUtc, RadSource, Sol1;
        public double CalmDose;
        public readonly List<WeatherDay> Days = new List<WeatherDay>();
        public int Sol1Index;
        public bool StormInjected;
        public JsonValue Sources = JsonValue.Null;

        public bool IsLive { get { return Mode == "live"; } }

        public static MissionWindow FromJson(JsonValue j, string sol1Override = null)
        {
            var w = new MissionWindow();
            JsonValue m = j["meta"];
            w.Id = m["id"].Str(); w.Label = m["label"].Str(); w.Blurb = m["blurb"].Str(); w.Mode = m["mode"].Str("archived");
            w.RetrievedUtc = m["retrievedUtc"].Str(); w.RadSource = m["radSource"].Str(); w.Sol1 = sol1Override ?? m["sol1"].Str();
            w.Sources = m["sources"];
            w.CalmDose = j["calmDose"].Num(115);
            foreach (JsonValue d in j["days"].Items) w.Days.Add(WeatherDay.FromJson(d));
            w.Sol1Index = Math.Max(0, w.Days.FindIndex(d => d.Date == w.Sol1));
            return w;
        }

        /// <summary>The real day behind a mission sol (1-based). Days past the end of the record repeat the last one.</summary>
        public WeatherDay Day(int sol)
        {
            int i = Sol1Index + sol - 1;
            if (i < 0) i = 0;
            if (i >= Days.Count) i = Days.Count - 1;
            return Days[i];
        }

        public int SolOfDate(string isoDateOrTime)
        {
            if (string.IsNullOrEmpty(isoDateOrTime) || isoDateOrTime.Length < 10) return -1;
            string date = isoDateOrTime.Substring(0, 10);
            double days = (Orbit.DateMs(date) - Orbit.DateMs(Day(1).Date)) / 86400000.0;
            return (int)Math.Round(days) + 1;
        }

        public int PeakStormLevel(int sols)
        {
            int p = 0; for (int s = 1; s <= sols; s++) p = Math.Max(p, Day(s).StormLevel); return p;
        }

        /// <summary>
        /// GAME_BIBLE decision 8: a calm live window replays the archived real storm on its peak sols,
        /// labelled ARCHIVED in the game. Never called for archived windows.
        /// </summary>
        public void InjectArchivedStorm(MissionWindow archive, IList<string> dates, int peakSol)
        {
            for (int k = 0; k < dates.Count; k++)
            {
                WeatherDay src = archive.Days.Find(d => d.Date == dates[k]);
                int i = Sol1Index + peakSol - 1 + k;
                if (src == null || i < 0 || i >= Days.Count) continue;
                WeatherDay dst = Days[i];
                dst.Injected = true; dst.RadSource = "measured";
                dst.DoseOutside = src.DoseOutside; dst.DoseCalm = src.DoseCalm; dst.DoseStorm = src.DoseStorm; dst.StormLevel = src.StormLevel;
                dst.RadMeasured = src.RadMeasured; dst.RadMeanRate = src.RadMeanRate; dst.RadMaxRate = src.RadMaxRate; dst.RadMaxTime = src.RadMaxTime; dst.RadDose = src.RadDose;
                dst.RadProfile.Clear(); dst.RadProfile.AddRange(src.RadProfile);
                dst.CmeFastest = src.CmeFastest; dst.CmeFastestStart = src.CmeFastestStart; dst.CmeFastestLink = src.CmeFastestLink; dst.CmeFastestType = src.CmeFastestType;
            }
            StormInjected = true;
        }
    }

    public struct OrbitInfo
    {
        public double DistanceAu, DistanceMillionKm, LightMinutes, SunLightMinutesMars, MarsAheadOfEarthDeg, EarthX, EarthY, MarsX, MarsY;
    }

    /// <summary>
    /// JPL "Approximate Positions of the Planets" (Keplerian elements, valid 1800–2050 AD).
    /// Gives the real Earth–Mars distance for any date, and so the real one-way radio delay.
    /// </summary>
    public static class Orbit
    {
        const double DayMs = 86400000.0;
        const double Deg = Math.PI / 180.0;
        public const double AuKm = 149597870.7;
        public const double LightSecondsPerAu = 499.004784;

        // [value at J2000, change per Julian century]: a (AU), e, I (deg), L (deg), long. of perihelion (deg), long. of ascending node (deg)
        static readonly double[][] Earth = {
            new[] { 1.00000261, 0.00000562 }, new[] { 0.01671123, -0.00004392 }, new[] { -0.00001531, -0.01294668 },
            new[] { 100.46457166, 35999.37244981 }, new[] { 102.93768193, 0.32327364 }, new[] { 0.0, 0.0 } };
        static readonly double[][] Mars = {
            new[] { 1.52371034, 0.00001847 }, new[] { 0.0933941, 0.00007882 }, new[] { 1.84969142, -0.00813131 },
            new[] { -4.55343205, 19140.30268499 }, new[] { -23.94362959, 0.44441088 }, new[] { 49.55953891, -0.29257343 } };

        /// <summary>Milliseconds since 1970-01-01 UTC for "YYYY-MM-DD" or "YYYY-MM-DDTHH:MMZ".</summary>
        public static double DateMs(string iso)
        {
            if (string.IsNullOrEmpty(iso) || iso.Length < 10) return double.NaN;
            int y = int.Parse(iso.Substring(0, 4), CultureInfo.InvariantCulture), mo = int.Parse(iso.Substring(5, 2), CultureInfo.InvariantCulture), d = int.Parse(iso.Substring(8, 2), CultureInfo.InvariantCulture);
            int h = 0, mi = 0;
            if (iso.Length >= 16 && iso[10] == 'T') { h = int.Parse(iso.Substring(11, 2), CultureInfo.InvariantCulture); mi = int.Parse(iso.Substring(14, 2), CultureInfo.InvariantCulture); }
            var t = new DateTime(y, mo, d, h, mi, 0, DateTimeKind.Utc);
            return (t - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }
        public static double NoonMs(string isoDate) { return DateMs(isoDate) + DayMs / 2; }
        public static string IsoDate(double ms) { return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(ms).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture); }
        public static string AddDays(string isoDate, int n) { return IsoDate(DateMs(isoDate) + n * DayMs); }

        static void Helio(double[][] el, double ms, out double x, out double y, out double z)
        {
            double T = (ms / DayMs + 2440587.5 - 2451545.0) / 36525.0;
            double a = el[0][0] + el[0][1] * T, e = el[1][0] + el[1][1] * T, I = (el[2][0] + el[2][1] * T) * Deg;
            double L = el[3][0] + el[3][1] * T, wbar = el[4][0] + el[4][1] * T, Om = el[5][0] + el[5][1] * T;
            double w = (wbar - Om) * Deg, O = Om * Deg;
            double M = (L - wbar) % 360.0;
            if (M > 180) M -= 360; if (M < -180) M += 360;
            M *= Deg;
            double E = M + e * Math.Sin(M);
            for (int i = 0; i < 30; i++)
            {
                double dE = (M - (E - e * Math.Sin(E))) / (1 - e * Math.Cos(E));
                E += dE;
                if (Math.Abs(dE) < 1e-12) break;
            }
            double xp = a * (Math.Cos(E) - e), yp = a * Math.Sqrt(1 - e * e) * Math.Sin(E);
            double cw = Math.Cos(w), sw = Math.Sin(w), cO = Math.Cos(O), sO = Math.Sin(O), cI = Math.Cos(I), sI = Math.Sin(I);
            x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
            y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
            z = sw * sI * xp + cw * sI * yp;
        }

        public static OrbitInfo EarthMars(double ms)
        {
            double ex, ey, ez, mx, my, mz;
            Helio(Earth, ms, out ex, out ey, out ez); Helio(Mars, ms, out mx, out my, out mz);
            double d = Math.Sqrt((mx - ex) * (mx - ex) + (my - ey) * (my - ey) + (mz - ez) * (mz - ez));
            double sep = (Math.Atan2(my, mx) - Math.Atan2(ey, ex)) / Deg;
            sep = ((sep + 540) % 360 + 360) % 360 - 180;
            return new OrbitInfo
            {
                DistanceAu = d, DistanceMillionKm = Math.Round(d * AuKm / 1e6, 1), LightMinutes = Math.Round(d * LightSecondsPerAu / 60.0, 2),
                SunLightMinutesMars = Math.Round(Math.Sqrt(mx * mx + my * my + mz * mz) * LightSecondsPerAu / 60.0, 2),
                MarsAheadOfEarthDeg = Math.Round(sep, 1), EarthX = ex, EarthY = ey, MarsX = mx, MarsY = my
            };
        }
    }
}
