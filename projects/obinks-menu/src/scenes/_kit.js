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

// ---------------------------------------------------------------------------------------------
//  AMBIANCE RÉALISTE (scènes 05 → 10) : la vraie rue du client (photo de la façade) en arrière-plan
//  très floue (profondeur de champ), étalonnée nuit/rouge, dérive lente (Ken Burns) + parallaxe ;
//  bokeh des lumières de rue, sol mouillé (reflet), faisceau de lampadaire volumétrique, brume,
//  flash léger sur les impacts. Tout est déterministe (t).
// ---------------------------------------------------------------------------------------------
const plates = new Map();
function plate(ctx) {
  const { W, H, world } = ctx;
  const key = W + 'x' + H;
  if (plates.has(key)) return plates.get(key);
  const im = world.images && world.images.facade && world.images.facade.img;
  let c = null;
  if (im && im.naturalWidth) {
    const k = im.naturalWidth / 1170, sy = 340 * k, sw = 1170 * k, sh = 1480 * k;
    const pw = Math.round(W / 5), ph = Math.round(H / 5); // petit → l'agrandissement floute
    c = document.createElement('canvas'); c.width = pw * 1.3; c.height = ph * 1.3;
    const g = c.getContext('2d');
    const s = Math.max(c.width / sw, c.height / sh);
    g.filter = 'blur(3px) saturate(1.25) contrast(1.1)';
    g.drawImage(im, 0, sy, sw, sh, (c.width - sw * s) / 2, (c.height - sh * s) / 2, sw * s, sh * s);
    g.filter = 'none';
    // étalonnage nuit : sombre, rouge dans les hautes lumières
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c07a70'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
  }
  plates.set(key, c);
  return c;
}
const BOKEH = Array.from({ length: 18 }, (_, i) => {
  const h = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: h(1), y: h(2) * 0.8, r: 0.012 + 0.05 * h(3) ** 2, c: h(4) < 0.55 ? [255, 42, 42] : h(4) < 0.85 ? [255, 170, 80] : [255, 240, 220], sp: 0.2 + h(5), ph: h(6) * 6.28, z: 0.3 + h(7) };
});
export function ambience(f, ctx, { dx = 0, seed = 0 } = {}) {
  const { W, H, V, u } = ctx;
  const { bg, fx, t, lt } = f;
  const m = Math.min(W, H);
  bg.save();
  bg.fillStyle = '#060404'; bg.fillRect(0, 0, W, H);
  const pl = plate(ctx);
  const floorY = H * (V ? 0.8 : 0.78);
  if (pl) {
    const s = Math.max(W / pl.width, H / pl.height) * (1.12 + 0.04 * Math.sin(lt * 0.25 + seed));
    const pw = pl.width * s, ph = pl.height * s;
    const ox = (W - pw) / 2 + dx * 0.25 + Math.sin(seed * 1.7) * W * 0.04 - lt * 6 * u, oy = (H - ph) / 2 - H * 0.04;
    bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
    bg.globalAlpha = 1;
    bg.drawImage(pl, ox, oy, pw, ph);
    // sol mouillé : reflet inversé, sombre, ondulant
    bg.save();
    bg.beginPath(); bg.rect(0, floorY, W, H - floorY); bg.clip();
    bg.globalAlpha = 0.45;
    bg.translate(Math.sin(t * 1.3) * 3 * u, floorY * 2); bg.scale(1, -1);
    bg.drawImage(pl, ox, oy, pw, ph);
    bg.restore();
    bg.globalAlpha = 1;
  }
  // assombrissement vers le haut et le bas (lisibilité des titres) + ligne d'horizon du trottoir
  let gr = bg.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(4,2,2,0.7)'); gr.addColorStop(0.3, 'rgba(4,2,2,0.2)');
  gr.addColorStop(0.62, 'rgba(4,2,2,0.15)'); gr.addColorStop(V ? 0.8 : 0.78, 'rgba(4,2,2,0.35)'); gr.addColorStop(1, 'rgba(4,2,2,0.75)');
  bg.fillStyle = gr; bg.fillRect(0, 0, W, H);
  gr = bg.createLinearGradient(0, floorY - 3 * u, 0, floorY + 6 * u);
  gr.addColorStop(0, 'rgba(255,60,50,0)'); gr.addColorStop(0.5, 'rgba(255,60,50,0.18)'); gr.addColorStop(1, 'rgba(255,60,50,0)');
  bg.fillStyle = gr; bg.fillRect(0, floorY - 3 * u, W, 9 * u);
  // bokeh (lumières de rue hors champ), parallaxe selon la profondeur
  bg.globalCompositeOperation = 'lighter';
  for (const b of BOKEH) {
    const x = ((b.x * 1.4 - 0.2) * W + dx * 0.35 * b.z - lt * 14 * u * b.z + 5 * W) % (1.4 * W) - 0.2 * W;
    const y = b.y * H + Math.sin(t * b.sp + b.ph) * 6 * u;
    const r = b.r * m * (V ? 1.3 : 1);
    const a = (0.05 + 0.07 * b.z) * (0.75 + 0.25 * Math.sin(t * 2.1 * b.sp + b.ph));
    const g2 = bg.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, `rgba(${b.c},${a * 0.7})`); g2.addColorStop(0.7, `rgba(${b.c},${a})`); g2.addColorStop(1, `rgba(${b.c},0)`);
    bg.fillStyle = g2; bg.beginPath(); bg.arc(x, y, r, 0, TAU); bg.fill();
  }
  bg.restore();
  // faisceau volumétrique d'un lampadaire (calque lumière, léger) + poussières dans le faisceau
  const lx = W * (V ? 0.82 : 0.86) + dx * 0.4;
  fx.save();
  fx.globalCompositeOperation = 'lighter';
  const fl = 0.85 + 0.15 * Math.sin(t * 7.3 + seed) * Math.sin(t * 3.1);
  gr = fx.createLinearGradient(lx, 0, lx - W * 0.1, floorY);
  gr.addColorStop(0, `rgba(255,70,50,${0.2 * fl})`); gr.addColorStop(1, 'rgba(255,40,30,0)');
  fx.fillStyle = gr;
  fx.beginPath(); fx.moveTo(lx - 12 * u, 0); fx.lineTo(lx + 12 * u, 0); fx.lineTo(lx + W * 0.12, floorY); fx.lineTo(lx - W * 0.32, floorY); fx.closePath(); fx.fill();
  for (let i = 0; i < 40; i++) {
    const h1 = Math.sin(i * 91.3 + seed) * 4375.85, q = h1 - Math.floor(h1);
    const yy = ((q * 7.1 + t * (0.03 + q * 0.04)) % 1) * floorY;
    const xx = lx + (q - 0.7) * (yy / floorY) * W * 0.4 + Math.sin(t * 0.7 + i) * 8 * u;
    fx.fillStyle = `rgba(255,200,170,${0.25 * (1 - yy / floorY)})`;
    fx.beginPath(); fx.arc(xx, yy, (0.8 + q * 1.6) * u, 0, TAU); fx.fill();
  }
  fx.restore();
  // flash réaliste (exposition) sur les impacts de la scène + étalonnage
  const post = f.post;
  let fl2 = 0;
  for (const c of f.cues) if (c.seg === f.seg.id && (c.type === 'impact' || c.type === 'slam' || c.type === 'boom')) {
    const d = f.t - c.t; if (d >= 0 && d < 0.25) fl2 = Math.max(fl2, Math.exp(-d / 0.05) * (c.type === 'boom' ? 0.35 : 0.18));
  }
  post.flash = Math.max(post.flash, fl2);
  post.flashColor = [1, 0.62, 0.52];
  post.vignette = Math.max(post.vignette || 0, 1.15);
}
