// 09 — FINAL (36.5 → 41 s) : on sort de l'anneau ; une pièce d'or 3D frappée de la PHOTO DE PROFIL
// du client tourne puis se pose face caméra (reflet qui glisse) ; XAU PRÉCISION ; Telegram · TikTok ;
// appel à l'action ; mention de risque ; 4.05 → 4.5 tout se replie dans un point d'or (boucle).
import * as THREE from 'three';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { radialGlow } from '../core/draw.js';
import { seedPoint } from '../core/type.js';
import { G, rich, eyebrow, veil, setFont } from './_ui.js';

const T_NAME = 1.15, T_NET = 1.6, T_CTA = 2.0, T_RISK = 2.4, T_FOLD = 4.05;
export const cues = [
  { t: 0.0, type: 'boom', gain: 1.0 },
  { t: 0.1, type: 'whoosh', dur: 0.9, gain: 0.5 },
  { t: 1.0, type: 'glass', gain: 0.45 },
  { t: T_NAME, type: 'hit', gain: 0.8 },
  { t: T_NET, type: 'swish', gain: 0.5 },
  { t: T_CTA, type: 'success', gain: 0.6 },
  { t: T_CTA + 0.35, type: 'pop', gain: 0.6 },
  { t: T_FOLD, type: 'suck', dur: 0.45, gain: 0.8 },
];

export default function create(ctx) {
  const { V, W, H, world } = ctx;
  const group = new THREE.Group();
  const lt = new THREE.Texture(world.images.logo); lt.colorSpace = THREE.SRGBColorSpace; lt.center.set(0.5, 0.5); lt.rotation = Math.PI / 2; lt.anisotropy = 8; lt.needsUpdate = true;
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d9a948', metalness: 1, roughness: 0.2, clearcoat: 0.8, envMapIntensity: 1.6 });
  const face = new THREE.MeshPhysicalMaterial({ map: lt, roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#ffffff', emissiveMap: lt, emissiveIntensity: 0.3 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.14, 160, 1), [gold, face, gold]);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.05, 32, 200), gold);
  const holder = new THREE.Group();
  coin.rotation.x = Math.PI / 2;
  // la face +Y du cylindre devient la face avant (+Z) ; retourner l'image pour la lire à l'endroit
  holder.add(coin, rim);
  group.add(holder);
  const CY = V ? 0.05 : 0.15, CX = V ? 0 : -1.25;

  const camera = (t) => {
    const k = E.outCubic(seg(t, 0, 2.0));
    const a = lerp(0.6, 0.05, k);
    const R = V ? lerp(7.5, 6.2, k) : lerp(5.4, 4.6, k);
    return { pos: [CX * 0.45 + Math.sin(a) * R, CY + lerp(0.6, 0.1, k), Math.cos(a) * R], target: [CX * 0.45, CY + (V ? -0.2 : 0), 0], roll: lerp(0.1, 0, k), fov: V ? 40 : 30 };
  };

  return {
    group,
    camera,
    update(f) {
      const { ui, fx, post, u, L } = f;
      const t = f.lt;
      const S = L.safe;
      const fold = E.inCubic(seg(t, T_FOLD, 4.48));
      const spin = E.outCubic(seg(t, 0, 1.4));
      holder.visible = fold < 0.99;
      holder.position.set(CX, CY + 0.04 * Math.sin(t * 1.4), lerp(-6, 0, E.outExpo(seg(t, 0, 0.9))));
      holder.rotation.set(0.05 * Math.sin(t), lerp(Math.PI * 6, 0, spin) + 0.08 * Math.sin(t * 0.9), 0);
      holder.scale.setScalar((V ? 0.74 : 1.05) * (1 - fold));
      f.world.studio.update(f.t, { backdrop: fold < 0.98, glow: 0.22 * (1 - fold), grid: 0.3 * (1 - fold), beams: 0.6 * (1 - fold), dust: 0.7 * (1 - fold), motes: 0.7 * (1 - fold), env: 1.4, envRot: 0.4 + t * 0.15, rim: 1.5, key: 1.2 });
      f.world.studio.sweep.intensity = 4 * Math.exp(-Math.pow((t - 1.6) * 2, 2)) * (1 - fold);
      f.world.studio.sweep.position.set(lerp(-2.5, 2.5, seg(t, 1.0, 2.3)), 1, 1.6);
      post.bloom = 0.7; post.vignette = 1.05;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 1.0 * (1 - E.outCubic(seg(t, 0, 0.45)));
      const [cx, cy] = f.project([CX, CY, 0]);
      radialGlow(fx, cx, cy, 700 * u, G.gold, 0.18 * seg(t, 0.6, 1.4) * (1 - fold));

      // ---- textes
      ui.save();
      ui.translate(W / 2, H / 2); ui.scale(1 - fold, 1 - fold); ui.translate(-W / 2, -H / 2);
      ui.globalAlpha = 1 - fold;
      const s = (V ? 132 : 120) * u;
      const x0 = V ? W / 2 : W * 0.6, al = V ? 'center' : 'left';
      let y = V ? S.t + 120 * u : H * 0.36;
      if (V) {
        rich(ui, [['XAU ', 's'], ['PRÉCISION', 'g']], x0, y, { size: s, k: seg(t, T_NAME, T_NAME + 0.4), align: al, glow: 1, weight: 900, maxW: S.w });
        y = H * 0.64;
      } else {
        veil(ui, x0 - 40 * u, y - s, 800 * u, s * 4.5, 0.55);
        rich(ui, [['XAU ', 's'], ['PRÉCISION', 'g']], x0, y, { size: s, k: seg(t, T_NAME, T_NAME + 0.4), align: al, glow: 1, weight: 900, maxW: S.r - x0 });
        y += s * 0.85;
      }
      eyebrow(ui, 'NE RATE PLUS MES TRADES', x0, y, 30 * u, seg(t, T_NET, T_NET + 0.4), al);
      const mw = V ? S.w : S.r - x0;
      rich(ui, [['Abonne-toi sur TikTok ', 'l'], ['@muzz.traderID', 'g']], x0, y + s * 0.78, { size: s * 0.4, k: seg(t, T_CTA, T_CTA + 0.4), align: al, weight: 800, maxW: mw, glow: 0.8 });
      rich(ui, [['Rejoins le canal Telegram ', 'l'], ['XAU PRÉCISION', 'g']], x0, y + s * 1.38, { size: s * 0.4, k: seg(t, T_CTA + 0.35, T_CTA + 0.75), align: al, weight: 800, maxW: mw, glow: 0.8 });
      ui.globalAlpha = (1 - fold) * 0.75 * seg(t, T_RISK, T_RISK + 0.4);
      setFont(ui, 20 * u * (V ? 1.15 : 1), 400, 0.04); ui.fillStyle = G.muted; ui.textAlign = V ? 'center' : 'left';
      ui.fillText('Le trading comporte un risque de perte en capital.', V ? W / 2 : x0, V ? S.b - 10 * u : S.b - 10 * u);
      ui.restore();

      if (fold > 0) { post.exposure = 1 - 0.7 * fold; seedPoint(fx, W, H, clamp(fold * 1.2)); }
      if (t > 4.48) { holder.visible = false; f.world.studio.update(f.t, { backdrop: false, glow: 0, grid: 0, beams: 0, dust: 0, motes: 0 }); post.exposure = 1; }
      void lerp;
    },
  };
}
