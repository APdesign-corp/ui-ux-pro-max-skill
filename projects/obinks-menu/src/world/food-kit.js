// O'BINKS — kit de la 3D culinaire procédurale (utilisé par food.js / food-parts.js).
//  · bruits déterministes (valeur 2D/3D périodique, Worley) ;
//  · textures Canvas procédurales créées UNE seule fois (croûte, mie, steak, panure, salade,
//    tomate, riz, quadrillage du grill, alu, logo…) + cartes de normales dérivées des hauteurs ;
//  · matériaux PBR partagés (MeshPhysicalMaterial : clearcoat pour sauces/fromage, sheen pour le pain) ;
//  · constructeurs de géométrie : maillage polaire (galettes, pains, tranches, barquettes),
//    gouttes de coulure, tubes de sauce, balayage d'un profil (chantilly), morceaux bosselés.
// Rien ici ne dépend du temps : tout est créé au démarrage (create() des scènes).

import * as THREE from 'three';
import { rng } from '../core/anim.js';

export const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
export { clamp, lerp, smooth };

// ------------------------------------------------------------------ bruits
function hashI(x, y, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Bruit de valeur 2D périodique (période P entière), [0,1]. */
function pnoise(x, y, P, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const ux = smooth(fx), uy = smooth(fy);
  const m = (v) => ((v % P) + P) % P;
  const x0 = m(xi), x1 = m(xi + 1), y0 = m(yi), y1 = m(yi + 1);
  const a = hashI(x0, y0, 0, s), b = hashI(x1, y0, 0, s), c = hashI(x0, y1, 0, s), d = hashI(x1, y1, 0, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/** fbm périodique sur [0,1)² ; P = fréquence de base. */
export function pfbm(u, v, P, oct = 4, s = 1, gain = 0.5) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * pnoise(u * P * f, v * P * f, P * f, s + o * 17);
    norm += amp; amp *= gain; f *= 2;
  }
  return sum / norm;
}
/** Worley périodique : renvoie une fonction (u,v) → F1 (F2 dans w.f2). */
export function worley(N, seed) {
  const r = rng(seed);
  const px = new Float32Array(N * N), py = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { px[i] = r(); py[i] = r(); }
  const w = (u, v) => {
    const x = u * N, y = v * N, ci = Math.floor(x), cj = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const i = ci + di, j = cj + dj;
      const k = (((i % N) + N) % N) * N + (((j % N) + N) % N);
      const dx = i + px[k] - x, dy = j + py[k] - y;
      const d = dx * dx + dy * dy;
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    w.f2 = Math.sqrt(f2);
    return Math.sqrt(f1);
  };
  return w;
}
/** Bruit de valeur 2D non périodique (géométrie), [-1,1]. */
export function vn2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), ux = smooth(x - xi), uy = smooth(y - yi);
  const a = hashI(xi, yi, 7, s), b = hashI(xi + 1, yi, 7, s), c = hashI(xi, yi + 1, 7, s), d = hashI(xi + 1, yi + 1, 7, s);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
}
/** Bruit de valeur 3D non périodique, [-1,1]. */
export function vn3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const ux = smooth(x - xi), uy = smooth(y - yi), uz = smooth(z - zi);
  const h = (i, j, k) => hashI(xi + i, yi + j, zi + k, s);
  const x00 = lerp(h(0, 0, 0), h(1, 0, 0), ux), x10 = lerp(h(0, 1, 0), h(1, 1, 0), ux);
  const x01 = lerp(h(0, 0, 1), h(1, 0, 1), ux), x11 = lerp(h(0, 1, 1), h(1, 1, 1), ux);
  return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz) * 2 - 1;
}
export function fbm3(x, y, z, s = 0, oct = 3) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * vn3(x * f, y * f, z * f, s + o * 31); norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}

// ------------------------------------------------------------------ textures Canvas
function mkCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function toTex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
/** Texture pixel à pixel : f(u, v) → [r,g,b] (0..255). */
function pixTex(S, f, opts) {
  const c = mkCanvas(S), g = c.getContext('2d');
  const img = g.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const o = (y * S + x) * 4, rgb = f(x / S, y / S);
    d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTex(c, opts);
}
/** Carte de hauteurs (Float32Array S×S) → texture de normales (tangent space, périodique). */
function heightField(S, f) {
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = f(x / S, y / S);
  return h;
}
function normalTex(h, S, strength) {
  const c = mkCanvas(S), g = c.getContext('2d');
  const img = g.createImageData(S, S), d = img.data;
  const at = (x, y) => h[(((y % S) + S) % S) * S + (((x % S) + S) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * strength * S / 256;
    const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * strength * S / 256;
    let nx = -dx, ny = dy, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const o = (y * S + x) * 4;
    d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTex(c, { srgb: false });
}
const c255 = (v) => Math.max(0, Math.min(255, v * 255));
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hex3 = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

function buildTextures() {
  const T = {};
  // --- croûte du pain (détail multiplicatif : marbrures, piqûres, micro-craquelures)
  {
    const S = 512;
    const w = worley(22, 5);
    T.crust = pixTex(S, (u, v) => {
      const m = pfbm(u, v, 5, 5, 11);
      const f = pfbm(u, v, 40, 2, 12);
      const cell = w(u, v);
      let k = 0.8 + 0.28 * m - 0.07 * f;
      if (cell < 0.08) k *= 0.88; // pores
      return [c255(k), c255(k * 0.965), c255(k * 0.92)];
    });
    const h = heightField(S, (u, v) => pfbm(u, v, 12, 4, 13) * 0.7 + pfbm(u, v, 48, 2, 14) * 0.3 - (w(u, v) < 0.08 ? 0.12 : 0));
    T.crustN = normalTex(h, S, 3.2);
  }
  // --- brioche dorée « craquelée » (comme les photos du menu) : cellules bombées brillantes,
  //     fines craquelures plus claires, pores, marbrure de dorure
  {
    const S = 768;
    const w = worley(6, 15), wp = worley(40, 16);
    const warp = (u, v) => [u + (pfbm(u, v, 3, 3, 17) - 0.5) * 0.09, v + (pfbm(u, v, 3, 3, 18) - 0.5) * 0.09];
    const edge = (u, v) => { const [a, b] = warp(u, v); const f1 = w(a, b); return w.f2 - f1; };
    const crackW = (u, v) => 0.008 + 0.022 * pfbm(u, v, 6, 2, 19) ** 2;
    T.bun = pixTex(S, (u, v) => {
      const e = edge(u, v), cw = crackW(u, v);
      const line = smooth(clamp(1 - e / cw));
      const m = pfbm(u, v, 6, 5, 20), f = pfbm(u, v, 48, 2, 21);
      let k = 0.83 + 0.2 * m - 0.06 * f;
      k *= 0.9 + 0.1 * smooth(clamp(e / 0.16)); // bords de cellules un peu plus foncés
      if (wp(u, v) < 0.07) k *= 0.86;            // pores
      let c = [k, k * 0.95, k * 0.88];
      c = mixc(c, [1.0, 0.95, 0.82], line * 0.32);
      return c.map(c255);
    });
    const h = heightField(S, (u, v) => {
      const e = edge(u, v);
      return smooth(clamp(e / 0.12)) * 0.22 - smooth(clamp(1 - e / crackW(u, v))) * 0.1 + pfbm(u, v, 24, 3, 22) * 0.2 + pfbm(u, v, 6, 3, 23) * 0.25 - (wp(u, v) < 0.07 ? 0.08 : 0);
    });
    T.bunN = normalTex(h, S, 4.5);
  }
  // --- mie (face coupée grillée) : alvéoles
  {
    const S = 512;
    const w = worley(34, 21), w2 = worley(80, 22);
    const hole = (u, v) => smooth(clamp(1 - w(u, v) / 0.22)) * 0.8 + smooth(clamp(1 - w2(u, v) / 0.2)) * 0.35;
    T.crumb = pixTex(S, (u, v) => {
      const hl = hole(u, v), n = pfbm(u, v, 16, 3, 23);
      const k = 0.98 - hl * 0.38 + (n - 0.5) * 0.12;
      return [c255(k), c255(k * 0.94), c255(k * 0.84)];
    });
    T.crumbN = normalTex(heightField(S, (u, v) => -hole(u, v) + pfbm(u, v, 30, 2, 24) * 0.3), S, 5);
  }
  // --- steak saisi : croûte sombre, éclats caramélisés, grain haché
  {
    const S = 512;
    const w = worley(30, 31), w2 = worley(70, 32);
    const dark = hex3('#1c0b05'), mid = hex3('#4a2210'), hi = hex3('#9a5426'), fat = hex3('#c27a45');
    const grain = (u, v) => {
      const a = w(u, v), b = w.f2;
      const ridge = clamp((b - a) * 3.0);
      return ridge;
    };
    T.beef = pixTex(S, (u, v) => {
      const n = pfbm(u, v, 6, 5, 33), r = grain(u, v), c2 = w2(u, v);
      let col = mixc(dark, mid, smooth(clamp(n * 1.6 - 0.25)));
      col = mixc(col, hi, smooth(clamp((r - 0.55) * 2.2)) * 0.75);
      if (c2 < 0.12) col = mixc(col, fat, 0.35 * (1 - c2 / 0.12));
      const ch = pfbm(u, v, 24, 2, 34);
      if (ch > 0.68) col = mixc(col, [0.03, 0.015, 0.01], 0.7);
      return col.map(c255);
    });
    T.beefN = normalTex(heightField(S, (u, v) => grain(u, v) * 0.8 + pfbm(u, v, 20, 3, 35) * 0.6 - smooth(clamp(1 - w2(u, v) / 0.15)) * 0.3), S, 7);
  }
  // --- panure (tenders, nuggets, poulet croustillant) : grumeaux en relief
  {
    const S = 512;
    const w = worley(26, 41), w2 = worley(64, 42);
    const lump = (u, v) => smooth(clamp(1 - w(u, v) / 0.7)) * 0.65 + smooth(clamp(1 - w2(u, v) / 0.6)) * 0.45 + pfbm(u, v, 30, 2, 43) * 0.25;
    const deep = hex3('#7a3a0c'), gold = hex3('#d9862a'), pale = hex3('#f4c069');
    T.bread = pixTex(S, (u, v) => {
      const l = lump(u, v), n = pfbm(u, v, 5, 4, 44);
      let col = mixc(deep, gold, smooth(clamp(l * 1.5 - 0.1)));
      col = mixc(col, pale, smooth(clamp((l - 0.75) * 3)) * 0.8);
      col = mixc(col, deep, smooth(clamp((n - 0.6) * 3)) * 0.35);
      return col.map((c) => c255(c * 1.0));
    });
    T.breadN = normalTex(heightField(S, lump), S, 9);
  }
  // --- détail générique (marbrure douce) + épices (paprika/poivre)
  {
    const S = 256;
    T.soft = pixTex(S, (u, v) => { const k = 0.86 + 0.14 * pfbm(u, v, 6, 4, 51); return [c255(k), c255(k), c255(k)]; });
    T.softN = normalTex(heightField(S, (u, v) => pfbm(u, v, 8, 4, 52)), S, 2.2);
    const w = worley(26, 53);
    T.spice = pixTex(S, (u, v) => {
      const k = 0.88 + 0.12 * pfbm(u, v, 6, 3, 54);
      const c = w(u, v);
      if (c < 0.13) return [c255(0.42 * k), c255(0.1 * k), c255(0.04 * k)];
      if (c > 0.62 && pfbm(u, v, 30, 1, 55) > 0.62) return [c255(0.22), c255(0.08), c255(0.03)];
      return [c255(k), c255(k), c255(k)];
    });
    const wp = worley(22, 56);
    T.pepper = pixTex(S, (u, v) => {
      const k = 0.94 + 0.06 * pfbm(u, v, 5, 3, 57);
      const c = wp(u, v);
      if (c < 0.1) return [c255(0.05), c255(0.04), c255(0.035)];
      if (c < 0.16) return [c255(0.35 * k), c255(0.3 * k), c255(0.24 * k)];
      return [c255(k), c255(k), c255(k)];
    });
  }
  // --- salade : nervures (crêtes) + cloques
  {
    const S = 512;
    const ridge = (u, v) => 1 - Math.abs(pfbm(u, v, 4, 4, 61) * 2 - 1);
    T.leaf = pixTex(S, (u, v) => {
      const r = Math.pow(ridge(u, v), 6), n = pfbm(u, v, 12, 3, 62);
      const k = 0.78 + n * 0.16;
      return [c255(k + r * 0.25), c255(k + r * 0.28), c255(k * 0.9 + r * 0.12)];
    });
    T.leafN = normalTex(heightField(S, (u, v) => Math.pow(ridge(u, v), 4) * 0.6 + pfbm(u, v, 14, 3, 63) * 0.7), S, 6);
  }
  // --- tomate (coupe : peau, chair, cloisons, loges avec pépins)
  {
    const S = 512, c = mkCanvas(S), g = c.getContext('2d');
    const r = rng(71);
    g.fillStyle = '#b3120c'; g.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2, R = S * 0.49;
    let grd = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    grd.addColorStop(0, '#f0563a'); grd.addColorStop(0.75, '#e0281c'); grd.addColorStop(0.93, '#c4150e'); grd.addColorStop(1, '#8e0a08');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    const nL = 5;
    for (let i = 0; i < nL; i++) {
      const a0 = (i / nL) * TAU + 0.25, a1 = a0 + TAU / nL - 0.32;
      g.beginPath();
      const ri = R * 0.26, ro = R * 0.76;
      g.moveTo(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri);
      g.quadraticCurveTo(cx + Math.cos(a0) * ro * 1.05, cy + Math.sin(a0) * ro * 1.05, cx + Math.cos((a0 + a1) / 2) * ro, cy + Math.sin((a0 + a1) / 2) * ro);
      g.quadraticCurveTo(cx + Math.cos(a1) * ro * 1.05, cy + Math.sin(a1) * ro * 1.05, cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri);
      g.closePath();
      const lg = g.createRadialGradient(cx, cy, ri, cx, cy, ro);
      lg.addColorStop(0, '#f7a040'); lg.addColorStop(0.6, '#ef6a2a'); lg.addColorStop(1, '#d93a1c');
      g.fillStyle = lg; g.fill();
      for (let k = 0; k < 7; k++) {
        const a = lerp(a0 + 0.12, a1 - 0.12, r()), rr = lerp(ri * 1.25, ro * 0.85, r());
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        g.save(); g.translate(x, y); g.rotate(a + r());
        g.fillStyle = 'rgba(250,236,170,0.95)'; g.beginPath(); g.ellipse(0, 0, S * 0.014, S * 0.009, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-S * 0.003, -S * 0.002, S * 0.005, S * 0.003, 0, 0, TAU); g.fill();
        g.restore();
      }
    }
    grd = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
    grd.addColorStop(0, '#ff8a6a'); grd.addColorStop(1, 'rgba(240,80,60,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, TAU); g.fill();
    T.tomato = toTex(c, { repeat: false });
  }
  // --- riz (grains)
  {
    const S = 512, c = mkCanvas(S), g = c.getContext('2d');
    const r = rng(81);
    g.fillStyle = '#d9cfbd'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1500; i++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = S * (0.022 + r() * 0.01), wd = S * (0.008 + r() * 0.003);
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const X = x + ox, Y = y + oy;
        if (X < -l || X > S + l || Y < -l || Y > S + l) continue;
        g.save(); g.translate(X, Y); g.rotate(a);
        const gg = g.createLinearGradient(0, -wd, 0, wd);
        gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.6, '#f3eee4'); gg.addColorStop(1, '#bfb4a2');
        g.fillStyle = gg; g.beginPath(); g.ellipse(0, 0, l, wd, 0, 0, TAU); g.fill();
        g.restore();
      }
    }
    T.rice = toTex(c);
    const d = g.getImageData(0, 0, S, S).data;
    const h = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) h[i] = d[i * 4] / 255;
    T.riceN = normalTex(h, S, 6);
  }
  // --- quadrillage de grill (tacos) et rayures (saucisse)
  {
    const S = 512;
    const line = (x, period, width) => { const f = ((x % period) + period) % period / period; const d = Math.min(f, 1 - f) * period; return smooth(clamp(1 - d / width)); };
    T.grillX = pixTex(S, (u, v) => {
      const n = pfbm(u, v, 6, 4, 91), n2 = pfbm(u, v, 24, 2, 92);
      const a = line(u + v + n * 0.02, 1 / 4, 0.024 + n2 * 0.016), b = line(u - v + n * 0.02, 1 / 4, 0.024 + n2 * 0.016);
      const m = Math.max(a, b) * (0.75 + 0.25 * n2);
      const k = 0.92 + 0.08 * n;
      let col = [k, k * 0.97, k * 0.92];
      col = mixc(col, [0.36, 0.17, 0.06], m * 0.9);
      if (pfbm(u, v, 16, 2, 93) > 0.66) col = mixc(col, [0.75, 0.5, 0.25], 0.4);
      return col.map(c255);
    });
    T.grillXN = normalTex(heightField(S, (u, v) => {
      const n = pfbm(u, v, 6, 4, 91);
      return -Math.max(line(u + v + n * 0.02, 1 / 4, 0.03), line(u - v + n * 0.02, 1 / 4, 0.03)) * 0.6 + pfbm(u, v, 20, 3, 94) * 0.4;
    }), S, 4);
    T.stripes = pixTex(256, (u, v) => {
      const n = pfbm(u, v, 4, 3, 95);
      const m = line(u * 1 + v * 0.35 + n * 0.08, 1 / 2, 0.03 + 0.04 * pfbm(u, v, 8, 2, 97)) * smooth(clamp(pfbm(u, v, 3, 2, 98) * 1.8 - 0.25));
      const k = 0.88 + 0.12 * pfbm(u, v, 10, 3, 96);
      return mixc([k, k * 0.98, k * 0.95], [0.34, 0.14, 0.05], m * 0.8).map(c255);
    });
  }
  // --- alu froissé (barquette)
  {
    const S = 512;
    T.foilN = normalTex(heightField(S, (u, v) => {
      const a = 1 - Math.abs(pfbm(u, v, 5, 4, 101) * 2 - 1);
      return Math.pow(a, 3) * 0.7 + pfbm(u, v, 24, 2, 102) * 0.2 + Math.sin(u * TAU * 48) * 0.06;
    }), S, 5);
    T.foil = pixTex(256, (u, v) => { const k = 0.82 + 0.18 * pfbm(u, v, 8, 3, 103); return [c255(k), c255(k), c255(k * 1.02)]; });
  }
  // --- biscuit / miettes / cacao
  {
    const S = 256;
    const w = worley(20, 111);
    T.cake = pixTex(S, (u, v) => {
      const n = pfbm(u, v, 8, 4, 112), c = w(u, v);
      const k = 0.75 + 0.3 * n - (c < 0.12 ? 0.2 : 0);
      return [c255(k), c255(k * 0.95), c255(k * 0.9)];
    });
    T.cakeN = normalTex(heightField(S, (u, v) => pfbm(u, v, 10, 4, 113) - (w(u, v) < 0.12 ? 0.3 : 0)), S, 6);
  }
  // --- frite (texture pomme de terre)
  T.fry = pixTex(128, (u, v) => { const k = 0.88 + 0.12 * pfbm(u, v, 6, 3, 121); const s = pfbm(u, v, 20, 2, 122) > 0.7 ? 0.85 : 1; return [c255(k * s), c255(k * s * 0.97), c255(k * s * 0.9)]; });
  return T;
}

/** Texture du logo O'BINKS (lettrage brush : « O' » rouge + « BINKS » blanc, contour). */
export function logoTexture(img) {
  const c = mkCanvas(1024, 512), g = c.getContext('2d');
  g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 1024, 512);
  if (img && img.width) {
    const s = Math.min(900 / img.width, 400 / img.height);
    g.drawImage(img, 512 - (img.width * s) / 2, 256 - (img.height * s) / 2, img.width * s, img.height * s);
  } else {
    g.save();
    g.translate(512, 270); g.rotate(-0.08); g.transform(1, 0, -0.12, 1, 0, 0);
    g.font = '200px "Permanent Marker"'; g.textBaseline = 'middle';
    const o = "O'", b = 'BINKS';
    const wo = g.measureText(o).width, wb = g.measureText(b).width, x0 = -(wo + wb) / 2;
    g.lineJoin = 'round';
    g.lineWidth = 26; g.strokeStyle = '#ffffff';
    g.strokeText(o, x0, 0);
    g.lineWidth = 22; g.strokeStyle = '#120203';
    g.strokeText(b, x0 + wo, 0);
    g.fillStyle = '#e3141b'; g.fillText(o, x0, 0);
    g.fillStyle = '#ffffff'; g.fillText(b, x0 + wo, 0);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ matériaux partagés
let KIT = null;
/** Kit unique (textures + matériaux) partagé par tous les produits. */
export function kit() {
  if (KIT) return KIT;
  const T = buildTextures();
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  const n = (s) => new THREE.Vector2(s, s);
  const M = {};
  // Pains : croûte brillante dorée (dorure à l'œuf) + velours (sheen) ; mie grillée
  M.crust = P({ vertexColors: true, map: T.bun, normalMap: T.bunN, normalScale: n(0.36), roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.16, sheen: 0.18, sheenColor: new THREE.Color('#ff9a40'), sheenRoughness: 0.45 });
  M.crustPlain = P({ vertexColors: true, map: T.crust, normalMap: T.crustN, normalScale: n(0.6), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.22, sheen: 0.2, sheenColor: new THREE.Color('#ff9a40'), sheenRoughness: 0.5 });
  M.bunSoft = P({ vertexColors: true, map: T.crust, normalMap: T.crustN, normalScale: n(0.4), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color('#e8b070'), sheenRoughness: 0.55 });
  M.crumb = P({ vertexColors: true, map: T.crumb, normalMap: T.crumbN, normalScale: n(0.9), roughness: 0.85, sheen: 0.25, sheenColor: new THREE.Color('#e8c890'), sheenRoughness: 0.7 });
  M.sesame = P({ color: '#e9d3a0', roughness: 0.4, clearcoat: 0.35 });
  // Viandes
  M.beef = P({ vertexColors: true, map: T.beef, normalMap: T.beefN, normalScale: n(1.1), roughness: 0.48, clearcoat: 0.45, clearcoatRoughness: 0.35 });
  M.bread = P({ vertexColors: true, map: T.bread, normalMap: T.breadN, normalScale: n(1.25), roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#ffb34d'), sheenRoughness: 0.6 });
  M.breadGlazed = P({ vertexColors: true, map: T.bread, normalMap: T.breadN, normalScale: n(1.0), color: '#ffc890', roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  M.chicken = P({ vertexColors: true, map: T.spice, normalMap: T.breadN, normalScale: n(0.7), roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.22 });
  M.sausage = P({ color: '#a4462a', map: T.stripes, normalMap: T.softN, normalScale: n(0.4), roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color('#ff9a6a') });
  // Fromages (SSS simulé par émissif chaud + sheen)
  M.cheddar = P({ vertexColors: true, color: '#f7b100', map: T.soft, normalMap: T.softN, normalScale: n(0.25), roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: new THREE.Color('#ffc000'), emissive: new THREE.Color('#ff9000'), emissiveIntensity: 0.06 });
  M.raclette = P({ vertexColors: true, color: '#eec35a', map: T.soft, normalMap: T.softN, normalScale: n(0.3), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.25, sheenColor: new THREE.Color('#ffe08a'), emissive: new THREE.Color('#e09a10'), emissiveIntensity: 0.05 });
  M.chevre = P({ vertexColors: true, color: '#d8d2c6', map: T.soft, normalMap: T.softN, normalScale: n(0.7), roughness: 0.78, sheen: 0.2, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.7 });
  // Légumes
  M.lettuce = P({ vertexColors: true, map: T.leaf, normalMap: T.leafN, normalScale: n(0.9), roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.2, sheenColor: new THREE.Color('#b8e070'), sheenRoughness: 0.5, side: THREE.DoubleSide });
  M.onion = P({ vertexColors: true, color: '#e8e0e4', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  M.pickle = P({ vertexColors: true, map: T.soft, normalMap: T.softN, normalScale: n(0.5), roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  M.tomatoCut = P({ map: T.tomato, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, emissive: new THREE.Color('#ff2000'), emissiveIntensity: 0.05 });
  M.tomatoSkin = P({ color: '#c8160e', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  M.fries = P({ vertexColors: true, map: T.fry, normalMap: T.softN, normalScale: n(0.5), roughness: 0.52, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.25, sheenColor: new THREE.Color('#ffe08a') });
  M.crispyOnion = P({ vertexColors: true, map: T.bread, normalMap: T.breadN, normalScale: n(1), roughness: 0.5, clearcoat: 0.3 });
  M.parsley = P({ vertexColors: true, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide });
  M.walnut = P({ color: '#8a5530', map: T.soft, normalMap: T.cakeN, normalScale: n(1.5), roughness: 0.6, clearcoat: 0.2 });
  M.rice = P({ map: T.rice, normalMap: T.riceN, normalScale: n(1.4), color: '#b9b09e', roughness: 0.62, sheen: 0.12, sheenColor: new THREE.Color('#fff4e0'), clearcoat: 0.12 });
  M.riceGrain = P({ color: '#cfc7b6', roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  M.tortilla = P({ vertexColors: true, map: T.grillX, normalMap: T.grillXN, normalScale: n(0.9), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: new THREE.Color('#ffc070'), sheenRoughness: 0.5 });
  M.tortillaIn = P({ vertexColors: true, color: '#c8b49a', map: T.soft, normalMap: T.softN, normalScale: n(0.5), roughness: 0.75, sheen: 0.2, sheenColor: new THREE.Color('#e8c890') });
  // Contenants
  M.foil = P({ color: '#e4e7ea', map: T.foil, metalness: 1, roughness: 0.32, normalMap: T.foilN, normalScale: n(0.55) });
  M.boxBlack = P({ color: '#0e0e10', roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12, metalness: 0 });
  // verre : uniquement les reflets (mélange additif sur albédo noir) + un voile très léger
  M.glass = P({ color: '#000000', roughness: 0.05, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9, specularIntensity: 0.8, ior: 1.5 });
  M.glassTint = new THREE.MeshBasicMaterial({ color: '#c8d0d8', transparent: true, opacity: 0.045, depthWrite: false });
  M.cupPlastic = P({ color: '#000000', roughness: 0.14, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 0.75, specularIntensity: 0.5 });
  // Desserts
  M.cream = P({ vertexColors: true, color: '#d9d2c6', map: T.soft, normalMap: T.softN, normalScale: n(0.4), roughness: 0.5, sheen: 0.35, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.45, clearcoat: 0.2, clearcoatRoughness: 0.35 });
  M.cake = P({ vertexColors: true, map: T.cake, normalMap: T.cakeN, normalScale: n(1.1), roughness: 0.75, sheen: 0.3, sheenColor: new THREE.Color('#d9a066') });
  M.crumbs = P({ vertexColors: true, map: T.cake, normalMap: T.cakeN, normalScale: n(1), roughness: 0.7 });
  M.chocolate = P({ color: '#3a1d0e', roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: new THREE.Color('#a0603a') });
  M.oreo = P({ color: '#151012', map: T.cake, normalMap: T.cakeN, normalScale: n(0.8), roughness: 0.6 });
  M.oreoCream = P({ color: '#ddd8cf', roughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color('#ffffff') });
  M.speculoos = P({ color: '#b5651d', map: T.cake, normalMap: T.cakeN, normalScale: n(0.9), roughness: 0.7, sheen: 0.3, sheenColor: new THREE.Color('#ffb070') });
  M.wafer = P({ color: '#d79a55', map: T.grillX, normalMap: T.grillXN, normalScale: n(0.8), roughness: 0.6 });
  M.coconut = P({ color: '#dcd8cf', map: T.cake, normalMap: T.breadN, normalScale: n(1.4), roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') });
  M.strawberry = P({ vertexColors: true, map: T.soft, normalMap: T.softN, normalScale: n(0.5), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  M.banana = P({ vertexColors: true, map: T.soft, normalMap: T.softN, normalScale: n(0.4), roughness: 0.45, clearcoat: 0.4, sheen: 0.3, sheenColor: new THREE.Color('#fff6c0') });
  M.pistachio = P({ vertexColors: true, map: T.soft, normalMap: T.cakeN, normalScale: n(0.7), roughness: 0.5, clearcoat: 0.3 });
  M.peanut = P({ color: '#c08a4a', map: T.soft, normalMap: T.softN, normalScale: n(0.6), roughness: 0.5, clearcoat: 0.3 });
  M.logo = P({ map: logoTexture(null), roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: new THREE.Color('#ffffff'), emissiveMap: null, emissiveIntensity: 0 });
  KIT = { T, M, sauces: new Map(), shakes: new Map() };
  return KIT;
}

/**
 * Matériau de sauce brillante (cache par clé). o = { color, rough, opacity, emissive, speck }.
 */
export function sauceMat(key, o) {
  const K = kit();
  if (K.sauces.has(key)) return K.sauces.get(key);
  const m = new THREE.MeshPhysicalMaterial({
    color: o.color,
    map: o.speck ? K.T.pepper : K.T.soft,
    normalMap: K.T.softN, normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: o.rough ?? 0.14,
    clearcoat: 1, clearcoatRoughness: 0.05,
    sheen: o.sheen ?? 0.2, sheenColor: new THREE.Color(o.sheenColor || '#ffffff'),
    transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1,
    emissive: new THREE.Color(o.emissive || '#000000'), emissiveIntensity: o.emissiveIntensity ?? (o.emissive ? 0.18 : 0),
  });
  K.sauces.set(key, m);
  return m;
}

/** Matériau crémeux (milkshake, crème) par couleur. */
export function creamyMat(key, color, o = {}) {
  const K = kit();
  if (K.shakes.has(key)) return K.shakes.get(key);
  const m = new THREE.MeshPhysicalMaterial({
    color, vertexColors: !!o.vertexColors, map: o.speck ? K.T.pepper : K.T.soft, normalMap: K.T.softN, normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: o.rough ?? 0.42, sheen: 0.3, sheenColor: new THREE.Color(o.sheenColor || '#ffffff'), sheenRoughness: 0.5,
    clearcoat: o.clearcoat ?? 0.3, clearcoatRoughness: 0.3,
  });
  K.shakes.set(key, m);
  return m;
}

// ------------------------------------------------------------------ géométrie
export const col = (hex) => new THREE.Color(hex);

/** Contour « stade » (pain long) : demi-longueur droite L, rayon r. L = 0 → cercle. */
export function stadiumR(L, r) {
  return (a) => {
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    if (L <= 0) return r;
    if (s > 1e-6 && (r * c) / s <= L) return r / s;
    return L * c + Math.sqrt(Math.max(0, r * r - L * L * s * s));
  };
}
/** Distance au bord (> 0 à l'intérieur) d'un stade (L, r). */
export function stadiumD(x, z, L, r) {
  const px = Math.max(-L, Math.min(L, x));
  return r - Math.hypot(x - px, z);
}
/** Contour super-ellipse (rectangle arrondi) demi-axes a (X), b (Z), exposant n. */
export function superR(a, b, n = 4) {
  return (ang) => Math.pow(Math.pow(Math.abs(Math.cos(ang)) / a, n) + Math.pow(Math.abs(Math.sin(ang)) / b, n), -1 / n);
}
/** Ajoute du bruit angulaire à un contour. */
export function noisyR(R, amp, freq, seed) {
  return (a) => R(a) * (1 + amp * (vn2(Math.cos(a) * freq, Math.sin(a) * freq, seed) * 0.7 + vn2(Math.cos(a) * freq * 3.1, Math.sin(a) * freq * 3.1, seed + 9) * 0.3));
}

/**
 * Maillage polaire générique : une suite de RANGÉES (profil dans le plan rayon/hauteur), chaque
 * rangée = un anneau de segs points à l'angle a, rayon R(a)·k + d, hauteur y(x,z,k,a).
 * Le profil est orienté « vers l'extérieur » (dessus du centre vers le bord, flanc vers le bas,
 * dessous vers le centre) → normales sortantes.
 * rows : [{ k, d?, y: number | fn, uv: 'p' (planaire) | 's' (cylindrique), part }]
 * color(x, y, z, part, k, a) → THREE.Color (optionnel, couleurs de sommets).
 * Groupes = parts (0, 1, 2…) pour plusieurs matériaux.
 */
export function polarMesh({ R, segs = 64, rows, color = null, tile = 0.5 }) {
  const nR = rows.length, nC = segs + 1;
  const pos = new Float32Array(nR * nC * 3), uvs = new Float32Array(nR * nC * 2);
  const cols = color ? new Float32Array(nR * nC * 3) : null;
  const ang = new Float32Array(nC), rad = new Float32Array(nC);
  for (let i = 0; i < nC; i++) { ang[i] = (i / segs) * TAU; rad[i] = R(ang[i] % TAU); }
  rad[segs] = rad[0];
  let Rm = 0; for (let i = 0; i < segs; i++) Rm += rad[i]; Rm /= segs;
  let vacc = 0, py = null, pk = null;
  // 'a' : projection azimutale équidistante (longueur d'arc depuis le centre, par colonne) —
  // aucune traînée de texture sur les flancs bombés (dômes de pain, bords de steak).
  const arc = new Float32Array(nC);
  let prevA = false;
  for (let j = 0; j < nR; j++) {
    const row = rows[j];
    for (let i = 0; i < nC; i++) {
      const a = ang[i], c = Math.cos(a), s = Math.sin(a);
      const r = rad[i] * row.k + (row.d || 0);
      const x = r * c, z = r * s;
      const y = typeof row.y === 'function' ? row.y(x, z, row.k, a) : row.y;
      const o = (j * nC + i) * 3;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      if (cols) { const cc = color(x, y, z, row.part ?? 0, row.k, a); cols[o] = cc.r; cols[o + 1] = cc.g; cols[o + 2] = cc.b; }
    }
    const y0 = pos[(j * nC) * 3 + 1];
    if (py !== null) vacc += Math.hypot((row.k - pk) * Rm + (row.d || 0) * 0, y0 - py);
    py = y0; pk = row.k;
    const isA = row.uv === 'a';
    for (let i = 0; i < nC; i++) {
      const o = (j * nC + i) * 3, q = (j * nC + i) * 2;
      if (isA) {
        if (!prevA) arc[i] = Math.hypot(pos[o], pos[o + 2]);
        else { const p0 = ((j - 1) * nC + i) * 3; arc[i] += Math.hypot(pos[o] - pos[p0], pos[o + 1] - pos[p0 + 1], pos[o + 2] - pos[p0 + 2]); }
        const d = Math.hypot(pos[o], pos[o + 2]) || 1;
        uvs[q] = (pos[o] / d) * arc[i] / tile + 0.5; uvs[q + 1] = (pos[o + 2] / d) * arc[i] / tile + 0.5;
      } else if (row.uv === 's') { uvs[q] = (i / segs) * (TAU * Rm) / tile; uvs[q + 1] = vacc / tile; }
      else { uvs[q] = pos[o] / tile + 0.5; uvs[q + 1] = pos[o + 2] / tile + 0.5; }
    }
    prevA = isA;
  }
  const byPart = new Map();
  for (let j = 0; j < nR - 1; j++) {
    const part = rows[j].band ?? rows[j].part ?? 0;
    if (!byPart.has(part)) byPart.set(part, []);
    const L = byPart.get(part);
    for (let i = 0; i < segs; i++) {
      const A = j * nC + i, B = (j + 1) * nC + i, Cc = j * nC + i + 1, D = (j + 1) * nC + i + 1;
      L.push(A, Cc, B, Cc, D, B);
    }
  }
  const idx = [];
  const geo = new THREE.BufferGeometry();
  const parts = [...byPart.keys()].sort((a, b) => a - b);
  for (const p of parts) { const L = byPart.get(p); geo.addGroup(idx.length, L.length, p); idx.push(...L); }
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (cols) geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  // soudure des normales : couture (colonne 0 ≡ colonne segs) et pôles (k = 0)
  const nrm = geo.attributes.normal.array;
  const v = new THREE.Vector3();
  for (let j = 0; j < nR; j++) {
    if (rows[j].k === 0 && !rows[j].d) {
      v.set(0, 0, 0);
      for (let i = 0; i < segs; i++) { const o = (j * nC + i) * 3; v.x += nrm[o]; v.y += nrm[o + 1]; v.z += nrm[o + 2]; }
      v.normalize();
      for (let i = 0; i < nC; i++) { const o = (j * nC + i) * 3; nrm[o] = v.x; nrm[o + 1] = v.y; nrm[o + 2] = v.z; }
    } else {
      const o0 = (j * nC) * 3, o1 = (j * nC + segs) * 3;
      v.set(nrm[o0] + nrm[o1], nrm[o0 + 1] + nrm[o1 + 1], nrm[o0 + 2] + nrm[o1 + 2]).normalize();
      nrm[o0] = nrm[o1] = v.x; nrm[o0 + 1] = nrm[o1 + 1] = v.y; nrm[o0 + 2] = nrm[o1 + 2] = v.z;
    }
  }
  return geo;
}

/**
 * Galette pleine (« slab ») : dessus top(x,z), dessous bot(x,z), flanc arrondi (bulge = bombé
 * absolu du flanc). parts : [dessus, flanc, dessous] → groupes matériaux.
 */
export function slab({ R, segs = 64, rings = 10, top, bot, sideRows = 4, bulge = 0, color = null, tile = 0.5, parts = [0, 1, 2], sideUV = 'p', topUV = 'p', botUV = 'p' }) {
  const rows = [];
  const T = typeof top === 'function' ? top : () => top;
  const B = typeof bot === 'function' ? bot : () => bot;
  for (let k = 0; k <= rings; k++) {
    const s = Math.sin((Math.PI / 2) * (k / rings));
    rows.push({ k: s, y: (x, z, kk, a) => T(x, z, kk, a), uv: topUV, part: parts[0], band: k === rings ? parts[1] : parts[0] });
  }
  for (let m = 1; m < sideRows; m++) {
    const t = m / sideRows;
    rows.push({
      k: 1, d: bulge * Math.sin(Math.PI * t), uv: sideUV, part: parts[1], band: parts[1],
      y: (x, z, kk, a) => {
        const r = R(a), xe = r * Math.cos(a), ze = r * Math.sin(a);
        const yt = T(xe, ze, 1, a), yb = B(xe, ze, 1, a);
        return yt + (yb - yt) * (1 - Math.cos(Math.PI * t)) / 2;
      },
    });
  }
  for (let k = rings; k >= 0; k--) {
    const s = Math.sin((Math.PI / 2) * (k / rings));
    rows.push({ k: s, y: (x, z, kk, a) => B(x, z, kk, a), uv: botUV, part: parts[2], band: parts[2] });
  }
  return polarMesh({ R, segs, rows, color, tile });
}

/** Fusionne des géométries indexées (position, normal, uv, color optionnelle) en une seule. */
export function merge(geos, withColor = false) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), cl = withColor ? new Float32Array(nv * 3) : null;
  const idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, ov * 3);
    nrm.set(g.attributes.normal.array, ov * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, ov * 2);
    if (cl) { if (g.attributes.color) cl.set(g.attributes.color.array, ov * 3); else cl.fill(1, ov * 3, (ov + n) * 3); }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[oi + i] = a[i] + ov; oi += a.length; }
    else { for (let i = 0; i < n; i++) idx[oi + i] = ov + i; oi += n; }
    ov += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (cl) out.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** Applique position / rotation (Euler) / échelle à une géométrie (en place) et la renvoie. */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function place(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e);
  _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
  geo.applyMatrix4(_m);
  return geo;
}

/** Peint une géométrie d'une couleur de sommets (fonction de la position) — pour merge(withColor). */
export function paint(geo, fn) {
  const p = geo.attributes.position, n = p.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const cc = fn(p.getX(i), p.getY(i), p.getZ(i), i); c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

/** Moyenne les normales des sommets confondus (coutures UV des sphères, capsules, tubes). */
export function weldNormals(geo, eps = 1e-4) {
  const p = geo.attributes.position, n = geo.attributes.normal, map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) / eps)},${Math.round(p.getY(i) / eps)},${Math.round(p.getZ(i) / eps)}`;
    let e = map.get(key);
    if (!e) { e = { x: 0, y: 0, z: 0, ids: [] }; map.set(key, e); }
    e.x += n.getX(i); e.y += n.getY(i); e.z += n.getZ(i); e.ids.push(i);
  }
  for (const e of map.values()) {
    if (e.ids.length < 2) continue;
    const l = Math.hypot(e.x, e.y, e.z) || 1;
    for (const i of e.ids) n.setXYZ(i, e.x / l, e.y / l, e.z / l);
  }
  n.needsUpdate = true;
  return geo;
}

/**
 * Morceau bosselé (nugget, morceau de poulet, noix…) : sphère déformée par un bruit 3D.
 * o = { seg, amp, freq, scale:[x,y,z], seed, flat (aplatit le dessous) }
 */
export function lump({ seg = 14, amp = 0.25, freq = 2.2, scale = [1, 1, 1], seed = 1, flat = 0, sharp = 0, rings = 0 } = {}) {
  const g = new THREE.SphereGeometry(1, seg, rings || Math.max(6, Math.round(seg * 0.7)));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let d = fbm3(x * freq, y * freq, z * freq, seed, 3);
    if (sharp) d = d * (1 - sharp) + sharp * (1 - Math.abs(d) * 2);
    const k = 1 + amp * d;
    x *= k; y *= k; z *= k;
    if (flat && y < -0.35) y = -0.35 - (y + 0.35) * (1 - flat);
    p.setXYZ(i, x * scale[0], y * scale[1], z * scale[2]);
  }
  g.computeVertexNormals();
  weldNormals(g);
  return g;
}

/** Goutte de coulure (fromage, sauce) suspendue sous y = 0, longueur len, rayon r. */
export function dripGeo(len, r, seg = 10) {
  const pts = [
    new THREE.Vector2(0.0001, r * 0.6), new THREE.Vector2(r * 1.25, r * 0.15), new THREE.Vector2(r * 1.0, -len * 0.25),
    new THREE.Vector2(r * 0.72, -len * 0.6), new THREE.Vector2(r * 0.85, -len * 0.88), new THREE.Vector2(r * 1.12, -len),
    new THREE.Vector2(r * 0.95, -len - r * 0.75), new THREE.Vector2(r * 0.45, -len - r * 1.1), new THREE.Vector2(0.0001, -len - r * 1.2),
  ];
  // la lathe va du haut vers le bas : on inverse pour des normales sortantes
  const g = new THREE.LatheGeometry(pts.reverse(), seg);
  g.computeVertexNormals();
  weldNormals(g);
  return g;
}

/** Tube de sauce le long de points [[x,y,z]…] (zigzag, filet de miel). */
export function tubeGeo(points, radius, seg = 120, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), closed, 'catmullrom', 0.5);
  const g = new THREE.TubeGeometry(curve, seg, radius, radial, closed);
  weldNormals(g);
  return g;
}

/**
 * Balayage d'un profil 2D (points [x,y] autour de l'axe) le long d'une courbe — chantilly à la
 * douille cannelée. radiusFn(u) module la taille du profil le long de la courbe.
 */
export function sweepGeo(curve, profile, steps, radiusFn = () => 1) {
  const frames = curve.computeFrenetFrames(steps, false);
  const np = profile.length;
  const pos = [], uv = [], idx = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    curve.getPointAt(u, P);
    const N = frames.normals[i], B = frames.binormals[i];
    const k = radiusFn(u);
    for (let j = 0; j <= np; j++) {
      const q = profile[j % np];
      pos.push(P.x + (N.x * q[0] + B.x * q[1]) * k, P.y + (N.y * q[0] + B.y * q[1]) * k, P.z + (N.z * q[0] + B.z * q[1]) * k);
      uv.push(u * 8, j / np);
    }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < np; j++) {
    const a = i * (np + 1) + j, b = (i + 1) * (np + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  weldNormals(g);
  return g;
}

/** Points répartis dans un contour (rejet + distance minimale), déterministes. */
export function scatter(R, n, seed, { margin = 0.85, minD = 0, tries = 40 } = {}) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (let t = 0; t < tries; t++) {
      const a = r() * TAU, s = Math.sqrt(r()) * margin, rr = R(a) * s;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (!minD || out.every((p) => Math.hypot(p[0] - x, p[1] - z) >= minD)) { best = [x, z, r()]; break; }
      if (!best) best = [x, z, r()];
    }
    out.push(best);
  }
  return out;
}

/** Fusionne en conservant les groupes (materialIndex) : pour les maillages multi-matériaux. */
export function mergeByGroup(geos, withColor = false) {
  const flat = merge(geos, withColor);
  const src = flat.index.array;
  const lists = new Map();
  let ov = 0, oi = 0;
  for (const g of geos) {
    const n = g.attributes.position.count, cnt = g.index ? g.index.count : n;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: cnt, materialIndex: 0 }];
    for (const gr of groups) {
      if (!lists.has(gr.materialIndex)) lists.set(gr.materialIndex, []);
      const L = lists.get(gr.materialIndex);
      for (let i = gr.start; i < gr.start + gr.count; i++) L.push(src[oi + i]);
    }
    ov += n; oi += cnt;
  }
  const idx = new Uint32Array(src.length);
  let o = 0;
  flat.clearGroups();
  for (const k of [...lists.keys()].sort((a, b) => a - b)) {
    const L = lists.get(k);
    idx.set(L, o); flat.addGroup(o, L.length, k); o += L.length;
  }
  flat.setIndex(new THREE.BufferAttribute(idx, 1));
  return flat;
}
