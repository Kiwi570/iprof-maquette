/* iProf — révélation des images par une tache d'encre (WebGL, OGL) */
import { Renderer } from "../vendor/ogl/core/Renderer.js";
import { Program } from "../vendor/ogl/core/Program.js";
import { Mesh } from "../vendor/ogl/core/Mesh.js";
import { Triangle } from "../vendor/ogl/extras/Triangle.js";

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uOrigin;
uniform vec3 uPaper;
uniform vec3 uInk;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  float asp = uRes.x / uRes.y;
  vec2 q = vUv * vec2(asp, 1.0);
  vec2 p = (vUv - uOrigin) * vec2(asp, 1.0);
  float d = length(p);
  float n = fbm(q * 3.0 + vec2(uTime * 0.06, -uTime * 0.03));
  float fib = fbm(q * 22.0 + 3.7);
  float e = d + (n - 0.5) * 0.55 + (fib - 0.5) * 0.07;
  float maxR = length(vec2(max(uOrigin.x, 1.0 - uOrigin.x) * asp, max(uOrigin.y, 1.0 - uOrigin.y))) + 0.5;
  float r = uProgress * maxR;

  float outside = smoothstep(r - 0.008, r + 0.008, e);
  float trail = (1.0 - outside) * smoothstep(r - 0.24, r, e);
  float front = 1.0 - smoothstep(0.0, 0.03, abs(e - r));
  float fade = 1.0 - smoothstep(0.72, 1.0, uProgress);

  // papier (hors de la tache), puis encre qui sèche derrière le front
  vec3 c = uPaper * outside;
  float a = outside;
  float ia = trail * 0.72 * fade;
  c = uInk * ia + c * (1.0 - ia);
  a = ia + a * (1.0 - ia);
  float fa = front * 0.92 * fade * step(0.001, uProgress);
  c = uInk * 0.85 * fa + c * (1.0 - fa);
  a = fa + a * (1.0 - fa);
  gl_FragColor = vec4(c, a);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function fallback(fig) {
  fig.classList.add("ink-done");
  fig.querySelector(".ph__frame").classList.add("ink-fallback");
}

let webglOK = null;
function reveal(fig, delay = 0) {
  if (!fig || fig.dataset.inked) return;
  fig.dataset.inked = "1";
  const frame = fig.querySelector(".ph__frame");
  if (document.documentElement.classList.contains("calm")) { fig.classList.add("ink-done"); return; }
  // pas de WebGL : repli direct, sans erreur console d'OGL
  if (webglOK === null) { try { const c = document.createElement("canvas"); webglOK = !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { webglOK = false; } }
  if (!webglOK) { fallback(fig); return; }
  let renderer;
  try {
    renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: false, depth: false, dpr: Math.min(window.devicePixelRatio || 1, 2) });
  } catch (e) { renderer = null; }
  const gl = renderer && renderer.gl;
  if (!gl) { fallback(fig); return; }
  const w = frame.offsetWidth, h = frame.offsetHeight;
  renderer.setSize(w, h);
  gl.clearColor(0, 0, 0, 0);
  const origin = (fig.dataset.inkOrigin || "0.46,0.42").split(",").map(Number);
  const program = new Program(gl, {
    vertex, fragment, transparent: false, depthTest: false, depthWrite: false,
    uniforms: {
      uProgress: { value: 0 }, uTime: { value: 0 }, uRes: { value: [w, h] }, uOrigin: { value: origin },
      uPaper: { value: hex("#FFFFFE") }, uInk: { value: hex("#2338B8") },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const canvas = gl.canvas;
  canvas.className = "ink-canvas";
  canvas.setAttribute("aria-hidden", "true");
  frame.appendChild(canvas);
  renderer.render({ scene: mesh });
  fig.classList.add("ink-done");

  const start = performance.now() + delay * 1000, dur = 2400;
  const loop = (now) => {
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    program.uniforms.uProgress.value = ease(t);
    program.uniforms.uTime.value = now / 1000;
    renderer.render({ scene: mesh });
    if (t < 1 && !document.documentElement.classList.contains("calm")) requestAnimationFrame(loop);
    else {
      canvas.remove();
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
  };
  requestAnimationFrame(loop);
}

window.iprofInk = reveal;
(window.__inkQueue || []).forEach(([fig, delay]) => reveal(fig, delay));
window.__inkQueue = [];
