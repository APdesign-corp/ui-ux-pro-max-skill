// Petites billes de couleur (version définitive) : quelques billes brillantes aux couleurs de la marque
// (3 à 5 à l'écran) qui naissent, se baladent puis SE DÉSINTÈGRENT en poussière de couleur
// (éclats + anneau) ; toutes celles encore présentes éclatent au changement de scène.

import { rng, TAU, E, seg, clamp } from '../core/anim.js';
import { brandAt } from './brand.js';

const DISSOLVE = 0.6; // durée de la désintégration (s)

/** Calendrier déterministe des billes pour chaque scène. */
export function schedule(scenes) {
  const out = [];
  scenes.forEach((s, si) => {
    const r = rng(700 + si * 53);
    const D = s.end - s.start;
    const n = Math.max(2, Math.round(D * 1.2));
    for (let i = 0; i < n; i++) {
      const birth = s.start + (i / n) * D * 0.82 + r() * 0.2;
      const death = Math.min(birth + 1.5 + r() * 1.5, s.end);
      if (death - birth < 0.5) continue;
      out.push({
        si, id: s.id, birth, death, col: r(),
        x0: 0.1 + r() * 0.8, y0: 0.14 + r() * 0.74,
        vx: (r() - 0.5) * 0.12, vy: (r() - 0.5) * 0.08 - 0.02,
        R: 18 + r() * 18, ph: r() * TAU, seed: r() * 1000,
      });
    }
  });
  return out;
}

let cache = null;

export function drawLiquid(g, W, H, t, scenes, o = {}) {
  if (!cache || cache.n !== scenes.length) cache = { n: scenes.length, balls: schedule(scenes) };
  const u = W / 1080, k = o.k ?? 1;
  for (const b of cache.balls) {
    if (t < b.birth || t > b.death + DISSOLVE) continue;
    const edge = b.id === 'brand'; // scène signature : billes sur les bords (logo + texte dégagés)
    const pos = (tt) => {
      const a = tt - b.birth;
      let x = b.x0 + b.vx * a + 0.025 * Math.sin(a * 1.9 + b.ph);
      const y = b.y0 + b.vy * a + 0.018 * Math.cos(a * 1.5 + b.ph);
      if (edge) x = b.x0 < 0.5 ? 0.04 + Math.abs(x - b.x0) * 0.6 + (b.x0 * 0.3) : 0.96 - Math.abs(x - b.x0) * 0.6 - ((1 - b.x0) * 0.3);
      return [x * W, y * H];
    };
    const R = b.R * u;
    if (t <= b.death) {
      // bille vivante : apparition en « pop », légère respiration
      const born = E.outBack(seg(t, b.birth, b.birth + 0.35), 2.2);
      const [x, y] = pos(t);
      const r = R * born * (1 + 0.06 * Math.sin((t - b.birth) * 5 + b.ph));
      if (r < 0.5) continue;
      const glow = g.createRadialGradient(x, y, 0, x, y, r * 2.6);
      glow.addColorStop(0, brandAt(b.col, 0.35 * k)); glow.addColorStop(1, brandAt(b.col, 0));
      g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 2.6, 0, TAU); g.fill();
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      gr.addColorStop(0, brandAt(clamp(b.col - 0.12), k)); gr.addColorStop(1, brandAt(clamp(b.col + 0.12), k));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,255,255,${0.8 * k})`;
      g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.38, r * 0.3, r * 0.18, -0.6, 0, TAU); g.fill();
    } else {
      // désintégration : éclats de couleur qui s'envolent et s'effritent + anneau qui s'étend
      const p = (t - b.death) / DISSOLVE;
      const [x, y] = pos(b.death);
      const ring = E.outCubic(p);
      g.strokeStyle = brandAt(b.col, 0.6 * (1 - p) * k); g.lineWidth = 2.5 * u * (1 - p);
      g.beginPath(); g.arc(x, y, R * (1 + ring * 2.2), 0, TAU); g.stroke();
      const rr = rng(Math.floor(b.seed));
      for (let d = 0; d < 30; d++) {
        const a = rr() * TAU, sp = (0.6 + rr() * 1.4) * R * 3.2;
        const dd = sp * E.outCubic(p);
        const s = (1.8 + rr() * 3.6) * u * (1 - p * 0.8);
        g.fillStyle = brandAt(clamp(b.col + (rr() - 0.5) * 0.25), (1 - p) * k);
        g.beginPath(); g.arc(x + Math.cos(a) * dd, y + Math.sin(a) * dd + p * p * 40 * u, s, 0, TAU); g.fill();
      }
    }
  }
}
