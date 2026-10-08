// 3–6 s — SMARTPHONES : arrivée en whip pan, trois smartphones premium en orbite,
// reflets métalliques balayés, HUD + lignes SVG, rack focus, typographie en profondeur,
// GSM CENTER construit par la lumière sur « Découvrez GSM Center », pastille
// « SMARTPHONES · NEUFS & RECONDITIONNÉS », push-in vers l'écran.

import * as THREE from 'three';
import { E, seg, win, pulse, lerp, rng, TAU, rgba } from '../core/anim.js';
import {
  drawText, fitSize, hudRing, flowCurve, flare, streak, glassPill, textWidth, charLayout, textPoints, strokeTextProgress,
  textSweep, shockRing,
} from '../core/draw.js';
import { drawBadge } from './01-intro.js';

export default function createPhones({ cfg, assets, world, W, H, u }) {
  const C = cfg.colors;
  const T = cfg.texts;
  const isV = H > W;
  const probe = document.createElement('canvas').getContext('2d');
  const B = cfg.brand;
  // lockup GSM CENTER (pastille + nom) composé sur le mot prononcé
  const wsize = fitSize(probe, B.name, 700, -0.02, W * (isV ? 0.66 : 0.42), H * (isV ? 0.07 : 0.115));
  const bside = wsize * 0.8, gap = wsize * 0.28;
  const yW = isV ? H * 0.2 : H * 0.8;
  const tpts = textPoints(B.name, wsize, 700, -0.02, Math.max(4, Math.round(4 * u)), 'left');
  const r = rng(77);
  const orb = Array.from({ length: Math.round(46 * cfg.vfx.particles) }, () => ({
    a: r() * TAU, w: 0.6 + r() * 1.4, rr: 0.9 + r() * 0.5, tilt: (r() - 0.5) * 0.6, sz: (1.5 + r() * 2.5) * u,
  }));
  const top = new THREE.Vector3(0, 0.78, 0);
  const corner = new THREE.Vector3(0.33, 0.74, 0.05);

  return {
    update(f) {
      const { lt, fx, ui, post } = f;
      const { hero, sideA, sideB, studio, bigText } = world;
      const arrive = E.outExpo(seg(lt, 0, 1.1));
      const push = E.inExpo(seg(lt, 2.55, 3.0));
      const theta = lerp(-0.85, 0.18, arrive) + 0.06 * lt;

      if (f.owner) {
        let rho = lerp(7.8, 5.4, E.outCubic(seg(lt, 0, 1.4))) * (isV ? 1.85 : 1);
        rho = lerp(rho, isV ? 1.9 : 1.25, push);
        const camY = lerp(1.0, 0.18, arrive);
        const ty = lerp(isV ? 0.05 : -0.26, 0, push);
        f.camera([Math.sin(theta) * rho, lerp(camY, 0.02, push), Math.cos(theta) * rho], [0, ty, 0], 30, lerp(-0.12, 0, arrive));

        studio.update(f.t, {
          glow: 0.9, grid: 0.5 * seg(lt, 0.2, 1.0) * (1 - push), beams: 0.55, envRot: 0.3 + lt * 0.7,
          dust: 1, motes: 1, rim: 1,
        });
        studio.sweep.position.set(lerp(-3, 3, seg(lt, 1.0, 2.1)), 1.0, 1.6);
        studio.sweep.intensity = 14 * win(lt, 0.95, 1.2, 1.8, 2.1);

        // Héros
        hero.group.visible = true;
        hero.setCracked(false);
        hero.setExplode(0, lt);
        const ent = E.outExpo(seg(lt, 0.05, 0.8));
        hero.group.position.set(0, lerp(-2.4, 0, ent) + Math.sin(lt * 1.6) * 0.03, 0);
        hero.group.rotation.set(lerp(0.9, 0.05, ent), lerp(-1.6, -0.28, E.outExpo(seg(lt, 0.05, 0.95))) + 0.36 * E.inOutSine(seg(lt, 0.9, 2.6)), lerp(0.25, 0, ent));
        hero.group.rotation.y = lerp(hero.group.rotation.y, theta, push);
        hero.group.scale.setScalar(1);

        // Téléphones latéraux (dos visibles)
        const sx = isV ? 0.98 : 1.32, sz = isV ? -1.3 : -0.9;
        const eA = E.outExpo(seg(lt, 0.15, 0.95)), eB = E.outExpo(seg(lt, 0.25, 1.05));
        sideA.group.visible = sideB.group.visible = push < 0.9;
        sideA.group.position.set(lerp(-4.5, -sx, eA), 0.05 + Math.sin(lt * 1.3 + 1) * 0.03, sz);
        sideA.group.rotation.set(0.04, Math.PI + 0.55 - lt * 0.16 + (1 - eA) * 2.5, -0.05 * eA);
        sideB.group.position.set(lerp(4.5, sx, eB), -0.04 + Math.sin(lt * 1.4 + 2) * 0.03, sz);
        sideB.group.rotation.set(0.02, Math.PI - 0.55 + lt * 0.16 - (1 - eB) * 2.5, 0.05 * eB);

        // Typographie géante en profondeur
        bigText.visible = true;
        bigText.material.opacity = 0.2 * win(lt, 0.3, 0.9, 2.3, 2.7);
        bigText.position.set(lerp(1.4, -1.4, lt / 3), isV ? 1.2 : 0.2, -3.6);
        bigText.rotation.set(0, theta * 0.7, 0);
        bigText.scale.setScalar(isV ? 0.75 : 1);

        // Profondeur de champ + rack focus vers le téléphone de gauche
        const dHero = f.dist(hero.group), dSide = f.dist(sideA.group);
        post.dof = { focus: lerp(dHero, dSide, win(lt, 1.5, 1.75, 1.95, 2.25, E.inOutCubic, E.inOutCubic)), aperture: 0.0016, maxblur: 0.003 };
        if (push > 0.6) post.dof = null;

        post.blur = [0.07 * (1 - E.outCubic(seg(lt, 0, 0.32))), 0];
        post.zoomBlur += push * 0.12;
        post.flash += 0.22 * pulse(lt, 0.02, 0.01, 0.12) + 0.5 * push * push;
        post.ca += 0.004 * pulse(lt, 0.02, 0.01, 0.2);

        // ---------------- calque lumineux 2D
        const pc = f.project(hero.group);
        const pt = f.project(hero.inner, top);
        const R = Math.hypot(pt[0] - pc[0], pt[1] - pc[1]) * 1.22;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        hudRing(fx, assets.hud, pc[0], pc[1], R, lt, win(lt, 0.55, 1.0, 2.35, 2.6), f);
        const pa = f.project(sideA.group), pb = f.project(sideB.group);
        const lw = win(lt, 0.9, 1.3, 2.3, 2.6);
        flowCurve(fx, pc, pa, lt, E.outCubic(seg(lt, 0.9, 1.4)), f, { alpha: lw, bend: 0.18 });
        flowCurve(fx, pc, pb, lt + 0.3, E.outCubic(seg(lt, 1.0, 1.5)), f, { alpha: lw, bend: -0.18 });
        // micro-particules en orbite
        const oa = win(lt, 0.6, 1.1, 2.4, 2.7);
        if (oa > 0) {
          for (const o of orb) {
            const at = (tt) => {
              const a = o.a + o.w * tt;
              return [pc[0] + Math.cos(a) * R * o.rr, pc[1] + Math.sin(a) * R * o.rr * 0.3 + Math.cos(a) * R * o.tilt];
            };
            const p = at(lt), q = at(lt - 0.08);
            streak(fx, q[0], q[1], p[0], p[1], o.sz, C.neon, oa * 0.8);
          }
        }
        // éclat sur l'arête du téléphone (synchro avec le hit 1.0 s)
        const pk = f.project(hero.inner, corner);
        flare(fx, pk[0], pk[1], 0.75 * pulse(lt, 1.0, 0.04, 0.3) * cfg.vfx.flares, f, C.neon);
        // traînées de vitesse à l'arrivée
        const sp = 1 - E.outCubic(seg(lt, 0, 0.4));
        if (sp > 0.01) {
          const rr = rng(5);
          for (let i = 0; i < 26; i++) {
            const y = rr() * H, len = (0.2 + rr() * 0.5) * W, x = rr() * W * 1.4 - W * 0.2 + (1 - sp) * W;
            streak(fx, x - len, y, x, y, (1 + rr() * 2.5) * u, i % 3 ? C.neon : C.white, sp * 0.6);
          }
        }
        fx.restore();
      }

      // ---------------- branding synchronisé sur la voix : « Découvrez GSM Center. »
      // (temps réels relatifs aux mots, indépendants de la déformation de la scène)
      const dG = f.t - f.mark('L2.GSM', f.clock.toGlobal(0.9));
      const dC = f.t - f.mark('L2.Center', f.clock.toGlobal(1.0));
      // le lockup reste lisible jusqu'au push-in dans l'écran (fin de scène)
      const out = E.inCubic(seg(f.t, f.clock.end - 0.34, f.clock.end - 0.08));
      const nm = B.name;
      const L = charLayout(ui, nm, wsize, 700, -0.02);
      const rowW = bside + gap + L.width;
      const x0 = W / 2 - rowW / 2 + bside + gap;
      const bx = W / 2 - rowW / 2 + bside / 2, by = yW - wsize * 0.35;
      const xC = x0 + L.chars[B.nameSplit + 1].x;
      const o = { size: wsize, weight: 700, tracking: -0.02, align: 'left' };
      const alive = 1 - out;
      if (dG > -0.05 && alive > 0) {
        // pastille G
        const pop = E.outBack(seg(dG, -0.04, 0.26), 2.2);
        drawBadge(ui, bx, by, bside, cfg, seg(dG, -0.04, 0.06) * alive, pop);
        // particules qui construisent les lettres (GSM puis CENTER)
        const pa = 1 - seg(dC, 0.3, 0.6);
        if (pa > 0) {
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          fx.fillStyle = rgba('#dfffe0', pa * alive);
          const sz = 2.4 * u;
          for (let j = 0; j < tpts.length; j++) {
            const [ox, oy, nx] = tpts[j];
            const center = ox >= L.chars[B.nameSplit + 1].x - wsize * 0.1;
            const d = center ? dC : dG;
            const h1 = Math.sin(j * 12.9898) * 43758.5453, hr = h1 - Math.floor(h1);
            const k = E.inOutCubic(seg(d, -0.12 + hr * 0.1 + nx * 0.06, 0.2 + hr * 0.1 + nx * 0.06));
            if (k <= 0) continue;
            const ang = hr * TAU, R = (0.25 + hr * 0.5) * W * 0.4;
            const sx0 = W / 2 + Math.cos(ang) * R, sy0 = H * 0.45 + Math.sin(ang) * R * 0.5;
            const tx = x0 + ox, ty = yW + oy;
            fx.fillRect(lerp(sx0, tx, k) - sz / 2, lerp(sy0, ty, k) - sz / 2, sz, sz);
          }
          fx.restore();
        }
        // contour lumineux puis remplissage
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        strokeTextProgress(fx, nm.slice(0, B.nameSplit), x0, yW, o, E.outCubic(seg(dG, 0, 0.3)), C.neon, 2.4 * u, (1 - 0.7 * seg(dC, 0.3, 0.6)) * alive);
        strokeTextProgress(fx, nm.slice(B.nameSplit + 1), xC, yW, o, E.outCubic(seg(dC, -0.05, 0.25)), C.neon, 2.4 * u, (1 - 0.7 * seg(dC, 0.4, 0.7)) * alive);
        fx.restore();
        drawText(ui, nm.slice(0, B.nameSplit), x0, yW, { ...o, t: dG - 0.08, mode: 'fade', stagger: 0.05, dur: 0.22, color: C.white, alpha: alive });
        drawText(ui, nm.slice(B.nameSplit + 1), xC, yW, { ...o, t: dC, mode: 'fade', stagger: 0.03, dur: 0.2, color: C.neon, alpha: alive });
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        drawText(fx, nm.slice(B.nameSplit + 1), xC, yW, { ...o, t: dC, mode: 'fade', stagger: 0.03, dur: 0.2, color: C.neon, alpha: 0.35 * alive });
        // impact sous « Center »
        shockRing(fx, W / 2, by, dC, f, { radius: 900, width: 6, dur: 0.6, flat: 0.22, alpha: 0.6 * alive });
        flare(fx, xC + L.width * 0.2, by, 0.7 * pulse(dC, 0, 0.03, 0.3) * cfg.vfx.flares * alive, f, C.neon);
        fx.restore();
        textSweep(ui, nm, x0, yW, o, seg(dC, 0.3, 0.75), '#ffffff', 0.8 * alive);
        post.flash += 0.2 * pulse(dC, 0, 0.012, 0.09);
        post.ca += 0.003 * pulse(dC, 0, 0.01, 0.18);
        post.bloom += 0.3 * pulse(dC, 0, 0.01, 0.25);
      }

      // pastille de verre « SMARTPHONES · NEUFS & RECONDITIONNÉS »
      const ss = wsize * 0.24;
      const pillTxt = T.phonesPill;
      const sw = textWidth(ui, pillTxt, ss, 600, 0.16) + ss * 2.4;
      const ph = ss * 2.3;
      const grow = E.outExpo(seg(dC, 0.42, 0.85));
      const py = isV ? yW + wsize * 0.45 : yW + wsize * 0.38;
      const pal = (1 - out) * seg(dC, 0.4, 0.5);
      if (pal > 0) {
        glassPill(ui, W / 2 - (sw * grow) / 2, py, Math.max(ph, sw * grow), ph, ph / 2, pal, f, { stroke: rgba(C.neon, 0.55), tint: 'rgba(57,255,20,0.06)' });
        if (grow > 0.3) {
          drawText(ui, pillTxt, W / 2, py + ph / 2 + ss * 0.36, {
            size: ss, weight: 600, tracking: 0.16, align: 'center', t: dC - 0.5, mode: 'track', trackFrom: 0.5, dur: 0.45,
            color: C.neon, alpha: 1 - out,
          });
        }
      }
    },
  };
}
