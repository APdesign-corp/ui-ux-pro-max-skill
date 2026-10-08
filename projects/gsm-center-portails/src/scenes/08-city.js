// SEGMENT « city » (22 → 26 s) — monde « Ville » : Liège de nuit stylisée (étape 5 de l'histoire).
//  0.00  on ressort de l'écran-carte, très haut au-dessus de la ville (la plongée continue)
//  0.00–1.20  la LIGNE LUMINEUSE de l'itinéraire avance dans les rues ; la caméra plonge et la suit
//  0.60–3.20  SPIRALE qui se resserre autour du repère du magasin ; adresse affichée dans la ville
//  3.20–4.00  TRAVERSÉE 5 : un écran géant jaillit du repère et avale la caméra (glitch RGB, flash blanc)

import * as THREE from 'three';
import { E, clamp, lerp, seg, rng, TAU } from '../core/anim.js';
import { setFont, textWidth, radialGlow, shockRing, eyebrow } from '../core/draw.js';
import { C, speedLines } from '../core/type.js';
import { ParticleShader } from '../engine/shaders.js';

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.8, gain: 1 },
  { t: 0.05, type: 'data', dur: 1.2, gain: 0.6 },
  { t: 0.6, type: 'sub', dur: 2.4, gain: 0.6 },
  { t: 1.2, type: 'pop', gain: 0.8 },
  { t: 1.45, type: 'click', gain: 0.7 },
  { t: 1.6, type: 'success', gain: 0.7 },
  { t: 2.2, type: 'whoosh', dur: 0.6, gain: 0.6, pan: 0.5 },
  { t: 3.0, type: 'riser', dur: 1.0, gain: 1 },
  { t: 3.25, type: 'boom', gain: 0.6 },
  { t: 3.7, type: 'glitch', gain: 1 },
  { t: 3.85, type: 'suck', dur: 0.15, gain: 0.8 },
];

const PIN = [3, 0, -2];   // magasin (Rue St Léonard, bord de Meuse, stylisé)
const ROUTE = [[-16, 0.3, 14], [-16, 0.3, 6], [-8, 0.3, 6], [-8, 0.3, 0], [0, 0.3, 0], [0, 0.3, -2], [3, 0.3, -2]];

export default function create(ctx) {
  const { V } = ctx;
  const group = new THREE.Group();
  const r = rng(404);
  // fleuve (Meuse) : ruban courbe
  const river = (z) => 9 + 4 * Math.sin(z * 0.08);
  const isRiver = (x, z) => Math.abs(x - river(z)) < 2.6;

  // bâtiments (InstancedMesh)
  const N = 1100;
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.MeshStandardMaterial({ color: '#0a110d', metalness: 0.7, roughness: 0.35, envMapIntensity: 0.6, emissive: '#031008' });
  const bld = new THREE.InstancedMesh(bGeo, bMat, N);
  const win = [];
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let gx = -30; gx <= 30 && n < N; gx += 2) {
    for (let gz = -30; gz <= 30 && n < N; gz += 2) {
      if (gx % 8 === 0 || gz % 8 === 0) continue; // rues
      if (isRiver(gx, gz)) continue;
      const d = Math.hypot(gx - PIN[0], gz - PIN[2]);
      const h = (0.6 + r() * 2.2) * (1 + 1.6 * Math.exp(-d * d / 260)) * (r() < 0.06 ? 2.2 : 1);
      const w = 1.2 + r() * 0.6;
      m4.compose(new THREE.Vector3(gx + (r() - 0.5) * 0.3, 0, gz + (r() - 0.5) * 0.3), new THREE.Quaternion(), new THREE.Vector3(w, h, w));
      bld.setMatrixAt(n++, m4);
      // fenêtres
      const nw = Math.floor(h * 4 * r());
      for (let k = 0; k < nw; k++) {
        const side = Math.floor(r() * 4), a = (r() - 0.5) * w * 0.9;
        const off = [[a, w / 2 + 0.01], [a, -w / 2 - 0.01], [w / 2 + 0.01, a], [-w / 2 - 0.01, a]][side];
        win.push(gx + off[0], 0.2 + r() * (h - 0.3), gz + off[1]);
      }
    }
  }
  bld.count = n;
  group.add(bld);
  const mkPoints = (arr, color, size, opacity) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const sd = new Float32Array(arr.length / 3).map(() => r());
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const mat = new THREE.ShaderMaterial({ ...ParticleShader, uniforms: THREE.UniformsUtils.clone(ParticleShader.uniforms), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    mat.uniforms.uColor.value = new THREE.Color(color);
    mat.uniforms.uOpacity.value = opacity; mat.uniforms.uSize.value = size;
    mat.uniforms.uBox.value = [1e4, 1e4, 1e4]; mat.uniforms.uDrift.value = [0, 0, 0];
    mat.uniforms.uPixel.value = ctx.H / 1080;
    const p = new THREE.Points(geo, mat); p.frustumCulled = false;
    group.add(p);
    return p;
  };
  const winA = win.filter((_, i) => Math.floor(i / 3) % 3 !== 0), winB = win.filter((_, i) => Math.floor(i / 3) % 3 === 0);
  const wP1 = mkPoints(winA, C.neon, 60, 0.6);
  const wP2 = mkPoints(winB, '#eafff0', 60, 0.8);
  // rues : lignes lumineuses
  const st = [];
  for (let k = -32; k <= 32; k += 8) { st.push(k, 0.05, -32, k, 0.05, 32, -32, 0.05, k, 32, 0.05, k); }
  const streets = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(st, 3)),
    new THREE.LineBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(streets);
  // sol
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: '#030604', metalness: 0.8, roughness: 0.5 }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);
  // Meuse : ruban teal
  const rv = [], ri = [];
  for (let i = 0; i <= 60; i++) { const z = -36 + i * 1.2, x = river(z); rv.push(x - 2.4, 0.04, z, x + 2.4, 0.04, z); if (i) { const b = (i - 1) * 2; ri.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rGeo.setIndex(ri); rGeo.computeVertexNormals();
  const riverMesh = new THREE.Mesh(rGeo, new THREE.MeshPhysicalMaterial({ color: '#04140f', emissive: C.teal, emissiveIntensity: 0.18, metalness: 0.9, roughness: 0.08, clearcoat: 1, side: THREE.DoubleSide }));
  group.add(riverMesh);
  // ponts
  for (const z of [-14, 2, 18]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: '#0d1410', emissive: C.teal, emissiveIntensity: 0.25 }));
    b.position.set(river(z), 0.5, z); group.add(b);
  }
  // itinéraire : tube néon révélé progressivement + tête lumineuse
  const curve = new THREE.CatmullRomCurve3(ROUTE.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
  const tube = new THREE.TubeGeometry(curve, 400, 0.16, 10, false);
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(1.4) });
  const routeMesh = new THREE.Mesh(tube, tubeMat);
  group.add(routeMesh);
  const totalIdx = tube.index.count;
  // repère : colonne de lumière + anneaux
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(1.2), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 40, 32, 1, true), beamMat);
  beam.position.set(PIN[0], 20, PIN[2]); group.add(beam);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(PIN[0], 0.08, PIN[2]); group.add(m); return m;
  });
  // portail : écran géant (texture du téléphone 3)
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 9), new THREE.MeshBasicMaterial({ map: ctx.world.phones[3].screen.tex, color: new THREE.Color(0.9, 0.9, 0.9) }));
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 9.4), new THREE.MeshStandardMaterial({ color: '#9aa1a7', metalness: 1, roughness: 0.2 }));
  frame.position.z = -0.02;
  const portalG = new THREE.Group(); portalG.add(portal, frame); group.add(portalG);

  const pinTop = new THREE.Vector3(PIN[0], 1.2, PIN[2]);
  const camera = (lt) => {
    // A : sortie de l'écran, vue zénithale qui plonge en suivant la tête de l'itinéraire
    const head = curve.getPoint(clamp(E.inOutSine(seg(lt, 0, 1.25))));
    const a = seg(lt, 0, 0.9);
    const zen = { pos: [head.x * 0.5, lerp(46, 16, E.outCubic(a)), head.z * 0.5 + lerp(0.1, 10, a)], target: [head.x * 0.7, 0, head.z * 0.7] };
    // B : spirale qui se resserre autour du repère
    const b = E.inOutSine(seg(lt, 0.6, 3.25));
    const ang = lerp(-0.6, 2.4 * Math.PI * 0.62, b);
    const R = lerp(18, 4.2, b), h = lerp(13, 2.6, b);
    const spi = { pos: [PIN[0] + Math.sin(ang) * R, h, PIN[2] + Math.cos(ang) * R], target: [PIN[0], lerp(0, 1.4, b), PIN[2]] };
    const mixAB = E.inOutCubic(seg(lt, 0.6, 1.4));
    let pos = [0, 1, 2].map((i) => lerp(zen.pos[i], spi.pos[i], mixAB));
    let target = [0, 1, 2].map((i) => lerp(zen.target[i], spi.target[i], mixAB));
    // C : plongée dans le portail (face au portail, accélération)
    const c = E.inExpo(seg(lt, 3.3, 4.0));
    if (lt > 3.2) {
      const pc = [PIN[0] + Math.sin(ang) * 0.6, 4.5, PIN[2] + Math.cos(ang) * 0.6];
      const k = E.inOutCubic(seg(lt, 3.2, 3.5));
      pos = pos.map((v, i) => lerp(v, lerp(spi.pos[i], pc[i], 0.2), k));
      target = target.map((v, i) => lerp(v, [PIN[0], 4.5, PIN[2]][i], k));
      pos = pos.map((v, i) => lerp(v, [PIN[0], 4.5, PIN[2]][i], c * 0.97));
    }
    return { pos, target, roll: 0.25 * Math.sin(lt * 1.4) * (1 - mixAB) + 0.1 * Math.sin(lt * 0.9), fov: V ? 66 : 50 };
  };

  const v = new THREE.Vector3();
  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, W, H, u, L } = f;
      world_hide(f);
      f.world.studio.update(f.t, { backdrop: false, grid: 0, beams: 0, dust: 0.6, motes: 0.4, env: 0.6, rim: 0.3, key: 0.3 });
      // tracé de l'itinéraire
      const rp = clamp(E.inOutSine(seg(lt, 0, 1.25)));
      routeMesh.geometry.setDrawRange(0, Math.floor(totalIdx * rp / 6) * 6);
      tubeMat.color.setScalar(1).copy(new THREE.Color(C.neon)).multiplyScalar(1.3 + 0.4 * Math.sin(lt * 9));
      const head = curve.getPoint(rp);
      // anneaux du repère
      rings.forEach((m, i) => { const k = ((lt * 0.8 + i / 3) % 1); m.scale.setScalar(1 + k * 5); m.material.opacity = (1 - k) * 0.9; });
      beamMat.opacity = 0.08 + 0.04 * Math.sin(lt * 5) + 0.08 * seg(lt, 1.1, 1.3);
      // portail qui jaillit du repère
      const pk = E.outBack(seg(lt, 3.0, 3.45), 1.4);
      portalG.visible = lt > 2.95;
      const yaw = (() => { const b = E.inOutSine(seg(lt, 0.6, 3.25)); return lerp(-0.6, 2.4 * Math.PI * 0.62, b); })();
      portalG.position.set(PIN[0], lerp(-6, 4.5, pk), PIN[2]);
      portalG.rotation.set(0, yaw, 0);
      f.world.phones[3].screen.draw('portal', lt - 3, { p: seg(lt, 3.3, 3.95) });
      // fx : tête de l'itinéraire, lignes de vitesse, trafic
      fx.save(); fx.globalCompositeOperation = 'lighter';
      v.copy(head);
      const ph = f.project([v.x, v.y + 0.2, v.z]);
      if (rp < 1 && ph[2] < 1) radialGlow(fx, ph[0], ph[1], 90 * u, '#ffffff', 0.7);
      fx.restore();
      speedLines(fx, W, H, lt, 0.5 * (1 - seg(lt, 0, 0.8)) + 0.8 * seg(lt, 3.3, 3.9), { seed: 8, count: 140 });
      // raccord d'entrée (sortie de l'écran-carte) : flash qui décroît
      post.flash += 0.9 * (1 - E.outCubic(seg(lt, 0, 0.35)));
      post.flashColor = [0.75, 1, 0.8];
      post.bloom = 0.55; post.vignette = 1.0;
      // arrivée au magasin : onde
      const pp = f.project(PIN);
      if (pp[2] < 1) shockRing(fx, pp[0], pp[1], lt - 1.2, f, { radius: 600, color: C.neon, width: 12, flat: 0.45 });

      // ---------- typographie : adresse dans la ville
      const S = L.safe;
      const pin = f.project([pinTop.x, pinTop.y, pinTop.z]);
      const ka = E.outExpo(seg(lt, 1.25, 1.75)) * (1 - seg(lt, 3.05, 3.3));
      if (ka > 0 && pin[2] < 1) {
        const big = (V ? 62 : 58) * u, small = (V ? 44 : 38) * u;
        const lines = ['Rue St Léonard 203', '4000 Liège'];
        const tw = Math.max(textWidth(ui, lines[0], big, 800, -0.01), textWidth(ui, lines[1], small, 400, 0.04));
        let x = clamp(pin[0] + 60 * u, S.l, S.r - tw), y = clamp(pin[1] - 120 * u, S.t + big, S.b - small * 2.2);
        if (V) { x = S.cx - tw / 2; y = S.t + S.h * 0.14; }
        // trait de rappel jusqu'au repère
        ui.save();
        ui.globalAlpha = ka;
        ui.strokeStyle = C.neon; ui.lineWidth = 2 * u;
        ui.beginPath(); ui.moveTo(pin[0], pin[1]); ui.lineTo(x - 14 * u, y + small * 0.6); ui.stroke();
        ui.fillStyle = C.neon; ui.beginPath(); ui.arc(pin[0], pin[1], 7 * u, 0, TAU); ui.fill();
        ui.fillStyle = 'rgba(4,6,5,0.55)';
        ui.beginPath(); ui.roundRect(x - 24 * u, y - big * 1.05, tw + 48 * u, big + small * 1.9, 18 * u); ui.fill();
        ui.strokeStyle = 'rgba(57,255,20,0.6)'; ui.lineWidth = 1.5 * u; ui.stroke();
        setFont(ui, big, 800, -0.01); ui.fillStyle = C.white; ui.textAlign = 'left'; ui.textBaseline = 'alphabetic';
        ui.fillText(lines[0], x, y);
        setFont(ui, small, 400, 0.04); ui.fillStyle = C.neon;
        ui.fillText(lines[1], x, y + small * 1.3);
        ui.restore();
      }
      eyebrow(ui, 'ITINÉRAIRE → GSM CENTER LIÈGE', S.l, V ? S.t + 30 * u : S.t + 20 * u, lt - 0.15, f, { size: V ? 26 : 22, alpha: 1 - seg(lt, 3.0, 3.3) });
      if (lt > 1.45 && lt < 3.1) {
        const k = E.outBack(seg(lt, 1.45, 1.8), 2) * (1 - seg(lt, 2.85, 3.1));
        const s = (V ? 40 : 34) * u, txt = 'Vous êtes arrivé';
        const tw = textWidth(ui, txt, s, 700, 0.02) + 90 * u;
        const cx = S.cx, cy = V ? S.b - 120 * u : S.b - 50 * u;
        ui.save(); ui.translate(cx, cy); ui.scale(k, k);
        const gr = ui.createLinearGradient(-tw / 2, 0, tw / 2, 0); gr.addColorStop(0, C.neon2); gr.addColorStop(1, C.teal);
        ui.fillStyle = gr; ui.beginPath(); ui.roundRect(-tw / 2, -s, tw, s * 2, s); ui.fill();
        ui.fillStyle = C.ink; setFont(ui, s, 700, 0.02); ui.textAlign = 'center'; ui.textBaseline = 'middle';
        ui.fillText('✓ ' + txt, 0, 2 * u);
        ui.restore();
      }
      // traversée 5 : glitch + flash blanc
      const c = seg(lt, 3.45, 4.0);
      post.rgb += 0.012 * E.inCubic(c);
      post.glitch = Math.max(post.glitch, 0.9 * E.inCubic(c));
      post.zoomBlur += 0.18 * E.inCubic(c);
      post.flash += E.inCubic(seg(lt, 3.7, 4.0)) * 1.05;
      if (lt > 3.6) post.flashColor = [1, 1, 1];
    },
  };
}

function world_hide() { /* le monde partagé est déjà caché par main.js à chaque image */ }
