// SCENE 01 — HOOK (0 → « Alors ») : impact dès la 3e image, la sculpture chromée fonce
// vers la caméra, sous-titres cinétiques calés mot à mot sur la voix, puis rush dans l'objet.

import { flare, sparks, shockRing, radialGlow } from '../core/draw.js';
import { pulse, win } from '../core/anim.js';
import { layout, captions, E, seg, lerp, fitSize } from './kit.js';

export default function createHook({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const probe = document.createElement('canvas').getContext('2d');
  const capS = 104 * Lp.u;
  void probe;

  return {
    update(f) {
      const { lt, post, fx } = f;
      const { obj, studio } = f.world;
      const end = f.clock.end - f.clock.start;
      const rush = E.inExpo(seg(lt, end - 0.32, end));
      if (f.owner) {
        f.camera([0.25 * (1 - rush), 0.1, lerp(lerp(8.2, 7.2, E.outCubic(seg(lt, 0, end))), 1.6, rush)], [0, -0.3, 0], 30, -0.05 * (1 - seg(lt, 0, 0.6)));
        studio.update(f.t, { glow: 0.12 + 0.9 * pulse(lt, 0.06, 0.01, 0.6), beams: 0.25, grid: 0, dust: 0.6, motes: 0.4, env: 0.9, envRot: lt * 0.8, rim: 1.4 });
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
        post.flash += 0.9 * pulse(lt, 0.07, 0.008, 0.18);
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
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      radialGlow(fx, W / 2, H * 0.56, W * 0.7, C.neon, 0.18 * seg(lt, 0.3, 0.6) * (1 - rush));
      fx.restore();

      // Typo cinétique
      const out = seg(lt, end - 0.22, end - 0.05);
      // sous-titres cinétiques = exactement ce que dit la voix
      captions(f, 'L1', cfg.texts.vo.L1, Lp.cx, H * 0.2, { size: capS, maxW: Lp.maxW, emph: ['VRAIMENT', 'VIDÉOS'], out });
    },
  };
}
