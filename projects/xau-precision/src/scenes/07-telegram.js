// 07 — TELEGRAM (28 → 32.5 s) : un téléphone noir pivote face caméra ; à l'écran, le canal
// « XAU PRÉCISION » (interface de messagerie dessinée, sans logo tiers) : la publication du trade
// arrive, puis le résultat ; toucher sur « REJOINDRE » (onde) → « ABONNÉ ». Texte : rejoins le canal.
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { touchRipple } from '../core/type.js';
import { G, rich, eyebrow, veil, setFont } from './_ui.js';

const T_P1 = 0.7, T_P2 = 1.4, T_TAP = 2.5;
export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.5, gain: 0.6 },
  { t: 0.3, type: 'servo', gain: 0.4 },
  { t: T_P1, type: 'blip', gain: 0.6 },
  { t: T_P2, type: 'pop', gain: 0.6 },
  { t: T_TAP, type: 'click', gain: 0.9 },
  { t: T_TAP + 0.08, type: 'transmit', gain: 0.6 },
  { t: 4.1, type: 'zips', gain: 0.6 },
];

export default function create(ctx) {
  const { V, W, H, world } = ctx;
  const group = new THREE.Group();
  const SWp = 600, SHp = 1300;
  const cv = document.createElement('canvas'); cv.width = SWp; cv.height = SHp;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const logo = world.images.logo, shot = world.images.tvPos;

  function drawScreen(lt) {
    g.reset();
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, SWp, SHp);
    // fond motif discret
    g.fillStyle = 'rgba(242,193,78,0.035)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 137) % SWp, (i * 251) % SHp, 18, 0, 6.3); g.fill(); }
    // barre d'état + en-tête
    g.fillStyle = '#14171e'; g.fillRect(0, 0, SWp, 170);
    g.fillStyle = '#fff'; g.font = '600 26px "Space Grotesk"'; g.fillText('9:41', 40, 48);
    g.save(); g.beginPath(); g.arc(110, 115, 40, 0, 6.3); g.clip(); g.drawImage(logo, 70, 75, 80, 80); g.restore();
    g.strokeStyle = G.gold; g.lineWidth = 3; g.beginPath(); g.arc(110, 115, 41, 0, 6.3); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 34px "Poppins"'; g.fillText('XAU PRÉCISION', 170, 108);
    g.fillStyle = '#8a93a6'; g.font = '500 24px "Space Grotesk"'; g.fillText('canal Telegram', 170, 142);
    g.fillStyle = '#d9dde6'; g.font = '700 34px "Poppins"'; g.fillText('‹', 22, 128);
    // publication 1 : le trade (capture TradingView)
    const k1 = E.outBack(seg(lt, T_P1, T_P1 + 0.35), 1.3);
    if (k1 > 0) {
      g.save(); g.globalAlpha = clamp(k1 * 2); g.translate(0, (1 - k1) * 80);
      const x = 30, y = 200, w = SWp - 90, h = 560;
      g.fillStyle = '#1b2029'; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill();
      // capture recadrée : graphique + position
      const iw = shot.naturalWidth, ih = shot.naturalHeight;
      const sx = 0, sy = ih * 0.175, sw = iw * 0.93, sh = ih * 0.265;
      g.save(); g.beginPath(); g.roundRect(x + 10, y + 10, w - 20, 300, 16); g.clip();
      g.drawImage(shot, sx, sy, sw, sh, x + 10, y + 10, w - 20, 300); g.restore();
      g.fillStyle = G.blue; g.font = '800 34px "Poppins"'; g.fillText('BUY XAUUSD · 0.15', x + 24, y + 362);
      g.fillStyle = '#dfe3ea'; g.font = '500 27px "Space Grotesk"';
      g.fillText('Entrée 3990.77', x + 24, y + 410);
      g.fillStyle = G.gold; g.fillText('TP 4033.58', x + 24, y + 450);
      g.fillStyle = '#ff7b7f'; g.fillText('SL remonté à 4002.27', x + 24, y + 490);
      g.fillStyle = '#7d8696'; g.font = '500 20px "Space Grotesk"'; g.fillText('XAU PRÉCISION', x + 24, y + 535);
      g.restore();
    }
    // publication 2 : le résultat
    const k2 = E.outBack(seg(lt, T_P2, T_P2 + 0.35), 1.3);
    if (k2 > 0) {
      g.save(); g.globalAlpha = clamp(k2 * 2); g.translate(0, (1 - k2) * 80);
      const x = 30, y = 790, w = 400, h = 120;
      g.fillStyle = '#1b2029'; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill();
      g.fillStyle = '#9aa3b2'; g.font = '500 24px "Space Grotesk"'; g.fillText('Résultat du trade', x + 24, y + 42);
      const gr = g.createLinearGradient(0, y + 60, 0, y + 105); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.5, '#f2c14e'); gr.addColorStop(1, '#b07a1e');
      g.fillStyle = gr; g.font = '800 46px "Poppins"'; g.fillText('+359,20 €', x + 24, y + 98);
      g.restore();
    }
    // bouton rejoindre
    const joined = lt >= T_TAP + 0.12;
    const press = 1 - 0.06 * Math.exp(-Math.pow((lt - T_TAP) * 10, 2));
    const bx = SWp / 2, by = SHp - 130, bw = 480, bh = 104;
    g.save(); g.translate(bx, by); g.scale(press, press);
    const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    if (joined) { gr.addColorStop(0, '#2a2f3a'); gr.addColorStop(1, '#2a2f3a'); } else { gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#c8902e'); }
    g.fillStyle = gr; g.shadowColor = joined ? 'transparent' : 'rgba(242,193,78,0.7)'; g.shadowBlur = 30;
    g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); g.fill(); g.shadowBlur = 0;
    g.fillStyle = joined ? G.gold : '#140e03'; g.font = '800 36px "Poppins"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(joined ? '✓  ABONNÉ' : 'REJOINDRE', 0, 3);
    touchRipple(g, 60, 0, lt - T_TAP, 1.6, '#ffffff');
    g.restore();
    tex.needsUpdate = true;
  }

  const camera = (lt) => {
    const a = lerp(-0.6, 0.12, E.outCubic(seg(lt, 0, 2.4))) + 0.04 * Math.sin(lt);
    const out = E.inExpo(seg(lt, 4.0, 4.5));
    const R = lerp(V ? 5.0 : 3.5, 0.6, out);
    const tx = V ? 0 : -0.8;
    const ty = V ? -0.6 : 0;
    return { pos: [tx + Math.sin(a) * R, ty + 0.15 - out * 0.1, Math.cos(a) * R], target: [tx, ty, 0], roll: lerp(0.08, -0.02, seg(lt, 0, 2.4)) + out * 0.3, fov: V ? 42 : 32 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, post, u, L, t } = f;
      const S = L.safe;
      const p = f.world.phones[1];
      p.group.visible = true;
      const k = E.outExpo(seg(lt, 0, 0.9));
      p.group.position.set(0, (V ? -0.88 : 0) + 0.03 * Math.sin(lt * 1.3), 0);
      p.group.rotation.set(0.04, lerp(-2.2, 0.1, k) + 0.05 * Math.sin(lt * 0.8), lerp(0.25, 0.02, k));
      p.group.scale.setScalar(V ? 1.4 : 1.1);
      drawScreen(lt);
      p.phone.setScreenMap(tex, 1.0);
      f.world.studio.update(t, { backdrop: true, glow: 0.16, grid: 0.3, beams: 0.45, dust: 0.6, motes: 0.6, env: 1.3, envRot: 0.4 + lt * 0.12, rim: 1.4, key: 1.15 });
      post.bloom = 0.6; post.vignette = 1.05;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.8 * (1 - E.outCubic(seg(lt, 0, 0.35)));
      post.flash += 0.9 * E.inCubic(seg(lt, 4.25, 4.5));
      post.dof = { focus: V ? 5.0 : 3.5, aperture: 0.012, maxblur: 0.004 };

      // ---- texte
      const out = E.inCubic(seg(lt, 3.95, 4.2));
      const s = (V ? 92 : 86) * u;
      const x0 = V ? W / 2 : S.l, y0 = V ? S.t + 80 * u : H * 0.32;
      const al = V ? 'center' : 'left';
      ui.save(); ui.globalAlpha = 1 - out;
      veil(ui, x0 - (V ? 450 : 40) * u, y0 - s * 1.4, 900 * u, s * 4.2, 0.6);
      eyebrow(ui, 'MON CANAL TELEGRAM', x0, y0 - s * 0.95, 28 * u, seg(lt, 0.3, 0.8), al);
      rich(ui, [['REJOINS', 'w']], x0, y0 + s * 0.2, { size: s * 0.8, k: seg(lt, 0.4, 0.8), align: al, weight: 700 });
      rich(ui, [['XAU ', 's'], ['PRÉCISION', 'g']], x0, y0 + s * 1.3, { size: s, k: seg(lt, 0.6, 1.0), align: al, glow: 1, weight: 900, maxW: V ? S.w : 900 * u });
      rich(ui, [['et suis ', 'l'], ['mes trades.', 'w']], x0, y0 + s * 2.25, { size: s * 0.55, k: seg(lt, 1.5, 1.9), align: al, weight: 600 });
      ui.restore();
    },
  };
}
