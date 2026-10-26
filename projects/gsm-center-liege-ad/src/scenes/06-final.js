// 15–20 s — FINAL / CALL TO ACTION : retour au noir, tous les éléments (téléphone,
// accessoires, icônes SVG des services, particules) convergent vers le centre →
// implosion → impact → formation du branding GSM CENTER LIÈGE → slogan, adresse,
// numéro dans une pastille de verre, "OUVERT 7J/7" → impact vert final → frame propre.

import { E, seg, win, pulse, lerp, rng, TAU, rgba } from '../core/anim.js';
import {
  drawText, strokeTextProgress, textSweep, textPoints, fitSize, flare, sparks, shockRing, streak,
  radialGlow, drawSvgGroup, glassPill, textWidth, setFont, drawSvg,
} from '../core/draw.js';
import { drawBadge } from './01-intro.js';

export default function createFinal({ cfg, assets, W, H, u }) {
  const C = cfg.colors;
  const B = cfg.brand;
  const isV = H > W;
  const probe = document.createElement('canvas').getContext('2d');
  const cx = W / 2, cy = H / 2;
  const s = fitSize(probe, B.name, 700, -0.02, W * (isV ? 0.84 : 0.56), H * 0.16);
  const tw = textWidth(probe, B.name, s, 700, -0.02);

  // Mise en page du bloc de marque
  const L = {};
  if (isV) {
    L.yB = H * 0.4;
    L.bside = s * 0.95;
    L.bx = cx; L.by = L.yB - s * 1.25;
    L.tx = cx; L.talign = 'center';
    L.k = 1.25;
  } else {
    L.yB = H * 0.35;
    L.bside = s * 0.78;
    const gap = s * 0.3;
    const row = L.bside + gap + tw;
    L.bx = cx - row / 2 + L.bside / 2; L.by = L.yB - s * 0.35;
    L.tx = cx - row / 2 + L.bside + gap + tw / 2; L.talign = 'center';
    L.k = 1;
  }
  const yCity = L.yB + s * 0.68 * L.k;
  const yTag = L.yB + s * 1.12 * L.k;
  const yDiv = L.yB + s * 1.42 * L.k;
  const yAddr = L.yB + s * 1.86 * L.k;
  const numSize = s * (isV ? 0.4 : 0.36);
  const pillH = numSize * 1.8;
  const pillCY = L.yB + s * 2.5 * L.k;
  const yOpen = pillCY + pillH / 2 + s * 0.42 * L.k;

  const tpts = textPoints(B.name, s, 700, -0.02, Math.max(4, Math.round(4.5 * u)), 'center');
  const r = rng(99);
  const vortex = Array.from({ length: Math.round(280 * cfg.vfx.particles) }, () => ({
    a: r() * TAU, r0: (0.35 + r() * 0.8) * Math.max(W, H) * 0.55, w: 1.5 + r() * 2.5, d: r() * 0.25, sz: (1.5 + r() * 2.5) * u,
  }));
  const iconNames = ['phone', 'repair', 'multimedia', 'internet', 'send', 'globe'];

  return {
    update(f) {
      const { lt, fx, ui, post } = f;
      const { hero, acc: A, studio } = f.world;
      const conv = seg(lt, 0, 0.9);

      if (f.owner) {
        f.camera([0, 0, 9 - 0.4 * E.outCubic(seg(lt, 1, 5))], [0, 0, 0], 30);
        studio.update(f.t, {
          glow: 0.25 + 1.2 * pulse(lt, 1.0, 0.02, 0.7) + 0.4 * seg(lt, 1.0, 2.5) + 0.3 * pulse(lt, 3.5, 0.02, 0.5),
          beams: 0.38 * seg(lt, 1.0, 2.0), grid: 0.25 * seg(lt, 1.2, 2.4), dust: 0.8, motes: 0.55 * seg(lt, 1.0, 2.0) + 0.25,
          env: 1, envRot: lt,
        });
        // éléments 3D qui convergent puis s'effondrent dans le point central
        if (lt < 0.95) {
          const k = E.inCubic(conv);
          const sc = Math.max(0.001, 1 - E.inExpo(seg(lt, 0.45, 0.92)));
          hero.group.visible = true;
          hero.setExplode(0, lt);
          hero.setCracked(false);
          hero.group.position.set(0, 0, lerp(-22, 0, E.outCubic(seg(lt, 0, 0.75))));
          hero.group.rotation.set(0.3, lt * 9, 0.4);
          hero.group.scale.setScalar(sc);
          A.group.visible = true;
          [['earbuds', [-5, 2.6, -2]], ['headphones', [5, 2.4, -3]], ['charger', [4.6, -2.8, -1]], ['caseShell', [-4.6, -2.6, -2]]].forEach(([key, p0], i) => {
            const o = A[key];
            o.visible = true;
            o.position.set(lerp(p0[0], 0, k), lerp(p0[1], 0, k), lerp(p0[2], 0, k));
            o.rotation.set(lt * 4 + i, lt * 6, i);
            o.scale.setScalar(Math.max(0.001, (1 - k) * 1.1));
          });
        }
        post.zoomBlur += E.inCubic(conv) * 0.1 * (lt < 1 ? 1 : 0);
        if (lt < 0.97) post.uiBlur = 0; // la phrase reste nette pendant l'aspiration
        post.fade *= 1 - 0.55 * win(lt, 0.86, 0.92, 0.97, 1.0);
        post.flash += 0.55 * pulse(lt, 1.0, 0.012, 0.12) + 0.22 * pulse(lt, 3.5, 0.015, 0.1);
        post.flashColor = [0.75, 1, 0.75];
        post.ca += 0.008 * pulse(lt, 1.0, 0.01, 0.25) + 0.003 * pulse(lt, 3.5, 0.01, 0.2);
        post.bloom += 0.6 * pulse(lt, 1.0, 0.01, 0.3) + 0.3 * pulse(lt, 3.5, 0.01, 0.25);
        post.glitch += win(lt, 1.0, 1.01, 1.04, 1.08) * 0.8;
        const ti = lt - 1.0;
        if (ti >= 0 && ti < 0.8) post.shock = [cx / W, cy / H, 0.03 + E.outExpo(ti / 0.8) * 0.85, (1 - ti / 0.8) * 0.8];
        const t2 = lt - 3.5;
        if (t2 >= 0 && t2 < 0.6) post.shock = [L.bx / W, L.by / H, 0.03 + E.outExpo(t2 / 0.6) * 0.4, (1 - t2 / 0.6) * 0.12];
      }

      // ---- convergence 2D : icônes des services + vortex de particules
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      if (lt < 1.0) {
        const ia = seg(lt, 0, 0.12) * (1 - seg(lt, 0.85, 0.92));
        iconNames.forEach((name, i) => {
          const a0 = (i / iconNames.length) * TAU - Math.PI / 2;
          const at = (tt) => {
            const kk = E.inCubic(seg(tt, 0, 0.9));
            const ang = a0 + kk * 2.2;
            const R = (1 - kk) * Math.min(W, H) * 0.46;
            return [cx + Math.cos(ang) * R * (isV ? 0.9 : 1.5), cy + Math.sin(ang) * R];
          };
          const p = at(lt), q = at(lt - 0.08);
          const sz = 120 * u * (1 - E.inCubic(conv) * 0.85);
          streak(fx, q[0], q[1], p[0], p[1], 5 * u, C.neon, ia * 0.7);
          drawSvgGroup(fx, assets.icons.group(name), { x: p[0], y: p[1], s: sz / 24, rot: 0, origin: [12, 12] }, { p: E.outCubic(seg(lt, 0, 0.3)), width: 3.5 * u, color: C.neon, alpha: ia, glow: 1 });
        });
        for (const v of vortex) {
          const at = (tt) => {
            const kk = E.inCubic(seg(tt, v.d * 0.3, 0.92));
            const ang = v.a + v.w * kk * 2.4;
            const R = v.r0 * (1 - kk);
            return [cx + Math.cos(ang) * R, cy + Math.sin(ang) * R * (isV ? 1 : 0.6)];
          };
          const p = at(lt), q = at(lt - 0.05);
          const va = seg(lt, v.d * 0.4, v.d * 0.4 + 0.15) * (1 - seg(lt, 0.9, 0.96));
          streak(fx, q[0], q[1], p[0], p[1], v.sz, C.neon, va * 0.8);
        }
        // point d'énergie central
        radialGlow(fx, cx, cy, (60 + 260 * E.inExpo(conv)) * u, C.neon, 0.25 + 0.75 * E.inExpo(conv));
        radialGlow(fx, cx, cy, 80 * u, '#ffffff', 0.6 * E.inExpo(conv));
      }

      // ---- « Tout ce dont vous avez besoin… au même endroit. » (aspiré par l'implosion)
      if (lt < 0.97) {
        const dA = f.t - f.mark('L6.Tout', f.clock.toGlobal(0.05));
        const dB = f.t - f.mark('L6.au', f.clock.toGlobal(0.5));
        const suck = E.inExpo(seg(lt, 0.78, 0.95));
        const [ta, tb] = cfg.texts.together;
        const sA = s * (isV ? 0.22 : 0.19), sB = s * (isV ? 0.5 : 0.46);
        ui.save();
        ui.translate(cx, cy);
        ui.scale(1 - suck, 1 - suck);
        ui.translate(-cx, -cy);
        drawText(ui, ta, cx, cy - sB * 0.62, { size: sA, weight: 500, tracking: 0.02, align: 'center', t: dA, mode: 'fade', stagger: 0.012, dur: 0.35, color: '#c9d4cb', alpha: 1 - suck });
        drawText(ui, tb, cx, cy + sB * 0.42, { size: sB, weight: 700, tracking: 0.0, align: 'center', t: dB, mode: 'rise', stagger: 0.03, dur: 0.4, color: C.white, alpha: 1 - suck });
        textSweep(ui, tb, cx, cy + sB * 0.42, { size: sB, weight: 700, align: 'center' }, seg(dB, 0.35, 0.9), '#ffffff', 0.5 * (1 - suck));
        ui.restore();
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        fx.translate(cx, cy);
        fx.scale(1 - suck, 1 - suck);
        fx.translate(-cx, -cy);
        drawText(fx, tb, cx, cy + sB * 0.42, { size: sB, weight: 700, align: 'center', t: dB, mode: 'rise', stagger: 0.03, dur: 0.4, color: C.neon, alpha: 0.3 * (1 - suck) });
        fx.restore();
      }

      // ---- impact principal (1.0 s)
      const ti = lt - 1.0;
      shockRing(fx, cx, cy, ti, f, { radius: 1500, width: 20, dur: 0.9 });
      shockRing(fx, cx, cy, ti - 0.07, f, { radius: 1000, width: 8, dur: 0.75, color: C.teal });
      shockRing(fx, cx, cy, ti - 0.12, f, { radius: 2000, width: 4, dur: 1.0, flat: 0.35, color: '#ffffff', alpha: 0.5 });
      sparks(fx, cx, cy, ti, f, { count: 150, seed: 4, speed: 2600, life: 1.0 });
      flare(fx, cx, cy, 1.25 * pulse(lt, 1.0, 0.02, 0.45) * cfg.vfx.flares, f, C.neon);

      // ---- impact vert final (3.5 s)
      const t2 = lt - 3.5;
      shockRing(fx, L.bx, L.by, t2, f, { radius: 260, width: 6, dur: 0.45, alpha: 0.7 });
      shockRing(fx, cx, L.yB - s * 0.3, t2, f, { radius: 1150, width: 3, dur: 0.6, flat: 0.16, alpha: 0.4 });
      flare(fx, L.bx, L.by, 0.8 * pulse(lt, 3.5, 0.02, 0.3) * cfg.vfx.flares, f, C.neon);
      // balayage lumineux horizontal sur le bloc de marque
      const swp = seg(lt, 3.45, 3.85);
      if (swp > 0 && swp < 1) {
        const x = lerp(-W * 0.1, W * 1.1, E.inOutSine(swp));
        streak(fx, x - W * 0.4, L.yB - s * 0.35, x, L.yB - s * 0.35, 3 * u, C.neon, 0.8 * Math.sin(swp * Math.PI));
      }
      fx.restore();

      // ---- formation du branding
      if (lt > 0.98) {
        // pastille G
        const pop = E.outBack(seg(lt, 1.0, 1.32), 2.4);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, L.bx, L.by, L.bside * 1.5, C.neon, 0.45 * seg(lt, 1.0, 1.2));
        const ringIt = assets.badge.get('badge-ring');
        drawSvg(fx, ringIt, { x: L.bx, y: L.by, s: (L.bside / 150) * (1 + E.outExpo(seg(lt, 1.0, 1.6)) * 0.6), rot: lt, origin: assets.badge.center }, {
          p: 1, width: 2.5 * u, color: C.neon, alpha: 1 - seg(lt, 1.1, 1.6), glow: 1,
        });
        fx.restore();
        drawBadge(ui, L.bx, L.by, L.bside, cfg, seg(lt, 1.0, 1.1), pop);

        // particules → lettres
        const pa = 1 - seg(lt, 1.5, 1.8);
        if (pa > 0) {
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          fx.fillStyle = rgba('#dfffe0', pa);
          const sz = 2.6 * u;
          for (let j = 0; j < tpts.length; j++) {
            const [ox, oy, nx] = tpts[j];
            const h1 = Math.sin(j * 12.9898) * 43758.5453;
            const hr = h1 - Math.floor(h1);
            const st = 1.0 + nx * 0.12 + hr * 0.08;
            const k = E.inOutCubic(seg(lt, st, st + 0.4));
            if (k <= 0) continue;
            const ang = hr * TAU, R = (0.2 + hr * 0.6) * W * 0.5;
            const c1x = cx + Math.cos(ang) * R, c1y = cy + Math.sin(ang) * R * 0.6;
            const tx = L.tx + ox, ty = L.yB + oy;
            fx.fillRect((1 - k) * (1 - k) * cx + 2 * (1 - k) * k * c1x + k * k * tx - sz / 2, (1 - k) * (1 - k) * cy + 2 * (1 - k) * k * c1y + k * k * ty - sz / 2, sz, sz);
          }
          fx.restore();
        }
        const o = { size: s, weight: 700, tracking: -0.02, align: L.talign };
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        strokeTextProgress(fx, B.name, L.tx, L.yB, o, E.outCubic(seg(lt, 1.08, 1.5)), C.neon, 2.6 * u, 1 - 0.75 * seg(lt, 1.6, 1.9));
        const colorAt = (i) => (i < B.nameSplit ? C.white : C.neon);
        drawText(fx, B.name, L.tx, L.yB, { ...o, t: lt - 1.2, mode: 'fade', stagger: 0.03, dur: 0.28, colorAt, alpha: 0.28 });
        fx.restore();
        drawText(ui, B.name, L.tx, L.yB, { ...o, t: lt - 1.2, mode: 'fade', stagger: 0.03, dur: 0.28, colorAt });
        textSweep(ui, B.name, L.tx, L.yB, o, seg(lt, 1.7, 2.15), '#ffffff', 0.8);
        textSweep(ui, B.name, L.tx, L.yB, o, seg(lt, 3.45, 3.9), '#ffffff', 0.9);

        // LIÈGE (resserrement du tracking)
        drawText(ui, B.city, cx, yCity, { size: s * 0.42, weight: 600, tracking: 0.55, align: 'center', t: lt - 1.5, mode: 'track', trackFrom: 1.6, dur: 0.6, color: C.white });

        // signature (dite par la voix) : « Votre technologie, notre expertise. »
        const tagS = s * (isV ? 0.26 : 0.23);
        const t1 = B.tagline[0], tg2 = B.tagline[1];
        const w1 = textWidth(ui, t1, tagS, 500, 0), w2 = textWidth(ui, tg2, tagS, 600, 0);
        const dV = f.t - f.mark('L7b.Votre', f.clock.toGlobal(1.95));
        const dN = f.t - f.mark('L7b.notre', f.clock.toGlobal(2.08));
        const tx0 = cx - (w1 + w2) / 2;
        drawText(ui, t1, tx0, yTag, { size: tagS, weight: 500, align: 'left', t: dV + 0.02, mode: 'fade', stagger: 0.014, dur: 0.3, color: '#dfe7e1' });
        drawText(ui, tg2, tx0 + w1, yTag, { size: tagS, weight: 600, align: 'left', t: dN + 0.02, mode: 'fade', stagger: 0.016, dur: 0.3, color: C.neon });
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        drawText(fx, tg2, tx0 + w1, yTag, { size: tagS, weight: 600, align: 'left', t: dN + 0.02, mode: 'fade', stagger: 0.016, dur: 0.3, color: C.neon, alpha: 0.3 });
        fx.restore();

        // séparateur lumineux
        const dv = E.outExpo(seg(lt, 2.1, 2.55));
        if (dv > 0) {
          const half = (isV ? W * 0.36 : W * 0.17) * dv;
          const grd = ui.createLinearGradient(cx - half, 0, cx + half, 0);
          grd.addColorStop(0, rgba(C.neon, 0));
          grd.addColorStop(0.5, rgba(C.neon, 0.9));
          grd.addColorStop(1, rgba(C.neon, 0));
          ui.fillStyle = grd;
          ui.fillRect(cx - half, yDiv - 1.2 * u, half * 2, 2.4 * u);
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          radialGlow(fx, cx + half, yDiv, 50 * u, C.neon, 0.8 * (1 - dv));
          radialGlow(fx, cx - half, yDiv, 50 * u, C.neon, 0.8 * (1 - dv));
          fx.restore();
        }

        // adresse
        const aS = s * (isV ? 0.27 : 0.25);
        drawText(ui, B.address, cx, yAddr, { size: aS, weight: 500, tracking: 0.01, align: 'center', t: lt - 2.3, stagger: 0.012, dur: 0.45, color: C.white });

        // numéro de téléphone dans une pastille de verre
        setFont(ui, numSize, 700, 0.04);
        const nw = textWidth(ui, B.phone, numSize, 700, 0.04);
        const iconS = numSize * 0.95;
        const pillW = nw + iconS + numSize * 1.6;
        const px = cx - pillW / 2, py = pillCY - pillH / 2;
        const pg = seg(lt, 2.55, 2.75);
        glassPill(ui, px, py, pillW, pillH, pillH / 2, pg, f, { stroke: rgba(C.neon, 0.7), border: 2.4, tint: 'rgba(57,255,20,0.07)' });
        const pd = E.inOutCubic(seg(lt, 2.55, 2.95));
        if (pd > 0) {
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          fx.beginPath();
          fx.roundRect(px, py, pillW, pillH, pillH / 2);
          const per = 2 * (pillW + pillH);
          fx.setLineDash([per * pd, per]);
          fx.strokeStyle = rgba(C.neon, 0.9 * (1 - 0.6 * seg(lt, 3.0, 3.4)));
          fx.lineWidth = 4 * u;
          fx.stroke();
          fx.setLineDash([]);
          radialGlow(fx, cx, pillCY, pillW * 0.6, C.neon, 0.12 * pg);
          fx.restore();
        }
        const icx = px + numSize * 0.7 + iconS / 2;
        drawSvgGroup(ui, assets.icons.group('phone'), { x: icx, y: pillCY, s: iconS / 24, rot: 0, origin: [12, 12] }, { p: E.outCubic(seg(lt, 2.65, 2.95)), width: 3.2 * u, color: C.neon, alpha: pg });
        drawText(ui, B.phone, icx + iconS / 2 + numSize * 0.35, pillCY + numSize * 0.36, {
          size: numSize, weight: 700, tracking: 0.04, align: 'left', t: lt - 2.7, stagger: 0.035, dur: 0.4, color: C.neon,
        });
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        drawText(fx, B.phone, icx + iconS / 2 + numSize * 0.35, pillCY + numSize * 0.36, {
          size: numSize, weight: 700, tracking: 0.04, align: 'left', t: lt - 2.7, stagger: 0.035, dur: 0.4, color: C.neon, alpha: 0.3,
        });
        fx.restore();

        // ouvert 7j/7
        const oS = s * (isV ? 0.19 : 0.165);
        const oa = E.outCubic(seg(lt, 3.0, 3.35));
        const ow = textWidth(ui, B.open, oS, 600, 0.3);
        ui.save();
        ui.globalAlpha = oa;
        ui.fillStyle = C.neon;
        ui.beginPath();
        ui.arc(cx - ow / 2 - oS * 0.9, yOpen - oS * 0.34, oS * 0.22, 0, TAU);
        ui.fill();
        ui.restore();
        drawText(ui, B.open, cx + oS * 0.45, yOpen, { size: oS, weight: 600, tracking: 0.3, align: 'center', t: lt - 3.0, mode: 'fade', stagger: 0.02, dur: 0.35, color: '#b7c4b9' });
        if (B.showRating) {
          drawText(ui, B.rating, cx, yOpen + oS * 1.9, { size: oS, weight: 500, tracking: 0.1, align: 'center', t: lt - 3.1, mode: 'fade', dur: 0.4, color: C.muted });
        }
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, cx - ow / 2 - oS * 0.9, yOpen - oS * 0.34, oS * 0.9, C.neon, 0.6 * oa);
        fx.restore();
      }
    },
  };
}
