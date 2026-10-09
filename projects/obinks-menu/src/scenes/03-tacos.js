// ============================================================================
//  03 — TACOS (8.5 → 13.5 s, 10 temps à 120 BPM)
// ============================================================================
//  0.00  ATTERRISSAGE DU WHIP PAN du Crousty : la caméra file encore vers la droite (flou de filé,
//        traînée rouge) et se pose en 0.32 s ; « TACOS » claque (énorme, Bangers) en glissant,
//        éclaboussure rouge ; 0.45 sous-titre des 4 viandes
//  0.50  le tacos 3D tombe en tournant et S'ÉCRASE (impact, vapeur)
//  1.00  VUE ÉCLATÉE : galette / frites / viande / sauce fromagère / sauce / galette, étiquettes ;
//        sur chaque temps (1.0 · 1.5 · 2.0 · 2.5) la viande change dans le tacos 3D (crunch) et la
//        photo du menu + son étiquette colorée (NUGGETS orange, TENDERS rouge, CORDON BLEU bleu,
//        POULET MARINÉ TANDOORI violet) claque dans la grille
//  3.00  réassemblage avec impact + TACOS L 8,00€ ; 3.50 TACOS XL 11,00€ « CHOIX ENTRE 2 VIANDES »
//  4.00  la SAUCE FROMAGÈRE coule du haut de l'écran (rideau de sauce), pot du menu à la place
//        du tacos ; 4.25 « CHOISIS TA SAUCE » dans un cadre néon à la place des prix, les 6 pots
//        du menu claquent un par un
//  4.84  le néon grésille et COUPE : noir complet dès 4.95 (les lampadaires du segment burgers
//        s'allument dans ce noir)
//  Textes et prix : FACTS.md §2 uniquement.
// ============================================================================
import { E, clamp, lerp, seg, pulse, rgba, noise1, TAU } from '../core/anim.js';
import { createFood, createFoodLights } from '../world/food.js';
import {
  P, brushStroke, splatter, brushTitle, priceTag, neonFrame, neonFlicker, smoke, streetBackdrop, particles,
  photo, crispImage,
} from '../core/obinks.js';

const MEATS = [
  { meat: 'nuggets', id: 'tacos_nuggets', name: 'NUGGETS', color: '#ff8a00' },
  { meat: 'tenders', id: 'tacos_tenders', name: 'TENDERS', color: '#e3141b' },
  { meat: 'cordonbleu', id: 'tacos_cordonbleu', name: 'CORDON BLEU', color: '#1f6bff' },
  { meat: 'tandoori', id: 'tacos_tandoori', name: 'POULET MARINÉ\nTANDOORI', color: '#7a2ee0' },
];
const BEATS = [1.0, 1.5, 2.0, 2.5];   // changement de viande
const OPEN = [1.0, 1.32], CLOSE = [2.72, 3.0];
const T_L = 3.0, T_XL = 3.5, T_DRIP = 4.0, T_CHOOSE = 4.25, T_CUT = 4.84;
// bornes des pots dans sauces_tacos.png (px source, mesurées sur l'alpha)
const POTS = [[3, 84], [93, 174], [182, 262], [272, 352], [360, 441], [448, 528]];

export const cues = [
  { t: 0.0, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: 0.16, type: 'impact', gain: 0.9 },
  { t: 0.18, type: 'splash', gain: 0.7 },
  { t: 0.5, type: 'impact', gain: 1 },
  { t: 0.52, type: 'sizzle', dur: 0.9, gain: 0.55 },
  { t: 1.0, type: 'swish', gain: 0.7 },
  ...BEATS.map((t, i) => ({ t: t + 0.02, type: 'crunch', gain: 0.75 + 0.05 * i, pan: 0.3 })),
  ...BEATS.map((t) => ({ t: t + 0.04, type: 'pop', gain: 0.5, pan: 0.4 })),
  { t: 2.9, type: 'whoosh', dur: 0.12, gain: 0.6 },
  { t: 3.0, type: 'impact', gain: 0.85 },
  { t: 3.04, type: 'hit', gain: 0.8 },
  { t: 3.5, type: 'hit', gain: 0.95 },
  { t: 3.92, type: 'whoosh', dur: 0.1, gain: 0.6 },
  { t: 4.0, type: 'pour', dur: 0.55, gain: 0.9 },
  { t: 4.08, type: 'pop', gain: 0.7 },
  { t: 4.2, type: 'whoosh', dur: 0.1, gain: 0.5 },
  { t: 4.25, type: 'hit', gain: 0.8 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: 4.32 + i * 0.03, type: 'pop', gain: 0.4, pan: -0.6 + i * 0.24 })),
  { t: 4.84, type: 'zap', gain: 0.8 },
  { t: 4.92, type: 'zap', gain: 0.5 },
];

// ------------------------------------------------------------------ dessin 2D local
export function setFont(g, family, size, weight = 400) {
  g.font = `${weight} ${size}px "${family}"`;
  g.letterSpacing = '0px';
}

/** Étiquette colorée « brush » des viandes (comme sur le menu). (x, y) = centre. */
export function meatTag(g, x, y, text, color, size, p, seed, rot = -0.04) {
  if (p <= 0) return;
  const lines = text.split('\n');
  g.save();
  setFont(g, 'Oswald', size, 700);
  const w = Math.max(...lines.map((l) => g.measureText(l).width));
  const lh = size * 1.02, h = lh * lines.length;
  g.translate(x, y);
  g.rotate(rot);
  const pop = E.outBack(seg(p, 0, 0.5), 2.2);
  g.scale(lerp(1.5, 1, pop), lerp(1.5, 1, pop));
  brushStroke(g, 0, 0, w + size * 1.3, h + size * 0.9, { color, seed, p: E.outCubic(seg(p, 0, 0.45)) });
  g.globalAlpha *= clamp(seg(p, 0.15, 0.45) * 1.5);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const yy = (i - (lines.length - 1) / 2) * lh;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillText(l, size * 0.05, yy + size * 0.07);
    g.fillStyle = '#ffffff';
    g.fillText(l, 0, yy);
  });
  g.restore();
}

/** Étiquette d'ingrédient accrochée à la couche : point jaune, filet, texte (Oswald). */
export function ingLabel(g, x, y, text, side, a, size, u, accent, S) {
  if (a <= 0.01) return;
  g.save();
  g.globalAlpha *= a;
  setFont(g, 'Oswald', size, 600);
  const tw0 = g.measureText(text).width;
  const len = 26 * u * E.outCubic(clamp(a * 1.4));
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 2.2 * u;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + side * len, y); g.stroke();
  g.fillStyle = P.yellow;
  g.beginPath(); g.arc(x, y, 5 * u, 0, TAU); g.fill();
  setFont(g, 'Oswald', size, 600);
  g.textBaseline = 'middle';
  g.textAlign = side > 0 ? 'left' : 'right';
  let tx = x + side * (len + 8 * u);
  if (S) tx = side < 0 ? Math.max(tx, S.l + tw0 + 10 * u) : Math.min(tx, S.r - tw0 - 10 * u);
  if (accent) {
    const tw = g.measureText(text).width;
    const bx = side > 0 ? tx - 8 * u : tx - tw - 8 * u;
    g.fillStyle = accent;
    g.beginPath(); g.roundRect(bx, y - size * 0.68, tw + 16 * u, size * 1.36, 6 * u); g.fill();
  }
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(8,2,2,0.9)';
  g.lineWidth = size * 0.2;
  g.strokeText(text, tx, y);
  g.fillStyle = '#ffffff';
  g.fillText(text, tx, y);
  g.restore();
}

/** Ligne de texte multicolore (sous-titre des viandes). parts = [[texte, couleur], …]. */
export function richLine(g, parts, x, y, size, a, maxW) {
  if (a <= 0.01) return;
  g.save();
  setFont(g, 'Oswald', size, 600);
  let w = parts.reduce((s, [t]) => s + g.measureText(t).width, 0);
  if (maxW && w > maxW) { size *= maxW / w; setFont(g, 'Oswald', size, 600); w = maxW; }
  g.globalAlpha *= a;
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  let px = x - w / 2;
  for (const [t, c] of parts) {
    g.strokeStyle = 'rgba(8,2,2,0.95)';
    g.lineWidth = size * 0.16;
    g.strokeText(t, px, y);
    g.fillStyle = c;
    g.fillText(t, px, y);
    px += g.measureText(t).width;
  }
  g.restore();
}

/**
 * Rideau de SAUCE FROMAGÈRE qui coule du haut de l'écran : nappe épaisse au bord haut + coulures
 * visqueuses (bulbe au bout), dégradé orange, reflets brillants. p 0→1, pure.
 */
function cheeseCurtain(g, W, H, p, t, u, depth) {
  if (p <= 0) return;
  depth *= Math.max(1, p);  // au-delà de 1 : les coulures continuent de descendre lentement
  p = Math.min(1, p);
  const N = Math.round(W / (64 * u));
  const band = depth * 0.22 * E.outCubic(seg(p, 0, 0.35));
  const gr = g.createLinearGradient(0, 0, 0, depth * 1.1);
  gr.addColorStop(0, '#ffc04a');
  gr.addColorStop(0.35, '#ff9d1e');
  gr.addColorStop(1, '#e06a00');
  g.save();
  // nappe du haut (bord ondulé)
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(-10, -10);
  g.lineTo(W + 10, -10);
  for (let i = 0; i <= 48; i++) {
    const x = W + 10 - (i / 48) * (W + 20);
    g.lineTo(x, band * (0.82 + 0.18 * Math.sin(x * 0.013 + t * 2.1) + 0.1 * noise1(x * 0.02)));
  }
  g.closePath();
  g.fill();
  // coulures
  const drips = [];
  for (let i = 0; i < N; i++) {
    const h1 = Math.abs(Math.sin(i * 127.1 + 3.7) * 43758.5453) % 1;
    const h2 = Math.abs(Math.sin(i * 311.7 + 1.3) * 24634.6345) % 1;
    const x = ((i + 0.3 + 0.4 * h1) / N) * W;
    const w = (18 + 34 * h2) * u;
    const L = band * 0.6 + depth * (0.18 + 0.82 * h1 * h1) * E.outCubic(seg(p, 0.05 + 0.25 * h2, 1));
    drips.push({ x, w, L });
    g.beginPath();
    g.moveTo(x - w, band * 0.5);
    g.bezierCurveTo(x - w * 0.55, band * 0.5 + L * 0.35, x - w * 0.5, L * 0.8, x - w * 0.62, L);
    g.arc(x, L, w * 0.62, Math.PI, 0, true);
    g.bezierCurveTo(x + w * 0.5, L * 0.8, x + w * 0.55, band * 0.5 + L * 0.35, x + w, band * 0.5);
    g.closePath();
    g.fill();
  }
  // brillance : filets clairs sur la gauche de chaque coulure + reflet du bulbe
  g.globalCompositeOperation = 'source-over';
  g.lineCap = 'round';
  for (const d of drips) {
    g.strokeStyle = 'rgba(255,240,190,0.55)';
    g.lineWidth = d.w * 0.18;
    g.beginPath(); g.moveTo(d.x - d.w * 0.32, band * 0.7); g.lineTo(d.x - d.w * 0.3, d.L - d.w * 0.2); g.stroke();
    g.fillStyle = 'rgba(255,250,225,0.8)';
    g.beginPath(); g.ellipse(d.x - d.w * 0.2, d.L - d.w * 0.05, d.w * 0.14, d.w * 0.2, -0.3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(150,50,0,0.35)';
    g.lineWidth = d.w * 0.14;
    g.beginPath(); g.moveTo(d.x + d.w * 0.38, band * 0.8); g.lineTo(d.x + d.w * 0.34, d.L - d.w * 0.3); g.stroke();
  }
  // reflet long sur la nappe
  g.fillStyle = 'rgba(255,245,210,0.35)';
  g.fillRect(0, band * 0.3, W, Math.max(2, band * 0.08));
  g.restore();
}

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe;
  const I = world.images || {};
  const group = new THREE.Group();
  const lights = createFoodLights({ key: 1.15, rim: 1.0, fill: 1.1 });
  group.add(lights);

  // ---- 4 tacos 3D (une viande chacun) : seul l'actif est visible. Les autres couches sont
  // identiques (mêmes graines) → changer de tacos = changer la viande.
  const holder = new THREE.Group();
  const spin = new THREE.Group();
  holder.add(spin);
  group.add(holder);
  const foods = MEATS.map((m) => {
    const food = createFood('tacos', { meat: m.meat });
    food.group.position.y = -food.height / 2;
    spin.add(food.group);
    const viande = food.layers.find((l) => l.name === 'viande');
    return { food, viande, labels: food.layers.filter((l) => !l.minor) };
  });
  const F0 = foods[0].food;
  const SPREAD = V ? 1.15 : 1.2;

  // ---- caméra et placement écran → monde (caméra privée SANS secousse, pour que la secousse des
  // cues bouge bien le produit à l'écran)
  const FOV = 30;
  // atterrissage du whip pan (raccord Crousty) : la caméra arrive de la gauche en décélérant
  const PANPX = V ? 1.1 * W : 0.75 * W;
  const PAN = PANPX / (H / (2 * 4.8 * Math.tan((FOV * Math.PI) / 360)));
  const panAt = (lt) => 1 - E.outCubic(seg(lt, 0, 0.32));
  const camOf = (lt) => {
    const z = lerp(5.0, 4.55, E.inOutSine(clamp(lt / 5)));
    const px = -PAN * panAt(lt);
    return { pos: [px + Math.sin(lt * 0.7) * 0.06, 1.05 + Math.sin(lt * 0.9) * 0.03, z], target: [px, 0.05, 0], roll: Math.sin(lt * 0.6) * 0.006 - 0.02 * panAt(lt), fov: FOV };
  };
  const pcam = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 300);
  const ndc = new THREE.Vector3(), dir = new THREE.Vector3(), tgt = new THREE.Vector3(), v = new THREE.Vector3();
  const placeAt = (c, fx, fy, out) => {
    pcam.position.set(c.pos[0], c.pos[1], c.pos[2]);
    pcam.up.set(0, 1, 0);
    pcam.lookAt(c.target[0], c.target[1], c.target[2]);
    pcam.fov = c.fov; pcam.aspect = W / H; pcam.updateProjectionMatrix(); pcam.updateMatrixWorld(true);
    ndc.set(fx * 2 - 1, -(fy * 2 - 1), 0.5).unproject(pcam);
    dir.copy(ndc).sub(pcam.position).normalize();
    const k = (0 - pcam.position.z) / dir.z;
    out.copy(pcam.position).addScaledVector(dir, k);
    return out;
  };
  // taille visible (unités monde) au plan z = 0 pour la distance moyenne
  const visH = 2 * 4.8 * Math.tan((FOV * Math.PI) / 360), visW = visH * (W / H);
  const fit = (fw, fh, exploded) => Math.min((fw * visW) / F0.width, (fh * visH) / (exploded ? F0.explodedHeight(SPREAD) : F0.height * 2.2));

  // ---- mise en page (fractions d'écran) par phase
  const LY = V ? {
    A: { p: [0.5, 0.555], s: fit(0.78, 0.3, false) },
    B: { p: [0.5, 0.365], s: fit(0.7, 0.4, true) },
    C: { p: [0.5, 0.315], s: fit(0.8, 0.3, false) },
    title: { x: W / 2, y: H * 0.238, size: 270 * u },
    sub: { x: W / 2, y1: H * 0.292, y2: H * 0.32, size: 44 * u, maxW: S.w },
    grid: MEATS.map((_, i) => ({ x: S.l + S.w * (0.125 + 0.25 * i), y: H * 0.705, h: H * 0.12, tagY: H * 0.615, tagSize: 34 * u })),
    L: { x: W / 2, y: H * 0.525, size: 150 * u },
    XL: { x: W / 2, y: H * 0.68, size: 150 * u },
    sauceT: { x: W / 2, y: H * 0.205, size: 104 * u },
    pot: { x: W / 2, y: H * 0.355, h: H * 0.16 },
    choose: { x: W / 2, y: H * 0.535, size: 104 * u },
    row: { x: W / 2, y: H * 0.635, w: S.w * 0.96 },
    frame: [S.l + 4 * u, H * 0.47, S.w - 8 * u, H * 0.235],
    drip: H * 0.3,
    labelSize: 33 * u,
  } : {
    A: { p: [0.27, 0.56], s: fit(0.38, 0.5, false) },
    B: { p: [0.235, 0.5], s: fit(0.29, 0.7, true) },
    C: { p: [0.3, 0.53], s: fit(0.42, 0.5, false) },
    title: { x: W * 0.71, y: H * 0.43, size: 300 * u },
    sub: { x: W * 0.71, y1: H * 0.56, y2: H * 0.625, size: 50 * u, maxW: W * 0.46 },
    grid: MEATS.map((_, i) => ({ x: W * (i % 2 ? 0.87 : 0.68), y: H * (i < 2 ? 0.36 : 0.775), h: H * 0.255, tagY: H * (i < 2 ? 0.155 : 0.57), tagSize: 36 * u })),
    L: { x: W * 0.71, y: H * 0.29, size: 160 * u },
    XL: { x: W * 0.71, y: H * 0.68, size: 160 * u },
    sauceT: { x: W * 0.28, y: H * 0.3, size: 92 * u },
    pot: { x: W * 0.28, y: H * 0.62, h: H * 0.4 },
    choose: { x: W * 0.705, y: H * 0.47, size: 104 * u },
    row: { x: W * 0.705, y: H * 0.64, w: W * 0.44 },
    frame: [W * 0.47, H * 0.31, W * 0.47, H * 0.45],
    drip: H * 0.3,
    labelSize: 31 * u,
  };
  const lamps = V ? [0.08, 0.92] : [0.05, 0.5, 0.95];
  const rowImg = I.sauces_tacos;

  return {
    group,
    real: () => foods.map((F, i) => ({ holder, food: F.food, im: I[MEATS[i].id] })),
    camera: camOf,
    update(f) {
      const lt = f.lt, t = f.t, ui = f.ui, fx = f.fx;
      const cam = camOf(lt);

      // ---------------- fond : rue de nuit (légère dérive), braises
      const pan = panAt(lt), dxPan = pan * PANPX;
      streetBackdrop(f.bg, W, H, t, { k: 0.62, lamps, parallax: lt * 26 * u - dxPan * 0.7, seed: 3, light: 0.85 });
      smoke(f.bg, W, H, t, { area: [0, H * 0.55, W, H * 0.45], size: Math.min(W, H) * 0.7, count: 7, alpha: 0.12, seed: 31, rise: 0.6 });
      particles(fx, W, H, t, { kind: 'embers', k: 0.7, seed: 12, count: 30 });

      // ---------------- produit 3D : position / taille / rotation par phase
      const toB = E.inOutCubic(seg(lt, 0.86, 1.08));
      const toC = E.inOutCubic(seg(lt, 2.95, 3.2));
      const pa = LY.A.p, pb = LY.B.p, pc = LY.C.p;
      let fxp = lerp(lerp(pa[0], pb[0], toB), pc[0], toC);
      let fyp = lerp(lerp(pa[1], pb[1], toB), pc[1], toC);
      let sc = lerp(lerp(LY.A.s, LY.B.s, toB), LY.C.s, toC);
      // A : chute en tournant, écrasement à 0.5
      const fall = seg(lt, 0.06, 0.5);
      fyp -= (1 - E.inCubic(fall)) * 0.75;
      const land = lt >= 0.5 ? Math.exp(-(lt - 0.5) / 0.09) : 0;
      // sortie à 4.0 (le pot de sauce prend la place)
      const exitQ = E.inCubic(seg(lt, 3.9, 4.06));
      fxp += dxPan / W;
      placeAt(cam, fxp, fyp, tgt);
      holder.position.copy(tgt);
      holder.position.y += exitQ * visH * 0.9;
      const hitC = lt >= CLOSE[1] ? Math.exp(-(lt - CLOSE[1]) / 0.1) : 0;
      const sq = 0.16 * land + 0.07 * hitC;
      const k = sc * (1 - 0.6 * exitQ);
      holder.scale.set(k * (1 + sq * 0.6), k * (1 - sq), k * (1 + sq * 0.6));
      holder.rotation.set(0.3 - 0.08 * toB, 0, Math.sin(lt * 1.3) * 0.03);
      const spinY = -0.55 + Math.sin(lt * 1.1) * 0.22 + (1 - E.outCubic(fall)) * -5.5 + 0.35 * toB - 0.25 * toC + exitQ * 2;
      spin.rotation.set(0, spinY, 0);
      holder.visible = lt < 4.08 && fall > 0;

      // éclatement
      const pe = E.outCubic(seg(lt, OPEN[0], OPEN[1])) * (1 - E.inCubic(seg(lt, CLOSE[0], CLOSE[1])));
      const mi = lt < BEATS[0] ? 0 : Math.min(3, Math.floor((lt - BEATS[0]) / 0.5));
      const mi2 = lt >= CLOSE[1] ? 3 : mi;
      foods.forEach((F, i) => {
        F.food.group.visible = i === mi2;
        if (i !== mi2) return;
        F.food.setExplode(pe, t, { spread: SPREAD, stagger: 0.25, wobble: 1, spin: 0.8 });
        // la viande « claque » à chaque changement
        const bt = BEATS[i];
        const pop = lt >= bt && lt < 3 ? 1 + 0.32 * Math.exp(-(lt - bt) / 0.08) * (lt < bt + 0.4 ? 1 : 0) : 1;
        F.viande.obj.scale.setScalar(pop);
      });
      for (const F of foods) if (F !== foods[mi2]) F.viande.obj.scale.setScalar(1);

      // vapeur au-dessus du tacos
      const [hx, hy] = f.project([holder.position.x, holder.position.y, holder.position.z]);
      const steamK = seg(lt, 0.5, 0.9) * (1 - seg(lt, 3.9, 4.05));
      smoke(ui, W, H, t, { area: [hx - W * (V ? 0.3 : 0.14), hy - H * 0.32, W * (V ? 0.6 : 0.28), H * 0.2], size: Math.min(W, H) * 0.32, count: 8, alpha: 0.3 * steamK, seed: 7, rise: 1.5 });
      if (lt >= 0.5 && lt < 1.6) particles(ui, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy + H * 0.06, t0: f.t - lt + 0.5, power: 0.8 }, seed: 5, count: 36 });
      if (lt >= CLOSE[1] && lt < 4.1) particles(ui, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy + H * 0.03, t0: f.t - lt + CLOSE[1], power: 0.7 }, seed: 8, count: 30 });

      // ---------------- A : titre TACOS + sous-titre
      const titleOut = E.inCubic(seg(lt, 0.86, 1.04));
      if (lt < 1.05) {
        ui.save();
        ui.translate(dxPan, 0);
        const T0 = LY.title;
        splatter(ui, T0.x, T0.y - T0.size * 0.3, T0.size * 0.95, { p: seg(lt, 0.16, 0.95), seed: 14, alpha: 0.95 * (1 - titleOut), drips: 0.6 });
        brushStroke(ui, T0.x, T0.y + T0.size * 0.08, T0.size * 2.3, T0.size * 0.2, { p: seg(lt, 0.26, 0.44), seed: 9, color: P.yellow, angle: -0.035, alpha: 1 - titleOut });
        ui.save();
        ui.globalAlpha = 1 - titleOut;
        ui.translate(T0.x, T0.y);
        ui.scale(1 + titleOut * 0.4, 1 + titleOut * 0.4);
        brushTitle(ui, 'TACOS', 0, 0, { size: T0.size, font: 'Bangers', p: seg(lt, 0.04, 0.3), glow: 0.7, tracking: 0.02, maxWidth: V ? S.w * 0.84 : W * 0.5 });
        ui.restore();
        const sa = clamp(seg(lt, 0.42, 0.6) * 1.2) * (1 - titleOut);
        const sb = clamp(seg(lt, 0.5, 0.68) * 1.2) * (1 - titleOut);
        const Y = P.yellow, Wh = '#ffffff';
        const S0 = LY.sub;
        richLine(ui, [['NUGGETS', Wh], [' ou ', Wh], ['TENDERS', Y], [' ou ', Wh], ['CORDON BLEU', Wh]], S0.x, S0.y1 + (1 - sa) * 20 * u, S0.size, sa, S0.maxW);
        richLine(ui, [['ou ', Wh], ['POULET MARINÉ ', Wh], ['TANDOORI', Y]], S0.x, S0.y2 + (1 - sb) * 20 * u, S0.size, sb, S0.maxW);
        ui.restore();
      }
      particles(fx, W, H, t, { kind: 'sparks', burst: { x: LY.title.x, y: LY.title.y - LY.title.size * 0.3, t0: f.t - lt + 0.16, power: 1 }, seed: 9 });

      // ---------------- B : étiquettes d'ingrédients + grille des 4 viandes
      const la = clamp((pe - 0.6) / 0.3);
      if (la > 0 && holder.visible) {
        const F = foods[mi2];
        F.labels.forEach((l, j) => {
          const right = V ? j % 2 === 0 : true;
          (right ? F.food.anchors : F.food.anchorsL)[l.name].getWorldPosition(v);
          const [x, y] = f.project([v.x, v.y, v.z]);
          const isMeat = l.name === 'viande';
          const txt = isMeat ? MEATS[mi2].name.replace('\n', ' ') : l.label;
          const pop = isMeat ? 1 + 0.25 * Math.exp(-(lt - BEATS[mi2]) / 0.1) : 1;
          ingLabel(ui, x, y, txt, right ? 1 : -1, la, LY.labelSize * pop, u, isMeat ? MEATS[mi2].color : null, S);
        });
      }
      const gridOut = E.inCubic(seg(lt, 2.88, 3.04));
      if (lt >= BEATS[0] - 0.02 && gridOut < 1) {
        MEATS.forEach((m, i) => {
          const c = LY.grid[i];
          const q = seg(lt, BEATS[i] - 0.02, BEATS[i] + 0.2);
          if (q <= 0) return;
          const active = i === mi;
          const dx = (V ? 0 : 1) * gridOut * W * 0.5, dy = (V ? 1 : 0) * gridOut * H * 0.4;
          const im = I[m.id];
          const hl = active ? 1 + 0.05 * Math.exp(-(lt - BEATS[i]) / 0.15) : 0.94;
          ui.save();
          ui.globalAlpha = active ? 1 : 0.8;
          if (im) photo(ui, im, c.x + dx, c.y + dy, { h: c.h, p: q, shadow: 0.9, glow: active ? 0.6 : 0.15, glowColor: m.color, scale: hl, rot: (i % 2 ? 0.03 : -0.03) });
          ui.restore();
          meatTag(ui, c.x + dx, c.tagY + dy, m.name, m.color, c.tagSize * (active ? 1.08 : 1), seg(lt, BEATS[i] + 0.03, BEATS[i] + 0.3), 20 + i, i % 2 ? 0.035 : -0.04);
          if (active) particles(fx, W, H, t, { kind: 'sparks', burst: { x: c.x + dx, y: c.y + dy, t0: f.t - lt + BEATS[i], power: 0.55 }, seed: 40 + i, count: 26 });
        });
      }

      // ---------------- C : prix TACOS L / TACOS XL
      const priceOut = E.inCubic(seg(lt, 4.18, 4.32));
      if (lt >= T_L - 0.02 && priceOut < 1) {
        const a = 1 - priceOut, dxo = (V ? 0 : 1) * priceOut * W * 0.4, dyo = (V ? 1 : 0) * priceOut * H * 0.35;
        priceTag(ui, LY.L.x + dxo, LY.L.y + dyo, { price: '8,00€', label: 'TACOS L', size: LY.L.size, p: seg(lt, T_L, T_L + 0.4), t, color: 'yellow', rotate: -0.035, alpha: a });
        priceTag(ui, LY.XL.x + dxo, LY.XL.y + dyo, { price: '11,00€', label: 'TACOS XL', sub: 'CHOIX ENTRE 2 VIANDES', size: LY.XL.size, p: seg(lt, T_XL, T_XL + 0.4), t, color: 'white', rotate: 0.03, alpha: a });
        particles(fx, W, H, t, { kind: 'sparks', burst: { x: LY.XL.x, y: LY.XL.y, t0: f.t - lt + T_XL + 0.1, power: 0.9 }, seed: 17 });
      }

      // ---------------- D : sauce fromagère qui coule + CHOISIS TA SAUCE
      if (lt >= T_DRIP - 0.01) {
        const q = seg(lt, T_DRIP, T_DRIP + 0.7) + 0.12 * seg(lt, T_DRIP + 0.7, 5.0);
        const pot = LY.pot, im = I.sauce_fromagere;
        if (im) {
          const pp = seg(lt, T_DRIP + 0.06, T_DRIP + 0.36);
          photo(ui, im, pot.x, pot.y, { h: pot.h, p: pp, shadow: 1, glow: 0.45, glowColor: '#ff9d1e', scale: 1 + 0.02 * Math.sin(lt * 9) * pp });
        }
        smoke(ui, W, H, t, { area: [pot.x - pot.h * 0.6, pot.y - pot.h * 1.0, pot.h * 1.2, pot.h * 0.5], size: pot.h * 0.8, count: 6, alpha: 0.3 * seg(lt, 4.1, 4.4), seed: 19, rise: 1.4 });
        cheeseCurtain(ui, W, H, q, t, u, LY.drip);
        const T1 = LY.sauceT;
        brushTitle(ui, 'SAUCE FROMAGÈRE', T1.x, T1.y, { size: T1.size, p: seg(lt, T_DRIP + 0.1, T_DRIP + 0.38), maxWidth: V ? S.w * 0.88 : W * 0.42, colorAt: (i) => (i < 6 ? P.white : P.yellow), glow: 0.4 });
        // CHOISIS TA SAUCE
        const cq = seg(lt, T_CHOOSE, T_CHOOSE + 0.3);
        if (cq > 0) {
          const [fx0, fy0, fw, fh] = LY.frame;
          neonFrame(ui, fx0, fy0, fw, fh, { p: seg(lt, T_CHOOSE - 0.02, T_CHOOSE + 0.22), flicker: 0.5, t, seed: 4, screws: true });
          const C0 = LY.choose;
          brushTitle(ui, 'CHOISIS TA SAUCE', C0.x, C0.y, { size: C0.size, p: cq, maxWidth: fw * 0.9, colorAt: (i) => (i < 11 ? P.white : P.neon), glow: 0.45 });
          if (rowImg) {
            const src = crispImage(rowImg) || rowImg.img;
            const R0 = LY.row;
            const k2 = src === rowImg.img ? 1 : 2;
            const scale = R0.w / 532;
            const ph = 91 * scale;
            POTS.forEach(([a0, a1], i) => {
              const pq = seg(lt, T_CHOOSE + 0.06 + i * 0.03, T_CHOOSE + 0.26 + i * 0.03);
              if (pq <= 0) return;
              const pw = (a1 - a0) * scale;
              const cx = R0.x - R0.w / 2 + ((a0 + a1) / 2) * scale;
              const pop = E.outBack(pq, 2.4);
              ui.save();
              ui.translate(cx, R0.y + (1 - E.outCubic(pq)) * 60 * u);
              ui.scale(pop, pop);
              ui.globalAlpha = clamp(pq * 3);
              ui.imageSmoothingQuality = 'high';
              ui.drawImage(src, a0 * k2, 0, (a1 - a0) * k2, 91 * k2, -pw / 2, -ph / 2, pw, ph);
              ui.restore();
            });
          }
        }
      }

      // ---------------- traînée rouge du whip pan (prolonge celle de la fin du Crousty)
      if (pan > 0.02) {
        const k = pan * pan;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        const gy = H * (V ? 0.5 : 0.55);
        const gr = fx.createLinearGradient(0, gy - 90 * u, 0, gy + 90 * u);
        gr.addColorStop(0, 'rgba(255,42,42,0)'); gr.addColorStop(0.5, `rgba(255,60,50,${0.55 * k})`); gr.addColorStop(1, 'rgba(255,42,42,0)');
        fx.fillStyle = gr; fx.fillRect(0, gy - 90 * u, W, 180 * u);
        fx.restore();
      }

      // ---------------- coupure néon → noir (raccord avec les lampadaires des burgers)
      let dark = 0;
      if (lt >= T_CUT) {
        const q = lt - T_CUT;
        const on = (q > 0.025 && q < 0.05) || (q > 0.075 && q < 0.09);
        dark = q > 0.11 ? 1 : on ? 0.2 : 0.86;
      }
      if (dark > 0) { ui.save(); ui.globalAlpha = dark; ui.fillStyle = P.bg; ui.fillRect(0, 0, W, H); ui.restore(); }

      // ---------------- post
      const post = f.post;
      post.bloom = 0.42;
      post.vignette = 1.15;
      post.exposure = 1 - 0.85 * dark;
      post.fxGain = 1.1 * (1 - dark);
      post.flash = Math.max(post.flash, pulse(lt, 0.5, 0.01, 0.12) * 0.32, pulse(lt, 3.0, 0.01, 0.1) * 0.22, pulse(lt, 0.16, 0.01, 0.1) * 0.22);
      post.flashColor = [1, 0.55, 0.3];
      if (lt >= 0.5 && lt < 0.9) post.shock = [hx / W, 1 - hy / H, (lt - 0.5) * 1.4, 1.4 * (1 - seg(lt, 0.5, 0.9))];
      // flou de filé du whip (la 1re image d'un segment n'a pas de flou auto : on le fournit)
      if (pan > 0.01) {
        const vb = Math.min(0.09, (3 * PANPX * (1 - seg(lt, 0, 0.32)) ** 2 / 0.32 / 60) / W);
        if (Math.abs(post.blur[0]) < vb) post.blur = [-vb, post.blur[1]];
      }
    },
  };
}
