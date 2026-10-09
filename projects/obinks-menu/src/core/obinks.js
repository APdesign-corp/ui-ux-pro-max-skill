// ============================================================================
//  O'BINKS — kit graphique de la marque (Canvas 2D, déterministe, rapide)
// ============================================================================
//  Toutes les fonctions sont PURES vis-à-vis du temps : même (t, p, seed) → même image, quel que
//  soit l'ordre de rendu des images (workers parallèles). Les textures lourdes (pinceau, fumée,
//  briques) sont calculées UNE fois puis mises en cache (canvas hors écran, graine fixe).
//  Aucune fonction ne laisse d'état sur le contexte (save/restore systématique).
//
//  Où dessiner :
//    f.bg  calque de FOND (plan au fond de la caméra, passe par le tone mapping) : rue, briques,
//          lampadaires, grandes éclaboussures de décor, fumée lointaine.
//    f.fx  calque LUMIÈRE additif avant bloom (noir = invisible, tout ce qui est dessiné brille) :
//          particules 'sparks' / 'embers', néons en plus, halos.
//    f.ui  calque NET au-dessus de tout : titres, étiquettes prix, photos du menu, traits de pinceau,
//          éclaboussures de transition, miettes, fumée de premier plan.
//
//  Palette (DIRECTION.md) : P.neon #ff2a2a · P.red #e3141b · P.deep #5a0508 · P.white · P.yellow
//  #ffc21a (prix) · P.bg #0a0a0b. Polices chargées : Permanent Marker, Bangers (brush/graffiti),
//  Anton, Bebas Neue (prix, titres condensés), Oswald (listes), Kaushan Script (accroches).
//
//  API (u = min(W,H)/1080 ; tailles en px ; p = progression 0→1 ; seed = variante déterministe)
//  ---------------------------------------------------------------------------------------------
//  brushStroke(g, x, y, w, h, {color, seed, p, angle, anchor, dir, alpha})
//      Trait de pinceau sec (poils, bords déchiquetés, fin effilochée). (x, y) = CENTRE du trait
//      (anchor:'start' → milieu du bord de départ). w = longueur, h = épaisseur, angle en radians.
//      p 0→1 = le pinceau balaie de gauche à droite (dir:-1 → de droite à gauche), front irrégulier.
//  splatter(g, x, y, r, {seed, p, color, drips, alpha, spikes})
//      Éclaboussure de peinture : p 0→0.3 l'impact jaillit (tache + gouttes projetées + pointes),
//      puis les coulures descendent (drips = longueur relative, 0 = aucune, défaut 1).
//  brushTitle(g, text, x, y, {size, font, color, colorAt, stroke, strokeColor, glow, glowColor,
//      p, align, skew, shadow, maxWidth, tracking, rotate})
//      Titre brush/graffiti : contour noir épais, ombre portée rouge sombre, halo néon, italique
//      (skew). p 0→1 = les lettres claquent une à une. Retourne {width, size}.
//  priceTag(g, x, y, {price, label, sub, size, p, color, fill, align, rotate, t})
//      Étiquette prix : plaque rouge peinte, contour néon, petit libellé (SEUL / MENU / LES 3…),
//      prix ÉNORME (color 'yellow' = tout jaune, 'white' = chiffres blancs + € jaune), sous-ligne
//      optionnelle (« BOISSON COMPRISE ! »). (x, y) = centre (align 'left'/'right' : bord).
//      p 0→1 = plaque qui jaillit, néon qui s'allume, prix qui claque. Retourne {x, y, w, h}.
//  neonFrame(g, x, y, w, h, {p, color, flicker, radius, width, t, seed, screws, glow})
//      Cadre néon (tube) arrondi : p = tracé qui court sur le périmètre, flicker 0→1 = grésillement
//      (piloté par t). (x, y) = coin haut-gauche.
//  smoke(g, W, H, t, {k, seed, color, rise, count, area:[x,y,w,h], size, alpha, blend})
//      Fumée / vapeur : bouffées pré-calculées qui montent, grossissent, tournent et s'estompent.
//      area = zone d'émission (part du bas, monte jusqu'en haut) ; défaut : moitié basse de l'image.
//  streetBackdrop(g, W, H, t, {k, lamps, bricks, wet, parallax, horizon, seed, light})
//      Rue de nuit (sur f.bg) : mur de briques sombre éclairé par des lampadaires rouges (halo,
//      cône de lumière, grésillement), sol mouillé avec reflets qui ondulent. lamps = tableau de
//      positions x (fractions de W) ou nombre ; parallax = décalage horizontal en px.
//  streetLamp(g, x, groundY, height, {t, on, flicker, seed, glow})
//      Lampadaire seul (on 0→1 = il s'allume : idéal pour une transition).
//  checkered(g, x, y, w, h, {p, skew, cols, seed, shade, rotate})
//      Nappe à carreaux rouge/blanc en perspective (Crousty Binks). p = les carreaux apparaissent
//      en vague depuis le coin haut-gauche. skew = fuyante (0 = à plat).
//  particles(g, W, H, t, {kind:'crumbs'|'sparks'|'embers', k, seed, count, area, burst, size})
//      Miettes (sur f.ui), étincelles et braises (sur f.fx). Sans burst : flux ambiant en boucle.
//      burst = {x, y, t0, power} : explosion à t0 depuis (x, y) avec gravité (crunch, impact).
//  photo(g, im, cx, cy, {h, w, scale, rot, alpha, p, shadow, glow, glowColor, anchor})
//      Dessine une photo découpée du menu (world.images[id]) : pop-in (p), rim-light néon (glow),
//      ombre de contact (shadow). anchor 'center' | 'bottom'. Retourne {x, y, w, h}.
// ============================================================================

import { E, clamp, lerp, seg, rng, rgba, noise1, hash, TAU } from './anim.js';

export const P = {
  bg: '#0a0a0b', ink: '#0a0a0b', neon: '#ff2a2a', neon2: '#ff4d3d', red: '#e3141b', deep: '#5a0508',
  white: '#ffffff', cream: '#f2ece6', yellow: '#ffc21a', gold: '#ffb300',
};

// ----------------------------------------------------------------------------- utilitaires
const SPR = new Map();
const cached = (key, make) => {
  let v = SPR.get(key);
  if (!v) { v = make(); SPR.set(key, v); }
  return v;
};
const mkCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
};
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });
const unitOf = (g) => Math.min(g.canvas.width, g.canvas.height) / 1080;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// bruit de valeur 2D lissé [-1, 1] + fbm (uniquement pour fabriquer les textures en cache)
function vnoise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash(a * 157.31 + b * 113.97 + s * 71.13);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v) * 2 - 1;
}
function fbm2(x, y, s = 0, oct = 4) {
  let a = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { a += amp * vnoise2(x * f, y * f, s + i * 17); f *= 2.03; amp *= 0.5; }
  return a;
}

// version teintée (couleur pleine, alpha du masque blanc) d'un sprite en cache
function tinted(src, color, key) {
  return cached(`${key}|${color}`, () => {
    const c = mkCanvas(src.width, src.height);
    const g = ctx2d(c);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  });
}

function setFontPx(g, family, size, weight = 400) {
  g.font = `${weight} ${size}px "${family}"`;
  g.letterSpacing = '0px';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
}

function roundRectPath(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

// ============================================================================
//  TRAIT DE PINCEAU
// ============================================================================
const BW = 1024, BH = 192;
function brushSprite(seed) {
  return cached(`brush${seed}`, () => {
    const c = mkCanvas(BW, BH);
    const g = ctx2d(c);
    const img = g.createImageData(BW, BH);
    const d = img.data;
    const s = seed * 3.17 + 0.5;
    // paramètres par rangée de poils
    const rowA = new Float32Array(BH), rowEnd = new Float32Array(BH), rowStart = new Float32Array(BH);
    for (let y = 0; y < BH; y++) {
      rowA[y] = 0.74 + 0.26 * (0.5 + 0.5 * noise1(y * 0.23 + s * 5)) * (0.7 + 0.3 * hash(y + s));
      rowEnd[y] = 0.8 + 0.17 * (0.5 + 0.5 * noise1(y * 0.075 + s * 2)) + 0.05 * (hash(y * 3.1 + s) - 0.5);
      rowStart[y] = 0.012 + 0.04 * (0.5 + 0.5 * noise1(y * 0.11 + s * 7)) + 0.012 * hash(y * 1.7 + s);
    }
    for (let x = 0; x < BW; x++) {
      const u = x / BW;
      const taperIn = sstep(0, 0.05, u);
      const taperOut = 1 - 0.42 * sstep(0.55, 1, u);
      const thick = (0.68 + 0.12 * noise1(u * 5 + s) + 0.05 * noise1(u * 21 + s * 2)) * (0.55 + 0.45 * taperIn) * taperOut;
      const cen = 0.5 + 0.06 * noise1(u * 2.5 + s * 4);
      const top = (cen - thick / 2) * BH, bot = (cen + thick / 2) * BH;
      for (let y = 0; y < BH; y++) {
        const jt = noise1(x * 0.35 + y * 0.01 + s) * 2.2 + noise1(x * 1.3 + s * 3) * 1.2;
        const edge = Math.min(y - (top + jt), (bot - jt) - y);
        let a = clamp(edge / 2.2 + 0.5);
        if (a <= 0) continue;
        if (u > rowEnd[y] + 0.02 * noise1(x * 0.05 + y)) a *= clamp(1 - (u - rowEnd[y]) * 60);
        if (u < rowStart[y]) a *= clamp((u - rowStart[y]) * 80 + 1);
        // brosse sèche : trous dans les derniers 40 %
        const dry = sstep(0.5, 1, u) * 0.9 + 0.1 * sstep(0.85, 1, (y - top) / (bot - top + 1e-6));
        const hole = fbm2(x * 0.018, y * 0.42, s, 3);
        a *= rowA[y] * clamp(1 - dry * clamp((0.1 - hole) * 4 + 0.5));
        // fibres (variation fine le long des poils)
        a *= 0.86 + 0.14 * noise1(x * 0.05 + y * 9.7 + s);
        const i = (y * BW + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = clamp(a) * 255;
      }
    }
    g.putImageData(img, 0, 0);
    // projections fines aux extrémités
    const r = rng(seed * 911 + 7);
    g.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) {
      const end = r() < 0.7;
      const x = end ? BW * (0.86 + 0.13 * r()) : BW * 0.03 * r();
      const y = BH * (0.18 + 0.64 * r());
      g.globalAlpha = 0.5 + 0.5 * r();
      g.beginPath(); g.arc(x, y, 0.6 + 2.2 * r() * r(), 0, TAU); g.fill();
    }
    return c;
  });
}

export function brushStroke(g, x, y, w, h, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0 || w <= 1 || h <= 0.5) return;
  const seed = o.seed ?? 1;
  const spr = tinted(brushSprite(seed), o.color || P.red, `brush${seed}`);
  g.save();
  g.translate(x, y);
  g.rotate(o.angle || 0);
  if ((o.dir ?? 1) < 0) g.scale(-1, 1);
  g.globalAlpha *= o.alpha ?? 1;
  const x0 = o.anchor === 'start' ? 0 : -w / 2;
  // le front du pinceau est irrégulier : chaque bande de poils avance un peu différemment
  const N = 12, J = Math.min(w * 0.35, h * 1.1);
  for (let i = 0; i < N; i++) {
    const hj = hash(i * 7.31 + seed * 3.7);
    const q = clamp((p * (w + J) - J * hj) / w);
    if (q <= 0) continue;
    const sy = (i * BH) / N, sh = BH / N;
    g.drawImage(spr, 0, sy, BW * q, sh, x0, -h / 2 + (i * h) / N, w * q, h / N + 0.6);
  }
  g.restore();
}

// ============================================================================
//  ÉCLABOUSSURE DE PEINTURE
// ============================================================================
function splatGeom(seed) {
  return cached(`splat${seed}`, () => {
    const r = rng(seed * 4099 + 11);
    const n = 64;
    const spikes = [];
    const ns = 7 + Math.floor(r() * 6);
    for (let i = 0; i < ns; i++) spikes.push({ a: r() * TAU, len: 0.35 + 0.75 * r(), w: 0.05 + 0.05 * r() });
    const rad = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      let v = 0.56 + 0.07 * noise1(i * 0.45 + seed) + 0.05 * noise1(i * 1.7 + seed * 3);
      for (const sp of spikes) {
        let da = Math.abs(((a - sp.a + Math.PI) % TAU + TAU) % TAU - Math.PI);
        v += sp.len * 0.32 * Math.exp(-(da * da) / (sp.w * sp.w * 0.5));
      }
      rad.push(v);
    }
    const blobs = [];
    const nb = 12 + Math.floor(r() * 8);
    for (let i = 0; i < nb; i++) {
      const sp = spikes[Math.floor(r() * spikes.length)];
      const along = r() < 0.6;
      const a = along ? sp.a + (r() - 0.5) * 0.18 : r() * TAU;
      blobs.push({ a, d: (along ? 0.75 + sp.len * 0.7 : 0.7) + 0.55 * r(), rr: 0.025 + 0.085 * r() * r(), e: 0.75 + 0.5 * r(), delay: 0.05 * r() });
    }
    const drops = [];
    for (let i = 0; i < 34; i++) drops.push({ a: r() * TAU, d: 0.9 + 1.0 * r(), rr: 0.008 + 0.022 * r(), delay: 0.08 * r() });
    const drips = [];
    const nd = 3 + Math.floor(r() * 4);
    for (let i = 0; i < nd; i++) {
      const xr = (i + 0.5) / nd * 1.1 - 0.55 + (r() - 0.5) * 0.12;
      drips.push({ x: xr, w: 0.035 + 0.04 * r(), len: 0.35 + 0.9 * r() * r(), delay: 0.12 * r() });
    }
    return { rad, n, blobs, drops, drips, rot: r() * TAU };
  });
}

export function splatter(g, x, y, r, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0 || r <= 0) return;
  const seed = o.seed ?? 1;
  const G = splatGeom(seed);
  const col = o.color || P.red;
  const burst = E.outExpo(seg(p, 0, 0.3));
  const grow = E.outBack(seg(p, 0, 0.22), 2.2);
  const dripsK = o.drips ?? 1;
  g.save();
  g.translate(x, y);
  g.globalAlpha *= o.alpha ?? 1;
  const grad = g.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.05, 0, 0, r * 1.2);
  grad.addColorStop(0, col);
  grad.addColorStop(0.55, col);
  grad.addColorStop(1, rgba(P.deep, 1));
  g.fillStyle = grad;
  // coulures (dessinées avant la tache pour partir de son bord)
  if (dripsK > 0) {
    for (const dp of G.drips) {
      const q = E.outCubic(seg(p, 0.22 + dp.delay, 1));
      if (q <= 0) continue;
      const dx = dp.x * r, w = dp.w * r, top = r * 0.2;
      const len = (r * 0.45 + dp.len * r) * q * dripsK;
      g.beginPath();
      g.moveTo(dx - w, top);
      g.quadraticCurveTo(dx - w * 0.75, top + len * 0.6, dx - w * 0.62, top + len);
      g.arc(dx, top + len, w * 0.62 * (0.9 + 0.3 * q), Math.PI, 0, true);
      g.quadraticCurveTo(dx + w * 0.75, top + len * 0.6, dx + w, top);
      g.closePath();
      g.fill();
      // goutte qui grossit au bout
      g.beginPath(); g.arc(dx, top + len + w * 0.15, w * (0.75 + 0.25 * q), 0, TAU); g.fill();
    }
  }
  // tache principale (contour polaire lissé)
  const sc = r * (0.18 + 0.82 * grow);
  g.save();
  g.rotate(G.rot);
  g.beginPath();
  const pts = G.rad.map((v, i) => {
    const a = (i / G.n) * TAU;
    const vv = 0.56 + (v - 0.56) * (o.spikes ?? 1) * burst;
    return [Math.cos(a) * vv * sc, Math.sin(a) * vv * sc];
  });
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (i === 0) g.moveTo(mx, my); else g.quadraticCurveTo(a[0], a[1], mx, my);
  }
  const a0 = pts[0], b0 = pts[1];
  g.quadraticCurveTo(a0[0], a0[1], (a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2);
  g.fill();
  // gouttes projetées
  for (const b of G.blobs) {
    const q = E.outExpo(seg(p, b.delay, 0.32 + b.delay));
    if (q <= 0) continue;
    const d = b.d * r * q;
    g.save();
    g.translate(Math.cos(b.a) * d, Math.sin(b.a) * d);
    g.rotate(b.a);
    g.beginPath(); g.ellipse(0, 0, b.rr * r * (1 + 0.6 * (1 - q)) * 1.25, b.rr * r * b.e, 0, 0, TAU); g.fill();
    g.restore();
  }
  for (const b of G.drops) {
    const q = E.outExpo(seg(p, 0.02 + b.delay, 0.36 + b.delay));
    if (q <= 0) continue;
    const d = b.d * r * q;
    g.beginPath(); g.arc(Math.cos(b.a) * d, Math.sin(b.a) * d, b.rr * r, 0, TAU); g.fill();
  }
  g.restore();
  // reflet humide
  if (o.gloss !== 0) {
    g.globalAlpha *= 0.22 * burst;
    g.fillStyle = '#ffb0a8';
    g.beginPath(); g.ellipse(-r * 0.18, -r * 0.2, r * 0.16, r * 0.06, -0.5, 0, TAU); g.fill();
  }
  g.restore();
}

// ============================================================================
//  TITRE BRUSH / GRAFFITI
// ============================================================================
export function brushTitle(g, text, x, y, o = {}) {
  const font = o.font || 'Permanent Marker';
  let size = o.size || 120;
  const tr = (o.tracking ?? 0) * size;
  setFontPx(g, font, size, o.weight || 400);
  let width = g.measureText(text).width + tr * Math.max(0, text.length - 1);
  if (o.maxWidth && width > o.maxWidth) {
    size *= o.maxWidth / width;
    setFontPx(g, font, size, o.weight || 400);
    width = g.measureText(text).width + tr * Math.max(0, text.length - 1);
  }
  const p = clamp(o.p ?? 1);
  if (p <= 0) return { width, size };
  const n = text.length;
  const stroke = o.stroke ?? size * 0.1;
  const skew = o.skew ?? 0.12;
  const glow = o.glow ?? 0.55;
  const shadow = o.shadow ?? 1;
  const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -width : -width / 2;
  // positions (avec crénage) : largeur des préfixes
  const xs = [], ws = [];
  for (let i = 0; i < n; i++) {
    xs.push(g.measureText(text.slice(0, i)).width + tr * i);
    ws.push(g.measureText(text[i]).width);
  }
  const colorAt = o.colorAt || (() => o.color || P.white);
  g.save();
  g.translate(x, y);
  if (o.rotate) g.rotate(o.rotate);
  g.transform(1, 0, -skew, 1, 0, 0);
  g.globalAlpha *= o.alpha ?? 1;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const anim = p < 1;
  const letter = (i, pass) => {
    const ch = text[i];
    if (ch === ' ') return;
    let sc = 1, rot = 0, al = 1, dy = 0;
    if (anim) {
      const a = (i / Math.max(1, n)) * 0.6;
      const q = seg(p, a, a + 0.4);
      if (q <= 0) return;
      sc = lerp(2.1, 1, E.outBack(q, 2.4));
      rot = (hash(i * 3.3 + 1) - 0.5) * 0.7 * (1 - E.outCubic(q));
      al = clamp(q * 3);
      dy = -size * 0.25 * (1 - E.outCubic(q));
    }
    g.save();
    g.translate(x0 + xs[i] + ws[i] / 2, dy);
    g.rotate(rot);
    g.scale(sc, sc);
    g.globalAlpha *= al;
    const lx = -ws[i] / 2;
    pass(ch, lx, i);
    g.restore();
  };
  const each = (pass) => {
    if (!anim) {
      // statique : une seule passe par couche (crénage exact)
      g.save();
      g.letterSpacing = `${tr}px`;
      let i0 = 0;
      for (let i = 0; i <= n; i++) {
        if (i === n || (i > 0 && colorAt(i) !== colorAt(i0))) {
          pass(text.slice(i0, i), x0 + xs[i0], i0);
          i0 = i;
        }
      }
      g.restore();
    } else for (let i = 0; i < n; i++) letter(i, pass);
  };
  // 1) halo néon
  if (glow > 0) {
    g.save();
    g.shadowColor = rgba(o.glowColor || P.neon, 0.85 * Math.min(1, glow));
    g.shadowBlur = size * 0.32 * glow;
    g.strokeStyle = rgba(o.glowColor || P.neon, 0.9);
    g.lineWidth = stroke * 2 + size * 0.02;
    each((s, lx) => g.strokeText(s, lx, 0));
    g.restore();
  }
  // 2) ombre portée rouge sombre (extrusion)
  if (shadow > 0) {
    g.save();
    g.fillStyle = o.shadowColor || P.deep;
    g.strokeStyle = o.shadowColor || P.deep;
    g.lineWidth = stroke * 2;
    const ox = size * 0.045 * shadow, oy = size * 0.06 * shadow;
    each((s, lx) => { g.strokeText(s, lx + ox, oy); g.fillText(s, lx + ox, oy); });
    g.restore();
  }
  // 3) contour noir
  if (stroke > 0) {
    g.save();
    g.strokeStyle = o.strokeColor || P.ink;
    g.lineWidth = stroke * 2;
    each((s, lx) => g.strokeText(s, lx, 0));
    g.restore();
  }
  // 4) remplissage
  each((s, lx, i) => { g.fillStyle = colorAt(i); g.fillText(s, lx, 0); });
  g.restore();
  return { width, size };
}

// ============================================================================
//  ÉTIQUETTE PRIX
// ============================================================================
export function priceTag(g, x, y, o = {}) {
  const price = o.price ?? '';
  const size = o.size || 140;
  const p = clamp(o.p ?? 1);
  const font = o.font || 'Anton';
  const lab = o.label || '', sub = o.sub || '';
  setFontPx(g, font, size, 400);
  const pw = g.measureText(price).width;
  const ls = size * 0.3, ss = size * 0.24;
  setFontPx(g, 'Oswald', ls, 700);
  const lw = lab ? g.measureText(lab).width + ls * 0.08 * lab.length : 0;
  setFontPx(g, 'Oswald', ss, 700);
  const sw = sub ? g.measureText(sub).width : 0;
  const padX = size * 0.3, padY = size * 0.16;
  const w = Math.max(pw, lw, sw) + padX * 2;
  const h = padY * 2 + (lab ? ls * 1.15 : 0) + size * 0.98 + (sub ? ss * 1.35 : 0);
  const cx = o.align === 'left' ? x + w / 2 : o.align === 'right' ? x - w / 2 : x;
  const box = { x: cx - w / 2, y: y - h / 2, w, h };
  if (p <= 0) return box;
  const pop = E.outBack(seg(p, 0, 0.42), 1.9);
  const neonOn = seg(p, 0.12, 0.5);
  const slamQ = seg(p, 0.28, 0.7);
  const t = o.t ?? p * 3;
  const flick = neonOn >= 1 ? 1 : (hash(Math.floor(t * 40) + 3.1) < 0.45 + neonOn * 0.5 ? neonOn : neonOn * 0.25);
  const u = size / 140;
  g.save();
  g.translate(cx, y);
  g.rotate(o.rotate ?? -0.035);
  g.scale(lerp(0.35, 1, pop), lerp(0.35, 1, pop));
  g.globalAlpha *= clamp(seg(p, 0, 0.12) * 1.2) * (o.alpha ?? 1);
  const r = Math.min(h * 0.2, size * 0.16);
  // ombre
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.55)';
  roundRectPath(g, -w / 2 + size * 0.05, -h / 2 + size * 0.08, w, h, r);
  g.fill();
  g.restore();
  // plaque
  const fill = o.fill || 'red';
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
  if (fill === 'black') { gr.addColorStop(0, '#1c0607'); gr.addColorStop(1, '#070102'); }
  else { gr.addColorStop(0, '#f2222a'); gr.addColorStop(0.55, P.red); gr.addColorStop(1, '#a10a10'); }
  g.fillStyle = gr;
  roundRectPath(g, -w / 2, -h / 2, w, h, r);
  g.fill();
  // matière « peinture » (poils de pinceau sombres)
  g.save();
  roundRectPath(g, -w / 2, -h / 2, w, h, r);
  g.clip();
  const bs = tinted(brushSprite(5), fill === 'black' ? '#3a0507' : '#8c070c', 'brush5');
  g.globalAlpha *= 0.35;
  g.drawImage(bs, -w / 2 - w * 0.05, -h / 2 - h * 0.1, w * 1.1, h * 1.2);
  g.restore();
  // néon
  if (neonOn > 0) {
    g.save();
    roundRectPath(g, -w / 2 + 3 * u, -h / 2 + 3 * u, w - 6 * u, h - 6 * u, r * 0.85);
    for (const [lw2, a] of [[22, 0.07], [12, 0.14], [6, 0.32]]) {
      g.strokeStyle = rgba(P.neon, a * flick);
      g.lineWidth = lw2 * u;
      g.stroke();
    }
    g.strokeStyle = rgba('#ffd4cf', 0.95 * flick);
    g.lineWidth = 2.6 * u;
    g.stroke();
    g.restore();
  }
  // libellé
  let cy = -h / 2 + padY;
  if (lab) {
    setFontPx(g, 'Oswald', ls, 700);
    g.letterSpacing = `${ls * 0.08}px`;
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.fillText(lab, ls * 0.04, cy + ls * 0.92);
    g.letterSpacing = '0px';
    cy += ls * 1.15;
  }
  // prix : claque (gros → taille), contour noir, € jaune
  if (slamQ > 0) {
    const sc = lerp(1.75, 1, E.outQuart(slamQ));
    g.save();
    g.translate(0, cy + size * 0.84);
    g.scale(sc, sc);
    g.globalAlpha *= clamp(slamQ * 2.5);
    setFontPx(g, font, size, 400);
    g.lineJoin = 'round';
    const col = o.color || 'yellow';
    const digits = col === 'white' ? P.white : col === 'yellow' ? P.yellow : col;
    const euroCol = o.euroColor || P.yellow;
    const euroIdx = price.indexOf('€');
    const parts = euroIdx >= 0 ? [[price.slice(0, euroIdx), digits], ['€' + price.slice(euroIdx + 1), euroCol]] : [[price, digits]];
    let px = -pw / 2;
    g.strokeStyle = 'rgba(10,2,3,0.95)';
    g.lineWidth = size * 0.09;
    for (const [s] of parts) { g.strokeText(s, px, 0); px += g.measureText(s).width; }
    px = -pw / 2;
    for (const [s, c] of parts) { g.fillStyle = c; g.fillText(s, px, 0); px += g.measureText(s).width; }
    g.restore();
  }
  cy += size * 0.98;
  if (sub) {
    const sq = seg(p, 0.5, 0.85);
    if (sq > 0) {
      setFontPx(g, 'Oswald', ss, 700);
      g.textAlign = 'center';
      g.globalAlpha *= clamp(sq * 2);
      g.fillStyle = '#ffffff';
      g.fillText(sub, 0, cy + ss * 1.05 + (1 - E.outCubic(sq)) * ss * 0.5);
    }
  }
  g.restore();
  return box;
}

// ============================================================================
//  CADRE NÉON
// ============================================================================
export function neonFlicker(t, seed = 0, amount = 1) {
  // grésillement déterministe : quelques micro-coupures + bourdonnement
  if (amount <= 0) return 1;
  const k = Math.floor(t * 30);
  const h1 = hash(k * 1.37 + seed * 9.1), h2 = hash(Math.floor(t * 7) + seed * 3.3);
  let v = 1 - 0.06 * amount * (0.5 + 0.5 * Math.sin(t * 100 + seed));
  if (h2 < 0.22 * amount && h1 < 0.55) v *= 0.15 + 0.3 * h1;
  return v;
}

export function neonFrame(g, x, y, w, h, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const u = unitOf(g);
  const col = o.color || P.neon;
  const lw = o.width ?? 3.2 * u;
  const r = o.radius ?? Math.min(w, h) * 0.07;
  const fl = neonFlicker(o.t ?? 0, o.seed ?? 1, o.flicker ?? 0);
  const glow = o.glow ?? 1;
  const L = 2 * (w + h) - 8 * r + TAU * r;
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  roundRectPath(g, x, y, w, h, r);
  if (p < 1) { g.setLineDash([L * p, L + 1]); g.lineDashOffset = 0; }
  for (const [m, a] of [[10, 0.05], [5.5, 0.1], [2.8, 0.28]]) {
    g.strokeStyle = rgba(col, a * fl * glow);
    g.lineWidth = lw * m;
    g.stroke();
  }
  g.strokeStyle = rgba(col, 0.95 * fl);
  g.lineWidth = lw * 1.25;
  g.stroke();
  g.strokeStyle = rgba('#ffe1dc', 0.85 * fl);
  g.lineWidth = lw * 0.45;
  g.stroke();
  g.setLineDash([]);
  if (o.screws && p >= 1) {
    const ins = Math.min(w, h) * 0.045 + r * 0.4;
    for (const [sx, sy] of [[x + ins, y + ins], [x + w - ins, y + ins], [x + ins, y + h - ins], [x + w - ins, y + h - ins]]) {
      const sr = 5 * u;
      const gg = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr);
      gg.addColorStop(0, '#d9d9d9'); gg.addColorStop(1, '#3a3a3a');
      g.fillStyle = gg;
      g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.2 * u;
      g.beginPath(); g.moveTo(sx - sr * 0.6, sy); g.lineTo(sx + sr * 0.6, sy); g.stroke();
    }
  }
  g.restore();
}

// ============================================================================
//  FUMÉE / VAPEUR
// ============================================================================
const SMK = 256;
function smokeSprite(v) {
  return cached(`smoke${v}`, () => {
    const c = mkCanvas(SMK, SMK);
    const g = ctx2d(c);
    const r = rng(v * 7717 + 3);
    for (let i = 0; i < 22; i++) {
      const a = r() * TAU, d = r() * SMK * 0.2;
      const x = SMK / 2 + Math.cos(a) * d, y = SMK / 2 + Math.sin(a) * d * 0.8;
      const rr = SMK * (0.12 + 0.2 * r());
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, 'rgba(255,255,255,0.22)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    const img = g.getImageData(0, 0, SMK, SMK);
    const d = img.data;
    for (let y = 0; y < SMK; y++) {
      for (let x = 0; x < SMK; x++) {
        const i = (y * SMK + x) * 4;
        const n = fbm2(x / 38, y / 38, v * 13, 4);
        const wisps = 0.5 + 0.5 * fbm2(x / 14 + n * 2, y / 22, v * 29, 3);
        const dx = x / SMK - 0.5, dy = y / SMK - 0.5;
        const fall = clamp(1 - Math.sqrt(dx * dx + dy * dy) * 2.1);
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = clamp((d[i + 3] / 255) * (0.55 + 0.9 * n) * (0.6 + 0.6 * wisps) * fall * 1.7) * 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

export function smoke(g, W, H, t, o = {}) {
  const k = o.k ?? 1;
  if (k <= 0.003) return;
  const seed = o.seed ?? 1;
  const color = o.color || '#d9d2cf';
  const [ax, ay, aw, ah] = o.area || [0, H * 0.45, W, H * 0.55];
  const size = o.size ?? Math.min(W, H) * 0.5;
  const count = o.count ?? 10;
  const rise = o.rise ?? 1;
  const alpha = (o.alpha ?? 0.3) * k;
  const r = rng(seed * 131 + 17);
  const spr = [0, 1, 2, 3].map((v) => tinted(smokeSprite(v), color, `smoke${v}`));
  g.save();
  if (o.blend) g.globalCompositeOperation = o.blend;
  for (let i = 0; i < count; i++) {
    const phase = r(), sx = r(), life = 4.5 + 3.5 * r(), drift = r() - 0.5, spin = (r() - 0.5) * 1.2;
    const v = Math.floor(r() * 4), sz = 0.6 + 0.8 * r(), rot0 = r() * TAU;
    const age = ((t * rise) / life + phase) % 1;
    const s = size * sz * (0.45 + 0.95 * age);
    const px = ax + aw * sx + drift * size * 0.6 * age + noise1(t * 0.35 + i * 7.1) * size * 0.12;
    const py = ay + ah - age * (ah + s * 0.4);
    const a = alpha * Math.pow(Math.sin(Math.PI * age), 1.3);
    if (a <= 0.004) continue;
    g.save();
    g.globalAlpha = a;
    g.translate(px, py);
    g.rotate(rot0 + spin * age);
    g.drawImage(spr[v], -s / 2, -s / 2, s, s);
    g.restore();
  }
  g.restore();
}

// ============================================================================
//  RUE DE NUIT
// ============================================================================
function brickTexture(W, H, u, seed) {
  return cached(`bricks${W}x${H}|${seed}`, () => {
    const bw = Math.round(96 * u), bh = Math.round(36 * u), m = Math.max(2, Math.round(4 * u));
    const TW = W + bw * 8;
    const c = mkCanvas(TW, H);
    const g = ctx2d(c);
    g.fillStyle = '#0c0706';
    g.fillRect(0, 0, TW, H);
    const r = rng(seed * 313 + 5);
    for (let row = 0, y = 0; y < H; row++, y += bh) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < TW + bw; x += bw) {
        const lum = 0.75 + 0.5 * r();
        const soot = r() < 0.12 ? 0.55 : 1;
        const R = Math.round(54 * lum * soot), Gc = Math.round(24 * lum * soot), B = Math.round(20 * lum * soot);
        g.fillStyle = `rgb(${R},${Gc},${B})`;
        g.fillRect(x + off + m / 2, y + m / 2, bw - m, bh - m);
        // arête supérieure légèrement plus claire
        g.fillStyle = `rgba(255,170,150,${0.05 + 0.05 * r()})`;
        g.fillRect(x + off + m / 2, y + m / 2, bw - m, Math.max(1, m * 0.6));
      }
    }
    const img = g.getImageData(0, 0, TW, H);
    const d = img.data;
    const S8 = 8, gw = Math.ceil(TW / S8) + 2, gh = Math.ceil(H / S8) + 2;
    const grid = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grid[j * gw + i] = 0.72 + 0.45 * (0.5 + 0.5 * fbm2((i * S8) / (160 * u), (j * S8) / (120 * u), seed, 3));
    for (let y = 0; y < H; y++) {
      const gy = y / S8, j0 = Math.floor(gy), fy = gy - j0;
      for (let x = 0; x < TW; x++) {
        const i = (y * TW + x) * 4;
        const gx = x / S8, i0 = Math.floor(gx), fx = gx - i0;
        const b0 = grid[j0 * gw + i0] + (grid[j0 * gw + i0 + 1] - grid[j0 * gw + i0]) * fx;
        const b1 = grid[(j0 + 1) * gw + i0] + (grid[(j0 + 1) * gw + i0 + 1] - grid[(j0 + 1) * gw + i0]) * fx;
        const blot = b0 + (b1 - b0) * fy;
        const gr = (hash(x * 0.913 + y * 12.37 + seed) - 0.5) * 18;
        d[i] = clamp(d[i] * blot + gr, 0, 255);
        d[i + 1] = clamp(d[i + 1] * blot + gr * 0.6, 0, 255);
        d[i + 2] = clamp(d[i + 2] * blot + gr * 0.6, 0, 255);
      }
    }
    g.putImageData(img, 0, 0);
    return { c, period: bw, TW };
  });
}

function lightMap(W, H) {
  return cached(`lightmap${W}x${H}`, () => {
    const s = Math.min(1, 320 / Math.max(W, H));
    return mkCanvas(W * s, H * s);
  });
}

export function streetLamp(g, x, groundY, height, o = {}) {
  const on = clamp(o.on ?? 1);
  const t = o.t ?? 0;
  const fl = on * (o.level ?? neonFlicker(t, (o.seed ?? 1) + 40, o.flicker ?? 0.35));
  const s = height / 1000;
  const headY = groundY - height;
  g.save();
  // mât
  const pw = 22 * s;
  const pg = g.createLinearGradient(x - pw, 0, x + pw, 0);
  pg.addColorStop(0, '#050505'); pg.addColorStop(0.45, '#2b2425'); pg.addColorStop(0.6, '#4a2d2d'); pg.addColorStop(1, '#070707');
  g.fillStyle = pg;
  g.beginPath();
  g.moveTo(x - pw * 0.55, headY + 210 * s);
  g.lineTo(x + pw * 0.55, headY + 210 * s);
  g.lineTo(x + pw * 0.75, groundY - 70 * s);
  g.lineTo(x + pw * 1.5, groundY);
  g.lineTo(x - pw * 1.5, groundY);
  g.lineTo(x - pw * 0.75, groundY - 70 * s);
  g.closePath();
  g.fill();
  // bagues décoratives
  g.fillStyle = '#151112';
  for (const yy of [headY + 230 * s, headY + 300 * s, groundY - 90 * s]) g.fillRect(x - pw * 1.1, yy, pw * 2.2, 14 * s);
  // lanterne : toit, cage vitrée lumineuse, socle
  const lw = 120 * s, lh = 150 * s, ly = headY + 40 * s;
  g.fillStyle = '#0d0b0b';
  g.beginPath();
  g.moveTo(x - lw * 0.7, ly); g.lineTo(x, ly - 70 * s); g.lineTo(x + lw * 0.7, ly); g.closePath(); g.fill();
  g.fillRect(x - 6 * s, ly - 95 * s, 12 * s, 30 * s);
  const glass = g.createLinearGradient(0, ly, 0, ly + lh);
  const hot = rgba('#fff2ee', 0.25 + 0.75 * fl), mid = rgba('#ff6a5e', 0.2 + 0.8 * fl);
  glass.addColorStop(0, mid); glass.addColorStop(0.45, hot); glass.addColorStop(1, rgba(P.neon, 0.25 + 0.75 * fl));
  g.fillStyle = on > 0.01 ? glass : '#1b1414';
  g.beginPath();
  g.moveTo(x - lw / 2, ly); g.lineTo(x + lw / 2, ly); g.lineTo(x + lw * 0.36, ly + lh); g.lineTo(x - lw * 0.36, ly + lh); g.closePath(); g.fill();
  g.strokeStyle = '#120d0d'; g.lineWidth = 7 * s;
  g.beginPath(); g.moveTo(x, ly); g.lineTo(x, ly + lh); g.stroke();
  g.fillStyle = '#0d0b0b';
  g.fillRect(x - lw * 0.42, ly + lh, lw * 0.84, 18 * s);
  g.beginPath(); g.moveTo(x - lw * 0.3, ly + lh + 18 * s); g.lineTo(x + lw * 0.3, ly + lh + 18 * s); g.lineTo(x + pw * 0.6, headY + 210 * s); g.lineTo(x - pw * 0.6, headY + 210 * s); g.closePath(); g.fill();
  // halo
  if (fl > 0.01) {
    const gl = (o.glow ?? 1) * fl;
    g.globalCompositeOperation = 'lighter';
    const hy = ly + lh * 0.5;
    const R = 520 * s;
    const hg = g.createRadialGradient(x, hy, 0, x, hy, R);
    hg.addColorStop(0, rgba('#ff8a7a', 0.55 * gl));
    hg.addColorStop(0.12, rgba(P.neon, 0.32 * gl));
    hg.addColorStop(0.45, rgba(P.red, 0.08 * gl));
    hg.addColorStop(1, rgba(P.red, 0));
    g.fillStyle = hg;
    g.fillRect(x - R, hy - R, R * 2, R * 2);
  }
  g.restore();
}

export function streetBackdrop(g, W, H, t, o = {}) {
  const k = o.k ?? 1;
  if (k <= 0.003) return;
  const u = Math.min(W, H) / 1080;
  const V = H > W;
  const hz = o.horizon ?? H * (V ? 0.8 : 0.76);
  const par = o.parallax ?? 0;
  const lampXs = Array.isArray(o.lamps) ? o.lamps
    : o.lamps === 0 ? []
      : (o.lamps ?? 2) === 1 ? [0.5]
        : Array.from({ length: o.lamps ?? 2 }, (_, i, a) => (V ? 0.13 : 0.11) + (i / Math.max(1, a.length - 1)) * (V ? 0.74 : 0.78));
  const light = (o.light ?? 1) * k;
  const lampH = (V ? 0.42 : 0.62) * H;
  g.save();
  g.globalAlpha *= k;
  g.fillStyle = '#060606';
  g.fillRect(0, 0, W, H);
  // ---- mur de briques
  const lamps = lampXs.map((fx, i) => ({ x: fx * W - par, on: 1, fl: neonFlicker(t, i * 5 + (o.seed ?? 1), o.flicker ?? 0.3) }));
  if (o.bricks !== false) {
    const B = brickTexture(W, Math.ceil(hz), u, o.seed ?? 1);
    const span = B.TW - W;
    const ox = (((par % span) + span) % span);
    g.globalAlpha = k * 0.95;
    g.drawImage(B.c, -ox, 0);
    g.globalAlpha = k;
    // carte de lumière (petite, recalculée à chaque image) : obscurité sauf sous les lampadaires
    const lm = lightMap(W, H);
    const lg = ctx2d(lm);
    const sx = lm.width / W, sy = lm.height / H;
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, lm.width, lm.height);
    lg.fillStyle = 'rgba(0,0,0,0.93)';
    lg.fillRect(0, 0, lm.width, lm.height);
    lg.globalCompositeOperation = 'destination-out';
    for (const L of lamps) {
      const cx = L.x * sx, cy = (hz - lampH * 0.83) * sy, R = lampH * 0.75 * sx;
      const gg = lg.createRadialGradient(cx, cy, 0, cx, cy, R);
      gg.addColorStop(0, `rgba(0,0,0,${0.95 * light * L.fl})`);
      gg.addColorStop(0.5, `rgba(0,0,0,${0.5 * light * L.fl})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gg;
      lg.fillRect(cx - R, cy - R, R * 2, R * 2);
      // cône vers le bas
      const cg = lg.createLinearGradient(0, cy, 0, hz * sy);
      cg.addColorStop(0, `rgba(0,0,0,${0.35 * light * L.fl})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = cg;
      lg.beginPath();
      lg.moveTo(cx - R * 0.12, cy); lg.lineTo(cx + R * 0.12, cy); lg.lineTo(cx + R * 0.7, hz * sy); lg.lineTo(cx - R * 0.7, hz * sy);
      lg.closePath(); lg.fill();
    }
    g.drawImage(lm, 0, 0, W, H);
    // teinte rouge de la lumière
    g.globalCompositeOperation = 'lighter';
    for (const L of lamps) {
      const cy = hz - lampH * 0.83, R = lampH * 0.85;
      const rg = g.createRadialGradient(L.x, cy, 0, L.x, cy, R);
      rg.addColorStop(0, rgba(P.red, 0.2 * light * L.fl));
      rg.addColorStop(0.6, rgba(P.deep, 0.12 * light * L.fl));
      rg.addColorStop(1, rgba(P.deep, 0));
      g.fillStyle = rg;
      g.fillRect(L.x - R, cy - R, R * 2, R * 2);
    }
    g.globalCompositeOperation = 'source-over';
    // haut du mur plongé dans le noir
    const top = g.createLinearGradient(0, 0, 0, hz);
    top.addColorStop(0, 'rgba(4,4,4,0.85)');
    top.addColorStop(0.35, 'rgba(4,4,4,0.25)');
    top.addColorStop(0.85, 'rgba(4,4,4,0)');
    top.addColorStop(1, 'rgba(4,4,4,0.45)');
    g.fillStyle = top;
    g.fillRect(0, 0, W, hz);
  }
  // ---- sol mouillé
  const gr = g.createLinearGradient(0, hz, 0, H);
  gr.addColorStop(0, '#120a0a'); gr.addColorStop(0.25, '#0a0708'); gr.addColorStop(1, '#040404');
  g.fillStyle = gr;
  g.fillRect(0, hz, W, H - hz);
  g.fillStyle = rgba('#3a1a18', 0.9);
  g.fillRect(0, hz - 2 * u, W, 4 * u); // bord de trottoir
  const wet = (o.wet ?? 1) * k;
  if (wet > 0) {
    g.globalCompositeOperation = 'lighter';
    // lueur générale du mur reflétée
    const rf = g.createLinearGradient(0, hz, 0, hz + (H - hz) * 0.5);
    rf.addColorStop(0, rgba(P.red, 0.14 * wet * light));
    rf.addColorStop(1, rgba(P.red, 0));
    g.fillStyle = rf;
    g.fillRect(0, hz, W, (H - hz) * 0.5);
    // reflets des lampadaires : traînées verticales qui ondulent
    for (let li = 0; li < lamps.length; li++) {
      const L = lamps[li];
      const N = 34;
      const depth = H - hz;
      for (let i = 0; i < N; i++) {
        const q = i / N;
        const yy = hz + q * depth;
        const hh = depth / N + 1;
        const wob = noise1(i * 0.9 + t * 2.2 + li * 11) * 26 * u * (0.3 + q);
        const ww = (40 + 90 * q) * u * (0.7 + 0.5 * (0.5 + 0.5 * noise1(i * 1.7 + t * 3 + li)));
        const a = 0.38 * wet * light * L.fl * Math.pow(1 - q, 1.3) * (0.55 + 0.45 * (0.5 + 0.5 * noise1(i * 2.3 - t * 4 + li * 3)));
        const sg = g.createLinearGradient(L.x + wob - ww, 0, L.x + wob + ww, 0);
        sg.addColorStop(0, rgba(P.red, 0));
        sg.addColorStop(0.5, rgba(i < 6 ? '#ff7a6c' : P.neon, a));
        sg.addColorStop(1, rgba(P.red, 0));
        g.fillStyle = sg;
        g.fillRect(L.x + wob - ww, yy, ww * 2, hh);
      }
    }
    // reflets fins (flaques) qui scintillent
    const r = rng((o.seed ?? 1) * 59 + 1);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, yq = r(), y = hz + Math.pow(yq, 0.7) * (H - hz), len = (30 + 120 * r()) * u;
      const a = 0.12 * wet * light * (0.5 + 0.5 * Math.sin(t * (1.5 + r() * 3) + r() * 9));
      g.fillStyle = rgba('#ff8f80', a);
      g.fillRect(x - len / 2, y, len, Math.max(1, 1.6 * u));
    }
    g.globalCompositeOperation = 'source-over';
  }
  // ---- lampadaires
  for (let i = 0; i < lamps.length; i++) {
    streetLamp(g, lamps[i].x, hz + 6 * u, lampH, { t, level: lamps[i].fl, glow: light });
  }
  g.restore();
}

// ============================================================================
//  NAPPE À CARREAUX
// ============================================================================
export function checkered(g, x, y, w, h, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const skew = o.skew ?? 0.28;
  const cols = o.cols ?? 8;
  const rows = Math.max(2, Math.round(cols * (h / w) * (1 + skew * 0.6)));
  const red = o.red || '#d3111b', white = o.white || P.cream;
  // coins du quadrilatère (perspective : bord du fond plus étroit)
  const TL = [x + (w * skew) / 2, y], TR = [x + w - (w * skew) / 2, y], BR = [x + w, y + h], BL = [x, y + h];
  const vmap = (v) => Math.pow(v, 1 + skew * 0.9);
  const at = (uu, vv) => {
    const v = vmap(vv);
    const lx = lerp(TL[0], BL[0], v), ly = lerp(TL[1], BL[1], v), rx = lerp(TR[0], BR[0], v), ry = lerp(TR[1], BR[1], v);
    return [lerp(lx, rx, uu), lerp(ly, ry, uu)];
  };
  g.save();
  if (o.rotate) { g.translate(x + w / 2, y + h / 2); g.rotate(o.rotate); g.translate(-x - w / 2, -y - h / 2); }
  g.globalAlpha *= o.alpha ?? 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const d = (i / cols + j / rows) / 2;
      const q = clamp((p * 1.35 - d) * 5);
      if (q <= 0) continue;
      const a = at(i / cols, j / rows), b = at((i + 1) / cols, j / rows), c = at((i + 1) / cols, (j + 1) / rows), e = at(i / cols, (j + 1) / rows);
      const cx = (a[0] + c[0]) / 2, cy = (a[1] + c[1]) / 2;
      const sc = E.outBack(q, 2);
      const P4 = [a, b, c, e].map(([px, py]) => [cx + (px - cx) * sc * 1.01, cy + (py - cy) * sc * 1.01]);
      g.fillStyle = (i + j) % 2 ? white : red;
      g.beginPath(); g.moveTo(P4[0][0], P4[0][1]);
      for (let m = 1; m < 4; m++) g.lineTo(P4[m][0], P4[m][1]);
      g.closePath(); g.fill();
    }
  }
  // plis du tissu + assombrissement des bords
  if ((o.shade ?? 1) > 0 && p > 0.4) {
    const sa = (o.shade ?? 1) * sstep(0.4, 1, p);
    g.beginPath(); g.moveTo(TL[0], TL[1]); g.lineTo(TR[0], TR[1]); g.lineTo(BR[0], BR[1]); g.lineTo(BL[0], BL[1]); g.closePath();
    g.clip();
    const r = rng((o.seed ?? 1) * 97 + 3);
    for (let i = 0; i < 4; i++) {
      const fx = x + w * (0.15 + 0.7 * r()), ang = -0.6 + 1.2 * r(), ww = w * (0.05 + 0.08 * r());
      g.save();
      g.translate(fx, y + h / 2); g.rotate(ang);
      const fg = g.createLinearGradient(-ww, 0, ww, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.45, `rgba(0,0,0,${0.28 * sa})`);
      fg.addColorStop(0.55, `rgba(255,255,255,${0.1 * sa})`); fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg; g.fillRect(-ww, -h, ww * 2, h * 2);
      g.restore();
    }
    const vg = g.createLinearGradient(0, y, 0, y + h);
    vg.addColorStop(0, `rgba(0,0,0,${0.55 * sa})`); vg.addColorStop(0.4, 'rgba(0,0,0,0.05)'); vg.addColorStop(1, `rgba(0,0,0,${0.25 * sa})`);
    g.fillStyle = vg; g.fillRect(x, y, w, h);
  }
  g.restore();
}

// ============================================================================
//  PARTICULES : miettes, étincelles, braises
// ============================================================================
const CRUMB_COLS = ['#d9953a', '#c47a26', '#e8b25a', '#9a5a1e', '#f0c46c', '#7a4116'];

function crumbShape(i, seed) {
  return cached(`crumb${seed}|${i}`, () => {
    const r = rng(seed * 1009 + i * 31 + 1);
    const n = 5 + Math.floor(r() * 3);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + (r() - 0.5) * 0.6;
      const rr = 0.55 + 0.45 * r();
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * (0.6 + 0.4 * r())]);
    }
    return { pts, col: CRUMB_COLS[Math.floor(r() * CRUMB_COLS.length)] };
  });
}

export function particles(g, W, H, t, o = {}) {
  const kind = o.kind || 'embers';
  const k = o.k ?? 1;
  if (k <= 0.003) return;
  const seed = o.seed ?? 1;
  const u = Math.min(W, H) / 1080;
  const sz = o.size ?? 1;
  const [ax, ay, aw, ah] = o.area || [0, 0, W, H];
  const r = rng(seed * 7919 + (kind === 'crumbs' ? 1 : kind === 'sparks' ? 2 : 3));
  const B = o.burst;
  g.save();
  if (kind === 'crumbs') {
    const n = o.count ?? (B ? 70 : 40);
    const grav = 1700 * u;
    for (let i = 0; i < n; i++) {
      const sh = crumbShape(i % 24, seed);
      const s = (3 + 9 * r() * r() + 2 * r()) * u * sz;
      const spin = (r() - 0.5) * 14, rot0 = r() * TAU;
      let px, py, a = 1, ang;
      if (B) {
        const age = t - B.t0 - r() * 0.04;
        if (age < 0 || age > 2.2) { r(); r(); r(); continue; }
        const th = -Math.PI / 2 + (r() - 0.5) * 2.6, sp = (300 + 900 * r()) * u * (B.power ?? 1);
        const vx = Math.cos(th) * sp, vy = Math.sin(th) * sp;
        px = B.x + vx * age;
        py = B.y + vy * age + 0.5 * grav * age * age;
        ang = rot0 + spin * age;
        a = clamp(1 - (age - 1.3) / 0.9);
        r();
      } else {
        const life = 1.6 + 1.6 * r(), phase = r(), x0 = ax + aw * r();
        const age = ((t / life) + phase) % 1;
        px = x0 + noise1(i * 3.3 + t) * 20 * u;
        py = ay + age * (ah + 40 * u) - 20 * u;
        ang = rot0 + spin * age * life;
        a = clamp(Math.sin(Math.PI * age) * 3);
      }
      g.save();
      g.globalAlpha = a * k;
      g.translate(px, py);
      g.rotate(ang);
      g.fillStyle = sh.col;
      g.beginPath();
      sh.pts.forEach(([qx, qy], m) => (m ? g.lineTo(qx * s, qy * s) : g.moveTo(qx * s, qy * s)));
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,235,190,0.35)';
      g.beginPath(); g.arc(-s * 0.2, -s * 0.2, s * 0.25, 0, TAU); g.fill();
      g.restore();
    }
  } else if (kind === 'sparks') {
    g.globalCompositeOperation = o.blend || 'lighter';
    g.lineCap = 'round';
    const n = o.count ?? (B ? 60 : 36);
    const grav = 900 * u;
    for (let i = 0; i < n; i++) {
      let px, py, vx, vy, life, age;
      if (B) {
        life = 0.5 + 0.9 * r();
        age = t - B.t0 - r() * 0.03;
        const th = r() * TAU, sp = (500 + 1500 * r() * r()) * u * (B.power ?? 1);
        vx = Math.cos(th) * sp; vy = Math.sin(th) * sp - 300 * u;
        if (age < 0 || age > life) continue;
        px = B.x + vx * age; py = B.y + vy * age + 0.5 * grav * age * age;
        vy += grav * age;
      } else {
        life = 1 + 1.4 * r();
        const phase = r(), x0 = ax + aw * r();
        const aa = ((t / life) + phase) % 1;
        age = aa * life;
        vx = (r() - 0.5) * 260 * u; vy = -(300 + 500 * r()) * u;
        px = x0 + vx * age + noise1(i + t * 2) * 30 * u;
        py = ay + ah + vy * age + 0.5 * grav * 0.3 * age * age;
      }
      const q = age / life;
      const a = k * (1 - q) * (0.6 + 0.4 * hash(i + Math.floor(t * 30)));
      const len = 0.022;
      const col = q < 0.25 ? '#fff6d8' : q < 0.6 ? P.yellow : '#ff6a2a';
      g.strokeStyle = rgba(col, a);
      g.lineWidth = (1.6 + 2 * (1 - q)) * u * sz;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px - vx * len, py - vy * len); g.stroke();
    }
  } else {
    // braises : points chauds qui montent en tremblotant
    g.globalCompositeOperation = o.blend || 'lighter';
    const n = o.count ?? 48;
    for (let i = 0; i < n; i++) {
      const life = 3 + 4 * r(), phase = r(), x0 = ax + aw * r(), s = (1.4 + 3.2 * r() * r()) * u * sz, wob = 30 + 60 * r();
      const age = ((t / life) + phase) % 1;
      const px = x0 + noise1(t * 0.8 + i * 5.1) * wob * u;
      const py = ay + ah * (1 - age);
      const fl = 0.55 + 0.45 * noise1(t * 9 + i * 2.7);
      const a = k * Math.sin(Math.PI * age) * fl;
      if (a <= 0.01) continue;
      const col = hash(i * 1.3 + seed) < 0.3 ? P.yellow : hash(i * 2.1) < 0.6 ? '#ff6a2a' : P.neon;
      const R = s * 4;
      const gg = g.createRadialGradient(px, py, 0, px, py, R);
      gg.addColorStop(0, rgba('#fff3d6', a));
      gg.addColorStop(0.18, rgba(col, a * 0.9));
      gg.addColorStop(1, rgba(col, 0));
      g.fillStyle = gg;
      g.fillRect(px - R, py - R, R * 2, R * 2);
    }
  }
  g.restore();
}

// ============================================================================
//  PHOTO DÉCOUPÉE DU MENU
// ============================================================================
export function photo(g, im, cx, cy, o = {}) {
  if (!im) return null;
  const img = im.img || im;
  const iw = im.w || img.naturalWidth || img.width, ih = im.h || img.naturalHeight || img.height;
  if (!iw || !ih) return null;
  let h = o.h ?? (o.w ? (o.w * ih) / iw : ih);
  let w = o.w && o.h ? o.w : (h * iw) / ih;
  const p = clamp(o.p ?? 1);
  if (p <= 0) return null;
  const pop = o.p === undefined ? 1 : E.outBack(seg(p, 0, 1), 1.8);
  const sc = (o.scale ?? 1) * lerp(0.4, 1, pop);
  const ax = 0, ay = o.anchor === 'bottom' ? -h / 2 : 0;
  g.save();
  g.translate(cx, cy + ay);
  g.rotate((o.rot || 0) + (o.p === undefined ? 0 : (1 - E.outCubic(p)) * 0.25));
  g.scale(sc, sc);
  g.globalAlpha *= (o.alpha ?? 1) * clamp(p * 3);
  if (o.shadow) {
    const sh = g.createRadialGradient(0, h * 0.48, 0, 0, h * 0.48, w * 0.5);
    sh.addColorStop(0, `rgba(0,0,0,${0.75 * o.shadow})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.scale(1, 0.16);
    g.fillStyle = sh;
    g.fillRect(-w * 0.5, h * 0.48 / 0.16 - w * 0.5, w, w);
    g.restore();
  }
  if (o.glow) {
    g.shadowColor = rgba(o.glowColor || P.neon, Math.min(1, 0.9 * o.glow));
    g.shadowBlur = Math.max(w, h) * 0.06 * o.glow;
  }
  g.drawImage(img, -w / 2 + ax, -h / 2, w, h);
  g.restore();
  return { x: cx - (w * sc) / 2, y: cy + ay - (h * sc) / 2, w: w * sc, h: h * sc };
}
