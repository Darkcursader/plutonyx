// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// AstronautRig.cs — the joints of a suited crew figure (hips, knees, shoulders, elbows) and the poses that move
// them: a loping low-gravity walk, a jump, and a quiet idle. The figure has a mirrored visor and no face.
using UnityEngine;

namespace PlutonyX.Game
{
    public sealed class AstronautRig : MonoBehaviour
    {
        public Transform Body, HipL, HipR, KneeL, KneeR, ShoulderL, ShoulderR, ElbowL, ElbowR, Head;
        public float IdleSeed;
        Vector3 _bodyHome; bool _init;
        float _lastPose = -10f;

        void Init() { if (_init || Body == null) return; _bodyHome = Body.localPosition; _init = true; }

        /// <summary>phase: stride angle in radians; amount: 0 standing .. 1 full stride; air: off the ground.</summary>
        public void Pose(float phase, float amount, bool air)
        {
            Init(); _lastPose = Time.time;
            if (Body == null) return;
            float s = Mathf.Sin(phase), c = Mathf.Cos(phase);
            if (air)
            {
                Set(HipL, -28f, 0, 0); Set(HipR, 14f, 0, 0); Set(KneeL, 46f, 0, 0); Set(KneeR, 30f, 0, 0);
                Set(ShoulderL, -62f, 0, -14f); Set(ShoulderR, -48f, 0, 14f); Set(ElbowL, -30f, 0, 0); Set(ElbowR, -35f, 0, 0);
                Body.localPosition = _bodyHome; Body.localRotation = Quaternion.Euler(6f, 0, 0);
                return;
            }
            float hip = 30f * amount;
            Set(HipL, -s * hip, 0, 0); Set(HipR, s * hip, 0, 0);
            Set(KneeL, Mathf.Max(0f, c) * 48f * amount + 4f, 0, 0); Set(KneeR, Mathf.Max(0f, -c) * 48f * amount + 4f, 0, 0);
            Set(ShoulderL, s * 26f * amount, 0, -7f); Set(ShoulderR, -s * 26f * amount, 0, 7f);
            Set(ElbowL, -14f - Mathf.Max(0f, s) * 22f * amount, 0, 0); Set(ElbowR, -14f - Mathf.Max(0f, -s) * 22f * amount, 0, 0);
            Body.localPosition = _bodyHome + Vector3.up * (Mathf.Abs(c) * 0.045f * amount);
            Body.localRotation = Quaternion.Euler(5f * amount, s * 5f * amount, 0);
            if (Head != null) Head.localRotation = Quaternion.identity;
        }

        static void Set(Transform t, float x, float y, float z) { if (t != null) t.localRotation = Quaternion.Euler(x, y, z); }

        void Update()
        {
            if (Time.time - _lastPose < 0.25f) return;          // someone else is driving the pose this frame
            Init(); if (Body == null) return;
            float t = Time.time * 0.6f + IdleSeed;
            Set(HipL, 0, 0, 0); Set(HipR, 0, 0, 0); Set(KneeL, 3f, 0, 0); Set(KneeR, 3f, 0, 0);
            Set(ShoulderL, 4f + Mathf.Sin(t) * 3f, 0, -8f); Set(ShoulderR, 4f - Mathf.Sin(t * 0.8f) * 3f, 0, 8f);
            Set(ElbowL, -18f - Mathf.Sin(t * 0.7f) * 6f, 0, 0); Set(ElbowR, -22f + Mathf.Sin(t * 0.5f) * 6f, 0, 0);
            Body.localPosition = _bodyHome + Vector3.up * (Mathf.Sin(t * 1.3f) * 0.006f);
            Body.localRotation = Quaternion.Euler(Mathf.Sin(t * 0.4f) * 1.5f, Mathf.Sin(t * 0.23f) * 6f, 0);
            if (Head != null) Head.localRotation = Quaternion.Euler(0, Mathf.Sin(t * 0.31f + 1f) * 18f, 0);
        }
    }
}
