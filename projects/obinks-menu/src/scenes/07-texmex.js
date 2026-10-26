// ============================================================================
//  07 — TEX-MEX (5 s) — FACTS §6 : 8 produits, prix exacts
//  0.00 whip ; « TEX-MEX » claque ; 0.45 → 3.25 une carte par demi-temps (photo du menu, nom,
//  prix), la carte active s'illumine (néon + étincelles) ; 3.9 toutes en place ; 4.75 whip
// ============================================================================
import { E, seg } from '../core/anim.js';
import { createFoodLights } from '../world/food.js';
import { brushTitle, splatter, streetBackdrop, particles, smoke } from '../core/obinks.js';
import { ambience, rig, card } from './_kit.js';

const DUR = 5;
const ITEMS = [
  { id: 'texmex_tenders', name: 'TENDERS', prices: ['LES 3 5,00€', 'LES 6 8,00€'] },
  { id: 'texmex_nuggets', name: 'NUGGETS', prices: ['6 PIÈCES 4,50€'] },
  { id: 'texmex_wings', name: 'WINGS', prices: ['LES 3 4,00€', 'LES 6 6,00€'] },
  { id: 'texmex_mozza', name: 'MOZZA STICK', prices: ['LES 3 4,00€'] },
  { id: 'texmex_camembert', name: 'CROQ CAMEMBERT', prices: ['LES 3 4,50€'] },
  { id: 'texmex_jalapenos', name: 'JALAPENOS CRÈME', prices: ['LES 3 4,50€'] },
  { id: 'frites_cheddar', name: 'FRITES CHEDDAR BACON', prices: ['4,50€'] },
  { id: 'frites_gaufrette', name: 'FRITES GAUFRETTE', prices: ['4,00€'] },
];
const T0 = 0.45, STEP = 0.4;

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: 0.08, type: 'slam', gain: 0.9 },
  { t: 0.1, type: 'impact', gain: 0.7 },
  ...ITEMS.map((_, i) => ({ t: T0 + i * STEP, type: i % 2 ? 'pop' : 'hit', gain: 0.6, pan: (i % 2 ? 0.4 : -0.4) })),
  { t: 3.9, type: 'shimmer', gain: 0.5 },
  { t: 4.75, type: 'whip', gain: 0.8 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe, I = world.images || {};
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1, rim: 1, fill: 1 }));
  const r = rig(ctx, { dur: DUR });
  // grille : 2 × 4 (vertical) / 4 × 2 (horizontal)
  const cols = V ? 2 : 4;
  const gx = V ? S.l : W * 0.06, gw = V ? S.w : W * 0.88;
  const gy = V ? H * 0.235 : H * 0.33, gh = V ? H * 0.52 : H * 0.6;
  const rows = ITEMS.length / cols;
  const cw = gw / cols, ch = gh / rows;
  const title = V ? [W / 2, H * 0.17, 190 * u] : [W / 2, H * 0.17, 160 * u];

  return {
    group,
    camera: r.camOf,
    update(f) {
      const { lt, t, ui, fx } = f;
      const dx = r.shift(lt);
      ambience(f, ctx, { dx, seed: 3 });
      smoke(f.bg, W, H, t, { area: [0, H * 0.6, W, H * 0.4], size: Math.min(W, H) * 0.7, count: 6, alpha: 0.1, seed: 33, rise: 0.6 });
      particles(fx, W, H, t, { kind: 'embers', k: 0.7, seed: 17, count: 26 });
      const act = Math.floor((lt - T0) / STEP);
      ui.save();
      ui.translate(dx, 0);
      const [tx, ty, ts] = title;
      splatter(ui, tx, ty - ts * 0.2, ts * 1.2, { p: seg(lt, 0.08, 0.9), seed: 27, alpha: 0.9, drips: 0.5 });
      brushTitle(ui, 'TEX-MEX', tx, ty, { size: ts, font: 'Bangers', p: seg(lt, 0.03, 0.28), glow: 0.8, maxWidth: V ? S.w * 0.9 : W * 0.5 });
      ITEMS.forEach((it, i) => {
        const c = i % cols, rw = Math.floor(i / cols);
        const x = gx + cw * (c + 0.5), y = gy + ch * (rw + 0.5);
        const a = T0 + i * STEP;
        const hl = i === act && lt < T0 + ITEMS.length * STEP + 0.3 ? Math.exp(-(lt - a) / 0.35) : 0;
        card(ui, f, I[it.id], x, y + Math.sin(lt * 1.6 + i) * 3 * u, cw * 0.92, ch * 0.9, { name: it.name, prices: it.prices, p: seg(lt, a, a + 0.32), hl, seed: i, u, t });
        if (lt >= a && lt < a + 0.6) particles(fx, W, H, t, { kind: 'sparks', burst: { x: x + dx, y, t0: t - lt + a, power: 0.6 }, seed: 50 + i, count: 22 });
      });
      ui.restore();
    },
  };
}
