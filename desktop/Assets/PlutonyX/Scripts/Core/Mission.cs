// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Mission.cs — the simulation: one mission of the shared design, as plain C# (no UnityEngine).
// Rules: shared/GAME_BIBLE.md section 15 and shared/design/SCHEMA.md. Every number comes from
// shared/design/balance.json; if this code and that file disagree, the file wins.
// One sol:  BeginSol()  ->  [NextEvent() / Choose()]*  with SetAllocation() any time before  ->  EndSol()
using System;
using System.Collections.Generic;
using System.Globalization;

namespace PlutonyX.Core
{
    public sealed class Mission
    {
        public readonly Design Design;
        public readonly MissionWindow Window;
        public readonly string DifficultyId;
        public readonly uint Seed;
        public readonly int MissionSols;

        // ---- state (SCHEMA.md section 1) ----
        public int Sol;
        public readonly Dictionary<string, double> V = new Dictionary<string, double>();
        public readonly Dictionary<string, bool> Flags = new Dictionary<string, bool>();
        public Allocation Alloc = new Allocation();
        public readonly List<Mod> Mods = new List<Mod>();
        public readonly List<PendingEffect> Pending = new List<PendingEffect>();
        public readonly List<InboxMessage> Inbox = new List<InboxMessage>();
        public readonly List<LogEntry> Log = new List<LogEntry>();
        public readonly List<SolRecord> History = new List<SolRecord>();
        public bool Over;
        public EndingResult Ending;

        // ---- setup results ----
        public int DustStartSol, DustLengthSols;
        readonly List<string> _deckOrder = new List<string>();

        // ---- per-sol working data ----
        readonly Rng _rng;
        readonly JsonValue _b, _diff;
        readonly HashSet<string> _used = new HashSet<string>();
        readonly List<JsonValue> _queue = new List<JsonValue>();     // today's choice events, in order
        int _stepIndex;                                              // inside the storm crisis
        readonly List<Line> _says = new List<Line>();
        WeatherDay _day;
        string _sky = "clear";
        int _blackoutSols, _lowAirSols, _lastStormLevel, _choiceEventsToday;
        bool _stormToday, _dilRecalledToday, _dilCliffToday, _cloudDipSaid, _sunspotSaid;
        string _dilTrustLine;
        double _outsideTotal;
        static readonly string[] Meters = { "air", "power", "shield", "water", "food", "plants", "science", "health", "morale" };
        static readonly string[] Systems = { "life", "garden", "shield", "rover" };

        public Mission(Design design, MissionWindow window, string difficultyId, uint seed)
        {
            Design = design; Window = window; DifficultyId = difficultyId; Seed = seed;
            _b = design.Balance; _diff = design.Difficulty(difficultyId);
            MissionSols = _b["missionSols"].Int(10);
            _rng = new Rng(seed);

            JsonValue start = _diff["start"];
            foreach (string k in start.Keys) V[k] = start[k].Num();
            foreach (string k in new[] { "dose", "doseDil", "risk", "harvests", "fragments", "forecastsShown", "earthAsks" }) if (!V.ContainsKey(k)) V[k] = 0;
            JsonValue da = _diff["defaultAlloc"];
            Alloc = new Allocation(da["life"].Int(2), da["garden"].Int(2), da["shield"].Int(0), da["rover"].Int(2));

            // PRNG order (SCHEMA section 6): dust start, dust length, then the deck shuffle.
            JsonValue dust = _b["dust"];
            DustStartSol = dust["startSol"][_rng.Int(Math.Max(1, dust["startSol"].Count))].Int(4);
            DustLengthSols = dust["lengthSols"][_rng.Int(Math.Max(1, dust["lengthSols"].Count))].Int(2);
            var pool = new List<JsonValue>();
            foreach (JsonValue e in design.Events["events"].Items) if (e["kind"].Str() == "deck") pool.Add(e);
            while (pool.Count > 0)
            {
                double total = 0; foreach (JsonValue e in pool) total += e["weight"].Num(1);
                double roll = _rng.Next() * total; int pick = pool.Count - 1;
                for (int i = 0; i < pool.Count; i++) { roll -= pool[i]["weight"].Num(1); if (roll < 0) { pick = i; break; } }
                _deckOrder.Add(pool[pick]["id"].Str()); pool.RemoveAt(pick);
            }
        }

        // ================================================================== accessors
        public double Get(string name)
        {
            switch (name)
            {
                case "sol": return Sol;
                case "gardenTier": return GardenTier;
                case "crewFit": return CrewFit ? 1 : 0;
                case "highRisk": return HighRisk ? 1 : 0;
                case "decoded": return Decoded ? 1 : 0;
            }
            double v; return V.TryGetValue(name, out v) ? v : 0;
        }
        public bool Flag(string name) { bool f; return Flags.TryGetValue(name, out f) && f; }
        public void SetFlag(string name, bool value) { Flags[name] = value; }
        public WeatherDay Today { get { return _day; } }
        public string Sky { get { return _sky; } }
        public string MissionCode { get { return Window.Id + "-" + Rng.ToBase36(Seed); } }
        public bool Hints { get { return _diff["hints"].Bool(); } }
        public bool Timers { get { return _diff["timers"].Bool(); } }
        public double DoseAmber { get { return _diff["dose"]["amber"].Num(1300); } }
        public double DoseRed { get { return _diff["dose"]["red"].Num(1700); } }
        public int CellPoints { get { return _b["cell"]["points"].Int(10); } }

        public int GardenTier { get { return Flag("plantsDead") ? 0 : Get("plants") >= _b["endings"]["gardenThrivingPlants"].Num(75) ? 2 : 1; } }
        public bool CrewFit
        {
            get
            {
                return Get("health") >= _b["endings"]["crewFitHealth"].Num(40) && !Flag("crewGrounded") && !Flag("dilGrounded")
                       && !Flag("crewSentHome") && !Flag("dilSentHome");
            }
        }
        public bool HighRisk { get { return Get("risk") >= _b["endings"]["highRiskCount"].Num(3) || Flag("shieldFailed"); } }
        public bool Decoded { get { return Get("fragments") >= _b["endings"]["decodedFragments"].Num(3); } }

        void Add(string name, double delta) { V[name] = Get(name) + delta; Normalize(); }
        void Normalize()
        {
            foreach (string m in Meters) { double v = Get(m); V[m] = v < 0 ? 0 : v > 100 ? 100 : v; }
            if (Get("fragments") > 3) V["fragments"] = 3;
            if (!Flag("plantsDead") && Get("plants") <= 0 && Sol > 0) PlantsDie();
            if (Flag("plantsDead")) V["plants"] = 0;
        }
        void PlantsDie()
        {
            Flags["plantsDead"] = true; V["plants"] = 0;
            V["morale"] = Math.Max(0, Get("morale") + _b["morale"]["plantsDied"].Num(-15));
            Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": the garden died." });
        }

        double ModSum(string target) { double s = 0; foreach (Mod m in Mods) if (m.Target == target) s += m.Add; return s; }

        // ================================================================== sky and power
        string SkyFor(int sol)
        {
            JsonValue dust = _b["dust"];
            int end = DustStartSol + DustLengthSols;
            if (sol >= DustStartSol && sol < end)
            {
                JsonValue profile = dust[DustLengthSols <= 2 ? "profile2" : "profile3"];
                return profile[sol - DustStartSol].Str("dust");
            }
            if (sol >= end && sol < end + dust["afterHazeSols"].Int(1)) return "haze";
            return "clear";
        }
        public double SolarToday { get { return Math.Max(0, _diff["solar"][_sky].Num(90) + ModSum("solar")); } }
        public double BaseLoadToday { get { return Math.Max(0, _diff["baseLoad"].Num(20) + ModSum("baseLoad")); } }
        public double Cost(Allocation a)
        {
            double c = 0;
            foreach (string s in Systems) c += _b["systems"][s]["cost"][a.Get(s)].Num(a.Get(s) * 10);
            return c;
        }
        /// <summary>Power cells left over tonight for this split (may be negative = not allowed).</summary>
        public double PowerAfter(Allocation a) { return Get("power") + SolarToday - BaseLoadToday - Cost(a); }
        public bool CanAfford(Allocation a) { return PowerAfter(a) >= 0; }

        public void SetAllocation(Allocation a)
        {
            Alloc = a.Clone();
        }

        /// <summary>What tonight will do to each value with this split, before events and storms. For the arrows on the power board.</summary>
        public Dictionary<string, double> Preview(Allocation a)
        {
            var d = new Dictionary<string, double>();
            JsonValue sys = _b["systems"];
            d["power"] = Math.Min(100, Math.Max(0, PowerAfter(a))) - Get("power");
            d["air"] = sys["life"]["air"][a.Life].Num() + (Get("plants") >= sys["garden"]["airBonusNeedsPlants"].Num(60) ? sys["garden"]["airBonus"][a.Garden].Num() : 0) + ModSum("airDrift");
            d["plants"] = Flag("plantsDead") ? 0 : PlantsDelta(a.Garden);
            d["shield"] = sys["shield"]["shield"][a.Shield].Num() + ModSum("shieldRate");
            d["science"] = ScienceBlocked ? 0 : Math.Max(0, sys["rover"]["science"][a.Rover].Num() + (a.Rover > 0 ? ModSum("scienceRate") : 0));
            d["water"] = sys["garden"]["water"][a.Garden].Num() + _b["supplies"]["waterPerSol"].Num() + ModSum("waterDrift");
            d["food"] = _b["supplies"]["foodPerSol"].Num();
            return d;
        }
        double PlantsDelta(int gardenLevel)
        {
            double dp = _b["systems"]["garden"]["plants"][gardenLevel].Num() + ModSum("plantsDrift");
            if (dp > 0 && Get("water") < _b["supplies"]["lowWaterThreshold"].Num(20)) dp *= _b["supplies"]["lowWaterPlantsFactor"].Num(0.5);
            return dp;
        }
        bool ScienceBlocked { get { return Flag("sampleSecured") || Flag("sampleLost") || Flag("coreSealed") || Flag("dilGrounded") || Flag("dilSentHome"); } }

        // ================================================================== conditions
        public bool Test(JsonValue c)
        {
            if (c.IsNull) return true;
            if (c.Has("all")) { foreach (JsonValue x in c["all"].Items) if (!Test(x)) return false; return true; }
            if (c.Has("any")) { foreach (JsonValue x in c["any"].Items) if (Test(x)) return true; return false; }
            if (c.Has("not")) return !Test(c["not"]);
            if (c.Has("flag")) return Flag(c["flag"].Str()) == (c.Has("is") ? c["is"].Bool() : true);
            if (c.Has("mode")) { string m = c["mode"].Str(); return m == DifficultyId || (m == "cadet" && Hints); }
            if (c.Has("sol")) return Compare(Sol, c["sol"]);
            if (c.Has("sw")) return Compare(_day != null ? _day.Field(c["sw"].Str()) : 0, c);
            if (c.Has("v")) return Compare(Get(c["v"].Str()), c);
            return true;
        }
        static bool Compare(double value, JsonValue ops)
        {
            if (ops.Has("gte") && !(value >= ops["gte"].Num())) return false;
            if (ops.Has("gt") && !(value > ops["gt"].Num())) return false;
            if (ops.Has("lte") && !(value <= ops["lte"].Num())) return false;
            if (ops.Has("lt") && !(value < ops["lt"].Num())) return false;
            if (ops.Has("eq") && !(Math.Abs(value - ops["eq"].Num()) < 1e-9)) return false;
            return true;
        }

        // ================================================================== effects
        public void Apply(JsonValue effects)
        {
            foreach (JsonValue e in effects.Items)
            {
                if (e.Has("v"))
                {
                    string name = e["v"].Str();
                    if (e.Has("set")) V[name] = e["set"].Num(); else V[name] = Get(name) + e["add"].Num();
                    Normalize();
                }
                else if (e.Has("flag")) Flags[e["flag"].Str()] = e.Has("set") ? e["set"].Bool() : true;
                else if (e.Has("after")) Pending.Add(new PendingEffect { Sol = Sol + e["after"].Int(1), Effects = e["do"], Because = e["because"].Str(null) });
                else if (e.Has("chance")) Apply(_rng.Next() < e["chance"].Num() ? e["do"] : e["else"]);
                else if (e.Has("mod"))
                {
                    string id = e["id"].Str(e["mod"].Str());
                    Mods.RemoveAll(m => m.Id == id);
                    Mods.Add(new Mod { Id = id, Target = e["mod"].Str(), Add = e["add"].Num(), SolsLeft = e["sols"].Int(1) });
                }
                else if (e.Has("clearMod")) { string id = e["clearMod"].Str(); Mods.RemoveAll(m => m.Id == id); }
                else if (e.Has("msg")) Inbox.Add(new InboxMessage { Sol = Sol + e["after"].Int(1), Key = e["msg"].Str() });
                else if (e.Has("log")) Log.Add(new LogEntry { Sol = Sol, Kind = e["kind"].Str("turn"), Text = Fill(e["log"].Str()) });
                else if (e.Has("say")) _says.Add(new Line(e["say"].Str(), Fill(e["text"].Str())));
                else if (e.Has("end")) { if (e["end"].Str() == "evac") Flags["evac"] = true; Over = true; _forcedEnding = e["end"].Str(); }
                else if (e.Has("if")) Apply(Test(e["if"]) ? e["do"] : e["else"]);
            }
        }
        string _forcedEnding;

        // ================================================================== text tokens
        public string Fill(string text)
        {
            if (string.IsNullOrEmpty(text) || text.IndexOf('{') < 0) return text;
            WeatherDay d = _day ?? Window.Day(Math.Max(1, Sol));
            int level = d.StormLevel;
            MarsArrival fc = d.BestForecast();
            text = text.Replace("{sol}", Sol.ToString(CultureInfo.InvariantCulture))
                       .Replace("{shield}", Whole(Get("shield")))
                       .Replace("{need}", Whole(_b["radiation"]["shieldRequired"][level].Num()))
                       .Replace("{flareMax}", string.IsNullOrEmpty(d.FlareMax) ? "C or smaller" : d.FlareMax)
                       .Replace("{realDate}", d.Date)
                       .Replace("{delayMin}", Whole(d.LightMinutes))
                       .Replace("{roundTripMin}", Whole(d.LightMinutes * 2))
                       .Replace("{doseToday}", Whole(d.DoseOutside))
                       .Replace("{calmDose}", Whole(Window.CalmDose))
                       .Replace("{ratio}", OneDecimal(Window.CalmDose > 0 ? d.DoseOutside / Window.CalmDose : 1))
                       .Replace("{kp}", Whole(d.KpMax));
            if (fc != null)
            {
                text = text.Replace("{fcSol}", Window.SolOfDate(fc.Arrival).ToString(CultureInfo.InvariantCulture))
                           .Replace("{fcSpeed}", Whole(fc.CmeSpeed))
                           .Replace("{fcKind}", fc.Glancing ? "a glancing blow" : "a direct hit");
            }
            return text;
        }
        static string Whole(double v) { return Math.Round(v).ToString("0", CultureInfo.InvariantCulture); }
        static string OneDecimal(double v) { return v.ToString("0.0", CultureInfo.InvariantCulture); }
        List<Line> Lines(JsonValue list)
        {
            var r = new List<Line>();
            foreach (JsonValue l in list.Items) r.Add(new Line(l["who"].Str("pip"), Fill(l["say"].Str())));
            return r;
        }
        string Dawn(string key) { return Fill(Design.Dialogue["dawn"][key].Str()); }
        string Because(string key) { return Fill(Design.Dialogue["because"][key].Str()); }

        // ================================================================== dawn
        public DawnReport BeginSol()
        {
            if (Over) throw new InvalidOperationException("mission is over");
            Sol += 1; _stormToday = false; _dilRecalledToday = false; _dilCliffToday = false; _dilTrustLine = null;
            _queue.Clear(); _stepIndex = 0; _says.Clear();
            _day = Window.Day(Sol);
            string prevSky = _sky; _sky = SkyFor(Sol);
            var rep = new DawnReport { Sol = Sol, RealDate = _day.Date, Sky = _sky, Day = _day, DelayMinutes = _day.LightMinutes };

            // dust scenario flags
            Flags["dustStartsToday"] = Sol == DustStartSol;
            bool storming = _sky == "dust" || _sky == "deepDust";
            Flags["dustStorm"] = storming;
            if (!storming && (prevSky == "dust" || prevSky == "deepDust"))
            {
                rep.Notes.Add(Dawn("dustEnds"));
                if (!Flag("panelsCovered"))
                {
                    Flags["panelsDusty"] = true;
                    Mods.RemoveAll(m => m.Id == "dustyPanels");
                    Mods.Add(new Mod { Id = "dustyPanels", Target = "solar", Add = _b["dust"]["dustyPanelsPenalty"].Num(-10), SolsLeft = 99 });
                }
            }

            // Dil comes home with a sealed core
            if (Flag("coreSealed") && Flag("dilInField"))
            {
                Flags["dilInField"] = false; Flags["dilReturned"] = true; Flags["sampleSecured"] = true;
                rep.Notes.Add(Dawn("dilHome"));
                Log.Add(new LogEntry { Sol = Sol, Kind = "turn", Text = "Sol " + Sol + ": Dil came home with the Leopard Core." });
            }

            // delayed consequences
            for (int i = 0; i < Pending.Count;)
            {
                if (Pending[i].Sol <= Sol)
                {
                    PendingEffect p = Pending[i]; Pending.RemoveAt(i);
                    Apply(p.Effects);
                    if (!string.IsNullOrEmpty(p.Because))
                    {
                        string line = Design.Dialogue["because"].Has(p.Because) ? Because(p.Because) : Fill(p.Because);
                        rep.Because.Add(line);
                    }
                }
                else i++;
            }
            // messages from Earth
            for (int i = 0; i < Inbox.Count;)
            {
                if (Inbox[i].Sol <= Sol)
                {
                    JsonValue msg = Design.Dialogue["earth"][Inbox[i].Key];
                    if (msg.IsNull) msg = Design.Dialogue["earth"]["earth.generic"];
                    rep.EarthMessages.Add(Lines(msg));
                    Inbox.RemoveAt(i);
                }
                else i++;
            }

            // what the sky and the Sun are doing (all from the real record)
            rep.SkyText = Dawn(_sky);
            rep.Notes.Insert(0, rep.SkyText);
            if (Flag("panelsDusty") && _sky == "clear") rep.Notes.Add(Dawn("panelsDusty"));
            if (_day.FlareLevel >= 1) rep.Notes.Add(Dawn("flare" + _day.FlareLevel));
            if (_day.RadioNoise >= 1) rep.Notes.Add(Dawn("radio" + _day.RadioNoise));
            if (_day.KpMax >= _b["spaceWeather"]["kpRadioNoise"].Num(7)) rep.Notes.Add(Dawn("earthAurora"));
            if (_day.MarsArrivals.Count > 0 && _day.StormLevel == 0)
            {
                rep.Notes.Add(Dawn("cloudArrives"));
                if (!_cloudDipSaid && Sol >= 3 && _day.DoseOutside < Window.CalmDose * 0.95) { _cloudDipSaid = true; rep.Notes.Add(Dawn("cloudDip")); }
            }
            if (Flag("stormDone") && _day.StormLevel >= 1) rep.Notes.Add(Dawn("stormContinues"));
            if (Flag("stormDone") && _day.StormLevel == 0 && _lastStormLevel >= 1) rep.Notes.Add(Dawn("stormOver"));
            if (!_sunspotSaid && !Flag("stormDone") && Sol < MissionSols && Window.Day(Sol + 1).StormLevel >= 2 && _day.StormLevel == 0)
            { _sunspotSaid = true; rep.Notes.Add(Dawn("sunspot")); }
            if (Flag("dilInField")) rep.Notes.Add(Dawn("dilAway"));
            if (Flag("plantsDead")) rep.Notes.Add(Dawn("plantsDead"));
            else if (Get("plants") < 25) rep.Notes.Add(Dawn("plantsLow"));
            _lastStormLevel = _day.StormLevel;

            SelectEvents(rep);
            rep.Solar = SolarToday; rep.BaseLoad = BaseLoadToday;
            rep.Says.AddRange(_says); _says.Clear();
            rep.ChoiceEventCount = _queue.Count;
            // keep yesterday's split if it is still affordable, else step systems down (rover, shield, garden, life)
            Alloc = Affordable(Alloc);
            return rep;
        }

        public Allocation Affordable(Allocation want)
        {
            Allocation a = want.Clone();
            string[] order = { "rover", "shield", "garden", "life" };
            int guard = 0;
            while (!CanAfford(a) && guard++ < 20)
            {
                bool lowered = false;
                foreach (string s in order) if (a.Get(s) > 0) { a.Set(s, a.Get(s) - 1); lowered = true; break; }
                if (!lowered) break;
            }
            return a;
        }

        // ---- event selection (SCHEMA section 4) ----
        void SelectEvents(DawnReport rep)
        {
            var eligible = new List<JsonValue>();
            foreach (JsonValue e in Design.Events["events"].Items)
            {
                string kind = e["kind"].Str(), id = e["id"].Str();
                if (kind == "deck") continue;
                if (kind != "auto" && _used.Contains(id)) continue;
                if (e["sol"].IsNumber && e["sol"].Int() != Sol) continue;
                if (!Test(e["when"])) continue;
                eligible.Add(e);
            }
            // highest priority first; file order breaks ties (stable insertion sort)
            for (int i = 1; i < eligible.Count; i++)
            {
                JsonValue x = eligible[i]; int j = i - 1;
                while (j >= 0 && eligible[j]["priority"].Num(50) < x["priority"].Num(50)) { eligible[j + 1] = eligible[j]; j--; }
                eligible[j + 1] = x;
            }
            int max = Design.Events["maxChoiceEventsPerSol"].Int(2);
            bool exclusive = false;
            foreach (JsonValue e in eligible)
            {
                bool isNote = e["note"].Bool() || (e["choices"].Count == 0 && e["steps"].Count == 0);
                if (isNote)
                {
                    _used.Add(e["id"].Str());
                    Apply(e["effects"]);
                    rep.NoteEvents.Add(View(e, null, 0, 0));
                    continue;
                }
                if (exclusive || _queue.Count >= max) continue;
                if (e["exclusive"].Bool()) { _queue.Clear(); _queue.Add(e); exclusive = true; continue; }
                _queue.Add(e);
            }
            if (!exclusive && _queue.Count < max)
            {
                foreach (string id in _deckOrder)
                {
                    if (_used.Contains(id)) continue;
                    JsonValue e = FindEvent(id);
                    if (!Test(e["when"])) continue;
                    _queue.Add(e); break;
                }
            }
            _choiceEventsToday = _queue.Count;
        }
        JsonValue FindEvent(string id)
        {
            foreach (JsonValue e in Design.Events["events"].Items) if (e["id"].Str() == id) return e;
            return JsonValue.Null;
        }

        // ================================================================== events and choices
        /// <summary>The next thing the Commander must decide today, or null when the day's events are done.</summary>
        public EventView NextEvent()
        {
            while (_queue.Count > 0)
            {
                JsonValue e = _queue[0];
                if (e["kind"].Str() != "crisis") return View(e, null, 0, 0);
                JsonValue steps = e["steps"];
                while (_stepIndex < steps.Count && !Test(steps[_stepIndex]["when"])) _stepIndex++;
                if (_stepIndex < steps.Count) return View(e, steps[_stepIndex], _stepIndex, steps.Count);
                FinishCrisis(e);
            }
            return null;
        }
        public int EventsLeft { get { return _queue.Count; } }

        void FinishCrisis(JsonValue e)
        {
            _used.Add(e["id"].Str()); _queue.RemoveAt(0); _stepIndex = 0; _stormToday = true;
        }

        EventView View(JsonValue e, JsonValue step, int stepIndex, int stepCount)
        {
            var v = new EventView { Id = e["id"].Str(), Kind = e["kind"].Str(), Scene = e["scene"].Str("outpost"), IsCrisis = e["kind"].Str() == "crisis" };
            JsonValue src = step ?? e;
            v.Title = step != null ? step["title"].Str(e["title"].Str()) : e["title"].Str();
            v.StepId = step != null ? step["id"].Str() : null; v.StepIndex = stepIndex; v.StepCount = stepCount;
            v.DefaultChoice = src["defaultChoice"].Str(null);
            if (step != null && stepIndex == FirstStep(e)) v.Lines.AddRange(Lines(e["intro"]));
            v.Lines.AddRange(Lines(src["lines"]));
            v.Learn = Fill((step != null && step.Has("learn") ? step["learn"] : e["learn"]).Str(null));
            foreach (JsonValue r in e["realData"].Items) v.RealData.Add(r.Str());
            foreach (JsonValue r in e["sources"].Items) v.Sources.Add(r.Str());
            v.IsNote = e["note"].Bool() || (src["choices"].Count == 0 && step == null && e["steps"].Count == 0);
            foreach (JsonValue c in src["choices"].Items)
            {
                var cv = new ChoiceView { Id = c["id"].Str(), Label = Fill(c["label"].Str()), Detail = Fill(c["detail"].Str()), AskEarth = c["askEarth"].Bool(), Risk = c["risk"].Int() };
                if (Hints && c.Has("hint")) cv.Hint = Fill(c["hint"].Str());
                if (c.Has("needs") && !Test(c["needs"])) { cv.Enabled = false; cv.NeedsText = Fill(c["needsText"].Str("Not possible right now")); }
                if (cv.Enabled && cv.AskEarth && Get("power") < CellPoints) { cv.Enabled = false; cv.NeedsText = "Needs 1 power cell for the dish"; }
                v.Choices.Add(cv);
            }
            return v;
        }
        int FirstStep(JsonValue e)
        {
            JsonValue steps = e["steps"];
            for (int i = 0; i < steps.Count; i++) if (Test(steps[i]["when"])) return i;
            return 0;
        }

        public ChoiceOutcome Choose(string choiceId)
        {
            if (_queue.Count == 0) throw new InvalidOperationException("no event is waiting for a choice");
            JsonValue e = _queue[0];
            bool crisis = e["kind"].Str() == "crisis";
            JsonValue src = crisis ? e["steps"][_stepIndex] : e;
            JsonValue choice = JsonValue.Null;
            foreach (JsonValue c in src["choices"].Items) if (c["id"].Str() == choiceId) { choice = c; break; }
            if (choice.IsNull) throw new ArgumentException("event " + e["id"].Str() + " has no choice " + choiceId);
            if (choice.Has("needs") && !Test(choice["needs"])) throw new InvalidOperationException("choice " + choiceId + " is not available");

            var o = new ChoiceOutcome { EventId = e["id"].Str(), ChoiceId = choiceId };
            if (choice["askEarth"].Bool()) { Add("power", -CellPoints); V["earthAsks"] = Get("earthAsks") + 1; }
            if (choice["risk"].Int() != 0) V["risk"] = Get("risk") + choice["risk"].Int();
            Apply(choice["effects"]);
            o.Result.AddRange(Lines(choice["result"]));

            // the storm scene's special outcomes
            if (crisis && src["id"].Str() == "dil")
            {
                if (Flag("dilTrusted") && !_dilRecalledToday && !_dilCliffToday)
                {
                    bool shelter = _rng.Next() < _b["storm"]["trustShelterChance"].Num(0.6);
                    if (shelter) { Flags["dilCliff"] = true; _dilTrustLine = "dil.trust.shelter"; }
                    else { Flags["dilRecalled"] = true; _dilTrustLine = "dil.trust.run"; }
                }
                if (Flag("dilRecalled")) _dilRecalledToday = true;
                if (Flag("dilCliff")) _dilCliffToday = true;
            }

            o.Result.AddRange(_says); _says.Clear();
            o.Learn = Fill((crisis && src.Has("learn") ? src["learn"] : e["learn"]).Str(null));
            foreach (JsonValue r in e["realData"].Items) o.RealData.Add(r.Str());

            if (crisis) { _stepIndex++; NextEvent(); }     // NextEvent() closes the crisis after its last step
            else
            {
                _used.Add(e["id"].Str()); _queue.RemoveAt(0);
                if (e["id"].Str() == "harvest") Flags["harvestToday"] = false;
            }
            return o;
        }

        // ================================================================== night
        public NightReport EndSol()
        {
            if (_queue.Count > 0) throw new InvalidOperationException("answer today's events first");
            var rep = new NightReport { Sol = Sol };
            foreach (string m in Meters) rep.Before[m] = Get(m);
            rep.Before["dose"] = Get("dose"); rep.Before["doseDil"] = Get("doseDil");
            JsonValue sys = _b["systems"], rad = _b["radiation"], sup = _b["supplies"], hp = _b["health"];
            Allocation a = Affordable(Alloc); Alloc = a;
            bool hadHarvestFlag = Flag("harvestToday");

            // ---- 1. power and the four systems ----
            double solar = SolarToday, spent = BaseLoadToday + Cost(a);
            double net = Get("power") + solar - spent;
            rep.Solar = solar; rep.Spent = spent;
            bool blackout = net <= 0;
            V["power"] = net;
            V["air"] = Get("air") + sys["life"]["air"][a.Life].Num()
                     + (Get("plants") >= sys["garden"]["airBonusNeedsPlants"].Num(60) ? sys["garden"]["airBonus"][a.Garden].Num() : 0) + ModSum("airDrift");
            if (!Flag("plantsDead")) V["plants"] = Get("plants") + PlantsDelta(a.Garden);
            V["water"] = Get("water") + sys["garden"]["water"][a.Garden].Num() + sup["waterPerSol"].Num() + ModSum("waterDrift");
            V["shield"] = Get("shield") + sys["shield"]["shield"][a.Shield].Num() + ModSum("shieldRate");
            if (!ScienceBlocked && a.Rover > 0) V["science"] = Get("science") + Math.Max(0, sys["rover"]["science"][a.Rover].Num() + ModSum("scienceRate"));
            V["food"] = Get("food") + sup["foodPerSol"].Num();
            Normalize();

            // ---- 2. harvest ----
            if (hadHarvestFlag) Flags["harvestToday"] = false;
            if (!Flag("plantsDead") && Get("plants") >= 100)
            {
                V["harvests"] = Get("harvests") + 1;
                V["food"] = Get("food") + sup["harvestFood"].Num(14); V["morale"] = Get("morale") + sup["harvestMorale"].Num(6);
                V["plants"] = sup["plantsAfterHarvest"].Num(72);
                Flags["harvestToday"] = true; rep.Harvest = true;
                Log.Add(new LogEntry { Sol = Sol, Kind = "win", Text = "Sol " + Sol + ": harvest. Fresh food grown on Mars." });
            }

            // ---- 3. the core ----
            if (Flag("dilInField") && !Flag("coreSealed") && Get("science") >= _b["story"]["coreSealedAtScience"].Num(100))
            { Flags["coreSealed"] = true; rep.CoreSealed = true; }

            // ---- 4. radiation: the real dose of this real day ----
            int level = _day.StormLevel; rep.StormLevel = level;
            double protection = 0;
            if (level >= 1)
            {
                double req = rad["shieldRequired"][level].Num(), have = Get("shield");
                protection = rad["shieldMaxProtection"].Num(0.92) * Math.Min(1.0, req > 0 ? have / req : 1.0);
                if (Flag("waterWall")) protection += rad["waterWallProtection"].Num(0.25);
                protection = Math.Min(rad["maxProtection"].Num(0.95), protection);
                rep.Protection = protection;
                if (protection < rad["shieldFailedBelowProtection"].Num(0.5)) { Flags["shieldFailed"] = true; rep.ShieldFailed = true; }
                V["shield"] = have - rad["shieldDrain"][level].Num();
                string key = protection >= 0.85 ? "held" : protection >= rad["shieldFailedBelowProtection"].Num(0.5) ? "thin" : "failed";
                rep.Because.Add(Because(key == "held" ? "shieldHeld" : key == "thin" ? "shieldThin" : "shieldEmpty"));
                if (Flag("waterWall")) rep.Because.Add(Because("waterWallHelped"));
                rep.Lines.AddRange(Lines(Design.Dialogue["storm"]["result." + key]));
            }
            double habStorm = _day.DoseStorm * rad["habStormFactor"].Num(0.6) * (1 - protection);
            double crewDose = _day.DoseCalm * rad["habCalmFactor"].Num(0.85) + habStorm;
            double dilDose = crewDose;
            if (Flag("dilInField"))
            {
                dilDose = _day.DoseCalm * rad["fieldCalmFactor"].Num(1.0);
                if (level >= 1)
                {
                    if (_dilRecalledToday)
                    {
                        double share = rad["runHomeOutsideShare"].Num(0.2);
                        dilDose += _day.DoseStorm * (share * rad["outsideFactor"].Num(1.0) + (1 - share) * rad["habStormFactor"].Num(0.6) * (1 - protection));
                        Flags["dilInField"] = false; Flags["dilReturned"] = true;
                        bool kept = Flag("coreSealed") || Get("science") >= _b["story"]["coreSealedAtScience"].Num(100);
                        if (kept) { Flags["sampleSecured"] = true; Flags["coreSealed"] = true; }
                        else { Flags["sampleLost"] = true; Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": Dil came home through the storm. The half-drilled core stayed in the rock." }); }
                        rep.Lines.AddRange(Lines(Design.Dialogue["storm"][_dilTrustLine ?? (kept ? "dil.recalled.kept" : "dil.recalled.lost")]));
                    }
                    else if (_dilCliffToday)
                    {
                        dilDose += _day.DoseStorm * rad["cliffStormFactor"].Num(0.4);
                        V["science"] = 100; Flags["coreSealed"] = true; rep.CoreSealed = true;
                        bool stranded = a.Rover < 2 && _rng.Next() < _b["storm"]["strandedChance"].Num(0.5);
                        if (stranded)
                        {
                            V["power"] = Get("power") + _b["storm"]["rescueCost"]["power"].Num(-20); V["health"] = Get("health") + _b["storm"]["rescueCost"]["health"].Num(-8);
                            Flags["dilStranded"] = true; rep.Because.Add(Because("roverFlat"));
                            rep.Lines.AddRange(Lines(Design.Dialogue["storm"]["dil.cliff.stranded"]));
                        }
                        else
                        {
                            rep.Because.Add(Because("roverCharged"));
                            rep.Lines.AddRange(Lines(Design.Dialogue["storm"][_dilTrustLine ?? "dil.cliff.ok"]));
                        }
                        Log.Add(new LogEntry { Sol = Sol, Kind = "turn", Text = "Sol " + Sol + ": Dil sat out the storm under the delta cliff with the core." });
                    }
                    else dilDose += _day.DoseStorm * rad["cliffStormFactor"].Num(0.4);   // caught outside on a later storm sol: she finds the nearest rock
                }
            }
            V["dose"] = Get("dose") + crewDose; V["doseDil"] = Get("doseDil") + dilDose;
            rep.CrewDoseToday = crewDose; rep.DilDoseToday = dilDose; rep.OutsideDoseToday = _day.DoseOutside; _outsideTotal += _day.DoseOutside;
            CheckBadges(rep);
            if (level >= 1 && _stormToday) Flags["stormDone"] = true;
            else if (level >= 1 && !Flag("stormDone") && _used.Contains("storm")) Flags["stormDone"] = true;
            Normalize();

            // ---- 5. the crew ----
            double health = hp["naturalRecovery"].Num(3);
            double air = Get("air");
            if (air < hp["veryThinAir"]["below"].Num(15)) health += hp["veryThinAir"]["delta"].Num(-15);
            else if (air < hp["thinAir"]["below"].Num(30)) health += hp["thinAir"]["delta"].Num(-8);
            if (air < hp["thinAir"]["below"].Num(30)) { _lowAirSols++; if (_lowAirSols == 2) rep.Because.Add(Because("lowAirTired")); } else _lowAirSols = 0;
            if (blackout || Get("power") <= hp["coldNight"]["whenPowerAtOrBelow"].Num(0))
            {
                blackout = true; health += hp["coldNight"]["delta"].Num(-12);
                if (!Flag("plantsDead")) V["plants"] = Get("plants") + hp["coldNight"]["plants"].Num(-10);
                rep.Because.Add(Because("coldNight"));
            }
            if (Get("food") < hp["hungry"]["foodBelow"].Num(15))
            {
                health += hp["hungry"]["delta"].Num(-4); V["morale"] = Get("morale") + hp["hungry"]["morale"].Num(-5);
                if (Get("harvests") < 1 && !Flag("saidHungry")) { Flags["saidHungry"] = true; rep.Because.Add(Because("noHarvestHungry")); }
            }
            if (Get("water") <= hp["noWater"]["waterAtOrBelow"].Num(0)) health += hp["noWater"]["delta"].Num(-15);
            if (Get("morale") < hp["lowMorale"]["below"].Num(25)) health += hp["lowMorale"]["delta"].Num(-3);
            V["health"] = Get("health") + health;
            double target = _b["morale"]["restTarget"].Num(60), drift = _b["morale"]["drift"].Num(1), mo = Get("morale");
            V["morale"] = mo < target ? Math.Min(target, mo + drift) : mo > target ? Math.Max(target, mo - drift) : mo;
            bool wasDead = Flag("plantsDead");
            Normalize();
            if (!wasDead && Flag("plantsDead")) { rep.PlantsDied = true; rep.Because.Add(Because("gardenDied")); }
            rep.Blackout = blackout;
            _blackoutSols = blackout ? _blackoutSols + 1 : 0;

            // ---- 6. flight rules (fail states are an ending, never a death) ----
            JsonValue ev = _b["endings"]["evac"];
            if (Get("air") <= ev["airAtOrBelow"].Num(0) || Get("health") <= ev["healthAtOrBelow"].Num(0) || _blackoutSols >= ev["blackoutSols"].Int(2))
            {
                Flags["evac"] = true; Over = true;
                Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": a flight rule was crossed. Abort to orbit." });
            }

            // ---- 7. housekeeping ----
            for (int i = Mods.Count - 1; i >= 0; i--) { Mods[i].SolsLeft -= 1; if (Mods[i].SolsLeft <= 0) Mods.RemoveAt(i); }
            if (Sol >= MissionSols)
            {
                Over = true;
                if (Flag("coreSealed") && !Flag("sampleLost")) { Flags["sampleSecured"] = true; Flags["dilInField"] = false; }   // she drives straight to the pad
            }
            foreach (string m in Meters) rep.After[m] = Get(m);
            rep.After["dose"] = Get("dose"); rep.After["doseDil"] = Get("doseDil");
            History.Add(new SolRecord
            {
                Sol = Sol, RealDate = _day.Date, Sky = _sky, Air = Get("air"), Power = Get("power"), Shield = Get("shield"), Water = Get("water"), Food = Get("food"),
                Plants = Get("plants"), Science = Get("science"), Health = Get("health"), Morale = Get("morale"), Dose = Get("dose"), DoseDil = Get("doseDil"),
                DoseOutside = _day.DoseOutside, DoseOutsideTotal = _outsideTotal, Solar = solar, StormLevel = level, Alloc = a.Clone()
            });
            rep.Lines.AddRange(_says); _says.Clear();
            if (Over) { Ending = ResolveEnding(); rep.EndingId = Ending.Id; }
            rep.Over = Over;
            return rep;
        }

        void CheckBadges(NightReport rep)
        {
            double amber = DoseAmber, red = DoseRed;
            if (Get("doseDil") >= red && !Flag("dilSentHome"))
            {
                Flags["dilSentHome"] = true; Flags["dilGrounded"] = true; V["morale"] = Get("morale") + _b["morale"]["sentHome"].Num(-10);
                rep.Lines.AddRange(Lines(Design.Dialogue["storm"]["dil.sentHome"]));
                Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": Dil's dose badge reached the red line. She goes home in the medical bay, feeling fine." });
            }
            else if (Get("doseDil") >= amber && !Flag("dilGrounded"))
            {
                Flags["dilGrounded"] = true;
                rep.Lines.AddRange(Lines(Design.Dialogue["storm"]["dil.grounded"]));
                Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": Dil's dose badge went over the mission limit. No more outside work." });
            }
            if (Flag("dilGrounded") && Flag("dilInField") && !Flag("coreSealed"))
            {   // flight rule: a grounded geologist drives home; an unfinished core stays behind
                Flags["dilInField"] = false; Flags["dilReturned"] = true; Flags["sampleLost"] = true;
            }
            if (Get("dose") >= red && !Flag("crewSentHome"))
            {
                Flags["crewSentHome"] = true; Flags["crewGrounded"] = true; V["morale"] = Get("morale") + _b["morale"]["sentHome"].Num(-10);
                Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": the outpost crew's dose badges reached the red line." });
            }
            else if (Get("dose") >= amber && !Flag("crewGrounded"))
            {
                Flags["crewGrounded"] = true;
                Log.Add(new LogEntry { Sol = Sol, Kind = "loss", Text = "Sol " + Sol + ": the outpost crew's dose badges went over the mission limit." });
            }
        }

        // ================================================================== endings
        public EndingResult ResolveEnding()
        {
            var r = new EndingResult { GardenTier = GardenTier, CrewFit = CrewFit, HighRisk = HighRisk, Decoded = Decoded };
            foreach (JsonValue e in Design.Endings["endings"].Items)
            {
                bool match = _forcedEnding != null ? e["id"].Str() == _forcedEnding : Test(e["when"]);
                if (match) { r.Id = e["id"].Str(); r.Data = e; return r; }
            }
            r.Id = "survival"; return r;
        }

        /// <summary>Chest X-ray comparison for kids, using NASA/JPL's own figure (balance.radiation.xrayNote).</summary>
        public double ChestXrays(double microGray) { return microGray / _b["radiation"]["xrayEquivalentMicroGray"].Num(270); }
        public double OutsideDoseTotal { get { return _outsideTotal; } }
    }
}
