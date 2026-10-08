// 0–3 s — INTRO : obscurité → particules vertes → tracés SVG d'une interface tech →
// convergence + morphing du téléphone en pastille logo → impact → "GSM CENTER" construit
// par la lumière → push-in + whip pan vers la scène suivante.

import { E, seg, win, pulse, lerp, rng, TAU, rgba } from '../core/anim.js';
import { morphPoints, polyPath } from '../core/svg.js';
import {
  drawSvg, drawText, strokeTextProgress, textSweep, textPoints, fitSize, flare, sparks,
  shockRing, streak, radialGlow,
} from '../core/draw.js';

export function drawBadge(g, x, y, side, cfg, alpha = 1, scale = 1) {
  if (alpha <= 0 || scale <= 0) return;
  const s = side * scale;
  g.save();
  g.globalAlpha = alpha;
  const grd = g.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
  grd.addColorStop(0, cfg.colors.neon2);
  grd.addColorStop(1, cfg.colors.teal);
  g.fillStyle = grd;
  g.beginPath();
  g.roundRect(x - s / 2, y - s / 2, s, s, s * 0.3);
  g.fill();
  // reflet supérieur
  const hl = g.createLinearGradient(x, y - s / 2, x, y);
  hl.addColorStop(0, 'rgba(255,255,255,0.45)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.roundRect(x - s / 2, y - s / 2, s, s * 0.5, [s * 0.3, s * 0.3, 0, 0]);
  g.fill();
  g.font = `700 ${s * 0.62}px "${cfg.font.family}"`;
  g.letterSpacing = '0px';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = cfg.colors.badgeInk;
  g.fillText(cfg.brand.badgeLetter, x, y + s * 0.04);
  g.restore();
}

export default function createIntro({ cfg, assets, W, H, u }) {
  const C = cfg.colors;
  const sym = assets.intro;
  const badge = assets.badge.get('badge');
  const phone = sym.get('phone');
  const minWH = Math.min(W, H);
  const isV = H > W;
  const title = cfg.brand.name;
  const split = cfg.brand.nameSplit;

  // Mise en page
  const probe = document.createElement('canvas').getContext('2d');
  const size = fitSize(probe, title, 700, -0.02, W * (isV ? 0.86 : 0.64), H * 0.2);
  const cx = W / 2, cy = H / 2;
  // la pastille logo se forme au centre (le nom complet apparaît sur « GSM Center », scène 2)
  const bx = cx, by = cy, bside = minWH * 0.15;
  void size;
  const symScale = (0.4 * minWH) / 400;

  // Particules : affectation d'une cible sur les tracés du symbole
  const r = rng(2025);
  const strokeItems = sym.items.filter((it) => it.id !== 'phone-island');
  const totalLen = strokeItems.reduce((a, it) => a + it.length, 0);
  const N = Math.round(320 * cfg.vfx.particles);
  const parts = [];
  for (let i = 0; i < N; i++) {
    let s = ((i + r()) / N) * totalLen;
    let item = strokeItems[0];
    for (const it of strokeItems) {
      if (s <= it.length) { item = it; break; }
      s -= it.length;
    }
    parts.push({
      target: item.point(Math.min(s, item.length)),
      a0: r() * TAU,
      r0: (0.25 + r() * 0.8) * 0.5 * minWH,
      w: (0.5 + r() * 1.3) * (r() < 0.5 ? -1 : 1),
      ta: 0.05 + r() * 0.85,
      d: r() * 0.2,
      sz: (1.6 + r() * 2.6) * u,
    });
  }
  const NM = 180;
  const phonePts = phone.sample(NM);
  const badgePts = badge.sample(NM);

  const center = (lt) => {
    const k = E.inOutCubic(seg(lt, 1.4, 2.0));
    return [lerp(cx, bx, k), lerp(cy, by, k)];
  };
  const symTf = (lt) => {
    const c = center(lt);
    const conv = E.inExpo(seg(lt, 1.5, 2.0));
    return { x: c[0], y: c[1], s: symScale * (1 - 0.94 * conv), rot: E.inQuart(seg(lt, 1.45, 2.0)) * 1.4, origin: sym.center };
  };
  const mapPt = (p, tf) => {
    const x = (p[0] - tf.origin[0]) * tf.s, y = (p[1] - tf.origin[1]) * tf.s;
    const c = Math.cos(tf.rot || 0), s = Math.sin(tf.rot || 0);
    return [tf.x + x * c - y * s, tf.y + x * s + y * c];
  };
  const orbit = (pa, t, c) => {
    const a = pa.a0 + pa.w * (t + 0.9 * t * t);
    const rr = pa.r0 * (1 - 0.2 * t);
    return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * (isV ? 1 : 0.72)];
  };

  return {
    update(f) {
      const { lt, fx, ui, post } = f;
      if (f.owner) {
        f.camera([0.3 * Math.sin(lt * 0.4), 0.1, 9 - lt * 0.25], [0, 0, 0], 30);
        f.world.studio.update(f.t, {
          glow: 0.12 + 1.1 * pulse(lt, 2.0, 0.02, 0.6) + 0.35 * seg(lt, 2.0, 3.0),
          beams: 0.7 * seg(lt, 2.0, 2.7), dust: seg(lt, 0, 1.6), motes: seg(lt, 0.3, 1.8), grid: 0,
        });
      }

      // Push-in de sortie appliqué à toute la composition 2D
      const ex = E.inExpo(seg(lt, 2.72, 3.0));
      const zoom = 1 + ex * 0.9;
      const fade = 1 - E.inCubic(seg(lt, 2.82, 3.0));
      for (const g of [fx, ui]) {
        g.save();
        g.translate(cx, cy);
        g.scale(zoom, zoom);
        g.translate(-cx, -cy);
      }
      post.blur = [ex * 0.07, 0];
      post.zoomBlur += ex * 0.05;
      post.glitch += win(lt, 2.84, 2.88, 2.91, 2.96) * 0.7;

      // Filet de lumière anamorphique dans le noir
      const ls = seg(lt, 0.1, 0.9);
      if (ls > 0 && ls < 1) {
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        const x = lerp(-W * 0.2, W * 1.2, E.inOutSine(ls));
        streak(fx, x - W * 0.35, cy, x, cy, 2 * u, C.neon, 0.5 * Math.sin(ls * Math.PI));
        fx.restore();
      }

      // --- Tracés SVG du symbole
      const tf = symTf(lt);
      const symAlpha = (1 - E.inCubic(seg(lt, 1.62, 2.0))) * fade;
      if (symAlpha > 0 && lt > 0.6) {
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        const ring = (id, a, b, rot) =>
          drawSvg(fx, sym.get(id), { ...tf, rot: tf.rot + rot }, { p: E.inOutCubic(seg(lt, a, b)), width: 1.8 * u, color: C.neon, alpha: symAlpha, glow: 1 });
        ring('ring-outer', 0.7, 1.35, lt * 0.35);
        ring('ring-main', 0.78, 1.32, -lt * 0.25);
        ring('ring-inner', 0.86, 1.4, lt * 0.5);
        ['arc-a', 'arc-b', 'arc-c', 'arc-d'].forEach((id, i) =>
          drawSvg(fx, sym.get(id), { ...tf, rot: tf.rot + lt * (0.9 + i * 0.1) * (i % 2 ? -1 : 1) }, {
            p: E.outCubic(seg(lt, 0.75 + i * 0.04, 1.2 + i * 0.04)), width: 3 * u, color: C.teal, alpha: symAlpha, glow: 1,
          }),
        );
        drawSvg(fx, sym.get('ticks'), tf, { p: seg(lt, 1.05, 1.3), width: 2 * u, color: '#d8ffe0', alpha: symAlpha });
        sym.group('traces').forEach((it, i) => {
          const p = E.outCubic(seg(lt, 1.0 + i * 0.03, 1.32 + i * 0.03));
          drawSvg(fx, it, tf, { p, width: 2.2 * u, color: C.neon, alpha: symAlpha, glow: 1 });
        });
        sym.group('nodes').forEach((it, i) => {
          const a = seg(lt, 1.3 + i * 0.03, 1.4 + i * 0.03) * symAlpha;
          drawSvg(fx, it, tf, { p: 1, width: 2 * u, color: '#d8ffe0', alpha: a, fill: rgba(C.neon, 0.9), fillAlpha: a });
        });
        drawSvg(fx, sym.get('phone-island'), { ...tf, s: symScale, rot: 0, x: center(lt)[0], y: center(lt)[1] }, {
          p: seg(lt, 1.2, 1.35), width: 3 * u, color: C.white, alpha: 1 - seg(lt, 1.45, 1.6),
        });
        fx.restore();
      }

      // --- Téléphone → pastille logo (morphing SVG)
      if (lt > 0.85 && lt < 2.15) {
        const c = center(lt);
        const tfP = { x: c[0], y: c[1], s: symScale, rot: 0, origin: sym.center };
        const tfB = { x: bx, y: by, s: bside / 150, rot: 0, origin: assets.badge.center };
        const m = E.inOutExpo(seg(lt, 1.45, 1.98));
        const draw = E.inOutCubic(seg(lt, 0.9, 1.4));
        const a = phonePts.map((p) => mapPt(p, tfP));
        const b = badgePts.map((p) => mapPt(p, tfB));
        const pts = morphPoints(a, b, m);
        const shown = Math.max(2, Math.floor(pts.length * draw));
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        polyPath(fx, pts.slice(0, shown), draw >= 1);
        fx.lineJoin = 'round';
        fx.strokeStyle = rgba(C.neon, 0.25);
        fx.lineWidth = 12 * u;
        fx.stroke();
        fx.strokeStyle = '#e8ffe8';
        fx.lineWidth = 3 * u;
        fx.stroke();
        fx.restore();
      }

      // --- Particules en orbite qui se posent sur les tracés
      if (lt < 2.05) {
        const c0 = center(lt);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (const pa of parts) {
          const al = seg(lt, pa.ta, pa.ta + 0.2) * (1 - seg(lt, 1.96, 2.02)) * fade;
          if (al <= 0) continue;
          const k = E.inOutCubic(seg(lt, 0.8 + pa.d, 1.35 + pa.d));
          const at = (tt) => {
            const o = orbit(pa, tt, center(tt));
            const tg = mapPt(pa.target, symTf(tt));
            const kk = E.inOutCubic(seg(tt, 0.8 + pa.d, 1.35 + pa.d));
            return [lerp(o[0], tg[0], kk), lerp(o[1], tg[1], kk)];
          };
          const p = at(lt);
          const q = at(lt - 0.06);
          streak(fx, q[0], q[1], p[0], p[1], pa.sz * 0.9, C.neon, al * (0.9 - k * 0.5));
          fx.fillStyle = rgba('#e6ffe6', al);
          fx.fillRect(p[0] - pa.sz / 2, p[1] - pa.sz / 2, pa.sz, pa.sz);
        }
        fx.restore();
        void c0;
      }

      // --- IMPACT (2.0 s)
      const ti = lt - 2.0;
      post.flash += 0.2 * pulse(lt, 2.0, 0.015, 0.08);
      post.ca += 0.004 * pulse(lt, 2.0, 0.01, 0.2);
      post.bloom += 0.35 * pulse(lt, 2.0, 0.01, 0.25);
      if (ti >= 0 && ti < 0.7) post.shock = [bx / W, by / H, 0.04 + E.outExpo(ti / 0.7) * 0.55, (1 - ti / 0.7) * 0.6];
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      shockRing(fx, bx, by, ti, f, { radius: 800, width: 10, dur: 0.7, alpha: 0.7 });
      shockRing(fx, bx, by, ti - 0.06, f, { radius: 700, width: 6, dur: 0.6, color: C.teal });
      sparks(fx, bx, by, ti, f, { count: 50, seed: 9, speed: 1600, life: 0.7 });
      flare(fx, bx, by, 0.75 * pulse(lt, 2.0, 0.02, 0.4) * cfg.vfx.flares, f, C.neon);
      fx.restore();

      // --- Pastille logo pleine
      if (lt >= 1.98) {
        const pop = E.outBack(seg(lt, 1.98, 2.3), 2.2);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, bx, by, bside * 1.6, C.neon, 0.5 * fade);
        fx.restore();
        drawBadge(ui, bx, by, bside, cfg, seg(lt, 1.98, 2.08) * fade, pop);
      }

      // --- « À Liège » : signature discrète de la ville
      const tl = lt - f.ml('L1.Liège', 0.6);
      const la = seg(tl, 0, 0.5) * (1 - seg(lt, 1.6, 1.95)) * fade;
      if (la > 0) {
        drawText(ui, cfg.texts.cityLabel, cx, isV ? cy + minWH * 0.62 : H * 0.9, {
          size: 30 * u, weight: 600, tracking: 0.9, align: 'center', t: tl, mode: 'track', trackFrom: 1.6, dur: 0.9,
          color: C.white, alpha: la * 0.85,
        });
      }

      for (const g of [fx, ui]) g.restore();
    },
  };
}
