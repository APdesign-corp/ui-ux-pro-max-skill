// 02 — MARCHÉ (3.5 → 8.5 s) : sortie du flash or ; survol rasant d'un paysage de bougies 3D
// (bleues / blanches, 6 rangées en profondeur), courbe de prix dorée, traits de vitesse.
// 0.3 « L'OR BOUGE VITE. » · 2.5 « MOI, JE LE TRADE AVEC PRÉCISION. » · 4.55 plongée → analyse.
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { createCandles, randomSeries, gridFloor, px, py, DX, GOLD } from '../world/chart.js';
import { rich, veil, goldStreaks } from './_ui.js';

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.6, gain: 0.7 },
  { t: 0.3, type: 'hit', gain: 0.7 },
  { t: 0.42, type: 'data', dur: 1.4, gain: 0.35 },
  { t: 2.5, type: 'swish', gain: 0.6 },
  { t: 2.75, type: 'snap', gain: 0.7 },
  { t: 3.3, type: 'pulse', dur: 1.0, gain: 0.4 },
  { t: 4.55, type: 'whip', gain: 0.8 },
];

const ROWS = 6, N = 150;

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const s = randomSeries(N, 11 + r * 17, 4000 + (r % 2 ? 6 : -4), 4.2);
    const c = createCandles(s, { width: 0.6, depth: 0.12, z: -r * 1.25 });
    c.group.position.x = -r * 0.37;
    group.add(c.group);
    rows.push(c);
  }
  // courbe de prix dorée sur la 1re rangée
  const s0 = rows[0].series;
  const pts = s0.map((d, i) => new THREE.Vector3(px(i), py(d.c) + 0.02, 0.09));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, N * 4, 0.012, 6, false), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  group.add(tube);
  const grid = gridFloor(80, 0.5, GOLD, 0.1);
  grid.position.y = -2.4;
  group.add(grid);
  // altitude lissée du marché sous la caméra
  const smooth = s0.map((_, i) => { let a = 0, n = 0; for (let k = -10; k <= 10; k++) { const d = s0[clamp(i + k, 0, N - 1)]; a += py(d.c); n++; } return a / n; });
  const altAt = (x) => { const f = clamp(x / DX, 0, N - 1.001), i = Math.floor(f); return lerp(smooth[i], smooth[i + 1], f - i); };

  const camera = (lt) => {
    const x = lerp(4, 18.5, lt / 5) + 0.6 * E.inOutSine(seg(lt, 0, 5));
    const alt = altAt(x + 1.5);
    const dive = E.inExpo(seg(lt, 4.55, 5));
    const y = alt + lerp(0.75, 0.15, dive) + 0.08 * Math.sin(lt * 1.3);
    const z = lerp(2.3, 0.9, dive) + 0.2 * Math.sin(lt * 0.5);
    return { pos: [x, y, z], target: [x + lerp(2.6, 1.2, dive), alt + lerp(0.1, -0.3, dive), lerp(-1.6, 0, dive)], roll: -0.12 + 0.05 * Math.sin(lt * 0.9) + dive * 0.6, fov: V ? 58 : 44 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, world, t } = f;
      const S = L.safe;
      // vague d'apparition : les bougies poussent en avant de la caméra
      const cx = camera(lt).pos[0];
      for (let r = 0; r < ROWS; r++) rows[r].set(N, 1, { wave: (i) => clamp((cx + 9 - px(i) + r * 0.37) / 2.5) });
      world.studio.update(t, { backdrop: true, glow: 0.12, grid: 0, beams: 0.2, dust: 0.6, motes: 0.9, env: 1.2, envRot: lt * 0.2, rim: 1.2, key: 1.1 });
      post.bloom = 0.8; post.vignette = 1.15;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 1.0 * (1 - E.outCubic(seg(lt, 0, 0.45)));
      post.flash += 0.7 * E.inCubic(seg(lt, 4.75, 5));
      post.dof = { focus: 2.8, aperture: 0.02, maxblur: 0.006 };
      goldStreaks(fx, W, H, t, 0.35 + 0.5 * seg(lt, 4.3, 5), 3, 1);

      // ---- textes
      const s = (V ? 128 : 112) * u;
      const out1 = E.inCubic(seg(lt, 2.25, 2.45)), out2 = E.inCubic(seg(lt, 4.45, 4.65));
      const y0 = V ? S.t + 200 * u : H * 0.3;
      if (lt < 2.5) {
        veil(ui, W / 2 - 500 * u, y0 - s * 1.2, 1000 * u, s * 2.6, 0.55 * (1 - out1));
        ui.save(); ui.globalAlpha = 1 - out1; ui.translate(-out1 * 120 * u, 0);
        if (V) {
          rich(ui, [["L'OR", 'g']], W / 2, y0, { size: s * 1.3, k: seg(lt, 0.3, 0.75), glow: 1 });
          rich(ui, [['BOUGE VITE.', 'w']], W / 2, y0 + s * 1.2, { size: s, k: seg(lt, 0.55, 1.0), maxW: S.w });
        } else {
          rich(ui, [["L'OR ", 'g'], ['BOUGE VITE.', 'w']], W / 2, y0, { size: s, k: seg(lt, 0.3, 0.8), glow: 1 });
        }
        ui.restore();
      }
      if (lt >= 2.5) {
        veil(ui, W / 2 - 550 * u, y0 - s * 1.2, 1100 * u, s * 2.8, 0.55 * (1 - out2));
        ui.save(); ui.globalAlpha = 1 - out2; ui.translate(W / 2, y0); ui.scale(1 + out2 * 0.3, 1 + out2 * 0.3); ui.translate(-W / 2, -y0);
        rich(ui, [['MOI, JE LE TRADE ', 'l'], ['AVEC', 'w']], W / 2, y0, { size: s * (V ? 0.62 : 0.6), k: seg(lt, 2.5, 2.9), maxW: S.w, weight: 700 });
        rich(ui, [['PRÉCISION.', 'g']], W / 2, y0 + s * (V ? 1.15 : 1.05), { size: s * (V ? 1.12 : 1.1), k: seg(lt, 2.75, 3.2), glow: 1.2, maxW: S.w });
        ui.restore();
      }
    },
  };
}
