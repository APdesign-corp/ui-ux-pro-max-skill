// Primitives d'animation déterministes : tout est fonction pure du temps,
// ce qui rend chaque image reproductible (rendu parallèle, scrub, export).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a)); // progression 0→1 entre a et b
export const mix2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
export const TAU = Math.PI * 2;

export const E = {
  linear: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inQuart: (x) => x * x * x * x,
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x) =>
    x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  outElastic: (x) =>
    x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

// Fenêtre trapézoïdale : 0 avant a, monte jusqu'à b, tient jusqu'à c, redescend à d.
export function win(t, a, b, c, d, ein = E.outCubic, eout = E.inCubic) {
  if (t <= a || t >= d) return 0;
  if (t < b) return ein(seg(t, a, b));
  if (t <= c) return 1;
  return 1 - eout(seg(t, c, d));
}

// Impulsion : attaque rapide puis décroissance exponentielle (flashs, impacts, shakes).
export function pulse(t, at, attack = 0.03, decay = 0.35) {
  if (t < at - attack) return 0;
  if (t < at) return (t - (at - attack)) / attack;
  return Math.exp(-(t - at) / decay);
}

// RNG déterministe (mulberry32)
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

// Bruit de valeur 1D lissé, [-1, 1]
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(a)})`;
}

// Horloge de scène : déformation temporelle linéaire par morceaux.
// Chaque scène est écrite sur une durée de référence ("design") ; ses ancres
// [tempsDesign, tempsGlobal] recalent les moments clés (explosion, scan, impact,
// apparition d'un nom…) sur l'instant exact où la voix off prononce le mot.
// Entre deux ancres, le mouvement est simplement accéléré ou ralenti.
function piecewise(pts, x, from, to) {
  const n = pts.length;
  let i = 0;
  while (i < n - 2 && x > pts[i + 1][from]) i++;
  const a = pts[i], b = pts[i + 1];
  const span = b[from] - a[from] || 1e-9;
  return a[to] + ((x - a[from]) * (b[to] - a[to])) / span;
}

export function makeSceneClock(timeline) {
  return timeline.scenes.map((s) => {
    const pts = [[0, s.start], ...(s.anchors || []), [s.design, s.end]].sort((p, q) => p[0] - q[0]);
    return {
      ...s,
      toLocal: (t) => piecewise(pts, t, 1, 0),
      toGlobal: (l) => piecewise(pts, l, 0, 1),
    };
  });
}

/**
 * Speed ramp : intègre une vitesse variable. keys = [[t, vitesse], ...] (vitesse interpolée
 * linéairement entre les clés, constante avant/après). Retourne le temps « déformé » à t.
 * Ex. ralenti puis accélération brutale : speedRamp(lt, [[0, 1], [0.8, 0.15], [1.2, 0.15], [1.35, 3]]).
 */
export function speedRamp(t, keys) {
  let acc = 0;
  let prevT = Math.min(0, keys[0][0]);
  let prevV = keys[0][1];
  if (t <= keys[0][0]) return t * keys[0][1];
  acc = keys[0][0] * keys[0][1];
  prevT = keys[0][0];
  for (let i = 1; i < keys.length; i++) {
    const [kt, kv] = keys[i];
    if (t <= kt) {
      const f = (t - prevT) / (kt - prevT || 1e-9);
      const v = prevV + (kv - prevV) * f;
      return acc + (t - prevT) * (prevV + v) / 2;
    }
    acc += (kt - prevT) * (prevV + kv) / 2;
    prevT = kt; prevV = kv;
  }
  return acc + (t - prevT) * prevV;
}

/** Interpolation Catmull-Rom sur une liste de points [x,y,z] (chemin de caméra lisse), u ∈ [0,1]. */
export function catmull(pts, u) {
  const n = pts.length - 1;
  const x = clamp(u) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  return p1.map((_, k) => {
    const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
    return 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
  });
}

export const v3lerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
