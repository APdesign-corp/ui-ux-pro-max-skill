// SEGMENT « city » (22 → 26 s) — monde « Ville » : Liège de nuit stylisée (ÉTAPE 5 DE L'HISTOIRE).
//
// La ville est construite À PARTIR de l'écran-carte de gear (même repère, même Meuse, même
// itinéraire, voir 08-city-kit.js) : au raccord (22.0), l'image est la carte du téléphone vue de
// haut, et la chute libre continue au-dessus de la vraie ville.
//  0.00  sortie du flash de la traversée 4 : la carte (traits verts, Meuse teal, ligne lumineuse,
//        repère) ; la caméra continue de tomber en tournant (même roulis que la chute de gear)
//  0.05–0.80  la carte devient la ville : les immeubles sortent de terre, les fenêtres s'allument,
//        la Meuse s'élargit, le trafic s'anime ; la LIGNE LUMINEUSE avance dans les rues
//        (mur de lumière + comète) et passe le pont
//  0.15–1.50  la caméra bascule vers l'avant et suit la comète jusqu'au repère du magasin
//  1.50  ARRIVÉE : colonne de lumière, onde qui traverse la ville, « Vous êtes arrivé »
//  1.70–3.05  SPIRALE qui se resserre autour du repère ; adresse « Rue St Léonard 203 / 4000 Liège »
//  3.00  un écran géant (téléphone) jaillit de la place, face caméra (page GSM Center)
//  3.48–4.00  TRAVERSÉE 5 : plongée en vrille dans l'écran, glitch RGB, flash blanc 1.0 à 4.00
//
// camera(lt) est PURE. Rien n'est créé dans update().

import * as THREE from 'three';
import { E, clamp, lerp, seg, rng, pulse, TAU } from '../core/anim.js';
import { setFont, textWidth, radialGlow, shockRing, sparks, eyebrow } from '../core/draw.js';
import { C, speedLines, maskReveal, brandColorAt } from '../core/type.js';
import { PHONE } from '../world/phone.js';
import * as GK from './07-gear-kit.js';
import * as K from './08-city-kit.js';

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.7, gain: 0.9 },
  { t: 0.02, type: 'sub', dur: 1.4, gain: 0.5 },
  { t: 0.06, type: 'data', dur: 1.4, gain: 0.5 },        // la ligne lumineuse file dans les rues
  { t: 0.12, type: 'swish', gain: 0.5 },                 // la ville sort de terre
  { t: 0.35, type: 'swish', gain: 0.4, pan: 0.4 },
  { t: 0.9, type: 'riser', dur: 0.6, gain: 0.8 },        // pic à l'arrivée
  { t: 1.5, type: 'impact', gain: 0.9 },                 // arrivée : colonne de lumière + onde
  { t: 1.52, type: 'success', gain: 0.8 },
  { t: 1.6, type: 'pop', gain: 0.8 },                    // pastille « Vous êtes arrivé »
  { t: 1.74, type: 'swish', gain: 0.55, pan: 0.3 },      // carte adresse
  { t: 1.9, type: 'click', gain: 0.5 },
  { t: 2.5, type: 'whoosh', dur: 0.5, gain: 0.5, pan: -0.4 },
  { t: 3.0, type: 'hit', gain: 1 },                      // le portail jaillit de la place
  { t: 3.0, type: 'riser', dur: 0.95, gain: 1 },
  { t: 3.5, type: 'whoosh', dur: 0.5, gain: 0.9 },       // plongée dans l'écran
  { t: 3.7, type: 'glitch', gain: 1 },
  { t: 3.85, type: 'suck', dur: 0.15, gain: 0.8 },
];

const DIVE = GK.DIVE ?? {
  th: 0.22, ph: 1.49, roll: (V) => (V ? 0.2 : 0.3), fov: (V) => (V ? 52 : 40), frameW: (V) => (V ? 0.47 : 0.55), screenW: 0.682,
};
const diveEndDist = GK.diveEndDist ?? ((V, aspect) => DIVE.frameW(V) / (2 * Math.tan((DIVE.fov(V) * Math.PI) / 360) * aspect));

const T_ARR = 1.5;    // la comète atteint le repère (temps fort, sur le temps)
const T_POR = 3.0;    // le portail jaillit
const T_DIVE = 3.48;  // plongée

export default function create(ctx) {
  const { V, W, H } = ctx;
  const group = new THREE.Group();
  const r = rng(808);
  const aspect = W / H;
  const U = K.sharedUniforms();

  // ------------------------------------------------------------------ monde
  const streets = K.buildStreets();
  const bridges = K.buildBridges();
  const lots = K.buildLots(streets, r);
  const buildings = K.buildingMesh(lots, U, K.CENTER);
  const ground = K.groundMesh(streets, bridges, U);
  const river = K.riverMesh(U);
  const traffic = K.trafficMesh(streets, U, r);
  const lamps = K.lightPoints(U, K.streetLightData(streets, bridges, r), { size: 110, min: 1.5, max: 8, pixel: H / 1080, twinkle: 0.12 });
  const far = K.lightPoints(U, K.farLightData(r, K.hillHeight), { size: 140, min: 1.3, max: 5, pixel: H / 1080, twinkle: 0.3 });
  const hills = K.hillMesh(U);
  const sky = GK.makeSky ? GK.makeSky(THREE, { horizon: 1, radius: 260, d1: [0.2, 0.25, -1], d2: [-1, 0.1, 0.3], d3: [0.7, 0.2, 0.8] }) : null;
  group.add(ground, river, buildings, traffic, lamps, far, hills);
  if (sky) group.add(sky.mesh);

  // ponts : tabliers sombres (les lampes sont dans `lamps`)
  const deckMat = new THREE.MeshStandardMaterial({ color: '#0a120d', metalness: 0.6, roughness: 0.45, envMapIntensity: 0.25, emissive: '#020805' });
  for (const b of bridges) {
    const len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, b.w + 0.1), deckMat);
    deck.position.set((b.a[0] + b.b[0]) / 2, 0.3, (b.a[1] + b.b[1]) / 2);
    deck.rotation.y = -Math.atan2(b.b[1] - b.a[1], b.b[0] - b.a[0]);
    group.add(deck);
  }

  // itinéraire
  const R = K.routeCurve();
  const route = K.routeMeshes(R, U);
  group.add(route.ribbon, route.wall);
  // la comète part de la sortie du pont de l'itinéraire (le tracé complet est déjà là, comme sur la carte)
  let ARC0 = R.len * 0.42;
  {
    let best = 1e9;
    for (let i = 0; i <= R.N; i++) {
      const p = R.pts[i];
      const s = (i / R.N) * R.len;
      if (s > R.len * 0.6) break;
      const d = K.riverDist(p.x, p.z);
      if (d < best) { best = d; ARC0 = s + K.RIVER_HALF + 1.2; }
    }
  }
  const headArc = (lt) => {
    const x = seg(lt, 0, T_ARR);
    return lerp(ARC0, R.len, 0.35 * x + 0.65 * E.outQuad(x));
  };

  // repère : point de la carte au sol + épingle 3D + colonne de lumière
  const disc = K.pinDisc(U);
  const beam = K.beamMesh(U);
  beam.mesh.scale.set(3.4, 70, 1);
  beam.BU.uTop.value = 70;
  const pin = K.pinMarker();
  group.add(disc.mesh, beam.mesh, pin.group);

  // ------------------------------------------------------------------ caméra (pure)
  const SC = K.SX / DIVE.screenW;
  const D0 = diveEndDist(V, aspect) * SC;           // même cadrage que la fin de la chute de gear
  const Dm = V ? 27 : 15.5, De = V ? 10.5 : 7.4;
  const lnD0 = Math.log(D0), lnDm = Math.log(Dm), lnDe = Math.log(De);
  const PH0 = DIVE.ph, PH1 = V ? 0.56 : 0.62, PH2 = V ? 0.2 : 0.34;
  const FOV0 = DIVE.fov(V), FOV1 = V ? 60 : 48;
  const RL0 = DIVE.roll(V);
  const FY = 1.1;
  const PS = V ? 3.8 : 3.4;                           // échelle du téléphone-portail
  const PORTAL_Y = (PHONE.H * PS) / 2 + 0.3;
  const thAt = (lt) => DIVE.th + 0.9 * lt + 0.13 * lt * lt;
  const _h = [0, 0, 0];

  function base(lt) {
    const lnD = lnD0 - (lnD0 - lnDm) * E.outExpo(seg(lt, 0, 0.9)) - (lnDm - lnDe) * E.inOutSine(seg(lt, 0.3, T_DIVE));
    const D = Math.exp(lnD);
    const ph = PH0 + (PH1 - PH0) * E.inOutCubic(seg(lt, 0.15, 1.35)) + (PH2 - PH1) * E.inOutSine(seg(lt, 1.1, T_DIVE));
    const th = thAt(lt);
    K.routeAtArc(R, headArc(lt), _h);
    const w = E.inOutSine(seg(lt, 0, 0.85));
    const fy = FY * E.inOutSine(seg(lt, 1.1, 3.2));
    const F = [lerp(K.CENTER[0], _h[0] * 0.5, w), fy, lerp(K.CENTER[1], _h[2] * 0.5, w)];
    const cp = Math.cos(ph);
    return { F, ph, th, pos: [F[0] + D * cp * Math.sin(th), F[1] + D * Math.sin(ph), F[2] + D * cp * Math.cos(th)] };
  }
  // téléphone-portail : jaillit de la place devant le magasin et se tourne vers la caméra
  const yawP = thAt(3.2);
  const PC = [Math.sin(yawP) * 1.3, 0, Math.cos(yawP) * 1.3];
  function portal(lt) {
    const k = E.outBack(seg(lt, T_POR, 3.46), 1.25);
    const yaw = thAt(lt) - 0.45 * (1 - E.inOutCubic(seg(lt, 3.05, 3.7)));
    return { c: [PC[0], lerp(-PHONE.H * PS * 0.75, PORTAL_Y, k), PC[2]], yaw };
  }
  function camera(lt) {
    const b = base(lt);
    let pos = b.pos, target = b.F;
    if (lt > T_POR) {
      const P = portal(lt);
      const look = E.inOutCubic(seg(lt, 3.05, 3.5));
      const tc = [PC[0], PORTAL_Y, PC[2]];
      target = target.map((v, i) => lerp(v, tc[i], look));
      const k = E.inQuart(seg(lt, T_DIVE, 4.0));
      const end = [tc[0] + Math.sin(P.yaw) * 0.6, PORTAL_Y + 0.05, tc[2] + Math.cos(P.yaw) * 0.6];
      pos = pos.map((v, i) => lerp(v, end[i], k));
    }
    const roll = RL0 * (1 - E.inOutSine(seg(lt, 0.08, 1.1)))
      - 0.07 * E.inOutSine(seg(lt, 0.9, 1.8)) * (1 - E.inOutSine(seg(lt, 2.9, 3.5)))
      + 0.55 * E.inCubic(seg(lt, 3.55, 4.0));
    const fov = lerp(FOV0, FOV1, E.inOutSine(seg(lt, 0.1, 1.3))) + 12 * E.inCubic(seg(lt, 3.5, 4.0));
    return { pos, target, roll, fov, near: 0.03, far: 300 };
  }

  // ------------------------------------------------------------------ mise à jour
  const tmpV = new THREE.Vector3();
  const head = [0, 0, 0];
  const brand = brandColorAt('GSM CENTER');
  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, W, H, u, L, world } = f;
      const S = L.safe;
      const cam = f.camera;

      // ---------------- uniformes du monde
      U.uTime.value = f.t;
      U.uMap.value = 1 - E.inOutSine(seg(lt, 0.04, 0.55));
      U.uRise.value = 1.25 * seg(lt, 0.02, 0.8);
      U.uWin.value = 0.3 + 0.7 * E.inOutSine(seg(lt, 0.08, 0.8));
      river.material.uniforms.uHalf.value = lerp(K.RIVER_HALF_MAP, K.RIVER_HALF, E.inOutCubic(seg(lt, 0.05, 0.6)));
      traffic.material.uniforms.uK.value = seg(lt, 0.15, 0.7) * (1 - 0.6 * seg(lt, 3.5, 4.0));
      lamps.material.uniforms.uK.value = 0.35 + 0.65 * seg(lt, 0.1, 0.6);
      far.material.uniforms.uK.value = seg(lt, 0.05, 0.6);
      if (sky) { sky.mesh.position.copy(cam.position); sky.mat.uniforms.uTime.value = f.t; }

      // itinéraire
      const ha = headArc(lt);
      K.routeAtArc(R, ha, head);
      route.RU.uHead.value = ha;
      route.RU.uHalf.value = lerp(K.RIVER_HALF_MAP, 0.62, E.inOutCubic(seg(lt, 0.05, 0.8)));
      route.RU.uGain.value = lerp(1.0, 0.75, seg(lt, 0.1, 0.6)) * (1 - 0.5 * seg(lt, 3.4, 3.9));
      route.WU.uWallH.value = lerp(0.25, 0.8, E.outCubic(seg(lt, 0, 0.6)));
      route.WU.uWallK.value = (1 - 0.45 * seg(lt, T_ARR, 2.2)) * (1 - seg(lt, 3.3, 3.8));
      const arrived = lt >= T_ARR;
      U.uL1.value.set(head[0], 0.45, head[2]);
      U.uL1K.value = seg(lt, 0, 0.15) * (1 - seg(lt, T_ARR, T_ARR + 0.15));
      const beamK = E.outExpo(seg(lt, T_ARR, T_ARR + 0.3));
      U.uL2K.value = beamK * (0.65 + 0.35 * pulse(lt, T_ARR, 0.01, 0.5)) * (1 - 0.6 * seg(lt, 3.5, 4.0));
      U.uWaveR.value = 42 * E.outCubic(seg(lt, T_ARR, 2.7));
      U.uWaveK.value = arrived ? 1 - seg(lt, T_ARR, 2.7) : 0;

      // repère
      disc.PU.uDot.value = lerp(1.65, 0.5, E.inOutCubic(seg(lt, 0.05, 0.7)));
      disc.PU.uDotK.value = lerp(1, 0.75, seg(lt, 0.1, 0.6)) * (1 - seg(lt, 3.0, 3.3));
      disc.PU.uRingK.value = 1 - seg(lt, 3.0, 3.3);
      const pk = E.outBack(seg(lt, 0.2, 0.6), 1.8) * (1 - E.inCubic(seg(lt, 2.95, 3.15)));
      pin.group.visible = pk > 0.001;
      pin.group.scale.setScalar(1.25 * Math.max(pk, 0.001));
      pin.group.position.set(0, 1.45 + 0.1 * Math.sin(lt * 3.1) + 0.35 * pulse(lt, T_ARR, 0.02, 0.4), 0);
      pin.body.rotation.y = lt * 2.2;
      tmpV.copy(cam.position).sub(pin.group.position).normalize();
      pin.hole.position.set(tmpV.x * 0.33, 0.72, tmpV.z * 0.33);
      pin.hole.quaternion.copy(cam.quaternion);
      beam.mesh.rotation.set(0, Math.atan2(cam.position.x, cam.position.z), 0);
      beam.BU.uH.value = 70 * E.outExpo(seg(lt, T_ARR, T_ARR + 0.35));
      beam.BU.uK.value = beamK * (1 - 0.55 * seg(lt, 3.45, 4.0));

      // éclairage partagé (téléphone-portail, épingle)
      world.studio.update(f.t, { backdrop: false, grid: 0, beams: 0, dust: 0.25, motes: 0.12, env: 0.75, rim: 0.7, key: 0.55, glow: 0 });

      // ---------------- téléphone-portail
      if (lt > T_POR - 0.02) {
        const P = portal(lt);
        const ph = world.phones[3];
        ph.group.visible = true;
        ph.group.position.set(P.c[0], P.c[1], P.c[2]);
        ph.group.scale.setScalar(PS);
        ph.group.rotation.set(-0.06, P.yaw, 0, 'YXZ');
        if (lt < 3.42) ph.screen.draw('store', lt - T_POR + 0.35, { cardsAt: 0.25, pillsAt: 0.5 });
        else ph.screen.draw('portal', lt - 3.42, { p: seg(lt, 3.45, 3.95) });
        ph.phone.setScreenMap(ph.screen.tex, 0.95);
      }

      // ---------------- calque fx (lumières, avant bloom)
      const hp = f.project([head[0], 0.35, head[2]]);
      if (!arrived && hp[2] < 1) {
        fx.save(); fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, hp[0], hp[1], 70 * u, '#ffffff', 0.55 * seg(lt, 0, 0.1));
        radialGlow(fx, hp[0], hp[1], 190 * u, C.neon, 0.22);
        fx.restore();
      }
      const pp = f.project([0, 0.4, 0]);
      if (pp[2] < 1) {
        if (arrived) {
          fx.save(); fx.globalCompositeOperation = 'lighter';
          radialGlow(fx, pp[0], pp[1], 260 * u, C.neon, 0.4 * pulse(lt, T_ARR, 0.01, 0.6));
          radialGlow(fx, pp[0], pp[1], 90 * u, '#ffffff', 0.5 * pulse(lt, T_ARR, 0.01, 0.35));
          fx.restore();
          sparks(fx, pp[0], pp[1], lt - T_ARR, f, { count: 70, speed: 1500, life: 0.75, color: C.neon2, flat: V ? 0.7 : 0.45, seed: 31 });
          shockRing(fx, pp[0], pp[1], lt - T_ARR, f, { radius: V ? 700 : 900, color: C.neon, width: 10, flat: V ? 0.5 : 0.36, dur: 0.8 });
        }
        if (lt > T_POR - 0.05) {
          sparks(fx, pp[0], pp[1], lt - T_POR, f, { count: 60, speed: 1200, life: 0.6, color: C.teal, flat: 0.5, seed: 77 });
          shockRing(fx, pp[0], pp[1], lt - T_POR, f, { radius: 700, color: C.neon2, width: 9, flat: 0.4, dur: 0.6 });
        }
      }
      // vent de chute (continuité gear) puis aspiration dans le portail
      speedLines(fx, W, H, lt, 0.55 * (1 - E.outCubic(seg(lt, 0, 0.55))), { seed: 61, count: 130, speed: 2.4 });
      const dk = seg(lt, T_DIVE, 4.0);
      if (dk > 0) speedLines(fx, W, H, lt, 0.9 * E.inQuad(dk), { seed: 8, count: 150, speed: 2.8 });

      // ---------------- post-production
      // raccord : flash de la traversée 4 qui se résorbe (gear finit à 0.6)
      post.flash = Math.max(post.flash, 0.6 * (1 - E.outCubic(seg(lt, 0, 0.32))));
      post.flashColor = [0.75, 1, 0.8];
      post.flash += 0.2 * pulse(lt, T_ARR, 0.004, 0.14) + 0.12 * pulse(lt, T_POR, 0.004, 0.1);
      // filé de la spirale (orbite autour d'un point fixe : invisible pour le flou auto)
      const lt0 = Math.max(0, lt - 1 / 60);
      const dth = thAt(lt) - thAt(lt0);
      const b = base(lt);
      const fovr = (f.cam.fov * Math.PI) / 180;
      const hf = 2 * Math.atan(Math.tan(fovr / 2) * aspect);
      const orbit = 1 - seg(lt, 3.3, 3.6);
      post.rollBlur += dth * Math.sin(b.ph) * 0.9 * orbit;
      post.blur[0] += clamp((-dth * Math.cos(b.ph)) / hf * 0.55, -0.05, 0.05) * orbit;
      // plongée dans le portail
      if (lt > T_POR) {
        const pc = f.project([PC[0], PORTAL_Y, PC[2]]);
        post.zoomCenter = [clamp(pc[0] / W), clamp(1 - pc[1] / H)];
        post.zoomBlur += 0.16 * E.inCubic(dk);
      }
      if (arrived && lt < T_ARR + 0.5 && pp[2] < 1) {
        post.shock = [pp[0] / W, 1 - pp[1] / H, 0.05 + 0.9 * E.outCubic(seg(lt, T_ARR, T_ARR + 0.5)), 0.6 * (1 - seg(lt, T_ARR, T_ARR + 0.5))];
      }
      post.rgb += 0.012 * E.inCubic(seg(lt, 3.5, 4.0));
      post.glitch = Math.max(post.glitch, 0.85 * E.inCubic(seg(lt, 3.55, 4.0)));
      post.flash += 1.05 * E.inCubic(seg(lt, 3.72, 4.0));
      if (lt > 3.6) post.flashColor = [1, 1, 1];
      post.bloom = 0.5;
      post.bloomRadius = 0.42;
      post.vignette = 1.0;
      post.uiBlur = 0.15;
      post.dof = null;

      // ---------------- typographie
      // 1) étiquette de la carte collée au sol (continuité avec l'app map), s'efface
      const la = 1 - seg(lt, 0.04, 0.4);
      if (la > 0) {
        const a0 = f.project([-1, 0, -4.0]), a1 = f.project([1, 0, -4.0]);
        if (a0[2] < 1 && a1[2] < 1) {
          const ppu = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) / 2;
          ui.save();
          ui.globalAlpha = la;
          ui.translate((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2);
          ui.rotate(Math.atan2(a1[1] - a0[1], a1[0] - a0[0]));
          ui.font = `700 ${Math.max(4, 2.0 * ppu)}px "Space Grotesk"`;
          ui.letterSpacing = '0px';
          ui.textAlign = 'center'; ui.textBaseline = 'alphabetic';
          ui.fillStyle = C.white;
          ui.fillText('GSM Center Liège', 0, 0);
          ui.restore();
        }
      }

      // 2) HUD de navigation : ITINÉRAIRE · GSM CENTER LIÈGE · barre de progression
      const hudIn = seg(lt, 0.12, 0.7), hudOut = E.inCubic(seg(lt, 3.0, 3.25));
      if (hudIn > 0 && hudOut < 1) {
        const x = S.l + (V ? 0 : 4 * u) - 120 * u * hudOut, y0 = S.t + (V ? 40 : 30) * u;
        const ts = (V ? 50 : 40) * u;
        ui.save();
        ui.globalAlpha = 1 - hudOut;
        eyebrow(ui, arrived ? 'ARRIVÉE' : 'ITINÉRAIRE', x, y0, lt - 0.12, f, { size: V ? 25 : 21 });
        maskReveal(ui, 'GSM CENTER', x, y0 + ts * 1.25, { size: ts, weight: 800, align: 'left', colorAt: brand, p: E.outExpo(seg(lt, 0.2, 0.65)) });
        const gw = textWidth(ui, 'GSM CENTER ', ts, 800, 0);
        maskReveal(ui, 'LIÈGE', x + gw, y0 + ts * 1.25, { size: ts, weight: 300, align: 'left', color: C.white, p: E.outExpo(seg(lt, 0.32, 0.75)) });
        // barre de progression du trajet (aucun chiffre)
        const bw = (V ? 420 : 340) * u, by = y0 + ts * 1.25 + 30 * u;
        const bk = E.outExpo(seg(lt, 0.3, 0.8));
        const prog = clamp(ha / R.len);
        ui.fillStyle = 'rgba(244,248,244,0.18)';
        ui.fillRect(x, by - 2 * u, bw * bk, 4 * u);
        const gr = ui.createLinearGradient(x, 0, x + bw, 0);
        gr.addColorStop(0, C.neon2); gr.addColorStop(1, C.teal);
        ui.fillStyle = gr;
        ui.fillRect(x, by - 2 * u, bw * bk * prog, 4 * u);
        const dx = x + bw * bk * prog;
        ui.fillStyle = C.white;
        ui.beginPath(); ui.arc(dx, by, (arrived ? 7 : 5.5) * u, 0, TAU); ui.fill();
        if (arrived) {
          const ck = E.outBack(seg(lt, T_ARR, T_ARR + 0.25), 2.5);
          ui.strokeStyle = C.ink; ui.lineWidth = 2.4 * u; ui.lineCap = 'round';
          ui.save(); ui.translate(dx, by); ui.scale(ck, ck);
          ui.beginPath(); ui.moveTo(-3 * u, 0); ui.lineTo(-0.8 * u, 2.4 * u); ui.lineTo(3.4 * u, -2.6 * u); ui.stroke();
          ui.restore();
        }
        ui.restore();
      }

      // 3) carte adresse accrochée au repère (16:9 : à droite du repère ; 9:16 : sous le repère)
      const ca = seg(lt, 1.66, 1.82), cOut = E.inCubic(seg(lt, 2.98, 3.2));
      const pinTop = f.project([0, 2.25, 0]);
      if (ca > 0 && cOut < 1 && pinTop[2] < 1) {
        const big = (V ? 66 : 54) * u, small = (V ? 46 : 38) * u, eb = (V ? 24 : 20) * u;
        const l1 = 'Rue St Léonard 203', l2 = '4000 Liège';
        const tw = Math.max(textWidth(ui, l1, big, 800, -0.01), textWidth(ui, l2, small, 300, 0.02));
        const pad = 26 * u, cw = tw + pad * 2, ch = eb + big + small + pad * 2.6;
        let cx, cy;   // coin haut-gauche de la carte
        if (V) { cx = S.cx - cw / 2; cy = clamp(pinTop[1] + 260 * u, S.cy - 40 * u, S.b - ch - 150 * u); }
        else { cx = clamp(pinTop[0] + 110 * u, S.l, S.r - cw); cy = clamp(pinTop[1] - ch - 40 * u, S.t + 150 * u, S.b - ch - 110 * u); }
        cy -= 40 * u * cOut;
        const anchor = V ? [cx + cw / 2, cy] : [cx, cy + ch * 0.55];
        ui.save();
        ui.globalAlpha = 1 - cOut;
        // trait de rappel depuis l'épingle
        const lk = E.outCubic(seg(lt, 1.66, 1.84));
        ui.strokeStyle = C.neon; ui.lineWidth = 2 * u;
        ui.beginPath(); ui.moveTo(pinTop[0], pinTop[1]);
        ui.lineTo(lerp(pinTop[0], anchor[0], lk), lerp(pinTop[1], anchor[1], lk)); ui.stroke();
        ui.fillStyle = C.neon; ui.beginPath(); ui.arc(pinTop[0], pinTop[1], 5 * u, 0, TAU); ui.fill();
        // fond verre sombre qui s'ouvre
        const ok = E.outExpo(seg(lt, 1.76, 2.05));
        if (ok > 0) {
          const ow = cw * ok;
          const ox = V ? cx + (cw - ow) / 2 : cx;
          ui.fillStyle = 'rgba(4,6,5,0.66)';
          ui.beginPath(); ui.roundRect(ox, cy, ow, ch, 16 * u); ui.fill();
          ui.strokeStyle = 'rgba(57,255,20,0.45)'; ui.lineWidth = 1.5 * u; ui.stroke();
          ui.fillStyle = C.neon; ui.fillRect(ox, cy + 18 * u, 4 * u, ch - 36 * u);
          // textes
          const tx = cx + pad;
          maskReveal(ui, 'GSM CENTER', tx, cy + pad + eb * 0.9, { size: eb, weight: 700, align: 'left', colorAt: brand, p: E.outExpo(seg(lt, 1.84, 2.1)), edge: false });
          maskReveal(ui, l1, tx, cy + pad + eb + big * 1.05, { size: big, weight: 800, align: 'left', color: C.white, p: E.outExpo(seg(lt, 1.88, 2.2)) });
          maskReveal(ui, l2, tx, cy + pad + eb + big * 1.05 + small * 1.3, { size: small, weight: 300, align: 'left', color: C.neon, p: E.outExpo(seg(lt, 1.98, 2.3)) });
        }
        ui.restore();
      }

      // 4) pastille « Vous êtes arrivé »
      if (lt > 1.56 && lt < 3.2) {
        const k = E.outBack(seg(lt, 1.56, 1.85), 2.2) * (1 - E.inCubic(seg(lt, 2.98, 3.18)));
        const s = (V ? 40 : 32) * u, txt = '✓  Vous êtes arrivé';
        setFont(ui, s, 700, 0.02);
        const tw = textWidth(ui, txt, s, 700, 0.02) + 84 * u;
        const cx = S.cx, cy = V ? S.b - 70 * u : S.b - 46 * u;
        ui.save(); ui.translate(cx, cy); ui.scale(k, k);
        const gr = ui.createLinearGradient(-tw / 2, 0, tw / 2, 0); gr.addColorStop(0, C.neon2); gr.addColorStop(1, C.teal);
        ui.shadowColor = 'rgba(57,255,20,0.45)'; ui.shadowBlur = 30 * u;
        ui.fillStyle = gr; ui.beginPath(); ui.roundRect(-tw / 2, -s * 0.95, tw, s * 1.9, s * 0.95); ui.fill();
        ui.shadowBlur = 0;
        ui.fillStyle = C.ink; setFont(ui, s, 700, 0.02); ui.textAlign = 'center'; ui.textBaseline = 'middle';
        ui.fillText(txt, 0, 2 * u);
        ui.restore();
        ui.letterSpacing = '0px';
      }
    },
  };
}
