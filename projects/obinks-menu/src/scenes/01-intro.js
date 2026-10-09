// ============================================================================
//  VITRINE PROVISOIRE du kit graphique O'BINKS (src/core/obinks.js) + des découpes du menu
//  (assets/menu/). À REMPLACER par l'agent « intro ». Sert d'exemple d'utilisation de chaque
//  fonction du kit, dans les deux formats (ctx.V = vertical 9:16).
//    A 0 → 1.0   rue de nuit, éclaboussure + logo en impact, TASTE THE DIFFERENCE, étincelles
//    B 1.0 → 2.0 nappe à carreaux, Crousty Binks + fumée + miettes, étiquette 10,00€
//    C 2.0 → 3.0 cadre néon qui grésille, O'CHEESY, étiquettes SEUL 6,00€ / MENU 10,00€, braises
//    D 3.0 → 3.5 balayage de pinceau rouge (paintWipe) jusqu'au plein écran
//  Image 0 : noir #0a0a0b + petite lueur rouge au centre (contrat de boucle, DIRECTION.md §3).
// ============================================================================
import { E, clamp, lerp, seg, pulse } from '../core/anim.js';
import { seedPoint } from '../core/type.js';
import {
  P, brushStroke, splatter, brushTitle, priceTag, neonFrame, smoke, streetBackdrop, checkered, particles,
  photo, paintWipe, splatCover,
} from '../core/obinks.js';

export const cues = [
  { t: 0.25, type: 'splash', gain: 1 },
  { t: 0.3, type: 'impact', gain: 1.1 },
  { t: 0.55, type: 'swish', gain: 0.6 },
  { t: 0.8, type: 'whoosh', dur: 0.2, gain: 0.8 },
  { t: 1.05, type: 'pop', gain: 0.8 },
  { t: 1.25, type: 'crunch', gain: 0.9 },
  { t: 1.3, type: 'sizzle', dur: 0.6, gain: 0.5 },
  { t: 1.45, type: 'hit', gain: 0.9 },
  { t: 1.8, type: 'splash', gain: 1 },
  { t: 2.05, type: 'zap', gain: 0.8 },
  { t: 2.3, type: 'hit', gain: 0.9 },
  { t: 2.45, type: 'hit', gain: 0.7 },
  { t: 3.0, type: 'whoosh', dur: 0.45, gain: 1 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const group = new THREE.Group();
  const I = world.images || {};
  const S = L.safe;

  // ---- mise en page (calculée une fois)
  const lay = V ? {
    logo: { x: W / 2, y: H * 0.42, w: S.w * 0.96 },
    slogan: { x: W / 2, size: 66 * u },
    title: { x: W / 2, y: S.t + 150 * u, size: 118 * u },
    crousty: { x: W / 2, y: H * 0.42, w: S.w * 1.0 },
    coca: { x: S.l + 70 * u, y: H * 0.3, h: H * 0.17 },
    cloth: [0, H * 0.47, W, H * 0.53],
    tag: { x: W / 2, y: H * 0.665, size: 190 * u },
    frame: [S.l, H * 0.25, S.w, H * 0.33],
    burger: { x: W / 2, y: H * 0.43, w: S.w * 0.86 },
    tagA: { x: W * 0.285, y: H * 0.69 }, tagB: { x: W * 0.715, y: H * 0.69 }, tagSize: 132 * u,
  } : {
    logo: { x: W / 2, y: H * 0.42, w: W * 0.5 },
    slogan: { x: W / 2, size: 74 * u },
    title: { x: W * 0.74, y: H * 0.24, size: 116 * u },
    crousty: { x: W * 0.36, y: H * 0.5, w: W * 0.44 },
    coca: { x: W * 0.1, y: H * 0.52, h: H * 0.5 },
    cloth: [0, H * 0.6, W, H * 0.4],
    tag: { x: W * 0.75, y: H * 0.56, size: 200 * u },
    frame: [W * 0.06, H * 0.12, W * 0.5, H * 0.76],
    burger: { x: W * 0.31, y: H * 0.52, w: W * 0.42 },
    tagA: { x: W * 0.632, y: H * 0.64 }, tagB: { x: W * 0.87, y: H * 0.64 }, tagSize: 132 * u,
  };
  const lamps = V ? [0.12, 0.88] : [0.1, 0.5, 0.9];

  return {
    group,
    camera(lt) {
      return { pos: [Math.sin(lt * 0.6) * 0.04, 0, 5], target: [0, 0, 0], roll: 0, fov: 35 };
    },
    update(f) {
      const t = f.lt, bg = f.bg, ui = f.ui, fx = f.fx;
      const ph = t < 1 ? 0 : t < 2 ? 1 : 2;

      // ---------------- fond : rue de nuit (le lampadaire central s'allume en A)
      const street = seg(t, 0.2, 0.55) * (ph === 2 ? 0.8 : 1);
      streetBackdrop(bg, W, H, f.t, { k: street, lamps, parallax: t * 60 * u, light: ph === 1 ? 0.75 : 1, seed: 2 });
      seedPoint(fx, W, H, 1 - seg(t, 0, 0.3));

      if (ph === 0) {
        // ---------------- A : impact du logo
        const L0 = lay.logo, lg = I.logo;
        const lh = lg ? (L0.w * lg.h) / lg.w : L0.w * 0.4;
        splatter(ui, L0.x, L0.y, L0.w * 0.42, { p: seg(t, 0.25, 1.0), seed: 4 });
        particles(fx, W, H, f.t, { kind: 'sparks', burst: { x: L0.x, y: L0.y, t0: 0.3, power: 1.2 }, seed: 3 });
        if (lg) photo(ui, lg, L0.x, L0.y, { w: L0.w, p: seg(t, 0.28, 0.55), glow: 0.5 });
        const sy = L0.y + lh / 2 + lay.slogan.size * 1.1;
        brushStroke(ui, L0.x, sy - lay.slogan.size * 0.32, L0.w * 0.86, lay.slogan.size * 1.25, { p: seg(t, 0.5, 0.72), seed: 2, color: P.red, angle: -0.04 });
        brushTitle(ui, 'TASTE THE DIFFERENCE', L0.x, sy, { size: lay.slogan.size, p: seg(t, 0.55, 0.85), maxWidth: L0.w * 0.9, glow: 0.3 });
        f.post.flash = Math.max(f.post.flash, pulse(t, 0.3, 0.01, 0.18) * 0.45);
        f.post.flashColor = [1, 0.35, 0.3];
        paintWipe(ui, W, H, seg(t, 0.8, 1.0), { seed: 5 });
      } else if (ph === 1) {
        // ---------------- B : Crousty Binks
        const q = t - 1;
        checkered(ui, ...lay.cloth, { p: seg(q, 0, 0.3), skew: 0.2, cols: V ? 9 : 14 });
        const C0 = lay.crousty, cr = I.crousty;
        const ch = cr ? (C0.w * cr.h) / cr.w : C0.w * 0.8;
        if (I.coca_cherry) photo(ui, I.coca_cherry, lay.coca.x, lay.coca.y, { h: lay.coca.h, p: seg(q, 0.12, 0.4), shadow: 0.8, rot: -0.06 });
        if (cr) photo(ui, cr, C0.x, C0.y, { w: C0.w, p: seg(q, 0.02, 0.32), shadow: 1, scale: 1 + 0.03 * Math.sin(q * 3) });
        smoke(ui, W, H, f.t, { area: [C0.x - C0.w * 0.32, C0.y - ch * 0.75, C0.w * 0.64, ch * 0.5], size: C0.w * 0.42, count: 9, alpha: 0.42 * seg(q, 0.1, 0.4), seed: 3, rise: 1.6 });
        particles(ui, W, H, f.t, { kind: 'crumbs', burst: { x: C0.x, y: C0.y - ch * 0.1, t0: 1.25, power: 0.9 }, seed: 6 });
        brushTitle(ui, 'CROUSTY BINKS', lay.title.x, lay.title.y, { size: lay.title.size, p: seg(q, 0.08, 0.38), maxWidth: V ? S.w : W * 0.44, colorAt: (i) => (i < 7 ? P.white : P.neon) });
        priceTag(ui, lay.tag.x, lay.tag.y, { price: '10,00€', label: 'CROUSTY BINKS', sub: 'BOISSON COMPRISE !', size: lay.tag.size, p: seg(q, 0.4, 0.75), t: f.t, rotate: -0.04 });
        splatCover(ui, W, H, seg(q, 0.78, 1.0), { seed: 9, x: lay.tag.x, y: lay.tag.y });
      } else {
        // ---------------- C : O'CHEESY dans un cadre néon
        const q = t - 2;
        ui.save(); ui.globalAlpha = 1 - seg(q, 0, 0.14); ui.fillStyle = P.red; ui.fillRect(0, 0, W, H); ui.restore();
        const [fx0, fy0, fw, fh] = lay.frame;
        neonFrame(ui, fx0, fy0, fw, fh, { p: seg(q, 0.02, 0.3), flicker: 0.8, t: f.t, seed: 2, screws: true });
        particles(fx, W, H, f.t, { kind: 'embers', k: seg(q, 0, 0.3), area: [0, H * 0.3, W, H * 0.7], seed: 4 });
        particles(fx, W, H, f.t, { kind: 'sparks', burst: { x: fx0, y: fy0, t0: 2.05, power: 0.8 }, seed: 8 });
        const B0 = lay.burger;
        if (I.burger_ocheesy) photo(ui, I.burger_ocheesy, B0.x, B0.y, { w: B0.w, p: seg(q, 0.1, 0.4), shadow: 1, glow: 0.35 });
        brushTitle(ui, "O'CHEESY", lay.title.x, V ? lay.title.y : H * 0.3, { size: lay.title.size, p: seg(q, 0.05, 0.35), maxWidth: V ? S.w : W * 0.4, colorAt: (i) => (i < 2 ? P.neon : P.white) });
        priceTag(ui, lay.tagA.x, lay.tagA.y, { price: '6,00€', label: 'SEUL', size: lay.tagSize, p: seg(q, 0.3, 0.62), t: f.t, color: 'white', rotate: -0.05 });
        priceTag(ui, lay.tagB.x, lay.tagB.y, { price: '10,00€', label: 'MENU', size: lay.tagSize, p: seg(q, 0.45, 0.77), t: f.t, rotate: 0.03 });
        paintWipe(ui, W, H, seg(t, 3.0, 3.45), { seed: 11, dir: -1 });
        f.post.flash = Math.max(f.post.flash, pulse(q, 0.05, 0.01, 0.12) * 0.3);
      }
    },
  };
}
