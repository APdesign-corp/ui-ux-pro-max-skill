// SCENE 02 — « Avec Prime N'Joy, tout est réuni. » Bleu nuit : des points de marque tourbillonnent
// et forment le cercle du logo ; PRIME N'JOY s'écrit ; sur « réuni » les icônes sont aspirées au centre
// (onde de choc) ; sortie : zoom à travers le trou du cercle (iris) vers la scène produits.

import { pulse, TAU } from '../core/anim.js';
import { ringDots, drawRing, iconBadge, brandAt } from '../world/brand.js';
import { nightDynamic, beatAt, dotWipe, iris } from './trans.js';
import { sparks, shockRing, radialGlow } from '../core/draw.js';
import { layout, captions, E, seg, lerp, setFont, textWidth } from './kit.js';

export default function createUnite({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const u = Lp.u;
  const dots = ringDots(5);

  return {
    update(f) {
      const { post, ui, bg, fx } = f;
      const T = f.t;
      const st = f.clock.start, end = f.clock.end;
      const lt = T - st;
      const mBrand = f.mark('L2.Prime', st + 0.35);
      const mJoy = f.mark("L2.N'Joy", mBrand + 0.3);
      const mRe = f.mark('L2.réuni', mJoy + 0.8);
      const cx = W / 2, cy = H * 0.47;
      const zoom = E.inExpo(seg(T, end - 0.35, end + 0.35));
      const R = W * 0.3 * (1 + zoom * 14);

      if (f.owner) {
        nightDynamic(bg, W, H, T, beatAt(T));
        f.camera([0, 0, 8], [0, 0, 0], 30);
        f.world.studio.update(T, { backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 1 });
        post.bloom = 0.6; post.vignette = 0.7;
        post.flash += 0.5 * pulse(T, mRe + 0.12, 0.005, 0.18);
        post.flashColor = [0.85, 0.85, 1];
        const ts = T - (mRe + 0.12);
        if (ts > 0 && ts < 0.6) post.shock = [0.5, cy / H, 0.03 + E.outExpo(ts / 0.6) * 0.8, (1 - ts / 0.6) * 0.5];
        post.zoomBlur += 0.25 * zoom;
        post.ca += 0.01 * zoom;
      }

      if (f.owner) {
        // cercle du logo qui se forme (tourbillon) puis respire
        const form = seg(T, st + 0.05, mJoy + 0.35);
        const breathe = pulse(T, mRe + 0.12, 0.01, 0.5);
        fx.save(); fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, cx, cy, W * 0.55, C.purple, 0.25 * form + 0.5 * breathe);
        fx.restore();
        drawRing(ui, dots, cx, cy, R, { form, spin: T * 0.25, pulse: breathe * 0.6, scatter: 'vortex', scatterR: W * 0.9 });

        // les 3 icônes arrivent des bords et sont aspirées au centre sur « réuni »
        const tr = T - (mRe - 0.25);
        ['wifi', 'tv', 'phone'].forEach((n, i) => {
          const a0 = -Math.PI / 2 + (i - 1) * 2.1;
          const k = E.inCubic(seg(tr, 0, 0.42));
          if (tr < -0.6 || k >= 1) return;
          const appear = E.outBack(seg(tr, -0.6, -0.3), 2);
          const d = lerp(W * 0.62, 0, k);
          const x = cx + Math.cos(a0 + k * 1.5) * d, y = cy + Math.sin(a0 + k * 1.5) * d * 0.9;
          iconBadge(ui, n, x, y, 80 * u * (1 - k * 0.85), { scale: appear, alpha: 1 - k * 0.5, shift: i * 0.3 - 0.3 });
        });
        sparks(fx, cx, cy, T - (mRe + 0.12), f, { count: 140, seed: 9, speed: 2400, life: 0.8, color: '#ffffff' });
        shockRing(fx, cx, cy, T - (mRe + 0.12), f, { radius: 1100, width: 14, dur: 0.7, color: C.magenta });
        shockRing(fx, cx, cy, T - (mRe + 0.18), f, { radius: 800, width: 6, dur: 0.6, color: C.cyan, alpha: 0.7 });

        // PRIME N'JOY (sous le cercle)
        const fs = 110 * u;
        setFont(ui, fs, 600, 0.02);
        const w1 = textWidth(ui, 'PRIME ', fs, 600, 0.02), w2 = textWidth(ui, "N'JOY", fs, 600, 0.02);
        const x0 = cx - (w1 + w2) / 2, y = cy + W * 0.3 * 1.5 + fs * 0.4;
        const out = zoom;
        for (const [txt, x, t0, col] of [['PRIME', x0, mBrand, '#ffffff'], ["N'JOY", x0 + w1, mJoy, C.orange]]) {
          const k = E.outExpo(seg(T, t0 - 0.02, t0 + 0.3));
          if (k <= 0) continue;
          ui.save();
          ui.globalAlpha = k * (1 - out);
          ui.beginPath(); ui.rect(x - fs, y - fs * 1.05, textWidth(ui, txt, fs, 600, 0.02) + fs * 2, fs * 1.3); ui.clip();
          setFont(ui, fs, 600, 0.02); ui.fillStyle = col; ui.textAlign = 'left';
          ui.fillText(txt, x, y + (1 - k) * fs);
          ui.restore();
        }
        captions(f, 'L2', cfg.texts.vo.L2, Lp.cx, H * 0.17, { size: 72 * u, maxW: Lp.maxW, color: '#ffffff', accent: C.amber, emph: ['RÉUNI'], shadow: 0.3, out: zoom * 2 });
        // entrée : les points de la scène précédente se rétractent
        dotWipe(ui, W, H, 1 - seg(lt, 0, 0.32), { ox: 0.5, oy: 0.66 });
      } else if (T < end + 0.35) {
        // après la coupe : voile bleu nuit percé du trou du cercle qui continue de grandir (iris)
        iris(ui, W, H, cx, cy, 0.4 * R, '#0b1650');
        drawRing(ui, dots, cx, cy, R, { form: 1, spin: T * 0.25 });
      }
      void brandAt;
    },
  };
}
