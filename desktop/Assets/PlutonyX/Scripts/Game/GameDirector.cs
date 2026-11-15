// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// GameDirector.cs — the flow of the game: title -> mission (dawn, power board, events, night) -> reveal -> ending.
// All rules live in PlutonyX.Core.Mission; this class only sequences screens and the world behind them.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using PlutonyX.Core;
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class GameDirector : MonoBehaviour
    {
        public GameUI UI;
        public WorldDirector World;
        public AudioDirector Audio;
        public ActorsDirector Actors;
        public ExploreController Explore;
        public const string Version = "1.0.0";

        Design _design;
        string _difficulty = "cadet";
        Mission _mission; MissionWindow _window; bool _live; string _windowDefId; string _badge;

        IEnumerator Start()
        {
            Application.targetFrameRate = 60;
            GameData.Load();
            _design = GameData.Design;
            UI.Audio = Audio; UI.World = World; World.Audio = Audio; if (Actors != null) Actors.Audio = Audio;
            UI.Init(_design);
            _difficulty = PlayerPrefs.GetString("difficulty", "cadet");
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "-autoplay") { UI.Auto = true; if (i + 1 < args.Length) { UI.CaptureDir = args[i + 1]; System.IO.Directory.CreateDirectory(UI.CaptureDir); } }
                if (args[i] == "-difficulty" && i + 1 < args.Length) _difficulty = args[i + 1];
            }
            StartCoroutine(LiveData.Fetch(_design));
            yield return null;
            string capDir; bool capVideo;
            if (CaptureDirector.Wanted(out capDir, out capVideo))
            {
                UI.ShowHud(false); UI.Letterbox(false); UI.Caption("");
                var cap = gameObject.AddComponent<CaptureDirector>(); cap.World = World; cap.Actors = Actors; cap.Explore = Explore;
                yield return cap.Run(capDir, capVideo);
                yield break;
            }
            // give the live NASA request a moment before the title appears (the game never waits long for the network)
            for (float t = 0; t < 5f && !LiveData.Done && !UI.Auto; t += Time.unscaledDeltaTime) yield return null;
            int rounds = 0;
            while (true)
            {
                if (UI.Auto && rounds == 1) { Debug.Log("[PlutonyX] autoplay finished"); Application.Quit(); yield break; }
                yield return TitleScreen();
                rounds++;
            }
        }

        // ------------------------------------------------------------------ title
        IEnumerator TitleScreen()
        {
            World.Track = null; if (Actors != null) Actors.ResetAll();
            World.SetDust(0); World.SetStorm(0); World.SetTime(7.2f, true); World.Shot("title", true);
            UI.ShowHud(false); UI.Letterbox(false);
            JsonValue terrainCaption = JsonValue.Null;
            UI.Caption("This is the real terrain of Jezero Crater, from NASA Mars Reconnaissance Orbiter data.");
            yield return UI.Fade(false);
            bool live; MissionWindow recent = GameData.LoadWindow("live", out live);
            WeatherDay latest = recent.Days[recent.Days.Count - 1];
            string sunNow = "The Sun on " + latest.Date + ": " + (latest.FlareLevel >= 2 ? "storming" : latest.FlareLevel == 1 ? "active" : "calm") +
                            (string.IsNullOrEmpty(latest.FlareMax) ? "" : "  ·  biggest flare " + latest.FlareMax) + "  ·  " + GameData.Badge(recent, live);
            var options = new List<string> { "Play  ·  " + _design.Window("may-2024")["menuTitle"].Str("Mission One"), "Today's real sky", "Replay history", "Explore the outpost",
                                             "Difficulty:  " + _design.Balance["difficulty"][_difficulty]["name"].Str(_difficulty), "Ending gallery", "Mission Science Log", "Credits and data", "Quit" };
            int pick = 0;
            yield return UI.Title(_design.Title, _design.Game["subtitle"].Str(), _design.Game["tagline"].Str(), options, i => pick = i, sunNow, live,
                                  _design.Game["teamCredit"].Str("A PlutonyX game") + "  ·  Desktop Ultra edition v" + Version + "  ·  " + _design.Game["event"].Str() + "\nEsc: settings  ·  read aloud, text size, graphics");
            UI.Caption("");
            switch (pick)
            {
                case 0: yield return PlayMission("may-2024"); break;
                case 1: yield return PlayMission("live"); break;
                case 2: yield return HistoryMenu(); break;
                case 3: yield return ExploreMode(); break;
                case 4: _difficulty = _difficulty == "cadet" ? "commander" : "cadet"; PlayerPrefs.SetString("difficulty", _difficulty); break;
                case 5: yield return Gallery(); break;
                case 6: yield return ScienceLog(); break;
                case 7: yield return Credits(); break;
                case 8: Application.Quit(); break;
            }
        }

        IEnumerator HistoryMenu()
        {
            var ids = new List<string>(); var labels = new List<string>(); var details = new List<string>();
            foreach (JsonValue w in _design.Windows["windows"].Items)
                if (w["role"].Str() == "history") { ids.Add(w["id"].Str()); labels.Add(w["menuTitle"].Str()); details.Add(w["menuBlurb"].Str()); }
            labels.Add("Enter a mission code"); details.Add("Fly the very same mission as a friend: same real sky, same events.");
            labels.Add("Back"); details.Add("");
            int pick = 0;
            yield return UI.Menu("Replay history", labels, details, i => pick = i, "REAL NASA DATA  ·  ARCHIVED", "chip-arch");
            if (pick < ids.Count) yield return PlayMission(ids[pick]);
            else if (pick == ids.Count) yield return PlayCode();
        }

        /// <summary>A mission code is WINDOW-SEED (for example may-2024-1K2J9). It names the real sky and the event deck.</summary>
        IEnumerator PlayCode()
        {
            string code = null;
            yield return UI.Prompt("Enter a mission code", "Type the code from a friend's mission card. It looks like  may-2024-1K2J9.", c => code = c);
            if (code == null) yield break;
            int cut = code.LastIndexOf('-'); uint seed = 0; string found = null;
            if (cut > 0 && Rng.TryFromBase36(code.Substring(cut + 1), out seed))
            {
                string wid = code.Substring(0, cut).Trim().ToLowerInvariant();
                foreach (JsonValue w in _design.Windows["windows"].Items)
                {
                    string id = w["id"].Str(); bool lv; MissionWindow mw = GameData.LoadWindow(id, out lv);
                    if (mw != null && mw.Id != null && mw.Id.ToLowerInvariant() == wid) { found = id; break; }
                }
            }
            if (found == null)
            {
                yield return UI.Info("That code did not work", new[] { "Check the letters and numbers and try again. A code made from \"Today's real sky\" only works while the Sun's last 30 days are the same, so it stops working after a day." }, "Back");
                yield break;
            }
            yield return PlayMission(found, seed, true);
        }

        /// <summary>The three sharpest drops of the mission, read from the per-sol record: where the run turned.</summary>
        static List<string> TurningPoints(Mission m)
        {
            var found = new List<KeyValuePair<double, string>>();
            string[] names = { "Air", "Power", "Food", "Crew health", "Morale" };
            for (int i = 1; i < m.History.Count; i++)
            {
                SolRecord a = m.History[i - 1], b = m.History[i];
                double[] before = { a.Air, a.Power, a.Food, a.Health, a.Morale }, after = { b.Air, b.Power, b.Food, b.Health, b.Morale };
                int worst = -1; double drop = 9.99;
                for (int k = 0; k < 5; k++) if (before[k] - after[k] > drop) { drop = before[k] - after[k]; worst = k; }
                if (worst >= 0)
                    found.Add(new KeyValuePair<double, string>(drop, "Sol " + b.Sol + " (" + b.RealDate + ", sky: " + b.Sky + "): " + names[worst] + " fell from " + N(before[worst]) + " to " + N(after[worst]) +
                              (b.StormLevel > 0 ? ", on a storm sol." : b.Solar < a.Solar - 5 ? ", with less sunlight on the panels." : ".")));
            }
            found.Sort((x, y) => y.Key.CompareTo(x.Key));
            var lines = new List<string>();
            for (int i = 0; i < Math.Min(3, found.Count); i++) lines.Add("Turning point  ·  " + found[i].Value);
            double jump = 0; int jumpSol = 0; double prev = 0;
            foreach (SolRecord r in m.History) { if (r.Dose - prev > jump) { jump = r.Dose - prev; jumpSol = r.Sol; } prev = r.Dose; }
            if (jumpSol > 0 && jump > 0) lines.Add("Biggest dose in one sol  ·  Sol " + jumpSol + ": " + N(jump) + " micrograys reached the crew.");
            return lines;
        }

        // ------------------------------------------------------------------ one mission
        IEnumerator PlayMission(string windowDefId, uint fixedSeed = 0, bool useFixedSeed = false)
        {
            _windowDefId = windowDefId;
            _window = GameData.LoadWindow(windowDefId, out _live);
            _badge = GameData.Badge(_window, _live);
            uint seed = useFixedSeed ? fixedSeed : (uint)(DateTime.UtcNow.Ticks & 0x7FFFFFFF) % 2176782335u;
            _mission = new Mission(_design, _window, _difficulty, seed);
            Mission m = _mission;
            if (_design.Window(windowDefId)["role"].Str() == "history") m.SetFlag("historyMission", true);

            // intro
            yield return UI.Fade(true, 0.5f);
            UI.Letterbox(true); World.SetTime(6.4f, true); World.Shot("flyover", true);
            yield return UI.Fade(false);
            World.Shot("flyover_end");
            var intro = new List<Line>();
            foreach (JsonValue l in _design.Dialogue["intro"].Items) intro.Add(new Line("narrator", l["say"].Str()));
            yield return UI.Say(intro);
            UI.Letterbox(false);

            while (!m.Over)
            {
                // ---- dawn ----
                DawnReport dawn = m.BeginSol();
                World.SetTime(7f); World.SetDust(dawn.Sky == "deepDust" ? 1f : dawn.Sky == "dust" ? 0.7f : dawn.Sky == "haze" ? 0.3f : 0f);
                World.SetStorm(m.Flag("stormDone") && dawn.Day.StormLevel >= 1 ? 0.5f : 0f);
                World.Shot("outpost");
                UI.ShowHud(true); UI.UpdateHud(m, _badge, _live);
                if (Audio != null) Audio.SetDanger(m.Get("air") < 30 || m.Get("power") < 15 || m.Get("health") < 45 ? 0.6f : dawn.Sky == "deepDust" ? 0.35f : 0f);
                var notes = new List<string>(dawn.Notes);
                notes.AddRange(dawn.Because);
                notes.Add("Today's sunlight: " + N(dawn.Solar) + " power points. Heat, lights and computers take " + N(dawn.BaseLoad) + " first.");
                yield return UI.Info("Sol " + m.Sol + " of " + m.MissionSols + "  ·  dawn", notes, "Continue",
                                     dawn.Day.FlareLevel >= 1 || dawn.Day.MarsArrivals.Count > 0 ? "REAL NASA DATA" : null, "chip-real");
                foreach (List<Line> msg in dawn.EarthMessages) { World.Shot("dish"); yield return UI.Say(msg); }
                bool departs = false; foreach (EventView note in dawn.NoteEvents) if (note.Id == "dil_departs") departs = true;
                if (Actors != null) { Actors.CrewToShelter(false); if (!departs) Actors.SetDilAway(m.Flag("dilInField"), !m.Flag("dilInField") && m.Sol > 1); }
                foreach (EventView note in dawn.NoteEvents)
                {
                    if (note.Id == "dil_departs") { World.Shot("garage"); if (Actors != null) Actors.SetDilAway(true, true); }
                    else World.Shot(note.Scene);
                    yield return UI.Say(note.Lines);
                }
                if (dawn.Says.Count > 0) yield return UI.Say(dawn.Says);
                if (m.Sol == 1)
                {
                    var tut = new List<Line>();
                    foreach (JsonValue l in _design.Dialogue["tutorial"].Items) tut.Add(new Line(l["who"].Str("pip"), l["say"].Str()));
                    yield return UI.Say(tut);
                }

                // ---- power board ----
                World.Shot("solar");
                Allocation alloc = m.Alloc;
                yield return UI.PowerBoard(m, a => alloc = a);
                m.SetAllocation(alloc);
                World.SetGrowLights(m.Flag("plantsDead") ? 0f : alloc.Garden / 3f);
                World.SetTime(12.5f);

                // ---- the day's events ----
                for (EventView e = m.NextEvent(); e != null; e = m.NextEvent())
                {
                    World.Shot(e.Scene);
                    if (e.IsCrisis) { World.SetStorm(1f); World.SetTime(17.85f); if (Audio != null && e.StepIndex == 0) Audio.Alarm(); if (Actors != null) Actors.CrewToShelter(true); }
                    float timer = e.IsCrisis && m.Timers ? (float)_design.Balance["storm"]["stepSeconds"].Num(30) : 0f;
                    string choice = null;
                    yield return UI.Event(e, timer, c => choice = c);
                    ChoiceOutcome o = m.Choose(choice);
                    UI.UpdateHud(m, _badge, _live);
                    yield return UI.Say(o.Result);
                    if (!string.IsNullOrEmpty(o.Learn))
                        yield return UI.Info("What is real here?", new[] { o.Learn }, "Got it", o.RealData.Count > 0 ? "REAL NASA DATA" : "REAL SCIENCE", "chip-real");
                }

                // ---- night ----
                World.SetTime(19.3f); World.Shot("night");
                NightReport n = m.EndSol();
                UI.UpdateHud(m, _badge, _live);
                var lines = new List<string>();
                lines.Add(Delta("Air", n, "air") + "     " + Delta("Power", n, "power") + "     " + Delta("Shield", n, "shield"));
                lines.Add(Delta("Plants", n, "plants") + "     " + Delta("Water", n, "water") + "     " + Delta("Food", n, "food") + "     " + Delta("Science", n, "science"));
                if (n.StormLevel >= 1)
                    lines.Add("Radiation outside today: " + N(n.OutsideDoseToday) + " micrograys (a calm day is about " + N(_window.CalmDose) + "). Shelter protection: " +
                              N(Math.Max(0, n.Protection) * 100) + " percent. The crew's badges took " + N(n.CrewDoseToday) + ".");
                if (n.Harvest) lines.Add("The garden is ready to harvest.");
                if (n.CoreSealed) lines.Add("The Leopard Core is sealed in its tube.");
                lines.AddRange(n.Because);
                lines.Add("Supplies: water " + N(m.Get("water")) + ", food " + N(m.Get("food")) + ". Crew health " + N(m.Get("health")) + ", morale " + N(m.Get("morale")) + ".");
                lines.Add("Mission Planner: " + m.RealUnits());
                yield return UI.Info("Sol " + m.Sol + "  ·  night", lines, m.Over ? "Finish the mission" : "Sleep until dawn",
                                     n.StormLevel >= 1 ? "REAL NASA DATA  ·  CURIOSITY RAD" : null, "chip-real");
                if (n.Lines.Count > 0) yield return UI.Say(n.Lines);
            }
            yield return EndingSequence();
        }

        static string N(double v) { return Math.Round(v).ToString("0", CultureInfo.InvariantCulture); }
        static string Delta(string name, NightReport n, string id)
        {
            double d = n.After[id] - n.Before[id];
            return name + " " + N(n.After[id]) + (Math.Abs(d) < 0.5 ? "" : d > 0 ? "  ▲" + N(d) : "  ▼" + N(-d));
        }

        // ------------------------------------------------------------------ reveal and ending
        IEnumerator EndingSequence()
        {
            Mission m = _mission; EndingResult end = m.Ending; JsonValue e = end.Data;
            UI.ShowHud(false);
            yield return UI.Fade(true);
            World.SetStorm(0); World.SetDust(0); World.SetTime(end.Id == "evac" ? 5.6f : 17.7f, true); World.Shot(e["shot"].Str("pad"), true);
            UI.Letterbox(true);
            yield return UI.Fade(false);

            JsonValue def = _design.Window(_windowDefId);
            List<string> reveal = Reveal.Lines(_design, _window, _windowDefId, m.MissionSols);
            if (reveal.Count > 0)
            {
                reveal.Insert(0, _design.Dialogue["reveal"]["lead"].Str());
                yield return UI.Info(_design.Dialogue["reveal"]["title"].Str("It really happened."), reveal, "Continue", "REAL NASA DATA", "chip-real",
                                     _design.Dialogue["reveal"]["footer"].Str());
            }

            var epilogue = new List<Line>();
            foreach (JsonValue l in e["epilogue"].Items) epilogue.Add(new Line("narrator", l.Str()));
            yield return UI.Info(e["title"].Str(end.Id), new[] { e["oneLine"].Str() }, "Continue", e["secret"].Bool() ? "SECRET ENDING" : "ENDING", "chip-arch");
            // every ending brings the crew home: the ascent ship launches while the epilogue is told
            World.Shot("pad_sunset_launch");
            if (Actors != null) { Actors.SetDilAway(false, false); Actors.Launch(); World.Track = Actors.Ship; }
            yield return UI.Say(epilogue);
            World.Track = null;
            JsonValue sci = e["science"];
            if (sci.IsObject) yield return UI.Info(sci["title"].Str("The real science behind your ending"), new[] { sci["text"].Str() }, "Continue", "THE REAL SCIENCE BEHIND YOUR ENDING", "chip-real");
            UI.Letterbox(false);

            // debrief: turning points, dose, one tip
            var debrief = new List<string>();
            debrief.Add("Mission code: " + m.MissionCode + "   (same code = same mission for a friend)");
            debrief.Add("Crew dose badge: " + N(m.Get("dose")) + " micrograys, about " + m.ChestXrays(m.Get("dose")).ToString("0.0", CultureInfo.InvariantCulture) +
                        " chest X-rays. Standing outside the whole time: " + N(m.OutsideDoseTotal) + " micrograys.");
            foreach (LogEntry l in m.Log) debrief.Add("•  " + l.Text);
            PlayerPrefs.SetInt("ending_" + end.Id, 1);
            int seen = 0; foreach (JsonValue en in _design.Endings["endings"].Items) seen += PlayerPrefs.GetInt("ending_" + en["id"].Str(), 0);
            m.V["endingsSeen"] = seen;
            var badges = new List<string>();
            foreach (JsonValue a in m.Achievements()) { badges.Add(a["title"].Str()); PlayerPrefs.SetInt("ach_" + a["id"].Str(), 1); }
            if (badges.Count > 0) debrief.Add("Badges earned: " + string.Join("  ·  ", badges));
            JsonValue whatIf = e["whatIf"];
            if (whatIf.IsString) { debrief.Add(_design.Dialogue["debrief"]["tipTitle"].Str("One tip for next time") + ": " + whatIf.Str()); }
            else foreach (JsonValue w in whatIf.Items) debrief.Add(_design.Dialogue["debrief"]["tipTitle"].Str("One tip") + ": " + w.Str());
            debrief.InsertRange(2, TurningPoints(m));
            yield return UI.Info(_design.Dialogue["debrief"]["title"].Str("Mission debrief"), debrief, "Continue", null, null, _design.Dialogue["debrief"]["tryAgain"].Str(), UI.Graph(m));
            // the mission card: ending, code and a few numbers over the outpost; no personal data
            World.Shot("title");
            var facts = new List<string>
            {
                _design.Balance["difficulty"][_difficulty]["name"].Str(_difficulty) + "  ·  " + m.History.Count + " of " + m.MissionSols + " sols  ·  real sky: " + (m.History.Count > 0 ? m.History[0].RealDate + " to " + m.History[m.History.Count - 1].RealDate : _window.Label),
                "Crew dose " + N(m.Get("dose")) + " micrograys (about " + m.ChestXrays(m.Get("dose")).ToString("0.0", CultureInfo.InvariantCulture) + " chest X-rays)  ·  science " + N(m.Get("science")) + "  ·  badges " + badges.Count,
                _design.Title + "  ·  " + _design.Game["event"].Str()
            };
            yield return UI.MissionCard("Mission card", e["title"].Str(end.Id), m.MissionCode, facts, _badge, _live);
            PlayerPrefs.SetInt("ending_" + end.Id, 1); PlayerPrefs.Save();
            yield return UI.Fade(true, 0.5f);
        }

        // ------------------------------------------------------------------ explore the outpost on foot
        IEnumerator ExploreMode()
        {
            if (Explore == null) yield break;
            float[] hours = { 8.5f, 12.5f, 17.4f, 21f }; int hourIndex = 0;
            World.SetTime(hours[0], true); World.ExternalCamera = true; World.SetGrowLights(0.8f);
            Explore.Begin(); UI.ExploreHud(true); UI.Caption("This is the real terrain of Jezero Crater, from NASA Mars Reconnaissance Orbiter data.");
            yield return null;
            while (true)
            {
                var k = UnityEngine.InputSystem.Keyboard.current; var g = UnityEngine.InputSystem.Gamepad.current;
                if (!UI.Paused && ((k != null && (k.backspaceKey.wasPressedThisFrame || k.tabKey.wasPressedThisFrame)) || (g != null && g.buttonEast.wasPressedThisFrame))) break;
                if ((k != null && k.tKey.wasPressedThisFrame) || (g != null && g.buttonNorth.wasPressedThisFrame)) { hourIndex = (hourIndex + 1) % hours.Length; World.SetTime(hours[hourIndex]); }
                ExploreController.Spot near = Explore.Near;
                string jump = Explore.LastJumpHeight > 0.3f
                    ? "Your last jump: " + Explore.LastJumpHeight.ToString("0.0", CultureInfo.InvariantCulture) + " m. The same push on Earth: " +
                      (Explore.LastJumpHeight * ExploreController.MarsGravity / ExploreController.EarthGravity).ToString("0.0", CultureInfo.InvariantCulture) + " m. Mars gravity is 3.73 m/s², 38% of Earth's."
                    : "Try a jump. Mars pulls on you with only 38% of Earth's gravity.";
                UI.ExploreInfo(near != null ? near.Title : "Lakeshore Outpost  ·  " + World.CurrentHour, near != null ? near.Text : jump,
                               "Move: WASD / left stick   ·   Run: Shift / RT   ·   Jump: Space / A   ·   Look: Q E, right mouse or right stick   ·   Time of day: T / Y   ·   Back: Tab / B");
                yield return null;
            }
            Explore.End(); UI.ExploreHud(false); World.ExternalCamera = false; UI.Caption("");
        }

        IEnumerator Gallery()
        {
            var p = new List<string>(); int found = 0, total = 0;
            foreach (JsonValue e in _design.Endings["endings"].Items)
            {
                total++;
                bool got = PlayerPrefs.GetInt("ending_" + e["id"].Str(), 0) == 1; if (got) found++;
                p.Add(got ? "★  " + e["title"].Str() + "  —  " + e["oneLine"].Str() : "☐  " + (e["secret"].Bool() ? "A secret ending" : "Locked") + "  —  " + e["lockedHint"].Str());
            }
            yield return UI.Info("Ending gallery  ·  " + found + " of " + total, p, "Back", null, null, "Every ending comes from the whole mission, not from one button.");
        }

        // ------------------------------------------------------------------ science log and credits
        IEnumerator ScienceLog()
        {
            var p = new List<string>
            {
                "Space weather: NASA DONKI (Community Coordinated Modeling Center). Real solar flares, real clouds of solar gas (CMEs), and NASA's WSA-ENLIL model predictions of when they reach Mars. One sol in the game is one real day of that record.",
                "Radiation: NASA RadLab (Open Science Data Repository), instrument MSL-RAD-Surface. This is the dose rate the Curiosity rover really measured on the surface of Mars. The game uses each day's real dose. When no rover measurement exists (live missions), the dose is an estimate and is labelled as one.",
                "Radio delay: computed for the mission date from the JPL approximate positions of Earth and Mars.",
                "Terrain: NASA Mars Reconnaissance Orbiter Context Camera elevation (20 m per pixel) and image mosaic (6 m per pixel) of Jezero Crater, prepared by the USGS Astrogeology Science Center for the Mars 2020 mission. Heights are real and true to scale. The colour is an artistic tint: the camera sees in grey.",
                "Simplified for the game: the Storm Shield is future technology, not real flight hardware. Dust storms, breakdowns, the crew and the outpost are fiction based on real Mars facts. Dose badge limits are scaled to a 10-sol mission; real limits cover a whole career.",
                "Curiosity is in Gale Crater, about 3,700 km from Jezero. A solar storm bathes the whole planet, so the game uses Curiosity's readings for our outpost."
            };
            yield return UI.Info("Mission Science Log", p, "Back", "WHICH NASA DATA WE USED AND WHY", "chip-real", _design.Game["disclaimers"]["noEndorsement"].Str());
        }

        IEnumerator Credits()
        {
            var p = new List<string>
            {
                _design.Game["teamCredit"].Str("A PlutonyX game") + " for the " + _design.Game["event"].Str() + ". Challenge: " + _design.Game["challenge"].Str() + ".",
                "Data: NASA DONKI (CCMC, Goddard Space Flight Center) · NASA RadLab / OSDR (MSL RAD: NASA/JPL-Caltech/SwRI) · JPL Solar System Dynamics · NASA/JPL-Caltech/MSSS and USGS Astrogeology (Jezero CTX elevation and imagery).",
                "Ground textures and scanned rocks: Poly Haven (CC0; Earth rocks, tinted). The outpost, rover, ascent ship and crew are original models generated in code (SI-assisted); they are not real NASA hardware. Engine: Unity 6 with the High Definition Render Pipeline. All sound and music is synthesised in code (SI-assisted); there are no recorded voices. Read aloud (optional, in the Esc menu) uses your computer's own built-in speech voice.",
                _design.Game["disclaimers"]["si"].Str(),
                _design.Game["disclaimers"]["data"].Str(),
                _design.Game["disclaimers"]["noEndorsement"].Str(),
                "Play the Web edition: " + _design.Game["links"]["web"].Str()
            };
            yield return UI.Info("Credits and data", p, "Back");
        }
    }
}
