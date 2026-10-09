// ============================================================================
//  10 — FIN (8 s) — FACTS (en-tête) : livraison, façade, horaires, adresse, téléphone, note Google
//  0.00 whip ; « LIVRAISON PARTOUT » + plateau livraison ; 0.5 / 0.9 accroches du menu (capture 9)
//  2.40 la façade (photo du client) dans un cadre néon ; OUVERT TOUS LES JOURS 12H – 22H ;
//  À EMPORTER · LIVRAISON ; adresse ; téléphone ; 4,8 ★ — 61 avis Google
//  5.20 éclaboussure → logo O'BINKS + TASTE THE DIFFERENCE, néons, infos en bas ; 7.6 fondu noir
// ============================================================================
import { E, clamp, seg } from '../core/anim.js';
import { createFoodLights } from '../world/food.js';
import { P, brushTitle, splatter, splatCover, streetBackdrop, particles, photo, neonFrame, smoke } from '../core/obinks.js';
import { rig, text, stars } from './_kit.js';

const DUR = 8, T_INFO = 2.4, T_LOGO = 5.2;

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: 0.08, type: 'slam', gain: 0.9 },
  { t: 0.3, type: 'impact', gain: 0.8 },
  { t: 0.55, type: 'swish', gain: 0.5 },
  { t: 0.95, type: 'swish', gain: 0.5 },
  { t: T_INFO - 0.12, type: 'whoosh', dur: 0.2, gain: 0.7 },
  { t: T_INFO, type: 'impact', gain: 0.85 },
  { t: T_INFO + 0.4, type: 'hit', gain: 0.8 },
  { t: T_INFO + 0.75, type: 'pop', gain: 0.5 },
  { t: T_INFO + 1.05, type: 'pop', gain: 0.5 },
  { t: T_INFO + 1.35, type: 'pop', gain: 0.5 },
  { t: T_INFO + 1.7, type: 'success', gain: 0.6 },
  { t: T_LOGO - 0.3, type: 'riser', dur: 0.3, gain: 0.6 },
  { t: T_LOGO, type: 'boom', gain: 1.1 },
  { t: T_LOGO + 0.5, type: 'shimmer', gain: 0.6 },
  { t: 7.4, type: 'zap', gain: 0.5 },
];

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe, I = world.images || {};
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1, rim: 1, fill: 1 }));
  const r = rig(ctx, { dur: DUR, whipOut: false, push: 0.6 });
  // façade : capture d'écran du client recadrée (sans l'interface de la story)
  let fac = null;
  const fim = I.facade && I.facade.img;
  if (fim && fim.naturalWidth) {
    const k = fim.naturalWidth / 1170, sx = 0, sy = 340 * k, sw = 1170 * k, sh = 1480 * k;
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    c.getContext('2d').drawImage(fim, sx, sy, sw, sh, 0, 0, sw, sh);
    fac = { img: c, w: sw, h: sh };
  }
  const cx = W / 2;
  const LY = V ? {
    t1: [cx, H * 0.18, 150 * u], liv: [cx, H * 0.45, H * 0.3], q1: [cx, H * 0.635], q2: [cx, H * 0.68], q3: [cx, H * 0.725],
    fac: [cx, H * 0.335, H * 0.31], open: [cx, H * 0.535], hours: [cx, H * 0.585], serv: [cx, H * 0.635], addr: [cx, H * 0.675], tel: [cx, H * 0.712], rate: [cx, H * 0.752],
    logo: [cx, H * 0.39, S.w * 0.9], foot: [cx, H * 0.62],
  } : {
    t1: [W * 0.3, H * 0.2, 130 * u], liv: [W * 0.7, H * 0.52, H * 0.78], q1: [W * 0.3, H * 0.42], q2: [W * 0.3, H * 0.52], q3: [W * 0.3, H * 0.62],
    fac: [W * 0.27, H * 0.5, H * 0.84], open: [W * 0.68, H * 0.2], hours: [W * 0.68, H * 0.33], serv: [W * 0.68, H * 0.46], addr: [W * 0.68, H * 0.56], tel: [W * 0.68, H * 0.65], rate: [W * 0.68, H * 0.77],
    logo: [cx, H * 0.4, W * 0.5], foot: [cx, H * 0.78],
  };

  return {
    group,
    camera: r.camOf,
    update(f) {
      const { lt, t, ui, fx } = f;
      const dx = r.shift(lt);
      const lampOn = lt < T_LOGO ? 1 : 0.7 + 0.3 * seg(lt, T_LOGO, T_LOGO + 0.6);
      streetBackdrop(f.bg, W, H, t, { k: 0.6, lamps: V ? [0.1, 0.9] : [0.06, 0.5, 0.94], parallax: lt * 25 * u - dx * 0.7, seed: 10, light: 0.85 * lampOn });
      particles(fx, W, H, t, { kind: 'embers', k: 0.8, seed: 20, count: 30 });
      ui.save();
      ui.translate(dx, 0);

      // ---- A : livraison
      if (lt < T_INFO) {
        const out = E.inCubic(seg(lt, T_INFO - 0.2, T_INFO));
        ui.save(); ui.translate(0, -out * H * 0.3); ui.globalAlpha = 1 - out;
        photo(ui, I.livraison, LY.liv[0], LY.liv[1], { h: LY.liv[2], p: seg(lt, 0.2, 0.55), glow: 0.5, shadow: 0.9 });
        splatter(ui, LY.t1[0], LY.t1[1] - LY.t1[2] * 0.2, LY.t1[2] * 1.3, { p: seg(lt, 0.08, 0.9), seed: 51, alpha: 0.9, drips: 0.5 });
        brushTitle(ui, 'LIVRAISON', LY.t1[0], LY.t1[1] - LY.t1[2] * 0.45, { size: LY.t1[2], font: 'Bangers', p: seg(lt, 0.03, 0.25), glow: 0.8, maxWidth: V ? S.w * 0.9 : W * 0.5 });
        brushTitle(ui, 'PARTOUT', LY.t1[0], LY.t1[1] + LY.t1[2] * 0.55, { size: LY.t1[2], font: 'Bangers', p: seg(lt, 0.12, 0.32), glow: 0.8, color: P.yellow, maxWidth: V ? S.w * 0.9 : W * 0.5 });
        const mw = V ? S.w : W * 0.5;
        text(ui, 'Grève de bus ? Pas envie de te déplacer ?', LY.q1[0], LY.q1[1], { size: 40 * u, a: seg(lt, 0.5, 0.65), maxW: mw });
        text(ui, 'On te livre directement chez toi !', LY.q2[0], LY.q2[1], { size: 50 * u, font: 'Kaushan Script', weight: 400, a: seg(lt, 0.9, 1.05), color: P.yellow, maxW: mw, glow: 0.4 });
        text(ui, 'Indique-nous simplement ta commande détaillée', LY.q3[0], LY.q3[1], { size: 28 * u, a: seg(lt, 1.3, 1.45), maxW: mw, weight: 500 });
        text(ui, "et ton adresse complète, et on s'occupe du reste.", LY.q3[0], LY.q3[1] + 36 * u, { size: 28 * u, a: seg(lt, 1.3, 1.45), maxW: mw, weight: 500 });
        ui.restore();
      }

      // ---- B : façade + infos pratiques
      if (lt >= T_INFO - 0.05 && lt < T_LOGO + 0.2) {
        const out = E.inCubic(seg(lt, T_LOGO - 0.1, T_LOGO + 0.15));
        ui.save(); ui.globalAlpha = 1 - out;
        const [fx0, fy0, fh] = LY.fac;
        const q = seg(lt, T_INFO, T_INFO + 0.35);
        if (fac) {
          const zoom = 1 + 0.06 * seg(lt, T_INFO, T_LOGO);
          const b = photo(ui, fac, fx0, fy0, { h: fh, p: q, shadow: 0.8, scale: zoom });
          if (b) neonFrame(ui, b.x - 8 * u, b.y - 8 * u, b.w + 16 * u, b.h + 16 * u, { p: seg(lt, T_INFO + 0.1, T_INFO + 0.6), t, seed: 71, radius: 18 * u, width: 5 * u, glow: 1, flicker: 0.3 });
        }
        const mw = V ? S.w : W * 0.5;
        text(ui, 'OUVERT TOUS LES JOURS', LY.open[0], LY.open[1], { size: (V ? 54 : 64) * u, a: seg(lt, T_INFO + 0.4, T_INFO + 0.55), maxW: mw, color: '#ffffff', glow: 0.3 });
        text(ui, '12H – 22H', LY.hours[0], LY.hours[1], { size: (V ? 96 : 130) * u, font: 'Anton', weight: 400, a: seg(lt, T_INFO + 0.45, T_INFO + 0.6), color: P.yellow, glow: 0.6 });
        text(ui, 'À EMPORTER  ·  LIVRAISON', LY.serv[0], LY.serv[1], { size: (V ? 44 : 52) * u, a: seg(lt, T_INFO + 0.75, T_INFO + 0.9), color: P.neon, maxW: mw, glow: 0.5 });
        text(ui, 'Rue St Nicolas 460, 4000 Liège', LY.addr[0], LY.addr[1], { size: (V ? 40 : 46) * u, a: seg(lt, T_INFO + 1.05, T_INFO + 1.2), maxW: mw, weight: 600 });
        text(ui, '☎  0472 65 40 43', LY.tel[0], LY.tel[1], { size: (V ? 50 : 60) * u, font: 'Bebas Neue', weight: 400, a: seg(lt, T_INFO + 1.35, T_INFO + 1.5), maxW: mw });
        const ra = seg(lt, T_INFO + 1.7, T_INFO + 1.9);
        const rs = (V ? 1 : 1.25) * u;
        text(ui, '4,8', LY.rate[0] - 250 * rs, LY.rate[1], { size: 64 * rs, font: 'Anton', weight: 400, a: ra, color: P.yellow, align: 'center' });
        stars(ui, LY.rate[0] + 10 * rs, LY.rate[1], 26 * rs, 4.8 * clamp(seg(lt, T_INFO + 1.7, T_INFO + 2.3)), { a: ra });
        text(ui, '61 avis Google', LY.rate[0] + 10 * rs, LY.rate[1] + 46 * rs, { size: 30 * rs, a: ra, weight: 500 });
        ui.restore();
      }

      // ---- C : logo final
      if (lt >= T_LOGO - 0.1) {
        const sp = seg(lt, T_LOGO - 0.1, T_LOGO + 0.5);
        splatter(ui, cx, LY.logo[1], Math.min(W, H) * 0.42, { p: sp, seed: 81, alpha: 0.95, drips: 1 });
        const q = seg(lt, T_LOGO, T_LOGO + 0.4);
        const breathe = 1 + 0.015 * Math.sin((lt - T_LOGO) * 2.2);
        photo(ui, I.logo_slogan || I.logo, cx, LY.logo[1], { w: LY.logo[2], p: q, glow: 0.9, scale: breathe });
        const fa = seg(lt, T_LOGO + 0.8, T_LOGO + 1.1);
        const fy = LY.foot[1];
        text(ui, 'Rue St Nicolas 460, 4000 Liège', cx, fy, { size: (V ? 38 : 40) * u, a: fa, maxW: V ? S.w : W * 0.7, weight: 600 });
        text(ui, '☎ 0472 65 40 43   ·   12H – 22H TOUS LES JOURS', cx, fy + (V ? 52 : 56) * u, { size: (V ? 36 : 40) * u, a: fa, maxW: V ? S.w : W * 0.7, color: P.yellow });
        text(ui, 'À EMPORTER  ·  LIVRAISON PARTOUT', cx, fy + (V ? 104 : 112) * u, { size: (V ? 34 : 38) * u, a: fa, maxW: V ? S.w : W * 0.7, color: P.neon, glow: 0.4 });
        if (lt > T_LOGO) particles(fx, W, H, t, { kind: 'sparks', burst: { x: cx + dx, y: LY.logo[1], t0: t - lt + T_LOGO, power: 1.3 }, seed: 91, count: 60 });
      }
      ui.restore();
      smoke(ui, W, H, t, { area: [0, H * 0.7, W, H * 0.3], size: Math.min(W, H) * 0.6, count: 6, alpha: 0.14, seed: 77, rise: 0.4 });
      // fondu noir final (boucle vers l'intro)
      const fo = E.inCubic(seg(lt, 7.55, 8));
      if (fo > 0) { ui.save(); ui.globalAlpha = fo; ui.fillStyle = '#000'; ui.fillRect(0, 0, W, H); ui.restore(); }
    },
  };
}
