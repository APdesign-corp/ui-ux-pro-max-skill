// Charte Prime N'Joy recréée en vectoriel pour l'animation : dégradé de marque, cercle de points
// (halftone) du logo, icônes TV / Wi-Fi / mobile / antenne / éclair, écran TV/smartphone, filigrane MAQUETTE.

import { rng, TAU, E, seg, lerp, clamp } from '../core/anim.js';

export const STOPS = [[0, '#1fa2e6'], [0.3, '#2456e0'], [0.5, '#7b2fc4'], [0.68, '#e62f77'], [1, '#ff7a1a']];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RGB = STOPS.map(([p, c]) => [p, hex(c)]);

/** Couleur du dégradé de marque en p ∈ [0,1]. */
export function brandAt(p, a = 1) {
  p = clamp(p);
  let i = 0;
  while (i < RGB.length - 2 && p > RGB[i + 1][0]) i++;
  const [p0, c0] = RGB[i], [p1, c1] = RGB[i + 1];
  const k = (p - p0) / (p1 - p0 || 1);
  const c = c0.map((v, j) => Math.round(lerp(v, c1[j], k)));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function brandGradient(g, x0, y0, x1, y1, shift = 0) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [p, c] of STOPS) gr.addColorStop(clamp(p * (1 - Math.abs(shift)) + Math.max(0, shift)), c);
  return gr;
}

// ---------------------------------------------------------------- cercle de points (logo)
/** Points du logo : anneaux concentriques, gros près du trou central, plus petits et clairsemés vers l'extérieur. */
export function ringDots(seed = 5) {
  const r = rng(seed);
  const dots = [];
  for (let k = 0; k < 9; k++) {
    const rad = 0.42 + k * 0.075;
    const n = Math.round((TAU * rad) / (0.05 + k * 0.004));
    const off = r() * TAU;
    for (let i = 0; i < n; i++) {
      const keep = 1 - k * 0.075;
      if (r() > keep) continue;
      const a = off + (i / n) * TAU + (r() - 0.5) * 0.04;
      const rr = rad + (r() - 0.5) * 0.025;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      // couleur : gauche cyan/bleu → haut/bas violet-magenta → droite orange
      const p = clamp((x / 1.1 + 0.5) * 0.92 + (y > 0 ? 0.06 : -0.02) * (1 - Math.abs(x)));
      dots.push({ x, y, s: (0.026 - k * 0.0024) * (0.85 + r() * 0.3), p, k, rnd: r(), ang: a, sx: r(), sy: r() });
    }
  }
  return dots;
}

/**
 * Dessine le cercle de points. o = { form: 0..1 (rassemblement depuis la dispersion), spin, pulse, alpha,
 * scatter: 'vortex' | 'burst', scatterR }
 */
export function drawRing(g, dots, cx, cy, R, o = {}) {
  const form = o.form ?? 1, alpha = o.alpha ?? 1, spin = o.spin ?? 0, pulse = o.pulse ?? 0;
  for (const d of dots) {
    const st = d.rnd * 0.35 + d.k * 0.02;
    const k = E.outCubic(seg(form, st, st + 0.6));
    if (k <= 0 && form < 1) {
      if (!o.showScatter) continue;
    }
    const a = d.ang + spin * (1 + d.k * 0.05);
    const rr = Math.hypot(d.x, d.y) * (1 + pulse * (0.15 + d.k * 0.02));
    let x = cx + Math.cos(a) * rr * R, y = cy + Math.sin(a) * rr * R;
    if (k < 1) {
      const sr = o.scatterR ?? R * 4;
      let sx, sy;
      if (o.scatter === 'burst') { sx = cx + Math.cos(a) * sr * (0.6 + d.sx); sy = cy + Math.sin(a) * sr * (0.6 + d.sy); }
      else { const aa = a + 2.6 * (1 - k); sx = cx + Math.cos(aa) * sr * (0.5 + d.sx); sy = cy + Math.sin(aa) * sr * (0.5 + d.sy); }
      x = lerp(sx, x, k); y = lerp(sy, y, k);
    }
    const s = d.s * R * (0.4 + 0.6 * k) * (1 + pulse * 0.3);
    // couleur selon la position À L'ÉCRAN (bleu à gauche, orange à droite, comme le logo), même en rotation
    const nx = (x - cx) / R, ny = (y - cy) / R;
    const pc = clamp(nx * 0.62 + 0.5 + (ny > 0 ? 0.05 : -0.03) * (1 - Math.abs(nx)));
    g.fillStyle = brandAt(o.fixedColor ? d.p : pc, alpha * (0.35 + 0.65 * Math.max(k, 0.2)));
    g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
}

// ---------------------------------------------------------------- icônes (traits arrondis, unités = taille s)
export const ICONS = {
  tv(g, x, y, s) {
    g.beginPath(); g.roundRect(x - s * 0.42, y - s * 0.3, s * 0.84, s * 0.52, s * 0.06); g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.15, y + s * 0.36); g.lineTo(x + s * 0.15, y + s * 0.36); g.moveTo(x, y + s * 0.22); g.lineTo(x, y + s * 0.36); g.stroke();
  },
  wifi(g, x, y, s) {
    for (const [r, a] of [[0.46, 0.75], [0.31, 0.75], [0.16, 0.75]]) { g.beginPath(); g.arc(x, y + s * 0.22, s * r, -Math.PI / 2 - a, -Math.PI / 2 + a); g.stroke(); }
    g.beginPath(); g.arc(x, y + s * 0.24, s * 0.045, 0, TAU); g.fill();
  },
  phone(g, x, y, s) {
    g.beginPath(); g.roundRect(x - s * 0.2, y - s * 0.38, s * 0.4, s * 0.76, s * 0.07); g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.05, y + s * 0.28); g.lineTo(x + s * 0.05, y + s * 0.28); g.stroke();
  },
  antenna(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y - s * 0.12); g.lineTo(x - s * 0.18, y + s * 0.36); g.moveTo(x, y - s * 0.12); g.lineTo(x + s * 0.18, y + s * 0.36);
    g.moveTo(x - s * 0.1, y + s * 0.12); g.lineTo(x + s * 0.1, y + s * 0.12); g.moveTo(x - s * 0.14, y + s * 0.24); g.lineTo(x + s * 0.14, y + s * 0.24); g.stroke();
    g.beginPath(); g.arc(x, y - s * 0.14, s * 0.05, 0, TAU); g.fill();
    for (const r of [0.16, 0.27]) { g.beginPath(); g.arc(x, y - s * 0.14, s * r, -Math.PI * 0.85, -Math.PI * 0.6); g.stroke(); g.beginPath(); g.arc(x, y - s * 0.14, s * r, -Math.PI * 0.4, -Math.PI * 0.15); g.stroke(); }
  },
  bolt(g, x, y, s) {
    g.beginPath(); g.moveTo(x + s * 0.08, y - s * 0.4); g.lineTo(x - s * 0.2, y + s * 0.06); g.lineTo(x - s * 0.01, y + s * 0.06); g.lineTo(x - s * 0.08, y + s * 0.4); g.lineTo(x + s * 0.22, y - s * 0.08); g.lineTo(x + s * 0.02, y - s * 0.08); g.closePath(); g.fill();
  },
};

/** Pastille icône : cercle à contour dégradé (style affiche) ou disque plein. */
export function iconBadge(g, name, x, y, R, o = {}) {
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.translate(x, y); g.scale(o.scale ?? 1, o.scale ?? 1); g.translate(-x, -y);
  if (o.fill) {
    g.fillStyle = o.fill; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
    g.strokeStyle = g.fillStyle = o.ink ?? '#fff';
  } else {
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
    g.lineWidth = R * 0.08; g.strokeStyle = brandGradient(g, x - R, y - R, x + R, y + R, o.shift ?? 0); g.stroke();
    g.strokeStyle = g.fillStyle = o.ink ?? brandGradient(g, x - R, y - R, x + R, y + R, o.shift ?? 0);
  }
  g.lineWidth = R * 0.085; g.lineCap = 'round'; g.lineJoin = 'round';
  ICONS[name](g, x, y, R * 1.15);
  g.restore();
}

// ---------------------------------------------------------------- écran (TV / smartphone)
export function drawScreen(g, w, h, dots, o = {}) {
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#2340d8'); gr.addColorStop(0.45, '#7b2fc4'); gr.addColorStop(0.75, '#e62f77'); gr.addColorStop(1, '#ff8a1a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // vagues lumineuses
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    const y0 = h * (0.55 + i * 0.07);
    g.moveTo(-w * 0.1, y0);
    g.bezierCurveTo(w * 0.3, y0 - h * 0.2, w * 0.6, y0 + h * 0.15, w * 1.1, y0 - h * 0.12);
    g.strokeStyle = `rgba(255,255,255,${0.05 + i * 0.02})`; g.lineWidth = Math.min(w, h) * 0.01; g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  if (o.logo !== false) {
    const R = Math.min(w, h) * (o.logoR ?? 0.22);
    const cy = h * (o.logoY ?? 0.42);
    // points blancs sur l'écran (comme sur l'affiche)
    for (const d of dots) { g.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * (1 - d.k / 9)})`; g.beginPath(); g.arc(w / 2 + d.x * R, cy + d.y * R, d.s * R, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = `600 ${Math.round(R * 0.42)}px Poppins, sans-serif`;
    g.fillText("PRIME N'JOY", w / 2, cy + R * 1.65);
  }
}

// ---------------------------------------------------------------- filigrane MAQUETTE
/** Filigrane couvrant (diagonales répétées + bandeau + mention) : rend la maquette inutilisable telle quelle. */
export function drawWatermark(g, W, H, wm, t) {
  const u = Math.min(W, H) / 1080;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // motif diagonal répété sur toute l'image
  g.translate(W / 2, H / 2);
  g.rotate(-0.42);
  const fs = 54 * u;
  g.font = `800 ${fs}px Poppins, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = `${wm.text}  •  ${wm.by}  •  `;
  const lw = g.measureText(label).width;
  for (let row = -14; row <= 14; row++) {
    const y = row * fs * 3.1;
    const dx = (row % 2) * lw * 0.5;
    for (let col = -4; col <= 4; col++) {
      const x = col * lw + dx;
      g.lineWidth = 2.2 * u; g.strokeStyle = 'rgba(0,0,0,0.16)'; g.strokeText(label, x, y);
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillText(label, x, y);
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // gros « MAQUETTE » central semi-transparent
  g.translate(W / 2, H * 0.5);
  g.rotate(-0.42);
  g.font = `900 ${200 * u}px Poppins, sans-serif`;
  g.lineWidth = 5 * u; g.strokeStyle = 'rgba(255,255,255,0.32)'; g.strokeText(wm.text, 0, 0);
  g.strokeStyle = 'rgba(13,27,94,0.22)'; g.lineWidth = 2 * u; g.strokeText(wm.text, 0, 0);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillText(wm.text, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // bandeau d'information en haut
  const bh = 64 * u;
  g.fillStyle = 'rgba(13,27,94,0.82)';
  g.fillRect(0, H * 0.035, W, bh);
  g.fillStyle = '#fff'; g.font = `700 ${26 * u}px Poppins, sans-serif`; g.textAlign = 'center';
  g.fillText(`${wm.text} ${wm.by} — ${wm.note}`, W / 2, H * 0.035 + bh / 2 + 1);
  // compteur de temps (empêche de recadrer proprement) — omis si t est null (ajouté par ffmpeg)
  if (t == null) { g.restore(); return; }
  g.font = `600 ${22 * u}px Poppins, sans-serif`; g.textAlign = 'right';
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3 * u;
  const tc = `APERÇU ${t.toFixed(2)} s`;
  g.strokeText(tc, W * 0.95, H * 0.965); g.fillText(tc, W * 0.95, H * 0.965);
  g.restore();
}
