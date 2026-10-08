// SEGMENT « orbit » (2 → 5 s) — les iPhone surgissent de la profondeur, écrans qui s'allument
// un à un, orbite 360° qui accélère en frôlant les téléphones (à côté / au-dessus / en dessous),
// ralenti dramatique sur le héros penché, punch-in + flash vert-blanc (raccord IMPACT avec roll).
//
// Caméra, positions et horloge ralentie : voir 02-orbit-rig.js (partagé avec 01-ignite).

import { E, clamp, lerp, seg, pulse, win, noise1, rgba } from '../core/anim.js';
import { radialGlow, streak, flare, eyebrow, drawText, textWidth, fitSize, textSweep } from '../core/draw.js';
import { C, speedLines } from '../core/type.js';
import { makeRig, buildStage } from './02-orbit-rig.js';

// Temps LOCAUX (0 = 2.00 s global). Grille 120 BPM : temps à 0, 0.5, 1.0, 1.5, 2.0, 2.5.
export const cues = [
  { t: 0.0, type: 'hit', gain: 0.9 },
  { t: 0.0, type: 'whoosh', dur: 0.45, gain: 1.1 },
  { t: 0.04, type: 'whoosh', dur: 0.35, gain: 0.7, pan: 0.55 },
  { t: 0.08, type: 'whoosh', dur: 0.35, gain: 0.6, pan: -0.55 },
  { t: 0.3, type: 'pop', gain: 0.95 },
  { t: 0.3, type: 'click', gain: 0.6 },
  { t: 0.45, type: 'pop', gain: 0.75, pan: 0.45 },
  { t: 0.6, type: 'pop', gain: 0.75, pan: -0.45 },
  { t: 0.75, type: 'pop', gain: 0.7, pan: 0.6 },
  { t: 0.9, type: 'pop', gain: 0.7, pan: -0.6 },
  { t: 0.95, type: 'swish', gain: 0.6, pan: -0.5 },        // « 01 — CHOISIR »
  { t: 0.93, type: 'whoosh', dur: 0.3, gain: 0.8, pan: 0.5 }, // la caméra frôle un téléphone
  { t: 1.1, type: 'riser', dur: 1.5, gain: 0.8 },             // pic au ralenti (2.6)
  { t: 1.6, type: 'whoosh', dur: 0.25, gain: 0.9, pan: -0.4 }, // passage au-dessus
  { t: 1.91, type: 'whoosh', dur: 0.22, gain: 1.0, pan: 0.4 }, // passage en dessous
  { t: 2.22, type: 'whoosh', dur: 0.2, gain: 1.0, pan: -0.5 },
  { t: 2.4, type: 'whip', gain: 0.8, pan: 0.5 },
  { t: 2.6, type: 'sub', dur: 0.4, gain: 0.9 },               // ralenti
  { t: 2.6, type: 'reverse', dur: 0.25, gain: 0.6 },
  { t: 2.62, type: 'suck', dur: 0.38, gain: 1.0 },            // aspiration vers l'IMPACT de roll (5.00)
  { t: 2.85, type: 'whoosh', dur: 0.15, gain: 1.2 },          // punch-in
];

const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export default function create(ctx) {
  const { THREE, world, W, H, V, u, L } = ctx;
  const rig = makeRig(V);
  const group = new THREE.Group();
  const stage = buildStage(ctx);
  group.add(stage.root);

  // ---- lumières propres au segment (dans le groupe : actives seulement pendant orbit)
  const rim = new THREE.PointLight(new THREE.Color(C.neon), 0, 7, 2);
  const rim2 = new THREE.PointLight(new THREE.Color(C.teal), 0, 6, 2);
  const sweep = new THREE.PointLight(0xffffff, 0, 5, 2);
  group.add(rim, rim2, sweep);

  const eul = new THREE.Euler();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vUp = new THREE.Vector3(0, 1, 0), vR = new THREE.Vector3();

  // ---- typo (mesurée une fois)
  const g0 = ctx.engine.ui;
  const S = L.safe;
  const T1 = 'Neufs &', T2 = 'reconditionnés';
  let typo;
  if (!V) {
    const size = 74 * u;
    const w1 = textWidth(g0, T1 + ' ', size, 300, 0);
    typo = { size, w1, x: S.l, yEye: S.b - 122 * u, y: S.b - 18 * u };
  } else {
    const s2 = Math.min(104 * u, fitSize(g0, T2, 800, -0.01, S.w * 0.92, 200 * u));
    typo = { s1: s2 * 0.82, s2, yEye: S.b - 268 * u, y1: S.b - 150 * u, y2: S.b - 22 * u };
  }

  // projection d'un point 3D vers l'écran (null si derrière la caméra)
  const proj = (f, p) => {
    const q = f.project(p);
    return q[2] < 1 && q[2] > -1 ? q : null;
  };
  // taille écran (px) d'un objet de hauteur h à la position p
  const pxSize = (f, p, h) => {
    const d = dist3(p, f.cam.pos);
    return (h / Math.max(0.05, d)) * (H / (2 * Math.tan((f.cam.fov * Math.PI) / 360)));
  };

  return {
    group,
    camera(lt) {
      return rig.cam(lt);
    },
    update(f) {
      const T = f.lt;
      const w = rig.warp(T);
      const { fx, ui, post, world: wd } = f;
      const cam = f.cam;
      const om = rig.omega(T);
      const slowK = win(T, 2.56, 2.64, 2.86, 2.95);
      const punch = E.inQuart(seg(T, 2.85, 3.0));

      // ------------------------------------------------------------- monde
      wd.studio.update(2 + w, {
        backdrop: false, grid: 0, beams: 0.5, dust: 1.15, motes: 1.25, env: 1.15,
        envRot: -0.55 * rig.theta(T) + 0.6 * Math.sin(w * 0.9), rim: 0.9, key: 0.95, glow: 1,
      });

      const st = [];
      for (let k = 0; k < 5; k++) st.push(rig.phone(k, T));
      const hero = st[0];
      const hp = hero.pos;

      // direction caméra → héros
      vA.set(hp[0] - cam.pos[0], hp[1] - cam.pos[1], hp[2] - cam.pos[2]).normalize();
      vR.crossVectors(vA, vUp).normalize();
      const behind = [hp[0] + vA.x * 1.7, hp[1] + vA.y * 1.7 + 0.15, hp[2] + vA.z * 1.7];

      stage.update({
        t: 2 + w, bg: 1.05, tubes: 1, tubesOn: 1, grid: V ? 0.45 : 0.7, haze: 1.0,
        bgCenter: [0.5, 0.5],
        back: { pos: behind, k: (0.75 + 0.45 * slowK) * hero.ar, scale: V ? 4.4 : 3.6 },
      });

      // téléphones + écrans
      for (let k = 0; k < 5; k++) {
        const s = st[k];
        const P = wd.phones[s.L.i];
        P.group.visible = true;
        P.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
        P.group.quaternion.setFromEuler(eul.set(s.pitch, s.yaw, s.roll, 'YXZ'));
        const tw = T - s.L.wake;
        const br = k === 0 ? 1 : 0.8;
        if (tw < 0) P.screen.draw('off', 0);
        else if (tw < 0.36) P.screen.draw('wake', tw, { p: E.outCubic(tw / 0.36), brightness: br });
        else P.screen.draw(s.L.app, (w - s.L.wake - 0.36) * 1.0, { variant: s.L.variant || 0, brightness: br });
      }

      // lumières : contre-jour vert derrière le héros, teal en dessous, balayage blanc
      rim.position.set(behind[0] + vR.x * 0.5, behind[1] + 0.85, behind[2] + vR.z * 0.5);
      rim.intensity = (22 + 14 * slowK) * hero.ar;
      rim2.position.set(hp[0] + vA.x * 1.0 - vR.x * 0.8, hp[1] - 0.9, hp[2] + vA.z * 1.0 - vR.z * 0.8);
      rim2.intensity = 9 * hero.ar;
      const sw1 = seg(T, 0.85, 1.35), sw2 = seg(T, 2.58, 2.92);
      const swp = sw1 > 0 && sw1 < 1 ? sw1 : sw2;
      const swa = sw1 > 0 && sw1 < 1 ? Math.sin(Math.PI * sw1) : Math.sin(Math.PI * sw2) * 1.2;
      const sx = lerp(-2.4, 2.4, E.inOutSine(swp));
      sweep.position.set(hp[0] - vA.x * 1.0 + vR.x * sx, hp[1] + 0.55, hp[2] - vA.z * 1.0 + vR.z * sx);
      sweep.intensity = 30 * swa;

      // ------------------------------------------------------------- calque lumière (fx)
      // arrivée : traînées lumineuses et points (continuité avec la fin d'ignite)
      for (let k = 0; k < 5; k++) {
        const s = st[k];
        if (s.ar >= 0.995) continue;
        const cur = proj(f, s.pos);
        const pr = rig.phone(k, Math.max(0, T - 0.04));
        const prev = proj(f, pr.pos);
        const kk = 1 - s.ar;
        if (cur && prev) {
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          streak(fx, prev[0], prev[1], cur[0], cur[1], (2 + 7 * s.ar) * u, C.neon, 0.9 * Math.sqrt(kk));
          fx.restore();
        }
        if (cur) {
          const gk = Math.pow(kk, 1.5);
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          radialGlow(fx, cur[0], cur[1], 70 * u, C.neon, 0.55 * gk);
          radialGlow(fx, cur[0], cur[1], 16 * u, '#ffffff', 0.95 * gk);
          fx.translate(cur[0], cur[1]);
          fx.scale(1, 0.07);
          radialGlow(fx, 0, 0, 210 * u, '#d8ffe0', 0.5 * gk);
          fx.restore();
        }
      }
      // allumage des écrans : éclair de lumière sur l'écran (pop)
      for (let k = 0; k < 5; k++) {
        const s = st[k];
        const pk = pulse(T, s.L.wake, 0.015, 0.11);
        if (pk < 0.01) continue;
        // centre de l'écran : légèrement devant le téléphone, côté écran
        eul.set(s.pitch, s.yaw, s.roll, 'YXZ');
        vB.set(0, 0, 0.06).applyEuler(eul);
        const c = proj(f, [s.pos[0] + vB.x, s.pos[1] + vB.y, s.pos[2] + vB.z]);
        if (!c) continue;
        const R = pxSize(f, s.pos, 1.56) * 0.55;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, c[0], c[1], R * 1.6, C.neon, 0.35 * pk);
        radialGlow(fx, c[0], c[1], R * 0.5, '#ffffff', 0.5 * pk);
        fx.translate(c[0], c[1]);
        fx.scale(1, 0.05);
        radialGlow(fx, 0, 0, R * 4, '#d8ffe0', 0.45 * pk);
        fx.restore();
      }
      // lignes de vitesse : sortie de l'explosion du titre, puis punch-in
      const slk = 0.85 * (1 - E.outCubic(seg(T, 0, 0.38))) + 0.9 * E.inQuad(seg(T, 2.84, 3.0));
      speedLines(fx, W, H, 2 + T, slk, { count: 150, speed: 1.8 });
      // reflet du héros au ralenti : flare anamorphique sur l'arête haute
      if (slowK > 0.01 || punch > 0) {
        eul.set(hero.pitch, hero.yaw, hero.roll, 'YXZ');
        vB.set(0.3, 0.74, 0.05).applyEuler(eul);
        const c = proj(f, [hp[0] + vB.x, hp[1] + vB.y, hp[2] + vB.z]);
        if (c) flare(fx, c[0], c[1], 0.32 * slowK * (0.85 + 0.15 * noise1(T * 20)), f);
      }
      // punch-in : l'écran déborde de lumière
      if (punch > 0) {
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, W / 2, H / 2, Math.max(W, H) * (0.3 + 0.5 * punch), C.neon2, 0.35 * punch);
        fx.restore();
      }

      // ------------------------------------------------------------- typo (ui)
      const outK = seg(T, 2.8, 2.95);
      const aT = 1 - outK;
      if (!V) {
        eyebrow(ui, '01 — CHOISIR', typo.x, typo.yEye, T - 0.95, f, { size: 30, alpha: aT });
        const o = { size: typo.size, t: T - 1.08, mode: 'rise', stagger: 0.022, dur: 0.5, out: outK };
        drawText(ui, T1, typo.x, typo.y, { ...o, weight: 300, color: C.white });
        drawText(ui, T2, typo.x + typo.w1, typo.y, { ...o, t: T - 1.2, weight: 800, color: C.white });
        textSweep(ui, T2, typo.x + typo.w1, typo.y, { size: typo.size, weight: 800 }, seg(T, 1.75, 2.25), C.neon, 0.95);
      } else {
        // voile sombre en bas pour la lisibilité (format réseaux)
        const k = E.outCubic(seg(T, 0.85, 1.2)) * aT;
        if (k > 0) {
          const grd = ui.createLinearGradient(0, S.b - 420 * u, 0, H);
          grd.addColorStop(0, 'rgba(2,6,4,0)');
          grd.addColorStop(0.55, `rgba(2,6,4,${0.5 * k})`);
          grd.addColorStop(1, `rgba(2,6,4,${0.65 * k})`);
          ui.fillStyle = grd;
          ui.fillRect(0, S.b - 420 * u, W, H - (S.b - 420 * u));
        }
        eyebrow(ui, '01 — CHOISIR', W / 2, typo.yEye, T - 0.95, f, { size: 34, align: 'center', alpha: aT });
        const o = { align: 'center', mode: 'rise', stagger: 0.022, dur: 0.5, out: outK };
        drawText(ui, T1, W / 2, typo.y1, { ...o, size: typo.s1, weight: 300, t: T - 1.08, color: C.white });
        drawText(ui, T2, W / 2, typo.y2, { ...o, size: typo.s2, weight: 800, tracking: -0.01, t: T - 1.2, color: C.white });
        textSweep(ui, T2, W / 2, typo.y2, { size: typo.s2, weight: 800, tracking: -0.01, align: 'center' }, seg(T, 1.75, 2.25), C.neon, 0.95);
      }

      // ------------------------------------------------------------- post-production
      // flou d'orbite (le point visé reste fixe : on ajoute le filé de l'arrière-plan)
      post.blur[0] += clamp(om * 0.0058, 0, 0.045) * (1 - slowK);
      post.uiBlur = 0.12;
      // sortie de l'explosion du titre (continuité du zoom blur d'ignite)
      post.zoomBlur += 0.2 * (1 - E.outCubic(seg(T, 0, 0.28)));
      post.zoomBlur += 0.12 * punch;
      post.ca += 0.003 * (1 - seg(T, 0, 0.25)) + 0.004 * punch;
      // profondeur de champ : point sur le héros, bascule de point (rack focus) sur le téléphone
      // de premier plan quand il s'allume, et du fond vers le héros pendant le ralenti
      const dHero = dist3(cam.pos, hp);
      let focus = dHero;
      focus = lerp(focus, dist3(cam.pos, st[1].pos), win(T, 0.42, 0.55, 0.72, 0.95, E.inOutCubic, E.inOutCubic));
      focus = lerp(focus, dist3(cam.pos, st[4].pos), (1 - E.inOutCubic(seg(T, 2.64, 2.8))) * seg(T, 2.5, 2.56));
      post.dof = { focus, aperture: 0.0016 + 0.0034 * slowK, maxblur: 0.0085 };
      post.bloom = 0.65 + 0.15 * slowK + 0.4 * punch;
      // raccord IMPACT avec roll : flash vert-blanc qui monte à 0.8 sur la dernière image
      post.flash = Math.max(post.flash, 0.8 * E.inQuad(seg(T, 2.8, 2.9834)));
      post.flashColor = [0.82, 1, 0.84];
      post.vignette = 0.95 + 0.25 * slowK;
    },
  };
}
