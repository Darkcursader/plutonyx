// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// WorldDirector.cs — the living world behind the UI: camera shots, time of day, sky and dust, storm light.
// Shots are authored by WorldBuilder as children of the "Shots" object (each with a "LookAt" child).
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

namespace PlutonyX.Game
{
    public sealed class WorldDirector : MonoBehaviour
    {
        public Camera Cam;
        public Light Sun;
        public Volume SkyVolume;
        public Transform ShotsRoot;
        public bool ReducedMotion;
        public Light NightFill;
        public bool ExternalCamera;                 // true while Explore mode drives the camera
        public Transform Track;                     // when set, the camera keeps looking at this (the launching ship)
        public float Shake;                         // camera tremble in metres (engine ignition)
        public ParticleSystem StormParticles, DustParticles;
        public AudioDirector Audio;
        public Light ShieldLight;
        public readonly List<Light> SmallLights = new List<Light>();
        public float Storm { get { return _storm; } }

        readonly Dictionary<string, Transform> _shots = new Dictionary<string, Transform>();
        Transform _shot; float _shotTime, _blend = 1f; Vector3 _fromPos; Quaternion _fromRot; float _fromFov;
        float _sunAz = 110f, _sunEl = 25f, _targetAz = 110f, _targetEl = 25f;
        float _dust, _targetDust, _storm, _targetStorm;
        PhysicallyBasedSky _sky; Fog _fog; Exposure _exposure; ColorAdjustments _color;
        float _baseAerosol = 0.16f, _baseFog = 26000f, _baseLux = 60000f;
        readonly List<Light> _alarmLights = new List<Light>();
        public List<Renderer> GrowLights = new List<Renderer>();
        public List<Material> NightGlow = new List<Material>(), StormGlow = new List<Material>();   // windows and lamps brighten after dark; the shield glows in a storm
        Color[] _nightBase = new Color[0], _stormBase = new Color[0]; float _growLevel = 0.6f;

        void Awake()
        {
            if (ShotsRoot != null) foreach (Transform t in ShotsRoot) _shots[t.name] = t;
            if (SkyVolume != null)
            {
                VolumeProfile p = SkyVolume.profile;          // runtime copy; the asset is never modified
                p.TryGet(out _sky); p.TryGet(out _fog); p.TryGet(out _exposure); p.TryGet(out _color);
                if (_sky != null) _baseAerosol = _sky.aerosolDensity.value;
                if (_fog != null) _baseFog = _fog.meanFreePath.value;
            }
            if (Sun != null) _baseLux = Sun.intensity;
            _nightBase = new Color[NightGlow.Count]; for (int i = 0; i < NightGlow.Count; i++) _nightBase[i] = NightGlow[i] != null ? NightGlow[i].GetColor("_EmissiveColor") : Color.black;
            _stormBase = new Color[StormGlow.Count]; for (int i = 0; i < StormGlow.Count; i++) _stormBase[i] = StormGlow[i] != null ? StormGlow[i].GetColor("_EmissiveColor") : Color.black;
            ApplyQuality(PlayerPrefs.GetInt("quality", 3));
            ReducedMotion = PlayerPrefs.GetInt("reducedMotion", 0) == 1;
        }

        /// <summary>0 Low .. 3 Ultra. Low must still look good: native resolution and sharp textures stay; costly effects go.</summary>
        public void ApplyQuality(int q)
        {
            Terrain t = Terrain.activeTerrain;
            if (t != null) { t.heightmapPixelError = q >= 3 ? 3f : q == 2 ? 5f : q == 1 ? 8f : 12f; t.basemapDistance = q >= 2 ? 6000f : q == 1 ? 2500f : 1200f; }
            QualitySettings.lodBias = q >= 2 ? 2f : 1f;
            if (SkyVolume != null)
            {
                HDShadowSettings sh; Bloom bloom;
                if (SkyVolume.profile.TryGet(out sh)) sh.maxShadowDistance.value = q >= 3 ? 900f : q == 2 ? 500f : q == 1 ? 250f : 120f;
                if (SkyVolume.profile.TryGet(out bloom)) bloom.active = q >= 1;
            }
            var hd = Cam != null ? Cam.GetComponent<HDAdditionalCameraData>() : null;
            if (hd != null) hd.antialiasing = q >= 2 ? HDAdditionalCameraData.AntialiasingMode.TemporalAntialiasing : q == 1 ? HDAdditionalCameraData.AntialiasingMode.SubpixelMorphologicalAntiAliasing : HDAdditionalCameraData.AntialiasingMode.FastApproximateAntialiasing;
            for (int i = 0; i < SmallLights.Count; i++) if (SmallLights[i] != null) SmallLights[i].enabled = q >= 2 || i < 2;
            if (Sun != null) Sun.shadows = q >= 1 ? LightShadows.Soft : LightShadows.Hard;
        }

        public string CurrentHour { get { return _targetEl > 35f ? "midday" : _targetEl > 4f ? (_targetAz < 180f ? "morning" : "afternoon") : _targetEl > -6f ? "sunset" : "night"; } }
        public void Shot(string name, bool cut = false)
        {
            Transform t;
            if (!_shots.TryGetValue(name, out t) && !_shots.TryGetValue("outpost", out t)) return;
            if (t == _shot) return;
            _fromPos = Cam.transform.position; _fromRot = Cam.transform.rotation; _fromFov = Cam.fieldOfView;
            _shot = t; _shotTime = 0; _blend = cut || ReducedMotion ? 1f : 0f;
        }

        /// <summary>hour: 0..24 mission clock (6 = sunrise, 12 = noon, 18 = sunset).</summary>
        public void SetTime(float hour, bool instant = false)
        {
            float phase = (hour - 6f) / 12f;                              // 0 = sunrise, 1 = sunset
            _targetEl = Mathf.Max(-18f, Mathf.Sin(phase * Mathf.PI) * 60f);
            _targetAz = Mathf.Lerp(95f, 265f, Mathf.Clamp01(phase));
            if (instant) { _sunEl = _targetEl; _sunAz = _targetAz; }
        }
        public void SetDust(float amount) { _targetDust = Mathf.Clamp01(amount); }
        public void SetStorm(float amount) { _targetStorm = Mathf.Clamp01(amount); }
        public void SetGrowLights(float level01) { _growLevel = Mathf.Clamp01(level01); }

        void Update()
        {
            float dt = Time.deltaTime;
            // camera: eased blend to the shot, then a slow drift so nothing is ever frozen
            if (_shot != null && !ExternalCamera)
            {
                _shotTime += dt; _blend = Mathf.Min(1f, _blend + dt / 2.2f);
                float e = _blend * _blend * (3f - 2f * _blend);
                Transform look = _shot.childCount > 0 ? _shot.GetChild(0) : null;
                Vector3 drift = ReducedMotion ? Vector3.zero : _shot.right * Mathf.Sin(_shotTime * 0.07f) * _shot.localScale.x + Vector3.up * Mathf.Sin(_shotTime * 0.05f) * _shot.localScale.y;
                Vector3 pos = _shot.position + drift;
                Quaternion rot = look != null ? Quaternion.LookRotation(look.position - pos) : _shot.rotation;
                if (Track != null && Track.gameObject.activeInHierarchy) rot = Quaternion.Slerp(Cam.transform.rotation, Quaternion.LookRotation(Track.position + Vector3.up * 8f - pos), Time.deltaTime * 2.5f);
                if (Shake > 0.0001f && !ReducedMotion) pos += new Vector3(Mathf.PerlinNoise(Time.time * 31f, 0f) - 0.5f, Mathf.PerlinNoise(0f, Time.time * 37f) - 0.5f, 0f) * (Shake * 2f);
                Cam.transform.position = Vector3.Lerp(_fromPos, pos, e);
                Cam.transform.rotation = Quaternion.Slerp(_fromRot, rot, e);
                Cam.fieldOfView = Mathf.Lerp(_fromFov, _shot.localScale.z > 5f ? _shot.localScale.z : 45f, e);
            }
            // sun and sky
            float k = 1f - Mathf.Exp(-dt * 0.9f);
            _sunEl = Mathf.Lerp(_sunEl, _targetEl, k); _sunAz = Mathf.Lerp(_sunAz, _targetAz, k);
            _dust = Mathf.Lerp(_dust, _targetDust, k); _storm = Mathf.Lerp(_storm, _targetStorm, k);
            if (Sun != null)
            {
                Sun.transform.rotation = Quaternion.Euler(_sunEl, _sunAz + 180f, 0f);
                float up = Mathf.Clamp01((_sunEl + 2f) / 8f);
                Sun.intensity = _baseLux * up * Mathf.Lerp(1f, 0.22f, _dust) * Mathf.Lerp(1f, 0.45f, _storm);
                Sun.color = Color.Lerp(new Color(1f, 0.96f, 0.9f), new Color(0.75f, 1f, 0.85f), _storm * 0.5f);
                // the real Mars sunset is blue: fine dust scatters blue light forward, around the low Sun
                float sunset = 1f - Mathf.Clamp01(Mathf.Abs(_sunEl) / 14f);
                if (_sky != null)
                {
                    _sky.aerosolTint.value = Color.Lerp(new Color(0.80f, 0.62f, 0.46f), new Color(0.50f, 0.62f, 0.92f), sunset * 0.55f);
                    _sky.aerosolAnisotropy.value = Mathf.Lerp(0.5f, 0.86f, sunset);
                }
                Sun.color = Color.Lerp(Sun.color, new Color(0.82f, 0.9f, 1f), sunset * 0.5f);
            }
            if (_sky != null) _sky.aerosolDensity.value = Mathf.Lerp(_baseAerosol, 0.75f, _dust);
            if (_fog != null) _fog.meanFreePath.value = Mathf.Lerp(_baseFog, 420f, _dust * _dust);
            if (_exposure != null)
            {
                float dayT = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01((_sunEl + 6f) / 22f));
                _exposure.fixedExposure.value = Mathf.Lerp(3.9f, 12.4f, dayT) - _dust * 1.3f + _storm * 0.5f;
            }
            if (_color != null) _color.colorFilter.value = Color.Lerp(Color.white, new Color(0.86f, 1f, 0.9f), _storm * 0.35f);
            float nightAmount = 1f - Mathf.Clamp01((_sunEl + 6f) / 16f);
            float glow = Mathf.Max(nightAmount, _dust * 0.55f);
            for (int i = 0; i < NightGlow.Count; i++) if (NightGlow[i] != null) NightGlow[i].SetColor("_EmissiveColor", _nightBase[i] * Mathf.Lerp(0.07f, 1f, glow));
            for (int i = 0; i < StormGlow.Count; i++) if (StormGlow[i] != null) StormGlow[i].SetColor("_EmissiveColor", _stormBase[i] * Mathf.Lerp(0.04f, 1f, _storm));
            foreach (Renderer r in GrowLights) if (r != null) r.material.SetColor("_EmissiveColor", new Color(1f, 0.25f, 0.85f) * (0.03f + _growLevel * Mathf.Lerp(0.16f, 2.4f, glow)));
            if (NightFill != null) { NightFill.enabled = nightAmount > 0.02f; NightFill.intensity = 34f * nightAmount; }
            if (StormParticles != null) { var em = StormParticles.emission; em.rateOverTime = _storm * _storm * (ReducedMotion ? 40f : 260f); }
            if (DustParticles != null) { var em = DustParticles.emission; em.rateOverTime = _dust * (ReducedMotion ? 30f : 160f); }
            if (ShieldLight != null) { ShieldLight.enabled = _storm > 0.05f; ShieldLight.intensity = 400000f * _storm * (0.8f + 0.2f * Mathf.Sin(Time.time * 5f)); }
            if (Audio != null) Audio.SetWorld(_dust, _storm, nightAmount);
        }
    }
}
