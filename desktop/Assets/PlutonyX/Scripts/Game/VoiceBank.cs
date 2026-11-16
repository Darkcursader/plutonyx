// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// VoiceBank.cs — plays the recorded crew voices (SI-generated with ElevenLabs, see shared/art/SI_LOG.md) for dialogue
// lines. Recordings live in StreamingAssets/voices/<key>.pcm (raw 16-bit mono PCM at 24 kHz), where <key> is the first 16 hex digits of the SHA-1 of
// the line's letters and digits in lower case (same rule as shared/scripts/make-voices.mjs). Lines without a
// recording (the ones with live numbers) fall back to the optional read-aloud. Everything is a local file: no
// network, nothing for a firewall to block, same on Windows and macOS.
using System.Collections;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class VoiceBank : MonoBehaviour
    {
        static VoiceBank _i;
        AudioSource _src; Coroutine _job;
        public static bool Enabled { get { return PlayerPrefs.GetInt("voices", 1) == 1; } }
        public static void SetEnabled(bool on) { PlayerPrefs.SetInt("voices", on ? 1 : 0); PlayerPrefs.Save(); if (!on) Stop(); }

        static VoiceBank I
        {
            get
            {
                if (_i == null)
                {
                    var go = new GameObject("VoiceBank"); DontDestroyOnLoad(go);
                    _i = go.AddComponent<VoiceBank>(); _i._src = go.AddComponent<AudioSource>();
                    _i._src.playOnAwake = false; _i._src.spatialBlend = 0f; _i._src.priority = 0;
                }
                return _i;
            }
        }

        public static string Key(string say)
        {
            var sb = new StringBuilder(say.Length);
            foreach (char c in say.ToLowerInvariant()) if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) sb.Append(c);
            using (var sha = SHA1.Create())
            {
                byte[] h = sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
                var hex = new StringBuilder(16); for (int i = 0; i < 8; i++) hex.Append(h[i].ToString("x2"));
                return hex.ToString();
            }
        }

        static string PathFor(string say) { return Path.Combine(Application.streamingAssetsPath, "voices", Key(say) + ".pcm"); }

        /// <summary>Plays the recording of this line if there is one. Returns false when the line has no recording.</summary>
        public static bool Play(string say)
        {
            if (string.IsNullOrEmpty(say) || !Enabled || Narrator.Muted) return false;
            string p = PathFor(say);
            if (!File.Exists(p)) return false;
            var me = I; if (me._job != null) me.StopCoroutine(me._job); me._src.Stop();
            me._job = null; me.PlayFile(p);
            return true;
        }

        public static void Stop() { if (_i != null) { if (_i._job != null) _i.StopCoroutine(_i._job); _i._src.Stop(); } }

        void PlayFile(string file)
        {
            byte[] b; try { b = File.ReadAllBytes(file); } catch (System.Exception e) { Debug.LogWarning("[PlutonyX] voice failed: " + e.Message); return; }
            int n = b.Length / 2; var data = new float[n];
            for (int i = 0; i < n; i++) data[i] = (short)(b[2 * i] | (b[2 * i + 1] << 8)) / 32768f;
            var clip = AudioClip.Create("voice", Mathf.Max(1, n), 1, 24000, false); clip.SetData(data, 0);
            if (_src.clip != null) Destroy(_src.clip);
            _src.clip = clip; _src.volume = 1f; _src.Play();
        }
    }
}
