// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Rng.cs — mulberry32, the deterministic generator both editions use (shared/design/SCHEMA.md, section 6).
namespace PlutonyX.Core
{
    public sealed class Rng
    {
        uint _state;
        public Rng(uint seed) { _state = seed; }
        public uint State { get { return _state; } }

        /// <summary>Next value in [0, 1). Same sequence as the JavaScript reference for the same seed.</summary>
        public double Next()
        {
            unchecked
            {
                _state += 0x6D2B79F5u;
                uint t = _state;
                t = (t ^ (t >> 15)) * (1u | t);
                t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }
        public int Int(int n) { return (int)(Next() * n); }

        /// <summary>Mission code = WINDOWID-SEED in base 36, upper case. No personal data.</summary>
        public static string ToBase36(uint value)
        {
            const string digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            if (value == 0) return "0";
            var chars = new char[8]; int n = 0;
            while (value > 0) { chars[n++] = digits[(int)(value % 36)]; value /= 36; }
            System.Array.Reverse(chars, 0, n);
            return new string(chars, 0, n);
        }
        public static bool TryFromBase36(string text, out uint value)
        {
            value = 0; if (string.IsNullOrEmpty(text) || text.Length > 7) return false;
            ulong v = 0;
            foreach (char raw in text.ToUpperInvariant())
            {
                int d = raw >= '0' && raw <= '9' ? raw - '0' : raw >= 'A' && raw <= 'Z' ? raw - 'A' + 10 : -1;
                if (d < 0) return false;
                v = v * 36 + (ulong)d;
            }
            if (v > uint.MaxValue) return false;
            value = (uint)v; return true;
        }
    }
}
