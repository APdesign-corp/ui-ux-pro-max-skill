// ============================================================================
//  06 — HOT DOG (2.5 s) — FACTS §5
//  0.00 whip ; « HOT DOG » + « SAVEUR & CROUSTY » ; 0.30 le hot dog 3D tombe ; 0.55 VUE ÉCLATÉE
//  + les 5 ronds d'ingrédients du menu claquent ; 1.55 réassemblage + HOT DOG 5,00€ ; 2.25 whip
// ============================================================================
import { E, clamp, seg } from '../core/anim.js';
import { createFood, createFoodLights } from '../world/food.js';
import { P, brushTitle, splatter, smoke, streetBackdrop, particles, priceTag, photo } from '../core/obinks.js';
import { ingLabel } from './03-tacos.js';
import { ambience, rig, placeFood, text } from './_kit.js';

const DUR = 2.5;
const ING = [1, 2, 3, 4, 5].map((i) => 'hotdog_ing_' + i);
const T_ING = 0.6, OPEN = [0.5, 0.68], CLOSE = [1.42, 1.56], T_PRICE = 1.56;

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.25, gain: 0.7 },
  { t: 0.08, type: 'slam', gain: 0.85 },
  { t: 0.3, type: 'impact', gain: 0.95 },
  { t: 0.5, type: 'swish', gain: 0.6 },
  ...ING.map((_, i) => ({ t: T_ING + i * 0.12, type: 'pop', gain: 0.5, pan: -0.6 + i * 0.3 })),
  { t: 1.56, type: 'impact', gain: 0.8 },
  { t: 1.6, type: 'hit', gain: 0.9 },
  { t: 2.25, type: 'whip', gain: 0.8 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe, I = world.images || {};
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1.2, rim: 1, fill: 1.1 }));
  const holder = new THREE.Group(), spin = new THREE.Group();
  holder.add(spin); group.add(holder);
  const SPREAD = 1.2;
  const food = createFood('hotdog', {});
  food.group.position.y = -food.height / 2;
  spin.add(food.group);
  const labels = food.layers.filter((l) => !l.minor);
  const r = rig(ctx, { dur: DUR, inT: 0.25 });
  const fit = (fw, fh, ex) => Math.min((fw * r.visW) / food.width, (fh * r.visH) / (ex ? food.explodedHeight(SPREAD) : food.height * 2.2));
  const LY = V ? {
    pos: [0.5, 0.45], sA: fit(0.66, 0.25, false), sB: fit(0.56, 0.3, true),
    title: [W / 2, H * 0.19, 200 * u], sub: [W / 2, H * 0.25, 46 * u],
    ing: ING.map((_, i) => [S.l + S.w * (0.1 + 0.2 * i), H * 0.69]), ingH: S.w * 0.17,
    price: [W / 2, H * 0.69, 160 * u], label: 32 * u,
  } : {
    pos: [0.3, 0.53], sA: fit(0.38, 0.4, false), sB: fit(0.32, 0.6, true),
    title: [W * 0.7, H * 0.22, 210 * u], sub: [W * 0.7, H * 0.34, 50 * u],
    ing: ING.map((_, i) => [W * (0.5 + 0.1 * i), H * 0.8]), ingH: W * 0.08,
    price: [W * 0.7, H * 0.62, 180 * u], label: 30 * u,
  };
  const lamps = V ? [0.12, 0.88] : [0.1, 0.55, 0.95];
  const v = new THREE.Vector3();

  return {
    group,
    camera: r.camOf,
    update(f) {
      const { lt, t, ui, fx } = f;
      const dx = r.shift(lt);
      ambience(f, ctx, { dx, seed: 2 });
      particles(fx, W, H, t, { kind: 'embers', k: 0.7, seed: 16, count: 24 });

      const toB = E.inOutCubic(seg(lt, 0.45, 0.65)) * (1 - E.inOutCubic(seg(lt, 1.4, 1.6)));
      const st = placeFood(r, f, holder, spin, { fx: LY.pos[0], fy: LY.pos[1], s: LY.sA + (LY.sB - LY.sA) * toB, t0: 0.05, land: 0.25, spinBase: -0.35, exit: [2.2, 2.42] });
      const pe = E.outCubic(seg(lt, OPEN[0], OPEN[1])) * (1 - E.inCubic(seg(lt, CLOSE[0], CLOSE[1])));
      food.setExplode(pe, t, { spread: SPREAD, stagger: 0.25, wobble: 1, spin: 0.8 });
      const [hx, hy] = f.project([holder.position.x, holder.position.y, holder.position.z]);
      smoke(ui, W, H, t, { area: [hx - W * 0.25, hy - H * 0.28, W * 0.5, H * 0.2], size: Math.min(W, H) * 0.3, count: 6, alpha: 0.25 * seg(lt, 0.3, 0.6), seed: 12, rise: 1.4 });
      if (st.landed && lt < 1.2) particles(ui, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy + H * 0.04, t0: t - lt + 0.3, power: 0.8 }, seed: 7, count: 30 });

      const la = clamp((pe - 0.6) / 0.3);
      if (la > 0 && holder.visible) labels.forEach((l, j) => {
        const right = j % 2 === 0;
        (right ? food.anchors : food.anchorsL)[l.name].getWorldPosition(v);
        const [x, y] = f.project([v.x, v.y, v.z]);
        ingLabel(ui, x, y, l.label, right ? 1 : -1, la, LY.label, u, null, S);
      });

      ui.save();
      ui.translate(dx, 0);
      const [tx, ty, ts] = LY.title;
      splatter(ui, tx, ty - ts * 0.2, ts * 1.1, { p: seg(lt, 0.08, 0.8), seed: 23, alpha: 0.9, drips: 0.5 });
      brushTitle(ui, 'HOT DOG', tx, ty, { size: ts, font: 'Bangers', p: seg(lt, 0.03, 0.25), glow: 0.7, maxWidth: V ? S.w * 0.9 : W * 0.5 });
      text(ui, 'SAVEUR & CROUSTY', LY.sub[0], LY.sub[1], { size: LY.sub[2], a: seg(lt, 0.2, 0.35), color: P.yellow });
      // ronds d'ingrédients (photos du menu)
      const iOut = E.inCubic(seg(lt, 1.4, 1.55));
      ING.forEach((id, i) => {
        const [x, y] = LY.ing[i];
        const q = seg(lt, T_ING + i * 0.12, T_ING + i * 0.12 + 0.3);
        if (q <= 0 || iOut >= 1) return;
        ui.save(); ui.globalAlpha = 1 - iOut;
        photo(ui, I[id], x, y + iOut * 60 * u, { h: LY.ingH, p: q, glow: 0.4, shadow: 0.6 });
        ui.restore();
      });
      const [px, py, psz] = LY.price;
      priceTag(ui, px, py, { price: '5,00€', label: 'HOT DOG', size: psz, p: seg(lt, T_PRICE, T_PRICE + 0.3), color: 'yellow', rotate: -0.03, t });
      if (lt > T_PRICE) particles(fx, W, H, t, { kind: 'sparks', burst: { x: px + dx, y: py, t0: t - lt + T_PRICE, power: 0.9 }, seed: 29 });
      ui.restore();
    },
  };
}
