// ============================================================================
//  08 — DESSERTS (5.5 s) — FACTS §7
//  0.00 whip ; « DESSERTS » ; 0.25 tiramisu 3D tombe ; 0.5 VUE ÉCLATÉE, 4 parfums défilent ;
//  1.45 TIRAMISU 4,50€ ; 1.9 le tiramisu s'envole, le milkshake 3D tombe ; 2.2 → 3.3 les 7
//  parfums (photos du menu en arc) ; 2.4 MILKSHAKE 5,00€ ; 3.6 CRÊPES 5,50€ + GAUFRES 5,50€
//  (photos) + parfums ; 4.3 suppléments 0,50€ ; 5.25 whip
// ============================================================================
import { E, clamp, seg } from '../core/anim.js';
import { createFood, createFoodLights } from '../world/food.js';
import { P, brushTitle, splatter, smoke, streetBackdrop, particles, priceTag, photo } from '../core/obinks.js';
import { ingLabel } from './03-tacos.js';
import { rig, placeFood, text, rubric } from './_kit.js';

const DUR = 5.5;
const TIRA = [['bueno', 'BUENO'], ['oreo', 'OREO'], ['raffaello', 'RAFFAELLO'], ['speculoos', 'SPÉCULOOS']];
const SHAKE = [['fraisebanane', 'FRAISE BANANE'], ['oreo', 'OREO'], ['bueno', 'BUENO'], ['speculoos', 'SPÉCULOOS'], ['snickers', 'SNICKERS'], ['pistache', 'PISTACHE'], ['raffaello', 'RAFFAELLO']];
const TB = [0.6, 0.82, 1.04, 1.26], SB = SHAKE.map((_, i) => 2.2 + i * 0.16);
const T_TP = 1.45, T_SH = 1.9, T_MP = 2.4, T_C = 3.6, T_SUP = 4.3;

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: 0.08, type: 'slam', gain: 0.85 },
  { t: 0.45, type: 'impact', gain: 0.9 },
  ...TB.map((t) => ({ t, type: 'pop', gain: 0.5 })),
  { t: T_TP, type: 'hit', gain: 0.9 },
  { t: T_SH - 0.05, type: 'whoosh', dur: 0.2, gain: 0.6 },
  { t: T_SH + 0.25, type: 'impact', gain: 0.85 },
  ...SB.map((t, i) => ({ t, type: 'pop', gain: 0.45, pan: -0.6 + i * 0.2 })),
  { t: T_MP, type: 'hit', gain: 0.9 },
  { t: T_C - 0.1, type: 'whoosh', dur: 0.2, gain: 0.7 },
  { t: T_C, type: 'slam', gain: 0.9 },
  { t: T_C + 0.25, type: 'hit', gain: 0.8 },
  { t: T_SUP, type: 'shimmer', gain: 0.5 },
  { t: 5.25, type: 'whip', gain: 0.8 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe, I = world.images || {};
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1.15, rim: 1, fill: 1.15 }));
  const mk = (kind, flavor) => {
    const holder = new THREE.Group(), spin = new THREE.Group();
    holder.add(spin); group.add(holder);
    const food = createFood(kind, { flavor });
    food.group.position.y = -food.height / 2;
    spin.add(food.group);
    return { holder, spin, food, labels: food.layers.filter((l) => !l.minor) };
  };
  // un holder par produit, un seul visible à la fois
  const tira = TIRA.map(([fl]) => mk('tiramisu', fl));
  const shake = SHAKE.map(([fl]) => mk('milkshake', fl));
  const SPREAD = 1.1;
  const r = rig(ctx, { dur: DUR, push: 0.25 });
  const fit = (F, fw, fh) => Math.min((fw * r.visW) / F.width, (fh * r.visH) / F.explodedHeight(SPREAD));
  const LY = V ? {
    pos: [0.5, 0.45], sT: fit(tira[0].food, 0.5, 0.3), sM: fit(shake[0].food, 0.45, 0.32),
    title: [W / 2, H * 0.17, 170 * u], flav: [W / 2, H * 0.66], price: [W / 2, H * 0.72, 140 * u],
    arc: [W / 2, H * 0.66, S.w * 0.92, H * 0.075],
    cPh: [[S.l + S.w * 0.27, H * 0.37], [S.l + S.w * 0.73, H * 0.37]], cH: H * 0.17, cPrice: [[S.l + S.w * 0.27, H * 0.5], [S.l + S.w * 0.73, H * 0.5]], cPs: 92 * u,
    cFl: [W / 2, H * 0.585], sup: [W / 2, H * 0.66], sup2: [W / 2, H * 0.7], label: 30 * u,
  } : {
    pos: [0.3, 0.55], sT: fit(tira[0].food, 0.3, 0.55), sM: fit(shake[0].food, 0.26, 0.6),
    title: [W * 0.7, H * 0.16, 170 * u], flav: [W * 0.7, H * 0.36], price: [W * 0.7, H * 0.6, 170 * u],
    arc: [W * 0.7, H * 0.4, W * 0.48, H * 0.17],
    cPh: [[W * 0.27, H * 0.42], [W * 0.73, H * 0.42]], cH: H * 0.4, cPrice: [[W * 0.27, H * 0.7], [W * 0.73, H * 0.7]], cPs: 110 * u,
    cFl: [W / 2, H * 0.83], sup: [W / 2, H * 0.9], sup2: null, label: 28 * u,
  };
  const lamps = V ? [0.1, 0.9] : [0.08, 0.5, 0.92];
  const v = new THREE.Vector3();
  const flavLine = (g, items, act, x, y, size, a, maxW) => {
    // parfums séparés par « · », l'actif en jaune
    const s = items.map((x) => x[1]);
    g.save(); g.font = `600 ${size}px "Oswald"`;
    const sep = '  ·  ';
    let w = g.measureText(s.join(sep)).width;
    let k = maxW && w > maxW ? maxW / w : 1;
    g.restore();
    size *= k; w *= k;
    let px = x - w / 2;
    s.forEach((t, i) => {
      const tw = text(g, t + (i < s.length - 1 ? sep : ''), px, y, { size, align: 'left', a, color: i === act ? P.yellow : '#ffffff', weight: 600 });
      px += tw;
    });
  };

  return {
    group,
    camera: r.camOf,
    update(f) {
      const { lt, t, ui, fx } = f;
      const dx = r.shift(lt);
      streetBackdrop(f.bg, W, H, t, { k: 0.55, lamps, parallax: lt * 30 * u - dx * 0.7, seed: 8, light: 0.8 });
      particles(fx, W, H, t, { kind: 'sparks', k: 0.5, seed: 18, count: 20 });

      // ---- 3D : tiramisu (0 → 1.9) puis milkshake (1.9 → 3.55)
      const ti = lt < TB[0] ? 0 : Math.min(3, Math.floor((lt - TB[0]) / 0.22));
      const si = lt < SB[0] ? 0 : Math.min(6, Math.floor((lt - SB[0]) / 0.16));
      for (const F of [...tira, ...shake]) F.holder.visible = false;
      let cur = null, pe = 0;
      if (lt < T_SH + 0.05) {
        cur = tira[ti];
        placeFood(r, f, cur.holder, cur.spin, { fx: LY.pos[0], fy: LY.pos[1], s: LY.sT, t0: 0.15, land: 0.3, spinBase: -0.4, tilt: 0.35, exit: [T_SH - 0.15, T_SH + 0.05] });
        pe = E.outCubic(seg(lt, 0.5, 0.68)) * (1 - E.inCubic(seg(lt, 1.36, 1.48)));
      } else if (lt < T_C) {
        cur = shake[si];
        placeFood(r, f, cur.holder, cur.spin, { fx: LY.pos[0], fy: LY.pos[1], s: LY.sM, t0: T_SH - 0.05, land: 0.3, spinBase: -0.4, tilt: 0.3, exit: [T_C - 0.2, T_C] });
        pe = E.outCubic(seg(lt, 2.25, 2.42)) * (1 - E.inCubic(seg(lt, 3.3, 3.42)));
      }
      if (cur) {
        cur.food.setExplode(pe, t, { spread: SPREAD, stagger: 0.25, wobble: 1, spin: 0.8 });
        const la = clamp((pe - 0.6) / 0.3);
        if (la > 0 && cur.holder.visible) cur.labels.forEach((l, j) => {
          const right = j % 2 === 0;
          (right ? cur.food.anchors : cur.food.anchorsL)[l.name].getWorldPosition(v);
          const [x, y] = f.project([v.x, v.y, v.z]);
          ingLabel(ui, x, y, l.label, right ? 1 : -1, la, LY.label, u, null, S);
        });
        const [hx, hy] = f.project([cur.holder.position.x, cur.holder.position.y, cur.holder.position.z]);
        if (lt > 0.45 && lt < 1.2) particles(ui, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy, t0: t - lt + 0.45, power: 0.7 }, seed: 14, count: 26 });
      }

      ui.save();
      ui.translate(dx, 0);
      const [tx, ty, ts] = LY.title;
      const tOut = E.inCubic(seg(lt, T_C - 0.15, T_C));
      ui.save(); ui.globalAlpha = 1 - tOut;
      splatter(ui, tx, ty - ts * 0.2, ts * 1.1, { p: seg(lt, 0.08, 0.9), seed: 31, alpha: 0.9, drips: 0.5 });
      brushTitle(ui, 'DESSERTS', tx, ty, { size: ts, font: 'Bangers', p: seg(lt, 0.03, 0.28), glow: 0.7, maxWidth: V ? S.w * 0.9 : W * 0.5 });
      ui.restore();
      const [fxp, fyp] = LY.flav;
      // tiramisu : parfums + prix
      const aT = seg(lt, 0.55, 0.7) * (1 - seg(lt, T_SH - 0.2, T_SH));
      flavLine(ui, TIRA, ti, fxp, V ? fyp + 30 * u : fyp, 40 * u, aT * (1 - seg(lt, T_TP - 0.1, T_TP)), V ? S.w : W * 0.5);
      priceTag(ui, LY.price[0], LY.price[1], { price: '4,50€', label: 'TIRAMISU', size: LY.price[2], p: seg(lt, T_TP, T_TP + 0.3) * (1 - seg(lt, T_SH - 0.15, T_SH)), color: 'yellow', rotate: -0.03, t });
      // milkshakes : arc de photos + parfum actif + prix
      if (lt > SB[0] - 0.1 && lt < T_C) {
        const [ax, ay, aw, ah] = LY.arc;
        const out = seg(lt, T_C - 0.25, T_C);
        SHAKE.forEach(([fl, nm], i) => {
          const q = seg(lt, SB[i] - 0.05, SB[i] + 0.2) * (1 - out);
          const k = i / (SHAKE.length - 1) - 0.5;
          const x = ax + k * aw, y = ay + (V ? 0 : -Math.cos(k * Math.PI) * ah * 0.3);
          ui.save(); ui.globalAlpha = i === si ? 1 : 0.75;
          photo(ui, I['milkshake_' + fl], x, y, { h: V ? H * 0.085 : H * 0.17, p: q, glow: i === si ? 0.8 : 0.15, shadow: 0.6, rot: k * 0.2 });
          ui.restore();
        });
        text(ui, 'MILKSHAKE ' + SHAKE[si][1], LY.arc[0], LY.arc[1] + (V ? H * 0.065 : H * 0.15), { size: 44 * u, a: seg(lt, SB[0], SB[0] + 0.1) * (1 - out), color: P.yellow, maxW: V ? S.w : W * 0.48 });
        priceTag(ui, LY.price[0], V ? H * 0.255 : LY.price[1] + H * 0.1, { price: '5,00€', label: 'MILKSHAKE', size: LY.price[2] * (V ? 0.8 : 0.9), p: seg(lt, T_MP, T_MP + 0.3) * (1 - out), color: 'white', rotate: 0.03, t });
      }
      // crêpes & gaufres + suppléments
      if (lt >= T_C - 0.05) {
        const q1 = seg(lt, T_C, T_C + 0.3), q2 = seg(lt, T_C + 0.12, T_C + 0.42);
        rubric(ui, 'CRÊPES & GAUFRES', W / 2, V ? H * 0.2 : H * 0.14, (V ? 84 : 90) * u, seg(lt, T_C - 0.05, T_C + 0.3), 3);
        photo(ui, I.crepes, LY.cPh[0][0], LY.cPh[0][1], { h: LY.cH, p: q1, glow: 0.5, shadow: 0.8, rot: -0.04 });
        photo(ui, I.gaufre, LY.cPh[1][0], LY.cPh[1][1], { h: LY.cH * 0.95, p: q2, glow: 0.5, shadow: 0.8, rot: 0.04 });
        priceTag(ui, LY.cPrice[0][0], LY.cPrice[0][1], { price: '5,50€', label: 'CRÊPES', size: LY.cPs, p: seg(lt, T_C + 0.25, T_C + 0.5), color: 'yellow', rotate: -0.04, t });
        priceTag(ui, LY.cPrice[1][0], LY.cPrice[1][1], { price: '5,50€', label: 'GAUFRES', size: LY.cPs, p: seg(lt, T_C + 0.35, T_C + 0.6), color: 'yellow', rotate: 0.04, t });
        text(ui, 'NUTELLA  ·  SPÉCULOOS  ·  OREO  ·  BUENO', LY.cFl[0], LY.cFl[1], { size: 42 * u, a: seg(lt, T_C + 0.45, T_C + 0.6), maxW: V ? S.w : W * 0.8 });
        const sa = seg(lt, T_SUP, T_SUP + 0.2);
        if (V) {
          text(ui, 'SUPPLÉMENTS', LY.sup[0], LY.sup[1], { size: 34 * u, a: sa, color: P.neon, glow: 0.5 });
          text(ui, 'FRAISE 0,50€  ·  COULIS 0,50€  ·  BOULE DE GLACE 0,50€', LY.sup2[0], LY.sup2[1], { size: 36 * u, a: sa, color: P.yellow, maxW: S.w });
        } else {
          text(ui, 'SUPPLÉMENTS : FRAISE 0,50€  ·  COULIS 0,50€  ·  BOULE DE GLACE 0,50€', LY.sup[0], LY.sup[1], { size: 40 * u, a: sa, color: P.yellow, maxW: W * 0.85 });
        }
        if (lt > T_C) particles(fx, W, H, t, { kind: 'sparks', burst: { x: W / 2 + dx, y: LY.cPh[0][1], t0: t - lt + T_C, power: 1 }, seed: 61 });
      }
      ui.restore();
      smoke(ui, W, H, t, { area: [0, H * 0.75, W, H * 0.25], size: Math.min(W, H) * 0.5, count: 5, alpha: 0.12, seed: 71, rise: 0.4 });
    },
  };
}
