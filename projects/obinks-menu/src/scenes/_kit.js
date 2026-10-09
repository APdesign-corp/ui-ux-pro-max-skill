// ============================================================================
//  Kit commun des scènes 05 → 10 : caméra (whip pan d'entrée / de sortie, poussée lente),
//  placement écran → monde d'un produit 3D, texte simple, cartes produit.
//  Le whip pan est un vrai mouvement de caméra → flou de mouvement automatique (main.js) ;
//  le calque 2D suit avec shift(lt) (px).
// ============================================================================
import { E, clamp, lerp, seg, TAU } from '../core/anim.js';
import { P, brushStroke, priceTag, photo, neonFrame } from '../core/obinks.js';
import { setFont } from './03-tacos.js';

export function rig(ctx, { dur, FOV = 30, Z = 4.8, inT = 0.3, outT = 0.25, push = 0.35, whipIn = true, whipOut = true } = {}) {
  const { THREE, W, H, V } = ctx;
  const visH = 2 * Z * Math.tan((FOV * Math.PI) / 360), visW = visH * (W / H);
  const PANPX = V ? 1.1 * W : 0.75 * W, PAN = (PANPX / W) * visW;
  const pin = (lt) => (whipIn ? 1 - E.outCubic(seg(lt, 0, inT)) : 0);
  const pout = (lt) => (whipOut ? E.inCubic(seg(lt, dur - outT, dur)) : 0);
  const pan = (lt) => pin(lt) - pout(lt);
  const shift = (lt) => pan(lt) * PANPX;
  const camOf = (lt) => {
    const px = -PAN * pan(lt);
    const z = Z - push * E.inOutSine(clamp(lt / dur));
    return { pos: [px + Math.sin(lt * 0.7) * 0.06, 1.05 + Math.sin(lt * 0.9) * 0.03, z], target: [px, 0.05, 0], roll: Math.sin(lt * 0.6) * 0.006 - 0.025 * pan(lt), fov: FOV };
  };
  const pcam = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 300);
  const ndc = new THREE.Vector3(), dir = new THREE.Vector3(), out = new THREE.Vector3();
  // point du plan z = 0 vu à la fraction d'écran (fx, fy) — caméra SANS secousse
  const placeAt = (c, fx, fy) => {
    pcam.position.set(c.pos[0], c.pos[1], c.pos[2]);
    pcam.up.set(0, 1, 0);
    pcam.lookAt(c.target[0], c.target[1], c.target[2]);
    pcam.fov = c.fov; pcam.aspect = W / H; pcam.updateProjectionMatrix(); pcam.updateMatrixWorld(true);
    ndc.set(fx * 2 - 1, -(fy * 2 - 1), 0.5).unproject(pcam);
    dir.copy(ndc).sub(pcam.position).normalize();
    const k = (0 - pcam.position.z) / dir.z;
    return out.copy(pcam.position).addScaledVector(dir, k);
  };
  return { camOf, placeAt, shift, pan, visH, visW, PANPX };
}

/** Produit 3D posé à l'écran : chute en tournant (land), écrasement, rotation lente. */
export function placeFood(r, f, holder, spin, { fx, fy, s, t0 = 0, land = 0.3, spinBase = -0.5, tilt = 0.3, exit = null }) {
  const lt = f.lt;
  const fall = seg(lt, t0, t0 + land);
  const cam = r.camOf(lt);
  let y = fy - (1 - E.inCubic(fall)) * 0.75;
  const ex = exit ? E.inCubic(seg(lt, exit[0], exit[1])) : 0;
  const p = r.placeAt(cam, fx + r.shift(lt) / f.W, y);
  holder.position.copy(p);
  holder.position.y += ex * r.visH * 0.9;
  const hit = lt >= t0 + land ? Math.exp(-(lt - t0 - land) / 0.09) : 0;
  const sq = 0.16 * hit;
  holder.scale.set(s * (1 + sq * 0.6), s * (1 - sq), s * (1 + sq * 0.6));
  holder.rotation.set(tilt, 0, Math.sin(lt * 1.3) * 0.03);
  spin.rotation.set(0, spinBase + Math.sin(lt * 1.1) * 0.25 + (1 - E.outCubic(fall)) * -5.5 + ex * 2, 0);
  holder.visible = fall > 0 && ex < 1;
  return { landed: lt >= t0 + land, hit };
}

/** Texte simple contouré (Oswald / Bebas / Kaushan). Retourne la largeur. */
export function text(g, s, x, y, { size = 40, font = 'Oswald', weight = 700, color = '#fff', align = 'center', a = 1, stroke = 0.16, maxW = 0, base = 'middle', glow = 0 } = {}) {
  if (a <= 0.01) return 0;
  g.save();
  setFont(g, font, size, weight);
  let w = g.measureText(s).width;
  if (maxW && w > maxW) { size *= maxW / w; setFont(g, font, size, weight); w = maxW; }
  g.globalAlpha *= clamp(a);
  g.textAlign = align; g.textBaseline = base; g.lineJoin = 'round';
  if (stroke) { g.strokeStyle = 'rgba(8,2,2,0.95)'; g.lineWidth = size * stroke; g.strokeText(s, x, y); }
  if (glow) { g.shadowColor = P.neon; g.shadowBlur = size * 0.5 * glow; }
  g.fillStyle = color; g.fillText(s, x, y);
  g.restore();
  return w;
}

/** Carte produit : photo du menu, nom (Oswald), lignes de prix (jaune). p 0→1 = pop, hl = mise en avant. */
export function card(g, f, im, x, y, w, h, { name, prices = [], p = 1, hl = 0, seed = 0, u = 1, t = 0 }) {
  if (p <= 0) return;
  const q = E.outBack(seg(p, 0, 1), 1.6);
  g.save();
  g.translate(x, y);
  const sc = lerp(0.5, 1, q) * (1 + 0.06 * hl);
  g.scale(sc, sc);
  g.rotate((seed % 2 ? 0.02 : -0.02) + (1 - q) * 0.2);
  g.globalAlpha *= clamp(p * 3);
  // fond : plaque sombre + cadre néon
  g.fillStyle = 'rgba(14,6,6,0.82)';
  g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 14 * u); g.fill();
  neonFrame(g, -w / 2, -h / 2, w, h, { p: clamp(p * 1.4), t, seed: 30 + seed, radius: 14 * u, width: (hl ? 4.5 : 3) * u, glow: 0.4 + 0.8 * hl, flicker: 0.25 });
  const ph = h * 0.5;
  if (im) photo(g, im, 0, -h * 0.17, { h: ph, w: Math.min(w * 0.86, ph * ((im.w || 1) / (im.h || 1))), shadow: 0.7, glow: 0.2 + 0.5 * hl });
  text(g, name, 0, h * 0.16, { size: h * 0.12, maxW: w * 0.9, weight: 700 });
  const ps = prices.join('  ·  ');
  text(g, ps, 0, h * 0.34, { size: h * 0.13, font: 'Bebas Neue', weight: 400, color: P.yellow, maxW: w * 0.92 });
  g.restore();
}

/** Titre de rubrique sur trait de pinceau rouge (petit, en haut). */
export function rubric(g, s, x, y, size, p, seed = 1) {
  if (p <= 0) return;
  g.save();
  setFont(g, 'Bebas Neue', size, 400);
  const w = g.measureText(s).width;
  brushStroke(g, x, y, w + size * 1.2, size * 1.05, { color: P.red, seed, p: E.outCubic(seg(p, 0, 0.5)) });
  g.restore();
  text(g, s, x, y + size * 0.04, { size, font: 'Bebas Neue', weight: 400, a: seg(p, 0.15, 0.5), stroke: 0.08 });
}

/** Étoiles de note (remplissage fractionnaire). */
export function stars(g, x, y, r, value, { a = 1, gap = 0.35 } = {}) {
  g.save();
  g.globalAlpha *= a;
  const n = 5, step = r * 2 * (1 + gap), x0 = x - (step * (n - 1)) / 2;
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * step, fill = clamp(value - i);
    const path = new Path2D();
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + (k * TAU) / 10, rr = k % 2 ? r * 0.45 : r;
      const px = cx + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      k ? path.lineTo(px, py) : path.moveTo(px, py);
    }
    path.closePath();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(path);
    if (fill > 0) {
      g.save(); g.beginPath(); g.rect(cx - r, y - r, 2 * r * fill, 2 * r); g.clip();
      g.shadowColor = P.yellow; g.shadowBlur = r * 0.8; g.fillStyle = P.yellow; g.fill(path); g.restore();
    }
    g.strokeStyle = 'rgba(8,2,2,0.9)'; g.lineWidth = r * 0.08; g.stroke(path);
  }
  g.restore();
}

export { priceTag };
