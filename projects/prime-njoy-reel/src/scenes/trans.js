// Transitions Prime N'Joy (différentes du Reel AP Design) : points halftone qui grossissent,
// iris à travers le cercle du logo, balayage en dégradé, éclair « énergie », dispersion en points.

import { brandAt, brandGradient } from '../world/brand.js';
import { E, seg, clamp, lerp } from './kit.js';
import { rng, TAU } from '../core/anim.js';

/** Fond « aurore » clair : blanc + halos de couleur de marque qui dérivent. */
export function aurora(g, W, H, t, a = 1, o = {}) {
  g.fillStyle = o.base ?? '#f7f8fc';
  g.fillRect(0, 0, W, H);
  const blobs = [[0.15, 0.2, 0.0, 0.7], [0.85, 0.78, 1.0, 0.75], [0.8, 0.15, 0.62, 0.55], [0.2, 0.85, 0.35, 0.6]];
  for (const [bx, by, p, r] of blobs) {
    const x = W * (bx + 0.05 * Math.sin(t * 0.6 + p * 7)), y = H * (by + 0.03 * Math.cos(t * 0.5 + p * 5));
    const R = W * r;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, brandAt(p, 0.22 * a * (o.k ?? 1)));
    gr.addColorStop(1, brandAt(p, 0));
    g.fillStyle = gr;
    g.fillRect(x - R, y - R, R * 2, R * 2);
  }
}

/** Fond bleu nuit profond (scène « réuni »). */
export function night(g, W, H, t) {
  const gr = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, H * 0.75);
  gr.addColorStop(0, '#16257a'); gr.addColorStop(0.55, '#0b1650'); gr.addColorStop(1, '#040822');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const r = rng(12);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = ((r() * H - t * 20 * (0.3 + r())) % H + H) % H;
    g.fillStyle = brandAt(r(), 0.25 + 0.35 * r());
    g.beginPath(); g.arc(x, y, (1 + r() * 2.5) * W / 1080, 0, TAU); g.fill();
  }
}

/** Grille de points de marque qui grossissent depuis un point d'origine jusqu'à recouvrir l'écran (p 0→1). */
export function dotWipe(g, W, H, p, o = {}) {
  if (p <= 0) return;
  const ox = (o.ox ?? 0.5) * W, oy = (o.oy ?? 0.5) * H;
  const step = (o.step ?? 70) * W / 1080;
  const maxD = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
  if (p >= 0.999) { g.fillStyle = o.solid ?? '#0b1650'; g.fillRect(0, 0, W, H); return; }
  for (let y = step / 2; y < H + step; y += step) {
    for (let x = step / 2 + ((Math.round(y / step) % 2) * step) / 2; x < W + step; x += step) {
      const d = Math.hypot(x - ox, y - oy) / maxD;
      const k = clamp(p * 1.9 - d * 0.9);
      if (k <= 0) continue;
      const r = E.inCubic(k) * step * 0.78;
      g.fillStyle = k > 0.92 && o.solid ? o.solid : brandAt(x / W, 1);
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }
}

/** Voile plein percé d'un cercle (iris) : r = rayon du trou en px. */
export function iris(g, W, H, cx, cy, r, color) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(cx, cy, Math.max(0.1, r), 0, TAU, true);
  g.fill('evenodd');
  g.restore();
}

/** Bande diagonale de dégradé qui balaie l'écran ; p 0→1 recouvre, p 1→2 découvre. */
export function gradientSwipe(g, W, H, p) {
  if (p <= 0 || p >= 2) return;
  const D = W + H;
  const lead = E.inOutCubic(clamp(p)) * D * 1.15;
  const tail = E.inOutCubic(clamp(p - 1)) * D * 1.15;
  g.save();
  g.beginPath();
  // bande entre deux diagonales (bas-gauche → haut-droit)
  const poly = (d) => [[d - H, H], [d, 0]];
  const [a1, a2] = poly(lead), [b1, b2] = poly(tail);
  g.moveTo(b1[0] - 50, b1[1] + 50); g.lineTo(b2[0] - 50, b2[1] - 50); g.lineTo(a2[0], a2[1] - 50); g.lineTo(a1[0], a1[1] + 50);
  g.closePath();
  g.fillStyle = brandGradient(g, 0, H, W, 0);
  g.fill();
  // liseré lumineux sur le bord d'attaque
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6 * W / 1080;
  g.beginPath(); g.moveTo(a1[0], a1[1] + 50); g.lineTo(a2[0], a2[1] - 50); g.stroke();
  g.restore();
}

/** Éclair (zigzag) avec halo ; k = intensité 0..1. */
export function lightning(g, x0, y0, x1, y1, k, seed, u, color = '#ffb21a') {
  if (k <= 0.01) return;
  const r = rng(seed);
  const pts = [[x0, y0]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([lerp(x0, x1, t) + (r() - 0.5) * 160 * u, lerp(y0, y1, t) + (r() - 0.5) * 40 * u]);
  }
  pts.push([x1, y1]);
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [w, c, a] of [[46, color, 0.25], [22, color, 0.55], [8, '#ffffff', 1]]) {
    g.strokeStyle = c; g.globalAlpha = a * k; g.lineWidth = w * u;
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  g.restore();
}

/** Nuée de points de marque qui se dispersent (sortie de la scène promesse). */
export function dotScatter(g, W, H, p, seed = 3, n = 260) {
  if (p <= 0 || p >= 1) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = W * (0.08 + r() * 0.84), y0 = H * (0.2 + r() * 0.42);
    const a = r() * TAU, sp = (0.2 + r() * 0.8) * W * 0.6;
    const k = E.outCubic(p);
    const x = x0 + Math.cos(a) * sp * k, y = y0 + Math.sin(a) * sp * k;
    g.fillStyle = brandAt(x0 / W, 1 - p);
    g.beginPath(); g.arc(x, y, (4 + r() * 10) * (W / 1080) * (1 - p * 0.5), 0, TAU); g.fill();
  }
}

/**
 * Arrière-plan DYNAMIQUE clair : halos de marque qui dérivent, rubans fluides en dégradé (comme la vague
 * de l'affiche), trame de points halftone qui ondule depuis le centre et pulse sur le tempo, reflet balayant.
 * o = { k: intensité, beat: 0..1, cy: centre de l'onde (0..1) }
 */
export function dynamicBg(g, W, H, t, o = {}) {
  const k = o.k ?? 1, beat = o.beat ?? 0, u = W / 1080;
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#fbfbff'); base.addColorStop(1, '#eef0fb');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // halos de couleur en mouvement
  const blobs = [[0.2, 0.18, 0.02, 0.75, 0.9], [0.85, 0.3, 0.62, 0.7, 1.2], [0.75, 0.85, 1.0, 0.8, 0.8], [0.15, 0.75, 0.35, 0.7, 1.05]];
  for (const [bx, by, p, r, sp] of blobs) {
    const x = W * (bx + 0.14 * Math.sin(t * 0.55 * sp + p * 9)), y = H * (by + 0.08 * Math.cos(t * 0.45 * sp + p * 5));
    const R = W * r * (1 + 0.06 * beat);
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, brandAt(p, 0.34 * k)); gr.addColorStop(1, brandAt(p, 0));
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
  }
  // rubans fluides
  for (let i = 0; i < 4; i++) {
    const y0 = H * (0.2 + i * 0.22), amp = H * (0.05 + 0.02 * i), ph = t * (0.6 + i * 0.15) + i * 1.7;
    g.beginPath();
    g.moveTo(-W * 0.1, y0 + Math.sin(ph) * amp);
    g.bezierCurveTo(W * 0.3, y0 - amp * 1.6 + Math.sin(ph * 1.3) * amp, W * 0.7, y0 + amp * 1.6 + Math.cos(ph) * amp, W * 1.1, y0 + Math.sin(ph + 1.5) * amp);
    g.lineTo(W * 1.1, y0 + Math.sin(ph + 1.5) * amp + 60 * u * (1 + i * 0.4));
    g.bezierCurveTo(W * 0.7, y0 + amp * 1.6 + Math.cos(ph) * amp + 60 * u, W * 0.3, y0 - amp * 1.6 + Math.sin(ph * 1.3) * amp + 60 * u, -W * 0.1, y0 + Math.sin(ph) * amp + 50 * u);
    g.closePath();
    g.fillStyle = brandGradient(g, 0, 0, W, 0, 0);
    g.globalAlpha = (0.07 + 0.03 * i) * k;
    g.fill();
    g.globalAlpha = 1;
  }
  // trame de points qui ondule (onde concentrique + pulsation tempo)
  const step = 44 * u, cx = W / 2, cy = H * (o.cy ?? 0.45);
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2 + ((Math.round(y / step) % 2) * step) / 2; x < W; x += step) {
      const d = Math.hypot(x - cx, y - cy) / W;
      const w = 0.5 + 0.5 * Math.sin(d * 14 - t * 3.2);
      const r = step * (0.06 + 0.16 * w * w + 0.08 * beat);
      g.fillStyle = brandAt(x / W, (0.1 + 0.16 * w) * k);
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }
  // reflet lumineux qui balaie
  const sw = ((t * 0.42) % 1.6) - 0.3;
  const sx = W * sw * 1.4;
  const lg = g.createLinearGradient(sx - W * 0.25, 0, sx + W * 0.25, H * 0.3);
  lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${0.45 * k})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
}

/** Fond bleu nuit DYNAMIQUE : rayons lumineux tournants, halos, trame de points en spirale. */
export function nightDynamic(g, W, H, t, beat = 0) {
  night(g, W, H, t);
  const cx = W / 2, cy = H * 0.47, u = W / 1080;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.18;
    g.save(); g.translate(cx, cy); g.rotate(a);
    const L = H * 0.9;
    const gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, brandAt(i / 12, 0.18 + 0.1 * beat)); gr.addColorStop(1, brandAt(i / 12, 0));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -L * 0.06); g.lineTo(L, L * 0.06); g.closePath(); g.fill();
    g.restore();
  }
  const step = 52 * u;
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const d = Math.hypot(x - cx, y - cy) / W, ang = Math.atan2(y - cy, x - cx);
      const w = 0.5 + 0.5 * Math.sin(d * 16 - t * 4 + ang * 2);
      g.fillStyle = brandAt(x / W, 0.12 * w + 0.05 * beat);
      g.beginPath(); g.arc(x, y, step * (0.05 + 0.12 * w), 0, TAU); g.fill();
    }
  }
  g.restore();
}

/** Pulsation sur le tempo (0..1) à partir du temps global. */
export function beatAt(t, bpm = 118, from = 0) {
  if (t < from) return 0;
  const p = ((t - from) * bpm / 60) % 1;
  return Math.exp(-p * 7);
}
