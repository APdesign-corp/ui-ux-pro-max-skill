// Outils partagés par les segments 03-roll et 04-interface (même agent).
// Tout est fonction pure du temps : aucun état conservé d'une image à l'autre.

import { E, clamp, lerp, seg, rng, rgba, TAU } from '../core/anim.js';
import { setFont, textWidth } from '../core/draw.js';
import { C, typewriter } from '../core/type.js';

export const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

/**
 * Plusieurs lignes tapées à la suite (une seule frappe continue, un seul curseur).
 * lines = [{ str, x, y, size, weight, align, color, highlight, tracking }]
 * o = { t, cps, alpha, out, hlDelay }
 */
export function typeLines(g, lines, o) {
  const cps = o.cps || 26;
  let acc = 0;
  const n = lines.length;
  let total = 0;
  for (const L of lines) total += L.str.length;
  for (let i = 0; i < n; i++) {
    const L = lines[i];
    const len = L.str.length;
    const tl = o.t - acc / cps;
    const last = i === n - 1;
    const nextStarted = !last && o.t - (acc + len) / cps > 0;
    if (tl >= 0) {
      typewriter(g, L.str, L.x, L.y, {
        size: L.size, weight: L.weight, tracking: L.tracking ?? 0, t: tl, cps,
        color: L.color || C.white, align: L.align || 'left',
        cursor: !nextStarted && o.cursor !== false, highlight: L.highlight ?? null,
        hlDelay: o.hlDelay ?? 0.06, alpha: o.alpha ?? 1, out: o.out || 0,
        hideCursorAfter: true,
      });
    }
    acc += len;
  }
  return { total, dur: total / cps };
}

/** Voile sombre derrière un bloc de texte (calque ui, composité après le bloom). */
export function scrimLinear(g, x0, y0, x1, y1, a) {
  if (a <= 0.003) return;
  const grd = g.createLinearGradient(x0, y0, x1, y1);
  grd.addColorStop(0, `rgba(2,4,3,${a})`);
  grd.addColorStop(0.55, `rgba(2,4,3,${a * 0.55})`);
  grd.addColorStop(1, 'rgba(2,4,3,0)');
  g.save();
  g.fillStyle = grd;
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
}

/**
 * Ciel du segment : sphère inversée qui suit la caméra, noir profond #040605 avec quelques
 * nappes vertes/teal très douces liées aux DIRECTIONS du monde (elles tournent avec la caméra,
 * ce qui rend roulis et whip pans lisibles) — le fond reste cohérent quelle que soit la direction.
 */
export function makeSky(THREE, o = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: new THREE.Color(C.bg) },
      uNeon: { value: new THREE.Color(C.neon) },
      uTeal: { value: new THREE.Color(C.teal) },
      uK: { value: 1 },
      uD1: { value: new THREE.Vector3(...(o.d1 || [0.35, 0.45, -1])).normalize() },
      uD2: { value: new THREE.Vector3(...(o.d2 || [-1, -0.35, -0.2])).normalize() },
      uD3: { value: new THREE.Vector3(...(o.d3 || [0.8, -0.6, 0.3])).normalize() },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg, uNeon, uTeal, uD1, uD2, uD3; uniform float uK, uTime; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float a = pow(max(dot(d, uD1), 0.0), 5.0);
        float b = pow(max(dot(d, uD2), 0.0), 7.0);
        float c = pow(max(dot(d, uD3), 0.0), 9.0);
        float band = exp(-pow(d.y * 3.2 + sin(d.x * 3.0 + uTime * 0.4) * 0.25, 2.0));
        vec3 col = uBg + uNeon * (a * 0.016 + band * 0.0045) * uK + uTeal * (b * 0.011 + c * 0.006) * uK;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), mat);
  mesh.renderOrder = -20;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/** Rayons de lumière (god rays) qui partent d'un point projeté. Calque fx additif. */
export function godRays(g, x, y, R, t, a, o = {}) {
  if (a <= 0.003) return;
  const r = rng(o.seed || 77);
  const n = o.count || 14;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const base = r() * TAU + t * (o.spin ?? 0.15) * (r() < 0.5 ? -1 : 1);
    const w = 0.02 + r() * 0.07;
    const len = R * (0.55 + r() * 0.65);
    const fl = 0.55 + 0.45 * Math.sin(t * (1.5 + r() * 3) + i * 1.7);
    const grd = g.createRadialGradient(x, y, 0, x, y, len);
    const col = i % 3 === 0 ? C.teal : C.neon2;
    grd.addColorStop(0, rgba('#eaffea', a * 0.55 * fl));
    grd.addColorStop(0.18, rgba(col, a * 0.32 * fl));
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

/** Texture Canvas d'un halo radial (sprites de contre-jour, brume). */
export function glowTexture(THREE, size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grd.addColorStop(o, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Plan additif « halo » qui fait face à la caméra (contre-jour volumétrique). */
export function glowSprite(THREE, tex, color, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: tex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: true,
    }),
  );
  m.renderOrder = 2;
  return m;
}

/**
 * Mot géant en 3D (plan texturé Canvas) : canal R = remplissage, canal G = contour.
 * Un shader ajoute un balayage néon qui court sur le contour.
 */
export function giantWord(THREE, str, o = {}) {
  const weight = o.weight || 900;
  const size = 300;
  const probe = document.createElement('canvas').getContext('2d');
  const tw = textWidth(probe, str, size, weight, o.tracking ?? -0.02);
  const pad = size * 0.25;
  const c = document.createElement('canvas');
  c.width = Math.ceil(tw + pad * 2);
  c.height = Math.ceil(size * 1.3);
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  setFont(g, size, weight, o.tracking ?? -0.02);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const by = size * 1.03;
  // remplissage (R)
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = '#ff0000';
  g.fillText(str, pad, by);
  // contour (G)
  g.lineWidth = size * 0.022;
  g.lineJoin = 'round';
  g.strokeStyle = '#00ff00';
  g.strokeText(str, pad, by);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uFill: { value: 0.12 },
      uLine: { value: 0.6 },
      uSweep: { value: -1 },
      uOpacity: { value: 1 },
      uWhite: { value: new THREE.Color('#f4f8f4') },
      uNeon: { value: new THREE.Color(C.neon) },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uFill, uLine, uSweep, uOpacity; uniform vec3 uWhite, uNeon;
      varying vec2 vUv;
      void main(){
        vec4 t = texture2D(map, vUv);
        float band = exp(-pow((vUv.x - uSweep) * 7.0, 2.0));
        vec3 c = uWhite * (t.r * uFill + t.g * uLine) + uNeon * t.g * band * 2.2 + uNeon * t.r * band * 0.25;
        gl_FragColor = vec4(c * uOpacity, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, c.height / c.width), mat);
  mesh.renderOrder = 1;
  return { mesh, mat, aspect: c.width / c.height };
}

/** Traînée lumineuse le long d'une liste de points écran [[x,y],...] (du plus ancien au plus récent). */
export function trail(g, pts, width, color, alpha) {
  if (alpha <= 0.003 || pts.length < 2) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const n = pts.length;
  for (let i = 1; i < n; i++) {
    const k = i / (n - 1);
    const a = pts[i - 1], b = pts[i];
    if (a[2] > 1 || b[2] > 1) continue; // derrière la caméra
    g.strokeStyle = rgba(k > 0.85 ? '#eaffea' : color, alpha * k * k);
    g.lineWidth = width * (0.25 + 0.75 * k);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  g.restore();
}

/** Lignes horizontales de whip pan (calque fx). k = 0..1 */
export function whipStreaks(g, W, H, t, k, u, seed = 5) {
  if (k <= 0.003) return;
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 36; i++) {
    const y = r() * H;
    const len = (0.25 + r() * 0.6) * W * k;
    const x = ((r() + t * (2 + r() * 3)) % 1.4 - 0.2) * W;
    const grd = g.createLinearGradient(x - len, y, x + len, y);
    const col = i % 4 === 0 ? C.teal : i % 3 === 0 ? '#ffffff' : C.neon;
    grd.addColorStop(0, rgba(col, 0));
    grd.addColorStop(0.5, rgba(col, 0.55 * k));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.fillRect(x - len, y - (1 + r() * 3) * u, len * 2, (2 + r() * 5) * u);
  }
  g.restore();
}

/** Remplit une forme quadrilatère projetée (coins écran) avec un dégradé radial additif. */
export function glowQuad(g, pts, cx, cy, scale, R, a, inner = '#ffffff', outer = C.neon) {
  if (a <= 0.003) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.beginPath();
  pts.forEach((p, i) => {
    const x = cx + (p[0] - cx) * scale, y = cy + (p[1] - cy) * scale;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  });
  g.closePath();
  const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  grd.addColorStop(0, rgba(inner, a));
  grd.addColorStop(0.45, rgba(outer, a * 0.6));
  grd.addColorStop(1, rgba(C.teal, a * 0.15));
  g.fillStyle = grd;
  g.fill();
  g.restore();
}

export { E, clamp, lerp, seg, rgba };
