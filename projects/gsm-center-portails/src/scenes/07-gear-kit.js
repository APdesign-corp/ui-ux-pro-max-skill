// Outils communs aux segments 07-gear (18→22 s) et 08-city (22→26 s) (même agent).
// Tout est fonction pure du temps : aucun état conservé d'une image à l'autre.

import { E, clamp, lerp, seg, rng, rgba, noise1, TAU } from '../core/anim.js';
import { setFont, charLayout } from '../core/draw.js';
import { C } from '../core/type.js';

// ------------------------------------------------------------------ pistes d'animation
// Courbes d'accélération. 'burst' = départ explosif sur le temps puis ralenti (speed ramp).
export const EASE = {
  lin: (x) => x,
  io: E.inOutSine,
  ioc: E.inOutCubic,
  out: E.outCubic,
  outq: E.outQuart,
  in: E.inQuad,
  inc: E.inCubic,
  burst: (x) => 0.14 * x + 0.86 * E.outExpo(x),
  soft: (x) => 0.3 * x + 0.7 * E.outCubic(x),
  whip: (x) => 0.08 * x + 0.92 * E.inOutExpo(x),
};

/** Piste de clés [[t, valeur, ease?], ...] : l'ease d'une clé s'applique depuis la clé précédente. */
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k[0]) {
      const p = keys[i - 1];
      const x = (t - p[0]) / (k[0] - p[0] || 1e-9);
      return p[1] + (k[1] - p[1]) * (EASE[k[2] || 'io'])(x);
    }
  }
  return keys[keys.length - 1][1];
}

// Raccord gear → city (traversée 4) : orientation de la caméra à la fin de la chute libre.
// L'écran (0.682 × 1.502 unités) correspond à la carte de la ville (SX × SX·1340/600 unités).
export const DIVE = {
  th: 0.22, ph: 1.49,
  roll: (V) => (V ? 0.2 : 0.3),
  fov: (V) => (V ? 52 : 40),
  frameW: (V) => (V ? 0.47 : 0.55),     // largeur d'écran visible à 22.0 (unités du téléphone)
  screenW: 0.682, screenH: 1.502,
};
export const CITY_SX = 40;              // largeur de la carte (écran) dans la ville
export const CITY_SZ = CITY_SX * 1340 / 600;
/** Fraction de l'écran carte (x→droite, y→bas) → coordonnées ville (repère du magasin = MAP_PIN). */
export const mapToCity = (mx, my, pin) => [(mx - pin[0]) * CITY_SX, (my - pin[1]) * CITY_SZ];
/** Distance caméra-écran à 22.0 pour que l'écran remplisse le cadre. */
export function diveEndDist(V, aspect) {
  const fov = DIVE.fov(V) * Math.PI / 180;
  return DIVE.frameW(V) / (2 * Math.tan(fov / 2) * aspect);
}

// ------------------------------------------------------------------ textures / ciel
const texCache = new Map();
export function glowTexture(THREE, key = 'soft') {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (key === 'core') {
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.12, 'rgba(255,255,255,0.8)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

/** Plan additif (halo, contre-jour, reflet) : face à la caméra si billboard. */
export function glowPlane(THREE, color, opacity = 1, key = 'soft') {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: glowTexture(THREE, key), color: new THREE.Color(color), transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  return m;
}

/**
 * Ciel : sphère inversée noire #040605 avec nappes vertes / teal très douces liées aux directions
 * du monde (elles tournent avec la caméra : les whip pans et les roulis restent lisibles).
 * horizon : bande lumineuse (pollution lumineuse de la ville) au ras de l'horizon.
 */
export function makeSky(THREE, o = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: new THREE.Color(C.bg) },
      uNeon: { value: new THREE.Color(C.neon) },
      uTeal: { value: new THREE.Color(C.teal) },
      uK: { value: 1 },
      uHorizon: { value: o.horizon ?? 0 },
      uD1: { value: new THREE.Vector3(...(o.d1 || [0.35, 0.45, -1])).normalize() },
      uD2: { value: new THREE.Vector3(...(o.d2 || [-1, -0.35, -0.2])).normalize() },
      uD3: { value: new THREE.Vector3(...(o.d3 || [0.8, -0.6, 0.3])).normalize() },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg, uNeon, uTeal, uD1, uD2, uD3; uniform float uK, uTime, uHorizon; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float a = pow(max(dot(d, uD1), 0.0), 5.0);
        float b = pow(max(dot(d, uD2), 0.0), 7.0);
        float c = pow(max(dot(d, uD3), 0.0), 9.0);
        float band = exp(-pow(d.y * 3.2 + sin(d.x * 3.0 + uTime * 0.4) * 0.25, 2.0));
        float hz = exp(-pow((d.y - 0.02) * 9.0, 2.0)) * uHorizon;
        vec3 col = uBg + uNeon * (a * 0.016 + band * 0.0045) * uK + uTeal * (b * 0.011 + c * 0.006) * uK;
        col += mix(uTeal, uNeon, 0.55) * hz * 0.05 + vec3(0.02, 0.05, 0.03) * hz * 0.4;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius || 90, 32, 16), mat);
  mesh.renderOrder = -20;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/** Tube néon (cylindre ouvert, extrémités fondues par couleurs de sommets, additif). */
export function neonTubeGeometry(THREE, radius = 0.026, fade = 3) {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 8, 12, true);
  const pa = geo.attributes.position;
  const col = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) {
    const k = Math.max(0, 1 - Math.pow(Math.abs(pa.getY(i)) * 2, fade));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// ------------------------------------------------------------------ 2D (calques fx / ui)
/** Flash de bord : liseré lumineux sur les 4 bords du cadre (calque fx, additif). */
export function edgeFlash(g, W, H, k, u, color = C.neon) {
  if (k <= 0.003) return;
  const d = 150 * u;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const edges = [
    [0, 0, 0, d, 0, 0, W, d], [0, H, 0, H - d, 0, H - d, W, d],
    [0, 0, d, 0, 0, 0, d, H], [W, 0, W - d, 0, W - d, 0, d, H],
  ];
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
    const grd = g.createLinearGradient(x0, y0, x1, y1);
    grd.addColorStop(0, rgba('#ffffff', 0.55 * k));
    grd.addColorStop(0.08, rgba(color, 0.5 * k));
    grd.addColorStop(1, rgba(color, 0));
    g.fillStyle = grd;
    g.fillRect(rx, ry, rw, rh);
  }
  g.restore();
}

/** Lignes horizontales de whip pan (calque fx). */
export function whipStreaks(g, W, H, t, k, u, seed = 5) {
  if (k <= 0.003) return;
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) {
    const y = r() * H;
    const len = (0.25 + r() * 0.6) * W * k;
    const x = ((r() + t * (2 + r() * 3)) % 1.4 - 0.2) * W;
    const grd = g.createLinearGradient(x - len, y, x + len, y);
    const col = i % 4 === 0 ? C.teal : i % 3 === 0 ? '#ffffff' : C.neon;
    grd.addColorStop(0, rgba(col, 0));
    grd.addColorStop(0.5, rgba(col, 0.5 * k));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.fillRect(x - len, y - (1 + r() * 3) * u, len * 2, (2 + r() * 5) * u);
  }
  g.restore();
}

/** Rayons de lumière (god rays) depuis un point écran (calque fx). */
export function godRays(g, x, y, R, t, a, o = {}) {
  if (a <= 0.003) return;
  const r = rng(o.seed || 77);
  const n = o.count || 14;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const base = r() * TAU + t * (o.spin ?? 0.15) * (r() < 0.5 ? -1 : 1);
    const w = 0.02 + r() * 0.06;
    const len = R * (0.55 + r() * 0.65);
    const fl = 0.55 + 0.45 * Math.sin(t * (1.5 + r() * 3) + i * 1.7);
    const grd = g.createRadialGradient(x, y, 0, x, y, len);
    const col = i % 3 === 0 ? C.teal : C.neon2;
    grd.addColorStop(0, rgba('#eaffea', a * 0.5 * fl));
    grd.addColorStop(0.18, rgba(col, a * 0.28 * fl));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, len, base - w, base + w);
    g.closePath();
    g.fill();
  }
  g.restore();
}

/** Ombre portée douce derrière le texte (calque ui) pour le détacher des objets lumineux. */
export function withShadow(g, u, a, fn) {
  g.save();
  g.shadowColor = `rgba(1,4,2,${0.75 * a})`;
  g.shadowBlur = 34 * u;
  g.shadowOffsetY = 4 * u;
  fn();
  g.restore();
}

/**
 * Texte dont chaque lettre « claque » : arrivée x2.4 floue → taille finale, tremblement, puis
 * sortie (out 0→1 : les lettres s'envolent vers la gauche avec traînée). Retourne la largeur.
 */
export function slamWord(g, str, x, y, o) {
  const size = o.size, weight = o.weight || 900, t = o.t;
  if (t < 0) return 0;
  const L = charLayout(g, str, size, weight, o.tracking ?? -0.03);
  const x0 = o.align === 'center' ? x - L.width / 2 : o.align === 'right' ? x - L.width : x;
  const out = clamp(o.out || 0);
  setFont(g, size, weight, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const n = L.chars.length;
  for (let i = 0; i < n; i++) {
    const c = L.chars[i];
    if (c.ch === ' ') continue;
    const ti = t - i * (o.stagger ?? 0.012);
    const p = E.outQuart(seg(ti, 0, o.dur || 0.16));
    if (p <= 0) continue;
    const sc = lerp(o.from ?? 2.4, 1, p);
    const shake = ti > (o.dur || 0.16) ? Math.exp(-(ti - (o.dur || 0.16)) * 10) * size * 0.045 * (o.shake ?? 1) : 0;
    const po = E.inCubic(clamp(out * 1.6 - (n - 1 - i) / n * 0.6));
    const a = (o.alpha ?? 1) * clamp(p * 2.2) * (1 - po);
    if (a <= 0.003) continue;
    const cx = x0 + c.x + c.w / 2;
    g.save();
    g.translate(cx + noise1(ti * 40 + i) * shake - po * size * (2.5 + i * 0.3) * (o.outDir ?? -1), y + noise1(ti * 37 + 5 + i) * shake - po * size * 0.2 * (i % 2 ? 1 : -1));
    g.scale(sc * (1 + po * 0.6), sc * (1 - po * 0.4));
    g.globalAlpha = a;
    g.fillStyle = o.colorAt ? o.colorAt(i) : o.color || C.white;
    g.fillText(c.ch, -c.w / 2, 0);
    g.restore();
  }
  return L.width;
}

export { E, clamp, lerp, seg, rgba, noise1, TAU };
