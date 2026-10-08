// SCENE 05 — AP DESIGN REVEAL : noir + silence (« Ça, c'est… ») → FLASH sur « AP » →
// monogramme AP chromé 3D, la caméra recule et révèle l'environnement (anneaux, faisceaux,
// éclats, particules, grille) → « DESIGN » sur « Design » → signature TON PROJET. NOTRE CRÉATIVITÉ.

import { pulse, win } from '../core/anim.js';
import { flare, sparks, shockRing, radialGlow, drawText, textSweep } from '../core/draw.js';
import { layout, E, seg, lerp, fitSize, textWidth } from './kit.js';

export default function createReveal({ cfg, W, H }) {
  const C = cfg.colors;
  const B = cfg.brand;
  const Lp = layout(W, H);
  const probe = document.createElement('canvas').getContext('2d');
  const wordS = fitSize(probe, B.word, 600, 0.6, Lp.maxW * 0.62, 120 * Lp.u);
  const [t1, t2] = B.tagline;
  const tagS = fitSize(probe, t1 + t2, 600, 0.04, Lp.maxW, 56 * Lp.u);
  const LOGO_Y = 0.42;

  return {
    update(f) {
      const { post, fx, ui } = f;
      const { obj, studio } = f.world;
      const T = f.t;
      const mAP = f.mark('L5.AP', f.clock.start + 0.7);
      const mD = f.mark('L5.Design', mAP + 0.4);
      const ta = T - mAP;
      post.flashColor = [0.9, 0.88, 1];
      if (ta < 0) {
        // noir, silence : un point de lumière qui respire
        studio.update(T, { glow: 0, backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 0.2 });
        f.camera([0, 0, 6], [0, 0, 0], 30);
        const k = E.inExpo(seg(T, mAP - 0.45, mAP));
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, W * 0.5, H * LOGO_Y, (30 + 160 * k) * Lp.u, C.neon, 0.15 + 0.85 * k);
        radialGlow(fx, W * 0.5, H * LOGO_Y, 26 * Lp.u, '#ffffff', 0.5 * k);
        fx.restore();
        post.vignette = 1.2;
        return;
      }
      const dur = f.clock.end + 4 - mAP; // la CTA prolonge l'environnement
      const pull = E.outExpo(seg(ta, 0, 1.3));
      studio.update(T, {
        glow: 0.25 + 1.4 * pulse(ta, 0, 0.01, 0.8) + 0.25 * seg(ta, 0, 1),
        beams: 0.55 * seg(ta, 0, 0.5), grid: 0.3 * seg(ta, 0.1, 0.8), dust: 1, motes: 0.9 * seg(ta, 0, 0.6), env: 1.0, envRot: T * 0.4, rim: 1.6,
      });
      f.camera([lerp(0.1, 0.25, pull) + 0.05 * Math.sin(ta), lerp(0.05, 0.15, pull), lerp(2.0, 6.2, pull)], [0, 0.3, 0], 30, lerp(0.12, 0, pull));
      obj.logo.visible = true;
      obj.logo.position.set(0, 0.62, 0);
      obj.logo.scale.setScalar(0.82);
      obj.logo.rotation.set(0.06 * Math.sin(ta * 1.3), lerp(-0.9, 0, E.outCubic(seg(ta, 0, 1.0))) + 0.12 * Math.sin(ta * 0.9), 0);
      obj.logo.userData.edge.material.opacity = 0.2 + 0.8 * pulse(ta, 0, 0.01, 0.9) + 0.4 * pulse(T - mD, 0, 0.01, 0.5);
      obj.rings.visible = true;
      obj.rings.position.set(0, 0.62, -0.8);
      obj.rings.scale.setScalar(lerp(3.5, 1.05, E.outExpo(seg(ta, 0, 0.9))));
      obj.rings.children.forEach((r, k) => r.rotation.set(0.12 * Math.sin(T + k), 0.18 * Math.cos(T * 0.8 + k), T * (0.3 + k * 0.25) * (k % 2 ? -1 : 1)));
      obj.shards.visible = true;
      obj.shards.position.set(0, 0, lerp(3, 0, pull));
      obj.shards.children.forEach((m) => m.rotation.set(T * m.userData.w + m.userData.s, T * m.userData.w * 1.3, 0));
      post.dof = { focus: f.dist(obj.logo), aperture: 0.008, maxblur: 0.006 };
      post.flash += 0.85 * pulse(ta, 0, 0.004, 0.16) + 0.25 * pulse(T - mD, 0, 0.005, 0.15);
      post.ca += 0.016 * pulse(ta, 0, 0.01, 0.4);
      post.bloom += 0.5 * pulse(ta, 0, 0.01, 0.4);
      post.glitch += win(ta, 0, 0.005, 0.04, 0.09) * 0.8;
      if (ta < 0.9) post.shock = [0.5, LOGO_Y, 0.03 + E.outExpo(ta / 0.9) * 0.9, (1 - ta / 0.9) * 0.7];
      post.zoomBlur += 0.1 * (1 - pull);
      const [lx, ly] = f.project(obj.logo);
      shockRing(fx, lx, ly, ta, f, { radius: 1700, width: 22, dur: 0.9, color: C.neon });
      shockRing(fx, lx, ly, ta - 0.08, f, { radius: 1100, width: 6, dur: 0.75, color: C.teal, alpha: 0.6 });
      shockRing(fx, lx, ly, ta - 0.12, f, { radius: 2200, width: 4, dur: 1.0, flat: 0.25, color: '#ffffff', alpha: 0.5 });
      sparks(fx, lx, ly, ta, f, { count: 220, seed: 21, speed: 3200, life: 1.1, color: C.neon2 });
      flare(fx, lx, ly, 1.4 * pulse(ta, 0, 0.02, 0.6) * cfg.vfx.flares, f, C.neon);
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      radialGlow(fx, lx, ly, W * 0.55, C.neon, 0.22 * seg(ta, 0, 0.3));
      // rayons de lumière (god rays) qui tournent derrière le logo
      const ra = (0.5 * pulse(ta, 0, 0.01, 1.2) + 0.12) * seg(ta, 0, 0.05);
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + T * 0.25 + Math.sin(i * 3.1) * 0.2;
        const len = W * (0.7 + 0.4 * Math.abs(Math.sin(i * 1.7 + T * 0.8)));
        fx.save();
        fx.translate(lx, ly);
        fx.rotate(ang);
        const g = fx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, `rgba(165,148,255,${0.35 * ra})`);
        g.addColorStop(1, 'rgba(165,148,255,0)');
        fx.fillStyle = g;
        fx.beginPath();
        fx.moveTo(0, 0); fx.lineTo(len, -len * 0.035); fx.lineTo(len, len * 0.035); fx.closePath();
        fx.fill();
        fx.restore();
      }
      fx.restore();
      if (!f.owner) return;
      // « DESIGN » (resserrement du tracking sur le mot dit), signature
      const yW = ly + H * 0.2;
      const tD = T - mD + 0.04;
      drawText(ui, B.word, Lp.cx + wordS * 0.3, yW, { size: wordS, weight: 600, tracking: 0.6, align: 'center', t: tD, mode: 'track', trackFrom: 1.4, dur: 0.35, color: C.white });
      textSweep(ui, B.word, Lp.cx + wordS * 0.3, yW, { size: wordS, weight: 600, tracking: 0.6, align: 'center' }, seg(tD, 0.2, 0.6), '#ffffff', 0.8);
      const yT = yW + tagS * 2.4;
      const w1 = textWidth(ui, t1, tagS, 500, 0.04), w2 = textWidth(ui, t2, tagS, 600, 0.04);
      const tx = Lp.cx - (w1 + w2) / 2;
      drawText(ui, t1, tx, yT, { size: tagS, weight: 500, tracking: 0.04, align: 'left', t: tD - 0.25, mode: 'fade', stagger: 0.012, dur: 0.3, color: '#d7d7de' });
      drawText(ui, t2, tx + w1, yT, { size: tagS, weight: 600, tracking: 0.04, align: 'left', t: tD - 0.4, mode: 'fade', stagger: 0.014, dur: 0.3, color: C.neon2 });
      void dur;
    },
  };
}
