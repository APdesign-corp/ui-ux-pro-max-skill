// SCENE 01 — HOOK (0 → « Alors ») : impact dès la 3e image, la sculpture chromée fonce
// vers la caméra, typo « TU VEUX DES VIDÉOS / COMME ÇA ? » en slam, puis rush dans l'objet.

import { flare, sparks, shockRing, radialGlow, streak } from '../core/draw.js';
import { pulse, win } from '../core/anim.js';
import { layout, slam, E, seg, lerp, fitSize } from './kit.js';

export default function createHook({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const probe = document.createElement('canvas').getContext('2d');
  const [l1, l2] = cfg.texts.hook;
  const s1 = fitSize(probe, l1, 700, -0.02, Lp.maxW, 150 * Lp.u);
  const s2 = fitSize(probe, l2, 700, -0.03, Lp.maxW * 0.9, 210 * Lp.u);
  const y1 = H * 0.25, y2 = y1 + s2 * 1.05;

  return {
    update(f) {
      const { lt, post, fx } = f;
      const { obj, studio } = f.world;
      const end = f.clock.end - f.clock.start;
      const rush = E.inExpo(seg(lt, end - 0.32, end));
      if (f.owner) {
        f.camera([0.25 * (1 - rush), 0.1, lerp(lerp(8.2, 7.2, E.outCubic(seg(lt, 0, end))), 1.6, rush)], [0, -0.3, 0], 30, -0.05 * (1 - seg(lt, 0, 0.6)));
        studio.update(f.t, { glow: 0.1 + 0.6 * pulse(lt, 0.06, 0.01, 0.5), beams: 0.25, grid: 0, dust: 0.6, motes: 0.4, env: 0.9, envRot: lt * 0.8, rim: 1.4 });
        obj.knot.visible = true;
        const k = E.outExpo(seg(lt, 0.03, 0.42));
        obj.knot.position.set(0, -0.75, lerp(-38, 0, k));
        obj.knot.rotation.set(0.4 + lt * 1.2 + (1 - k) * 6, lt * 1.6 + (1 - k) * 9, 0.2);
        obj.knot.scale.setScalar(0.78);
        obj.knotWire.visible = lt < 0.5;
        obj.knotWire.position.copy(obj.knot.position);
        obj.knotWire.rotation.copy(obj.knot.rotation);
        obj.knotWire.scale.setScalar(0.78 * (1 + 0.5 * seg(lt, 0.3, 0.5)));
        obj.wireMat.opacity = 0.9 * (1 - seg(lt, 0.25, 0.5));
        obj.shards.visible = true;
        obj.shards.children.forEach((m) => {
          const { s, w } = m.userData;
          m.rotation.set(lt * w * 3 + s, lt * w * 2, s);
        });
        obj.shards.position.set(0, 0, lerp(-8, 2, E.outCubic(seg(lt, 0, end))));
        post.flash += 0.75 * pulse(lt, 0.07, 0.008, 0.14);
        post.flashColor = [0.85, 0.82, 1];
        post.ca += 0.012 * pulse(lt, 0.07, 0.01, 0.3) + 0.01 * rush;
        post.zoomBlur += 0.12 * (1 - k) * (lt > 0.03 ? 1 : 0) + 0.18 * rush;
        post.bloom += 0.5 * pulse(lt, 0.07, 0.01, 0.4);
        post.glitch += win(lt, 0.06, 0.07, 0.1, 0.16) * 0.7;
        post.dof = { focus: f.dist(obj.knot), aperture: 0.012, maxblur: 0.006 };
        const ti = lt - 0.42;
        if (ti >= 0 && ti < 0.6) post.shock = [0.5, 0.56, 0.03 + E.outExpo(ti / 0.6) * 0.7, (1 - ti / 0.6) * 0.5];
        post.fade *= seg(lt, 0, 0.05);
      }
      // VFX : gerbe + onde de choc à l'arrivée de l'objet
      const [kx, ky] = f.project(obj.knot);
      const ti = lt - 0.42;
      shockRing(fx, kx, ky, ti, f, { radius: 1400, width: 18, dur: 0.7, color: C.neon });
      shockRing(fx, kx, ky, ti - 0.06, f, { radius: 900, width: 6, dur: 0.6, color: C.teal, alpha: 0.6 });
      sparks(fx, kx, ky, ti, f, { count: 120, seed: 3, speed: 2400, life: 0.8, color: C.neon2 });
      flare(fx, kx, ky, 1.1 * pulse(lt, 0.42, 0.02, 0.35) * cfg.vfx.flares, f, C.neon);
      // speed lines radiales (hyperespace) pendant l'arrivée puis pendant le rush final
      const sl = (1 - seg(lt, 0.05, 0.45)) * seg(lt, 0.02, 0.06) + rush;
      if (sl > 0.01) {
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 60; i++) {
          const ang = i * 2.39996;
          const d0 = W * (0.12 + ((i * 0.618 + lt * 3) % 1) * 0.6);
          const d1 = d0 + W * 0.25 * sl;
          const c0 = Math.cos(ang), s0 = Math.sin(ang);
          streak(fx, kx + c0 * d0, ky + s0 * d0, kx + c0 * d1, ky + s0 * d1, 3 * f.u, i % 3 ? C.neon2 : '#ffffff', 0.6 * sl);
        }
        fx.restore();
      }
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      radialGlow(fx, W / 2, H * 0.56, W * 0.7, C.neon, 0.18 * seg(lt, 0.3, 0.6) * (1 - rush));
      fx.restore();

      // Typo cinétique
      const out = seg(lt, end - 0.22, end - 0.05);
      const tA = f.t - f.mark('L1.Tu', 0.15) + 0.04;
      const tB = f.t - f.mark('L1.vidéos', 1.0) + 0.04;
      slam(f, l1, Lp.cx, y1, { t: tA, size: s1, color: C.white, from: 2.2, dur: 0.3, out, glow: 0.18 });
      slam(f, l2, Lp.cx, y2, { t: tB, size: s2, color: C.neon2, glowColor: C.neon, from: 3, dur: 0.28, out, glow: 0.5, pulse: 0.04 * pulse(tB, 0.3, 0.01, 0.3) });
    },
  };
}
