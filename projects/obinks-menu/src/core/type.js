// Typographie cinétique + mise en page sûre (16:9 télé / 9:16 réseaux sociaux).
// Tout est fonction pure du temps local : aucune variable d'état entre deux images.

import { E, clamp, lerp, seg, rng, rgba, noise1, TAU } from './anim.js';
import { setFont, textWidth, charLayout } from './draw.js';

export const C = {
  // Palette O'BINKS (FACTS.md) — les noms neon/teal sont gardés pour compatibilité du moteur :
  // neon = ROUGE néon, teal = JAUNE prix.
  bg: '#0a0a0b', neon: '#ff2a2a', neon2: '#ff4d3d', teal: '#ffc21a', yellow: '#ffc21a', red: '#e3141b',
  white: '#ffffff', muted: '#b9b2ad', metal: '#c9c9c9', metalDark: '#555555', ink: '#140203', deep: '#1a0304',
};

/**
 * Zone de sécurité de l'image courante.
 *  16:9 : 5 % sur chaque bord (télés du magasin).
 *  9:16 : 250 px en haut, 450 px en bas (sur 1920), 5 % sur les côtés (interfaces TikTok/Instagram).
 * u = unité typographique (1 à 1080 px de petit côté).
 */
export function layout(cfg, W, H) {
  const V = !!cfg.vertical;
  const s = V ? cfg.safe.v : cfg.safe.h;
  const l = W * s.x, r = W * (1 - s.x), t = H * s.top, b = H * (1 - s.bottom);
  return {
    V, W, H, u: Math.min(W, H) / 1080,
    safe: { l, r, t, b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 },
  };
}

/** Coupe une phrase en lignes qui tiennent dans maxW (pour le format vertical). */
export function wrapLines(g, str, size, weight, tracking, maxW) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (cur && textWidth(g, test, size, weight, tracking) > maxW) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Texte qui se tape lettre par lettre avec un curseur ; le dernier mot est surligné
 * (bande vert néon qui balaie le mot, texte qui passe en encre sombre).
 * o = { size, weight, tracking, t (s depuis le début de la frappe), cps (caractères/s),
 *       color, align ('left'|'center'), cursor (true), highlight ('last' | index de début | null),
 *       hlColor, hlInk, hlDelay (s après la fin de frappe), alpha, out (0→1 disparition) }
 * Retourne { typed, done, width, x0 } pour caler des bruitages / autres éléments.
 */
export function typewriter(g, str, x, y, o = {}) {
  const size = o.size || 60, weight = o.weight || 700, tracking = o.tracking ?? 0;
  const t = o.t ?? 0, cps = o.cps || 22;
  const alpha = (o.alpha ?? 1) * (1 - E.inCubic(clamp(o.out || 0)));
  const L = charLayout(g, str, size, weight, tracking);
  const x0 = o.align === 'center' ? x - L.width / 2 : o.align === 'right' ? x - L.width : x;
  const n = str.length;
  const typed = clamp(Math.floor(t * cps), 0, n);
  const done = typed >= n;
  if (alpha <= 0.003 || t < 0) return { typed: 0, done: false, width: L.width, x0 };
  setFont(g, size, weight, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  // surlignage du dernier mot
  let hs = -1;
  if (o.highlight !== null && o.highlight !== undefined) hs = o.highlight === 'last' ? str.lastIndexOf(' ') + 1 : o.highlight;
  const tDone = n / cps;
  const hp = hs >= 0 ? E.outExpo(seg(t, tDone + (o.hlDelay ?? 0.08), tDone + (o.hlDelay ?? 0.08) + 0.38)) : 0;
  let hx0 = 0, hx1 = 0;
  if (hs >= 0) {
    hx0 = x0 + L.chars[hs].x - size * 0.12;
    const last = L.chars[n - 1];
    const endTrim = /[.!?,]/.test(last.ch) ? L.chars[n - 2] : last;
    hx1 = x0 + endTrim.x + endTrim.w + size * 0.12;
  }
  g.save();
  g.globalAlpha = alpha;
  if (hp > 0) {
    g.fillStyle = o.hlColor || C.neon;
    g.shadowColor = rgba(o.hlColor || C.neon, 0.7);
    g.shadowBlur = size * 0.5;
    g.beginPath();
    g.roundRect(hx0, y - size * 0.86, (hx1 - hx0) * hp, size * 1.08, size * 0.14);
    g.fill();
    g.shadowBlur = 0;
  }
  for (let i = 0; i < typed; i++) {
    const c = L.chars[i];
    if (c.ch === ' ') continue;
    const inHl = hs >= 0 && i >= hs && x0 + c.x + c.w * 0.5 < hx0 + (hx1 - hx0) * hp;
    // petite « frappe » : chaque lettre arrive avec un micro-rebond
    const age = t - i / cps;
    const pop = 1 + 0.18 * Math.exp(-age * 30);
    g.save();
    g.translate(x0 + c.x + c.w / 2, y);
    g.scale(pop, pop);
    g.fillStyle = inHl ? (o.hlInk || C.ink) : (i >= hs && hs >= 0 && o.hlTint ? o.hlTint : o.color || C.white);
    g.fillText(c.ch, -c.w / 2, 0);
    g.restore();
  }
  // curseur : clignote quand la frappe est finie, plein pendant la frappe
  if (o.cursor !== false) {
    const blink = done ? (Math.floor((t - tDone) * 2.6) % 2 === 0 ? 1 : 0) : 1;
    const cx = typed > 0 ? x0 + L.chars[typed - 1].x + L.chars[typed - 1].w + size * 0.06 : x0;
    if (blink && !(done && hp > 0.99 && (o.hideCursorAfter ?? true) && t > tDone + 1.2)) {
      g.fillStyle = o.cursorColor || C.neon;
      g.fillRect(cx, y - size * 0.82, Math.max(2, size * 0.07), size * 1.0);
    }
  }
  g.restore();
  return { typed, done, width: L.width, x0, hx0, hx1 };
}

/**
 * Mot « slam » : arrive en grand (x3) et flou, s'écrase à sa taille avec un tremblement.
 * o = { size, weight, tracking, t (s depuis l'arrivée), color, colorAt(i), align, dur, shake, alpha, out }
 */
export function slam(g, str, x, y, o = {}) {
  const size = o.size || 120, weight = o.weight || 800, tracking = o.tracking ?? -0.02;
  const t = o.t ?? 0, dur = o.dur || 0.22;
  if (t < 0) return;
  const p = E.outQuart(seg(t, 0, dur));
  const sc = lerp(o.from ?? 2.6, 1, p);
  const shake = (o.shake ?? 1) * Math.exp(-Math.max(0, t - dur) * 9) * size * 0.05 * (t > dur ? 1 : 0);
  const a = (o.alpha ?? 1) * clamp(p * 2) * (1 - E.inCubic(clamp(o.out || 0)));
  if (a <= 0.003) return;
  const L = charLayout(g, str, size, weight, tracking);
  const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -L.width : -L.width / 2;
  g.save();
  g.translate(x + noise1(t * 40) * shake, y + noise1(t * 37 + 5) * shake);
  g.scale(sc, sc);
  g.globalAlpha = a;
  setFont(g, size, weight, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  L.chars.forEach((c, i) => {
    if (c.ch === ' ') return;
    g.fillStyle = o.colorAt ? o.colorAt(i) : o.color || C.white;
    g.fillText(c.ch, x0 + c.x, 0);
  });
  g.restore();
}

/**
 * Lettres qui se découpent et volent depuis (ou vers) des positions aléatoires, avec rotation.
 * mode 'in' : assemblage ; mode 'out' : explosion. t = temps local, dur = durée par lettre.
 */
export function splitLetters(g, str, x, y, o = {}) {
  const size = o.size || 120, weight = o.weight || 800, tracking = o.tracking ?? -0.01;
  const t = o.t ?? 0, dur = o.dur || 0.5, stagger = o.stagger ?? 0.025;
  const L = charLayout(g, str, size, weight, tracking);
  const x0 = o.align === 'left' ? x : x - L.width / 2;
  const r = rng(o.seed || 9);
  const spread = (o.spread || 1) * size * 3;
  setFont(g, size, weight, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  L.chars.forEach((c, i) => {
    const dx = (r() - 0.5) * spread * 2, dy = (r() - 0.5) * spread, rot = (r() - 0.5) * 2.4, s0 = 0.2 + r() * 2.2;
    if (c.ch === ' ') return;
    let p = E.outExpo(seg(t, i * stagger, i * stagger + dur));
    if (o.mode === 'out') p = 1 - E.inQuart(seg(t, i * stagger * 0.5, i * stagger * 0.5 + dur));
    const a = (o.alpha ?? 1) * clamp(p * 1.6);
    if (a <= 0.003) return;
    g.save();
    g.translate(x0 + c.x + c.w / 2 + dx * (1 - p), y + dy * (1 - p));
    g.rotate(rot * (1 - p));
    g.scale(lerp(s0, 1, p), lerp(s0, 1, p));
    g.globalAlpha = a;
    g.fillStyle = o.colorAt ? o.colorAt(i) : o.color || C.white;
    g.fillText(c.ch, -c.w / 2, 0);
    g.restore();
  });
}

/**
 * Révélation par masque : une bande lumineuse balaie et découvre le texte (direction 'x' ou 'y').
 */
export function maskReveal(g, str, x, y, o = {}) {
  const size = o.size || 100, weight = o.weight || 800, tracking = o.tracking ?? 0;
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const L = charLayout(g, str, size, weight, tracking);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.width : x - L.width / 2;
  g.save();
  g.beginPath();
  if (o.dir === 'y') g.rect(x0 - size, y - size * 1.0, L.width + size * 2, size * 1.3 * p);
  else g.rect(x0 - size * 0.2, y - size * 1.1, (L.width + size * 0.4) * p, size * 1.45);
  g.clip();
  g.globalAlpha = o.alpha ?? 1;
  setFont(g, size, weight, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  L.chars.forEach((c, i) => {
    g.fillStyle = o.colorAt ? o.colorAt(i) : o.color || C.white;
    g.fillText(c.ch, x0 + c.x, y);
  });
  g.restore();
  // liseré lumineux au bord du masque
  if (p < 1 && o.edge !== false) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rgba(o.edgeColor || C.neon, 0.9 * (o.alpha ?? 1));
    if (o.dir === 'y') g.fillRect(x0 - size * 0.1, y - size + size * 1.3 * p - 2, L.width + size * 0.2, Math.max(2, size * 0.03));
    else g.fillRect(x0 - size * 0.2 + (L.width + size * 0.4) * p - 2, y - size * 1.05, Math.max(2, size * 0.035), size * 1.35);
    g.restore();
  }
}

/** Nom de marque « GSM CENTER » : GSM blanc, CENTER vert (comme la première vidéo). */
export const brandColorAt = (str, split = 3, a = C.white, b = C.neon) => (i) => (i < split ? a : b);

/** Lignes de vitesse radiales (calque fx additif). k = intensité 0→1, t = temps. */
export function speedLines(g, W, H, t, k, o = {}) {
  if (k <= 0.003) return;
  const r = rng(o.seed || 21);
  const n = Math.round((o.count || 120) * k);
  const cx = (o.cx ?? 0.5) * W, cy = (o.cy ?? 0.5) * H;
  const R = Math.hypot(W, H) * 0.6;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, sp = 0.6 + r() * 1.6, ph = r();
    const len = (0.08 + r() * 0.25) * R * k;
    const d = ((ph + t * sp * (o.speed || 1.4)) % 1) * R * 1.2 + R * 0.12;
    const x1 = cx + Math.cos(a) * d, y1 = cy + Math.sin(a) * d;
    const x2 = cx + Math.cos(a) * (d + len), y2 = cy + Math.sin(a) * (d + len);
    const grd = g.createLinearGradient(x1, y1, x2, y2);
    const col = i % 4 === 0 ? (o.color2 || C.teal) : (o.color || C.neon);
    grd.addColorStop(0, rgba(col, 0));
    grd.addColorStop(1, rgba(i % 3 === 0 ? '#ffffff' : col, 0.75 * k));
    g.strokeStyle = grd;
    g.lineWidth = (1 + r() * 2.5) * Math.min(W, H) / 1080;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  g.restore();
}

/** Cercle de toucher : point qui presse puis onde qui s'étend (sur un calque 2D ou une texture d'écran). */
export function touchRipple(g, x, y, t, s = 1, color = C.white) {
  if (t < 0 || t > 0.9) return;
  const press = E.outCubic(seg(t, 0, 0.12)) * (1 - E.inCubic(seg(t, 0.25, 0.5)));
  g.save();
  g.fillStyle = rgba(color, 0.55 * press);
  g.beginPath(); g.arc(x, y, 34 * s * (0.8 + 0.2 * press), 0, TAU); g.fill();
  for (let k = 0; k < 2; k++) {
    const p = seg(t, 0.08 + k * 0.12, 0.7 + k * 0.12);
    if (p <= 0 || p >= 1) continue;
    g.strokeStyle = rgba(color, 0.8 * (1 - p));
    g.lineWidth = 4 * s * (1 - p) + 1;
    g.beginPath(); g.arc(x, y, (34 + 120 * E.outCubic(p)) * s, 0, TAU); g.stroke();
  }
  g.restore();
}

/**
 * « Point de lumière » de la boucle : PREMIÈRE image (t = 0) et DERNIÈRE image (t → 30 s) sont
 * identiques : fond noir + ce point au centre exact de l'image. k = 1 : état de référence.
 * À dessiner sur le calque fx (additif, avant bloom).
 */
export function seedPoint(g, W, H, k = 1) {
  if (k <= 0) return;
  const u = Math.min(W, H) / 1080;
  const cx = W / 2, cy = H / 2;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, 110 * u);
  glow.addColorStop(0, rgba(C.neon, 0.5 * k));
  glow.addColorStop(0.3, rgba(C.neon, 0.16 * k));
  glow.addColorStop(1, rgba(C.neon, 0));
  g.fillStyle = glow; g.fillRect(cx - 110 * u, cy - 110 * u, 220 * u, 220 * u);
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, 14 * u);
  core.addColorStop(0, rgba('#ffffff', 1 * k));
  core.addColorStop(0.5, rgba('#e8ffe0', 0.7 * k));
  core.addColorStop(1, rgba(C.neon, 0));
  g.fillStyle = core; g.fillRect(cx - 14 * u, cy - 14 * u, 28 * u, 28 * u);
  g.restore();
}
