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

        readonly Dictionary<string, Transform> _shots = new Dictionary<string, Transform>();
        Transform _shot; float _shotTime, _blend = 1f; Vector3 _fromPos; Quaternion _fromRot; float _fromFov;
        float _sunAz = 110f, _sunEl = 25f, _targetAz = 110f, _targetEl = 25f;
        float _dust, _targetDust, _storm, _targetStorm;
        PhysicallyBasedSky _sky; Fog _fog; Exposure _exposure; ColorAdjustments _color;
        float _baseAerosol = 0.16f, _baseFog = 26000f, _baseLux = 60000f;
        readonly List<Light> _alarmLights = new List<Light>();
        public readonly List<Renderer> GrowLights = new List<Renderer>();

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
        }

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
            float day = Mathf.Clamp01((hour - 6f) / 12f);
            _targetEl = Mathf.Sin(day * Mathf.PI) * 58f + (hour < 6f || hour > 18f ? -12f : 2f);
            _targetAz = Mathf.Lerp(95f, 265f, day);
            if (instant) { _sunEl = _targetEl; _sunAz = _targetAz; }
        }
        public void SetDust(float amount) { _targetDust = Mathf.Clamp01(amount); }
        public void SetStorm(float amount) { _targetStorm = Mathf.Clamp01(amount); }
        public void SetGrowLights(float level01)
        {
            foreach (Renderer r in GrowLights) if (r != null) r.material.SetColor("_EmissiveColor", new Color(1f, 0.25f, 0.85f) * (level01 * 9000f));
        }

        void Update()
        {
            float dt = Time.deltaTime;
            // camera: eased blend to the shot, then a slow drift so nothing is ever frozen
            if (_shot != null)
            {
                _shotTime += dt; _blend = Mathf.Min(1f, _blend + dt / 2.2f);
                float e = _blend * _blend * (3f - 2f * _blend);
                Transform look = _shot.childCount > 0 ? _shot.GetChild(0) : null;
                Vector3 drift = ReducedMotion ? Vector3.zero : _shot.right * Mathf.Sin(_shotTime * 0.07f) * _shot.localScale.x + Vector3.up * Mathf.Sin(_shotTime * 0.05f) * _shot.localScale.y;
                Vector3 pos = _shot.position + drift;
                Quaternion rot = look != null ? Quaternion.LookRotation(look.position - pos) : _shot.rotation;
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
                float up = Mathf.Clamp01((_sunEl + 4f) / 12f);
                Sun.intensity = _baseLux * up * Mathf.Lerp(1f, 0.22f, _dust);
                Sun.color = Color.Lerp(new Color(1f, 0.96f, 0.9f), new Color(0.75f, 1f, 0.85f), _storm * 0.5f);
            }
            if (_sky != null) _sky.aerosolDensity.value = Mathf.Lerp(_baseAerosol, 0.75f, _dust);
            if (_fog != null) _fog.meanFreePath.value = Mathf.Lerp(_baseFog, 420f, _dust * _dust);
            if (_exposure != null)
            {
                float night = 1f - Mathf.Clamp01((_sunEl + 6f) / 16f);
                _exposure.fixedExposure.value = Mathf.Lerp(12.4f, 5.5f, night) - _dust * 1.3f;
            }
            if (_color != null) _color.colorFilter.value = Color.Lerp(Color.white, new Color(0.72f, 1f, 0.82f), _storm * 0.55f);
        }
    }
}
