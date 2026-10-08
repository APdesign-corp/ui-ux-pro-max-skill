// Bulles de couleur LIQUIDES (version définitive) : gouttes aux couleurs de la marque, bords ondulants,
// reflet brillant, qui dérivent derrière le contenu ; elles naissent au début de chaque scène et
// éclatent en gouttelettes à la fin de la scène.

import { rng, TAU, E, seg, clamp } from '../core/anim.js';
import { brandAt } from './brand.js';

function blob(g, x, y, R, t, seed, col, a) {
  const n = 14;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU;
    const wob = 1 + 0.08 * Math.sin(ang * 3 + t * 2.1 + seed) + 0.05 * Math.sin(ang * 5 - t * 1.7 + seed * 2);
    pts.push([x + Math.cos(ang) * R * wob, y + Math.sin(ang) * R * wob]);
  }
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) g.moveTo(mx, my); else g.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  g.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  g.closePath();
  const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.05, x, y, R * 1.05);
  gr.addColorStop(0, brandAt(clamp(col - 0.18), 0.95 * a));
  gr.addColorStop(0.55, brandAt(col, 0.85 * a));
  gr.addColorStop(1, brandAt(clamp(col + 0.15), 0.55 * a));
  g.fillStyle = gr;
  g.fill();
  // reflet brillant (aspect liquide / verre)
  const hl = g.createRadialGradient(x - R * 0.38, y - R * 0.42, 0, x - R * 0.38, y - R * 0.42, R * 0.45);
  hl.addColorStop(0, `rgba(255,255,255,${0.75 * a})`); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fill();
  g.strokeStyle = `rgba(255,255,255,${0.35 * a})`; g.lineWidth = R * 0.03; g.stroke();
}

/** scenes = [{start, end}] ; dessine sur le calque de fond (derrière la 3D et la typo). */
export function drawLiquid(g, W, H, t, scenes, o = {}) {
  const u = W / 1080;
  const k = o.k ?? 1;
  scenes.forEach((s, si) => {
    if (t < s.start - 0.05 || t > s.end + 0.35) return;
    const r = rng(500 + si * 31);
    const n = 4 + (si % 2);
    const life = t - s.start;
    for (let i = 0; i < n; i++) {
      const col = r(), ox = r(), oy = r(), sp = 0.15 + r() * 0.25, R0 = (110 + r() * 150) * u, ph = r() * TAU, delay = r() * 0.35;
      const born = E.outBack(seg(life, delay, delay + 0.55), 1.8);
      const pop = seg(t, s.end - 0.18 + i * 0.03, s.end + 0.1 + i * 0.03);
      if (born <= 0 || pop >= 1) {
        // gouttelettes de l'éclatement
        if (pop > 0 && pop < 1) splash();
        continue;
      }
      const x = W * (0.12 + 0.76 * ox) + Math.sin(t * sp * 2.2 + ph) * W * 0.16;
      const y = H * (0.1 + 0.8 * oy) + Math.cos(t * sp * 1.7 + ph) * H * 0.08 - life * 30 * u;
      const R = R0 * born * (1 + 0.25 * E.outCubic(pop)) * (1 - E.inCubic(pop));
      if (R > 1) blob(g, x, y, R, t, i * 3 + si, col, k * (1 - pop * 0.6));
      if (pop > 0) splash();
      function splash() {
        const rr = rng(900 + si * 17 + i);
        const ex = W * (0.12 + 0.76 * ox) + Math.sin((s.end) * sp * 2.2 + ph) * W * 0.16;
        const ey = H * (0.1 + 0.8 * oy) + Math.cos((s.end) * sp * 1.7 + ph) * H * 0.08 - (s.end - s.start) * 30 * u;
        for (let d = 0; d < 12; d++) {
          const a = rr() * TAU, v = (0.4 + rr()) * R0 * 1.6 * E.outCubic(pop);
          const dr = (8 + rr() * 16) * u * (1 - pop);
          if (dr <= 0.5) continue;
          g.fillStyle = brandAt(clamp(col + (rr() - 0.5) * 0.2), 0.8 * (1 - pop) * k);
          g.beginPath(); g.arc(ex + Math.cos(a) * v, ey + Math.sin(a) * v + pop * pop * 60 * u, dr, 0, TAU); g.fill();
        }
      }
    }
  });
}
