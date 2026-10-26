// 04 — ENTRÉE (13.5 → 17.5 s) : la caméra recule depuis la bougie d'entrée ; la position
// acheteuse se déploie en 3D (bleu = objectif, rouge = risque, comme l'outil du client), lignes
// Entrée 3990.77 / TP 4033.58 ; ticket d'ordre BUY XAUUSD 0.15 (toucher + onde) ; « J'ENTRE. »
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { createCandles, tradeSeries, zoneBox, priceLine, gridFloor, px, py, ENTRY_I, ENTRY, TP, BLUE, RED, GOLD } from '../world/chart.js';
import { touchRipple } from '../core/type.js';
import { G, rich, glassCard, priceTag, setFont, veil } from './_ui.js';

const T_BOX = 0.25, T_CARD = 0.95, T_TAP = 1.55, T_HEAD = 0.55;
export const cues = [
  { t: 0.0, type: 'sub', dur: 0.4, gain: 0.5 },
  { t: T_BOX, type: 'servo', gain: 0.6 },
  { t: T_HEAD, type: 'slam', gain: 0.9 },
  { t: T_CARD, type: 'glass', gain: 0.3 },
  { t: T_CARD + 0.02, type: 'swish', gain: 0.5 },
  { t: T_TAP, type: 'click', gain: 0.9 },
  { t: T_TAP + 0.05, type: 'success', gain: 0.55 },
  { t: 3.55, type: 'riser', dur: 0.45, gain: 0.6 },
];

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const series = tradeSeries();
  const chart = createCandles(series, { width: 0.64, depth: 0.14 });
  group.add(chart.group);
  const win = zoneBox(BLUE, 0.11), risk = zoneBox(RED, 0.15);
  const lE = priceLine(BLUE, px(80) - px(ENTRY_I)), lT = priceLine(GOLD, px(80) - px(ENTRY_I), true);
  group.add(win.group, risk.group, lE.group, lT.group);
  const grid = gridFloor(60, 0.4, GOLD, 0.08); grid.position.y = py(3966); group.add(grid);
  const X0 = px(ENTRY_I) - 0.05, X1 = px(93);

  const camera = (lt) => {
    const k = E.inOutCubic(seg(lt, 0, 2.6));
    const up = E.inExpo(seg(lt, 3.55, 4));
    const tx = lerp(px(ENTRY_I), (X0 + X1) / 2 - (V ? 0.4 : 1.2), k);
    const ty = lerp(py(ENTRY), py(4006), k) + up * 1.6;
    const R = lerp(V ? 4.2 : 2.8, V ? 12.5 : 7.8, k);
    const a = lerp(0.45, -0.32, k);
    return { pos: [tx + Math.sin(a) * R, ty + lerp(0.35, V ? -0.6 : 0.4, k), Math.cos(a) * R], target: [tx, ty + (V ? -1.0 : 0) * k, 0], roll: lerp(0.02, 0.04, k) - up * 0.2, fov: V ? 46 : 34 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, world, t } = f;
      const S = L.safe;
      chart.set(ENTRY_I + 1, 1);
      const kb = E.outExpo(seg(lt, T_BOX, T_BOX + 0.7));
      win.place(X0, X1, ENTRY, TP, 0.45, kb);
      risk.place(X0, X1, ENTRY, 3976.2, 0.45, E.outExpo(seg(lt, T_BOX + 0.15, T_BOX + 0.8)));
      lE.set(X0, ENTRY, seg(lt, T_BOX, T_BOX + 0.3), 0.24); lE.group.scale.x = kb;
      lT.set(X0, TP, seg(lt, T_BOX + 0.4, T_BOX + 0.7), 0.24); lT.group.scale.x = kb;
      world.studio.update(t, { backdrop: true, glow: 0.1, grid: 0, beams: 0.3, dust: 0.5, motes: 0.6, env: 1.2, envRot: 0.5, rim: 1.2, key: 1.15 });
      post.bloom = 0.75; post.vignette = 1.1;
      post.flashColor = [0.55, 0.78, 1];
      post.flash += 0.35 * Math.exp(-Math.max(0, lt - T_TAP) / 0.08) * (lt >= T_TAP ? 1 : 0);
      post.flash += 0.6 * E.inCubic(seg(lt, 3.8, 4));

      // étiquettes de prix (bord droit des lignes)
      const P = (x, p) => f.project([x, py(p), 0.24]);
      let [x, y] = P(X1, ENTRY); priceTag(ui, x + 10 * u, y, '3990.77', G.blue, 24 * u * (V ? 1.25 : 1), seg(lt, T_BOX + 0.3, T_BOX + 0.6));
      [x, y] = P(X1, TP); priceTag(ui, x + 10 * u, y, 'TP 4033.58', G.gold, 24 * u * (V ? 1.25 : 1), seg(lt, T_BOX + 0.6, T_BOX + 0.9));
      // point d'entrée pulsant
      const [ex, ey] = P(px(ENTRY_I), ENTRY);
      if (lt > T_BOX) touchRipple(fx, ex, ey, (lt - T_BOX) % 1.0, 1.4 * u, '#9fd0ff');

      // ---- titre
      const s = (V ? 150 : 130) * u;
      const hy = V ? S.t + 150 * u : H * 0.2;
      const out = E.inCubic(seg(lt, 3.5, 3.75));
      ui.save(); ui.globalAlpha = 1 - out;
      veil(ui, (V ? W / 2 : S.r - 420 * u) - 300 * u, hy - s, 600 * u, s * 1.4, 0.5);
      rich(ui, [["J'ENTRE", 'w'], ['.', 'g']], V ? W / 2 : S.r, hy, { size: s, k: seg(lt, T_HEAD, T_HEAD + 0.3), align: V ? 'center' : 'right', weight: 900 });
      // ---- ticket d'ordre
      const cw = (V ? 760 : 560) * u, ch = (V ? 430 : 330) * u;
      const cxx = V ? W / 2 - cw / 2 : S.r - cw, cyy = V ? S.b - ch - 30 * u : H * 0.34;
      const kc = E.outBack(seg(lt, T_CARD, T_CARD + 0.4), 1.4);
      if (kc > 0) {
        ui.save();
        ui.translate(cxx + cw / 2, cyy + ch / 2); ui.scale(lerp(0.7, 1, kc), lerp(0.7, 1, kc)); ui.rotate((1 - kc) * -0.12); ui.translate(-(cxx + cw / 2), -(cyy + ch / 2));
        glassCard(ui, cxx, cyy, cw, ch, { a: clamp(kc * 2), sheen: seg(lt, T_CARD + 0.3, T_CARD + 1.3) });
        const p = cw * 0.08, ls = ch * 0.105;
        setFont(ui, ls * 0.8, 600, 0.3); ui.fillStyle = G.muted; ui.textAlign = 'left'; ui.textBaseline = 'alphabetic';
        ui.fillText('ORDRE', cxx + p, cyy + ch * 0.18);
        setFont(ui, ls * 1.5, 800, 0); ui.fillStyle = G.white; ui.fillText('XAUUSD', cxx + p, cyy + ch * 0.36);
        // bouton BUY
        const bw = cw * 0.34, bh = ls * 1.9, bxx = cxx + cw - p - bw, byy = cyy + ch * 0.2;
        const press = 1 - 0.07 * Math.exp(-Math.pow((lt - T_TAP) * 9, 2));
        ui.save(); ui.translate(bxx + bw / 2, byy + bh / 2); ui.scale(press, press);
        ui.fillStyle = G.blue; ui.shadowColor = 'rgba(47,155,255,0.8)'; ui.shadowBlur = 30 * u * seg(lt, T_TAP, T_TAP + 0.2);
        ui.beginPath(); ui.roundRect(-bw / 2, -bh / 2, bw, bh, bh * 0.25); ui.fill(); ui.shadowBlur = 0;
        setFont(ui, ls * 1.05, 800, 0.1); ui.fillStyle = '#fff'; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.fillText('BUY', 0, 2 * u);
        touchRipple(ui, 0, 0, lt - T_TAP, 1.2 * u, '#ffffff');
        ui.restore();
        const rows = [['Lot', '0.15', G.white], ['Entrée', '3990.77', G.blue], ['TP', '4033.58', G.gold]];
        rows.forEach(([a, b, c], i) => {
          const yy = cyy + ch * (0.56 + i * 0.15);
          const kr = seg(lt, T_CARD + 0.25 + i * 0.12, T_CARD + 0.5 + i * 0.12);
          ui.globalAlpha = clamp(kc * 2) * kr;
          setFont(ui, ls, 500, 0.04); ui.fillStyle = G.muted; ui.textAlign = 'left'; ui.textBaseline = 'alphabetic'; ui.fillText(a, cxx + p, yy);
          setFont(ui, ls * 1.15, 800, 0.02); ui.fillStyle = c; ui.textAlign = 'right'; ui.fillText(b, cxx + cw - p, yy);
          ui.fillStyle = 'rgba(255,255,255,0.08)'; ui.fillRect(cxx + p, yy + ls * 0.45, cw - 2 * p, 1.5 * u);
        });
        ui.restore();
      }
      ui.restore();
    },
  };
}
