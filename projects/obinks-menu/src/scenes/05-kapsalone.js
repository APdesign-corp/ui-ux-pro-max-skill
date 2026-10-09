// ============================================================================
//  05 — KAPSALONE (3.5 s) — FACTS §4
//  0.00 la fumée des burgers se dissipe + whip ; « KAPSALONE » claque, « VIANDE ET SAUCE AU CHOIX »
//  0.35 la barquette 3D tombe et s'écrase ; 0.70 VUE ÉCLATÉE (frites, cheddar, viande, tomate,
//  oignon, salade, sauce) ; 0.80 → 2.00 les 5 viandes défilent (une par demi-temps)
//  2.40 réassemblage + KAPSALONE 10,00€ ; 2.80 « Fraîcheur, générosité et plaisir ! » ; 3.25 whip
// ============================================================================
import { E, clamp, seg } from '../core/anim.js';
import { createFood, createFoodLights } from '../world/food.js';
import { P, brushTitle, splatter, smoke, streetBackdrop, particles, priceTag } from '../core/obinks.js';
import { meatTag, ingLabel } from './03-tacos.js';
import { rig, placeFood, text } from './_kit.js';

const DUR = 3.5;
const MEATS = [
  { meat: 'poulet', name: 'POULET MARINÉ', d: 'Mariné pour plus de saveur', color: '#7a2ee0' },
  { meat: 'tenders', name: 'TENDERS', d: 'Croustillants et gourmands', color: '#e3141b' },
  { meat: 'nuggets', name: 'NUGGETS', d: "Moelleux à l'intérieur", color: '#ff8a00' },
  { meat: 'cordonbleu', name: 'CORDON BLEU', d: 'Fondant et savoureux', color: '#1f6bff' },
  { meat: 'hachee', name: 'VIANDE HACHÉE', d: 'Bien assaisonnée et juteuse', color: '#b5131a' },
];
const BEATS = [0.8, 1.1, 1.4, 1.7, 2.0];
const OPEN = [0.6, 0.8], CLOSE = [2.25, 2.42], T_PRICE = 2.42, T_TAG = 2.8;

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: 0.1, type: 'slam', gain: 0.9 },
  { t: 0.35, type: 'impact', gain: 1 },
  { t: 0.6, type: 'swish', gain: 0.7 },
  ...BEATS.map((t, i) => ({ t, type: 'pop', gain: 0.55, pan: -0.5 + i * 0.25 })),
  { t: 2.42, type: 'impact', gain: 0.85 },
  { t: 2.46, type: 'hit', gain: 0.9 },
  { t: 2.8, type: 'shimmer', gain: 0.5 },
  { t: 3.25, type: 'whip', gain: 0.8 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L } = ctx;
  const S = L.safe;
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1.15, rim: 1, fill: 1.1 }));
  const holder = new THREE.Group(), spin = new THREE.Group();
  holder.add(spin); group.add(holder);
  const SPREAD = 1.15;
  const foods = MEATS.map((m) => {
    const food = createFood('kapsalone', { meat: m.meat });
    food.group.position.y = -food.height / 2;
    spin.add(food.group);
    return { food, labels: food.layers.filter((l) => !l.minor) };
  });
  const F0 = foods[0].food;
  const r = rig(ctx, { dur: DUR });
  const fit = (fw, fh, ex) => Math.min((fw * r.visW) / F0.width, (fh * r.visH) / (ex ? F0.explodedHeight(SPREAD) : F0.height * 2.2));
  const LY = V ? {
    pos: [0.5, 0.47], sA: fit(0.7, 0.28, false), sB: fit(0.62, 0.36, true),
    title: [W / 2, H * 0.19, 190 * u], sub: [W / 2, H * 0.245, 44 * u],
    tags: MEATS.map((_, i) => [S.l + S.w * (0.1 + 0.2 * i), H * 0.705]), tagSize: 34 * u, desc: [W / 2, H * 0.745],
    price: [W / 2, H * 0.69, 150 * u], tag: [W / 2, H * 0.755, 54 * u], label: 32 * u,
  } : {
    pos: [0.3, 0.55], sA: fit(0.36, 0.45, false), sB: fit(0.3, 0.68, true),
    title: [W * 0.7, H * 0.2, 200 * u], sub: [W * 0.7, H * 0.31, 46 * u],
    tags: MEATS.map((_, i) => [W * 0.7, H * (0.42 + 0.085 * i)]), tagSize: 30 * u, desc: [W * 0.7, H * 0.86],
    price: [W * 0.7, H * 0.58, 170 * u], tag: [W * 0.7, H * 0.82, 56 * u], label: 30 * u,
  };
  const lamps = V ? [0.1, 0.9] : [0.08, 0.5, 0.92];
  const v = new THREE.Vector3();

  return {
    group,
    camera: r.camOf,
    update(f) {
      const { lt, t, ui, fx } = f;
      const dx = r.shift(lt);
      streetBackdrop(f.bg, W, H, t, { k: 0.6, lamps, parallax: lt * 30 * u - dx * 0.7, seed: 5, light: 0.85 });
      particles(fx, W, H, t, { kind: 'embers', k: 0.7, seed: 15, count: 26 });

      const toB = E.inOutCubic(seg(lt, 0.5, 0.75)) * (1 - E.inOutCubic(seg(lt, 2.3, 2.55)));
      const st = placeFood(r, f, holder, spin, { fx: LY.pos[0], fy: LY.pos[1] - (V ? 0.03 : 0) * toB, s: LY.sA + (LY.sB - LY.sA) * toB, t0: 0.05, land: 0.3, exit: [3.2, 3.42] });
      const pe = E.outCubic(seg(lt, OPEN[0], OPEN[1])) * (1 - E.inCubic(seg(lt, CLOSE[0], CLOSE[1])));
      const mi = lt < BEATS[0] ? 0 : Math.min(4, Math.floor((lt - BEATS[0]) / 0.3));
      foods.forEach((F, i) => {
        F.food.group.visible = i === mi;
        if (i === mi) F.food.setExplode(pe, t, { spread: SPREAD, stagger: 0.25, wobble: 1, spin: 0.8 });
      });
      const [hx, hy] = f.project([holder.position.x, holder.position.y, holder.position.z]);
      smoke(ui, W, H, t, { area: [hx - W * 0.25, hy - H * 0.3, W * 0.5, H * 0.2], size: Math.min(W, H) * 0.3, count: 7, alpha: 0.25 * seg(lt, 0.35, 0.7), seed: 9, rise: 1.4 });
      if (st.landed && lt < 1.3) particles(ui, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy + H * 0.05, t0: t - lt + 0.35, power: 0.8 }, seed: 6, count: 34 });
      if (lt >= CLOSE[1] && lt < 3.2) particles(ui, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy, t0: t - lt + CLOSE[1], power: 0.7 }, seed: 11, count: 30 });

      // étiquettes d'ingrédients
      const la = clamp((pe - 0.6) / 0.3);
      if (la > 0 && holder.visible) {
        const F = foods[mi];
        F.labels.forEach((l, j) => {
          const right = V ? j % 2 === 0 : j % 2 === 0;
          (right ? F.food.anchors : F.food.anchorsL)[l.name].getWorldPosition(v);
          const [x, y] = f.project([v.x, v.y, v.z]);
          const isMeat = l.name === 'viande';
          ingLabel(ui, x, y, isMeat ? MEATS[mi].name : l.label, right ? 1 : -1, la, LY.label, u, isMeat ? MEATS[mi].color : null, S);
        });
      }

      ui.save();
      ui.translate(dx, 0);
      // titre
      const tOut = E.inCubic(seg(lt, 2.3, 2.45));
      const [tx, ty, ts] = LY.title;
      splatter(ui, tx, ty - ts * 0.2, ts * 1.1, { p: seg(lt, 0.1, 0.9), seed: 21, alpha: 0.9 * (1 - tOut), drips: 0.5 });
      ui.save(); ui.globalAlpha = 1 - tOut;
      brushTitle(ui, 'KAPSALONE', tx, ty, { size: ts, font: 'Bangers', p: seg(lt, 0.05, 0.3), glow: 0.7, maxWidth: V ? S.w * 0.92 : W * 0.5 });
      ui.restore();
      text(ui, 'VIANDE ET SAUCE AU CHOIX', LY.sub[0], LY.sub[1], { size: LY.sub[2], a: seg(lt, 0.3, 0.45) * (1 - tOut), color: P.yellow });
      // 5 viandes
      const gOut = E.inCubic(seg(lt, 2.25, 2.4));
      if (lt >= BEATS[0] - 0.02 && gOut < 1) {
        MEATS.forEach((m, i) => {
          const [x, y] = LY.tags[i];
          const q = seg(lt, BEATS[i] - 0.02, BEATS[i] + 0.25);
          ui.save(); ui.globalAlpha = (i === mi ? 1 : 0.6) * (1 - gOut);
          meatTag(ui, x, y, V ? m.name.replace(' ', '\n') : m.name, m.color, LY.tagSize * (i === mi ? 1.12 : 1), q, 40 + i, i % 2 ? 0.035 : -0.035);
          ui.restore();
        });
        text(ui, MEATS[mi].d, LY.desc[0], LY.desc[1] + (V ? 40 * u : 0), { size: 40 * u, font: 'Kaushan Script', weight: 400, a: (1 - gOut) * seg(lt, BEATS[mi], BEATS[mi] + 0.1) });
      }
      // prix + accroche
      const [px, py, psz] = LY.price;
      priceTag(ui, px, py, { price: '10,00€', label: 'KAPSALONE', size: psz, p: seg(lt, T_PRICE, T_PRICE + 0.3), color: 'yellow', t });
      if (lt > T_PRICE) particles(fx, W, H, t, { kind: 'sparks', burst: { x: px + dx, y: py, t0: t - lt + T_PRICE, power: 0.9 }, seed: 19 });
      text(ui, 'Fraîcheur, générosité et plaisir !', LY.tag[0], LY.tag[1] + (V ? 40 * u : 0), { size: LY.tag[2], font: 'Kaushan Script', weight: 400, a: seg(lt, T_TAG, T_TAG + 0.2), maxW: V ? S.w : W * 0.5, glow: 0.4 });
      ui.restore();

      // fumée d'entrée (raccord burgers) qui se dissipe
      const fog = 1 - E.outCubic(seg(lt, 0, 0.4));
      if (fog > 0) {
        ui.save(); ui.globalAlpha = 0.9 * fog; ui.fillStyle = P.bg; ui.fillRect(0, 0, W, H); ui.restore();
        smoke(ui, W, H, t, { area: [0, 0, W, H], size: Math.min(W, H) * 0.9, count: 9, alpha: 0.5 * fog, seed: 44, rise: 0.3 });
      }
    },
  };
}
