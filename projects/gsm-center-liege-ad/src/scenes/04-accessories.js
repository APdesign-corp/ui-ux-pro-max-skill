// 9–12 s — ACCESSOIRES • MULTIMÉDIA • INTERNET : travelling latéral, produits en studio
// qui apparaissent autour du smartphone, trajectoires lumineuses qui les relient,
// hologrammes internet (globe + icône wifi du site). Mots synchronisés sur les temps.

import * as THREE from 'three';
import { E, seg, win, pulse, lerp, rgba, TAU } from '../core/anim.js';
import { drawText, fitSize, eyebrow, flowCurve, flare, charLayout, setFont, textWidth, radialGlow, drawSvgGroup, shockRing } from '../core/draw.js';

export default function createAccessories({ cfg, assets, W, H, u }) {
  const C = cfg.colors;
  const T = cfg.texts;
  const isV = H > W;
  const probe = document.createElement('canvas').getContext('2d');
  const sep = '  •  ';
  const line = T.services.join(sep);
  const lsize = fitSize(probe, line, 700, -0.01, W * (isV ? 0.92 : 0.8), H * 0.085);
  // index de début de chaque mot dans la ligne
  const starts = [];
  let acc = 0;
  T.services.forEach((w) => { starts.push(acc); acc += w.length + sep.length; });
  const wordOf = (i) => { let k = -1; starts.forEach((s, j) => { if (i >= s) k = j; }); return i - starts[k] < T.services[k].length ? k : -1; };
  const times = [0.5, 1.0, 1.5]; // apparition des mots (sur les temps à 120 BPM)

  const S = isV ? 0.72 : 1;
  const items = [
    { key: 'earbuds', pos: [-1.55 * S, 0.62 * S, 0.25], rot: [0.25, 0.5, 0.05], at: 0.28, scale: 1.0, word: 0 },
    { key: 'caseShell', pos: [-1.2 * S, -0.62 * S, -0.5], rot: [0.15, 2.6, 0.2], at: 0.38, scale: 1.0, word: 0 },
    { key: 'charger', pos: [1.5 * S, -0.58 * S, 0.3], rot: [0.3, -0.6, 0], at: 0.48, scale: 1.0, word: 0 },
    { key: 'headphones', pos: [1.55 * S, 0.6 * S, -0.35], rot: [0.1, -0.5, 0.1], at: 1.0, scale: 1.0, word: 1 },
    { key: 'internet', pos: isV ? [0.95, 1.75, -1.0] : [2.75, 0.05, -1.4], rot: [0.3, 0, 0.2], at: 1.5, scale: 1.0, word: 2 },
    { key: 'wifi', pos: [0, 1.22, 0.1], rot: [0, 0, 0], at: 1.5, scale: 1.0, word: 2 },
  ];

  return {
    update(f) {
      const { lt, fx, ui, post } = f;
      const { hero, studio, acc: A } = f.world;
      const crane = E.inExpo(seg(lt, 2.62, 3.0));

      if (f.owner) {
        const arrive = E.outCubic(seg(lt, 0, 0.45));
        const camX = lerp(4.2, 1.9, arrive) - lt * 0.75;
        const rho = isV ? 9.2 : 5.8;
        f.camera([camX, 0.4 + crane * 4.5, rho - crane * 1.5], [camX * 0.35, -0.05 - crane * 0.5, 0], 30, 0.04 * (1 - arrive));

        studio.update(f.t, { glow: 0.85, grid: 0.45 * (1 - crane), beams: 0.4, envRot: 2 + lt * 0.6, dust: 1, motes: 1, rim: 1 });
        studio.sweep.position.set(camX, 1.2, 2.2);
        studio.sweep.intensity = 6;

        hero.group.visible = true;
        hero.setExplode(0, lt);
        hero.setCracked(false);
        hero.group.position.set(0, Math.sin(lt * 1.5) * 0.03, 0);
        hero.group.rotation.set(0.05, -0.55 + lt * 0.42, 0.02);
        hero.group.scale.setScalar(1);

        A.group.visible = true;
        for (const it of items) {
          const o = A[it.key];
          const p = seg(lt, it.at, it.at + 0.5);
          o.visible = p > 0;
          if (!o.visible) continue;
          const e = E.outBack(p, 1.6);
          o.position.set(it.pos[0], it.pos[1] + Math.sin(lt * 1.2 + it.at * 9) * 0.04 - (1 - E.outExpo(p)) * 0.6, it.pos[2]);
          o.rotation.set(it.rot[0] + (1 - E.outExpo(p)) * 1.2, it.rot[1] + lt * 0.35 + (1 - E.outExpo(p)) * 3, it.rot[2]);
          o.scale.setScalar(Math.max(0.001, e * it.scale));
          if (it.key === 'wifi') o.lookAt(f.engine.camera.position);
        }
        A.holoMat.opacity = 0.85 * (0.75 + 0.25 * Math.sin(lt * 18));

        post.dof = { focus: f.dist(hero.group), aperture: 0.0014, maxblur: 0.0028 };
        post.blur = [0.075 * (1 - E.outCubic(seg(lt, 0, 0.3))), crane * 0.08];
        post.flash += 0.12 * (pulse(lt, 0.5, 0.01, 0.1) + pulse(lt, 1.0, 0.01, 0.1) + pulse(lt, 1.5, 0.01, 0.1));
        post.fade *= 1 - 0.6 * E.inCubic(seg(lt, 2.8, 3.0));

        // ---- trajectoires lumineuses + éclats d'apparition
        const pc = f.project(hero.group);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (const it of items) {
          if (it.key === 'wifi') continue;
          const o = A[it.key];
          if (!o.visible) continue;
          const po = f.project(o);
          // pas de trajectoire vers un objet hors cadre (évite les courbes dégénérées)
          if (po[0] < -0.05 * W || po[0] > 1.05 * W || po[1] < -0.05 * H || po[1] > 1.05 * H || !po[3]) continue;
          const p = E.outCubic(seg(lt, it.at + 0.05, it.at + 0.45));
          flowCurve(fx, pc, po, lt + it.at, p, f, { alpha: 1 - crane, bend: (it.pos[1] > 0 ? -1 : 1) * 0.2 });
          flare(fx, po[0], po[1], 0.4 * pulse(lt, it.at + 0.12, 0.03, 0.25) * cfg.vfx.flares, f, C.neon);
          // socle holographique sous le produit
          const ga = seg(lt, it.at, it.at + 0.3) * (1 - crane);
          fx.strokeStyle = rgba(C.neon, 0.45 * ga);
          fx.lineWidth = 2 * u;
          fx.beginPath();
          fx.ellipse(po[0], po[1] + 150 * u * (5.8 / po[2]), 150 * u * (5.8 / po[2]), 30 * u * (5.8 / po[2]), 0, 0, TAU);
          fx.stroke();
        }
        // ondes wifi émises par le smartphone (INTERNET)
        if (lt > 1.5) {
          const top = f.project(hero.inner, new THREE.Vector3(0, 0.8, 0));
          for (let k = 0; k < 3; k++) {
            const tt = ((lt - 1.5 + k * 0.33) % 1) ;
            shockRing(fx, top[0], top[1], tt, f, { radius: 380, width: 4, dur: 1, flat: 0.45, alpha: 0.5 * (1 - crane) });
          }
        }
        fx.restore();
      }

      // ---- ligne typographique cumulative
      const yL = isV ? H * 0.86 : H * 0.88;
      const out = E.inCubic(seg(lt, 2.5, 2.78));
      const eyeY = yL - lsize * 1.25;
      eyebrow(ui, T.stepGear, W / 2, eyeY, lt - 0.1, f, { align: 'center', alpha: 1 - out });
      const colorAt = (i) => {
        const w = wordOf(i);
        if (w < 0) return C.neon; // séparateurs •
        const cur = lt >= times[w] && (w === 2 || lt < times[w + 1]) && lt < 2.1;
        return cur ? C.neon : C.white;
      };
      const L = charLayout(ui, line, lsize, 700, -0.01);
      const x0 = W / 2 - L.width / 2;
      setFont(ui, lsize, 700, 0);
      ui.textBaseline = 'alphabetic';
      ui.save();
      ui.beginPath();
      ui.rect(0, yL - lsize * 1.05, W, lsize * 1.32);
      ui.clip();
      for (let i = 0; i < L.chars.length; i++) {
        const c = L.chars[i];
        if (c.ch === ' ') continue;
        let w = wordOf(i);
        if (w < 0) {
          // séparateur : apparaît avec le mot suivant
          w = starts.findIndex((s) => s > i);
        }
        const local = i - (starts[w] ?? 0);
        const p = E.outExpo(seg(lt, times[w] + Math.max(0, local) * 0.022, times[w] + Math.max(0, local) * 0.022 + 0.42));
        if (p <= 0.001) continue;
        const po = E.inCubic(Math.min(1, Math.max(0, out * 1.4 - (i / L.chars.length) * 0.4)));
        ui.globalAlpha = 1 - po;
        ui.fillStyle = colorAt(i);
        ui.fillText(c.ch, x0 + c.x, yL + (1 - p) * lsize * 1.05 - po * lsize);
      }
      ui.restore();
      ui.globalAlpha = 1;
      // glow des mots actifs
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      T.services.forEach((w, k) => {
        const a = win(lt, times[k], times[k] + 0.1, times[k] + 0.45, times[k] + 0.8) * 0.5 * (1 - out);
        if (a <= 0) return;
        const wx = x0 + L.chars[starts[k]].x + textWidth(ui, w, lsize, 700, -0.01) / 2;
        radialGlow(fx, wx, yL - lsize * 0.35, lsize * 2.2, C.neon, a * 0.5);
      });
      fx.restore();
      // sous-ligne
      const ss = lsize * 0.34;
      drawText(ui, T.gearSub, W / 2, yL + ss * 1.9, { size: ss, weight: 500, tracking: 0.22, align: 'center', t: lt - 0.7, mode: 'track', trackFrom: 0.5, dur: 0.6, color: C.muted, alpha: 1 - out });
      void drawSvgGroup;
    },
  };
}
