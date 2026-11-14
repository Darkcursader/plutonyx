// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Json.cs — a small dependency-free JSON reader for the shared design and data files.
// The simulation core must run identically inside Unity and in the command-line test harness,
// so it does not depend on any JSON package.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace PlutonyX.Core
{
    public enum JsonKind { Null, Bool, Number, String, Array, Object }

    /// <summary>One JSON value. Missing keys and out-of-range indexes return JsonValue.Null, never throw.</summary>
    public sealed class JsonValue
    {
        public static readonly JsonValue Null = new JsonValue(JsonKind.Null);

        public readonly JsonKind Kind;
        readonly bool _bool;
        readonly double _num;
        readonly string _str;
        readonly List<JsonValue> _items;
        readonly List<string> _keys;                       // insertion order
        readonly Dictionary<string, JsonValue> _map;

        JsonValue(JsonKind k) { Kind = k; }
        public JsonValue(bool b) { Kind = JsonKind.Bool; _bool = b; }
        public JsonValue(double n) { Kind = JsonKind.Number; _num = n; }
        public JsonValue(string s) { Kind = JsonKind.String; _str = s; }
        public JsonValue(List<JsonValue> items) { Kind = JsonKind.Array; _items = items; }
        public JsonValue(List<string> keys, Dictionary<string, JsonValue> map) { Kind = JsonKind.Object; _keys = keys; _map = map; }

        public bool IsNull { get { return Kind == JsonKind.Null; } }
        public bool IsObject { get { return Kind == JsonKind.Object; } }
        public bool IsArray { get { return Kind == JsonKind.Array; } }
        public bool IsNumber { get { return Kind == JsonKind.Number; } }
        public bool IsString { get { return Kind == JsonKind.String; } }

        public JsonValue this[string key]
        {
            get { JsonValue v; return _map != null && _map.TryGetValue(key, out v) ? v : Null; }
        }
        public JsonValue this[int index]
        {
            get { return _items != null && index >= 0 && index < _items.Count ? _items[index] : Null; }
        }
        public bool Has(string key) { return _map != null && _map.ContainsKey(key); }
        public int Count { get { return _items != null ? _items.Count : _keys != null ? _keys.Count : 0; } }
        public IList<JsonValue> Items { get { return _items ?? (IList<JsonValue>)EmptyList; } }
        public IList<string> Keys { get { return _keys ?? (IList<string>)EmptyKeys; } }
        static readonly List<JsonValue> EmptyList = new List<JsonValue>();
        static readonly List<string> EmptyKeys = new List<string>();

        public double Num(double fallback = 0) { return Kind == JsonKind.Number ? _num : Kind == JsonKind.Bool ? (_bool ? 1 : 0) : fallback; }
        public int Int(int fallback = 0) { return Kind == JsonKind.Number ? (int)Math.Round(_num) : fallback; }
        public string Str(string fallback = "") { return Kind == JsonKind.String ? _str : Kind == JsonKind.Number ? _num.ToString(CultureInfo.InvariantCulture) : fallback; }
        public bool Bool(bool fallback = false) { return Kind == JsonKind.Bool ? _bool : Kind == JsonKind.Number ? _num != 0 : fallback; }

        public override string ToString() { return Kind == JsonKind.String ? _str : Kind.ToString(); }

        // ------------------------------------------------------------------ parser
        public static JsonValue Parse(string text)
        {
            if (text == null) throw new ArgumentNullException("text");
            int i = 0;
            if (text.Length > 0 && text[0] == '﻿') i = 1;
            JsonValue v = ReadValue(text, ref i);
            SkipWs(text, ref i);
            if (i != text.Length) throw new FormatException("JSON: unexpected text at position " + i);
            return v;
        }

        static void SkipWs(string s, ref int i)
        {
            while (i < s.Length) { char c = s[i]; if (c == ' ' || c == '\n' || c == '\r' || c == '\t') i++; else break; }
        }

        static JsonValue ReadValue(string s, ref int i)
        {
            SkipWs(s, ref i);
            if (i >= s.Length) throw new FormatException("JSON: unexpected end");
            char c = s[i];
            if (c == '{')
            {
                i++;
                var keys = new List<string>(); var map = new Dictionary<string, JsonValue>();
                SkipWs(s, ref i);
                if (i < s.Length && s[i] == '}') { i++; return new JsonValue(keys, map); }
                while (true)
                {
                    SkipWs(s, ref i);
                    string key = ReadString(s, ref i);
                    SkipWs(s, ref i);
                    if (i >= s.Length || s[i] != ':') throw new FormatException("JSON: expected ':' at position " + i);
                    i++;
                    JsonValue val = ReadValue(s, ref i);
                    if (!map.ContainsKey(key)) keys.Add(key);
                    map[key] = val;
                    SkipWs(s, ref i);
                    if (i < s.Length && s[i] == ',') { i++; continue; }
                    if (i < s.Length && s[i] == '}') { i++; break; }
                    throw new FormatException("JSON: expected ',' or '}' at position " + i);
                }
                return new JsonValue(keys, map);
            }
            if (c == '[')
            {
                i++;
                var items = new List<JsonValue>();
                SkipWs(s, ref i);
                if (i < s.Length && s[i] == ']') { i++; return new JsonValue(items); }
                while (true)
                {
                    items.Add(ReadValue(s, ref i));
                    SkipWs(s, ref i);
                    if (i < s.Length && s[i] == ',') { i++; continue; }
                    if (i < s.Length && s[i] == ']') { i++; break; }
                    throw new FormatException("JSON: expected ',' or ']' at position " + i);
                }
                return new JsonValue(items);
            }
            if (c == '"') return new JsonValue(ReadString(s, ref i));
            if (c == 't' && string.CompareOrdinal(s, i, "true", 0, 4) == 0) { i += 4; return new JsonValue(true); }
            if (c == 'f' && string.CompareOrdinal(s, i, "false", 0, 5) == 0) { i += 5; return new JsonValue(false); }
            if (c == 'n' && string.CompareOrdinal(s, i, "null", 0, 4) == 0) { i += 4; return Null; }
            int start = i;
            while (i < s.Length) { char d = s[i]; if ((d >= '0' && d <= '9') || d == '-' || d == '+' || d == '.' || d == 'e' || d == 'E') i++; else break; }
            if (i == start) throw new FormatException("JSON: unexpected character '" + c + "' at position " + i);
            return new JsonValue(double.Parse(s.Substring(start, i - start), NumberStyles.Float, CultureInfo.InvariantCulture));
        }

        static string ReadString(string s, ref int i)
        {
            if (i >= s.Length || s[i] != '"') throw new FormatException("JSON: expected string at position " + i);
            i++;
            StringBuilder sb = null; int start = i;
            while (i < s.Length)
            {
                char c = s[i];
                if (c == '"') { string r = sb == null ? s.Substring(start, i - start) : sb.Append(s, start, i - start).ToString(); i++; return r; }
                if (c == '\\')
                {
                    if (sb == null) sb = new StringBuilder();
                    sb.Append(s, start, i - start);
                    i++;
                    if (i >= s.Length) break;
                    char e = s[i];
                    switch (e)
                    {
                        case 'n': sb.Append('\n'); break;
                        case 't': sb.Append('\t'); break;
                        case 'r': sb.Append('\r'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'u':
                            sb.Append((char)int.Parse(s.Substring(i + 1, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            i += 4; break;
                        default: sb.Append(e); break;      // \" \\ \/
                    }
                    i++; start = i; continue;
                }
                i++;
            }
            throw new FormatException("JSON: unterminated string");
        }
    }
}
