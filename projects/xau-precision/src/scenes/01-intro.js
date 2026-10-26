// 01 — INTRO (0 → 3.5 s) : noir, étincelle d'or, un lingot 3D jaillit de la profondeur en tournant,
// s'écrase (onde de choc, éclats), « XAU » (argent) claque, « PRÉCISION » (or) se révèle,
// « TRADING SUR L'OR · XAUUSD ». 3.0 → 3.5 : la caméra plonge dans la face du lingot (flash or).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { setFont, fitSize, sparks, shockRing, radialGlow } from '../core/draw.js';
import { maskReveal, slam, seedPoint } from '../core/type.js';
import { canvasTexture } from '../world/textures.js';
import { G, goldFill, eyebrow } from './_ui.js';

const T_LAND = 1.15, T_XAU = 1.2, T_PREC = 1.45, T_SUB = 2.0, T_DIVE = 3.0;
export const cues = [
  { t: 0.05, type: 'drone', dur: 1.2, gain: 0.6 },
  { t: 0.3, type: 'riser', dur: 0.85, gain: 0.7 },
  { t: T_LAND, type: 'boom', gain: 1.2 },
  { t: T_LAND + 0.02, type: 'glass', gain: 0.35 },
  { t: T_PREC, type: 'shimmer', gain: 0.6 },
  { t: T_SUB, type: 'blip', gain: 0.4 },
  { t: T_DIVE, type: 'suck', dur: 0.5, gain: 0.8 },
];

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const bar = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d9a948', metalness: 1, roughness: 0.17, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.6 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.46, 0.84, 6, 0.08), gold);
  bar.add(body);
  // gravure sur le dessus
  const engr = canvasTexture(1024, 480, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,45,8,0.75)'; g.lineWidth = 6; g.strokeRect(40, 40, w - 80, h - 80);
    g.fillStyle = 'rgba(70,45,8,0.85)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    setFont(g, 150, 800, 0.08); g.fillText('XAU', w / 2, h * 0.4);
    setFont(g, 54, 600, 0.4); g.fillText('FINE GOLD · 999.9', w / 2, h * 0.72);
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), new THREE.MeshPhysicalMaterial({ map: engr, transparent: true, metalness: 0.9, roughness: 0.35, color: '#ffffff', depthWrite: false }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.232;
  bar.add(top);
  group.add(bar);
  const floorY = -0.23;

  const BAR_Y = V ? -0.35 : -0.42;
  const camera = (lt) => {
    const a = lerp(0.9, 0.25, E.outCubic(seg(lt, 0.3, 3.0))) + 0.05 * Math.sin(lt * 0.8);
    let R = V ? 6.4 : 4.3;
    let ty = BAR_Y + (V ? 0.9 : 0.55), y = BAR_Y + (V ? 2.2 : 1.6);
    // plongée finale dans la face supérieure du lingot
    const d = E.inExpo(seg(lt, T_DIVE, 3.5));
    R = lerp(R, 0.35, d); y = lerp(y, BAR_Y + 0.6, d); ty = lerp(ty, BAR_Y, d);
    return { pos: [Math.sin(a) * R, y, Math.cos(a) * R], target: [0, ty, 0], roll: lerp(-0.08, 0.02, seg(lt, 0, 2)) + d * 0.5, fov: V ? 42 : 32 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, u, L, world, t } = f;
      const S = L.safe;
      // ---- lingot : arrive de la profondeur en vrille, s'écrase à T_LAND, rebondit légèrement
      const fly = seg(lt, 0.3, T_LAND);
      const e = E.inCubic(fly);
      bar.visible = fly > 0;
      const hit = lt >= T_LAND ? Math.exp(-(lt - T_LAND) / 0.09) : 0;
      bar.position.set(lerp(1.5, 0, e), BAR_Y + lerp(2.4, 0, e) + 0.04 * Math.sin(Math.max(0, lt - T_LAND) * 9) * Math.exp(-Math.max(0, lt - T_LAND) * 4), lerp(-14, 0, e));
      bar.rotation.set(lerp(2.4, 0, E.outCubic(fly)), lerp(-6.5, -0.45, E.outCubic(fly)) + 0.12 * Math.sin(lt * 0.6), lerp(1.2, 0, E.outCubic(fly)));
      bar.scale.set(1 + 0.08 * hit, 1 - 0.12 * hit, 1 + 0.08 * hit);
      world.studio.update(t, { backdrop: true, glow: 0.22 * seg(lt, 0.4, 1.4), grid: 0.35 * seg(lt, T_LAND, T_LAND + 0.6), beams: 0.6 * seg(lt, T_LAND, 1.8), dust: 0.8, motes: 0.8, env: 1.3, envRot: lt * 0.3, rim: 1.5, key: 1.2 });
      world.studio.sweep.intensity = 4 * Math.exp(-Math.pow((lt - 1.9) * 2.0, 2));
      world.studio.sweep.position.set(lerp(-2.5, 2.5, seg(lt, 1.2, 2.6)), 1.2, 1.5);
      post.bloom = 0.75; post.vignette = 1.1;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.9 * Math.exp(-Math.max(0, lt - T_LAND) / 0.06) * (lt >= T_LAND ? 1 : 0);
      post.flash += 1.2 * E.inCubic(seg(lt, 3.25, 3.5));
      const [bx, by] = f.project([bar.position.x, bar.position.y, bar.position.z]);
      if (lt >= T_LAND && lt < T_LAND + 0.6) post.shock = [bx / W, 1 - by / H, E.outCubic(seg(lt, T_LAND, T_LAND + 0.55)) * 1.3, 1.1 * (1 - seg(lt, T_LAND, T_LAND + 0.55))];
      if (lt < 0.6) seedPoint(fx, W, H, 1 - seg(lt, 0.35, 0.6));
      if (lt >= T_LAND) {
        shockRing(fx, bx, by, lt - T_LAND, f, { color: G.gold });
        sparks(fx, bx, by, lt - T_LAND, f, { count: 70 });
      }
      radialGlow(fx, bx, by - 40 * u, 520 * u, G.gold, 0.12 * seg(lt, T_LAND, 1.6));

      // ---- titre
      const out = E.inCubic(seg(lt, T_DIVE, 3.3));
      ui.save();
      ui.globalAlpha = 1 - out;
      ui.translate(W / 2, H / 2); ui.scale(1 + out * 0.6, 1 + out * 0.6); ui.translate(-W / 2, -H / 2);
      const s1 = V ? 250 * u : 190 * u;
      const s2 = V ? fitSize(ui, 'PRÉCISION', 900, 0.02, S.w * 0.96, 190 * u) : 150 * u;
      if (V) {
        const y1 = S.t + s1 * 0.95;
        slam(ui, 'XAU', W / 2, y1, { size: s1, weight: 900, t: lt - T_XAU, color: '#e9ebef' });
        // reflet argent
        if (lt > T_XAU) { ui.save(); ui.globalCompositeOperation = 'source-atop'; ui.restore(); }
        maskReveal(ui, 'PRÉCISION', W / 2, y1 + s2 * 1.12, { size: s2, weight: 900, tracking: 0.02, p: E.outExpo(seg(lt, T_PREC, T_PREC + 0.55)), color: G.gold, edgeColor: G.gold2 });
        eyebrow(ui, "TRADING SUR L'OR · XAUUSD", W / 2, y1 + s2 * 1.12 + 70 * u, 34 * u, seg(lt, T_SUB, T_SUB + 0.5));
      } else {
        const y1 = H * 0.36;
        setFont(ui, s1, 900, -0.01);
        const w1 = ui.measureText('XAU ').width;
        setFont(ui, s1, 900, 0.02);
        const w2 = ui.measureText('PRÉCISION').width;
        const x0 = W / 2 - (w1 + w2) / 2;
        slam(ui, 'XAU', x0, y1, { size: s1, weight: 900, t: lt - T_XAU, color: '#e9ebef', align: 'left' });
        maskReveal(ui, 'PRÉCISION', x0 + w1, y1, { size: s1, weight: 900, tracking: 0.02, p: E.outExpo(seg(lt, T_PREC, T_PREC + 0.55)), color: G.gold, edgeColor: G.gold2, align: 'left' });
        eyebrow(ui, "TRADING SUR L'OR · XAUUSD", W / 2, y1 + 85 * u, 30 * u, seg(lt, T_SUB, T_SUB + 0.5));
      }
      ui.restore();
      void goldFill; void clamp; void floorY;
    },
  };
}
