// Outils communs aux segments 05-circuits (11 → 14 s) et 06-glass (14 → 18 s) — même agent.
//
//  - PANE / IMPACT / fracture() : motif de fracture radiale UNIQUE de la vitre de l'écran (unités =
//    largeur de la vitre). circuits dessine les fissures qui naissent sous la vitre (vue de
//    l'intérieur) ; glass construit ses éclats extrudés à partir des MÊMES cellules → raccord exact.
//  - Raccord caméra 14.00 s : RACCORD = distance caméra/vitre (en largeurs de vitre) + focale.
//  - makeBoardTextures() : textures procédurales de circuit imprimé (masques + phase des flux).
//  - Petits utilitaires visuels (ciel brumeux, halos, rayons, scrim, traînées de whip).
//
// Tout est créé une fois (create) ; les fonctions de dessin sont pures (temps → image).

import { E, clamp, lerp, seg, rng, rgba, TAU } from '../core/anim.js';
import { setFont, textWidth } from '../core/draw.js';
import { C } from '../core/type.js';
import { PHONE } from '../world/phone.js';

export const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const keyAt = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return va + (vb - va) * ((t - a) / (b - a || 1e-9));
    }
  }
  return keys[keys.length - 1][1];
};

// ------------------------------------------------------------------ vitre + fracture
/** Vitre de l'écran (mêmes cotes que world/phone.js) ; en « unités vitre » : x ∈ [-0.5, 0.5], y ∈ [-hh, hh]. */
export const PANE = (() => {
  const B = PHONE.B;
  const w = PHONE.W - 2 * B - 0.004, h = PHONE.H - 2 * B - 0.004, r = PHONE.R - B - 0.002;
  return { w, h, r, hw: 0.5, hh: h / w / 2, rr: r / w };
})();
/** Point d'impact (unités vitre) : là où la caméra percute la vitre. */
export const IMPACT = [0.07, 0.07];
/** Raccord caméra à 14.00 : distance à la vitre (unités vitre) et focale verticale (deg). */
export const RACCORD = { dist: 0.105, fovH: 62, fovV: 78 };

function paneOutline(n = 6) {
  const { hw, hh, rr } = PANE;
  const pts = [];
  const corners = [[hw - rr, -hh + rr, -Math.PI / 2], [hw - rr, hh - rr, 0], [-hw + rr, hh - rr, Math.PI / 2], [-hw + rr, -hh + rr, Math.PI]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * Math.PI / 2;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return pts; // sens trigonométrique (convexe)
}

function clipPoly(poly, clip) {
  let out = poly;
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length];
    const inside = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]) >= 0;
    const inter = (p, q) => {
      const a1 = B[1] - A[1], b1 = A[0] - B[0], c1 = a1 * A[0] + b1 * A[1];
      const a2 = q[1] - p[1], b2 = p[0] - q[0], c2 = a2 * p[0] + b2 * p[1];
      const det = a1 * b2 - a2 * b1 || 1e-12;
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
    };
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length];
      const ip = inside(P), iq = inside(Q);
      if (ip) { out.push(P); if (!iq) out.push(inter(P, Q)); } else if (iq) out.push(inter(P, Q));
    }
  }
  return out;
}

function clipSeg(p, q, poly) {
  let t0 = 0, t1 = 1;
  const d = [q[0] - p[0], q[1] - p[1]];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const n = [-(B[1] - A[1]), B[0] - A[0]];
    const num = n[0] * (p[0] - A[0]) + n[1] * (p[1] - A[1]);
    const den = n[0] * d[0] + n[1] * d[1];
    if (Math.abs(den) < 1e-12) { if (num < 0) return null; continue; }
    const t = -num / den;
    if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [[p[0] + d[0] * t0, p[1] + d[1] * t0], [p[0] + d[0] * t1, p[1] + d[1] * t1]];
}

function polyArea(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length];
    const c = x0 * y1 - x1 * y0;
    a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  a *= 0.5;
  return { area: Math.abs(a), cen: Math.abs(a) > 1e-9 ? [cx / (6 * a), cy / (6 * a)] : p[0] };
}

let FR = null;
/**
 * Fracture radiale déterministe : { cells: [{ poly, cen, area, k (anneau), ang, rad }], cracks: [{ a, b, r0, r1, kind }] }.
 * Coordonnées en unités vitre, origine au centre de la vitre.
 */
export function fracture() {
  if (FR) return FR;
  const r = rng(4242);
  const NA = 13;
  const RAD = [0, 0.04, 0.1, 0.19, 0.31, 0.47, 0.7, 1.0, 1.55];
  const NR = RAD.length - 1;
  const th0 = r() * TAU;
  const th = [];
  for (let i = 0; i < NA; i++) th.push(th0 + (i + (r() - 0.5) * 0.7) * TAU / NA);
  const Vt = [];
  for (let k = 0; k <= NR; k++) {
    Vt[k] = [];
    for (let i = 0; i < NA; i++) {
      if (k === 0) { Vt[k][i] = [IMPACT[0], IMPACT[1]]; continue; }
      const a = th[i] + (r() - 0.5) * 0.18 * Math.min(1, k / 2);
      const rad = RAD[k] * (1 + (r() - 0.5) * 0.34);
      Vt[k][i] = [IMPACT[0] + Math.cos(a) * rad, IMPACT[1] + Math.sin(a) * rad];
    }
  }
  const outline = paneOutline();
  const cells = [];
  const cracks = [];
  const dist = (p) => Math.hypot(p[0] - IMPACT[0], p[1] - IMPACT[1]);
  const addCrack = (p, q, kind) => {
    const c = clipSeg(p, q, outline);
    if (!c) return;
    const ra = dist(c[0]), rb = dist(c[1]);
    if (ra <= rb) cracks.push({ a: c[0], b: c[1], r0: ra, r1: rb, kind });
    else cracks.push({ a: c[1], b: c[0], r0: rb, r1: ra, kind });
  };
  for (let k = 0; k < NR; k++) {
    for (let i = 0; i < NA; i++) {
      const i2 = (i + 1) % NA;
      let polys;
      if (k === 0) polys = [[Vt[0][i], Vt[1][i], Vt[1][i2]]];
      else {
        const q = [Vt[k][i], Vt[k][i2], Vt[k + 1][i2], Vt[k + 1][i]];
        if (k >= 2 && r() < 0.32) {
          if (r() < 0.5) { polys = [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]; addCrack(q[0], q[2], 'd'); }
          else { polys = [[q[0], q[1], q[3]], [q[1], q[2], q[3]]]; addCrack(q[1], q[3], 'd'); }
        } else polys = [q];
      }
      for (const p of polys) {
        const c = clipPoly(p, outline);
        if (c.length < 3) continue;
        const { area, cen } = polyArea(c);
        if (area < 2e-4) continue;
        cells.push({ poly: c, cen, area, k, ang: Math.atan2(cen[1] - IMPACT[1], cen[0] - IMPACT[0]), rad: dist(cen) });
      }
      addCrack(Vt[k][i], Vt[k + 1][i], 'r');
      if (k >= 1) addCrack(Vt[k][i], Vt[k][i2], 'c');
    }
  }
  FR = { cells, cracks, outline };
  return FR;
}

// ------------------------------------------------------------------ circuit imprimé (textures)
/**
 * Tuile de circuit imprimé sans couture (TS px = TW unités monde).
 *  mask : R = cuivre sous vernis, G = pastilles / vias dorés, B = sérigraphie
 *  flow : R = phase le long de la piste (période PER px), G = identifiant de piste, B = masque de flux
 */
export function makeBoardTextures(THREE, TS = 2048) {
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = TS;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, TS, TS);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    return [c, g];
  };
  const [cm, gm] = mk();
  const [cf, gf] = mk();
  const r = rng(1337);
  const PER = 480;
  const offsetsFor = (x0, y0, x1, y1) => {
    const xs = [0], ys = [0];
    if (x0 < 0) xs.push(TS); if (x1 > TS) xs.push(-TS);
    if (y0 < 0) ys.push(TS); if (y1 > TS) ys.push(-TS);
    const o = [];
    for (const a of xs) for (const b of ys) o.push([a, b]);
    return o;
  };
  const bbox = (pts, pad) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  };
  function via(x, y, rr, hole = true) {
    for (const [ox, oy] of offsetsFor(x - rr, y - rr, x + rr, y + rr)) {
      gm.globalCompositeOperation = 'lighter';
      gm.fillStyle = 'rgb(0,255,0)';
      gm.beginPath(); gm.arc(x + ox, y + oy, rr, 0, TAU); gm.fill();
      if (hole) {
        gm.globalCompositeOperation = 'source-over';
        gm.fillStyle = '#000';
        gm.beginPath(); gm.arc(x + ox, y + oy, rr * 0.42, 0, TAU); gm.fill();
      }
    }
  }
  function trace(pts, w, id) {
    const bb = bbox(pts, w + 4);
    for (const [ox, oy] of offsetsFor(...bb)) {
      gm.globalCompositeOperation = 'lighter';
      gm.strokeStyle = 'rgb(255,0,0)';
      gm.lineWidth = w;
      gm.beginPath();
      pts.forEach(([x, y], i) => (i ? gm.lineTo(x + ox, y + oy) : gm.moveTo(x + ox, y + oy)));
      gm.stroke();
      if (id === null) continue;
      let s = 0;
      for (let i = 1; i < pts.length; i++) {
        const [xa, ya] = pts[i - 1], [xb, yb] = pts[i];
        const len = Math.hypot(xb - xa, yb - ya);
        if (len < 0.5) continue;
        const p0 = s / PER, p1 = (s + len) / PER;
        const grd = gf.createLinearGradient(xa + ox, ya + oy, xb + ox, yb + oy);
        const col = (p) => `rgb(${Math.round((p - Math.floor(p)) * 255)},${id},255)`;
        grd.addColorStop(0, col(p0));
        for (let k = Math.floor(p0) + 1; k < p1; k++) {
          const o = (k - p0) / (p1 - p0);
          grd.addColorStop(Math.max(0, o - 1e-4), `rgb(255,${id},255)`);
          grd.addColorStop(Math.min(1, o + 1e-4), `rgb(0,${id},255)`);
        }
        grd.addColorStop(1, col(p1 - 1e-4));
        gf.strokeStyle = grd;
        gf.lineWidth = Math.max(2, w * 0.8);
        gf.beginPath(); gf.moveTo(xa + ox, ya + oy); gf.lineTo(xb + ox, yb + oy); gf.stroke();
        s += len;
      }
    }
  }
  const DIRS = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2], [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2]];
  function centerline(x, y, segs) {
    const pts = [[x, y]];
    for (const [d, L] of segs) { x += DIRS[d & 7][0] * L; y += DIRS[d & 7][1] * L; pts.push([x, y]); }
    return pts;
  }
  function offsetLine(pts, o) {
    const n = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      const l = Math.hypot(dx, dy) || 1;
      n.push([-dy / l, dx / l]);
    }
    return pts.map((p, i) => {
      if (i === 0) return [p[0] + n[0][0] * o, p[1] + n[0][1] * o];
      if (i === pts.length - 1) return [p[0] + n[i - 1][0] * o, p[1] + n[i - 1][1] * o];
      const a = n[i - 1], b = n[i];
      const k = o / (1 + a[0] * b[0] + a[1] * b[1]);
      return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k];
    });
  }
  // plans de masse (cuivre sous vernis, plus clair)
  gm.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const w = 160 + r() * 420, h = 120 + r() * 360, x = r() * TS, y = r() * TS;
    for (const [ox, oy] of offsetsFor(x, y, x + w, y + h)) {
      gm.fillStyle = 'rgb(70,0,0)';
      gm.beginPath(); gm.roundRect(x + ox, y + oy, w, h, 18); gm.fill();
    }
  }
  // bus de pistes parallèles avec coudes à 45°
  for (let b = 0; b < 30; b++) {
    const n = 3 + Math.floor(r() * 7), sp = 13 + r() * 9, w = 3.5 + r() * 3.5;
    const d0 = Math.floor(r() * 4) * 2, turn = r() < 0.5 ? 1 : -1;
    const segs = [[d0, 120 + r() * 520], [d0 + turn, 50 + r() * 220], [d0 + (r() < 0.6 ? 0 : 2 * turn), 120 + r() * 640]];
    if (r() < 0.45) segs.push([segs[2][0] - turn, 40 + r() * 160], [segs[2][0] - 2 * turn * (r() < 0.5 ? 0 : 1), 80 + r() * 300]);
    const cl = centerline(r() * TS, r() * TS, segs);
    const active = r() < 0.62;
    const baseId = active ? (r() < 0.5 ? 0.05 + r() * 0.2 : 0.32 + r() * 0.25) : 0.65 + r() * 0.33;
    for (let k = 0; k < n; k++) {
      const pts = offsetLine(cl, (k - (n - 1) / 2) * sp);
      const id = Math.round(clamp(baseId + (r() - 0.5) * 0.03) * 255);
      trace(pts, w, id);
      const e0 = pts[0], e1 = pts[pts.length - 1];
      via(e0[0], e0[1], w * 1.25 + 2.5);
      via(e1[0], e1[1], w * 1.25 + 2.5);
    }
  }
  // pistes isolées
  for (let i = 0; i < 170; i++) {
    const d0 = Math.floor(r() * 8);
    const segs = [[d0, 40 + r() * 260]];
    if (r() < 0.7) segs.push([d0 + (r() < 0.5 ? 1 : -1), 20 + r() * 140]);
    if (r() < 0.5) segs.push([segs[segs.length - 1][0] + (r() < 0.5 ? 1 : -1), 30 + r() * 200]);
    const pts = centerline(r() * TS, r() * TS, segs);
    const w = 2.5 + r() * 3;
    const id = r() < 0.55 ? Math.round((0.02 + r() * 0.56) * 255) : Math.round((0.66 + r() * 0.33) * 255);
    trace(pts, w, id);
    via(pts[0][0], pts[0][1], w + 3.5);
    via(pts[pts.length - 1][0], pts[pts.length - 1][1], w + 3.5);
  }
  // matrices BGA
  for (let i = 0; i < 7; i++) {
    const n = 8 + Math.floor(r() * 8), pitch = 15 + r() * 6, x0 = r() * TS, y0 = r() * TS, rr = pitch * 0.27;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) via(x0 + a * pitch, y0 + b * pitch, rr, false);
  }
  // pastilles CMS par paires
  gm.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 260; i++) {
    const x = r() * TS, y = r() * TS, w = 8 + r() * 10, h = 7 + r() * 8, gap = 8 + r() * 12, vert = r() < 0.5;
    for (const [ox, oy] of offsetsFor(x - 40, y - 40, x + 40, y + 40)) {
      gm.fillStyle = 'rgb(0,255,0)';
      if (vert) { gm.fillRect(x + ox - w / 2, y + oy - gap / 2 - h, w, h); gm.fillRect(x + ox - w / 2, y + oy + gap / 2, w, h); }
      else { gm.fillRect(x + ox - gap / 2 - h, y + oy - w / 2, h, w); gm.fillRect(x + ox + gap / 2, y + oy - w / 2, h, w); }
    }
  }
  // champs de vias de couture
  for (let i = 0; i < 10; i++) {
    const x0 = r() * TS, y0 = r() * TS, n = 4 + Math.floor(r() * 5), p = 26 + r() * 14;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) via(x0 + a * p, y0 + b * p, 5.5);
  }
  // sérigraphie : contours de composants + repères génériques
  gm.globalCompositeOperation = 'lighter';
  gm.strokeStyle = 'rgb(0,0,255)';
  gm.fillStyle = 'rgb(0,0,255)';
  gm.lineWidth = 2.2;
  setFont(gm, 15, 600, 0.05);
  for (let i = 0; i < 80; i++) {
    const x = r() * TS, y = r() * TS, w = 40 + r() * 140, h = 30 + r() * 120;
    gm.strokeRect(x, y, w, h);
    const lab = ['C', 'R', 'U', 'L', 'J', 'Q'][Math.floor(r() * 6)] + (1 + Math.floor(r() * 99));
    gm.fillText(lab, x + 4, y - 6);
  }
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  return { mask: tex(cm), flow: tex(cf), PER };
}

/**
 * Décalque d'éventail de pistes autour du SoC (additif) : les pistes convergent vers le boîtier
 * (la phase croît vers le SoC → les impulsions y entrent). Couvre `size` unités, SoC de `soc` unités au centre.
 */
export function makeFanoutTexture(THREE, size, soc, TS = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = TS;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, TS, TS);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const px = TS / size, half = TS / 2, hs = (soc / 2) * px;
  const r = rng(77);
  const PER = 150;
  for (let side = 0; side < 4; side++) {
    const n = 15;
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * (hs * 1.7 / n);
      const fan = (k - (n - 1) / 2) / ((n - 1) / 2);
      // repère local : u = le long du côté, v = vers l'extérieur
      const L1 = 14 + r() * 26, L2 = 60 + Math.abs(fan) * 90 + r() * 60, L3 = TS;
      const local = [[off, hs + 4], [off, hs + 4 + L1], [off + fan * L2 * 0.9, hs + 4 + L1 + L2 * 0.9], [off + fan * L2 * 0.9, hs + L3]];
      const rot = (p) => {
        const [u, v] = p;
        if (side === 0) return [half + u, half + v];
        if (side === 1) return [half - v, half + u];
        if (side === 2) return [half - u, half - v];
        return [half + v, half - u];
      };
      const pts = local.map(rot).reverse(); // de l'extérieur vers le SoC
      const id = Math.round((0.04 + r() * 0.24) * 255);
      let s = r() * PER;
      g.lineWidth = 3.2;
      for (let i = 1; i < pts.length; i++) {
        const [xa, ya] = pts[i - 1], [xb, yb] = pts[i];
        const len = Math.hypot(xb - xa, yb - ya);
        const p0 = s / PER, p1 = (s + len) / PER;
        const grd = g.createLinearGradient(xa, ya, xb, yb);
        const col = (p) => `rgb(${Math.round((p - Math.floor(p)) * 255)},${id},255)`;
        grd.addColorStop(0, col(p0));
        for (let q = Math.floor(p0) + 1; q < p1; q++) {
          const o = (q - p0) / (p1 - p0);
          grd.addColorStop(Math.max(0, o - 1e-4), `rgb(255,${id},255)`);
          grd.addColorStop(Math.min(1, o + 1e-4), `rgb(0,${id},255)`);
        }
        grd.addColorStop(1, col(p1 - 1e-4));
        g.strokeStyle = grd;
        g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
        s += len;
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ utilitaires visuels
/** Ciel sphérique (suit la caméra) : noir profond + brume verte à l'horizon + halo dirigé. */
export function makeHazeSky(THREE, o = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: new THREE.Color(C.bg) },
      uHaze: { value: new THREE.Color(o.haze || '#0a2414') },
      uNeon: { value: new THREE.Color(C.neon) },
      uTeal: { value: new THREE.Color(C.teal) },
      uDir: { value: new THREE.Vector3(...(o.dir || [0, 0.5, -1])).normalize() },
      uK: { value: 1 },
      uHazeK: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg, uHaze, uNeon, uTeal, uDir; uniform float uK, uHazeK, uTime; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float hz = exp(-pow(d.y * 4.5, 2.0));
        float g = pow(max(dot(d, uDir), 0.0), 6.0);
        float g2 = pow(max(dot(d, -uDir * vec3(1.0, -1.0, 1.0)), 0.0), 10.0);
        vec3 col = uBg + uHaze * hz * 0.55 * uHazeK + uNeon * g * 0.02 * uK + uTeal * g2 * 0.012 * uK;
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

export function glowSprite(THREE, tex, color, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: tex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }),
  );
  m.renderOrder = 3;
  return m;
}

/** Puits de lumière vertical (plan additif, dégradé du haut vers le bas). */
export function shaftTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const h = g.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.5, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h;
  g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Voile sombre (calque ui) derrière un bloc de texte : dégradé linéaire. */
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

/** Voile sombre radial (calque ui). */
export function scrimRadial(g, x, y, rx, ry, a) {
  if (a <= 0.003) return;
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  grd.addColorStop(0, `rgba(2,4,3,${a})`);
  grd.addColorStop(0.6, `rgba(2,4,3,${a * 0.6})`);
  grd.addColorStop(1, 'rgba(2,4,3,0)');
  g.fillStyle = grd;
  g.fillRect(-rx, -rx, rx * 2, rx * 2);
  g.restore();
}

/** Rayons (god rays) depuis un point projeté (calque fx additif). */
export function godRays(g, x, y, R, t, a, o = {}) {
  if (a <= 0.003) return;
  const r = rng(o.seed || 77);
  const n = o.count || 14;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const base = (o.spread ? (o.dir ?? 0) + (r() - 0.5) * o.spread : r() * TAU) + t * (o.spin ?? 0.15) * (r() < 0.5 ? -1 : 1);
    const w = 0.02 + r() * 0.07;
    const len = R * (0.55 + r() * 0.65);
    const fl = 0.55 + 0.45 * Math.sin(t * (1.5 + r() * 3) + i * 1.7);
    const grd = g.createRadialGradient(x, y, 0, x, y, len);
    const col = i % 3 === 0 ? C.teal : C.neon2;
    grd.addColorStop(0, rgba('#eaffea', a * 0.55 * fl));
    grd.addColorStop(0.18, rgba(col, a * 0.3 * fl));
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

/** Traînées horizontales de whip pan (calque fx). */
export function whipStreaks(g, W, H, t, k, u, seed = 5) {
  if (k <= 0.003) return;
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
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

/** Coins de visée HUD autour d'un rectangle écran. */
export function brackets(g, x0, y0, x1, y1, len, lw, color, a) {
  if (a <= 0.003) return;
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = 'square';
  g.shadowColor = rgba(C.neon, 0.8);
  g.shadowBlur = lw * 4;
  const c = [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]];
  g.beginPath();
  for (const [x, y, sx, sy] of c) {
    g.moveTo(x + sx * len, y); g.lineTo(x, y); g.lineTo(x, y + sy * len);
  }
  g.stroke();
  g.restore();
}

/** Pastille ronde avec coche (calque ui). k = apparition 0→1 (rebond), on = validée. */
export function checkDot(g, x, y, R, k, on, a = 1) {
  if (k <= 0.003 || a <= 0.003) return;
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.scale(k, k);
  if (on > 0) {
    g.shadowColor = rgba(C.neon, 0.9);
    g.shadowBlur = R * 1.2 * on;
  }
  g.fillStyle = on > 0.5 ? C.neon : 'rgba(244,248,244,0.14)';
  g.strokeStyle = on > 0.5 ? C.neon : 'rgba(244,248,244,0.6)';
  g.lineWidth = Math.max(1.5, R * 0.12);
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke();
  g.shadowBlur = 0;
  if (on > 0) {
    const p = clamp(on);
    g.strokeStyle = C.ink;
    g.lineWidth = R * 0.26;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    const pts = [[-0.45, 0.02], [-0.12, 0.34], [0.48, -0.32]];
    const L1 = Math.hypot(0.33, 0.32), L2 = Math.hypot(0.6, 0.66), tot = L1 + L2;
    const d = p * tot;
    g.moveTo(pts[0][0] * R, pts[0][1] * R);
    if (d <= L1) g.lineTo(lerp(pts[0][0], pts[1][0], d / L1) * R, lerp(pts[0][1], pts[1][1], d / L1) * R);
    else {
      g.lineTo(pts[1][0] * R, pts[1][1] * R);
      const q = (d - L1) / L2;
      g.lineTo(lerp(pts[1][0], pts[2][0], q) * R, lerp(pts[1][1], pts[2][1], q) * R);
    }
    g.stroke();
  }
  g.restore();
}

/** Mesure d'une ligne de texte (pour composer des blocs). */
export const tw = (g, s, size, weight, tr = 0) => textWidth(g, s, size, weight, tr);
export { E, clamp, lerp, seg, rgba, TAU };
