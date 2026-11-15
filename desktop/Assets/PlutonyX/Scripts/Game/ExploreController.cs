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
        public List<Spot> Spots = new List<Spot>();
        public const float MarsGravity = 3.73f, EarthGravity = 9.81f, JumpSpeed = 4.3f;

        public Vector2 AutoMove; public bool AutoJump;      // scripted input for the capture mode
        public bool Active { get; private set; }
        public Spot Near { get; private set; }
        public float LastJumpHeight { get; private set; }
        float _yaw = 326f, _pitch = 12f, _dist = 8f, _vy, _air, _walkPhase, _jumpStartY, _peak;
        bool _grounded = true;
        readonly List<Transform> _legs = new List<Transform>(), _arms = new List<Transform>();
        readonly Dictionary<Transform, Vector3> _basePos = new Dictionary<Transform, Vector3>();
        static void Swing(Transform t, Vector3 basePos, float pivotUp, float degrees)
        {   // rotate a limb about its top end (hip or shoulder), not its middle
            Quaternion q = Quaternion.Euler(degrees, 0, 0); Vector3 pivot = basePos + Vector3.up * pivotUp;
            t.localPosition = pivot + q * (basePos - pivot); t.localRotation = q;
        }
        Vector3 _home;

        void Awake()
        {
            if (Player == null) return;
            _home = Player.position;
            foreach (Transform t in Player) { if (t.name == "Leg") _legs.Add(t); if (t.name == "Arm") _arms.Add(t); _basePos[t] = t.localPosition; }
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
        }
        public void End() { Active = false; if (Player != null) Player.gameObject.SetActive(false); Near = null; }

        void Update()
        {
            if (!Active || Player == null) return;
            Keyboard k = Keyboard.current; Gamepad g = Gamepad.current; Mouse m = Mouse.current;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);

            // ---- camera orbit: Q/E or right mouse drag or right stick ----
            float turn = 0f, tilt = 0f;
            if (k != null) { if (k.qKey.isPressed) turn -= 1f; if (k.eKey.isPressed) turn += 1f; }
            if (g != null) { Vector2 rs = g.rightStick.ReadValue(); turn += rs.x; tilt -= rs.y; }
            if (m != null && m.rightButton.isPressed) { Vector2 d = m.delta.ReadValue(); turn += d.x * 0.12f; tilt -= d.y * 0.12f; }
            if (m != null) _dist = Mathf.Clamp(_dist - m.scroll.ReadValue().y * 0.01f, 4f, 22f);
            _yaw += turn * 95f * dt; _pitch = Mathf.Clamp(_pitch + tilt * 60f * dt, 2f, 55f);

            // ---- movement relative to the camera ----
            Vector2 move = Vector2.zero;
            if (k != null)
            {
                if (k.wKey.isPressed || k.upArrowKey.isPressed) move.y += 1; if (k.sKey.isPressed || k.downArrowKey.isPressed) move.y -= 1;
                if (k.dKey.isPressed || k.rightArrowKey.isPressed) move.x += 1; if (k.aKey.isPressed || k.leftArrowKey.isPressed) move.x -= 1;
            }
            if (g != null) move += g.leftStick.ReadValue();
            move += AutoMove;
            if (move.sqrMagnitude > 1f) move.Normalize();
            bool run = (k != null && k.leftShiftKey.isPressed) || (g != null && g.rightTrigger.ReadValue() > 0.3f);
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
            bool jump = (k != null && k.spaceKey.wasPressedThisFrame) || (g != null && g.buttonSouth.wasPressedThisFrame) || AutoJump;
            AutoJump = false;
            if (_grounded && jump) { _vy = JumpSpeed; _grounded = false; _jumpStartY = p.y; _peak = p.y; }
            if (!_grounded)
            {
                _vy -= MarsGravity * dt; p.y += _vy * dt; _air += dt; if (p.y > _peak) _peak = p.y;
                if (p.y <= ground) { p.y = ground; _grounded = true; _vy = 0; LastJumpHeight = _peak - _jumpStartY; _air = 0; }
            }
            else p.y = ground;
            Player.position = p;

            // ---- a simple stride: legs and arms swing while walking ----
            float moving = _grounded ? dir.magnitude : 0f;
            _walkPhase += moving * speed * dt * 2.6f;
            float swing = Mathf.Sin(_walkPhase) * 38f * Mathf.Clamp01(moving * 2f);
            for (int i = 0; i < _legs.Count; i++) Swing(_legs[i], _basePos[_legs[i]], 0.4f, (i % 2 == 0 ? swing : -swing) + (_grounded ? 0 : (i % 2 == 0 ? 25f : -15f)));
            for (int i = 0; i < _arms.Count; i++) Swing(_arms[i], _basePos[_arms[i]], 0.33f, (i % 2 == 0 ? -swing : swing) * 0.8f + (_grounded ? 0 : -150f));

            // ---- camera follows ----
            Vector3 target = p + Vector3.up * 1.5f;
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
