// 12–15 s — WESTERN UNION / RIA : carte du monde en points (Natural Earth), révélation
// radiale depuis Liège, arcs lumineux vers le monde entier, réseau international,
// typographie élégante, plongée finale dans Liège.

import * as THREE from 'three';
import { E, seg, win, pulse, lerp, rgba, TAU } from '../core/anim.js';
import { drawText, fitSize, radialGlow, drawSvgGroup, textWidth } from '../core/draw.js';
import { LIEGE, DESTINATIONS, lonLatToLocal, arcPoints } from '../world/worldmap.js';

export default function createTransfer({ cfg, assets, W, H, u }) {
  const C = cfg.colors;
  const T = cfg.texts;
  const isV = H > W;
  const probe = document.createElement('canvas').getContext('2d');
  const [wu, ria] = T.transfer;
  const lineW = isV ? W * 0.86 : W * 0.62;
  const tsize = isV ? fitSize(probe, wu, 700, 0.02, lineW, H * 0.07) : fitSize(probe, `${wu}    ${ria}`, 700, 0.02, lineW, H * 0.11);
  const origin = lonLatToLocal(LIEGE);
  const arcs = DESTINATIONS.map((d, i) => ({
    pts: arcPoints(origin, lonLatToLocal(d)),
    at: 0.42 + i * 0.075,
    dur: 0.5 + (i % 3) * 0.08,
    end: lonLatToLocal(d),
  }));
  const circ = (c, r, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * TAU;
    return new THREE.Vector3(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 0.002);
  });

  return {
    update(f) {
      const { lt, fx, ui, post } = f;
      const { map, studio } = f.world;
      const dive = E.inExpo(seg(lt, 2.45, 3.0));
      if (f.owner) {
        // caméra : vue plongeante sur l'Europe → recul incliné → plongée dans Liège
        const L = new THREE.Vector3(origin.x, 0, -origin.y);
        const wide = E.inOutCubic(seg(lt, 0, 2.3));
        const k = isV ? 1.55 : 1;
        let pos = new THREE.Vector3(lerp(0.2, 0.35, wide), lerp(5.2, 3.7, wide) * k, lerp(0.6, 3.3, wide) * k);
        let tgt = new THREE.Vector3(lerp(0.15, 0.3, wide), 0, lerp(-1.0, -0.72, wide));
        pos.lerp(new THREE.Vector3(L.x, 0.45, L.z + 0.5), dive);
        tgt.lerp(L, dive);
        f.camera(pos.toArray(), tgt.toArray(), 30, lerp(0.06, -0.02, wide));
        studio.update(f.t, { glow: 0.2, backdrop: false, grid: 0, beams: 0, dust: 0.8, motes: 0.6, env: 0.6 });

        map.group.visible = true;
        map.mat.uniforms.uReveal.value = E.outCubic(seg(lt, 0.05, 1.1)) * 1.3;
        map.mat.uniforms.uTime.value = lt;
        map.mat.uniforms.uOpacity.value = 1 - seg(lt, 2.75, 3.0);

        post.blur = [0, 0.08 * (1 - E.outCubic(seg(lt, 0, 0.3)))];
        post.zoomBlur += dive * 0.14;
        post.zoomCenter = [0.5, 0.5];
        post.flash += 0.12 * (pulse(lt, 0.5, 0.01, 0.1) + pulse(lt, 1.0, 0.01, 0.1)) + 0.55 * dive * dive;

        // ---- arcs + marqueurs (projection 3D → calque lumineux)
        const g = map.group;
        const P = (v) => f.project(g, v);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        const fadeA = 1 - E.inCubic(seg(lt, 2.4, 2.8));
        for (const a of arcs) {
          const p = E.inOutCubic(seg(lt, a.at, a.at + a.dur));
          if (p <= 0) continue;
          const n = a.pts.length - 1;
          const head = Math.max(1, Math.floor(n * p));
          const sp = a.pts.slice(0, head + 1).map(P);
          fx.beginPath();
          sp.forEach((q, i) => (i ? fx.lineTo(q[0], q[1]) : fx.moveTo(q[0], q[1])));
          fx.strokeStyle = rgba(C.neon, 0.22 * fadeA);
          fx.lineWidth = 7 * u;
          fx.stroke();
          fx.strokeStyle = rgba('#d8ffe0', 0.85 * fadeA);
          fx.lineWidth = 2.2 * u;
          fx.stroke();
          // impulsion qui circule après l'arrivée
          if (p >= 1) {
            fx.setLineDash([30 * u, 220 * u]);
            fx.lineDashOffset = -(lt - a.at) * 1200 * u;
            fx.strokeStyle = rgba('#ffffff', 0.9 * fadeA);
            fx.lineWidth = 3.5 * u;
            fx.stroke();
            fx.setLineDash([]);
          }
          const h = sp[sp.length - 1];
          radialGlow(fx, h[0], h[1], (p < 1 ? 46 : 26) * u, C.neon, 0.9 * fadeA);
          // onde d'arrivée sur la carte
          const ta = lt - (a.at + a.dur);
          if (ta > 0 && ta < 0.7) {
            const ring = circ(a.end, 0.04 + ta * 0.25).map(P);
            fx.beginPath();
            ring.forEach((q, i) => (i ? fx.lineTo(q[0], q[1]) : fx.moveTo(q[0], q[1])));
            fx.strokeStyle = rgba(C.neon, (1 - ta / 0.7) * 0.9 * fadeA);
            fx.lineWidth = 2 * u;
            fx.stroke();
          }
        }
        // Liège : balise + anneaux pulsés
        const pl = P(origin);
        const beacon = P(new THREE.Vector3(origin.x, origin.y, 0.55));
        const ba = seg(lt, 0.05, 0.3);
        const grd = fx.createLinearGradient(pl[0], pl[1], beacon[0], beacon[1]);
        grd.addColorStop(0, rgba(C.neon, 0.9 * ba));
        grd.addColorStop(1, rgba(C.neon, 0));
        fx.strokeStyle = grd;
        fx.lineWidth = 5 * u;
        fx.beginPath();
        fx.moveTo(pl[0], pl[1]);
        fx.lineTo(beacon[0], beacon[1]);
        fx.stroke();
        radialGlow(fx, pl[0], pl[1], 90 * u, C.neon, 0.9 * ba);
        for (let k2 = 0; k2 < 3; k2++) {
          const tt = (lt * 0.9 + k2 / 3) % 1;
          const ring = circ(origin, 0.03 + tt * 0.32).map(P);
          fx.beginPath();
          ring.forEach((q, i) => (i ? fx.lineTo(q[0], q[1]) : fx.moveTo(q[0], q[1])));
          fx.strokeStyle = rgba(C.neon, (1 - tt) * 0.8 * ba);
          fx.lineWidth = 2.5 * u;
          fx.stroke();
        }
        fx.restore();
        // étiquette LIÈGE
        const ls = 30 * u;
        drawText(ui, T.cityLabel, pl[0] + 26 * u, pl[1] - 34 * u, {
          size: ls, weight: 700, tracking: 0.3, align: 'left', t: lt - 0.25, mode: 'track', dur: 0.4, color: C.white, alpha: 1 - seg(lt, 1.25, 1.45),
        });
      }

      // ---- typographie WESTERN UNION | RIA
      const out = E.inCubic(seg(lt, 2.3, 2.6));
      const yT = isV ? H * 0.17 : H * 0.2;
      // voile sombre en haut de cadre : garantit la lisibilité au-dessus de la carte
      const scrimA = E.outCubic(seg(lt, 0.2, 0.6)) * (1 - out);
      if (scrimA > 0) {
        const sg = ui.createLinearGradient(0, 0, 0, H * (isV ? 0.42 : 0.45));
        sg.addColorStop(0, `rgba(4,6,5,${0.85 * scrimA})`);
        sg.addColorStop(0.6, `rgba(4,6,5,${0.55 * scrimA})`);
        sg.addColorStop(1, 'rgba(4,6,5,0)');
        ui.fillStyle = sg;
        ui.fillRect(0, 0, W, H * (isV ? 0.42 : 0.45));
      }
      const icon = (name, x, y, s, t0) => {
        const a = E.outCubic(seg(lt, t0, t0 + 0.3)) * (1 - out);
        if (a <= 0) return;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        drawSvgGroup(fx, assets.icons.group(name), { x, y, s: s / 24, rot: 0, origin: [12, 12] }, { p: E.outCubic(seg(lt, t0, t0 + 0.4)), width: 3 * u, color: C.neon, alpha: a, glow: 1 });
        fx.restore();
      };
      if (isV) {
        drawText(ui, wu, W / 2, yT, { size: tsize, weight: 700, tracking: 0.02, align: 'center', t: lt - 0.45, stagger: 0.03, dur: 0.45, color: C.white, out });
        drawText(ui, ria, W / 2, yT + tsize * 1.25, { size: tsize * 1.1, weight: 700, tracking: 0.04, align: 'center', t: lt - 0.95, stagger: 0.05, dur: 0.45, color: C.neon, out });
        icon('send', W / 2 - textWidth(ui, wu, tsize, 700, 0.02) / 2 - tsize * 0.8, yT - tsize * 0.35, tsize * 0.9, 0.5);
        icon('globe', W / 2 + textWidth(ui, ria, tsize * 1.1, 700, 0.04) / 2 + tsize * 0.8, yT + tsize * 0.9, tsize * 0.9, 1.0);
      } else {
        const gap = tsize * 1.4;
        const w1 = textWidth(ui, wu, tsize, 700, 0.02), w2 = textWidth(ui, ria, tsize, 700, 0.02);
        const x1 = W / 2 - (w1 + gap + w2) / 2;
        drawText(ui, wu, x1, yT, { size: tsize, weight: 700, tracking: 0.02, align: 'left', t: lt - 0.45, stagger: 0.028, dur: 0.45, color: C.white, out });
        drawText(ui, ria, x1 + w1 + gap, yT, { size: tsize, weight: 700, tracking: 0.02, align: 'left', t: lt - 0.95, stagger: 0.05, dur: 0.45, color: C.neon, out });
        // séparateur vertical lumineux
        const sa = E.outExpo(seg(lt, 0.85, 1.15)) * (1 - out);
        const sx = x1 + w1 + gap / 2;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        fx.fillStyle = rgba(C.neon, sa);
        const sh = tsize * 0.9 * sa;
        fx.fillRect(sx - 1.5 * u, yT - tsize * 0.35 - sh / 2, 3 * u, sh);
        radialGlow(fx, sx, yT - tsize * 0.35, tsize * 0.6, C.neon, 0.4 * sa);
        fx.restore();
        icon('send', x1 - tsize * 0.85, yT - tsize * 0.36, tsize * 0.8, 0.5);
        icon('globe', x1 + w1 + gap + w2 + tsize * 0.85, yT - tsize * 0.36, tsize * 0.8, 1.0);
      }
      const ss = tsize * (isV ? 0.36 : 0.3);
      drawText(ui, T.transferSub, W / 2, yT + (isV ? tsize * 2.25 : tsize * 0.9), {
        size: ss, weight: 500, tracking: 0.26, align: 'center', t: lt - 1.45, mode: 'track', trackFrom: 0.6, dur: 0.6, color: C.white, alpha: 0.9 * (1 - out),
      });
    },
  };
}
