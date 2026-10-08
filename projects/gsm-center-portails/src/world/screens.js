// Écrans vivants des téléphones : chaque téléphone a sa propre texture Canvas redessinée à
// chaque image (interfaces animées, jamais d'image fixe). Palette GSM Center uniquement.
//
//   const scr = createScreen(cfg);  phone.setScreenMap(scr.tex);
//   scr.draw('search', lt, { text: 'Choisis ton smartphone', touch: { x: .5, y: .7, t: lt - 1.2 } });
//
// Applications : off, wake, home, search, list, counter, pills, repair, portal, map.

import * as THREE from 'three';
import { E, clamp, lerp, seg, rng, rgba, TAU } from '../core/anim.js';
import { C, touchRipple } from '../core/type.js';

export const SCREEN_W = 600, SCREEN_H = 1340;
const UI = (w, s) => `${w} ${s}px "Space Grotesk"`;
const DISP = (w, s) => `${w} ${s}px "Poppins"`;

function badge(g, x, y, s, a = 1) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  const bg = g.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
  bg.addColorStop(0, C.neon2);
  bg.addColorStop(1, C.teal);
  g.shadowColor = rgba(C.neon, 0.8);
  g.shadowBlur = s * 0.35;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, s * 0.3); g.fill();
  g.shadowBlur = 0;
  g.font = UI(700, s * 0.62);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = C.ink;
  g.fillText('G', x, y + s * 0.04);
  g.restore();
}

function wallpaper(g, w, h, t, variant = 0) {
  const lin = g.createLinearGradient(0, 0, w * 0.4, h);
  lin.addColorStop(0, '#0b4a22');
  lin.addColorStop(0.6, '#04140a');
  lin.addColorStop(1, '#0d6a32');
  g.fillStyle = lin; g.fillRect(0, 0, w, h);
  const rad = g.createRadialGradient(w * 0.2, 0, 0, w * 0.2, 0, h * 0.75);
  rad.addColorStop(0, 'rgba(20,160,80,0.95)');
  rad.addColorStop(1, 'rgba(20,160,80,0)');
  g.fillStyle = rad; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  const r = rng(3 + variant);
  for (let i = 0; i < 12; i++) {
    const y0 = h * (0.45 + r() * 0.5) + Math.sin(t * 0.8 + i) * h * 0.02;
    g.beginPath();
    g.moveTo(-w * 0.2, y0);
    g.bezierCurveTo(w * 0.3, y0 - h * (0.2 + r() * 0.2), w * 0.6, y0 + h * 0.15, w * 1.2, y0 - h * (0.25 + r() * 0.15));
    g.strokeStyle = rgba(i % 3 ? C.neon : C.teal, 0.05 + r() * 0.12);
    g.lineWidth = w * (0.004 + r() * 0.03);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

function darkUI(g, w, h) {
  const lin = g.createLinearGradient(0, 0, 0, h);
  lin.addColorStop(0, '#06120a');
  lin.addColorStop(1, '#020403');
  g.fillStyle = lin; g.fillRect(0, 0, w, h);
  const rad = g.createRadialGradient(w * 0.8, h * 0.05, 0, w * 0.8, h * 0.05, h * 0.5);
  rad.addColorStop(0, 'rgba(57,255,20,0.16)');
  rad.addColorStop(1, 'rgba(57,255,20,0)');
  g.fillStyle = rad; g.fillRect(0, 0, w, h);
}

function statusBar(g, w, h, light = true) {
  g.fillStyle = light ? 'rgba(244,248,244,0.92)' : 'rgba(0,0,0,0.8)';
  g.font = UI(600, 26);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('9:41', 46, 52);
  // réseau / wifi / batterie (pictos dessinés)
  const x = w - 150;
  for (let i = 0; i < 4; i++) g.fillRect(x + i * 9, 60 - i * 5, 6, 6 + i * 5);
  g.beginPath(); g.arc(x + 62, 64, 16, -2.4, -0.74); g.lineWidth = 4; g.strokeStyle = g.fillStyle; g.stroke();
  g.beginPath(); g.roundRect(x + 86, 42, 44, 22, 6); g.lineWidth = 2.5; g.stroke();
  g.fillRect(x + 90, 46, 32, 14);
}

function island(g, w) {
  g.fillStyle = '#000';
  g.beginPath(); g.roundRect(w / 2 - 92, 26, 184, 52, 26); g.fill();
}

function homeBar(g, w, h) {
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.roundRect(w / 2 - 100, h - 26, 200, 8, 4); g.fill();
}

const LIST = [
  ['Smartphones', 'Neufs & reconditionnés'],
  ['Réparation', 'Écran, batterie, connecteur'],
  ['Accessoires', 'Coques, chargeurs, écouteurs'],
  ['Multimédia', 'Écouteurs, chargeurs'],
  ['Internet', 'Cartes SIM'],
];

function drawApp(g, w, h, app, t, P) {
  if (!P.noClear) { if (g.reset) g.reset(); else g.clearRect(0, 0, w, h); }
  switch (app) {
    case 'off': {
      g.fillStyle = '#010201'; g.fillRect(0, 0, w, h);
      return;
    }
    case 'wake': {
      // allumage : noir → halo → pastille G (P.p 0→1)
      const p = clamp(P.p ?? seg(t, 0, 0.8));
      g.fillStyle = '#010201'; g.fillRect(0, 0, w, h);
      const k = E.outCubic(p);
      const rad = g.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, h * 0.6 * k + 1);
      rad.addColorStop(0, rgba(C.neon, 0.55 * k));
      rad.addColorStop(1, rgba(C.neon, 0));
      g.fillStyle = rad; g.fillRect(0, 0, w, h);
      badge(g, w / 2, h * 0.42, 190 * E.outBack(clamp(p * 1.4), 2), clamp(p * 2));
      g.font = DISP(600, 44); g.textAlign = 'center'; g.letterSpacing = '8px';
      g.fillStyle = rgba(C.white, clamp(p * 2 - 1));
      g.fillText('GSM CENTER', w / 2, h * 0.42 + 170);
      g.letterSpacing = '0px';
      break;
    }
    case 'home': {
      wallpaper(g, w, h, t, P.variant || 0);
      badge(g, w / 2, h * 0.34, 180, 1);
      g.font = DISP(600, 46); g.textAlign = 'center'; g.letterSpacing = '8px';
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.fillText('GSM CENTER', w / 2, h * 0.34 + 160);
      g.letterSpacing = '0px';
      g.font = DISP(200, 120); g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillText('9:41', w / 2, h * 0.16);
      // dock : pastilles qui apparaissent en cascade
      for (let i = 0; i < 4; i++) {
        const k = E.outBack(seg(t, 0.1 + i * 0.07, 0.45 + i * 0.07), 2.2);
        if (k <= 0) continue;
        const x = w * (0.2 + i * 0.2), y = h * 0.88;
        g.fillStyle = i % 2 ? rgba(C.teal, 0.9) : 'rgba(255,255,255,0.16)';
        g.beginPath(); g.roundRect(x - 48 * k, y - 48 * k, 96 * k, 96 * k, 28 * k); g.fill();
      }
      break;
    }
    case 'search': {
      darkUI(g, w, h);
      // barre de recherche + frappe + curseur
      const text = P.text || 'smartphone';
      const typed = clamp(Math.floor((t - (P.delay ?? 0.2)) * (P.cps || 14)), 0, text.length);
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.beginPath(); g.roundRect(36, 120, w - 72, 74, 37); g.fill();
      g.strokeStyle = rgba(C.neon, 0.6); g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(84, 157, 15, 0, TAU); g.strokeStyle = C.muted; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.moveTo(95, 168); g.lineTo(106, 179); g.stroke();
      g.font = UI(500, 32); g.textAlign = 'left'; g.textBaseline = 'middle';
      const shown = text.slice(0, typed);
      g.fillStyle = C.white; g.fillText(shown, 124, 158);
      const cw = g.measureText(shown).width;
      if (typed < text.length || Math.floor(t * 2.5) % 2 === 0) { g.fillStyle = C.neon; g.fillRect(128 + cw, 136, 4, 44); }
      // onglets
      g.font = UI(700, 30);
      ['Pour toi', 'Neufs', 'Reconditionnés'].forEach((s, i) => {
        g.fillStyle = i === 0 ? C.white : rgba(C.white, 0.5);
        g.fillText(s, 40 + i * 150 - (i === 2 ? 8 : 0), 250);
      });
      g.fillStyle = C.neon; g.fillRect(40, 274, 112, 5);
      // grille de résultats : cartes qui glissent une à une
      for (let i = 0; i < 6; i++) {
        const k = E.outExpo(seg(t, (P.gridAt ?? 0.9) + i * 0.08, (P.gridAt ?? 0.9) + i * 0.08 + 0.5));
        if (k <= 0) continue;
        const col = i % 2, row = Math.floor(i / 2);
        const x = 36 + col * ((w - 90) / 2 + 18), y = 310 + row * 330 + (1 - k) * 160;
        const cw2 = (w - 90) / 2;
        g.save();
        g.globalAlpha = k;
        const gr = g.createLinearGradient(x, y, x + cw2, y + 300);
        gr.addColorStop(0, i % 3 === 0 ? '#0d6a32' : i % 3 === 1 ? '#0b2a18' : '#14563a');
        gr.addColorStop(1, '#030806');
        g.fillStyle = gr;
        g.beginPath(); g.roundRect(x, y, cw2, 300, 26); g.fill();
        // mini téléphone dans la carte
        g.fillStyle = 'rgba(178,184,190,0.85)';
        g.beginPath(); g.roundRect(x + cw2 / 2 - 50, y + 38, 100, 196, 18); g.fill();
        g.fillStyle = i % 2 ? rgba(C.neon, 0.85) : rgba(C.teal, 0.85);
        g.beginPath(); g.roundRect(x + cw2 / 2 - 44, y + 44, 88, 184, 14); g.fill();
        g.fillStyle = 'rgba(244,248,244,0.92)';
        g.font = UI(600, 22);
        g.fillText(['Neuf', 'Reconditionné', 'Neuf', 'Reconditionné', 'Neuf', 'Neuf'][i], x + 16, y + 270);
        g.restore();
      }
      break;
    }
    case 'list': {
      darkUI(g, w, h);
      g.font = DISP(800, 64); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = C.white; g.fillText(P.title || 'Services', 40, 200);
      LIST.forEach(([a, b], i) => {
        const k = E.outExpo(seg(t, 0.15 + i * 0.09, 0.65 + i * 0.09));
        if (k <= 0) return;
        const y = 260 + i * 190;
        g.save();
        g.translate((1 - k) * w * 0.9, 0);
        g.globalAlpha = k;
        g.fillStyle = 'rgba(255,255,255,0.07)';
        g.beginPath(); g.roundRect(30, y, w - 60, 160, 30); g.fill();
        const gr = g.createLinearGradient(60, y + 30, 160, y + 130);
        gr.addColorStop(0, C.neon2); gr.addColorStop(1, C.teal);
        g.fillStyle = gr;
        g.beginPath(); g.arc(110, y + 80, 46, 0, TAU); g.fill();
        g.fillStyle = C.ink; g.font = UI(700, 40); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(i + 1), 110, y + 82);
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillStyle = C.white; g.font = UI(700, 38); g.fillText(a, 180, y + 72);
        g.fillStyle = C.muted; g.font = UI(500, 26); g.fillText(b, 180, y + 114);
        g.restore();
      });
      break;
    }
    case 'counter': {
      darkUI(g, w, h);
      const to = P.to ?? 100, dur = P.dur ?? 1.2;
      const v = Math.round(to * E.outCubic(seg(t, 0.1, 0.1 + dur)));
      const s = String(v) + (P.suffix ?? '%');
      // chiffres qui défilent (rouleaux)
      g.font = DISP(800, 190); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save();
      g.beginPath(); g.rect(0, h * 0.42 - 120, w, 240); g.clip();
      const roll = (t * 30) % 1;
      g.fillStyle = C.white;
      g.fillText(s, w / 2, h * 0.42 + (v < to ? (roll - 0.5) * 40 : 0));
      g.restore();
      // anneau de progression
      const pr = v / to;
      g.lineWidth = 16; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.1)';
      g.beginPath(); g.arc(w / 2, h * 0.42, 250, 0, TAU); g.stroke();
      g.strokeStyle = C.neon;
      g.shadowColor = C.neon; g.shadowBlur = 30;
      g.beginPath(); g.arc(w / 2, h * 0.42, 250, -Math.PI / 2, -Math.PI / 2 + TAU * pr); g.stroke();
      g.shadowBlur = 0;
      g.font = UI(700, 34); g.fillStyle = C.muted; g.letterSpacing = '6px';
      g.fillText(P.label || 'CHARGEMENT', w / 2, h * 0.42 + 340);
      g.letterSpacing = '0px';
      break;
    }
    case 'pills': {
      darkUI(g, w, h);
      for (let i = 0; i < 12; i++) {
        const k = E.outBack(seg(t, 0.05 + i * 0.06, 0.4 + i * 0.06), 2.4);
        if (k <= 0) continue;
        const col = i % 3, row = Math.floor(i / 3);
        const x = w * (0.22 + col * 0.28), y = h * (0.22 + row * 0.17);
        const R = 70 * k;
        g.fillStyle = [C.neon, C.teal, 'rgba(255,255,255,0.18)'][(i + row) % 3];
        g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
      }
      break;
    }
    case 'repair': {
      darkUI(g, w, h);
      const p = clamp(P.p ?? seg(t, 0.1, 1.6));
      const v = Math.round(100 * E.inOutCubic(p));
      g.font = DISP(800, 150); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = C.white; g.fillText(v + '%', w / 2, h * 0.36);
      g.lineWidth = 14; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.1)';
      g.beginPath(); g.arc(w / 2, h * 0.36, 230, 0, TAU); g.stroke();
      g.strokeStyle = C.neon; g.shadowColor = C.neon; g.shadowBlur = 30;
      g.beginPath(); g.arc(w / 2, h * 0.36, 230, -Math.PI / 2, -Math.PI / 2 + TAU * v / 100); g.stroke();
      g.shadowBlur = 0;
      ['ÉCRAN', 'BATTERIE', 'CONNECTEUR'].forEach((s, i) => {
        const ok = v >= 34 * (i + 1) - 2;
        const y = h * 0.66 + i * 110;
        g.fillStyle = 'rgba(255,255,255,0.07)';
        g.beginPath(); g.roundRect(50, y - 45, w - 100, 90, 45); g.fill();
        g.fillStyle = ok ? C.neon : 'rgba(255,255,255,0.2)';
        g.beginPath(); g.arc(100, y, 24, 0, TAU); g.fill();
        if (ok) {
          g.strokeStyle = C.ink; g.lineWidth = 6;
          g.beginPath(); g.moveTo(88, y); g.lineTo(98, y + 10); g.lineTo(114, y - 10); g.stroke();
        }
        g.fillStyle = C.white; g.font = UI(700, 32); g.textAlign = 'left';
        g.fillText(s, 146, y + 2);
        g.textAlign = 'center';
      });
      break;
    }
    case 'portal': {
      // écran « portail » : lumière qui envahit tout (P.p 0→1) pour les traversées
      const p = clamp(P.p ?? 0);
      g.fillStyle = '#010201'; g.fillRect(0, 0, w, h);
      const rad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * (0.2 + 0.9 * p));
      rad.addColorStop(0, rgba('#ffffff', 0.4 + 0.6 * p));
      rad.addColorStop(0.25, rgba(C.neon2, 0.9));
      rad.addColorStop(0.7, rgba(C.teal, 0.5 * (0.4 + p)));
      rad.addColorStop(1, rgba(C.deep, 0));
      g.fillStyle = rad; g.fillRect(0, 0, w, h);
      // anneaux concentriques aspirés vers le centre
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const k = ((i / 9) - t * 1.6) % 1;
        const r = (k < 0 ? k + 1 : k) * h * 0.8;
        g.strokeStyle = rgba(C.neon, 0.35 * (1 - r / (h * 0.8)));
        g.lineWidth = 6;
        g.beginPath(); g.roundRect(w / 2 - r * 0.45, h / 2 - r, r * 0.9, r * 2, r * 0.2); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      break;
    }
    case 'map': {
      // carte de nuit stylisée (aperçu de Liège vu d'en haut)
      g.fillStyle = '#020503'; g.fillRect(0, 0, w, h);
      const r = rng(5);
      g.strokeStyle = 'rgba(57,255,20,0.25)'; g.lineWidth = 3;
      for (let i = 0; i < 26; i++) {
        g.beginPath();
        const x = r() * w, y = r() * h;
        g.moveTo(x - 400, y + (r() - 0.5) * 300); g.lineTo(x + 400, y + (r() - 0.5) * 300); g.stroke();
      }
      g.strokeStyle = 'rgba(20,224,160,0.5)'; g.lineWidth = 34;
      g.beginPath(); g.moveTo(w * 0.1, -20); g.bezierCurveTo(w * 0.5, h * 0.3, w * 0.2, h * 0.6, w * 0.8, h + 20); g.stroke();
      const pk = 0.5 + 0.5 * Math.sin(t * 6);
      g.fillStyle = C.neon; g.shadowColor = C.neon; g.shadowBlur = 40;
      g.beginPath(); g.arc(w * 0.55, h * 0.42, 22 + pk * 6, 0, TAU); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = rgba(C.neon, 1 - pk); g.lineWidth = 4;
      g.beginPath(); g.arc(w * 0.55, h * 0.42, 40 + pk * 80, 0, TAU); g.stroke();
      break;
    }
    default:
      g.fillStyle = '#010201'; g.fillRect(0, 0, w, h);
  }
  if (P.touch) touchRipple(g, P.touch.x * w, P.touch.y * h, P.touch.t, 1.6, C.white);
  if (app !== 'off' && app !== 'portal') {
    statusBar(g, w, h, true);
    island(g, w);
    homeBar(g, w, h);
  }
  // reflet doux en diagonale (vitre)
  const ref = g.createLinearGradient(0, 0, w, h * 0.6);
  ref.addColorStop(0, 'rgba(255,255,255,0.06)');
  ref.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = ref; g.fillRect(0, 0, w, h);
  if (P.brightness !== undefined && P.brightness < 1) {
    g.fillStyle = `rgba(0,0,0,${1 - P.brightness})`;
    g.fillRect(0, 0, w, h);
  }
}

export function createScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  return {
    canvas, g, tex,
    /** Redessine l'écran : app (voir liste), t = temps local de l'app (s), P = paramètres. */
    draw(app, t, P = {}) {
      drawApp(g, SCREEN_W, SCREEN_H, app, t, P);
      tex.needsUpdate = true;
    },
  };
}

/** Utilitaire : dessine une app dans n'importe quel contexte 2D (ex. carte 3D du tunnel). */
export function drawScreenApp(g, w, h, app, t, P = {}) {
  g.save();
  g.scale(w / SCREEN_W, h / SCREEN_H);
  g.beginPath(); g.rect(0, 0, SCREEN_W, SCREEN_H); g.clip();
  drawApp(g, SCREEN_W, SCREEN_H, app, t, { ...P, noClear: true });
  g.restore();
}

export { lerp };
