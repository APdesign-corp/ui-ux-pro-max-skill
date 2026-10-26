// SCENE 05 — « Plus qu'une connexion, un meilleur quotidien. » La typographie de l'affiche, ligne par
// ligne sur la voix (« connexion, » en dégradé animé), soulignée par la barre dégradée ; la TV, la box et
// le smartphone flottent en arrière-plan, flous (profondeur de champ) ; sortie : le texte se disperse en points.

import { pulse } from '../core/anim.js';
import { brandGradient } from '../world/brand.js';
import { dynamicBg, beatAt, dotScatter } from './trans.js';
import { layout, E, seg, lerp, fitSize, setFont, textWidth } from './kit.js';

export default function createPromise({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const u = Lp.u;
  const probe = document.createElement('canvas').getContext('2d');
  const [l1, l2, l3, l4] = cfg.brand.headline;
  const big = fitSize(probe, l2, 800, -0.02, W * 0.78, 168 * u);
  const mid = big * 0.7;
  const LINES = [
    { s: l1, key: 'L5.Plus', size: mid, w: 700, col: 'navy' },
    { s: l2, key: 'L5.connexion', size: big, w: 800, col: 'grad' },
    { s: l3, key: 'L5.un', size: mid, w: 700, col: 'navy' },
    { s: l4, key: 'L5.quotidien', size: big, w: 800, col: 'navy' },
  ];

  return {
    update(f) {
      const { post, ui, bg } = f;
      const T = f.t;
      const st = f.clock.start, end = f.clock.end;
      const lt = T - st;
      const { props, hero, studio } = f.world;
      const out = seg(T, end - 0.32, end);
      if (!f.owner) return;
      dynamicBg(bg, W, H, T, { k: 0.9, beat: beatAt(T) * 0.6, cy: 0.35 });
      const p = lt / (end - st);
      f.camera([lerp(0.6, -0.4, p), lerp(-0.2, 0.1, p), 5.4], [0, -0.9, 0], 32, 0.04);
      studio.update(T, { backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 1.25, envRot: T * 0.15, key: 1.3, rim: 0.6 });
      post.bloom = 0.12; post.vignette = 0.12;
      post.dof = { focus: 2.0, aperture: 0.05, maxblur: 0.016 };
      post.flash += 0.7 * pulse(lt, 0.0, 0.004, 0.16);
      post.flashColor = [1, 0.97, 0.9];
      // 3D d'ambiance, flottante et floue
      props.tv.visible = true; props.box.visible = true; hero.group.visible = true;
      props.tv.position.set(0.15, -1.75, -1.8); props.tv.scale.setScalar(0.75); props.tv.rotation.set(0, -0.35 + 0.1 * Math.sin(T * 0.7), 0);
      props.tv.userData.screenMat.opacity = 1; props.tv.userData.screenMat.color.setScalar(1);
      props.box.position.set(-0.75, -2.25, -0.6); props.box.scale.setScalar(0.6); props.box.rotation.set(0.15, 0.6 + T * 0.3, 0);
      hero.setExplode(0, T);
      hero.group.position.set(0.85, -2.0 + 0.06 * Math.sin(T * 1.4), -0.3); hero.group.scale.setScalar(0.6); hero.group.rotation.set(0.1, -0.6 + T * 0.4, -0.15);

      // typographie ligne par ligne (calée sur les mots)
      const x0 = W * 0.09;
      let y = H * 0.2;
      LINES.forEach((L) => {
        y += L.size * 1.13;
        const t0 = f.mark(L.key, st + 0.2);
        const k = E.outExpo(seg(T, t0 - 0.03, t0 + 0.32));
        if (k <= 0) return;
        ui.save();
        ui.globalAlpha = 1 - out;
        ui.beginPath(); ui.rect(0, y - L.size * 1.05, W, L.size * 1.35); ui.clip();
        setFont(ui, L.size, L.w, -0.02);
        ui.textAlign = 'left';
        if (L.col === 'grad') {
          const tw = textWidth(ui, L.s, L.size, L.w, -0.02);
          const sh = 0.15 * Math.sin(T * 1.6);
          ui.fillStyle = brandGradient(ui, x0 - tw * sh, y, x0 + tw * (1 - sh), y);
        } else ui.fillStyle = C.navy;
        ui.fillText(L.s, x0, y + (1 - k) * L.size * 1.1);
        ui.restore();
      });
      // barre dégradée sous le texte
      const kb = E.outExpo(seg(T, f.mark('L5.quotidien', st + 1.5) + 0.25, f.mark('L5.quotidien', st + 1.5) + 0.75));
      if (kb > 0) {
        ui.save(); ui.globalAlpha = 1 - out;
        ui.fillStyle = brandGradient(ui, x0, 0, x0 + W * 0.42, 0);
        ui.beginPath(); ui.roundRect(x0, y + big * 0.45, W * 0.42 * kb, 14 * u, 7 * u); ui.fill();
        ui.restore();
      }
      // sortie : dispersion en points de marque (ils reformeront le logo)
      dotScatter(ui, W, H, out, 3, 300);
      void setFont;
    },
  };
}
