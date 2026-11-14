// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// MissionTypes.cs — plain data used by the simulation and handed to the presentation layer.
// The rules themselves are in Mission.cs; the schema is shared/design/SCHEMA.md.
using System;
using System.Collections.Generic;

namespace PlutonyX.Core
{
    /// <summary>All parsed shared design files. Both editions read the same JSON.</summary>
    public sealed class Design
    {
        public JsonValue Game = JsonValue.Null, Balance = JsonValue.Null, Events = JsonValue.Null, Endings = JsonValue.Null,
                         Dialogue = JsonValue.Null, Crew = JsonValue.Null, Windows = JsonValue.Null, Achievements = JsonValue.Null,
                         Glossary = JsonValue.Null, Sources = JsonValue.Null, Facts = JsonValue.Null;

        /// <param name="read">Returns the text of a design file by name ("balance.json"), or null if it does not exist.</param>
        public static Design Load(Func<string, string> read)
        {
            var d = new Design();
            d.Game = Parse(read, "game.json"); d.Balance = Parse(read, "balance.json"); d.Events = Parse(read, "events.json");
            d.Endings = Parse(read, "endings.json"); d.Dialogue = Parse(read, "dialogue.json"); d.Crew = Parse(read, "crew.json");
            d.Windows = Parse(read, "windows.json"); d.Achievements = Parse(read, "achievements.json"); d.Glossary = Parse(read, "glossary.json");
            d.Sources = Parse(read, "sources.json"); d.Facts = Parse(read, "facts.json");
            return d;
        }
        static JsonValue Parse(Func<string, string> read, string name)
        {
            string text = read(name);
            return string.IsNullOrEmpty(text) ? JsonValue.Null : JsonValue.Parse(text);
        }

        public string Title { get { return Game["title"].Str("PROJECT JEZERO"); } }
        public int MissionSols { get { return Balance["missionSols"].Int(10); } }

        /// <summary>Difficulty block with "inherits" resolved (Classroom uses Cadet numbers).</summary>
        public JsonValue Difficulty(string id)
        {
            JsonValue d = Balance["difficulty"][id];
            if (d.Has("inherits") && !d.Has("start")) return Balance["difficulty"][d["inherits"].Str()];
            return d;
        }
        public JsonValue CrewMember(string id)
        {
            foreach (JsonValue c in Crew["crew"].Items) if (c["id"].Str() == id) return c;
            return JsonValue.Null;
        }
        public JsonValue Window(string id)
        {
            foreach (JsonValue w in Windows["windows"].Items) if (w["id"].Str() == id) return w;
            return JsonValue.Null;
        }
    }

    public sealed class Allocation
    {
        public int Life, Garden, Shield, Rover;
        public Allocation() { }
        public Allocation(int life, int garden, int shield, int rover) { Life = life; Garden = garden; Shield = shield; Rover = rover; }
        public int Get(string sys) { switch (sys) { case "life": return Life; case "garden": return Garden; case "shield": return Shield; case "rover": return Rover; default: return 0; } }
        public void Set(string sys, int level)
        {
            level = level < 0 ? 0 : level > 3 ? 3 : level;
            switch (sys) { case "life": Life = level; break; case "garden": Garden = level; break; case "shield": Shield = level; break; case "rover": Rover = level; break; }
        }
        public Allocation Clone() { return new Allocation(Life, Garden, Shield, Rover); }
        public override string ToString() { return "life " + Life + " garden " + Garden + " shield " + Shield + " rover " + Rover; }
    }

    public sealed class Mod { public string Id, Target; public double Add; public int SolsLeft; }
    public sealed class PendingEffect { public int Sol; public JsonValue Effects; public string Because; }
    public sealed class InboxMessage { public int Sol; public string Key; }
    public sealed class LogEntry { public int Sol; public string Kind, Text; }

    /// <summary>One spoken line. Who = crew id (ana, dil, kofi, sam, pip, narrator).</summary>
    public sealed class Line
    {
        public string Who, Say;
        public Line(string who, string say) { Who = who; Say = say; }
    }

    public sealed class ChoiceView
    {
        public string Id, Label, Detail, Hint, NeedsText;
        public bool Enabled = true, AskEarth;
        public int Risk;
    }

    /// <summary>An event (or one step of the storm scene) ready to show: tokens filled, choices checked.</summary>
    public sealed class EventView
    {
        public string Id, Kind, Title, Scene, Learn, StepId, DefaultChoice;
        public bool IsNote, IsCrisis;
        public int StepIndex, StepCount;
        public List<Line> Lines = new List<Line>();
        public List<ChoiceView> Choices = new List<ChoiceView>();
        public List<string> RealData = new List<string>();
        public List<string> Sources = new List<string>();
    }

    public sealed class ChoiceOutcome
    {
        public string EventId, ChoiceId, Learn;
        public List<Line> Result = new List<Line>();
        public List<string> RealData = new List<string>();
    }

    public sealed class DawnReport
    {
        public int Sol;
        public string RealDate, Sky, SkyText;
        public double Solar, BaseLoad, DelayMinutes;
        public WeatherDay Day;
        public List<string> Notes = new List<string>();            // plain sentences, tokens filled
        public List<string> Because = new List<string>();          // delayed consequences landing today
        public List<List<Line>> EarthMessages = new List<List<Line>>();
        public List<EventView> NoteEvents = new List<EventView>(); // things that just happen (no choice)
        public List<Line> Says = new List<Line>();
        public int ChoiceEventCount;
    }

    public sealed class NightReport
    {
        public int Sol;
        public Dictionary<string, double> Before = new Dictionary<string, double>();
        public Dictionary<string, double> After = new Dictionary<string, double>();
        public double Solar, Spent, Protection = -1, CrewDoseToday, DilDoseToday, OutsideDoseToday;
        public int StormLevel;
        public bool Blackout, Harvest, PlantsDied, CoreSealed, ShieldFailed, Over;
        public List<string> Because = new List<string>();
        public List<Line> Lines = new List<Line>();
        public string EndingId;
    }

    public sealed class EndingResult
    {
        public string Id;
        public JsonValue Data = JsonValue.Null;
        public int GardenTier;
        public bool CrewFit, HighRisk, Decoded;
    }

    /// <summary>A snapshot of every meter at the end of a sol, for the debrief graphs (Mission Planner view).</summary>
    public sealed class SolRecord
    {
        public int Sol; public string RealDate, Sky;
        public double Air, Power, Shield, Water, Food, Plants, Science, Health, Morale, Dose, DoseDil, DoseOutside, DoseOutsideTotal, Solar;
        public int StormLevel; public Allocation Alloc;
    }
}
