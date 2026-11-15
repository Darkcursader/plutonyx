// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// AudioDirector.cs — every sound in the game is synthesised here in code at start-up (no audio files, no licences,
// no voices). Wind, habitat hum, an adaptive two-layer score (calm / danger), a Geiger counter that follows the
// storm, and interface sounds. SI-generated audio: acknowledged in the credits and README.
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class AudioDirector : MonoBehaviour
    {
        const int Rate = 44100;
        AudioSource _wind, _hum, _calm, _tense, _sfx, _geiger;
        AudioClip _click, _confirm, _alarm, _tick, _message, _advance, _rumble;
        float _dust, _storm, _danger, _night;
        float _alarmTimer;
        System.Random _rnd = new System.Random(7);

        public float Master { get { return AudioListener.volume; } set { AudioListener.volume = Mathf.Clamp01(value); } }

        void Awake()
        {
            Master = PlayerPrefs.GetFloat("volume", 0.8f);
            _wind = Loop("Wind", Wind(8f), 0f);
            _hum = Loop("Habitat hum", Hum(4f), 0.05f);
            _calm = Loop("Score calm", Pad(16f, new[] { 110f, 164.81f, 220f, 246.94f, 329.63f }, 0.9f), 0f);
            _tense = Loop("Score danger", Pad(8f, new[] { 73.42f, 103.83f, 146.83f, 207.65f }, 2.6f), 0f);
            _sfx = Source("Interface"); _geiger = Source("Geiger");
            _click = Blip(new[] { 720f }, 0.05f, 0.25f);
            _advance = Blip(new[] { 520f }, 0.035f, 0.12f);
            _confirm = Blip(new[] { 523.25f, 783.99f }, 0.16f, 0.3f);
            _message = Blip(new[] { 659.25f, 987.77f, 1318.5f }, 0.14f, 0.22f);
            _alarm = Blip(new[] { 587.33f, 587.33f, 587.33f }, 0.22f, 0.3f, true);
            _tick = Tick();
            _rumble = RumbleClip(14f);
        }

        AudioSource Source(string name)
        {
            var go = new GameObject(name); go.transform.SetParent(transform, false);
            var s = go.AddComponent<AudioSource>(); s.playOnAwake = false; s.spatialBlend = 0f; return s;
        }
        AudioSource Loop(string name, AudioClip clip, float volume)
        {
            AudioSource s = Source(name); s.clip = clip; s.loop = true; s.volume = volume; s.Play(); return s;
        }

        // ------------------------------------------------------------------ state
        public void SetWorld(float dust, float storm, float night) { _dust = dust; _storm = storm; _night = night; }
        public void SetDanger(float danger) { _danger = Mathf.Clamp01(danger); }
        public void Click() { _sfx.PlayOneShot(_click); }
        public void Advance() { _sfx.PlayOneShot(_advance, 0.6f); }
        public void Confirm() { _sfx.PlayOneShot(_confirm); }
        public void Message() { _sfx.PlayOneShot(_message); }
        public void Alarm() { _sfx.PlayOneShot(_alarm); }
        public void Rumble() { _sfx.PlayOneShot(_rumble, 1f); }

        /// <summary>Rocket engine: deep filtered noise that swells at ignition and fades as the ship climbs away.</summary>
        AudioClip RumbleClip(float seconds)
        {
            int n = (int)(seconds * Rate); var d = new float[n]; float lp = 0f, lp2 = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)Rate, white = (float)_rnd.NextDouble() * 2f - 1f;
                lp += (white - lp) * 0.06f; lp2 += (lp - lp2) * 0.12f;
                float env = Mathf.Clamp01(t / 2f) * Mathf.Clamp01((seconds - t) / 8f);
                d[i] = Mathf.Clamp((lp2 * 9f + Mathf.Sin(2 * Mathf.PI * 38f * t) * 0.25f) * env, -1f, 1f) * 0.8f;
            }
            return Make("rumble", d);
        }

        void Update()
        {
            float dt = Time.unscaledDeltaTime, k = 1f - Mathf.Exp(-dt * 0.8f);
            float tension = Mathf.Max(_danger, _storm);
            _wind.volume = Mathf.Lerp(_wind.volume, 0.10f + _dust * 0.5f, k);
            _wind.pitch = Mathf.Lerp(_wind.pitch, 0.9f + _dust * 0.5f, k);
            _calm.volume = Mathf.Lerp(_calm.volume, 0.16f * (1f - tension * 0.85f), k);
            _tense.volume = Mathf.Lerp(_tense.volume, 0.22f * tension, k);
            _hum.volume = Mathf.Lerp(_hum.volume, 0.04f + _night * 0.03f, k);
            // Geiger counter: clicks arrive at random, more often as the storm grows (a real counter is random too)
            float rate = _storm * _storm * 55f;
            if (rate > 0.2f && _rnd.NextDouble() < rate * dt) _geiger.PlayOneShot(_tick, 0.35f + (float)_rnd.NextDouble() * 0.4f);
            if (_storm > 0.8f) { _alarmTimer -= dt; if (_alarmTimer <= 0f) { _alarmTimer = 6f; _sfx.PlayOneShot(_alarm, 0.5f); } }
        }

        // ------------------------------------------------------------------ synthesis
        static AudioClip Make(string name, float[] data) { AudioClip c = AudioClip.Create(name, data.Length, 1, Rate, false); c.SetData(data, 0); return c; }

        /// <summary>Thin Martian wind: slowly modulated low-passed noise, crossfaded so the loop has no seam.</summary>
        AudioClip Wind(float seconds)
        {
            int n = (int)(seconds * Rate), fade = Rate; var raw = new float[n + fade];
            float lp = 0f, lp2 = 0f;
            for (int i = 0; i < raw.Length; i++)
            {
                float white = (float)_rnd.NextDouble() * 2f - 1f;
                lp += (white - lp) * 0.02f; lp2 += (lp - lp2) * 0.05f;
                float t = i / (float)Rate;
                raw[i] = lp2 * 6f * (0.55f + 0.45f * Mathf.Sin(t * 0.9f) * Mathf.Sin(t * 0.37f + 1f));
            }
            var d = new float[n];
            for (int i = 0; i < n; i++) { float a = i < fade ? i / (float)fade : 1f; d[i] = raw[i] * a + (i < fade ? raw[n + i] * (1f - a) : 0f); }
            return Make("wind", d);
        }

        static AudioClip Hum(float seconds)
        {
            int n = (int)(seconds * Rate); var d = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)Rate;
                d[i] = 0.5f * Mathf.Sin(2 * Mathf.PI * 55f * t) + 0.25f * Mathf.Sin(2 * Mathf.PI * 110f * t) + 0.12f * Mathf.Sin(2 * Mathf.PI * 165f * t);
            }
            return Make("hum", d);
        }

        /// <summary>A slow chord pad: each note is a pair of slightly detuned sines that swell at its own pace.</summary>
        static AudioClip Pad(float seconds, float[] notes, float pulse)
        {
            int n = (int)(seconds * Rate); var d = new float[n];
            for (int k = 0; k < notes.Length; k++)
            {
                // snap every frequency so a whole number of cycles fits the loop (no click at the seam)
                float f1 = Mathf.Round(notes[k] * seconds) / seconds, f2 = Mathf.Round(notes[k] * 1.003f * seconds) / seconds;
                float swell = (k + 1) / seconds * Mathf.Round(pulse);
                for (int i = 0; i < n; i++)
                {
                    float t = i / (float)Rate;
                    float env = 0.55f + 0.45f * Mathf.Sin(2 * Mathf.PI * swell * t + k * 1.3f);
                    d[i] += (Mathf.Sin(2 * Mathf.PI * f1 * t) + Mathf.Sin(2 * Mathf.PI * f2 * t)) * env * (0.5f / notes.Length);
                }
            }
            return Make("pad", d);
        }

        static AudioClip Blip(float[] notes, float noteSeconds, float gain, bool hard = false)
        {
            int per = (int)(noteSeconds * Rate), gap = hard ? per / 2 : 0, n = (per + gap) * notes.Length; var d = new float[n];
            for (int k = 0; k < notes.Length; k++)
                for (int i = 0; i < per; i++)
                {
                    float t = i / (float)Rate, env = Mathf.Exp(-t * (hard ? 6f : 22f)) * Mathf.Min(1f, i / 80f);
                    float s = Mathf.Sin(2 * Mathf.PI * notes[k] * t);
                    if (hard) s = Mathf.Clamp(s * 2.5f, -1f, 1f);
                    d[k * (per + gap) + i] = s * env * gain;
                }
            return Make("blip", d);
        }

        AudioClip Tick()
        {
            int n = Rate / 200; var d = new float[n];
            for (int i = 0; i < n; i++) d[i] = ((float)_rnd.NextDouble() * 2f - 1f) * Mathf.Exp(-i / (float)n * 6f) * 0.8f;
            return Make("tick", d);
        }
    }
}
