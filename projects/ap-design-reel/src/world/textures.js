// Textures procédurales (Canvas) : écrans, gravure du dos, carte mère, batterie, hologrammes.

import * as THREE from 'three';
import { rng, rgba } from '../core/anim.js';
import { setFont } from '../core/draw.js';

export function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// Fond d'écran de marque : dégradés verts du site + rubans de lumière + logo G.
function wallpaper(g, w, h, cfg, variant = 0) {
  const lin = g.createLinearGradient(0, 0, w * 0.4, h);
  lin.addColorStop(0, '#1a1240');
  lin.addColorStop(0.6, '#07051a');
  lin.addColorStop(1, '#2a1d6b');
  g.fillStyle = lin;
  g.fillRect(0, 0, w, h);
  const rad = g.createRadialGradient(w * 0.2, 0, 0, w * 0.2, 0, h * 0.75);
  rad.addColorStop(0, 'rgba(123,97,255,0.9)');
  rad.addColorStop(1, 'rgba(123,97,255,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, w, h);
  // rubans lumineux
  g.globalCompositeOperation = 'lighter';
  const r = rng(3 + variant);
  for (let i = 0; i < 14; i++) {
    const y0 = h * (0.45 + r() * 0.5);
    g.beginPath();
    g.moveTo(-w * 0.2, y0);
    g.bezierCurveTo(w * 0.3, y0 - h * (0.2 + r() * 0.2), w * 0.6, y0 + h * 0.15, w * 1.2, y0 - h * (0.25 + r() * 0.15));
    g.strokeStyle = rgba(i % 3 ? cfg.colors.neon : cfg.colors.teal, 0.05 + r() * 0.12);
    g.lineWidth = w * (0.004 + r() * 0.03);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // logo G (pastille du site)
  const s = w * 0.3;
  const x = w / 2 - s / 2, y = h * 0.36 - s / 2;
  const bg = g.createLinearGradient(x, y, x + s, y + s);
  bg.addColorStop(0, cfg.colors.neon2);
  bg.addColorStop(1, cfg.colors.teal);
  g.shadowColor = rgba(cfg.colors.neon, 0.8);
  g.shadowBlur = w * 0.08;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(x, y, s, s, s * 0.3);
  g.fill();
  g.shadowBlur = 0;
  setFont(g, s * 0.62, 700, 0);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = cfg.colors.badgeInk;
  g.fillText(cfg.brand.badgeLetter, w / 2, h * 0.36 + s * 0.04);
  setFont(g, w * 0.085, 700, 0.12);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillText(cfg.brand.name, w / 2, h * 0.36 + s * 0.85);
  // Dynamic Island + barre home
  g.fillStyle = '#000';
  g.beginPath();
  g.roundRect(w / 2 - w * 0.14, h * 0.018, w * 0.28, w * 0.08, w * 0.04);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.roundRect(w / 2 - w * 0.17, h * 0.975, w * 0.34, w * 0.012, w * 0.006);
  g.fill();
}

export function screenTexture(cfg, { cracked = false, variant = 0 } = {}) {
  return canvasTexture(900, 1960, (g, w, h) => {
    wallpaper(g, w, h, cfg, variant);
    if (!cracked) return;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, w, h);
    const r = rng(41);
    const ox = w * 0.66, oy = h * 0.3;
    const branch = (x, y, ang, len, depth) => {
      if (depth <= 0 || len < 8) return;
      const segs = 3 + Math.floor(r() * 3);
      let px = x, py = y;
      g.beginPath();
      g.moveTo(px, py);
      for (let i = 0; i < segs; i++) {
        ang += (r() - 0.5) * 0.6;
        px += Math.cos(ang) * (len / segs);
        py += Math.sin(ang) * (len / segs);
        g.lineTo(px, py);
      }
      g.lineWidth = 1 + depth * 0.9;
      g.strokeStyle = `rgba(235,255,240,${0.35 + depth * 0.1})`;
      g.stroke();
      if (r() < 0.75) branch(px, py, ang + (r() - 0.5) * 1.6, len * 0.6, depth - 1);
      if (r() < 0.5) branch(px, py, ang - (r() - 0.5) * 1.6, len * 0.5, depth - 1);
    };
    for (let i = 0; i < 11; i++) branch(ox, oy, (i / 11) * Math.PI * 2 + r() * 0.3, h * (0.18 + r() * 0.35), 4);
    // anneaux concentriques autour de l'impact
    for (let k = 1; k <= 3; k++) {
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const rr = k * w * 0.035 * (0.8 + r() * 0.4);
        const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = 'rgba(235,255,240,0.45)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    const imp = g.createRadialGradient(ox, oy, 0, ox, oy, w * 0.08);
    imp.addColorStop(0, 'rgba(255,255,255,0.8)');
    imp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = imp;
    g.fillRect(ox - w * 0.1, oy - w * 0.1, w * 0.2, w * 0.2);
  });
}

// Gravure "GSM CENTER" au dos (comme sur la maquette du site)
export function engravingTexture(cfg) {
  return canvasTexture(1024, 256, (g, w, h) => {
    setFont(g, 92, 600, 0.34);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillText(cfg.brand.name, w / 2, h / 2);
  });
}

// Carte mère : PCB sombre, pistes vertes, pastilles dorées
export function pcbTexture(cfg) {
  return canvasTexture(512, 1024, (g, w, h) => {
    g.fillStyle = '#04110a';
    g.fillRect(0, 0, w, h);
    const r = rng(77);
    g.lineCap = 'round';
    for (let i = 0; i < 140; i++) {
      let x = r() * w, y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (r() < 0.5) x += (r() - 0.5) * 160;
        else y += (r() - 0.5) * 160;
        g.lineTo(x, y);
      }
      g.strokeStyle = rgba(r() < 0.3 ? cfg.colors.neon : '#1f8f4a', 0.35 + r() * 0.45);
      g.lineWidth = 1 + r() * 2.5;
      g.stroke();
      g.fillStyle = '#c9a54a';
      g.beginPath();
      g.arc(x, y, 2.5 + r() * 2, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(201,165,74,0.8)';
      g.fillRect(r() * w, r() * h, 6, 3);
    }
  });
}

export function batteryTexture(cfg) {
  return canvasTexture(512, 820, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#1b1f22');
    grd.addColorStop(1, '#0c0e10');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = cfg.colors.neon;
    g.fillRect(0, h * 0.12, w, 10);
    setFont(g, 64, 700, 0.1);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.textAlign = 'center';
    g.fillText('Li-ion', w / 2, h * 0.52);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 3;
    g.strokeRect(w * 0.3, h * 0.62, w * 0.4, h * 0.12);
    g.fillStyle = cfg.colors.neon;
    g.fillRect(w * 0.31, h * 0.63, w * 0.38, h * 0.1);
  });
}

// Hologramme d'une icône SVG du site (ex. wifi pour INTERNET)
export function iconHoloTexture(cfg, iconItems, size = 512) {
  return canvasTexture(size, size, (g, w) => {
    const s = w / 24;
    g.save();
    g.scale(s, s);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const it of iconItems) {
      g.strokeStyle = rgba(cfg.colors.neon, 0.3);
      g.lineWidth = 3.2;
      g.stroke(it.path2d);
      g.strokeStyle = '#d8ffe0';
      g.lineWidth = 1.2;
      g.stroke(it.path2d);
    }
    g.restore();
    // scanlines holographiques
    g.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < w; y += 6) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, y, w, 2);
    }
  });
}

// Grand titre en contour pour le fond 3D (typographie en profondeur)
export function outlineTextTexture(cfg, str) {
  return canvasTexture(4096, 820, (g, w, h) => {
    setFont(g, 640, 700, -0.02);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.strokeText(str, w / 2, h / 2 + 30);
  });
}
