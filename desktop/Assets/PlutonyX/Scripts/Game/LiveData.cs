// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// LiveData.cs — LIVE mode: fetches the last 30 days of real solar flares and CMEs from NASA DONKI at start-up.
// If the request fails or times out, the game silently falls back to the bundled archive and says ARCHIVED.
using System;
using System.Collections;
using System.Globalization;
using PlutonyX.Core;
using UnityEngine;
using UnityEngine.Networking;

namespace PlutonyX.Game
{
    public static class LiveData
    {
        public static MissionWindow Window;          // null until a live fetch has succeeded
        public static bool Done;
        const string Api = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{0}?startDate={1}&endDate={2}";

        public static IEnumerator Fetch(Design design)
        {
            DateTime now = DateTime.UtcNow;
            string end = now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), start = now.AddDays(-30).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            JsonValue flr = JsonValue.Null, cme = JsonValue.Null;
            foreach (string type in new[] { "FLR", "CME" })
            {
                using (UnityWebRequest req = UnityWebRequest.Get(string.Format(Api, type, start, end)))
                {
                    req.timeout = 12;
                    yield return req.SendWebRequest();
                    if (req.result != UnityWebRequest.Result.Success) { Debug.Log("[PlutonyX] live DONKI " + type + " failed: " + req.error + " (using the archive)"); Done = true; yield break; }
                    try { JsonValue j = JsonValue.Parse(string.IsNullOrEmpty(req.downloadHandler.text) ? "[]" : req.downloadHandler.text); if (type == "FLR") flr = j; else cme = j; }
                    catch (Exception e) { Debug.Log("[PlutonyX] live DONKI " + type + " unreadable: " + e.Message); Done = true; yield break; }
                }
            }
            try
            {
                Window = LiveWindow.Build(flr, cme, start, end, design.Balance["spaceWeather"], now.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) + " UTC",
                                          design.MissionSols, design.Balance["spaceWeather"]["peakSol"].Int(8));
                Debug.Log("[PlutonyX] live DONKI ok: " + flr.Count + " flares, " + cme.Count + " CMEs, " + start + " to " + end);
            }
            catch (Exception e) { Debug.Log("[PlutonyX] live window build failed: " + e.Message); Window = null; }
            Done = true;
        }
    }
}
