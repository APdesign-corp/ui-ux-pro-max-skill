// 08 — TIKTOK (36.5 → 42.5 s) : le compte « Gold Hunter XAUUSD » (@goldhunter.xauusd) sur un
// téléphone or 3D (page profil redessinée d'après la capture du client, sans logo tiers).
//  0.0  le téléphone surgit en vrille (sortie du zip Telegram)
//  1.0  la flèche (curseur) glisse jusqu'à « Suivre » → clic 1.75 → « Abonné(e) », 1080 → 1081
//  2.4  la flèche monte vers la cloche → clic 3.05 → la cloche sonne, « Notifications activées »
//  3.9  « LIVE bientôt » (bio du client) s'allume en rouge
//  5.35 PORTAIL : la caméra plonge dans la photo de profil → final
import * as THREE from 'three';
import { E, clamp, lerp, seg, TAU } from '../core/anim.js';
import { touchRipple } from '../core/type.js';
import { sparks, radialGlow } from '../core/draw.js';
import { G, rich, eyebrow, veil, setFont } from './_ui.js';

const T_FOL = 1.75, T_BELL = 3.05, T_LIVE = 3.9, T_DIVE = 5.35;
export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.6, gain: 0.7 },
  { t: 0.55, type: 'hit', gain: 0.6 },
  { t: 1.05, type: 'swish', gain: 0.35 },
  { t: T_FOL, type: 'click', gain: 1.0 },
  { t: T_FOL + 0.04, type: 'pop', gain: 0.8 },
  { t: T_FOL + 0.1, type: 'shimmer', gain: 0.5 },
  { t: 2.45, type: 'swish', gain: 0.35 },
  { t: T_BELL, type: 'click', gain: 1.0 },
  { t: T_BELL + 0.05, type: 'glass', gain: 0.5 },
  { t: T_LIVE, type: 'impact', gain: 0.6 },
  { t: T_DIVE - 0.2, type: 'riser', dur: 0.55, gain: 0.6 },
  { t: T_DIVE + 0.55, type: 'suck', dur: 0.3, gain: 0.5 },
];

const PINK = '#fe2c55';

export default function create(ctx) {
  const { V, W, H, world } = ctx;
  const group = new THREE.Group();
  const SWp = 600, SHp = 1300;
  const cv = document.createElement('canvas'); cv.width = SWp; cv.height = SHp;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const I = world.images;

  // positions (pixels écran du téléphone) : bouton Suivre, cloche, avatar
  const FOL = [263, 365], BELL = [494, 106], AV = [502, 229];
  // trajet de la flèche
  const cursorAt = (lt) => {
    const a = E.inOutCubic(seg(lt, 1.0, 1.65)), b = E.inOutCubic(seg(lt, 2.4, 2.95));
    const p0 = [470, 900];
    let x = lerp(p0[0], FOL[0] + 40, a), y = lerp(p0[1], FOL[1] + 10, a);
    x = lerp(x, BELL[0] + 6, b); y = lerp(y, BELL[1] + 12, b);
    // petite courbe naturelle
    x += Math.sin(Math.PI * a) * -60 + Math.sin(Math.PI * b) * 50;
    return [x, y];
  };

  function bellIcon(x, y, s, fill, wig) {
    g.save(); g.translate(x, y); g.rotate(wig);
    g.beginPath();
    g.moveTo(-s * 0.55, s * 0.35); g.quadraticCurveTo(-s * 0.45, s * 0.2, -s * 0.45, -s * 0.05);
    g.quadraticCurveTo(-s * 0.45, -s * 0.55, 0, -s * 0.58); g.quadraticCurveTo(s * 0.45, -s * 0.55, s * 0.45, -s * 0.05);
    g.quadraticCurveTo(s * 0.45, s * 0.2, s * 0.55, s * 0.35); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.lineWidth = s * 0.09; g.strokeStyle = fill ? fill : '#fff'; g.stroke();
    g.beginPath(); g.arc(0, s * 0.48, s * 0.12, 0, Math.PI); g.stroke();
    g.restore();
  }
  function arrow(x, y, s, press) {
    g.save(); g.translate(x, y); g.scale(s * press, s * press);
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, 34); g.lineTo(8, 26); g.lineTo(14, 40); g.lineTo(20, 37); g.lineTo(14, 24); g.lineTo(25, 24); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.lineWidth = 2.2; g.strokeStyle = '#111'; g.stroke();
    g.restore();
  }

  function drawScreen(lt) {
    g.reset();
    g.fillStyle = '#000'; g.fillRect(0, 0, SWp, SHp);
    g.fillStyle = '#fff'; g.font = '600 26px "Space Grotesk"'; g.textAlign = 'left'; g.fillText('14:46', 62, 48);
    // barre du haut
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(52, 92); g.lineTo(38, 106); g.lineTo(52, 120); g.stroke();
    const rung = lt >= T_BELL;
    const wig = rung ? Math.sin((lt - T_BELL) * 40) * 0.45 * Math.exp(-(lt - T_BELL) / 0.35) : 0;
    bellIcon(BELL[0], BELL[1], 34, rung ? G.gold : null, wig);
    g.beginPath(); g.moveTo(545, 116); g.lineTo(545, 104); g.quadraticCurveTo(552, 92, 572, 92); g.lineTo(572, 84); g.lineTo(586, 100); g.lineTo(572, 114); g.lineTo(572, 106); g.quadraticCurveTo(556, 104, 545, 116); g.stroke();
    // identité
    g.fillStyle = '#fff'; g.font = '800 36px "Poppins"'; g.fillText('Gold Hunter XAUUSD', 25, 192);
    g.fillStyle = '#9a9aa2'; g.font = '500 21px "Space Grotesk"'; g.fillText('@goldhunter.xauusd', 25, 226);
    g.save(); g.beginPath(); g.arc(AV[0], AV[1], 72, 0, TAU); g.clip(); g.drawImage(I.logo, AV[0] - 72, AV[1] - 72, 144, 144); g.restore();
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; g.beginPath(); g.arc(AV[0], AV[1], 73, 0, TAU); g.stroke();
    // statistiques (abonnés : 1080 → 1081 au clic)
    const roll = E.outCubic(seg(lt, T_FOL + 0.1, T_FOL + 0.55));
    g.fillStyle = '#fff'; g.font = '800 30px "Poppins"';
    g.fillText('1', 25, 275); g.fillText('321,4 K', 240, 275);
    g.save(); g.beginPath(); g.rect(110, 245, 120, 38); g.clip();
    g.fillStyle = roll > 0 && roll < 1 ? G.gold2 : '#fff';
    g.fillText('1080', 117, 275 + roll * 36); g.fillText('1081', 117, 275 - 36 + roll * 36);
    g.restore();
    g.fillStyle = '#9a9aa2'; g.font = '500 20px "Space Grotesk"';
    g.fillText('Suivis', 25, 302); g.fillText('Followers', 117, 302); g.fillText("J'aime", 240, 302);
    // bouton Suivre → Abonné(e)
    const done = lt >= T_FOL + 0.08;
    const press = 1 - 0.06 * Math.exp(-Math.pow((lt - T_FOL) * 10, 2));
    g.save(); g.translate(FOL[0], FOL[1]); g.scale(press, press);
    g.fillStyle = done ? '#2b2b2f' : PINK;
    if (!done) { g.shadowColor = 'rgba(254,44,85,0.6)'; g.shadowBlur = 24 * (0.6 + 0.4 * Math.sin(lt * 5)); }
    g.beginPath(); g.roundRect(-238, -30, 476, 60, 30); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#fff'; g.font = '700 26px "Poppins"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(done ? '✓  Abonné(e)' : 'Suivre', 0, 2);
    g.restore();
    touchRipple(g, FOL[0] + 40, FOL[1], lt - T_FOL, 1.5, '#ffffff');
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#2b2b2f'; g.beginPath(); g.arc(545, 365, 30, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.font = '700 26px "Poppins"'; g.textAlign = 'center'; g.fillText('+', 545, 374); g.textAlign = 'left';
    // bio (icônes redessinées)
    const bio = [['XAUUSD ONLY', G.gold], ['Gold trading & setups', '#2f9bff'], ['On chasse les opportunités', '#ff8a3a'], ['LIVE bientôt', '#e0343a']];
    const kl = seg(lt, T_LIVE, T_LIVE + 0.3);
    bio.forEach(([txt, c], i) => {
      const y = 444 + i * 28;
      const live = i === 3;
      g.fillStyle = c; g.beginPath(); g.arc(36, y - 7, 9, 0, TAU); g.fill();
      if (live && kl > 0) { g.save(); g.globalAlpha = kl * (0.5 + 0.5 * Math.abs(Math.sin(lt * 5))); g.shadowColor = '#e0343a'; g.shadowBlur = 25; g.beginPath(); g.arc(36, y - 7, 11, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = live && kl > 0 ? '#ff6b6f' : '#fff'; g.font = (live && kl > 0 ? '700 ' : '500 ') + '20px "Space Grotesk"';
      g.fillText(txt, 56, y);
    });
    // onglets + grille de vignettes (graphiques du client)
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 604); g.lineTo(SWp, 604); g.stroke();
    g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) g.fillRect(140 + k * 9, 562, 4, 26);
    g.fillRect(100, 600, 120, 4);
    g.fillStyle = '#8a8a8a'; g.font = '600 26px "Space Grotesk"'; g.fillText('⟲', 425, 590);
    for (let k = 0; k < 9; k++) {
      const im = I['c' + ((k % 7) + 1)];
      const cx = (k % 3) * 201, cy = 608 + Math.floor(k / 3) * 262;
      g.save(); g.beginPath(); g.rect(cx, cy, 199, 260); g.clip();
      const s = Math.max(199 / im.naturalWidth, 260 / im.naturalHeight);
      g.drawImage(im, cx + 100 - im.naturalWidth * s / 2, cy + 130 - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx, cy, 199, 260);
      g.restore();
    }
    // bandeau « notifications activées »
    const kt = seg(lt, T_BELL + 0.12, T_BELL + 0.35) * (1 - seg(lt, 4.6, 4.85));
    if (kt > 0) {
      g.save(); g.globalAlpha = kt; g.translate(0, (1 - kt) * -30);
      g.fillStyle = 'rgba(32,32,36,0.96)'; g.beginPath(); g.roundRect(40, 130, SWp - 80, 72, 20); g.fill();
      g.strokeStyle = G.gold; g.lineWidth = 2; g.stroke();
      bellIcon(84, 166, 26, G.gold, 0);
      g.fillStyle = '#fff'; g.font = '600 23px "Space Grotesk"'; g.fillText('Notifications activées', 116, 174);
      g.restore();
    }
    // flèche (curseur)
    const ka = seg(lt, 0.85, 1.0) * (1 - seg(lt, 3.6, 3.8));
    if (ka > 0) {
      const [x, y] = cursorAt(lt);
      const pr = 1 - 0.18 * (Math.exp(-Math.pow((lt - T_FOL) * 12, 2)) + Math.exp(-Math.pow((lt - T_BELL) * 12, 2)));
      g.save(); g.globalAlpha = ka; arrow(x, y, 1.7, pr); g.restore();
    }
    tex.needsUpdate = true;
  }

  const PY = V ? -0.98 : 0;
  const SC = V ? 1.22 : 1.15;
  // coordonnées monde d'un point de l'écran (pixels) — dalle ≈ 0.70 × 1.52
  const scr = (px, py) => [(px / SWp - 0.5) * 0.7 * SC, PY + (0.5 - py / SHp) * 1.52 * SC, 0.06];
  const camera = (lt) => {
    const a = lerp(0.7, 0.1, E.outCubic(seg(lt, 0, 1.4))) + 0.05 * Math.sin(lt * 0.9);
    // petites poussées de caméra sur chaque clic
    const punch = 0.35 * Math.exp(-Math.pow((lt - T_FOL - 0.15) * 4, 2)) + 0.35 * Math.exp(-Math.pow((lt - T_BELL - 0.15) * 4, 2));
    const dive = E.inCubic(seg(lt, T_DIVE, 6));
    const av = scr(AV[0], AV[1]);
    const R = lerp((V ? 5.2 : 3.7) - punch, 0.12, dive);
    const tx = lerp(V ? 0 : -0.75, av[0], dive), ty = lerp(PY + (V ? 0.3 : 0), av[1], dive);
    return { pos: [tx + Math.sin(a * (1 - dive)) * R, ty + 0.1 * (1 - dive), Math.cos(a * (1 - dive)) * R + av[2] * dive], target: [tx, ty, 0], roll: lerp(-0.1, 0.02, seg(lt, 0, 1.4)) + dive * 0.25, fov: V ? 42 : 32 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, t } = f;
      const S = L.safe;
      const p = f.world.phones[0];
      p.group.visible = true;
      const k = E.outExpo(seg(lt, 0, 0.9));
      p.group.position.set(0, PY + 0.02 * Math.sin(lt * 1.3) - (1 - k) * 2.5, (1 - k) * -3);
      p.group.rotation.set(0.03, lerp(3.4, 0.08, k) + 0.04 * Math.sin(lt * 0.8) * (1 - seg(lt, T_DIVE - 0.4, T_DIVE)), lerp(-0.5, 0.0, k));
      p.group.scale.setScalar(SC);
      drawScreen(lt);
      p.phone.setScreenMap(tex, 1.0);
      f.world.studio.update(t, { backdrop: true, glow: 0.18, grid: 0.3, beams: 0.5, dust: 0.6, motes: 0.7, env: 1.3, envRot: 0.3 + lt * 0.15, rim: 1.5, key: 1.2 });
      f.world.studio.sweep.intensity = 3.5 * Math.exp(-Math.pow((lt - 0.9) * 2.4, 2));
      f.world.studio.sweep.position.set(lerp(-2.4, 2.4, seg(lt, 0.4, 1.5)), 1, 1.4);
      post.bloom = 0.62; post.vignette = 1.05;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.9 * (1 - E.outCubic(seg(lt, 0, 0.35)));
      post.flash += 1.2 * E.inCubic(seg(lt, 5.75, 6));
      if (lt > T_DIVE) { post.zoomBlur = Math.max(post.zoomBlur, 0.2 * E.inCubic(seg(lt, T_DIVE, 6))); }
      post.dof = lt < T_DIVE ? { focus: V ? 5.2 : 3.7, aperture: 0.01, maxblur: 0.004 } : null;

      // éclats sur les clics (projetés depuis l'écran)
      for (const [T0, P] of [[T_FOL, FOL], [T_BELL, BELL]]) {
        if (lt >= T0 && lt < T0 + 1) {
          const [x, y] = f.project(scr(P[0] + (P === FOL ? 40 : 0), P[1]));
          sparks(fx, x, y, lt - T0, f, { count: 60, life: 0.9 });
          radialGlow(fx, x, y, 260 * u, G.gold, 0.35 * Math.exp(-(lt - T0) / 0.25));
        }
      }

      // ---- textes
      const s = (V ? 92 : 86) * u;
      const x0 = V ? W / 2 : S.l, al = V ? 'center' : 'left';
      const y0 = V ? S.t + 70 * u : H * 0.3;
      const out = E.inCubic(seg(lt, T_DIVE - 0.15, T_DIVE + 0.1));
      ui.save(); ui.globalAlpha = 1 - out;
      veil(ui, x0 - (V ? 470 : 40) * u, y0 - s * 1.3, 940 * u, s * 3.4, 0.6);
      eyebrow(ui, 'MON TIKTOK', x0, y0 - s * 0.85, 28 * u, seg(lt, 0.3, 0.7), al);
      rich(ui, [['GOLD ', 'g'], ['HUNTER', 's']], x0, y0 + s * 0.3, { size: s * 1.05, k: seg(lt, 0.35, 0.75), align: al, glow: 1, weight: 900, maxW: V ? S.w : 900 * u });
      // étapes : 1. abonne-toi  2. active la cloche  3. live
      const steps = [[T_FOL - 0.1, '1', 'ABONNE-TOI'], [T_BELL - 0.1, '2', 'ACTIVE LA CLOCHE'], [T_LIVE, '3', 'LIVE BIENTÔT']];
      steps.forEach(([a, n, txt], i) => {
        const ks = seg(lt, a, a + 0.35);
        if (ks <= 0) return;
        const yy = V ? y0 + s * (1.15 + i * 0.62) : y0 + s * (1.3 + i * 0.75);
        const sz = s * (V ? 0.46 : 0.5);
        const xx = V ? W / 2 - 230 * u : x0;
        ui.save(); ui.globalAlpha *= clamp(ks * 2);
        ui.fillStyle = i === 2 ? G.red : G.gold;
        ui.beginPath(); ui.arc(xx + sz * 0.45, yy - sz * 0.33, sz * 0.5, 0, TAU); ui.fill();
        setFont(ui, sz * 0.62, 900, 0); ui.fillStyle = i === 2 ? '#fff' : '#120d04'; ui.textAlign = 'center'; ui.fillText(n, xx + sz * 0.45, yy - sz * 0.12);
        ui.restore();
        rich(ui, [[txt, i === 2 ? 'r' : 'w']], xx + sz * 1.15, yy, { size: sz, k: ks, align: 'left', weight: 800 });
      });
      ui.restore();
    },
  };
}
