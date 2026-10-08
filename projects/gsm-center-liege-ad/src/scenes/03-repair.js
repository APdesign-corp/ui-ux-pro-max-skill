// 6–9 s — RÉPARATION : le téléphone à l'écran fissuré se décompose en couches
// (écran, dalle, batterie, carte mère, connecteur, dos), étiquettes HUD,
// réassemblage avec impact, scanner vert, mini-animation SVG fissures → validation.

import * as THREE from 'three';
import { E, seg, win, pulse, lerp, rgba } from '../core/anim.js';
import {
  drawText, fitSize, eyebrow, drawSvg, sparks, shockRing, setFont, radialGlow, streak, flare,
} from '../core/draw.js';
import { PHONE } from '../world/phone.js';

export default function createRepair({ cfg, assets, W, H, u }) {
  const C = cfg.colors;
  const T = cfg.texts;
  const isV = H > W;
  const probe = document.createElement('canvas').getContext('2d');
  const tsize = fitSize(probe, T.repair, 700, -0.02, W * (isV ? 0.8 : 0.4), H * (isV ? 0.075 : 0.13));
  const rep = assets.repair;
  const labelAnchors = [
    { key: 'front', part: T.parts[0], local: new THREE.Vector3(0.3, 0.6, 0), dir: [1, -1], at: 0.8 },
    { key: 'battery', part: T.parts[1], local: new THREE.Vector3(-0.2, -0.3, 0), dir: [-1, 1], at: 0.9 },
    { key: 'connector', part: T.parts[2], local: new THREE.Vector3(0.05, 0, 0), dir: [1, 1], at: 1.0 },
  ];
  const corners = [
    new THREE.Vector3(-PHONE.W / 2, PHONE.H / 2, PHONE.D / 2),
    new THREE.Vector3(PHONE.W / 2, PHONE.H / 2, PHONE.D / 2),
    new THREE.Vector3(PHONE.W / 2, -PHONE.H / 2, PHONE.D / 2),
    new THREE.Vector3(-PHONE.W / 2, -PHONE.H / 2, PHONE.D / 2),
  ];

  return {
    update(f) {
      const { lt, fx, ui, post } = f;
      const { hero, studio, scanner } = f.world;
      const open = E.outExpo(seg(lt, 0.38, 0.9));
      const close = E.inExpo(seg(lt, 1.62, 2.0));
      const ex = open * (1 - close);
      const turn = E.inOutCubic(seg(lt, 0.15, 0.75)) * (1 - E.inOutCubic(seg(lt, 1.7, 2.1)));
      const whip = E.inExpo(seg(lt, 2.72, 3.0));

      if (f.owner) {
        const pull = E.outExpo(seg(lt, 0, 0.7));
        const rho = lerp(isV ? 1.9 : 1.25, isV ? 8.6 : 5.0, pull) + ex * (isV ? 1.6 : 0.9);
        const th = 0.08 * Math.sin(lt * 0.8) + turn * 0.12;
        const tx = whip * 2.2;
        f.camera([Math.sin(th) * rho + tx, 0.15 + turn * 0.2, Math.cos(th) * rho], [tx * 1.4 + (isV ? 0 : 0.35) * turn, isV ? 0 : -0.05, 0], 30, whip * -0.05);

        studio.update(f.t, {
          glow: 0.75 + 0.6 * pulse(lt, 2.0, 0.02, 0.5), grid: 0.35, beams: 0.35, envRot: 1.2 + lt * 0.5, dust: 1, motes: 0.8,
          rim: 1 + 1.5 * pulse(lt, 2.0, 0.02, 0.4),
        });
        hero.group.visible = true;
        hero.group.position.set((isV ? 0 : 0.55) * turn, Math.sin(lt * 1.4) * 0.02 + (isV ? -0.2 : 0.05) * turn, 0);
        hero.group.rotation.set(0.32 * turn, -0.68 * turn + 0.04 * Math.sin(lt), 0.06 * turn);
        hero.group.scale.setScalar(1);
        hero.setExplode(ex, lt);
        hero.setCracked(lt < 2.0);

        // scanner 3D
        const sp = seg(lt, 2.05, 2.55);
        scanner.visible = sp > 0 && sp < 1;
        scanner.position.set(0, lerp(PHONE.H / 2 + 0.2, -PHONE.H / 2 - 0.05, E.inOutSine(sp)), PHONE.D / 2 + 0.01);

        post.dof = ex > 0.05 ? { focus: f.dist(hero.group), aperture: 0.0014, maxblur: 0.0028 } : null;
        post.blur = [whip * 0.075, 0];
        post.glitch += win(lt, 0.38, 0.41, 0.46, 0.52) * 0.6 + win(lt, 2.88, 2.91, 2.94, 2.98) * 0.5;
        post.ca += 0.004 * pulse(lt, 0.4, 0.01, 0.2) + 0.006 * pulse(lt, 2.0, 0.01, 0.22);
        post.flash += 0.35 * pulse(lt, 2.0, 0.01, 0.1) + 0.18 * pulse(lt, 0.4, 0.01, 0.08);
        post.bloom += 0.5 * pulse(lt, 2.0, 0.01, 0.3);
        post.zoomBlur += 0.05 * pulse(lt, 2.0, 0.01, 0.15);

        // ---- calque lumineux
        const pc = f.project(hero.group);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        sparks(fx, pc[0], pc[1], lt - 0.4, f, { count: 70, seed: 21, speed: 1700, life: 0.7 });
        sparks(fx, pc[0], pc[1], lt - 2.0, f, { count: 60, seed: 33, speed: 1300, life: 0.55, color: C.teal });
        shockRing(fx, pc[0], pc[1], lt - 2.0, f, { radius: 620, width: 8, dur: 0.42, flat: 0.55, alpha: 0.6 });
        if (lt >= 2.0 && lt < 2.6) post.shock = [pc[0] / W, pc[1] / H, 0.05 + E.outExpo((lt - 2.0) / 0.6) * 0.5, (1 - (lt - 2.0) / 0.6) * 0.45];

        // étiquettes HUD des composants
        const la = win(lt, 0.75, 0.95, 1.45, 1.62);
        if (la > 0) {
          for (const L of labelAnchors) {
            const obj = hero.anchors[L.key];
            const a = f.project(obj, L.local);
            const p = E.outExpo(seg(lt, L.at, L.at + 0.35));
            const len = 150 * u * p;
            const b = [a[0] + L.dir[0] * len, a[1] + L.dir[1] * len * 0.55];
            const c = [b[0] + L.dir[0] * 200 * u * p, b[1]];
            fx.strokeStyle = rgba(C.neon, 0.9 * la);
            fx.lineWidth = 2 * u;
            fx.beginPath();
            fx.moveTo(a[0], a[1]);
            fx.lineTo(b[0], b[1]);
            fx.lineTo(c[0], c[1]);
            fx.stroke();
            radialGlow(fx, a[0], a[1], 26 * u, C.neon, la);
            fx.fillStyle = rgba('#eaffea', la);
            fx.beginPath();
            fx.arc(a[0], a[1], 5 * u, 0, Math.PI * 2);
            fx.fill();
            const ls = 34 * u;
            drawText(ui, L.part, c[0] + (L.dir[0] > 0 ? 14 * u : -14 * u), c[1] + ls * 0.36, {
              size: ls, weight: 600, tracking: 0.16, align: L.dir[0] > 0 ? 'left' : 'right', t: lt - L.at - 0.15,
              mode: 'track', trackFrom: 0.5, dur: 0.35, color: C.white, alpha: la,
            });
          }
        }

        // scanner : ligne lumineuse + équerres + lecture "DIAGNOSTIC RAPIDE"
        const sa = win(lt, 1.98, 2.1, 2.6, 2.75);
        if (sa > 0) {
          const pts = corners.map((v) => f.project(hero.inner, v));
          const minX = Math.min(...pts.map((p) => p[0])) - 40 * u, maxX = Math.max(...pts.map((p) => p[0])) + 40 * u;
          const minY = Math.min(...pts.map((p) => p[1])) - 40 * u, maxY = Math.max(...pts.map((p) => p[1])) + 40 * u;
          const bl = 70 * u * E.outExpo(seg(lt, 1.98, 2.25));
          fx.strokeStyle = rgba(C.neon, sa);
          fx.lineWidth = 3 * u;
          fx.beginPath();
          for (const [x, y, dx, dy] of [[minX, minY, 1, 1], [maxX, minY, -1, 1], [maxX, maxY, -1, -1], [minX, maxY, 1, -1]]) {
            fx.moveTo(x, y + dy * bl);
            fx.lineTo(x, y);
            fx.lineTo(x + dx * bl, y);
          }
          fx.stroke();
          const sp = E.inOutSine(seg(lt, 2.05, 2.55));
          if (sp > 0 && sp < 1) {
            const y = lerp(minY, maxY, sp);
            streak(fx, minX - 60 * u, y, maxX + 60 * u, y, 2.5 * u, C.neon, 0.8);
            radialGlow(fx, maxX + 60 * u, y, 40 * u, '#ffffff', 0.6);
          }
          const ds = 26 * u;
          const lx = isV ? (minX + maxX) / 2 : maxX + 50 * u, ly = isV ? maxY + 70 * u : minY + 30 * u;
          setFont(ui, ds, 600, 0.2);
          drawText(ui, T.diagnostic, lx, ly, { size: ds, weight: 600, tracking: 0.2, align: isV ? 'center' : 'left', t: lt - 2.0, mode: 'track', dur: 0.3, color: C.neon, alpha: sa });
          const bw = 300 * u, bh = 6 * u;
          const bx0 = isV ? lx - bw / 2 : lx;
          ui.save();
          ui.globalAlpha = sa;
          ui.fillStyle = 'rgba(255,255,255,0.15)';
          ui.fillRect(bx0, ly + 22 * u, bw, bh);
          ui.fillStyle = C.neon;
          ui.fillRect(bx0, ly + 22 * u, bw * E.inOutCubic(seg(lt, 2.05, 2.55)), bh);
          ui.restore();
        }
        fx.restore();
      }

      // ---- mini-animation SVG : fissures qui se résorbent → validation
      const ma = win(lt, 1.75, 1.95, 2.7, 2.9);
      if (ma > 0) {
        const sc = (H * (isV ? 0.16 : 0.3)) / 400;
        const tf = { x: isV ? W * 0.5 : W * 0.84, y: isV ? H * 0.78 : H * 0.5, s: sc, rot: 0, origin: rep.center };
        const glow = 1;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        drawSvg(fx, rep.get('body'), tf, { p: E.outCubic(seg(lt, 1.75, 2.05)), width: 3 * u, color: C.white, alpha: ma, glow });
        drawSvg(fx, rep.get('island'), tf, { p: seg(lt, 1.95, 2.05), width: 4 * u, color: C.white, alpha: ma });
        const heal = E.inOutCubic(seg(lt, 2.1, 2.45));
        rep.group('cracks').forEach((it, i) => {
          drawSvg(fx, it, tf, { p: E.outCubic(seg(lt, 1.8 + i * 0.02, 1.98 + i * 0.02)) * (1 - heal), width: 2.5 * u, color: C.white, alpha: ma * 0.75 });
        });
        drawSvg(fx, rep.get('check-ring'), tf, { p: E.outCubic(seg(lt, 2.4, 2.7)), width: 4 * u, color: C.neon, alpha: ma, glow: 1.4 });
        drawSvg(fx, rep.get('check'), tf, { p: E.outExpo(seg(lt, 2.52, 2.75)), width: 7 * u, color: C.neon, alpha: ma, glow: 1.4 });
        const ck = rep.get('check-ring');
        void ck;
        flare(fx, tf.x, tf.y + (214 - 200) * sc, 0.45 * pulse(lt, 2.6, 0.03, 0.3) * cfg.vfx.flares, f, C.neon);
        fx.restore();
      }

      // ---- typographie
      const out = E.inCubic(seg(lt, 2.55, 2.8));
      const x0 = isV ? W / 2 : W * 0.065;
      const yT = isV ? H * 0.2 : H * 0.84;
      const align = isV ? 'center' : 'left';
      // synchronisé sur la voix : « Téléphonie, réparation… et expertise »
      const dT = f.t - f.mark('L3.Téléphonie', f.clock.toGlobal(0.15));
      const dR = f.t - f.mark('L3.réparation', f.clock.toGlobal(0.38));
      eyebrow(ui, T.stepRepair, x0, yT - tsize * 1.05, dT, f, { align, alpha: 1 - out });
      drawText(ui, T.repair, x0, yT, { size: tsize, weight: 700, tracking: -0.02, align, t: dR + 0.04, stagger: 0.028, dur: 0.42, color: C.white, out });
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      drawText(fx, T.repair, x0, yT, { size: tsize, weight: 700, tracking: -0.02, align, t: dR + 0.04, stagger: 0.028, dur: 0.42, color: C.white, out, alpha: 0.18 });
      fx.restore();
      const ss = tsize * 0.42;
      drawText(ui, T.repairSub, x0, yT + ss * 1.45, { size: ss, weight: 600, tracking: 0.02, align, t: dR - 0.4, stagger: 0.03, dur: 0.45, color: C.neon, out });
    },
  };
}
