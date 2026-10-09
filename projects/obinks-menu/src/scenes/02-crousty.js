// ============================================================================
//  02 — CROUSTY BINKS (3.5 → 8.5 s, 5 s, temps LOCAUX ci-dessous ; 120 BPM = un temps / 0,5 s)
// ============================================================================
//  0.00  plein rouge (raccord avec la fin de l'intro) : les coups de pinceau se retirent et
//        découvrent la nappe à carreaux 3D dans la rue de nuit
//  0.22  la PHOTO du Crousty (visuel « beauté » du menu) tombe du ciel → 0.50 IMPACT sur la nappe
//        (écrasement, miettes, vapeur qui monte) ; 0.50 titre CROUSTY BINKS au pinceau
//  1.00  flash : la photo devient le modèle 3D → VUE ÉCLATÉE (riz / crème fraîche / tenders /
//        aigre douce se soulèvent, caméra qui s'élève), étiquettes 1.25 → 1.625 (pop)
//  2.20  les couches redescendent → 2.50 IMPACT (réassemblage), retour à la photo,
//        prix énorme 10,00€ + BOISSON COMPRISE !
//  2.75  la canette Coca-Cola cherry tombe → 3.00 « clac » + pschitt (fizz)
//  3.10  SUPPLÉMENTS en cascade : SAUCE PIQUANTE 0,50€ (3.25) · SAUCE CRÈME 0,50€ (3.50) ·
//        TENDERS 1€ (3.75)
//  4.60  WHIP PAN vers la droite (flou de filé) → fond sombre au raccord avec les Tacos (5.0)
//  Textes et prix : FACTS.md §1 uniquement.
// ============================================================================
import { E, clamp, lerp, seg, pulse, noise1, hash, TAU } from '../core/anim.js';
import { P, brushTitle, priceTag, neonFrame, smoke, streetBackdrop, particles, photo, paintWipe } from '../core/obinks.js';
import { createFood, createFoodLights } from '../world/food.js';
import { kit } from '../world/food-kit.js';

const T_SCAN0 = 0.88, T_SCAN1 = 1.1;
const T_DROP0 = 0.22, T_LAND = 0.5, T_X0 = 1.0, T_X1 = 1.5, T_C0 = 2.2, T_HIT = 2.5;
const T_CAN0 = 2.72, T_CAN = 3.0, T_SUP = [3.25, 3.5, 3.75], T_WHIP = 4.6;
const LABEL_T = [1.25, 1.375, 1.5, 1.625];

export const cues = [
  { t: 0.02, type: 'swish', gain: 0.7, pan: 0.3 },
  { t: 0.24, type: 'whoosh', dur: 0.26, gain: 0.7 },
  { t: T_LAND, type: 'impact', gain: 0.85 },
  { t: T_LAND + 0.01, type: 'crunch', gain: 1 },
  { t: T_LAND + 0.04, type: 'sizzle', dur: 1.9, gain: 0.55 },
  { t: 0.56, type: 'hit', gain: 0.45 },
  { t: T_X0, type: 'whoosh', dur: 0.4, gain: 0.8 },
  { t: T_SCAN0, type: 'scan', gain: 0.7 },
  ...LABEL_T.map((t, i) => ({ t, type: 'pop', gain: 0.65, pan: 0.3 + 0.1 * i })),
  { t: T_C0, type: 'suck', dur: 0.3, gain: 0.7 },
  { t: T_HIT, type: 'impact', gain: 1.05 },
  { t: T_HIT + 0.01, type: 'crunch', gain: 0.9 },
  { t: 2.64, type: 'hit', gain: 0.6 },
  { t: T_CAN0 + 0.02, type: 'whoosh', dur: 0.24, gain: 0.5, pan: -0.5 },
  { t: T_CAN, type: 'drop', gain: 0.75, pan: -0.5 },
  { t: T_CAN + 0.03, type: 'fizz', dur: 0.9, gain: 0.8, pan: -0.5 },
  { t: 3.12, type: 'swish', gain: 0.6 },
  ...T_SUP.map((t, i) => ({ t, type: 'pop', gain: 0.75, pan: 0.5 })),
  { t: T_WHIP, type: 'whoosh', dur: 0.38, gain: 0.9 },
  { t: T_WHIP + 0.05, type: 'whip', gain: 0.8 },
];

// ------------------------------------------------------------------ nappe à carreaux 3D
function clothTextures(THREE) {
  const N = 1024, n = 8, s = N / n;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true });
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    g.fillStyle = (i + j) % 2 ? '#efe6da' : '#c80f18';
    g.fillRect(i * s, j * s, s, s);
  }
  // trame de tissu : fils + irrégularités
  const img = g.getImageData(0, 0, N, N), d = img.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    const weave = ((x >> 1) & 1) ^ ((y >> 1) & 1) ? 0.9 : 1.0;
    const k = weave * (0.95 + 0.09 * hash(x * 0.37 + y * 1.13)) * (0.97 + 0.05 * noise1(y * 0.05 + x * 0.002));
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  // relief de trame (bump)
  const b = document.createElement('canvas'); b.width = b.height = 64;
  const bg = b.getContext('2d');
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const v = ((x >> 2) & 1) ^ ((y >> 2) & 1) ? 150 : 95;
    bg.fillStyle = `rgb(${v},${v},${v})`; bg.fillRect(x, y, 1, 1);
  }
  const bump = new THREE.CanvasTexture(b);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
}

function makeCloth(THREE) {
  const { map, bump } = clothTextures(THREE);
  const SZ = 10;
  map.repeat.set(SZ / 2.4, SZ / 2.4);        // carreau = 0,3
  bump.repeat.set(SZ * 14, SZ * 14);
  const geo = new THREE.PlaneGeometry(SZ, SZ, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x / 1.25, z);
    const free = clamp((r - 0.95) / 0.9);
    const fold = (0.03 * Math.sin(x * 2.1 + z * 0.7) + 0.022 * noise1(x * 1.7 + 11) * noise1(z * 1.9 + 3) + 0.012 * Math.sin(z * 4.3 - x * 1.2)) * free * free;
    pos.setY(i, fold);
    const k = 1 - 0.96 * Math.pow(clamp((r - 0.9) / 2.6), 0.8);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.62 * k * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // Lambert : tissu mat, aucun reflet d'environnement rasant (le fond lointain reste noir)
  const mat = new THREE.MeshLambertMaterial({ map, bumpMap: bump, bumpScale: 0.6, vertexColors: true });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.y = 0.38;
  return m;
}

function makeShadow(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: t, transparent: true, opacity: 0.8, depthWrite: false }));
  m.renderOrder = 1;
  return m;
}

// ------------------------------------------------------------------ petits dessins 2D
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Étiquette d'ingrédient : point jaune sur la couche, trait, pastille sombre à liseré néon. */
function ingredientLabel(g, text, ax, ay, side, k, o) {
  if (k <= 0) return;
  const { size, gap, minX, maxX, u } = o;
  g.save();
  g.font = `600 ${size}px Oswald`;
  g.textBaseline = 'middle';
  const tw = g.measureText(text).width;
  const padX = size * 0.42, h = size * 1.42, w = tw + padX * 2;
  let lx = side > 0 ? ax + gap : ax - gap - w;
  lx = clamp(lx, minX, maxX - w);
  const ly = ay - h / 2;
  const q = E.outBack(clamp(k * 1.25), 2.2);
  const a = clamp(k * 3);
  g.globalAlpha *= a;
  // trait (dessiné progressivement)
  const ex = side > 0 ? lx : lx + w;
  const lk = E.outCubic(clamp(k * 2));
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 2.4 * u;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, ex, lk), ay); g.stroke();
  // point d'accroche
  g.fillStyle = P.yellow;
  g.shadowColor = 'rgba(255,194,26,0.9)'; g.shadowBlur = 10 * u;
  g.beginPath(); g.arc(ax, ay, 6.5 * u, 0, TAU); g.fill();
  g.shadowBlur = 0;
  // pastille
  const cx = lx + w / 2, cy = ly + h / 2;
  g.translate(cx, cy); g.scale(q, q); g.translate(-cx, -cy);
  g.fillStyle = 'rgba(10,10,11,0.88)';
  rr(g, lx, ly, w, h, h * 0.22); g.fill();
  g.strokeStyle = 'rgba(255,42,42,0.35)'; g.lineWidth = 7 * u; g.stroke();
  g.strokeStyle = '#ff5a50'; g.lineWidth = 2.2 * u; g.stroke();
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.fillText(text, lx + padX, cy + size * 0.04);
  g.restore();
}

/** Reflet de sauce : petite étoile lumineuse (calque fx additif). */
function glint(g, x, y, r, k) {
  if (k <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gg = g.createRadialGradient(x, y, 0, x, y, r);
  gg.addColorStop(0, `rgba(255,250,235,${0.9 * k})`); gg.addColorStop(0.25, `rgba(255,200,140,${0.35 * k})`); gg.addColorStop(1, 'rgba(255,150,80,0)');
  g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.strokeStyle = `rgba(255,248,230,${0.85 * k})`; g.lineCap = 'round';
  for (const [dx, dy, l] of [[1, 0, 1.6], [0, 1, 1.25], [0.7, 0.7, 0.55], [0.7, -0.7, 0.55]]) {
    g.lineWidth = Math.max(1, r * 0.07);
    g.beginPath(); g.moveTo(x - dx * r * l, y - dy * r * l); g.lineTo(x + dx * r * l, y + dy * r * l); g.stroke();
  }
  g.restore();
}

/** Pastille prix rouge (comme le menu : « 0,50€ » blanc sur rouge). */
function pricePill(g, text, x, y, size, u, align = 'center') {
  g.save();
  g.font = `400 ${size}px Anton`;
  g.textBaseline = 'middle'; g.textAlign = 'center';
  const tw = g.measureText(text).width;
  const w = tw + size * 0.6, h = size * 1.28;
  if (align === 'right') x -= w / 2;
  g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, x - w / 2 + 3 * u, y - h / 2 + 5 * u, w, h, h * 0.2); g.fill();
  const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  gr.addColorStop(0, '#f2222a'); gr.addColorStop(1, '#a50a10');
  g.fillStyle = gr; rr(g, x - w / 2, y - h / 2, w, h, h * 0.2); g.fill();
  g.strokeStyle = '#ff8a80'; g.lineWidth = 2 * u; g.stroke();
  g.fillStyle = '#ffffff';
  g.fillText(text, x, y + size * 0.03);
  g.restore();
  return w;
}

// ============================================================================
export default function create(ctx) {
  const { THREE, W, H, V, u, L, world, seg: SG } = ctx;
  const S = L.safe;
  const I = world.images || {};
  const T0 = SG.start;
  const group = new THREE.Group();
  group.name = 'crousty';

  const lights = createFoodLights({ key: 1.05, rim: 0.85, fill: 1.15 });
  group.add(lights);
  const cloth = makeCloth(THREE);
  group.add(cloth);
  const shadow = makeShadow(THREE);
  shadow.scale.set(1.75, 1, 1.15);
  shadow.position.y = 0.004;
  group.add(shadow);

  const food = createFood('crousty', { logo: I.logo?.img });
  // matériaux PROPRES à cette instance (clones) : riz et crème un peu moins blancs sous les
  // lumières de la scène (sinon le bloom les « brûle »), sans toucher aux autres produits.
  {
    const K = kit(), memo = new Map();
    food.group.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      let m = memo.get(o.material);
      if (!m) {
        m = o.material.clone();
        if (o.material === K.M.rice) m.color.set('#b7a283');           // riz : beige chaud, pas gris
        else if (o.material === K.M.riceGrain) m.color.set('#dccdb4');
        else if (m.color && m.color.r > 0.75 && m.color.g > 0.72 && m.color.b > 0.65) m.color.multiplyScalar(0.86); // crème
        memo.set(o.material, m);
      }
      o.material = m;
    });
  }
  const holder = new THREE.Group();
  holder.add(food.group);
  group.add(holder);
  const SPREAD = V ? 2.2 : 1.6;
  // couvercle : il bascule à plat derrière la boîte pendant la vue éclatée (le logo ne gêne plus)
  const hinge = food.layers[0].obj.children.find((o) => o.isGroup) || null;
  const LID0 = hinge ? hinge.rotation.x : 0;
  const labels = food.layers.filter((l) => !l.minor);
  const exH = food.explodedHeight(SPREAD);

  // ---------------------------------------------------------------- caméra (fonction pure)
  // pose = orbite autour d'une cible + travelling latéral (ox) ; le produit reste à l'origine.
  const BASE = V
    ? { az: 0, el: 0.6, dist: 4.55, ty: 0.3, ox: 0, oy: -0.02, fov: 30 }
    : { az: 0, el: 0.6, dist: 3.2, ty: 0.32, ox: 0.6, oy: 0.0, fov: 30 };
  const EXP = V
    ? { az: 0.18, el: 0.56, dist: 5.7, ty: exH * 0.64, ox: 0, oy: 0, fov: 30 }
    : { az: 0.22, el: 0.5, dist: 3.75, ty: exH * 0.5, ox: 0.3, oy: 0, fov: 30 };
  const mixPose = (a, b, k) => {
    const o = {};
    for (const key of Object.keys(a)) o[key] = lerp(a[key], b[key], k);
    return o;
  };
  const poseAt = (lt) => {
    // A : poussée lente
    let ps = { ...BASE, dist: BASE.dist * lerp(1.07, 1, E.outCubic(seg(lt, 0, 1.0))), az: lerp(-0.07, 0, E.outCubic(seg(lt, 0, 1.0))) };
    // B / C : vue éclatée (s'élève, recule, orbite douce)
    const kx = E.inOutCubic(seg(lt, T_X0 - 0.08, T_X1 + 0.12)) * (1 - E.inOutCubic(seg(lt, T_C0 - 0.08, T_HIT)));
    if (kx > 0) {
      const ex = { ...EXP, az: EXP.az + 0.14 * seg(lt, T_X0, T_C0) };
      ps = mixPose(ps, ex, kx);
    }
    // D : après l'impact, poussée lente vers le produit
    if (lt >= T_HIT) ps.dist = BASE.dist * lerp(1, 0.955, E.outCubic(seg(lt, T_HIT, T_WHIP)));
    if (lt >= T_HIT) ps.az = lerp(0, 0.05, seg(lt, T_HIT, T_WHIP));
    return ps;
  };
  const camFrom = (ps, pan = 0) => {
    const ce = Math.cos(ps.el);
    const tx = ps.ox, ty = ps.ty + ps.oy, tz = 0;
    const pos = [tx + ps.dist * Math.sin(ps.az) * ce, ty + ps.dist * Math.sin(ps.el), tz + ps.dist * Math.cos(ps.az) * ce];
    let target = [tx, ty, tz];
    if (pan) {
      // whip pan : la visée tourne autour de la caméra (le flou auto la voit)
      const dx = target[0] - pos[0], dz = target[2] - pos[2];
      const c = Math.cos(pan), s = Math.sin(pan); // visée qui part vers la DROITE (le décor file à gauche)
      target = [pos[0] + dx * c - dz * s, target[1], pos[2] + dx * s + dz * c];
    }
    return { pos, target, roll: pan * 0.06, fov: ps.fov };
  };
  const whipAt = (lt) => 1.15 * E.inCubic(seg(lt, T_WHIP, 5.0));

  // ---------------------------------------------------------------- mise en page 2D
  const lay = V ? {
    title: [{ s: 'CROUSTY', x: W / 2 - 40 * u, y: S.t + 150 * u, size: 182 * u, c: P.white }, { s: 'BINKS', x: W / 2 + 120 * u, y: S.t + 300 * u, size: 150 * u, c: P.neon }],
    titleMax: S.w * 0.92,
    photoW: 0.93,
    tag: { x: W * 0.64, y: H * 0.676, size: 152 * u },
    can: { x: W * 0.2, y: H * 0.762, h: H * 0.2 },
    lblSize: 46 * u,
    sup: { x: S.l - 10 * u, y: S.t - 20 * u, w: S.w + 20 * u, h: 440 * u },
  } : {
    title: [{ s: 'CROUSTY BINKS', x: W * 0.36, y: H * 0.17, size: 132 * u }],
    titleMax: W * 0.6,
    photoW: 1.0,
    tag: { x: W * 0.775, y: H * 0.315, size: 196 * u },
    can: { x: W * 0.105, y: H * 0.875, h: H * 0.43 },
    lblSize: 42 * u,
    sup: { x: W * 0.605, y: H * 0.55, w: W * 0.345, h: H * 0.39 },
  };
  const SUPS = [
    { id: 'supp_piquante', name: 'SAUCE PIQUANTE', price: '0,50€' },
    { id: 'supp_creme', name: 'SAUCE CRÈME', price: '0,50€' },
    { id: 'supp_tenders', name: 'TENDERS', price: '1€' },
  ];
  const lamps = V ? [0.1, 0.9] : [0.12, 0.5, 0.88];
  // reflets : instants (temps locaux) et positions relatives dans la photo (zone des tenders en sauce)
  const GLINTS = [0.56, 0.74, 2.56, 2.8, 3.02, 3.3, 3.55, 3.82, 4.05, 4.3].map((gt, i) => ({
    t: gt, x: 0.28 + 0.5 * hash(i * 3.3 + 1), y: 0.5 + 0.22 * hash(i * 7.1 + 2), r: 0.022 + 0.018 * hash(i * 1.9 + 5),
  }));

  const DBG = typeof location !== 'undefined' && /align/.test(new URLSearchParams(location.search).get('hide') || '');
  const v = new THREE.Vector3();
  // points du produit (repère monde, assemblé) pour caler la photo sur la 3D
  const REF = { l: [-0.62, 0.02, 0.4], r: [0.62, 0.02, 0.4], c: [0, 0.35, 0] };

  return {
    group,
    camera(lt) {
      return camFrom(poseAt(lt), whipAt(lt));
    },
    update(f) {
      const t = f.lt, ui = f.ui, fx = f.fx, post = f.post;
      const whip = whipAt(t);
      const focal = (H / 2) / Math.tan((BASE.fov * Math.PI) / 360);
      const shiftX = -Math.tan(Math.min(1.3, whip)) * focal; // décalage écran des éléments 2D pendant le whip

      // fin du whip : on quitte la nappe, tout plonge dans le noir (raccord Tacos : fond sombre + traînée rouge)
      const outDark = E.inQuad(seg(t, T_WHIP + 0.1, 5.0));
      cloth.material.color.setScalar(1 - 0.88 * outDark);
      // ---------------- fond : rue de nuit, tamisée (la nappe est au premier plan)
      streetBackdrop(f.bg, W, H, f.t, { k: 0.75 * (1 - 0.7 * outDark), lamps, light: 0.8, parallax: t * 40 * u - shiftX * 0.25, seed: 3, flicker: 0.25 });
      smoke(f.bg, W, H, f.t, { k: 0.8, area: [0, H * 0.35, W, H * 0.4], size: Math.min(W, H) * 0.7, count: 8, alpha: 0.12, color: '#b5544c', seed: 21, rise: 0.4 });

      // ---------------- 3D : produit (seulement en vue éclatée), squash à l'impact
      const in3D = (t >= T_SCAN0 && t < T_HIT) || DBG;
      holder.visible = in3D;
      const open = E.inOutCubic(seg(t, T_X0, T_X1));
      const close = E.inCubic(seg(t, T_C0, T_HIT));
      const pX = open * (1 - close);
      food.setExplode(pX, f.t, { spread: SPREAD, anchor: 'bottom', stagger: 0.32, wobble: 1, spin: 0.7 });
      const hitK = t >= T_HIT ? Math.exp(-(t - T_HIT) / 0.11) : 0;
      const landK = t >= T_LAND ? Math.exp(-(t - T_LAND) / 0.1) : 0;
      // lumière balayante sur la vue éclatée (reflets qui glissent sur l'aigre-douce)
      const sw = world.studio.sweep;
      const swk = seg(t, T_X0, T_C0);
      sw.position.set(lerp(-1.6, 1.8, swk), 1.6, 1.2);
      sw.intensity = 3 * Math.sin(Math.PI * swk);
      const lidK = E.inOutCubic(seg(t, T_SCAN0 + 0.04, T_X0 + 0.28)) * (1 - E.inOutCubic(seg(t, T_C0, T_HIT - 0.02)));
      if (hinge) hinge.rotation.x = LID0 - (Math.PI - 0.1 + LID0) * lidK;
      sw.color.set('#fff0dc');

      // ---------------- photo « beauté » calée sur la 3D (projection des points de référence)
      const pl = f.project(REF.l), pr = f.project(REF.r), pc = f.project(REF.c);
      const boxW = Math.hypot(pr[0] - pl[0], pr[1] - pl[1]);
      const im = I.crousty;
      const pw = boxW * 1.08 * lay.photoW;
      const ph = im ? (pw * im.h) / im.w : pw * 0.8;
      const pcx = (pl[0] + pr[0]) / 2, pcy = pc[1] + ph * 0.04;
      // photo → 3D : un trait de scan néon balaie la boîte de gauche à droite (la photo est coupée
      // derrière lui, la 3D apparaît) ; 3D → photo : coupe franche sur l'impact du réassemblage
      let photoA = t < T_SCAN1 || t >= T_HIT ? 1 : 0;
      if (DBG) photoA = 0.5;
      const photoOn = photoA > 0 && t >= T_DROP0;
      const scanK = t < T_HIT ? E.inOutCubic(seg(t, T_SCAN0, T_SCAN1)) : 0;
      const scanX = lerp(pcx - pw * 0.56, pcx + pw * 0.56, scanK);

      // ombre de contact (s'assombrit quand la boîte approche du sol)
      const fall = E.inQuad(seg(t, T_DROP0, T_LAND));
      shadow.material.opacity = 0.8 * (t < T_LAND ? fall : 1);

      if (photoOn && im) {
        const sq = landK * 0.09 + hitK * 0.07;
        const draw = (dy, sc, a) => {
          ui.save();
          ui.globalAlpha = a;
          ui.translate(pcx, pcy + ph * 0.42 - dy);
          ui.scale(sc * (1 + sq * 0.6), sc * (1 - sq));
          photo(ui, im, 0, -ph * 0.42, { w: pw, glow: 0.18, glowColor: '#ff3a2a' });
          ui.restore();
        };
        const dyAt = (tt) => (1 - E.inQuad(seg(tt, T_DROP0, T_LAND))) * H * 0.85;
        const scAt = (tt) => 1 + 0.55 * (1 - E.inQuad(seg(tt, T_DROP0, T_LAND)));
        if (t < T_LAND) {
          // traînée de chute (flou de mouvement maison)
          draw(dyAt(t - 0.03), scAt(t - 0.03), 0.18 * photoA);
          draw(dyAt(t - 0.015), scAt(t - 0.015), 0.3 * photoA);
        }
        if (scanK > 0) {
          ui.save();
          ui.beginPath(); ui.rect(scanX, 0, W - scanX, H); ui.clip();
          draw(dyAt(t), scAt(t), photoA);
          ui.restore();
        } else draw(dyAt(t), scAt(t), photoA);
      }
      // trait de scan (lumière additive + liseré net)
      if (scanK > 0 && scanK < 1) {
        const y0 = pcy - ph * 0.62, y1 = pcy + ph * 0.6;
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        const sg = fx.createLinearGradient(scanX - 70 * u, 0, scanX + 30 * u, 0);
        sg.addColorStop(0, 'rgba(255,42,42,0)'); sg.addColorStop(0.75, 'rgba(255,60,50,0.55)'); sg.addColorStop(1, 'rgba(255,42,42,0)');
        fx.fillStyle = sg; fx.fillRect(scanX - 70 * u, y0, 100 * u, y1 - y0);
        fx.restore();
        ui.save();
        ui.fillStyle = '#ffe3dc';
        ui.shadowColor = P.neon; ui.shadowBlur = 18 * u;
        ui.fillRect(scanX - 2 * u, y0, 4 * u, y1 - y0);
        ui.restore();
      }

      // ---------------- vapeur chaude au-dessus du plat
      const steamK = seg(t, T_LAND - 0.05, T_LAND + 0.4) * (1 - seg(t, T_WHIP, T_WHIP + 0.3)) * (1 - 0.8 * open * (1 - close));
      if (steamK > 0) {
        smoke(ui, W, H, f.t, {
          k: steamK, area: [pcx - pw * 0.34 + shiftX * 0, pcy - ph * 0.75, pw * 0.62, ph * 0.72], size: pw * 0.36, count: 9,
          alpha: 0.34, seed: 5, rise: 1.5, color: '#efe6e0',
        });
      }

      // ---------------- reflets brillants sur la sauce (photo) + braises ambiantes
      if (photoOn && t >= T_LAND) {
        GLINTS.forEach((G) => {
          const k = Math.sin(Math.PI * seg(t, G.t, G.t + 0.28));
          if (k > 0) glint(fx, pcx + (G.x - 0.5) * pw, pcy + (G.y - 0.5) * ph, G.r * pw, k * (1 - outDark));
        });
      }
      particles(fx, W, H, f.t, { kind: 'embers', k: 0.55 * (1 - outDark), area: [0, H * 0.3, W, H * 0.7], count: V ? 22 : 30, seed: 13 });

      // ---------------- miettes : posé + réassemblage
      particles(ui, W, H, f.t, { kind: 'crumbs', burst: { x: pcx, y: pcy + ph * 0.18, t0: T0 + T_LAND, power: 1.0 }, seed: 6, size: 1.2 });
      particles(ui, W, H, f.t, { kind: 'crumbs', burst: { x: pcx, y: pcy + ph * 0.1, t0: T0 + T_HIT, power: 1.2 }, seed: 9, size: 1.3 });
      particles(fx, W, H, f.t, { kind: 'sparks', burst: { x: pcx, y: pcy + ph * 0.25, t0: T0 + T_HIT, power: 0.9 }, seed: 4 });

      // ---------------- étiquettes de la vue éclatée
      const lblK = pX > 0.5 ? 1 : 0;
      if (lblK) {
        const outK = 1 - seg(t, T_C0 - 0.08, T_C0 + 0.08);
        labels.forEach((l, i) => {
          const k = seg(t, LABEL_T[i], LABEL_T[i] + 0.22) * outK;
          if (k <= 0) return;
          const side = V ? (i % 2 ? 1 : -1) : 1;
          (side > 0 ? food.anchors : food.anchorsL)[l.name].getWorldPosition(v);
          const [ax, ay] = f.project([v.x, v.y, v.z]);
          ingredientLabel(ui, l.label, ax, ay, side, k, { size: lay.lblSize, gap: 40 * u, minX: S.l, maxX: S.r, u });
        });
      }

      // ---------------- titre CROUSTY BINKS (au pinceau) — en 9:16, laisse la place aux suppléments
      const titleOut = V ? E.inCubic(seg(t, 3.04, 3.2)) : 0;
      const titleP = seg(t, T_LAND, T_LAND + 0.38);
      if (titleP > 0 && titleOut < 1) {
        ui.save();
        ui.translate(shiftX, -titleOut * 240 * u);
        ui.globalAlpha = 1 - titleOut;
        lay.title.forEach((ln, i) => {
          brushTitle(ui, ln.s, ln.x, ln.y, {
            size: ln.size, p: clamp(titleP * 1.15 - i * 0.15), maxWidth: lay.titleMax, rotate: -0.05,
            colorAt: ln.c ? undefined : (k) => (k < 7 ? P.white : P.neon), color: ln.c, glow: 0.6,
          });
        });
        ui.restore();
      }

      // ---------------- prix énorme + BOISSON COMPRISE !
      const tagP = seg(t, T_HIT - 0.03, T_HIT + 0.36);
      if (tagP > 0) {
        ui.save();
        ui.translate(shiftX, 0);
        const breathe = 1 + 0.015 * Math.sin((t - T_HIT) * TAU * 1);
        ui.translate(lay.tag.x, lay.tag.y); ui.scale(breathe, breathe); ui.translate(-lay.tag.x, -lay.tag.y);
        priceTag(ui, lay.tag.x, lay.tag.y, {
          price: '10,00€', label: V ? 'CROUSTY BINKS' : '', sub: 'BOISSON COMPRISE !', size: lay.tag.size, p: tagP, t: f.t, rotate: -0.045,
        });
        ui.restore();
      }

      // ---------------- canette Coca-Cola cherry qui tombe (clac + pschitt)
      if (I.coca_cherry && t >= T_CAN0) {
        const C0 = lay.can, cim = I.coca_cherry;
        const q = E.inQuad(seg(t, T_CAN0, T_CAN));
        const ck = t >= T_CAN ? Math.exp(-(t - T_CAN) / 0.09) : 0;
        const bounce = t >= T_CAN ? Math.abs(Math.sin((t - T_CAN) * 18)) * Math.exp(-(t - T_CAN) / 0.08) * 26 * u : 0;
        const y = lerp(-C0.h * 0.2, C0.y, q) - bounce;
        const rot = lerp(-0.35, -0.04, q) + 0.04 * Math.sin((t - T_CAN) * 20) * ck;
        ui.save();
        ui.translate(shiftX, 0);
        // ombre au sol
        const sh = ui.createRadialGradient(C0.x, C0.y, 0, C0.x, C0.y, C0.h * 0.32);
        sh.addColorStop(0, `rgba(0,0,0,${0.7 * q})`); sh.addColorStop(1, 'rgba(0,0,0,0)');
        ui.save(); ui.translate(C0.x, C0.y); ui.scale(1, 0.18); ui.translate(-C0.x, -C0.y);
        ui.fillStyle = sh; ui.fillRect(C0.x - C0.h * 0.4, C0.y - C0.h * 0.4, C0.h * 0.8, C0.h * 0.8); ui.restore();
        ui.translate(C0.x, y);
        ui.rotate(rot);
        ui.scale(1 + ck * 0.06, 1 - ck * 0.08);
        photo(ui, cim, 0, -C0.h / 2, { h: C0.h, glow: 0.25, glowColor: '#ff3a2a' });
        ui.restore();
        // pschitt : gouttes et bulles
        if (t >= T_CAN) {
          ui.save();
          ui.translate(shiftX, 0);
          ui.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 26; i++) {
            const a = -Math.PI / 2 + (hash(i * 3.1) - 0.5) * 2.2, sp = (260 + 520 * hash(i * 7.7)) * u;
            const age = (t - T_CAN) - hash(i * 1.3) * 0.12;
            if (age < 0 || age > 0.7) continue;
            const x = C0.x + Math.cos(a) * sp * age, yy = C0.y - C0.h * 0.95 + Math.sin(a) * sp * age + 900 * u * age * age;
            ui.fillStyle = `rgba(255,240,235,${0.75 * (1 - age / 0.7)})`;
            ui.beginPath(); ui.arc(x, yy, (2 + 4 * hash(i * 9.1)) * u, 0, TAU); ui.fill();
          }
          ui.restore();
        }
      }

      // ---------------- suppléments en cascade
      const supIn = seg(t, 3.1, 3.28);
      if (supIn > 0) {
        const B = lay.sup;
        ui.save();
        ui.translate(shiftX, 0);
        const slide = (1 - E.outCubic(supIn)) * (V ? -60 * u : 80 * u);
        ui.translate(V ? 0 : slide, V ? slide : 0);
        ui.globalAlpha = clamp(supIn * 2);
        ui.fillStyle = 'rgba(8,6,7,0.86)';
        rr(ui, B.x, B.y, B.w, B.h, 22 * u); ui.fill();
        neonFrame(ui, B.x, B.y, B.w, B.h, { p: E.outCubic(supIn), t: f.t, flicker: 0.4, seed: 4, radius: 22 * u, screws: supIn >= 1 });
        // en-tête
        brushTitle(ui, 'SUPPLÉMENTS', V ? W / 2 : B.x + B.w / 2, B.y + (V ? 82 : 74) * u, { size: (V ? 66 : 50) * u, color: P.yellow, glow: 0.3, stroke: 4 * u, shadow: 0.6, p: supIn, rotate: -0.02 });
        SUPS.forEach((sp, i) => {
          const k = seg(t, T_SUP[i] - 0.06, T_SUP[i] + 0.22);
          if (k <= 0) return;
          const pop = E.outBack(k, 2.4);
          const icon = I[sp.id];
          if (V) {
            const cw = B.w / 3, cx = B.x + cw * (i + 0.5);
            const dy = (1 - E.outCubic(k)) * -80 * u;
            ui.save();
            ui.globalAlpha *= clamp(k * 3);
            ui.translate(cx, B.y + 240 * u + dy); ui.scale(pop, pop); ui.translate(-cx, -(B.y + 240 * u));
            if (icon) photo(ui, icon, cx, B.y + 182 * u, { h: 118 * u });
            ui.font = `600 ${Math.min(42 * u, (cw - 26 * u) / 6.6)}px Oswald`; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.fillStyle = '#fff';
            ui.fillText(sp.name, cx, B.y + 290 * u);
            pricePill(ui, sp.price, cx, B.y + 370 * u, 58 * u, u);
            ui.restore();
          } else {
            const rh = (B.h - 120 * u) / 3, ry = B.y + 120 * u + rh * (i + 0.5);
            const dx = (1 - E.outCubic(k)) * 120 * u;
            ui.save();
            ui.globalAlpha *= clamp(k * 3);
            ui.translate(dx, 0);
            const ix = B.x + 70 * u;
            ui.translate(ix, ry); ui.scale(pop, pop); ui.translate(-ix, -ry);
            if (icon) photo(ui, icon, ix, ry, { h: 74 * u });
            ui.font = `600 ${38 * u}px Oswald`; ui.textAlign = 'left'; ui.textBaseline = 'middle'; ui.fillStyle = '#fff';
            ui.fillText(sp.name, B.x + 130 * u, ry + 2 * u);
            pricePill(ui, sp.price, B.x + B.w - 34 * u, ry, 44 * u, u, 'right');
            if (i < 2) { ui.strokeStyle = 'rgba(255,255,255,0.22)'; ui.setLineDash([8 * u, 7 * u]); ui.lineWidth = 2 * u; ui.beginPath(); ui.moveTo(B.x + 30 * u, ry + rh / 2); ui.lineTo(B.x + B.w - 30 * u, ry + rh / 2); ui.stroke(); ui.setLineDash([]); }
            ui.restore();
          }
        });
        ui.restore();
      }

      // ---------------- ouverture : les coups de pinceau rouges se retirent (raccord intro)
      const rev = seg(t, 0, 0.36);
      if (rev < 1) paintWipe(ui, W, H, 1 - E.inOutCubic(rev), { seed: 8, dir: -1, angle: 0.07 });

      // ---------------- whip pan : traînée lumineuse rouge
      if (whip > 0.02) {
        const k = seg(t, T_WHIP + 0.1, 5.0);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        const gy = H * (V ? 0.5 : 0.55);
        const gr = fx.createLinearGradient(0, gy - 90 * u, 0, gy + 90 * u);
        gr.addColorStop(0, 'rgba(255,42,42,0)'); gr.addColorStop(0.5, `rgba(255,60,50,${0.55 * k})`); gr.addColorStop(1, 'rgba(255,42,42,0)');
        fx.fillStyle = gr; fx.fillRect(0, gy - 90 * u, W, 180 * u);
        fx.restore();
      }

      // ---------------- post
      post.flash = Math.max(post.flash, pulse(t, T_HIT, 0.015, 0.12) * 0.42, pulse(t, T_LAND, 0.01, 0.08) * 0.2);
      post.flashColor = [1, 0.82, 0.7];
      if (t >= T_LAND && t < T_LAND + 0.5) post.shock = [pcx / W, 1 - (pcy + ph * 0.2) / H, E.outCubic(seg(t, T_LAND, T_LAND + 0.45)) * 0.9, 0.7 * (1 - seg(t, T_LAND, T_LAND + 0.45))];
      if (t >= T_HIT && t < T_HIT + 0.5) post.shock = [pcx / W, 1 - (pcy + ph * 0.1) / H, E.outCubic(seg(t, T_HIT, T_HIT + 0.45)) * 1.0, 0.9 * (1 - seg(t, T_HIT, T_HIT + 0.45))];
      if (t > T_DROP0 && t < T_LAND) { post.zoomBlur = -0.12 * E.inQuad(seg(t, T_DROP0, T_LAND)); post.zoomCenter = [pcx / W, 1 - pcy / H]; }
      post.bloom = 0.48;
      post.vignette = 1.15;
      post.dof = in3D ? { focus: lerp(BASE.dist, EXP.dist, open * (1 - close)), aperture: 0.0007, maxblur: 0.003 } : null;
      // mouvements de caméra de la vue éclatée : flou de mouvement adouci, typo nette
      if (t > T_X0 - 0.1 && t < T_HIT) { post.blur = [post.blur[0] * 0.22, post.blur[1] * 0.22]; post.zoomBlur *= 0.3; post.uiBlur = 0.1; post.bloom = 0.32; post.exposure = 0.9; }
      // contre-jour rouge du studio adouci (les aliments gardent leurs couleurs)
      world.studio.rimG.intensity = 7;
      world.studio.rimT.intensity = 3;
    },
  };
}
