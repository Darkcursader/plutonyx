// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * sky.ts — the Martian sky: butterscotch by day, a BLUE glow around the Sun at sunrise and sunset
 * (real effect: fine dust scatters blue light forward), stars at night, brown-out in dust storms,
 * and a faint aurora shimmer during solar storms (Mars has real, planet-wide auroras).
 */
import * as THREE from 'three';

export class Sky {
  mesh: THREE.Mesh;
  u = {
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uDust: { value: 0 },
    uStorm: { value: 0 },
    uTime: { value: 0 },
    uDisc: { value: 1 },
    uEarth: { value: new THREE.Vector3(0.4, 0.25, -0.88).normalize() },
  };
  horizon = new THREE.Color();

  constructor() {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix * vec4(position, 0.0); gl_Position = projectionMatrix * vec4(p.xyz, 1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
varying vec3 vDir; uniform vec3 uSun; uniform vec3 uEarth; uniform float uDust; uniform float uStorm; uniform float uTime; uniform float uDisc;
float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = h31(vec3(i,1.0)), b = h31(vec3(i+vec2(1,0),1.0)), c = h31(vec3(i+vec2(0,1),1.0)), d = h31(vec3(i+vec2(1,1),1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
void main(){
  vec3 d = normalize(vDir);
  float up = clamp(d.y, -0.2, 1.0);
  float e = uSun.y;                                   // sine of the Sun's elevation
  float day = smoothstep(-0.10, 0.18, e);
  float low = 1.0 - smoothstep(0.02, 0.42, e);        // 1 near sunrise/sunset
  float sd = max(dot(d, normalize(uSun)), 0.0);
  // day sky: dusty butterscotch at the horizon, darker and browner overhead
  vec3 hzn = vec3(0.86, 0.64, 0.42), zen = vec3(0.42, 0.30, 0.22);
  vec3 col = mix(hzn, zen, pow(max(up, 0.0), 0.5)) * mix(0.02, 1.0, day);
  col *= mix(1.0, 0.72, low);                         // dimmer at low sun
  // warm aureole around the high Sun, blue aureole around the low Sun
  col += vec3(1.0, 0.86, 0.66) * (pow(sd, 48.0) * 0.55 + pow(sd, 6.0) * 0.12) * day * (1.0 - low);
  col += vec3(0.30, 0.52, 0.95) * (pow(sd, 20.0) * 1.3 + pow(sd, 4.0) * 0.38) * low * smoothstep(-0.16, 0.04, e);
  // dust storm: brown-out
  vec3 dust = vec3(0.50, 0.30, 0.16) * mix(0.03, 1.0, day);
  col = mix(col, dust * (0.55 + 0.45 * pow(sd, 3.0)), uDust * 0.88);
  // night: deep blue-black, stars, Earth as a bright evening star
  float night = 1.0 - day;
  col += vec3(0.010, 0.013, 0.024) * night;
  vec3 sp = d * 340.0; vec3 cell = floor(sp);
  float star = step(0.9972, h31(cell)) * smoothstep(0.32, 0.0, length(fract(sp) - 0.5)) * (0.35 + 0.65 * h31(cell + 7.0));
  col += vec3(0.9, 0.93, 1.0) * star * night * smoothstep(0.0, 0.25, d.y) * (1.0 - uDust) * 1.6;
  float ed = max(dot(d, normalize(uEarth)), 0.0);
  col += vec3(0.55, 0.75, 1.0) * (smoothstep(0.9999930, 0.9999985, ed) * 9.0 + pow(ed, 60000.0) * 0.5) * (0.25 + 0.75 * night) * (1.0 - uDust);
  // solar storm: faint violet-green curtains high in the sky
  if (uStorm > 0.001) {
    float az = atan(d.z, d.x);
    float band = n2(vec2(az * 3.0 + uTime * 0.05, d.y * 2.0 - uTime * 0.08)) * n2(vec2(az * 9.0 - uTime * 0.11, d.y * 7.0));
    float curtain = smoothstep(0.18, 0.75, band) * smoothstep(0.05, 0.5, d.y);
    col += mix(vec3(0.55, 0.30, 0.95), vec3(0.30, 0.95, 0.60), n2(vec2(az * 2.0, uTime * 0.04))) * curtain * uStorm * (0.35 + 0.65 * night) * 0.6;
  }
  // the Sun's disc (about two thirds of its size from Earth)
  col += vec3(1.0, 0.94, 0.86) * smoothstep(0.999955, 0.999985, sd) * 40.0 * uDisc * (1.0 - uDust * 0.93) * smoothstep(-0.02, 0.02, d.y);
  col = mix(col, col * 0.55, smoothstep(0.0, -0.2, d.y));
  gl_FragColor = vec4(col, 1.0);
}`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.name = 'mars-sky';
  }

  /** Horizon colour used for fog and ambient light, matching the shader above. */
  update(sun: THREE.Vector3, dust: number, storm: number, time: number): THREE.Color {
    this.u.uSun.value.copy(sun);
    this.u.uDust.value = dust; this.u.uStorm.value = storm; this.u.uTime.value = time;
    const day = THREE.MathUtils.smoothstep(sun.y, -0.1, 0.18);
    const low = 1 - THREE.MathUtils.smoothstep(sun.y, 0.02, 0.42);
    this.horizon.setRGB(0.80, 0.60, 0.40).multiplyScalar(THREE.MathUtils.lerp(0.02, 1, day) * THREE.MathUtils.lerp(1, 0.72, low));
    this.horizon.lerp(new THREE.Color(0.46, 0.28, 0.15).multiplyScalar(THREE.MathUtils.lerp(0.03, 1, day)), dust * 0.88);
    this.horizon.r += 0.008 * (1 - day); this.horizon.g += 0.01 * (1 - day); this.horizon.b += 0.02 * (1 - day);
    return this.horizon;
  }
}
