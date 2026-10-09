// ============================================================================
//  04 — SANDWICH & HAMBURGER (13.5 → 24.5 s, 22 temps à 120 BPM) — le cœur de la vidéo
// ============================================================================
//  0.00  noir (raccord : le néon des tacos vient de couper) → les lampadaires de la rue
//        grésillent puis s'allument ; logo O'BINKS ; « SANDWICH » claque (0.1), « & » (0.3),
//        « HAMBURGER » (0.5) — comme l'en-tête du menu (capture 4)
//  0.80  WHIP : la caméra file le long de la rue jusqu'au 1er produit
//  1.00 → 9.00  les 8 recettes, UNE PAR TEMPS FORT (1 s chacune), alternativement en sandwich
//        (pain long) et en hamburger (pain rond) — produit 3D procédural qui s'ouvre en VUE
//        ÉCLATÉE (étiquettes d'ingrédients) puis se referme avec un impact (miettes) ; nom en
//        brush sur trait de pinceau rouge, « SANDWICH » / « HAMBURGER » au-dessus, étiquettes néon
//        SEUL / MENU (prix exacts FACTS §3). Entre deux recettes, la caméra file (whip + zoom) :
//        le lampadaire de droite devient celui de gauche (parallaxe du mur de briques).
//  8.85  la caméra recule d'un coup → 9.00 RÉCAP : les 8 recettes en grille (photos du menu,
//        cadres néon, prix) en sandwich, 9.50 « SANDWICH OU HAMBURGER : MÊMES PRIX »,
//        10.00 les cartes se retournent : les mêmes recettes en hamburger, mêmes prix.
//  10.50 la fumée de la rue envahit l'écran → presque noir enfumé à 11.0 (raccord Kapsalone).
//  Textes et prix : FACTS.md §3 uniquement.
// ============================================================================
import { E, clamp, lerp, seg, pulse, rgba, TAU } from '../core/anim.js';
import { createFood, createFoodLights } from '../world/food.js';
import { P, brushStroke, brushTitle, priceTag, neonFrame, smoke, streetBackdrop, particles, photo, splatter } from '../core/obinks.js';

const R = [
  { id: 'ocheesy', name: "O'CHEESY", seul: '6,00€', menu: '10,00€', kind: 'sandwich', red: -1 },
  { id: 'doublesmash', name: 'DOUBLE SMASH', seul: '6,00€', menu: '10,00€', kind: 'burger', red: 7 },
  { id: 'raclette', name: 'RACLETTE', seul: '7,00€', menu: '11,00€', kind: 'sandwich', red: -1 },
  { id: 'ocrispy', name: "O'CRISPY", seul: '7,00€', menu: '11,00€', kind: 'burger', red: 2 },
  { id: 'opepper', name: "O'PEPPER", seul: '7,00€', menu: '11,00€', kind: 'sandwich', red: 2 },
  { id: 'chevremiel', name: 'CHÈVRE MIEL', seul: '8,00€', menu: '12,00€', kind: 'burger', red: -1 },
  { id: 'barbecue', name: 'BARBECUE', seul: '8,00€', menu: '12,00€', kind: 'sandwich', red: 0 },
  { id: 'bigbinks', name: 'BIG BINKS', seul: '10,00€', menu: '14,00€', kind: 'burger', red: -1 },
];
const KIND_LABEL = { sandwich: 'SANDWICH', burger: 'HAMBURGER' };
const A0 = 1.0, STEP = 1.0;                  // arrivée de la recette i à A0 + i·STEP (sur le temps)
const WHIP = [-0.2, 0.02];                   // fenêtre du whip autour de l'arrivée
const OPEN = [0.04, 0.3], CLOSE = [0.56, 0.75];
const T_BACK = 8.85, T_GRID = 9.0, T_SAME = 9.5, T_FLIP = 10.0, T_SMOKE = 10.5;
const D = 6;                                 // écart entre deux recettes (unités monde)
const arrival = (i) => A0 + i * STEP;

export const cues = [
  { t: 0.0, type: 'zap', gain: 0.7, pan: -0.6 },
  { t: 0.1, type: 'zap', gain: 0.5, pan: 0.6 },
  { t: 0.12, type: 'impact', gain: 1 },
  { t: 0.32, type: 'hit', gain: 0.6 },
  { t: 0.5, type: 'impact', gain: 0.9 },
  ...R.flatMap((r, i) => {
    const a = arrival(i);
    return [
      { t: a + WHIP[0], type: 'whip', dur: 0.22, gain: 0.75 },
      { t: a, type: 'hit', gain: 0.85 },
      { t: a + 0.05, type: 'swish', gain: 0.5 },
      { t: a + 0.12, type: 'pop', gain: 0.45, pan: 0.3 },
      { t: a + CLOSE[1], type: 'impact', gain: 0.55 },
      { t: a + CLOSE[1] + 0.01, type: 'crunch', gain: 0.5 },
    ];
  }),
  { t: T_BACK, type: 'whoosh', dur: 0.15, gain: 0.8 },
  { t: T_GRID, type: 'hit', gain: 0.8 },
  ...[0, 1, 2, 3].map((k) => ({ t: T_GRID + 0.06 + k * 0.12, type: 'pop', gain: 0.45, pan: -0.6 + k * 0.4 })),
  { t: T_SAME, type: 'impact', gain: 0.9 },
  { t: T_FLIP, type: 'swish', gain: 0.8 },
  { t: T_FLIP + 0.05, type: 'whip', dur: 0.15, gain: 0.5 },
  { t: T_SMOKE, type: 'whoosh', dur: 0.5, gain: 0.8 },
  { t: T_SMOKE + 0.1, type: 'sub', dur: 0.4, gain: 0.5 },
];

// ------------------------------------------------------------------ dessin 2D local
function setFont(g, family, size, weight = 400, ls = 0) {
  g.font = `${weight} ${size}px "${family}"`;
  g.letterSpacing = `${ls}px`;
}

/** Étiquette d'ingrédient : point jaune + filet + texte Oswald contouré. Bascule de côté si elle sort. */
function ingLabel(g, x, y, text, side, a, size, u, S) {
  if (a <= 0.01) return;
  g.save();
  setFont(g, 'Oswald', size, 600);
  const tw = g.measureText(text).width;
  const len = 24 * u * E.outCubic(clamp(a * 1.4));
  g.globalAlpha *= a;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 2.2 * u;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + side * len, y); g.stroke();
  g.fillStyle = P.yellow;
  g.beginPath(); g.arc(x, y, 5 * u, 0, TAU); g.fill();
  let tx = x + side * (len + 8 * u);
  if (side < 0) tx = Math.max(tx, S.l + tw); else tx = Math.min(tx, S.r - tw);
  g.textBaseline = 'middle';
  g.textAlign = side > 0 ? 'left' : 'right';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(8,2,2,0.92)';
  g.lineWidth = size * 0.2;
  g.strokeText(text, tx, y);
  g.fillStyle = '#ffffff';
  g.fillText(text, tx, y);
  g.restore();
}

/** Petit sur-titre (SANDWICH / HAMBURGER) : Oswald espacé sur pastille rouge. */
function eyebrow(g, text, x, y, size, p, u) {
  if (p <= 0) return;
  g.save();
  setFont(g, 'Oswald', size, 700, size * 0.18);
  const w = g.measureText(text).width;
  const q = E.outCubic(p);
  g.globalAlpha *= clamp(p * 2);
  g.fillStyle = P.red;
  g.shadowColor = rgba(P.neon, 0.8);
  g.shadowBlur = 16 * u;
  g.beginPath(); g.roundRect(x - (w / 2 + size * 0.45) * q, y - size * 0.72, (w + size * 0.9) * q, size * 1.44, size * 0.3); g.fill();
  g.shadowBlur = 0;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText(text, x + size * 0.09, y + size * 0.04);
  g.restore();
}

export default function create(ctx) {
  const { THREE, W, H, V, u, L, world } = ctx;
  const S = L.safe;
  const I = world.images || {};
  const group = new THREE.Group();

  // lumières qui suivent la caméra (cibles des directionnelles dans le même groupe)
  const lights = createFoodLights({ key: 1.2, rim: 1.0, fill: 1.15 });
  for (const l of Object.values(lights.userData)) if (l.target) lights.add(l.target);
  group.add(lights);

  // ---- caméra
  const FOV = 30, DIST = V ? 5.4 : 5.2, ELEV = 1.05;
  const visH = 2 * DIST * Math.tan((FOV * Math.PI) / 360), visW = visH * (W / H);
  const HERO = V ? { fx: 0.5, fy: 0.45, fw: 0.8, fh: 0.35 } : { fx: 0.305, fy: 0.55, fw: 0.42, fh: 0.7 };
  const offX = (0.5 - HERO.fx) * visW;
  const offY = (HERO.fy - 0.5) * visH;
  const SPREAD = V ? 1.0 : 1.05;

  // ---- les 8 recettes 3D, une par station le long de la rue
  const stations = R.map((r, i) => {
    const food = createFood(r.kind, { id: r.id });
    const holder = new THREE.Group();
    const spin = new THREE.Group();
    holder.add(spin);
    spin.add(food.group);
    food.group.position.y = -food.height / 2;
    const s = Math.min((HERO.fw * visW) / Math.max(food.width, food.depth), (HERO.fh * visH) / food.explodedHeight(SPREAD));
    holder.position.set(i * D, 0, 0);
    group.add(holder);
    return { r, i, food, holder, spin, s, labels: food.layers.filter((l) => !l.minor) };
  });

  // scroll (en stations) : −1 = titre, i = recette i ; chaque whip ajoute 1
  const scrollAt = (lt) => {
    let s = -1;
    for (let i = 0; i < R.length; i++) s += E.inOutCubic(seg(lt, arrival(i) + WHIP[0], arrival(i) + WHIP[1]));
    return s;
  };
  const whipBump = (lt) => {
    let b = 0;
    for (let i = 0; i < R.length; i++) b += Math.sin(Math.PI * seg(lt, arrival(i) + WHIP[0], arrival(i) + WHIP[1]));
    return b;
  };
  const camOf = (lt) => {
    const s = scrollAt(lt);
    const back = E.inCubic(seg(lt, T_BACK, T_GRID + 0.1));
    const hold = lt < A0 ? lt / A0 : ((lt - A0) % STEP) / STEP;
    const dist = DIST * (1 + 0.16 * whipBump(lt) - 0.045 * E.inOutSine(hold) + 2.2 * back);
    const x = s * D + offX;
    const orbit = Math.sin(lt * 0.9) * 0.18;
    return {
      pos: [x + orbit, offY + ELEV * (dist / DIST) * 0.9 + back * 0.6, dist],
      target: [x, offY, 0],
      roll: Math.sin(lt * 0.7) * 0.008 + 0.03 * whipBump(lt) * (V ? 0.5 : 1),
      fov: FOV,
    };
  };

  // ---- mise en page 2D (pixels) — relative au produit au repos
  const LY = V ? {
    eyebrow: { x: W / 2, y: H * 0.152, size: 33 * u },
    name: { x: W / 2, y: H * 0.222, size: 118 * u, maxW: S.w * 0.86 },
    seul: { x: W * 0.285, y: H * 0.695, size: 118 * u },
    menu: { x: W * 0.715, y: H * 0.695, size: 118 * u },
    label: 32 * u,
    intro: { logo: [W / 2, H * 0.2, S.w * 0.5], a: [W / 2, H * 0.355, 190 * u], amp: [W / 2, H * 0.448, 150 * u], b: [W / 2, H * 0.55, 170 * u] },
  } : {
    eyebrow: { x: W * 0.738, y: H * 0.2, size: 32 * u },
    name: { x: W * 0.738, y: H * 0.37, size: 140 * u, maxW: W * 0.44 },
    seul: { x: W * 0.632, y: H * 0.69, size: 128 * u },
    menu: { x: W * 0.846, y: H * 0.69, size: 128 * u },
    label: 30 * u,
    intro: { logo: [W / 2, H * 0.16, W * 0.2], a: [W / 2, H * 0.43, 200 * u], amp: [W / 2, H * 0.575, 150 * u], b: [W / 2, H * 0.75, 200 * u] },
  };
  const lampFr = Array.from({ length: 11 }, (_, k) => k * 0.88 + 0.06);

  // ---- grille du récap
  const grid = (() => {
    const cols = V ? 2 : 4, rows = V ? 4 : 2, gap = (V ? 18 : 22) * u;
    const top = V ? H * 0.255 : H * 0.215, bot = V ? S.b : S.b;
    const cw = (S.w - gap * (cols - 1)) / cols, ch = (bot - top - gap * (rows - 1)) / rows;
    return R.map((r, i) => {
      const c = i % cols, rr = Math.floor(i / cols);
      return { r, x: S.l + c * (cw + gap), y: top + rr * (ch + gap), w: cw, h: ch };
    });
  })();

  const v = new THREE.Vector3();

  return {
    group,
    camera: camOf,
    update(f) {
      const lt = f.lt, t = f.t, ui = f.ui, fx = f.fx;
      const cam = camOf(lt);
      const scroll = scrollAt(lt);
      lights.position.set(cam.target[0], 0, 0);
      // les lumières ponctuelles du studio ne doivent pas éclairer seulement la 1re station
      world.studio.rimG.intensity = 0; world.studio.rimT.intensity = 0;

      // ---------------- allumage des lampadaires (0 → 0.3) — grésillement déterministe
      const q0 = lt;
      const ign = q0 < 0.02 ? 0 : q0 < 0.06 ? 0.85 : q0 < 0.1 ? 0.08 : q0 < 0.125 ? 0.95 : q0 < 0.16 ? 0.2 : Math.min(1, 0.75 + (q0 - 0.16) * 2);
      const gridK = seg(lt, T_GRID - 0.05, T_GRID + 0.2);
      const par = (Math.min(scroll, R.length - 1) + 1) * 0.88 * W;
      streetBackdrop(f.bg, W, H, t, { k: ign * (1 - 0.35 * gridK), lamps: lampFr, parallax: par, seed: 5, light: ign, flicker: 0.25 });
      smoke(f.bg, W, H, t, { area: [0, H * 0.45, W, H * 0.55], size: Math.min(W, H) * 0.75, count: 8, alpha: 0.16 * ign, seed: 41, rise: 0.7 });
      particles(fx, W, H, t, { kind: 'embers', k: 0.6 * ign, seed: 22, count: 28 });

      // ---------------- intro : logo + SANDWICH & HAMBURGER (glisse avec le whip)
      const dxIntro = -(scroll + 1) * W * (V ? 1.0 : 0.95);
      if (scroll < -0.02 || lt < A0) {
        const I0 = LY.intro;
        ui.save();
        ui.translate(dxIntro, 0);
        if (I.logo) photo(ui, I.logo, I0.logo[0], I0.logo[1], { w: I0.logo[2], p: seg(lt, 0.14, 0.4), glow: 0.4 });
        splatter(ui, I0.a[0], I0.a[1] - I0.a[2] * 0.3, I0.a[2] * 1.6, { p: seg(lt, 0.1, 0.9), seed: 31, drips: 0.5, alpha: 0.9 });
        brushTitle(ui, 'SANDWICH', I0.a[0], I0.a[1], { size: I0.a[2], p: seg(lt, 0.08, 0.32), maxWidth: S.w * 0.86, glow: 0.7 });
        brushTitle(ui, '&', I0.amp[0], I0.amp[1], { size: I0.amp[2], font: 'Kaushan Script', color: P.yellow, p: seg(lt, 0.3, 0.42), glow: 0.9, glowColor: '#ff8a00', skew: 0 });
        brushTitle(ui, 'HAMBURGER', I0.b[0], I0.b[1], { size: I0.b[2], p: seg(lt, 0.46, 0.72), maxWidth: S.w * 0.86, glow: 0.7 });
        ui.restore();
        particles(fx, W, H, t, { kind: 'sparks', burst: { x: I0.a[0] + dxIntro, y: I0.a[1], t0: f.t - lt + 0.12, power: 1.1 }, seed: 6 });
        particles(fx, W, H, t, { kind: 'sparks', burst: { x: I0.b[0] + dxIntro, y: I0.b[1], t0: f.t - lt + 0.5, power: 0.9 }, seed: 7 });
      }

      // ---------------- stations 3D
      const show3D = lt < T_GRID + 0.08;
      for (const st of stations) {
        const { r, i, food, holder, spin, s } = st;
        const a = arrival(i);
        const near = Math.abs(scroll - i) < 0.95;
        holder.visible = show3D && near;
        if (!holder.visible) continue;
        const pe = E.outCubic(seg(lt, a + OPEN[0], a + OPEN[1])) * (1 - E.inCubic(seg(lt, a + CLOSE[0], a + CLOSE[1])));
        food.setExplode(pe, t, { spread: SPREAD, stagger: 0.3, wobble: 1, spin: 0.7 });
        const hit = lt >= a + CLOSE[1] ? Math.exp(-(lt - a - CLOSE[1]) / 0.09) : 0;
        const pop = E.outBack(seg(lt, a - 0.25, a + 0.05), 1.6);
        const k = s * lerp(0.75, 1, pop);
        holder.scale.set(k * (1 + 0.05 * hit), k * (1 - 0.08 * hit), k * (1 + 0.05 * hit));
        holder.rotation.set(0.2, 0, 0);
        const turn = E.inOutSine(seg(lt, a - 0.3, a + 1));
        spin.rotation.set(0, r.kind === 'sandwich' ? -0.42 + 0.34 * turn : -0.6 + 0.7 * turn, 0);
      }

      // ---------------- UI des stations (glisse avec le produit pendant les whips)
      const g = ui;
      for (const st of stations) {
        const { r, i, food, holder } = st;
        if (!holder.visible) continue;
        const a = arrival(i);
        const [hx, hy] = f.project([holder.position.x, holder.position.y, 0]);
        const dx = hx - HERO.fx * W;
        const back = E.inCubic(seg(lt, T_BACK, T_GRID));
        const fade = 1 - back;
        if (fade <= 0) continue;
        // vapeur chaude au-dessus du produit
        smoke(g, W, H, t, { area: [hx - W * (V ? 0.28 : 0.12), hy - H * 0.36, W * (V ? 0.56 : 0.24), H * 0.18], size: Math.min(W, H) * 0.3, count: 6, alpha: 0.24 * fade, seed: 50 + i, rise: 1.6 });
        // miettes à l'impact de fermeture
        particles(g, W, H, t, { kind: 'crumbs', burst: { x: hx, y: hy + H * 0.04, t0: f.t - lt + a + CLOSE[1], power: 0.7 }, seed: 60 + i, count: 34 });
        // étiquettes d'ingrédients (vue éclatée)
        const pe = E.outCubic(seg(lt, a + OPEN[0], a + OPEN[1])) * (1 - E.inCubic(seg(lt, a + CLOSE[0], a + CLOSE[1])));
        const la = clamp((pe - 0.62) / 0.3) * fade;
        if (la > 0) {
          st.labels.forEach((l, j) => {
            const right = V ? j % 2 === 1 : false;
            (right ? food.anchors : food.anchorsL)[l.name].getWorldPosition(v);
            const [x, y] = f.project([v.x, v.y, v.z]);
            ingLabel(g, x, y, l.label, right ? 1 : -1, la, LY.label, u, S);
          });
        }
        // nom, sur-titre, prix
        g.save();
        g.globalAlpha = fade;
        g.translate(dx, 0);
        const N0 = LY.name;
        eyebrow(g, KIND_LABEL[r.kind], LY.eyebrow.x, LY.eyebrow.y, LY.eyebrow.size, seg(lt, a - 0.04, a + 0.16), u);
        const nw = brushTitle(g, r.name, 0, 0, { size: N0.size, p: 0, maxWidth: N0.maxW }).width;
        brushStroke(g, N0.x + N0.size * 0.08, N0.y - N0.size * 0.28, nw * 1.18, N0.size * 1.25, { p: seg(lt, a - 0.06, a + 0.12), seed: 3 + i, color: P.red, angle: -0.05 });
        brushTitle(g, r.name, N0.x, N0.y, { size: N0.size, p: seg(lt, a - 0.04, a + 0.24), maxWidth: N0.maxW, glow: 0.5, colorAt: r.red >= 0 ? ((c) => (c >= r.red ? P.neon : P.white)) : undefined });
        priceTag(g, LY.seul.x, LY.seul.y, { price: r.seul, label: 'SEUL', size: LY.seul.size, p: seg(lt, a + 0.06, a + 0.42), t, color: 'white', fill: 'black', rotate: -0.04 });
        priceTag(g, LY.menu.x, LY.menu.y, { price: r.menu, label: 'MENU', size: LY.menu.size, p: seg(lt, a + 0.14, a + 0.5), t, color: 'yellow', fill: 'black', rotate: 0.03 });
        g.restore();
        particles(fx, W, H, t, { kind: 'sparks', burst: { x: LY.menu.x + dx, y: LY.menu.y, t0: f.t - lt + a + 0.3, power: 0.6 }, seed: 70 + i, count: 22 });
      }

      // ---------------- RÉCAP : grille des 8 (sandwich puis hamburger), MÊMES PRIX
      if (lt >= T_GRID - 0.02) {
        const flip = seg(lt, T_FLIP, T_FLIP + 0.22);
        grid.forEach((c, i) => {
          const q = seg(lt, T_GRID + i * 0.05, T_GRID + 0.3 + i * 0.05);
          if (q <= 0) return;
          const fq = seg(flip, i * 0.06, 0.58 + i * 0.06);
          const sx = Math.abs(Math.cos(Math.PI * fq));
          const isBurger = fq >= 0.5;
          const pop = E.outBack(q, 1.7);
          g.save();
          g.translate(c.x + c.w / 2, c.y + c.h / 2);
          g.scale(Math.max(0.02, sx) * pop, pop);
          g.globalAlpha = clamp(q * 3);
          // carte : fond sombre + cadre néon
          const gr = g.createLinearGradient(0, -c.h / 2, 0, c.h / 2);
          gr.addColorStop(0, 'rgba(40,6,8,0.92)'); gr.addColorStop(1, 'rgba(10,2,3,0.95)');
          g.fillStyle = gr;
          g.beginPath(); g.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12 * u); g.fill();
          neonFrame(g, -c.w / 2, -c.h / 2, c.w, c.h, { p: clamp(q * 1.6), flicker: 0.25, t, seed: 10 + i, radius: 12 * u, width: 2.4 * u, glow: 0.7 });
          const im = I[(isBurger ? 'burger_' : 'sandwich_') + c.r.id];
          const nameSize = (V ? 36 : 40) * u;
          const tagSize = (V ? 40 : 46) * u;
          const photoTop = -c.h / 2 + nameSize * 1.25, photoBot = c.h / 2 - tagSize * 1.75;
          if (im) {
            const maxW = c.w * 0.86, maxH = photoBot - photoTop;
            const k = Math.min(maxW / im.w, maxH / im.h);
            photo(g, im, 0, (photoTop + photoBot) / 2, { w: im.w * k, shadow: 0.6 });
          }
          brushTitle(g, c.r.name, 0, -c.h / 2 + nameSize * 1.05, { size: nameSize, maxWidth: c.w * 0.9, glow: 0.3, colorAt: c.r.red >= 0 ? ((k) => (k >= c.r.red ? P.neon : P.white)) : undefined });
          priceTag(g, -c.w * 0.22, c.h / 2 - tagSize * 0.95, { price: c.r.seul, label: 'SEUL', size: tagSize, color: 'white', fill: 'black', rotate: 0, p: clamp(q * 1.2) });
          priceTag(g, c.w * 0.22, c.h / 2 - tagSize * 0.95, { price: c.r.menu, label: 'MENU', size: tagSize, color: 'yellow', fill: 'black', rotate: 0, p: clamp(q * 1.2 - 0.1) });
          g.restore();
        });
        // titre du récap
        const tq = seg(lt, T_SAME - 0.02, T_SAME + 0.24);
        if (V) {
          brushTitle(g, 'SANDWICH OU HAMBURGER', W / 2, H * 0.165, { size: 70 * u, maxWidth: S.w * 0.88, p: seg(lt, T_GRID, T_GRID + 0.3), glow: 0.5 });
          brushTitle(g, 'MÊMES PRIX', W / 2, H * 0.228, { size: 100 * u, color: P.yellow, p: tq, glow: 0.8, glowColor: P.neon });
        } else {
          // une ligne centrée : « SANDWICH OU HAMBURGER : » + « MÊMES PRIX » (jaune, claque à part)
          const s1 = 66 * u, s2 = 92 * u, gap = 26 * u;
          const w1 = brushTitle(g, 'SANDWICH OU HAMBURGER :', 0, 0, { size: s1, p: 0 }).width;
          const w2 = brushTitle(g, 'MÊMES PRIX', 0, 0, { size: s2, p: 0 }).width;
          const x0 = W / 2 - (w1 + gap + w2) / 2;
          brushTitle(g, 'SANDWICH OU HAMBURGER :', x0, H * 0.135, { size: s1, align: 'left', p: seg(lt, T_GRID, T_GRID + 0.3), glow: 0.5 });
          brushTitle(g, 'MÊMES PRIX', x0 + w1 + gap, H * 0.14, { size: s2, align: 'left', color: P.yellow, p: tq, glow: 0.8, glowColor: P.neon });
        }
        if (lt >= T_SAME) particles(fx, W, H, t, { kind: 'sparks', burst: { x: V ? W / 2 : W * 0.8, y: V ? H * 0.21 : H * 0.12, t0: f.t - lt + T_SAME, power: 1 }, seed: 81 });
      }

      // ---------------- fin : la fumée de la rue envahit l'écran
      const sq = seg(lt, T_SMOKE, 11.0);
      if (sq > 0) {
        smoke(g, W, H, t, { area: [-W * 0.15, H * 0.1, W * 1.3, H * 1.0], size: Math.max(W, H) * (0.45 + 0.5 * sq), count: 16, alpha: 0.85 * E.inQuad(sq), seed: 77, rise: 2.2, color: '#b9aeab' });
        g.save(); g.globalAlpha = 0.9 * E.inCubic(seg(lt, T_SMOKE + 0.15, 11.0)); g.fillStyle = P.bg; g.fillRect(0, 0, W, H); g.restore();
        smoke(g, W, H, t, { area: [-W * 0.1, H * 0.3, W * 1.2, H * 0.8], size: Math.max(W, H) * 0.55, count: 10, alpha: 0.35 * E.inQuad(sq), seed: 78, rise: 1.6, color: '#8f8380' });
      }

      // ---------------- post
      const post = f.post;
      post.bloom = 0.42;
      post.vignette = 1.12;
      post.exposure = 0.25 + 0.75 * ign;
      let fl = pulse(lt, 0.12, 0.01, 0.1) * 0.25 + pulse(lt, 0.5, 0.01, 0.1) * 0.2 + pulse(lt, T_SAME, 0.01, 0.1) * 0.2;
      for (let i = 0; i < R.length; i++) fl += pulse(lt, arrival(i), 0.01, 0.07) * 0.12;
      post.flash = Math.max(post.flash, fl);
      post.flashColor = [1, 0.5, 0.35];
      if (lt > T_BACK && lt < T_GRID + 0.1) post.zoomBlur = Math.min(post.zoomBlur, -0.12 * Math.sin(Math.PI * seg(lt, T_BACK, T_GRID + 0.1)));
    },
  };
}
