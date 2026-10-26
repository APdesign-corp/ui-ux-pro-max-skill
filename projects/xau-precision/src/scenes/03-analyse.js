// 03 — ANALYSE (8.5 → 13.5 s) : le VRAI graphique du trade en 3D (forme relevée sur les captures).
// 0.0–1.2 les bougies se tracent de gauche à droite ; 1.3 zone « WK » ; 2.2 liquidité « $$$ » ;
// 3.0 « trap » ; liste cochée lisible ; 4.4 la caméra glisse vers le point d'entrée.
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { createCandles, tradeSeries, zoneBox, priceLine, gridFloor, px, py, ENTRY_I, GOLD } from '../world/chart.js';
import { G, rich, eyebrow, anchorLabel, veil, setFont } from './_ui.js';

const T_WK = 1.3, T_LIQ = 2.2, T_TRAP = 3.0, T_WAIT = 3.8;
export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.5, gain: 0.6 },
  { t: 0.1, type: 'ticks', dur: 1.1, gain: 0.35 },
  { t: T_WK, type: 'scan', gain: 0.55 },
  { t: T_LIQ, type: 'zips', gain: 0.45 },
  { t: T_TRAP, type: 'servo', gain: 0.55 },
  { t: T_WAIT, type: 'pulse2', gain: 0.45 },
  { t: 4.55, type: 'swish', gain: 0.6 },
];

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const series = tradeSeries();
  const chart = createCandles(series, { width: 0.64, depth: 0.14 });
  group.add(chart.group);
  const wk = zoneBox('#9a9aa2', 0.16), trap = zoneBox('#9a9aa2', 0.2);
  const liq = priceLine('#ffffff', px(40) - px(11), true);
  group.add(wk.group, trap.group, liq.group);
  const grid = gridFloor(60, 0.4, GOLD, 0.08); grid.position.y = py(3966); group.add(grid);

  const cx0 = px(14), cx1 = px(33);
  const camera = (lt) => {
    const k = E.inOutSine(seg(lt, 0, 4.4));
    const push = E.inOutCubic(seg(lt, 4.4, 5));
    const tx = lerp(lerp(cx0, cx1, k), px(ENTRY_I), push), ty = lerp(lerp(py(4002), py(3994), k), py(3990.8), push);
    const R = lerp(V ? 10.5 : 6.6, V ? 4.2 : 2.8, push);
    const a = lerp(0.85, -0.2, k) + push * 0.45 + 0.06 * Math.sin(lt * 1.1);
    // décalage : le graphique à droite (16:9) / en bas (9:16), le texte a sa place
    const ox = (V ? 0 : -2.3) * (1 - push), oy = (V ? 1.5 : 0) * (1 - push);
    return { pos: [tx + ox + Math.sin(a) * R, ty + oy + lerp(0.9, 0.35, push), Math.cos(a) * R], target: [tx + ox, ty + oy, 0], roll: lerp(-0.035, 0.02, k), fov: V ? 46 : 34 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, world, t } = f;
      const S = L.safe;
      const draw = clamp(lt / 1.2) * ENTRY_I;
      chart.set(Math.max(1, Math.ceil(draw)), draw - Math.floor(draw) || 1);
      wk.place(px(12.5), px(33.5), 3989.4, 4002.4, 0.5, E.outExpo(seg(lt, T_WK, T_WK + 0.5)));
      liq.set(px(11), 3988.6, seg(lt, T_LIQ, T_LIQ + 0.3));
      liq.group.scale.x = E.outExpo(seg(lt, T_LIQ, T_LIQ + 0.6));
      trap.place(px(31), px(41), 3982.2, 3972.5, 0.5, E.outExpo(seg(lt, T_TRAP, T_TRAP + 0.5)));
      world.studio.update(t, { backdrop: true, glow: 0.1, grid: 0, beams: 0.25, dust: 0.5, motes: 0.6, env: 1.2, envRot: 0.4, rim: 1.2, key: 1.15 });
      post.bloom = 0.7; post.vignette = 1.1;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.6 * (1 - E.outCubic(seg(lt, 0, 0.35)));

      // ---- libellés ancrés (comme sur le graphique du client)
      const P = (i, p) => f.project([px(i), py(p), 0.25]);
      const lsz = (V ? 34 : 28) * u;
      let [x, y] = P(23, 4002.4); anchorLabel(ui, x, y, 'WK', { a: seg(lt, T_WK + 0.2, T_WK + 0.5), size: lsz, side: -1, len: 50 * u });
      [x, y] = P(25, 3988.6); anchorLabel(ui, x, y, '$$$', { a: seg(lt, T_LIQ + 0.2, T_LIQ + 0.5), size: lsz, color: G.red, text: '#ff6b6b', len: 50 * u, side: 1 });
      [x, y] = P(36, 3972.5); anchorLabel(ui, x, y, 'trap', { a: seg(lt, T_TRAP + 0.2, T_TRAP + 0.5), size: lsz, len: 50 * u, side: 1 });

      // ---- bloc texte : liste cochée (reste à l'écran → le temps de lire)
      const fade = 1 - E.inCubic(seg(lt, 4.4, 4.7));
      const sz = (V ? 66 : 48) * u;
      const bx = V ? S.l + 20 * u : S.l, by = V ? S.t + 70 * u : H * 0.2;
      veil(ui, bx - 40 * u, by - 60 * u, (V ? S.w : 760 * u), sz * 6.5, 0.7 * fade);
      ui.save(); ui.globalAlpha = fade;
      eyebrow(ui, "ÉTAPE 1/3 · L'ANALYSE", bx, by, 30 * u, seg(lt, 0.3, 0.8), 'left');
      const items = [[T_WK, 'Zone repérée', 'WK'], [T_LIQ, 'Liquidité visée', '$$$'], [T_TRAP, 'Piège identifié', 'trap']];
      items.forEach(([a, txt, tag], i) => {
        const yy = by + sz * (1.5 + i * 1.3);
        const k = seg(lt, a, a + 0.45);
        if (k <= 0) return;
        drawCheck(ui, bx + sz * 0.4, yy - sz * 0.35, sz * 0.42, k);
        rich(ui, [[txt + ' ', 'w'], [tag, i === 1 ? 'r' : 'm']], bx + sz * 1.1, yy, { size: sz, k, align: 'left', weight: 700 });
      });
      rich(ui, [["J'ATTENDS ", 'l'], ['MON ENTRÉE.', 'g']], bx, by + sz * 5.6, { size: sz * 0.9, k: seg(lt, T_WAIT, T_WAIT + 0.45), align: 'left', glow: 0.8, maxW: V ? S.w * 0.95 : 900 * u });
      ui.restore();
      void fx; void setFont;
    },
  };
}

function drawCheck(g, x, y, r, k) {
  g.save();
  g.globalAlpha *= clamp(k * 2);
  g.strokeStyle = G.gold; g.lineWidth = r * 0.16;
  g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * E.outCubic(k)); g.stroke();
  const c = clamp((k - 0.3) / 0.5);
  if (c > 0) {
    g.lineWidth = r * 0.2; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - r * 0.42, y + r * 0.02);
    const m = Math.min(1, c * 2);
    g.lineTo(x - r * 0.42 + r * 0.3 * m, y + r * 0.02 + r * 0.3 * m);
    if (c > 0.5) { const n = (c - 0.5) * 2; g.lineTo(x - r * 0.12 + r * 0.55 * n, y + r * 0.32 - r * 0.62 * n); }
    g.stroke();
  }
  g.restore();
}
