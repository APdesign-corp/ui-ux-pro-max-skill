// SCENE 02 — SHOWREEL (« Alors arrête le contenu banal. ») : coupes rapides (~0.3 s)
// smartphone en orbite, macro chrome + DOF, hologramme filaire + HUD, produits, orbe de verre.
// Chaque coupe = flash + whip blur (et un son distinct dans la timeline).

import { hudRing, radialGlow, streak } from '../core/draw.js';
import { pulse, noise1 } from '../core/anim.js';
import { E, seg, lerp, setFont } from './kit.js';

export default function createShowreel({ cfg, assets, W, H, u }) {
  const C = cfg.colors;
  const N = 5;
  return {
    update(f) {
      const { lt, post, fx, ui } = f;
      const { obj, studio, hero, acc } = f.world;
      const dur = f.clock.end - f.clock.start;
      const D = dur / N;
      const i = Math.min(N - 1, Math.floor(lt / D));
      const s = lt - i * D; // temps dans le plan
      const p = s / D;
      if (!f.owner) return;
      const dir = i % 2 ? -1 : 1;
      studio.update(f.t, { glow: 0.35 + 0.25 * (i === 2), beams: i === 1 ? 0.5 : 0.25, grid: i === 2 ? 0.35 : 0, dust: 0.8, motes: 0.6, env: 1.2, envRot: f.t * 0.6 + i, rim: 1.3 });
      // coupe : flash + whip blur + petite aberration
      const cut = pulse(s, 0, 0.004, 0.09);
      post.flash += 0.35 * cut;
      post.flashColor = [0.8, 0.78, 1];
      post.blur = [dir * 0.03 * (1 - E.outCubic(seg(s, 0, 0.12))) + dir * 0.02 * E.inCubic(seg(p, 0.85, 1)), 0];
      post.ca += 0.006 * cut;
      if (i === 0) { // smartphone en orbite + HUD
        hero.group.visible = true;
        hero.setCracked(false);
        hero.setExplode(0.25 * E.inOutCubic(p), f.t);
        hero.group.position.set(0, 0, 0);
        hero.group.rotation.set(0.15, -0.9 + p * 1.5, 0.12);
        hero.group.scale.setScalar(1);
        f.camera([0, 0.1, lerp(4.6, 4.0, p)], [0, 0, 0], 30, 0.04);
        post.dof = { focus: f.dist(hero.group), aperture: 0.01, maxblur: 0.005 };
        const [x, y] = f.project(hero.group);
        hudRing(fx, assets.hud, x, y, 520 * u, f.t, 0.55 * seg(s, 0.02, 0.12), f, C.neon);
      } else if (i === 1) { // macro chrome + balayage lumineux
        obj.knot.visible = true;
        obj.knot.position.set(0, 0, 0);
        obj.knot.scale.setScalar(1);
        obj.knot.rotation.set(0.8, f.t * 0.9, 0.3);
        f.camera([lerp(0.9, 0.4, p), 0.35, 2.0], [0.35, 0.05, 0], 30, -0.1);
        post.dof = { focus: 1.6, aperture: 0.03, maxblur: 0.01 };
        const x = lerp(-W * 0.2, W * 1.2, E.inOutSine(p));
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        streak(fx, x - W * 0.6, H * 0.2, x, H * 0.8, 40 * u, C.neon2, 0.45);
        fx.restore();
      } else if (i === 2) { // hologramme filaire + HUD
        obj.knotWire.visible = true;
        obj.wireMat.opacity = 0.9;
        obj.knotWire.position.set(0, 0, 0);
        obj.knotWire.scale.setScalar(0.85);
        obj.knotWire.rotation.set(f.t * 1.1, f.t * 1.4, 0);
        f.camera([0, 0, lerp(5.2, 4.6, p)], [0, 0, 0], 32);
        hudRing(fx, assets.hud, W / 2, H / 2, 640 * u, f.t * 1.4, 0.85, f, C.neon);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, W / 2, H / 2, W * 0.5, C.neon, 0.3);
        fx.restore();
      } else if (i === 3) { // produits (casque + écouteurs) — « banal » : glitch
        acc.group.visible = true;
        acc.headphones.visible = true;
        acc.headphones.position.set(0, 0.35, 0);
        acc.headphones.rotation.set(0.25, -0.6 + p * 1.2, 0.05);
        acc.headphones.scale.setScalar(1);
        acc.earbuds.visible = true;
        acc.earbuds.position.set(0.15, -0.75, 0.6);
        acc.earbuds.rotation.set(0.4, p * 2, 0.2);
        acc.earbuds.scale.setScalar(1);
        f.camera([lerp(-0.4, 0.3, p), 0.1, 4.6], [0, -0.1, 0], 30);
        post.dof = { focus: f.dist(acc.headphones), aperture: 0.012, maxblur: 0.006 };
        const tb = f.t - f.mark('L2.banal', 2.8);
        post.glitch += (tb > 0 && tb < 0.25 ? 1 - tb / 0.25 : 0) * 1.2;
        post.ca += tb > 0 && tb < 0.2 ? 0.01 : 0;
      } else { // orbe de verre + anneaux
        obj.orb.visible = true;
        obj.rings.visible = true;
        obj.orb.position.set(0, 0, 0);
        obj.orb.rotation.set(0, f.t, 0);
        obj.orb.userData.core.rotation.set(f.t * 2, f.t * 3, 0);
        obj.rings.position.set(0, 0, 0);
        obj.rings.children.forEach((r, k) => r.rotation.set(1.2 + k * 0.4 + f.t * (0.6 + k * 0.3), f.t * (0.4 - k * 0.2), 0));
        obj.rings.scale.setScalar(0.9);
        f.camera([Math.sin(p * 0.8) * 1.2, 0.3, lerp(6.4, 5.4, p)], [0, 0, 0], 32);
        post.dof = { focus: f.dist(obj.orb), aperture: 0.01, maxblur: 0.006 };
        post.zoomBlur += 0.12 * E.inCubic(seg(p, 0.6, 1));
      }
      // compteur de plan discret (hors safe zones critiques, à gauche)
      setFont(ui, 26 * u, 600, 0.3);
      ui.save();
      ui.globalAlpha = 0.6;
      ui.fillStyle = C.muted;
      ui.fillText(`0${i + 1} / 0${N}`, W * 0.08, H * 0.2);
      ui.fillStyle = C.neon2;
      ui.fillRect(W * 0.08, H * 0.2 + 18 * u, 120 * u * ((lt / dur) + noise1(0) * 0), 3 * u);
      ui.restore();
    },
  };
}
