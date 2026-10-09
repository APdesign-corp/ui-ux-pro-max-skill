// Rig commun aux segments 01-ignite (0→2 s) et 02-orbit (2→5 s).
//
// Une SEULE trajectoire de caméra couvre les 5 premières secondes : T = temps local d'orbit
// (ignite utilise T = lt - 2, donc T ∈ [-2, 0[ pendant ignite). La caméra avance dans la brume
// pendant le titre, accélère quand les lettres explosent vers elle (T → 0), freine pendant que
// les téléphones surgissent de la profondeur, puis part en orbite 360° qui accélère, ralenti
// dramatique (speed ramp) et punch-in sur le téléphone héros.
//
// Tout est fonction PURE du temps (camera(lt) est aussi appelée à lt - 1/60 pour le flou).

import * as THREE from 'three';
import { E, clamp, lerp, seg, speedRamp, noise1, TAU, rng } from '../core/anim.js';
import { BackdropShader, GridFloorShader } from '../engine/shaders.js';

// --------------------------------------------------------------------------- profils de vitesse
// Avancée radiale de la caméra (unités/s) en fonction de τ = T + 2
const VK = [[0, 0.45], [0.75, 1.15], [1.6, 1.75], [1.85, 5.6], [2.0, 7.2], [2.12, 3.6], [2.5, 1.1], [3.0, 0.45], [3.4, 0]];
// Vitesse angulaire de l'orbite (rad/s) en fonction de τ
const WK = [[0, 0], [1.6, 0], [2.0, 0.05], [2.35, 0.32], [2.65, 0.95], [3.4, 2.9], [4.15, 6.3], [4.5, 7.4], [4.57, 7.4],
  [4.64, 0.34], [4.85, 0.24], [5.0, 0.22]];
// Horloge « objets » : temps ralenti pendant le speed ramp (T)
const SK = [[0, 1], [2.55, 1], [2.63, 0.13], [2.85, 0.13], [2.92, 1.6], [3.0, 1.6]];

/** Valeur interpolée (linéaire) d'une table de clés [[t, v], ...]. */
export function keyAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return va + (vb - va) * ((t - a) / (b - a || 1e-9));
    }
  }
  return keys[keys.length - 1][1];
}

/** Horloge déformée des objets (ralenti) : w(0) = 0, w'(0) = 1. */
export const warp = (T) => (T <= 0 ? T : speedRamp(T, SK));

// --------------------------------------------------------------------------- disposition
// Téléphones : az (rad, même repère que la caméra : pos = (r sin az, y, r cos az)), rad, y,
// arrivée (s), allumage de l'écran (s), app, cap / inclinaison propres.
// Index = world.phones[i] : 0 héros titane (avec internes), 1 graphite, 2 vert, 3 titane, 4 graphite.
const LAYOUT_H = [
  { i: 0, az: 0, rad: 0, y: 0, arrive: 0.0, wake: 0.3, app: 'home', yaw0: 0, roll: 0.16, spin: 0 },
  { i: 3, az: 0.6, rad: 2.2, y: 0.46, arrive: 0.035, wake: 0.45, dim: 0.85, app: 'home', yaw0: -0.5, roll: -0.2, spin: 0.55, variant: 2 },
  { i: 4, az: -0.74, rad: 2.3, y: -0.46, arrive: 0.07, wake: 0.6, app: 'pills', yaw0: 0.55, roll: 0.24, spin: -0.5 },
  { i: 1, az: 2.4, rad: 3.95, y: -0.2, arrive: 0.11, wake: 0.75, app: 'find', yaw0: 0.4, roll: -0.12, spin: 0.7 },
  { i: 2, az: 3.75, rad: 2.5, y: 0.3, arrive: 0.15, wake: 0.9, app: 'home', yaw0: -0.3, roll: 0.2, spin: -0.65, variant: 4, dim: 0.55 },
];
// 9:16 : téléphones étagés en hauteur (au-dessus / en dessous du héros), profondeur forte
const LAYOUT_V = [
  { i: 0, az: 0, rad: 0, y: 0, arrive: 0.0, wake: 0.3, app: 'home', yaw0: 0, roll: 0.12, spin: 0 },
  { i: 3, az: 0.55, rad: 1.75, y: 1.62, arrive: 0.035, wake: 0.45, dim: 0.85, app: 'home', yaw0: -0.5, roll: -0.18, spin: 0.55, variant: 2 },
  { i: 4, az: -0.6, rad: 1.85, y: -1.66, arrive: 0.07, wake: 0.6, app: 'pills', yaw0: 0.55, roll: 0.22, spin: -0.5 },
  { i: 1, az: 2.45, rad: 2.6, y: 1.25, arrive: 0.11, wake: 0.75, app: 'find', yaw0: 0.4, roll: -0.12, spin: 0.7 },
  { i: 2, az: 3.9, rad: 2.5, y: -1.3, arrive: 0.15, wake: 0.9, app: 'home', yaw0: -0.3, roll: 0.2, spin: -0.65, variant: 4, dim: 0.55 },
];

export function makeRig(V) {
  const LAY = V ? LAYOUT_V : LAYOUT_H;
  const travel = (T) => speedRamp(T + 2, VK);
  const RB = V ? 3.55 : 3.3;               // rayon d'orbite de base
  const R0 = RB + travel(1.4);             // distance initiale (T = -2)
  const KW = 1;
  const theta = (T) => -0.05 + KW * speedRamp(T + 2, WK);
  const omega = (T) => KW * keyAt(WK, T + 2);

  // pose du ralenti (plan héros penché, contre-plongée)
  const SLOW = V ? { r: 2.1, y: -0.78, ty: 0.06, fov: 48 } : { r: 2.25, y: -0.5, ty: 0.1, fov: 40 };

  // Passages : en fonction de l'AZIMUT de la caméra, le rayon et la hauteur s'écartent pour
  // frôler chaque téléphone (à côté, au-dessus, en dessous). [k, dr (rayon visé - base), dy, sigma]
  const PASS = V
    ? [[1, -0.55, 0.55, 0.32], [3, 0, 2.15, 0.3], [4, 0.05, -1.95, 0.3], [2, -0.45, -0.75, 0.3]]
    : [[1, -0.5, 0.12, 0.32], [3, 0.62, 1.12, 0.3], [4, -0.12, -0.98, 0.3], [2, -0.2, 0.1, 0.3]];
  const wrapA = (a) => a - TAU * Math.round(a / TAU);
  function passBumps(th) {
    let dr = 0, dy = 0;
    for (const [k, r0, y0, sg] of PASS) {
      const g = Math.exp(-((wrapA(th - LAY[k].az) / sg) ** 2));
      dr += r0 * g; dy += y0 * g;
    }
    return [dr, dy];
  }

  function cam(T) {
    // ---- rayon
    let th = theta(T);
    const gate = E.inOutSine(seg(T, 0.45, 0.85));
    const [dr, dy] = passBumps(th);
    let r = R0 - travel(T) + dr * gate;
    // ---- hauteur
    const yA = V ? 0.25 : 0.32;
    let y = lerp(yA, V ? 0.05 : 0.12, E.inOutSine(seg(T, -2, 0.6))) + dy * gate + 0.05 * Math.sin(T * 1.7);
    let ty = V ? y * 0.42 : y * 0.3 - 0.02;
    // ---- convergence vers la pose du ralenti (pendant l'orbite rapide)
    const ks = E.inOutCubic(seg(T, 2.36, 2.62));
    const slowPush = 0.22 * seg(T, 2.6, 2.86);
    r = lerp(r, SLOW.r - slowPush, ks);
    y = lerp(y, SLOW.y + 0.06 * seg(T, 2.6, 2.86), ks);
    ty = lerp(ty, SLOW.ty, ks);
    // ---- punch-in brutal vers le héros
    const kp = E.inQuart(seg(T, 2.85, 3.0));
    const hy = heroBob(T);
    r = lerp(r, 0.6, kp);
    y = lerp(y, hy + 0.02, kp);
    ty = lerp(ty, hy, kp);
    const pos = [r * Math.sin(th), y, r * Math.cos(th)];
    // légère avance de visée (la caméra regarde un peu devant elle pendant l'orbite)
    const lead = 0.06 * clamp(omega(T) / 7) * (1 - ks);
    const target = [Math.sin(th + Math.PI / 2) * lead * r * 0.4, ty, Math.cos(th + Math.PI / 2) * lead * r * 0.4];
    // ---- roulis : inclinaison de virage proportionnelle à la vitesse angulaire, angle hollandais au ralenti
    let roll = 0.035 * Math.sin(T * 1.1 + 0.4) - 0.034 * omega(T) * (1 - ks);
    roll = lerp(roll, V ? 0.14 : 0.19, ks);
    roll += 0.42 * kp;
    // ---- focale
    let fov;
    if (V) fov = lerp(48, 58, E.inOutSine(seg(T, -0.3, 0.35))) - 4 * E.inOutSine(seg(T, 0.6, 1.3));
    else fov = lerp(33, 43, E.inOutSine(seg(T, -0.3, 0.35))) - 5 * E.inOutSine(seg(T, 0.6, 1.3));
    fov = lerp(fov, SLOW.fov, ks);
    fov = lerp(fov, V ? 76 : 64, kp);
    return { pos, target, roll, fov, near: 0.03, far: 400 };
  }

  function heroBob(T) {
    return 0.05 * Math.sin(warp(T) * 1.6);
  }

  // Position d'arrivée lointaine : groupe serré dans l'axe de la caméra (fond de l'image),
  // d'où les téléphones surgissent vers leur place (ce sont les « points lumineux » de la fin d'ignite).
  function farPos(L) {
    const sx = L.rad * Math.sin(L.az), sz = L.rad * Math.cos(L.az);
    return [sx * (V ? 0.9 : 1.5) + (L.i % 2 ? 0.35 : -0.3), L.y * (V ? 2.2 : 3.4) + (V ? 0.3 : 0.15), -44 - L.i * 5];
  }

  /** État d'un téléphone (index dans la disposition) au temps T. */
  function phone(k, T) {
    const L = LAY[k];
    const w = warp(T);
    const ar = E.outExpo(seg(T, L.arrive, L.arrive + 0.62));
    const slot = [L.rad * Math.sin(L.az), L.y + 0.06 * Math.sin(w * 1.3 + k * 1.7), L.rad * Math.cos(L.az)];
    if (k === 0) slot[1] = heroBob(T);
    const far = farPos(L);
    const pos = [lerp(far[0], slot[0], ar), lerp(far[1], slot[1], ar), lerp(far[2], slot[2], ar)];
    let yaw, pitch, roll;
    if (k === 0) {
      // le héros est orienté RELATIVEMENT à la caméra : il tourne sur lui-même pendant l'orbite
      // et présente son écran de 3/4 (rel = -0.42) au moment du ralenti.
      const th = theta(T);
      const rel0 = 0.42 + 5.5 * (1 - ar) ** 2;
      const spinP = E.inOutSine(seg(w, 0.75, 2.58));
      const rel = rel0 - (TAU + 0.84) * spinP + 0.05 * Math.sin(w * 2.1);
      yaw = th + rel;
      pitch = lerp(-0.08, -0.2, seg(w, 2.0, 2.6)) + 0.04 * Math.sin(w * 1.4);
      roll = L.roll + 0.1 * Math.sin(w * 1.25) + 0.16 * E.inOutSine(seg(w, 2.0, 2.6));
    } else {
      yaw = L.yaw0 + L.spin * w + 6.0 * Math.sign(L.spin) * (1 - ar) ** 2;
      pitch = 0.1 * Math.sin(w * 0.9 + k) - 0.05;
      roll = L.roll + 0.08 * Math.sin(w * 1.1 + k * 2.1);
    }
    return { pos, slot, far, yaw, pitch, roll, ar, L };
  }

  return { cam, phone, theta, omega, warp, LAY, farPos, heroBob, travel, R0 };
}

// --------------------------------------------------------------------------- plateau 3D
// Fond sphérique (même dégradé que le fond du studio mais visible dans TOUTES les directions de
// l'orbite), couronne de tubes néon (studio LED), sol grille, brume lumineuse (sprites additifs),
// contre-jour derrière le héros. Une instance par segment (chacune dans le groupe du segment).

let glowTexCache = null;
function glowTexture() {
  if (glowTexCache) return glowTexCache;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTexCache = new THREE.CanvasTexture(c);
  glowTexCache.colorSpace = THREE.SRGBColorSpace;
  return glowTexCache;
}

export function buildStage(ctx) {
  const { W, H, V, cfg } = ctx;
  const root = new THREE.Group();
  const neon = new THREE.Color(cfg.colors.neon);
  const teal = new THREE.Color(cfg.colors.teal);

  // ---- fond sphérique (halo en espace écran)
  const bgMat = new THREE.ShaderMaterial({
    ...BackdropShader,
    uniforms: THREE.UniformsUtils.clone(BackdropShader.uniforms),
    depthWrite: false,
    side: THREE.BackSide,
  });
  bgMat.uniforms.uBg.value = new THREE.Color(cfg.colors.bg);
  bgMat.uniforms.uGlow.value = neon.clone();
  bgMat.uniforms.uGlow2.value = teal.clone();
  bgMat.uniforms.uRes.value = [W, H];
  bgMat.uniforms.uCenter.value = [0.5, 0.5];
  const bg = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), bgMat);
  bg.renderOrder = -10;
  bg.frustumCulled = false;
  root.add(bg);

  // ---- couronne de tubes néon (extrémités fondues : couleurs de sommets, additif)
  const tubeGeo = new THREE.CylinderGeometry(0.026, 0.026, 1, 8, 12, true);
  {
    const pa = tubeGeo.attributes.position;
    const col = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) {
      const k = Math.max(0, 1 - Math.pow(Math.abs(pa.getY(i)) * 2, 3));
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    tubeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const tubes = [];
  const r = rng(77);
  const N = 20;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + (r() - 0.5) * 0.14;
    const rad = (V ? 9 : 11) + r() * 3.5;
    const h = 2.4 + r() * (V ? 8 : 5.5);
    const yc = (r() - 0.45) * (V ? 4 : 2.6);
    const white = i % 4 === 1;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    });
    const m = new THREE.Mesh(tubeGeo, mat);
    m.position.set(rad * Math.sin(a), yc, rad * Math.cos(a));
    m.scale.y = h;
    m.rotation.z = (r() - 0.5) * 0.12;
    root.add(m);
    tubes.push({ m, mat, a, base: white ? new THREE.Color(1, 1, 1).multiplyScalar(1.1) : neon.clone().multiplyScalar(0.8 + 0.8 * r()), ph: r() * 10, order: r() });
  }

  // ---- sol grille (rappel de la grille du site)
  const gridMat = new THREE.ShaderMaterial({
    ...GridFloorShader,
    uniforms: THREE.UniformsUtils.clone(GridFloorShader.uniforms),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  gridMat.uniforms.uColor.value = neon.clone().multiplyScalar(0.16);
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = V ? -2.75 : -1.35;
  root.add(grid);

  // ---- brume lumineuse (sprites additifs, très doux)
  const hz = [];
  const r2 = rng(31);
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.SpriteMaterial({
      map: glowTexture(), color: i % 3 === 2 ? teal.clone() : neon.clone(), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 0,
    });
    const s = new THREE.Sprite(mat);
    const a = (i / 9) * TAU + r2() * 0.5;
    const rad = 5 + r2() * 3;
    s.position.set(rad * Math.sin(a), (r2() - 0.5) * (V ? 4 : 2.2), rad * Math.cos(a));
    const sc = 5 + r2() * 5;
    s.scale.set(sc, sc * (V ? 1.6 : 0.9), 1);
    root.add(s);
    hz.push({ s, mat, base: 0.018 + r2() * 0.025 });
  }

  // ---- contre-jour : halo derrière le héros (occulté par le téléphone)
  const backMat = new THREE.SpriteMaterial({
    map: glowTexture(), color: neon.clone(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
  });
  const back = new THREE.Sprite(backMat);
  root.add(back);
  const back2Mat = backMat.clone();
  back2Mat.color = new THREE.Color(1, 1, 1);
  const back2 = new THREE.Sprite(back2Mat);
  root.add(back2);

  return {
    root,
    /**
     * s = { bg (intensité du halo de fond), tubes (0..1), tubesOn (0..1 : allumage en cascade),
     *       grid, haze, back: { pos:[x,y,z], k, scale } , t }
     */
    update(s) {
      const t = s.t || 0;
      bgMat.uniforms.uIntensity.value = s.bg ?? 1;
      bgMat.uniforms.uTime.value = t;
      bgMat.uniforms.uCenter.value = s.bgCenter || [0.5, 0.52];
      bg.visible = (s.bg ?? 1) > 0.001;
      const tk = s.tubes ?? 1, on = s.tubesOn ?? 1;
      for (const tb of tubes) {
        const lit = clamp((on * 1.25 - tb.order * 0.25) * 4) * tk;
        const fl = 0.82 + 0.18 * noise1(t * 6 + tb.ph);
        tb.m.visible = lit > 0.002;
        tb.mat.color.copy(tb.base).multiplyScalar(lit * fl);
      }
      grid.visible = (s.grid ?? 0) > 0.002;
      gridMat.uniforms.uOpacity.value = s.grid ?? 0;
      for (const h of hz) {
        h.mat.opacity = h.base * (s.haze ?? 0);
        h.s.visible = h.mat.opacity > 0.002;
      }
      const b = s.back;
      back.visible = back2.visible = !!b && b.k > 0.002;
      if (b && b.k > 0.002) {
        back.position.set(...b.pos);
        back.scale.set(b.scale, b.scale * 1.25, 1);
        backMat.opacity = 0.2 * b.k;
        back2.position.set(...b.pos);
        back2.scale.set(b.scale * 0.35, b.scale * 0.5, 1);
        back2Mat.opacity = 0.14 * b.k;
      }
    },
  };
}
