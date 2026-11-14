// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Harness.cs — command-line balance tester for the C# simulation core (not part of the Unity build).
// Plays thousands of seeded missions with simple bot strategies and reports which endings each
// reaches, so we can prove every ending is reachable and no single strategy always wins.
// Build and run: tools/harness/run.sh [runs]
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using PlutonyX.Core;

static class Harness
{
    delegate Allocation Planner(Mission m, Random r);
    delegate string Chooser(Mission m, EventView e, Random r);

    sealed class Bot { public string Name; public Planner Plan; public Chooser Choose; }

    static string First(EventView e) { return e.Choices.First(c => c.Enabled).Id; }
    static string Pick(EventView e, params string[] wanted)
    {
        foreach (string w in wanted) { ChoiceView c = e.Choices.FirstOrDefault(x => x.Id == w); if (c != null && c.Enabled) return c.Id; }
        return First(e);
    }
    // Step systems down (in the given order) until the battery keeps `reserve` points after tonight.
    static Allocation Fit(Mission m, int life, int garden, int shield, int rover, double reserve = 10, string order = "rover,shield,garden,life")
    {
        var a = new Allocation(life, garden, shield, rover);
        string[] o = order.Split(',');
        for (int guard = 0; guard < 20 && m.PowerAfter(a) < reserve; guard++)
        {
            bool lowered = false;
            foreach (string s in o) if (a.Get(s) > (s == "life" ? 1 : 0)) { a.Set(s, a.Get(s) - 1); lowered = true; break; }
            if (!lowered) break;
        }
        return m.Affordable(a);
    }

    static bool Poor(Mission m) { return m.Get("power") < 25; }
    static readonly Bot[] Bots = {
        new Bot { Name = "balanced",
            Plan = (m, r) => Fit(m, m.Get("air") < 45 ? 3 : 2, 2, m.Sol >= 4 && m.Get("shield") < 90 ? 2 : 1, 2, 15),
            Choose = (m, e, r) => Pick(e, "kofi_cleans", "split", Poor(m) ? "wait" : "charge_now", "cover_panels", Poor(m) ? "text_only" : "full_video", "fast_core", "feast", "divert", "cliff", "no_time", Poor(m) ? "talk_fix" : "send_packs", "launch", Poor(m) ? "limp" : "fix_now", Poor(m) ? "ration" : "fix", Poor(m) ? "huddle" : "heaters", "brush", Poor(m) ? "keep_it" : "try_it", "by_the_book", "stay", "listen", Poor(m) ? "watch" : "patch", "rest", "watch", "check", "own_it") },
        new Bot { Name = "shield-first",
            Plan = (m, r) => Fit(m, 2, m.Get("plants") < 30 ? 2 : 1, m.Get("shield") >= 95 ? 0 : 3, 2, 10, "rover,garden,shield,life"),
            Choose = (m, e, r) => Pick(e, "kofi_cleans", "rover_first", "wait", "bank_power", "not_today", "fast_core", "save_seeds", "hold", "cliff", "no_time", "refuse", "launch", "limp", "ration", "huddle", "wait_wind", "keep_it", "by_the_book", "stay", "listen", "watch", "push", "work", "check", "own_it") },
        new Bot { Name = "gardener",
            Plan = (m, r) => Fit(m, 2, 3, m.Sol >= 5 ? 2 : 1, m.Sol <= 2 ? 1 : 0, 10, "rover,shield,garden,life"),
            Choose = (m, e, r) => Pick(e, "kofi_cleans", "plants_first", "wait", "cover_panels", Poor(m) ? "text_only" : "full_video", "deep_core", "feast", "water_wall", "recall", "no_time", "talk_fix", "lights_on", "plants_help", Poor(m) ? "ration" : "fix", "garden_heat", "brush", Poor(m) ? "keep_it" : "try_it", "by_the_book", "stay", "family", "watch", "rest", "watch", "check", "own_it") },
        new Bot { Name = "scientist",
            Plan = (m, r) => Fit(m, 2, 1, m.Sol >= 6 ? 1 : 0, 3, 5, "shield,garden,rover,life"),
            Choose = (m, e, r) => Pick(e, "move_on", "rover_first", "wait", "carry_on", "not_today", "fast_core", "feast", "hold", "trust", "no_time", "refuse", "last_run", "limp", "ration", "huddle", "wait_wind", "keep_it", "do_it", "go", "science_data", "watch", "push", "work", "ignore", "blame_delay") },
        new Bot { Name = "careful-expert",     // has played before: banks shield early, keeps a reserve, listens for the message
            Plan = (m, r) => {
                bool coreDone = m.Flag("sampleSecured") || m.Flag("coreSealed") || m.Flag("sampleLost");
                int shield = m.Flag("stormDone") && m.Today.StormLevel == 0 ? 0 : m.Get("shield") >= 95 ? 0 : 2;
                int garden = m.Flag("plantsDead") ? 0 : m.Get("plants") < 80 ? 2 : 1;
                return Fit(m, m.Get("air") < 50 ? 3 : 2, garden, shield, coreDone ? 0 : 2, 12, "rover,garden,shield,life"); },
            Choose = (m, e, r) => Pick(e, "kofi_cleans", "split", "wait", "cover_panels", Poor(m) ? "text_only" : "full_video", "fast_core", "feast", m.Get("shield") >= 85 ? "hold" : (m.Get("water") >= 40 ? "water_wall" : "divert"), "cliff", "no_time", "talk_fix", "launch", Poor(m) ? "limp" : "fix_now", Poor(m) ? "ration" : "fix", "huddle", "brush", "keep_it", "by_the_book", "stay", "listen", Poor(m) ? "watch" : "patch", "rest", "watch", "check", "own_it") },
        new Bot { Name = "speedrunner",        // knows the story: core first, then shield, garden late, catch every fragment
            Plan = (m, r) => {
                bool coreDone = m.Flag("sampleSecured") || m.Flag("coreSealed") || m.Flag("sampleLost");
                bool stormOver = m.Flag("stormDone") && m.Today.StormLevel == 0;
                int shield = stormOver ? 0 : m.Get("shield") >= 98 ? 0 : coreDone ? 3 : 1;
                int garden = m.Flag("plantsDead") ? 0 : coreDone ? (stormOver ? 3 : 2) : (m.Get("plants") < 25 ? 2 : 1);
                return Fit(m, m.Get("air") < 40 ? 3 : 2, garden, shield, coreDone ? 0 : 3, 10, coreDone ? "garden,shield,life" : "shield,garden,rover,life"); },
            Choose = (m, e, r) => Pick(e, "kofi_cleans", "rover_first", "wait", "bank_power", Poor(m) ? "text_only" : "full_video", "fast_core", "feast", m.Get("shield") >= 88 ? "hold" : (m.Get("water") >= 45 ? "water_wall" : "divert"), "cliff", "no_time", "talk_fix", "lights_on", Poor(m) ? "limp" : "fix_now", Poor(m) ? "ration" : "fix", "huddle", "brush", Poor(m) ? "keep_it" : "try_it", "by_the_book", "go", m.Get("fragments") < 3 ? "listen" : "science_data", "watch", "push", "work", "check", "own_it") },
        new Bot { Name = "neglectful",
            Plan = (m, r) => Fit(m, 1, 1, 0, 1, 0),
            Choose = (m, e, r) => e.Choices.Last(c => c.Enabled).Id },
        new Bot { Name = "random",
            Plan = (m, r) => m.Affordable(new Allocation(r.Next(4), r.Next(4), r.Next(4), r.Next(4))),
            Choose = (m, e, r) => { var ok = e.Choices.Where(c => c.Enabled).ToList(); return ok[r.Next(ok.Count)].Id; } },
        new Bot { Name = "casual",     // a kid who learned the first lesson: keep the air on, keep a little battery
            Plan = (m, r) => Fit(m, 2 + r.Next(2), 1 + r.Next(3), r.Next(3), 1 + r.Next(3), 5),
            Choose = (m, e, r) => { var ok = e.Choices.Where(c => c.Enabled).ToList(); return ok[r.Next(ok.Count)].Id; } },
    };

    static EndingResult Play(Design design, MissionWindow window, string difficulty, uint seed, Bot bot, bool trace)
    {
        var m = new Mission(design, window, difficulty, seed);
        var r = new Random(unchecked((int)(seed * 2654435761u)));
        while (!m.Over)
        {
            DawnReport dawn = m.BeginSol();
            m.SetAllocation(bot.Plan(m, r));
            var picked = new List<string>();
            for (EventView e = m.NextEvent(); e != null; e = m.NextEvent())
            {
                string c = bot.Choose(m, e, r);
                m.Choose(c); picked.Add((e.StepId ?? e.Id) + ":" + c);
            }
            Allocation used = m.Alloc.Clone();
            NightReport n = m.EndSol();
            if (trace)
            {
                Console.WriteLine("sol {0,2} {1} {2,-8} storm{3} | alloc L{4} G{5} S{6} R{7} | air {8,3:0} pow {9,3:0} shd {10,3:0} | h2o {11,3:0} food {12,3:0} plants {13,3:0} sci {14,3:0} | hp {15,3:0} mor {16,3:0} | dose {17,5:0} dil {18,5:0}{19} | {20}",
                    m.Sol, dawn.RealDate, dawn.Sky, n.StormLevel, used.Life, used.Garden, used.Shield, used.Rover,
                    m.Get("air"), m.Get("power"), m.Get("shield"), m.Get("water"), m.Get("food"), m.Get("plants"), m.Get("science"), m.Get("health"), m.Get("morale"),
                    m.Get("dose"), m.Get("doseDil"), n.Protection >= 0 ? string.Format(" prot {0:0.00}", n.Protection) : "", string.Join(" ", picked));
                foreach (EventView ne in dawn.NoteEvents) Console.WriteLine("        note: " + ne.Id);
                foreach (string b in dawn.Because.Concat(n.Because)) Console.WriteLine("        because: " + b);
            }
        }
        if (trace)
        {
            Console.WriteLine("ENDING: {0} | gardenTier {1} crewFit {2} highRisk {3} decoded {4} | flags: {5}", m.Ending.Id, m.Ending.GardenTier, m.Ending.CrewFit, m.Ending.HighRisk, m.Ending.Decoded,
                string.Join(",", m.Flags.Where(f => f.Value).Select(f => f.Key).OrderBy(x => x)));
            foreach (LogEntry l in m.Log) Console.WriteLine("   log[" + l.Kind + "] " + l.Text);
        }
        return m.Ending;
    }

    static int Main(string[] args)
    {
        System.Globalization.CultureInfo.DefaultThreadCurrentCulture = System.Globalization.CultureInfo.InvariantCulture;
        System.Globalization.CultureInfo.CurrentCulture = System.Globalization.CultureInfo.InvariantCulture;
        string shared = args.Length > 0 ? args[0] : "../shared";
        int runs = args.Length > 1 ? int.Parse(args[1]) : 1000;
        Design design = Design.Load(name => { string p = Path.Combine(shared, "design", name); return File.Exists(p) ? File.ReadAllText(p) : null; });
        var allEndings = design.Endings["endings"].Items.Select(e => e["id"].Str()).ToList();
        Console.WriteLine("design: {0} | {1} sols | {2} events | endings: {3}", design.Title, design.MissionSols, design.Events["events"].Count, string.Join(", ", allEndings));

        // sanity: PRNG and orbit against known values from the shared JavaScript
        var rng = new Rng(12345);
        Console.WriteLine("mulberry32(12345) first three: {0:R} {1:R} {2:R}", rng.Next(), rng.Next(), rng.Next());
        OrbitInfo o = Orbit.EarthMars(Orbit.NoonMs("2024-05-20"));
        Console.WriteLine("Earth-Mars 2024-05-20: {0:0.0} million km, one-way light time {1:0.00} min", o.DistanceMillionKm, o.LightMinutes);

        int failures = 0;
        foreach (JsonValue wdef in design.Windows["windows"].Items)
        {
            string id = wdef["id"].Str();
            string file = Path.Combine(shared, "data", "spaceweather", (id == "live" ? "recent" : id) + ".json");
            if (!File.Exists(file)) { Console.WriteLine("-- window {0}: no data file", id); continue; }
            MissionWindow Load() { return MissionWindow.FromJson(JsonValue.Parse(File.ReadAllText(file)), wdef["sol1"].IsNull ? null : wdef["sol1"].Str()); }
            MissionWindow probe = Load();
            if (id == "live" && probe.PeakStormLevel(design.MissionSols) < 2)
            {
                JsonValue inj = design.Balance["spaceWeather"]["calmWindowStorm"];
                MissionWindow arch = MissionWindow.FromJson(JsonValue.Parse(File.ReadAllText(Path.Combine(shared, "data", "spaceweather", inj["window"].Str() + ".json"))));
                probe.InjectArchivedStorm(arch, inj["dates"].Items.Select(x => x.Str()).ToList(), design.Balance["spaceWeather"]["peakSol"].Int(8));
            }
            Console.WriteLine("\n===== window {0}: sol 1 = {1}, storm levels by sol: {2}, delay {3:0.0} min{4}", id, probe.Day(1).Date,
                string.Join("", Enumerable.Range(1, design.MissionSols).Select(s => probe.Day(s).StormLevel.ToString())), probe.Day(8).LightMinutes, probe.StormInjected ? " [archived storm injected]" : "");
            foreach (string difficulty in new[] { "commander", "cadet" })
            {
                var reached = new HashSet<string>();
                Console.WriteLine("--- " + difficulty);
                foreach (Bot bot in Bots)
                {
                    var counts = new Dictionary<string, int>();
                    for (int i = 1; i <= runs; i++)
                    {
                        EndingResult e;
                        try { e = Play(design, probe, difficulty, (uint)(i * 7919 + 17), bot, false); }
                        catch (Exception ex) { failures++; if (failures <= 5) Console.WriteLine("EXCEPTION bot {0} seed {1}: {2}", bot.Name, i, ex); continue; }
                        counts[e.Id] = counts.TryGetValue(e.Id, out int c) ? c + 1 : 1; reached.Add(e.Id);
                    }
                    Console.WriteLine("{0,-15} {1}", bot.Name, string.Join(" | ", counts.OrderByDescending(k => k.Value).Select(k => k.Key + " " + (100.0 * k.Value / runs).ToString("0") + "%")));
                }
                var missing = allEndings.Where(e => !reached.Contains(e)).ToList();
                Console.WriteLine("reached {0} of {1}{2}", reached.Count, allEndings.Count, missing.Count > 0 ? "  NEVER REACHED: " + string.Join(", ", missing) : "  (all endings reachable)");
            }
        }
        Console.WriteLine("\n===== trace: balanced bot, story window, commander, seed 42");
        {
            JsonValue wdef = design.Window("may-2024");
            MissionWindow w = MissionWindow.FromJson(JsonValue.Parse(File.ReadAllText(Path.Combine(shared, "data", "spaceweather", "may-2024.json"))), wdef["sol1"].Str());
            Play(design, w, "commander", 42, Bots[0], true);
            Console.WriteLine("\n===== trace: careful-expert bot, story window, commander, seed 7");
            Play(design, w, "commander", 7, Bots[5], true); Play(design, w, "cadet", 3, Bots[5], true);
        }
        Console.WriteLine(failures == 0 ? "\nOK: no exceptions" : "\nFAILED: " + failures + " exceptions");
        return failures == 0 ? 0 : 1;
    }
}
