// SCENE 01 — ACCROCHE « Internet, télé, mobile… Vous payez encore trop cher ? »
// Fond clair « aurore » ; une pastille-icône par mot (Wi-Fi, TV, mobile) ; sur « cher » l'étiquette
// 86,99 €/mois s'écrase, tremble et se fissure ; sortie : points de marque qui recouvrent l'écran.

import { pulse, TAU } from '../core/anim.js';
import { iconBadge, brandAt } from '../world/brand.js';
import { aurora, dotWipe } from './trans.js';
import { layout, captions, E, seg, lerp, setFont, textWidth } from './kit.js';

export default function createHook({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const u = Lp.u;
  const icons = [['wifi', 'L1a.Internet', 0.22], ['tv', 'L1a.télé', 0.5], ['phone', 'L1a.mobile', 0.78]];

  return {
    update(f) {
      const { lt, post, ui, bg } = f;
      const T = f.t;
      const end = f.clock.end;
      if (f.owner) {
        aurora(bg, W, H, T);
        f.camera([0, 0, 8], [0, 0, 0], 30);
        f.world.studio.update(T, { backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 1 });
        post.bloom = 0.12; post.vignette = 0.18; post.ca = 0.0006;
        post.flash += 0.6 * pulse(lt, 0.02, 0.005, 0.12);
        post.flashColor = [1, 1, 1];
      }
      const mCher = f.mark('L1b.cher', f.clock.start + 1.6);
      const tc = T - mCher;
      // ---- pastilles-icônes, une par mot
      const R = 118 * u;
      const scatter = E.inCubic(seg(tc, 0.05, 0.4));
      icons.forEach(([name, key, px], i) => {
        const ti = T - f.mark(key, 0.2 + i * 0.3) + 0.04;
        if (ti < 0) return;
        const k = E.outBack(seg(ti, 0, 0.32), 2.2);
        const float = Math.sin(T * 2.2 + i) * 8 * u;
        const x = W * px + (px - 0.5) * W * 0.5 * scatter, y = H * 0.5 + float - scatter * H * 0.12 * (i - 1);
        // anneau d'onde à l'apparition
        const ring = seg(ti, 0, 0.5);
        if (ring < 1) {
          ui.save(); ui.globalAlpha = 1 - ring; ui.strokeStyle = brandAt(px); ui.lineWidth = 6 * u * (1 - ring);
          ui.beginPath(); ui.arc(x, y, R * (1 + ring * 0.9), 0, TAU); ui.stroke(); ui.restore();
        }
        ui.save();
        ui.shadowColor = 'rgba(13,27,94,0.18)'; ui.shadowBlur = 40 * u; ui.shadowOffsetY = 14 * u;
        iconBadge(ui, name, x, y, R, { scale: k * (1 - scatter * 0.6), shift: px - 0.5, alpha: 1 - scatter * 0.7 });
        ui.restore();
      });

      // ---- étiquette 86,99 €/mois sur « cher » : écrasement, tremblement, fissure
      if (tc > -0.02) {
        const k = E.outExpo(seg(tc, -0.02, 0.22));
        const sc = lerp(2.4, 1, k);
        const shake = Math.sin(tc * 70) * 10 * u * Math.exp(-tc * 6) * (tc > 0.1 ? 1 : 0);
        const x = Lp.cx + shake, y = H * 0.66;
        const txt = cfg.offer.old;
        const fs = 104 * u;
        setFont(ui, fs, 800, -0.02);
        const tw = textWidth(ui, txt, fs, 800, -0.02);
        const bw = tw + fs * 1.1, bh = fs * 1.7;
        ui.save();
        ui.globalAlpha = seg(tc, -0.02, 0.05);
        ui.translate(x, y); ui.rotate(-0.05 * (1 - k) - 0.03); ui.scale(sc, sc); ui.translate(-x, -y);
        ui.shadowColor = 'rgba(13,27,94,0.25)'; ui.shadowBlur = 50 * u; ui.shadowOffsetY = 20 * u;
        ui.fillStyle = '#ffffff'; ui.beginPath(); ui.roundRect(x - bw / 2, y - bh / 2, bw, bh, 28 * u); ui.fill();
        ui.shadowColor = 'transparent';
        ui.lineWidth = 5 * u; ui.strokeStyle = '#e62f77'; ui.stroke();
        ui.fillStyle = C.navy; ui.textAlign = 'left'; ui.textBaseline = 'alphabetic';
        setFont(ui, fs, 800, -0.02);
        ui.fillText(txt, x - tw / 2, y + fs * 0.36);
        // fissures
        const cr = seg(tc, 0.18, 0.35);
        if (cr > 0) {
          ui.strokeStyle = 'rgba(13,27,94,0.85)'; ui.lineWidth = 3 * u;
          for (let j = 0; j < 7; j++) {
            const a = j * 0.9 + 0.3;
            ui.beginPath(); ui.moveTo(x + bw * 0.18, y - bh * 0.1);
            let px = x + bw * 0.18, py = y - bh * 0.1;
            for (let s = 1; s <= 4; s++) { px += Math.cos(a + Math.sin(s * 3 + j) * 0.5) * bw * 0.07 * cr; py += Math.sin(a + Math.cos(s * 2 + j) * 0.5) * bh * 0.14 * cr; ui.lineTo(px, py); }
            ui.stroke();
          }
        }
        ui.restore();
        if (f.owner) {
          post.glitch += pulse(tc, 0.0, 0.005, 0.12) * 0.9 + pulse(tc, 0.2, 0.005, 0.1) * 0.6;
          post.ca += 0.008 * pulse(tc, 0, 0.005, 0.2);
          post.zoomBlur += 0.06 * pulse(tc, 0, 0.005, 0.15);
        }
      }

      // ---- sous-titres = la voix
      const capS = 78 * u;
      captions(f, 'L1a', cfg.texts.vo.L1a, Lp.cx, H * 0.2, { size: capS, maxW: Lp.maxW, color: C.navy, accent: C.purple, shadow: 0, glow: false, out: seg(T, f.mark('L1b.Vous', 1.2) - 0.1, f.mark('L1b.Vous', 1.2)) });
      captions(f, 'L1b', cfg.texts.vo.L1b, Lp.cx, H * 0.2, { size: capS * 1.08, maxW: Lp.maxW, color: C.navy, accent: C.magenta, emph: ['CHER'], shadow: 0, glow: false });

      // ---- sortie : points de marque qui grossissent depuis l'étiquette jusqu'au bleu nuit
      if (T < end) dotWipe(ui, W, H, seg(T, end - 0.38, end), { ox: 0.5, oy: 0.66, solid: '#0b1650' });
    },
  };
}
