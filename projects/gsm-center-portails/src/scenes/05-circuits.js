// SEGMENT « circuits » (11 → 14 s) — MONDE CIRCUITS : on vit le service RÉPARATION de l'intérieur.
//
//  0.00 → 1.00  sortie du flash vert (raccord traversée 2) : rase-mottes à 10 u/s au-dessus d'une carte
//               mère géante, slalom entre condensateurs et selfs, passage SOUS une nappe flex en arche,
//               impulsions de données qui filent sur les pistes, « 02 — RÉPARER ».
//  0.55 → 1.00  ressource (pull-up) + zoom d'accroche sur le SoC central (G gravé).
//  1.00 → 1.70  DOLLY ZOOM (Vertigo) : la caméra avance, la focale s'élargit, le SoC garde sa taille,
//               la carte s'étire autour ; le G s'allume, les flux convergent dans la puce (riser).
//  1.70 → 2.15  CHANGEMENT DE DIRECTION BRUTAL : la caméra file à gauche (téléobjectif), freine net
//               à 2.00 (hit + tremblement + ressort) devant le connecteur batterie ; HUD + « DIAGNOSTIC
//               RAPIDE » + balayage de scan + pastilles validées.
//  2.15 → 3.00  repart à droite et MONTE à travers les couches (nappe de lumière) vers la vitre de
//               l'écran vue de l'intérieur (interface à l'envers) ; fissures juste avant 3.00, flash.
//
// camera(lt) est PURE. Tout est créé dans create() ; update() ne fait que placer / régler / dessiner.

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { E, clamp, lerp, seg, win, rng, TAU, rgba, speedRamp, catmull, noise1 } from '../core/anim.js';
import { setFont, textWidth, radialGlow, flare, streak, sparks, shockRing } from '../core/draw.js';
import { C, speedLines, slam, maskReveal } from '../core/type.js';
import { createScreen } from '../world/screens.js';
import { ParticleShader } from '../engine/shaders.js';
import {
  PANE, IMPACT, RACCORD, fracture, makeBoardTextures, makeFanoutTexture, makeHazeSky, glowTexture, glowSprite,
  shaftTexture, scrimLinear, scrimRadial, godRays, brackets, checkDot, smoother,
} from './05-circuits-kit.js';

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.7, gain: 1.1 },
  { t: 0.02, type: 'data', dur: 1.6, gain: 0.55 },
  { t: 0.1, type: 'swish', gain: 0.8, pan: 0.4 },
  { t: 0.22, type: 'whoosh', dur: 0.25, gain: 0.55, pan: -0.7 },
  { t: 0.36, type: 'whoosh', dur: 0.3, gain: 0.85, pan: 0.1 },      // sous l'arche
  { t: 0.5, type: 'whoosh', dur: 0.22, gain: 0.55, pan: 0.7 },
  { t: 0.72, type: 'whoosh', dur: 0.28, gain: 0.7 },               // ressource + zoom d'accroche
  { t: 1.0, type: 'hit', gain: 0.55 },
  { t: 1.0, type: 'riser', dur: 0.7, gain: 1.1 },                  // dolly zoom
  { t: 1.02, type: 'tick', gain: 0.3 },
  { t: 1.62, type: 'zap', gain: 0.8 },                             // le G s'allume
  { t: 1.7, type: 'whip', gain: 1, pan: -0.8 },                    // file à gauche
  { t: 2.0, type: 'hit', gain: 1.1 },                              // freine net
  { t: 2.0, type: 'scan', gain: 0.9 },
  { t: 2.02, type: 'slam', gain: 0.6 },
  { t: 2.14, type: 'pop', gain: 0.6, pan: -0.3 },
  { t: 2.21, type: 'pop', gain: 0.6, pan: 0 },
  { t: 2.28, type: 'pop', gain: 0.6, pan: 0.3 },
  { t: 2.3, type: 'success', gain: 0.45 },
  { t: 2.2, type: 'whoosh', dur: 0.6, gain: 0.9, pan: 0.5 },       // repart vers le haut
  { t: 2.3, type: 'riser', dur: 0.7, gain: 0.9 },
  { t: 2.56, type: 'flash', gain: 0.5 },                           // nappe de lumière
  { t: 2.72, type: 'suck', dur: 0.28, gain: 1 },
  { t: 2.86, type: 'zap', gain: 0.7 },                             // fissures
];

const T_ARCH = 0.36;

export default function create(ctx) {
  const { THREE, V, L, cfg } = ctx;
  const group = new THREE.Group();
  const u = L.u;
  const PK = cfg.vfx.particles;

  // =================================================================== CAMÉRA (pure)
  const Z0 = 14;
  const ZK = [[0, 11], [0.9, 10], [1.3, 12], [1.7, 9]];
  const zF = (t) => Z0 - speedRamp(clamp(t, 0, 1.7), ZK);
  const Z17 = zF(1.7);
  const DH1 = V ? 2.7 : 2.1;
  const YD = V ? 1.95 : 1.65;
  const SOC = [0, 0, Z17 - DH1];
  const SOC_T = [0, 0.16, SOC[2]];
  const FOV_S = V ? 74 : 56, FOV_0 = V ? 46 : 21, FOV_W = V ? 64 : 44;
  const fadeS = (t) => 1 - smoother(seg(t, 0.5, 0.95));
  const xs = (t) => (0.62 * Math.sin(t * 5.4 + 0.5) + 0.16 * Math.sin(t * 11 + 1.3)) * fadeS(t);
  const ysLow = (t) => (V ? 0.5 : 0.44) + (V ? 0.13 : 0.06) * Math.sin(t * 8.1) - 0.1 * Math.exp(-(((t - T_ARCH) / 0.08) ** 2));
  const pullK = (t) => smoother(seg(t, 0.55, 1.0));
  const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  function phaseA(t) { // 0 → 1.7 : rase-mottes, ressource, dolly zoom
    const pos = [xs(t), lerp(ysLow(t), YD, pullK(t)), zF(t)];
    const ahead = [xs(t + 0.22) * 0.85, pos[1] - 0.24, pos[2] - 4];
    const tw = smoother(seg(t, 0.6, 1.0));
    const target = [lerp(ahead[0], SOC_T[0], tw), lerp(ahead[1], SOC_T[1], tw), lerp(ahead[2], SOC_T[2], tw)];
    let fov;
    if (t < 1.0) fov = lerp(FOV_S, FOV_0, E.inOutCubic(seg(t, 0.62, 1.0)));
    else fov = (2 * Math.atan(K_DZ / dist3(pos, SOC_T)) * 180) / Math.PI;
    const roll = -0.2 * Math.sin(t * 5.4 + 1.1) * fadeS(t) + 0.03 * Math.sin(t * 3.1) + 0.11 * E.inOutSine(seg(t, 1.0, 1.7));
    return { pos, target, fov, roll };
  }
  // constante du dolly zoom : d · tan(fov/2) = K_DZ (taille du SoC constante)
  const P10 = [0, YD, zF(1.0)];
  const K_DZ = dist3(P10, SOC_T) * Math.tan((FOV_0 * Math.PI) / 360);
  const A17 = (() => { const p = [0, YD, Z17]; return { pos: p, target: SOC_T, fov: (2 * Math.atan(K_DZ / dist3(p, SOC_T)) * 180) / Math.PI, roll: 0.11 + 0.03 * Math.sin(1.7 * 3.1) }; })();

  // Changement de direction : file à gauche, freine net à 1.98, ressort, repart
  const DG = V ? [-4.4, 0, Z17 - 2.3] : [-5.4, 0, Z17 - 2.0];            // connecteur batterie (diagnostic)
  const DG_T = [DG[0], 0.18, DG[2]];
  const P_B = V ? [-4.3, YD - 0.45, Z17 + 0.75] : [-5.25, YD - 0.55, Z17 + 0.5];
  const WK = [[0, 0], [0.06, 1], [0.21, 1], [0.28, 0]];
  const WTOT = speedRamp(0.28, WK);
  const whipP = (t) => (t <= 1.7 ? 0 : t >= 1.98 ? 1 : speedRamp(t - 1.7, WK) / WTOT);
  function phaseB(t) {
    const w = whipP(t), wt = whipP(t + 0.025);
    const spring = t > 1.98 ? 0.2 * Math.exp(-(t - 1.98) / 0.07) * Math.sin((t - 1.98) * 34) : 0;
    const drift = Math.max(0, t - 1.98);
    const pos = [lerp(A17.pos[0], P_B[0], w) - spring + 0.35 * drift, lerp(A17.pos[1], P_B[1], w) + 0.05 * spring, lerp(A17.pos[2], P_B[2], w) - 0.5 * drift];
    const target = [lerp(SOC_T[0], DG_T[0], wt) - spring * 0.6, lerp(SOC_T[1], DG_T[1], wt), lerp(SOC_T[2], DG_T[2], wt)];
    const fov = lerp(A17.fov, FOV_W, E.inOutSine(seg(t, 1.7, 1.96)));
    const roll = lerp(A17.roll, -0.07, E.inOutCubic(seg(t, 1.7, 1.98))) + 0.05 * spring;
    return { pos, target, fov, roll };
  }

  // Montée vers la vitre : impact sous le point IMPACT de la vitre-plafond
  const WC = PANE.w * (V ? 11.5 : 12);              // largeur de la vitre-plafond (monde)
  const YG = 4.4;                                    // hauteur de la vitre
  const EC = [DG[0] + (V ? 1.5 : 2.3), YG - RACCORD.dist * WC, DG[2] + 0.4];
  // repère de la vitre : u (largeur) → -X, v (hauteur de l'écran) → +Z, face avant vers +Y (vue de dessous = à l'envers)
  const CEIL_C = [EC[0] + IMPACT[0] * WC, YG, EC[2] - IMPACT[1] * WC];
  const paneToWorld = (a, b) => [CEIL_C[0] - a * WC, YG - 0.003, CEIL_C[2] + b * WC];
  const B215 = phaseB(2.15);
  const RISE = [B215.pos, [B215.pos[0] + 0.85, B215.pos[1] + 0.45, B215.pos[2] - 0.3], [EC[0] - 0.22, 2.35, EC[2] + 0.42], EC];
  const RK = [[0, 0.35], [0.3, 1.25], [0.85, 3.1]];
  const RTOT = speedRamp(0.85, RK);
  const riseU = (t) => speedRamp(clamp(t - 2.15, 0, 0.85), RK) / RTOT;
  const dir0 = (() => { const d = [DG_T[0] - B215.pos[0], DG_T[1] - B215.pos[1], DG_T[2] - B215.pos[2]]; const l = Math.hypot(...d); return { yaw: Math.atan2(d[0], -d[2]), pitch: Math.asin(d[1] / l), l }; })();
  const PITCH_END = (80 * Math.PI) / 180;
  const FOV_END = V ? RACCORD.fovV : RACCORD.fovH;
  function phaseC(t) {
    const pos = catmull(RISE, riseU(t));
    const k = E.inOutCubic(seg(t, 2.17, 2.96));
    const pitch = lerp(dir0.pitch, PITCH_END, k);
    const yaw = lerp(dir0.yaw, 0, E.inOutSine(seg(t, 2.15, 2.8)));
    const dl = lerp(dir0.l, 1.6, smoother(seg(t, 2.15, 2.6)));
    const d = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    const target = [pos[0] + d[0] * dl, pos[1] + d[1] * dl, pos[2] + d[2] * dl];
    const fov = lerp(FOV_W, FOV_END, E.inOutSine(seg(t, 2.2, 2.9)));
    const roll = B215.roll * (1 - smoother(seg(t, 2.15, 2.5))) + 0.16 * Math.sin(Math.PI * seg(t, 2.25, 2.95)) * (V ? 0.6 : 1);
    return { pos, target, fov, roll };
  }

  function cam(lt) {
    if (lt < 1.7) return phaseA(lt);
    if (lt < 2.15) return phaseB(lt);
    return phaseC(lt);
  }

  // =================================================================== MONDE
  const sky = makeHazeSky(THREE, { dir: [0, 0.6, -1], haze: '#0b2a17' });
  group.add(sky.mesh);
  const FOG_COL = new THREE.Color('#06150c');
  const fog = new THREE.FogExp2(FOG_COL, 0.05);

  // ---------- carte mère géante (shader : vernis vert nuit, cuivre, or, sérigraphie, flux, AO)
  const TW = 7.5;
  const tx = makeBoardTextures(THREE, 2048);
  // Occlusion ambiante cuite (ombres de contact des composants) : remplie après le placement
  const AO_N = 1024, AO_X0 = -20, AO_Z0 = -22, AO_S = 40;
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = aoCanvas.height = AO_N;
  const aoG = aoCanvas.getContext('2d');
  aoG.fillStyle = '#000';
  aoG.fillRect(0, 0, AO_N, AO_N);
  const aoTex = new THREE.CanvasTexture(aoCanvas);
  aoTex.colorSpace = THREE.NoColorSpace;

  const boardMat = new THREE.ShaderMaterial({
    uniforms: {
      tMask: { value: tx.mask }, tFlow: { value: tx.flow }, tAO: { value: aoTex },
      uAO: { value: [AO_X0, AO_Z0, AO_S] },
      uTime: { value: 0 }, uTW: { value: TW }, uFogD: { value: 0.05 },
      uFlowK: { value: 3.2 }, uSurge: { value: 0 },
      uSweepX: { value: -99 }, uSweepK: { value: 0 },
      uWave: { value: new THREE.Vector4(0, 0, -1, 0) },
      uLdir: { value: new THREE.Vector3(-0.35, 0.32, -1).normalize() },
      uLcol: { value: new THREE.Color('#dfffe6').multiplyScalar(0.9) },
      uPpos: { value: new THREE.Vector3() }, uPcol: { value: new THREE.Color(C.neon).multiplyScalar(0.6) },
      uFog: { value: FOG_COL.clone() },
      uNeon: { value: new THREE.Color(C.neon) }, uTeal: { value: new THREE.Color(C.teal) },
      uGold: { value: new THREE.Color('#c9a54a') },
      uM1: { value: new THREE.Color('#020805') }, uM2: { value: new THREE.Color('#0a2a17') },
      uSilk: { value: new THREE.Color('#93a095') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMask, tFlow, tAO; uniform vec3 uAO;
      uniform float uTime, uTW, uFogD, uFlowK, uSurge, uSweepX, uSweepK; uniform vec4 uWave;
      uniform vec3 uLdir, uLcol, uPpos, uPcol, uFog, uNeon, uTeal, uGold, uM1, uM2, uSilk;
      varying vec3 vW;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 uv = vW.xz / uTW;
        vec4 m = texture2D(tMask, uv);
        vec4 fl = texture2D(tFlow, uv);
        float ao = texture2D(tAO, (vW.xz - uAO.xy) / uAO.z).r;
        vec2 cell = floor(uv);
        vec3 Vd = normalize(cameraPosition - vW);
        float n = vnoise(vW.xz * 0.45) * 0.6 + vnoise(vW.xz * 2.1) * 0.4;
        vec3 base = mix(uM1, uM2, n * 0.75);
        base = mix(base, uM2 * 1.8, m.r * 0.6);
        vec3 Ld = normalize(uLdir);
        float ndh = max(normalize(Ld + Vd).y, 0.0);
        vec3 lp = uPpos - vW; float ld2 = dot(lp, lp); vec3 Lp = lp * inversesqrt(max(ld2, 1e-4));
        float att = 1.0 / (1.0 + ld2 * 0.55);
        float ndhp = max(normalize(Lp + Vd).y, 0.0);
        vec3 lightD = uLcol * max(Ld.y, 0.0) + uPcol * att * max(Lp.y, 0.0) * 1.6;
        vec3 col = base * (0.3 + lightD);
        float fres = pow(1.0 - max(Vd.y, 0.0), 4.0);
        col += (uLcol * pow(ndh, 90.0) * 0.45 + uPcol * att * pow(ndhp, 60.0) * 0.7) * (1.0 - m.g) * (0.25 + fres);
        vec3 gold = uGold * (0.07 + lightD * 0.45) + uGold * (uLcol * pow(ndh, 28.0) * 1.1 + uPcol * att * pow(ndhp, 20.0) * 1.6);
        col = mix(col, gold, m.g * 0.92);
        col += uSilk * m.b * (0.035 + 0.2 * att);
        col *= 1.0 - ao * 0.82;
        // impulsions de données le long des pistes
        float id = fl.g;
        float act = 1.0 - step(0.6, id);
        float dir = id < 0.3 ? 1.0 : -1.0;
        float off = hash(cell + floor(id * 255.0) * 0.137);
        float spd = 0.5 + fract(id * 7.31) * 0.8 + uSurge * 1.4;
        float y = fract(dir * fl.r - uTime * spd + off);
        float pl = exp(-(1.0 - y) * 7.0);
        vec3 pc = mix(uNeon, uTeal, smoothstep(0.2, 0.6, fract(id * 3.7)));
        col += pc * fl.b * (act * pl * uFlowK * (1.0 + uSurge * 1.6) + 0.035 + uSurge * 0.05);
        // balayage de scan (diagnostic)
        float sw = exp(-pow((vW.x - uSweepX) * 2.4, 2.0)) * uSweepK;
        col += uNeon * sw * (0.05 + m.r * 0.5 + m.g * 0.35 + fl.b * 0.9);
        // onde d'énergie autour du SoC
        if (uWave.w > 0.001) {
          float dd = length(vW.xz - uWave.xy);
          float ring = exp(-pow((dd - uWave.z) * 3.0, 2.0)) * uWave.w;
          col += uNeon * ring * (0.04 + m.r * 0.5 + fl.b * 1.2);
        }
        float d = length(vW - cameraPosition);
        float fg = 1.0 - exp(-d * d * uFogD * uFogD);
        col = mix(col, uFog, fg);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), boardMat);
  board.rotation.x = -Math.PI / 2;
  board.position.set(0, 0, -2);
  board.renderOrder = -5;
  group.add(board);

  // ---------- éventail de pistes autour du SoC (additif) : les flux entrent dans la puce
  const FAN = 11;
  const fanMat = new THREE.ShaderMaterial({
    uniforms: {
      tFlow: { value: makeFanoutTexture(THREE, FAN, 3.3) }, uTime: { value: 0 }, uK: { value: 1 }, uSurge: { value: 0 },
      uNeon: { value: new THREE.Color(C.neon) }, uTeal: { value: new THREE.Color(C.teal) }, uFogD: { value: 0.05 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tFlow; uniform float uTime, uK, uSurge, uFogD; uniform vec3 uNeon, uTeal;
      varying vec2 vUv; varying vec3 vW;
      void main(){
        vec4 fl = texture2D(tFlow, vUv);
        float id = fl.g;
        float y = fract(fl.r - uTime * (1.3 + id * 3.0 + uSurge * 3.0) + id * 5.0);
        float p = exp(-(1.0 - y) * 5.0);
        vec3 c = mix(uNeon, uTeal, clamp(id * 3.0, 0.0, 1.0)) * fl.b * (p * (1.6 + uSurge * 5.0) + 0.06 + uSurge * 0.2) * uK;
        float d = length(vW - cameraPosition);
        c *= exp(-d * d * uFogD * uFogD);
        gl_FragColor = vec4(c, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const fan = new THREE.Mesh(new THREE.PlaneGeometry(FAN, FAN), fanMat);
  fan.rotation.x = -Math.PI / 2;
  fan.position.set(SOC[0], 0.004, SOC[2]);
  fan.renderOrder = 1;
  group.add(fan);

  // ---------- matériaux des composants
  const M = {
    epoxy: new THREE.MeshPhysicalMaterial({ color: '#0b0e0c', roughness: 0.38, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1.1 }),
    lid: new THREE.MeshPhysicalMaterial({ color: '#b2b8be', metalness: 1, roughness: 0.24, envMapIntensity: 1.25 }),
    dark: new THREE.MeshStandardMaterial({ color: '#3a3f44', metalness: 0.75, roughness: 0.42, envMapIntensity: 1.1 }),
    pin: new THREE.MeshStandardMaterial({ color: '#c6cbcf', metalness: 1, roughness: 0.28, envMapIntensity: 1.2 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c9a54a', metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }),
    sleeve: new THREE.MeshPhysicalMaterial({ color: '#0e1311', roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15, envMapIntensity: 1.2 }),
    alu: new THREE.MeshStandardMaterial({ color: '#b2b8be', metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }),
    smd: new THREE.MeshStandardMaterial({ color: '#1d2224', roughness: 0.55, metalness: 0.2 }),
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const unitRBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.07).translate(0, 0.5, 0);
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 28, 1).translate(0, 0.5, 0);
  const capTopGeo = new THREE.CylinderGeometry(0.96, 0.96, 1, 28, 1).translate(0, 0.5, 0);

  // ---------- placement procédural avec zones interdites (trajectoire caméra + lignes de visée)
  const camSamples = [];
  for (let t = 0; t <= 3.0001; t += 0.01) camSamples.push(cam(t).pos);
  const sight = [];
  for (let t = 0.75; t <= 1.7; t += 0.05) sight.push([cam(t).pos, SOC_T]);
  for (let t = 1.9; t <= 2.2; t += 0.05) sight.push([cam(t).pos, DG_T]);
  const allowedH = (x, z, rad) => {
    let h = 9;
    for (const p of camSamples) {
      const d = Math.hypot(p[0] - x, p[2] - z);
      if (d < rad + 0.34) h = Math.min(h, p[1] - 0.24);
    }
    for (const [a, b] of sight) {
      for (let k = 0; k <= 24; k++) {
        const s = k / 24;
        const px = lerp(a[0], b[0], s), py = lerp(a[1], b[1], s), pz = lerp(a[2], b[2], s);
        if (Math.hypot(px - x, pz - z) < rad + 0.12) h = Math.min(h, py - 0.06);
      }
    }
    return h;
  };
  const placed = [];
  const free = (x, z, rad) => {
    if (Math.abs(x - SOC[0]) < 2.4 + rad && Math.abs(z - SOC[2]) < 2.4 + rad) return false;
    if (Math.hypot(x - DG[0], z - DG[2]) < 1.3 + rad) return false;
    for (const o of placed) if (Math.hypot(o.x - x, o.z - z) < o.r + rad + 0.06) return false;
    return true;
  };
  const lists = { epoxy: [], lid: [], dark: [], pin: [], sleeve: [], capTop: [], smd: [] };
  const add = (list, x, y, z, sx, sy, sz, ry = 0) => lists[list].push([x, y, z, sx, sy, sz, ry]);
  const aoRect = (x, z, w, d, ry, a) => {
    const px = ((x - AO_X0) / AO_S) * AO_N, pz = ((z - AO_Z0) / AO_S) * AO_N, s = AO_N / AO_S;
    aoG.save();
    aoG.translate(px, pz);
    aoG.rotate(-ry);
    aoG.fillStyle = `rgba(255,255,255,${a})`;
    aoG.fillRect((-w / 2) * s - 3, (-d / 2) * s - 3, w * s + 6, d * s + 6);
    aoG.restore();
  };
  const aoDisk = (x, z, rr, a) => {
    const s = AO_N / AO_S;
    aoG.fillStyle = `rgba(255,255,255,${a})`;
    aoG.beginPath(); aoG.arc(((x - AO_X0) / AO_S) * AO_N, ((z - AO_Z0) / AO_S) * AO_N, rr * s + 3, 0, TAU); aoG.fill();
  };
  aoG.filter = `blur(${Math.round(AO_N / AO_S * 0.09)}px)`;

  function addQFP(x, z, s, ry) {
    const h = 0.085;
    add('epoxy', x, 0.012, z, s, h, s, ry);
    const n = Math.max(5, Math.floor(s / 0.075));
    const c = Math.cos(ry), sn = Math.sin(ry);
    for (let side = 0; side < 4; side++) {
      for (let k = 0; k < n; k++) {
        const along = (k - (n - 1) / 2) * (s * 0.86 / n);
        let lx, lz, rot;
        if (side === 0) { lx = along; lz = s / 2 + 0.035; rot = 0; }
        else if (side === 1) { lx = along; lz = -s / 2 - 0.035; rot = 0; }
        else if (side === 2) { lx = s / 2 + 0.035; lz = along; rot = Math.PI / 2; }
        else { lx = -s / 2 - 0.035; lz = along; rot = Math.PI / 2; }
        add('pin', x + lx * c + lz * sn, 0, z - lx * sn + lz * c, 0.028, 0.035, 0.085, ry + rot);
      }
    }
    aoRect(x, z, s + 0.12, s + 0.12, ry, 0.9);
  }
  function addBGA(x, z, w, d, ry, steel) {
    add(steel ? 'lid' : 'epoxy', x, 0.018, z, w, steel ? 0.1 : 0.12, d, ry);
    add('smd', x, 0, z, w * 1.04, 0.02, d * 1.04, ry);
    aoRect(x, z, w, d, ry, 0.95);
  }
  function addInductor(x, z, s, h) { add('dark', x, 0, z, s, h, s, 0); aoRect(x, z, s * 1.1, s * 1.1, 0, 1); }
  function addCap(x, z, rad, h) {
    add('sleeve', x, 0, z, rad, h, rad, 0);
    add('capTop', x, h, z, rad, 0.012, rad, 0);
    aoDisk(x, z, rad * 1.25, 1);
  }

  const R = rng(9001);
  // portes de composants hauts le long du rase-mottes (frôlements)
  for (let t = 0.05; t < 0.72; t += 0.055) {
    const p = cam(t).pos;
    for (const side of [-1, 1]) {
      if (R() < 0.35) continue;
      const off = 0.58 + R() * 0.45;
      const x = p[0] + side * off, z = p[2] + (R() - 0.5) * 0.3;
      const tall = R() < 0.6;
      const rad = tall ? 0.15 + R() * 0.09 : 0.2 + R() * 0.08;
      if (!free(x, z, rad)) continue;
      const hmax = allowedH(x, z, rad);
      const h = Math.min(tall ? 0.55 + R() * 0.35 : 0.3 + R() * 0.16, hmax);
      if (h < 0.18) continue;
      placed.push({ x, z, r: rad });
      if (tall) addCap(x, z, rad, h); else addInductor(x, z, rad * 1.7, h);
    }
  }
  // remplissage aléatoire
  for (let i = 0; i < 2600 && placed.length < 330; i++) {
    const x = (R() - 0.5) * 30, z = -19 + R() * 37;
    const ty = R();
    if (ty < 0.3) {
      const s = 0.5 + R() * 0.7, rad = s * 0.75;
      if (!free(x, z, rad) || allowedH(x, z, rad) < 0.1) continue;
      placed.push({ x, z, r: rad }); addQFP(x, z, s, R() < 0.8 ? 0 : Math.PI / 4);
    } else if (ty < 0.55) {
      const w = 0.7 + R() * 1.1, d = 0.6 + R() * 0.9, rad = Math.hypot(w, d) / 2;
      if (!free(x, z, rad) || allowedH(x, z, rad) < 0.14) continue;
      placed.push({ x, z, r: rad }); addBGA(x, z, w, d, 0, R() < 0.35);
    } else if (ty < 0.72) {
      const s = 0.3 + R() * 0.25, rad = s * 0.72;
      if (!free(x, z, rad)) continue;
      const h = Math.min(0.28 + R() * 0.2, allowedH(x, z, rad));
      if (h < 0.15) continue;
      placed.push({ x, z, r: rad }); addInductor(x, z, s, h);
    } else if (ty < 0.86) {
      const rad = 0.12 + R() * 0.12;
      if (!free(x, z, rad)) continue;
      const h = Math.min(0.4 + R() * 0.45, allowedH(x, z, rad));
      if (h < 0.2) continue;
      placed.push({ x, z, r: rad }); addCap(x, z, rad, h);
    } else {
      // rangée de petits CMS
      const n = 3 + Math.floor(R() * 6), vert = R() < 0.5, rad = n * 0.09;
      if (!free(x, z, rad)) continue;
      placed.push({ x, z, r: rad });
      for (let k = 0; k < n; k++) {
        const o = (k - (n - 1) / 2) * 0.13;
        add('smd', x + (vert ? 0 : o), 0, z + (vert ? o : 0), vert ? 0.11 : 0.06, 0.045, vert ? 0.06 : 0.11, 0);
      }
    }
  }
  // capots de blindage (grandes surfaces réfléchissantes sous la trajectoire)
  for (const [t, w, d] of [[0.12, 1.9, 1.3], [0.52, 2.2, 1.5]]) {
    const p = cam(t).pos;
    add('lid', p[0] + 0.1, 0, p[2] - 0.6, w, 0.09, d, 0);
    aoRect(p[0] + 0.1, p[2] - 0.6, w, d, 0, 0.6);
  }
  // découplage autour du SoC
  for (let k = 0; k < 36; k++) {
    const side = k % 4, j = Math.floor(k / 4);
    const o = (j - 4) * 0.36;
    const off = 1.95 + (k % 3) * 0.12;
    const x = SOC[0] + (side === 0 ? o : side === 1 ? o : side === 2 ? off : -off);
    const z = SOC[2] + (side === 0 ? off : side === 1 ? -off : o);
    add('smd', x, 0, z, side < 2 ? 0.12 : 0.065, 0.05, side < 2 ? 0.065 : 0.12, 0);
  }
  aoRect(SOC[0], SOC[2], 3.4, 3.4, 0, 1);
  // connecteur batterie (cible du diagnostic)
  add('lid', DG[0], 0, DG[2], 1.6, 0.26, 0.42, 0);
  add('epoxy', DG[0], 0.26, DG[2], 1.5, 0.05, 0.34, 0);
  aoRect(DG[0], DG[2], 1.7, 0.6, 0, 1);
  // pistes dorées du connecteur
  for (let k = 0; k < 18; k++) add('pin', DG[0] - 0.68 + k * 0.08, 0, DG[2] + 0.27, 0.035, 0.03, 0.14, 0);

  // InstancedMesh par matériau
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3();
  const inst = (list, geo, mat) => {
    const arr = lists[list];
    if (!arr.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach(([x, y, z, sx, sy, sz, ry], i) => {
      e.set(0, ry, 0); q.setFromEuler(e); vp.set(x, y, z); vs.set(sx, sy, sz);
      mtx.compose(vp, q, vs); m.setMatrixAt(i, mtx);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    group.add(m);
    return m;
  };
  inst('epoxy', unitRBox, M.epoxy);
  inst('lid', unitRBox, M.lid);
  inst('dark', unitRBox, M.dark);
  inst('pin', unitBox, M.pin);
  inst('smd', unitBox, M.smd);
  inst('sleeve', unitCyl, M.sleeve);
  inst('capTop', capTopGeo, M.alu);
  aoTex.needsUpdate = true;

  // ---------- SoC central : substrat + capot métal gravé « G » (gravure lumineuse)
  const socG = new THREE.Group();
  socG.position.set(SOC[0], 0, SOC[2]);
  group.add(socG);
  const subTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#0a2014'; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#c9a54a';
    for (let k = 0; k < 4; k++) for (let i = 0; i < 26; i++) {
      const a = 30 + i * 17.5;
      if (k === 0) g.fillRect(a, 8, 9, 16); else if (k === 1) g.fillRect(a, 488, 9, 16);
      else if (k === 2) g.fillRect(8, a, 16, 9); else g.fillRect(488, a, 16, 9);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.07, 3.3).translate(0, 0.035, 0),
    new THREE.MeshPhysicalMaterial({ map: subTex, roughness: 0.4, metalness: 0.3, clearcoat: 0.6 }));
  socG.add(substrate);
  const lidTex = (emissive) => {
    const N = 1024;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    if (!emissive) {
      g.fillStyle = '#d4d8db'; g.fillRect(0, 0, N, N);
      const r = rng(5);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,46,50'},${0.03 + r() * 0.05})`; g.fillRect(0, r() * N, N, 1 + r() * 2); }
    } else { g.fillStyle = '#000'; g.fillRect(0, 0, N, N); }
    const ink = emissive ? C.neon : '#4a5156';
    const s = N * 0.5, x = N / 2 - s / 2, y = N * 0.42 - s / 2;
    g.save();
    if (emissive) { g.shadowColor = C.neon; g.shadowBlur = 26; }
    g.strokeStyle = ink; g.lineWidth = N * 0.022;
    g.beginPath(); g.roundRect(x, y, s, s, s * 0.28); g.stroke();
    setFont(g, s * 0.72, 800, 0);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = ink;
    g.fillText('G', N / 2, N * 0.42 + s * 0.04);
    setFont(g, N * 0.075, 800, 0.08);
    g.textBaseline = 'alphabetic';
    const gw = textWidth(g, 'GSM', N * 0.075, 800, 0.08), cw = textWidth(g, 'CENTER', N * 0.075, 800, 0.08), sp = N * 0.03;
    const x0 = N / 2 - (gw + sp + cw) / 2;
    g.textAlign = 'left';
    g.fillStyle = emissive ? '#f4f8f4' : '#4a5156';
    g.fillText('GSM', x0, N * 0.85);
    g.fillStyle = ink;
    g.fillText('CENTER', x0 + gw + sp, N * 0.85);
    g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: '#c3c8cc', map: lidTex(false), metalness: 0.85, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2,
    emissive: '#ffffff', emissiveMap: lidTex(true), emissiveIntensity: 0, envMapIntensity: 1.2,
  });
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.22, 2.5, 3, 0.05).translate(0, 0.07 + 0.11, 0), lidMat);
  socG.add(lidMesh);

  // ---------- nappe flex en arche au-dessus de la trajectoire (on passe dessous)
  const archP = cam(T_ARCH).pos;
  const flexTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 1024);
    for (let i = 0; i < 9; i++) {
      const x = 12 + i * 13;
      g.fillStyle = 'rgba(57,255,20,0.35)'; g.fillRect(x, 0, 4, 1024);
      for (let k = 0; k < 4; k++) { g.fillStyle = i % 3 ? '#39ff14' : '#14e0a0'; g.fillRect(x - 1, (k * 256 + i * 61) % 1024, 6, 70); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const archGeo = (() => {
    const g = new THREE.PlaneGeometry(0.85, 7.4, 1, 80);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const along = p.getY(i) / 3.7; // -1..1
      const x = p.getX(i);
      const y = 0.98 * Math.pow(Math.max(0, 1 - along * along), 0.55);
      p.setXYZ(i, along * 3.7, y, x);
    }
    g.computeVertexNormals();
    return g;
  })();
  const archMat = new THREE.MeshStandardMaterial({
    color: '#0c0f0e', roughness: 0.28, metalness: 0.25, emissive: '#ffffff', emissiveMap: flexTex, emissiveIntensity: 1.4,
    side: THREE.DoubleSide, envMapIntensity: 1.3,
  });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.set(archP[0], 0, archP[2]);
  arch.rotation.y = 0.12;
  group.add(arch);
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(unitRBox, M.lid);
    b.scale.set(0.5, 0.16, 1.0);
    b.position.set(archP[0] + sx * 3.75 * Math.cos(0.12), 0, archP[2] - sx * 3.75 * Math.sin(0.12));
    group.add(b);
  }

  // ---------- couches au-dessus : nappe de lumière + vitre de l'écran (vue de l'intérieur)
  const sheetMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uC: { value: new THREE.Vector2(EC[0], EC[2]) }, uNeon: { value: new THREE.Color(C.neon) }, uTeal: { value: new THREE.Color(C.teal) } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uK; uniform vec2 uC; uniform vec3 uNeon, uTeal; varying vec3 vW;
      void main(){
        vec2 p = vW.xz - uC;
        float r = length(p);
        vec2 gq = abs(fract(vW.xz * 2.2) - 0.5);
        float grid = smoothstep(0.47, 0.5, max(gq.x, gq.y));
        vec2 dq = fract(vW.xz * 6.6) - 0.5;
        float dots = smoothstep(0.16, 0.05, length(dq));
        float wave = exp(-pow((r - mod(uTime * 5.0, 9.0)) * 1.4, 2.0));
        float fall = exp(-r * r * 0.05);
        vec3 c = (uNeon * (grid * 0.5 + wave * 0.9) + uTeal * dots * 0.35) * fall * uK + uNeon * 0.03 * fall * uK;
        gl_FragColor = vec4(c, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const SHEET_Y = 2.35;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), sheetMat);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(EC[0], SHEET_Y, EC[2]);
  sheet.renderOrder = 4;
  group.add(sheet);

  const screen = createScreen(cfg);
  const ceilGeo = new THREE.PlaneGeometry(WC, WC * PANE.hh * 2);
  ceilGeo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
  const ceilMat = new THREE.MeshBasicMaterial({ map: screen.tex, color: new THREE.Color(0.5, 0.56, 0.52), side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.position.set(CEIL_C[0], YG, CEIL_C[2]);
  group.add(ceil);
  // halo de rétroéclairage sous la vitre
  const glowTex = glowTexture(THREE, 256, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
  const ceilGlow = glowSprite(THREE, glowTex, C.neon, 0.0);
  ceilGlow.scale.set(WC * 1.1, WC * 2.3, 1);
  ceilGlow.rotation.x = Math.PI / 2;
  ceilGlow.position.set(CEIL_C[0], YG - 0.05, CEIL_C[2]);
  group.add(ceilGlow);
  // puits de lumière (rayons) entre la vitre et la carte
  const shaftTex = shaftTexture(THREE);
  const shafts = [];
  const RS = rng(31);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: shaftTex, color: new THREE.Color(i % 3 === 0 ? C.teal : '#9dffb0'), transparent: true, opacity: 0.12,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    }));
    const w = 0.5 + RS() * 1.3;
    m.scale.set(w, YG, 1);
    m.position.set(EC[0] + (RS() - 0.5) * 9, YG / 2, EC[2] + (RS() - 0.5) * 9 + 1);
    m.userData.base = 0.06 + RS() * 0.1;
    m.renderOrder = 5;
    shafts.push(m);
    group.add(m);
  }

  // ---------- particules (poussière + étincelles de données)
  const mkPts = (count, box, size, color, opacity, seed, drift, center) => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3), sd = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = (r() - 0.5) * box[0]; pos[i * 3 + 1] = (r() - 0.5) * box[1]; pos[i * 3 + 2] = (r() - 0.5) * box[2]; sd[i] = r(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const mat = new THREE.ShaderMaterial({
      ...ParticleShader, uniforms: THREE.UniformsUtils.clone(ParticleShader.uniforms),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    mat.uniforms.uColor.value = new THREE.Color(color);
    mat.uniforms.uOpacity.value = opacity;
    mat.uniforms.uSize.value = size;
    mat.uniforms.uBox.value = box;
    mat.uniforms.uDrift.value = drift;
    mat.uniforms.uPixel.value = ctx.H / 1080;
    const p = new THREE.Points(geo, mat);
    p.position.set(...center);
    p.frustumCulled = false;
    group.add(p);
    return p;
  };
  const dust = mkPts(Math.round(2200 * PK), [14, 4.4, 30], 7, '#d8f5df', 0.5, 51, [0.02, 0.06, 0.01], [-1.5, 2.2, 2]);
  const motes = mkPts(Math.round(380 * PK), [14, 4.4, 30], 15, C.neon, 0.85, 52, [0.03, 0.18, 0.02], [-1.5, 2.2, 2]);

  // ---------- lumières du segment
  const sun = new THREE.DirectionalLight(new THREE.Color('#e6fff0'), 1.4);
  sun.position.set(-4, 1.6, -12);
  const camLight = new THREE.PointLight(new THREE.Color(C.neon), 6, 7, 2);
  const socLight = new THREE.PointLight(new THREE.Color('#eaffea'), 0, 6, 2);
  socLight.position.set(SOC[0] + 0.6, 1.5, SOC[2] + 1.4);
  const rimLight = new THREE.PointLight(new THREE.Color(C.teal), 5, 9, 2);
  const diagLight = new THREE.PointLight(new THREE.Color(C.neon), 0, 4, 2);
  diagLight.position.set(DG[0], 0.9, DG[2] + 0.7);
  group.add(sun, camLight, socLight, rimLight, diagLight);

  // fissures (projetées sur le calque fx)
  const FR = fracture();
  const crackPts = FR.cracks.map((c) => ({ ...c, A: paneToWorld(c.a[0], c.a[1]), B: paneToWorld(c.b[0], c.b[1]) }));
  const IMP_W = paneToWorld(IMPACT[0], IMPACT[1]);
  const LID_CORNERS = [[-1.25, 0.29, -1.25], [1.25, 0.29, -1.25], [1.25, 0.29, 1.25], [-1.25, 0.29, 1.25]].map(([x, y, z]) => [SOC[0] + x, y, SOC[2] + z]);
  const DG_CORNERS = [[-0.85, 0, -0.3], [0.85, 0, -0.3], [0.85, 0.34, 0.3], [-0.85, 0.34, 0.3], [-0.85, 0.34, -0.3], [0.85, 0.34, -0.3], [0.85, 0, 0.3], [-0.85, 0, 0.3]].map(([x, y, z]) => [DG[0] + x, y, DG[2] + z]);
  const LANES = (() => { const r = rng(606); return Array.from({ length: 18 }, () => ({ x: (r() - 0.5) * 5.5, v: 14 + r() * 14, ph: r(), len: 0.9 + r() * 1.4, w: 1 + r() * 2.2, teal: r() < 0.3 })); })();

  // =================================================================== UPDATE
  const tmpV = new THREE.Vector3();
  const screenBox = (pts, f) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
    for (const p of pts) { const s = f.project(p); if (s[2] > 1) ok = false; x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]); }
    return ok ? [x0, y0, x1, y1] : null;
  };

  return {
    group,
    camera(lt) {
      const c = cam(lt);
      return { pos: c.pos, target: c.target, roll: c.roll, fov: c.fov, near: 0.02, far: 140 };
    },
    update(f) {
      const { lt, t, fx, ui, post, W, H, world } = f;
      const c = f.cam;
      const camPos = c.pos;
      const scene = f.scene;
      scene.fog = fog;
      world.studio.update(t, { backdrop: false, grid: 0, beams: 0, dust: 0, motes: 0, env: 0.9, envRot: 0.4 + lt * 0.7, rim: 0, key: 0.18, glow: 0 });
      sky.mesh.position.set(camPos[0], camPos[1], camPos[2]);
      sky.mat.uniforms.uTime.value = t;
      sky.mat.uniforms.uK.value = 1 + 0.6 * seg(lt, 2.2, 3.0);

      // ----- carte
      const U = boardMat.uniforms;
      U.uTime.value = t;
      const surge = win(lt, 1.05, 1.5, 1.68, 1.85, E.inCubic, E.outCubic) + 0.7 * win(lt, 1.98, 2.03, 2.2, 2.45);
      U.uSurge.value = surge;
      fanMat.uniforms.uTime.value = t;
      fanMat.uniforms.uSurge.value = surge;
      fanMat.uniforms.uK.value = 0.6 + 0.8 * seg(lt, 0.6, 1.2);
      // lumière ponctuelle neon devant la caméra (flaques vertes sur la carte et les puces)
      const fwd = tmpV.set(c.target[0] - camPos[0], c.target[1] - camPos[1], c.target[2] - camPos[2]).normalize();
      camLight.position.set(camPos[0] + fwd.x * 2.2, Math.max(0.35, camPos[1] - 0.1 + fwd.y * 1.2), camPos[2] + fwd.z * 2.2);
      camLight.intensity = 5 + 2 * Math.sin(t * 9);
      U.uPpos.value.copy(camLight.position);
      U.uPcol.value.setRGB(0.05, 0.6, 0.1).multiplyScalar(0.7 + 0.25 * Math.sin(t * 9));
      rimLight.position.set(camPos[0] + 2.5 * Math.sin(t * 1.3), 1.2, camPos[2] - 6);
      // balayage de scan (diagnostic) + onde d'énergie
      const sc = seg(lt, 1.99, 2.36);
      U.uSweepX.value = lerp(DG[0] - 3.5, DG[0] + 4.5, E.inOutSine(sc));
      U.uSweepK.value = sc > 0 && sc < 1 ? 1.2 : 0;
      const wv = seg(lt, 1.62, 2.4);
      U.uWave.value.set(SOC[0], SOC[2], 1.6 + 9 * E.outCubic(wv), wv > 0 && wv < 1 ? 1.4 * (1 - wv) : 0);
      // SoC : le G s'allume pendant le dolly zoom
      const gOn = E.inCubic(seg(lt, 0.95, 1.62)) * 2.2 + 1.8 * Math.exp(-Math.max(0, lt - 1.62) / 0.12) * (lt > 1.62 ? 1 : 0);
      lidMat.emissiveIntensity = gOn * (0.85 + 0.15 * Math.sin(t * 23));
      socLight.intensity = 3 + 9 * seg(lt, 0.8, 1.5);
      diagLight.intensity = 14 * Math.exp(-Math.max(0, lt - 2.0) / 0.25) * (lt > 1.97 ? 1 : 0);
      sun.intensity = 1.3 + 0.4 * Math.sin(t * 0.8);
      archMat.emissiveIntensity = 1.2 + 0.6 * Math.sin(t * 12);
      flexTex.offset.y = -t * 1.6;
      // couches supérieures
      sheetMat.uniforms.uTime.value = t;
      sheetMat.uniforms.uK.value = 0.15 + 1.3 * win(lt, 2.2, 2.5, 2.62, 2.85);
      const tUI = 2.6 + lt * 0.4;
      screen.draw('store', tUI, { cardsAt: 0, pillsAt: 0.2, buttonsAt: 9, brightness: 0.85 + 0.15 * seg(lt, 2.3, 2.9) });
      ceilMat.color.setScalar(0.42 + 0.35 * seg(lt, 2.2, 2.95));
      ceilGlow.material.opacity = 0.05 + 0.3 * seg(lt, 2.0, 2.9);
      for (const s of shafts) {
        s.rotation.y = Math.atan2(camPos[0] - s.position.x, camPos[2] - s.position.z);
        s.material.opacity = s.userData.base * (0.6 + 0.8 * seg(lt, 1.8, 2.7)) * (0.75 + 0.25 * Math.sin(t * 3 + s.position.x));
      }
      for (const p of [dust, motes]) p.material.uniforms.uTime.value = t;

      // ================================================= post-production
      post.flashColor = [0.6, 1, 0.6];
      post.flash = 1 - E.outCubic(seg(lt, 0, 0.3));                         // sortie de la traversée 2
      post.flash = Math.max(post.flash, 0.22 * Math.exp(-Math.max(0, lt - 2.0) / 0.08) * (lt >= 2.0 ? 1 : 0));
      post.flash = Math.max(post.flash, 0.16 * win(lt, 2.5, 2.56, 2.6, 2.7));   // traversée de la nappe
      if (lt > 2.84) { post.flashColor = [0.75, 1, 0.8]; post.flash = Math.max(post.flash, 0.92 * E.inCubic(seg(lt, 2.84, 3.0))); }
      post.bloom = 0.7 + 0.25 * surge;
      post.vignette = 1.0;
      post.grain = 0.05;
      // zoom d'accroche : flou de zoom ajouté (le flou auto ne voit pas la focale)
      const fovRate = (cam(Math.min(3, lt + 1 / 60)).fov - c.fov) * 60;
      post.zoomBlur += clamp(-fovRate * 0.0009, -0.08, 0.08);
      // whip : filé horizontal renforcé
      const wspd = (whipP(lt + 0.008) - whipP(lt - 0.008)) / 0.016;
      post.blur[0] += Math.sign(post.blur[0] || 1) * 0.012 * wspd;
      post.ca += 0.002 * surge + 0.004 * win(lt, 1.98, 2.0, 2.05, 2.2) + 0.003 * seg(lt, 2.8, 3.0);
      post.dof = lt > 1.0 && lt < 1.7 ? { focus: dist3(camPos, SOC_T), aperture: 0.0035, maxblur: 0.008 } : null;
      post.uiBlur = 0.15;

      // ================================================= calque FX (lumière)
      // lignes de vitesse depuis le point de fuite
      const vp = f.project([camPos[0] + fwd.x * 20, camPos[1] + fwd.y * 20, camPos[2] + fwd.z * 20]);
      const spk = 0.85 * win(lt, 0, 0.05, 0.75, 1.0) + 0.55 * win(lt, 1.68, 1.75, 1.92, 2.0) + 0.6 * win(lt, 2.4, 2.6, 2.85, 3.0);
      if (vp[2] < 1) speedLines(fx, W, H, t, spk, { cx: vp[0] / W, cy: vp[1] / H, count: 140, speed: 2.4, seed: 51 });
      // impulsions qui doublent la caméra au ras de la carte
      if (lt < 1.05) {
        const lk = 1 - seg(lt, 0.85, 1.05);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (const ln of LANES) {
          const rel = 2.5 - ((ln.ph + lt * (ln.v - 10) / 14) % 1) * 14;   // tête : de derrière la caméra vers l'avant
          const zh = camPos[2] + rel;
          const a = f.project([ln.x + camPos[0] * 0.3, 0.02, zh]);
          const b = f.project([ln.x + camPos[0] * 0.3, 0.02, zh + ln.len]);
          if (a[2] > 1 || b[2] > 1) continue;
          streak(fx, b[0], b[1], a[0], a[1], ln.w * u * 2.2, ln.teal ? C.teal : C.neon, 0.85 * lk);
        }
        fx.restore();
      }
      // halo du SoC / flare quand le G s'allume
      const socS = f.project([SOC[0], 0.32, SOC[2]]);
      if (socS[2] < 1 && lt > 0.7 && lt < 2.0) {
        fx.save(); fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, socS[0], socS[1], 380 * u, C.neon, 0.12 * seg(lt, 0.8, 1.5) * (1 - seg(lt, 1.75, 1.95)));
        fx.restore();
        flare(fx, socS[0], socS[1] - 30 * u, 0.9 * Math.exp(-Math.abs(lt - 1.64) / 0.07) * (lt > 1.5 ? 1 : 0), f, C.neon);
      }
      // scan : bande verticale qui balaie l'image
      if (sc > 0 && sc < 1) {
        const sx = lerp(-0.1 * W, 1.1 * W, E.inOutSine(sc));
        fx.save(); fx.globalCompositeOperation = 'lighter';
        const grd = fx.createLinearGradient(sx - 160 * u, 0, sx + 30 * u, 0);
        grd.addColorStop(0, rgba(C.neon, 0)); grd.addColorStop(0.85, rgba(C.neon, 0.22)); grd.addColorStop(1, rgba('#eaffea', 0.9));
        fx.fillStyle = grd; fx.fillRect(sx - 160 * u, 0, 190 * u, H);
        fx.restore();
      }
      // freinage : étincelles + onde au contact
      const dgS = f.project(DG_T);
      if (lt > 1.98 && lt < 2.5 && dgS[2] < 1) {
        sparks(fx, dgS[0], dgS[1], lt - 2.0, f, { count: 50, life: 0.45, speed: 1300, seed: 23, flat: 0.5 });
        shockRing(fx, dgS[0], dgS[1], lt - 2.0, f, { dur: 0.4, radius: 620, width: 8, alpha: 0.55, flat: 0.45 });
      }
      // rayons depuis la vitre pendant la montée
      if (lt > 2.15) {
        const imp = f.project(IMP_W);
        if (imp[2] < 1) godRays(fx, imp[0], imp[1], Math.max(W, H) * 0.9, t, 0.5 * seg(lt, 2.3, 2.85), { count: 16, seed: 91, spin: 0.25 });
      }
      // fissures : naissent au point d'impact juste avant 3.00
      if (lt > 2.8) {
        const G = 1.7 * E.outCubic(seg(lt, 2.82, 2.995));
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        fx.lineCap = 'round';
        for (const cr of crackPts) {
          if (G <= cr.r0) continue;
          const k = clamp((G - cr.r0) / Math.max(1e-3, cr.r1 - cr.r0));
          const pb = [lerp(cr.A[0], cr.B[0], k), lerp(cr.A[1], cr.B[1], k), lerp(cr.A[2], cr.B[2], k)];
          const a = f.project(cr.A), b = f.project(pb);
          if (a[2] > 1 || b[2] > 1) continue;
          const al = cr.kind === 'r' ? 1 : 0.7;
          fx.strokeStyle = rgba(C.neon, 0.35 * al);
          fx.lineWidth = 9 * u;
          fx.beginPath(); fx.moveTo(a[0], a[1]); fx.lineTo(b[0], b[1]); fx.stroke();
          fx.strokeStyle = rgba('#f0fff2', 0.95 * al);
          fx.lineWidth = 2.2 * u;
          fx.stroke();
        }
        fx.restore();
        const imp = f.project(IMP_W);
        if (imp[2] < 1) { fx.save(); fx.globalCompositeOperation = 'lighter'; radialGlow(fx, imp[0], imp[1], 260 * u, '#ffffff', 0.5 * seg(lt, 2.84, 3.0)); fx.restore(); }
      }

      // ================================================= calque UI (texte net)
      const S = L.safe;
      // ----- « 02 — RÉPARER »
      if (lt < 1.0) {
        const kIn = E.outExpo(seg(lt, 0.06, 0.4));
        const kOut = E.inCubic(seg(lt, 0.7, 0.95));
        const a = clamp(kIn * 1.4) * (1 - kOut);
        if (a > 0.003) {
          const big = V ? Math.min(200 * u, (S.w * 0.92) / 5.6) : 205 * u;
          const small = big * 0.36;
          const word = 'RÉPARER';
          setFont(ui, big, 900, -0.02);
          const ww = textWidth(ui, word, big, 900, -0.02);
          const cx = V ? S.cx : S.l + ww / 2;
          const by = V ? S.t + S.h * 0.2 + big : S.t + H * 0.06 + big * 1.25;
          const drift = (V ? 0 : -60 * u) * lt;
          scrimRadial(ui, cx, by - big * 0.45, ww * 0.9, big * 1.5, 0.55 * a);
          ui.save();
          ui.translate(cx + drift, by - big * 0.35);
          const sc = 1 + 0.9 * kOut;
          ui.scale(sc, sc);
          ui.translate(-cx, -(by - big * 0.35));
          ui.globalAlpha = a;
          // petit « 02 — » fin + trait néon
          setFont(ui, small, 200, 0.12);
          ui.textBaseline = 'alphabetic';
          ui.textAlign = 'left';
          const lx = cx - ww / 2;
          ui.fillStyle = C.neon;
          ui.fillText('02', lx + 4 * u, by - big * 1.0);
          const n2 = textWidth(ui, '02', small, 200, 0.12);
          ui.fillRect(lx + n2 + 22 * u, by - big * 1.0 - small * 0.33, 90 * u * kIn, 3 * u);
          // mot géant : lettres qui arrivent de la droite avec décalage
          setFont(ui, big, 900, 0);
          let x = lx;
          for (let i = 0; i < word.length; i++) {
            const ch = word[i];
            const cw = textWidth(ui, ch, big, 900, 0);
            const p = E.outExpo(seg(lt, 0.06 + i * 0.035, 0.36 + i * 0.035));
            ui.save();
            ui.globalAlpha = a * clamp(p * 1.5);
            ui.translate(x + (1 - p) * 420 * u, by);
            ui.fillStyle = C.white;
            ui.fillText(ch, 0, 0);
            ui.restore();
            x += cw - big * 0.02;
          }
          ui.restore();
        }
      }
      // ----- HUD de visée sur le SoC pendant le dolly zoom
      if (lt > 0.85 && lt < 1.82) {
        const box = screenBox(LID_CORNERS, f);
        const a = win(lt, 0.88, 1.02, 1.66, 1.8);
        if (box && a > 0.003) {
          const pad = lerp(140, 26, E.outExpo(seg(lt, 0.88, 1.15))) * u;
          const [x0, y0, x1, y1] = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
          brackets(ui, x0, y0, x1, y1, 46 * u, 3.5 * u, C.neon, a);
          ui.save();
          ui.globalAlpha = a * 0.8;
          ui.strokeStyle = rgba(C.neon, 0.5);
          ui.lineWidth = 1.2 * u;
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          ui.beginPath();
          ui.moveTo(0, my); ui.lineTo(x0 - 20 * u, my); ui.moveTo(x1 + 20 * u, my); ui.lineTo(W, my);
          ui.moveTo(mx, 0); ui.lineTo(mx, y0 - 20 * u); ui.moveTo(mx, y1 + 20 * u); ui.lineTo(mx, H);
          ui.stroke();
          const pct = Math.round(100 * E.inOutCubic(seg(lt, 1.0, 1.66)));
          ui.font = `600 ${Math.round(26 * u)}px "Space Grotesk"`;
          ui.fillStyle = C.neon;
          ui.textAlign = 'left';
          ui.textBaseline = 'alphabetic';
          ui.letterSpacing = `${4 * u}px`;
          ui.fillText('ANALYSE', x0, y0 - 18 * u);
          ui.textAlign = 'right';
          ui.fillStyle = C.white;
          ui.fillText(`${String(pct).padStart(3, '0')} %`, x1, y0 - 18 * u);
          ui.letterSpacing = '0px';
          ui.restore();
        }
      }
      // ----- « DIAGNOSTIC RAPIDE » au freinage + scan + pastilles
      if (lt > 1.95 && lt < 2.75) {
        const tt = lt - 2.0;
        const out = E.inCubic(seg(lt, 2.36, 2.6));
        const box = screenBox(DG_CORNERS, f);
        if (box) brackets(ui, box[0] - 22 * u, box[1] - 22 * u, box[2] + 22 * u, box[3] + 22 * u, 34 * u, 3 * u, C.neon, win(lt, 1.97, 2.02, 2.3, 2.42));
        const big = V ? Math.min(150 * u, (S.w * 0.94) / 7.4) : 150 * u;
        const small = big * (V ? 0.62 : 0.56);
        const x = V ? S.cx : S.l;
        const y1 = V ? S.t + S.h * 0.14 + big : S.b - small * 1.9 - 40 * u;
        const dy = out * (V ? 300 : 260) * u;
        const align = V ? 'center' : 'left';
        scrimLinear(ui, 0, V ? S.t - 60 * u : H, 0, V ? y1 + small * 3.2 : y1 - big * 1.6, 0.75 * (1 - out) * seg(lt, 1.97, 2.05));
        ui.save();
        ui.translate(0, dy);
        slam(ui, 'DIAGNOSTIC', x, y1, { size: big, weight: 900, t: tt, align, color: C.white, alpha: 1 - out, from: 2.2, dur: 0.16 });
        const ry = y1 + small * 1.35;
        const rw = textWidth(ui, 'RAPIDE', small, 300, 0.32);
        const rx = V ? S.cx - rw / 2 - small * 1.1 : x;
        maskReveal(ui, 'RAPIDE', rx, ry, { size: small, weight: 300, tracking: 0.32, align: 'left', p: E.outExpo(seg(tt, 0.06, 0.32)), color: C.neon, alpha: 1 - out });
        // pastilles validées (3)
        for (let k = 0; k < 3; k++) {
          const kk = E.outBack(seg(tt, 0.12 + k * 0.07, 0.3 + k * 0.07), 2.6);
          const on = seg(tt, 0.2 + k * 0.07, 0.3 + k * 0.07);
          const R0 = small * 0.34;
          checkDot(ui, rx + rw + small * 0.75 + R0 + k * R0 * 2.7, ry - small * 0.36, R0, kk, on, 1 - out);
        }
        ui.restore();
      }
    },
  };
}
