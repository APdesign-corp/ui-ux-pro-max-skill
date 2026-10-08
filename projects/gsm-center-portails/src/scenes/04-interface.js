// SEGMENT « interface » (8 → 11 s) — MONDE INTERFACE : on est DANS l'écran.
// Tunnel 3D de cartes d'interface inclinées (hélice le long de -Z) qui entrent de côté en tournant
// et se redressent face à la caméra quand elle passe ; la caméra file avec speed ramps et une
// inclinaison continue. « Tout pour ton mobile, / au même endroit. » (endroit. surligné néon),
// HUD : compteur de chargement + étapes qui glissent une à une.
// 9.4 → 10.4 : plan sur l'épaule — le téléphone héros double la caméra et file comme un vaisseau,
// traînées lumineuses. 10.4 → 11.0 : TRAVERSÉE 2 — il pivote (tonneau), s'éclate, la caméra plonge
// entre les couches jusqu'à la carte mère qui remplit le cadre ; flash vert 1.0 à 11.00.
//
// Performance : les cartes lointaines utilisent une texture statique (dessinée une fois dans create) ;
// seules les cartes proches (0 < distance < 6) reçoivent une texture vivante d'un petit pool.

import { E, clamp, lerp, seg, win, rng, TAU, rgba, speedRamp, catmull } from '../core/anim.js';
import { setFont, textWidth, drawText, radialGlow, sparks, shockRing } from '../core/draw.js';
import { C, speedLines } from '../core/type.js';
import { drawScreenApp } from '../world/screens.js';
import { smoother, typeLines, scrimLinear, makeSky, trail, glowTexture } from './03-roll-kit.js';

export const cues = [
  { t: 0.0, type: 'drop', gain: 1.2 },
  { t: 0.0, type: 'whoosh', dur: 0.5, gain: 1 },
  { t: 0.05, type: 'data', dur: 2.3, gain: 0.45 },
  { t: 0.28, type: 'swish', gain: 0.7 },
  { t: 0.45, type: 'pop', gain: 0.5, pan: -0.6 },
  { t: 0.57, type: 'pop', gain: 0.5, pan: -0.6 },
  { t: 0.69, type: 'pop', gain: 0.5, pan: -0.6 },
  { t: 0.55, type: 'type', dur: 0.73, cps: 22, gain: 0.8 },
  { t: 1.0, type: 'whoosh', dur: 0.45, gain: 0.7 },
  { t: 1.32, type: 'pop', gain: 0.8 },
  { t: 1.4, type: 'whoosh', dur: 0.3, gain: 1, pan: 0.6 },
  { t: 1.5, type: 'hit', gain: 0.8 },
  { t: 2.0, type: 'tick', gain: 0.4 },
  { t: 2.25, type: 'riser', dur: 0.75, gain: 1 },
  { t: 2.3, type: 'whoosh', dur: 0.3, gain: 0.6 },
  { t: 2.45, type: 'success', gain: 0.6 },
  { t: 2.5, type: 'snap', gain: 0.9 },
  { t: 2.52, type: 'zap', gain: 0.7 },
  { t: 2.7, type: 'suck', dur: 0.3, gain: 1 },
];

const T_SHIP = 1.3, T_DIVE = 2.4, T_END = 3.0;

export default function create(ctx) {
  const { THREE, V, L } = ctx;
  const group = new THREE.Group();
  const u = L.u;

  // ------------------------------------------------------------------ ciel + lumières
  const sky = makeSky(THREE, { d1: [0, 0.2, -1], d2: [-0.8, 0.6, -0.4], d3: [0.7, -0.7, -0.3] });
  group.add(sky.mesh);
  const lTop = new THREE.PointLight(0xffffff, 0, 6, 2);
  const lBoard = new THREE.PointLight(new THREE.Color('#d8ffd8'), 0, 2.5, 2);
  group.add(lTop, lBoard);

  // ------------------------------------------------------------------ chemin caméra (speed ramp)
  const Z0 = 24;
  const RAMP = [[0, 26], [0.3, 16], [0.45, 5], [0.95, 4.5], [1.25, 18], [1.5, 15], [2.3, 13], [2.55, 3], [2.8, 0.6], [3.0, 0.3]];
  const camZ = (lt) => Z0 - speedRamp(lt, RAMP);
  const Z_END = camZ(T_END);

  // ------------------------------------------------------------------ tunnel : cartes en hélice
  const RX = V ? 1.05 : 2.15, RY = V ? 2.0 : 1.22;
  const CARD_W = V ? 0.95 : 0.82;
  const ASPECT = 1340 / 600;
  const N = 54, SPACING = 0.82, Z_FIRST = Z0 - 4.5;
  const APPS = ['list', 'counter', 'search', 'pills', 'repair', 'list', 'home', 'search', 'counter', 'pills'];
  const WIDGETS = ['pill', 'dot', 'toggle', 'pill', 'counterW', 'dot', 'pill', 'glass'];
  const PILL_TXT = ['SMARTPHONES', 'RÉPARATION', 'ACCESSOIRES', 'MULTIMÉDIA', 'INTERNET', 'CARTES SIM'];
  const GLASS_TXT = ['Neufs & reconditionnés', 'Réparation rapide', 'Accessoires & multimédia'];
  const r = rng(808);

  const STATIC_W = 220, STATIC_H = Math.round(220 * ASPECT);
  const POOL_W = 360, POOL_H = Math.round(360 * ASPECT);
  const appParams = (app, k) => ({
    title: ['Services', 'Boutique', 'Atelier'][k % 3], to: 100, label: k % 2 ? 'CHARGEMENT' : 'DIAGNOSTIC RAPIDE',
    dur: 1.1, text: 'Choisis ton smartphone', cps: 18, delay: 0.1, gridAt: 0.55, variant: k % 3,
  });
  // état « app » d'une carte en fonction de sa distance devant la caméra (les listes glissent quand on approche)
  const appTime = (a) => 0.1 + clamp(9.5 - a, 0, 9.5) * 0.26;
  const A_STATIC = 6.0;           // les cartes plus loin que ça affichent l'état figé à cette distance

  function drawCardFace(g, w, h, app, t, k) {
    if (g.reset) g.reset(); else g.clearRect(0, 0, w, h);
    const rr = w * 0.085;
    g.save();
    g.beginPath(); g.roundRect(0, 0, w, h, rr); g.clip();
    drawScreenApp(g, w, h, app, t, appParams(app, k));
    g.restore();
    g.lineWidth = Math.max(2, w * 0.012);
    g.strokeStyle = rgba(k % 3 === 0 ? C.teal : C.neon, 0.85);
    g.beginPath(); g.roundRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, rr); g.stroke();
  }

  function widgetCanvas(kind, k) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const font = (wt, s, fam = 'Poppins') => `${wt} ${s}px "${fam}"`;
    if (kind === 'pill' || kind === 'glass') {
      c.width = 560; c.height = 200;
      const glass = kind === 'glass';
      const txt = glass ? GLASS_TXT[k % GLASS_TXT.length] : PILL_TXT[k % PILL_TXT.length];
      g.beginPath(); g.roundRect(6, 6, 548, 188, 94);
      if (glass) {
        g.fillStyle = 'rgba(10,26,16,0.94)'; g.fill();
        g.lineWidth = 5; g.strokeStyle = rgba(C.neon, 0.8); g.stroke();
        g.fillStyle = C.neon; g.beginPath(); g.arc(96, 100, 24, 0, TAU); g.fill();
        g.font = font(500, txt.length > 20 ? 34 : 40, 'Space Grotesk');
        g.fillStyle = C.white; g.textBaseline = 'middle'; g.textAlign = 'left';
        g.fillText(txt, 140, 102);
      } else {
        const grd = g.createLinearGradient(0, 0, 560, 200);
        grd.addColorStop(0, C.neon2); grd.addColorStop(1, C.teal);
        g.fillStyle = grd; g.fill();
        g.font = font(800, txt.length > 10 ? 50 : 58);
        g.fillStyle = C.ink; g.textBaseline = 'middle'; g.textAlign = 'center';
        g.fillText(txt, 280, 104);
      }
      return { c, w: 1.25, h: 1.25 * 200 / 560 };
    }
    if (kind === 'toggle') {
      c.width = 400; c.height = 200;
      g.beginPath(); g.roundRect(6, 6, 388, 188, 94);
      g.fillStyle = rgba(C.neon, 0.95); g.fill();
      g.fillStyle = '#f4f8f4'; g.beginPath(); g.arc(296, 100, 76, 0, TAU); g.fill();
      return { c, w: 0.8, h: 0.4 };
    }
    if (kind === 'counterW') {
      c.width = c.height = 400;
      g.beginPath(); g.roundRect(6, 6, 388, 388, 70);
      g.fillStyle = 'rgba(6,18,10,0.97)'; g.fill();
      g.lineWidth = 5; g.strokeStyle = rgba(C.teal, 0.8); g.stroke();
      g.lineWidth = 22; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(200, 200, 130, 0, TAU); g.stroke();
      g.strokeStyle = C.neon; g.beginPath(); g.arc(200, 200, 130, -Math.PI / 2, -Math.PI / 2 + TAU * (0.62 + 0.1 * (k % 4))); g.stroke();
      g.font = font(800, 92); g.fillStyle = C.white; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`${62 + 10 * (k % 4)}%`, 200, 206);
      return { c, w: 0.75, h: 0.75 };
    }
    // dot : pastille ronde dégradée + pictogramme
    c.width = c.height = 256;
    const grd = g.createLinearGradient(0, 0, 256, 256);
    grd.addColorStop(0, k % 2 ? C.teal : C.neon2); grd.addColorStop(1, k % 2 ? C.neon : C.teal);
    g.fillStyle = grd; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
    if (k % 3 === 0) { g.beginPath(); g.moveTo(78, 132); g.lineTo(112, 166); g.lineTo(180, 94); g.stroke(); }
    else if (k % 3 === 1) { g.beginPath(); g.roundRect(96, 62, 64, 132, 16); g.stroke(); g.beginPath(); g.moveTo(118, 174); g.lineTo(138, 174); g.stroke(); }
    else { g.beginPath(); g.moveTo(128, 76); g.lineTo(128, 180); g.moveTo(76, 128); g.lineTo(180, 128); g.stroke(); }
    return { c, w: 0.5, h: 0.5 };
  }

  const cardGeo = new THREE.PlaneGeometry(1, 1);
  const backTexCanvas = document.createElement('canvas');
  backTexCanvas.width = 128; backTexCanvas.height = 286;
  {
    const g = backTexCanvas.getContext('2d');
    g.beginPath(); g.roundRect(0, 0, 128, 286, 12);
    g.fillStyle = '#050c08'; g.fill();
    g.lineWidth = 4; g.strokeStyle = rgba(C.neon, 0.7); g.stroke();
  }
  const backTex = new THREE.CanvasTexture(backTexCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  const backMat = new THREE.MeshBasicMaterial({ map: backTex, alphaTest: 0.5 });

  const cards = [];
  for (let i = 0; i < N; i++) {
    const isWidget = i % 3 === 1;
    const th = i * 0.92 + 0.3;
    const z = Z_FIRST - i * SPACING;
    let tex, w, h, app = null, k = i;
    const canvas = document.createElement('canvas');
    if (isWidget) {
      const kind = WIDGETS[Math.floor(i / 3) % WIDGETS.length];
      const wc = widgetCanvas(kind, Math.floor(i / 3));
      tex = new THREE.CanvasTexture(wc.c);
      w = wc.w * (V ? 1.15 : 1); h = wc.h * (V ? 1.15 : 1);
    } else {
      app = APPS[Math.floor(i / 3 * 2 + (i % 3 === 2 ? 1 : 0)) % APPS.length];
      canvas.width = STATIC_W; canvas.height = STATIC_H;
      drawCardFace(canvas.getContext('2d'), STATIC_W, STATIC_H, app, appTime(A_STATIC), k);
      tex = new THREE.CanvasTexture(canvas);
      w = CARD_W; h = CARD_W * ASPECT;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.FrontSide });
    const front = new THREE.Mesh(cardGeo, mat);
    const back = new THREE.Mesh(cardGeo, isWidget ? mat : backMat);
    back.rotation.y = Math.PI;
    const cg = new THREE.Group();
    cg.add(front, back);
    cg.scale.set(w, h, 1);
    group.add(cg);
    cards.push({
      i, cg, mat, staticTex: tex, app, isWidget, th, z,
      side: r() < 0.5 ? -1 : 1, spin: 0.9 + r() * 0.8, twist: (r() - 0.5) * 1.6, bob: r() * TAU,
      rad: 1 + (isWidget ? -0.12 : 0) + (r() - 0.5) * 0.12,
    });
  }
  // pool de textures vivantes pour les cartes proches
  const POOL = 6;
  const pool = Array.from({ length: POOL }, () => {
    const c = document.createElement('canvas');
    c.width = POOL_W; c.height = POOL_H;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;               // re-téléversée à chaque image : pas de mipmaps (cartes proches = peu minifiées)
    tex.minFilter = THREE.LinearFilter;
    return { c, g: c.getContext('2d'), tex };
  });

  // rails lumineux le long du tunnel + anneaux elliptiques
  const railGeo = new THREE.BoxGeometry(0.014, 0.014, 60);
  const railMatN = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.neon).multiplyScalar(1.1) });
  const railMatT = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.teal).multiplyScalar(0.9) });
  const railAng = [0.6, 2.55, 3.75, 5.65, 1.57, 4.71];
  const rails = railAng.map((a, k) => {
    const m = new THREE.Mesh(railGeo, k % 2 ? railMatT : railMatN);
    m.position.set(Math.cos(a) * RX * 1.32, Math.sin(a) * RY * 1.32, Z_END + 4 - 30 + 34);
    group.add(m);
    return m;
  });
  const ringGeo = new THREE.RingGeometry(1, 1.012, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(C.neon).multiplyScalar(1.3), transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const RINGS = 9;
  const rings = Array.from({ length: RINGS }, (_, k) => {
    const m = new THREE.Mesh(ringGeo, ringMat);
    m.scale.set(RX * 1.42, RY * 1.42, 1);
    m.position.z = Z0 - 3 - k * 3.6;
    group.add(m);
    return m;
  });

  // particules de données dans le tunnel
  const PN = 900;
  const ppos = new Float32Array(PN * 3);
  for (let k = 0; k < PN; k++) {
    const a = r() * TAU, rr = 0.35 + r() * 1.05;
    ppos[k * 3] = Math.cos(a) * RX * rr;
    ppos[k * 3 + 1] = Math.sin(a) * RY * rr;
    ppos[k * 3 + 2] = Z_END - 10 + r() * (Z0 - Z_END + 14);
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const dotTex = glowTexture(THREE, 64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(200,255,200,0.6)'], [1, 'rgba(57,255,20,0)']]);
  const pmat = new THREE.PointsMaterial({
    size: 0.05, map: dotTex, color: new THREE.Color('#c8ffc0'), transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(pgeo, pmat);
  points.frustumCulled = false;
  group.add(points);

  // ------------------------------------------------------------------ le vaisseau (phones[0])
  const _q = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qp = new THREE.Quaternion();
  const AX_X = new THREE.Vector3(1, 0, 0), AX_Z = new THREE.Vector3(0, 0, 1);
  const Q_FLAT = new THREE.Quaternion().setFromAxisAngle(AX_X, -Math.PI / 2); // écran vers le haut, nez vers -Z
  const baseXY = (lt) => [0.16 * Math.sin(lt * 1.7) + 0.05 * Math.sin(lt * 4.1), (V ? -0.05 : 0.08) + 0.1 * Math.sin(lt * 1.3 + 0.5)];
  // position du vaisseau relative à la caméra « de base »
  const REL_PASS = [V ? 0.4 : 0.75, V ? -0.9 : -0.55, 1.0];
  const REL_LOCK = [V ? -0.02 : -0.1, V ? -1.02 : -0.5, V ? -1.72 : -1.62];
  function shipRel(lt) {
    const p = E.outCubic(seg(lt, T_SHIP, 1.66));
    const w = smoother(seg(lt, 1.6, 2.4));
    return [
      lerp(REL_PASS[0], REL_LOCK[0], p) + 0.1 * Math.sin(lt * 3.1) * w,
      lerp(REL_PASS[1], REL_LOCK[1], p) + 0.05 * Math.sin(lt * 4.3 + 1) * w,
      lerp(REL_PASS[2], REL_LOCK[2], p) + 0.12 * Math.sin(lt * 2.2) * w,
    ];
  }
  function shipPos(lt, out) {
    const l = Math.min(lt, T_DIVE + 0.0);
    const b = baseXY(l), rel = shipRel(l);
    // après T_DIVE le vaisseau freine avec la caméra de base
    out[0] = b[0] + rel[0];
    out[1] = b[1] + rel[1];
    out[2] = camZ(lt) + rel[2];
    return out;
  }
  function shipQuat(lt, out) {
    const bank = (0.32 * Math.sin(lt * 2.3) + 0.15 * Math.sin(lt * 5.1)) * (1 - seg(lt, 2.2, 2.4));
    const barrel = TAU * E.inOutCubic(seg(lt, 2.2, 2.52));
    _qb.setFromAxisAngle(AX_Z, bank + barrel - 0.5 * (1 - E.outCubic(seg(lt, T_SHIP, 1.7))));
    // nez relevé (on voit le pont/écran par-dessus l'épaule), à plat avant l'éclatement
    const pitch = (0.3 * E.outCubic(seg(lt, 1.45, 1.8)) + 0.07 * Math.sin(lt * 3.3)) * (1 - E.inOutCubic(seg(lt, 2.2, 2.45)));
    _qp.setFromAxisAngle(AX_X, pitch);
    out.copy(_qb).multiply(_qp).multiply(Q_FLAT);
    return out;
  }

  // décalage caméra / vaisseau pendant la plongée (repère monde, vaisseau à plat)
  const REL_D = shipRel(T_DIVE);
  // décalages caméra/vaisseau (vaisseau à plat : couches écartées à la verticale) + instants clés
  const DIVE_T = [T_DIVE, 2.55, 2.68, 2.78, 2.88, T_END];
  const DIVE_KEYS = [
    [-REL_D[0], -REL_D[1], -REL_D[2]],
    [V ? 0.42 : 0.55, 0.16, 1.45],        // décroche à droite : l'éclatement vu de profil
    [V ? 0.36 : 0.45, -0.1, 1.05],        // descend au niveau de la fente, derrière la queue
    [0.28, -0.2, 0.42],                   // entre le cadre (au-dessus) et la batterie (en dessous)
    [0.15, -0.26, -0.3],                  // au-dessus de la carte mère
    [0.12, -0.53, -0.62],                 // descend : la carte mère remplit le cadre
  ];
  const DIVE_LOOK_T = [T_DIVE, 2.55, 2.78, 2.95];
  const DIVE_LOOK = [null, [0.02, -0.12, -0.05], [0.12, -0.32, -1.2], [0.12, -0.8, -0.72]];
  const keyU = (lt) => {
    let i = 0;
    while (i < DIVE_T.length - 2 && lt > DIVE_T[i + 1]) i++;
    const fr = clamp((lt - DIVE_T[i]) / (DIVE_T[i + 1] - DIVE_T[i]));
    return (i + fr) / (DIVE_T.length - 1);
  };
  const BOARD = [0.12, -0.8, -0.72];
  const _sp = [0, 0, 0];

  // ------------------------------------------------------------------ caméra (PURE)
  function camBase(lt) {
    const b = baseXY(lt);
    const z = camZ(lt);
    const tw = 0.22 * Math.sin(lt * 0.9 + 0.4);
    const roll = 0.16 * lt + 0.07 * Math.sin(lt * 2.6);
    const fovs = V ? [72, 64, 70] : [58, 50, 56];
    const slow = win(lt, 0.3, 0.5, 0.9, 1.2);
    return {
      pos: [b[0], b[1], z],
      target: [b[0] * 0.4 + tw, b[1] * 0.3 - 0.05, z - 8],
      roll,
      fov: lerp(fovs[0], fovs[1], slow),
    };
  }
  function camera(lt) {
    const c = camBase(lt);
    if (lt < T_SHIP) return c;
    // plan sur l'épaule : la visée glisse vers l'avant du vaisseau
    const sp = shipPos(lt, _sp);
    const lk = smoother(seg(lt, 1.42, 1.85));
    const tgt = V ? [sp[0] * 0.6, sp[1] + 0.02, sp[2] - 1.35] : [sp[0] * 0.6, sp[1] + 0.12, sp[2] - 2.6];
    c.target = [lerp(c.target[0], tgt[0], lk), lerp(c.target[1], tgt[1], lk), lerp(c.target[2], tgt[2], lk)];
    c.fov = lerp(c.fov, V ? 62 : 48, lk);
    if (lt < T_DIVE) return c;
    // TRAVERSÉE 2 : plongée entre les couches jusqu'à la carte mère
    const s = seg(lt, T_DIVE, T_END);
    const o = catmull(DIVE_KEYS, keyU(lt));
    const pos = [sp[0] + o[0], sp[1] + o[1], sp[2] + o[2]];
    // visée : vaisseau qui éclate → fente → carte mère
    let tg = c.target;
    for (let k = 1; k < DIVE_LOOK.length; k++) {
      const w = E.inOutCubic(seg(lt, DIVE_LOOK_T[k - 1], DIVE_LOOK_T[k]));
      if (w <= 0) break;
      const L2 = DIVE_LOOK[k];
      tg = [lerp(tg[0], sp[0] + L2[0], w), lerp(tg[1], sp[1] + L2[1], w), lerp(tg[2], sp[2] + L2[2], w)];
    }
    return {
      pos,
      target: tg,
      roll: c.roll * (1 - E.inOutCubic(s)) + 0.1 * Math.sin(s * 3),
      fov: lerp(c.fov, V ? 58 : 40, E.inOutCubic(s)),
      near: 0.01,
      far: 120,
    };
  }

  // ------------------------------------------------------------------ typographie
  const S_ = L.safe;
  const probe = document.createElement('canvas').getContext('2d');
  let LINES, typeStart = 0.55, CPS = 22;
  if (V) {
    const sB = Math.min(165 * u, (S_.w * 0.96 / textWidth(probe, 'endroit.', 100, 900, -0.02)) * 100);
    const sA = sB * 0.62;
    const y0 = L.H * 0.255;
    LINES = {
      a: [{ str: 'Tout pour', y: y0 }, { str: 'ton mobile,', y: y0 + sA * 1.08 }],
      b: [{ str: 'au même', y: y0 + sA * 1.08 + sB * 1.08 }, { str: 'endroit.', y: y0 + sA * 1.08 + sB * 2.08 }],
      sA, sB, x: L.W / 2,
    };
  } else {
    const sB = Math.min(132 * u, (S_.w * 0.8 / textWidth(probe, 'au même endroit.', 100, 900, -0.02)) * 100);
    const sA = sB * 0.66;
    const y0 = L.H * 0.27;
    LINES = {
      a: [{ str: 'Tout pour ton mobile,', y: y0 }],
      b: [{ str: 'au même endroit.', y: y0 + sB * 1.12 }],
      sA, sB, x: L.W / 2,
    };
  }
  const STEPS = ['01 — CHOISIR', '02 — RÉPARER', "03 — S'ÉQUIPER"];

  // ------------------------------------------------------------------ update
  const _v = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qn = new THREE.Quaternion(), _m4 = new THREE.Matrix4();
  const _up = new THREE.Vector3(0, 1, 0), _cp = new THREE.Vector3(), _cardP = new THREE.Vector3();
  const _e = new THREE.Euler();
  const near = [];

  function update(f) {
    const { lt, t, fx, ui, post, W, H } = f;
    const cam = f.camera;
    const studio = f.world.studio;
    const inside = seg(lt, 2.66, 2.86);                        // dans la fente : reflets studio coupés (puces acier)
    studio.update(t, { backdrop: false, grid: 0, beams: 0, dust: 0, motes: 0, env: 1.1 - 0.95 * inside, envRot: lt * 1.6, rim: 0.4 * (1 - inside), key: 0.9 * (1 - 0.7 * inside), glow: 0 });
    sky.mesh.position.copy(cam.position);
    sky.mat.uniforms.uTime.value = t;
    const cz = camZ(lt);
    _cp.copy(cam.position);

    // ---------------- cartes
    near.length = 0;
    const tunnelFade = 1 - seg(lt, 2.55, 2.9);
    for (const c of cards) {
      const a = cz - c.z;                                     // distance devant la caméra
      const vis = a > -1.2 && a < 30 && tunnelFade > 0.01;
      c.cg.visible = vis;
      if (!vis) continue;
      const e = smoother(1 - seg(a, 2.2, 12));                // 1 = proche (redressée), 0 = loin (de côté, en rotation)
      const far = 1 - e;
      const th = c.th + 0.25 * Math.sin(lt * 0.7 + c.bob) * 0.3;
      const rad = c.rad * (1 + 0.95 * far);
      const tang = c.side * 1.4 * far;
      const x = Math.cos(th) * RX * rad - Math.sin(th) * tang * RX * 0.5;
      const y = Math.sin(th) * RY * rad + Math.cos(th) * tang * RY * 0.5;
      c.cg.position.set(x, y + 0.04 * Math.sin(lt * 2 + c.bob), c.z);
      // orientation : loin = de côté en rotation ; proche = face à la caméra
      _e.set(c.twist * far * 0.6, c.side * (1.35 + c.spin * lt * 0.6) * far, c.side * 0.7 * far + 0.08 * Math.sin(lt + c.bob));
      _qa.setFromEuler(_e);
      _cardP.set(x, y, c.z);
      _m4.lookAt(_cp, _cardP, _up);       // axe +Z de la carte vers la caméra
      _qn.setFromRotationMatrix(_m4);
      c.cg.quaternion.copy(_qn).multiply(_qa);              // _qa → identité quand la carte est proche
      // profondeur : les cartes lointaines s'éteignent dans le noir
      const fade = (1 - smoother(seg(a, 9, 24))) * tunnelFade;
      c.mat.color.setScalar(0.06 + 0.94 * fade);
      c.mat.map = c.staticTex;
      if (!c.isWidget && a > 0 && a < A_STATIC) near.push(c);
    }
    // textures vivantes : seulement les cartes proches (au plus POOL)
    near.sort((p, q) => (cz - p.z) - (cz - q.z));
    for (let k = 0; k < Math.min(POOL, near.length); k++) {
      const c = near[k];
      const P = pool[k];
      drawCardFace(P.g, POOL_W, POOL_H, c.app, appTime(cz - c.z), c.i);
      P.tex.needsUpdate = true;
      c.mat.map = P.tex;
    }

    // rails, anneaux, particules
    for (const m of rails) m.visible = tunnelFade > 0.01;
    rings.forEach((m, k) => {
      m.visible = tunnelFade > 0.01;
      m.rotation.z = lt * (k % 2 ? 0.4 : -0.4) + k;
    });
    ringMat.opacity = 0.5 * tunnelFade;
    pmat.opacity = 0.75 * tunnelFade;
    points.visible = tunnelFade > 0.01;

    // ---------------- vaisseau
    const hero = f.world.phones[0];
    if (lt >= T_SHIP) {
      hero.group.visible = true;
      shipPos(lt, _sp);
      hero.group.position.set(_sp[0], _sp[1], _sp[2]);
      shipQuat(lt, hero.group.quaternion);
      const ex = E.outCubic(seg(lt, 2.48, 2.82));
      hero.phone.setExplode(ex, f.t);
      hero.group.updateMatrixWorld(true);
      hero.screen.draw('counter', lt - 1.0, { to: 100, label: 'CHARGEMENT', dur: 1.2, brightness: 0.88 });
      lTop.intensity = 7 * (1 - 0.8 * ex); lTop.position.set(_sp[0] + 0.5, _sp[1] + 1.1, _sp[2] + 0.6);
      lBoard.intensity = 1.1 * ex; lBoard.position.set(_sp[0] - 0.15, _sp[1] - 0.18, _sp[2] - 0.35);
    } else {
      lTop.intensity = 0; lBoard.intensity = 0;
    }

    // ---------------- POST
    post.bloom = 0.6;
    post.bloomRadius = 0.32;
    post.vignette = 1.0;
    post.flashColor = [0.85, 1, 0.85];
    post.flash = 1 - E.outCubic(seg(lt, 0, 0.3));                 // sortie du flash de la traversée 1
    const cx = W / 2, cy = H / 2;
    // raccord : la fin de roll est blanche saturée (portail + flash) → voile lumineux qui se retire en 0.12 s
    const veil = 1 - E.outQuad(seg(lt, 0, 0.12));
    if (veil > 0.003) {
      const grd = fx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.6);
      grd.addColorStop(0, rgba('#ffffff', 0.95 * veil));
      grd.addColorStop(1, rgba('#e8ffe8', 0.75 * veil));
      fx.save(); fx.fillStyle = grd; fx.fillRect(0, 0, W, H); fx.restore();
    }

    // lignes de vitesse : entrée, accélérations
    const sk = 0.9 * (1 - seg(lt, 0, 0.45)) + 0.45 * win(lt, 0.95, 1.15, 1.5, 1.8) + 0.25 * win(lt, 2.2, 2.3, 2.45, 2.6);
    speedLines(fx, W, H, t, sk, { count: 130, speed: 2.2, seed: 41 });

    // traînées lumineuses du vaisseau
    if (lt >= T_SHIP && lt < 2.75) {
      const ta = win(lt, 1.36, 1.5, 2.35, 2.62);
      const tails = [[-0.3, 0.0], [0.3, 0.0], [0, -0.03]];
      const pp = [0, 0, 0];
      for (let ti = 0; ti < tails.length; ti++) {
        const pts = [];
        for (let k = 14; k >= 0; k--) {
          const tt = Math.max(T_SHIP, lt - k * 0.022);
          shipPos(tt, pp);
          pts.push(f.project([pp[0] + tails[ti][0], pp[1] + tails[ti][1], pp[2] + 0.76]));
        }
        trail(fx, pts, (ti === 2 ? 5 : 9) * u, ti === 2 ? C.teal : C.neon, 0.85 * ta);
      }
      // réacteur : halo à l'arrière
      const tc = f.project([_sp[0], _sp[1], _sp[2] + 0.75]);
      if (tc[2] < 1) radialGlow(fx, tc[0], tc[1], 120 * u, C.neon, 0.35 * ta);
    }
    // plan sur l'épaule : le vaisseau avance AVEC la caméra → flou de zoom centré sur lui (il reste net)
    const lockK = win(lt, 1.5, 1.75, 2.35, 2.5);
    if (lockK > 0) {
      const sc = f.project([_sp[0], _sp[1], _sp[2]]);
      if (sc[2] < 1) post.zoomCenter = [clamp(sc[0] / W), clamp(1 - sc[1] / H)];
      post.zoomBlur *= 1 - 0.55 * lockK;
      post.blur[0] *= 1 - 0.8 * lockK;
      post.blur[1] *= 1 - 0.8 * lockK;
    }
    // passage du vaisseau à côté de la caméra : flou latéral + choc
    const passK = win(lt, 1.36, 1.44, 1.48, 1.6);
    if (passK > 0) { post.blur[0] -= 0.03 * passK; post.ca += 0.002 * passK; }

    // éclatement
    if (lt >= 2.48) {
      const hc = f.project([_sp[0], _sp[1], _sp[2]]);
      if (hc[2] < 1) {
        sparks(fx, hc[0], hc[1], lt - 2.5, f, { count: 60, life: 0.5, speed: 1500, seed: 19 });
        shockRing(fx, hc[0], hc[1], lt - 2.5, f, { dur: 0.45, radius: 700, width: 10, alpha: 0.6 });
      }
    }
    // plongée : flou de zoom vers la carte mère, flash vert final
    if (lt >= T_DIVE) {
      const s = seg(lt, T_DIVE, T_END);
      const bc = f.project([_sp[0] + BOARD[0], _sp[1] + BOARD[1], _sp[2] + BOARD[2]]);
      if (bc[2] < 1) post.zoomCenter = [clamp(bc[0] / W), clamp(1 - bc[1] / H)];
      post.zoomBlur += 0.03 * E.inCubic(seg(lt, 2.75, 2.9));
      post.flashColor = [lerp(0.85, 0.6, s), 1, lerp(0.85, 0.6, s)];
      post.flash = Math.max(post.flash, E.inCubic(seg(lt, 2.8, 2.985)));
      post.bloom = 0.6 + 0.35 * E.inCubic(s);
      post.dof = { focus: cam.position.distanceTo(_cardP.set(_sp[0] + BOARD[0], _sp[1] + BOARD[1], _sp[2] + BOARD[2])), aperture: 0.03, maxblur: 0.006 };
    }

    // ---------------- typographie + HUD (ui)
    const outT = seg(lt, 2.12, 2.36);
    const oe = E.inCubic(outT);
    if (lt > 0.2 && lt < 2.4) {
      const sa = 0.5 * win(lt, 0.2, 0.4, 2.15, 2.4);
      if (V) scrimLinear(ui, 0, L.H * 0.12, 0, L.H * 0.62, sa);
      else scrimLinear(ui, 0, 0, 0, L.H * 0.62, sa);
      ui.save();
      ui.translate(0, -60 * u * oe);
      // ligne fine (Poppins 300)
      LINES.a.forEach((ln, k) => {
        drawText(ui, ln.str, LINES.x, ln.y, {
          size: LINES.sA, weight: 300, tracking: -0.01, align: 'center', color: C.white,
          t: lt - 0.26 - k * 0.12, mode: 'rise', stagger: 0.022, dur: 0.5, out: outT,
        });
      });
      // ligne grasse tapée, « endroit. » surligné néon
      const bl = LINES.b.map((ln, k) => {
        const last = k === LINES.b.length - 1;
        return {
          str: ln.str, x: LINES.x, y: ln.y, size: LINES.sB, weight: 900, tracking: -0.02, align: 'center',
          highlight: last ? (V ? 0 : ln.str.lastIndexOf(' ') + 1) : null,
        };
      });
      typeLines(ui, bl, { t: lt - typeStart, cps: CPS, out: oe, hlDelay: 0.05 });
      ui.restore();
    }

    // HUD : compteur de chargement + étapes
    const hudA = win(lt, 0.25, 0.45, 2.3, 2.47);
    if (hudA > 0.003) {
      const pct = Math.round(100 * E.inOutCubic(seg(lt, 0.3, 2.42)));
      ui.save();
      ui.globalAlpha = hudA;
      ui.textBaseline = 'alphabetic';
      if (V) {
        // 9:16 : barre de progression pleine largeur sous la zone sûre du haut
        const hy = S_.t + 62 * u, bw = S_.w;
        ui.textAlign = 'right';
        setFont(ui, 62 * u, 800, -0.02);
        ui.fillStyle = C.white;
        ui.fillText(`${pct}%`, S_.r, hy);
        ui.textAlign = 'left';
        ui.letterSpacing = `${6 * u}px`;
        ui.font = `600 ${24 * u}px "Space Grotesk"`;
        ui.fillStyle = pct >= 100 ? C.neon : C.muted;
        ui.fillText(pct >= 100 ? 'PRÊT' : 'CHARGEMENT', S_.l, hy - 6 * u);
        ui.letterSpacing = '0px';
        ui.fillStyle = 'rgba(244,248,244,0.14)';
        ui.fillRect(S_.l, hy + 22 * u, bw, 6 * u);
        ui.fillStyle = C.neon;
        ui.shadowColor = rgba(C.neon, 0.8); ui.shadowBlur = 14 * u;
        ui.fillRect(S_.l, hy + 22 * u, bw * pct / 100, 6 * u);
      } else {
        const hx = S_.r - 10 * u, hy = S_.b - 26 * u, bw = 300 * u;
        ui.textAlign = 'right';
        setFont(ui, 72 * u, 800, -0.02);
        ui.fillStyle = C.white;
        ui.fillText(`${pct}%`, hx, hy - 34 * u);
        ui.letterSpacing = `${5 * u}px`;
        ui.font = `600 ${21 * u}px "Space Grotesk"`;
        ui.fillStyle = pct >= 100 ? C.neon : C.muted;
        ui.fillText(pct >= 100 ? 'PRÊT' : 'CHARGEMENT', hx, hy - 112 * u);
        ui.letterSpacing = '0px';
        ui.fillStyle = 'rgba(244,248,244,0.14)';
        ui.fillRect(hx - bw, hy - 10 * u, bw, 6 * u);
        ui.fillStyle = C.neon;
        ui.shadowColor = rgba(C.neon, 0.8); ui.shadowBlur = 14 * u;
        ui.fillRect(hx - bw, hy - 10 * u, bw * pct / 100, 6 * u);
      }
      ui.shadowBlur = 0;
      ui.restore();
      // étapes qui glissent une par une
      STEPS.forEach((s, k) => {
        const st = lt - 0.45 - k * 0.12;
        const p = E.outExpo(seg(st, 0, 0.45));
        // 9:16 : les étapes laissent la place au vaisseau qui arrive en bas du cadre
        const o = V ? E.inCubic(seg(lt, 1.3 + k * 0.05, 1.5 + k * 0.05)) : E.inCubic(seg(lt, 2.1 + k * 0.05, 2.35 + k * 0.05));
        const a = p * (1 - o) * hudA;
        if (a <= 0.003) return;
        const sz = (V ? 28 : 24) * u;
        const pillH = sz * 2.1, pillW = textWidth(ui, s, sz, 600, 0.12) + sz * 3.4;
        const x0 = (V ? S_.l : S_.l + 6 * u) - (1 - p) * 260 * u - o * 200 * u;
        const y0 = (V ? S_.b - 40 * u - (2 - k) * (pillH + 12 * u) - pillH : S_.b - 26 * u - (2 - k) * (pillH + 10 * u) - pillH);
        ui.save();
        ui.globalAlpha = a;
        ui.beginPath(); ui.roundRect(x0, y0, pillW, pillH, pillH / 2);
        ui.fillStyle = k === 0 ? rgba(C.neon, 0.95) : 'rgba(10,22,14,0.86)';
        ui.fill();
        ui.lineWidth = 1.5 * u; ui.strokeStyle = rgba(C.neon, 0.7); ui.stroke();
        ui.fillStyle = k === 0 ? C.ink : C.neon;
        ui.beginPath(); ui.arc(x0 + sz * 1.05, y0 + pillH / 2, sz * 0.26, 0, TAU); ui.fill();
        setFont(ui, sz, 600, 0.12);
        ui.font = `600 ${sz}px "Space Grotesk"`;
        ui.letterSpacing = `${0.12 * sz}px`;
        ui.fillStyle = k === 0 ? C.ink : C.white;
        ui.textAlign = 'left'; ui.textBaseline = 'middle';
        ui.fillText(s, x0 + sz * 1.7, y0 + pillH / 2 + 1);
        ui.letterSpacing = '0px';
        ui.restore();
      });
    }
    post.uiBlur = lt < 0.3 ? 1 : lt < 2.3 ? 0.15 : 1;
    if (lt > 0.25 && lt < 2.47) post.ca = Math.min(post.ca, 0.0019 - (lt > 2.3 ? 0.0009 : 0));
  }

  return { group, camera, update };
}
