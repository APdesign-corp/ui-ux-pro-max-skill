// SEGMENT « roll » (5 → 8 s) — RETOURNEMENT : roll 360° à travers un essaim de téléphones,
// whip pan qui masque l'arrivée sur le héros penché, redressement sur impact, « Les derniers
// smartphones. » tapé + mot géant 3D SMARTPHONES qui passe DERRIÈRE les téléphones,
// puis TRAVERSÉE 1 : zoom accéléré dans l'écran du héros (search → portal), flash 1.0 à 8.00.
//
// Temps locaux :
//   0.00–1.00  roll 360° en avançant dans l'essaim (phones[1..5]), flash 0.8 → 0 en 0.25 s
//   1.00–1.20  whip pan latéral (flou horizontal énorme) vers le héros (phones[0])
//   1.20       IMPACT : le monde se redresse (roll qui claque), onde de choc
//   1.20–2.30  plan produit : héros penché qui pivote, texte tapé, mot géant 3D, app search
//   2.30–3.00  zoom accéléré (inExpo) dans l'écran, toucher, portal, débordement, flash 1.0

import { E, clamp, lerp, seg, win, pulse, noise1, TAU, rgba } from '../core/anim.js';
import { setFont, textWidth, drawText, radialGlow, sparks, shockRing, eyebrow } from '../core/draw.js';
import { C, speedLines } from '../core/type.js';
import { PHONE } from '../world/phone.js';
import { drawScreenApp } from '../world/screens.js';
import {
  smoother, typeLines, scrimLinear, godRays, glowTexture, glowSprite, giantWord, whipStreaks, glowQuad, makeSky,
} from './03-roll-kit.js';

export const cues = [
  { t: 0.0, type: 'impact', gain: 1.1 },
  { t: 0.02, type: 'whoosh', dur: 0.95, gain: 0.9 },
  { t: 0.3, type: 'swish', gain: 0.55, pan: -0.6 },
  { t: 0.5, type: 'swish', gain: 0.6, pan: 0.6 },
  { t: 0.72, type: 'swish', gain: 0.5, pan: -0.3 },
  { t: 1.0, type: 'whip', gain: 1.1, pan: 0.7 },
  { t: 1.2, type: 'impact', gain: 0.9 },
  { t: 1.2, type: 'hit', gain: 1 },
  { t: 1.26, type: 'type', dur: 0.8, cps: 30, gain: 0.8 },
  { t: 1.3, type: 'whoosh', dur: 1.1, gain: 0.45, pan: -0.4 },
  { t: 1.8, type: 'swish', gain: 0.6 },
  { t: 2.12, type: 'pop', gain: 0.8 },
  { t: 2.25, type: 'riser', dur: 0.75, gain: 1 },
  { t: 2.5, type: 'click', gain: 0.9 },
  { t: 2.55, type: 'suck', dur: 0.45, gain: 1 },
];

// Repères temporels
const T_WHIP = 1.0, T_HIT = 1.2, T_DIVE = 2.3, T_END = 3.0;

export default function create(ctx) {
  const { THREE, world, V, L } = ctx;
  const group = new THREE.Group();

  // ------------------------------------------------------------------ décor propre au segment
  const sky = makeSky(THREE, { d1: [0.5, 0.5, -1], d2: [-1, -0.4, 0.3], d3: [0.9, -0.5, -0.4] });
  group.add(sky.mesh);

  // lumières (visibles uniquement pendant le segment, avec le groupe)
  const lKey = new THREE.PointLight(0xffffff, 0, 10, 2);
  const lRim = new THREE.PointLight(new THREE.Color(C.neon), 0, 10, 2);
  const lTeal = new THREE.PointLight(new THREE.Color(C.teal), 0, 10, 2);
  group.add(lKey, lRim, lTeal);

  // halo de contre-jour derrière le héros (occulté par le téléphone → silhouette)
  const haloTex = glowTexture(THREE, 256, [
    [0, 'rgba(235,255,235,1)'], [0.12, 'rgba(120,255,110,0.75)'], [0.4, 'rgba(57,255,20,0.22)'], [1, 'rgba(20,224,160,0)'],
  ]);
  const halo = glowSprite(THREE, haloTex, '#ffffff', 0.6);
  const halo2 = glowSprite(THREE, haloTex, C.teal, 0.35);
  group.add(halo, halo2);

  // tubes néon d'arrière-plan (practicals qui brillent)
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(1.6) });
  const tubeMatW = new THREE.MeshBasicMaterial({ color: new THREE.Color('#eaffea').multiplyScalar(1.3) });
  const tubeGeo = new THREE.BoxGeometry(0.03, 1, 0.03);
  const tubes = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(tubeGeo, i === 1 ? tubeMatW : tubeMat);
    group.add(m);
    return m;
  });

  // mot géant SMARTPHONES (vraie profondeur : les téléphones le masquent)
  const word = giantWord(THREE, 'SMARTPHONES', { weight: 900, tracking: -0.03 });
  group.add(word.mesh);

  // ------------------------------------------------------------------ géométrie de mise en scène
  const H0 = new THREE.Vector3(0, 0, 0);               // héros
  const AX = V ? -3.0 : -3.3;                            // axe de l'essaim (phase A)
  const A_Z0 = 9.4, A_Z1 = 4.4;

  // essaim de la phase A : hélice de téléphones autour de l'axe de vol, écrans tournés vers la caméra
  const RX = V ? 0.78 : 1.12, RY = V ? 1.25 : 0.92;
  const APPS = ['list', 'counter', 'search', 'pills', 'home'];
  const FIELD = [1, 2, 3, 4, 5].map((i, k) => ({
    i, th: 0.5 + k * 2.2, d0: 1.3 + k * 1.5, app: APPS[k], spin: (k % 2 ? -1 : 1) * (1.2 + k * 0.25),
  }));
  const SPAN = 7.5, PH_V = 3.2;                          // les téléphones foncent aussi vers la caméra
  // éclats de lumière 3D (traînées fixes dans l'espace : la caméra les traverse en roulant)
  const shardCount = 90;
  const shardGeo = new THREE.BoxGeometry(0.014, 0.014, 1);
  const shardMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff') });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
  {
    const r = (() => { let s0 = 4242; return () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647); })();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const cols = [new THREE.Color(C.neon).multiplyScalar(1.5), new THREE.Color('#eaffea').multiplyScalar(1.5), new THREE.Color(C.teal).multiplyScalar(1.2)];
    for (let k = 0; k < shardCount; k++) {
      const a = r() * TAU, rad = 1.5 + r() * 2.6;
      p.set(AX + Math.cos(a) * rad * (V ? 0.8 : 1.2), Math.sin(a) * rad * (V ? 1.3 : 0.9), -3 + r() * 14);
      sc.set(1, 1, 0.3 + r() * 1.4);
      m.compose(p, q, sc);
      shards.setMatrixAt(k, m);
      shards.setColorAt(k, cols[k % 3]);
    }
  }
  shards.frustumCulled = false;
  group.add(shards);

  // plan produit (phase C) : orbite autour du héros
  const ANG0 = V ? -1.05 : -1.18, ANG1 = V ? -0.36 : -0.42;
  const R0 = V ? 2.95 : 2.75, R1 = V ? 2.45 : 2.3;
  const HY0 = V ? -0.5 : -0.6, HY1 = V ? -0.3 : -0.36;
  const angMid = (ANG0 + ANG1) / 2;
  const fwdMid = new THREE.Vector3(-Math.sin(angMid), 0, -Math.cos(angMid)); // direction de visée moyenne
  const rightMid = new THREE.Vector3(Math.cos(angMid), 0, -Math.sin(angMid));
  const at = (a, b, c) => [H0.x + rightMid.x * a + fwdMid.x * c, H0.y + b, H0.z + rightMid.z * a + fwdMid.z * c];

  // ------------------------------------------------------------------ caméra (PURE)
  function camA(lt) {
    const u = seg(lt, 0, T_WHIP);
    const z = A_Z0 - (A_Z0 - A_Z1) * (0.4 * u + 0.6 * smoother(u));
    const x = AX + 0.2 * Math.sin(u * 4.2), y = 0.08 * Math.sin(u * 6.3 + 1);
    return {
      pos: [x, y, z],
      target: [AX + 0.35 * Math.sin(u * 3 + 0.6), 0.05, z - 6],
      roll: TAU * (0.12 * u + 0.88 * smoother(u)),
      fov: V ? 62 : 46,
    };
  }
  function camCbase(lt) {
    const c = seg(lt, T_HIT, T_DIVE + 0.7);
    const e = 0.55 * c + 0.45 * E.outCubic(c);
    const ang = lerp(ANG0, ANG1 + (ANG1 - ANG0) * 0.25, e);
    const R = lerp(R0, R1, e);
    const hy = lerp(HY0, HY1, e) + 0.05 * Math.sin(lt * 2.2);
    const pos = [H0.x + Math.sin(ang) * R, H0.y + hy, H0.z + Math.cos(ang) * R];
    const right = [Math.cos(ang), 0, -Math.sin(ang)];
    const off = V ? 0.0 : -0.66;               // 16:9 : héros à droite, texte à gauche
    const ty = V ? -0.52 : 0.02;               // 9:16 : héros haut, texte en bas
    const target = [H0.x + right[0] * off, H0.y + ty, H0.z + right[2] * off];
    return { pos, target, fov: V ? 52 : 40 };
  }
  const dutch = (lt) => 0.14 * (1 - E.inOutCubic(seg(lt, 1.8, 2.28))) + 0.025 * Math.sin(lt * 2.4);
  function camC(lt) {
    const b = camCbase(lt);
    const snap = E.outBack(seg(lt, T_HIT, T_HIT + 0.14), 1.6);
    b.roll = TAU + lerp(0.62, dutch(lt), snap);
    return b;
  }
  const _wa = new THREE.Vector3(), _wb = new THREE.Vector3(), _wt = new THREE.Vector3();
  function camW(lt) {
    const w = seg(lt, T_WHIP, T_HIT), e = E.inOutCubic(w);
    const a = camA(T_WHIP), c = camCbase(T_HIT);
    const pos = [lerp(a.pos[0], c.pos[0], e), lerp(a.pos[1], c.pos[1], e), lerp(a.pos[2], c.pos[2], e)];
    const da = _wa.fromArray(a.target).sub(_wt.fromArray(a.pos)).normalize();
    const dc = _wb.fromArray(c.target).sub(_wt.fromArray(c.pos)).normalize();
    const d = da.lerp(dc, e).normalize().multiplyScalar(3);
    return {
      pos, target: [pos[0] + d.x, pos[1] + d.y, pos[2] + d.z],
      roll: TAU + 0.62 * E.outQuad(w), fov: lerp(a.fov, c.fov, e),
    };
  }
  // fin du plan produit → direction de plongée
  const CEND = camCbase(T_DIVE);
  const nDive = new THREE.Vector3(...CEND.pos).sub(H0).normalize();          // normale de l'écran du héros en fin de pivot
  const SZ = PHONE.D / 2 + 0.0016;
  const S = H0.clone().addScaledVector(nDive, SZ);                             // centre de l'écran
  const END = S.clone().addScaledVector(nDive, 0.05);
  const BEHIND = S.clone().addScaledVector(nDive, -1.2);
  function camD(lt) {
    const s = seg(lt, T_DIVE, T_END);
    const k = 0.5 * E.inCubic(s) + 0.5 * E.inExpo(s);
    const b = camCbase(lt);
    const tk = E.inOutCubic(seg(lt, T_DIVE, 2.72));
    return {
      pos: [lerp(b.pos[0], END.x, k), lerp(b.pos[1], END.y, k), lerp(b.pos[2], END.z, k)],
      target: [lerp(b.target[0], BEHIND.x, tk), lerp(b.target[1], BEHIND.y, tk), lerp(b.target[2], BEHIND.z, tk)],
      roll: TAU + dutch(lt) + 0.3 * E.inCubic(s),
      fov: b.fov + 7 * E.inExpo(s),
      near: 0.004,
      far: 120,
    };
  }
  function camera(lt) {
    if (lt < T_WHIP) return camA(lt);
    if (lt < T_HIT) return camW(lt);
    if (lt < T_DIVE) return camC(lt);
    return camD(lt);
  }

  // ------------------------------------------------------------------ pose du héros (pure)
  const _e = new THREE.Euler(), _qC = new THREE.Quaternion(), _qF = new THREE.Quaternion(), _m = new THREE.Matrix4();
  _m.lookAt(new THREE.Vector3(...CEND.pos), H0, new THREE.Vector3(0, 1, 0));
  _qF.setFromRotationMatrix(_m);                                                // héros face à la plongée
  function heroQuat(lt, out) {
    const c = seg(lt, T_WHIP, T_DIVE + 0.7);
    const st = E.outCubic(seg(lt, 1.85, 2.3));                                  // se redresse quand le contenu apparaît
    const ang = lerp(ANG0, ANG1, 0.55 * c + 0.45 * E.outCubic(c));
    const yaw = ang + lerp(0.72, 0.42, st) + 0.07 * Math.sin(lt * 2.7);
    const rz = lerp(-0.36, -0.1, st) + 0.035 * Math.sin(lt * 3.3);
    const rx = lerp(-0.24, -0.1, st) + 0.04 * Math.sin(lt * 2.1 + 1);
    _e.set(rx, yaw, rz);
    out.setFromEuler(_e);
    if (lt > T_DIVE) out.slerp(_qF, E.inOutCubic(seg(lt, T_DIVE, 2.64)));
    return out;
  }

  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => new THREE.Vector3(a * (PHONE.W / 2 - 0.03), b * (PHONE.H / 2 - 0.03), SZ));

  // ------------------------------------------------------------------ typographie (mise en page)
  const S_ = L.safe, u = L.u;
  const probe = document.createElement('canvas').getContext('2d');
  let size2 = V ? 176 * u : 150 * u;
  const maxW = V ? S_.w * 0.98 : S_.w * 0.62;
  size2 = Math.min(size2, (maxW / textWidth(probe, 'smartphones.', 100, 900, -0.02)) * 100);
  const size1 = V ? size2 * 0.74 : size2 * 0.66;
  const tx = V ? S_.l + 6 * u : S_.l + 18 * u;
  const by1 = V ? L.H * 0.615 : L.H * 0.565;
  const by2 = by1 + size2 * 1.0;
  const by3 = by2 + (V ? 88 : 78) * u;
  const subSize = (V ? 50 : 44) * u;

  // ------------------------------------------------------------------ update
  function update(f) {
    const { lt, t, fx, ui, post, W, H } = f;
    const phones = f.world.phones;
    const cam = f.camera;
    const studio = f.world.studio;
    studio.update(t, {
      backdrop: false, grid: 0, beams: 0, dust: 0.5, motes: 0.35,
      env: 1.15, envRot: lt * 1.3, rim: lt < T_WHIP ? 0.35 : 0.55, key: 1.1, glow: 0,
    });
    sky.mesh.position.copy(cam.position);
    sky.mat.uniforms.uTime.value = t;
    sky.mat.uniforms.uK.value = 1 + 0.6 * pulse(lt, 0, 0.01, 0.3) + 0.8 * E.inQuad(seg(lt, 2.4, 3));

    // ---------------- essaim (phase A)
    shards.visible = lt < T_HIT;
    if (lt < T_HIT) {
      const ca = camA(Math.min(lt, T_WHIP));
      const closing = (A_Z0 - ca.pos[2]) + PH_V * Math.min(lt, T_HIT);
      FIELD.forEach((p, k) => {
        const ph = phones[p.i];
        // distance devant la caméra, recyclée : l'essaim ne s'épuise jamais pendant le roll
        const d = ((((p.d0 - closing) + 0.7) % SPAN) + SPAN) % SPAN - 0.7;
        const sc = 1 - smoother(seg(d, SPAN - 2.2, SPAN - 0.75));
        ph.group.visible = sc > 0.01;
        const th = p.th + lt * 0.9;
        const z = ca.pos[2] - d;
        ph.group.position.set(AX + Math.cos(th) * RX, Math.sin(th) * RY + 0.06 * Math.sin(lt * 3 + k), z);
        ph.group.scale.setScalar(Math.max(0.01, sc));
        // l'écran regarde un point de l'axe en amont (vers la caméra), puis tourne sur lui-même
        ph.group.lookAt(AX, 0, z + 3.2);
        ph.group.rotateZ(th + p.spin * lt);
        ph.group.rotateY(0.45 * Math.sin(lt * 2.4 + k * 1.7));
        ph.screen.draw(p.app, 0.9 + lt + k * 0.12, { variant: k, title: 'Services', label: 'CHARGEMENT', to: 100, text: 'Choisis ton smartphone', gridAt: 0.2 });
      });
      lKey.intensity = 18; lKey.position.set(ca.pos[0], ca.pos[1] + 0.9, ca.pos[2] - 1.6);
      lRim.intensity = 16; lRim.position.set(ca.pos[0] - 1.2, -0.8, ca.pos[2] - 5.5);
      lTeal.intensity = 10; lTeal.position.set(ca.pos[0] + 1.4, -0.6, ca.pos[2] - 4.5);
    }

    // ---------------- plan produit (phases W, C, D)
    const hero = phones[0];
    if (lt >= T_WHIP) {
      hero.group.visible = true;
      hero.group.position.copy(H0);
      heroQuat(lt, hero.group.quaternion);
      hero.group.position.y += 0.05 * Math.sin(lt * 1.9);
      hero.group.updateMatrixWorld(true);

      // écran : app search qui tape « Choisis ton smartphone », toucher, puis portail qui envahit
      const at0 = lt - T_WHIP;
      const touch = lt >= 2.5 ? { x: 0.27, y: 0.345, t: lt - 2.5 } : undefined;
      hero.screen.draw('search', at0, { text: 'Choisis ton smartphone', cps: 24, delay: 0.12, gridAt: 0.75, touch });
      const pa = E.outCubic(seg(lt, 2.52, 2.7));
      if (pa > 0) {
        const g = hero.screen.g;
        g.save();
        g.globalAlpha = pa;
        drawScreenApp(g, hero.screen.canvas.width, hero.screen.canvas.height, 'portal', lt, { p: seg(lt, 2.55, 2.97) });
        g.restore();
      }

      // téléphones d'arrière-plan (profondeur, masquent le mot géant)
      const bg = V
        ? [[1, -0.72, 1.62, 1.7, 'list'], [2, 0.78, -1.5, 2.1, 'counter'], [4, -0.35, -2.75, 3.4, 'pills']]
        : [[1, -1.55, 0.6, 1.6, 'list'], [2, 1.32, -0.55, 2.2, 'counter'], [4, 0.3, 1.25, 3.6, 'pills']];
      bg.forEach(([i, a, b, c, app], k) => {
        const ph = phones[i];
        ph.group.visible = true;
        const p = at(a, b + 0.07 * Math.sin(lt * 2 + k), c);
        ph.group.position.set(p[0], p[1], p[2]);
        ph.group.rotation.set(-0.15 + 0.1 * Math.sin(lt + k), angMid + 0.7 - k * 0.9 + lt * (0.5 + k * 0.15), 0.25 - k * 0.2);
        ph.screen.draw(app, 0.4 + (lt - 1) + k * 0.2, { title: 'Services', label: 'CHARGEMENT', to: 100 });
      });

      // mot géant : passe derrière les téléphones
      const wp = seg(lt, 1.05, 2.55);
      const wa = win(lt, 1.05, 1.35, 2.3, 2.6);
      word.mesh.visible = wa > 0.002;
      if (word.mesh.visible) {
        const scroll = lerp(1, -1, wp);
        const width = V ? 9.5 : 10.5;
        word.mesh.scale.setScalar(width);
        if (V) {
          const p = at(0.1, scroll * 5.2, 3.3);
          word.mesh.position.set(p[0], p[1], p[2]);
          word.mesh.rotation.set(0, angMid, Math.PI / 2);
        } else {
          const p = at(scroll * 5.6, 0.2, 3.6);
          word.mesh.position.set(p[0], p[1], p[2]);
          word.mesh.rotation.set(0, angMid, 0);
        }
        word.mat.uniforms.uOpacity.value = wa;
        word.mat.uniforms.uSweep.value = lerp(-0.2, 1.2, (lt * 0.9) % 1);
      }

      // halo de contre-jour + tubes néon
      const hp = at(0.18, 0.35, 0.9);
      halo.position.set(hp[0], hp[1], hp[2]);
      halo.quaternion.copy(cam.quaternion);
      halo.scale.setScalar(V ? 2.4 : 2.1);
      halo.material.opacity = (0.22 + 0.05 * Math.sin(lt * 5)) * (1 - 0.8 * seg(lt, 2.4, 2.8));
      const hp2 = at(-1.2, -0.9, 2.4);
      halo2.position.set(hp2[0], hp2[1], hp2[2]);
      halo2.quaternion.copy(cam.quaternion);
      halo2.scale.setScalar(4);
      halo2.material.opacity = 0.05;
      const tubeDefs = V
        ? [[1.05, 0.6, 2.9, 0, 5.5], [-1.15, -0.4, 3.4, 0.15, 6], [0.0, -1.9, 2.6, Math.PI / 2 - 0.25, 4]]
        : [[2.1, 0.0, 3.0, 0.08, 5.5], [-2.3, 0.3, 3.6, -0.12, 6], [0.4, -1.55, 2.6, Math.PI / 2 - 0.1, 7]];
      tubeDefs.forEach(([a, b, c, rz, len], k) => {
        const m = tubes[k];
        m.visible = true;
        const p = at(a + 0.25 * Math.sin(lt * 0.9 + k), b, c);
        m.position.set(p[0], p[1], p[2]);
        m.rotation.set(0, angMid, rz + 0.05 * Math.sin(lt + k));
        m.scale.set(1, len * (0.6 + 0.4 * E.outCubic(seg(lt, 1.15 + k * 0.08, 1.6 + k * 0.08))), 1);
      });

      // lumières studio produit : rim blanc en contre-jour, néon latéral, teal au sol
      const kp = at(0.85, 1.35, 0.85);
      lKey.intensity = 42; lKey.position.set(kp[0], kp[1], kp[2]);
      const rp = at(-1.4, -0.4, 0.45);
      lRim.intensity = 12; lRim.position.set(rp[0], rp[1], rp[2]);
      const tp = at(1.3 * Math.cos(lt * 2), -1.1, -0.6 + 0.6 * Math.sin(lt * 2));
      lTeal.intensity = 9; lTeal.position.set(tp[0], tp[1], tp[2]);
    }
    halo.visible = halo2.visible = lt >= T_WHIP;
    if (lt < T_WHIP) { word.mesh.visible = false; for (const m of tubes) m.visible = false; }

    // ---------------- POST / FX
    post.bloom = 0.62;
    post.bloomRadius = 0.32;
    post.vignette = 1.0;
    post.flashColor = [0.85, 1, 0.85];
    // flash d'arrivée (raccord orbit → roll) : 0.8 → 0 en 0.25 s
    post.flash = 0.8 * (1 - E.outCubic(seg(lt, 0, 0.25)));
    post.ca += 0.003 * pulse(lt, 0, 0.01, 0.25);

    const cx = W / 2, cy = H / 2;
    if (lt < T_WHIP + 0.05) {
      // roll : lignes de vitesse + onde de choc d'impact + gerbe
      speedLines(fx, W, H, t, 0.62 * (1 - seg(lt, 0.75, 1.0)) + 0.25, { count: 120, speed: 1.8 });
      shockRing(fx, cx, cy, lt, f, { dur: 0.5, radius: 1100, width: 18 });
      sparks(fx, cx, cy, lt, f, { count: 70, life: 0.55, speed: 2200 });
      post.rollBlur *= 1.15;
    }
    // whip pan : flou horizontal énorme + traînées
    const wk = Math.sin(Math.PI * seg(lt, T_WHIP - 0.02, T_HIT + 0.02));
    if (wk > 0) {
      const sgn = post.blur[0] === 0 ? -1 : Math.sign(post.blur[0]);
      post.blur[0] += sgn * 0.075 * wk;
      post.blur[1] *= 0.4;
      whipStreaks(fx, W, H, t, wk * 0.6, f.u, 9);
      post.flash = Math.max(post.flash, 0.08 * wk);
      post.uiBlur = 1;
    }
    // impact du redressement
    post.flash = Math.max(post.flash, 0.28 * pulse(lt, T_HIT, 0.012, 0.08));
    if (lt >= T_HIT) {
      const hc = f.project([H0.x, H0.y, H0.z]);
      shockRing(fx, hc[0], hc[1], lt - T_HIT, f, { dur: 0.55, radius: 900, width: 14, alpha: 0.8 });
      sparks(fx, hc[0], hc[1], lt - T_HIT, f, { count: 50, life: 0.45, speed: 1700, seed: 13 });
      post.shock = [hc[0] / W, 1 - hc[1] / H, 0.05 + 0.5 * E.outCubic(seg(lt, T_HIT, T_HIT + 0.45)), 1 - seg(lt, T_HIT, T_HIT + 0.45)];
    }

    if (lt >= T_HIT && lt < T_END) {
      // contre-jour : rayons depuis le halo
      const hp = at(0.18, 0.35, 0.9);
      const hc = f.project(hp);
      if (hc[2] < 1) godRays(fx, hc[0], hc[1], Math.max(W, H) * 0.6, t, 0.12 * (1 - seg(lt, 2.4, 2.7)), { count: 14, spin: 0.25 });
      // profondeur de champ : net sur le héros
      const dist = cam.position.distanceTo(H0);
      post.dof = { focus: dist, aperture: lt < T_DIVE ? 0.016 : 0.004, maxblur: 0.008 };
      if (lt < T_DIVE) post.uiBlur = 0.12;
    }

    // ---------------- typographie (ui)
    if (lt >= 1.22 && lt < 2.6) {
      const out = seg(lt, 2.32, 2.54);
      const oe = E.inCubic(out);
      ui.save();
      // la typo s'envole vers la caméra avec la plongée
      const scx = V ? W / 2 : tx + size2 * 2.5, scy = by2;
      ui.translate(scx, scy);
      ui.scale(1 + 0.9 * oe, 1 + 0.9 * oe);
      ui.translate(-scx, -scy);
      // voile de lisibilité
      const sa = 0.55 * win(lt, 1.22, 1.4, 2.4, 2.65);
      if (V) scrimLinear(ui, 0, H * 0.94, 0, H * 0.5, sa);
      else scrimLinear(ui, 0, 0, W * 0.62, 0, sa);
      eyebrow(ui, '01 — CHOISIR', tx, by1 - size1 * 1.05, lt - 1.25, f, { size: V ? 30 : 26, alpha: 1 - oe });
      typeLines(ui, [
        { str: 'Les derniers', x: tx, y: by1, size: size1, weight: 300, tracking: -0.01 },
        { str: 'smartphones.', x: tx, y: by2, size: size2, weight: 900, tracking: -0.02, highlight: 0 },
      ], { t: lt - 1.26, cps: 30, out: oe, hlDelay: 0.04 });
      // « Neufs & reconditionnés » (Poppins 300) avec trait néon
      const st = lt - 1.8;
      if (st > 0) {
        const lp = E.outExpo(seg(st, 0, 0.5));
        ui.globalAlpha = 1 - oe;
        ui.fillStyle = C.neon;
        ui.fillRect(tx, by3 - subSize * 0.38, 46 * u * lp, 3 * u);
        ui.globalAlpha = 1;
        drawText(ui, 'Neufs & reconditionnés', tx + 62 * u, by3, {
          size: subSize, weight: 300, tracking: 0.02, color: C.white, t: st, mode: 'rise', stagger: 0.018, dur: 0.45,
          alpha: 1 - oe,
        });
      }
      ui.restore();
    }

    // ---------------- TRAVERSÉE 1 : l'écran déborde et envahit le cadre
    if (lt >= T_DIVE) {
      const s = seg(lt, T_DIVE, T_END);
      const pc = corners.map((c) => f.project(_v.copy(c).applyMatrix4(hero.group.matrixWorld).toArray()));
      const sc = f.project(_v2.copy(S).toArray());
      post.zoomCenter = [sc[0] / W, 1 - sc[1] / H];
      post.zoomBlur += 0.08 * E.inCubic(s);
      const ov = E.inCubic(seg(lt, 2.6, T_END));
      if (pc.every((p) => p[2] < 1)) {
        glowQuad(fx, pc, sc[0], sc[1], 1 + 0.9 * ov, Math.max(W, H) * (0.25 + 0.6 * ov), 0.28 * ov, '#ffffff', C.neon2);
      }
      radialGlow(fx, sc[0], sc[1], Math.max(W, H) * (0.15 + 0.5 * ov), C.neon, 0.22 * ov);
      speedLines(fx, W, H, t, 0.15 + 0.7 * E.inQuad(s), { cx: sc[0] / W, cy: sc[1] / H, count: 140, speed: 2.4, seed: 33 });
      post.flash = Math.max(post.flash, 1.0 * E.inCubic(seg(lt, 2.82, 2.985)));
      post.bloom = 0.62 + 0.4 * s;
      post.ca += 0.003 * E.inCubic(seg(lt, 2.62, T_END));
      post.uiBlur = 1;
    }
  }

  return {
    group, camera,
    update(f) {
      update(f);
      // la typo ne doit jamais virer au magenta : CA sous le seuil du calque ui tant qu'un texte est visible
      if (f.lt >= 1.22 && f.lt < 2.6) f.post.ca = Math.min(f.post.ca, 0.0019);
    },
  };
}
