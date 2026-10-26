// 01 — INTRO (0 → 4.4 s) : HOOK 0 → 1.9 s, puis : noir, étincelle d'or, un lingot 3D jaillit de la profondeur en tournant,
// s'écrase (onde de choc, éclats), « XAU » (argent) claque, « PRÉCISION » (or) se révèle,
// « TRADING SUR L'OR · XAUUSD ». 3.0 → 3.5 : la caméra plonge dans la face du lingot (flash or).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { E, clamp, lerp, seg } from '../core/anim.js';
import { setFont, fitSize, sparks, shockRing, radialGlow } from '../core/draw.js';
import { maskReveal, slam, seedPoint } from '../core/type.js';
import { canvasTexture } from '../world/textures.js';
import { G, goldFill, eyebrow, rich, goldStreaks } from './_ui.js';

const T_LAND = 2.05, T_XAU = 2.1, T_PREC = 2.35, T_SUB = 2.9, T_DIVE = 3.9, T_END = 4.4;
const HOOK = [[0.04, 'TU VEUX PRENDRE', 'w'], [0.42, 'MES TRADES', 'g'], [0.8, 'EN MÊME TEMPS', 'w'], [1.08, 'QUE MOI ?', 'g']];
export const cues = [
  { t: 0.0, type: 'impact', gain: 1.0 },
  { t: 0.04, type: 'glitch', gain: 0.8 },
  { t: 0.42, type: 'slam', gain: 1.0 },
  { t: 0.8, type: 'hit', gain: 0.8 },
  { t: 1.08, type: 'slam', gain: 1.0 },
  { t: 1.2, type: 'riser', dur: 0.85, gain: 0.8 },
  { t: 1.75, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: T_LAND, type: 'boom', gain: 1.2 },
  { t: T_LAND + 0.02, type: 'glass', gain: 0.35 },
  { t: T_PREC, type: 'shimmer', gain: 0.6 },
  { t: T_SUB, type: 'swish', gain: 0.4 },
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
    const a = lerp(0.9, 0.25, E.outCubic(seg(lt, 1.2, T_DIVE))) + 0.05 * Math.sin(lt * 0.8) + (1 - E.outCubic(seg(lt, 0, 1.9))) * 1.4;
    let R = V ? 6.4 : 4.3;
    let ty = BAR_Y + (V ? 0.9 : 0.55), y = BAR_Y + (V ? 2.2 : 1.6);
    // plongée finale dans la face supérieure du lingot
    const d = E.inExpo(seg(lt, T_DIVE, T_END));
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
      const fly = seg(lt, 0.05, T_LAND);
      const e = E.inCubic(fly);
      bar.visible = fly > 0;
      const hit = lt >= T_LAND ? Math.exp(-(lt - T_LAND) / 0.09) : 0;
      bar.position.set(lerp(1.5, 0, e), BAR_Y + lerp(2.4, 0, e) + 0.04 * Math.sin(Math.max(0, lt - T_LAND) * 9) * Math.exp(-Math.max(0, lt - T_LAND) * 4), lerp(-14, 0, e));
      bar.rotation.set(lerp(2.4, 0, E.outCubic(fly)), lerp(-6.5, -0.45, E.outCubic(fly)) + 0.12 * Math.sin(lt * 0.6), lerp(1.2, 0, E.outCubic(fly)));
      bar.scale.set(1 + 0.08 * hit, 1 - 0.12 * hit, 1 + 0.08 * hit);
      world.studio.update(t, { backdrop: true, glow: 0.22 * seg(lt, 1.2, 2.2), grid: 0.35 * seg(lt, T_LAND, T_LAND + 0.6), beams: 0.6 * seg(lt, T_LAND, T_LAND + 0.6), dust: 0.8, motes: 0.8, env: 1.3, envRot: lt * 0.3, rim: 1.5, key: 1.2 });
      world.studio.sweep.intensity = 4 * Math.exp(-Math.pow((lt - 2.8) * 2.0, 2));
      world.studio.sweep.position.set(lerp(-2.5, 2.5, seg(lt, 2.1, 3.5)), 1.2, 1.5);
      post.bloom = 0.75; post.vignette = 1.1;
      post.flashColor = [1, 0.85, 0.55];
      post.flash += 0.9 * Math.exp(-Math.max(0, lt - T_LAND) / 0.06) * (lt >= T_LAND ? 1 : 0);
      post.flash += 1.2 * E.inCubic(seg(lt, T_END - 0.25, T_END));
      const [bx, by] = f.project([bar.position.x, bar.position.y, bar.position.z]);
      if (lt >= T_LAND && lt < T_LAND + 0.6) post.shock = [bx / W, 1 - by / H, E.outCubic(seg(lt, T_LAND, T_LAND + 0.55)) * 1.3, 1.1 * (1 - seg(lt, T_LAND, T_LAND + 0.55))];
      // ---- HOOK : mots qui claquent (glitch, onde, poussière d'or vers la caméra)
      const hk = 1 - E.inCubic(seg(lt, 1.85, 2.05));
      if (hk > 0) {
        goldStreaks(fx, W, H, t, 0.9 * hk, 7, 1);
        for (const [a2] of HOOK) if (lt >= a2) radialGlow(fx, W / 2, H * (V ? 0.4 : 0.45), 900 * u, G.gold, 0.32 * Math.exp(-(lt - a2) / 0.18) * hk);
        radialGlow(fx, W / 2, H * 0.45, 1100 * u, G.goldDeep, 0.12 * hk);
        for (const [a] of HOOK) { if (lt >= a && lt < a + 0.3) { post.shock = [0.5, 0.5, E.outCubic(seg(lt, a, a + 0.3)) * 1.0, 0.6 * (1 - seg(lt, a, a + 0.3))]; post.rgb = Math.max(post.rgb, 0.012 * (1 - seg(lt, a, a + 0.2))); post.flash += 0.35 * Math.exp(-(lt - a) / 0.05); } }
        const hs = (V ? 128 : 112) * u;
        const lines = V ? HOOK.map(([a, w, c]) => [a, w, c]) : [[0.04, 'TU VEUX PRENDRE MES TRADES', 'mix'], [0.8, 'EN MÊME TEMPS QUE MOI ?', 'mix2']];
        ui.save(); ui.globalAlpha = hk;
        const y0 = H * (V ? 0.32 : 0.4);
        lines.forEach(([a, w, c], i) => {
          const sz = V ? hs * (c === 'g' ? 1.15 : 0.82) : hs;
          const yy = V ? y0 + i * hs * 1.12 : y0 + i * hs * 1.25;
          const sc = 1 + (1 - E.outExpo(seg(lt, a, a + 0.25))) * 1.6;
          if (lt < a) return;
          ui.save(); ui.translate(W / 2, yy); ui.scale(sc, sc); ui.translate(-W / 2, -yy);
          const parts = c === 'mix' ? [['TU VEUX PRENDRE ', 'w'], ['MES TRADES', 'g']] : c === 'mix2' ? [['EN MÊME TEMPS ', 'w'], ['QUE MOI ?', 'g']] : [[w, c]];
          rich(ui, parts, W / 2, yy, { size: sz, weight: 900, glow: 1.2, maxW: (V ? 0.95 : 0.9) * W, a: clamp((lt - a) / 0.08) });
          ui.restore();
        });
        ui.restore();
      }
      if (lt >= T_LAND) {
        shockRing(fx, bx, by, lt - T_LAND, f, { color: G.gold });
        sparks(fx, bx, by, lt - T_LAND, f, { count: 70 });
      }
      radialGlow(fx, bx, by - 40 * u, 520 * u, G.gold, 0.12 * seg(lt, T_LAND, 1.6));

      // ---- titre
      const out = E.inCubic(seg(lt, T_DIVE, T_DIVE + 0.3));
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
