// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Keys.cs — one place that reads the keyboard. A key counts if EITHER Unity input system sees it (the Input System
// package or the classic Input Manager), so a key that one system misses on some machine still works.
// With -keylog on the command line every key press is written to Player.log, for diagnosing input problems.
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace PlutonyX.Game
{
    public static class Keys
    {
        static bool _legacyOk = true;
        static readonly Dictionary<Key, KeyCode> Map = new Dictionary<Key, KeyCode>
        {
            { Key.UpArrow, KeyCode.UpArrow }, { Key.DownArrow, KeyCode.DownArrow }, { Key.LeftArrow, KeyCode.LeftArrow }, { Key.RightArrow, KeyCode.RightArrow },
            { Key.W, KeyCode.W }, { Key.A, KeyCode.A }, { Key.S, KeyCode.S }, { Key.D, KeyCode.D }, { Key.Q, KeyCode.Q }, { Key.E, KeyCode.E }, { Key.T, KeyCode.T },
            { Key.Space, KeyCode.Space }, { Key.Enter, KeyCode.Return }, { Key.NumpadEnter, KeyCode.KeypadEnter }, { Key.Escape, KeyCode.Escape },
            { Key.Backspace, KeyCode.Backspace }, { Key.Tab, KeyCode.Tab }, { Key.LeftShift, KeyCode.LeftShift }, { Key.RightShift, KeyCode.RightShift },
            { Key.Digit1, KeyCode.Alpha1 }, { Key.Digit2, KeyCode.Alpha2 }, { Key.Digit3, KeyCode.Alpha3 }, { Key.Digit4, KeyCode.Alpha4 }, { Key.Digit5, KeyCode.Alpha5 }, { Key.Digit6, KeyCode.Alpha6 },
        };

        public static bool Down(Key key)
        {
            Keyboard k = Keyboard.current;
            if (k != null && k[key].wasPressedThisFrame) return true;
            KeyCode c; return Map.TryGetValue(key, out c) && Legacy(c, true);
        }

        public static bool Held(Key key)
        {
            Keyboard k = Keyboard.current;
            if (k != null && k[key].isPressed) return true;
            KeyCode c; return Map.TryGetValue(key, out c) && Legacy(c, false);
        }

        static bool Legacy(KeyCode c, bool down)
        {
            if (!_legacyOk) return false;
            try { return down ? Input.GetKeyDown(c) : Input.GetKey(c); }
            catch (InvalidOperationException) { _legacyOk = false; return false; }   // classic input switched off in this build
        }

        // ---- diagnostics
        static readonly bool LogOn = Array.IndexOf(Environment.GetCommandLineArgs(), "-keylog") >= 0;
        static int _logged;
        public static void LogFrame()
        {
            if (!LogOn || _logged > 400) return;
            string fromNew = "";
            Keyboard k = Keyboard.current;
            if (k != null && k.anyKey.wasPressedThisFrame) foreach (KeyControl kc in k.allKeys) if (kc != null && kc.wasPressedThisFrame) fromNew += kc.keyCode + " ";
            string fromOld = "";
            if (_legacyOk) { try { if (Input.anyKeyDown) foreach (KeyValuePair<Key, KeyCode> p in Map) if (Input.GetKeyDown(p.Value)) fromOld += p.Value + " "; } catch (InvalidOperationException) { _legacyOk = false; } }
            if (fromNew.Length == 0 && fromOld.Length == 0) return;
            _logged++;
            Debug.Log("[PlutonyX] key  input-system: " + (fromNew.Length > 0 ? fromNew : "-") + "  classic: " + (fromOld.Length > 0 ? fromOld : "-") + "  focus: " + Application.isFocused);
        }
    }
}
