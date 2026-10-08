// SCENE 03 — HERO SHOT « MOTION DESIGN » : la typo est intégrée dans la profondeur de la
// scène 3D — « MOTION » derrière la sculpture chromée (occultée par elle), « DESIGN » devant,
// couleur accent ; caméra en travelling lent, profondeur de champ.

import { pulse } from '../core/anim.js';
import { radialGlow } from '../core/draw.js';
import { textPlane, E, seg, lerp } from './kit.js';

export default function createHero({ cfg, world }) {
  const C = cfg.colors;
  const [w1, w2] = cfg.texts.hero.split(' ');
  const back = textPlane(cfg, w1, { color: '#f5f5f7', height: 0.62, weight: 700, tracking: -0.03 });
  const backLine = textPlane(cfg, w1, { color: C.neon2, height: 0.62, weight: 700, tracking: -0.03, outline: true });
  const front = textPlane(cfg, w2, { color: C.neon2, height: 0.34, weight: 700, tracking: 0.12 });
  for (const m of [back, backLine, front]) world.obj.extra.add(m);

  return {
    update(f) {
      const { lt, post, W, H } = f;
      const { obj, studio } = f.world;
      if (!f.owner) return;
      const dur = f.clock.end - f.clock.start;
      const p = lt / dur;
      f.camera([lerp(-0.5, 0.35, E.inOutSine(p)), lerp(0.25, 0.05, p), lerp(6.4, 5.6, E.outCubic(p))], [0, 0.05, 0], 30, 0.03);
      studio.update(f.t, { glow: 0.55, beams: 0.45, grid: 0.18, dust: 1, motes: 0.8, env: 0.9, envRot: f.t * 0.5, rim: 1.5 });
      obj.knot.visible = true;
      obj.knot.position.set(0, -0.25, 0);
      obj.knot.rotation.set(0.5 + f.t * 0.35, f.t * 0.6, 0.25);
      obj.knot.scale.setScalar(0.72);
      obj.shards.visible = true;
      obj.shards.position.set(0, 0, 0);
      obj.shards.children.forEach((m) => m.rotation.set(f.t * m.userData.w + m.userData.s, f.t * m.userData.w, 0));

      const tM = f.t - f.mark('L3.Motion', f.clock.start + 0.1);
      const tD = f.t - f.mark('L3.design', f.clock.start + 0.4);
      const a1 = E.outExpo(seg(tM, -0.02, 0.35));
      back.visible = backLine.visible = a1 > 0;
      back.position.set(-0.02, 0.98, lerp(-4, -1.3, a1));
      back.scale.setScalar(lerp(1.4, 1, a1));
      back.material.opacity = a1 * 0.95;
      backLine.position.set(-0.02, 0.98, 0);
      backLine.position.z = back.position.z - 0.02;
      backLine.scale.copy(back.scale);
      backLine.material.opacity = a1 * 0.6;
      const a2 = E.outExpo(seg(tD, -0.02, 0.3));
      front.visible = a2 > 0;
      front.position.set(0, lerp(-1.4, -0.82, a2), lerp(2.2, 0.9, a2));
      front.material.opacity = a2;
      front.material.color.setScalar(1.0 + 0.8 * pulse(tD, 0.02, 0.01, 0.3));
      post.dof = { focus: f.dist(obj.knot) + 0.4, aperture: 0.0025, maxblur: 0.002 };
      post.bloom += 0.25 * pulse(tM, 0, 0.01, 0.35) + 0.25 * pulse(tD, 0, 0.01, 0.3);
      post.flash += 0.25 * pulse(lt, 0.0, 0.006, 0.12);
      post.flashColor = [0.85, 0.8, 1];
      post.zoomBlur += 0.08 * (1 - E.outCubic(seg(lt, 0, 0.2)));
      f.fx.save();
      f.fx.globalCompositeOperation = 'lighter';
      radialGlow(f.fx, W * 0.5, H * 0.5, W * 0.6, C.neon, 0.2 + 0.15 * pulse(tD, 0, 0.01, 0.4));
      f.fx.restore();
    },
  };
}
