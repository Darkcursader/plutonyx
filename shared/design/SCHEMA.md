# Design data schema — the mini-language both engines implement

> Web (TypeScript) and Desktop (C#) must interpret these files identically.
> Reference implementation: `web/src/sim/` (pure functions, unit-tested). If in doubt, port that code.
> Portions of this document were drafted with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.

## 1. State (one mission)

```
sol        int    1..missionSols
air        0..100   core meter
power      0..100   core meter (battery). 10 points = 1 power cell = 10 kWh (game scale)
shield     0..100   core meter
water      0..100   supply
food       0..100   supply
plants     0..100   garden growth/vitality   (0 → flag plantsDead)
science    0..100   Leopard Core progress
health     0..100   crew condition (tired, cold, thin air, hungry). NOT radiation.
morale     0..100
dose       number   µGy received by crew staying at the outpost
doseDil    number   µGy received by Dil (differs when she is in the field)
risk       int      number of gambles taken
harvests   int
fragments  int      decoded pieces of the Earth message (0..3)
flags      map<string,bool>
alloc      { life, garden, shield, rover }  each 0..3
mods       list of { id, target, add, solsLeft }   temporary modifiers
pending    list of { sol, effects, because }       delayed effects
inbox      list of { sol, key }                    messages from Earth still in flight
log        list of { sol, kind, text, tags }       turning points for the debrief timeline
```

All meters are clamped to 0..100 after every change. `dose*` are never clamped.

## 2. Effects (arrays, applied in order)

| Form | Meaning |
|---|---|
| `{ "v": "air", "add": -10 }` | Add to a numeric state value |
| `{ "v": "shield", "set": 0 }` | Set a numeric state value |
| `{ "flag": "kofiMessage", "set": true }` | Set a flag |
| `{ "after": 2, "do": [ …effects ], "because": "dialogue key or text" }` | Delayed consequence: applied at dawn, `after` sols later, shown with its "because" line |
| `{ "chance": 0.3, "do": [ … ], "else": [ … ] }` | Seeded random branch (uses the mission PRNG) |
| `{ "mod": "solar", "add": -30, "sols": 3, "id": "dustStorm" }` | Temporary modifier. Targets: `solar`, `baseLoad`, `airDrift`, `plantsDrift`, `waterDrift`, `scienceRate`, `shieldRate` |
| `{ "clearMod": "dustStorm" }` | Remove a modifier early |
| `{ "msg": "earth.reply.scrubber", "after": 1 }` | Put a message from Earth in flight (arrives at dawn `after` sols later) |
| `{ "log": "text", "kind": "turn" }` | Add a turning point to the debrief timeline |
| `{ "say": "kofi", "text": "…" }` | Queue a crew reaction line |
| `{ "end": "evac" }` | End the mission now with this ending id |
| `{ "if": <condition>, "do": [ … ], "else": [ … ] }` | Conditional effects |

## 3. Conditions

| Form | True when |
|---|---|
| `{ "v": "plants", "gte": 60 }` | Value comparison. Operators: `gte`, `gt`, `lte`, `lt`, `eq` |
| `{ "flag": "dilInField" }` | Flag is true (`"is": false` to test for false) |
| `{ "sol": { "gte": 3, "lte": 6 } }` | Current sol in range |
| `{ "sw": "stormLevel", "gte": 2 }` | Today's space-weather field comparison (see section 5) |
| `{ "mode": "cadet" }` | Difficulty id matches |
| `{ "all": [ … ] }`, `{ "any": [ … ] }`, `{ "not": … }` | Logic |

## 4. Events (`events.json`)

```
{
  "id": "scrubber_clog",
  "kind": "story" | "deck" | "auto",      // story = fixed beat, deck = drawn by seed, auto = fires whenever its condition is true
  "title": "The air smells of dust",
  "when": <condition>,                     // must be true for the event to be eligible
  "sol": 3 | null,                         // fixed sol for story beats (optional)
  "weight": 10,                            // deck draw weight
  "once": true,
  "cooldownSols": 2,                       // optional: the event may repeat, but not within this many sols
  "scene": "airmaker",                     // camera/scene tag: outpost | greenhouse | shelter | solar | dish | airmaker | delta | pad | sky | interior
  "lines": [ { "who": "kofi", "say": "…" } ],
  "realData": [ "source-id", … ],          // sources.json ids → shows the REAL DATA chip
  "learn": "One or two sentences of real science shown after the choice.",
  "choices": [
    {
      "id": "fix_now",
      "label": "Fix it now",
      "detail": "Kofi swaps the filter. Costs 1 power cell.",
      "hint": "PIP: clean air comes first.",   // Cadet only
      "needs": <condition>,                    // optional; choice is greyed out with its reason when false
      "needsText": "Needs 1 power cell",
      "askEarth": false,                       // true = this choice sends a question to Earth
      "risk": 0,                               // added to state.risk
      "effects": [ … ],
      "result": [ { "who": "kofi", "say": "…" } ]
    }
  ]
}
```

Selection per sol: all eligible `story` events for that sol in file order, then **one** `deck` event drawn with the mission PRNG from eligible ones (weights), unless a story event has `"exclusive": true`. `auto` events are checked at dawn.

## 5. Space-weather day (`data/spaceweather/<window>.json` → `days[]`)

Produced by `scripts/fetch-spaceweather.mjs` from DONKI + RadLab. Both editions read the same file. One entry per real UTC day:

```
{
  "date": "2024-05-20",
  "flares":      { "count", "C", "M", "X", "max": "X1.2" | null, "maxPeakTime", "maxRegion", "maxLink" },
  "cmes":        { "count", "fastest": km/s | null, "fastestType", "fastestLink", "fastestLongitude", "fastestHalfAngle" },
  "marsArrivals":  [ { "arrival", "glancing", "cmeStart", "cmeSpeed", "link" } ],   // NASA WSA-ENLIL predicted arrival AT MARS on this day
  "marsForecasts": [ { "issued", "arrival", "glancing", "cmeSpeed", "link" } ],     // predictions PUBLISHED on this day about a later arrival at Mars
  "earth":       { "kpMax": number | null, "gst": bool, "shockArrivals": [ … ] },
  "sep":         [ { "time", "instruments": [ … ], "link" } ],
  "rad":         { "source": "measured" | "none", "meanRate": µGy/h, "maxRate": µGy/h, "maxTime", "samples", "dose": µGy for the day } | null,
  "game": {                                   // derived, deterministic — see science-log.md
    "radSource": "measured" | "estimated",
    "doseOutside": µGy,                       // total for the sol, standing outside
    "doseCalm": µGy,                          // the calm (cosmic-ray) part
    "doseStorm": µGy,                         // the storm (solar particle) part = doseOutside − doseCalm, ≥ 0
    "stormLevel": 0 | 1 | 2 | 3,              // 0 calm · 1 active · 2 storm · 3 severe
    "flareLevel": 0 | 1 | 2 | 3,              // 0 quiet · 1 M-class · 2 X-class · 3 X5+
    "radioNoise": 0 | 1 | 2                   // Earth-side radio trouble from flares / Earth's own geomagnetic storm
  }
}
```

## 6. Deterministic randomness

`mulberry32(seed)`:

```
state = seed (uint32)
next():
  state = (state + 0x6D2B79F5) | 0
  t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
```

The PRNG is consumed in a fixed order: (1) mission setup (dust-storm sol and length, deck shuffle), (2) each `chance` effect as it is applied. Mission code = `<windowId>-<seed in base36, upper case>`.

## 7. Endings (`endings.json`)

Checked in array order; the first whose `when` is true wins. `evac` can also be triggered immediately by a fail state or an `end` effect.
Derived values available to ending conditions: `gardenTier` (0 dead · 1 alive · 2 thriving), `crewFit` (bool), `highRisk` (bool), `decoded` (bool) — defined in `balance.json → endings`.
