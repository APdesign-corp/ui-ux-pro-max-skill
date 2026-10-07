// 3–6 s — SMARTPHONES : arrivée en whip pan, trois smartphones premium en orbite,
// reflets métalliques balayés, HUD + lignes SVG, rack focus, typographie en profondeur,
// "SMARTPHONES" + pastille verre "NEUFS & RECONDITIONNÉS", push-in vers l'écran.

import * as THREE from 'three';
import { E, seg, win, pulse, lerp, rng, TAU, rgba } from '../core/anim.js';
import { drawText, fitSize, hudRing, flowCurve, flare, streak, glassPill, eyebrow, textWidth, setFont } from '../core/draw.js';

export default function createPhones({ cfg, assets, world, W, H, u }) {
  const C = cfg.colors;
  const T = cfg.texts;
  const isV = H > W;
  const probe = document.createElement('canvas').getContext('2d');
  const tsize = fitSize(probe, T.phones, 700, -0.02, W * (isV ? 0.84 : 0.44), H * (isV ? 0.075 : 0.13));
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

      // ---------------- typographie
      const out = E.inCubic(seg(lt, 2.4, 2.72));
      const x0 = isV ? W / 2 : W * 0.065;
      const yT = isV ? H * 0.2 : H * 0.84;
      const align = isV ? 'center' : 'left';
      eyebrow(ui, T.stepPhones, x0, yT - tsize * 1.05, lt - 0.25, f, { align, alpha: 1 - out });
      drawText(ui, T.phones, x0, yT, { size: tsize, weight: 700, tracking: -0.02, align, t: lt - 0.35, stagger: 0.03, dur: 0.5, color: C.white, out });
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      drawText(fx, T.phones, x0, yT, { size: tsize, weight: 700, tracking: -0.02, align, t: lt - 0.35, stagger: 0.03, dur: 0.5, color: C.white, out, alpha: 0.18 });
      fx.restore();

      const ss = tsize * 0.3;
      const sw = textWidth(ui, T.phonesSub, ss, 600, 0.18) + ss * 2.2;
      const ph = ss * 2.3;
      const grow = E.outExpo(seg(lt, 1.0, 1.4));
      const px = isV ? W / 2 - (sw * grow) / 2 : x0;
      const py = yT + tsize * 0.32;
      const pal = (1 - out) * seg(lt, 0.98, 1.08);
      glassPill(ui, px, py, Math.max(ph, sw * grow), ph, ph / 2, pal, f, { stroke: rgba(C.neon, 0.55), tint: 'rgba(57,255,20,0.06)' });
      if (grow > 0.3) {
        setFont(ui, ss, 600, 0.18);
        drawText(ui, T.phonesSub, isV ? W / 2 : px + ss * 1.1, py + ph / 2 + ss * 0.36, {
          size: ss, weight: 600, tracking: 0.18, align: isV ? 'center' : 'left', t: lt - 1.08, mode: 'track', trackFrom: 0.6, dur: 0.45,
          color: C.neon, alpha: 1 - out,
        });
      }
    },
  };
}
