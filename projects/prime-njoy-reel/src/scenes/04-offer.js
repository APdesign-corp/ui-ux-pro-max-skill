// SCENE 04 — « Le tout pour 45 € par mois, au lieu de 86,99 €. » Carte en dégradé de marque (comme
// l'affiche) qui se retourne ; le prix défile de 86 → 45 et s'écrase ; pastille TV + INTERNET + GSM ;
// l'ancien prix apparaît et se fait barrer ; confettis de points ; sortie : éclair « énergie » + flash.

import { pulse, TAU, rng } from '../core/anim.js';
import { brandGradient, brandAt } from '../world/brand.js';
import { dynamicBg, beatAt, gradientSwipe, lightning } from './trans.js';
import { layout, captions, E, seg, lerp, setFont, textWidth } from './kit.js';

export default function createOffer({ cfg, W, H }) {
  const C = cfg.colors;
  const O = cfg.offer;
  const Lp = layout(W, H);
  const u = Lp.u;
  const conf = (() => { const r = rng(44); return Array.from({ length: 70 }, () => ({ a: r() * TAU, s: 0.4 + r(), z: 4 + r() * 12, c: r() })); })();

  return {
    update(f) {
      const { post, ui, bg } = f;
      const T = f.t;
      const st = f.clock.start, end = f.clock.end;
      const lt = T - st;
      const m45 = f.mark('L4a.45', st + 0.45), mMois = f.mark('L4a.mois', m45 + 0.4);
      const mOld = st + 0.3; // l'ancien prix est là dès l'arrivée de la carte, barré à l'écrasement du 45 €
      const cx = W * 0.5, cy = H * 0.47;
      if (f.owner) {
        dynamicBg(bg, W, H, T, { k: 1.15, beat: beatAt(T), cy: 0.47 });
        f.camera([0, 0, 8], [0, 0, 0], 30);
        f.world.studio.update(T, { backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 1 });
        post.bloom = 0.12; post.vignette = 0.15; post.flashColor = [1, 1, 1];
        post.zoomBlur += 0.08 * pulse(T, m45, 0.005, 0.15);
        post.ca += 0.006 * pulse(T, m45, 0.005, 0.2);

        // carte qui se retourne (rotation autour de l'axe horizontal)
        const flip = E.outBack(seg(lt, 0.0, 0.45), 1.3);
        const cw = W * 0.84, ch = H * 0.3;
        ui.save();
        ui.translate(cx, cy); ui.scale(1, Math.max(0.02, flip)); ui.rotate(-0.04); ui.translate(-cx, -cy);
        ui.shadowColor = 'rgba(123,47,196,0.35)'; ui.shadowBlur = 70 * u; ui.shadowOffsetY = 26 * u;
        ui.fillStyle = brandGradient(ui, cx - cw / 2, cy, cx + cw / 2, cy, 0);
        ui.beginPath(); ui.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 60 * u); ui.fill();
        ui.shadowColor = 'transparent';
        // reflet qui balaie la carte
        const sw = ((T * 0.6) % 1.4) - 0.2;
        const sg = ui.createLinearGradient(cx - cw / 2 + cw * sw - 140 * u, 0, cx - cw / 2 + cw * sw + 140 * u, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.28)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ui.fillStyle = sg; ui.fill();

        // prix : compteur 86,99 → 45 puis écrasement
        const tp = T - m45;
        if (tp > -0.3) {
          const roll = E.outCubic(seg(tp, -0.3, 0.02));
          const val = lerp(O.oldCount, O.newCount, roll);
          const txt = tp < 0.02 ? `${Math.round(val)}€` : O.price;
          const slam = E.outExpo(seg(tp, 0.0, 0.2));
          const fs = 260 * u * (tp < 0 ? 0.9 : lerp(1.35, 1, slam));
          setFont(ui, fs, 800, -0.04);
          const tw = textWidth(ui, txt, fs, 800, -0.04);
          ui.fillStyle = '#ffffff'; ui.textAlign = 'left';
          ui.shadowColor = 'rgba(13,27,94,0.35)'; ui.shadowBlur = 24 * u; ui.shadowOffsetY = 10 * u;
          const px = cx - (tw + 190 * u) / 2, py = cy + fs * 0.12;
          ui.fillText(txt, px, py);
          const km = E.outCubic(seg(T, mMois - 0.05, mMois + 0.2));
          if (km > 0) {
            ui.globalAlpha = km; setFont(ui, 84 * u, 700, 0);
            ui.fillText(O.per, px + tw + 10 * u, py - 10 * u + (1 - km) * 30 * u);
            ui.globalAlpha = 1;
          }
          ui.shadowColor = 'transparent';
        }
        // pastille TV + INTERNET + GSM
        const kp = E.outBack(seg(T, mMois + 0.05, mMois + 0.35), 1.8);
        if (kp > 0) {
          const fs = 50 * u;
          setFont(ui, fs, 800, 0.02);
          const tw = textWidth(ui, O.bundle, fs, 800, 0.02);
          const pw = tw + fs * 1.4, ph = fs * 1.7, py = cy + ch * 0.22;
          ui.save(); ui.translate(cx, py); ui.scale(kp, kp); ui.rotate(-0.04); ui.translate(-cx, -py);
          ui.fillStyle = '#ffffff'; ui.beginPath(); ui.roundRect(cx - pw / 2, py - ph / 2, pw, ph, ph / 2); ui.fill();
          ui.fillStyle = C.navy; ui.textAlign = 'center'; setFont(ui, fs, 800, 0.02);
          ui.fillText(O.bundle, cx, py + fs * 0.36);
          ui.restore();
        }
        ui.restore();

        // ancien prix, barré
        const to = T - mOld;
        if (to > -0.05) {
          const ko = E.outCubic(seg(to, -0.05, 0.2));
          const fs = 64 * u, y = cy + ch * 0.5 + 110 * u;
          setFont(ui, fs, 700, 0);
          const tw = textWidth(ui, O.old, fs, 700, 0);
          ui.save(); ui.globalAlpha = ko;
          ui.fillStyle = C.navy; ui.textAlign = 'center';
          ui.fillText(O.old, cx, y + (1 - ko) * 30 * u);
          const ks = E.inOutCubic(seg(T, m45 + 0.04, m45 + 0.28));
          ui.strokeStyle = C.magenta; ui.lineWidth = 9 * u; ui.lineCap = 'round';
          ui.beginPath(); ui.moveTo(cx - tw / 2 - 12 * u, y - fs * 0.28 + 14 * u); ui.lineTo(cx - tw / 2 - 12 * u + (tw + 24 * u) * ks, y - fs * 0.28 - 14 * u * (2 * ks - 1)); ui.stroke();
          ui.restore();
        }

        // confettis de points de marque à l'écrasement du prix
        const tc = T - m45;
        if (tc > 0 && tc < 1.2) {
          for (const c of conf) {
            const d = E.outCubic(seg(tc, 0, 1)) * W * 0.55 * c.s;
            const x = cx + Math.cos(c.a) * d, y = cy + Math.sin(c.a) * d * 1.2 + tc * tc * 400 * u;
            ui.fillStyle = brandAt(c.c, 1 - seg(tc, 0.6, 1.2));
            ui.beginPath(); ui.arc(x, y, c.z * u, 0, TAU); ui.fill();
          }
        }
        // sous-titres : « LE TOUT POUR » puis « AU LIEU DE »
        captions(f, 'L4a', 'Le tout pour', cx, H * 0.24, { size: 72 * u, maxW: Lp.maxW, color: C.navy, shadow: 0, glow: false, upto: 3 });
        // entrée : fin du balayage dégradé
        gradientSwipe(ui, W, H, 1 + seg(lt, 0, 0.32));
      }
      // sortie : éclair + flash blanc
      const tl = T - (end - 0.18);
      if (tl > -0.05 && tl < 0.3) {
        lightning(ui, W * 0.62, -20, W * 0.38, H + 20, Math.sin(Math.PI * seg(tl, -0.05, 0.3)), 17, u, C.amber);
        post.flash += 0.9 * pulse(tl, 0.06, 0.005, 0.14);
        post.flashColor = [1, 0.97, 0.9];
      }
    },
  };
}
