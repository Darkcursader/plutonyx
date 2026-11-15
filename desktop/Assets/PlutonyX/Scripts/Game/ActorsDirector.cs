// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// ActorsDirector.cs — things that move in the world: the ascent ship launching, the rover driving out to the
// delta and coming home, the crew walking to the storm shelter. Presentation only; no game rules here.
using System.Collections;
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class ActorsDirector : MonoBehaviour
    {
        public Transform Ship, Rover;
        public Light ShipFlame;
        public ParticleSystem ShipExhaust;
        public GameObject FieldSet;                 // the rover and Dil parked at the delta while she is in the field
        public Transform[] Crew = new Transform[0];
        public int DilIndex = 1;
        public Vector3 ShelterDoor, RoverExit;
        public AudioDirector Audio;

        Vector3 _shipHome, _roverHome; Quaternion _roverHomeRot;
        Vector3[] _crewHome = new Vector3[0]; Quaternion[] _crewHomeRot = new Quaternion[0];
        bool _dilAway, _sheltered; Coroutine _rover, _launch; Coroutine[] _walk = new Coroutine[0];
        public bool Launched { get; private set; }

        void Awake()
        {
            if (Ship != null) _shipHome = Ship.position;
            if (Rover != null) { _roverHome = Rover.position; _roverHomeRot = Rover.rotation; }
            _crewHome = new Vector3[Crew.Length]; _crewHomeRot = new Quaternion[Crew.Length]; _walk = new Coroutine[Crew.Length];
            for (int i = 0; i < Crew.Length; i++) { _crewHome[i] = Crew[i].position; _crewHomeRot[i] = Crew[i].rotation; }
            if (FieldSet != null) FieldSet.SetActive(false);
            SetExhaust(0f);
        }

        static float Ground(Vector3 p)
        {
            Terrain t = Terrain.activeTerrain;
            return t != null ? t.SampleHeight(p) + t.transform.position.y : p.y;
        }

        public void ResetAll()
        {
            StopAllCoroutines(); _rover = null; _launch = null; Launched = false;
            if (Ship != null) { Ship.position = _shipHome; Ship.gameObject.SetActive(true); }
            SetExhaust(0f);
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
            if (DilIndex < Crew.Length) Crew[DilIndex].gameObject.SetActive(!away);
            if (FieldSet != null) FieldSet.SetActive(away);
            if (Rover == null) return;
            if (!animate) { Rover.gameObject.SetActive(!away); Rover.position = _roverHome; Rover.rotation = _roverHomeRot; return; }
            _rover = StartCoroutine(away ? Drive(_roverHome, RoverExit, true) : Drive(RoverExit, _roverHome, false));
        }

        IEnumerator Drive(Vector3 from, Vector3 to, bool hideAtEnd)
        {
            Rover.gameObject.SetActive(true);
            float length = Vector3.Distance(from, to), speed = 9f, travelled = 0f;
            Vector3 dir = (to - from).normalized; dir.y = 0;
            while (travelled < length)
            {
                travelled += speed * Time.deltaTime * Mathf.Clamp01(travelled / 6f + 0.15f);
                Vector3 p = Vector3.Lerp(from, to, travelled / length); p.y = Ground(p);
                Rover.position = p;
                Rover.rotation = Quaternion.Slerp(Rover.rotation, Quaternion.LookRotation(dir), Time.deltaTime * 3f);
                yield return null;
            }
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
                Vector3 target = ShelterDoor + new Vector3((i - 1) * 1.3f, 0, (i % 2) * 1.1f);
                _walk[i] = StartCoroutine(Walk(Crew[i], target, 3.4f + i * 0.4f));
            }
        }

        IEnumerator Walk(Transform who, Vector3 to, float speed)
        {
            float t = 0f;
            while (true)
            {
                Vector3 p = who.position, flat = to - p; flat.y = 0;
                if (flat.magnitude < 0.25f) break;
                Vector3 step = flat.normalized * speed * Time.deltaTime;
                p += step; t += Time.deltaTime;
                p.y = Ground(p) + Mathf.Abs(Mathf.Sin(t * 9f)) * 0.07f;          // a small hop per stride: low Martian gravity
                who.position = p;
                who.rotation = Quaternion.Slerp(who.rotation, Quaternion.LookRotation(flat.normalized), Time.deltaTime * 6f);
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
            if (ShipFlame != null) { ShipFlame.enabled = power > 0.01f; ShipFlame.intensity = 4.0e7f * power; }
            if (ShipExhaust != null) { var em = ShipExhaust.emission; em.rateOverTime = 220f * power; }
        }

        IEnumerator LaunchRoutine()
        {
            Launched = true;
            if (Audio != null) Audio.Rumble();
            // ignition: flame and dust build for two seconds, the ship trembles
            for (float t = 0; t < 2.2f; t += Time.deltaTime)
            {
                SetExhaust(Mathf.Clamp01(t / 1.6f));
                Ship.position = _shipHome + new Vector3(Mathf.Sin(t * 47f), 0, Mathf.Cos(t * 39f)) * 0.03f;
                yield return null;
            }
            float h = 0f, v = 0f;
            while (h < 2600f)
            {
                v += (4.5f + h * 0.02f) * Time.deltaTime;        // gentle at first, then it goes
                h += v * Time.deltaTime;
                Ship.position = _shipHome + new Vector3(Mathf.Sin(h * 0.004f) * h * 0.03f, h, 0);
                SetExhaust(1f);
                yield return null;
            }
            SetExhaust(0f); Ship.gameObject.SetActive(false);
            _launch = null;
        }
    }
}
