// ============================================================================
//  O'BINKS — produits 3D PROCÉDURAUX avec VUES ÉCLATÉES (exploded views)
// ============================================================================
//
//  import { createFood, BURGER_IDS, TACOS_MEATS, KAPSALONE_MEATS, TIRAMISU_FLAVORS, MILKSHAKE_FLAVORS } from '../world/food.js';
//
//  const f = createFood(kind, recipe = {})   // à appeler dans create() (JAMAIS dans update())
//    → {
//        group,            THREE.Group à ajouter à la scène (unités : un burger fait ~1 de large)
//        layers,           [{ name, label, minor, obj }] du BAS vers le HAUT
//                            label = nom de l'ingrédient en français pour les étiquettes
//                            minor = true pour les couches « secondaires » (talon de pain, contenant,
//                                    2e steak…) que l'on peut ne pas étiqueter
//        setExplode(p, t, opts)   p ∈ [0,1] : 0 = produit assemblé, 1 = couches séparées
//                            verticalement (espacement régulier ENTRE les boîtes englobantes, donc
//                            aucune interpénétration), légère rotation/flottement selon t (s).
//                            opts = {
//                              spread  : 1     multiplie l'écart entre couches (0.5 serré … 2.5 très éclaté)
//                              anchor  : 'center' | 'bottom' | 'top'  — point fixe de l'éclatement
//                              stagger : 0     0..0.8 : les couches extérieures partent d'abord
//                              wobble  : 1     amplitude du flottement / des inclinaisons (0 = figé)
//                              spin    : 1     amplitude des rotations autour de Y
//                            }
//                            Fonction pure de (p, t, opts) : appelable à chaque image, ne crée rien.
//        anchors,          { [name]: THREE.Object3D } enfant de group : point d'accroche d'étiquette
//                            au BORD DROIT (+X local) de la couche, à mi-hauteur ; suit l'éclatement.
//                            anchorsL : idem au bord gauche (−X).  → anchor.getWorldPosition(v) puis f.project
//        height            hauteur assemblée (le bas du produit est à y = 0, centré en X/Z)
//        width, depth      emprise X / Z assemblée
//        gap               écart de base entre couches éclatées (× spread)
//        explodedHeight(spread = 1)  hauteur totale une fois éclaté (p = 1)
//        kind, recipe
//      }
//
//  KINDS ET RECETTES
//   'burger'   (pain rond brioché, sésame) et 'sandwich' (pain long) : recipe.id ∈ BURGER_IDS =
//              ocheesy | doublesmash | raclette | ocrispy | opepper | chevremiel | barbecue | bigbinks
//   'tacos'    recipe.meat ∈ nuggets | tenders | cordonbleu | tandoori (galette grillée pliée,
//              frites, viande, sauce fromagère qui coule, sauce au choix)
//   'hotdog'   pain, saucisse de poulet, cornichon, ketchup moutarde miel, oignon crispy, persil
//   'crousty'  boîte noire « O'BINKS » ouverte, riz, crème fraîche, tenders, sauce aigre-douce
//              (recipe.logo = HTMLImageElement facultatif pour le couvercle)
//   'kapsalone' recipe.meat ∈ poulet | tenders | nuggets | cordonbleu | hachee (barquette alu,
//              frites, cheddar fondu, viande, tomate, oignon rouge, salade, sauce)
//   'tiramisu' recipe.flavor ∈ bueno | oreo | raffaello | speculoos (verrine transparente)
//   'milkshake' recipe.flavor ∈ fraisebanane | oreo | bueno | speculoos | snickers | pistache | raffaello
//
//  Matériaux et textures partagés entre tous les produits (créés une seule fois). Éclairage fourni
//  par la scène : les produits sont réglés pour une key chaude + contre-jour rouge + env du studio.
//  Budget < 40 k triangles par produit.
// ============================================================================

import * as THREE from 'three';
import { noise1 } from '../core/anim.js';
import {
  TAU, clamp, lerp, smooth, kit, creamyMat, vn2, stadiumR, stadiumD, superR, noisyR,
  slab, polarMesh, merge, mergeByGroup, place, paint, lump, dripGeo, tubeGeo, sweepGeo, scatter, logoTexture,
} from './food-kit.js';
import {
  bunTop, bunBottom, patty, crispyFillet, meatPieces, sausage, cheese, chevreRounds, lettuce, onionRings,
  friedOnionRings, pickles, tomatoSlices, sauceSheet, zigzag, drizzle, fries, bits, walnuts, sauce, leafHeap, saucePuddles, glazeShell, mixC, colorOf as C, mesh,
} from './food-parts.js';

export const BURGER_IDS = ['ocheesy', 'doublesmash', 'raclette', 'ocrispy', 'opepper', 'chevremiel', 'barbecue', 'bigbinks'];
export const TACOS_MEATS = ['nuggets', 'tenders', 'cordonbleu', 'tandoori'];
export const KAPSALONE_MEATS = ['poulet', 'tenders', 'nuggets', 'cordonbleu', 'hachee'];
export const TIRAMISU_FLAVORS = ['bueno', 'oreo', 'raffaello', 'speculoos'];
export const MILKSHAKE_FLAVORS = ['fraisebanane', 'oreo', 'bueno', 'speculoos', 'snickers', 'pistache', 'raffaello'];

const MEAT_LABEL = {
  nuggets: 'Nuggets', tenders: 'Tenders', cordonbleu: 'Cordon bleu', tandoori: 'Poulet mariné tandoori',
  poulet: 'Poulet mariné', hachee: 'Viande hachée',
};
const FLAVOR_LABEL = {
  bueno: 'Bueno', oreo: 'Oreo', raffaello: 'Raffaello', speculoos: 'Spéculoos', fraisebanane: 'Fraise banane',
  snickers: 'Snickers', pistache: 'Pistache',
};

// ------------------------------------------------------------------ empilement + éclatement
const L_ = (name, label, part, extra = {}) => ({ name, label, obj: part.obj, h: part.h, ...extra });

/** Empile des couches (base à y=0) en retirant `sink` (léger enfoncement réaliste). */
function stack(defs, y0 = 0) {
  let y = y0;
  for (const d of defs) {
    d.obj.position.y = y + (d.dy || 0);
    y += d.h - (d.sink ?? 0.004);
  }
  return y;
}

function finalize(kind, recipe, defs, { gap = 0.16, spin = 0.25, tilt = 0.05, bob = 0.016 } = {}) {
  const group = new THREE.Group();
  group.name = `food-${kind}${recipe.id ? '-' + recipe.id : ''}`;
  for (const d of defs) { d.obj.name = d.name; group.add(d.obj); }
  group.updateMatrixWorld(true);
  const box = new THREE.Box3(), all = new THREE.Box3();
  const layers = [], anchors = {}, anchorsL = {};
  for (const d of defs) {
    box.setFromObject(d.obj);
    all.union(box);
    const a = new THREE.Object3D(), aL = new THREE.Object3D();
    a.name = `anchor-${d.name}`; aL.name = `anchorL-${d.name}`;
    group.add(a, aL);
    anchors[d.name] = a; anchorsL[d.name] = aL;
    layers.push({
      name: d.name, label: d.label, minor: !!d.minor, obj: d.obj,
      base: d.obj.position.clone(), baseRot: d.obj.rotation.clone(),
      bottom: box.min.y, top: d.stackTop ?? box.max.y, xmax: box.max.x, xmin: box.min.x, zc: (box.min.z + box.max.z) / 2,
    });
  }
  const n = layers.length;
  // décalage de résolution des recouvrements (contenus dans un contenant, coulures…) : chaque couche
  // doit dépasser le HAUT de toutes les couches inférieures
  const ov = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    let m = ov[i - 1];
    for (let j = 0; j < i; j++) m = Math.max(m, ov[j] + Math.max(0, layers[j].top - layers[i].bottom));
    ov[i] = m;
  }
  const off = (i, S) => ov[i] + i * gap * S;
  // ordre de départ pour le décalage (stagger) : les plus éloignées du centre d'abord
  const mid = off(n - 1, 1) / 2;
  const order = layers.map((_, i) => i).sort((a, b) => Math.abs(off(b, 1) - mid) - Math.abs(off(a, 1) - mid));
  const rank = new Float64Array(n);
  order.forEach((i, r) => { rank[i] = n > 1 ? r / (n - 1) : 0; });
  const pi = new Float64Array(n);
  for (const l of layers) l.obj.matrixAutoUpdate = true;

  function setExplode(p = 0, t = 0, opts = {}) {
    const S = opts.spread ?? 1, st = clamp(opts.stagger ?? 0, 0, 0.9), W = opts.wobble ?? 1, SP = opts.spin ?? 1;
    const anchor = opts.anchor ?? 'center';
    const center = anchor === 'bottom' ? 0 : anchor === 'top' ? off(n - 1, S) : off(n - 1, S) / 2;
    p = clamp(p);
    let pmin = 1;
    for (let i = 0; i < n; i++) {
      pi[i] = st > 0 ? clamp((p - st * rank[i]) / (1 - st)) : p;
      pmin = Math.min(pmin, pi[i]);
    }
    const w = smooth(pmin) * Math.min(1, S) * W;
    for (let i = 0; i < n; i++) {
      const l = layers[i];
      const e = smooth(pi[i]);
      const dy = (off(i, S) - center) * pi[i] + w * bob * Math.sin(t * (1.3 + 0.17 * i) + i * 1.9);
      l.obj.position.set(l.base.x, l.base.y + dy, l.base.z);
      l.obj.rotation.set(
        l.baseRot.x + w * tilt * noise1(t * 0.55 + i * 7.31),
        l.baseRot.y + SP * (e * spin * (i % 2 ? 1 : -1) * (0.6 + 0.4 * ((i * 0.37) % 1)) + w * spin * 0.6 * Math.sin(t * 0.7 + i * 2.1)),
        l.baseRot.z + w * tilt * noise1(t * 0.5 + i * 3.17 + 40),
      );
      const ym = (l.bottom + l.top) / 2 + dy;
      anchors[l.name].position.set(l.xmax + 0.03, ym, l.zc);
      anchorsL[l.name].position.set(l.xmin - 0.03, ym, l.zc);
    }
  }
  setExplode(0, 0);
  const height = all.max.y - Math.min(0, all.min.y);
  return {
    kind, recipe, group, layers: layers.map((l) => ({ name: l.name, label: l.label, minor: l.minor, obj: l.obj })),
    setExplode, anchors, anchorsL, height, width: all.max.x - all.min.x, depth: all.max.z - all.min.z, gap,
    explodedHeight: (S = 1) => height + off(n - 1, S),
  };
}

// ------------------------------------------------------------------ burgers & sandwichs
const FP_BURGER = { L: 0, r: 0.5 };
const FP_SANDWICH = { L: 0.56, r: 0.235 };

function burgerLike(kind, recipe) {
  const long = kind === 'sandwich';
  const fp = long ? FP_SANDWICH : FP_BURGER;
  const id = BURGER_IDS.includes(recipe.id) ? recipe.id : 'ocheesy';
  const sd = BURGER_IDS.indexOf(id) * 100 + (long ? 50 : 0) + 7;
  const bunLabel = long ? 'Pain doré' : 'Pain brioché';
  const bottom = L_('painBas', bunLabel, bunBottom(fp, { h: long ? 0.12 : 0.15, seed: sd + 1 }), { minor: true, sink: 0.002 });
  const top = L_('painHaut', bunLabel, bunTop(fp, { h: long ? 0.22 : 0.3, seed: sd + 2, sesame: !long }));
  const steak = (name, label, o = {}) => L_(name, label, patty(fp, { seed: sd + name.length * 13 + (o.k || 0), smash: !!o.smash, over: long ? 0.025 : 0.035 }), o);
  const ched = (name, label, o = {}) => L_(name, label, cheese(fp, { seed: sd + 30 + (o.k || 0), rot: 0.35 + (o.k || 0) * 0.5 }), { sink: 0.012, ...o });
  const salade = () => L_('salade', 'Salade', lettuce(fp, { seed: sd + 40 }), { sink: 0.012 });
  const oignonRouge = () => L_('oignonRouge', 'Oignon rouge', onionRings(fp, { seed: sd + 50, red: true }), { sink: 0.006 });
  const defs = [bottom];
  if (id === 'ocheesy') {
    defs.push(steak('steak', 'Steak haché'), ched('cheddar', 'Cheddar fondu'),
      L_('cornichons', 'Cornichons', pickles(fp, { seed: sd + 60, rad: long ? 0.075 : 0.1 })),
      L_('oignons', 'Oignons', onionRings(fp, { seed: sd + 61, red: false, n: long ? 8 : 6 }), { sink: 0.006 }));
  } else if (id === 'doublesmash') {
    defs.push(steak('steak1', '2 steaks smashés', { smash: true, k: 1 }), ched('cheddar', 'Cheddar fondu'),
      steak('steak2', 'Steak smashé', { smash: true, k: 2, minor: true }), oignonRouge(), salade());
  } else if (id === 'raclette') {
    defs.push(steak('steak', 'Steak haché'),
      L_('raclette', 'Raclette fondue', cheese(fp, { kind: 'raclette', seed: sd + 31 }), { sink: 0.016 }), oignonRouge());
  } else if (id === 'ocrispy') {
    defs.push(salade(), L_('poulet', 'Poulet croustillant', crispyFillet(fp, { seed: sd + 70 })),
      L_('sauce', 'Sauce blanche', sauceSheet(fp, 'blanche', { seed: sd + 71, scale: 0.92, drips: 6 }), { sink: 0.01 }));
  } else if (id === 'opepper') {
    defs.push(steak('steak', 'Steak haché'),
      L_('sauce', 'Sauce poivre', sauceSheet(fp, 'poivre', { seed: sd + 72, scale: 1.0, th: 0.036, drips: 12, dripLen: [0.04, 0.13], support: fp.r * 1.02 }), { sink: 0.012 }));
  } else if (id === 'chevremiel') {
    defs.push(steak('steak', 'Steak haché'), L_('chevre', 'Chèvre', chevreRounds(fp, { seed: sd + 80 })),
      L_('miel', 'Miel', honey(fp, sd + 81), { sink: 0.012 }),
      L_('noix', 'Noix', walnuts(fp, { seed: sd + 82, n: long ? 8 : 6 })));
  } else if (id === 'barbecue') {
    defs.push(steak('steak', 'Steak haché'),
      L_('sauce', 'Sauce barbecue', sauceSheet(fp, 'barbecue', { seed: sd + 90, th: 0.024, drips: 7 }), { sink: 0.01 }),
      L_('oignons', 'Oignons', friedOnionRings(fp, { seed: sd + 91 }), { sink: 0.012 }));
  } else if (id === 'bigbinks') {
    defs.push(steak('steak1', '3 steaks', { k: 1 }), ched('cheddar1', 'Double cheddar', { k: 1 }),
      steak('steak2', 'Steak haché', { k: 2, minor: true }), ched('cheddar2', 'Cheddar fondu', { k: 2, minor: true }),
      steak('steak3', 'Steak haché', { k: 3, minor: true }));
  }
  defs.push(top);
  stack(defs);
  return finalize(kind, { ...recipe, id }, defs, { gap: long ? 0.15 : 0.17, spin: long ? 0.12 : 0.3 });
}

/** Miel : fine nappe ambrée translucide avec coulures + deux filets. */
function honey(fp, seed) {
  const g = new THREE.Group();
  g.add(sauceSheet(fp, 'miel', { seed, scale: 0.8, th: 0.01, drips: 6, dripLen: [0.03, 0.07], drapeK: 0.6 }).obj);
  g.add(drizzle(stadiumR(fp.L * 0.8, fp.r * 0.8), 'miel', { seed: seed + 1, n: 3, radius: 0.0065, y: 0.012, margin: 0.9 }).obj);
  return { obj: g, h: 0.018 };
}

// ------------------------------------------------------------------ tacos
function tacos(recipe) {
  const K = kit();
  const meat = TACOS_MEATS.includes(recipe.meat) ? recipe.meat : 'tenders';
  const A = 0.62, B = 0.42, H1 = 0.13, H2 = 0.17, TH = 0.016;
  const Rb = noisyR(superR(A, B, 4), 0.012, 2, 301);
  const rim = (k) => Math.pow(k, 6);
  // creases de pliage (diagonales) sur le dessus
  const crease = (x, z) => {
    const d1 = Math.abs(x / A - z / B) * 0.7, d2 = Math.abs(x / A + z / B) * 0.7;
    return Math.exp(-(d1 * d1) / 0.002) + Math.exp(-(d2 * d2) / 0.002);
  };
  const toast = (x, z, k) => {
    const n = vn2(x * 5, z * 5, 303) * 0.5 + 0.5, n2 = vn2(x * 15, z * 15, 305) * 0.5 + 0.5;
    return mixC(C('#f2c682'), C('#a9581c'), clamp((1 - k * k) * 0.45 + n * 0.35 + smooth(clamp(n2 * 1.6 - 0.55)) * 0.35 - 0.05));
  };
  // galette du bas (coque)
  const lowGeo = slab({
    R: Rb, segs: 96, rings: 14, sideRows: 2, bulge: 0.004, tile: 0.55, parts: [1, 0, 0],
    top: (x, z, k) => TH + H1 * rim(k) * 0.96, bot: (x, z, k) => H1 * rim(k),
    color: (x, y, z, part, k) => (part === 1 ? mixC(C('#fbe2b4'), C('#efc88a'), k) : toast(x, z, k)),
  });
  const galB = { obj: mesh(lowGeo, [K.M.tortilla, K.M.tortillaIn]), h: H1 };
  // galette du haut (pliée, quadrillage doré)
  const topY = (x, z, k) => H1 + H2 * (1 - Math.pow(k, 4.5)) - 0.012 * crease(x, z) * k + vn2(x * 6, z * 6, 304) * 0.006;
  const hiGeo = slab({
    R: Rb, segs: 96, rings: 16, sideRows: 2, bulge: 0.004, tile: 0.55, parts: [0, 0, 1],
    top: topY, bot: (x, z, k) => topY(x, z, k) - TH,
    color: (x, y, z, part, k) => (part === 1 ? C('#f4d9a6') : toast(x, z, k * 0.8)),
  });
  const galH = { obj: mesh(hiGeo, [K.M.tortilla, K.M.tortillaIn]), h: 0 };
  // frites à l'intérieur
  const Rin = superR(A * 0.8, B * 0.75, 4);
  const fr = fries(46, 311, (i, rr) => {
    const a = rr() * TAU, k = Math.sqrt(rr()) * 0.9, x = Math.cos(a) * Rin(a) * k, z = Math.sin(a) * Rin(a) * k;
    return { p: [x, 0.045 + rr() * 0.05 + (1 - k) * 0.02, z], r: [Math.PI / 2 + (rr() - 0.5) * 0.3, 0, rr() * TAU], len: 0.17 + rr() * 0.12 };
  }, { thick: 0.042 });
  fr.rotation.set(0, 0, 0);
  // frites couchées : le cylindre (axe Y) est basculé par r.x = π/2 puis tourné par r.z → on corrige : rotation Euler 'XYZ'
  const frites = { obj: fr, h: 0 };
  // viande
  const vi = meatPieces(superR(A * 0.8, B * 0.74, 4), meat, { seed: 320, y: 0, spread: 0.88, scale: 1.25, n: meat === 'tandoori' ? 15 : meat === 'nuggets' ? 9 : meat === 'tenders' ? 6 : 4 });
  vi.obj.position.y = 0.1;
  // sauce fromagère qui coule (nappe + coulures hors de la galette)
  const Rs = noisyR(superR(A * 0.98, B * 0.98, 4), 0.08, 5, 330);
  const sTop = (x, z, k) => H1 + 0.075 * (1 - Math.pow(k, 4)) + vn2(x * 8, z * 8, 331) * 0.006;
  const sTh = (x, z, k) => 0.012 + 0.022 * smooth(clamp(vn2(x * 6, z * 6, 332) * 0.9 + 0.5)) * (1 - Math.pow(k, 6) * 0.6) + vn2(x * 18, z * 18, 333) * 0.003;
  const sGeo = slab({ R: Rs, segs: 96, rings: 10, sideRows: 3, bulge: 0.008, tile: 0.4, top: (x, z, k) => sTop(x, z, k) + sTh(x, z, k), bot: sTop });
  const geos = [sGeo];
  const rr = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + rr() * 0.4, rad = Rs(a) * 1.0;
    geos.push(place(dripGeo(0.04 + rr() * 0.07, 0.016 + rr() * 0.008, 10), [Math.cos(a) * rad, H1 + 0.012, Math.sin(a) * rad], [0, -a, 0], [1, 1, 0.75]));
  }
  const fromagere = { obj: mesh(merge(geos), sauce('fromagere')), h: 0 };
  // sauce au choix : zigzag blanc sur la sauce fromagère
  const sc = zigzag({ L: A * 0.45, r: B * 0.55 }, 'blanche', { seed: 340, yFn: (x, z) => sTop(x, z, Math.min(1, Math.hypot(x / A, z / B))) + 0.02, n: 14, amp: 0.85, radius: 0.012 });
  const defs = [
    L_('galetteBas', 'Galette grillée', galB, { minor: true }),
    L_('frites', 'Frites', frites),
    L_('viande', MEAT_LABEL[meat], vi),
    L_('fromagere', 'Sauce fromagère', fromagere),
    L_('sauce', 'Sauce au choix', sc),
    L_('galetteHaut', 'Galette grillée', galH),
  ];
  return finalize('tacos', { ...recipe, meat }, defs, { gap: 0.15, spin: 0.14 });
}

// ------------------------------------------------------------------ hot dog
function hotdog(recipe) {
  const K = kit();
  const L = 0.5, r = 0.21, fp = { L, r };
  const H = 0.25, gD = 0.125, gW = 0.11, rad = 0.085;
  const dome = (x, z) => {
    const d = clamp(stadiumD(x, z, L, r) / r);
    return 0.055 + (H - 0.055) * Math.pow(1 - Math.pow(1 - d, 2.2), 0.5);
  };
  const groove = (x, z) => gD * Math.exp(-(z * z) / (gW * gW)) * smooth(clamp(stadiumD(x, 0, L, r) / 0.12));
  const R = noisyR(stadiumR(L, r), 0.01, 2, 401);
  const geo = slab({
    R, segs: 120, rings: 16, sideRows: 4, bulge: 0.015, tile: 0.45, topUV: 'a', sideUV: 's',
    top: (x, z) => dome(x, z) - groove(x, z), bot: (x, z) => 0.03 * Math.pow(1 - clamp(stadiumD(x, z, L, r) / (r * 0.4)), 2),
    color: (x, y, z, part) => {
      if (part === 2) return C('#b8692a');
      const g = groove(x, z) / gD;
      const t = clamp(y / H);
      const c = mixC(C('#f2b768'), C('#b3561a'), smooth(t) * 0.95 + vn2(x * 6, z * 6, 402) * 0.1);
      return mixC(c, C('#f8dfae'), smooth(clamp(g * 1.7 - 0.25)));
    },
  });
  const pain = { obj: mesh(geo, [K.M.bunSoft, K.M.bunSoft, K.M.bunSoft]), h: H };
  // saucisse bien visible : posée au fond de la fente, elle dépasse des lèvres du pain
  const sau = sausage({ len: 1.52, rad, seed: 410 });
  const yS = H - gD + rad * 0.95;
  sau.obj.position.y = yS;
  const topS = yS + rad * 0.92; // dessus de la saucisse
  const sY = (x) => topS - 0.04 * (x / 0.76) ** 2;
  const corn = pickles({ L: 0.48, r: 0.035 }, { seed: 420, n: 6, rad: 0.05 });
  corn.obj.position.y = topS - 0.016;
  const fpS = { L: 0.6, r: 0.06 };
  const ket = zigzag(fpS, 'ketchup', { seed: 430, yFn: (x) => sY(x) + 0.014, n: 22, amp: 1.2, radius: 0.016, ext: 0.92, flat: 0.55 });
  const mou = zigzag(fpS, 'moutardemiel', { seed: 431, yFn: (x) => sY(x) + 0.03, n: 16, amp: 1.0, radius: 0.015, ext: 0.86, flat: 0.55 });
  const sauces = new THREE.Group();
  sauces.add(ket.obj, mou.obj);
  const onion = bits(70, 440, K.M.crispyOnion, (i, rr) => {
    const x = (rr() - 0.5) * 1.2, z = (rr() - 0.5) * 0.14;
    return { p: [x, sY(x) + 0.045 + rr() * 0.02, z], s: [0.026 + rr() * 0.016, 0.012, 0.02 + rr() * 0.012] };
  }, { seg: 6, flat: 0.5, colorFn: (i, rr, c) => c.copy(mixC(C('#ffe3a6'), C('#a8561a'), rr())) });
  const persil = bits(55, 450, K.M.parsley, (i, rr) => {
    const x = (rr() - 0.5) * 1.2, z = (rr() - 0.5) * 0.15;
    return { p: [x, sY(x) + 0.068 + rr() * 0.012, z], s: [0.012 + rr() * 0.007, 0.003, 0.009 + rr() * 0.005] };
  }, { seg: 5, flat: 0.3, colorFn: (i, rr, c) => c.copy(mixC(C('#4cc232'), C('#1f6a14'), rr())) });
  const defs = [
    L_('pain', 'Pain', pain, { minor: true, stackTop: H }),
    L_('saucisse', 'Saucisse de poulet', sau),
    L_('cornichon', 'Cornichon', corn),
    L_('sauces', 'Ketchup moutarde miel', { obj: sauces, h: 0 }),
    L_('oignonCrispy', 'Oignon crispy', { obj: onion, h: 0 }),
    L_('persil', 'Persil en décoration', { obj: persil, h: 0 }),
  ];
  return finalize('hotdog', recipe, defs, { gap: 0.13, spin: 0.1, tilt: 0.04 });
}

// ------------------------------------------------------------------ contenants
/** Barquette / boîte : fond + parois évasées + rebord roulé (profil polaire). */
function trayGeo(R, h, { flare = 0.12, th = 0.008, lip = 0.018, segs = 96, wallUV = 's' } = {}) {
  const rows = [];
  const kf = 0.94;
  for (let i = 0; i <= 6; i++) rows.push({ k: kf * Math.sin((Math.PI / 2) * (i / 6)), y: th, uv: 'p', part: 0, band: 0 });
  const wallRows = 6;
  for (let i = 0; i <= wallRows; i++) { const t = i / wallRows; rows.push({ k: kf + 0.06 * Math.sin(t * Math.PI / 2) + flare * t, y: lerp(th + 0.02, h, t), uv: wallUV, part: 1, band: 1 }); }
  const kr = kf + 0.06 + flare;
  rows.push({ k: kr + 0.01, d: lip * 0.5, y: h + lip * 0.6, uv: wallUV, part: 1, band: 1 });
  rows.push({ k: kr + 0.02, d: lip, y: h + lip * 0.2, uv: wallUV, part: 1, band: 1 });
  rows.push({ k: kr + 0.02, d: lip * 0.8, y: h - lip * 0.5, uv: wallUV, part: 1, band: 1 });
  for (let i = wallRows; i >= 0; i--) { const t = i / wallRows; rows.push({ k: kf + 0.06 * Math.sin(t * Math.PI / 2) + flare * t, d: th * 1.2, y: lerp(0.0, h - lip * 0.6, t), uv: wallUV, part: 1, band: i === 0 ? 2 : 1 }); }
  for (let i = 6; i >= 0; i--) rows.push({ k: kf * Math.sin((Math.PI / 2) * (i / 6)), y: 0, uv: 'p', part: 2, band: 2 });
  return polarMesh({ R, segs, rows, tile: 0.5 });
}

/** Verre / gobelet (profil de révolution) : rayon bas rb, haut rt, hauteur h, épaisseur th. */
function cupGeo(rb, rt, h, { th = 0.012, base = 0.035, lip = 0.008, segs = 64 } = {}) {
  const R = () => 1;
  const rAt = (y) => lerp(rb, rt, y / h);
  const rows = [];
  for (let i = 0; i <= 4; i++) rows.push({ k: (rAt(base) - th) * (i / 4), y: base, uv: 'p', part: 0 });
  for (let i = 1; i <= 8; i++) { const y = lerp(base + 0.01, h, i / 8); rows.push({ k: rAt(y) - th, y, uv: 's', part: 0 }); }
  rows.push({ k: rt - th * 0.3, y: h + lip, uv: 's', part: 0 });
  rows.push({ k: rt + lip * 0.3, y: h + lip * 0.6, uv: 's', part: 0 });
  for (let i = 8; i >= 0; i--) { const y = lerp(0.006, h, i / 8); rows.push({ k: rAt(y) + (i === 0 ? -0.006 : 0), y, uv: 's', part: 0 }); }
  for (let i = 4; i >= 0; i--) rows.push({ k: (rb - 0.01) * (i / 4), y: 0, uv: 'p', part: 0 });
  return polarMesh({ R, segs, rows, tile: 0.5 });
}

// ------------------------------------------------------------------ crousty binks
function crousty(recipe) {
  const K = kit();
  const A = 0.6, B = 0.4, H = 0.2;
  const Rb = superR(A, B, 5);
  // boîte + couvercle ouvert avec logo
  const box = new THREE.Group();
  box.add(mesh(trayGeo(Rb, H, { flare: 0.06, lip: 0.012, segs: 64 }), K.M.boxBlack));
  const lidG = new THREE.Group();
  const lidR = superR(A * 1.08, B * 1.08, 5);
  const lid = slab({ R: lidR, segs: 56, rings: 4, sideRows: 2, bulge: 0, top: 0.012, bot: 0, tile: 0.5 });
  lidG.add(mesh(lid, K.M.boxBlack));
  const logoMat = recipe.logo ? K.M.logo.clone() : K.M.logo;
  if (recipe.logo) logoMat.map = logoTexture(recipe.logo);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(A * 1.5, A * 0.75), logoMat);
  logo.rotation.x = Math.PI / 2; // face vers −Y (dessous du couvercle fermé)
  logo.position.y = -0.002;
  lidG.add(logo);
  // charnière à l'arrière (z = −B·1.08), couvercle relevé et légèrement penché vers l'arrière
  const hinge = new THREE.Group();
  hinge.position.set(0, H + 0.012, -B * 1.1);
  lidG.position.set(0, 0, B * 1.08);
  hinge.add(lidG);
  hinge.rotation.x = -1.78;
  box.add(hinge);
  const boite = { obj: box, h: 0 };
  // riz : lit bombé + grains en relief
  const Rr = noisyR(superR(A * 0.92, B * 0.88, 5), 0.02, 3, 501);
  const riceTop = (x, z, k) => 0.15 + 0.035 * (1 - k * k) + vn2(x * 9, z * 9, 502) * 0.016 + vn2(x * 30, z * 30, 504) * 0.005;
  const bed = slab({ R: Rr, segs: 72, rings: 8, sideRows: 4, bulge: 0.025, tile: 0.13, top: riceTop, bot: (x, z, k) => 0.07 + 0.02 * k * k, sideUV: 's' });
  const riz = new THREE.Group();
  riz.add(mesh(bed, K.M.rice));
  const NG = 440;
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), K.M.riceGrain, NG);
  {
    const P = scatter(Rr, NG, 503, { margin: 0.97 });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    P.forEach(([x, z, k], i) => {
      const kk = Math.hypot(x / (A * 0.92), z / (B * 0.88));
      e.set((k - 0.5) * 0.6, k * TAU * 3, (k - 0.5) * 0.4); q.setFromEuler(e);
      grains.setMatrixAt(i, m.compose(p.set(x, riceTop(x, z, Math.min(1, kk)) + 0.001 + (k - 0.5) * 0.006, z), q, s.set(0.026, 0.0095, 0.011)));
    });
    grains.instanceMatrix.needsUpdate = true; grains.computeBoundingBox(); grains.computeBoundingSphere();
  }
  riz.add(grains);
  const rizP = { obj: riz, h: 0 };
  // crème fraîche : noisettes crémeuses posées sur le riz + un filet
  const crG = new THREE.Group();
  const rTop = (x, z) => riceTop(x, z, Math.min(1, Math.hypot(x / (A * 0.92), z / (B * 0.88))));
  crG.add(saucePuddles(superR(A * 0.8, B * 0.75, 4), 'creme', { seed: 512, n: 7, size: 0.085, th: 0.03, margin: 0.85, drips: 0, yFn: rTop }).obj);
  crG.add(zigzag({ L: A * 0.5, r: B * 0.62 }, 'creme', { seed: 510, n: 11, radius: 0.012, yFn: (x, z) => rTop(x, z) + 0.006, amp: 0.88, flat: 0.5 }).obj);
  const creme = { obj: crG, h: 0 };
  // tenders panés
  const td = meatPieces(superR(A * 0.86, B * 0.8, 4), 'tenders', { seed: 520, n: 9, glazed: true, spread: 0.9, scale: 1.3 });
  const yT = 0.19;
  td.obj.position.y = yT;
  // sauce aigre-douce : nappage brillant qui épouse chaque tender (coque ouverte dessous, gouttes),
  // + un filet en zigzag, sésame et ciboulette
  const ad = new THREE.Group();
  const glaze = glazeShell(td.obj.geometry, 'aigredouce', { offset: 0.006, minNy: 0.4, drips: 14, seed: 534, dripLen: [0.012, 0.04], dripR: 0.009, glazeColor: '#d0601c', glazeOpacity: 0.5 });
  glaze.obj.position.y = yT;
  ad.add(glaze.obj);
  const yA = 0.31;
  ad.add(zigzag({ L: A * 0.48, r: B * 0.6 }, 'aigredouce', { seed: 530, n: 12, radius: 0.011, y: yA, amp: 0.9, flat: 0.45 }).obj);
  ad.add(bits(60, 531, K.M.sesame, (i, rr) => {
    const a = rr() * TAU, k = Math.sqrt(rr()) * 0.8;
    return { p: [Math.cos(a) * A * k, yA + 0.012 + rr() * 0.01, Math.sin(a) * B * k], s: [0.011, 0.004, 0.0065] };
  }, { seg: 5, flat: 0.6 }));
  ad.add(bits(36, 532, K.M.parsley, (i, rr) => {
    const a = rr() * TAU, k = Math.sqrt(rr()) * 0.8;
    return { p: [Math.cos(a) * A * k, yA + 0.018, Math.sin(a) * B * k], s: [0.012, 0.004, 0.012] };
  }, { seg: 6, flat: 0.5, colorFn: (i, rr, c) => c.copy(mixC(C('#5cc23a'), C('#2a8a1c'), rr())) }));
  const defs = [
    L_('boite', "Boîte O'BINKS", boite, { minor: true, stackTop: H + 0.03 }),
    L_('riz', 'Riz', rizP),
    L_('creme', 'Crème fraîche', creme),
    L_('tenders', 'Tenders', td),
    L_('aigreDouce', 'Aigre douce', { obj: ad, h: 0 }),
  ];
  return finalize('crousty', recipe, defs, { gap: 0.16, spin: 0.12 });
}

// ------------------------------------------------------------------ kapsalone
function kapsalone(recipe) {
  const K = kit();
  const meat = KAPSALONE_MEATS.includes(recipe.meat) ? recipe.meat : 'poulet';
  const A = 0.58, B = 0.4, H = 0.2;
  const Rb = superR(A, B, 5);
  const tray = { obj: mesh(trayGeo(Rb, H, { flare: 0.14, lip: 0.02, segs: 80 }), [K.M.foil, K.M.foil, K.M.foil]), h: 0 };
  // frites en monticule
  const Rf = superR(A * 1.0, B * 1.0, 5);
  const fr = fries(120, 601, (i, rr) => {
    const a = rr() * TAU, k = Math.sqrt(rr()) * 0.95, x = Math.cos(a) * Rf(a) * k, z = Math.sin(a) * Rf(a) * k;
    const ytop = 0.2 + 0.07 * (1 - k * k);
    return { p: [x, 0.035 + rr() * (ytop - 0.035), z], r: [Math.PI / 2 + (rr() - 0.5) * 0.9, 0, rr() * TAU], len: 0.2 + rr() * 0.14 };
  }, { thick: 0.046 });
  const frites = { obj: fr, h: 0 };
  // cheddar fondu en nappe épaisse avec coulures
  const Rc = noisyR(superR(A * 0.92, B * 0.9, 5), 0.13, 6, 610);
  const cTop = (x, z, k) => 0.25 + 0.055 * (1 - k * k) + vn2(x * 9, z * 9, 611) * 0.012 + vn2(x * 22, z * 22, 613) * 0.004;
  const cTh = (x, z, k) => 0.016 + 0.02 * smooth(clamp(vn2(x * 7, z * 7, 614) * 0.8 + 0.5)) * (1 - Math.pow(k, 5) * 0.5);
  const cg = slab({ R: Rc, segs: 96, rings: 9, sideRows: 3, bulge: 0.01, tile: 0.4, top: (x, z, k) => cTop(x, z, k) + cTh(x, z, k), bot: (x, z, k) => cTop(x, z, k) - 0.03 * Math.pow(k, 8) });
  const cgeos = [cg];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + Math.sin(i * 7.1) * 0.3, rad = Rc(a) * 0.96;
    cgeos.push(place(dripGeo(0.035 + ((i * 37) % 10) / 160, 0.016 + ((i * 13) % 7) / 700, 10), [Math.cos(a) * rad, cTop(0, 0, 1) - 0.01, Math.sin(a) * rad], [0, -a, 0], [1, 1, 0.75]));
  }
  for (const g of cgeos) paint(g, (x, y, z) => mixC(C('#ffffff'), C('#ffd27a'), clamp(0.5 + vn2(x * 6, z * 6, 612) * 0.6) * 0.6));
  const ched = { obj: mesh(merge(cgeos, true), K.M.cheddar), h: 0 };
  // viande, tomate, oignon, salade, sauce : posées au-dessus
  const Rm = superR(A * 0.85, B * 0.8, 4);
  const vi = meatPieces(Rm, meat, { seed: 620, spread: 0.85, scale: 1.25, n: meat === 'cordonbleu' ? 4 : meat === 'tenders' ? 6 : meat === 'nuggets' ? 9 : meat === 'hachee' ? 30 : 11 });
  vi.obj.position.y = 0.32;
  const tom = tomatoSlices(superR(A * 0.8, B * 0.75, 4), { seed: 630, n: 6, rad: 0.095, margin: 0.75 });
  tom.obj.position.y = 0.4;
  const oi = onionRings({ L: 0.24, r: 0.3 }, { seed: 640, red: true, n: 5 });
  oi.obj.position.y = 0.44;
  const sal = leafHeap(superR(A * 0.85, B * 0.85, 4), { seed: 650, n: 6, size: 0.15, mound: 0.06 });
  sal.obj.position.y = 0.46;
  const heapY = (x, z) => 0.5 + 0.06 * Math.max(0, 1 - Math.hypot(x / (A * 0.7), z / (B * 0.7)));
  const sc = zigzag({ L: A * 0.35, r: B * 0.5 }, 'blanche', { seed: 660, n: 12, radius: 0.012, yFn: heapY, amp: 0.9 });
  const defs = [
    L_('barquette', 'Barquette', tray, { minor: true }),
    L_('frites', 'Frites', frites),
    L_('cheddar', 'Cheddar fondu', ched),
    L_('viande', MEAT_LABEL[meat], vi),
    L_('tomate', 'Tomate', tom),
    L_('oignonRouge', 'Oignon rouge', oi),
    L_('salade', 'Salade', sal),
    L_('sauce', 'Sauce', sc),
  ];
  return finalize('kapsalone', { ...recipe, meat }, defs, { gap: 0.14, spin: 0.12, tilt: 0.04 });
}

// ------------------------------------------------------------------ desserts : éléments
function oreoCookie(scale = 1) {
  const K = kit();
  const R = (a) => 0.06 * scale * (1 + 0.012 * Math.sin(a * 36));
  const disc = (y0) => slab({ R, segs: 48, rings: 4, sideRows: 2, bulge: 0.002, top: y0 + 0.014 * scale, bot: y0, tile: 0.15 });
  const cream = slab({ R: () => 0.054 * scale, segs: 40, rings: 3, sideRows: 2, bulge: 0.002, top: 0.026 * scale, bot: 0.014 * scale, tile: 0.15 });
  const a = disc(0), b = disc(0.026 * scale);
  a.clearGroups(); a.addGroup(0, a.index.count, 0);
  b.clearGroups(); b.addGroup(0, b.index.count, 0);
  cream.clearGroups(); cream.addGroup(0, cream.index.count, 1);
  return { geo: mergeByGroup([a, cream, b]), mats: [K.M.oreo, K.M.oreoCream] };
}
function buenoBar(len = 0.12) {
  const R = superR(len / 2, 0.022, 6);
  return slab({ R, segs: 48, rings: 5, sideRows: 3, bulge: 0.004, tile: 0.2, top: (x) => 0.026 + 0.01 * Math.abs(Math.sin((x / len) * Math.PI * 2)), bot: 0 });
}
function biscuitRect(w = 0.08, d = 0.05, th = 0.014) {
  return slab({ R: superR(w, d, 9), segs: 48, rings: 4, sideRows: 2, bulge: 0.002, tile: 0.2, top: (x, z) => th + 0.002 * Math.sin(x * 120) * Math.sin(z * 120), bot: 0 });
}

/** Garniture d'un dessert selon le parfum : renvoie un Group posé à y = 0 (dessus de la crème). */
function topping(flavor, R, { seed = 700, scale = 1, dome = () => 0 } = {}) {
  const K = kit();
  const g = new THREE.Group();
  const P = (n, s, o = {}) => scatter(R, n, seed + s, { margin: o.margin ?? 0.7, minD: o.minD ?? 0 });
  const crumbs = (n, colA, colB, size = 0.016) => bits(n, seed + 9, K.M.crumbs, (i, rr) => {
    const a = rr() * TAU, k = Math.sqrt(rr()) * 0.9, x = Math.cos(a) * R(a) * k, z = Math.sin(a) * R(a) * k;
    return { p: [x, dome(x, z) + 0.006 + rr() * 0.01, z], s: [size * (0.6 + rr()), size * 0.6, size * (0.6 + rr())] };
  }, { seg: 5, flat: 0.7, colorFn: (i, rr, c) => c.copy(mixC(C(colA), C(colB), rr())) });
  if (flavor === 'oreo') {
    g.add(crumbs(90, '#1a1214', '#3a3034', 0.02));
    const o = oreoCookie(scale);
    const m = new THREE.Mesh(o.geo, o.mats);
    m.position.set(0.04 * scale, dome(0, 0) + 0.05 * scale, -0.03 * scale); m.rotation.set(1.25, 0.3, 0.15);
    g.add(m);
    const m2 = new THREE.Mesh(o.geo, o.mats);
    m2.position.set(-0.09 * scale, dome(0, 0) + 0.012, 0.06 * scale); m2.rotation.set(0.12, 0.8, -0.1); m2.scale.setScalar(0.8);
    g.add(m2);
  } else if (flavor === 'bueno' || flavor === 'snickers') {
    const sn = flavor === 'snickers';
    if (!sn) {
      [[0.02, 0.06, 0.03, 0.4, 1.15], [-0.07, 0.03, -0.04, -0.5, 0.2], [0.08, 0.025, 0.07, 1.2, 0.1]].forEach(([x, y, z, ry, rx], i) => {
        const b = new THREE.Mesh(buenoBar(0.12 * scale), K.M.wafer);
        b.position.set(x * scale, dome(x, z) + y * scale, z * scale); b.rotation.set(rx, ry, 0.1 * i);
        g.add(b);
        const st = drizzle((a) => 0.05, 'chocolat', { seed: seed + 40 + i, n: 2, radius: 0.004, y: 0.036, margin: 1 });
        st.obj.position.copy(b.position); st.obj.rotation.copy(b.rotation);
        g.add(st.obj);
      });
    } else {
      P(5, 3, { minD: 0.08 }).forEach(([x, z, k], i) => {
        const b = new THREE.Mesh(biscuitRect(0.04 * scale, 0.026 * scale, 0.035 * scale), K.M.chocolate);
        b.position.set(x, dome(x, z) + 0.01, z); b.rotation.set((k - 0.5) * 0.8, k * 6, 0.3 * (k - 0.5));
        g.add(b);
      });
      g.add(bits(26, seed + 7, K.M.peanut, (i, rr) => {
        const a = rr() * TAU, k = Math.sqrt(rr()) * 0.8, x = Math.cos(a) * R(a) * k, z = Math.sin(a) * R(a) * k;
        return { p: [x, dome(x, z) + 0.012, z], s: [0.014, 0.01, 0.011] };
      }, { seg: 7, flat: 0.8 }));
    }
    g.add(drizzle(R, sn ? 'caramel' : 'chocolat', { seed: seed + 2, n: 4, radius: 0.007, yFn: (x, z) => dome(x, z) + 0.012, margin: 0.85 }).obj);
    if (!sn) g.add(crumbs(40, '#4a2412', '#7a4a26', 0.012));
  } else if (flavor === 'raffaello') {
    g.add(bits(120, seed + 5, K.M.coconut, (i, rr) => {
      const a = rr() * TAU, k = Math.sqrt(rr()) * 0.92, x = Math.cos(a) * R(a) * k, z = Math.sin(a) * R(a) * k;
      return { p: [x, dome(x, z) + 0.006 + rr() * 0.006, z], s: [0.012, 0.003, 0.008] };
    }, { seg: 5, flat: 0.3 }));
    [[0.0, 0.0], [0.09, 0.05], [-0.08, 0.06], [0.03, -0.09]].forEach(([x, z], i) => {
      const b = new THREE.Mesh(lump({ seg: 16, amp: 0.12, freq: 6, seed: seed + 60 + i, scale: [0.036 * scale, 0.034 * scale, 0.036 * scale] }), K.M.coconut);
      b.position.set(x * scale, dome(x, z) + 0.03 * scale, z * scale);
      g.add(b);
    });
  } else if (flavor === 'speculoos') {
    g.add(crumbs(80, '#a85a1c', '#d08a3c', 0.016));
    [[0.02, 0.05, 0, 1.1, 0.3], [-0.08, 0.02, 0.05, 0.2, -0.6]].forEach(([x, y, z, rx, ry]) => {
      const b = new THREE.Mesh(biscuitRect(0.075 * scale, 0.045 * scale, 0.014 * scale), K.M.speculoos);
      b.position.set(x * scale, dome(x, z) + y * scale, z * scale); b.rotation.set(rx, ry, 0.1);
      g.add(b);
    });
    g.add(drizzle(R, 'caramel', { seed: seed + 3, n: 3, radius: 0.006, yFn: (x, z) => dome(x, z) + 0.01, margin: 0.8 }).obj);
  } else if (flavor === 'fraisebanane') {
    P(4, 4, { minD: 0.09 }).forEach(([x, z, k], i) => {
      const s = lump({ seg: 16, amp: 0.08, freq: 3, seed: seed + 80 + i, scale: [0.054 * scale, 0.066 * scale, 0.054 * scale] });
      const pp = s.attributes.position;
      for (let j = 0; j < pp.count; j++) { const y = pp.getY(j); const t = clamp((y / (0.066 * scale) + 1) / 2); pp.setX(j, pp.getX(j) * (0.55 + 0.45 * t)); pp.setZ(j, pp.getZ(j) * (0.55 + 0.45 * t)); }
      s.computeVertexNormals();
      paint(s, (px, py, pz) => (py > 0.05 * scale ? C('#3a8a22') : mixC(C('#e01822'), C('#ff4a4a'), (vn2(px * 300, py * 300, i) * 0.5 + 0.5) * 0.4 + (Math.sin(px * 260) * Math.sin(py * 260 + pz * 200) > 0.85 ? 0.8 : 0))));
      const m = new THREE.Mesh(s, K.M.strawberry);
      m.position.set(x, dome(x, z) + 0.045 * scale, z); m.rotation.set(Math.PI + (k - 0.5) * 0.8, k * 6, 0);
      g.add(m);
    });
    P(4, 5, { minD: 0.08 }).forEach(([x, z, k]) => {
      const s = slab({ R: () => 0.05 * scale, segs: 32, rings: 4, sideRows: 2, bulge: 0.002, top: 0.016 * scale, bot: 0, tile: 0.1, color: (px, py, pz, part, kk) => (part === 1 || kk > 0.93 ? C('#e8d27a') : Math.abs(kk - 0.3) < 0.06 && Math.sin(Math.atan2(pz, px) * 9) > 0.6 ? C('#c8b070') : mixC(C('#fff4c8'), C('#f1dc96'), kk)) });
      const m = new THREE.Mesh(s, K.M.banana);
      m.position.set(x, dome(x, z) + 0.03, z); m.rotation.set(1.1 * (k - 0.2), k * 6, 0.35);
      g.add(m);
    });
    g.add(drizzle(R, 'fraise', { seed: seed + 6, n: 3, radius: 0.006, yFn: (x, z) => dome(x, z) + 0.012, margin: 0.8 }).obj);
  } else if (flavor === 'pistache') {
    g.add(bits(40, seed + 8, K.M.pistachio, (i, rr) => {
      const a = rr() * TAU, k = Math.sqrt(rr()) * 0.85, x = Math.cos(a) * R(a) * k, z = Math.sin(a) * R(a) * k;
      return { p: [x, dome(x, z) + 0.01, z], s: [0.016, 0.009, 0.011] };
    }, { seg: 7, flat: 0.8, colorFn: (i, rr, c) => c.copy(mixC(C('#8fbf3a'), C('#c9a36a'), rr() * 0.6)) }));
    g.add(drizzle(R, 'pistache', { seed: seed + 9, n: 3, radius: 0.007, yFn: (x, z) => dome(x, z) + 0.012, margin: 0.8 }).obj);
  }
  return g;
}

const DESSERT = {
  // biscuit, crème, topping (tiramisu) / shake, sauce des coulures (milkshake)
  bueno: { biscuit: '#8a5630', cream: '#f8eedb', shake: '#d9b48a', drip: 'chocolat' },
  oreo: { biscuit: '#2a2224', cream: '#f4f2ee', shake: '#d9d4cd', drip: 'chocolat', speck: true },
  raffaello: { biscuit: '#ecd9b2', cream: '#fffaf0', shake: '#f6efe2', drip: 'blancchoc' },
  speculoos: { biscuit: '#a8622a', cream: '#f7e9d2', shake: '#d9a066', drip: 'caramel' },
  fraisebanane: { shake: '#f6a9bb', drip: 'fraise' },
  snickers: { shake: '#bf8a5a', drip: 'caramel' },
  pistache: { shake: '#cfe0a0', drip: 'pistache' },
};

// ------------------------------------------------------------------ tiramisu (verrine)
function tiramisu(recipe) {
  const K = kit();
  const flavor = DESSERT[recipe.flavor] && recipe.flavor !== 'fraisebanane' && TIRAMISU_FLAVORS.includes(recipe.flavor) ? recipe.flavor : 'speculoos';
  const D = DESSERT[flavor];
  const rb = 0.24, rt = 0.29, H = 0.6, th = 0.012, base = 0.035;
  const rAt = (y) => lerp(rb, rt, y / H) - th - 0.006;
  const glass = new THREE.Group();
  const gg = cupGeo(rb, rt, H, { th, base });
  glass.add(new THREE.Mesh(gg, K.M.glass), new THREE.Mesh(gg, K.M.glassTint));
  const verrine = { obj: glass, h: 0 };
  const layer = (y0, y1, type, seed) => {
    const isCream = type === 'cream';
    const geo = slab({
      R: (a) => 1, segs: 64, rings: 7, sideRows: 3, bulge: isCream ? 0.004 : 0.002, tile: 0.25, sideUV: 's',
      top: (x, z, k) => (y1 - y0) + (isCream ? vn2(x * 8, z * 8, seed) * 0.012 : vn2(x * 20, z * 20, seed) * 0.008),
      bot: (x, z) => (isCream ? vn2(x * 8, z * 8, seed + 1) * 0.006 : 0),
      color: (x, y, z) => (isCream ? C(D.cream) : mixC(C(D.biscuit), C('#1a0a04'), clamp(0.25 + vn2(x * 12, y * 30, seed) * 0.25))),
    });
    // rayon variable avec la hauteur (verrine évasée)
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), rr = rAt(y0 + y);
      p.setX(i, x * rr); p.setZ(i, z * rr);
    }
    geo.computeVertexNormals();
    return { obj: mesh(geo, isCream ? K.M.cream : K.M.cake), h: y1 - y0 };
  };
  const b1 = layer(base, 0.15, 'biscuit', 711), c1 = layer(0.15, 0.3, 'cream', 712), b2 = layer(0.3, 0.38, 'biscuit', 713), c2 = layer(0.38, 0.54, 'cream', 714);
  b1.obj.position.y = base; c1.obj.position.y = 0.15; b2.obj.position.y = 0.3; c2.obj.position.y = 0.38;
  const Rt = (a) => rAt(0.54) * 0.95;
  const top = topping(flavor, Rt, { seed: 720, scale: 1.1 });
  top.position.y = 0.54;
  const defs = [
    L_('verrine', 'Verrine', verrine, { minor: true }),
    L_('biscuit', 'Biscuit', b1),
    L_('creme', 'Crème onctueuse', c1),
    L_('biscuit2', 'Biscuit', b2, { minor: true }),
    L_('creme2', 'Crème onctueuse', c2, { minor: true }),
    L_('topping', FLAVOR_LABEL[flavor], { obj: top, h: 0 }),
  ];
  return finalize('tiramisu', { ...recipe, flavor }, defs, { gap: 0.11, spin: 0.25, tilt: 0.035 });
}

// ------------------------------------------------------------------ milkshake
function milkshake(recipe) {
  const K = kit();
  const flavor = MILKSHAKE_FLAVORS.includes(recipe.flavor) ? recipe.flavor : 'oreo';
  const D = DESSERT[flavor];
  const rb = 0.2, rt = 0.29, H = 0.82, th = 0.008, base = 0.03;
  const rAt = (y) => lerp(rb, rt, y / H);
  // gobelet + coulures sur la paroi intérieure
  const cup = new THREE.Group();
  const cg = cupGeo(rb, rt, H, { th, base, lip: 0.012 });
  cup.add(new THREE.Mesh(cg, K.M.cupPlastic), new THREE.Mesh(cg, K.M.glassTint));
  const dg = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + Math.sin(i * 3.7) * 0.2;
    const len = 0.25 + ((i * 53) % 37) / 37 * 0.45;
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const y = H - 0.01 - (len * j) / 10, aa = a + Math.sin(j * 0.9 + i) * 0.04;
      const r = rAt(y) - th - 0.007;
      pts.push([Math.cos(aa) * r, y, Math.sin(aa) * r]);
    }
    const tg = tubeGeo(pts, 0.012, 40, 6);
    // effilement vers le bas
    const p = tg.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k), t = clamp((H - y) / len), cx = Math.cos(a) * (rAt(y) - th - 0.007), cz = Math.sin(a) * (rAt(y) - th - 0.007);
      const s = 1 - 0.45 * t;
      p.setX(k, cx + (p.getX(k) - cx) * s); p.setZ(k, cz + (p.getZ(k) - cz) * s);
    }
    tg.computeVertexNormals();
    dg.push(tg, place(dripGeo(0.001, 0.014 * 0.7, 8), pts[pts.length - 1]));
  }
  cup.add(mesh(merge(dg), sauce(D.drip)));
  const gobelet = { obj: cup, h: 0 };
  // corps du milkshake
  const yTop = H - 0.04;
  const bodyGeo = slab({
    R: () => 1, segs: 64, rings: 6, sideRows: 3, bulge: 0, tile: 0.3, sideUV: 's',
    top: (x, z, k) => yTop + 0.015 * (1 - k * k), bot: base + 0.002,
  });
  const p = bodyGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const rr = rAt(p.getY(i)) - th - 0.014; p.setX(i, p.getX(i) * rr); p.setZ(i, p.getZ(i) * rr); }
  bodyGeo.computeVertexNormals();
  const body = { obj: mesh(bodyGeo, creamyMat('shake-' + flavor, D.shake, { speck: !!D.speck })), h: 0 };
  // chantilly : spirale cannelée
  const turns = 3.2, cH = 0.24, r0 = rAt(H) - 0.06;
  const curve = new THREE.Curve();
  curve.getPoint = (u, target = new THREE.Vector3()) => {
    const a = u * turns * TAU, rr = r0 * Math.pow(1 - u, 0.85) + 0.004;
    return target.set(Math.cos(a) * rr, yTop + 0.03 + cH * Math.pow(u, 0.9), Math.sin(a) * rr);
  };
  const prof = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = 0.055 * (1 + 0.16 * Math.cos(a * 8)); prof.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  const ch = sweepGeo(curve, prof, 220, (u) => (1 - 0.5 * u) * smooth(clamp(u * 25)) * (1 - smooth(clamp((u - 0.94) / 0.06))) + 0.02);
  paint(ch, () => C('#ffffff'));
  const chantilly = { obj: mesh(ch, K.M.cream), h: 0 };
  const domeY = (x, z) => yTop + 0.03 + cH * Math.pow(clamp(1 - Math.hypot(x, z) / r0), 1.1) * 0.85;
  const top = topping(flavor, (a) => r0 * 0.95, { seed: 780, dome: (x, z) => domeY(x, z) - (yTop + 0.03) });
  top.position.y = yTop + 0.03 + 0.02;
  const defs = [
    L_('gobelet', 'Coulures', gobelet, { minor: true }),
    L_('milkshake', 'Milkshake ' + FLAVOR_LABEL[flavor], body),
    L_('chantilly', 'Chantilly', chantilly),
    L_('topping', FLAVOR_LABEL[flavor], { obj: top, h: 0 }),
  ];
  return finalize('milkshake', { ...recipe, flavor }, defs, { gap: 0.13, spin: 0.25, tilt: 0.035 });
}

// ------------------------------------------------------------------ éclairage conseillé
/**
 * Éclairage « pub fast-food » conseillé pour les produits (à ajouter au group de la scène) :
 * key chaude devant-gauche-haut, contre-jour rouge RASANT (faible hauteur, derrière : il ne
 * rosit pas les dessus), débouchage doux. o = { key, rim, fill, rimColor } (multiplicateurs).
 * Renvoie un THREE.Group (lumières directionnelles : la position du group n'a pas d'effet,
 * seules leurs directions comptent).
 */
export function createFoodLights(o = {}) {
  const g = new THREE.Group();
  g.name = 'food-lights';
  const key = new THREE.DirectionalLight('#ffd6a8', 2.2 * (o.key ?? 1)); key.position.set(-3.5, 4.5, 6);
  const rim = new THREE.DirectionalLight(o.rimColor || '#ff2a2a', 3.4 * (o.rim ?? 1)); rim.position.set(4, 1.2, -6);
  const rim2 = new THREE.DirectionalLight('#ff6a3a', 1.2 * (o.rim ?? 1)); rim2.position.set(-5, 0.8, -4);
  const fill = new THREE.HemisphereLight('#fff2e2', '#1a0303', 0.45 * (o.fill ?? 1));
  g.add(key, rim, rim2, fill);
  g.userData = { key, rim, rim2, fill };
  return g;
}

// ------------------------------------------------------------------ point d'entrée
export function createFood(kind, recipe = {}) {
  switch (kind) {
    case 'burger':
    case 'sandwich': return burgerLike(kind, recipe);
    case 'tacos': return tacos(recipe);
    case 'hotdog': return hotdog(recipe);
    case 'crousty': return crousty(recipe);
    case 'kapsalone': return kapsalone(recipe);
    case 'tiramisu': return tiramisu(recipe);
    case 'milkshake': return milkshake(recipe);
    default: throw new Error(`createFood : kind inconnu « ${kind} »`);
  }
}

/** Compte les triangles d'un produit (contrôle du budget). */
export function triangleCount(food) {
  let n = 0;
  food.group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, c = (g.index ? g.index.count : g.attributes.position.count) / 3;
    n += c * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}
