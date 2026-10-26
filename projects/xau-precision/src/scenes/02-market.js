// 02 — MARCHÉ (3.5 → 8.5 s) : sortie du flash or ; survol rasant d'un paysage de bougies 3D
// (bleues / blanches, 6 rangées en profondeur), courbe de prix dorée, traits de vitesse.
// 0.3 « L'OR BOUGE VITE. » · 2.5 « MOI, JE LE TRADE AVEC PRÉCISION. » · 4.55 plongée → analyse.
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { createCandles, randomSeries, gridFloor, px, py, DX, GOLD } from '../world/chart.js';
import { rich, veil, goldStreaks } from './_ui.js';

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.5, gain: 0.7 },
  { t: 0.2, type: 'hit', gain: 0.7 },
  { t: 0.6, type: 'swish', gain: 0.5 },
  { t: 1.8, type: 'whip', gain: 0.8 },
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
    const x = lerp(4, 12.5, lt / 2.2) + 0.6 * E.inOutSine(seg(lt, 0, 2.2));
    const alt = altAt(x + 1.5);
    const dive = E.inExpo(seg(lt, 1.8, 2.2));
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
      post.flash += 0.7 * E.inCubic(seg(lt, 1.95, 2.2));
      post.dof = { focus: 2.8, aperture: 0.02, maxblur: 0.006 };
      goldStreaks(fx, W, H, t, 0.45 + 0.5 * seg(lt, 1.5, 2.2), 3, 1);

      // ---- texte : promesse de la suite (on reste pour voir les 3 étapes)
      const s = (V ? 110 : 96) * u;
      const out = E.inCubic(seg(lt, 1.7, 1.9));
      const y0 = V ? S.t + 200 * u : H * 0.3;
      veil(ui, W / 2 - 520 * u, y0 - s * 1.2, 1040 * u, s * 2.6, 0.6 * (1 - out));
      ui.save(); ui.globalAlpha = 1 - out; ui.translate(W / 2, y0); ui.scale(1 + out * 0.3, 1 + out * 0.3); ui.translate(-W / 2, -y0);
      rich(ui, [['VOICI LE TRADE', 'w']], W / 2, y0, { size: s * 0.7, k: seg(lt, 0.15, 0.45), maxW: S.w, weight: 800 });
      rich(ui, [['ÉTAPE PAR ÉTAPE ↓', 'g']], W / 2, y0 + s * 0.95, { size: s * 0.82, k: seg(lt, 0.35, 0.7), glow: 1.2, maxW: S.w, weight: 900 });
      ui.restore();
    },
  };
}
