// Bibliothèque de dessin 2D : typographie animée, tracés SVG lumineux, flares,
// étincelles, ondes de choc, HUD, lignes de flux, verre. Tout est piloté par le temps.

import { E, clamp, lerp, seg, rng, rgba, TAU } from './anim.js';

let FAMILY = 'Anton';
export const setFamily = (f) => (FAMILY = f);

export function setFont(g, size, weight = 700, tracking = 0) {
  g.font = `${weight} ${size}px "${FAMILY}"`;
  g.letterSpacing = `${tracking * size}px`;
}

export function textWidth(g, str, size, weight = 700, tracking = 0) {
  setFont(g, size, weight, 0);
  return g.measureText(str).width + Math.max(0, str.length - 1) * tracking * size;
}

export function fitSize(g, str, weight, tracking, maxW, maxSize) {
  const w100 = textWidth(g, str, 100, weight, tracking);
  return Math.min(maxSize, (maxW / w100) * 100);
}

export function charLayout(g, str, size, weight = 700, tracking = 0) {
  setFont(g, size, weight, 0);
  const tr = tracking * size;
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    const pre = g.measureText(str.slice(0, i)).width;
    chars.push({ ch: str[i], x: pre + i * tr, w: g.measureText(str[i]).width });
  }
  const width = g.measureText(str).width + Math.max(0, str.length - 1) * tr;
  return { chars, width };
}

const alignOffset = (align, w) => (align === 'center' ? -w / 2 : align === 'right' ? -w : 0);

/**
 * Texte animé caractère par caractère.
 * o = { size, weight, tracking, align, color, colorAt(i), alpha, t, mode, stagger, dur, out, outStagger }
 * modes : 'rise' (montée masquée), 'fade' (fondu + léger décalage), 'track' (resserrement),
 *         'static'
 */
export function drawText(g, str, x, y, o = {}) {
  const size = o.size || 60;
  const weight = o.weight || 700;
  const tracking = o.tracking || 0;
  const mode = o.mode || 'rise';
  const t = o.t ?? 10;
  const stagger = o.stagger ?? 0.03;
  const dur = o.dur ?? 0.55;
  const alpha = o.alpha ?? 1;
  const out = o.out || 0;
  let tr = tracking;
  if (mode === 'track') tr = lerp(o.trackFrom ?? tracking + 0.6, tracking, E.outExpo(seg(t, 0, dur * 1.6)));
  const L = charLayout(g, str, size, weight, tr);
  const x0 = x + alignOffset(o.align, L.width);
  setFont(g, size, weight, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  if (mode === 'rise') {
    g.save();
    g.beginPath();
    g.rect(x0 - size, y - size * 1.05, L.width + size * 2, size * 1.32);
    g.clip();
  }
  const n = L.chars.length;
  for (let i = 0; i < n; i++) {
    const c = L.chars[i];
    if (c.ch === ' ') continue;
    let p = 1;
    let dy = 0;
    let a = alpha;
    if (mode === 'rise') {
      p = E.outExpo(seg(t, i * stagger, i * stagger + dur));
      dy = (1 - p) * size * 1.05;
    } else if (mode === 'fade') {
      p = E.outCubic(seg(t, i * stagger, i * stagger + dur));
      dy = (1 - p) * size * 0.35;
      a *= p;
    } else if (mode === 'track') {
      p = E.outCubic(seg(t, 0, dur));
      a *= p;
    }
    if (out > 0) {
      const po = E.inCubic(clamp(out * (1 + (o.outStagger ?? 0.4)) - (i / n) * (o.outStagger ?? 0.4)));
      dy -= po * size * 0.9;
      a *= 1 - po;
    }
    if (a <= 0.002 || p <= 0.001) continue;
    g.globalAlpha = a;
    g.fillStyle = o.colorAt ? o.colorAt(i) : o.color || '#fff';
    g.fillText(c.ch, x0 + c.x, y + dy);
  }
  g.globalAlpha = 1;
  if (mode === 'rise') g.restore();
  return { x: x0, width: L.width, layout: L };
}

// Reflet lumineux qui balaie le texte (confiné aux glyphes via un remplissage en dégradé).
export function textSweep(g, str, x, y, o, p, color = '#ffffff', strength = 0.9) {
  if (p <= 0 || p >= 1) return;
  const size = o.size;
  const L = charLayout(g, str, size, o.weight || 700, o.tracking || 0);
  const x0 = x + alignOffset(o.align, L.width);
  const cx = lerp(x0 - L.width * 0.3, x0 + L.width * 1.3, p);
  const band = L.width * 0.16;
  const grd = g.createLinearGradient(cx - band, y - size, cx + band, y);
  grd.addColorStop(0, rgba(color, 0));
  grd.addColorStop(0.5, rgba(color, strength));
  grd.addColorStop(1, rgba(color, 0));
  g.save();
  g.globalCompositeOperation = 'lighter';
  setFont(g, size, o.weight || 700, 0);
  g.fillStyle = grd;
  for (const c of L.chars) if (c.ch !== ' ') g.fillText(c.ch, x0 + c.x, y);
  g.restore();
}

// Contour des lettres "construit par la lumière" (tracé progressif).
export function strokeTextProgress(g, str, x, y, o, p, color, width, alpha = 1) {
  if (p <= 0) return;
  const size = o.size;
  const L = charLayout(g, str, size, o.weight || 700, o.tracking || 0);
  const x0 = x + alignOffset(o.align, L.width);
  setFont(g, size, o.weight || 700, 0);
  g.save();
  g.lineWidth = width;
  g.strokeStyle = color;
  g.lineJoin = 'round';
  g.globalAlpha = alpha;
  const dash = size * 4.2;
  g.setLineDash([dash * clamp(p), dash * 1.2]);
  const n = L.chars.length;
  for (let i = 0; i < n; i++) {
    const c = L.chars[i];
    if (c.ch === ' ') continue;
    g.lineDashOffset = -i * size * 0.15;
    g.strokeText(c.ch, x0 + c.x, y);
  }
  g.restore();
}

// Nuage de points échantillonnés dans les glyphes (pour faire converger des particules).
const ptsCache = new Map();
export function textPoints(str, size, weight, tracking, step, align = 'center') {
  const key = [str, size | 0, weight, tracking, step, align].join('|');
  if (ptsCache.has(key)) return ptsCache.get(key);
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  const L = charLayout(g, str, size, weight, tracking);
  c.width = Math.ceil(L.width + size);
  c.height = Math.ceil(size * 1.4);
  const ox = size * 0.5;
  const oy = size * 1.05;
  setFont(g, size, weight, 0);
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  for (const ch of L.chars) g.fillText(ch.ch, ox + ch.x, oy);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const pts = [];
  const shift = alignOffset(align, L.width);
  for (let yy = 0; yy < c.height; yy += step) {
    for (let xx = 0; xx < c.width; xx += step) {
      if (data[(yy * c.width + xx) * 4 + 3] > 140) pts.push([xx - ox + shift, yy - oy, (xx - ox) / L.width]);
    }
  }
  ptsCache.set(key, pts);
  return pts;
}

// ---------------------------------------------------------------- SVG
// tf = { x, y, s, rot, origin:[ox,oy] }  (origin = point du viewBox placé en x,y)
export function svgTransform(g, tf) {
  g.translate(tf.x, tf.y);
  if (tf.rot) g.rotate(tf.rot);
  g.scale(tf.s, tf.s);
  g.translate(-tf.origin[0], -tf.origin[1]);
}

/**
 * Trace un élément SVG avec progression (draw-on), effacement (from) et halo.
 * o = { p, from, width(px), color, alpha, glow, fill }
 */
export function drawSvg(g, item, tf, o = {}) {
  const p = o.p ?? 1;
  const from = o.from ?? 0;
  if (p <= from || (o.alpha ?? 1) <= 0) return;
  g.save();
  svgTransform(g, tf);
  const L = item.length;
  if (p < 1 || from > 0) {
    g.setLineDash([L * (p - from), L * 2 + 10]);
    g.lineDashOffset = -L * from;
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const w = (o.width || 2) / tf.s;
  if (o.fill) {
    g.globalAlpha = (o.alpha ?? 1) * (o.fillAlpha ?? 1);
    g.fillStyle = o.fill;
    g.fill(item.path2d);
  }
  if (o.glow) {
    g.globalAlpha = (o.alpha ?? 1) * 0.22 * o.glow;
    g.strokeStyle = o.color || '#ff2a2a';
    g.lineWidth = w * 4.5;
    g.stroke(item.path2d);
  }
  g.globalAlpha = o.alpha ?? 1;
  g.strokeStyle = o.color || '#ff2a2a';
  g.lineWidth = w;
  g.stroke(item.path2d);
  g.restore();
}

export function drawSvgGroup(g, items, tf, o) {
  for (const it of items) drawSvg(g, it, tf, o);
}

// ---------------------------------------------------------------- VFX 2D
export function radialGlow(g, x, y, r, color, alpha) {
  if (alpha <= 0 || r <= 0) return;
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, rgba(color, alpha));
  grd.addColorStop(0.35, rgba(color, alpha * 0.35));
  grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// Flare anamorphique : cœur lumineux + longue traînée horizontale + fantômes.
export function flare(g, x, y, k, f, color = '#ff2a2a') {
  if (k <= 0.002) return;
  const { W, H, u } = f;
  g.save();
  g.globalCompositeOperation = 'lighter';
  radialGlow(g, x, y, 220 * u * (0.6 + k * 0.6), '#ffffff', 0.55 * k);
  radialGlow(g, x, y, 520 * u * (0.6 + k * 0.5), color, 0.35 * k);
  // traînée anamorphique
  g.save();
  g.translate(x, y);
  g.scale(1, 0.012 + 0.006 * k);
  radialGlow(g, 0, 0, W * 0.55 * (0.5 + 0.5 * k), '#ffe0d8', 0.7 * k);
  g.restore();
  g.save();
  g.translate(x, y);
  g.scale(1, 0.05);
  radialGlow(g, 0, 0, W * 0.3, color, 0.3 * k);
  g.restore();
  // fantômes le long de l'axe flare -> centre
  const cx = W / 2, cy = H / 2;
  const ghosts = [[-0.35, 60, 0.12], [0.45, 120, 0.08], [0.85, 40, 0.14], [1.3, 180, 0.05]];
  for (const [t, r, a] of ghosts) {
    const gx = lerp(x, cx, 1 + t), gy = lerp(y, cy, 1 + t);
    radialGlow(g, gx, gy, r * u, t > 0.6 ? '#ffc21a' : color, a * k);
  }
  g.restore();
}

// Traînée lumineuse (light streak) entre deux points
export function streak(g, x1, y1, x2, y2, width, color, alpha) {
  if (alpha <= 0) return;
  const grd = g.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0, rgba(color, 0));
  grd.addColorStop(0.8, rgba(color, alpha * 0.6));
  grd.addColorStop(1, rgba('#ffffff', alpha));
  g.strokeStyle = grd;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

// Gerbe d'étincelles déterministe ; tau = temps écoulé depuis l'impact (s)
export function sparks(g, x, y, tau, f, o = {}) {
  if (tau < 0 || tau > (o.life || 0.9)) return;
  const r = rng(o.seed || 7);
  const n = Math.round((o.count || 60) * f.cfg.vfx.particles * f.cfg.vfx.intensity);
  const life = o.life || 0.9;
  const speed = (o.speed || 1600) * f.u;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = r() * TAU;
    const sp = speed * (0.25 + r() * 0.75);
    const l = life * (0.4 + r() * 0.6);
    if (tau > l) { r(); continue; }
    const k = tau / l;
    const d = sp * (1 - Math.pow(1 - k, 2.2)) * l * 0.7;
    const d0 = Math.max(0, d - sp * 0.045 * (1 - k));
    const ca = Math.cos(ang), sa = Math.sin(ang) * (o.flat || 1);
    const a = (1 - k) * (0.6 + r() * 0.4);
    streak(g, x + ca * d0, y + sa * d0, x + ca * d, y + sa * d, (1.5 + r() * 2) * f.u, o.color || '#ff2a2a', a);
  }
  g.restore();
}

// Onde de choc circulaire
export function shockRing(g, x, y, tau, f, o = {}) {
  const dur = o.dur || 0.7;
  if (tau < 0 || tau > dur) return;
  const k = tau / dur;
  const R = (o.radius || 900) * f.u * E.outExpo(k);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = rgba(o.color || '#ff2a2a', (1 - k) * (o.alpha ?? 0.9));
  g.lineWidth = (o.width || 14) * f.u * (1 - k) + f.u;
  g.beginPath();
  g.ellipse(x, y, R, R * (o.flat || 1), 0, 0, TAU);
  g.stroke();
  g.strokeStyle = rgba('#ffffff', (1 - k) * 0.5 * (o.alpha ?? 0.9));
  g.lineWidth = 2 * f.u;
  g.stroke();
  g.restore();
}

// Anneau HUD (arcs SVG en rotation + graduations)
export function hudRing(g, hud, x, y, R, t, alpha, f, color = '#ff2a2a') {
  if (alpha <= 0.002) return;
  const s = R / 470;
  const speeds = { 'hud-1': 0.35, 'hud-2': -0.22, 'hud-3': 0.5, 'hud-4': -0.4, 'hud-5': 0.28, 'hud-dash': 0.1 };
  for (const it of hud.items) {
    const rot = (speeds[it.id] || 0.2) * t * (1 + alpha * 0.2);
    g.save();
    if (it.id === 'hud-dash') {
      svgTransform(g, { x, y, s, rot, origin: hud.center });
      g.setLineDash([3 / s * f.u, 14 / s * f.u]);
      g.strokeStyle = rgba(color, alpha * 0.45);
      g.lineWidth = (1.6 * f.u) / s;
      g.stroke(it.path2d);
    } else {
      const p = clamp(alpha * 1.2);
      g.restore();
      drawSvg(g, it, { x, y, s, rot, origin: hud.center }, { p, width: 2.2 * f.u, color, alpha: alpha * 0.85, glow: 0.8 });
      continue;
    }
    g.restore();
  }
  // graduations
  g.save();
  g.translate(x, y);
  g.rotate(-t * 0.08);
  g.strokeStyle = rgba(color, alpha * 0.5);
  g.lineWidth = 1.4 * f.u;
  g.beginPath();
  const N = 90;
  for (let i = 0; i < N; i++) {
    if (i / N > alpha * 1.4) break;
    const a = (i / N) * TAU;
    const r1 = R * 1.06, r2 = R * (i % 5 === 0 ? 1.1 : 1.08);
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
  }
  g.stroke();
  g.restore();
}

// Courbe de connexion lumineuse avec impulsions qui circulent.
export function flowCurve(g, a, b, t, p, f, o = {}) {
  if (p <= 0) return;
  const color = o.color || '#ff2a2a';
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const bend = o.bend ?? 0.25;
  const c = [mx - dy * bend, my + dx * bend];
  const pt = (s) => [
    (1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0],
    (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1],
  ];
  const N = 40;
  const end = clamp(p);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.beginPath();
  for (let i = 0; i <= N; i++) {
    const q = pt((i / N) * end);
    i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
  }
  g.strokeStyle = rgba(color, (o.alpha ?? 1) * 0.35);
  g.lineWidth = (o.width || 1.6) * f.u;
  g.stroke();
  // impulsions
  g.setLineDash([26 * f.u, 140 * f.u]);
  g.lineDashOffset = -t * 900 * f.u;
  g.strokeStyle = rgba('#ffe0d8', (o.alpha ?? 1) * 0.9);
  g.lineWidth = (o.width || 1.6) * 1.6 * f.u;
  g.stroke();
  g.restore();
  // tête lumineuse
  if (p < 1) {
    const h = pt(end);
    g.save();
    g.globalCompositeOperation = 'lighter';
    radialGlow(g, h[0], h[1], 40 * f.u, color, 0.9 * (o.alpha ?? 1));
    g.restore();
  }
  return pt;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// Carte / pastille en verre (glassmorphism)
export function glassPill(g, x, y, w, h, r, alpha, f, o = {}) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  roundRect(g, x, y, w, h, r);
  const grd = g.createLinearGradient(x, y, x + w * 0.4, y + h * 1.4);
  grd.addColorStop(0, `rgba(255,255,255,${o.top ?? 0.14})`);
  grd.addColorStop(1, `rgba(255,255,255,${o.bottom ?? 0.03})`);
  g.fillStyle = o.tint ? o.tint : grd;
  g.fill();
  if (o.tint) {
    g.fillStyle = grd;
    g.fill();
  }
  g.lineWidth = (o.border || 1.5) * f.u;
  g.strokeStyle = o.stroke || 'rgba(255,255,255,0.2)';
  g.stroke();
  // reflet supérieur
  g.beginPath();
  g.roundRect(x + r, y + 1.5 * f.u, Math.max(0, w - 2 * r), 1.2 * f.u, 1);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fill();
  g.restore();
}

// Petit libellé éditorial (ex. "01 — CHOISIR") avec trait vert
export function eyebrow(g, str, x, y, t, f, o = {}) {
  const size = (o.size || 26) * f.u;
  const p = E.outExpo(seg(t, 0, 0.6));
  const a = (o.alpha ?? 1) * p;
  if (a <= 0) return;
  const lw = 60 * f.u * p;
  g.save();
  g.globalAlpha = a;
  const align = o.align || 'left';
  const tw = textWidth(g, str, size, 600, 0.24);
  let lx = x;
  if (align === 'center') lx = x - (tw + 80 * f.u) / 2;
  g.fillStyle = o.color || '#ff2a2a';
  g.fillRect(lx, y - size * 0.36, lw, 2 * f.u);
  setFont(g, size, 600, 0.24);
  g.fillStyle = o.color || '#ff2a2a';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillText(str, lx + 80 * f.u, y);
  g.restore();
}
