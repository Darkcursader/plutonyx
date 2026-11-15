// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// GameUI.cs — every screen of the game, built in code with UI Toolkit (vector text, sharp at any resolution).
// The UI only shows what the simulation (PlutonyX.Core.Mission) tells it; it holds no rules.
// Each screen is a coroutine that finishes when the player has answered.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using PlutonyX.Core;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace PlutonyX.Game
{
    public sealed class GameUI : MonoBehaviour
    {
        public UIDocument Document;
        Design _design;
        VisualElement _root, _hud, _hudRight, _center, _bottom, _fade, _barTop, _barBottom;
        Label _caption, _solLabel, _skyLabel, _badge;
        readonly Dictionary<string, VisualElement> _meterFill = new Dictionary<string, VisualElement>();
        readonly Dictionary<string, Label> _meterValue = new Dictionary<string, Label>();
        readonly Dictionary<string, VisualElement> _meterBox = new Dictionary<string, VisualElement>();
        bool _advance;                      // set for one frame when the player presses continue
        public float TextScale = 1f;
        public bool ReducedMotion;
        // Autoplay (command line: -autoplay <folder>): the game plays itself and saves a screenshot of every screen.
        // Used for automated end-to-end tests of the built player and for the visual quality gate.
        public AudioDirector Audio;
        public WorldDirector World;
        public bool Paused;
        public bool Auto;
        public string CaptureDir;
        public int AutoTitleIndex;
        int _shotIndex;
        IEnumerator AutoCapture(string name)
        {
            if (!Auto) yield break;
            yield return new WaitForSeconds(1.4f);
            if (!string.IsNullOrEmpty(CaptureDir))
            {
                _shotIndex++;
                ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(CaptureDir, _shotIndex.ToString("000") + "_" + name + ".png"));
                yield return null; yield return null;
            }
        }

        static readonly string[] LevelNames = { "Off", "Low", "Normal", "Boost" };

        public void Init(Design design)
        {
            _design = design;
            _root = Document.rootVisualElement;
            _root.Clear();
            _root.AddToClassList("root");
            var sheet = Resources.Load<StyleSheet>("UI/PlutonyX");
            if (sheet != null) _root.styleSheets.Add(sheet);

            _barTop = Box("letterbox"); _barTop.style.top = 0; _barBottom = Box("letterbox"); _barBottom.style.bottom = 0;
            _root.Add(_barTop); _root.Add(_barBottom); Letterbox(false);
            _caption = new Label(""); _caption.AddToClassList("caption"); _root.Add(_caption);

            _hud = Box("hud"); _root.Add(_hud);
            AddMeter("air", "AIR", new Color(0.36f, 0.78f, 0.94f));
            AddMeter("power", "POWER", new Color(0.95f, 0.78f, 0.27f));
            AddMeter("shield", "SHIELD", new Color(0.72f, 0.61f, 1f));
            _hudRight = Box("hud-right"); _root.Add(_hudRight);
            _solLabel = new Label(""); _solLabel.AddToClassList("h2"); _hudRight.Add(_solLabel);
            _skyLabel = new Label(""); _skyLabel.AddToClassList("small"); _hudRight.Add(_skyLabel);
            _badge = new Label(""); _badge.AddToClassList("chip"); _badge.style.marginTop = 6; _badge.style.alignSelf = Align.FlexEnd; _hudRight.Add(_badge);

            _bottom = Box("bottom"); _root.Add(_bottom);
            _center = Box("center"); _center.pickingMode = PickingMode.Ignore; _root.Add(_center);
            _fade = Box("fade"); _fade.pickingMode = PickingMode.Ignore; _fade.style.opacity = 0; _root.Add(_fade);
            ShowHud(false);
            ReducedMotion = PlayerPrefs.GetInt("reducedMotion", 0) == 1;
            ApplyTextSize();
        }

        static VisualElement Box(params string[] classes)
        {
            var v = new VisualElement();
            foreach (string c in classes) v.AddToClassList(c);
            return v;
        }
        static Label Text(string text, string cls)
        {
            var l = new Label(text); l.AddToClassList(cls); return l;
        }

        void AddMeter(string id, string label, Color color)
        {
            VisualElement box = Box("panel", "meter");
            VisualElement head = Box("meter-head");
            head.Add(new Label(label)); var val = new Label("0"); head.Add(val);
            VisualElement track = Box("meter-track"); VisualElement fill = Box("meter-fill");
            fill.style.backgroundColor = color; track.Add(fill);
            box.Add(head); box.Add(track); _hud.Add(box);
            _meterFill[id] = fill; _meterValue[id] = val; _meterBox[id] = box;
        }

        // ------------------------------------------------------------------ input
        void Update()
        {
            Keyboard k = Keyboard.current; Gamepad g = Gamepad.current;
            if (!Paused && !Auto && ((k != null && k.escapeKey.wasPressedThisFrame) || (g != null && g.startButton.wasPressedThisFrame))) StartCoroutine(PauseMenu());
            if (Paused) { _advance = false; return; }
            if ((k != null && (k.spaceKey.wasPressedThisFrame || k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame))
                || (g != null && g.buttonSouth.wasPressedThisFrame)) _advance = true;
        }
        void LateUpdate() { _advanceConsumed = _advance; _advance = false; }
        bool _advanceConsumed;
        bool Advance { get { return _advanceConsumed && !Paused; } }
        static int MoveY()
        {
            Keyboard k = Keyboard.current; Gamepad g = Gamepad.current;
            if (k != null && (k.downArrowKey.wasPressedThisFrame || k.sKey.wasPressedThisFrame)) return 1;
            if (k != null && (k.upArrowKey.wasPressedThisFrame || k.wKey.wasPressedThisFrame)) return -1;
            if (g != null && g.dpad.down.wasPressedThisFrame) return 1;
            if (g != null && g.dpad.up.wasPressedThisFrame) return -1;
            return 0;
        }
        static int MoveX()
        {
            Keyboard k = Keyboard.current; Gamepad g = Gamepad.current;
            if (k != null && (k.rightArrowKey.wasPressedThisFrame || k.dKey.wasPressedThisFrame)) return 1;
            if (k != null && (k.leftArrowKey.wasPressedThisFrame || k.aKey.wasPressedThisFrame)) return -1;
            if (g != null && g.dpad.right.wasPressedThisFrame) return 1;
            if (g != null && g.dpad.left.wasPressedThisFrame) return -1;
            return 0;
        }
        static int DigitPressed()
        {
            Keyboard k = Keyboard.current; if (k == null) return 0;
            if (k.digit1Key.wasPressedThisFrame) return 1; if (k.digit2Key.wasPressedThisFrame) return 2;
            if (k.digit3Key.wasPressedThisFrame) return 3; if (k.digit4Key.wasPressedThisFrame) return 4;
            if (k.digit5Key.wasPressedThisFrame) return 5; if (k.digit6Key.wasPressedThisFrame) return 6;
            return 0;
        }

        // ------------------------------------------------------------------ chrome
        public void Letterbox(bool on) { _barTop.style.display = on ? DisplayStyle.Flex : DisplayStyle.None; _barBottom.style.display = on ? DisplayStyle.Flex : DisplayStyle.None; }
        public void Caption(string text) { _caption.text = text ?? ""; }
        public void ShowHud(bool on) { _hud.style.display = on ? DisplayStyle.Flex : DisplayStyle.None; _hudRight.style.display = on ? DisplayStyle.Flex : DisplayStyle.None; }
        public IEnumerator Fade(bool toBlack, float seconds = 0.8f)
        {
            _fade.style.opacity = toBlack ? 1 : 0;
            yield return new WaitForSeconds(ReducedMotion ? 0.05f : seconds);
        }

        public void UpdateHud(Mission m, string badge, bool live)
        {
            double warn = _design.Balance["ui"]["warnAt"].Num(30), danger = _design.Balance["ui"]["dangerAt"].Num(15);
            foreach (string id in new[] { "air", "power", "shield" })
            {
                double v = m.Get(id);
                _meterFill[id].style.width = new Length((float)v, LengthUnit.Percent);
                _meterValue[id].text = Math.Round(v).ToString("0", CultureInfo.InvariantCulture);
                _meterBox[id].EnableInClassList("meter-warn", id != "shield" && v < warn && v >= danger);
                _meterBox[id].EnableInClassList("meter-danger", id != "shield" && v < danger);
            }
            _solLabel.text = "SOL " + Math.Max(1, m.Sol) + " / " + m.MissionSols;
            _skyLabel.text = m.Flag("dilInField") ? "Dil is in the field" : m.Flag("sampleSecured") ? "The Leopard Core is aboard" : "";
            _badge.text = badge; _badge.EnableInClassList("chip-live", live); _badge.EnableInClassList("chip-arch", !live);
        }

        Color CrewColor(string who)
        {
            Color c;
            string hex = _design.CrewMember(who)["color"].Str(who == "narrator" ? "#F5F1E8" : "#5CC8F0");
            return ColorUtility.TryParseHtmlString(hex, out c) ? c : Color.white;
        }
        string CrewName(string who)
        {
            if (who == "narrator") return "";
            JsonValue c = _design.CrewMember(who);
            return c.IsNull ? who.ToUpperInvariant() : (c["shortName"].Str(who) + "  ·  " + c["role"].Str()).ToUpperInvariant();
        }

        // ------------------------------------------------------------------ explore mode overlay
        VisualElement _explore; Label _exploreHint, _exploreTitle, _exploreText;
        public void ExploreHud(bool on)
        {
            if (_explore == null)
            {
                _explore = Box("bottom"); _explore.pickingMode = PickingMode.Ignore;
                VisualElement card = Box("panel", "dialogue");
                _exploreTitle = Text("", "h2"); _exploreText = Text("", "body"); _exploreHint = Text("", "small");
                card.Add(_exploreTitle); card.Add(_exploreText); card.Add(_exploreHint); _explore.Add(card);
            }
            if (on && _explore.parent == null) _root.Insert(_root.IndexOf(_center), _explore);
            if (!on && _explore.parent != null) _root.Remove(_explore);
        }
        public void ExploreInfo(string title, string text, string hint) { _exploreTitle.text = title; _exploreText.text = text; _exploreHint.text = hint; }

        // ------------------------------------------------------------------ dialogue
        public IEnumerator Say(IList<Line> lines)
        {
            if (lines == null || lines.Count == 0) yield break;
            VisualElement panel = Box("panel", "dialogue");
            Label speaker = Text("", "speaker"); Label text = Text("", "line"); Label hint = Text("Space / click to continue", "small");
            hint.style.alignSelf = Align.FlexEnd; hint.style.marginTop = 8;
            panel.Add(speaker); panel.Add(text); panel.Add(hint);
            bool clicked = false;
            panel.RegisterCallback<ClickEvent>(e => clicked = true);
            _bottom.Add(panel);
            foreach (Line l in lines)
            {
                speaker.text = CrewName(l.Who); speaker.style.color = CrewColor(l.Who);
                speaker.style.display = string.IsNullOrEmpty(speaker.text) ? DisplayStyle.None : DisplayStyle.Flex;
                text.text = l.Say; clicked = false;
                if (Audio != null) { if (l.Who == "sam") Audio.Message(); else Audio.Advance(); }
                yield return null;
                float waited = 0;
                while (!clicked && !Advance && !(Auto && waited > 0.12f)) { waited += Time.unscaledDeltaTime; yield return null; }
                yield return null;
            }
            _bottom.Remove(panel);
        }
        public IEnumerator Say(string who, string text) { return Say(new List<Line> { new Line(who, text) }); }

        // ------------------------------------------------------------------ cards and menus
        VisualElement Card(string heading, string chip, string chipClass, bool crisis = false)
        {
            VisualElement card = Box("panel", "card");
            if (crisis) card.AddToClassList("crisis");
            if (!string.IsNullOrEmpty(chip)) { Label c = Text(chip, "chip"); c.AddToClassList(chipClass ?? "chip-real"); c.style.marginBottom = 10; card.Add(c); }
            if (!string.IsNullOrEmpty(heading)) card.Add(Text(heading, "h1"));
            _center.Add(card);
            return card;
        }

        // ------------------------------------------------------------------ mission chart, code entry, mission card
        static readonly string[] SeriesName = { "Air", "Power", "Food", "Crew health", "Radiation dose" };
        static readonly Color[] SeriesColor = { new Color(0.36f, 0.78f, 0.94f), new Color(0.95f, 0.78f, 0.27f), new Color(0.24f, 0.78f, 0.60f), new Color(0.96f, 0.95f, 0.91f), new Color(0.72f, 0.61f, 1f) };
        static readonly string[] SeriesMark = { "●", "■", "▲", "◆", "✚" };

        /// <summary>How the outpost's supplies changed sol by sol. Each line has its own colour and its own marker shape.
        /// The dose line is drawn as a share of the red limit for this difficulty. Storm sols get a violet band.</summary>
        public VisualElement Graph(Mission m)
        {
            var wrap = new VisualElement(); wrap.style.marginTop = 6; wrap.style.marginBottom = 10;
            var legend = new VisualElement(); legend.style.flexDirection = FlexDirection.Row; legend.style.flexWrap = Wrap.Wrap;
            for (int i = 0; i < SeriesName.Length; i++) { Label l = Text(SeriesMark[i] + " " + SeriesName[i] + (i == 4 ? " (share of the red limit)" : ""), "small"); l.style.color = SeriesColor[i]; l.style.marginRight = 18; legend.Add(l); }
            wrap.Add(legend);
            var plot = new VisualElement(); plot.style.height = 170; plot.style.minHeight = 170; plot.style.flexShrink = 0; plot.style.marginTop = 6; wrap.style.flexShrink = 0;
            plot.style.backgroundColor = new Color(0f, 0f, 0f, 0.28f); plot.style.borderTopLeftRadius = 6; plot.style.borderTopRightRadius = 6; plot.style.borderBottomLeftRadius = 6; plot.style.borderBottomRightRadius = 6;
            List<SolRecord> h = m.History; double red = Math.Max(1.0, m.DoseRed);
            plot.generateVisualContent += ctx =>
            {
                int n = h.Count; if (n < 1) return;
                Rect r = plot.contentRect; float pad = 14f, w = r.width - pad * 2, ht = r.height - pad * 2;
                var p = ctx.painter2D;
                Func<int, float> X = i => pad + (n == 1 ? w * 0.5f : w * i / (n - 1));
                Func<double, float> Y = v => pad + ht * (1f - Mathf.Clamp01((float)v / 100f));
                for (int i = 0; i < n; i++)
                    if (h[i].StormLevel > 0)
                    {
                        float x0 = X(i) - Mathf.Max(6f, w / Mathf.Max(1, n - 1) * 0.3f), x1 = X(i) + Mathf.Max(6f, w / Mathf.Max(1, n - 1) * 0.3f);
                        p.fillColor = new Color(0.62f, 0.55f, 1f, 0.16f); p.BeginPath(); p.MoveTo(new Vector2(x0, pad)); p.LineTo(new Vector2(x1, pad)); p.LineTo(new Vector2(x1, pad + ht)); p.LineTo(new Vector2(x0, pad + ht)); p.ClosePath(); p.Fill();
                    }
                p.lineWidth = 1f; p.strokeColor = new Color(1f, 1f, 1f, 0.12f);
                for (int g = 0; g <= 4; g++) { p.BeginPath(); p.MoveTo(new Vector2(pad, pad + ht * g / 4f)); p.LineTo(new Vector2(pad + w, pad + ht * g / 4f)); p.Stroke(); }
                for (int sIdx = 0; sIdx < 5; sIdx++)
                {
                    Func<SolRecord, double> get = rec => sIdx == 0 ? rec.Air : sIdx == 1 ? rec.Power : sIdx == 2 ? rec.Food : sIdx == 3 ? rec.Health : rec.Dose / red * 100.0;
                    p.strokeColor = SeriesColor[sIdx]; p.fillColor = SeriesColor[sIdx]; p.lineWidth = 2.5f; p.lineJoin = LineJoin.Round;
                    p.BeginPath(); for (int i = 0; i < n; i++) { var pt = new Vector2(X(i), Y(get(h[i]))); if (i == 0) p.MoveTo(pt); else p.LineTo(pt); }
                    p.Stroke();
                    for (int i = 0; i < n; i++)
                    {
                        Vector2 c = new Vector2(X(i), Y(get(h[i]))); const float k = 4.5f;
                        p.BeginPath();
                        if (sIdx == 0) p.Arc(c, k, 0f, 360f);
                        else if (sIdx == 1) { p.MoveTo(c + new Vector2(-k, -k)); p.LineTo(c + new Vector2(k, -k)); p.LineTo(c + new Vector2(k, k)); p.LineTo(c + new Vector2(-k, k)); }
                        else if (sIdx == 2) { p.MoveTo(c + new Vector2(0, -k - 1)); p.LineTo(c + new Vector2(k + 1, k)); p.LineTo(c + new Vector2(-k - 1, k)); }
                        else if (sIdx == 3) { p.MoveTo(c + new Vector2(0, -k - 1)); p.LineTo(c + new Vector2(k + 1, 0)); p.LineTo(c + new Vector2(0, k + 1)); p.LineTo(c + new Vector2(-k - 1, 0)); }
                        else { p.MoveTo(c + new Vector2(-1.5f, -k - 1)); p.LineTo(c + new Vector2(1.5f, -k - 1)); p.LineTo(c + new Vector2(1.5f, k + 1)); p.LineTo(c + new Vector2(-1.5f, k + 1)); p.ClosePath(); p.Fill(); p.BeginPath(); p.MoveTo(c + new Vector2(-k - 1, -1.5f)); p.LineTo(c + new Vector2(k + 1, -1.5f)); p.LineTo(c + new Vector2(k + 1, 1.5f)); p.LineTo(c + new Vector2(-k - 1, 1.5f)); }
                        p.ClosePath(); p.Fill();
                    }
                }
            };
            wrap.Add(plot);
            var axis = new VisualElement(); axis.style.flexDirection = FlexDirection.Row; axis.style.justifyContent = Justify.SpaceBetween; axis.style.paddingLeft = 6; axis.style.paddingRight = 6;
            for (int i = 0; i < h.Count; i++) axis.Add(Text("Sol " + h[i].Sol, "small"));
            wrap.Add(axis);
            wrap.Add(Text("Top of the chart = 100. The violet bands are the sols when a solar storm reached Mars.", "small"));
            return wrap;
        }

        /// <summary>Asks for a short piece of text (a mission code). result gets null if the player backs out.</summary>
        public IEnumerator Prompt(string heading, string body, Action<string> result)
        {
            VisualElement card = Card(heading, null, null);
            card.Add(Text(body, "body"));
            var field = new TextField { maxLength = 24 }; field.style.fontSize = 28; field.style.marginTop = 10; field.style.marginBottom = 10; card.Add(field);
            int done = 0;
            var row = new VisualElement(); row.style.flexDirection = FlexDirection.Row; row.style.justifyContent = Justify.FlexEnd;
            var back = new Button(() => done = 2) { text = "Back" }; back.AddToClassList("btn"); back.style.marginRight = 10; row.Add(back);
            var ok = new Button(() => done = 1) { text = "Play this mission" }; ok.AddToClassList("btn"); ok.AddToClassList("btn-primary"); row.Add(ok);
            card.Add(row);
            yield return null; field.Focus();
            yield return AutoCapture("prompt");
            while (done == 0 && !Auto) { if (Keyboard.current != null && Keyboard.current.enterKey.wasPressedThisFrame) done = 1; if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame) done = 2; yield return null; }
            string text = field.value;
            _center.Remove(card);
            result(done == 1 && !string.IsNullOrEmpty(text) ? text.Trim() : null);
            yield return null;
        }

        /// <summary>The end-of-mission card: ending, mission code and a few numbers. It holds no personal data.
        /// "Save picture" writes a PNG of the screen (card over the outpost) into the Pictures folder.</summary>
        public IEnumerator MissionCard(string title, string ending, string code, IList<string> facts, string badge, bool live)
        {
            VisualElement card = Card(title, badge, live ? "chip-live" : "chip-arch");
            card.Add(Text(ending, "h1"));
            Label codeLabel = Text("Mission code   " + code, "h1"); codeLabel.style.color = new Color(0.95f, 0.78f, 0.27f); codeLabel.style.marginTop = 6; codeLabel.style.marginBottom = 8; card.Add(codeLabel);
            foreach (string f in facts) card.Add(Text(f, "body"));
            Label note = Text("A friend can type this code under Replay history to fly the very same mission. This card holds no personal data.", "small"); card.Add(note);
            int done = 0; bool saving = false;
            var row = new VisualElement(); row.style.flexDirection = FlexDirection.Row; row.style.justifyContent = Justify.FlexEnd; row.style.marginTop = 12;
            var save = new Button(() => saving = true) { text = "Save picture" }; save.AddToClassList("btn"); save.style.marginRight = 10; row.Add(save);
            var ok = new Button(() => done = 1) { text = "Continue" }; ok.AddToClassList("btn"); ok.AddToClassList("btn-primary"); row.Add(ok);
            card.Add(row);
            yield return null;
            yield return AutoCapture("card");
            while (done == 0 && !Auto)
            {
                if (saving)
                {
                    saving = false;
                    string dir, path = null;
                    try
                    {
                        dir = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "PlutonyX");
                        if (string.IsNullOrEmpty(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures))) dir = System.IO.Path.Combine(Application.persistentDataPath, "cards");
                        System.IO.Directory.CreateDirectory(dir);
                        path = System.IO.Path.Combine(dir, "PlutonyX-" + code + ".png");
                    }
                    catch (Exception) { try { dir = System.IO.Path.Combine(Application.persistentDataPath, "cards"); System.IO.Directory.CreateDirectory(dir); path = System.IO.Path.Combine(dir, "PlutonyX-" + code + ".png"); } catch (Exception) { path = null; } }
                    if (path == null) { note.text = "The picture could not be saved on this computer."; }
                    else
                    {
                        row.style.visibility = Visibility.Hidden; note.text = "Play it yourself: type this code under Replay history. This card holds no personal data.";
                        yield return null; yield return null;
                        ScreenCapture.CaptureScreenshot(path);
                        yield return null; yield return null;
                        row.style.visibility = Visibility.Visible; note.text = "Saved: " + path;
                    }
                }
                if (Advance) done = 1;
                yield return null;
            }
            _center.Remove(card);
            yield return null;
        }

        public IEnumerator Info(string heading, IList<string> paragraphs, string button = "Continue", string chip = null, string chipClass = null, string footer = null, VisualElement extra = null)
        {
            VisualElement card = Card(heading, chip, chipClass);
            if (extra != null) card.Add(extra);
            var scroll = new ScrollView(ScrollViewMode.Vertical); scroll.style.flexShrink = 1;
            foreach (string p in paragraphs) if (!string.IsNullOrEmpty(p)) scroll.Add(Text(p, "body"));
            card.Add(scroll);
            if (!string.IsNullOrEmpty(footer)) card.Add(Text(footer, "small"));
            bool done = false;
            var b = new Button(() => done = true) { text = button }; b.AddToClassList("btn"); b.AddToClassList("btn-primary"); b.style.alignSelf = Align.FlexEnd; b.style.marginTop = 12;
            card.Add(b);
            yield return null;
            yield return AutoCapture("info");
            while (!done && !Advance && !Auto) yield return null;
            _center.Remove(card);
            yield return null;
        }

        /// <summary>A list of buttons; result = index chosen. Arrow keys / d-pad move, Enter / A selects, digits pick directly.</summary>
        public IEnumerator Menu(string heading, IList<string> options, IList<string> details, Action<int> result, string chip = null, string chipClass = null,
                                IList<bool> enabled = null, IList<string> hints = null, float timerSeconds = 0, int defaultIndex = -1, bool crisis = false, IList<string> intro = null)
        {
            VisualElement card = Card(heading, chip, chipClass, crisis);
            if (intro != null) foreach (string p in intro) card.Add(Text(p, "body"));
            VisualElement timerFill = null;
            if (timerSeconds > 0) { VisualElement tr = Box("timer-track"); timerFill = Box("timer-fill"); tr.Add(timerFill); card.Add(tr); }
            int chosen = -1, focus = -1;
            var buttons = new List<Button>();
            for (int i = 0; i < options.Count; i++)
            {
                int index = i;
                var b = new Button(() => chosen = index); b.AddToClassList("btn"); b.AddToClassList("choice");
                b.Add(Text((i + 1) + ".  " + options[i], "choice-label"));
                if (details != null && i < details.Count && !string.IsNullOrEmpty(details[i])) b.Add(Text(details[i], "choice-detail"));
                if (hints != null && i < hints.Count && !string.IsNullOrEmpty(hints[i])) b.Add(Text(hints[i], "choice-hint"));
                bool on = enabled == null || i >= enabled.Count || enabled[i];
                b.SetEnabled(on);
                card.Add(b); buttons.Add(b);
                if (on && focus < 0) focus = i;
            }
            float t = 0;
            yield return null;
            yield return AutoCapture(crisis ? "storm" : "choice");
            if (Auto) chosen = Mathf.Max(0, focus);
            while (chosen < 0)
            {
                int dy = MoveY();
                if (dy != 0 && buttons.Count > 0)
                {
                    for (int n = 0; n < buttons.Count; n++) { focus = (focus + dy + buttons.Count) % buttons.Count; if (buttons[focus].enabledSelf) break; }
                }
                for (int i = 0; i < buttons.Count; i++) buttons[i].EnableInClassList("focus", i == focus);
                int digit = DigitPressed();
                if (digit > 0 && digit <= buttons.Count && buttons[digit - 1].enabledSelf) chosen = digit - 1;
                if (Advance && focus >= 0 && buttons[focus].enabledSelf && dyHeld == 0) chosen = focus;
                if (timerSeconds > 0)
                {
                    t += Time.deltaTime;
                    timerFill.style.width = new Length(Mathf.Clamp01(1f - t / timerSeconds) * 100f, LengthUnit.Percent);
                    if (t >= timerSeconds) chosen = defaultIndex >= 0 ? defaultIndex : Mathf.Max(0, focus);
                }
                yield return null;
            }
            _center.Remove(card);
            if (Audio != null) Audio.Confirm();
            result(chosen);
            yield return null;
        }
        const int dyHeld = 0;

        // ------------------------------------------------------------------ pause and settings
        static readonly string[] QualityNames = { "Low", "Medium", "High", "Ultra" };
        IEnumerator PauseMenu()
        {
            Paused = true;
            VisualElement veil = Box("center"); veil.style.backgroundColor = new Color(0, 0, 0, 0.55f);
            VisualElement card = Box("panel", "card"); card.style.width = 720; veil.Add(card);
            card.Add(Text("Paused", "h1"));
            _root.Add(veil);
            int focus = 0; bool close = false, rebuild = true; var buttons = new List<Button>();
            while (!close)
            {
                if (rebuild)
                {
                    foreach (Button old in buttons) card.Remove(old);
                    buttons.Clear(); rebuild = false;
                    string[] labels = {
                        "Resume",
                        "Text size:  " + (PlayerPrefs.GetInt("largeText", 0) == 1 ? "Large" : "Normal"),
                        "Graphics:  " + QualityNames[Mathf.Clamp(PlayerPrefs.GetInt("quality", 3), 0, 3)],
                        "Display:  " + (Screen.fullScreen ? "Fullscreen" : "Window"),
                        "Volume:  " + Mathf.RoundToInt(AudioListener.volume * 100) + "%",
                        "Less motion:  " + (ReducedMotion ? "On" : "Off"),
                        "Quit to desktop" };
                    for (int i = 0; i < labels.Length; i++)
                    {
                        int index = i;
                        var b = new Button(() => { focus = index; PauseAction(index, ref close); rebuild = true; }) { text = labels[i] };
                        b.AddToClassList("btn"); card.Add(b); buttons.Add(b);
                    }
                }
                Keyboard k = Keyboard.current; Gamepad g = Gamepad.current;
                int dy = MoveY(); if (dy != 0) focus = (focus + dy + buttons.Count) % buttons.Count;
                for (int i = 0; i < buttons.Count; i++) buttons[i].EnableInClassList("focus", i == focus);
                if (_advanceConsumed) { PauseAction(focus, ref close); rebuild = true; }
                if ((k != null && k.escapeKey.wasPressedThisFrame) || (g != null && (g.startButton.wasPressedThisFrame || g.buttonEast.wasPressedThisFrame))) close = true;
                // Update() skips reading "continue" while paused, so read it here
                _advance = (k != null && (k.spaceKey.wasPressedThisFrame || k.enterKey.wasPressedThisFrame)) || (g != null && g.buttonSouth.wasPressedThisFrame);
                yield return null;
            }
            _root.Remove(veil);
            yield return null;
            Paused = false;
        }
        void PauseAction(int index, ref bool close)
        {
            if (Audio != null) Audio.Click();
            switch (index)
            {
                case 0: close = true; break;
                case 1: PlayerPrefs.SetInt("largeText", 1 - PlayerPrefs.GetInt("largeText", 0)); ApplyTextSize(); break;
                case 2: { int q = (PlayerPrefs.GetInt("quality", 3) + 3) % 4; PlayerPrefs.SetInt("quality", q); if (World != null) World.ApplyQuality(q); break; }
                case 3:
                    if (Screen.fullScreen) Screen.SetResolution(1600, 900, FullScreenMode.Windowed);
                    else Screen.SetResolution(Display.main.systemWidth, Display.main.systemHeight, FullScreenMode.FullScreenWindow);
                    break;
                case 4: { float v = AudioListener.volume <= 0.05f ? 1f : AudioListener.volume - 0.25f; AudioListener.volume = Mathf.Max(0f, v); PlayerPrefs.SetFloat("volume", AudioListener.volume); break; }
                case 5: ReducedMotion = !ReducedMotion; PlayerPrefs.SetInt("reducedMotion", ReducedMotion ? 1 : 0); if (World != null) World.ReducedMotion = ReducedMotion; break;
                case 6: PlayerPrefs.Save(); Application.Quit(); break;
            }
            PlayerPrefs.Save();
        }
        public void ApplyTextSize()
        {
            bool large = PlayerPrefs.GetInt("largeText", 0) == 1;
            Document.panelSettings.referenceResolution = large ? new Vector2Int(1440, 810) : new Vector2Int(1680, 945);
        }

        // ------------------------------------------------------------------ events
        public IEnumerator Event(EventView e, float timerSeconds, Action<string> chosen)
        {
            yield return Say(e.Lines);
            if (e.Choices.Count == 0) { chosen(null); yield break; }
            var labels = new List<string>(); var details = new List<string>(); var hints = new List<string>(); var enabled = new List<bool>();
            int def = -1;
            for (int i = 0; i < e.Choices.Count; i++)
            {
                ChoiceView c = e.Choices[i];
                labels.Add(c.Label);
                details.Add(c.Enabled ? c.Detail : c.Detail + "  (" + c.NeedsText + ")");
                hints.Add(c.Hint); enabled.Add(c.Enabled);
                if (c.Id == e.DefaultChoice && c.Enabled) def = i;
            }
            int index = 0;
            string heading = e.IsCrisis ? e.Title + "   (" + (e.StepIndex + 1) + " of " + e.StepCount + ")" : e.Title;
            yield return Menu(heading, labels, details, i => index = i, e.RealData.Count > 0 ? "REAL NASA DATA" : null, "chip-real", enabled, hints,
                              timerSeconds, def, e.IsCrisis);
            chosen(e.Choices[index].Id);
        }

        // ------------------------------------------------------------------ the power board
        public IEnumerator PowerBoard(Mission m, Action<Allocation> done)
        {
            Allocation a = m.Alloc.Clone();
            VisualElement card = Card("Power board  ·  Sol " + m.Sol, null, null);
            Label budget = Text("", "body"); card.Add(budget);
            card.Add(Text("Water " + N(m.Get("water")) + "   ·   Food " + N(m.Get("food")) + "   ·   Plants " + N(m.Get("plants")) + "   ·   Science " + N(m.Get("science")) +
                          "   ·   Crew health " + N(m.Get("health")) + "   ·   Morale " + N(m.Get("morale")), "small"));
            JsonValue sys = _design.Balance["systems"];
            string[] ids = { "life", "garden", "shield", "rover" };
            var levelLabels = new Label[4]; var effects = new Label[4]; var pips = new List<VisualElement>[4];
            int focusRow = 0; bool confirm = false;
            for (int r = 0; r < 4; r++)
            {
                int row = r; string id = ids[r];
                VisualElement line = Box("sys-row");
                line.Add(Text(sys[id]["name"].Str(id), "sys-name"));
                var minus = new Button(() => { a.Set(id, a.Get(id) - 1); focusRow = row; if (Audio != null) Audio.Click(); }) { text = "−" }; minus.AddToClassList("btn"); minus.AddToClassList("pm");
                var plus = new Button(() => { a.Set(id, a.Get(id) + 1); if (!m.CanAfford(a)) a.Set(id, a.Get(id) - 1); focusRow = row; if (Audio != null) Audio.Click(); }) { text = "+" }; plus.AddToClassList("btn"); plus.AddToClassList("pm");
                line.Add(minus);
                VisualElement pipRow = Box("row"); pips[r] = new List<VisualElement>();
                for (int p = 0; p < 3; p++) { VisualElement pip = Box("pip"); pipRow.Add(pip); pips[r].Add(pip); }
                pipRow.style.marginLeft = 10;
                line.Add(pipRow);
                levelLabels[r] = Text("", "sys-level"); line.Add(levelLabels[r]);
                line.Add(plus);
                effects[r] = Text("", "sys-effect"); line.Add(effects[r]);
                card.Add(line);
            }
            Label hint = Text("", "choice-hint"); hint.style.marginTop = 8; card.Add(hint);
            VisualElement buttons = Box("row"); buttons.style.justifyContent = Justify.FlexEnd; buttons.style.marginTop = 10;
            if (m.Hints)
            {
                var plan = new Button(() => { a = PipPlan(m); }) { text = "PIP's plan" }; plan.AddToClassList("btn"); buttons.Add(plan);
            }
            var ok = new Button(() => confirm = true) { text = "Confirm" }; ok.AddToClassList("btn"); ok.AddToClassList("btn-primary"); buttons.Add(ok);
            card.Add(buttons);
            card.Add(Text("Arrow keys or d-pad: choose and change. Enter: confirm.", "small"));

            yield return null;
            bool autoShot = false;
            while (!confirm)
            {
                if (Auto && !autoShot) { autoShot = true; a = PipPlan(m); }
                else if (Auto) { yield return AutoCapture("powerboard"); confirm = true; }
                int dy = MoveY(), dx = MoveX();
                if (dy != 0) focusRow = (focusRow + dy + 4) % 4;
                if (dx != 0) { string id = ids[focusRow]; a.Set(id, a.Get(id) + dx); if (!m.CanAfford(a)) a.Set(id, a.Get(id) - 1); if (Audio != null) Audio.Click(); }
                if (Advance) confirm = true;

                double after = m.PowerAfter(a);
                budget.text = "Battery " + N(m.Get("power")) + "  +  sunlight " + N(m.SolarToday) + "  −  heat and lights " + N(m.BaseLoadToday) + "  −  machines " + N(m.Cost(a)) +
                              "   =   " + N(after) + " left tonight" + (after <= 0 ? "   (an empty battery means a freezing night)" : "");
                Dictionary<string, double> pv = m.Preview(a);
                for (int r = 0; r < 4; r++)
                {
                    int lvl = a.Get(ids[r]);
                    levelLabels[r].text = LevelNames[lvl];
                    for (int p = 0; p < 3; p++) pips[r][p].EnableInClassList("pip-on", p < lvl);
                    levelLabels[r].parent.style.backgroundColor = r == focusRow ? new Color(1, 1, 1, 0.06f) : new Color(0, 0, 0, 0);
                }
                effects[0].text = Arrow("Air", pv["air"]);
                effects[1].text = m.Flag("plantsDead") ? "The garden is gone" : Arrow("Plants", pv["plants"]) + "   " + Arrow("Water", pv["water"]);
                effects[2].text = Arrow("Shield", pv["shield"]);
                effects[3].text = m.Flag("sampleSecured") ? "The core is aboard" : m.Flag("sampleLost") ? "The core is lost" : Arrow("Science", pv["science"]);
                hint.text = !m.Hints ? "" :
                    m.Get("air") + pv["air"] < 35 ? _design.Dialogue["hints"]["alloc.lowAir"].Str() :
                    after <= 5 ? _design.Dialogue["hints"]["alloc.lowPower"].Str() :
                    !m.Flag("plantsDead") && m.Get("plants") + pv["plants"] < 20 ? _design.Dialogue["hints"]["alloc.plantsWilting"].Str() :
                    !m.Flag("stormDone") && m.Sol >= 4 && m.Get("shield") < 50 ? _design.Dialogue["hints"]["alloc.stormWatch"].Str() : _design.Dialogue["hints"]["alloc.balanced"].Str();
                ok.SetEnabled(after >= 0);
                if (after < 0) confirm = false;
                yield return null;
            }
            _center.Remove(card);
            if (Audio != null) Audio.Confirm();
            done(a);
            yield return null;
        }
        static Allocation PipPlan(Mission m)
        {
            var a = new Allocation(m.Get("air") < 50 ? 3 : 2, m.Flag("plantsDead") ? 0 : 2, m.Flag("stormDone") && m.Today.StormLevel == 0 ? 0 : 1, m.Flag("sampleSecured") || m.Flag("sampleLost") ? 0 : 2);
            string[] order = { "rover", "shield", "garden", "life" };
            for (int g = 0; g < 12 && m.PowerAfter(a) < 10; g++) foreach (string s in order) if (a.Get(s) > (s == "life" ? 1 : 0)) { a.Set(s, a.Get(s) - 1); break; }
            return a;
        }
        static string N(double v) { return Math.Round(v).ToString("0", CultureInfo.InvariantCulture); }
        static string Arrow(string name, double delta)
        {
            if (Math.Abs(delta) < 0.5) return name + "  holds";
            return name + (delta > 0 ? "  ▲ +" : "  ▼ ") + Math.Round(delta).ToString("0", CultureInfo.InvariantCulture);
        }

        // ------------------------------------------------------------------ title
        public IEnumerator Title(string title, string subtitle, string tagline, IList<string> options, Action<int> result, string badge, bool live, string footer)
        {
            VisualElement col = new VisualElement(); col.style.alignItems = Align.Center; col.style.width = new Length(100, LengthUnit.Percent);
            col.Add(Text(title, "title")); col.Add(Text(subtitle.ToUpperInvariant(), "subtitle")); col.Add(Text(tagline, "tagline"));
            Label b = Text(badge, "chip"); b.AddToClassList(live ? "chip-live" : "chip-arch"); b.style.alignSelf = Align.Center; b.style.marginBottom = 16; col.Add(b);
            int chosen = -1, focus = 0; var buttons = new List<Button>();
            for (int i = 0; i < options.Count; i++)
            {
                int index = i;
                var btn = new Button(() => chosen = index) { text = options[i] }; btn.AddToClassList("btn"); if (i == 0) btn.AddToClassList("btn-primary");
                btn.style.width = 460; col.Add(btn); buttons.Add(btn);
            }
            col.Add(Text(footer, "small"));
            _center.Add(col);
            yield return null;
            yield return AutoCapture("title");
            if (Auto) chosen = AutoTitleIndex;
            while (chosen < 0)
            {
                int dy = MoveY(); if (dy != 0) focus = (focus + dy + buttons.Count) % buttons.Count;
                for (int i = 0; i < buttons.Count; i++) buttons[i].EnableInClassList("focus", i == focus);
                if (Advance) chosen = focus;
                yield return null;
            }
            _center.Remove(col);
            result(chosen);
            yield return null;
        }
    }
}
