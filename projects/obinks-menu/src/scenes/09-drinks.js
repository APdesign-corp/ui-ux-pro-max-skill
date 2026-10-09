// ============================================================================
//  09 — BOISSONS & SAUCES (4.5 s) — FACTS §8
//  0.00 whip ; « MOJITOS » + 5,00€ ; 0.25 → 0.73 les 5 mojitos claquent en éventail (parfums)
//  1.60 « CANETTES » 2,00€ : 3 canettes ; 2.80 « SAUCES » 0,80€ : les 10 pots ; 4.25 whip
// ============================================================================
import { E, seg } from '../core/anim.js';
import { createFoodLights } from '../world/food.js';
import { P, brushTitle, splatter, streetBackdrop, particles, priceTag, photo } from '../core/obinks.js';
import { rig, text } from './_kit.js';

const DUR = 4.5;
const MOJ = [['fraise', 'FRAISE'], ['violette', 'VIOLETTE'], ['original', 'ORIGINAL'], ['pasteque', 'PASTÈQUE'], ['bubblegum', 'BUBBLE GUM']];
const CANS = [['can_coca', 'COCA-COLA CHERRY'], ['can_oasis', 'OASIS TROPICAL'], ['can_lipton', 'LIPTON PÊCHE']];
const SAU = ['brazil', 'toscane', 'cocktail', 'mayonnaise', 'ketchup', 'tartare', 'algerienne', 'andalouse', 'samourai', 'americaine'];
const T_C = 1.6, T_S = 2.8;

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: 0.06, type: 'slam', gain: 0.85 },
  ...MOJ.map((_, i) => ({ t: 0.25 + i * 0.12, type: 'glass', gain: 0.45, pan: -0.6 + i * 0.3 })),
  { t: 0.95, type: 'hit', gain: 0.85 },
  { t: T_C - 0.08, type: 'whoosh', dur: 0.16, gain: 0.6 },
  { t: T_C, type: 'slam', gain: 0.85 },
  ...CANS.map((_, i) => ({ t: T_C + 0.15 + i * 0.12, type: 'pop', gain: 0.55 })),
  { t: T_C + 0.6, type: 'hit', gain: 0.8 },
  { t: T_S - 0.08, type: 'whoosh', dur: 0.16, gain: 0.6 },
  { t: T_S, type: 'slam', gain: 0.85 },
  ...SAU.map((_, i) => ({ t: T_S + 0.15 + i * 0.07, type: 'pop', gain: 0.35, pan: -0.7 + i * 0.15 })),
  { t: T_S + 0.9, type: 'hit', gain: 0.8 },
  { t: 4.25, type: 'whip', gain: 0.8 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe, I = world.images || {};
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1, rim: 1, fill: 1 }));
  const r = rig(ctx, { dur: DUR });
  const cx = W / 2, title = V ? [cx, H * 0.18, 170 * u] : [cx, H * 0.15, 160 * u];
  const zone = V ? [S.l, H * 0.26, S.w, H * 0.38] : [W * 0.08, H * 0.27, W * 0.84, H * 0.5];
  const priceY = V ? H * 0.7 : H * 0.86, priceS = (V ? 140 : 130) * u;
  // sortie d'un sous-bloc : glisse vers la gauche
  const blk = (lt, a, b) => ({ q: seg(lt, a, a + 0.25), out: E.inCubic(seg(lt, b - 0.15, b)) });

  return {
    group,
    camera: r.camOf,
    update(f) {
      const { lt, t, ui, fx } = f;
      const dx = r.shift(lt);
      streetBackdrop(f.bg, W, H, t, { k: 0.55, lamps: V ? [0.1, 0.9] : [0.06, 0.5, 0.94], parallax: lt * 30 * u - dx * 0.7, seed: 9, light: 0.8 });
      particles(fx, W, H, t, { kind: 'embers', k: 0.6, seed: 19, count: 24 });
      ui.save();
      ui.translate(dx, 0);
      const [zx, zy, zw, zh] = zone;
      const section = (name, a, b, seed, draw, price, label) => {
        if (lt < a - 0.05 || lt > b) return;
        const { q, out } = blk(lt, a, b);
        ui.save();
        ui.translate(-out * W * 0.6, 0); ui.globalAlpha = 1 - out;
        splatter(ui, title[0], title[1] - title[2] * 0.2, title[2] * 1.1, { p: seg(lt, a + 0.05, a + 0.8), seed, alpha: 0.9, drips: 0.5 });
        brushTitle(ui, name, title[0], title[1], { size: title[2], font: 'Bangers', p: seg(lt, a, a + 0.25), glow: 0.7, maxWidth: V ? S.w * 0.9 : W * 0.6 });
        draw(q);
        priceTag(ui, cx, priceY, { price, label, size: priceS, p: seg(lt, a + 0.3, a + 0.6), color: 'yellow', rotate: -0.03, t });
        ui.restore();
        if (lt > a + 0.3 && lt < a + 0.9) particles(fx, W, H, t, { kind: 'sparks', burst: { x: cx + dx, y: priceY, t0: t - lt + a + 0.3, power: 0.9 }, seed: seed + 5 });
      };
      section('MOJITOS', 0, T_C, 41, () => {
        MOJ.forEach(([id, nm], i) => {
          const k = i / (MOJ.length - 1) - 0.5;
          const x = zx + zw * (0.5 + k * 0.86), y = zy + zh * (0.45 + Math.abs(k) * 0.12);
          const q = seg(lt, 0.25 + i * 0.12, 0.5 + i * 0.12);
          photo(ui, I['mojito_' + id], x, y, { h: zh * (V ? 0.42 : 0.7), p: q, glow: 0.45, shadow: 0.7, rot: k * 0.25 });
          text(ui, nm, x, y + zh * (V ? 0.28 : 0.44), { size: (V ? 30 : 34) * u, a: seg(lt, 0.4 + i * 0.12, 0.55 + i * 0.12), maxW: zw / 5.2 });
        });
      }, '5,00€', 'MOJITOS');
      section('CANETTES', T_C, T_S, 43, () => {
        CANS.forEach(([id, nm], i) => {
          const x = zx + zw * (0.2 + 0.3 * i), y = zy + zh * 0.45;
          const q = seg(lt, T_C + 0.15 + i * 0.12, T_C + 0.4 + i * 0.12);
          photo(ui, I[id], x, y, { h: zh * 0.72, p: q, glow: 0.4, shadow: 0.8, rot: (i - 1) * 0.06 });
          text(ui, nm, x, y + zh * 0.48, { size: 34 * u, a: seg(lt, T_C + 0.3 + i * 0.12, T_C + 0.45 + i * 0.12), maxW: zw / 3.1 });
        });
      }, '2,00€', 'CANETTES');
      section('SAUCES', T_S, 4.5, 47, () => {
        const cols = 5;
        SAU.forEach((id, i) => {
          const c = i % cols, rw = Math.floor(i / cols);
          const x = zx + zw * ((c + 0.5) / cols), y = zy + zh * (0.27 + rw * 0.46);
          const im = I['sauce_' + id];
          const q = seg(lt, T_S + 0.15 + i * 0.07, T_S + 0.38 + i * 0.07);
          photo(ui, im, x, y, { w: zw / cols * 0.86, p: q, glow: 0.3, shadow: 0.6 });
          text(ui, (im && im.name || id).toUpperCase(), x, y + zh * 0.15, { size: (V ? 28 : 32) * u, a: seg(lt, T_S + 0.3 + i * 0.07, T_S + 0.45 + i * 0.07), maxW: zw / cols * 0.95 });
        });
      }, '0,80€', 'SAUCES');
      ui.restore();
    },
  };
}
