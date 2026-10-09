// O'BINKS — ingrédients procéduraux (pains, steaks, fromages, salade, oignons, cornichons,
// tomates, sauces, frites, viandes panées…). Chaque constructeur renvoie
//   { obj: THREE.Object3D (base à y = 0), h: épaisseur d'empilement }
// et travaille sur une EMPREINTE fp = { L, r } (stade : demi-longueur droite L, rayon r ;
// L = 0 → disque, burger) pour s'adapter au burger rond comme au sandwich long.

import * as THREE from 'three';
import { rng } from '../core/anim.js';
import {
  TAU, clamp, lerp, smooth, kit, sauceMat, col, vn2, stadiumR, stadiumD, superR, noisyR,
  slab, polarMesh, merge, mergeByGroup, place, paint, lump, dripGeo, tubeGeo, scatter, weldNormals,
} from './food-kit.js';

const C = (h) => new THREE.Color(h);
const mixC = (a, b, t) => a.clone().lerp(b, clamp(t));
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); return m; };

// ------------------------------------------------------------------ pains
const CR_TOP = C('#6a2806'), CR_MID = C('#a04e14'), CR_LOW = C('#d08a38'), CR_BAND = C('#ebbd72');
const CRUMB_IN = C('#eccb8a'), CRUMB_TOAST = C('#b86a2a');

/** Chapeau de pain (brioche ronde ou pain long), dôme brillant, face coupée grillée, sésame optionnel. */
export function bunTop(fp, { h = 0.3, seed = 1, sesame = true, soft = false } = {}) {
  const K = kit();
  const { L, r } = fp;
  const R = noisyR(stadiumR(L, r), 0.012, 2, seed);
  const hE = h * 0.2;
  const dome = (x, z) => {
    const d = clamp(stadiumD(x, z, L, r) / r);
    return hE + (h - hE) * Math.pow(1 - Math.pow(1 - d, 2.4), 0.55) + (vn2(x * 5, z * 5, seed) * 0.005 + vn2(x * 15, z * 15, seed + 2) * 0.0025) * smooth(clamp(d * 3));
  };
  const geo = slab({
    R, segs: L > 0 ? 88 : 64, rings: 12, sideRows: 4, bulge: 0.018, tile: L > 0 ? 0.55 : 0.6, topUV: 'a', sideUV: 's',
    top: dome, bot: (x, z) => 0.004 * clamp(stadiumD(x, z, L, r) / r),
    color: (x, y, z, part) => {
      if (part === 2) { const d = clamp(stadiumD(x, z, L, r) / (r * 0.25)); return mixC(CRUMB_TOAST, CRUMB_IN, smooth(d) * 0.75); }
      if (part === 1) return mixC(CR_BAND, CR_LOW, clamp(y / hE));
      const t = clamp((y - hE) / (h - hE));
      const n = vn2(x * 4, z * 4, seed + 3) * 0.22 + vn2(x * 11, z * 11, seed + 4) * 0.1;
      const c = t < 0.3 ? mixC(CR_BAND, CR_LOW, t / 0.3 + n * 0.5) : t < 0.6 ? mixC(CR_LOW, CR_MID, (t - 0.3) / 0.3 + n) : mixC(CR_MID, CR_TOP, (t - 0.6) / 0.4 + n);
      return c;
    },
  });
  const crust = soft ? K.M.bunSoft : K.M.crust;
  const g = new THREE.Group();
  g.add(mesh(geo, [crust, crust, K.M.crumb]));
  if (sesame) {
    const n = Math.round((L > 0 ? 70 : 95));
    const seedGeo = new THREE.SphereGeometry(1, 6, 4);
    const im = new THREE.InstancedMesh(seedGeo, K.M.sesame, n);
    const rr = rng(seed + 50), m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const Rr = stadiumR(L, r);
    for (let i = 0; i < n; i++) {
      let x = 0, z = 0;
      for (let t = 0; t < 20; t++) {
        const a = rr() * TAU, k = Math.sqrt(rr()) * 0.86;
        x = Math.cos(a) * Rr(a) * k; z = Math.sin(a) * Rr(a) * k;
        if (stadiumD(x, z, L, r) / r > 0.12) break;
      }
      const e = 0.004, y = dome(x, z);
      nrm.set(-(dome(x + e, z) - dome(x - e, z)) / (2 * e), 1, -(dome(x, z + e) - dome(x, z - e)) / (2 * e)).normalize();
      q.setFromUnitVectors(up, nrm);
      q2.setFromAxisAngle(up, rr() * TAU);
      q.multiply(q2);
      p.set(x, y + 0.002, z);
      const k = 0.85 + rr() * 0.3;
      s.set(0.016 * k, 0.0055 * k, 0.0085 * k);
      im.setMatrixAt(i, m.compose(p, q, s));
    }
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingBox(); im.computeBoundingSphere();
    g.add(im);
  }
  return { obj: g, h: h + 0.01 };
}

/** Talon de pain : face coupée grillée en haut, base arrondie. */
export function bunBottom(fp, { h = 0.15, seed = 2, soft = false } = {}) {
  const K = kit();
  const { L, r } = fp;
  const R = noisyR(stadiumR(L, r * 0.985), 0.01, 2, seed);
  const geo = slab({
    R, segs: L > 0 ? 88 : 64, rings: 7, sideRows: 4, bulge: 0.02, tile: 0.45, sideUV: 's',
    top: (x, z) => h - 0.008 * (1 - clamp(stadiumD(x, z, L, r) / (r * 0.3))),
    bot: (x, z) => 0.04 * Math.pow(1 - clamp(stadiumD(x, z, L, r) / (r * 0.3)), 2),
    color: (x, y, z, part) => {
      if (part === 0) { const d = clamp(stadiumD(x, z, L, r) / (r * 0.25)); return mixC(CRUMB_TOAST, CRUMB_IN, smooth(d) * 0.7); }
      if (part === 1) return mixC(CR_MID, CR_BAND, clamp(y / h) * 1.2);
      return mixC(CR_MID, C('#b05a1c'), 0.5);
    },
  });
  const crust = soft ? K.M.bunSoft : K.M.crustPlain;
  return { obj: mesh(geo, [K.M.crumb, crust, crust]), h };
}

// ------------------------------------------------------------------ viandes
/** Steak haché saisi (smash = fin, bords dentelés croustillants). */
export function patty(fp, { seed = 3, smash = false, h = smash ? 0.07 : 0.1, over = 0.03 } = {}) {
  const K = kit();
  const L = fp.L, r = fp.r + over;
  const base = noisyR(stadiumR(L, r), smash ? 0.045 : 0.03, 3, seed);
  const R = smash ? (a) => base(a) * (1 + 0.025 * vn2(Math.cos(a) * 11, Math.sin(a) * 11, seed + 4)) : base;
  const edge = (x, z) => clamp(stadiumD(x, z, L, r) / (r * (smash ? 0.18 : 0.28)));
  const geo = slab({
    R, segs: L > 0 ? 110 : 84, rings: 10, sideRows: 4, bulge: smash ? 0.006 : 0.012, tile: 0.35,
    top: (x, z) => h * (0.45 + 0.55 * smooth(edge(x, z))) + vn2(x * 16, z * 16, seed) * 0.009 + vn2(x * 45, z * 45, seed + 1) * 0.004,
    bot: (x, z) => h * 0.12 * (1 - smooth(edge(x, z))) + vn2(x * 18, z * 18, seed + 2) * 0.004,
    color: (x, y, z, part) => {
      const n = vn2(x * 9, z * 9, seed + 7) * 0.5 + 0.5;
      if (part === 0) return mixC(C('#ffe6d2'), C('#d9a080'), n);
      if (part === 1) return C('#d8a080');
      return C('#a87a62');
    },
  });
  paintIfNeeded(geo);
  return { obj: mesh(geo, K.M.beef), h: h * 0.92 };
}

function paintIfNeeded(geo) { if (!geo.attributes.color) paint(geo, () => C('#ffffff')); return geo; }

/** Filet de poulet pané croustillant (O'Crispy). */
export function crispyFillet(fp, { seed = 5, h = 0.13 } = {}) {
  const K = kit();
  const L = fp.L, r = fp.r + 0.04;
  const R = noisyR(stadiumR(L, r), 0.09, 3, seed);
  const lumpy = (x, z, s) => vn2(x * 12, z * 12, s) * 0.016 + vn2(x * 30, z * 30, s + 1) * 0.007;
  const edge = (x, z) => clamp(stadiumD(x, z, L, r) / (r * 0.35));
  const geo = slab({
    R, segs: 96, rings: 12, sideRows: 5, bulge: 0.025, tile: 0.3,
    top: (x, z) => h * (0.4 + 0.6 * smooth(edge(x, z))) + lumpy(x, z, seed),
    bot: (x, z) => h * 0.15 * (1 - smooth(edge(x, z))) + lumpy(x, z, seed + 5) * 0.5,
    color: (x, y, z) => mixC(C('#ffffff'), C('#ffd9a0'), vn2(x * 6, z * 6, seed + 3) * 0.5 + 0.5),
  });
  return { obj: mesh(geo, K.M.bread), h: h * 0.95 };
}

/**
 * Morceaux de viande au choix (tacos, kapsalone) dans un contour R.
 * type : 'nuggets' | 'tenders' | 'cordonbleu' | 'tandoori' | 'poulet' | 'hachee'
 */
export function meatPieces(R, type, { seed = 7, n, y = 0, glazed = false, spread = 0.82, scale = 1 } = {}) {
  const K = kit();
  const rr = rng(seed);
  const geos = [];
  let mat = K.M.bread, h = 0.06;
  const pts = (count, minD) => scatter(R, count, seed + 1, { margin: spread, minD });
  if (type === 'nuggets') {
    const P = pts(n || 9, 0.1 * scale);
    for (const [x, z, k] of P) {
      const g = lump({ seg: 14, amp: 0.22, freq: 2.4, seed: seed + Math.floor(k * 999), scale: [0.075 * scale, 0.04 * scale, 0.058 * scale], flat: 0.6 });
      geos.push(place(g, [x, y + 0.035 * scale, z], [0, k * TAU, 0]));
    }
    h = 0.075 * scale;
  } else if (type === 'tenders') {
    const P = pts(n || 5, 0.11 * scale);
    for (const [x, z, k] of P) {
      const g = lump({ seg: 22, amp: 0.24, freq: 3.2, seed: seed + Math.floor(k * 999), scale: [0.135 * scale, 0.05 * scale, 0.06 * scale], flat: 0.5, sharp: 0.3 });
      bend(g, 0.6 * (k - 0.5));
      geos.push(place(g, [x, y + 0.035 * scale, z], [0.05 * (rr() - 0.5), k * TAU, 0.08 * (rr() - 0.5)]));
    }
    h = 0.075 * scale;
  } else if (type === 'cordonbleu') {
    const P = pts(n || 3, 0.2 * scale);
    for (const [x, z, k] of P) {
      const R2 = noisyR(superR(0.11 * scale, 0.075 * scale, 3), 0.06, 3, seed + Math.floor(k * 99));
      const g = slab({
        R: R2, segs: 32, rings: 5, sideRows: 4, bulge: 0.012 * scale, tile: 0.25,
        top: (xx, zz) => 0.05 * scale + vn2(xx * 25, zz * 25, seed) * 0.005,
        bot: (xx, zz) => vn2(xx * 25, zz * 25, seed + 3) * 0.003,
        color: () => C('#ffffff'),
      });
      geos.push(place(g, [x, y, z], [0, k * TAU, 0.06 * (rr() - 0.5)]));
    }
    h = 0.06 * scale;
  } else if (type === 'tandoori' || type === 'poulet') {
    mat = K.M.chicken;
    const P = pts(n || 15, 0.06 * scale);
    const c0 = type === 'tandoori' ? C('#d24a18') : C('#c87a26'), c1 = type === 'tandoori' ? C('#6a1806') : C('#5e2808');
    for (const [x, z, k] of P) {
      const g = lump({ seg: 12, amp: 0.42, freq: 2.8, seed: seed + Math.floor(k * 999), scale: [(0.06 + k * 0.03) * scale, 0.034 * scale, (0.04 + (1 - k) * 0.02) * scale], flat: 0.65, sharp: 0.35 });
      paint(g, (px, py, pz) => mixC(c0, c1, smooth(clamp((vn2(px * 70 + k * 9, pz * 70 + py * 50, seed) * 0.5 + 0.5) * 1.6 - 0.45 + (py < 0 ? 0.15 : 0)))));
      geos.push(place(g, [x, y + 0.03 * scale, z], [0.2 * (rr() - 0.5), k * TAU, 0.2 * (rr() - 0.5)]));
    }
    h = 0.07 * scale;
  } else if (type === 'hachee') {
    mat = K.M.beef;
    const P = pts(n || 34, 0.045 * scale);
    for (const [x, z, k] of P) {
      const g = lump({ seg: 7, amp: 0.4, freq: 2.5, seed: seed + Math.floor(k * 999), scale: [0.035 * scale, 0.025 * scale, 0.03 * scale] });
      paint(g, () => mixC(C('#ffe0c8'), C('#c89070'), k));
      geos.push(place(g, [x, y + 0.02 * scale + rr() * 0.02 * scale, z], [rr() * 3, rr() * 3, rr() * 3]));
    }
    h = 0.06 * scale;
  }
  const geo = merge(geos, true);
  if (type !== 'hachee') boxUV(geo, type === 'cordonbleu' ? 0.36 : 0.3);
  if (type === 'nuggets' || type === 'tenders' || type === 'cordonbleu') paint(geo, (px, py, pz) => mixC(C('#ffffff'), C('#ffcf8a'), vn2(px * 20, pz * 20, seed) * 0.5 + 0.5));
  return { obj: mesh(geo, glazed && mat === K.M.bread ? K.M.breadGlazed : mat), h };
}

/** UV par projection « boîte » (selon l'axe dominant de la normale) : texture de panure sans étirement. */
export function boxUV(geo, tile = 0.12) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  let uv = geo.attributes.uv;
  if (!uv) { uv = new THREE.BufferAttribute(new Float32Array(p.count * 2), 2); geo.setAttribute('uv', uv); }
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i) / tile, y = p.getY(i) / tile, z = p.getZ(i) / tile;
    if (ay >= ax && ay >= az) uv.setXY(i, x, z);
    else if (ax >= az) uv.setXY(i, z + 0.37, y + 0.11);
    else uv.setXY(i, x + 0.71, y + 0.53);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Courbe une géométrie allongée (axe X) dans le plan XZ. */
function bend(g, k) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) + k * x * x * 4); }
  g.computeVertexNormals(); weldNormals(g);
}

/** Saucisse de poulet grillée (axe X), longueur len, rayon rad. */
export function sausage({ len = 1.5, rad = 0.075, seed = 9 } = {}) {
  const K = kit();
  const g = new THREE.CapsuleGeometry(rad, len - 2 * rad, 8, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const b = 1 + vn2(y * 9, Math.atan2(z, x) * 2, seed) * 0.03;
    p.setXYZ(i, x * b, y + Math.sin((y / len) * Math.PI) * 0, z * b);
  }
  g.rotateZ(Math.PI / 2);
  // légère courbure
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) - 0.04 * (x / (len / 2)) ** 2); }
  g.computeVertexNormals(); weldNormals(g);
  // UV : rayures de grill en diagonale
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), a = Math.atan2(p.getZ(i), p.getY(i)); uv.setXY(i, x * 2.2, a / TAU * 1.2); }
  return { obj: mesh(g, K.M.sausage), h: rad * 2 };
}

// ------------------------------------------------------------------ fromages
/**
 * Tranche de fromage fondue drapée avec coulures. kind : 'cheddar' | 'raclette'.
 * Pour un burger rond : tranche carrée dont les coins retombent ; pain long : bande.
 */
export function cheese(fp, { kind = 'cheddar', seed = 11, rot = 0.4, support = null } = {}) {
  const K = kit();
  const rac = kind === 'raclette';
  const L = fp.L, r = fp.r;
  const th = rac ? 0.028 : 0.016;
  const round = L <= 0;
  let R;
  if (round) { const sq = superR(r * 0.93, r * 0.93, rac ? 3 : 7); R = noisyR((a) => sq(a - rot), rac ? 0.08 : 0.02, 3, seed); }
  else R = noisyR(stadiumR(L + 0.03, r + (rac ? 0.06 : 0.045)), rac ? 0.07 : 0.03, 4, seed);
  const sup = support ?? r * (round ? (rac ? 0.86 : 0.92) : 0.82);
  const overOf = (x, z) => (round ? Math.max(0, Math.hypot(x, z) - sup) : Math.max(0, -stadiumD(x, z, L, sup)));
  const maxDrop = rac ? 0.085 : round ? 0.06 : 0.055;
  const drape = (x, z) => -maxDrop * (1 - Math.exp(-overOf(x, z) * (rac ? 16 : 13))) + vn2(x * 6, z * 6, seed) * (rac ? 0.01 : 0.004);
  const geo = slab({
    R, segs: 80, rings: 9, sideRows: 3, bulge: th * 0.6, tile: 0.4,
    top: (x, z) => th + drape(x, z) + (rac ? vn2(x * 10, z * 10, seed + 2) * 0.008 : vn2(x * 8, z * 8, seed + 2) * 0.004),
    bot: (x, z) => drape(x, z),
    color: (x, y, z, part, k) => mixC(C('#ffffff'), C('#d8d8d8'), clamp(0.5 + vn2(x * 6, z * 6, seed + 5) * 0.7) * 0.7 + (part === 1 ? 0.15 : 0)),
  });
  const geos = [geo];
  const rr = rng(seed + 20);
  const nd = rac ? 11 : 6;
  for (let i = 0; i < nd; i++) {
    const a = (i / nd) * TAU + rr() * 0.5 + rot;
    const rad = R(a) * 0.97, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (overOf(x, z) < 0.01) continue;
    const len = rac ? 0.05 + rr() * 0.08 : 0.03 + rr() * 0.06;
    const dr = rac ? 0.02 + rr() * 0.014 : 0.013 + rr() * 0.01;
    const d = dripGeo(len, dr, 10);
    place(d, [x, drape(x, z) + th * 0.5, z], [0, -a, 0], [1, 1, 0.7]);
    geos.push(d);
  }
  for (let i = 1; i < geos.length; i++) paint(geos[i], () => C('#ffffff'));
  return { obj: mesh(merge(geos, true), rac ? K.M.raclette : K.M.cheddar), h: th * 0.9 };
}

/** Rondelles de chèvre (croûte blanche, dessus doré). */
export function chevreRounds(fp, { seed = 13, n } = {}) {
  const K = kit();
  const R = stadiumR(fp.L, fp.r);
  const P = scatter(R, n || (fp.L > 0 ? 6 : 5), seed, { margin: 0.66, minD: 0.2 });
  const geos = [];
  for (const [x, z, k] of P) {
    const rad = 0.1 + k * 0.014;
    const g = slab({
      R: noisyR(() => rad, 0.03, 3, seed + Math.floor(k * 99)), segs: 36, rings: 5, sideRows: 3, bulge: 0.006, tile: 0.25,
      top: (xx, zz) => 0.05 + vn2(xx * 40, zz * 40, seed) * 0.003, bot: 0,
      color: (xx, yy, zz, part, kk) => {
        if (part === 1) return mixC(C('#f2eee6'), C('#c9c0ae'), 0.5);
        const spot = vn2(xx * 22 + x * 9, zz * 22 + z * 7, seed + 5) * 0.6 + vn2(xx * 60, zz * 60, seed + 6) * 0.4;
        if (part === 0 && kk > 0.9) return C('#efe9da');
        // dessus gratiné : doré au centre, marbré, bord blanc crémeux
        return part === 0 ? mixC(C('#fcf5e4'), C('#a4561a'), smooth(clamp(1.05 * Math.pow(1 - kk * kk, 0.5) + spot * 0.35 - 0.1)) * 0.92) : C('#f3eee2');
      },
    });
    geos.push(place(g, [x, 0, z], [0.05 * (k - 0.5), k * 6, 0.05 * (0.5 - k)]));
  }
  return { obj: mesh(merge(geos, true), K.M.chevre), h: 0.052 };
}

// ------------------------------------------------------------------ légumes
/** Feuille de salade frisée (batavia) ondulée qui déborde du pain. */
export function lettuce(fp, { seed = 15, over = 0.075, mound = 0.03, segs = 0, rings = 10, ruffle = 0.045, freq = 0, droop = 0.035 } = {}) {
  const K = kit();
  const L = fp.L + (fp.L > 0 ? 0.04 : 0), r = fp.r + over;
  const base = noisyR(stadiumR(L, r), 0.07, 4, seed);
  const R = (a) => base(a) * (1 + 0.035 * Math.sin(a * 23 + vn2(Math.cos(a) * 3, Math.sin(a) * 3, seed) * 3));
  const ruf = (x, z, k, a) => {
    const w = Math.sin(a * (freq || (fp.L > 0 ? 15 : 9)) + vn2(x * 4, z * 4, seed) * 2.5) * 0.6 + Math.sin(a * (freq ? freq * 2.3 : 21) + 1.3) * 0.4;
    return ruffle * Math.pow(k, 2.2) * w;
  };
  const top = (x, z, k, a) => mound * (1 - k * k) + ruf(x, z, k, a) - droop * Math.pow(k, 4);
  const geo = slab({
    R, segs: segs || (fp.L > 0 ? 140 : 112), rings, sideRows: 2, bulge: 0, tile: 0.5,
    top, bot: (x, z, k, a) => top(x, z, k, a) - 0.008,
    color: (x, y, z, part, k, a) => {
      const w = ruf(x, z, k, a) / ruffle;
      let c = k < 0.45 ? mixC(C('#c4d987'), C('#6aa83a'), k / 0.45) : mixC(C('#6aa83a'), C('#357a1c'), (k - 0.45) / 0.55);
      c = mixC(c, C('#1f5a10'), clamp(-w * 0.4 * k));
      return c;
    },
  });
  return { obj: mesh(geo, K.M.lettuce), h: mound + 0.018 };
}

/** Rondelles d'oignon (rouge ou blanc) : anneaux concentriques. */
export function onionRings(fp, { seed = 17, red = true, n } = {}) {
  const K = kit();
  const R = stadiumR(fp.L, fp.r);
  const P = scatter(R, n || (fp.L > 0 ? 6 : 5), seed, { margin: 0.7, minD: 0.18 });
  const geos = [];
  const cOut = red ? C('#6a0c3e') : C('#d9cfa8'), cIn = red ? C('#e2c2d6') : C('#efe8d2'), cMid = red ? C('#a0306a') : C('#e6dcbc');
  for (const [x, z, k] of P) {
    const rings = 2 + Math.floor(k * 2.4);
    const R0 = 0.085 + k * 0.055;
    for (let j = 0; j < rings; j++) {
      const rad = R0 - j * 0.03;
      if (rad < 0.025) break;
      const tube = 0.014 - j * 0.0012;
      const g = new THREE.TorusGeometry(rad, tube, 6, 30);
      g.rotateX(Math.PI / 2);
      g.scale(1, 0.8, 1);
      paint(g, (px, py, pz) => {
        const d = Math.hypot(px, pz) - rad;
        return d > tube * 0.35 ? cOut : d > -tube * 0.2 ? cMid : cIn;
      });
      g.translate(0, tube * 0.7, 0);
      geos.push(place(g, [x + vn2(j, k * 9, seed) * 0.008, 0.002 * j, z], [0.12 * (k - 0.5), 0, 0.1 * (0.5 - k)], [1, 1, 0.92 + 0.1 * k]));
    }
  }
  return { obj: mesh(merge(geos, true), K.M.onion), h: 0.024 };
}

/** Rondelles d'oignon frites (Barbecue) : anneaux épais panés. */
export function friedOnionRings(fp, { seed = 19, n } = {}) {
  const K = kit();
  const R = stadiumR(fp.L, fp.r);
  const P = scatter(R, n || (fp.L > 0 ? 5 : 4), seed, { margin: 0.6, minD: 0.2 });
  const geos = [];
  for (const [x, z, k] of P) {
    const rad = 0.085 + k * 0.03;
    const g = new THREE.TorusGeometry(rad, 0.026, 10, 36);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const b = 1 + vn2(px * 40 + k * 7, py * 40, seed) * 0.06;
      p.setXYZ(i, px * b, py * b, pz * (1 + (b - 1) * 2));
    }
    g.computeVertexNormals(); weldNormals(g);
    g.rotateX(Math.PI / 2); g.scale(1, 0.75, 1);
    g.translate(0, 0.02, 0);
    paint(g, () => mixC(C('#ffffff'), C('#ffc070'), k));
    geos.push(place(g, [x, 0, z], [0.15 * (k - 0.5), 0, 0.12 * (0.5 - k)]));
  }
  return { obj: mesh(merge(geos, true), K.M.bread), h: 0.04 };
}

/** Rondelles de cornichon (bord cranté vert foncé, chair translucide, pépins). */
export function pickles(fp, { seed = 21, n, rad = 0.075 } = {}) {
  const K = kit();
  const R = stadiumR(fp.L, fp.r);
  const P = scatter(R, n || (fp.L > 0 ? 6 : 5), seed, { margin: 0.7, minD: rad * 2.1 });
  const geos = [];
  for (const [x, z, k] of P) {
    const rr = rad * (0.85 + k * 0.3);
    const g = slab({
      R: (a) => rr * (1 + 0.05 * Math.sin(a * 11) + 0.04 * Math.sin(a * 3 + k * 9)), segs: 33, rings: 5, sideRows: 2, bulge: 0.002, tile: 0.2,
      top: (xx, zz, kk) => 0.014 - 0.004 * (1 - kk * kk), bot: (xx, zz, kk) => 0.002 * kk,
      color: (xx, yy, zz, part, kk, a) => {
        if (part === 1 || kk > 0.9) return C('#3d6a17');
        if (kk > 0.78) return C('#7a9a2c');
        const seedRing = Math.abs(kk - 0.45) < 0.1 && Math.sin(a * 8) > 0.2;
        return seedRing ? C('#eef0b0') : mixC(C('#c8d978'), C('#a4bf55'), kk);
      },
    });
    geos.push(place(g, [x, 0, z], [0.18 * (k - 0.5), k * 9, 0.14 * (0.5 - k)]));
  }
  return { obj: mesh(merge(geos, true), K.M.pickle), h: 0.018 };
}

/** Rondelles de tomate (coupe texturée : chair, loges, pépins ; peau brillante). */
export function tomatoSlices(R, { seed = 23, n = 5, rad = 0.1, margin = 0.7 } = {}) {
  const K = kit();
  const P = scatter(R, n, seed, { margin, minD: rad * 1.6 });
  const geos = [];
  for (const [x, z, k] of P) {
    const rr = rad * (0.9 + k * 0.2);
    const g = slab({
      R: (a) => rr * (1 + 0.025 * Math.sin(a * 5 + k * 7)), segs: 36, rings: 3, sideRows: 2, bulge: 0.004, tile: rr * 2,
      top: (xx, zz, kk) => 0.03 + 0.002 * (1 - kk), bot: 0, parts: [0, 1, 0],
    });
    geos.push(place(g, [x, 0, z], [0.1 * (k - 0.5), k * 6, 0.1 * (0.5 - k)]));
  }
  return { obj: mesh(mergeByGroup(geos), [K.M.tomatoCut, K.M.tomatoSkin]), h: 0.032 };
}

// ------------------------------------------------------------------ sauces
export const SAUCES = {
  blanche: { color: '#e4ddcf', rough: 0.18, sheen: 0.2 },
  poivre: { color: '#8e5e36', rough: 0.1, speck: true, sheen: 0.25, sheenColor: '#f0c890' },
  barbecue: { color: '#6a1c0a', rough: 0.08, emissive: '#4a0c00', emissiveIntensity: 0.16 },
  aigredouce: { color: '#c4360c', rough: 0.06, emissive: '#5a1000', emissiveIntensity: 0.15, sheen: 0.1, sheenColor: '#ff9040' },
  ketchup: { color: '#b8130f', rough: 0.1, emissive: '#5a0000', emissiveIntensity: 0.1 },
  moutardemiel: { color: '#e8b41c', rough: 0.12, emissive: '#7a4a00', emissiveIntensity: 0.1 },
  fromagere: { color: '#f7a51e', rough: 0.1, emissive: '#e06000', emissiveIntensity: 0.12, sheen: 0.2, sheenColor: '#ffe080' },
  creme: { color: '#e6e0d4', rough: 0.2, sheen: 0.25 },
  samourai: { color: '#ee7a2e', rough: 0.12, emissive: '#7a2000', emissiveIntensity: 0.08 },
  miel: { color: '#d98a0c', rough: 0.05, opacity: 0.82, emissive: '#a04a00', emissiveIntensity: 0.2 },
  chocolat: { color: '#3a1a0c', rough: 0.1 },
  caramel: { color: '#c4661a', rough: 0.08, emissive: '#5a2000', emissiveIntensity: 0.15 },
  fraise: { color: '#d4142e', rough: 0.08, emissive: '#600010', emissiveIntensity: 0.15 },
  pistache: { color: '#a8c060', rough: 0.15 },
  blancchoc: { color: '#e6dccb', rough: 0.15, sheen: 0.25 },
};
export const sauce = (id) => sauceMat('sauce-' + id, SAUCES[id]);

/** Nappe de sauce épaisse avec coulures sur les bords. */
export function sauceSheet(fp, id, { seed = 25, scale = 1, th = 0.03, drips = 7, dripLen = [0.03, 0.09], drapeK = 1.4, support, lumps = 1 } = {}) {
  const L = fp.L * scale, r = fp.r * scale;
  const R = noisyR(stadiumR(L, r), 0.1, 4, seed);
  const sup = support ?? fp.r * 0.95;
  const overOf = (x, z) => Math.max(0, -stadiumD(x, z, fp.L, sup));
  const drape = (x, z) => -0.05 * drapeK * (1 - Math.exp(-overOf(x, z) * 14));
  const edge = (x, z) => clamp(stadiumD(x, z, L, r) / (r * 0.2));
  const geo = slab({
    R, segs: 96, rings: 8, sideRows: 4, bulge: th * 0.8, tile: 0.4,
    top: (x, z) => drape(x, z) + th * (0.45 + 0.55 * smooth(edge(x, z))) * (0.7 + 0.6 * (vn2(x * 6, z * 6, seed + 3) * 0.5 + 0.5)) + lumps * (vn2(x * 11, z * 11, seed) * 0.007 + vn2(x * 24, z * 24, seed + 4) * 0.003),
    bot: (x, z) => drape(x, z),
  });
  const geos = [geo];
  const rr = rng(seed + 9);
  for (let i = 0; i < drips; i++) {
    const a = rr() * TAU, rad = R(a) * 0.96, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const d = dripGeo(lerp(dripLen[0], dripLen[1], rr()), 0.012 + rr() * 0.008, 10);
    geos.push(place(d, [x, drape(x, z) + th * 0.4, z], [0, -a, 0], [1, 1, 0.7]));
  }
  return { obj: mesh(merge(geos), sauce(id)), h: th };
}

/** Filet de sauce en zigzag (le long de X), suivant la hauteur yFn(x,z). */
export function zigzag(fp, id, { seed = 27, y = 0, yFn = null, n, amp = 0.8, radius = 0.011, cross = false, along = 'x', ext = 0.9, flat = 0.6 } = {}) {
  const L = fp.L, r = fp.r;
  const rr = rng(seed);
  const len = (L + r) * ext;
  const N = n || Math.round(fp.L > 0 ? 18 : 9);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = -len + 2 * len * t;
    const half = L > 0 ? Math.max(0.02, Math.min(r, stadiumD(x, 0, L, r))) : Math.sqrt(Math.max(0, r * r - x * x));
    const z = (i % 2 ? 1 : -1) * half * amp * (0.85 + rr() * 0.15);
    const X = along === 'z' ? z : x, Z = along === 'z' ? x : z;
    pts.push([X, (yFn ? yFn(X, Z) : y) + radius * 0.6, Z]);
    if (i < N) {
      const x2 = x + len / N, X2 = along === 'z' ? z * 0.1 : x2, Z2 = along === 'z' ? x2 : z * 0.1;
      pts.push([X2, (yFn ? yFn(X2, Z2) : y) + radius * 0.6, Z2]);
    }
  }
  const geos = [tubeGeo(pts, radius, pts.length * 4, 7)];
  if (cross) {
    const p2 = pts.map(([x, yy, z]) => [z * (L > 0 ? 1 : 1), yy + radius * 0.5, x]);
    if (L <= 0) geos.push(tubeGeo(p2, radius, p2.length * 4, 7));
  }
  const out = merge(geos);
  flatten(out, (x, z) => (yFn ? yFn(x, z) : y) + radius * 0.6, flat);
  return { obj: mesh(out, sauce(id)), h: radius * 2 };
}

/** Écrase verticalement un tube de sauce autour de sa ligne médiane (ruban posé, pas un spaghetti). */
function flatten(geo, mid, k) {
  if (k >= 1) return;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const c = mid(p.getX(i), p.getZ(i)); p.setY(i, c + (p.getY(i) - c) * k); }
  geo.computeVertexNormals();
}

/** Filets libres (miel, aigre-douce, crème) : courbes ondulées sur la surface. */
export function drizzle(R, id, { seed = 29, n = 4, y = 0, yFn = null, radius = 0.01, margin = 0.85, flat = 0.55 } = {}) {
  const rr = rng(seed);
  const geos = [];
  for (let i = 0; i < n; i++) {
    const pts = [];
    const a0 = rr() * TAU, a1 = a0 + Math.PI + (rr() - 0.5) * 1.2;
    const k0 = margin * (0.6 + rr() * 0.4), k1 = margin * (0.6 + rr() * 0.4);
    const x0 = Math.cos(a0) * R(a0) * k0, z0 = Math.sin(a0) * R(a0) * k0, x1 = Math.cos(a1) * R(a1) * k1, z1 = Math.sin(a1) * R(a1) * k1;
    const M = 14;
    for (let j = 0; j <= M; j++) {
      const t = j / M;
      const wob = Math.sin(t * Math.PI * (2 + rr() * 0.5) + i) * 0.06;
      const x = lerp(x0, x1, t) + wob * (z1 - z0) * 1.5, z = lerp(z0, z1, t) - wob * (x1 - x0) * 1.5;
      pts.push([x, (yFn ? yFn(x, z) : y) + radius * 0.7, z]);
    }
    geos.push(tubeGeo(pts, radius * (0.8 + rr() * 0.5), 56, 6));
  }
  const out = merge(geos);
  flatten(out, (x, z) => (yFn ? yFn(x, z) : y) + radius * 0.7, flat);
  return { obj: mesh(out, sauce(id)), h: radius * 2 };
}

// ------------------------------------------------------------------ petits éléments (instanciés)
/** Frites (InstancedMesh) : bâtonnets dorés à bouts plus foncés. place(i, rr) → { p:[x,y,z], r:[x,y,z], len } */
export function fries(n, seed, placeFn, { thick = 0.034 } = {}) {
  const K = kit();
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 3);
  g.rotateY(Math.PI / 6);
  paint(g, (x, y) => mixC(C('#ffe28a'), C('#d0902e'), Math.pow(Math.abs(y) * 2, 4)));
  const im = new THREE.InstancedMesh(g, K.M.fries, n);
  const rr = rng(seed), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const o = placeFn(i, rr);
    e.set(o.r[0], o.r[1], o.r[2]); q.setFromEuler(e);
    const th = thick * (0.85 + rr() * 0.3);
    im.setMatrixAt(i, m.compose(p.set(o.p[0], o.p[1], o.p[2]), q, s.set(th, o.len, th * (0.9 + rr() * 0.2))));
    const l = 0.8 + rr() * 0.22;
    im.setColorAt(i, c.setRGB(l, l * (0.95 + rr() * 0.05), l * (0.8 + rr() * 0.12)));
  }
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  im.computeBoundingBox(); im.computeBoundingSphere();
  return im;
}

/** Petits éclats (oignon crispy, persil, miettes, coco…) en InstancedMesh. */
export function bits(n, seed, mat, placeFn, { seg = 5, colorFn = null, flat = 0.4 } = {}) {
  const g = lump({ seg, amp: 0.35, freq: 1.8, seed, scale: [1, flat, 1], rings: Math.max(3, seg - 2) });
  paint(g, () => C('#ffffff'));
  const im = new THREE.InstancedMesh(g, mat, n);
  const rr = rng(seed + 1), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const o = placeFn(i, rr);
    e.set(o.r?.[0] ?? (rr() - 0.5) * 0.8, o.r?.[1] ?? rr() * TAU, o.r?.[2] ?? (rr() - 0.5) * 0.8); q.setFromEuler(e);
    im.setMatrixAt(i, m.compose(p.set(o.p[0], o.p[1], o.p[2]), q, s.set(o.s[0], o.s[1], o.s[2])));
    if (colorFn) im.setColorAt(i, colorFn(i, rr, c));
  }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingBox(); im.computeBoundingSphere();
  return im;
}

/** Cerneaux de noix (Chèvre miel). */
export function walnuts(fp, { seed = 31, n = 7, y = 0 } = {}) {
  const K = kit();
  const R = stadiumR(fp.L, fp.r);
  const P = scatter(R, n, seed, { margin: 0.7, minD: 0.12 });
  const geos = P.map(([x, z, k]) => place(lump({ seg: 14, amp: 0.5, freq: 3.4, seed: seed + Math.floor(k * 99), scale: [0.06, 0.03, 0.046], sharp: 0.6, flat: 0.6 }), [x, y + 0.024, z], [0.2, k * 6, 0.1]));
  return { obj: mesh(merge(geos), K.M.walnut), h: 0.05 };
}

export { mixC, C as colorOf, mesh };

/** Tas de feuilles de salade frisée (kapsalone) : plusieurs petites feuilles inclinées en dôme. */
export function leafHeap(R, { seed = 33, n = 6, size = 0.15, mound = 0.08 } = {}) {
  const K = kit();
  const P = scatter(R, n, seed, { margin: 0.55, minD: size * 0.9 });
  const geos = P.map(([x, z, k], i) => {
    const g = lettuce({ L: 0, r: size * (0.85 + k * 0.3) }, { seed: seed + i * 7, over: 0, mound: 0.03, segs: 48, rings: 5, ruffle: 0.016, freq: 13, droop: 0.02 }).obj.geometry;
    const d = Math.hypot(x, z) + 1e-6;
    return place(g, [x, mound * (1 - Math.min(1, d / (R(Math.atan2(z, x)) * 0.8))) + i * 0.004, z], [(-z / d) * 0.45 * (0.4 + k), k * 6, (x / d) * 0.45 * (0.4 + k)]);
  });
  return { obj: mesh(merge(geos, true), K.M.lettuce), h: mound + 0.04 };
}

/** Flaques / éclaboussures de sauce brillante (plusieurs petites nappes + coulures). */
export function saucePuddles(R, id, { seed = 35, n = 6, size = 0.12, th = 0.016, y = 0, yFn = null, margin = 0.7, drips = 1 } = {}) {
  const P = scatter(R, n, seed, { margin, minD: size * 1.1 });
  const rr = rng(seed + 3);
  const geos = [];
  P.forEach(([x, z, k], i) => {
    const r0 = size * (0.7 + k * 0.6);
    const Rb = noisyR(() => r0, 0.22, 2.5, seed + i * 5);
    const yy = yFn ? yFn(x, z) - 0.006 : y;
    geos.push(place(slab({
      R: Rb, segs: 40, rings: 5, sideRows: 3, bulge: th * 0.5, tile: 0.3,
      top: (xx, zz, kk) => th * (0.4 + 0.6 * (1 - kk * kk)) + vn2(xx * 20, zz * 20, seed + i) * 0.003, bot: 0,
    }), [x, yy, z], [0, 0, 0]));
    for (let d = 0; d < drips; d++) {
      const a = rr() * TAU, rad = Rb(a) * 0.9;
      geos.push(place(dripGeo(0.02 + rr() * 0.04, 0.009 + rr() * 0.005, 8), [x + Math.cos(a) * rad, yy + th * 0.3, z + Math.sin(a) * rad], [0, -a, 0], [1, 1, 0.7]));
    }
  });
  return { obj: mesh(merge(geos), sauce(id)), h: th };
}

/**
 * Nappage brillant (sauce aigre-douce, glaçage…) épousant une géométrie existante : coque décalée le
 * long des normales, ouverte en dessous (seules les faces orientées vers le haut sont gardées),
 * avec quelques gouttes qui pendent au bord. Même repère que la géométrie source.
 */
export function glazeShell(src, id, { offset = 0.006, minNy = -0.05, drips = 8, seed = 37, dripLen = [0.015, 0.045], dripR = 0.008, thick = 0.5, glazeColor = null, glazeOpacity = 0.6 } = {}) {
  const g = src.index ? src.clone() : src.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ny = n.getY(i);
    // plus épais sur le dessus (la sauce s'accumule), fin sur les flancs
    const o = offset * (1 + thick * clamp(ny) + 0.35 * vn2(p.getX(i) * 40, p.getZ(i) * 40, seed));
    p.setXYZ(i, p.getX(i) + n.getX(i) * o, p.getY(i) + n.getY(i) * o, p.getZ(i) + n.getZ(i) * o);
  }
  const src_i = g.index ? g.index.array : Array.from({ length: p.count }, (_, i) => i);
  const keep = [];
  const ok = (i) => n.getY(i) > minNy + 0.25 * vn2(p.getX(i) * 25, p.getZ(i) * 25, seed + 3);
  for (let t = 0; t < src_i.length; t += 3) {
    const a = src_i[t], b = src_i[t + 1], c = src_i[t + 2];
    if (ok(a) && ok(b) && ok(c)) keep.push(a, b, c);
  }
  g.setIndex(keep);
  g.computeVertexNormals();
  boxUV(g, 0.3);
  const geos = [g];
  // gouttes au bord du nappage
  const rr = rng(seed + 11);
  const cand = [];
  for (let i = 0; i < p.count; i++) { const ny = n.getY(i); if (ny > minNy + 0.05 && ny < minNy + 0.3) cand.push(i); }
  for (let k = 0; k < drips && cand.length; k++) {
    const i = cand[Math.floor(rr() * cand.length)];
    geos.push(place(dripGeo(lerp(dripLen[0], dripLen[1], rr()), dripR * (0.7 + rr() * 0.6), 8), [p.getX(i), p.getY(i), p.getZ(i)], [0, rr() * TAU, 0], [1, 1, 0.8]));
  }
  // nappage : même brillance que la sauce, mais laisse deviner le relief de la panure dessous
  const K = kit();
  const key = 'glaze-' + id;
  let mat = K.sauces.get(key);
  if (!mat) {
    mat = sauce(id).clone();
    mat.normalMap = K.T.breadN; mat.normalScale = new THREE.Vector2(0.75, 0.75);
    if (glazeColor) mat.color.set(glazeColor);
    mat.transparent = true; mat.opacity = glazeOpacity;
    K.sauces.set(key, mat);
  }
  return { obj: mesh(merge(geos), mat), h: 0 };
}
