// 05 — LA MONTÉE (17.5 → 23.5 s) : les bougies se forment une à une (bleues / blanches) et
// montent vers le TP ; la caméra suit la tête du marché ; compteur de gain en direct ;
// 2.4 le SL remonte à 4002.27 (au-dessus de l'entrée : « STOP EN PROFIT ») ; 4.0 TP 4033.58 touché → « +635 € » (gain final indiqué par le client).
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { createCandles, tradeSeries, zoneBox, priceLine, gridFloor, px, py, ENTRY_I, ENTRY, TP, SL, LAST, BLUE, RED, GOLD } from '../world/chart.js';
import { sparks, radialGlow } from '../core/draw.js';
import { G, rich, eyebrow, priceTag, fmtP, fmtEur, veil, glassCard, setFont } from './_ui.js';

const T0 = 0.2, STEP = 0.068, N_END = 95, T_SL = 2.4, T_WIN = 4.0;
const PNL = 635.0;
export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.4, gain: 0.5 },
  { t: 0.2, type: 'data', dur: 3.4, gain: 0.3 },
  { t: 1.2, type: 'blip', gain: 0.35 },
  { t: T_SL, type: 'servo', gain: 0.6 },
  { t: T_SL + 0.45, type: 'snap', gain: 0.7 },
  { t: 3.6, type: 'riser', dur: 0.4, gain: 0.6 },
  { t: T_WIN, type: 'boom', gain: 1.0 },
  { t: T_WIN + 0.05, type: 'success', gain: 0.8 },
  { t: T_WIN + 0.3, type: 'shimmer', gain: 0.5 },
  { t: 5.6, type: 'suck', dur: 0.4, gain: 0.7 },
];

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const series = tradeSeries();
  const chart = createCandles(series, { width: 0.64, depth: 0.14 });
  group.add(chart.group);
  const X0 = px(ENTRY_I) - 0.05, X1 = px(97);
  const win = zoneBox(BLUE, 0.1), risk = zoneBox(RED, 0.15);
  const lE = priceLine(BLUE, X1 - X0), lT = priceLine(GOLD, X1 - X0, true), lS = priceLine(RED, X1 - X0, true);
  group.add(win.group, risk.group, lE.group, lT.group, lS.group);
  const grid = gridFloor(60, 0.4, GOLD, 0.08); grid.position.y = py(3966); group.add(grid);

  const headAt = (lt) => { const c = ENTRY_I + 1 + (lt - T0) / STEP; return clamp(c, ENTRY_I + 1, N_END); };
  // prix de tête lissé (caméra)
  const priceAt = (c) => { const i = clamp(Math.floor(c) - 1, 0, N_END - 1), fr = c - Math.floor(c); const d = series[i], n = series[Math.min(N_END - 1, i + 1)]; return lerp(d.c, n.c, fr); };
  const camera = (lt) => {
    const c = headAt(lt);
    let sm = 0; for (let k = 0; k < 6; k++) sm += priceAt(Math.max(ENTRY_I + 1, c - k * 1.5)); sm /= 6;
    const back = E.inOutCubic(seg(lt, 3.7, 4.6));
    const dive = E.inExpo(seg(lt, 5.55, 6));
    const tx = lerp(px(c) - 0.6, (X0 + X1) / 2 + (V ? 0 : -0.8), back);
    const ty = lerp(py(sm) + 0.2, py(4008), back) + (V ? -0.6 : 0) * back;
    const R = lerp(V ? 7.5 : 4.6, V ? 13 : 8.4, back) * (1 - 0.85 * dive);
    const a = lerp(-0.55, 0.25, seg(lt, 0, 3.7)) + back * -0.2;
    return { pos: [tx + Math.sin(a) * R, ty + lerp(0.5, V ? 1.4 : 0.8, back), Math.cos(a) * R], target: [tx, ty, 0], roll: 0.04 - 0.06 * seg(lt, 0, 3.7) + dive * -0.6, fov: V ? 48 : 36 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, world, t } = f;
      const S = L.safe;
      const c = headAt(lt);
      const cnt = Math.ceil(c), grow = c - Math.floor(c) || 1;
      chart.set(cnt, grow);
      const price = priceAt(c);
      win.place(X0, X1, ENTRY, TP, 0.45, 1);
      const slP = lerp(3976.2, SL, E.inOutCubic(seg(lt, T_SL, T_SL + 0.45)));
      risk.place(X0, X1, ENTRY, Math.min(slP, ENTRY - 0.01), 0.45, slP < ENTRY ? 1 : 0);
      lE.set(X0, ENTRY, 0.9, 0.24); lT.set(X0, TP, 1, 0.24); lS.set(X0, slP, seg(lt, T_SL - 0.1, T_SL + 0.1), 0.24);
      world.studio.update(t, { backdrop: true, glow: 0.12 + 0.12 * seg(lt, T_WIN, T_WIN + 0.5), grid: 0, beams: 0.35, dust: 0.6, motes: 0.8, env: 1.2, envRot: 0.5 + lt * 0.1, rim: 1.3, key: 1.15 });
      post.bloom = 0.75 + 0.15 * seg(lt, T_WIN, T_WIN + 0.3); post.vignette = 1.1;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.4 * (1 - E.outCubic(seg(lt, 0, 0.3)));
      post.flash += 0.7 * (lt >= T_WIN ? Math.exp(-(lt - T_WIN) / 0.07) : 0);
      post.flash += 1.1 * E.inCubic(seg(lt, 5.7, 6));

      // ---- étiquettes de prix (bord droit)
      const P = (x, p) => f.project([x, py(p), 0.24]);
      const ts = 24 * u * (V ? 1.25 : 1);
      const lab = 1 - seg(lt, 3.8, 4.1);
      let [x, y] = P(px(cnt) + 0.15, price);
      priceTag(ui, x + 6 * u, y, fmtP(price), G.blue, ts, lab * seg(lt, 0.1, 0.3));
      [x, y] = P(X1, TP); priceTag(ui, x + 10 * u, y, 'TP 4033.58', G.gold, ts, lab);
      [x, y] = P(X1, slP); priceTag(ui, x + 10 * u, y, 'SL ' + fmtP(slP), G.red, ts, lab * seg(lt, T_SL, T_SL + 0.15));

      // ---- compteur de gain en direct
      const pnl = Math.max(0, PNL * (price - ENTRY) / (LAST - ENTRY));
      const kc = seg(lt, 0.25, 0.6) * (1 - E.inCubic(seg(lt, 3.8, 4.0)));
      const cs = (V ? 108 : 84) * u;
      const cx = V ? W / 2 : S.l, cy = V ? S.t + 170 * u : H * 0.22;
      if (kc > 0) {
        veil(ui, cx - (V ? 380 : 40) * u, cy - cs * 1.3, 760 * u, cs * 2.6, 0.6 * kc);
        ui.save(); ui.globalAlpha = kc;
        eyebrow(ui, 'GAIN EN COURS · BUY 0.15', cx, cy - cs * 0.95, 26 * u, kc, V ? 'center' : 'left');
        rich(ui, [[fmtEur(pnl), 'b']], cx, cy + cs * 0.15, { size: cs, align: V ? 'center' : 'left', weight: 800, glow: 0.8 });
        ui.restore();
      }
      // ---- SL sécurisé
      const ks = seg(lt, T_SL + 0.45, T_SL + 0.8) * (1 - E.inCubic(seg(lt, 3.8, 4.0)));
      if (ks > 0) {
        const bw = (V ? 640 : 520) * u, bh = (V ? 92 : 78) * u;
        const bx = V ? W / 2 - bw / 2 : S.l, by = V ? cy + cs * 0.75 : cy + cs * 0.75;
        glassCard(ui, bx, by, bw, bh, { a: ks, r: bh / 2, border: 'rgba(242,193,78,0.9)' });
        ui.save(); ui.globalAlpha = ks;
        setFont(ui, bh * 0.36, 800, 0.1); ui.fillStyle = G.gold; ui.textAlign = 'center'; ui.textBaseline = 'middle';
        ui.fillText('SL 4002.27 · STOP EN PROFIT', bx + bw / 2, by + bh / 2 + 2 * u);
        ui.restore();
      }
      // ---- résultat final
      const kw = E.outExpo(seg(lt, T_WIN, T_WIN + 0.5)) * (1 - E.inCubic(seg(lt, 5.55, 5.8)));
      if (kw > 0) {
        const ws = (V ? 210 : 190) * u;
        const wy = V ? H * 0.43 : H * 0.5;
        veil(ui, W / 2 - 700 * u, wy - ws * 1.1, 1400 * u, ws * 2.2, 0.75 * kw);
        radialGlow(fx, W / 2, wy - ws * 0.35, 700 * u, G.gold, 0.25 * kw);
        sparks(fx, W / 2, wy - ws * 0.35, lt - T_WIN, f, { count: 90, life: 1.2 });
        ui.save(); ui.globalAlpha = kw;
        ui.translate(W / 2, wy); ui.scale(lerp(1.6, 1, kw), lerp(1.6, 1, kw)); ui.translate(-W / 2, -wy);
        rich(ui, [['+635 €', 'g']], W / 2, wy, { size: ws, weight: 900, glow: 1.4, maxW: S.w });
        rich(ui, [['TP ATTEINT · ', 'g'], ['XAUUSD', 'w']], W / 2, wy + ws * 0.62, { size: ws * 0.2, k: seg(lt, T_WIN + 0.3, T_WIN + 0.7), weight: 700, tracking: 0.2 });
        ui.restore();
      }
    },
  };
}
