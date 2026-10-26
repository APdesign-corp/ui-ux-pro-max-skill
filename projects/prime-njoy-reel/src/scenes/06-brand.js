// SCENE 06 — « Prime N'Joy. Télécom et énergie. Ensemble, allons plus loin. » Signature :
// les points se rassemblent en cercle de logo, PRIME (bleu) N'JOY (orange) s'écrivent sur la voix,
// pastilles TÉLÉCOM (antenne) | ÉNERGIE (éclair), signature, vague de dégradé en bas ; fin en blanc (boucle).

import { pulse, TAU } from '../core/anim.js';
import { ringDots, drawRing, iconBadge, brandGradient } from '../world/brand.js';
import { dynamicBg, beatAt } from './trans.js';
import { sparks } from '../core/draw.js';
import { layout, E, seg, lerp, fitSize, setFont, textWidth } from './kit.js';

export default function createBrand({ cfg, W, H }) {
  const C = cfg.colors;
  const B = cfg.brand;
  const Lp = layout(W, H);
  const u = Lp.u;
  const dots = ringDots(5);
  const probe = document.createElement('canvas').getContext('2d');
  const nameS = fitSize(probe, B.name, 600, 0.02, W * 0.8, 130 * u);
  const tagS = fitSize(probe, B.tagline, 600, 0.16, W * 0.78, 40 * u);

  return {
    update(f) {
      const { post, ui, bg } = f;
      const T = f.t;
      const st = f.clock.start, end = f.clock.end;
      const lt = T - st;
      if (!f.owner) return;
      dynamicBg(bg, W, H, T, { k: 0.6, beat: beatAt(T) * 0.5, cy: 0.33 });
      f.camera([0, 0, 8], [0, 0, 0], 30);
      f.world.studio.update(T, { backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 1 });
      post.bloom = 0.08; post.vignette = 0.08;
      const mP = f.mark('L6.Prime', st + 0.15), mJ = f.mark("L6.N'Joy", mP + 0.35);
      const mTel = f.mark('L6.Télécom', mJ + 0.7), mEn = f.mark('L6.énergie', mTel + 0.6);
      const mEns = f.mark('L6.Ensemble', mEn + 0.6);

      // cercle de points : rassemblement depuis la dispersion de la scène précédente
      const cx = W / 2, cy = H * 0.33, R = W * 0.27;
      const form = seg(lt, 0, 0.75);
      drawRing(ui, dots, cx, cy, R, { form, spin: T * 0.12, pulse: 0.5 * pulse(T, mJ + 0.05, 0.01, 0.4), scatter: 'burst', scatterR: W * 0.8 });
      sparks(f.fx, cx, cy, T - (mJ + 0.05), f, { count: 50, seed: 4, speed: 1200, life: 0.5, color: '#ffffff' });

      // PRIME N'JOY
      setFont(ui, nameS, 600, 0.02);
      const w1 = textWidth(ui, 'PRIME ', nameS, 600, 0.02), w2 = textWidth(ui, B.second, nameS, 600, 0.02);
      const x0 = cx - (w1 + w2) / 2, y = H * 0.565;
      for (const [txt, x, t0, col] of [['PRIME', x0, mP, C.blue], [B.second, x0 + w1, mJ, C.orange]]) {
        const k = E.outExpo(seg(T, t0 - 0.04, t0 + 0.3));
        if (k <= 0) continue;
        ui.save();
        ui.beginPath(); ui.rect(x - 10, y - nameS * 1.0, textWidth(ui, txt, nameS, 600, 0.02) + 20, nameS * 1.25); ui.clip();
        setFont(ui, nameS, 600, 0.02); ui.fillStyle = col; ui.textAlign = 'left';
        ui.fillText(txt, x, y + (1 - k) * nameS * 1.05);
        ui.restore();
      }
      // signature « ENSEMBLE, ALLONS PLUS LOIN » (resserrement du tracking)
      const kt = E.outCubic(seg(T, mEns - 0.05, mEns + 0.5));
      if (kt > 0) {
        const tr = lerp(0.5, 0.16, kt);
        setFont(ui, tagS, 600, tr);
        const tw = textWidth(ui, B.tagline, tagS, 600, tr);
        ui.save(); ui.globalAlpha = kt; ui.fillStyle = C.blue; ui.textAlign = 'left';
        setFont(ui, tagS, 600, tr); ui.fillText(B.tagline, cx - tw / 2, y + tagS * 1.9);
        ui.restore();
      }
      // pastilles TÉLÉCOM | ÉNERGIE
      const by = H * 0.69, fs = 42 * u, R2 = 46 * u;
      for (const [label, icon, fill, ink, t0, side] of [['TÉLÉCOM', 'antenna', C.blue, C.navy, mTel, -1], ['ÉNERGIE', 'bolt', C.amber, C.orange, mEn, 1]]) {
        const k = E.outBack(seg(T, t0 - 0.03, t0 + 0.3), 2);
        if (k <= 0) continue;
        setFont(ui, fs, 600, 0.04);
        const tw = textWidth(ui, label, fs, 600, 0.04);
        const bx = cx + side * W * 0.215;
        iconBadge(ui, icon, bx - tw / 2 - R2 * 0.6, by, R2, { fill, ink: '#ffffff', scale: k });
        ui.save(); ui.globalAlpha = seg(T, t0, t0 + 0.2); ui.fillStyle = ink; ui.textAlign = 'left';
        setFont(ui, fs, 600, 0.04); ui.fillText(label, bx - tw / 2 + R2 * 0.75, by + fs * 0.36);
        ui.restore();
      }
      const kd = seg(T, mEn - 0.1, mEn + 0.2);
      if (kd > 0) { ui.fillStyle = `rgba(13,27,94,${0.25 * kd})`; ui.fillRect(cx - 1.5 * u, by - 44 * u, 3 * u, 88 * u * kd); }

      // vague de dégradé en bas (comme l'affiche)
      const kw = E.outCubic(seg(lt, 0.2, 1.2));
      ui.save();
      ui.fillStyle = brandGradient(ui, 0, H, W, H * 0.8);
      ui.beginPath(); ui.moveTo(0, H);
      const base = H * (1.02 - 0.12 * kw);
      ui.lineTo(0, base);
      ui.bezierCurveTo(W * 0.35, base - 90 * u + 20 * u * Math.sin(T * 1.3), W * 0.65, base + 60 * u, W, base - 50 * u * Math.cos(T));
      ui.lineTo(W, H); ui.closePath(); ui.fill();
      ui.restore();

      // fin : fondu au blanc (boucle vers l'accroche claire)
      post.flash += 0.95 * E.inCubic(seg(T, end - 0.35, end));
      post.flashColor = [1, 1, 1];
      void TAU;
    },
  };
}
