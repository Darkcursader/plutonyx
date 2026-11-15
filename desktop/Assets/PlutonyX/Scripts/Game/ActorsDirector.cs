// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// ActorsDirector.cs — things that move in the world: the ascent ship launching, the rover driving out to the
// delta and coming home, the crew walking to the storm shelter. Presentation only; no game rules here.
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class ActorsDirector : MonoBehaviour
    {
        public Transform Ship, Rover, FlameMesh;
        public Light ShipFlame;
        public ParticleSystem ShipExhaust, PadDust, RoverDust;
        public GameObject FieldSet;                 // the rover and Dil parked at the delta while she is in the field
        public Transform[] Crew = new Transform[0];
        public int DilIndex = 1;
        public Vector3 ShelterDoor, RoverExit;
        public AudioDirector Audio;
        public WorldDirector World;

        Vector3 _shipHome, _roverHome; Quaternion _roverHomeRot, _shipHomeRot;
        Vector3[] _crewHome = new Vector3[0]; Quaternion[] _crewHomeRot = new Quaternion[0];
        AstronautRig[] _rigs = new AstronautRig[0];
        readonly List<Transform> _wheels = new List<Transform>();
        bool _dilAway, _sheltered; Coroutine _rover, _launch; Coroutine[] _walk = new Coroutine[0];
        float _exhaust;
        public bool Launched { get; private set; }

        void Awake()
        {
            if (Ship != null) { _shipHome = Ship.position; _shipHomeRot = Ship.rotation; }
            if (Rover != null)
            {
                _roverHome = Rover.position; _roverHomeRot = Rover.rotation;
                foreach (Transform t in Rover.GetComponentsInChildren<Transform>(true)) if (t.name == "WheelSpin") _wheels.Add(t);
            }
            _crewHome = new Vector3[Crew.Length]; _crewHomeRot = new Quaternion[Crew.Length]; _walk = new Coroutine[Crew.Length]; _rigs = new AstronautRig[Crew.Length];
            for (int i = 0; i < Crew.Length; i++) { _crewHome[i] = Crew[i].position; _crewHomeRot[i] = Crew[i].rotation; _rigs[i] = Crew[i].GetComponent<AstronautRig>(); }
            if (FieldSet != null) FieldSet.SetActive(false);
            SetExhaust(0f); SetRoverDust(0f);
        }

        static float Ground(Vector3 p)
        {
            Terrain t = Terrain.activeTerrain;
            return t != null ? t.SampleHeight(p) + t.transform.position.y : p.y;
        }
        static Vector3 GroundNormal(Vector3 p)
        {
            Terrain t = Terrain.activeTerrain; if (t == null) return Vector3.up;
            Vector3 l = p - t.transform.position; Vector3 s = t.terrainData.size;
            return t.terrainData.GetInterpolatedNormal(l.x / s.x, l.z / s.z);
        }

        public void ResetAll()
        {
            StopAllCoroutines(); _rover = null; _launch = null; Launched = false;
            if (Ship != null) { Ship.position = _shipHome; Ship.rotation = _shipHomeRot; Ship.gameObject.SetActive(true); }
            SetExhaust(0f); SetRoverDust(0f);
            if (PadDust != null) { var em = PadDust.emission; em.rateOverTime = 0f; }
            if (World != null) World.Shake = 0f;
            _dilAway = false; _sheltered = false;
            if (Rover != null) { Rover.gameObject.SetActive(true); Rover.position = _roverHome; Rover.rotation = _roverHomeRot; }
            if (FieldSet != null) FieldSet.SetActive(false);
            for (int i = 0; i < Crew.Length; i++) { Crew[i].gameObject.SetActive(true); Crew[i].position = _crewHome[i]; Crew[i].rotation = _crewHomeRot[i]; }
        }

        // ------------------------------------------------------------------ rover and Dil
        public void SetDilAway(bool away, bool animate)
        {
            if (away == _dilAway) return;
            _dilAway = away;
            if (_rover != null) StopCoroutine(_rover);
            SetRoverDust(0f);
            if (DilIndex < Crew.Length) Crew[DilIndex].gameObject.SetActive(!away);
            if (FieldSet != null) FieldSet.SetActive(away);
            if (Rover == null) return;
            if (!animate) { Rover.gameObject.SetActive(!away); Rover.position = _roverHome; Rover.rotation = _roverHomeRot; return; }
            _rover = StartCoroutine(away ? Drive(_roverHome, RoverExit, true) : Drive(RoverExit, _roverHome, false));
        }

        void SetRoverDust(float amount) { if (RoverDust != null) { var em = RoverDust.emission; em.rateOverTime = 26f * amount; } }

        IEnumerator Drive(Vector3 from, Vector3 to, bool hideAtEnd)
        {
            Rover.gameObject.SetActive(true);
            float length = Vector3.Distance(from, to), top = 7.5f, travelled = 0f, v = 0f;
            Vector3 dir = (to - from).normalized; dir.y = 0; dir.Normalize();
            Quaternion startRot = Rover.rotation; float turn = 0f;
            // turn on the spot first, then pull away, the way a six-wheeled rover really steers
            while (turn < 1f && Vector3.Angle(Rover.forward, dir) > 2f)
            {
                turn += Time.deltaTime / 2.2f;
                Rover.rotation = Quaternion.Slerp(startRot, Quaternion.LookRotation(dir), Mathf.SmoothStep(0, 1, turn));
                foreach (Transform w in _wheels) w.Rotate(Vector3.right, (w.localPosition.x > 0 ? 1f : -1f) * 60f * Time.deltaTime, Space.Self);
                yield return null;
            }
            while (travelled < length)
            {
                float remaining = length - travelled;
                float want = hideAtEnd ? top : Mathf.Min(top, 0.6f + remaining * 0.5f);
                v = Mathf.MoveTowards(v, want, 2.2f * Time.deltaTime);
                travelled += v * Time.deltaTime;
                Vector3 p = Vector3.Lerp(from, to, travelled / length); p.y = Ground(p);
                Rover.position = p;
                Vector3 n = Vector3.Slerp(Vector3.up, GroundNormal(p), 0.9f), fwd = Vector3.ProjectOnPlane(dir, n).normalized;
                Rover.rotation = Quaternion.Slerp(Rover.rotation, Quaternion.LookRotation(fwd, n), Time.deltaTime * 4f);
                float spin = v / 0.6f * Mathf.Rad2Deg * Time.deltaTime;
                foreach (Transform w in _wheels) w.Rotate(Vector3.right, spin, Space.Self);
                SetRoverDust(Mathf.Clamp01(v / top));
                yield return null;
            }
            SetRoverDust(0f);
            if (hideAtEnd) Rover.gameObject.SetActive(false); else { Rover.position = _roverHome; Rover.rotation = _roverHomeRot; }
            _rover = null;
        }

        // ------------------------------------------------------------------ crew
        public void CrewToShelter(bool sheltered)
        {
            if (sheltered == _sheltered) return;
            _sheltered = sheltered;
            for (int i = 0; i < Crew.Length; i++)
            {
                if (_walk[i] != null) StopCoroutine(_walk[i]);
                if (!Crew[i].gameObject.activeSelf) continue;
                if (!sheltered) { Crew[i].position = _crewHome[i]; Crew[i].rotation = _crewHomeRot[i]; continue; }
                Vector3 target = ShelterDoor + new Vector3((i - 1) * 1.1f, 0, (i % 2) * 1.2f - 0.4f);
                _walk[i] = StartCoroutine(Walk(Crew[i], _rigs[i], target, 3.6f + i * 0.35f));
            }
        }

        IEnumerator Walk(Transform who, AstronautRig rig, Vector3 to, float speed)
        {
            float phase = 0f, v = 0f;
            while (true)
            {
                Vector3 p = who.position, flat = to - p; flat.y = 0;
                if (flat.magnitude < 0.3f) break;
                v = Mathf.MoveTowards(v, Mathf.Min(speed, 0.8f + flat.magnitude), 4f * Time.deltaTime);
                p += flat.normalized * v * Time.deltaTime;
                phase += v * Time.deltaTime * 2.4f;                       // long, loping strides: low Martian gravity
                p.y = Ground(p) + Mathf.Abs(Mathf.Sin(phase)) * 0.06f * (v / speed);
                who.position = p;
                who.rotation = Quaternion.Slerp(who.rotation, Quaternion.LookRotation(flat.normalized), Time.deltaTime * 6f);
                if (rig != null) rig.Pose(phase, Mathf.Clamp01(v / 3f), false);
                yield return null;
            }
        }

        // ------------------------------------------------------------------ launch
        public void Launch()
        {
            if (_launch != null || Ship == null) return;
            _launch = StartCoroutine(LaunchRoutine());
        }

        void SetExhaust(float power)
        {
            _exhaust = power;
            if (ShipFlame != null) { ShipFlame.enabled = power > 0.01f; ShipFlame.intensity = 1.6e7f * power; }
            if (ShipExhaust != null) { var em = ShipExhaust.emission; em.rateOverTime = 260f * power; }
            if (FlameMesh != null && power <= 0.01f) FlameMesh.localScale = Vector3.zero;
        }

        void Update()
        {
            if (FlameMesh != null && _exhaust > 0.01f)
            {   // the flame flickers and stretches as thrust builds
                float f = 0.9f + 0.1f * Mathf.PerlinNoise(Time.time * 23f, 0.3f), w = 0.92f + 0.08f * Mathf.PerlinNoise(0.7f, Time.time * 31f);
                FlameMesh.localScale = new Vector3(w * Mathf.Sqrt(_exhaust), f * _exhaust, w * Mathf.Sqrt(_exhaust));
            }
        }

        IEnumerator LaunchRoutine()
        {
            Launched = true;
            if (Audio != null) Audio.Rumble();
            var dust = PadDust != null ? PadDust.emission : default(ParticleSystem.EmissionModule);
            // ignition: flame and dust build for a few seconds, the ship trembles on its legs
            for (float t = 0; t < 3.0f; t += Time.deltaTime)
            {
                float k = Mathf.Clamp01(t / 2.2f);
                SetExhaust(k * k);
                if (PadDust != null) dust.rateOverTime = 120f * k;
                if (World != null) World.Shake = 0.05f * k;
                Ship.position = _shipHome + new Vector3(Mathf.Sin(t * 47f), 0, Mathf.Cos(t * 39f)) * 0.02f * k;
                yield return null;
            }
            float h = 0f, v = 0f, time = 0f;
            while (h < 3200f)
            {
                time += Time.deltaTime;
                v += (3.2f + time * 1.5f + h * 0.012f) * Time.deltaTime;        // slow and heavy off the pad, then it goes
                h += v * Time.deltaTime;
                float lean = Mathf.Clamp01((h - 120f) / 1400f);                 // then it tips over toward orbit
                Ship.position = _shipHome + new Vector3(lean * lean * h * 0.45f, h, 0);
                Ship.rotation = _shipHomeRot * Quaternion.Euler(0, 0, -lean * 32f);
                SetExhaust(1f);
                if (PadDust != null) dust.rateOverTime = 140f * Mathf.Clamp01(1f - h / 60f);
                if (World != null) World.Shake = 0.06f * Mathf.Clamp01(1f - h / 500f);
                yield return null;
            }
            SetExhaust(0f); Ship.gameObject.SetActive(false);
            if (World != null) World.Shake = 0f;
            _launch = null;
        }
    }
}
