// Kit commun du Reel : mise en page mobile (safe zones IG/TikTok), typographie cinétique,
// plans texte 3D (profondeur), logo 2D.

import * as THREE from 'three';
import { E, seg, clamp, lerp, rgba } from '../core/anim.js';
import { setFont, fitSize, textWidth, radialGlow } from '../core/draw.js';
import { canvasTexture } from '../world/textures.js';
import { apPath2D } from '../world/objects.js';

// Safe zone : pas de texte important dans les 14 % du haut, sous 72 %, ni contre le bord droit
export function layout(W, H) {
  return { cx: W * 0.47, maxW: W * 0.74, top: H * 0.14, bottom: H * 0.72, u: Math.min(W, H) / 1080 };
}

/** Texte "slam" : arrive énorme, se pose avec flou de mouvement et halo. */
export function slam(f, str, x, y, o) {
  const { ui, fx } = f;
  const t = o.t;
  if (t < 0) return 0;
  const p = E.outExpo(seg(t, 0, o.dur ?? 0.3));
  const out = o.out ?? 0;
  const a = seg(t, 0, 0.05) * (1 - out);
  if (a <= 0) return p;
  const sc = lerp(o.from ?? 2.6, 1, p) * (1 + (o.pulse ?? 0));
  const size = o.size;
  setFont(ui, size, o.weight ?? 700, 0);
  const w = textWidth(ui, str, size, o.weight ?? 700, o.tracking ?? -0.02);
  const draw = (g, alpha, s, color) => {
    g.save();
    g.translate(x, y - size * 0.35);
    g.scale(s, s);
    setFont(g, size, o.weight ?? 700, o.tracking ?? -0.02);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillText(str, -w / 2, size * 0.35);
    g.restore();
  };
  // traînée (motion blur) pendant l'arrivée
  if (p < 0.98) for (let k = 1; k <= 4; k++) draw(ui, a * 0.12 * (1 - p), sc * (1 + k * 0.08 * (1 - p)), o.color);
  draw(ui, a, sc, o.color);
  fx.save();
  fx.globalCompositeOperation = 'lighter';
  draw(fx, a * (o.glow ?? 0.3), sc, o.glowColor ?? o.color);
  fx.restore();
  return p;
}

/**
 * Sous-titres cinétiques qui SUIVENT LA VOIX : chaque mot apparaît à l'instant exact où il est
 * prononcé (marqueurs "L1.vidéos"…), retour à la ligne automatique, mots clés en couleur accent.
 * o = { size, maxW, emph: ['VIDÉOS'], color, accent, out (0→1), lead, upto (nb de mots affichés), lineH }
 */
export function captions(f, line, text, x, y, o) {
  const { ui, fx } = f;
  const C = f.cfg.colors;
  const size = o.size, wgt = o.weight ?? 700, trk = o.tracking ?? -0.01;
  // jetons affichés (la ponctuation isolée « ? » se colle au mot précédent) + clé du marqueur
  const toks = [];
  const seen = {};
  for (const raw of text.split(/\s+/)) {
    const core = (raw.match(/[\wÀ-ÿ'’-]+/g) || [])[0];
    if (!core) { if (toks.length) toks[toks.length - 1].s += raw; continue; }
    const n = (seen[core] = (seen[core] || 0) + 1);
    toks.push({ s: raw, key: `${line}.${core}${n > 1 ? '#' + n : ''}` });
  }
  const list = toks.slice(0, o.upto ?? toks.length);
  setFont(ui, size, wgt, 0);
  const space = textWidth(ui, ' ', size, wgt, 0) * 1.1;
  const rows = [[]];
  let w = 0;
  for (const tk of list) {
    tk.str = tk.s.toUpperCase();
    tk.w = textWidth(ui, tk.str, size, wgt, trk);
    if (w > 0 && w + space + tk.w > o.maxW) { rows.push([]); w = 0; }
    rows[rows.length - 1].push(tk);
    w += (w > 0 ? space : 0) + tk.w;
  }
  const lh = size * (o.lineH ?? 1.12);
  const out = o.out ?? 0;
  const emph = new Set((o.emph || []).map((s) => s.toUpperCase()));
  rows.forEach((row, r) => {
    const rw = row.reduce((s, tk, i) => s + tk.w + (i ? space : 0), 0);
    let cx = x - rw / 2;
    for (const tk of row) {
      const t0 = f.mark(tk.key, NaN);
      const t = f.t - t0 + (o.lead ?? 0.03);
      const p = E.outExpo(seg(t, 0, 0.2));
      const a = (Number.isNaN(t0) ? 1 : seg(t, 0, 0.06)) * (1 - out);
      if (a > 0.003) {
        const core = tk.str.replace(/[^\wÀ-ÿ'’-]/g, '');
        const hot = emph.has(core) || emph.has(core.replace(/[,.…?!]+$/, ''));
        const sc = lerp(1.45, 1, p);
        const yy = y + r * lh + (1 - p) * size * 0.22 - out * size * 0.4;
        const ccx = cx + tk.w / 2;
        for (const [g, alpha, col] of [[ui, a, hot ? (o.accent ?? C.neon2) : (o.color ?? C.white)], ...(hot && o.glow !== false ? [[fx, a * 0.5, C.neon]] : [])]) {
          g.save();
          if (g === fx) g.globalCompositeOperation = 'lighter';
          g.translate(ccx, yy - size * 0.35); g.scale(sc, sc); g.translate(-ccx, -(yy - size * 0.35));
          setFont(g, size, wgt, trk);
          g.textAlign = 'left'; g.textBaseline = 'alphabetic';
          g.globalAlpha = alpha;
          g.fillStyle = col;
          g.shadowColor = `rgba(0,0,0,${o.shadow ?? 0.6})`; g.shadowBlur = g === ui && (o.shadow ?? 0.6) > 0 ? size * 0.25 : 0;
          g.fillText(tk.str, cx, yy);
          g.restore();
        }
      }
      cx += tk.w + space;
    }
  });
  return rows.length * lh;
}

/** Plan texte en 3D (pour intégrer la typo dans la scène, avec profondeur de champ). */
export function textPlane(cfg, str, { color = '#ffffff', height = 1, weight = 700, tracking = -0.02, outline = false } = {}) {
  const probe = document.createElement('canvas').getContext('2d');
  const fs = 300;
  const w = Math.ceil(textWidth(probe, str, fs, weight, tracking) + fs * 0.6);
  const hh = Math.ceil(fs * 1.35);
  const tex = canvasTexture(w, hh, (g) => {
    setFont(g, fs, weight, tracking);
    g.textBaseline = 'alphabetic';
    if (outline) {
      g.lineWidth = 5;
      g.strokeStyle = color;
      g.strokeText(str, fs * 0.3, fs * 1.02);
    } else {
      g.fillStyle = color;
      g.fillText(str, fs * 0.3, fs * 1.02);
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * (w / hh), height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  return m;
}

/** Logo 2D : monogramme AP (dégradé métal) + DESIGN espacé. Retourne la largeur. */
export function drawLogo(g, f, x, y, h, a, o = {}) {
  if (a <= 0) return;
  const C = f.cfg.colors;
  const p = apPath2D();
  const mw = h * 1.56;
  g.save();
  g.globalAlpha = a;
  g.translate(x - mw / 2, y - h / 2);
  g.scale(h, h);
  const grd = g.createLinearGradient(0, 0, 1.56, 1);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.45, '#b9bcc6');
  grd.addColorStop(0.55, '#f2f3f7');
  grd.addColorStop(1, '#8c8f9a');
  g.fillStyle = grd;
  g.fill(p, 'evenodd');
  g.restore();
  if (o.word !== false) {
    const ws = h * (o.wordScale ?? 0.26);
    setFont(g, ws, 600, 0.62);
    g.save();
    g.globalAlpha = a * (o.wordAlpha ?? 1);
    g.fillStyle = C.white;
    g.textAlign = 'center';
    g.fillText(f.cfg.brand.word, x + ws * 0.31, y + h * 0.5 + ws * 1.5);
    g.restore();
  }
}

export function accentGlow(f, x, y, r, a) {
  f.fx.save();
  f.fx.globalCompositeOperation = 'lighter';
  radialGlow(f.fx, x, y, r, f.cfg.colors.neon, a);
  f.fx.restore();
}

export { E, seg, clamp, lerp, rgba, fitSize, textWidth, setFont };
