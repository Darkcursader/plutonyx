// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// ExploreController.cs — "Explore the outpost": walk around Lakeshore as the Commander in third person.
// Gravity is the real surface gravity of Mars, 3.73 m/s² (NASA Mars Fact Sheet), so a jump goes about 2.6 times
// higher than the same push on Earth. Walking near a building shows what it is and one real fact about it.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PlutonyX.Game
{
    public sealed class ExploreController : MonoBehaviour
    {
        [System.Serializable] public sealed class Spot { public string Title, Text; public Vector3 Center; public float Radius; }

        public Transform Player;                    // the Commander figure (no face: visor only)
        public Camera Cam;
        public RoverDriver Drive;                    // press R by the rover to drive it
        public bool Driving => Drive != null && Drive.Active;
        public List<Spot> Spots = new List<Spot>();
        public const float MarsGravity = 3.73f, EarthGravity = 9.81f, JumpSpeed = 4.3f;

        public Vector2 AutoMove; public bool AutoJump;      // scripted input for the capture mode
        public bool Active { get; private set; }
        public Spot Near { get; private set; }
        public float LastJumpHeight { get; private set; }
        float _yaw = 326f, _pitch = 12f, _dist = 8f, _vy, _air, _walkPhase, _jumpStartY, _peak;
        bool _grounded = true;
        AstronautRig _rig; float _lastLog;
        Vector3 _home;

        void Awake()
        {
            if (Player == null) return;
            _home = Player.position;
            _rig = Player.GetComponent<AstronautRig>();
            Player.gameObject.SetActive(false);
        }

        static float Ground(Vector3 p)
        {
            Terrain t = Terrain.activeTerrain;
            return t != null ? t.SampleHeight(p) + t.transform.position.y : 0f;
        }

        public void Begin()
        {
            Active = true; Player.gameObject.SetActive(true);
            Vector3 p = _home; p.y = Ground(p); Player.position = p; _vy = 0; _grounded = true; LastJumpHeight = 0;
            if (Drive != null && System.Array.IndexOf(System.Environment.GetCommandLineArgs(), "-drivetest") >= 0) { Drive.Begin(); Player.gameObject.SetActive(false); }
        }
        public void End() { if (Driving) Drive.End(); if (Drive != null) Drive.ResetHome(); Active = false; if (Player != null) Player.gameObject.SetActive(false); Near = null; }

        void Update()
        {
            if (!Active || Player == null) return;
            Keyboard k = Keyboard.current; Gamepad g = Gamepad.current; Mouse m = Mouse.current;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            bool rKey = Keys.Down(Key.R) || (g != null && g.buttonWest.wasPressedThisFrame);
            if (Driving)
            {
                if (rKey && Mathf.Abs(Drive.Speed) < 2f) { Drive.End(); Player.gameObject.SetActive(true); Vector3 e = Drive.ExitPoint(); e.y = Ground(e); Player.position = e; Near = null; }
                return;
            }
            if (Drive != null && rKey && Drive.Near(Player.position)) { Drive.Begin(); Player.gameObject.SetActive(false); Near = null; return; }

            // ---- camera orbit: Q/E or right mouse drag or right stick ----
            float turn = 0f, tilt = 0f;
            { if (Keys.Held(Key.Q)) turn -= 1f; if (Keys.Held(Key.E)) turn += 1f; }
            if (g != null) { Vector2 rs = g.rightStick.ReadValue(); turn += rs.x; tilt -= rs.y; }
            if (m != null && m.rightButton.isPressed) { Vector2 d = m.delta.ReadValue(); turn += d.x * 0.12f; tilt -= d.y * 0.12f; }
            if (m != null) _dist = Mathf.Clamp(_dist - m.scroll.ReadValue().y * 0.01f, 4f, 22f);
            _yaw += turn * 95f * dt; _pitch = Mathf.Clamp(_pitch + tilt * 60f * dt, 2f, 55f);

            // ---- movement relative to the camera ----
            Vector2 move = Vector2.zero;
            {}
            {
                if (Keys.Held(Key.W) || Keys.Held(Key.UpArrow)) move.y += 1; if (Keys.Held(Key.S) || Keys.Held(Key.DownArrow)) move.y -= 1;
                if (Keys.Held(Key.D) || Keys.Held(Key.RightArrow)) move.x += 1; if (Keys.Held(Key.A) || Keys.Held(Key.LeftArrow)) move.x -= 1;
            }
            if (g != null) move += g.leftStick.ReadValue();
            move += AutoMove;
            if (move.sqrMagnitude > 1f) move.Normalize();
            bool run = (Keys.Held(Key.LeftShift)) || (g != null && g.rightTrigger.ReadValue() > 0.3f);
            Quaternion camYaw = Quaternion.Euler(0, _yaw, 0);
            Vector3 dir = camYaw * new Vector3(move.x, 0, move.y);
            Vector3 p = Player.position;
            float speed = run ? 6.5f : 3.2f;
            p += dir * speed * dt;
            foreach (Spot s in Spots)       // keep out of the buildings
            {
                Vector3 d = p - s.Center; d.y = 0; float r = s.Radius;
                if (r > 0 && d.magnitude < r) { d = d.sqrMagnitude < 1e-4f ? Vector3.forward : d.normalized; p.x = s.Center.x + d.x * r; p.z = s.Center.z + d.z * r; }
            }
            if (dir.sqrMagnitude > 0.01f) Player.rotation = Quaternion.Slerp(Player.rotation, Quaternion.LookRotation(dir), dt * 9f);

            // ---- jumping under real Mars gravity ----
            float ground = Ground(p);
            bool jump = (Keys.Down(Key.Space)) || (g != null && g.buttonSouth.wasPressedThisFrame) || AutoJump;
            AutoJump = false;
            if (_grounded && jump) { _vy = JumpSpeed; _grounded = false; _jumpStartY = p.y; _peak = p.y; }
            if (!_grounded)
            {
                _vy -= MarsGravity * dt; p.y += _vy * dt; _air += dt; if (p.y > _peak) _peak = p.y;
                if (p.y <= ground) { p.y = ground; _grounded = true; _vy = 0; LastJumpHeight = _peak - _jumpStartY; _air = 0; }
            }
            else p.y = ground;
            Player.position = p;
            if (Time.time - _lastLog > 2f && dir.sqrMagnitude > 0.01f) { _lastLog = Time.time; Debug.Log("[PlutonyX] explore: walking, player at " + p.ToString("F1")); }

            // ---- a simple stride: legs and arms swing while walking ----
            float moving = _grounded ? dir.magnitude : 0f;
            _walkPhase += moving * speed * dt * (run ? 1.5f : 2.3f);
            if (_rig != null) _rig.Pose(_walkPhase, Mathf.Clamp01(moving * (run ? 1.25f : 0.8f)), !_grounded);
            if (_grounded && moving > 0.1f) { Vector3 pp = Player.position; pp.y += Mathf.Abs(Mathf.Sin(_walkPhase)) * (run ? 0.10f : 0.04f); Player.position = pp; }

            // ---- camera follows ----
            Vector3 target = p + Vector3.up * 1.35f;
            Vector3 camPos = target + Quaternion.Euler(_pitch, _yaw, 0) * new Vector3(0, 0, -_dist);
            float cg = Ground(camPos) + 0.6f; if (camPos.y < cg) camPos.y = cg;
            Cam.transform.position = Vector3.Lerp(Cam.transform.position, camPos, 1f - Mathf.Exp(-dt * 10f));
            Cam.transform.rotation = Quaternion.LookRotation(target - Cam.transform.position);
            Cam.fieldOfView = Mathf.Lerp(Cam.fieldOfView, 55f, dt * 4f);

            // ---- nearest point of interest ----
            Near = null; float best = 9f;
            foreach (Spot s in Spots)
            {
                if (string.IsNullOrEmpty(s.Title)) continue;
                Vector3 d = p - s.Center; d.y = 0; float gap = d.magnitude - Mathf.Max(0, s.Radius);
                if (gap < best) { best = gap; Near = s; }
            }
        }
    }
}
