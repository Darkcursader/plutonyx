// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// RoverDriver.cs — drive the outpost's pressurised rover in Explore mode. Walk up to it and press R.
// Cockpit view (C toggles a chase camera), arcade-smooth handling with real Mars gravity (3.73 m/s², Mars Fact Sheet)
// for the suspension and air time, six spinning wheels with front/rear steering, a dust plume that grows with speed,
// an electric-drive sound made in code, and a job: drive to the river delta (where Perseverance studied the rocks),
// pick up a rock sample, and bring it back to the garage. The cabin is pressurised; the rover has its own battery.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PlutonyX.Game
{
    public sealed class RoverDriver : MonoBehaviour
    {
        public Transform Rover; public ParticleSystem Dust; public Camera Cam;
        public Vector3 Destination;                          // the delta site, set by the world builder
        public List<ExploreController.Spot> Solid;          // buildings to bump into
        public bool Active { get; private set; }
        public float Speed => _v;
        public float Battery { get; private set; } = 100f;
        public bool Cargo { get; private set; }
        public string Message { get; private set; } = "";
        public bool Cockpit = true;
        // test switch: -drivetest <folder> drives a lap by itself, logs the drive and saves screenshots there
        string _testDir; float _testT;

        const float G = 3.73f, WB = 3.8f, MaxV = 12f, BoostV = 17f;
        static readonly Vector3 Eye = new Vector3(-0.45f, 2.45f, 1.35f);
        Vector3 _homePos; Quaternion _homeRot;
        float _yaw, _v, _steer, _y, _vy, _pitch, _roll, _air, _shake, _msgT, _look;
        bool _airborne;
        readonly List<Transform> _wheels = new List<Transform>();
        AudioSource _engine; float[] _spin = new float[8];
        readonly List<Renderer> _shell = new List<Renderer>(); bool _shellHidden;   // cabin walls hidden in cockpit view

        void Awake()
        {
            if (Rover == null) return;
            _homePos = Rover.position; _homeRot = Rover.rotation;
            foreach (Transform t in Rover.GetComponentsInChildren<Transform>(true)) if (t.name == "WheelSpin") _wheels.Add(t);
            foreach (Renderer r in Rover.GetComponentsInChildren<Renderer>(true)) { string n = r.gameObject.name; if (n == "Cabin" || n.Contains("window") || n == "Windshield" || n == "Roof pack" || n == "Light bar" || n == "Suit port" || n == "Suit port ring" || n == "Roof rail" || n.StartsWith("Drill")) _shell.Add(r); }
            // electric drive: a soft whine plus gravel rumble, generated in code
            _engine = gameObject.AddComponent<AudioSource>(); _engine.loop = true; _engine.playOnAwake = false; _engine.spatialBlend = 0f; _engine.volume = 0f;
            int sr = AudioSettings.outputSampleRate; var rnd = new System.Random(5);
            _engine.clip = AudioClip.Create("rover drive", sr, 1, sr, false);
            var data = new float[sr]; float lp = 0;
            for (int i = 0; i < sr; i++) { float t = (float)i / sr; lp += ((float)rnd.NextDouble() * 2 - 1 - lp) * 0.06f; data[i] = 0.32f * Mathf.Sin(2 * Mathf.PI * 110 * t) + 0.18f * Mathf.Sin(2 * Mathf.PI * 220 * t) + 0.08f * Mathf.Sin(2 * Mathf.PI * 331 * t) + lp * 1.4f; }
            _engine.clip.SetData(data, 0);
        }

        static float Ground(Vector3 p) { Terrain t = Terrain.activeTerrain; return t != null ? t.SampleHeight(p) + t.transform.position.y : 0f; }

        public bool Near(Vector3 who) { if (Rover == null) return false; Vector3 d = who - Rover.position; d.y = 0; return d.magnitude < 5.5f; }

        public void Begin()
        {
            var args = System.Environment.GetCommandLineArgs(); int ti = System.Array.IndexOf(args, "-drivetest"); if (ti >= 0 && ti + 1 < args.Length) { _testDir = args[ti + 1]; _testT = 0; }
            Active = true; _yaw = Rover.eulerAngles.y; _v = 0; _steer = 0; _vy = 0; _airborne = false; _y = Rover.position.y; _look = 0;
            if (Dust != null) { var em = Dust.emission; em.enabled = true; if (!Dust.isPlaying) Dust.Play(); }
            _engine.Play();
            Say(Cargo ? "Bring the rock sample home to the rover garage." : "Drive to the river delta, about " + Mathf.RoundToInt(Flat(Destination - Rover.position)) + " m away. Follow the arrow on the dashboard.", 6f);
        }

        public void End()
        {
            Active = false; _v = 0; _engine.Stop(); _shellHidden = false; foreach (var r in _shell) if (r != null) r.enabled = true;
            if (Dust != null) { var em = Dust.emission; em.rateOverTimeMultiplier = 0; }
        }

        /// <summary>Back on the garage pad (used when Explore mode ends).</summary>
        public void ResetHome() { if (Rover == null) return; Rover.SetPositionAndRotation(_homePos, _homeRot); Battery = 100f; }
        public Vector3 ExitPoint() { return Rover.position + Rover.rotation * new Vector3(-2.8f, 0, 0.6f); }

        static float Flat(Vector3 d) { d.y = 0; return d.magnitude; }
        void Say(string m, float t) { Message = m; _msgT = t; }

        void Update()
        {
            if (!Active || Rover == null) return;
            float dt = Mathf.Min(Time.deltaTime, 0.05f); if (dt <= 0) return;
            Gamepad gp = Gamepad.current; Mouse m = Mouse.current;
            // ---- input
            float thr = 0, st = 0; bool brake = Keys.Held(Key.Space), boost = Keys.Held(Key.LeftShift);
            if (Keys.Held(Key.W) || Keys.Held(Key.UpArrow)) thr += 1; if (Keys.Held(Key.S) || Keys.Held(Key.DownArrow)) thr -= 1;
            if (Keys.Held(Key.A) || Keys.Held(Key.LeftArrow)) st -= 1; if (Keys.Held(Key.D) || Keys.Held(Key.RightArrow)) st += 1;
            if (gp != null) { thr += gp.rightTrigger.ReadValue() - gp.leftTrigger.ReadValue(); st += gp.leftStick.ReadValue().x; brake |= gp.buttonSouth.isPressed; boost |= gp.rightShoulder.isPressed; _look += gp.rightStick.ReadValue().x * dt * 2f; }
            if (Keys.Down(Key.C) || (gp != null && gp.selectButton.wasPressedThisFrame)) Cockpit = !Cockpit;
            if (m != null && m.rightButton.isPressed) _look += m.delta.ReadValue().x * 0.004f; else _look = Mathf.Lerp(_look, 0, dt * 2f);
            _look = Mathf.Clamp(_look, -1.8f, 1.8f);
            if (_testDir != null)
            {
                _testT += dt; Vector3 tgt = Destination - Rover.position; tgt.y = 0; float relA = Vector3.SignedAngle(Rover.forward.WithY0(), tgt, Vector3.up);
                thr = _testT < 2.5f ? -0.7f : _testT < 22f ? 1f : -1f; st = _testT < 2.5f ? 0 : Mathf.Clamp(relA / 25f, -1, 1); boost = _testT > 8f && _testT < 18f;
                if (_testT > 11f && _testT < 11.1f) Cockpit = false; if (_testT > 19f && _testT < 19.1f) Cockpit = true;
                if (Mathf.Repeat(_testT, 1f) < dt) Debug.Log("[PlutonyX] drive t=" + _testT.ToString("0") + " " + Dashboard() + " pos " + Rover.position.ToString("F1") + " above ground " + (Rover.position.y - Ground(Rover.position)).ToString("F2"));
                foreach (float s in new[] { 6f, 12f, 16f, 21f }) if (_testT >= s && _testT - dt < s) ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(_testDir, "drive_" + s.ToString("00") + (Cockpit ? "_cockpit" : "_chase") + ".png"));
                if (_testT > 25f) Application.Quit();
            }
            thr = Mathf.Clamp(thr, -1, 1); st = Mathf.Clamp(st, -1, 1);
            if (Battery <= 0) thr = 0;
            bool low = Battery < 15; float top = low ? 4.5f : boost ? BoostV : MaxV;

            // ---- speed
            if (!_airborne)
            {
                if (thr > 0) _v += (_v < 0 ? 10f : (boost && !low ? 7.5f : 5.2f) * (1 - Mathf.Max(0, _v) / (top + 0.01f) * 0.55f)) * thr * dt;
                else if (thr < 0) _v += (_v > 0 ? 10f : 3.2f) * thr * dt;
                else _v -= Mathf.Sign(_v) * Mathf.Min(Mathf.Abs(_v), (0.9f + Mathf.Abs(_v) * 0.08f) * dt);
                if (brake) _v -= Mathf.Sign(_v) * Mathf.Min(Mathf.Abs(_v), 13f * dt);
                _v += G * Mathf.Sin(_pitch * Mathf.Deg2Rad) * dt * 0.85f;   // pitch < 0 is nose up: climbing slows you          // hills slow you down and speed you up
            }
            if (_v > top) _v -= (_v - top) * dt * 1.2f;
            _v = Mathf.Max(_v, -5f);

            // ---- steering (gentler at speed), position, buildings
            float maxSt = 32f / (1 + Mathf.Abs(_v) / 7f);
            _steer = Mathf.Lerp(_steer, st * maxSt, 1 - Mathf.Exp(-dt * 6f));
            if (!_airborne) _yaw += _v * Mathf.Tan(_steer * Mathf.Deg2Rad) / WB * Mathf.Rad2Deg * dt * (brake && Mathf.Abs(_v) > 6 ? 1.35f : 1f);
            Vector3 fwd = Quaternion.Euler(0, _yaw, 0) * Vector3.forward;
            Vector3 p = Rover.position + fwd * _v * dt;
            if (Solid != null) foreach (var s in Solid)
            {
                if (s.Radius <= 0) continue; Vector3 d = p - s.Center; d.y = 0; float rr = s.Radius + 2.3f;
                if (d.magnitude < rr && d.sqrMagnitude > 1e-4f) { d.Normalize(); p.x = s.Center.x + d.x * rr; p.z = s.Center.z + d.z * rr; if (Mathf.Abs(_v) > 2.5f) _shake = Mathf.Min(1, Mathf.Abs(_v) * 0.08f); _v *= -0.25f; }
            }
            Vector3 home = _homePos; if (Flat(p - home) > 2500f) { p = home + (p - home).normalized * 2500f; _v *= 0.5f; Say("That is as far as the rover's radio reaches. Turn back.", 3f); }

            // ---- suspension: sit on the wheels, tilt with the ground, fly over crests under Mars gravity
            Quaternion yq = Quaternion.Euler(0, _yaw, 0);
            float h(float lx, float lz) => Ground(p + yq * new Vector3(lx, 0, lz));
            float fl = h(-1.42f, 1.9f), fr = h(1.42f, 1.9f), rl = h(-1.42f, -1.9f), rr2 = h(1.42f, -1.9f), c0 = Ground(p);
            float gy = Mathf.Max((fl + fr + rl + rr2) / 4f, Mathf.Max(Mathf.Max(fl, fr), Mathf.Max(Mathf.Max(rl, rr2), c0)) - 0.12f) + 0.05f;
            float gp1 = Mathf.Atan2((rl + rr2) / 2 - (fl + fr) / 2, WB) * Mathf.Rad2Deg, gr = Mathf.Atan2((fr + rr2) / 2 - (fl + rl) / 2, 2.84f) * Mathf.Rad2Deg;
            if (_airborne)
            {
                _vy -= G * dt; _y += _vy * dt; _air += dt;
                if (_y <= gy) { float hit = -_vy; _airborne = false; _y = gy; if (hit > 1.4f) { _shake = Mathf.Min(1, hit * 0.14f); if (_air > 0.6f) Say("Air time " + _air.ToString("0.0") + " s. On Mars you fall slowly!", 2f); } _vy = 0; }
            }
            else
            {
                float vyg = (gy - _y) / dt;
                if (vyg < _vy - G * dt * 1.6f && Mathf.Abs(_v) > 5f) { _airborne = true; _air = 0; _vy -= G * dt; _y += _vy * dt; }
                else { _vy = Mathf.Lerp(_vy, vyg, 0.5f); _y = gy; }
            }
            float lean = _airborne ? 0.02f : 1f;
            _pitch = Mathf.Lerp(_pitch, gp1, 1 - Mathf.Exp(-dt * 7f * lean));
            _roll = Mathf.Lerp(_roll, gr + _steer * _v * 0.012f, 1 - Mathf.Exp(-dt * 6f * lean));
            p.y = _y;
            Rover.SetPositionAndRotation(p, Quaternion.Euler(0, _yaw, 0) * Quaternion.Euler(_pitch, 0, _roll));

            // ---- wheels spin; front and rear pairs steer (like a real six-wheeled rover)
            for (int i = 0; i < _wheels.Count; i++)
            {
                Transform w = _wheels[i]; int axle = i / 2; float steerW = axle == 2 ? _steer : axle == 0 ? -_steer : 0;
                if (i < _spin.Length) { _spin[i] += _v * dt / 0.62f * Mathf.Rad2Deg; w.localRotation = Quaternion.Euler(0, steerW, 0) * Quaternion.Euler(_spin[i], 0, 0); }
            }

            // ---- battery, dust, sound
            Battery = Mathf.Clamp(Battery - Mathf.Abs(_v) / MaxV * (boost ? 0.3f : 0.15f) * dt + (Flat(p - _homePos) < 6f ? 6f * dt : 0), 0, 100);
            if (Dust != null) { var em = Dust.emission; em.rateOverTimeMultiplier = _airborne ? 0 : Mathf.Clamp(Mathf.Abs(_v) * 9f, 0, 140); }
            float sp = Mathf.Abs(_v) / BoostV;
            _engine.volume = Mathf.Lerp(_engine.volume, 0.05f + sp * 0.12f, dt * 4f); _engine.pitch = Mathf.Lerp(_engine.pitch, 0.6f + sp * 1.4f, dt * 4f);

            // ---- camera
            _shake = Mathf.Max(0, _shake - dt * 1.6f);
            Vector3 jit = Random.insideUnitSphere * (_shake * 0.06f + Mathf.Min(1, Mathf.Abs(_v) / 6f) * 0.006f);
            bool hide = Cockpit && Active; if (hide != _shellHidden) { _shellHidden = hide; foreach (var r in _shell) if (r != null) r.enabled = !hide; }
            if (Cockpit)
            {
                Cam.transform.position = Rover.TransformPoint(Eye) + jit;
                Cam.transform.rotation = Rover.rotation * Quaternion.Euler(6f, _look * Mathf.Rad2Deg, 0);
                Cam.nearClipPlane = 0.1f; Cam.fieldOfView = Mathf.Lerp(Cam.fieldOfView, 66f + sp * 14f, dt * 3f);
            }
            else
            {
                Vector3 want = p - Quaternion.Euler(0, _yaw + _look * Mathf.Rad2Deg, 0) * Vector3.forward * 11f + Vector3.up * 4.4f;
                want.y = Mathf.Max(want.y, Ground(want) + 1.5f);
                Cam.transform.position = Vector3.Lerp(Cam.transform.position, want, 1 - Mathf.Exp(-dt * 4f)) + jit;
                Cam.transform.rotation = Quaternion.LookRotation(p + fwd * 5f + Vector3.up * 1.6f - Cam.transform.position);
                Cam.nearClipPlane = 0.3f; Cam.fieldOfView = Mathf.Lerp(Cam.fieldOfView, 58f + sp * 12f, dt * 3f);
            }

            // ---- the job: delta and back
            if (!Cargo && Flat(Destination - p) < 16f && Mathf.Abs(_v) < 3f) { Cargo = true; Say("Sample collected! The drill pulled a core from a delta rock. Now drive it home to the garage.", 6f); }
            if (Cargo && Flat(_homePos - p) < 8f && Mathf.Abs(_v) < 3f) { Cargo = false; Say("Sample delivered to the outpost. Great driving, Commander!", 6f); }
            if (_msgT > 0) { _msgT -= dt; if (_msgT <= 0) Message = ""; }
        }

        /// <summary>One line for the info panel: speed, battery, tilt and where to go.</summary>
        public string Dashboard()
        {
            Vector3 target = Cargo ? _homePos : Destination; Vector3 to = target - Rover.position; to.y = 0;
            float rel = Vector3.SignedAngle(Rover.forward.WithY0(), to, Vector3.up);
            string arrow = Mathf.Abs(rel) < 15 ? "↑" : rel > 0 ? (rel > 100 ? "↘" : "→") : (rel < -100 ? "↙" : "←");
            return Mathf.RoundToInt(Mathf.Abs(_v) * 3.6f) + " km/h" + (_v < -0.2f ? " (reverse)" : "") + "   ·   Battery " + Mathf.RoundToInt(Battery) + "%" + (Battery < 15 ? " ECO" : "") +
                   "   ·   Tilt " + Mathf.RoundToInt(Mathf.Abs(_pitch)) + "°   ·   " + (Cargo ? "Garage " : "River delta ") + arrow + " " + Mathf.RoundToInt(to.magnitude) + " m" + (_airborne ? "   ·   AIRBORNE" : "");
        }
    }

    static class VecExt { public static Vector3 WithY0(this Vector3 v) { v.y = 0; return v; } }
}
