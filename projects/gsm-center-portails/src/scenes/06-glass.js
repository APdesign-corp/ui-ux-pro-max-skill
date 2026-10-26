// SEGMENT « glass » (14 → 18 s) — TRAVERSÉE 3, monde « Verre », service RÉPARATION.
//  0.00  la caméra percute la vitre : l'écran éclate en ~80 éclats (verre + morceau d'interface)
//  0.00–1.20  ULTRA RALENTI : les éclats dérivent autour de la caméra qui glisse entre eux
//  1.20–1.35  arrêt net · 1.35–2.20 rembobinage accéléré : les éclats se reforment À L'ENVERS
//  2.20  « clac » de reconstitution : flash, écran app repair 0→100 %, RÉPARATION + ÉCRAN/BATTERIE/CONNECTEUR
//  2.40–3.60  CONTRE-PLONGÉE le long du téléphone géant réparé · 3.60–4.00 WHIP PAN à gauche (→ gear)

import * as THREE from 'three';
import { E, clamp, lerp, seg, rng, rgba, TAU } from '../core/anim.js';
import { setFont, textWidth, fitSize, radialGlow, sparks, shockRing, eyebrow } from '../core/draw.js';
import { C, slam, wrapLines } from '../core/type.js';
import { PHONE, roundedRectShape } from '../world/phone.js';

export const cues = [
  { t: 0.0, type: 'glass', gain: 1.3 },
  { t: 0.0, type: 'impact', gain: 0.9 },
  { t: 0.05, type: 'sub', dur: 1.3, gain: 0.9 },
  { t: 1.35, type: 'reverse', dur: 0.85, gain: 1 },
  { t: 2.2, type: 'snap', gain: 1 },
  { t: 2.22, type: 'success', gain: 0.9 },
  { t: 2.25, type: 'slam', gain: 1 },
  { t: 2.5, type: 'pop', gain: 0.6 },
  { t: 2.62, type: 'pop', gain: 0.6 },
  { t: 2.74, type: 'pop', gain: 0.6 },
  { t: 2.45, type: 'tick', dur: 0.8, gain: 0.5 },
  { t: 2.45, type: 'riser', dur: 1.1, gain: 0.6 },
  { t: 3.62, type: 'whoosh', dur: 0.38, gain: 0.9, pan: -0.6 },
];

const GW = PHONE.W - 0.03, GH = PHONE.H - 0.03; // vitre
const IMPACT = [0.08, 0.22];

// fragmentation radiale (anneaux × secteurs jitterés), coins ramenés dans le rectangle de la vitre
function shardPolys() {
  const r = rng(91);
  const rings = [0, 0.07, 0.17, 0.3, 0.47, 0.7, 1.0, 1.5];
  const S = 13;
  const jitA = [];
  for (let k = 0; k < rings.length; k++) jitA.push(Array.from({ length: S }, () => (r() - 0.5) * 0.35));
  const pt = (k, s) => {
    const a = ((s % S) + jitA[k][s % S]) / S * TAU;
    const rr = rings[k] * (k ? 0.9 + r() * 0.2 : 1);
    return [clamp(IMPACT[0] + Math.cos(a) * rr, -GW / 2, GW / 2), clamp(IMPACT[1] + Math.sin(a) * rr, -GH / 2, GH / 2)];
  };
  const polys = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let s = 0; s < S; s++) {
      const p = k === 0 ? [pt(0, 0), pt(1, s), pt(1, s + 1)] : [pt(k, s), pt(k + 1, s), pt(k + 1, s + 1), pt(k, s + 1)];
      // ignore les morceaux dégénérés (entièrement écrasés sur un bord)
      let area = 0;
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (Math.abs(area) > 0.0006) polys.push(p);
    }
  }
  return polys;
}

export default function create(ctx) {
  const { world, V, THREE: T3 } = ctx;
  const group = new T3.Group();
  const scr = world.phones[0].screen;
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b1a10', emissive: '#ffffff', emissiveMap: scr.tex, emissiveIntensity: 0.45, metalness: 0.2, roughness: 0.03,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  });
  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(1.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const r = rng(17);
  const shards = shardPolys().map((poly) => {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const sh = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false });
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + cx + GW / 2) / GW, (pos.getY(i) + cy + GH / 2) / GH);
    const m = new THREE.Mesh(geo, glassMat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    m.add(edges);
    group.add(m);
    const d = Math.hypot(cx - IMPACT[0], cy - IMPACT[1]) + 0.05;
    return {
      m, base: [cx, cy, PHONE.D / 2 + 0.004],
      dir: [(cx - IMPACT[0]) / d * (0.6 + r() * 0.8), (cy - IMPACT[1]) / d * (0.6 + r() * 0.8), 0.9 + r() * 1.6],
      ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), w: (r() - 0.5) * 9, near: 1 / (0.4 + d),
    };
  });
  const qa = new THREE.Quaternion();

  // « temps d'éclatement » s : burst rapide puis ultra ralenti, arrêt, rembobinage
  const shatterS = (lt) => {
    const sA = (x) => 0.32 * (1 - Math.exp(-x * 7)) + x * 0.16;
    if (lt < 1.2) return sA(lt);
    if (lt < 1.35) return sA(1.2);
    if (lt < 2.2) return sA(1.2) * (1 - E.inOutCubic(seg(lt, 1.35, 2.2)));
    return 0;
  };

  const camera = (lt) => {
    if (lt < 2.2) {
      // dérive lente entre les éclats, légère orbite, puis recul pendant la reconstitution
      const a = lerp(-0.25, 0.55, E.inOutSine(seg(lt, 0, 1.35)));
      const back = E.inOutCubic(seg(lt, 1.35, 2.2));
      const R = lerp(V ? 3.0 : 2.4, V ? 3.4 : 2.8, back);
      return { pos: [Math.sin(a) * R, 0.15 + 0.1 * Math.sin(lt * 2), Math.cos(a) * R], target: [0.05, 0.1 * (1 - back), 0], roll: lerp(0.25, 0, back) * Math.sin(lt * 1.3), fov: V ? 58 : 44 };
    }
    // contre-plongée : la caméra part du bas du téléphone et remonte en le longeant, très près, grand angle
    const k = E.inOutCubic(seg(lt, 2.2, 3.6));
    const pos = [lerp(0.55, 0.45, k), lerp(-1.0, 0.6, k), lerp(1.25, 0.9, k)];
    const tgt = [0, lerp(0.35, 1.5, k), 0];
    // whip pan à gauche : la visée part brutalement vers la gauche
    const w = E.inExpo(seg(lt, 3.6, 4.0));
    tgt[0] -= w * 9; tgt[2] += w * 2;
    return { pos, target: tgt, roll: lerp(-0.12, 0.05, k), fov: V ? 74 : 62 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, W, H, u, L } = f;
      const ph = world.phones[0];
      const s = shatterS(lt);
      const broken = lt < 2.2;
      ph.group.visible = true;
      ph.group.rotation.set(0, lerp(0.12, -0.08, seg(lt, 0, 4)), 0);
      ph.phone.anchors.front.visible = !broken;
      // écran : interface de réparation (sur les éclats aussi, via la même texture)
      ph.screen.draw('repair', lt - 2.15, { p: E.inOutCubic(seg(lt, 2.25, 3.2)) });
      ph.phone.setScreenMap(ph.screen.tex, 0.75 + 0.5 * Math.exp(-Math.max(0, lt - 2.2) * 5) * (lt > 2.2 ? 1 : 0));
      for (const sh of shards) {
        sh.m.visible = broken;
        if (!broken) continue;
        sh.m.position.set(sh.base[0] + sh.dir[0] * s, sh.base[1] + sh.dir[1] * s - s * s * 0.15, sh.base[2] + sh.dir[2] * s * sh.near * 2.6);
        qa.setFromAxisAngle(sh.ax, sh.w * s);
        sh.m.quaternion.copy(qa);
        sh.m.position.applyEuler(ph.group.rotation);
        sh.m.quaternion.premultiply(ph.group.quaternion);
      }
      world.studio.update(f.t, { backdrop: true, glow: 0.22, grid: 0, beams: lt > 2.2 ? 0.7 : 0.25, dust: 1.4, motes: 1, env: 1.3, envRot: lt * 0.4, rim: 1.4, key: 1.1 });
      world.studio.sweep.intensity = 2.5 * Math.max(0, Math.sin(lt * 2.2));
      world.studio.sweep.position.set(Math.sin(lt * 2) * 2, 0.6, 1.4);

      // impact + éclats lumineux (calque fx)
      if (lt < 0.25) {
        post.flash += 0.9 * Math.exp(-lt * 14);
        post.flashColor = [0.85, 1, 0.88];
        post.ca += 0.006 * Math.exp(-lt * 8);
        post.shock = [0.52, 0.45, E.outCubic(seg(lt, 0, 0.6)) * 0.9, 1.2 * Math.exp(-lt * 3)];
      }
      sparks(fx, W * 0.52, H * 0.45, lt, f, { count: 90, seed: 5, speed: 1400, life: 1.1, color: '#e8ffe6' });
      if (broken) {
        // reflets ponctuels sur les éclats
        fx.save(); fx.globalCompositeOperation = 'lighter';
        shards.forEach((sh, i) => {
          if (i % 3) return;
          const p = f.project([sh.m.position.x, sh.m.position.y, sh.m.position.z]);
          const tw = Math.max(0, Math.sin(lt * 7 + i * 1.7));
          if (p[2] < 1 && tw > 0.6) radialGlow(fx, p[0], p[1], 22 * u * tw, '#ffffff', 0.35 * tw);
        });
        fx.restore();
        post.dof = { focus: 1.0, aperture: 0.025, maxblur: 0.008 };
        post.ca += 0.0015;
      }
      if (lt > 1.35 && lt < 2.2) { post.zoomBlur += 0.06 * Math.sin(Math.PI * seg(lt, 1.35, 2.2)); post.rgb += 0.002; }
      // reconstitution : clac + onde
      if (lt >= 2.2 && lt < 2.7) {
        post.flash += 0.75 * Math.exp(-(lt - 2.2) * 12);
        shockRing(fx, W / 2, H * 0.5, lt - 2.2, f, { radius: 900, color: C.neon, width: 16 });
      }

      // ---------- typographie (service RÉPARATION)
      const out = seg(lt, 3.55, 3.8);
      if (lt > 2.2) {
        const S = L.safe;
        eyebrow(ui, "02 — RÉPARER", V ? S.l : S.l, V ? S.t + 40 * u : S.t + 30 * u, lt - 2.2, f, { size: V ? 30 : 24, alpha: 1 - out });
        const big = V ? fitSize(ui, 'RÉPARATION', 900, -0.02, S.w, 170 * u) : fitSize(ui, 'RÉPARATION', 900, -0.02, S.w * 0.62, 190 * u);
        const ty = V ? S.t + S.h * 0.2 : S.t + S.h * 0.32;
        ui.save();
        ui.shadowColor = 'rgba(0,0,0,0.6)'; ui.shadowBlur = 30 * u;
        slam(ui, 'RÉPARATION', V ? S.cx : S.l + 0, ty, { size: big, weight: 900, t: lt - 2.25, align: V ? 'center' : 'left', color: C.white, out, colorAt: (i) => (i < 3 ? C.neon : C.white) });
        ui.restore();
        const sub = 'Réparation rapide';
        setFont(ui, (V ? 46 : 40) * u, 300, 0.02);
        ui.globalAlpha = clamp(seg(lt, 2.7, 2.95)) * (1 - out);
        ui.fillStyle = C.white; ui.textAlign = V ? 'center' : 'left';
        ui.fillText(sub, V ? S.cx : S.l, ty + (V ? 80 : 74) * u);
        ui.globalAlpha = 1; ui.textAlign = 'left';
        // pastilles ÉCRAN / BATTERIE / CONNECTEUR en cascade
        const parts = ['ÉCRAN', 'BATTERIE', 'CONNECTEUR'];
        const ps = (V ? 34 : 28) * u;
        let x = V ? 0 : S.l, y = V ? S.b - 300 * u : ty + 140 * u;
        const widths = parts.map((p) => textWidth(ui, p, ps, 700, 0.12) + 70 * u);
        if (V) x = S.cx - (widths.reduce((a, b) => a + b, 0) + 24 * u * 2) / 2;
        if (V && widths.reduce((a, b) => a + b, 0) > S.w) { x = S.l; }
        parts.forEach((p, i) => {
          const k = E.outBack(seg(lt, 2.5 + i * 0.12, 2.85 + i * 0.12), 2.2) * (1 - out);
          if (k > 0) {
            const w = widths[i];
            ui.save();
            ui.translate(x + w / 2, y); ui.scale(k, k);
            ui.fillStyle = 'rgba(57,255,20,0.16)'; ui.strokeStyle = C.neon; ui.lineWidth = 2 * u;
            ui.beginPath(); ui.roundRect(-w / 2, -32 * u, w, 64 * u, 32 * u); ui.fill(); ui.stroke();
            ui.fillStyle = C.neon; ui.beginPath(); ui.arc(-w / 2 + 30 * u, 0, 8 * u, 0, TAU); ui.fill();
            setFont(ui, ps, 700, 0.12); ui.fillStyle = C.white; ui.textBaseline = 'middle';
            ui.fillText(p, -w / 2 + 50 * u, 2 * u);
            ui.restore();
          }
          x += widths[i] + 24 * u;
        });
        ui.textBaseline = 'alphabetic';
      }
      // whip de sortie (raccord gear)
      const w = seg(lt, 3.7, 4.0);
      if (w > 0) {
        post.blur[0] += 0.12 * E.inCubic(w);
        post.uiBlur = 1;
        post.flash += 0.5 * E.inCubic(seg(lt, 3.85, 4.0));
        post.flashColor = [0.8, 1, 0.82];
      }
      void rgba; void wrapLines;
    },
  };
}
