// SEGMENT « gear » (18 → 22 s) — 03 — S'ÉQUIPER : montage ultra rapide des accessoires.
//
// Un seul plan continu : la caméra orbite autour du point focal du plateau avec des départs
// explosifs SUR CHAQUE TEMPS (120 BPM, 0.5 s) puis un ralenti (speed ramp), des changements de
// direction brutaux, des passages au-dessus / en dessous / à travers les objets.
//   0.00  arrivée dans le whip pan de glass (flou énorme qui se résorbe en 0.15 s, flash 0.5 → 0)
//         la coque arrive de derrière la caméra en tournoyant…
//   0.50  … et se clipse sur le téléphone : COQUES (slam)
//   1.00  direction inversée, passage au-dessus du câble : CHARGEURS (éclairs dans le câble)
//   1.50  plongée sous le boîtier qui s'ouvre, écouteurs éjectés : ÉCOUTEURS
//   2.00  le casque fonce sur la caméra qui passe sous l'arceau : « Accessoires & multimédia »
//   2.50  le téléphone héros atterrit, les accessoires orbitent autour ; ÉTAPE 4 DE L'HISTOIRE :
//         page du magasin → défilement → toucher « Itinéraire » → carte, la ligne trace le chemin
//   3.30  il bascule à plat sur le sol brillant pendant que la caméra monte (grue) ;
//   3.60  CHUTE LIBRE vers l'écran (carte de nuit) qui remplit le cadre à 4.00 → city.
//
// camera(lt) est PURE. Rien n'est créé dans update().

import { E, clamp, lerp, seg, win, pulse, rng, rgba, noise1, TAU } from '../core/anim.js';
import { setFont, textWidth, fitSize, radialGlow, sparks, shockRing, eyebrow } from '../core/draw.js';
import { C, speedLines, maskReveal } from '../core/type.js';
import { createAccessories } from '../world/accessories.js';
import { PHONE } from '../world/phone.js';
import { STORE_BTN } from '../world/screens.js';
import { GridFloorShader } from '../engine/shaders.js';
import {
  track, DIVE, diveEndDist, makeSky, glowTexture, glowPlane, neonTubeGeometry,
  edgeFlash, whipStreaks, godRays, withShadow, slamWord,
} from './07-gear-kit.js';

export const cues = [
  { t: 0.0, type: 'whip', gain: 1.1 },
  { t: 0.02, type: 'whoosh', dur: 0.42, gain: 0.8, pan: 0.4 },
  { t: 0.5, type: 'snap', gain: 1 },
  { t: 0.5, type: 'hit', gain: 1 },
  { t: 0.9, type: 'whoosh', dur: 0.14, gain: 0.7, pan: 0.6 },
  { t: 1.0, type: 'hit', gain: 1 },
  { t: 1.0, type: 'glitch', gain: 0.6 },
  { t: 1.02, type: 'zap', gain: 0.9 },
  { t: 1.25, type: 'zap', gain: 0.6 },
  { t: 1.42, type: 'whoosh', dur: 0.12, gain: 0.6, pan: -0.5 },
  { t: 1.5, type: 'hit', gain: 1 },
  { t: 1.54, type: 'pop', gain: 0.9 },
  { t: 1.62, type: 'swish', gain: 0.7, pan: -0.7 },
  { t: 1.7, type: 'swish', gain: 0.7, pan: 0.7 },
  { t: 2.0, type: 'glitch', gain: 1 },
  { t: 2.0, type: 'whoosh', dur: 0.4, gain: 1 },
  { t: 2.25, type: 'swish', gain: 0.6 },
  { t: 2.5, type: 'hit', gain: 1.1 },
  { t: 2.5, type: 'whoosh', dur: 0.3, gain: 0.6, pan: -0.4 },
  { t: 2.56, type: 'swish', gain: 0.6 },
  { t: 2.75, type: 'whoosh', dur: 0.12, gain: 0.5, pan: 0.5 },
  { t: 2.8, type: 'click', gain: 1 },
  { t: 2.96, type: 'data', dur: 0.48, gain: 0.7 },
  { t: 3.0, type: 'glitch', gain: 0.6 },
  { t: 3.3, type: 'riser', dur: 0.7, gain: 1.2 },
  { t: 3.3, type: 'whoosh', dur: 0.3, gain: 0.8 },
  { t: 3.5, type: 'hit', gain: 1 },
  { t: 3.62, type: 'whoosh', dur: 0.38, gain: 1 },
];

const BEATS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
const T_LAND = 3.5;           // le téléphone touche le sol
const T_APEX = 3.6;           // sommet de la grue → chute libre

export default function create(ctx) {
  const { THREE, V, L, W, H, cfg } = ctx;
  const u = L.u;
  const group = new THREE.Group();
  const D = PHONE.D;
  const FLOOR = -1.25;
  const aspect = W / H;

  // ------------------------------------------------------------------ plateau
  const sky = makeSky(THREE, { d1: [0.2, 0.35, -1], d2: [-1, 0.1, 0.3], d3: [0.8, -0.3, 0.5], radius: 70 });
  group.add(sky.mesh);

  // sol noir brillant (reflète l'environnement HDR du studio) ; légèrement transparent pour laisser
  // voir les reflets « miroir » des tubes néon placés sous lui
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: '#010201', roughness: 0.32, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.22,
    envMapIntensity: 0.0, transparent: true, opacity: 0.84, depthWrite: true,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  floor.renderOrder = -2;
  group.add(floor);
  const gridMat = new THREE.ShaderMaterial({
    ...GridFloorShader,
    uniforms: THREE.UniformsUtils.clone(GridFloorShader.uniforms),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  gridMat.uniforms.uColor.value = new THREE.Color(C.neon).multiplyScalar(0.2);
  gridMat.uniforms.uOpacity.value = 0.32;
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = FLOOR + 0.004;
  grid.renderOrder = -1;
  group.add(grid);

  // tubes néon (studio LED) + leurs reflets sous le sol
  const tubeGeo = neonTubeGeometry(THREE, 0.03);
  const tubes = [];
  const neon = new THREE.Color(C.neon), teal = new THREE.Color(C.teal), white = new THREE.Color('#e8fff0');
  const rT = rng(1907);
  const addTube = (pos, len, rot, col, k, ph, top) => {
    const mk = (mirror) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      const m = new THREE.Mesh(tubeGeo, mat);
      m.scale.set(1, len, 1);
      m.rotation.set(rot[0] * (mirror ? -1 : 1), rot[1], rot[2] * (mirror ? -1 : 1));
      m.position.set(pos[0], mirror ? 2 * FLOOR - pos[1] : pos[1], pos[2]);
      if (mirror) m.renderOrder = -3;
      group.add(m);
      return { m, mat };
    };
    tubes.push({ a: mk(false), b: mk(true), col, k, ph, top, order: rT() });
  };
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + (rT() - 0.5) * 0.15;
    const rad = 6.5 + rT() * 3.5;
    const h = 2.2 + rT() * (V ? 6.5 : 4.2);
    const base = FLOOR + (i % 3 === 0 ? 0 : 0.4 + rT() * 1.2);
    const col = i % 5 === 1 ? white : i % 4 === 3 ? teal : neon;
    addTube([rad * Math.sin(a), base + h / 2, rad * Math.cos(a)], h, [0, 0, (rT() - 0.5) * 0.1], col, 0.55 + rT() * 0.6, rT() * 10, false);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rT();
    const rad = 3.5 + rT() * 3;
    const len = 5 + rT() * 6;
    addTube([rad * Math.sin(a), 3.0 + rT() * 1.2, rad * Math.cos(a)], len, [0, a, Math.PI / 2], i % 2 ? white : neon, 0.45 + rT() * 0.35, rT() * 10, true);
  }

  // brume lumineuse (sprites additifs)
  const haze = [];
  const rH = rng(311);
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(THREE), color: i % 3 === 2 ? teal.clone() : neon.clone(), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 0.006 + rH() * 0.01,
    }));
    const a = (i / 8) * TAU + rH() * 0.5, rad = 4.5 + rH() * 3;
    s.position.set(rad * Math.sin(a), FLOOR + 0.5 + rH() * 2, rad * Math.cos(a));
    const sc = 5 + rH() * 5;
    s.scale.set(sc, sc * (V ? 1.5 : 0.8), 1);
    group.add(s);
    haze.push(s);
  }
  // contre-jour derrière le sujet + reflet au sol
  const backGlow = glowPlane(THREE, C.neon, 0.0);
  const backCore = glowPlane(THREE, '#ffffff', 0.0, 'core');
  const floorGlow = glowPlane(THREE, C.neon, 0.0);
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = FLOOR + 0.006;
  group.add(backGlow, backCore, floorGlow);

  // onde de choc au sol (le téléphone qui tombe à plat)
  const ringMat = new THREE.MeshBasicMaterial({ color: neon.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), ringMat);
  ring.rotation.x = -Math.PI / 2;
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 96), ringMat.clone());
  ring2.rotation.x = -Math.PI / 2;
  group.add(ring, ring2);

  // vent de particules pendant la chute libre (colonne autour de l'écran, répartition log en hauteur)
  const NW = 420;
  const wpos = new Float32Array(NW * 3), wsd = new Float32Array(NW);
  const rW = rng(77);
  for (let i = 0; i < NW; i++) {
    const rr = 0.08 + Math.pow(rW(), 0.7) * 1.6, aa = rW() * TAU;
    wpos[i * 3] = Math.cos(aa) * rr;
    wpos[i * 3 + 1] = Math.log(0.05) + rW() * (Math.log(4.2) - Math.log(0.05));
    wpos[i * 3 + 2] = Math.sin(aa) * rr;
    wsd[i] = rW();
  }
  const windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3));
  windGeo.setAttribute('aSeed', new THREE.BufferAttribute(wsd, 1));
  const windMat = new THREE.ShaderMaterial({
    uniforms: { uRise: { value: 0 }, uK: { value: 0 }, uPix: { value: H / 1080 }, uNeon: { value: neon.clone() } },
    vertexShader: /* glsl */ `
      uniform float uRise, uPix; attribute float aSeed; varying float vS;
      void main(){
        float span = log(4.2) - log(0.05);
        float ly = mod(position.y - log(0.05) + uRise * (0.6 + aSeed), span) + log(0.05);
        float y = exp(ly);
        vec3 p = vec3(position.x * (0.25 + y * 0.6), y, position.z * (0.25 + y * 0.6));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vS = aSeed;
        gl_PointSize = uPix * (2.0 + aSeed * 5.0) * 1.2 / max(0.05, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK; uniform vec3 uNeon; varying float vS;
      void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c) * 16.0) * uK;
        gl_FragColor = vec4(mix(uNeon, vec3(1.0), step(0.7, vS)) * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const wind = new THREE.Points(windGeo, windMat);
  wind.frustumCulled = false;
  group.add(wind);

  // ------------------------------------------------------------------ accessoires (jeux privés)
  // Deux jeux créés ici (aucun état partagé modifié : ouverture du boîtier, écouteurs éjectés…)
  const A = createAccessories(cfg, null);
  const A2 = createAccessories(cfg, null);
  for (const S of [A, A2]) {
    S.wifi.visible = false; S.internet.visible = false;
    group.add(S.group);
  }
  // charnière du couvercle du boîtier d'écouteurs
  const lidPivot = new THREE.Group();
  {
    const lid = A.earbuds.children[1];
    lidPivot.position.set(0, 0.085, -0.11);
    A.earbuds.add(lidPivot);
    lidPivot.add(lid);
    lid.position.set(0, 0.055, 0.11);
  }
  // (enfants après déplacement du couvercle : caseB, led, b1, b2, lidPivot)
  const buds = A.earbuds.children.filter((c) => c.type === 'Group' && c !== lidPivot);
  // énergie dans le câble du chargeur (tube additif sur la même courbe)
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.14), new THREE.Vector3(0.05, -0.05, 0.4), new THREE.Vector3(-0.25, -0.25, 0.55),
    new THREE.Vector3(-0.55, -0.1, 0.35), new THREE.Vector3(-0.62, 0.18, 0.08), new THREE.Vector3(-0.45, 0.32, -0.12),
  ]);
  const zapMat = new THREE.ShaderMaterial({
    uniforms: { uP: { value: -1 }, uP2: { value: -1 }, uK: { value: 0 }, uNeon: { value: neon.clone() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uP, uP2, uK; uniform vec3 uNeon; varying vec2 vUv;
      void main(){
        float a = exp(-pow((vUv.x - uP) * 9.0, 2.0)) + exp(-pow((vUv.x - uP2) * 9.0, 2.0));
        float trail = smoothstep(uP - 0.45, uP, vUv.x) * step(vUv.x, uP) * 0.35;
        float k = (a * 2.2 + trail + 0.06) * uK;
        gl_FragColor = vec4(mix(uNeon, vec3(1.0), clamp(a - 0.4, 0.0, 1.0)) * k, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const zap = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 160, 0.03, 10, false), zapMat);
  A.charger.add(zap);
  const plugGlow = glowPlane(THREE, C.neon, 0, 'core');
  group.add(plugGlow);

  // ------------------------------------------------------------------ lumières propres
  const kick = new THREE.PointLight(0xffffff, 0, 7, 2);
  group.add(kick);

  // ------------------------------------------------------------------ CAMÉRA (pure)
  const vS = V ? 1.06 : 1;
  const TH = [[0, -1.3], [0.5, -0.72, 'out'], [1.0, 0.38, 'burst'], [1.5, -0.42, 'burst'], [2.0, -1.05, 'burst'],
    [2.5, 0.06, 'burst'], [2.75, 0.5, 'burst'], [3.0, -0.28, 'burst'], [3.3, 0.12, 'burst'], [T_APEX, DIVE.th, 'ioc'], [4.0, DIVE.th, 'lin']];
  const PH = [[0, 0.06], [0.5, 0.1, 'out'], [1.0, 0.34, 'burst'], [1.5, 0.66, 'burst'], [2.0, -0.2, 'burst'],
    [2.5, 0.04, 'burst'], [2.75, 0.16, 'burst'], [3.0, -0.06, 'burst'], [3.3, 0.08, 'burst'], [T_APEX, DIVE.ph, 'ioc'], [4.0, DIVE.ph, 'lin']];
  const RR = [[0, 2.9 * vS], [0.5, 2.3 * vS, 'out'], [1.0, 1.8 * vS, 'burst'], [1.5, 1.95 * vS, 'burst'], [2.0, 1.5 * vS, 'burst'],
    [2.5, 2.55 * vS, 'burst'], [2.75, (V ? 2.7 : 2.75), 'burst'], [3.0, (V ? 2.0 : 1.75), 'burst'], [3.3, (V ? 2.55 : 2.3), 'burst'], [T_APEX, 3.7, 'ioc']];
  const RL = [[0, -0.2], [0.5, 0.06, 'out'], [1.0, -0.1, 'burst'], [1.5, 0.16, 'burst'], [2.0, -0.22, 'burst'], [2.5, 0.1, 'burst'],
    [2.75, -0.08, 'burst'], [3.0, 0.05, 'burst'], [3.3, -0.06, 'burst'], [T_APEX, 0.08, 'ioc'], [4.0, DIVE.roll(V), 'in']];
  const fv = V ? 12 : 0;
  const FV = [[0, 46 + fv], [0.5, 37 + fv, 'out'], [1.0, 34 + fv, 'burst'], [1.5, 38 + fv, 'burst'], [2.0, 46 + fv, 'burst'], [2.5, 40 + fv, 'burst'],
    [3.0, 35 + fv, 'burst'], [3.3, 38 + fv, 'burst'], [T_APEX, 44 + fv, 'ioc'], [4.0, DIVE.fov(V), 'io']];
  // décentrage (le sujet laisse la place au texte) : 16:9 latéral, 9:16 vertical
  const SX = V ? [[0, 0]] : [[0, -0.2], [0.5, -0.32, 'out'], [1.0, -0.36, 'burst'], [1.5, -0.32, 'burst'], [2.0, -0.3, 'burst'], [2.5, 0.0, 'burst'],
    [2.75, 0.42, 'burst'], [3.0, 0.3, 'burst'], [3.3, 0.38, 'burst'], [T_APEX, 0, 'ioc']];
  const SY = V ? [[0, -0.25], [0.5, -0.36, 'out'], [1.0, -0.42, 'burst'], [1.5, -0.4, 'burst'], [2.0, -0.36, 'burst'], [2.5, -0.1, 'burst'],
    [2.75, -0.42, 'burst'], [3.0, -0.4, 'burst'], [3.3, -0.4, 'burst'], [T_APEX, 0, 'ioc']] : [[0, 0]];

  // téléphone posé à plat : centre de l'écran (point visé par la chute libre)
  const FLAT = [0, FLOOR + D / 2, -0.55];
  const SCREEN_C = [FLAT[0], FLAT[1] + D / 2 + 0.0016, FLAT[2]];
  const R_END = diveEndDist(V, aspect);

  function focus(lt) {
    const k = E.inOutCubic(seg(lt, 3.3, T_APEX));
    return [lerp(0, SCREEN_C[0], k), lerp(0, SCREEN_C[1], k), lerp(0, SCREEN_C[2], k)];
  }
  function radius(lt) {
    if (lt <= T_APEX) return track(RR, lt);
    const x = seg(lt, T_APEX, 4.0);
    return 3.7 * Math.pow(R_END / 3.7, E.inQuad(x));      // chute en espace log : accélération continue
  }
  function cam(lt) {
    const th = track(TH, lt), ph = track(PH, lt), R = radius(lt);
    const F = focus(lt);
    const cp = Math.cos(ph);
    const pos = [F[0] + R * cp * Math.sin(th), F[1] + R * Math.sin(ph), F[2] + R * cp * Math.cos(th)];
    // whip pan d'arrivée : la visée vient de la droite et se cale sur le sujet en 0.15 s
    const whip = 3.4 * Math.exp(-lt / 0.045);
    const sx = track(SX, lt) + whip, sy = track(SY, lt);
    const target = [F[0] + Math.cos(th) * sx, F[1] + sy, F[2] - Math.sin(th) * sx];
    // micro-vie permanente (la caméra ne s'arrête jamais)
    const n = 0.012 * (1 - seg(lt, 3.5, 3.9));
    pos[0] += noise1(lt * 2.1) * n; pos[1] += noise1(lt * 1.7 + 4) * n;
    return { pos, target, roll: track(RL, lt), fov: track(FV, lt), near: 0.02, far: 300 };
  }

  // ------------------------------------------------------------------ objets (positions pures)
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const _m = new THREE.Matrix4();

  /** place obj relativement à base (position + quaternion) avec un décalage local. */
  function attach(obj, base, off, rot) {
    _v.set(off[0], off[1], off[2]).applyQuaternion(base.quaternion);
    obj.position.copy(base.position).add(_v);
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    obj.quaternion.copy(base.quaternion).multiply(_q);
  }

  // anneau d'accessoires autour du téléphone héros (2.5 → 3.3), éclaté pendant la bascule
  const RING = [
    { o: A.caseShell, s: 0.5, sp: [1.3, 0.7] },
    { o: A.charger, s: 0.62, sp: [-1.1, 0.9] },
    { o: A2.earbuds, s: 0.78, sp: [0.9, -1.4] },
    { o: A.headphones, s: 0.5, sp: [-0.8, 1.2] },
    { o: A2.caseShell, s: 0.5, sp: [1.6, -0.6] },
    { o: A2.charger, s: 0.6, sp: [-1.4, -0.9] },
  ];
  const ringR = V ? 0.95 : 1.12;
  function ringPose(i, lt) {
    const n = RING.length;
    const om = 2.0 * (lt - 2.5) + 2.6 * E.outExpo(seg(lt, 2.5, 3.0)) + 1.6 * E.outExpo(seg(lt, 3.0, 3.4));
    const a = (i / n) * TAU + om;
    const kin = E.outExpo(seg(lt, 2.36 + i * 0.03, 2.62 + i * 0.03));
    const kout = E.inQuad(seg(lt, 3.3, 3.75));
    const rad = lerp(4.8, ringR, kin) + kout * 3.6;
    const yy = (V ? 0.75 : 0.42) * Math.sin(a * 2 + i) + (V ? (i / (n - 1) - 0.5) * 0.9 : 0) + kout * (1.4 + i * 0.25) + (1 - kin) * 1.6;
    const tilt = 0.28;
    const x = Math.sin(a) * rad, z = Math.cos(a) * rad;
    return { p: [x, yy + z * Math.sin(tilt) * 0.3, z], a, k: kin * (1 - seg(lt, 3.85, 4.0)) };
  }

  // ------------------------------------------------------------------ texte
  const WORDS = ['COQUES', 'CHARGEURS', 'ÉCOUTEURS'];
  const probe = document.createElement('canvas').getContext('2d');
  const BIG = V ? fitSize(probe, 'CHARGEURS', 900, -0.03, L.safe.w * 0.94, 170 * u) : fitSize(probe, 'CHARGEURS', 900, -0.03, W * 0.5, 190 * u);

  // ------------------------------------------------------------------ mise à jour
  const P_G = 1, P_BG = 4, P_HUB = 3;
  const DBG = new Set((new URLSearchParams(location.search).get('hide') || '').split(','));

  return {
    group,
    camera: cam,
    update(f) {
      const { lt, fx, ui, post, world } = f;
      const c = cam(lt);
      const F = focus(lt);
      const fwd = [F[0] - c.pos[0], F[1] - c.pos[1], F[2] - c.pos[2]];
      const fl = Math.hypot(...fwd) || 1;
      fwd[0] /= fl; fwd[1] /= fl; fwd[2] /= fl;
      const beatK = BEATS.reduce((a, b) => a + pulse(lt, b, 0.01, 0.12), 0) + pulse(lt, 0, 0.001, 0.15);

      // ---- studio partagé
      world.studio.update(f.t, { backdrop: false, grid: 0, beams: 0.22 * (1 - seg(lt, 3.3, 3.6)), dust: 0.8, motes: 0.9, env: 0.9, rim: 1, key: 0.7, glow: 0, envRot: track(TH, lt) * 0.8 + lt * 0.3 });
      const st = world.studio;
      // contre-jours vert / teal derrière le sujet, kicker blanc qui balaie sur les temps
      st.rimG.position.set(F[0] + fwd[0] * 1.8 + Math.cos(lt * 3) * 0.6, F[1] + 0.9, F[2] + fwd[2] * 1.8);
      st.rimG.intensity = 9 + 6 * beatK;
      st.rimT.position.set(F[0] + fwd[0] * 1.2 - fwd[2] * 1.4, F[1] - 0.4, F[2] + fwd[2] * 1.2 + fwd[0] * 1.4);
      st.rimT.intensity = 5;
      const kb = (lt * 2) % 1;
      kick.position.set(F[0] + Math.cos(lt * 9) * 2.2 - fwd[0] * 1.2, F[1] + 1.2 + 0.6 * Math.sin(lt * 7), F[2] + Math.sin(lt * 9) * 2.2 - fwd[2] * 1.2);
      kick.intensity = 1.6 * Math.exp(-kb * 5) * (lt < 3.55 ? 1 : 0.3);

      sky.mat.uniforms.uTime.value = lt;
      sky.mat.uniforms.uK.value = 0.32 + 0.18 * beatK;
      // tubes : scintillement + pulsation sur les temps
      for (const tb of tubes) {
        const flick = 0.82 + 0.18 * noise1(lt * 7 + tb.ph);
        const k = tb.k * flick * (0.85 + 0.4 * beatK);
        tb.a.mat.color.copy(tb.col).multiplyScalar(k);
        tb.b.mat.color.copy(tb.col).multiplyScalar(k * 0.5 * (tb.top ? 0.5 : 1) * (1 - seg(lt, 3.25, 3.5)));
      }
      // contre-jour derrière le sujet (occulté par lui)
      const bgk = lt < 3.4 ? 1 : 1 - seg(lt, 3.4, 3.7);
      backGlow.position.set(F[0] + fwd[0] * 2.4, F[1] + fwd[1] * 2.4 + 0.1, F[2] + fwd[2] * 2.4);
      backGlow.quaternion.copy(f.camera.quaternion);
      backGlow.scale.set(5.5, 5.5 * (V ? 1.4 : 1), 1);
      backGlow.material.opacity = (0.05 + 0.05 * beatK) * bgk;
      backCore.position.copy(backGlow.position);
      backCore.quaternion.copy(f.camera.quaternion);
      backCore.scale.set(0.9, 0.9, 1);
      backCore.material.opacity = (0.03 + 0.06 * beatK) * bgk;
      floorGlow.position.set(F[0], FLOOR + 0.006, F[2]);
      floorGlow.scale.set(4.5, 4.5, 1);
      floorGlow.material.opacity = (0.035 + 0.03 * beatK) * (1 - seg(lt, 3.3, 3.6));

      // ================================================================ objets
      const phones = world.phones;
      for (const S of [A, A2]) for (const o of [S.earbuds, S.charger, S.caseShell, S.headphones]) o.visible = false;
      zapMat.uniforms.uK.value = 0;
      plugGlow.material.opacity = 0;

      // ---- B0-B1 : téléphone vert + coque
      if (lt < 1.14) {
        const pg = phones[P_G];
        pg.group.visible = true;
        const th = track(TH, lt);
        const ex = E.inCubic(seg(lt, 0.92, 1.14));
        pg.group.position.set(-2.8 * ex, 0.03 * Math.sin(lt * 5) + 1.9 * ex, -1.6 * ex);
        const slow = 0.18 * (lt - 0.5);
        pg.group.rotation.set(0.1 - 0.6 * ex, th + Math.PI + 0.5 + slow + 6 * ex, 0.2 + 1.5 * ex, 'YXZ');
        pg.group.updateMatrixWorld();
        pg.screen.draw('home', lt + 2, { variant: 1 });
        // coque : arrive de derrière la caméra en tournoyant, se clipse à 0.5
        const cs = A.caseShell;
        cs.visible = true;
        cs.scale.setScalar(1);
        const k = 1 - E.inQuart(seg(lt, 0.02, 0.5));            // 1 → 0 (accélère jusqu'au clic)
        const z0 = -(D / 2 + 0.018);
        attach(cs, pg.group, [0.25 * k, 0.35 * k, z0 - 3.2 * k], [0.5 * k, -0.9 * k, TAU * 1.25 * Math.pow(k, 1.3)]);
        // clic : petit recul de tout l'ensemble
        const snap = pulse(lt, 0.5, 0.005, 0.07);
        pg.group.position.z += -0.04 * snap;
        cs.position.z += -0.04 * snap;
      }

      // ---- B2 : chargeur (+ téléphone en charge à l'arrière-plan)
      if (lt > 0.88 && lt < 1.58) {
        const ch = A.charger;
        ch.visible = true;
        const kin = E.outExpo(seg(lt, 0.9, 1.06));
        const kout = E.inCubic(seg(lt, 1.42, 1.58));
        const th = track(TH, lt);
        ch.scale.setScalar(1.25);
        ch.position.set(lerp(2.4, 0.32, kin) - 2.8 * kout, lerp(-1.1, -0.02, kin) - 0.4 * kout + 0.03 * Math.sin(lt * 6), lerp(0.9, -0.1, kin) - 1.2 * kout);
        const spin = 5.5 * (1 - kin) + 0.5 * (lt - 1) + 4 * kout;
        ch.rotation.set(0.25 + 0.4 * (1 - kin), th + 0.75 + spin, -0.1 + 0.8 * kout, 'YXZ');
        ch.updateMatrixWorld();
        // éclairs dans le câble sur les temps
        zapMat.uniforms.uK.value = 1;
        zapMat.uniforms.uP.value = lerp(-0.2, 1.25, seg(lt, 1.0, 1.24));
        zapMat.uniforms.uP2.value = lerp(-0.2, 1.25, seg(lt, 1.25, 1.46));
        _v.copy(cableCurve.getPoint(1)).applyMatrix4(ch.matrixWorld);
        plugGlow.position.copy(_v);
        plugGlow.quaternion.copy(f.camera.quaternion);
        plugGlow.scale.setScalar(0.5 + 0.4 * pulse(lt, 1.24, 0.01, 0.1));
        plugGlow.material.opacity = 0.5 * (pulse(lt, 1.24, 0.01, 0.12) + pulse(lt, 1.46, 0.01, 0.12)) + 0.08;
        // téléphone graphite en charge, flou derrière
        const pb = phones[P_BG];
        pb.group.visible = true;
        pb.group.position.set(1.0 - 0.6 * kout, 0.35, -2.6);
        pb.group.rotation.set(0.05, th * 0.7 - 0.3, -0.12, 'YXZ');
        pb.screen.draw('counter', lt - 0.95, { to: 100, label: 'CHARGEMENT', dur: 0.5 });
      }

      // ---- B3 : boîtier d'écouteurs (on passe dessous), ouverture, éjection
      if (lt > 1.4 && lt < 2.08) {
        const eb = A.earbuds;
        eb.visible = true;
        const kin = E.outExpo(seg(lt, 1.42, 1.53));
        const kout = E.inCubic(seg(lt, 1.92, 2.08));
        const th = track(TH, lt);
        eb.scale.setScalar(V ? 1.65 : 1.8);
        eb.position.set(0.05 + 1.8 * kout, lerp(2.4, -0.02, kin) + 1.6 * kout, lerp(0.3, 0, kin) - 1.5 * kout);
        eb.rotation.set(-0.15 + 0.6 * (1 - kin), th + 0.4 + 4.5 * (1 - kin) + 0.4 * (lt - 1.5), 0.08 + 1.2 * kout, 'YXZ');
        lidPivot.rotation.x = -1.95 * E.outBack(seg(lt, 1.52, 1.66), 2.2);
        // écouteurs : éjectés, puis orbitent autour du boîtier en tournoyant
        buds.forEach((b, i) => {
          const s = i ? -1 : 1;
          const ke = E.outExpo(seg(lt, 1.55 + i * 0.04, 1.78 + i * 0.04));
          const a = s * (0.4 + 5.2 * (lt - 1.55)) + i * Math.PI;
          const rad = 0.08 + 0.36 * ke;
          b.position.set(Math.sin(a) * rad * (ke > 0 ? 1 : 0), lerp(0.0, 0.28 + 0.06 * Math.sin(lt * 9 + i), ke), Math.cos(a) * rad);
          b.rotation.set(lt * 7 * s, lt * 9 + i, 0.4 * s);
          b.scale.setScalar(ke > 0.01 ? 1 : 0.001);
        });
      } else {
        lidPivot.rotation.x = 0;
        buds.forEach((b, i) => { b.position.set(i ? 0.34 : -0.36, i ? 0.33 : 0.25, i ? -0.05 : 0.1); b.rotation.set(i ? -0.2 : 0.3, i ? -0.7 : 0.6, i ? -0.4 : 0.35); b.scale.setScalar(1); });
      }

      // ---- B4 : le casque fonce sur la caméra, qui passe sous l'arceau
      if (lt > 1.96 && lt < 2.46) {
        const hp = A.headphones;
        hp.visible = true;
        const cp = cam(2.4);
        const k = E.inQuad(seg(lt, 1.98, 2.4));
        const start = [F[0] + fwd[0] * 6.5 + 0.6, F[1] + 0.6, F[2] + fwd[2] * 6.5];
        const end = cp.pos;
        const k2 = seg(lt, 2.4, 2.46);
        hp.position.set(lerp(start[0], end[0], k) + (end[0] - F[0]) * k2, lerp(start[1], end[1] - 0.04, k) + (end[1] - F[1]) * k2, lerp(start[2], end[2], k) + (end[2] - F[2]) * k2);
        hp.scale.setScalar(1.45);
        hp.lookAt(cp.pos[0] + (cp.pos[0] - F[0]) * 3, cp.pos[1] + (cp.pos[1] - F[1]) * 3, cp.pos[2] + (cp.pos[2] - F[2]) * 3);
        hp.rotateZ(1.2 * (1 - k));
      }

      // ---- B4-B6 : téléphone héros
      if (lt > 1.95) {
        const ph = phones[P_HUB];
        ph.group.visible = true;
        const kin = E.outQuart(seg(lt, 2.0, 2.5));
        const th = track(TH, lt);
        const fall = E.inQuad(seg(lt, 3.3, T_LAND));
        const bounce = Math.sin(clamp((lt - T_LAND) / 0.12) * Math.PI) * 0.035 * (lt > T_LAND ? 1 : 0);
        const land = lt >= T_LAND ? 1 : fall;
        const bob = 0.03 * Math.sin(lt * 4.2) * (1 - land);
        ph.group.position.set(lerp(1.6, 0, kin), lerp(2.6, 0, kin) + bob, lerp(-10, 0, kin));
        ph.group.position.y = lerp(ph.group.position.y, FLAT[1] + bounce, land);
        ph.group.position.z = lerp(ph.group.position.z, FLAT[2], land);
        const yawLive = th * 0.55 + 0.04 * Math.sin(lt * 3) + TAU * Math.pow(1 - kin, 2) * 1.0;
        ph.group.rotation.set(lerp(-0.04, -Math.PI / 2, land) - 0.02 * bounce, lerp(yawLive, 0, land), lerp(0.05 * Math.sin(lt * 2.4), 0, land), 'YXZ');
        // ÉTAPE 4 : page du magasin → défilement → « Itinéraire » → carte + tracé
        if (lt < 2.92) {
          const sc = E.inOutCubic(seg(lt, 2.52, 2.74));
          const P = { cardsAt: 0.12, pillsAt: 0.3, buttonsAt: 0.38, scroll: sc };
          if (lt > 2.78) P.touch = { x: STORE_BTN.route[0], y: STORE_BTN.route[1], t: lt - 2.8 };
          ph.screen.draw('store', lt - 1.95, P);
        } else {
          ph.screen.draw('map', lt - 2.9, { route: E.inOutSine(seg(lt, 2.95, 3.42)), label: true });
        }
        ph.phone.setScreenMap(ph.screen.tex, lt < 2.92 ? 1.0 : 1.05);
      }

      // ---- B5-B6 : anneau d'accessoires
      if (lt > 2.34 && lt < 4.0) {
        RING.forEach((it, i) => {
          const r = ringPose(i, lt);
          if (r.k <= 0.001) return;
          it.o.visible = true;
          it.o.position.set(r.p[0], r.p[1], r.p[2]);
          it.o.scale.setScalar(it.s * (0.4 + 0.6 * r.k));
          it.o.rotation.set(lt * it.sp[0] + i, lt * it.sp[1] * 2 + r.a, 0.3 * Math.sin(lt * 3 + i), 'YXZ');
        });
      }

      // ---- onde de choc au sol + vent de la chute
      const sk = seg(lt, T_LAND, T_LAND + 0.45);
      ring.visible = ring2.visible = sk > 0 && sk < 1;
      if (ring.visible) {
        ring.position.set(FLAT[0], FLOOR + 0.01, FLAT[2]);
        ring.scale.setScalar(0.4 + 3.2 * E.outCubic(sk));
        ringMat.opacity = 0.45 * Math.pow(1 - sk, 2);
        ring2.position.set(FLAT[0], FLOOR + 0.012, FLAT[2]);
        ring2.scale.setScalar(0.3 + 1.6 * E.outCubic(sk));
        ring2.material.opacity = 0.18 * Math.pow(1 - sk, 2);
      }
      wind.visible = lt > 3.45;
      wind.position.set(SCREEN_C[0], SCREEN_C[1], SCREEN_C[2]);
      windMat.uniforms.uRise.value = (lt - 3.45) * 2.2;
      windMat.uniforms.uK.value = 0.9 * seg(lt, 3.45, 3.7);

      if (DBG.has('bg')) { backGlow.visible = backCore.visible = floorGlow.visible = false; } else { backGlow.visible = backCore.visible = floorGlow.visible = true; }
      if (DBG.has('kick')) kick.intensity = 0;
      sky.mesh.visible = !DBG.has('sky');
      if (DBG.has('dust')) world.studio.update(f.t, { backdrop: false, grid: 0, beams: 0, dust: 0, motes: 0, env: 0.9, rim: 1, key: 0.7, glow: 0 });
      for (const h of haze) h.visible = !DBG.has('haze');
      if (DBG.has('rim')) { st.rimG.intensity = 0; st.rimT.intensity = 0; }
      if (DBG.has('tubes')) for (const tb of tubes) { tb.a.m.visible = tb.b.m.visible = false; } else for (const tb of tubes) { tb.a.m.visible = tb.b.m.visible = true; }
      if (DBG.has('ring')) RING.forEach((it) => { it.o.visible = false; });
      if (DBG.has('floor')) { floor.visible = false; grid.visible = false; } else { floor.visible = true; grid.visible = true; }
      if (DBG.has('phones')) for (const p of phones) p.group.visible = false;
      if (DBG.has('acc')) for (const S of [A, A2]) for (const o of [S.earbuds, S.charger, S.caseShell, S.headphones]) o.visible = false;
      // ================================================================ fx (calque lumineux)
      if (lt < 0.22) whipStreaks(fx, W, H, lt, 1 - seg(lt, 0, 0.2), u, 18);
      edgeFlash(fx, W, H, 0.8 * (pulse(lt, 0.5, 0.005, 0.09) + pulse(lt, 1.5, 0.005, 0.09) + pulse(lt, 2.5, 0.005, 0.09)) + 0.5 * pulse(lt, 1.0, 0.005, 0.07) + 0.6 * pulse(lt, 3.5, 0.005, 0.1), u);
      // étincelles au clic de la coque
      if (lt > 0.48 && lt < 1.2) {
        const pp = f.project([phones[P_G].group.position.x, phones[P_G].group.position.y, phones[P_G].group.position.z]);
        if (pp[2] < 1) {
          sparks(fx, pp[0], pp[1], lt - 0.5, f, { count: 70, speed: 1700, life: 0.55, seed: 11 });
          shockRing(fx, pp[0], pp[1], lt - 0.5, f, { radius: 700, width: 12, dur: 0.5 });
        }
      }
      // écouteurs : onde à l'ouverture
      if (lt > 1.5 && lt < 2.0) {
        const pe = f.project([A.earbuds.position.x, A.earbuds.position.y + 0.2, A.earbuds.position.z]);
        if (pe[2] < 1) shockRing(fx, pe[0], pe[1], lt - 1.53, f, { radius: 520, width: 10, dur: 0.42, color: C.teal });
      }
      // casque : lignes de vitesse quand il frôle l'objectif
      speedLines(fx, W, H, lt, 0.8 * win(lt, 2.2, 2.36, 2.42, 2.52), { count: 90, speed: 2.2, seed: 33 });
      // contre-jour : rayons
      const pb = f.project([backGlow.position.x, backGlow.position.y, backGlow.position.z]);
      if (pb[2] < 1) godRays(fx, pb[0], pb[1], Math.max(W, H) * 0.5, lt, (0.08 + 0.1 * beatK) * bgk, { count: 12, seed: 5 });
      // toucher « Itinéraire » : éclat sur l'écran
      if (lt > 2.78 && lt < 3.1) {
        const ph = phones[P_HUB].group;
        _v.set((STORE_BTN.route[0] - 0.5) * DIVE.screenW, (0.5 - STORE_BTN.route[1]) * DIVE.screenH, D / 2 + 0.01).applyQuaternion(ph.quaternion).add(ph.position);
        const pt = f.project([_v.x, _v.y, _v.z]);
        if (pt[2] < 1) {
          fx.save(); fx.globalCompositeOperation = 'lighter';
          radialGlow(fx, pt[0], pt[1], 160 * u, C.neon, 0.5 * pulse(lt, 2.81, 0.01, 0.12));
          fx.restore();
          shockRing(fx, pt[0], pt[1], lt - 2.8, f, { radius: 260, width: 6, dur: 0.35, color: '#ffffff' });
        }
      }
      // chute libre : vent radial vers les bords
      const fallV = seg(lt, T_APEX, 4.0);
      if (fallV > 0) {
        const pc = f.project(SCREEN_C);
        speedLines(fx, W, H, lt, 0.9 * E.inQuad(fallV), { count: 150, speed: 2.6, seed: 61, cx: pc[0] / W, cy: pc[1] / H });
      }

      // ================================================================ typographie (calque ui)
      const sf = L.safe;
      // eyebrow 03 — S'ÉQUIPER
      const eyA = 1 - seg(lt, 2.35, 2.55);
      if (eyA > 0) {
        if (V) eyebrow(ui, "03 — S'ÉQUIPER", W / 2, sf.t + 46 * u, lt - 0.05, f, { size: 34, align: 'center', alpha: eyA });
        else eyebrow(ui, "03 — S'ÉQUIPER", sf.l, sf.t + 40 * u, lt - 0.05, f, { size: 28, alpha: eyA });
      }
      // mots qui claquent sur les temps + pile des mots précédents (contraste 900 / 300)
      const wx = V ? W / 2 : sf.l, wy = V ? sf.b - 40 * u : sf.b - 20 * u;
      const align = V ? 'center' : 'left';
      const outAll = seg(lt, 2.0, 2.22);
      if (lt >= 0.5 && lt < 2.3) {
        const ci = Math.min(2, Math.floor((lt - 0.5) / 0.5));
        const tc = lt - (0.5 + ci * 0.5);
        const pr = E.outExpo(seg(tc, 0, 0.28));
        withShadow(ui, u, 1, () => {
          // mots précédents : rétrécissent et passent en fin (300) dans la pile au-dessus
          for (let j = 0; j < ci; j++) {
            const rk = (ci - j - 1) + pr;            // 0 = position du gros mot, 1 = juste au-dessus, 2 = …
            const kk = clamp(rk);
            const size = lerp(BIG, BIG * 0.3, E.outCubic(kk));
            const y = wy - lerp(0, BIG * 0.98, kk) - Math.max(0, rk - 1) * BIG * 0.38;
            const ox = V ? 0 : -outAll * 260 * u;
            const a = 1 - outAll;
            if (a <= 0.01) continue;
            ui.textAlign = align; ui.textBaseline = 'alphabetic';
            if (kk < 1) {
              setFont(ui, size, 900, -0.03);
              ui.globalAlpha = a * (1 - kk);
              ui.fillStyle = j === 1 ? C.neon : C.white;
              ui.fillText(WORDS[j], wx + ox, y);
            }
            setFont(ui, size, 300, 0.06);
            ui.globalAlpha = a * kk * 0.92;
            ui.fillStyle = C.white;
            ui.fillText(WORDS[j], wx + ox, y);
            ui.globalAlpha = 1;
            ui.letterSpacing = '0px';
          }
          slamWord(ui, WORDS[ci], wx, wy, { t: tc, size: BIG, weight: 900, align, color: ci === 1 ? C.neon : C.white, out: outAll * 1.2 });
        });
      }
      // « Accessoires & multimédia »
      if (lt > 2.0 && lt < 2.7) {
        const o = seg(lt, 2.5, 2.66);
        const s1 = V ? BIG * 0.78 : BIG * 0.62, s2 = s1 * 0.7;
        const y1 = V ? sf.b - 40 * u - s2 * 1.15 : sf.b - 20 * u - s2 * 1.15;
        withShadow(ui, u, 1, () => {
          slamWord(ui, 'Accessoires', wx, y1, { t: lt - 2.02, size: s1, weight: 800, align, color: C.white, out: o, from: 1.8, tracking: -0.02 });
          maskReveal(ui, '& multimédia', wx, y1 + s2 * 1.15, { size: s2, weight: 300, p: E.outExpo(seg(lt, 2.1, 2.4)), align, color: C.neon, alpha: 1 - o });
        });
      }
      // ÉTAPE 4 : libellé « Itinéraire → GSM Center Liège »
      const ia = win(lt, 2.62, 2.75, 3.32, 3.46);
      if (ia > 0) {
        const s1 = V ? 92 * u : 84 * u, s2 = V ? 54 * u : 46 * u;
        const x = V ? W / 2 : W * 0.585, y = V ? sf.b - 150 * u : H * 0.47;
        withShadow(ui, u, ia, () => {
          slamWord(ui, 'Itinéraire', x, y, { t: lt - 2.8, size: s1, weight: 800, align: V ? 'center' : 'left', color: C.white, from: 1.7, out: seg(lt, 3.32, 3.46) });
          maskReveal(ui, '→ GSM Center Liège', x, y + s2 * 1.45, { size: s2, weight: 300, p: E.outExpo(seg(lt, 2.92, 3.2)), align: V ? 'center' : 'left', color: C.neon, alpha: ia });
        });
      }

      // ================================================================ post-production
      const dt = 1 / 60;
      const lt0 = Math.max(0, lt - dt);
      // filé manuel proportionnel à la vitesse angulaire (orbite autour d'un point fixe → flou auto ≈ 0)
      const dth = (track(TH, lt) - track(TH, lt0)) / dt, dph = (track(PH, lt) - track(PH, lt0)) / dt;
      const hf = (c.fov * Math.PI / 180) * (V ? 1 : aspect);
      if (lt < 3.3) {
        post.blur[0] += clamp(-dth / 60 / hf * 0.75, -0.07, 0.07);
        post.blur[1] += clamp(dph / 60 / (c.fov * Math.PI / 180) * 0.75, -0.06, 0.06);
      }
      // arrivée dans le whip de glass
      const wk = 1 - seg(lt, 0, 0.15);
      post.blur[0] += 0.095 * wk * wk;
      post.flash = Math.max(post.flash, 0.5 * Math.pow(1 - seg(lt, 0, 0.16), 1.5));
      post.flashColor = [0.85, 1, 0.86];
      // flashs / glitchs courts sur les temps
      post.flash = Math.max(post.flash, 0.16 * pulse(lt, 0.5, 0.004, 0.06) + 0.1 * pulse(lt, 1.5, 0.004, 0.05) + 0.12 * pulse(lt, 2.5, 0.004, 0.06) + 0.14 * pulse(lt, T_LAND, 0.004, 0.06));
      post.rgb = Math.max(post.rgb, 0.005 * (pulse(lt, 1.0, 0.004, 0.05) + pulse(lt, 2.0, 0.004, 0.07) + pulse(lt, 3.0, 0.004, 0.05)));
      post.glitch = Math.max(post.glitch, 0.5 * pulse(lt, 2.0, 0.004, 0.06));
      // chute : zoom blur centré sur l'écran + flash montant vers la traversée
      if (fallV > 0) {
        const pc = f.project(SCREEN_C);
        post.zoomCenter = [clamp(pc[0] / W), clamp(1 - pc[1] / H)];
        post.zoomBlur = Math.max(post.zoomBlur, 0.06 * E.inQuad(fallV));
        post.flash = Math.max(post.flash, 0.6 * E.inQuart(seg(lt, 3.8, 4.0)));
        post.flashColor = [0.75, 1, 0.8];
      }
      post.bloom = 0.55 + 0.12 * beatK;
      post.bloomRadius = 0.38;
      post.vignette = 1.05;
      post.uiBlur = lt < 0.16 ? 0.6 : 0.12;
      // profondeur de champ : net sur le sujet, arrière-plan en bokeh
      const fd = Math.hypot(F[0] - c.pos[0], F[1] - c.pos[1], F[2] - c.pos[2]);
      post.dof = { focus: fd, aperture: lt < 2.5 ? 0.0045 : lt < 3.3 ? 0.0025 : 0.0006, maxblur: 0.009 };
    },
  };
}
