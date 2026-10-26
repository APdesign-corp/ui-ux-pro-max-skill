// 08 — OBJECTIF TIKTOK (32.5 → 36.5 s) : un anneau d'or 3D tourne ; la jauge se remplit et le
// compteur défile 0 → 1 000 ; « ABONNÉS TIKTOK » ; 2.3 « = MES TRADES EN DIRECT » + badge LIVE ;
// 3.0 « ABONNE-TOI ! » ; 3.55 la caméra traverse l'anneau (portail) → final.
import * as THREE from 'three';
import { E, clamp, lerp, seg, TAU } from '../core/anim.js';
import { radialGlow, sparks } from '../core/draw.js';
import { G, rich, eyebrow, veil, setFont, textWidth } from './_ui.js';

const T_CNT = 0.35, T_FULL = 2.1, T_LIVE = 2.35, T_CTA = 3.0;
export const cues = [
  { t: 0.0, type: 'flash', gain: 0.6 },
  { t: T_CNT, type: 'ticks', dur: 1.75, gain: 0.45 },
  { t: T_FULL, type: 'impact', gain: 0.9 },
  { t: T_LIVE, type: 'pulse', dur: 0.8, gain: 0.5 },
  { t: T_CTA, type: 'hit', gain: 0.8 },
  { t: 3.5, type: 'riser', dur: 0.5, gain: 0.7 },
];

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const ring = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d9a948', metalness: 1, roughness: 0.16, clearcoat: 0.7, envMapIntensity: 1.6 });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 48, 180), gold);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.018, 16, 160), new THREE.MeshBasicMaterial({ color: '#3a2f18' }));
  // jauge lumineuse : arc reconstruit à la volée (quelques segments)
  const arcMat = new THREE.MeshBasicMaterial({ color: '#ffe08a' });
  const arcs = [];
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.03), arcMat);
    const a = Math.PI / 2 - (i / 120) * TAU;
    m.position.set(Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0.02); m.rotation.z = a;
    ring.add(m); arcs.push(m);
  }
  ring.add(torus, inner);
  group.add(ring);
  const RX = V ? 0 : -1.05, RY = V ? -0.15 : 0;
  ring.position.set(RX, RY, 0);

  const camera = (lt) => {
    const a = lerp(0.5, 0.15, E.inOutSine(seg(lt, 0, 3.5)));
    const thr = E.inExpo(seg(lt, 3.5, 4.0));
    const R = lerp(V ? 5.6 : 4.0, -1.5, thr);
    return { pos: [RX * (V ? 1 : 0.55) + Math.sin(a) * R * (1 - thr), RY + 0.2 * (1 - thr), Math.cos(a) * R], target: [RX * (V ? 1 : 0.55) * (1 - thr) + RX * thr, RY, -3 * thr], roll: lerp(-0.06, 0.04, seg(lt, 0, 3.5)) + thr * 0.8, fov: V ? 42 : 32 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, t } = f;
      const S = L.safe;
      const p = E.inOutCubic(seg(lt, T_CNT, T_FULL));
      const n = Math.round(p * 1000);
      arcs.forEach((m, i) => { m.visible = i / 120 < p; });
      ring.rotation.set(0.15 * Math.sin(lt * 0.8), 0.35 * Math.sin(lt * 0.6) + (1 - E.outExpo(seg(lt, 0, 0.9))) * 3, lt * 0.05);
      const full = lt >= T_FULL ? Math.exp(-(lt - T_FULL) / 0.12) : 0;
      ring.scale.setScalar(1 + 0.06 * full);
      f.world.studio.update(t, { backdrop: true, glow: 0.18 + 0.15 * seg(lt, T_FULL, T_FULL + 0.4), grid: 0.25, beams: 0.5, dust: 0.7, motes: 0.8, env: 1.3, envRot: lt * 0.25, rim: 1.4, key: 1.2 });
      post.bloom = 0.8; post.vignette = 1.1;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.9 * (1 - E.outCubic(seg(lt, 0, 0.35)));
      post.flash += 0.5 * full;
      post.flash += 1.0 * E.inCubic(seg(lt, 3.8, 4.0));

      // ---- compteur au centre de l'anneau
      const [cx, cy] = f.project([RX, RY, 0]);
      const out = E.inCubic(seg(lt, 3.45, 3.7));
      ui.save(); ui.globalAlpha = 1 - out;
      const cs = (V ? 170 : 130) * u * (1 + 0.08 * full);
      const str = n >= 1000 ? '1 000' : String(n);
      rich(ui, [[str, n >= 1000 ? 'g' : 'w']], cx, cy + cs * 0.3, { size: cs, weight: 900, glow: n >= 1000 ? 1.2 : 0 });
      setFont(ui, cs * 0.16, 700, 0.3); ui.fillStyle = G.muted; ui.textAlign = 'center';
      ui.fillText('ABONNÉS', cx, cy + cs * 0.68);
      if (lt >= T_FULL) { radialGlow(fx, cx, cy, 600 * u, G.gold, 0.25 * (1 - out)); sparks(fx, cx, cy, lt - T_FULL, f, { count: 80, life: 1.0 }); }

      // ---- textes
      const s = (V ? 84 : 76) * u;
      const x0 = V ? W / 2 : W * 0.63, al = V ? 'center' : 'left';
      const yA = V ? S.t + 90 * u : H * 0.25;
      veil(ui, x0 - (V ? 450 : 40) * u, yA - s, 900 * u, s * 2.2, 0.55);
      eyebrow(ui, 'MON OBJECTIF', x0, yA - s * 0.6, 28 * u, seg(lt, 0.2, 0.6), al);
      rich(ui, [['1 000 ABONNÉS ', 'w'], ['TIKTOK', 'g']], x0, yA + s * 0.55, { size: s * 0.8, k: seg(lt, 0.3, 0.7), align: al, maxW: V ? S.w : 820 * u, glow: 0.6 });
      const yB = V ? S.b - 300 * u : H * 0.58;
      const kl = seg(lt, T_LIVE, T_LIVE + 0.4);
      veil(ui, x0 - (V ? 450 : 40) * u, yB - s, 900 * u, s * 3.2, 0.55 * kl);
      rich(ui, [['POUR TRADER ', 'l'], ['EN DIRECT', 'w']], x0, yB, { size: s * 0.72, k: kl, align: al, maxW: V ? S.w : 820 * u, weight: 800 });
      // badge LIVE
      if (kl > 0) {
        const bs = s * 0.42;
        const bw = textWidth(ui, 'LIVE', bs, 800, 0.14) + bs * 2.2, bh = bs * 1.8;
        const bx = V ? W / 2 - bw / 2 : x0, by = yB + s * 0.35;
        ui.save(); ui.globalAlpha *= kl;
        ui.fillStyle = G.red; ui.shadowColor = 'rgba(224,52,58,0.8)'; ui.shadowBlur = 20 * u;
        ui.beginPath(); ui.roundRect(bx, by, bw, bh, bh * 0.25); ui.fill(); ui.shadowBlur = 0;
        ui.fillStyle = '#fff'; ui.globalAlpha *= 0.55 + 0.45 * Math.abs(Math.sin(lt * 5));
        ui.beginPath(); ui.arc(bx + bs * 0.85, by + bh / 2, bs * 0.3, 0, TAU); ui.fill();
        ui.globalAlpha = kl * (1 - out);
        setFont(ui, bs, 800, 0.14); ui.fillStyle = '#fff'; ui.textAlign = 'left'; ui.textBaseline = 'middle';
        ui.fillText('LIVE', bx + bs * 1.45, by + bh / 2 + 1);
        ui.textBaseline = 'alphabetic';
        ui.restore();
      }
      const kc = E.outBack(seg(lt, T_CTA, T_CTA + 0.35), 1.6);
      if (kc > 0) {
        const yC = yB + s * 1.85;
        ui.save(); ui.translate(V ? W / 2 : x0, yC); ui.scale(kc, kc);
        rich(ui, [['ABONNE-TOI !', 'g']], 0, 0, { size: s * 0.82, align: V ? 'center' : 'left', glow: 1.2, weight: 900 });
        ui.restore();
      }
      ui.restore();
      void clamp;
    },
  };
}
