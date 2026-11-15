// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Narrator.cs — optional read-aloud. It uses the computer's own built-in speech voice (macOS `say`, Windows speech
// through PowerShell), so no voice recordings ship with the game and no voice belongs to a real person or a child.
// Off by default; switched on in the pause menu (Esc). Each new line cancels the one still being read.
using System;
using System.Diagnostics;
using System.Text;
using UnityEngine;

namespace PlutonyX.Game
{
    public static class Narrator
    {
        public static bool Enabled { get; private set; }
        public static bool Available { get; private set; } = true;
        public static bool Muted;                        // set by autoplay and capture runs
        static Process _mac, _win;
        static string _last = "";

        // test switch: -narratortest turns read-aloud on for this run at zero volume and logs every line (works during autoplay)
        static readonly bool Test = Array.IndexOf(Environment.GetCommandLineArgs(), "-narratortest") >= 0;
        public static int Spoken { get; private set; }

        public static void Load() { Enabled = Test || PlayerPrefs.GetInt("narrator", 0) == 1; }

        public static void SetEnabled(bool on)
        {
            Enabled = on; PlayerPrefs.SetInt("narrator", on ? 1 : 0); PlayerPrefs.Save();
            if (!on) Stop();
        }

        /// <summary>Reads the text aloud (if read-aloud is on). Repeating the same text right away is ignored.</summary>
        public static void Speak(string text, bool force = false)
        {
            if ((!Enabled && !force) || (Muted && !Test) || !Available || AudioListener.volume <= 0.01f) return;
            string clean = Clean(text);
            if (clean.Length == 0 || (clean == _last && !force)) return;
            _last = clean; Spoken++;
            if (Test) UnityEngine.Debug.Log("[PlutonyX] read-aloud #" + Spoken + ": " + (clean.Length > 90 ? clean.Substring(0, 90) + "..." : clean));
            try
            {
                if (Application.platform == RuntimePlatform.OSXPlayer || Application.platform == RuntimePlatform.OSXEditor) SpeakMac(clean);
                else if (Application.platform == RuntimePlatform.WindowsPlayer || Application.platform == RuntimePlatform.WindowsEditor) SpeakWindows(clean);
                else Available = false;
            }
            catch (Exception e) { Available = false; UnityEngine.Debug.LogWarning("[PlutonyX] read-aloud unavailable: " + e.Message); }
        }

        public static void Stop()
        {
            _last = "";
            try { if (_mac != null && !_mac.HasExited) _mac.Kill(); } catch (Exception) { }
            _mac = null;
            try { if (_win != null && !_win.HasExited) _win.StandardInput.WriteLine(""); } catch (Exception) { }
        }

        public static void Shutdown()
        {
            Stop();
            try { if (_win != null && !_win.HasExited) { _win.StandardInput.Close(); _win.Kill(); } } catch (Exception) { }
            _win = null;
        }

        static void SpeakMac(string text)
        {
            try { if (_mac != null && !_mac.HasExited) _mac.Kill(); } catch (Exception) { }
            var si = new ProcessStartInfo("/usr/bin/say", "-r 175 -f -") { UseShellExecute = false, RedirectStandardInput = true, CreateNoWindow = true };
            _mac = Process.Start(si);
            float vol = Test ? 0f : Mathf.Clamp01(AudioListener.volume);
            _mac.StandardInput.Write("[[volm " + vol.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture) + "]] " + text);
            _mac.StandardInput.Close();
        }

        // One PowerShell process stays open and reads lines: each line cancels what is being read and starts the new one.
        const string WinScript =
            "Add-Type -AssemblyName System.Speech\n" +
            "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer\n" +
            "$s.Rate = -1\n" +
            "while (($l = [Console]::In.ReadLine()) -ne $null) {\n" +
            "  $s.SpeakAsyncCancelAll()\n" +
            "  if ($l.Length -gt 4) { $v = [int]$l.Substring(0,3); $s.Volume = [Math]::Max(0,[Math]::Min(100,$v)); [void]$s.SpeakAsync($l.Substring(4)) }\n" +
            "}\n";

        static void SpeakWindows(string text)
        {
            if (_win == null || _win.HasExited)
            {
                string encoded = Convert.ToBase64String(Encoding.Unicode.GetBytes(WinScript));
                string exe = System.IO.Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe");
                if (!System.IO.File.Exists(exe)) exe = "powershell.exe";
                var si = new ProcessStartInfo(exe, "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand " + encoded)
                { UseShellExecute = false, RedirectStandardInput = true, CreateNoWindow = true };
                _win = Process.Start(si);
            }
            int vol = Test ? 0 : Mathf.RoundToInt(Mathf.Clamp01(AudioListener.volume) * 100f);
            _win.StandardInput.WriteLine(vol.ToString("000") + "|" + text);
            _win.StandardInput.Flush();
        }

        /// <summary>Plain ASCII sentence for the speech engine: no markup, symbols read as words, one line.</summary>
        static string Clean(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            var sb = new StringBuilder(text.Length + 16); bool tag = false;
            foreach (char ch in text)
            {
                if (ch == '<') { tag = true; continue; }
                if (tag) { if (ch == '>') tag = false; continue; }
                switch (ch)
                {
                    case '·': case '•': case '|': sb.Append(", "); break;
                    case '▲': sb.Append(" up "); break;
                    case '▼': sb.Append(" down "); break;
                    case 'μ': case 'µ': sb.Append("micro"); break;
                    case '°': sb.Append(" degrees"); break;
                    case '–': case '—': case '−': sb.Append(" - "); break;
                    case '’': case '‘': sb.Append('\''); break;
                    case '“': case '”': sb.Append('"'); break;
                    case '²': sb.Append(" squared"); break;
                    case '\n': case '\r': case '\t': sb.Append(". "); break;
                    case '[': case ']': sb.Append(' '); break;    // never let text trigger speech-engine commands
                    default: if (ch >= 32 && ch < 127) sb.Append(ch); else if (char.IsLetterOrDigit(ch)) sb.Append(ch); else sb.Append(' '); break;
                }
            }
            string s = sb.ToString();
            while (s.Contains("  ")) s = s.Replace("  ", " ");
            while (s.Contains(", ,")) s = s.Replace(", ,", ",");
            s = s.Replace(" ,", ",").Replace(" .", ".").Replace("?.", "?").Replace("!.", "!").Replace(":.", ":").Replace(",.", ".");
            while (s.Contains("..")) s = s.Replace("..", ".");
            return s.Trim(' ', ',', '.').Length == 0 ? "" : s.Trim();
        }
    }
}
