// 06 — PREUVE (23.5 → 28 s) : sortie du flash ; deux téléphones 3D (or / noir) affichent les VRAIES
// captures du client (MT5 : BUY 0.15 +359.20 EUR ; TradingView : positions 3990.77 → 4015.85).
// La caméra tourne puis s'approche de la ligne +359.20 EUR (cadre or qui pulse).
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { G, rich, eyebrow, veil } from './_ui.js';

export const cues = [
  { t: 0.0, type: 'impact', gain: 0.8 },
  { t: 0.35, type: 'whoosh', dur: 0.6, gain: 0.5 },
  { t: 0.7, type: 'hit', gain: 0.6 },
  { t: 1.0, type: 'swish', gain: 0.5 },
  { t: 2.0, type: 'scan', gain: 0.5 },
  { t: 2.45, type: 'pop', gain: 0.7 },
  { t: 4.1, type: 'whip', gain: 0.8 },
];

const tex = (img) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };

export default function create(ctx) {
  const { V, W, H, world } = ctx;
  const group = new THREE.Group();
  const tMt5 = tex(world.images.mt5), tTv = tex(world.images.tvPos);
  // point de la ligne « BUY 0.15 +359.20 EUR » sur l'écran MT5 (fraction de l'image)
  const HL = { u0: 0.0, u1: 0.4, v: 0.737 };
  const SW = 0.7, SH = 1.5; // taille approx. de la dalle (unités monde)
  const L0 = V ? [-0.42, 0.3, 0] : [-0.5, 0, 0], R0 = V ? [0.46, -0.25, -0.5] : [0.55, 0, -0.35];
  const sc = V ? 1.3 : 1.05;

  const camera = (lt) => {
    const a = lerp(0.5, -0.1, E.inOutSine(seg(lt, 0, 2.0)));
    const push = E.inOutCubic(seg(lt, 1.9, 3.0));
    const out = E.inExpo(seg(lt, 3.9, 4.5));
    const R = lerp(lerp(V ? 5.6 : 3.9, V ? 3.0 : 2.2, push), V ? 9 : 6, out);
    const tx = lerp(V ? 0 : 0.35, L0[0] - 0.05, push), ty = lerp(0, L0[1] - 0.33, push);
    return { pos: [tx + Math.sin(a + out * 1.2) * R, ty + 0.25, Math.cos(a + out * 1.2) * R], target: [tx, ty, 0], roll: lerp(-0.05, 0.03, push) + out * 0.5, fov: V ? 40 : 32 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, t } = f;
      const S = L.safe;
      const [pL, pR] = f.world.phones;
      const k = E.outExpo(seg(lt, 0.1, 0.9));
      for (const [p, P0, rot, tx, d] of [[pL, L0, 0.28, tMt5, 0], [pR, R0, -0.32, tTv, 0.12]]) {
        p.group.visible = true;
        const kk = E.outExpo(seg(lt, 0.1 + d, 0.9 + d));
        p.group.position.set(P0[0], P0[1] - (1 - kk) * 3 + 0.03 * Math.sin(lt * 1.4 + d * 9), P0[2]);
        p.group.rotation.set(0.06, rot + (1 - kk) * 1.6 + 0.06 * Math.sin(lt * 0.7 + d), 0.03);
        p.group.scale.setScalar(sc);
        p.phone.setScreenMap(tx, 1.05);
      }
      f.world.studio.update(t, { backdrop: true, glow: 0.18, grid: 0.25, beams: 0.5, dust: 0.6, motes: 0.6, env: 1.3, envRot: 0.3 + lt * 0.15, rim: 1.4, key: 1.15 });
      f.world.studio.sweep.intensity = 3 * Math.exp(-Math.pow((lt - 1.2) * 2.2, 2));
      f.world.studio.sweep.position.set(lerp(-2, 2, seg(lt, 0.6, 1.8)), 0.9, 1.3);
      post.bloom = 0.65; post.vignette = 1.05;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.9 * (1 - E.outCubic(seg(lt, 0, 0.4)));
      post.flash += 0.6 * E.inCubic(seg(lt, 4.25, 4.5));

      // ---- cadre or autour de « +359.20 EUR » (projeté sur l'écran du téléphone or)
      const kh = seg(lt, 2.35, 2.7) * (1 - seg(lt, 3.9, 4.1));
      if (kh > 0) {
        pL.group.updateMatrixWorld(true);
        const v = new THREE.Vector3();
        const pt = (uu, vv) => { v.set((uu - 0.5) * SW, (0.5 - vv) * SH, 0.05).applyMatrix4(pL.group.matrixWorld); return f.project([v.x, v.y, v.z]); };
        const a = pt(HL.u0, HL.v - 0.022), b = pt(HL.u1, HL.v + 0.022);
        const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
        const pulse = 1 + 0.05 * Math.sin(lt * 12);
        fx.save(); fx.globalAlpha = kh; fx.strokeStyle = G.gold; fx.lineWidth = 4 * u; fx.shadowColor = G.gold; fx.shadowBlur = 25 * u;
        fx.beginPath(); fx.roundRect(x - 10 * u * pulse, y - 8 * u * pulse, w * 1.02 + 20 * u * pulse, h + 16 * u * pulse, 10 * u); fx.stroke(); fx.restore();
        rich(ui, [['+359.20 EUR', 'g']], x + w / 2, y - 28 * u, { size: 46 * u, k: kh, weight: 800, glow: 1 });
      }

      // ---- texte
      const out = E.inCubic(seg(lt, 3.85, 4.1));
      const s = (V ? 96 : 84) * u;
      const tx0 = V ? W / 2 : S.l, ty0 = V ? S.t + 120 * u : H * 0.34;
      const fadeForPush = V ? 1 - seg(lt, 1.9, 2.3) : 1;
      ui.save(); ui.globalAlpha = (1 - out) * fadeForPush;
      veil(ui, tx0 - (V ? 420 : 60) * u, ty0 - s * 1.5, 840 * u, s * 3.6, 0.6);
      eyebrow(ui, 'CAPTURES RÉELLES', tx0, ty0 - s * 1.0, 28 * u, seg(lt, 0.5, 1.0), V ? 'center' : 'left');
      rich(ui, [['TRADE ', 'w'], ['RÉEL.', 'g']], tx0, ty0 + s * 0.2, { size: s, k: seg(lt, 0.7, 1.1), align: V ? 'center' : 'left', glow: 0.8 });
      rich(ui, [['RÉSULTAT ', 'w'], ['RÉEL.', 'g']], tx0, ty0 + s * 1.35, { size: s, k: seg(lt, 1.0, 1.4), align: V ? 'center' : 'left', glow: 0.8 });
      ui.restore();
      void clamp; void fx;
    },
  };
}
