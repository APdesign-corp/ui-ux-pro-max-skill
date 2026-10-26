// 07 — TELEGRAM (28 → 36.5 s) : quelqu'un rejoint le canal.
//  0.0  le téléphone pivote : page du canal « Xau précision » (57 photos, 1 vidéo), bouton REJOINDRE
//  1.5  toucher → « ✓ ABONNÉ » + bandeau de bienvenue, éclats or
//  2.2  onglet Médias : la VRAIE galerie du canal défile (captures du client)
//  4.8  les photos du canal jaillissent de l'écran et tournent en 3D autour du téléphone
//  8.0  zip → objectif TikTok
// Interface de messagerie redessinée dans la charte (aucun logo tiers).
import * as THREE from 'three';
import { E, clamp, lerp, seg, TAU } from '../core/anim.js';
import { touchRipple } from '../core/type.js';
import { sparks } from '../core/draw.js';
import { G, rich, eyebrow, veil } from './_ui.js';

const T_TAP = 1.5, T_MED = 2.2, T_S0 = 2.5, T_S1 = 4.9, T_FLY = 4.8;
export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.5, gain: 0.6 },
  { t: 0.35, type: 'servo', gain: 0.4 },
  { t: T_TAP, type: 'click', gain: 0.9 },
  { t: T_TAP + 0.06, type: 'transmit', gain: 0.6 },
  { t: T_TAP + 0.12, type: 'shimmer', gain: 0.45 },
  { t: T_MED, type: 'swish', gain: 0.55 },
  { t: T_S0, type: 'zips', gain: 0.4 },
  { t: T_S0 + 0.1, type: 'data', dur: 2.2, gain: 0.3 },
  { t: T_FLY, type: 'burst', gain: 0.7 },
  { t: T_FLY + 0.15, type: 'whoosh', dur: 0.9, gain: 0.55 },
  { t: 6.3, type: 'glass', gain: 0.3 },
  { t: 7.95, type: 'whip', gain: 0.8 },
];

const N = 7;

export default function create(ctx) {
  const { V, W, H, world } = ctx;
  const group = new THREE.Group();
  const SWp = 600, SHp = 1300;
  const cv = document.createElement('canvas'); cv.width = SWp; cv.height = SHp;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const I = world.images, logo = I.logo, strip = I.strip;

  // ---- cartes 3D : les photos du canal
  const cards = [];
  for (let i = 0; i < N; i++) {
    const im = I['c' + (i + 1)];
    const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
    const ar = im.naturalWidth / im.naturalHeight, h = 1.0, w = h * ar;
    const c = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.04, h + 0.04), new THREE.MeshBasicMaterial({ color: '#d9a948', transparent: true }));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    frame.position.z = -0.004;
    c.add(frame, pic);
    group.add(c);
    cards.push({ c, mats: [frame.material, pic.material] });
  }

  function header(sub) {
    g.fillStyle = '#101319'; g.fillRect(0, 0, SWp, 190);
    g.fillStyle = '#fff'; g.font = '600 26px "Space Grotesk"'; g.textAlign = 'left'; g.fillText('13:37', 40, 48);
    g.fillStyle = '#d9dde6'; g.font = '500 40px "Poppins"'; g.fillText('‹', 26, 132);
    g.textAlign = 'center';
    g.fillStyle = '#fff'; g.font = '700 36px "Poppins"'; g.fillText('Xau précision', SWp / 2, 112);
    g.fillStyle = '#8a93a6'; g.font = '500 25px "Space Grotesk"'; g.fillText(sub, SWp / 2, 150);
    g.textAlign = 'left';
  }

  function drawScreen(lt) {
    g.reset();
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, SWp, SHp);
    const slide = E.inOutCubic(seg(lt, T_MED, T_MED + 0.35));
    // ---------- page 1 : le canal
    if (slide < 1) {
      g.save(); g.translate(-slide * SWp, 0);
      header('canal · 57 photos, 1 vidéo');
      g.save(); g.beginPath(); g.arc(SWp / 2, 380, 120, 0, TAU); g.clip(); g.drawImage(logo, SWp / 2 - 120, 260, 240, 240); g.restore();
      g.strokeStyle = G.gold; g.lineWidth = 5; g.beginPath(); g.arc(SWp / 2, 380, 123, 0, TAU); g.stroke();
      g.textAlign = 'center';
      const gr = g.createLinearGradient(0, 540, 0, 600); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.5, '#f2c14e'); gr.addColorStop(1, '#b07a1e');
      g.fillStyle = '#fff'; g.font = '800 50px "Poppins"'; g.fillText('XAU', SWp / 2 - 130, 590);
      g.fillStyle = gr; g.fillText('PRÉCISION', SWp / 2 + 70, 590);
      g.fillStyle = '#9aa3b2'; g.font = '500 27px "Space Grotesk"';
      g.fillText('Trading sur l\'or · XAUUSD', SWp / 2, 645);
      g.fillText('Analyses · entrées · résultats', SWp / 2, 690);
      // vignettes de la galerie
      for (let k = 0; k < 3; k++) {
        const im = I['c' + (k + 2)];
        g.save(); g.beginPath(); g.roundRect(40 + k * 178, 760, 164, 164, 14); g.clip();
        const s = Math.max(164 / im.naturalWidth, 164 / im.naturalHeight);
        g.drawImage(im, 40 + k * 178 + 82 - im.naturalWidth * s / 2, 760 + 82 - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
        g.restore();
      }
      g.fillStyle = '#8a93a6'; g.font = '500 24px "Space Grotesk"'; g.fillText('Médias · 57 photos, 1 vidéo', SWp / 2, 965);
      // bouton
      const joined = lt >= T_TAP + 0.1;
      const press = 1 - 0.06 * Math.exp(-Math.pow((lt - T_TAP) * 10, 2));
      g.save(); g.translate(SWp / 2, SHp - 150); g.scale(press, press);
      const bw = 480, bh = 104;
      const bg = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      if (joined) { bg.addColorStop(0, '#232833'); bg.addColorStop(1, '#232833'); } else { bg.addColorStop(0, '#ffe08a'); bg.addColorStop(1, '#c8902e'); }
      g.fillStyle = bg; g.shadowColor = joined ? 'transparent' : 'rgba(242,193,78,0.7)'; g.shadowBlur = 30;
      g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); g.fill(); g.shadowBlur = 0;
      g.fillStyle = joined ? G.gold : '#140e03'; g.font = '800 36px "Poppins"'; g.textBaseline = 'middle';
      g.fillText(joined ? '✓  ABONNÉ' : 'REJOINDRE', 0, 3); g.textBaseline = 'alphabetic';
      touchRipple(g, 60, 0, lt - T_TAP, 1.6, '#ffffff');
      g.restore();
      // bandeau de bienvenue
      const kt = seg(lt, T_TAP + 0.15, T_TAP + 0.35) * (1 - seg(lt, T_MED - 0.1, T_MED));
      if (kt > 0) {
        g.save(); g.globalAlpha = kt; g.translate(0, (1 - kt) * -40);
        g.fillStyle = 'rgba(30,34,44,0.96)'; g.beginPath(); g.roundRect(30, 205, SWp - 60, 86, 22); g.fill();
        g.strokeStyle = G.gold; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#fff'; g.font = '600 26px "Space Grotesk"'; g.fillText('Tu as rejoint XAU PRÉCISION', SWp / 2, 258);
        g.restore();
      }
      g.restore();
    }
    // ---------- page 2 : Médias (la vraie galerie défile)
    if (slide > 0) {
      g.save(); g.translate((1 - slide) * SWp, 0);
      const top = 290;
      const vh = SHp - top;
      const sh = strip.naturalHeight * (SWp / strip.naturalWidth);
      const sp = E.inOutCubic(seg(lt, T_S0, T_S1));
      const off = sp * (sh - vh);
      const vel = Math.abs(E.inOutCubic(seg(lt + 0.016, T_S0, T_S1)) - sp) * (sh - vh);
      g.save(); g.beginPath(); g.rect(0, top, SWp, vh); g.clip();
      g.drawImage(strip, 0, top - off, SWp, sh);
      // traînée de défilement
      if (vel > 2) { g.globalAlpha = 0.18; g.drawImage(strip, 0, top - off + vel * 2.5, SWp, sh); g.drawImage(strip, 0, top - off - vel * 2.5, SWp, sh); }
      g.restore();
      header('57 photos, 1 vidéo');
      // onglets
      g.fillStyle = '#1b1f27'; g.beginPath(); g.roundRect(150, 205, 300, 64, 32); g.fill();
      g.fillStyle = '#2e3440'; g.beginPath(); g.roundRect(156, 211, 150, 52, 26); g.fill();
      g.fillStyle = '#fff'; g.font = '600 28px "Space Grotesk"'; g.textAlign = 'center';
      g.fillText('Médias', 231, 247); g.fillStyle = '#c5cad4'; g.fillText('GIFs', 378, 247);
      g.restore();
    }
    tex.needsUpdate = true;
  }

  const PY = V ? -0.85 : 0;
  const camera = (lt) => {
    const back = E.inOutCubic(seg(lt, T_FLY, 6.4));
    const a = lerp(-0.6, 0.12, E.outCubic(seg(lt, 0, 2.0))) + 0.04 * Math.sin(lt) + back * 0.55 + 0.25 * seg(lt, 6.4, 8.0);
    const out = E.inExpo(seg(lt, 7.6, 8.5));
    const R = lerp(lerp(V ? 5.0 : 3.5, V ? 8.6 : 6.4, back), 0.8, out);
    const tx = lerp(V ? 0 : -0.8, V ? 0 : -0.5, back);
    const ty = lerp(PY, V ? -0.05 : 0, back);
    return { pos: [tx + Math.sin(a) * R, ty + 0.15 + back * 0.4, Math.cos(a) * R], target: [tx, ty, 0], roll: lerp(0.08, -0.02, seg(lt, 0, 2.4)) + out * 0.4 - back * 0.04, fov: V ? 42 : 32 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, t } = f;
      const S = L.safe;
      const p = f.world.phones[1];
      p.group.visible = true;
      const k = E.outExpo(seg(lt, 0, 0.9));
      const sc = V ? 1.4 : 1.1;
      p.group.position.set(0, PY * (1 - E.inOutCubic(seg(lt, T_FLY, 6.4))) + 0.03 * Math.sin(lt * 1.3), 0);
      p.group.rotation.set(0.04, lerp(-2.2, 0.1, k) + 0.05 * Math.sin(lt * 0.8) + 0.25 * Math.sin((lt - T_FLY) * 0.8) * seg(lt, T_FLY, 6), lerp(0.25, 0.02, k));
      p.group.scale.setScalar(sc);
      drawScreen(lt);
      p.phone.setScreenMap(tex, 1.0);

      // ---- cartes photos : jaillissent de l'écran puis orbitent
      const cam = f.cam.pos;
      const ring = (lt - T_FLY) * 0.45;
      cards.forEach((C, i) => {
        const a0 = T_FLY + i * 0.11;
        const q = E.outExpo(seg(lt, a0, a0 + 0.9));
        const vis = q > 0.001 && lt < 8.4;
        C.c.visible = vis;
        if (!vis) return;
        const ang = (i / N) * TAU + ring;
        const R = V ? 1.55 : 2.0;
        const yy = V ? Math.sin(ang * 2 + 0.6) * 1.35 + (i % 2 ? 0.6 : -0.6) : Math.sin(ang * 2) * 0.45;
        const tx = Math.sin(ang) * R, tz = Math.cos(ang) * R * 0.85, ty = yy + 0.05 * Math.sin(lt * 1.5 + i);
        C.c.position.set(lerp(0, tx, q), lerp(p.group.position.y, ty, q), lerp(0.1, tz, q));
        C.c.lookAt(cam[0], cam[1], cam[2]);
        C.c.rotateZ((1 - q) * (i % 2 ? 0.8 : -0.8) + 0.05 * Math.sin(lt + i));
        const s = lerp(0.15, V ? 0.95 : 0.85, q);
        C.c.scale.setScalar(s);
        const behind = tz < -0.2 ? 0.55 : 1;
        C.mats[1].opacity = behind; C.mats[0].opacity = behind;
      });
      if (lt >= T_TAP && lt < T_TAP + 1) {
        const [px, py] = f.project([0, p.group.position.y - 0.5, 0.1]);
        sparks(fx, px, py, lt - T_TAP, f, { count: 50, life: 0.9 });
      }

      f.world.studio.update(t, { backdrop: true, glow: 0.16, grid: 0.3, beams: 0.45, dust: 0.6, motes: 0.6, env: 1.3, envRot: 0.4 + lt * 0.12, rim: 1.4, key: 1.15 });
      post.bloom = 0.6; post.vignette = 1.05;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.8 * (1 - E.outCubic(seg(lt, 0, 0.35)));
      post.flash += 0.25 * Math.exp(-Math.max(0, lt - T_FLY) / 0.1) * (lt >= T_FLY ? 1 : 0);
      post.flash += 0.9 * E.inCubic(seg(lt, 8.25, 8.5));

      // ---- textes (3 temps, chacun ≥ 2 s à l'écran)
      const s = (V ? 92 : 86) * u;
      const x0 = V ? W / 2 : S.l, al = V ? 'center' : 'left';
      const y0 = V ? S.t + 80 * u : H * 0.32;
      const A = 1 - E.inCubic(seg(lt, T_MED - 0.1, T_MED + 0.1));
      const B = seg(lt, T_MED + 0.2, T_MED + 0.5) * (1 - E.inCubic(seg(lt, T_FLY + 0.1, T_FLY + 0.3)));
      const Cc = seg(lt, T_FLY + 0.6, T_FLY + 1.0) * (1 - E.inCubic(seg(lt, 7.75, 7.95)));
      if (A > 0) {
        ui.save(); ui.globalAlpha = A;
        veil(ui, x0 - (V ? 450 : 40) * u, y0 - s * 1.4, 900 * u, s * 4.2, 0.6);
        eyebrow(ui, 'MON CANAL TELEGRAM', x0, y0 - s * 0.95, 28 * u, seg(lt, 0.3, 0.8), al);
        rich(ui, [['REJOINS', 'w']], x0, y0 + s * 0.2, { size: s * 0.8, k: seg(lt, 0.4, 0.8), align: al, weight: 700 });
        rich(ui, [['XAU ', 's'], ['PRÉCISION', 'g']], x0, y0 + s * 1.3, { size: s, k: seg(lt, 0.6, 1.0), align: al, glow: 1, weight: 900, maxW: V ? S.w : 900 * u });
        ui.restore();
      }
      if (B > 0) {
        ui.save(); ui.globalAlpha = B;
        veil(ui, x0 - (V ? 450 : 40) * u, y0 - s * 1.4, 900 * u, s * 4.2, 0.6);
        eyebrow(ui, 'DANS LE CANAL', x0, y0 - s * 0.95, 28 * u, B, al);
        rich(ui, [['ANALYSES · ENTRÉES', 'w']], x0, y0 + s * 0.2, { size: s * 0.62, k: B, align: al, weight: 800, maxW: V ? S.w : 900 * u });
        rich(ui, [['RÉSULTATS', 'g']], x0, y0 + s * 1.15, { size: s * 0.9, k: seg(lt, T_MED + 0.4, T_MED + 0.7), align: al, weight: 900, glow: 1 });
        ui.restore();
      }
      if (Cc > 0) {
        const yc = V ? S.b - 260 * u : H * 0.8;
        ui.save(); ui.globalAlpha = Cc;
        veil(ui, W / 2 - 520 * u, yc - s * 1.1, 1040 * u, s * 2.4, 0.65);
        rich(ui, [['57 PHOTOS', 'g'], [' · 1 VIDÉO', 'w']], W / 2, yc, { size: s * 0.56, k: Cc, weight: 800, maxW: V ? S.w : 1200 * u, glow: 0.6 });
        rich(ui, [['Abonne-toi, ', 'l'], ['suis mes trades.', 'w']], W / 2, yc + s * 0.8, { size: s * 0.48, k: seg(lt, T_FLY + 0.9, T_FLY + 1.3), weight: 600, maxW: V ? S.w : 1200 * u });
        ui.restore();
      }
      void clamp;
    },
  };
}
