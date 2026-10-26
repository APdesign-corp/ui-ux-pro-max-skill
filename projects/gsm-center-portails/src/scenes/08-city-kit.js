// Outils du segment 08-city (22 → 26 s) : Liège de nuit stylisée, construite À PARTIR de la carte
// du téléphone de gear (app `map` de world/screens.js) pour que le raccord soit exact :
//  - repère du magasin (MAP_PIN) = origine du monde de la ville
//  - itinéraire (MAP_ROUTE) et Meuse (courbe de Bézier de l'app map) recopiés à l'échelle
//    CITY_SX (unités ville par largeur d'écran) exportée par 07-gear-kit.js
// Tout est construit une fois dans create() ; les shaders sont animés par uniformes.

import * as THREE from 'three';
import { clamp, lerp, noise1 } from '../core/anim.js';
import { C } from '../core/type.js';
import { MAP_PIN, MAP_ROUTE } from '../world/screens.js';
import * as GK from './07-gear-kit.js';

// ------------------------------------------------------------------ repère carte → ville
export const SX = GK.CITY_SX ?? 40;
export const SZ = GK.CITY_SZ ?? (SX * 1340) / 600;
export const toCity = (mx, my) => [(mx - MAP_PIN[0]) * SX, (my - MAP_PIN[1]) * SZ];
export const CENTER = toCity(0.5, 0.5);              // centre de l'écran-carte au raccord (22.0)
export const ROUTE2D = MAP_ROUTE.map(([a, b]) => toCity(a, b));
export const RIVER_HALF_MAP = ((34 / 600) * SX) / 2;  // largeur du trait de la Meuse sur la carte
export const RIVER_HALF = 2.6;
export const QUAY_OFF = RIVER_HALF + 0.95;
export const EXT = 80;                                // demi-taille de la texture des rues

// Meuse : même Bézier que l'app map (moveTo(0.1w,-20) bezierCurveTo(0.5w,0.3h, 0.2w,0.6h, 0.8w,h+20))
const RB = [[0.1, -20 / 1340], [0.5, 0.3], [0.2, 0.6], [0.8, 1 + 20 / 1340]].map(([a, b]) => toCity(a, b));
export function riverAt(s) {
  const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
  return [a * RB[0][0] + b * RB[1][0] + c * RB[2][0] + d * RB[3][0], a * RB[0][1] + b * RB[1][1] + c * RB[2][1] + d * RB[3][1]];
}
// z(s) est strictement croissant : table z → x
const RZ0 = -110, RZ1 = 120, RN = 2301;
const RX = new Float32Array(RN);
{
  let s = -0.8;
  for (let i = 0; i < RN; i++) {
    const z = RZ0 + ((RZ1 - RZ0) * i) / (RN - 1);
    while (riverAt(s)[1] < z && s < 1.8) s += 0.0004;
    RX[i] = riverAt(s)[0];
  }
}
export function riverX(z) {
  const f = ((clamp(z, RZ0, RZ1 - 0.01) - RZ0) / (RZ1 - RZ0)) * (RN - 1);
  const i = Math.floor(f);
  return lerp(RX[i], RX[i + 1], f - i);
}
export function riverDist(x, z) {
  const sl = riverX(z + 0.5) - riverX(z - 0.5);
  return Math.abs(x - riverX(z)) / Math.sqrt(1 + sl * sl);
}

function segDist(px, pz, s) {
  const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
  const t = clamp(((px - s.a[0]) * dx + (pz - s.a[1]) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(px - (s.a[0] + dx * t), pz - (s.a[1] + dz * t));
}

// ------------------------------------------------------------------ réseau de rues
export const BRIDGE_Z = [-40, -16, 8, 40, 64];
export function buildStreets() {
  const S = [];
  const push = (a, b, w, kind) => S.push({ a, b, w, kind, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const cut = (ax, az, bx, bz, w, kind, bridge) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.25);
    let start = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(ax, bx, t), z = lerp(az, bz, t);
      const wet = !bridge && riverDist(x, z) < RIVER_HALF + 0.35;
      if (!wet && start === null) start = t;
      if ((wet || i === n) && start !== null) {
        const e = wet ? (i - 1) / n : t;
        if ((e - start) * L > 1.5) push([lerp(ax, bx, start), lerp(az, bz, start)], [lerp(ax, bx, e), lerp(az, bz, e)], w, kind);
        start = null;
      }
    }
  };
  for (let g = -72; g <= 72; g += 8) {
    cut(g, -EXT + 4, g, EXT - 4, 1.2, 'grid', false);
    cut(-EXT + 4, g, EXT - 4, g, 1.2, 'grid', BRIDGE_Z.includes(g));
  }
  // itinéraire (rues de la carte), prolongé avant le départ
  const R = ROUTE2D;
  const d0 = [R[0][0] - R[1][0], R[0][1] - R[1][1]], l0 = Math.hypot(...d0);
  push([R[0][0] + (d0[0] / l0) * 6, R[0][1] + (d0[1] / l0) * 6], R[0], 1.5, 'route');
  for (let i = 1; i < R.length; i++) push(R[i - 1], R[i], 1.5, 'route');
  // quais (deux rives), en cordes de ~5 unités
  for (const side of [-1, 1]) {
    let prev = null;
    for (let z = RZ0 + 12; z <= RZ1 - 12; z += 4.6) {
      const x = riverX(z), sl = riverX(z + 0.5) - riverX(z - 0.5), n = Math.hypot(1, sl);
      const p = [x + (side * QUAY_OFF) / n, z - (side * QUAY_OFF * sl) / n];
      if (prev && Math.max(Math.abs(p[0]), Math.abs(p[1])) < EXT + 6) push(prev, p, 1.0, 'quay');
      prev = p;
    }
  }
  return S;
}

// Ponts : rues de BRIDGE_Z + traversée de l'itinéraire (segment 1 → 2)
export function buildBridges() {
  const out = [];
  for (const z of BRIDGE_Z) {
    const x = riverX(z), sl = riverX(z + 0.5) - riverX(z - 0.5);
    const half = (RIVER_HALF + 0.7) * Math.hypot(1, sl);
    out.push({ a: [x - half, z], b: [x + half, z], w: 1.25 });
  }
  const [p, q] = [ROUTE2D[1], ROUTE2D[2]];
  let tc = 0.5;
  for (let i = 0, best = 1e9; i <= 400; i++) {
    const t = i / 400, d = riverDist(lerp(p[0], q[0], t), lerp(p[1], q[1], t));
    if (d < best) { best = d; tc = t; }
  }
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), dx = (q[0] - p[0]) / L, dz = (q[1] - p[1]) / L;
  const cx = lerp(p[0], q[0], tc), cz = lerp(p[1], q[1], tc);
  const sl = riverX(cz + 0.5) - riverX(cz - 0.5), rn = Math.hypot(sl, 1);
  const sinA = Math.abs(dx * (1 / rn) - dz * (sl / rn)) || 0.5;   // |route × direction du fleuve|
  const half = (RIVER_HALF + 0.7) / Math.max(0.35, sinA);
  out.push({ a: [cx - dx * half, cz - dz * half], b: [cx + dx * half, cz + dz * half], w: 1.6, route: true });
  return out;
}

// ------------------------------------------------------------------ lots → bâtiments
export function buildLots(streets, r) {
  const out = [];
  const SP = 1.7;
  const RL = ROUTE2D, last = [RL[RL.length - 1][0] - RL[RL.length - 2][0], RL[RL.length - 1][1] - RL[RL.length - 2][1]];
  const ll = Math.hypot(...last);
  const back = [last[0] / ll, last[1] / ll];   // direction d'arrivée de l'itinéraire
  // le magasin : juste derrière le repère, façade tournée vers l'itinéraire
  const store = { x: back[0] * 1.75, z: back[1] * 1.75, w: 1.9, d: 1.15, h: 1.05, yaw: Math.atan2(-back[0], -back[1]), style: 2, roof: 1, seed: 0.5 };
  for (let gx = -EXT + 2; gx <= EXT - 2; gx += SP) {
    for (let gz = -EXT + 2; gz <= EXT - 2; gz += SP) {
      const x = gx + (r() - 0.5) * 0.45, z = gz + (r() - 0.5) * 0.45;
      const w = 0.8 + r() * 0.62, d = 0.8 + r() * 0.62;
      const hr = r(), tower = r(), seed = r(), roof = r();
      const rad = 0.5 * Math.max(w, d);
      const dp = Math.hypot(x, z);
      if (dp < 3.5) continue;
      if (Math.hypot(x - store.x, z - store.z) < 2.0) continue;
      if (riverDist(x, z) < QUAY_OFF + 0.5 + rad + 0.15) continue;
      let best = 1e9, bang = 0, ok = true;
      for (const s of streets) {
        const dd = segDist(x, z, s);
        if (dd < s.w / 2 + rad * 1.05 + 0.12) { ok = false; break; }
        if (dd < best) { best = dd; bang = s.ang; }
      }
      if (!ok) continue;
      let h = 0.45 + 1.55 * Math.pow(hr, 1.7);
      if (tower < 0.035 && dp > 15) h = 3.0 + 4.4 * hr;
      if (dp < 7.5) h = Math.min(h, 1.25);
      else if (dp < 13) h = Math.min(h, 2.1);
      // bâtiments alignés sur la rue la plus proche (îlots organiques le long des diagonales)
      const yaw = best < 3.2 ? -bang : 0;
      out.push({ x, z, w, d, h, yaw, seed, style: tower < 0.035 && dp > 15 ? 1 : 0, roof: roof < 0.11 ? 1 : 0 });
    }
  }
  out.push(store);
  return out;
}

// ------------------------------------------------------------------ itinéraire (courbe à coins arrondis)
export function routeCurve() {
  const P = ROUTE2D.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const path = new THREE.CurvePath();
  const R = 1.4;
  let cur = P[0].clone();
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const r = Math.min(R, d1.length() * 0.45, d2.length() * 0.45);
    const p1 = b.clone().addScaledVector(d1.normalize(), -r), p2 = b.clone().addScaledVector(d2.normalize(), r);
    path.add(new THREE.LineCurve3(cur, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    cur = p2;
  }
  path.add(new THREE.LineCurve3(cur, P[P.length - 1].clone()));
  const N = 900;
  const pts = path.getSpacedPoints(N);
  const len = path.getLength();
  return { pts, len, N };
}

/** Position sur l'itinéraire à l'abscisse curviligne s (table pré-calculée). */
export function routeAtArc(R, s, out = [0, 0, 0]) {
  const f = clamp(s / R.len) * R.N;
  const i = Math.min(R.N - 1, Math.floor(f)), k = f - i;
  const a = R.pts[i], b = R.pts[i + 1];
  out[0] = lerp(a.x, b.x, k); out[1] = 0; out[2] = lerp(a.z, b.z, k);
  return out;
}

// ------------------------------------------------------------------ GLSL commun
export const GLSL_COMMON = /* glsl */ `
  uniform vec3 uFogLow; uniform vec3 uFogHigh; uniform float uFogDen; uniform float uMist;
  uniform vec3 uNeon; uniform vec3 uTeal; uniform vec3 uWhite;
  uniform float uTime;
  float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  vec3 applyFog(vec3 col, vec3 wp){
    float d = length(wp - cameraPosition);
    float k = 1.0 - exp(-uFogDen * uFogDen * d * d);
    float hm = exp(-max(wp.y, 0.0) * 0.55);
    k = clamp(k + uMist * hm * (1.0 - exp(-d * 0.022)), 0.0, 1.0);
    return mix(col, mix(uFogHigh, uFogLow, hm), k);
  }`;

export function sharedUniforms() {
  return {
    uFogLow: { value: new THREE.Color(0.004, 0.0115, 0.008) },
    uFogHigh: { value: new THREE.Color(0.0013, 0.0026, 0.002) },
    uFogDen: { value: 0.0072 },
    uMist: { value: 0.32 },
    uNeon: { value: new THREE.Color(C.neon) },
    uTeal: { value: new THREE.Color(C.teal) },
    uWhite: { value: new THREE.Color(C.white) },
    uTime: { value: 0 },
    uWin: { value: 1 },        // allumage des fenêtres / éclairage urbain
    uMap: { value: 0 },        // 1 = aspect « carte du téléphone » (raccord), 0 = ville réelle
    uRise: { value: 1 },       // sortie de terre des bâtiments (0 → 1.2)
    uL1: { value: new THREE.Vector3() },  // tête de l'itinéraire (lumière mobile)
    uL1K: { value: 0 },
    uL2K: { value: 0 },        // colonne de lumière du magasin
    uWaveR: { value: -10 },    // onde d'arrivée qui traverse la ville
    uWaveK: { value: 0 },
  };
}

const mat = (U, o) => new THREE.ShaderMaterial({ ...o, uniforms: { ...U, ...(o.uniforms || {}) } });

// ------------------------------------------------------------------ bâtiments (InstancedMesh, fenêtres procédurales)
export function buildingMesh(lots, U, CENTER2) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const material = mat(U, {
    vertexShader: /* glsl */ `
      attribute vec4 aInfo;
      uniform float uRise;
      varying vec3 vL; varying vec3 vNl; varying vec3 vNw; varying vec3 vW; varying vec4 vI; varying vec3 vSz;
      void main(){
        float w = length(instanceMatrix[0].xyz), h = length(instanceMatrix[1].xyz), d = length(instanceMatrix[2].xyz);
        float g = clamp((uRise - aInfo.y) / 0.34, 0.0, 1.0);
        g = 1.0 - (1.0 - g) * (1.0 - g) * (1.0 - g);
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        wp.y -= (1.0 - g) * (h + 0.03);
        vL = position * vec3(w, h, d);
        vNl = normal;
        vNw = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vW = wp.xyz; vI = aInfo; vSz = vec3(w, h, d);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uWin; uniform vec3 uL1; uniform float uL1K; uniform float uL2K; uniform float uWaveR; uniform float uWaveK;
      varying vec3 vL; varying vec3 vNl; varying vec3 vNw; varying vec3 vW; varying vec4 vI; varying vec3 vSz;
      void main(){
        vec3 n = vNl;
        float wall = 1.0 - step(0.5, abs(n.y));
        float roof = step(0.5, n.y);
        bool xf = abs(n.x) > 0.5;
        float hc = xf ? vL.z : vL.x;
        float halfW = xf ? vSz.z * 0.5 : vSz.x * 0.5;
        float face = n.x * 1.7 + n.z * 3.1 + 5.0;
        float hy = vL.y;
        float seed = vI.x;
        // façade sombre, légère montée vers le haut + lune froide
        vec3 col = vec3(0.0050, 0.0088, 0.0068) + vec3(0.0035, 0.0065, 0.005) * clamp(hy / 5.0, 0.0, 1.0);
        col += vec3(0.010, 0.019, 0.015) * max(dot(vNw, normalize(vec3(-0.45, 0.75, 0.5))), 0.0);
        col *= 0.85 + 0.3 * fract(seed * 17.3);
        // lumière des rues qui remonte sur le bas des façades
        col += vec3(0.016, 0.040, 0.028) * exp(-hy * 2.4) * wall * uWin;
        // fenêtres
        float fw = 0.19, fh = 0.21;
        vec2 cell = vec2((hc + 20.0) / fw, hy / fh);
        vec2 id = floor(cell), fr = fract(cell);
        float r1 = hash13(vec3(id, seed * 131.0 + face * 7.0));
        float r2 = hash13(vec3(id.yx + 3.1, seed * 71.0 + face));
        float occ = 0.26 + 0.3 * fract(seed * 7.31);
        float lit = step(1.0 - occ, r1);
        float wm = smoothstep(0.17, 0.25, fr.x) * smoothstep(0.83, 0.75, fr.x) * smoothstep(0.24, 0.32, fr.y) * smoothstep(0.86, 0.78, fr.y);
        float inside = step(fh, hy) * step(hy, vSz.y - 0.07) * step(abs(hc), halfW - 0.07) * wall;
        vec3 wc = r2 < 0.74 ? vec3(0.82, 1.0, 0.86) : (r2 < 0.88 ? uNeon : uTeal);
        float br = 0.25 + 0.75 * fract(r1 * 13.7);
        float fl = r2 > 0.988 ? (0.55 + 0.45 * sin(uTime * 21.0 + r1 * 40.0)) : 1.0;
        float fwid = max(fwidth(cell.x), fwidth(cell.y));
        float detail = 1.0 - smoothstep(0.4, 0.95, fwid);
        float wl = mix(occ * 0.32 * 0.6, wm * lit * br * fl, detail);
        vec3 wcol = mix(vec3(0.75, 1.0, 0.82), wc, detail);
        col += wcol * wl * inside * uWin * 0.95;
        col += vec3(0.006, 0.013, 0.010) * wm * (1.0 - lit) * inside * detail;   // vitres éteintes
        // rez-de-chaussée : vitrines (≈ 40 %)
        float shop = wall * step(hy, fh * 0.92) * step(0.6, fract(seed * 3.71)) * step(abs(hc), halfW - 0.05);
        col += vec3(0.55, 1.0, 0.7) * 0.22 * shop * uWin * (0.6 + 0.4 * fract(seed * 9.1));
        // tours : liseré vertical aux arêtes
        if (vI.z > 0.5 && vI.z < 1.5) {
          float edge = 1.0 - smoothstep(0.0, 0.035, halfW - abs(hc));
          col += mix(uTeal, uWhite, 0.3) * edge * wall * 0.35 * uWin;
        }
        // le magasin : vitrine néon + bandeau lumineux sur la façade avant (+z local)
        if (vI.z > 1.5) {
          float front = step(0.5, n.z);
          float vit = front * step(0.05, hy) * step(hy, 0.42) * step(abs(hc), halfW - 0.08);
          float band = front * smoothstep(0.50, 0.53, hy) * smoothstep(0.66, 0.63, hy);
          col += (uWhite * 0.55 + uNeon * 0.35) * vit * 0.9;
          col += uNeon * band * 1.25;
          col += uNeon * 0.08 * wall;
        }
        // toits : liseré néon (≈ 11 %)
        float ex = vSz.x * 0.5 - abs(vL.x), ez = vSz.z * 0.5 - abs(vL.z);
        float ew = 0.03 + fwidth(vL.x) * 1.5;
        float redge = 1.0 - smoothstep(0.0, ew, min(ex, ez));
        col += mix(uNeon, uTeal, step(0.5, fract(seed * 5.1))) * redge * roof * vI.w * 0.75 * uWin;
        // lumières dynamiques : tête de l'itinéraire, colonne du magasin, onde d'arrivée
        vec3 tl = uL1 - vW; float dl = length(tl);
        col += uNeon * uL1K * (0.25 + 0.75 * max(dot(vNw, tl / dl), 0.0)) * 1.6 / (1.0 + dl * dl * 0.9);
        vec3 tp = vec3(0.0, 2.2, 0.0) - vW; float dp = length(tp);
        col += mix(uNeon, uWhite, 0.15) * uL2K * max(dot(vNw, tp / dp), 0.0) * 2.4 / (1.0 + dp * dp * 0.12);
        float dxz = length(vW.xz);
        col += mix(uNeon, uWhite, 0.35) * uWaveK * exp(-pow((dxz - uWaveR) * 1.4, 2.0)) * 0.5 * (0.4 + 0.6 * clamp(hy / vSz.y, 0.0, 1.0));
        gl_FragColor = vec4(applyFog(col, vW), 1.0);
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, material, lots.length);
  const info = new Float32Array(lots.length * 4);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  lots.forEach((L, i) => {
    q.setFromAxisAngle(up, L.yaw);
    p.set(L.x, 0, L.z); s.set(L.w, L.h, L.d);
    m4.compose(p, q, s);
    mesh.setMatrixAt(i, m4);
    const dc = Math.hypot(L.x - CENTER2[0], L.z - CENTER2[1]);
    info[i * 4] = L.seed;
    info[i * 4 + 1] = clamp(dc / 70) * 0.62 + L.seed * 0.12 + (L.style === 2 ? 0.1 : 0);
    info[i * 4 + 2] = L.style;
    info[i * 4 + 3] = L.roof;
  });
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ------------------------------------------------------------------ sol (texture des rues peinte une fois)
export function groundMesh(streets, bridges, U) {
  const N = 2048, k = N / (2 * EXT);
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  const P = (x, z) => [(x + EXT) * k, (z + EXT) * k];
  const line = (s, w, color, blur = 0) => {
    g.filter = blur ? `blur(${blur}px)` : 'none';
    g.strokeStyle = color; g.lineWidth = w * k;
    g.beginPath(); g.moveTo(...P(...s.a)); g.lineTo(...P(...s.b)); g.stroke();
  };
  // G : halo des lampadaires (large, flou)
  for (const s of streets) line(s, s.w + 1.1, 'rgba(0,150,0,1)', 7);
  // R : chaussée
  for (const s of streets) line(s, s.w, 'rgba(255,0,0,1)');
  for (const b of bridges) line(b, b.w, 'rgba(255,0,0,1)');
  // R+G : place du magasin
  g.filter = 'blur(4px)';
  g.fillStyle = 'rgba(255,170,0,1)';
  g.beginPath(); g.arc(...P(0, 0), 3.3 * k, 0, Math.PI * 2); g.fill();
  // B : traits fins façon carte (raccord avec l'app map)
  g.filter = 'none';
  for (const s of streets) line(s, 0.2, 'rgba(0,0,255,1)');
  g.filter = 'none';
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const material = mat(U, {
    uniforms: { tStreets: { value: tex }, uExt: { value: EXT } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D tStreets; uniform float uExt; uniform float uMap; uniform float uWin;
      uniform vec3 uL1; uniform float uL1K; uniform float uL2K; uniform float uWaveR; uniform float uWaveK;
      varying vec3 vW;
      void main(){
        vec2 uv = vW.xz / (2.0 * uExt) + 0.5;
        float inside = step(abs(uv.x - 0.5), 0.499) * step(abs(uv.y - 0.5), 0.499);
        vec3 m = texture2D(tStreets, uv).rgb * inside;
        vec3 col = vec3(0.0020, 0.0037, 0.0028);
        col += m.r * vec3(0.0042, 0.0075, 0.0058);
        col += m.g * vec3(0.016, 0.036, 0.025) * uWin;
        vec2 dl = vW.xz - uL1.xz;
        col += uNeon * uL1K * 0.9 / (1.0 + dot(dl, dl) * 1.1);
        col += mix(uNeon, uWhite, 0.2) * uL2K * 0.45 * exp(-dot(vW.xz, vW.xz) * 0.06);
        float dxz = length(vW.xz);
        col += mix(uNeon, uWhite, 0.35) * uWaveK * exp(-pow((dxz - uWaveR) * 1.6, 2.0)) * 0.35;
        vec3 mapCol = vec3(0.0006, 0.0015, 0.0009) + m.b * uNeon * 0.05;
        col = mix(col, mapCol, uMap);
        gl_FragColor = vec4(applyFog(col, vW), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.frustumCulled = false;
  return mesh;
}

// ------------------------------------------------------------------ Meuse
export function riverMesh(U) {
  const pos = [], side = [], along = [], nrm = [], idx = [];
  let acc = 0, prev = null, n = 0;
  for (let s = -0.75; s <= 1.62; s += 0.004) {
    const p = riverAt(s), q = riverAt(s + 0.002);
    const tx = q[0] - p[0], tz = q[1] - p[1], tl = Math.hypot(tx, tz);
    if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
    for (const sd of [-1, 1]) { pos.push(p[0], 0.02, p[1]); side.push(sd); along.push(acc); nrm.push(-tz / tl, tx / tl); }
    if (n) { const b = (n - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute('aNrm', new THREE.Float32BufferAttribute(nrm, 2));
  geo.setIndex(idx);
  const material = mat(U, {
    uniforms: { uHalf: { value: RIVER_HALF } },
    vertexShader: /* glsl */ `
      attribute float aSide; attribute float aAlong; attribute vec2 aNrm; uniform float uHalf;
      varying float vX; varying float vS; varying vec3 vW;
      void main(){ vec3 p = position + vec3(aNrm.x, 0.0, aNrm.y) * aSide * uHalf; vX = aSide; vS = aAlong;
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uMap; uniform float uWin; uniform float uL2K; uniform vec3 uL1; uniform float uL1K;
      varying float vX; varying float vS; varying vec3 vW;
      void main(){
        float ax = abs(vX), t = uTime;
        float w1 = sin(vS * 2.3 + t * 1.6 + sin(vS * 0.37 + vX * 3.0) * 2.0);
        float w2 = sin(vS * 5.1 - t * 2.3 + vX * 6.0 + w1);
        float rip = 0.5 + 0.25 * w1 + 0.25 * w2;
        vec3 col = vec3(0.0005, 0.0026, 0.0021) + uTeal * 0.008 * rip;
        // reflets des lumières des quais : traînées qui tremblent depuis chaque rive
        float cellId = floor(vS * 1.25) + step(0.0, vX) * 57.0;
        float lit = step(0.42, hash11(cellId));
        float hue = hash11(cellId + 3.7);
        vec3 lc = hue < 0.72 ? vec3(0.8, 1.0, 0.86) : (hue < 0.86 ? uNeon : uTeal);
        float colm = exp(-pow((fract(vS * 1.25) - 0.5) * 7.0, 2.0));
        float shim = 0.55 + 0.45 * sin(vS * 9.0 + ax * 16.0 - t * 5.0 + w1 * 1.5);
        float fromBank = exp(-(1.0 - ax) * 3.2);
        col += lc * lit * colm * shim * fromBank * 0.22 * uWin;
        // paillettes
        col += uWhite * pow(max(w2 * w1, 0.0), 10.0) * 0.06 * uWin;
        // reflet de la tête de l'itinéraire et de la colonne
        vec2 dl = vW.xz - uL1.xz; col += uNeon * uL1K * 0.7 / (1.0 + dot(dl, dl) * 0.5);
        col += uNeon * uL2K * 0.12 * exp(-dot(vW.xz, vW.xz) * 0.02) * shim;
        // fresnel : la surface s'éclaircit en incidence rasante (ciel + brume)
        float graz = 1.0 - abs(normalize(cameraPosition - vW).y);
        col += (uFogLow * 3.0 + uTeal * 0.004) * pow(graz, 4.0);
        // raccord : trait teal de la carte
        vec3 mapCol = uTeal * 0.22 * smoothstep(1.0, 0.85, ax);
        col = mix(col, mapCol, uMap);
        gl_FragColor = vec4(applyFog(col, vW), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}

// ------------------------------------------------------------------ points lumineux (lampadaires, ville lointaine, collines)
export function lightPoints(U, pts, o = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(pts.col, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(pts.seed, 1));
  const material = mat(U, {
    uniforms: { uSize: { value: o.size || 120 }, uMin: { value: o.min || 1.6 }, uMax: { value: o.max || 9 }, uPixel: { value: o.pixel || 1 }, uK: { value: 1 }, uTw: { value: o.twinkle ?? 0.25 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute vec3 color;
      uniform float uSize; uniform float uMin; uniform float uMax; uniform float uPixel; uniform float uK; uniform float uTime; uniform float uTw;
      uniform float uFogDen;
      varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(-mv.z, 0.1);
        float s = uSize * uPixel / dist;
        gl_PointSize = clamp(s, uMin * uPixel, uMax * uPixel);
        float fogK = exp(-uFogDen * uFogDen * dist * dist * 0.8);
        float tw = 1.0 - uTw + uTw * sin(uTime * (1.3 + aSeed * 3.0) + aSeed * 50.0);
        vA = fogK * tw * uK * clamp(s / (uMin * uPixel), 0.35, 1.0);
        vC = color;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0; float a = exp(-d * 3.2) * vA; gl_FragColor = vec4(vC * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(geo, material);
  p.frustumCulled = false;
  return p;
}

const LCOL = () => ({ pale: new THREE.Color(0.8, 1.0, 0.86), neon: new THREE.Color(C.neon), teal: new THREE.Color(C.teal), white: new THREE.Color(C.white) });
function pickCol(r, L, k = 1, pw = 0.74, pn = 0.88) {
  const v = r();
  const c = v < pw ? L.pale : v < pn ? L.neon : L.teal;
  return [c.r * k, c.g * k, c.b * k];
}

/** Lampadaires le long des rues + lampes des ponts. */
export function streetLightData(streets, bridges, r) {
  const pos = [], col = [], seed = [];
  const L = LCOL();
  for (const s of streets) {
    const dx = (s.b[0] - s.a[0]) / s.len, dz = (s.b[1] - s.a[1]) / s.len, nx = -dz, nz = dx;
    const step = s.kind === 'quay' ? 1.0 : 1.35;
    for (let t = 0.4; t < s.len; t += step) {
      for (const sd of [-1, 1]) {
        if (r() < 0.12) continue;
        const o = s.w / 2 + 0.12;
        pos.push(s.a[0] + dx * t + nx * o * sd, 0.12, s.a[1] + dz * t + nz * o * sd);
        const k = s.kind === 'route' ? 0.9 : 0.55 + r() * 0.25;
        const c = s.kind === 'quay' && r() < 0.3 ? L.teal : L.pale;
        col.push(c.r * k, c.g * k, c.b * k);
        seed.push(r());
      }
    }
  }
  for (const b of bridges) {
    const len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
    const dx = (b.b[0] - b.a[0]) / len, dz = (b.b[1] - b.a[1]) / len, nx = -dz, nz = dx;
    for (let t = 0.2; t < len; t += 0.55) {
      for (const sd of [-1, 1]) {
        const o = b.w / 2 + 0.05;
        pos.push(b.a[0] + dx * t + nx * o * sd, 0.42, b.a[1] + dz * t + nz * o * sd);
        const c = b.route ? L.neon : L.white;
        col.push(c.r * 0.9, c.g * 0.9, c.b * 0.9);
        seed.push(r());
      }
    }
  }
  return { pos, col, seed };
}

/** Tapis de lumières au-delà des bâtiments + collines habitées. */
export function farLightData(r, hillH) {
  const pos = [], col = [], seed = [];
  const L = LCOL();
  for (let i = 0; i < 6500; i++) {
    const a = r() * Math.PI * 2, rr = EXT + 2 + Math.pow(r(), 1.4) * 44;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (riverDist(x, z) < RIVER_HALF + 0.6) continue;
    pos.push(x, 0.1 + r() * 0.5, z);
    col.push(...pickCol(r, L, 0.45 + r() * 0.45));
    seed.push(r());
  }
  for (let i = 0; i < 2600; i++) {
    const a = r() * Math.PI * 2, f = Math.pow(r(), 0.8);
    const rr = lerp(HILL_R0 + 2, HILL_R1 - 3, f);
    const y = lerp(0, hillH(a), Math.pow(f, 1.25)) + 0.2;
    pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
    col.push(...pickCol(r, L, 0.35 + r() * 0.4, 0.82, 0.92));
    seed.push(r());
  }
  return { pos, col, seed };
}

// ------------------------------------------------------------------ collines au loin
export const HILL_R0 = 124, HILL_R1 = 150, HILL_R2 = 205;
export const hillHeight = (a) => {
  const x = a * 3.0;
  return 6 + 9 * (0.5 + 0.5 * noise1(x * 1.1 + 3)) + 4 * noise1(x * 3.3 + 11) + 1.5 * noise1(x * 9.1 + 5);
};
export function hillMesh(U) {
  const N = 360, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, h = hillHeight(a), c = Math.cos(a), s = Math.sin(a);
    pos.push(c * HILL_R0, -0.3, s * HILL_R0, c * HILL_R1, h, s * HILL_R1, c * HILL_R2, h * 0.55, s * HILL_R2);
    if (i) {
      const b = (i - 1) * 3, n = i * 3;
      idx.push(b, n, b + 1, b + 1, n, n + 1, b + 1, n + 1, b + 2, b + 2, n + 1, n + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const material = mat(U, {
    vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 col = vec3(0.0011, 0.0022, 0.0017);
        float facing = max(dot(normalize(vN), normalize(vec3(-vW.x, 0.0, -vW.z))), 0.0);
        col += uFogLow * 0.9 * facing * exp(-max(vW.y, 0.0) * 0.12);
        gl_FragColor = vec4(applyFog(col, vW), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}

// ------------------------------------------------------------------ trafic : traînées lumineuses dans les rues
export function trafficMesh(streets, U, r) {
  const A = [], B = [], P = [], K = [], COL = [], idx = [];
  let n = 0;
  const L = LCOL();
  for (const s of streets) {
    if (s.kind === 'route') continue;
    const per = s.kind === 'quay' ? 2.6 : 3.6;
    const count = Math.max(1, Math.round(s.len / per));
    for (let i = 0; i < count; i++) {
      for (const dir of [-1, 1]) {
        if (r() < 0.25) continue;
        const sp = (6 + r() * 7) * dir;
        const len = 1.4 + r() * 2.6;
        const lane = 0.22 + r() * 0.08;
        const c = dir > 0 ? (r() < 0.6 ? L.neon : L.pale) : (r() < 0.6 ? L.teal : L.pale);
        const ph = r();
        for (const [cx, cy] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
          A.push(s.a[0], 0.05, s.a[1]); B.push(s.b[0], 0.05, s.b[1]);
          P.push(ph, sp, len, lane); K.push(cx, cy); COL.push(c.r, c.g, c.b);
        }
        idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        n += 4;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(A, 3));
  geo.setAttribute('aB', new THREE.Float32BufferAttribute(B, 3));
  geo.setAttribute('aP', new THREE.Float32BufferAttribute(P, 4));
  geo.setAttribute('aK', new THREE.Float32BufferAttribute(K, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(COL, 3));
  geo.setIndex(idx);
  const material = mat(U, {
    uniforms: { uW: { value: 0.055 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aB; attribute vec4 aP; attribute vec2 aK; attribute vec3 color;
      uniform float uTime; uniform float uW; uniform float uFogDen;
      varying vec2 vK; varying vec3 vC; varying float vA;
      void main(){
        vec3 AB = aB - position; float L = length(AB); vec3 dir = AB / L;
        float sp = aP.y;
        float s = fract(aP.x + uTime * abs(sp) / L);
        if (sp < 0.0) s = 1.0 - s;
        vec3 md = dir * sign(sp);
        vec3 side = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
        vec3 head = position + AB * s;
        vec3 tail = head - md * aP.z;
        vec3 p = mix(tail, head, aK.x) + side * (aP.w + aK.y * uW);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        float sa = sp > 0.0 ? s : 1.0 - s;
        vA = smoothstep(0.0, 0.08, sa) * smoothstep(1.0, 0.92, sa) * exp(-uFogDen * uFogDen * d * d * 0.8);
        vK = aK; vC = color;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uWhite; uniform float uK;
      varying vec2 vK; varying vec3 vC; varying float vA;
      void main(){
        float across = 1.0 - vK.y * vK.y;
        float along = pow(vK.x, 1.6);
        vec3 c = mix(vC, uWhite, pow(vK.x, 6.0));
        gl_FragColor = vec4(c * across * along * vA * uK * 1.25, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}

// ------------------------------------------------------------------ itinéraire : ruban au sol (trait de la carte) + mur de lumière
export function routeMeshes(R, U) {
  const rib = { pos: [], side: [], arc: [], nrm: [], idx: [] };
  const wall = { pos: [], v: [], arc: [], idx: [] };
  for (let i = 0; i <= R.N; i++) {
    const p = R.pts[i], q = R.pts[Math.min(R.N, i + 1)], o = R.pts[Math.max(0, i - 1)];
    const tx = q.x - o.x, tz = q.z - o.z, tl = Math.hypot(tx, tz) || 1;
    const s = (i / R.N) * R.len;
    for (const sd of [-1, 1]) { rib.pos.push(p.x, 0.035, p.z); rib.side.push(sd); rib.arc.push(s); rib.nrm.push(-tz / tl, tx / tl); }
    for (const v of [0, 1]) { wall.pos.push(p.x, 0, p.z); wall.v.push(v); wall.arc.push(s); }
    if (i) {
      const b = (i - 1) * 2;
      rib.idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      wall.idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rib.pos, 3));
  rg.setAttribute('aSide', new THREE.Float32BufferAttribute(rib.side, 1));
  rg.setAttribute('aArc', new THREE.Float32BufferAttribute(rib.arc, 1));
  rg.setAttribute('aNrm', new THREE.Float32BufferAttribute(rib.nrm, 2));
  rg.setIndex(rib.idx);
  const RU = { uHalf: { value: 1 }, uHead: { value: 0 }, uLen: { value: R.len }, uGain: { value: 1 } };
  const ribbon = new THREE.Mesh(rg, mat(U, {
    uniforms: RU,
    vertexShader: /* glsl */ `
      attribute float aSide; attribute float aArc; attribute vec2 aNrm; uniform float uHalf;
      varying float vX; varying float vS; varying vec3 vW;
      void main(){ vec3 p = position + vec3(aNrm.x, 0.0, aNrm.y) * aSide * uHalf; vX = aSide; vS = aArc;
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uHead; uniform float uGain; uniform float uLen;
      varying float vX; varying float vS; varying vec3 vW;
      void main(){
        float x = abs(vX);
        float halo = exp(-x * x * 3.2) * 0.32;
        float core = smoothstep(0.42, 0.30, x);
        float hot = smoothstep(0.15, 0.07, x);
        float behind = smoothstep(uHead + 0.2, uHead - 0.4, vS);
        float flow = 0.5 + 0.5 * sin((vS - uTime * 16.0) * 0.9);
        vec3 col = uNeon * (halo + core * 0.75) + vec3(0.85, 1.0, 0.88) * hot * 0.75;
        col *= (0.8 + 0.35 * flow * behind) * uGain;
        float hd = vS - uHead;
        col += vec3(0.85, 1.0, 0.88) * exp(-hd * hd * 0.6) * smoothstep(0.6, 0.0, x) * 1.6 * step(uHead, uLen - 0.05);
        gl_FragColor = vec4(col, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  ribbon.frustumCulled = false;
  ribbon.renderOrder = 3;
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wall.pos, 3));
  wg.setAttribute('aV', new THREE.Float32BufferAttribute(wall.v, 1));
  wg.setAttribute('aArc', new THREE.Float32BufferAttribute(wall.arc, 1));
  wg.setIndex(wall.idx);
  const WU = { uWallH: { value: 0.8 }, uHead: RU.uHead, uWallK: { value: 1 } };
  const wallM = new THREE.Mesh(wg, mat(U, {
    uniforms: WU,
    vertexShader: /* glsl */ `
      attribute float aV; attribute float aArc; uniform float uWallH; uniform float uHead;
      varying float vV; varying float vS; varying vec3 vW;
      void main(){
        float env = clamp((uHead - aArc) / 2.2, 0.0, 1.0);
        env = env * env * (3.0 - 2.0 * env);
        vec3 p = position; p.y = 0.04 + aV * uWallH * env;
        vV = aV; vS = aArc;
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uHead; uniform float uWallK;
      varying float vV; varying float vS; varying vec3 vW;
      void main(){
        if (vS > uHead) discard;
        float a = pow(1.0 - vV, 1.8);
        float flow = 0.55 + 0.45 * sin((vS - uTime * 18.0) * 0.7);
        float fresh = exp(-(uHead - vS) * 0.12);
        vec3 col = uNeon * a * (0.35 + 0.45 * flow) + vec3(0.85, 1.0, 0.88) * pow(a, 6.0) * 0.5;
        col *= (0.55 + 0.6 * fresh) * uWallK;
        gl_FragColor = vec4(col, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  wallM.frustumCulled = false;
  wallM.renderOrder = 4;
  return { ribbon, wall: wallM, RU, WU };
}

// ------------------------------------------------------------------ repère du magasin au sol (point de la carte + ondes)
export function pinDisc(U) {
  const PU = { uDot: { value: 1.6 }, uDotK: { value: 1 }, uRingK: { value: 1 }, uR: { value: 10 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat(U, {
    uniforms: PU,
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uDot; uniform float uDotK; uniform float uRingK; uniform float uR;
      varying vec2 vP;
      void main(){
        float r = length(vP);
        float disc = smoothstep(uDot, uDot * 0.86, r) * uDotK;
        float glow = exp(-r * r / (uDot * uDot * 3.0)) * 0.35 * uDotK;
        float rings = 0.0;
        for (int k = 0; k < 3; k++) {
          float rr = fract(uTime * 0.75 + float(k) / 3.0) * uR * 0.9 + uDot;
          rings += exp(-pow((r - rr) * 7.0, 2.0)) * (1.0 - rr / uR);
        }
        vec3 col = uNeon * (disc * 0.75 + glow) + uWhite * disc * 0.15 + uNeon * rings * uRingK * 0.55;
        col *= smoothstep(uR, uR * 0.8, r);
        gl_FragColor = vec4(col, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  m.renderOrder = 5;
  return { mesh: m, PU };
}

// ------------------------------------------------------------------ colonne de lumière (billboard cylindrique)
export function beamMesh(U) {
  const BU = { uH: { value: 0 }, uK: { value: 0 }, uTop: { value: 70 } };
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat(U, {
    uniforms: BU,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uH; uniform float uK; uniform float uTop;
      varying vec2 vUv;
      void main(){
        float y = vUv.y * uTop;
        if (y > uH) discard;
        float x = (vUv.x - 0.5) * 2.0;
        float core = exp(-x * x * 900.0);
        float body = exp(-x * x * 60.0);
        float halo = exp(-x * x * 7.0);
        float fade = pow(1.0 - vUv.y, 1.6);
        float front = exp(-pow((uH - y) * 0.35, 2.0)) * step(uH, uTop * 0.98);
        float shimmer = 0.85 + 0.15 * sin(y * 1.3 - uTime * 14.0);
        vec3 col = vec3(0.85, 1.0, 0.88) * core * 1.1 + uNeon * body * 0.55 * shimmer + mix(uNeon, uTeal, 0.4) * halo * 0.07;
        col *= fade;
        col += uWhite * front * body * 0.8;
        gl_FragColor = vec4(col * uK, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  m.frustumCulled = false;
  m.renderOrder = 6;
  return { mesh: m, BU };
}

// ------------------------------------------------------------------ épingle 3D du repère
export function pinMarker() {
  const prof = [[0, 0], [0.07, 0.12], [0.16, 0.3], [0.25, 0.48], [0.31, 0.64], [0.32, 0.74], [0.28, 0.86], [0.2, 0.94], [0.1, 0.985], [0, 1]];
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40);
  const m = new THREE.MeshStandardMaterial({ color: '#0b3a10', emissive: C.neon, emissiveIntensity: 0.85, metalness: 0.4, roughness: 0.28, envMapIntensity: 0.8 });
  const body = new THREE.Mesh(geo, m);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), new THREE.MeshBasicMaterial({ color: C.ink }));
  const g = new THREE.Group();
  g.add(body, hole);
  return { group: g, body, hole };
}
