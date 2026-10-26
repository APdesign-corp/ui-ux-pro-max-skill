// ============================================================================
//  Graphique XAUUSD en 3D : bougies (InstancedMesh, bleues = hausse, blanches = baisse, comme
//  sur le graphique du client), mèches, grille, données du VRAI trade (forme relevée sur les
//  captures : sommet ~4031, chute, range « WK » 3990–4001, mèche « trap » ~3980, entrée 3990.77,
//  montée vers 4017–4020).  Repère : x = i * DX, y = (prix - P0) * K, z = 0.
// ============================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp, E } from '../core/anim.js';

export const BLUE = '#2f9bff', WHITE = '#f2f4f8', GOLD = '#f2c14e', RED = '#e0343a';
export const P0 = 4000, K = 0.075, DX = 0.16;
export const ENTRY_I = 41, ENTRY = 3990.77, TP = 4033.58, SL = 4002.27, LAST = 4028.06, NS = 91;
export const py = (p) => (p - P0) * K;
export const px = (i) => i * DX;

/** Série du vrai trade (déterministe). 91 bougies M5 condensées (jusqu'à +500 € selon le client). */
export function tradeSeries() {
  const keys = [[0, 4026], [4, 4029], [6, 4031], [8, 4028], [10, 4012], [11, 3987], [13, 3995], [16, 3999], [19, 3992], [22, 4000],
    [25, 3993], [28, 4001], [31, 3994], [33, 3997], [35, 3989], [37, 3983], [38, 3981.5], [40, 3986], [41, 3990.77],
    [44, 4003], [46, 4008], [48, 3999], [51, 4012], [53, 4005], [56, 4016], [59, 4008], [62, 4019], [65, 4010], [68, 4018], [71, 4012], [74, 4019], [75, 4017.56], [78, 4022], [80, 4016], [83, 4025], [86, 4020], [89, 4027], [90, 4028.06]];
  const at = (i) => { for (let k = 0; k < keys.length - 1; k++) { const [a, pa] = keys[k], [b, pb] = keys[k + 1]; if (i >= a && i <= b) return lerp(pa, pb, (i - a) / (b - a || 1)); } return keys[keys.length - 1][1]; };
  const r = rng(7);
  const out = [];
  let prev = at(0);
  for (let i = 0; i < NS; i++) {
    let c = at(i) + (i === ENTRY_I || i === NS - 1 || i === 38 ? 0 : (r() - 0.5) * 3.2);
    const o = prev;
    const h = Math.max(o, c) + 0.4 + r() * (i === 11 ? 1 : 2.2), l = Math.min(o, c) - 0.4 - r() * (i === 38 ? 0.5 : 2.2);
    out.push({ o, h, l: i === 38 ? 3979.6 : l, c });
    prev = c;
  }
  return out;
}

/** Série aléatoire pour le paysage (rangées de bougies). */
export function randomSeries(n, seed, start = 4000, vol = 4) {
  const r = rng(seed); const out = []; let p = start, drift = 0;
  for (let i = 0; i < n; i++) {
    drift = drift * 0.85 + (r() - 0.48) * 1.4;
    const o = p, c = p + drift * vol * 0.5 + (r() - 0.5) * vol;
    out.push({ o, h: Math.max(o, c) + r() * vol * 0.6, l: Math.min(o, c) - r() * vol * 0.6, c }); p = c;
  }
  return out;
}

const bodyGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
const wickGeo = new THREE.BoxGeometry(1, 1, 1);
const mats = {};
function mat(kind) {
  if (mats[kind]) return mats[kind];
  const c = kind === 'up' ? BLUE : WHITE;
  mats[kind] = new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: kind === 'up' ? 0.55 : 0.18, metalness: 0.1, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  return mats[kind];
}

/** Crée un graphique 3D à partir d'une série. width = largeur d'une bougie (fraction de DX). */
export function createCandles(series, { width = 0.62, depth = 0.1, z = 0 } = {}) {
  const n = series.length;
  const group = new THREE.Group();
  const up = new THREE.InstancedMesh(bodyGeo, mat('up'), n), dn = new THREE.InstancedMesh(bodyGeo, mat('dn'), n);
  const wu = new THREE.InstancedMesh(wickGeo, mat('up'), n), wd = new THREE.InstancedMesh(wickGeo, mat('dn'), n);
  for (const m of [up, dn, wu, wd]) { m.frustumCulled = false; group.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  /** Affiche les bougies 0..count-1 ; la dernière grandit selon grow (0..1). lift = apparition (chute depuis le haut). */
  function set(count = n, grow = 1, opts = {}) {
    let iu = 0, id = 0;
    for (let i = 0; i < n; i++) {
      const d = series[i];
      const isUp = d.c >= d.o;
      let vis = i < count ? 1 : 0;
      let g = i === count - 1 ? grow : 1;
      if (opts.wave) g *= opts.wave(i);
      const body = isUp ? up : dn, wick = isUp ? wu : wd;
      const k = isUp ? iu++ : id++;
      if (!vis || g <= 0.001) { body.setMatrixAt(k, zero); wick.setMatrixAt(k, zero); continue; }
      // la bougie qui se forme : le corps part de l'ouverture
      const c = lerp(d.o, d.c, g), h = lerp(Math.max(d.o, c), d.h, g), l = lerp(Math.min(d.o, c), d.l, g);
      const y0 = py(Math.min(d.o, c)), y1 = py(Math.max(d.o, c));
      const bh = Math.max(0.012, y1 - y0);
      T.set(px(i), (y0 + y1) / 2, z); S.set(DX * width, bh, depth);
      M.compose(T, Q, S); body.setMatrixAt(k, M);
      T.set(px(i), (py(h) + py(l)) / 2, z); S.set(DX * 0.09, Math.max(0.01, py(h) - py(l)), depth * 0.35);
      M.compose(T, Q, S); wick.setMatrixAt(k, M);
    }
    for (let k = iu; k < n; k++) { up.setMatrixAt(k, zero); wu.setMatrixAt(k, zero); }
    for (let k = id; k < n; k++) { dn.setMatrixAt(k, zero); wd.setMatrixAt(k, zero); }
    for (const m of [up, dn, wu, wd]) m.instanceMatrix.needsUpdate = true;
  }
  set();
  return { group, set, series, n };
}

/** Boîte translucide (zone WK, trap, position) avec arêtes lumineuses. */
export function zoneBox(color, opacity = 0.22) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
  g.add(m, e);
  return {
    group: g, mesh: m, edges: e,
    /** x0,x1 (monde), p0,p1 (prix), d = profondeur, k = apparition 0..1 (déploiement vertical) */
    place(x0, x1, p0, p1, d = 0.4, k = 1, z = 0) {
      const y0 = py(p0), y1 = lerp(y0, py(p1), k);
      g.visible = k > 0.001;
      g.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
      g.scale.set(Math.max(0.001, x1 - x0), Math.max(0.001, Math.abs(y1 - y0)), d);
      m.material.opacity = opacity * clamp(k * 2); e.material.opacity = 0.95 * clamp(k * 2);
    },
  };
}

/** Ligne de prix 3D (cylindre fin lumineux), pointillée si dashed. */
export function priceLine(color, len = 20, dashed = false) {
  const g = new THREE.Group();
  const n = dashed ? 40 : 1;
  const geo = new THREE.BoxGeometry(1, 0.012, 0.012);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(geo, m);
    const w = len / n;
    s.scale.x = dashed ? w * 0.55 : len; s.position.x = dashed ? (i + 0.5) * w : len / 2;
    g.add(s);
  }
  return { group: g, mat: m, set(x0, p, a = 1, z = 0) { g.position.set(x0, py(p), z); m.opacity = a; g.visible = a > 0.01; } };
}

/** Sol grille (lignes or très discrètes) pour donner l'échelle. */
export function gridFloor(size = 60, step = 0.5, color = GOLD, opacity = 0.12) {
  const pts = [];
  for (let v = -size / 2; v <= size / 2; v += step) { pts.push(-size / 2, 0, v, size / 2, 0, v, v, 0, -size / 2, v, 0, size / 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

export { E };
