// SCENE 04 — 3D • VFX • « DES VIDÉOS QUI ARRÊTENT LE SCROLL »
//  « 3D »  : hologramme filaire → sculpture chromée (matérialisation), slam typo
//  « VFX » : orbe de verre qui explose en lumière (étincelles, onde de choc), slam typo
//  « On transforme tes idées… » : flux de posts "banals" qui défile de plus en plus vite
//  (flou de mouvement vertical) → ARRÊT BRUTAL sur « arrêtent » → « SCROLL » énorme.

import * as THREE from 'three';
import { pulse, win } from '../core/anim.js';
import { flare, sparks, shockRing, radialGlow } from '../core/draw.js';
import { layout, slam, E, seg, lerp, clamp, fitSize } from './kit.js';

export default function createKinetic({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const probe = document.createElement('canvas').getContext('2d');
  const [k3d, kvfx] = cfg.texts.kinetic;
  const [sA, sB, sC] = cfg.texts.scroll;
  const big = fitSize(probe, kvfx, 700, -0.03, Lp.maxW * 0.8, 520 * Lp.u);
  const szA = fitSize(probe, sA, 700, -0.02, Lp.maxW, 150 * Lp.u);
  const szB = fitSize(probe, sB, 700, -0.02, Lp.maxW, 190 * Lp.u);
  const szC = fitSize(probe, sC, 700, -0.04, Lp.maxW * 1.02, 400 * Lp.u);
  const CARD = 3.75, STOP_CARD = 11;

  return {
    update(f) {
      const { post, fx, ui } = f;
      const { obj, studio } = f.world;
      if (!f.owner && f.t > f.clock.end) return;
      const T = f.t;
      const m3 = f.mark('L3.3D', f.clock.start + 0.06);
      const mV = f.mark('L3.VFX', m3 + 0.37);
      const m4 = f.mark('L4.start', mV + 0.9) - 0.08;
      const mI = f.mark('L4.images', m4 + 1.1);
      const mStop = f.mark('L4.arrêtent', m4 + 1.6);
      const mS = f.mark('L4.scroll', mStop + 0.4);
      const end = f.clock.end;
      post.flashColor = [0.85, 0.8, 1];

      if (T < m4) {
        // ---------------- 3D → VFX
        const t3 = T - m3, tv = T - mV;
        studio.update(T, { glow: 0.4 + 0.8 * pulse(tv, 0, 0.01, 0.5), beams: 0.35, grid: 0.3 * seg(t3, 0, 0.3), dust: 1, motes: 0.9, env: 0.9, envRot: T, rim: 1.5 });
        const push = E.outCubic(seg(T, m3, m4));
        f.camera([0.2, 0.1, lerp(6.2, 5.2, push)], [0, -0.45, 0], 30, 0.04 * Math.sin(T * 2));
        const mat = E.outExpo(seg(t3, 0.1, 0.36)); // matérialisation chrome
        obj.knotWire.visible = tv < 0.1;
        obj.wireMat.opacity = 0.95 * (1 - mat * 0.6);
        for (const o of [obj.knot, obj.knotWire]) {
          o.position.set(0, -0.6, 0);
          o.rotation.set(0.6 + T * 1.5, T * 2.2, 0.1);
        }
        obj.knotWire.scale.setScalar(0.75 * (1 + 0.04 * Math.sin(T * 30) * (1 - mat)));
        obj.knot.visible = mat > 0.01 && tv < 0.05;
        obj.knot.scale.setScalar(0.75 * mat);
        if (tv >= 0) {
          const pop = E.outBack(seg(tv, 0, 0.22), 2);
          obj.orb.visible = true;
          obj.orb.position.set(0, -0.55, 0);
          obj.orb.scale.setScalar(Math.max(0.001, 0.72 * pop * (1 + 0.15 * E.outExpo(seg(tv, 0.35, 0.9)))));
          obj.orb.rotation.set(0, T * 1.5, 0);
          obj.orb.userData.core.rotation.set(T * 3, T * 4, 0);
          obj.orb.userData.core.scale.setScalar(1 + 0.8 * pulse(tv, 0, 0.01, 0.4));
          obj.rings.visible = true;
          obj.rings.position.set(0, -0.55, 0);
          obj.rings.scale.setScalar(lerp(0.3, 0.62, E.outExpo(seg(tv, 0, 0.5))));
          obj.rings.children.forEach((r, k) => r.rotation.set(1.3 + k * 0.5 + T * (1 + k * 0.4), T * (0.7 - k * 0.3), 0));
        }
        post.dof = { focus: 5.4, aperture: 0.008, maxblur: 0.005 };
        post.flash += 0.4 * pulse(t3, 0, 0.006, 0.14) + 0.7 * pulse(tv, 0, 0.006, 0.2);
        post.ca += 0.01 * pulse(tv, 0, 0.01, 0.3) + 0.006 * pulse(t3, 0, 0.01, 0.2);
        post.bloom += 0.4 * pulse(tv, 0, 0.01, 0.5);
        post.glitch += win(t3, 0, 0.01, 0.06, 0.12) * 0.6 + win(tv, 0, 0.01, 0.05, 0.1) * 0.5;
        if (tv >= 0 && tv < 0.6) post.shock = [0.5, 0.6, 0.03 + E.outExpo(tv / 0.6) * 0.8, (1 - tv / 0.6) * 0.6];
        post.blur = [0, 0.03 * E.inCubic(seg(T, m4 - 0.15, m4))];
        const [ox, oy] = f.project(new THREE.Vector3(0, -0.55, 0));
        shockRing(fx, ox, oy, tv, f, { radius: 1500, width: 18, dur: 0.75, color: C.neon });
        shockRing(fx, ox, oy, tv - 0.05, f, { radius: 1000, width: 6, dur: 0.6, color: C.teal, alpha: 0.7 });
        sparks(fx, ox, oy, tv, f, { count: 200, seed: 8, speed: 3000, life: 0.9, color: C.neon2 });
        sparks(fx, ox, oy, t3 - 0.12, f, { count: 60, seed: 5, speed: 1400, life: 0.5, color: C.teal });
        flare(fx, ox, oy, 1.2 * pulse(tv, 0, 0.02, 0.4) * cfg.vfx.flares, f, C.neon);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, ox, oy, W * 0.6, C.neon, 0.25);
        fx.restore();
        // typo
        const yT = H * 0.3;
        slam(f, k3d, Lp.cx, yT, { t: t3 + 0.03, size: big, color: C.white, from: 2.8, dur: 0.26, out: seg(tv, -0.06, 0.0), glow: 0.25 });
        slam(f, kvfx, Lp.cx, yT, { t: tv + 0.03, size: big, color: C.neon2, glowColor: C.neon, from: 3.2, dur: 0.24, out: seg(T, m4 - 0.12, m4), glow: 0.55 });
        return;
      }

      // ---------------- SCROLL : le flux s'emballe puis s'arrête net
      const tStop = T - mStop;
      const span = Math.max(0.4, mStop - m4);
      const q = clamp((T - m4) / span);
      let y = STOP_CARD * CARD * Math.pow(q, 2.4);
      const v = tStop < 0 ? (STOP_CARD * CARD * 2.4 * Math.pow(q, 1.4)) / span : 0;
      if (tStop >= 0) y += 0.18 * Math.exp(-tStop * 18) * Math.sin(tStop * 60); // à-coup de l'arrêt
      studio.update(T, { glow: 0.15 + 0.6 * pulse(tStop, 0, 0.01, 0.5), backdrop: true, beams: 0.15, grid: 0, dust: 0.5, motes: 0.3, env: 1, envRot: T, rim: 1 });
      obj.feed.visible = true;
      obj.feed.position.set(0, y, 0);
      obj.feed.rotation.set(-0.06, 0, 0.02);
      f.camera([0, 0.1, 6.4 + 0.6 * (1 - E.outCubic(seg(T, m4, m4 + 0.4)))], [0, 0, 0], 32, -0.03);
      post.blur = [0, Math.min(0.09, (v / CARD) / 30 * 1.6) * cfg.vfx.motionBlur];
      post.flash += 0.55 * pulse(tStop, 0, 0.004, 0.09) + 0.3 * pulse(T - mS, 0, 0.005, 0.14) + 0.3 * pulse(T - m4, 0, 0.005, 0.1);
      post.ca += 0.014 * pulse(tStop, 0, 0.005, 0.3);
      post.glitch += win(tStop, 0, 0.005, 0.04, 0.1) * 1.1;
      post.bloom += 0.4 * pulse(T - mS, 0, 0.01, 0.4);
      if (tStop >= 0 && tStop < 0.5) post.shock = [0.5, 0.45, 0.03 + E.outExpo(tStop / 0.5) * 0.6, (1 - tStop / 0.5) * 0.45];
      post.fade *= 1 - E.inCubic(seg(T, end - 0.24, end));
      post.uiBlur = 0; // la typo reste nette sur le flux flou
      // le contenu banal s'efface derrière le message
      const dim = 0.12 + 0.43 * seg(T, mI - 0.1, mI + 0.1) + 0.2 * seg(T, mS, mS + 0.15);
      ui.save();
      ui.fillStyle = `rgba(3,3,4,${dim})`;
      ui.fillRect(-W, -H, W * 3, H * 3);
      ui.restore();
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      radialGlow(fx, W * 0.5, H * 0.5, W * 0.8, C.neon, 0.3 * seg(T, mS, mS + 0.2));
      fx.restore();
      sparks(fx, W * 0.5, H * 0.53, T - mS, f, { count: 90, seed: 12, speed: 2600, life: 0.7, flat: 0.4, color: C.neon2 });
      shockRing(fx, W * 0.5, H * 0.53, T - mS, f, { radius: 1300, width: 10, dur: 0.6, flat: 0.3, color: C.neon });
      const out = seg(T, end - 0.22, end - 0.06);
      const yA = H * 0.33, yB = yA + szB * 1.15, yC = yB + szC * 0.98;
      slam(f, sA, Lp.cx, yA, { t: T - mI + 0.04, size: szA, color: C.white, from: 1.6, dur: 0.3, out, glow: 0.12 });
      slam(f, sB, Lp.cx, yB, { t: tStop + 0.02, size: szB, color: C.white, from: 2.6, dur: 0.16, out, glow: 0.2 });
      slam(f, sC, Lp.cx, yC, { t: T - mS + 0.03, size: szC, color: C.neon2, glowColor: C.neon, from: 3.4, dur: 0.22, out, glow: 0.6, pulse: 0.05 * pulse(T - mS, 0.22, 0.01, 0.25) });
    },
  };
}
